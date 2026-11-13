import { createServer, type IncomingMessage, type Server } from 'node:http'

import { NOT_PLACED_HEAD, MESSAGE_TOOL_NAMES, PLACE_TOKEN_ARG, placeTokenIn } from '../agent-messages.js'
import { RECORDED_PLACE_PATH, placeIssueSchema } from '../door.js'
import { SERVER_ASK_PATH } from '../server-ask.js'
import { AGENT_DELIVERY, agentDeliverResult, serviceDescriptor } from '../services.js'
import { freshPlaceToken } from '../serve/adopt.js'
import { forgetMessageHosts } from '../serve/messages.js'

/**
 * 2.95.0. The conformance check every agent module runs in its own test suite, with one file:
 *
 *     import { expectAgentConformance } from 'kehikot-module-protocol/testing'
 *     test('meets the agent-module conformance', async () => {
 *       await expectAgentConformance({ manifest: MANIFEST, door: answer, project, adopt, launched })
 *     })
 *
 * It stands up a host of its own on a loopback port (`fakeHost`) and points `KEHIKOT_ORIGINS` at it
 * for the run, then holds the module to what every agent module owes, whatever program it runs:
 *
 * 1. A module that messages (`agents:message` in `declares.uses`) provides `agent.delivery`, and its
 *    descriptor parses; the `deliver` route answers a knock with `agentDeliverResult`.
 * 2. Its door lists `send_message` and `read_messages` to a caller with NO place token, and every tool
 *    its manifest names: never a tool listed only for a launched conversation.
 * 3. A message tool called with no key answers in words why and what to do (`NOT_PLACED_HEAD`).
 * 4. A conversation it did not launch, placed the way a person places one (`adopt`), is given its key
 *    in words (`placeTokenLine`), the key is issued to the host for this module, and messaging works
 *    with it as `placeToken`.
 * 5. A made-up key, and the conversation's own id given as a key, are refused.
 * 6. With `launched`: a conversation it launched messages with the token on its door's URL, as before.
 *
 * Node-only. It writes nothing but what the module's own `adopt` writes.
 */

/** One call on the module's doors, as the modules' `answer(method, path, query, body, ticket)` takes it. */
export type AgentDoor = (
  method: string,
  path: string,
  query: URLSearchParams,
  body: Record<string, unknown> | null,
) => Promise<{ status: number; body: unknown; raw?: { bytes: string | Uint8Array } } | null>

/** What the stand-in host saw and holds. */
export interface FakeHost {
  origin: string
  /** Every token issued to it (`POST /host/place`), with the module and project it was issued in. */
  issued: Map<string, { module: string; project: string }>
  /** Every server question it was asked, in order. */
  asked: { module: string; method: string; params: Record<string, unknown> }[]
  close(): Promise<void>
}

export interface AgentConformanceOptions {
  /** The module's manifest, as it exports it. */
  manifest: { id: string; declares?: { uses?: readonly string[] }; services?: Record<string, unknown> | null; mcp?: unknown }
  /** The module's doors (its `answer`), called in-process. */
  door: AgentDoor
  /** A project folder the module's adopt flow accepts in this test. */
  project: string
  /**
   * Place a conversation this module did NOT launch, the way a person does (its adopt command), with
   * the stand-in host running. Gives back what the conversation is told, word for word, and its id.
   */
  adopt(host: FakeHost): Promise<{ said: string; conversation: string }>
  /** A conversation this module launched: the token on its doors' URLs, issued to `host` already. */
  launched?(host: FakeHost): Promise<{ token: string }>
}

export interface AgentConformance {
  failures: string[]
  passed: string[]
}

