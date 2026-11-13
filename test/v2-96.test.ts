import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import {
  AGENT_DELIVERY,
  NOT_PLACED_HEAD,
  OLDER_MESSAGE_DOOR,
  PLACE_TOKEN_ARG,
  adoptWays,
  agentDeliverResult,
  messageTools,
  notPlacedText,
  placeTokenIn,
  placeTokenLine,
  serviceDescriptor,
  servicesSchema,
} from '../src/index.js'
import { answerMessageTool, callToken, deliveryReply, freshPlaceToken, issuePlaceToken, messageToolsFor } from '../src/serve/index.js'
import { agentConformance, type AgentDoor } from '../src/testing/index.js'
import { checkAgentFiles } from '../src/check/agent.js'
import { checkDoor } from '../src/check/door.js'

const TOKEN = 'abcdefghijklmnopqrstuvwxyz012345'
const DELIVERY = { name: 'Claude', program: 'Claude Code', deliver: '/api/deliver', adopt: 'Type /kehikot-here in it.' }

describe('2.96.0 — one key for a conversation however it started', () => {
  test('the message tools take placeToken; a module’s say they forward to the kehikko door', () => {
    for (const tool of messageTools()) expect((tool.inputSchema.properties as Record<string, unknown>)[PLACE_TOKEN_ARG]).toBeDefined()
    for (const tool of messageTools(false, { older: true })) expect(tool.description.startsWith(OLDER_MESSAGE_DOOR)).toBe(true)
    for (const tool of messageTools()) expect(tool.description.startsWith(OLDER_MESSAGE_DOOR)).toBe(false)
  })

  test('the key is said in words and read back; a session id is never one', () => {
    const token = freshPlaceToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(freshPlaceToken()).not.toBe(token)
    expect(placeTokenIn(`Kehikot: Assigned.\n${placeTokenLine(token)}`)).toBe(token)
    expect(placeTokenIn('Kehikot: Assigned.')).toBeNull()
    expect(callToken(null, { [PLACE_TOKEN_ARG]: token })).toBe(token)
    expect(callToken(TOKEN, { [PLACE_TOKEN_ARG]: token })).toBe(TOKEN)
    expect(callToken(null, { [PLACE_TOKEN_ARG]: 'short' })).toBeNull()
    expect(callToken(null, {})).toBeNull()
  })

  test('no key: the tools are listed and say why and what to do, with the module’s way', async () => {
    expect((await messageToolsFor(null, { module: 'kehikot.claude' })).map((tool) => tool.name)).toEqual(['send_message', 'read_messages'])
    const said = await answerMessageTool('send_message', { body: 'hi' }, { module: 'kehikot.claude', token: null, adopt: 'In Claude Code: Type /kehikot-here in it.' })
    expect(said?.isError).toBe(true)
    expect(said?.text.startsWith(NOT_PLACED_HEAD)).toBe(true)
    expect(said?.text).toContain('/kehikot-here')
    expect(notPlacedText()).toContain(PLACE_TOKEN_ARG)
  })

  test('a placeToken argument is the session asked about, and is not passed on as an argument', async () => {
    const asked: unknown[] = []
    const fetch = (async (_url: string, init?: RequestInit) => {
      asked.push(JSON.parse(String(init?.body)).params)
      return new Response(JSON.stringify({ ok: true, data: { outcome: 'sent', id: 3, why: '' } }))
    }) as unknown as typeof globalThis.fetch
    const said = await answerMessageTool('send_message', { body: 'hi', [PLACE_TOKEN_ARG]: TOKEN }, { module: 'kehikot.claude', token: null, env: { KEHIKOT_ORIGINS: 'http://127.0.0.1:1' }, fetch })
    expect(said).toEqual({ text: 'Sent (message #3).', isError: false })
    expect(asked).toEqual([{ token: TOKEN, body: 'hi' }])
  })

  test('agent.delivery: a known service, its words, and the knock’s answer', async () => {
    expect(serviceDescriptor(AGENT_DELIVERY, DELIVERY)).toEqual(DELIVERY)
    expect(serviceDescriptor(AGENT_DELIVERY, { ...DELIVERY, deliver: 'http://elsewhere/' })).toBeNull()
    expect(servicesSchema.safeParse({ [AGENT_DELIVERY]: DELIVERY }).success).toBe(true)
    expect(adoptWays([DELIVERY])).toEqual(['In Claude Code: Type /kehikot-here in it.'])
    const knocked = await deliveryReply('POST', { project: '/p' }, async () => 2)
    expect(agentDeliverResult.parse(knocked.body)).toEqual({ outcome: 'delivered', delivered: 2, why: '' })
    expect((await deliveryReply('POST', { project: '/p' }, async () => 0)).body).toEqual({ outcome: 'none', delivered: 0, why: '' })
    expect((await deliveryReply('POST', {}, async () => 0)).status).toBe(400)
    expect((await deliveryReply('GET', null, async () => 0)).status).toBe(405)
  })

  test('issuePlaceToken posts the issue to a loopback host and is true only when it took it', async () => {
    const posted: unknown[] = []
    const fetch = (async (url: string | URL, init?: RequestInit) => {
      posted.push([String(url), JSON.parse(String(init?.body))])
      return new Response(JSON.stringify({ ok: true, token: TOKEN, doors: [] }))
    }) as unknown as typeof globalThis.fetch
    const issue = { module: 'kehikot.claude', token: TOKEN, project: '/p', kehikko: null }
    expect(await issuePlaceToken(issue, { env: { KEHIKOT_ORIGINS: 'http://127.0.0.1:4170 https://example.com' }, fetch })).toBe(true)
    expect(posted).toEqual([['http://127.0.0.1:4170/host/place', issue]])
    expect(await issuePlaceToken({ ...issue, token: 'short' }, { env: { KEHIKOT_ORIGINS: 'http://127.0.0.1:4170' }, fetch })).toBe(false)
  })
})

