import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import {
  agentMessageSchema,
  messageReadResult,
  type AgentMessage,
  type MessageReadResult,
  type WakeReader,
} from '../src/index.js'
import {
  AGENT_DELIVERY,
  placeTokenLine,
} from '../src/index.js'
import { answerMessageTool, deliveryReply, freshPlaceToken, issuePlaceToken, messageToolsFor, askHost } from '../src/serve/index.js'
import { DELIVERY_SAFETY_MS, WAKE_EVERY_MS, messageDelivery, type DeliverySession } from '../src/serve/index.js'
import { agentConformance, type AgentDoor, type FakeHost } from '../src/testing/index.js'

/**
 * 2.103.0: an idle agent module does not poll the host. `messageDelivery`'s timer looked at every idle
 * session every 5 s and asked `messages.read` for each, getting the same answer every time, each ask
 * costing a server-pass vouch and a place lookup back at the module. Now the timer's look is local; the
 * host is asked when it knocks (`tick`), when a session is first listed or newly armed, and as a safety.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')
const TOKEN = 'b'.repeat(32)
const YOU: WakeReader = { module: 'kehikot.claude', session: 'me-1', place: { epic: 'methods', parts: [], kehikko: 'writing' } }
const T0 = Date.parse('2026-11-04T12:00:00.000Z')
const MINUTE = 60_000

let ids = 500
const message = (over: Partial<AgentMessage> = {}): AgentMessage =>
  agentMessageSchema.parse({
    id: ++ids,
    at: new Date(T0 - 60_000).toISOString(),
    from: { module: 'kehikot.codex', name: 'Codex', session: 'sess-1', place: { epic: 'methods', parts: [], kehikko: 'writing' } },
    to: { session: { module: 'kehikot.claude', session: 'me-1' } },
    thread: null,
    body: 'Please leave server/auth.ts alone for an hour.',
    ...over,
  })
const readOf = (messages: AgentMessage[], unread: number): MessageReadResult => messageReadResult.parse({ messages, unread, you: YOU })
const session = (over: Partial<DeliverySession> = {}): DeliverySession => ({ key: 'sess-a', token: TOKEN, own: true, state: 'idle', wake: true, act: false, ...over })

function rig(given: { sessions?: DeliverySession[]; inbox?: AgentMessage[]; safetyEveryMs?: number } = {}) {
  let clock = T0
  let list = given.sessions ?? [session()]
  let inbox = given.inbox ?? []
  let delivered = 0
  const asked: { unread: boolean; at: number }[] = []
  const typed: string[] = []
  const delivery = messageDelivery({
    module: 'kehikot.claude',
    sessions: () => list,
    type: (_key, text) => (typed.push(text), true),
    now: () => clock,
    ...(given.safetyEveryMs ? { safetyEveryMs: given.safetyEveryMs } : {}),
    read: async (_token, unread) => {
      asked.push({ unread, at: clock })
      const fresh = inbox.filter((m) => m.id > delivered)
      if (unread) {
        if (fresh.length) delivered = fresh.at(-1)!.id
        return { ok: true, data: readOf(fresh, 0) }
      }
      return { ok: true, data: readOf(inbox.slice(-50), fresh.length) }
    },
  })
  return {
    delivery,
    asked,
    typed,
    advance: (ms: number) => (clock += ms),
    set: (next: DeliverySession[]) => (list = next),
    arrive: (m: AgentMessage) => void inbox.push(m),
    /** Another reader (the agent's own read_messages) takes what waits: counted delivered. */
    takenElsewhere: () => (delivered = inbox.at(-1)?.id ?? 0),
    reads: () => asked.filter((one) => !one.unread).length,
    /** The timer's looks, every WAKE_EVERY_MS, for `ms` of the clock. */
    async looks(ms: number) {
      for (let spent = 0; spent < ms; spent += WAKE_EVERY_MS) {
        clock += WAKE_EVERY_MS
        await delivery.look()
      }
    },
  }
}

describe('2.103.0', () => {
  test('is the package version, and the docs say it', () => {
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.103.0')
    expect(readFileSync(join(REPO, 'docs/agent-messages.md'), 'utf8')).toContain('DELIVERY_SAFETY_MS')
  })
})