async function bodyOf(request: IncomingMessage): Promise<Record<string, unknown> | null> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(chunk as Buffer)
  try {
    const read = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
    return read && typeof read === 'object' && !Array.isArray(read) ? (read as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/**
 * A host of the test's own on 127.0.0.1: takes token issues (`POST /host/place`) and answers
 * `messages.send` / `messages.read` the way a host does — only for a token THIS module issued, and only
 * while the module's record (`RECORDED_PLACE_PATH`, asked through `door`) still places it.
 */
export async function fakeHost(door: AgentDoor): Promise<FakeHost> {
  const issued = new Map<string, { module: string; project: string }>()
  const asked: FakeHost['asked'] = []
  let sent = 0
  const send = (response: import('node:http').ServerResponse, status: number, body: unknown) => {
    response.writeHead(status, { 'content-type': 'application/json', ...OPEN })
    response.end(JSON.stringify(body))
  }
  const refuse = (error: string) => ({ ok: false, reason: 'failed', error })
  const server: Server = createServer(async (request, response) => {
    /* A test run with a DOM preloaded fetches like a browser: preflights are let through. */
    if (request.method === 'OPTIONS') {
      response.writeHead(204, OPEN)
      return response.end()
    }
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    const body = await bodyOf(request)
    if (url.pathname === '/host/place' && request.method === 'POST') {
      const read = placeIssueSchema.safeParse(body)
      if (!read.success) return send(response, 400, { ok: false, error: 'not an issue' })
      issued.set(read.data.token, { module: read.data.module, project: read.data.project })
      return send(response, 200, { ok: true, token: read.data.token, doors: [] })
    }
    if (url.pathname === SERVER_ASK_PATH && request.method === 'POST' && body) {
      const module = String(body.module ?? '')
      const method = String(body.method ?? '')
      const params = (body.params && typeof body.params === 'object' ? body.params : {}) as Record<string, unknown>
      asked.push({ module, method, params })
      if (method !== 'messages.send' && method !== 'messages.read') return send(response, 200, refuse(`${method} is not answered by this test host.`))
      const token = typeof params.token === 'string' ? params.token : ''
      const issue = issued.get(token)
      if (!issue) return send(response, 200, refuse('This host holds no session behind that token, so it keeps no messages for it.'))
      if (issue.module !== module) return send(response, 200, refuse('That token was issued by another module.'))
      const said = await door('GET', RECORDED_PLACE_PATH, new URLSearchParams({ 'kehikot-place': token, project: issue.project }), null).catch(() => null)
      const place = (said?.body as { place?: { conversation?: string | null; epic?: string | null; parts?: string[]; kehikko?: string | null } | null } | undefined)?.place
      if (!place) return send(response, 200, refuse('The module that issued that token has no record of its session just now. Nothing was done.'))
      if (method === 'messages.send') return send(response, 200, { ok: true, data: { outcome: 'sent', id: ++sent, why: '' } })
      return send(response, 200, {
        ok: true,
        data: { messages: [], unread: 0, you: { module, session: place.conversation ?? null, place: { epic: place.epic ?? null, parts: place.parts ?? [], kehikko: place.kehikko ?? null } } },
      })
    }
    send(response, 404, { ok: false, error: 'not here' })
  })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  return {
    origin: `http://127.0.0.1:${port}`,
    issued,
    asked,
    close: () => new Promise<void>((done) => server.close(() => done())),
  }
}

const OPEN = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS' }

interface ToolText {
  text: string
  isError: boolean
}

async function rpc(door: AgentDoor, token: string | null, method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const query = new URLSearchParams(token ? { 'kehikot-place': token } : {})
  const said = await door('POST', '/mcp', query, { jsonrpc: '2.0', id: 1, method, params })
  return (said?.body as { result?: unknown } | undefined)?.result
}

async function listed(door: AgentDoor, token: string | null): Promise<{ name: string; inputSchema?: { properties?: Record<string, unknown> } }[]> {
  const result = (await rpc(door, token, 'tools/list')) as { tools?: unknown } | undefined
  return Array.isArray(result?.tools) ? (result.tools as { name: string }[]) : []
}

async function called(door: AgentDoor, token: string | null, name: string, args: Record<string, unknown>): Promise<ToolText> {
  const result = (await rpc(door, token, 'tools/call', { name, arguments: args })) as { content?: { text?: string }[]; isError?: boolean } | undefined
  return { text: result?.content?.map((one) => one.text ?? '').join('\n') ?? '', isError: result?.isError === true }
}

/** The tool names a manifest's `mcp.subjects` names. */
function declaredTools(mcp: unknown): string[] {
  const subjects = (mcp as { subjects?: unknown } | undefined)?.subjects
  if (!Array.isArray(subjects)) return []
  return subjects.flatMap((one) => ['show', 'release', 'done'].map((role) => (one as Record<string, unknown>)[role]).filter((name): name is string => typeof name === 'string'))
}

/** Run the conformance check; what failed and what passed, in words. */
export async function agentConformance(options: AgentConformanceOptions): Promise<AgentConformance> {
  const failures: string[] = []
  const passed: string[] = []
  const check = (ok: boolean, what: string, why: string) => (ok ? passed : failures).push(ok ? what : `${what}: ${why}`)
  const { manifest, door } = options
  const messages = (manifest.declares?.uses ?? []).includes('agents:message')

  const host = await fakeHost(door)
  const had = { origins: process.env.KEHIKOT_ORIGINS, origin: process.env.KEHIKOT_ORIGIN }
  process.env.KEHIKOT_ORIGINS = host.origin
  process.env.KEHIKOT_ORIGIN = host.origin
  forgetMessageHosts()
  try {
    /* 1. The delivery service. */
    const delivery = messages ? serviceDescriptor(AGENT_DELIVERY, manifest.services?.[AGENT_DELIVERY]) : null
    if (messages) {
      check(Boolean(delivery), 'provides agent.delivery', `${manifest.id} messages (agents:message) and its manifest has no agent.delivery service whose descriptor parses (services['agent.delivery']: { name, program, deliver, adopt }).`)
      if (delivery) {
        const knocked = await door('POST', delivery.deliver, new URLSearchParams(), { project: options.project }).catch(() => null)
        check(
          knocked?.status === 200 && agentDeliverResult.safeParse(knocked.body).success,
          'answers a delivery knock',
          `POST ${delivery.deliver} { project } answered ${knocked ? `HTTP ${knocked.status}` : 'nothing'}, not agentDeliverResult (deliveryReply in kehikot-module-protocol/serve answers it).`,
        )
      }
    }

    /* 2. Nothing listed only for a launched conversation. */
    const bare = await listed(door, null)
    const names = new Set(bare.map((tool) => tool.name))
    const owed = [...(messages ? MESSAGE_TOOL_NAMES : []), ...declaredTools(manifest.mcp)]
    const missing = owed.filter((name) => !names.has(name))
    check(missing.length === 0, 'lists every tool to a caller with no place token', `tools/list without a token lacks ${missing.join(', ')}. List every tool; one a caller cannot use yet answers why.`)
    if (!messages) return { failures, passed }
    const takesKey = bare.filter((tool) => (MESSAGE_TOOL_NAMES as readonly string[]).includes(tool.name)).every((tool) => tool.inputSchema?.properties?.[PLACE_TOKEN_ARG])
    check(takesKey, 'message tools take placeToken', `send_message and read_messages must take ${PLACE_TOKEN_ARG} (messageTools / messageToolsFor in the protocol list it).`)

    /* 3. No identity: said in words. */
    const anonymous = await called(door, null, 'send_message', { body: 'conformance: no key' })
    check(anonymous.isError && anonymous.text.includes(NOT_PLACED_HEAD), 'refuses an unknown conversation in words', `send_message with no key answered ${JSON.stringify(anonymous.text.slice(0, 160))}; it should say “${NOT_PLACED_HEAD}…” and what to do (answerMessageTool does).`)

    /* 4. A conversation placed afterwards. */
    const adopted = await options.adopt(host)
    const key = placeTokenIn(adopted.said)
    check(Boolean(key), 'gives an adopted conversation its key in words', `the adopt answer has no “Kehikot key for this conversation: …” line (placeTokenLine): ${JSON.stringify(adopted.said.slice(0, 200))}`)
    if (key) {
      const issue = host.issued.get(key)
      check(issue?.module === manifest.id, 'issues the adopted key to the host', `the key was not issued to the host for ${manifest.id} (issuePlaceToken).`)
      const sentAdopted = await called(door, null, 'send_message', { body: 'conformance: adopted', [PLACE_TOKEN_ARG]: key })
      check(!sentAdopted.isError, 'an adopted conversation can send', `send_message with its key answered ${JSON.stringify(sentAdopted.text.slice(0, 200))}`)
      const readAdopted = await called(door, null, 'read_messages', { [PLACE_TOKEN_ARG]: key })
      check(!readAdopted.isError, 'an adopted conversation can read', `read_messages with its key answered ${JSON.stringify(readAdopted.text.slice(0, 200))}`)
    }

    /* 5. Guessing. */
    const guessed = await called(door, null, 'send_message', { body: 'conformance: guessed', [PLACE_TOKEN_ARG]: freshPlaceToken() })
    check(guessed.isError, 'refuses a made-up key', `send_message with a key nobody issued answered ${JSON.stringify(guessed.text.slice(0, 160))}`)
    const byId = await called(door, null, 'send_message', { body: 'conformance: an id', [PLACE_TOKEN_ARG]: adopted.conversation })
    check(byId.isError, 'refuses a conversation id given as a key', `send_message with the conversation's id as its key answered ${JSON.stringify(byId.text.slice(0, 160))}`)

    /* 6. The launched path, unchanged. */
    if (options.launched) {
      const { token } = await options.launched(host)
      const withToken = new Set((await listed(door, token)).map((tool) => tool.name))
      check(MESSAGE_TOOL_NAMES.every((name) => withToken.has(name)), 'lists the message tools to a launched conversation', 'tools/list with a URL token lacks a message tool.')
      const sentLaunched = await called(door, token, 'send_message', { body: 'conformance: launched' })
      check(!sentLaunched.isError, 'a launched conversation can send', `send_message with the URL token answered ${JSON.stringify(sentLaunched.text.slice(0, 200))}`)
    }
    return { failures, passed }
  } finally {
    if (had.origins === undefined) delete process.env.KEHIKOT_ORIGINS
    else process.env.KEHIKOT_ORIGINS = had.origins
    if (had.origin === undefined) delete process.env.KEHIKOT_ORIGIN
    else process.env.KEHIKOT_ORIGIN = had.origin
    forgetMessageHosts()
    await host.close()
  }
}

/** `agentConformance`, throwing one error that lists every failure. For a test. */
export async function expectAgentConformance(options: AgentConformanceOptions): Promise<AgentConformance> {
  const said = await agentConformance(options)
  if (said.failures.length) throw new Error(`${options.manifest.id} fails the agent-module conformance:\n- ${said.failures.join('\n- ')}`)
  return said
}
