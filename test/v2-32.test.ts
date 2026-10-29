import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { PACKAGE_VERSION, PROTOCOL, manifestSchema, type Manifest } from '../src/index.js'
import {
  attach,
  doorsFetch,
  doorsHandler,
  eventFrame,
  events,
  publish,
  streams,
  watching,
  MAX_EVENT_STREAMS,
  type Stream,
  type DoorRequest,
  type DoorResponse,
} from '../src/serve/index.js'
import { subscribe } from '../src/client/index.js'

/**
 * 2.32.0: a module tells its page something changed over one held connection. `events` puts topics
 * on the doors' `stream` door, `publish` fans out to it, `watching` counts; `subscribe`
 * is the page half. A page never polls its own module.
 */

const MANIFEST: Manifest = manifestSchema.parse({
  kind: 'kehikot.module',
  protocol: 2,
  id: 'kehikot.example',
  name: 'Example',
  version: '1.0.0',
  entry: '/app',
  modes: [{ id: 'main', label: 'Main' }],
  partless: 'An example with nothing in it that belongs to a part.',
})

const wait = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms))
const decoder = new TextDecoder()

/** Read a stream's text until `until` holds, or give up. */
async function readUntil(body: ReadableStream<Uint8Array>, until: (text: string) => boolean, ms = 1000): Promise<{ text: string; reader: ReadableStreamDefaultReader<Uint8Array> }> {
  const reader = body.getReader()
  let text = ''
  const deadline = Date.now() + ms
  while (!until(text) && Date.now() < deadline) {
    const next = await Promise.race([reader.read(), wait(ms).then(() => ({ done: true, value: undefined }))])
    if (next.done) break
    text += decoder.decode(next.value as Uint8Array)
  }
  return { text, reader }
}

const opened: (() => void)[] = []
afterEach(async () => {
  for (const close of opened.splice(0)) close()
  await wait()
})