describe('an idle module does not poll the host', () => {
  test('an hour of the timer’s looks with no message: one ask when the session is first listed, then only the safety', async () => {
    const r = rig()
    await r.looks(60 * MINUTE)
    /* Before 2.103.0: 720 asks (every 5 s), 12 a minute. */
    expect(r.reads()).toBeLessThanOrEqual(1 + 60 * MINUTE / DELIVERY_SAFETY_MS)
    expect(r.reads()).toBe(12)
    expect(r.reads() / 60).toBeLessThan(0.25)
  })

  test('a quiet minute asks nothing at all, once the session is known', async () => {
    const r = rig()
    await r.looks(WAKE_EVERY_MS)
    const before = r.reads()
    await r.looks(MINUTE)
    expect(r.reads()).toBe(before)
  })

  test('the host’s knock asks at once, and delivers', async () => {
    const r = rig()
    await r.looks(MINUTE)
    r.arrive(message({ at: new Date(T0 + MINUTE).toISOString() }))
    r.advance(10_000)
    await r.delivery.look()
    expect(r.typed).toEqual([])
    expect(await r.delivery.tick()).toBe(1)
    expect(r.typed[0]).toContain('Please leave server/auth.ts alone')
  })

  test('a message that waits for a busy session is typed when it idles, with no ask in between', async () => {
    const r = rig({ sessions: [session({ state: 'busy' })] })
    r.arrive(message())
    await r.delivery.tick()
    const asks = r.asked.length
    await r.looks(5 * 60_000 - WAKE_EVERY_MS)
    expect(r.asked).toHaveLength(asks)
    r.set([session({ state: 'idle' })])
    await r.looks(WAKE_EVERY_MS)
    await r.looks(WAKE_EVERY_MS)
    expect(r.typed).toHaveLength(1)
    /* One read to type it; the only other ask is the safety's, once, five minutes after the knock. */
    expect(r.asked.slice(asks).filter((one) => one.unread)).toHaveLength(1)
    expect(r.asked.slice(asks).filter((one) => !one.unread)).toHaveLength(1)
  })

  test('what waited was read by someone else: one wasted read, then quiet, not a read every look', async () => {
    const r = rig({ sessions: [session({ state: 'busy' })], inbox: [message()] })
    await r.delivery.tick()
    r.takenElsewhere()
    r.set([session({ state: 'idle' })])
    await r.looks(60 * 1000)
    const unreads = r.asked.filter((one) => one.unread).length
    await r.looks(4 * MINUTE)
    expect(unreads).toBeLessThanOrEqual(1)
    expect(r.asked.filter((one) => one.unread).length).toBe(unreads)
    expect(r.typed).toEqual([])
  })

  test('a knock that was lost is caught by the safety interval', async () => {
    const r = rig()
    await r.looks(WAKE_EVERY_MS)
    r.arrive(message({ at: new Date(T0 + 1000).toISOString() }))
    await r.looks(DELIVERY_SAFETY_MS)
    await r.looks(WAKE_EVERY_MS * 2)
    expect(r.typed).toHaveLength(1)
  })

  test('a session whose wake was just turned on is asked about; one that stays off never is', async () => {
    const off = rig({ sessions: [session({ wake: false })] })
    await off.looks(10 * MINUTE)
    expect(off.asked).toEqual([])
    off.arrive(message())
    off.set([session({ wake: true })])
    await off.looks(WAKE_EVERY_MS * 3)
    expect(off.typed).toHaveLength(1)
  })

  test('a knock during a look is not lost: the next look asks', async () => {
    const r = rig()
    await r.looks(WAKE_EVERY_MS)
    r.arrive(message({ at: new Date(T0 - 10 * MINUTE).toISOString() }))
    const first = r.delivery.look()
    const second = r.delivery.tick()
    await Promise.all([first, second])
    await r.looks(WAKE_EVERY_MS * 2)
    expect(r.typed).toHaveLength(1)
  })
})


