import { describe, expect, test } from 'bun:test'

import {
  AGENT_DELIVERY,
  AGENT_TASKS,
  AGENT_TASK_ANSWER_MS,
  METHODS,
  PLACE_TOKEN_ARG,
  SERVER_METHODS,
  SERVER_METHOD_SINCE,
  agentTaskStartParams,
  agentTaskStartResult,
  methodParams,
  placeTokenLine,
  tasksReportParams,
  tellFinishedTool,
} from '../src/index.js'
import { acceptTask, answerMessageTool, askHost, callToken, deliveryReply, freshPlaceToken, issuePlaceToken, messageToolsFor, vouchHost } from '../src/serve/index.js'
import { agentConformance, fakeHost, type AgentDoor, type StandInProgram } from '../src/testing/index.js'
import { checkAgentFiles } from '../src/check/agent.js'

/**
 * 2.99.0: `agent.tasks`' `start` answers at once — it accepts, and starts its program after — and what
 * became of the task reaches the host as `tasks.report`. `tell_finished` takes the conversation's key.
 * The conformance holds a module to both, against a program that takes 20 s to boot.
 */

const ID = 'kehikot.example'
const DELIVERY = { name: 'Example', program: 'Example CLI', deliver: '/api/deliver', adopt: 'Type /here in it.' }
const TASKS = { name: 'Example', program: 'Example CLI', start: '/api/tasks/start', view: '/app?session={session}' }

describe('2.99.0 — the contract', () => {
  test('an acceptance is started + pending; older answers read as before', () => {
    expect(agentTaskStartResult.parse({ outcome: 'started', session: 'h-1', pending: true })).toEqual({ outcome: 'started', session: 'h-1', why: '', pending: true })
    expect(agentTaskStartResult.parse({ outcome: 'started', session: 's-1' }).pending).toBe(false)
    expect(AGENT_TASK_ANSWER_MS).toBe(1000)
  })

  test('tasks.report: a server method under activity:report, since 2.99.0', () => {
    expect((SERVER_METHODS as readonly string[]).includes('tasks.report')).toBe(true)
    expect(METHODS['tasks.report']).toBe('activity:report')
    expect(SERVER_METHOD_SINCE['tasks.report']).toBe('2.99.0')
    expect(methodParams['tasks.report'].safeParse({ session: 'h-1', outcome: 'failed', why: 'not installed' }).success).toBe(true)
    expect(tasksReportParams.safeParse({ session: 'h-1', outcome: 'maybe' }).success).toBe(false)
  })

  test('tell_finished takes placeToken', () => {
    const properties = tellFinishedTool().inputSchema.properties as Record<string, unknown>
    expect(properties[PLACE_TOKEN_ARG]).toBeDefined()
    expect(callToken(null, { event: 'done', [PLACE_TOKEN_ARG]: 'abcdefghijklmnopqrstuvwxyz012345' })).toBe('abcdefghijklmnopqrstuvwxyz012345')
  })

  test('acceptTask answers before any of the work, then reports what it came to', async () => {
    const reported: unknown[] = []
    const fetch = (async (_url: string, init?: RequestInit) => {
      reported.push(JSON.parse(String(init?.body)))
      return new Response(JSON.stringify({ ok: true, data: { outcome: 'told', why: '' } }))
    }) as unknown as typeof globalThis.fetch
    const env = { KEHIKOT_HOST: 'http://127.0.0.1:1' }
    let began = false
    const answer = acceptTask('h-1', async () => {
      began = true
      throw new Error('Example CLI is not signed in.')
    }, { module: ID, env, fetch })
    expect(answer).toEqual({ outcome: 'started', session: 'h-1', why: '', pending: true })
    expect(began).toBe(false)
    acceptTask('h-2', async () => ({ ok: true, conversation: 'conv-9' }), { module: ID, env, fetch })
    await new Promise((done) => setTimeout(done, 50))
    expect(reported.map((one) => (one as { method: string; params: unknown }).params)).toEqual([
      { session: 'h-1', conversation: null, outcome: 'failed', why: 'Example CLI is not signed in.' },
      { session: 'h-2', conversation: 'conv-9', outcome: 'started', why: '' },
    ])
  })
})

