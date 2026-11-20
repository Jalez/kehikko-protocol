import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { PROTOCOL } from '../src/index.js'
import { ask, follow, resetServerStanding, subscribe } from '../src/client/index.js'
import { rooted } from '../src/client/query.js'
import { checkAddressesSources } from '../src/check/addresses.js'

/**
 * 2.106.0: a module-relative address (`./api/…`, `api/…`) is the module's own origin root, never the
 * path the host frames the page at. At `/app` a relative address worked; at `/app/` and `/app/?q` it
 * became `/app/api/…` and a page got no data.
 */

describe('the version', () => {
  test('is 2.106.0, and PROTOCOL is still 2', () => {
    expect(PROTOCOL).toBe(2)
  })
})

const FRAMINGS = ['http://127.0.0.1:5000/app', 'http://127.0.0.1:5000/app/', 'http://127.0.0.1:5000/app/?q=1', 'http://127.0.0.1:5000/app/sub/?q=1#x']
const at = (framing: string, address: string) => new URL(address, framing).href

describe('rooted', () => {
  test('makes a relative address the origin root', () => {
    expect(rooted('./api/health/events')).toBe('/api/health/events')
    expect(rooted('api/health/events')).toBe('/api/health/events')
    expect(rooted('././api/x')).toBe('/api/x')
    expect(rooted('./api/x?a=1')).toBe('/api/x?a=1')
  })

  test('leaves an address that says where it is', () => {
    for (const one of ['/api/x', '//host/api/x', 'https://host/api/x', 'http://127.0.0.1:1/x', '?a=1', '#h', '../x']) expect(rooted(one)).toBe(one)
  })

  test('resolves to the same address in every framing', () => {
    for (const framing of FRAMINGS) {
      expect(at(framing, rooted('./api/health/events'))).toBe('http://127.0.0.1:5000/api/health/events')
      expect(at(framing, rooted('api/health/events'))).toBe('http://127.0.0.1:5000/api/health/events')
    }
    /* What it replaces: the same address, framed with a trailing slash, was not the door. */
    expect(at(FRAMINGS[1]!, './api/health/events')).toBe('http://127.0.0.1:5000/app/api/health/events')
  })
})

describe('the page client roots what it is given', () => {
  class FakeSource {
    static made: FakeSource[] = []
    readyState = 0
    onopen: (() => void) | null = null
    onmessage: ((message: { data: string }) => void) | null = null
    onerror: (() => void) | null = null
    constructor(public url: string) {
      FakeSource.made.push(this)
    }
    addEventListener() {}
    close() {
      this.readyState = 2
    }
  }
  const Source = FakeSource as unknown as typeof EventSource
  beforeEach(() => {
    FakeSource.made = []
    resetServerStanding()
  })
  afterEach(() => resetServerStanding())

  test('subscribe opens the stream at the origin root, in each framing', () => {
    for (const framing of FRAMINGS) {
      FakeSource.made = []
      const stop = subscribe('./api/health/events', () => {}, { EventSource: Source, query: { project: '/p' } })
      expect(FakeSource.made).toHaveLength(1)
      expect(at(framing, FakeSource.made[0]!.url)).toBe('http://127.0.0.1:5000/api/health/events?project=%2Fp')
      stop()
    }
  })

  test('follow does the same, for both spellings', () => {
    for (const address of ['./api/runs/events', 'api/runs/events']) {
      FakeSource.made = []
      follow(address, () => {}, { EventSource: Source })()
      expect(at(FRAMINGS[2]!, FakeSource.made[0]!.url)).toBe('http://127.0.0.1:5000/api/runs/events')
    }
  })

  test('ask fetches at the origin root, in each framing', async () => {
    for (const framing of FRAMINGS) {
      const urls: string[] = []
      const fake = (async (url: string) => {
        urls.push(url)
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
      }) as unknown as typeof fetch
      await ask('./api/board', { fetch: fake, query: { a: 1 } })
      await ask('api/board', { fetch: fake })
      expect(urls.map((url) => at(framing, url))).toEqual(['http://127.0.0.1:5000/api/board?a=1', 'http://127.0.0.1:5000/api/board'])
    }
  })
})

describe('check:addresses', () => {
  const check = (text: string) => checkAddressesSources('m', [{ path: 'src/a.ts', text }]).failures
  test('flags a raw relative fetch, EventSource and XHR', () => {
    expect(check("const r = await fetch('./api/board')")).toHaveLength(1)
    expect(check('fetch(`api/board?x=${a}`)')).toHaveLength(1)
    expect(check("new EventSource('./api/events')")).toHaveLength(1)
    expect(check("xhr.open('GET', './api/x')")).toHaveLength(1)
  })
  test('passes what is rooted, absolute, or the protocol client', () => {
    expect(check("fetch('/api/board')")).toEqual([])
    expect(check("fetch('https://example.com/x')")).toEqual([])
    expect(check('fetch(`${base}/api/x`)')).toEqual([])
    expect(check("subscribe('./api/events', on)")).toEqual([])
    expect(check("ask('./api/board')")).toEqual([])
    expect(check("run('git', ['fetch', 'origin'])")).toEqual([])
    expect(check("// fetch('./api/board') was the bug\n/* new EventSource('./x') */")).toEqual([])
  })
  test('names the line', () => {
    expect(check("a()\n\nfetch('./api/x')")[0]).toContain('src/a.ts:3')
  })
})
