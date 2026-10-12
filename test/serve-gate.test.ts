import { afterEach, describe, expect, test } from 'bun:test'
import { EventEmitter } from 'node:events'

import { MESSAGE, ORIGINS_ELEMENT, PROTOCOL, TICKET_HEADER, WELL_KNOWN, manifestSchema, originAmong, type Manifest } from '../src/index.js'
import { connect, mayGreet, pageOrigins, type MessageSource } from '../src/client/index.js'
import {
  BODY_NOT_JSON,
  ELSEWHERE_REFUSAL,
  admits,
  asker,
  doorsFetch,
  doorsHandler,
  fillPage,
  frameOrigins,
  mintTicket,
  pageDocument,
  readJsonBody,
  readJsonRequest,
  refuseTicket,
  saysJson,
  serves,
  type Answer,
  type DoorsOptions,
} from '../src/serve/index.js'

/**
 * What a door requires of a request: where it came from, and what a body says it is. Every shape
 * below is one a real sender produces — the header sets are the ones a browser, `curl`, node and
 * bun were seen to send — so a rule that would turn a legitimate caller away fails here first.
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

const TICKET = mintTicket()
const HERE = '127.0.0.1:7950'
const MINE = `http://${HERE}`
const JSON_TYPE = { 'content-type': 'application/json' }

const answer: Answer = (method, path, _query, body, ticket) => {
  if (path === '/healthz') return { status: 200, body: { ok: true } }
  if (path === '/mcp') return method === 'POST' ? { status: 200, body: { jsonrpc: '2.0', id: body?.id ?? null, result: { tools: [] } } } : { status: 405, body: null }
  if (path === '/api/read') return { status: 200, body: { ok: true } }
  if (path === '/api/write') return refuseTicket(ticket, TICKET) ?? { status: 200, body: { ok: true, got: body } }
  return null
}

/* The senders, as the headers each one puts on a request. */
const SENDERS = {
  /** `curl`, bun's `fetch`, node's `http`: nothing a browser writes. */
  program: {},
  /** node's `fetch` says a mode and nothing else. */
  nodeFetch: { 'sec-fetch-mode': 'cors' },
  /** The page's own GET, an `EventSource`, an `<img>`: no `Origin`, and the browser says where from. */
  ownRead: { 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'cors', 'sec-fetch-dest': 'empty' },
  /** The page's own POST, PUT or DELETE. */
  ownWrite: { origin: MINE, 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'cors', 'sec-fetch-dest': 'empty' },
  /** The same from a browser that sends no fetch metadata. */
  ownWriteBare: { origin: MINE },
  /** An address typed, or opened from another program. */
  typed: { 'sec-fetch-site': 'none', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document' },
  /** A host on another port of this machine framing the page. */
  framed: { 'sec-fetch-site': 'same-site', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'iframe' },
  /** A host under another name framing it. */
  framedAcross: { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'iframe' },
  /** A page on another port asking, with sharing asked for. */
  otherPort: { origin: 'http://127.0.0.1:9530', 'sec-fetch-site': 'same-site', 'sec-fetch-mode': 'cors', 'sec-fetch-dest': 'empty' },
  /** The same without asking to read the answer: no `Origin` on a GET. */
  otherPortBlind: { 'sec-fetch-site': 'same-site', 'sec-fetch-mode': 'no-cors', 'sec-fetch-dest': 'empty' },
  /** A page somewhere else entirely. */
  otherSite: { origin: 'https://elsewhere.example', 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'no-cors', 'sec-fetch-dest': 'empty' },
  otherSiteBare: { origin: 'https://elsewhere.example' },
  /** A page with no origin of its own: a sandboxed frame. */
  opaque: { origin: 'null', 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'cors', 'sec-fetch-dest': 'empty' },
} satisfies Record<string, Record<string, string>>

const from = (sender: Record<string, string>, more: Record<string, string> = {}) => ({ host: HERE, ...sender, ...more })

class FakeRequest extends EventEmitter {
  resumed = false
  constructor(
    readonly method: string,
    readonly url: string,
    readonly headers: Record<string, string>,
  ) {
    super()
  }
  resume() {
    this.resumed = true
  }
}

function call(method: string, url: string, headers: Record<string, string>, body?: string, options: Partial<DoorsOptions> = {}) {
  const handler = doorsHandler({ manifest: MANIFEST, answer, page: { title: 'Example', ticket: TICKET }, ...options })
  const request = new FakeRequest(method, url, headers)
  const sent = { status: 0, headers: {} as Record<string, string>, text: '', nexted: false }
  return new Promise<typeof sent>((resolve) => {
    const response = {
      statusCode: 0,
      setHeader: (name: string, value: string) => void (sent.headers[name] = value),
      write: () => {},
      end(chunk?: string | Uint8Array) {
        if (typeof chunk === 'string') sent.text = chunk
        sent.status = this.statusCode
        resolve(sent)
      },
    }
    handler(request as never, response, () => {
      sent.nexted = true
      resolve(sent)
    })
    queueMicrotask(() => {
      if (body !== undefined) request.emit('data', Buffer.from(body))
      request.emit('end')
    })
  })
}

const through = doorsFetch({ manifest: MANIFEST, answer, page: { title: 'Example', ticket: TICKET } })
/**
 * A `Request` as a server is handed one. The `Request` in this suite is a browser's (happy-dom's),
 * which will not let a script write `Origin`, `Host` or `Sec-Fetch-*` — the very reason they can be
 * believed — so the headers are put on it afterwards, as the network would have.
 */
const ask = (method: string, path: string, headers: Record<string, string>, body?: string, doors = through) => {
  const type = headers['content-type']
  const request = new Request(`${MINE}${path}`, { method, body, headers: type ? { 'content-type': type } : {} })
  const sent = new Map(Object.entries(headers))
  /* What a server reads when a body was sent and nothing said what it is: nothing. */
  Object.defineProperty(request, 'headers', { value: { get: (name: string) => sent.get(name.toLowerCase()) ?? null } })
  return doors(request)
}

const LIST = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })

describe('where a request came from', () => {
  test('is read off the request: its Origin when there is one, the browser’s word when there is not', () => {
    expect(asker(from(SENDERS.program))).toBe('program')
    expect(asker(from(SENDERS.nodeFetch))).toBe('program')
    expect(asker(from(SENDERS.ownRead))).toBe('page')
    expect(asker(from(SENDERS.ownWrite))).toBe('page')
    expect(asker(from(SENDERS.ownWriteBare))).toBe('page')
    expect(asker(from(SENDERS.typed))).toBe('person')
    expect(asker(from(SENDERS.framed))).toBe('navigation')
    expect(asker(from(SENDERS.framedAcross))).toBe('navigation')
    expect(asker(from(SENDERS.otherPort))).toBe('elsewhere')
    expect(asker(from(SENDERS.otherPortBlind))).toBe('elsewhere')
    expect(asker(from(SENDERS.otherSite))).toBe('elsewhere')
    expect(asker(from(SENDERS.otherSiteBare))).toBe('elsewhere')
    expect(asker(from(SENDERS.opaque))).toBe('elsewhere')
  })

  test('the page’s own origin is whatever address it was asked at', () => {
    expect(asker({ host: 'localhost:7950', origin: 'http://localhost:7950' })).toBe('page')
    expect(asker({ host: 'LOCALHOST:7950', origin: 'http://localhost:7950' })).toBe('page')
    /* The same machine under another name, and another port of it, are other origins. */
    expect(asker({ host: 'localhost:7950', origin: 'http://127.0.0.1:7950' })).toBe('elsewhere')
    expect(asker({ host: '127.0.0.1:7950', origin: 'http://127.0.0.1:7951' })).toBe('elsewhere')
    /* A browser saying `same-origin` does not outweigh an Origin that is not this server's. */
    expect(asker({ host: HERE, origin: 'http://127.0.0.1:9530', 'sec-fetch-site': 'same-origin' })).toBe('elsewhere')
    /* No Host header: a `Request` built by hand says where it was sent in its address. */
    expect(asker(new Headers({ origin: MINE }), HERE)).toBe('page')
    expect(asker(new Headers({ origin: MINE }))).toBe('elsewhere')
    expect(asker({ host: HERE, origin: ['http://127.0.0.1:9530', MINE] })).toBe('elsewhere')
  })

  test('a door answers its page, a program and a person; only a document is opened from elsewhere', () => {
    for (const who of ['page', 'program', 'person'] as const) expect([admits(who), admits(who, true)]).toEqual([true, true])
    expect([admits('navigation'), admits('navigation', true)]).toEqual([false, true])
    expect([admits('elsewhere'), admits('elsewhere', true)]).toEqual([false, false])
  })
})