describe('2.99.0 — the conformance holds start to answering at once', () => {
  const manifest = { id: ID, declares: { uses: ['agents:message', 'activity:report'] }, services: { [AGENT_DELIVERY]: DELIVERY, [AGENT_TASKS]: TASKS } }

  /**
   * A tiny agent module with a program stand-in. `blocking`: its start waits for the program before it
   * answers, as every module did before 2.99.0 (capped, so the test does not wait 20 s).
   */
  function exampleModule(options: { blocking?: boolean; tellsAdopted?: boolean; asks?: string } = {}) {
    const records = new Map<string, string>()
    let program: StandInProgram = { bootMs: 0 }
    const boot = () =>
      new Promise<{ ok: true; conversation: string } | { ok: false; why: string }>((done) =>
        setTimeout(() => done(program.fails ? { ok: false, why: 'Example CLI could not start: not signed in.' } : { ok: true, conversation: `conv-${Math.random().toString(36).slice(2, 8)}` }), options.blocking ? Math.min(program.bootMs, 1500) : program.bootMs),
      )
    const door: AgentDoor = async (method, path, query, body) => {
      if (path === '/api/kehikot/place') {
        const conversation = records.get(query.get('kehikot-place') ?? '')
        return { status: 200, body: { ok: true, place: conversation ? { conversation, epic: 'auth', parts: [], kehikko: null } : null } }
      }
      if (path === DELIVERY.deliver) return deliveryReply(method, body, async () => 0)
      if (path === '/mcp') {
        const rpc = body as { method: string; params?: { name?: string; arguments?: Record<string, unknown> } }
        const token = query.get('kehikot-place')
        if (rpc.method === 'tools/list') {
          const tell = tellFinishedTool()
          return { status: 200, body: { result: { tools: [...(await messageToolsFor(token, { module: ID })), options.tellsAdopted === false ? { ...tell, inputSchema: { type: 'object', properties: { event: {} } } } : tell] } } }
        }
        const name = rpc.params?.name ?? ''
        const args = rpc.params?.arguments ?? {}
        if (name === 'tell_finished') {
          const key = options.tellsAdopted === false ? token : callToken(token, args)
          const known = key ? records.has(key) : false
          return { status: 200, body: { result: { content: [{ type: 'text', text: known ? 'Told.' : 'Not one Kehikot’s module is running.' }], isError: !known } } }
        }
        const said = await answerMessageTool(name, args, { module: ID, token, adopt: 'In Example: type /here.' })
        return { status: 200, body: { result: { content: [{ type: 'text', text: said?.text ?? '' }], isError: said?.isError } } }
      }
      return null
    }
    const start = async (raw: unknown, headers: Record<string, string>) => {
      const vouched = await vouchHost(headers)
      if (!vouched.ok) return { status: 403, body: { ok: false, error: vouched.why } }
      const read = agentTaskStartParams.safeParse(raw)
      if (!read.success) return { status: 400, body: { ok: false, error: 'not a task' } }
      if (options.asks) await askHost(options.asks as 'tracker.get', {}, { module: ID })
      if (options.blocking) {
        const came = await boot()
        return { status: 200, body: came.ok ? { outcome: 'started', session: came.conversation } : { outcome: 'declined', session: null, why: came.why } }
      }
      return { status: 200, body: acceptTask(`h-${Math.random().toString(36).slice(2, 10)}`, boot, { module: ID }) }
    }
    const adopt = async () => {
      const token = freshPlaceToken()
      records.set(token, 'conv-1234')
      await issuePlaceToken({ module: ID, token, project: '/p', kehikko: null })
      return { said: `Kehikot: Assigned to auth.\n${placeTokenLine(token)}`, conversation: 'conv-1234' }
    }
    const tasks = {
      start,
      program: async (behaviour: StandInProgram) => {
        program = behaviour
        return () => {
          program = { bootMs: 0 }
        }
      },
    }
    return { door, adopt, tasks }
  }

  test('a module that accepts at once passes, with every 2.99.0 check', async () => {
    const built = exampleModule()
    const said = await agentConformance({ manifest, door: built.door, project: '/p', adopt: built.adopt, tasks: built.tasks })
    expect(said.failures).toEqual([])
    for (const one of [
      'start refuses a caller the host did not vouch for',
      'start answers within a second while its program boots',
      'start accepts the task (started, a session, pending)',
      'a task whose program fails is reported failed, with why',
      'a task whose program starts is reported started, with its conversation',
      'tell_finished takes placeToken',
      'an adopted conversation can tell_finished',
      'asks the host only what its manifest declares',
    ]) expect(said.passed).toContain(one)
  })

  test('a module that boots its program before answering fails, saying how long it took', async () => {
    const built = exampleModule({ blocking: true })
    const said = await agentConformance({ manifest, door: built.door, project: '/p', adopt: built.adopt, tasks: built.tasks, reportWithinMs: 300 })
    expect(said.failures.some((one) => one.startsWith('start answers within a second while its program boots: start took'))).toBe(true)
    expect(said.failures.some((one) => one.startsWith('start accepts the task'))).toBe(true)
    expect(said.failures.some((one) => one.startsWith('a task whose program fails is reported failed'))).toBe(true)
  }, 20_000)

  test('a module that provides agent.tasks and gives no tasks fails', async () => {
    const built = exampleModule()
    const said = await agentConformance({ manifest, door: built.door, project: '/p', adopt: built.adopt })
    expect(said.failures.some((one) => one.startsWith('is given a way to start a task'))).toBe(true)
  })

  test('tell_finished only by the URL token fails for an adopted conversation', async () => {
    const built = exampleModule({ tellsAdopted: false })
    const said = await agentConformance({ manifest, door: built.door, project: '/p', adopt: built.adopt, tasks: built.tasks })
    expect(said.failures.some((one) => one.startsWith('tell_finished takes placeToken'))).toBe(true)
    expect(said.failures.some((one) => one.startsWith('an adopted conversation can tell_finished'))).toBe(true)
  })

  test('asking the host a method its manifest did not declare fails', async () => {
    const built = exampleModule({ asks: 'tracker.get' })
    const said = await agentConformance({ manifest, door: built.door, project: '/p', adopt: built.adopt, tasks: built.tasks })
    expect(said.failures.some((one) => one.startsWith('asks the host only what its manifest declares') && one.includes('tracker.get'))).toBe(true)
  })

  test('the stand-in host vouches once for a pass it minted, and is the only host asked', async () => {
    const host = await fakeHost(async () => null)
    try {
      const pass = host.mintPass()
      const env = { KEHIKOT_HOST: host.origin }
      expect(await vouchHost({ 'x-kehikot-caller': 'kehikko', 'x-kehikot-pass': pass }, { env })).toEqual({ ok: true })
      expect((await vouchHost({ 'x-kehikot-caller': 'kehikko', 'x-kehikot-pass': pass }, { env })).ok).toBe(false)
    } finally {
      await host.close()
    }
  })

  test('check:agent: a module providing agent.tasks must give the conformance its tasks', () => {
    const plain = { path: 'test/agent.test.ts', text: "import { expectAgentConformance } from 'kehikot-module-protocol/testing'\nawait expectAgentConformance({ manifest, door })" }
    const withTasks = { path: 'test/agent.test.ts', text: "import { expectAgentConformance } from 'kehikot-module-protocol/testing'\nawait expectAgentConformance({ manifest, door, tasks: { start, program } })" }
    expect(checkAgentFiles(manifest, [], [withTasks]).failures).toEqual([])
    const failed = checkAgentFiles(manifest, [], [plain]).failures
    expect(failed).toHaveLength(1)
    expect(failed[0]).toContain('agent.tasks')
    expect(checkAgentFiles({ ...manifest, services: { [AGENT_DELIVERY]: DELIVERY } }, [], [plain]).failures).toEqual([])
  })
})
