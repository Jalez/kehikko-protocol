import { describe, expect, test } from 'bun:test'
import { EventEmitter } from 'node:events'

import { BUILD_HEADER, TICKET_HEADER, WELL_KNOWN, buildStamp, manifestSchema, type Manifest } from '../src/index.js'
import {
  doors,
  doorsFetch,
  doorsHandler,
  establishBuild,
  fillPage,
  pageDocument,
  frameAncestors,
  mintTicket,
  readJsonBody,
  refuseTicket,
  type Answer,
  type DoorsOptions,
  type Reply,
  type Stream,
} from '../src/serve/index.js'

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

const answer: Answer = (method, path, query, body, ticket) => {
  if (path === '/healthz') return { status: 200, body: { ok: true } }
  if (path === '/api/echo' && method === 'GET') return { status: 200, body: { q: query.get('q') } }
  if (path === '/api/write') return refuseTicket(ticket, TICKET) ?? { status: 200, body: { ok: true, got: body } }
  if (path === '/api/later') return Promise.resolve<Reply>({ status: 202, body: null, headers: { 'x-own': 'yes' } })
  if (path === '/api/boom') throw new Error('boom')
  if (path.startsWith('/api/')) return { status: 404, body: { ok: false, error: 'not here' } }
  return null
}

class FakeRequest extends EventEmitter {
  method: string
  url: string
  headers: Record<string, string>
  resumed = false
  constructor(method: string, url: string, headers: Record<string, string> = {}) {
    super()
    this.method = method
    this.url = url
    this.headers = headers
  }
  resume() {
    this.resumed = true
  }
}

function call(
  method: string,
  url: string,
  { body, headers = {}, options = {} }: { body?: string | Buffer[]; headers?: Record<string, string>; options?: Partial<DoorsOptions> } = {},
) {
  const handler = doorsHandler({ manifest: MANIFEST, answer, page: { title: 'Example', ticket: TICKET }, ...options }, async (html) =>
    html.replace('</head>', '<!--transformed--></head>'),
  )
  const request = new FakeRequest(method, url, headers)
  const sent = { status: 0, headers: {} as Record<string, string>, chunks: [] as string[], ended: false, nexted: null as unknown }
  const done = new Promise<typeof sent>((resolve) => {
    const response = {
      statusCode: 0,
      setHeader: (name: string, value: string) => void (sent.headers[name] = value),
      write: (chunk: string) => void sent.chunks.push(chunk),
      end(chunk?: string) {
        if (chunk) sent.chunks.push(chunk)
        sent.status = this.statusCode
        sent.ended = true
        resolve(sent)
      },
      flushHeaders() {
        sent.status = this.statusCode
      },
    }
    handler(request as never, response, (error?: unknown) => {
      sent.nexted = error ?? true
      resolve(sent)
    })
    queueMicrotask(() => {
      if (Array.isArray(body)) for (const piece of body) request.emit('data', piece)
      else if (body !== undefined) request.emit('data', Buffer.from(body))
      request.emit('end')
    })
  })
  return { done, request, sent }
}

const json = (sent: { chunks: string[] }) => JSON.parse(sent.chunks.join('')) as Record<string, unknown>

