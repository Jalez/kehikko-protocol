import { describe, expect, test } from 'bun:test'
import { EventEmitter } from 'node:events'

import { LEGACY_WELL_KNOWN, WELL_KNOWN, manifestSchema, type Manifest } from '../src/index.js'
import {
  doors,
  doorsHandler,
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
  test('serve the manifest at both well-known paths, the legacy one in the legacy spelling', async () => {
    const now = await call('GET', WELL_KNOWN).done
    expect(now.status).toBe(200)
    expect(now.headers['content-type']).toBe('application/json; charset=utf-8')
    expect(json(now).kind).toBe('kehikot.module')
    const legacy = await call('GET', LEGACY_WELL_KNOWN).done
    expect(json(legacy).kind).toBe('roadmap.module')
    expect(json(legacy).id).toBe('roadmap.example')
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
