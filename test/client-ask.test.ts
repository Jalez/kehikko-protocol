import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { TICKET_HEADER } from '../src/index.js'
import {
  CANCELLED,
  AskFailed,
  KEEPALIVE_BYTES,
  NOT_A_REPLY,
  PAGE_OLD,
  PAGE_STALE,
  SERVER_DOWN,
  answered,
  ask,
  follow,
  probeServer,
  replied,
  watchServer,
  WATCH_SERVER_MS,
  onServerStanding,
  resetServerStanding,
  serverStanding,
  ticket,
  type Attachment,
} from '../src/client/index.js'
import { refuseTicket } from '../src/serve/index.js'

function island(text: string | null) {
  document.getElementById('ticket')?.remove()
  if (text === null) return
  const element = document.createElement('script')
  element.id = 'ticket'
  element.type = 'application/json'
  element.textContent = text
  document.body.appendChild(element)
}

type Call = { url: string; init: RequestInit }
function server(reply: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = []
  const fake = (async (url: string, init: RequestInit = {}) => {
    const call = { url, init }
    calls.push(call)
    return reply(call)
  }) as unknown as typeof fetch
  return { fetch: fake, calls }
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  resetServerStanding()
  island('"the-ticket"')
})
afterEach(() => island(null))

describe('the ticket on the page', () => {
  test('is read from its JSON island, and is empty when there is none or it is not a string', () => {
    expect(ticket()).toBe('the-ticket')
    island('{"not":"a string"}')
    expect(ticket()).toBe('')
    island('not json')
    expect(ticket()).toBe('')
    island(null)
    expect(ticket()).toBe('')
  })
})