describe('the doors', () => {
  test('serve the manifest at the well-known path, and at no other', async () => {
    const now = await call('GET', WELL_KNOWN).done
    expect(now.status).toBe(200)
    expect(now.headers['content-type']).toBe('application/json; charset=utf-8')
    expect(json(now).kind).toBe('kehikot.module')
    /* The path a host asked before the rename is nobody's now: it goes on to whatever is behind the doors. */
    const before = await call('GET', '/.well-known/roadmap-module.json').done
    expect(before.nexted).toBe(true)
    expect(before.ended).toBe(false)
  })

  test('serve the page at /app, /app/ and /, transformed, uncached, and framed only by a host', async () => {
    for (const path of ['/app', '/app/', '/', '/app?theme=dark']) {
      const page = await call('GET', path).done
      expect(page.status).toBe(200)
      expect(page.headers['content-type']).toBe('text/html; charset=utf-8')
      expect(page.headers['cache-control']).toBe('no-store')
      expect(page.headers['content-security-policy']).toBe(frameAncestors())
      const html = page.chunks.join('')
      expect(html).toContain(`<script id="ticket" type="application/json">"${TICKET}"</script>`)
      expect(html).toContain('<!--transformed-->')
    }
  })

  test('serve the page at a module’s extra paths, and a module’s own document', async () => {
    expect((await call('GET', '/print').done).nexted).toBe(true)
    const extra = await call('GET', '/print', { options: { pages: ['/print'] } }).done
    expect(extra.chunks.join('')).toContain('<div id="root">')
    const own = await call('GET', '/app', { options: { page: () => '<html><head></head><body>own</body></html>' } }).done
    expect(own.chunks.join('')).toContain('own')
  })

  test('leave everything that is not theirs to Vite, unread', async () => {
    const asked = call('GET', '/src/main.tsx')
    const sent = await asked.done
    expect(sent.nexted).toBe(true)
    expect(sent.ended).toBe(false)
    expect(asked.request.listenerCount('data')).toBe(0)
    /* And what `answer` does not know under a path that is not `/api/` goes on too. */
    expect((await call('GET', '/mcp').done).nexted).toBe(true)
  })

  test('hand a request to answer with its query, body and ticket', async () => {
    expect(json(await call('GET', '/api/echo?q=hello').done).q).toBe('hello')
    const written = await call('POST', '/api/write', { body: '{"a":1}', headers: { 'x-module-ticket': TICKET } }).done
    expect(written.status).toBe(200)
    expect(json(written).got).toEqual({ a: 1 })
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      const other = await call(method, '/api/write', { body: '{"m":true}', headers: { 'x-module-ticket': TICKET } }).done
      expect(json(other).got).toEqual({ m: true })
    }
  })

  test('a write without the ticket is refused in the marked way', async () => {
    const refused = await call('POST', '/api/write', { body: '{}' }).done
    expect(refused.status).toBe(403)
    expect(json(refused).refused).toBe('ticket')
  })

  test('wait for an answer that is a promise, send its headers, and send no body for null', async () => {
    const later = await call('POST', '/api/later').done
    expect(later.status).toBe(202)
    expect(later.headers['x-own']).toBe('yes')
    expect(later.chunks).toEqual([])
  })

  test('a body that is not a JSON object arrives as null', async () => {
    for (const body of ['not json', '[1,2]', '"text"', '']) {
      const sent = await call('POST', '/api/write', { body, headers: { 'x-module-ticket': TICKET } }).done
      expect(json(sent).got).toBeNull()
    }
  })

  test('a body past the bound is refused as too large, and is not kept or answered', async () => {
    const asked = call('POST', '/api/write', {
      body: [Buffer.alloc(40, 'a'), Buffer.alloc(40, 'a')],
      headers: { 'x-module-ticket': TICKET },
      options: { maxBodyBytes: 64 },
    })
    const sent = await asked.done
    expect(sent.status).toBe(413)
    expect(json(sent).ok).toBe(false)
    expect(asked.request.resumed).toBe(true)
  })

  test('an answer that throws goes to next as the error', async () => {
    const sent = await call('GET', '/api/boom').done
    expect((sent.nexted as Error).message).toBe('boom')
  })

  test('a custom `ours` decides which paths are asked', async () => {
    const ours = (path: string) => path.startsWith('/files/')
    expect((await call('GET', '/healthz', { options: { ours } }).done).nexted).toBe(true)
  })
})

describe('a stream door', () => {
  const closed: string[] = []
  const stream: Stream = (method, path, query, emit) => {
    if (method !== 'GET') return null
    if (path === '/api/watch') {
      if (!query.get('project')) return { reply: { status: 400, body: { ok: false, error: 'which project?' } } }
      emit({ early: true })
      setTimeout(() => emit({ late: true }), 5)
      return { close: () => void closed.push('watch') }
    }
    return null
  }

  test('opens, sends what was emitted while it was deciding, then each event, and closes with the reader', async () => {
    const asked = call('GET', '/api/watch?project=p', { options: { stream } })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(asked.sent.status).toBe(200)
    expect(asked.sent.headers['content-type']).toBe('text/event-stream; charset=utf-8')
    expect(asked.sent.chunks).toEqual([': open\n\n', 'data: {"early":true}\n\n', 'data: {"late":true}\n\n'])
    expect(asked.sent.ended).toBe(false)
    asked.request.emit('close')
    expect(closed).toEqual(['watch'])
  })

  test('a refusal is sent as JSON instead of a stream', async () => {
    const sent = await call('GET', '/api/watch', { options: { stream } }).done
    expect(sent.status).toBe(400)
    expect(json(sent).error).toBe('which project?')
  })

  test('what is not a stream door goes on to answer', async () => {
    expect(json(await call('GET', '/api/echo?q=x', { options: { stream } }).done).q).toBe('x')
  })
})