describe('the doors, asked by everybody who may', () => {
  test('a program: the manifest, the page, a read, the MCP door, a ticketed write', async () => {
    for (const sender of [SENDERS.program, SENDERS.nodeFetch]) {
      expect((await call('GET', WELL_KNOWN, from(sender))).status).toBe(200)
      expect((await call('GET', '/app', from(sender))).status).toBe(200)
      expect((await call('GET', '/healthz', from(sender))).status).toBe(200)
      expect((await call('GET', '/api/read', from(sender))).status).toBe(200)
      const listed = await call('POST', '/mcp', from(sender, { ...JSON_TYPE, accept: 'application/json, text/event-stream' }), LIST)
      expect([listed.status, JSON.parse(listed.text).result]).toEqual([200, { tools: [] }])
      expect((await call('POST', '/api/write', from(sender, { ...JSON_TYPE, [TICKET_HEADER]: TICKET }), '{"a":1}')).status).toBe(200)
    }
  })

  test('the page itself: its reads, its stream, its writes — with fetch metadata and without', async () => {
    expect((await call('GET', '/api/read', from(SENDERS.ownRead))).status).toBe(200)
    expect((await call('GET', '/healthz', from(SENDERS.ownRead))).status).toBe(200)
    for (const sender of [SENDERS.ownWrite, SENDERS.ownWriteBare]) {
      const wrote = await call('POST', '/api/write', from(sender, { ...JSON_TYPE, [TICKET_HEADER]: TICKET }), '{"a":1}')
      expect([wrote.status, JSON.parse(wrote.text).got]).toEqual([200, { a: 1 }])
      /* A write with nothing in it carries no content type, and needs none. */
      expect((await call('DELETE', '/api/write', from(sender, { [TICKET_HEADER]: TICKET }))).status).toBe(200)
    }
    /* A stream opened by the page, as an EventSource asks for one. */
    let closed = 0
    const stream = () => ({ close: () => void (closed += 1) })
    const opened = doorsFetch({ manifest: MANIFEST, answer, stream, page: { title: 'Example' } })
    const live = await ask('GET', '/api/watch', from(SENDERS.ownRead, { accept: 'text/event-stream' }), undefined, opened)
    expect([live?.status, live?.headers.get('content-type')]).toEqual([200, 'text/event-stream; charset=utf-8'])
    await live?.body?.cancel()
    expect(closed).toBe(1)
  })

  test('a browser opening the page: typed, or framed by a host on another origin', async () => {
    for (const sender of [SENDERS.typed, SENDERS.framed, SENDERS.framedAcross]) {
      const page = await call('GET', '/app?theme=dark', from(sender))
      expect([page.status, page.headers['content-security-policy']]).toEqual([200, `frame-ancestors 'self' ${frameOrigins().join(' ')}`])
      expect((await ask('GET', '/', from(sender)))?.status).toBe(200)
    }
    /* A person may look at a door directly. */
    expect((await call('GET', '/healthz', from(SENDERS.typed))).status).toBe(200)
  })
})

