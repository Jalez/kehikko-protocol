import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { TICKET_HEADER } from '../src/index.js'
import {
  AskFailed,
  PAGE_STALE,
  SERVER_DOWN,
  answered,
  ask,
  follow,
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
    expect(asked.ok === false && asked.error).toBe(PAGE_STALE)
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
    expect(asked.ok === false && asked.kind).toBe('refused')
    expect(serverStanding()).toBe('up')
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

describe('follow', () => {
  class FakeSource {
    static made: FakeSource[] = []
    readyState = 0
    onopen: (() => void) | null = null
    onmessage: ((message: { data: string }) => void) | null = null
    onerror: (() => void) | null = null
    closed = false
    constructor(public url: string) {
      FakeSource.made.push(this)
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