describe('what the doors send is never cached', () => {
  test('an answer, a refusal, an answer with no body and the manifest all say no-store', async () => {
    for (const [method, url] of [['GET', '/api/echo?q=x'], ['GET', '/api/nowhere'], ['POST', '/api/later'], ['GET', WELL_KNOWN]] as const) {
      expect((await call(method, url).done).headers['cache-control']).toBe('no-store')
    }
  })

  test('unless the reply names its own, in whatever case', async () => {
    const own: Answer = () => ({ status: 200, body: { ok: true }, headers: { 'Cache-Control': 'max-age=60' } })
    const sent = await call('GET', '/api/figure', { options: { answer: own } }).done
    expect(sent.headers['cache-control']).toBe('max-age=60')
    expect(sent.headers['Cache-Control']).toBeUndefined()
  })
})

describe('a stream door and its socket', () => {
  const stream: Stream = (_method, path) => (path === '/api/watch' ? { close: () => void closed.push('once') } : null)
  const closed: string[] = []

  test('the socket is told not to hold events back, and a reader reported gone twice is closed once', () => {
    const delays: unknown[] = []
    const handler = doorsHandler({ manifest: MANIFEST, answer, stream, page: { title: 'Example' } })
    const request = Object.assign(new FakeRequest('GET', '/api/watch'), { socket: { setNoDelay: (on: boolean) => void delays.push(on) } })
    handler(request as never, { statusCode: 0, setHeader: () => {}, write: () => {}, end: () => {} }, () => {})
    expect(delays).toEqual([true])
    request.emit('error', new Error('ECONNRESET'))
    request.emit('close')
    expect(closed).toEqual(['once'])
  })

  test('a request with no socket, or one that throws, still opens', () => {
    const handler = doorsHandler({ manifest: MANIFEST, answer, stream, page: { title: 'Example' } })
    const request = Object.assign(new FakeRequest('GET', '/api/watch'), {
      socket: {
        setNoDelay: () => {
          throw new Error('gone')
        },
      },
    })
    const written: string[] = []
    handler(request as never, { statusCode: 0, setHeader: () => {}, write: (chunk: string) => void written.push(chunk), end: () => {} }, () => {})
    expect(written).toEqual([': open\n\n'])
    request.emit('close')
  })
})