describe('ask', () => {
  test('a read: GET, the query appended, no ticket, the body parsed', async () => {
    const { fetch, calls } = server(() => json(200, { ok: true, value: 7 }))
    const asked = await ask<{ value: number }>('./api/value', { query: { project: '/a b', skip: null, n: 2 }, fetch })
    expect(asked).toEqual({ ok: true, status: 200, body: { ok: true, value: 7 } as never })
    expect(calls[0]?.url).toBe('./api/value?project=%2Fa+b&n=2')
    expect(calls[0]?.init.method).toBe('GET')
    expect((calls[0]?.init.headers as Record<string, string>)[TICKET_HEADER]).toBeUndefined()
  })

  test('a write: POST by default, JSON, and it carries the ticket', async () => {
    const { fetch, calls } = server(() => json(200, { ok: true }))
    await ask('/api/value', { body: { a: 1 }, fetch })
    await ask('/api/value', { method: 'delete', fetch })
    const first = calls[0]?.init
    expect(first?.method).toBe('POST')
    expect(first?.body).toBe('{"a":1}')
    expect((first?.headers as Record<string, string>)[TICKET_HEADER]).toBe('the-ticket')
    expect((first?.headers as Record<string, string>)['content-type']).toBe('application/json')
    expect(calls[1]?.init.method).toBe('DELETE')
    expect((calls[1]?.init.headers as Record<string, string>)[TICKET_HEADER]).toBe('the-ticket')
  })

  test('nothing answering is `down`, in one sentence, never a raw "Failed to fetch"', async () => {
    const fetch = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof globalThis.fetch
    const asked = await ask('/api/value', { fetch })
    expect(asked).toEqual({ ok: false, kind: 'down', status: null, error: SERVER_DOWN, body: null })
    expect(serverStanding()).toBe('down')
  })

  test('a refusal carries the server’s own sentence, its status and its body', async () => {
    const { fetch } = server(() => json(409, { ok: false, error: 'Somebody else saved first.', version: 'v2' }))
    const asked = await ask('/api/deck', { method: 'PUT', body: {}, fetch })
    expect(asked.ok).toBe(false)
    if (asked.ok) return
    expect(asked.kind).toBe('refused')
    expect(asked.status).toBe(409)
    expect(asked.error).toBe('Somebody else saved first.')
    expect((asked.body as { version: string }).version).toBe('v2')
  })

  test('a 2xx that says ok:false is a refusal too', async () => {
    const { fetch } = server(() => json(200, { ok: false, error: 'Nothing to commit.' }))
    const asked = await ask('/api/commit', { body: {}, fetch })
    expect(asked.ok === false && asked.kind === 'refused' && asked.error === 'Nothing to commit.').toBe(true)
  })

  test('a refusal with no sentence, or no JSON at all, still gets one', async () => {
    const { fetch } = server(() => new Response('<html>vite error</html>', { status: 500 }))
    const asked = await ask('/api/value', { fetch })
    expect(asked.ok === false && asked.error).toBe('This app’s own server answered 500.')
    const rpc = server(() => json(404, { jsonrpc: '2.0', error: { code: -32601, message: 'no such method' } }))
    const other = await ask('/mcp', { body: {}, fetch: rpc.fetch })
    expect(other.ok === false && other.error).toBe('no such method')
  })

  test('a refused ticket is `stale`: this page is older than its server', async () => {
    const refusal = refuseTicket('old', 'new')
    const { fetch } = server(() => json(refusal?.status ?? 0, refusal?.body))
    const heard: string[] = []
    const stop = onServerStanding((standing) => heard.push(standing))
    const asked = await ask('/api/value', { body: {}, fetch })
    stop()
    expect(asked.ok === false && asked.kind).toBe('stale')
    /* The fact, and no promise: whether anything reloads is the page's business, not `ask`'s. */
    expect(asked.ok === false && asked.error).toBe(PAGE_OLD)
    expect(heard).toEqual(['stale'])
    /* And it does not heal: the ticket in this document will never be right again. */
    await ask('/api/value', { fetch: server(() => json(200, {})).fetch })
    expect(serverStanding()).toBe('stale')
  })

  test('an ordinary 403 is a refusal, not a stale page', async () => {
    const { fetch } = server(() => json(403, { ok: false, error: 'Not that folder.' }))
    const asked = await ask('/api/value', { body: {}, fetch })
    expect(asked.ok === false && asked.kind).toBe('refused')
    expect(serverStanding()).toBe('up')
  })

  test('the standing comes back up when the server answers again — even with a refusal', async () => {
    const down = (async () => {
      throw new TypeError('Load failed')
    }) as unknown as typeof globalThis.fetch
    await ask('/api/value', { fetch: down })
    expect(serverStanding()).toBe('down')
    await ask('/api/value', { fetch: server(() => json(400, { ok: false, error: 'no' })).fetch })
    expect(serverStanding()).toBe('up')
  })

  test('a caller that gave up is not a server that stopped', async () => {
    const control = new AbortController()
    control.abort()
    const fetch = (async () => {
      throw new DOMException('aborted', 'AbortError')
    }) as unknown as typeof globalThis.fetch
    const asked = await ask('/api/value', { signal: control.signal, fetch })
    /* And not a server that said no, either: a kind of its own, with no status. */
    expect(asked).toEqual({ ok: false, kind: 'cancelled', status: null, error: CANCELLED, body: null })
    expect(serverStanding()).toBe('up')
    /* `replied` throws it like the other answers that are not the server's. */
    expect(() => replied(asked as never)).toThrow(AskFailed)
  })

  test('a 2xx with a body that is not JSON is a refusal; a 2xx with no body at all is an answer', async () => {
    const html = await ask('/api/value', { fetch: server(() => new Response('<!doctype html><title>Vite</title>', { status: 200 })).fetch })
    expect(html).toEqual({ ok: false, kind: 'refused', status: 200, error: NOT_A_REPLY, body: null })
    /* Something answered, so the server is there. */
    expect(serverStanding()).toBe('up')
    for (const empty of [() => new Response(null, { status: 204 }), () => new Response('', { status: 200 }), () => new Response('  \n', { status: 202 })]) {
      const asked = await ask('/api/value', { body: {}, fetch: server(empty).fetch })
      expect(asked.ok && asked.body).toBe(null)
    }
    /* Outside 2xx nothing changed: the status is the sentence. */
    const missing = await ask('/api/value', { fetch: server(() => new Response('Not found', { status: 404 })).fetch })
    expect(missing.ok === false && missing.error).toBe('This app’s own server answered 404.')
  })

  test('`answered` gives the body, or throws the sentence with its kind', async () => {
    expect(answered({ ok: true, status: 200, body: 5 })).toBe(5)
    try {
      answered({ ok: false, kind: 'down', status: null, error: SERVER_DOWN, body: null })
      throw new Error('did not throw')
    } catch (caught) {
      expect(caught).toBeInstanceOf(AskFailed)
      expect((caught as AskFailed).message).toBe(SERVER_DOWN)
      expect((caught as AskFailed).kind).toBe('down')
    }
  })
})