describe('the doors, asked from elsewhere', () => {
  const refusedAs = (sent: { status: number; text: string; headers: Record<string, string> }) => {
    expect(sent.status).toBe(403)
    expect(JSON.parse(sent.text)).toEqual({ ok: false, error: ELSEWHERE_REFUSAL })
    expect(sent.headers['access-control-allow-origin']).toBeUndefined()
  }

  test('the page is not handed to a page on another origin', async () => {
    for (const sender of [SENDERS.otherPort, SENDERS.otherPortBlind, SENDERS.otherSite, SENDERS.otherSiteBare, SENDERS.opaque]) {
      for (const path of ['/app', '/app/', '/', WELL_KNOWN, '/api/read', '/healthz']) refusedAs(await call('GET', path, from(sender)))
      expect((await ask('GET', '/app', from(sender)))?.status).toBe(403)
    }
  })

  test('the MCP door is not answered, whatever the body says it is, and answer is never asked', async () => {
    let asked = 0
    const counting: Answer = (...args) => ((asked += 1), answer(...args))
    for (const sender of [SENDERS.otherPort, SENDERS.otherSite, SENDERS.otherSiteBare, SENDERS.opaque]) {
      for (const type of ['text/plain;charset=UTF-8', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x', 'application/json']) {
        refusedAs(await call('POST', '/mcp', from(sender, { 'content-type': type }), LIST, { answer: counting }))
      }
      refusedAs(await call('POST', '/mcp', from(sender), LIST, { answer: counting }))
      /* What a browser asks first, before a request it would have to be let make. */
      refusedAs(await call('OPTIONS', '/mcp', from(sender, { 'access-control-request-method': 'POST' }), undefined, { answer: counting }))
    }
    expect(asked).toBe(0)
  })

  test('a write is refused before its ticket is looked at', async () => {
    for (const sender of [SENDERS.otherPort, SENDERS.otherSite, SENDERS.opaque]) {
      refusedAs(await call('POST', '/api/write', from(sender, { ...JSON_TYPE, [TICKET_HEADER]: TICKET }), '{"a":1}'))
      const same = await ask('POST', '/api/write', from(sender, { ...JSON_TYPE, [TICKET_HEADER]: TICKET }), '{"a":1}')
      expect([same?.status, await same?.json()]).toEqual([403, { ok: false, error: ELSEWHERE_REFUSAL }])
    }
  })

  test('a door is not a document: framing one, or following a link to one, is refused', async () => {
    for (const sender of [SENDERS.framed, SENDERS.framedAcross]) {
      for (const path of ['/api/read', '/healthz', '/mcp', WELL_KNOWN]) refusedAs(await call('GET', path, from(sender)))
    }
  })

  test('what is not the doors’ own is still left to whatever is behind them, unasked', async () => {
    for (const sender of [SENDERS.otherPort, SENDERS.opaque]) {
      expect((await call('GET', '/src/main.tsx', from(sender))).nexted).toBe(true)
      expect(await ask('GET', '/assets/main.js', from(sender))).toBeNull()
    }
  })

  test('`openHealth` answers a read of the health check from anywhere, and opens nothing else', async () => {
    const open = { openHealth: true }
    const opened = doorsFetch({ manifest: MANIFEST, answer, page: { title: 'Example' }, ...open })
    for (const sender of [SENDERS.opaque, SENDERS.otherPort, SENDERS.otherSite]) {
      const health = await call('GET', '/healthz', from(sender), undefined, open)
      expect([health.status, health.headers['access-control-allow-origin']]).toEqual([200, '*'])
      expect((await ask('GET', '/healthz', from(sender), undefined, opened))?.status).toBe(200)
      refusedAs(await call('POST', '/healthz', from(sender, JSON_TYPE), '{}', open))
      refusedAs(await call('GET', '/api/read', from(sender), undefined, open))
      refusedAs(await call('GET', '/app', from(sender), undefined, open))
      refusedAs(await call('POST', '/mcp', from(sender, JSON_TYPE), LIST, open))
    }
  })

  test('a module’s own `ours` and `pages` are fenced like the defaults', async () => {
    const options: Partial<DoorsOptions> = { ours: (path) => path === '/own', pages: ['/print'], answer: () => ({ status: 200, body: { ok: true } }) }
    expect((await call('GET', '/own', from(SENDERS.ownRead), undefined, options)).status).toBe(200)
    refusedAs(await call('GET', '/own', from(SENDERS.otherPort), undefined, options))
    expect((await call('GET', '/print', from(SENDERS.framed), undefined, options)).status).toBe(200)
    refusedAs(await call('GET', '/print', from(SENDERS.otherPort), undefined, options))
  })
})

describe('a body has to say it is JSON', () => {
  const refusedAs = (sent: { status: number; text: string }) => expect([sent.status, JSON.parse(sent.text)]).toEqual([415, { ok: false, error: BODY_NOT_JSON }])

  test('`application/json`, with or without parameters, in any case', () => {
    for (const type of ['application/json', 'application/json; charset=utf-8', 'Application/JSON;charset=UTF-8', ' application/json ']) expect(saysJson(type)).toBe(true)
    for (const type of ['text/plain', 'text/plain;charset=UTF-8', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x', 'text/json', 'application/jsonp', '', null, undefined]) {
      expect(saysJson(type)).toBe(false)
    }
  })

  test('a body sent as anything else is refused with 415, by a program or by the page, and answer is never asked', async () => {
    let asked = 0
    const counting: Answer = (...args) => ((asked += 1), answer(...args))
    for (const sender of [SENDERS.program, SENDERS.ownWrite]) {
      for (const type of ['text/plain;charset=UTF-8', 'application/x-www-form-urlencoded', 'multipart/form-data; boundary=x']) {
        refusedAs(await call('POST', '/mcp', from(sender, { 'content-type': type }), LIST, { answer: counting }))
        refusedAs(await call('PUT', '/api/write', from(sender, { 'content-type': type, [TICKET_HEADER]: TICKET }), '{"a":1}', { answer: counting }))
        const same = await ask('POST', '/mcp', from(sender, { 'content-type': type }), LIST, doorsFetch({ manifest: MANIFEST, answer: counting, page: { title: 'Example' } }))
        expect([same?.status, await same?.json()]).toEqual([415, { ok: false, error: BODY_NOT_JSON }])
      }
      /* And a body that says nothing about itself. */
      refusedAs(await call('POST', '/mcp', from(sender), LIST, { answer: counting }))
    }
    expect(asked).toBe(0)
  })

  test('the refusal keeps nothing and lets the rest of the request drain', async () => {
    const request = new FakeRequest('POST', '/mcp', { 'content-type': 'text/plain' })
    const read = readJsonBody(request)
    request.emit('data', Buffer.from(LIST))
    request.emit('end')
    expect(await read).toEqual({ ok: false, status: 415, error: BODY_NOT_JSON })
    expect(request.resumed).toBe(true)
  })

  test('a request with no body needs no content type, and a GET’s is never read', async () => {
    expect((await call('POST', '/api/write', from(SENDERS.program, { [TICKET_HEADER]: TICKET }))).status).toBe(200)
    expect((await call('POST', '/api/write', from(SENDERS.program, { 'content-type': 'text/plain', [TICKET_HEADER]: TICKET }))).status).toBe(200)
    expect((await ask('DELETE', '/api/write', from(SENDERS.ownWrite, { [TICKET_HEADER]: TICKET })))?.status).toBe(200)
    expect(await readJsonRequest(new Request(`${MINE}/api/read`, { headers: { 'content-type': 'text/plain' } }))).toEqual({ ok: true, body: null })
  })

  test('the readers on their own: JSON is read, anything else is not', async () => {
    const node = (headers: Record<string, string> | undefined, body: string) => {
      const request = new FakeRequest('POST', '/x', headers as never)
      const read = readJsonBody(request as never)
      request.emit('data', Buffer.from(body))
      request.emit('end')
      return read
    }
    expect(await node({ 'content-type': 'application/json; charset=utf-8' }, '{"a":1}')).toEqual({ ok: true, body: { a: 1 } })
    expect(await node({ 'content-type': 'text/plain' }, '{"a":1}')).toEqual({ ok: false, status: 415, error: BODY_NOT_JSON })
    expect(await node({}, '{"a":1}')).toEqual({ ok: false, status: 415, error: BODY_NOT_JSON })
    /* A source with no headers at all is not a request off a socket, and is read as it always was. */
    expect(await node(undefined, '{"a":1}')).toEqual({ ok: true, body: { a: 1 } })
    const request = (type: string | null) => new Request(`${MINE}/x`, { method: 'POST', body: new Blob(['{"a":1}'], type ? { type } : {}) })
    expect(await readJsonRequest(request('application/json'))).toEqual({ ok: true, body: { a: 1 } })
    expect(await readJsonRequest(request('text/plain'))).toEqual({ ok: false, status: 415, error: BODY_NOT_JSON })
    expect(await readJsonRequest(request(null))).toEqual({ ok: false, status: 415, error: BODY_NOT_JSON })
  })
})

describe('`serves()` and cross-origin sharing', () => {
  /* A port nothing is expected on; were something there, `claim` would only move up from it. */
  const plugin = () => serves({ id: 'kehikot.example', prefer: 9517, timeoutMs: 50 })

  test('turns the dev server’s sharing off when the module’s config says nothing about it', async () => {
    expect((await plugin().config()).server.cors).toBe(false)
    expect((await plugin().config({})).server.cors).toBe(false)
    expect((await plugin().config({ server: {} })).server.cors).toBe(false)
  })

  test('leaves what a module wrote itself', async () => {
    for (const cors of [true, false, { origin: 'http://127.0.0.1:4170' }]) expect('cors' in (await plugin().config({ server: { cors } })).server).toBe(false)
  })
})

describe('who may frame a page, told to the page', () => {
  const HOSTS = ['http://127.0.0.1:4170', 'tauri://localhost']
  const islandOf = (html: string) => new RegExp(`<script id="${ORIGINS_ELEMENT}" type="application/json">([^<]*)</script>`).exec(html)?.[1]

  test('`pageDocument` prints the list it is given, and none when given none', () => {
    expect(JSON.parse(islandOf(pageDocument({ title: 'Example', origins: HOSTS })) ?? 'null')).toEqual(HOSTS)
    expect(islandOf(pageDocument({ title: 'Example' }))).toBeUndefined()
  })

  test('`fillPage` puts it into a page built ahead, replacing one that is there', () => {
    const built = pageDocument({ title: 'Example' })
    const filled = fillPage(built, { origins: HOSTS })
    expect(JSON.parse(islandOf(filled) ?? 'null')).toEqual(HOSTS)
    expect(JSON.parse(islandOf(fillPage(filled, { origins: ['http://localhost:4181'] })) ?? 'null')).toEqual(['http://localhost:4181'])
    expect(fillPage(built, { ticket: TICKET })).not.toContain(`id="${ORIGINS_ELEMENT}"`)
  })

  test('the doors print the list their `frame-ancestors` carries, into either kind of page', async () => {
    const before = { list: process.env.KEHIKOT_ORIGINS, one: process.env.KEHIKOT_ORIGIN }
    process.env.KEHIKOT_ORIGINS = 'http://127.0.0.1:4999'
    delete process.env.KEHIKOT_ORIGIN
    try {
      const options = { ancestors: ['http://127.0.0.1:7821'] }
      const page = await call('GET', '/app', from(SENDERS.framed), undefined, options)
      expect(page.headers['content-security-policy']).toBe("frame-ancestors 'self' http://127.0.0.1:4999 http://127.0.0.1:7821")
      expect(JSON.parse(islandOf(page.text) ?? 'null')).toEqual(['http://127.0.0.1:4999', 'http://127.0.0.1:7821'])
      /* A document the module built itself is told too… */
      const own = await call('GET', '/app', from(SENDERS.framed), undefined, { ...options, page: () => '<html><head></head><body>own</body></html>' })
      expect(JSON.parse(islandOf(own.text) ?? 'null')).toEqual(['http://127.0.0.1:4999', 'http://127.0.0.1:7821'])
      /* …unless it already says. */
      const said = await call('GET', '/app', from(SENDERS.framed), undefined, { page: () => fillPage('<body></body>', { origins: HOSTS }) })
      expect(JSON.parse(islandOf(said.text) ?? 'null')).toEqual(HOSTS)
    } finally {
      if (before.list === undefined) delete process.env.KEHIKOT_ORIGINS
      else process.env.KEHIKOT_ORIGINS = before.list
      if (before.one !== undefined) process.env.KEHIKOT_ORIGIN = before.one
    }
  })

  test('an origin is among a list written as `frame-ancestors` takes it', () => {
    const list = ['http://127.0.0.1:4170', 'tauri://localhost', 'http://localhost:*', 'https://*.example.org', 'https://tauri.localhost/']
    for (const origin of ['http://127.0.0.1:4170', 'tauri://localhost', 'http://localhost:3000', 'http://localhost', 'https://a.example.org', 'https://tauri.localhost']) {
      expect([origin, originAmong(origin, list)]).toEqual([origin, true])
    }
    for (const origin of ['http://127.0.0.1:4171', 'https://127.0.0.1:4170', 'http://127.0.0.1', 'https://localhost:3000', 'https://example.org', 'https://a.example.org:8443', 'http://tauri.localhost', 'null', '']) {
      expect([origin, originAmong(origin, list)]).toEqual([origin, false])
    }
    expect(originAmong('http://example.org', ['http://example.org'])).toBe(true)
    expect(originAmong('http://example.org:80', ['http://example.org'])).toBe(true)
    expect(originAmong('https://anywhere.example', ['*'])).toBe(true)
    expect(originAmong('null', ['*'])).toBe(true)
    expect(originAmong('http://127.0.0.1:4170', [])).toBe(false)
  })
})

describe('a greeting is answered only from where the page may be framed', () => {
  const HOSTS = ['http://127.0.0.1:4170']
  const ID = 'kehikot.example'

  function page(options: Parameters<typeof connect>[2] = {}) {
    const listeners = new Set<(ev: MessageEvent) => void>()
    const source: MessageSource = {
      parent: {} as Window,
      addEventListener: (_type, fn) => void listeners.add(fn),
      removeEventListener: (_type, fn) => void listeners.delete(fn),
    }
    const greeted: unknown[] = []
    const live = connect(ID, { onHello: (context) => greeted.push(context) }, { source, ...options })
    live.listen()
    const deliver = (ev: { data: unknown; origin?: string; source?: unknown }) => {
      for (const fn of [...listeners]) fn(ev as unknown as MessageEvent)
    }
    return { live, deliver, greeted }
  }

  const speaker = () => {
    const said: { type?: string }[] = []
    return { postMessage: (message: { type?: string }) => void said.push(message), said }
  }
  const hello = { type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's1', context: { epic: null, project: null, theme: 'light' } }

  const told = (origins: readonly string[] | null) => {
    document.getElementById(ORIGINS_ELEMENT)?.remove()
    if (origins === null) return
    const island = document.createElement('script')
    island.id = ORIGINS_ELEMENT
    island.type = 'application/json'
    island.textContent = JSON.stringify(origins)
    document.body.append(island)
  }
  afterEach(() => told(null))

  test('the rule: the list, the page’s own origin, the page’s own window, an event the page made itself', () => {
    const self = { window: {}, origin: 'http://127.0.0.1:7950' }
    expect(mayGreet({ origin: 'http://127.0.0.1:4170', source: {} }, HOSTS, self)).toBe(true)
    expect(mayGreet({ origin: 'http://127.0.0.1:7950', source: {} }, HOSTS, self)).toBe(true)
    expect(mayGreet({ origin: 'null', source: self.window }, HOSTS, { window: self.window, origin: 'null' })).toBe(true)
    expect(mayGreet({ origin: '', source: {} }, HOSTS, self)).toBe(true)
    expect(mayGreet({ source: {} }, HOSTS, self)).toBe(true)
    expect(mayGreet({ origin: 'http://127.0.0.1:9530', source: {} }, HOSTS, self)).toBe(false)
    expect(mayGreet({ origin: 'https://elsewhere.example', source: {} }, HOSTS, self)).toBe(false)
    expect(mayGreet({ origin: 'null', source: {} }, HOSTS, self)).toBe(false)
    /* Two pages with no origin are not each other. */
    expect(mayGreet({ origin: 'null', source: {} }, HOSTS, { window: {}, origin: 'null' })).toBe(false)
    expect(mayGreet({ origin: 'https://elsewhere.example', source: {} }, [], self)).toBe(false)
    /* A page that was never told answers as it always has. */
    expect(mayGreet({ origin: 'https://elsewhere.example', source: {} }, null, self)).toBe(true)
  })

  test('the page reads who that is from the island its server printed', () => {
    expect(pageOrigins()).toBeNull()
    told(HOSTS)
    expect(pageOrigins()).toEqual(HOSTS)
    document.getElementById(ORIGINS_ELEMENT)!.textContent = '{"not":"a list"}'
    expect(pageOrigins()).toBeNull()
    document.getElementById(ORIGINS_ELEMENT)!.textContent = 'not json'
    expect(pageOrigins()).toBeNull()
  })

  test('a host the page may be framed by is greeted back; a window from anywhere else is not, and cannot ask anything of it', () => {
    told(HOSTS)
    const { live, deliver, greeted } = page()
    const other = speaker()
    for (const origin of ['http://127.0.0.1:9530', 'https://elsewhere.example', 'null']) deliver({ data: hello, origin, source: other })
    expect([other.said.length, greeted.length, live.greeted()]).toEqual([0, 0, false])

    const host = speaker()
    deliver({ data: hello, origin: 'http://127.0.0.1:4170', source: host })
    expect([host.said[0]?.type, greeted.length, live.greeted()]).toEqual([MESSAGE.READY, 1, true])

    /* A later greeting from elsewhere does not take the conversation over: the host is still who is answered. */
    deliver({ data: hello, origin: 'http://127.0.0.1:9530', source: other })
    expect([other.said.length, greeted.length]).toEqual([0, 1])
    live.resize(300)
    expect(host.said.at(-1)?.type).toBe(MESSAGE.RESIZE)
    expect(other.said.length).toBe(0)
  })

  test('nothing but a greeting is heard from a window that was refused one', () => {
    told(HOSTS)
    let cleared = 0
    const listeners = new Set<(ev: MessageEvent) => void>()
    const source: MessageSource = { addEventListener: (_type, fn) => void listeners.add(fn), removeEventListener: (_type, fn) => void listeners.delete(fn) }
    connect(ID, { onClear: () => void (cleared += 1) }, { source }).listen()
    const other = speaker()
    for (const data of [hello, { type: MESSAGE.CLEAR, protocol: PROTOCOL }]) {
      for (const fn of [...listeners]) fn({ data, origin: 'http://127.0.0.1:9530', source: other } as unknown as MessageEvent)
    }
    expect([cleared, other.said.length]).toEqual([0, 0])
  })

  test('a page that greets itself is answered: a harness in the same document, and one on the same origin', () => {
    told(HOSTS)
    const { deliver, greeted } = page()
    /* An event made by the page's own script carries no origin; a message from another window always does. */
    deliver({ data: hello, origin: '', source: speaker() })
    /* Posted by the page to itself. */
    deliver({ data: hello, origin: 'null', source: window })
    expect(greeted.length).toBe(2)
    /* Posted by another page of the module's own: `mayGreet` above, where the page has an origin to compare. */
  })

  test('`origins` on the connection is the list, for a page these doors did not serve', () => {
    told(null)
    const { deliver, greeted } = page({ origins: ['http://localhost:*'] })
    deliver({ data: hello, origin: 'http://127.0.0.1:4170', source: speaker() })
    expect(greeted.length).toBe(0)
    deliver({ data: hello, origin: 'http://localhost:4181', source: speaker() })
    expect(greeted.length).toBe(1)
  })

  test('a page that was told nothing answers whoever greets it, as before', () => {
    told(null)
    const { deliver, greeted } = page()
    const host = speaker()
    deliver({ data: hello, origin: 'null', source: host })
    expect([greeted.length, host.said[0]?.type]).toEqual([1, MESSAGE.READY])
  })
})