describe('2.96.0 — the conformance harness, against a module door built the 2.96.0 way and one built the old way', () => {
  const ID = 'kehikot.example'
  const manifest = { id: ID, declares: { uses: ['agents:message'] }, services: { [AGENT_DELIVERY]: DELIVERY } }

  /** A tiny agent module: a record of conversations by token, an adopt that issues, and a door. */
  function moduleDoor(old: boolean) {
    const records = new Map<string, string>()
    const door: AgentDoor = async (method, path, query, body) => {
      if (path === '/api/kehikot/place') {
        const conversation = records.get(query.get('kehikot-place') ?? '')
        return { status: 200, body: { ok: true, place: conversation ? { conversation, epic: 'auth', parts: [], kehikko: null } : null } }
      }
      if (path === DELIVERY.deliver) return deliveryReply(method, body, async () => 0)
      if (path === '/mcp') {
        const rpc = body as { id: number; method: string; params?: { name?: string; arguments?: Record<string, unknown> } }
        const token = query.get('kehikot-place')
        if (rpc.method === 'tools/list') return { status: 200, body: { result: { tools: old && !token ? [] : await messageToolsFor(token, { module: ID }) } } }
        const said = await answerMessageTool(rpc.params?.name ?? '', rpc.params?.arguments ?? {}, { module: ID, token, adopt: 'In Example: type /here.' })
        return { status: 200, body: { result: { content: [{ type: 'text', text: said?.text ?? '' }], isError: said?.isError } } }
      }
      return null
    }
    const adopt = async () => {
      const token = freshPlaceToken()
      records.set(token, 'conv-1234')
      await issuePlaceToken({ module: ID, token, project: '/p', kehikko: null })
      return { said: `Kehikot: Assigned to auth.\n${placeTokenLine(token)}`, conversation: 'conv-1234' }
    }
    const launched = async () => {
      const token = freshPlaceToken()
      records.set(token, 'conv-launched')
      await issuePlaceToken({ module: ID, token, project: '/p', kehikko: null })
      return { token }
    }
    return { door, adopt, launched }
  }

  test('a module built the 2.96.0 way passes', async () => {
    const built = moduleDoor(false)
    const said = await agentConformance({ manifest, door: built.door, project: '/p', adopt: built.adopt, launched: built.launched })
    expect(said.failures).toEqual([])
    expect(said.passed.length).toBeGreaterThanOrEqual(10)
  })

  test('one that lists the message tools only for a launched conversation fails, and says so', async () => {
    const built = moduleDoor(true)
    const said = await agentConformance({ manifest, door: built.door, project: '/p', adopt: built.adopt })
    expect(said.failures.some((one) => one.startsWith('lists every tool to a caller with no place token'))).toBe(true)
  })

  test('one that messages without agent.delivery fails', async () => {
    const built = moduleDoor(false)
    const said = await agentConformance({ manifest: { ...manifest, services: {} }, door: built.door, project: '/p', adopt: built.adopt })
    expect(said.failures.some((one) => one.startsWith('provides agent.delivery'))).toBe(true)
  })

  test('check:agent fails a module with no delivery, no conformance test, or tools behind a token', () => {
    const conformance = { path: 'test/agent.test.ts', text: "import { expectAgentConformance } from 'kehikot-module-protocol/testing'\nawait expectAgentConformance({})" }
    expect(checkAgentFiles(manifest, [], [conformance]).failures).toEqual([])
    expect(checkAgentFiles({ id: 'x', declares: { uses: [] } }, [], []).agent).toBe(false)
    expect(checkAgentFiles({ ...manifest, services: {} }, [], [conformance]).failures).toHaveLength(1)
    expect(checkAgentFiles(manifest, [], []).failures).toHaveLength(1)
    const gated = { path: 'doors.ts', text: 'tools: [...tools(), ...(token ? await messageToolsFor(token, o) : [])]' }
    expect(checkAgentFiles(manifest, [gated], [conformance]).failures).toHaveLength(1)
  })

  test('check:door --running fails a messaging module whose door lists no message tools to a caller with no token', () => {
    const declared = { id: ID, mcp: { subjects: [] } as never, declares: { uses: ['agents:message'] } }
    expect(checkDoor(declared, []).failures).toHaveLength(2)
    expect(checkDoor(declared, messageTools() as never).failures).toEqual([])
  })

  test('the docs say where messaging lives', () => {
    const doc = readFileSync(new URL('../docs/agent-messages.md', import.meta.url), 'utf8')
    for (const word of ['2.96.0', 'agent.delivery', 'placeToken', 'expectAgentConformance', 'kehikot-check-agent']) expect(doc).toContain(word)
  })
})