describe('ask: what a call may add', () => {
  test('a key given a list is repeated, in order, and the gaps in it are left out', async () => {
    const { fetch, calls } = server(() => json(200, {}))
    await ask('/api/here', { query: { epic: 'e', doc: ['a.tex', null, 'b c.tex'], refs: [] }, fetch })
    expect(calls[0]?.url).toBe('/api/here?epic=e&doc=a.tex&doc=b+c.tex')
    await ask('/api/here?x=1', { query: { doc: ['a'] }, fetch })
    expect(calls[1]?.url).toBe('/api/here?x=1&doc=a')
  })

  test('`ticket: true` carries the ticket on a read; `ticket: false` leaves it off a write', async () => {
    const { fetch, calls } = server(() => json(200, {}))
    await ask('/api/quiz', { ticket: true, fetch })
    await ask('/api/open', { body: {}, ticket: false, fetch })
    expect(calls[0]?.init.method).toBe('GET')
    expect((calls[0]?.init.headers as Record<string, string>)[TICKET_HEADER]).toBe('the-ticket')
    expect((calls[1]?.init.headers as Record<string, string>)[TICKET_HEADER]).toBeUndefined()
  })

  test('`keepalive` is asked of the browser only when asked for, and only for a body it will carry', async () => {
    const { fetch, calls } = server(() => json(200, {}))
    await ask('/api/quiz', { body: { text: 'short' }, fetch })
    await ask('/api/quiz', { body: { text: 'short' }, keepalive: true, fetch })
    await ask('/api/quiz', { body: { text: 'ä'.repeat(KEEPALIVE_BYTES / 2) }, keepalive: true, fetch })
    await ask('/api/quiz', { body: { text: 'ä'.repeat(KEEPALIVE_BYTES / 3) }, keepalive: true, fetch })
    expect(calls.map((call) => call.init.keepalive)).toEqual([undefined, true, undefined, true])
    /* Too large to outlive the page, it is still sent. */
    expect(String(calls[2]?.init.body).length).toBeGreaterThan(KEEPALIVE_BYTES / 2)
  })

  test('a call that names none of them sends exactly what 0.35.0 sent', async () => {
    const { fetch, calls } = server(() => json(200, {}))
    await ask('/api/value', { query: { a: 1 }, fetch })
    await ask('/api/value', { body: { a: 1 }, fetch })
    expect(calls[0]).toEqual({ url: '/api/value?a=1', init: { method: 'GET', headers: {}, body: undefined, signal: undefined, cache: 'no-store' } })
    expect(calls[1]).toEqual({
      url: '/api/value',
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json', [TICKET_HEADER]: 'the-ticket' },
        body: '{"a":1}',
        signal: undefined,
        cache: 'no-store',
      },
    })
  })

  test('a stale page’s sentence promises nothing; `PAGE_STALE` is the same fact while a reload is on its way', async () => {
    const refusal = refuseTicket('old', 'new')
    const asked = await ask('/api/value', { body: {}, fetch: server(() => json(403, refusal?.body)).fetch })
    expect(asked.ok === false && asked.error).toBe(PAGE_OLD)
    expect(PAGE_STALE.startsWith(PAGE_OLD.slice(0, -1))).toBe(true)
    expect(PAGE_OLD).not.toContain('reloading')
  })
})