describe('the agent conformance holds an idle module to it', () => {
  const ID = 'kehikot.example'
  const DELIVERY = { name: 'Example', program: 'Example Code', deliver: '/api/deliver', adopt: 'Type /here in it.' }
  const manifest = { id: ID, declares: { uses: ['agents:message'] }, services: { [AGENT_DELIVERY]: DELIVERY } }

  function moduleDoor() {
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
        if (rpc.method === 'tools/list') return { status: 200, body: { result: { tools: await messageToolsFor(token, { module: ID }) } } }
        const said = await answerMessageTool(rpc.params?.name ?? '', rpc.params?.arguments ?? {}, { module: ID, token, adopt: 'In Example: type /here.' })
        return { status: 200, body: { result: { content: [{ type: 'text', text: said?.text ?? '' }], isError: said?.isError } } }
      }
      return null
    }
    const place = async (conversation: string) => {
      const token = freshPlaceToken()
      records.set(token, conversation)
      await issuePlaceToken({ module: ID, token, project: '/p', kehikko: null })
      return token
    }
    const adopt = async () => {
      const token = await place('conv-1234')
      return { said: `Kehikot: Assigned to auth.\n${placeTokenLine(token)}`, conversation: 'conv-1234' }
    }
    return { door, adopt, place }
  }

  const base = (built: ReturnType<typeof moduleDoor>, idle: (host: FakeHost) => Promise<() => void>) => ({
    manifest, door: built.door, project: '/p', adopt: built.adopt, idle, idleWindowMs: 1200,
  })

  test('a module running messageDelivery on its own timer, with an idle session and nothing waiting, passes', async () => {
    const built = moduleDoor()
    const said = await agentConformance(
      base(built, async () => {
        const token = await built.place('conv-idle')
        const delivery = messageDelivery({ module: ID, everyMs: 150, sessions: () => [{ key: 'conv-idle', token, own: true, state: 'idle', wake: true, act: false }], type: () => true })
        delivery.start()
        return () => delivery.stop()
      }),
    )
    expect(said.failures).toEqual([])
    expect(said.passed).toContain('an idle module asks the host nothing on a clock')
  }, 30_000)

  test('a module that asks the host for messages on a timer fails, and says what to do', async () => {
    const built = moduleDoor()
    const said = await agentConformance(
      base(built, async () => {
        const token = await built.place('conv-poll')
        const timer = setInterval(() => void askHost('messages.read', { token, limit: 20 }, { module: ID }), 150)
        return () => clearInterval(timer)
      }),
    )
    const failed = said.failures.find((one) => one.startsWith('an idle module asks the host nothing on a clock'))
    expect(failed).toBeDefined()
    expect(failed).toContain('messageDelivery')
  }, 30_000)

  test('a module whose own loop asks once about a session it first lists a few seconds in is steady, not polling', async () => {
    const built = moduleDoor()
    const said = await agentConformance(
      base(built, async () => {
        const token = await built.place('conv-late')
        /* Its loop's first look comes after the old fixed pause, as the real modules' (5 s) does. */
        const delivery = messageDelivery({ module: ID, everyMs: 1700, sessions: () => [{ key: 'conv-late', token, own: true, state: 'idle', wake: true, act: false }], type: () => true })
        delivery.start()
        return () => delivery.stop()
      }),
    )
    expect(said.failures).toEqual([])
  }, 30_000)

  test('a module whose own first look comes five seconds after it started needs no wait of its own (2.104.3)', async () => {
    const built = moduleDoor()
    const said = await agentConformance(
      base(built, async () => {
        const token = await built.place('conv-five')
        const delivery = messageDelivery({ module: ID, everyMs: 5000, sessions: () => [{ key: 'conv-five', token, own: true, state: 'idle', wake: true, act: false }], type: () => true })
        delivery.start()
        return () => delivery.stop()
      }),
    )
    expect(said.failures).toEqual([])
  }, 40_000)

  test('without the hook the check is not run', async () => {
    const built = moduleDoor()
    const said = await agentConformance({ manifest, door: built.door, project: '/p', adopt: built.adopt })
    expect(said.failures).toEqual([])
    expect(said.passed).not.toContain('an idle module asks the host nothing on a clock')
  })
})