describe('the doors as a fetch handler', () => {
  const BUILD = establishBuild({ version: '1.0.0', commit: null })
  const closed: string[] = []
  const stream: Stream = (method, path, query, emit) => {
    if (method !== 'GET' || path !== '/api/watch') return null
    if (!query.get('project')) return { reply: { status: 400, body: { ok: false, error: 'which project?' } } }
    emit({ early: true })
    setTimeout(() => emit({ line: 1 }, 'line'), 5)
    return { close: () => void closed.push('watch') }
  }
  const through = doorsFetch({ manifest: MANIFEST, answer, stream, build: BUILD, page: { title: 'Example', ticket: TICKET } })
  const at = (path: string, init?: RequestInit) => through(new Request(`http://127.0.0.1:9000${path}`, init))

  test('the manifest, with the build, stamped and uncached', async () => {
    const found = await at(WELL_KNOWN)
    expect(found?.status).toBe(200)
    expect(found?.headers.get(BUILD_HEADER)).toBe(buildStamp(BUILD))
    expect(found?.headers.get('cache-control')).toBe('no-store')
    expect(((await found?.json()) as { build: unknown }).build).toEqual(BUILD)
    expect(await at('/.well-known/roadmap-module.json')).toBe(null)
  })

  test('the page at /app, /app/ and /, with the same headers as the other form', async () => {
    for (const path of ['/app', '/app/', '/', '/app?theme=light']) {
      const page = await at(path)
      expect(page?.headers.get('content-type')).toBe('text/html; charset=utf-8')
      expect(page?.headers.get('cache-control')).toBe('no-store')
      expect(page?.headers.get('content-security-policy')).toBe(frameAncestors())
      expect(await page?.text()).toBe(pageDocument({ title: 'Example', ticket: TICKET, build: BUILD }))
    }
  })

  test('a page built ahead of the server, and a transform', async () => {
    const built = pageDocument({ title: 'Example', entry: './assets/main-abc.js' })
    const own = doorsFetch({ manifest: MANIFEST, answer, page: () => fillPage(built, { ticket: TICKET, build: BUILD }) }, async (html, url) =>
      html.replace('</head>', `<!--${url}--></head>`),
    )
    const text = (await (await own(new Request('http://127.0.0.1:9000/app?theme=dark')))?.text()) ?? ''
    expect(text).toContain(`<script id="ticket" type="application/json">"${TICKET}"</script>`)
    expect(text).toContain('<!--/app?theme=dark--></head>')
  })

  test('what is not theirs is null: the module’s own assets, or its 404', async () => {
    expect(await at('/assets/main.js')).toBeNull()
    expect(await at('/api/../src/main.tsx')).toBeNull()
    const none = doorsFetch({ manifest: MANIFEST, answer: () => null, page: { title: 'Example' } })
    expect(await none(new Request('http://127.0.0.1:9000/api/unknown'))).toBeNull()
  })

  test('a request reaches answer with its query, body and ticket; the health check says the build', async () => {
    expect(await (await at('/api/echo?q=hello'))?.json()).toEqual({ q: 'hello' })
    const wrote = await at('/api/write', { method: 'POST', body: '{"a":1}', headers: { [TICKET_HEADER]: TICKET } })
    expect(await wrote?.json()).toEqual({ ok: true, got: { a: 1 } })
    const refused = await at('/api/write', { method: 'POST', body: '{"a":1}' })
    expect(refused?.status).toBe(403)
    expect(((await refused?.json()) as { refused: string }).refused).toBe('ticket')
    expect(((await (await at('/healthz'))?.json()) as { build: unknown }).build).toEqual(BUILD)
    const later = await at('/api/later', { method: 'POST' })
    expect([later?.status, later?.headers.get('x-own'), await later?.text()]).toEqual([202, 'yes', ''])
  })

  test('a body that is not a JSON object is null, and one past the bound is a 413 answer never asks about', async () => {
    const wrote = await at('/api/write', { method: 'POST', body: '[1,2]', headers: { [TICKET_HEADER]: TICKET } })
    expect(((await wrote?.json()) as { got: unknown }).got).toBeNull()
    let asked = 0
    const small = doorsFetch({ manifest: MANIFEST, answer: () => ((asked += 1), { status: 200, body: {} }), page: { title: 'Example' }, maxBodyBytes: 16 })
    const big = () => new Request('http://127.0.0.1:9000/api/write', { method: 'POST', body: JSON.stringify({ text: 'x'.repeat(64) }) })
    expect((await small(big()))?.status).toBe(413)
    /* And when nothing said how long it is: counted as it arrives. */
    const unsized = new Request('http://127.0.0.1:9000/api/write', {
      method: 'POST',
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"text":"'))
          controller.enqueue(new TextEncoder().encode('x'.repeat(64)))
          controller.close()
        },
      }),
      duplex: 'half',
    } as RequestInit)
    const sent = await small(unsized)
    expect(sent?.status).toBe(413)
    expect(((await sent?.json()) as { ok: boolean }).ok).toBe(false)
    expect(asked).toBe(0)
  })

  test('a stream door opens, names its events, and closes once when the reader goes', async () => {
    const control = new AbortController()
    const opened = await at('/api/watch?project=p', { signal: control.signal })
    expect(opened?.headers.get('content-type')).toBe('text/event-stream; charset=utf-8')
    const reader = opened?.body?.getReader()
    const text = new TextDecoder()
    let heard = ''
    while (!heard.includes('event: line')) heard += text.decode((await reader?.read())?.value)
    expect(heard).toBe(': open\n\ndata: {"early":true}\n\nevent: line\ndata: {"line":1}\n\n')
    closed.length = 0
    control.abort()
    await reader?.cancel().catch(() => {})
    expect(closed).toEqual(['watch'])
    const refused = await at('/api/watch')
    expect([refused?.status, ((await refused?.json()) as { error: string }).error]).toEqual([400, 'which project?'])
  })
})