describe('replied', () => {
  type Held = { ok: boolean; held?: string; nowhere?: boolean; error?: string }

  test('a yes is the body', async () => {
    const asked = await ask<Held>('/api/checklist', { fetch: server(() => json(200, { ok: true, held: 'a' })).fetch })
    expect(replied(asked)).toEqual({ ok: true, held: 'a' })
  })

  test('a no is the server’s own body too, with the sentence: at 200, and at a refusing status', async () => {
    const soft = await ask<Held>('/api/checklist', { fetch: server(() => json(200, { ok: false, nowhere: true, error: 'no project is open.' })).fetch })
    expect(replied(soft)).toEqual({ ok: false, nowhere: true, error: 'no project is open.' })
    const conflict = await ask<Held>('/api/quiz', { body: {}, fetch: server(() => json(409, { error: 'The file moved.', held: 'theirs' })).fetch })
    expect(replied(conflict)).toEqual({ ok: false, error: 'The file moved.', held: 'theirs' })
    /* A no that said nothing still has a sentence. */
    const silent = await ask<Held>('/api/quiz', { fetch: server(() => json(400, { nowhere: false })).fetch })
    expect(replied(silent).error).toBe('This app’s own server answered 400.')
  })

  test('nothing answering, a stale page and a refusal with no body are thrown, as `answered` throws them', async () => {
    const down = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof globalThis.fetch
    const refusal = refuseTicket('old', 'new')
    for (const [fetch, kind] of [
      [down, 'down'],
      [server(() => json(403, refusal?.body)).fetch, 'stale'],
      [server(() => new Response('<html>', { status: 500 })).fetch, 'refused'],
    ] as const) {
      const asked = await ask<Held>('/api/checklist', { body: {}, fetch })
      expect(() => replied(asked)).toThrow(AskFailed)
      expect(asked.ok === false && asked.kind).toBe(kind)
    }
  })

  test('a 2xx that carried no JSON object is not a reply', async () => {
    for (const reply of [() => new Response('<!doctype html>', { status: 200 }), () => json(200, [1, 2]), () => new Response(null, { status: 204 })]) {
      const asked = await ask<Held>('/api/checklist', { fetch: server(reply).fetch })
      try {
        replied(asked)
        throw new Error('did not throw')
      } catch (caught) {
        expect((caught as AskFailed).message).toBe(NOT_A_REPLY)
        expect((caught as AskFailed).kind).toBe('refused')
      }
    }
  })
})