describe('the version', () => {
  test('is 2.32.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.33.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('publish, watching, attach', () => {
  test('reaches only the topic it names, counts the streams, and forgets one that closed', () => {
    const heard: unknown[] = []
    const a = attach('t:a', (data) => heard.push(['a', data]))!
    const b = attach('t:b', (data) => heard.push(['b', data]))!
    expect(watching('t:a')).toBe(1)
    expect(watching('t:nobody')).toBe(0)
    expect(publish('t:a', 1)).toBe(1)
    expect(publish('t:nobody', 1)).toBe(0)
    a.close()
    a.close()
    expect(watching('t:a')).toBe(0)
    expect(publish('t:a', 2)).toBe(0)
    expect(publish('t:b', 3)).toBe(1)
    b.close()
    expect(heard).toEqual([['a', 1], ['b', 3]])
    expect(watching()).toBe(0)
  })

  test('the initial state comes first, even when it is slow; what was published meanwhile follows it in order', async () => {
    const heard: unknown[] = []
    let release: (value: unknown) => void = () => {}
    const held = attach('t:slow', (data) => heard.push(data), () => new Promise((resolve) => (release = resolve)))!
    publish('t:slow', 'change 1')
    publish('t:slow', 'change 2')
    expect(heard).toEqual([])
    release({ state: 0 })
    await wait()
    expect(heard).toEqual([{ state: 0 }, 'change 1', 'change 2'])
    held.close()
  })

  test('an initial that throws or rejects sends nothing first and the stream still follows', async () => {
    const heard: unknown[] = []
    const one = attach('t:x', (data) => heard.push(data), () => {
      throw new Error('no')
    })!
    const two = attach('t:x', (data) => heard.push(data), () => Promise.reject(new Error('no')))!
    await wait()
    publish('t:x', 'after')
    expect(heard).toEqual(['after', 'after'])
    one.close()
    two.close()
  })

  test('one listener that throws does not stop the others', () => {
    const heard: unknown[] = []
    const bad = attach('t:y', () => {
      throw new Error('broken pipe')
    })!
    const good = attach('t:y', (data) => heard.push(data))!
    expect(publish('t:y', 1)).toBe(1)
    expect(heard).toEqual([1])
    bad.close()
    good.close()
  })

  test(`no more than MAX_EVENT_STREAMS (${MAX_EVENT_STREAMS}) at once`, () => {
    const held = Array.from({ length: MAX_EVENT_STREAMS }, (_, i) => attach(`t:${i % 3}`, () => {}))
    expect(held.every(Boolean)).toBe(true)
    expect(attach('t:one-more', () => {})).toBeNull()
    for (const one of held) one?.close()
    expect(watching()).toBe(0)
  })
})

/** A real server, so what is measured is bytes arriving on a socket, not a function's return. */
async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  opened.push(() => server.close())
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

const route = events((path, query) => (path === '/api/events' ? { topic: `doc:${query.get('id') ?? ''}`, initial: { id: query.get('id') } } : null))
const options = { manifest: MANIFEST, answer: () => ({ status: 404, body: { ok: false } }), page: { title: 'Example' }, stream: route }

describe('events: topics on the doors\' stream door, on both servers', () => {
  /* A server's `Request`, `Response` and `fetch` are the runtime's, not the page's (happy-dom's). */
  beforeAll(() => GlobalRegistrator.unregister())
  afterAll(() => GlobalRegistrator.register())

  test('ready-built (`doorsFetch`, what `run` serves): the stream arrives as published, unbuffered', async () => {
    const fetcher = doorsFetch(options)
    const server = Bun.serve({ port: 0, hostname: '127.0.0.1', idleTimeout: 0, fetch: async (request) => (await fetcher(request)) ?? new Response('no', { status: 404 }) })
    opened.push(() => server.stop(true))
    const abort = new AbortController()
    const response = await fetch(`http://127.0.0.1:${server.port}/api/events?id=7`, { signal: abort.signal })
    expect(response.headers.get('content-type')).toBe('text/event-stream; charset=utf-8')
    expect(response.headers.get('x-accel-buffering')).toBe('no')
    const first = await readUntil(response.body!, (t) => t.includes('"id":"7"'))
    expect(first.text).toContain(eventFrame({ id: '7' }))
    expect(watching('doc:7')).toBe(1)
    publish('doc:7', { changed: true })
    let more = ''
    while (!more.includes('changed')) more += decoder.decode((await first.reader.read()).value)
    expect(more).toBe(eventFrame({ changed: true }))
    abort.abort()
    await wait(30)
    expect(watching('doc:7')).toBe(0)
  })

  test('Vite (`doorsHandler`, node middleware): the same stream, and a closed socket is forgotten', async () => {
    const handler = doorsHandler(options)
    const base = await listen(
      createServer((request, response) =>
        handler(request as unknown as DoorRequest, response as unknown as DoorResponse, () => {
          response.statusCode = 404
          response.end()
        }),
      ),
    )
    const abort = new AbortController()
    const response = await fetch(`${base}/api/events?id=8`, { signal: abort.signal })
    expect(response.headers.get('content-type')).toBe('text/event-stream; charset=utf-8')
    const first = await readUntil(response.body!, (t) => t.includes('"id":"8"'))
    expect(watching('doc:8')).toBe(1)
    publish('doc:8', 'next')
    let more = ''
    while (!more.includes('next')) more += decoder.decode((await first.reader.read()).value)
    expect(more).toBe(eventFrame('next'))
    abort.abort()
    await wait(50)
    expect(watching('doc:8')).toBe(0)
  })

  test('a path the route does not name, and a POST, go on to `answer`', async () => {
    const fetcher = doorsFetch(options)
    expect((await fetcher(new Request('http://127.0.0.1/api/other')))?.status).toBe(404)
    expect((await fetcher(new Request('http://127.0.0.1/api/events', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } })))?.headers.get('content-type')).not.toContain('event-stream')
  })

  test('a page on another origin is refused by the doors before a stream opens', async () => {
    const fetcher = doorsFetch(options)
    const refused = await fetcher(new Request('http://127.0.0.1:9/api/events?id=9', { headers: { origin: 'https://elsewhere.example', 'sec-fetch-site': 'cross-site' } }))
    if (refused?.status === 200) await refused.body?.cancel()
    expect(refused?.status).toBe(403)
    expect(watching('doc:9')).toBe(0)
  })

  test('a full process is a 503 from the doors, and a bad topic a 400; neither opens a stream', async () => {
    const held = Array.from({ length: MAX_EVENT_STREAMS }, () => attach('filler', () => {}))
    const fetcher = doorsFetch(options)
    const full = await fetcher(new Request('http://127.0.0.1/api/events?id=full'))
    expect(full?.status).toBe(503)
    expect(full?.headers.get('retry-after')).toBe('5')
    for (const one of held) one?.close()
    const bad = doorsFetch({ ...options, stream: events(() => ({ topic: '' })) })
    expect((await bad(new Request('http://127.0.0.1/api/events')))?.status).toBe(400)
    expect(watching()).toBe(0)
  })

  test('`streams` puts a module\'s own stream door beside its topics: the first that answers wins', async () => {
    const own: Stream = (method, path, _query, emit) => {
      if (path !== '/api/log') return null
      emit('a line')
      return { close: () => {} }
    }
    const fetcher = doorsFetch({ ...options, stream: streams(own, route) })
    const log = await fetcher(new Request('http://127.0.0.1/api/log'))
    expect((await readUntil(log!.body!, (t) => t.includes('a line'))).text).toContain(eventFrame('a line'))
    const abort = new AbortController()
    const topic = await fetcher(new Request('http://127.0.0.1/api/events?id=both', { signal: abort.signal }))
    expect((await readUntil(topic!.body!, (t) => t.includes('both'))).text).toContain(eventFrame({ id: 'both' }))
    expect(watching('doc:both')).toBe(1)
    abort.abort()
    expect(watching('doc:both')).toBe(0)
  })
})