describe('the plugin', () => {
  test('is a serve-only plugin that installs one middleware and runs the page through the dev server', async () => {
    const plugin = doors({ manifest: MANIFEST, answer, page: { title: 'Example', ticket: TICKET } })
    expect(plugin.apply).toBe('serve')
    const used: unknown[] = []
    const transformed: string[] = []
    plugin.configureServer({
      middlewares: { use: (handler) => used.push(handler) },
      transformIndexHtml: async (url, html) => {
        transformed.push(url)
        return html
      },
    })
    expect(used.length).toBe(1)
    const request = new FakeRequest('GET', '/app')
    await new Promise<void>((resolve) => {
      ;(used[0] as ReturnType<typeof doorsHandler>)(
        request as never,
        { statusCode: 0, setHeader: () => {}, write: () => {}, end: () => resolve() },
        () => resolve(),
      )
    })
    expect(transformed).toEqual(['/app'])
  })
})

describe('the body reader', () => {
  test('reads nothing for a GET', async () => {
    const request = new FakeRequest('GET', '/')
    expect(await readJsonBody(request as never)).toEqual({ ok: true, body: null })
    expect(request.listenerCount('data')).toBe(0)
  })
})

describe('what a module may say about its doors', () => {
  test('`ancestors` adds origins that may frame the page to the ones the environment names', async () => {
    const before = { list: process.env.KEHIKOT_ORIGINS, one: process.env.KEHIKOT_ORIGIN }
    process.env.KEHIKOT_ORIGINS = 'http://127.0.0.1:4181'
    delete process.env.KEHIKOT_ORIGIN
    try {
      const plain = await call('GET', '/app').done
      expect(plain.headers['content-security-policy']).toBe("frame-ancestors 'self' http://127.0.0.1:4181")
      const page = await call('GET', '/app', { options: { ancestors: ['http://127.0.0.1:7821', 'http://127.0.0.1:4181'] } }).done
      expect(page.headers['content-security-policy']).toBe("frame-ancestors 'self' http://127.0.0.1:4181 http://127.0.0.1:7821")
      const through = doorsFetch({ manifest: MANIFEST, answer, page: { title: 'Example' }, ancestors: ['http://127.0.0.1:7821'] })
      expect((await through(new Request('http://127.0.0.1:9000/')))?.headers.get('content-security-policy')).toContain('http://127.0.0.1:7821')
    } finally {
      if (before.list === undefined) delete process.env.KEHIKOT_ORIGINS
      else process.env.KEHIKOT_ORIGINS = before.list
      if (before.one !== undefined) process.env.KEHIKOT_ORIGIN = before.one
    }
  })

  test('`openHealth` lets any page read the health check and its build — that door, and no other', async () => {
    const closed = await call('GET', '/healthz').done
    expect(closed.headers['access-control-allow-origin']).toBeUndefined()
    const open = await call('GET', '/healthz', { options: { openHealth: true } }).done
    expect(open.headers['access-control-allow-origin']).toBe('*')
    expect(open.headers['access-control-expose-headers']).toBe(BUILD_HEADER)
    const other = await call('GET', '/api/value', { options: { openHealth: true } }).done
    expect(other.headers['access-control-allow-origin']).toBeUndefined()
    const page = await call('GET', '/app', { options: { openHealth: true } }).done
    expect(page.headers['access-control-allow-origin']).toBeUndefined()
    const through = doorsFetch({ manifest: MANIFEST, answer, page: { title: 'Example' }, openHealth: true })
    expect((await through(new Request('http://127.0.0.1:9000/healthz')))?.headers.get('access-control-allow-origin')).toBe('*')
  })

  test('an empty header value takes a default off the answer: the way to send no cache-control', async () => {
    const bytes: Answer = () => ({ status: 200, body: null, raw: { bytes: 'x', type: 'text/plain' }, headers: { 'Cache-Control': '', 'x-content-type-options': 'nosniff' } })
    const sent = await call('GET', '/api/bytes', { options: { answer: bytes } }).done
    expect('cache-control' in sent.headers).toBe(false)
    expect(sent.headers['x-content-type-options']).toBe('nosniff')
    const through = doorsFetch({ manifest: MANIFEST, answer: bytes, page: { title: 'Example' } })
    expect((await through(new Request('http://127.0.0.1:9000/api/bytes')))?.headers.get('cache-control')).toBe(null)
  })
})