describe('probeServer', () => {
  test('asks the health check and says the standing: up, down, and up again', async () => {
    const { fetch, calls } = server(() => json(200, { ok: true }))
    expect(await probeServer(undefined, { fetch })).toBe('up')
    expect(calls[0]?.url).toBe('/healthz')
    expect(calls[0]?.init.method).toBe('GET')
    const down = (async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof globalThis.fetch
    expect(await probeServer('./healthz', { fetch: down })).toBe('down')
    expect(serverStanding()).toBe('down')
    expect(await probeServer('./healthz', { fetch })).toBe('up')
    expect(calls[1]?.url).toBe('./healthz')
  })
})

describe('follow', () => {
  class FakeSource {
    static made: FakeSource[] = []
    readyState = 0
    onopen: (() => void) | null = null
    onmessage: ((message: { data: string }) => void) | null = null
    onerror: (() => void) | null = null
    closed = false
    named = new Map<string, (message: { data: string }) => void>()
    constructor(public url: string) {
      FakeSource.made.push(this)
    }
    addEventListener(name: string, listener: (message: { data: string }) => void) {
      this.named.set(name, listener)
    }
    close() {
      this.closed = true
      this.readyState = 2
    }
  }
  const Source = FakeSource as unknown as typeof EventSource
  beforeEach(() => void (FakeSource.made = []))

  test('says connecting, attached, and hands over each event as JSON', () => {
    const said: Attachment[] = []
    const events: unknown[] = []
    const stop = follow('./api/watch', (event) => events.push(event), {
      query: { project: '/p' },
      onAttachment: (next) => said.push(next),
      EventSource: Source,
    })
    const source = FakeSource.made[0]
    expect(source?.url).toBe('./api/watch?project=%2Fp')
    source?.onopen?.()
    source?.onmessage?.({ data: '{"slug":"a"}' })
    source?.onmessage?.({ data: 'not json' })
    expect(said).toEqual(['connecting', 'attached'])
    expect(events).toEqual([{ slug: 'a' }])
    stop()
    expect(source?.closed).toBe(true)
  })

  test('a dropped stream the browser is retrying is `detached`, and nothing is opened twice', () => {
    const said: Attachment[] = []
    const stop = follow('/api/watch', () => {}, { onAttachment: (next) => said.push(next), EventSource: Source })
    const source = FakeSource.made[0]
    source?.onopen?.()
    source?.onerror?.()
    expect(said).toEqual(['connecting', 'attached', 'detached'])
    expect(FakeSource.made.length).toBe(1)
    stop()
  })

  test('a stream the browser gave up on is opened again, after a pause', async () => {
    const said: Attachment[] = []
    const stop = follow('/api/watch', () => {}, { onAttachment: (next) => said.push(next), retryMs: 5, EventSource: Source })
    const first = FakeSource.made[0]
    if (first) first.readyState = 2
    first?.onerror?.()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(FakeSource.made.length).toBe(2)
    expect(said).toEqual(['connecting', 'detached', 'connecting'])
    stop()
    /* And stopping stops the retrying too. */
    const second = FakeSource.made[1]
    if (second) second.readyState = 2
    second?.onerror?.()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(FakeSource.made.length).toBe(2)
  })

  test('named events are heard when they are listed, with the name; unnamed ones as before', () => {
    const heard: unknown[][] = []
    const stop = follow('/api/events', (...said) => heard.push(said), { events: ['line', 'ended'], EventSource: Source })
    const source = FakeSource.made[0]
    expect([...(source?.named.keys() ?? [])]).toEqual(['line', 'ended'])
    source?.onmessage?.({ data: '{"plain":true}' })
    source?.named.get('line')?.({ data: '{"text":"ok 1"}' })
    source?.named.get('ended')?.({ data: 'not json' })
    expect(heard).toEqual([[{ plain: true }], [{ text: 'ok 1' }, 'line']])
    stop()
    /* A late one, after the stop, is nobody's. */
    source?.named.get('line')?.({ data: '{"text":"late"}' })
    expect(heard.length).toBe(2)
  })

  test('with none listed, none is listened for', () => {
    follow('/api/watch', () => {}, { EventSource: Source })()
    expect(FakeSource.made[0]?.named.size).toBe(0)
  })

  test('`probe` asks the server each time the stream drops, so the standing says why; without it nothing is asked', async () => {
    const real = globalThis.fetch
    const asked: string[] = []
    globalThis.fetch = (async (url: string) => {
      asked.push(url)
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    try {
      const quiet = follow('/api/watch', () => {}, { EventSource: Source })
      FakeSource.made[0]?.onerror?.()
      quiet()
      await new Promise((resolve) => setTimeout(resolve, 5))
      expect(asked).toEqual([])
      expect(serverStanding()).toBe('up')

      const stop = follow('/api/watch', () => {}, { probe: true, EventSource: Source })
      FakeSource.made[1]?.onerror?.()
      await new Promise((resolve) => setTimeout(resolve, 5))
      expect(asked).toEqual(['/healthz'])
      expect(serverStanding()).toBe('down')
      stop()

      const other = follow('/api/watch', () => {}, { probe: './api/state', EventSource: Source })
      FakeSource.made[2]?.onerror?.()
      other()
      expect(asked).toEqual(['/healthz', './api/state'])
    } finally {
      globalThis.fetch = real
    }
  })

  test('where there is no EventSource it says detached and does nothing', () => {
    const said: Attachment[] = []
    const real = globalThis.EventSource
    ;(globalThis as { EventSource?: unknown }).EventSource = undefined
    try {
      follow('/api/watch', () => {}, { onAttachment: (next) => said.push(next) })()
    } finally {
      ;(globalThis as { EventSource?: unknown }).EventSource = real
    }
    expect(said).toEqual(['detached'])
  })
})

describe('watchServer: a page that asks its server nothing else', () => {
  test('asks on a clock while the page is visible, and the answer is the standing', async () => {
    let up = true
    let asked = 0
    const fetch = (async (url: string) => {
      asked++
      expect(url).toBe('/healthz')
      if (!up) throw new TypeError('Load failed')
      return json(200, { ok: true })
    }) as unknown as typeof globalThis.fetch
    const stop = watchServer({ every: 20, fetch })
    try {
      await new Promise((resolve) => setTimeout(resolve, 70))
      expect(asked).toBeGreaterThanOrEqual(2)
      expect(serverStanding()).toBe('up')
      up = false
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(serverStanding()).toBe('down')
      up = true
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(serverStanding()).toBe('up')
    } finally {
      stop()
    }
    const then = asked
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect(asked).toBe(then)
    expect(WATCH_SERVER_MS).toBeGreaterThanOrEqual(5_000)
  })

  test('asks at once when the page is shown again, on the door it was given', async () => {
    const paths: string[] = []
    const fetch = (async (url: string) => {
      paths.push(url)
      return json(200, { ok: true })
    }) as unknown as typeof globalThis.fetch
    const stop = watchServer({ path: './healthz', every: 60_000, fetch })
    try {
      document.dispatchEvent(new Event('visibilitychange'))
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(paths).toEqual(['./healthz'])
    } finally {
      stop()
    }
    document.dispatchEvent(new Event('visibilitychange'))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(paths.length).toBe(1)
  })
})