describe('subscribe (the page)', () => {
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
    addEventListener() {}
    close() {
      this.closed = true
      this.readyState = 2
    }
  }
  const Source = FakeSource as unknown as typeof EventSource

  function fakeDocument(state: 'visible' | 'hidden') {
    const listeners = new Set<() => void>()
    return {
      visibilityState: state as DocumentVisibilityState,
      addEventListener: (_: string, listener: () => void) => void listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => void listeners.delete(listener),
      show(next: 'visible' | 'hidden') {
        this.visibilityState = next
        for (const listener of listeners) listener()
      },
      listeners,
    }
  }

  test('opens one stream, hands over the initial state then each event, and unsubscribes', () => {
    FakeSource.made = []
    const page = fakeDocument('visible')
    const heard: unknown[] = []
    const stop = subscribe('./api/events', (event) => heard.push(event), { EventSource: Source, document: page as unknown as Document })
    expect(FakeSource.made.length).toBe(1)
    FakeSource.made[0]?.onmessage?.({ data: '{"state":0}' })
    FakeSource.made[0]?.onmessage?.({ data: '{"state":1}' })
    expect(heard).toEqual([{ state: 0 }, { state: 1 }])
    stop()
    expect(FakeSource.made[0]?.closed).toBe(true)
    expect(page.listeners.size).toBe(0)
  })

  test('closes while the page is hidden, and opens again (for the state again) when it is shown', () => {
    FakeSource.made = []
    const page = fakeDocument('visible')
    const stop = subscribe('./api/events', () => {}, { EventSource: Source, document: page as unknown as Document })
    page.show('hidden')
    expect(FakeSource.made[0]?.closed).toBe(true)
    expect(FakeSource.made.length).toBe(1)
    page.show('hidden')
    expect(FakeSource.made.length).toBe(1)
    page.show('visible')
    expect(FakeSource.made.length).toBe(2)
    page.show('visible')
    expect(FakeSource.made.length).toBe(2)
    stop()
    page.show('visible')
    expect(FakeSource.made.length).toBe(2)
  })

  test('a page loaded hidden opens nothing until it is shown; `whileHidden` keeps it open', () => {
    FakeSource.made = []
    const page = fakeDocument('hidden')
    const stop = subscribe('./api/events', () => {}, { EventSource: Source, document: page as unknown as Document })
    expect(FakeSource.made.length).toBe(0)
    page.show('visible')
    expect(FakeSource.made.length).toBe(1)
    stop()
    const kept = subscribe('./api/events', () => {}, { EventSource: Source, document: fakeDocument('hidden') as unknown as Document, whileHidden: true })
    expect(FakeSource.made.length).toBe(2)
    kept()
  })

  test('an hour open asks the server once: no clock in it', async () => {
    FakeSource.made = []
    const realSet = globalThis.setInterval
    const realTimeout = globalThis.setTimeout
    let timers = 0
    globalThis.setInterval = ((...args: Parameters<typeof setInterval>) => (timers++, realSet(...args))) as typeof setInterval
    globalThis.setTimeout = ((...args: Parameters<typeof setTimeout>) => (timers++, realTimeout(...args))) as typeof setTimeout
    try {
      const page = fakeDocument('visible')
      const stop = subscribe('./api/events', () => {}, { EventSource: Source, document: page as unknown as Document })
      FakeSource.made[0]?.onopen?.()
      for (let i = 0; i < 60; i++) FakeSource.made[0]?.onmessage?.({ data: `{"minute":${i}}` })
      expect(FakeSource.made.length).toBe(1)
      expect(timers).toBe(0)
      stop()
    } finally {
      globalThis.setInterval = realSet
      globalThis.setTimeout = realTimeout
    }
  })
})
