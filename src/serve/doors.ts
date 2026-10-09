import { BUILD_HEADER, WELL_KNOWN, buildStamp, type Build, type Manifest } from '../index.js'
import { TICKET_HEADER } from '../page.js'
import { BODY_TOO_LARGE, readJsonBody, readJsonRequest, type BodySource } from './body.js'
import { frameAncestors } from './origins.js'
import { pageDocument, type PageOptions } from './page.js'
import { ticketOf } from './ticket.js'

/**
 * Every door a module answers on, served by the process that serves its page: a module is ONE
 * ORIGIN. What stays the module's is `answer`, a pure function from a request to a status and a
 * body. `/app` is claimed here before Vite's resolver sees it. See docs/module-plumbing.md.
 */

export interface Reply {
  status: number
  /** Sent as JSON. `null` is "answer with no body", which is what a notification gets. */
  body: unknown
  /**
   * Extra response headers. An empty value takes a header the doors would otherwise send off the
   * answer: `'cache-control': ''` is "send no `cache-control`", for bytes a browser may keep.
   */
  headers?: Record<string, string>
  /** Sent as it is, with this content type, instead of `body` as JSON: a PDF, plain text. */
  raw?: { bytes: Uint8Array | string; type: string }
}

/** `null` is "not ours": the request goes on to whatever is behind this (Vite). */
export type Answer = (
  method: string,
  path: string,
  query: URLSearchParams,
  body: Record<string, unknown> | null,
  ticket: string | null,
) => Reply | null | Promise<Reply | null>

/**
 * The server-sent-event doors, asked before `answer`. `emit` is handed each
 * event as it happens. The answer is a refusal to send instead of opening the
 * stream, the function to call when the reader goes away, or `null` for "not a
 * stream door".
 */
export type Stream = (
  method: string,
  path: string,
  query: URLSearchParams,
  emit: (event: unknown, name?: string) => void,
  ticket: string | null,
) => { reply: Reply } | { close: () => void } | null

export interface DoorsOptions {
  /** Served at `WELL_KNOWN`. */
  manifest: Manifest
  answer: Answer
  stream?: Stream
  /**
   * This process's build (`establishBuild`). Given, it is added to the manifest, to the health
   * check's answer, to the page, and — as a stamp — to a header on every answer.
   */
  build?: Build
  /**
   * The page: what `pageDocument` takes (with this process's `ticket` in it),
   * or a function for a module that builds its own document.
   */
  page: PageOptions | (() => string)
  /** Paths that serve the page besides `/app`, `/app/` and `/`. */
  pages?: readonly string[]
  /**
   * Origins that may frame the page besides the ones the environment names (`frameOrigins`): a
   * development harness on a port of its own. Added to the page's `frame-ancestors`.
   */
  ancestors?: readonly string[]
  /**
   * `true` lets a page on any origin read the health check: `/healthz` answers with
   * `access-control-allow-origin: *` and exposes the build header. For a module framed WITHOUT
   * `allow-same-origin` (its manifest declares no storage), whose page is on an opaque origin and
   * could not otherwise `probeServer()`. Off by default: no other door is opened by it.
   */
  openHealth?: boolean
  /**
   * Which paths go to `answer` and `stream`. Default: `/healthz`, `/mcp`, and
   * anything under `/api/`. Everything else is left to Vite unread.
   */
  ours?: (path: string) => boolean
  /** Default `MAX_BODY_BYTES`. */
  maxBodyBytes?: number
  /** How often an open stream is sent a comment so nothing in between closes it. Default 25000. */
  beatMs?: number
}

/** The part of node's `IncomingMessage` the doors read. */
export interface DoorRequest extends BodySource {
  url?: string
  originalUrl?: string
  headers: Record<string, string | string[] | undefined>
  /** Asked not to hold small writes back when a stream opens on it, so an event leaves when it is emitted. */
  socket?: { setNoDelay?(on?: boolean): unknown } | null
  on(event: 'data', listener: (chunk: Uint8Array) => void): unknown
  on(event: 'end' | 'close', listener: () => void): unknown
  on(event: 'error', listener: (error: Error) => void): unknown
}

/** The part of node's `ServerResponse` the doors write. */
export interface DoorResponse {
  statusCode: number
  setHeader(name: string, value: string): unknown
  write(chunk: string): unknown
  end(chunk?: string | Uint8Array): unknown
  flushHeaders?(): unknown
}

export type DoorHandler = (request: DoorRequest, response: DoorResponse, next: (error?: unknown) => void) => void

export const PAGE_PATHS: readonly string[] = ['/app', '/app/', '/']

const oursByDefault = (path: string) => path === '/healthz' || path === '/mcp' || path.startsWith('/api/')

/** What both forms of the doors work out once, from the options. */
function standing(options: DoorsOptions) {
  const build = options.build
  return {
    pages: new Set([...PAGE_PATHS, ...(options.pages ?? [])]),
    ours: options.ours ?? oursByDefault,
    build,
    manifest: build ? { ...options.manifest, build } : options.manifest,
    stamp: build ? buildStamp(build) : null,
    document: typeof options.page === 'function' ? options.page : () => pageDocument({ build, ...(options.page as PageOptions) }),
    /* Worked out per request: who may frame the page is read from the environment as it is then. */
    pageHeaders: (): Record<string, string> => ({
      'content-type': 'text/html; charset=utf-8',
      /* Never cached: the ticket is per process. */
      'cache-control': 'no-store',
      'content-security-policy': frameAncestors(process.env, options.ancestors),
    }),
    open: options.openHealth === true,
  }
}

/**
 * A reply as headers and a payload. Nothing the doors send may be cached — an answer is this
 * process's, now — unless the reply names a `cache-control` of its own, or an empty one for none.
 */
function wire(reply: Reply, stamp: string | null): { headers: Record<string, string>; payload: string | Uint8Array | null } {
  const headers: Record<string, string> = { 'cache-control': 'no-store' }
  if (stamp) headers[BUILD_HEADER] = stamp
  for (const [name, value] of Object.entries(reply.headers ?? {})) {
    /* An empty value is "do not send this one": the only way to answer with no `cache-control`. */
    if (value === '') delete headers[name.toLowerCase()]
    else headers[name.toLowerCase()] = value
  }
  if (reply.raw) return { headers: { ...headers, 'content-type': reply.raw.type }, payload: reply.raw.bytes }
  if (reply.body === null || reply.body === undefined) return { headers, payload: null }
  return { headers: { ...headers, 'content-type': 'application/json; charset=utf-8' }, payload: JSON.stringify(reply.body, null, 2) }
}

const STREAM_HEADERS: Record<string, string> = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-store',
  connection: 'keep-alive',
  'x-accel-buffering': 'no',
}

const frame = (data: unknown, name?: string) =>
  `${name ? `event: ${name.replace(/[\r\n]/g, '')}\n` : ''}data: ${JSON.stringify(data)}\n\n`

/** What lets a page on another origin — an opaque one — read the health check, and the build on it. */
const OPEN_HEALTH: Record<string, string> = { 'access-control-allow-origin': '*', 'access-control-expose-headers': BUILD_HEADER }

/**
 * The health check says which build is answering, without each module spelling it; and, for a
 * module that asked (`openHealth`), that any page may read it. A header the reply names wins.
 */
function healthy(reply: Reply, path: string, build: Build | undefined, open: boolean): Reply {
  if (path !== '/healthz') return reply
  const body = reply.body
  const said = build && body && typeof body === 'object' && !Array.isArray(body) ? { ...reply, body: { ...(body as Record<string, unknown>), build } } : reply
  return open ? { ...said, headers: { ...OPEN_HEALTH, ...said.headers } } : said
}

/**
 * The doors as a plain node handler — `(request, response, next)` — for a
 * module that is not served by Vite, and for tests. `transform` is where Vite's
 * `transformIndexHtml` goes; without one the document is sent as built.
 */
export function doorsHandler(
  options: DoorsOptions,
  transform?: (html: string, url: string, originalUrl?: string) => Promise<string>,
): DoorHandler {
  const { pages, ours, build, manifest, stamp, document, pageHeaders, open } = standing(options)

  return (request, response, next) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    const path = url.pathname
    const method = (request.method ?? 'GET').toUpperCase()

    const send = (reply: Reply) => {
      const { headers, payload } = wire(reply, stamp)
      response.statusCode = reply.status
      for (const [name, value] of Object.entries(headers)) response.setHeader(name, value)
      if (payload === null) response.end()
      else response.end(payload)
    }

    if (path === WELL_KNOWN) return send({ status: 200, body: manifest })

    if (pages.has(path)) {
      const built = document()
      void (transform ? transform(built, request.url ?? '/app', request.originalUrl) : Promise.resolve(built))
        .then((html) => {
          response.statusCode = 200
          for (const [name, value] of Object.entries(pageHeaders())) response.setHeader(name, value)
          response.end(html)
        })
        .catch(next)
      return
    }

    if (!ours(path)) return next()
    const ticket = ticketOf(request.headers)

    if (options.stream) {
      const early: [unknown, string | undefined][] = []
      let opened = false
      const event = (data: unknown, name?: string) => response.write(frame(data, name))
      /* An event emitted while the door is still deciding is held until the stream is open. */
      const live = options.stream(
        method,
        path,
        url.searchParams,
        (data, name) => (opened ? event(data, name) : early.push([data, name])),
        ticket,
      )
      if (live && 'reply' in live) return send(live.reply)
      if (live) {
        response.statusCode = 200
        for (const [name, value] of Object.entries(STREAM_HEADERS)) response.setHeader(name, value)
        if (stamp) response.setHeader(BUILD_HEADER, stamp)
        /* An event is a few bytes; held back for more, a live line arrives a beat late. */
        try {
          request.socket?.setNoDelay?.(true)
        } catch {
          /* A socket that is already gone. The close below says so. */
        }
        response.flushHeaders?.()
        response.write(': open\n\n')
        opened = true
        for (const [data, name] of early.splice(0)) event(data, name)
        const beat = setInterval(() => response.write(': beat\n\n'), options.beatMs ?? 25_000)
        /* Once, whichever of the two a reader that went away is reported as: node fires both on some failures. */
        let gone = false
        const leave = () => {
          if (gone) return
          gone = true
          clearInterval(beat)
          live.close()
        }
        request.on('close', leave)
        request.on('error', leave)
        return
      }
    }

    /* Only these paths read a body. Vite has to keep seeing an unconsumed request for everything else. */
    void readJsonBody(request, { maxBytes: options.maxBodyBytes })
      .then(async (read) => {
        if (!read.ok) {
          return send({ status: read.status, body: { ok: false, error: BODY_TOO_LARGE }, headers: { connection: 'close' } })
        }
        const reply = await options.answer(method, path, url.searchParams, read.body, ticket)
        if (!reply) return next()
        send(healthy(reply, path, build, open))
      })
      .catch(next)
  }
}

/** The doors for a server that speaks `Request` and `Response`. `null` is "not ours". */
export type DoorFetch = (request: Request) => Promise<Response | null>

/**
 * The same doors as one function from a `Request` to a `Response`, for a server that is not node's
 * (`Bun.serve`, a test): `fetch: async (request) => (await doors(request)) ?? notFound()`. `null`
 * is what `next()` is in the other form — the module's own assets, or its 404. `transform` is as
 * in `doorsHandler`; a page built ahead of time is `page: () => fillPage(built, { ticket, build })`.
 */
export function doorsFetch(options: DoorsOptions, transform?: (html: string, url: string) => Promise<string>): DoorFetch {
  const { pages, ours, build, manifest, stamp, document, pageHeaders, open } = standing(options)

  const send = (reply: Reply): Response => {
    const { headers, payload } = wire(reply, stamp)
    return new Response(payload as BodyInit | null, { status: reply.status, headers })
  }

  return async (request) => {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method.toUpperCase()

    if (path === WELL_KNOWN) return send({ status: 200, body: manifest })

    if (pages.has(path)) {
      const built = document()
      return new Response(transform ? await transform(built, `${path}${url.search}`) : built, { status: 200, headers: pageHeaders() })
    }

    if (!ours(path)) return null
    const ticket = request.headers.get(TICKET_HEADER) || null

    if (options.stream) {
      const bytes = new TextEncoder()
      const early: string[] = []
      let pipe: ReadableStreamDefaultController<Uint8Array> | null = null
      const write = (text: string) => {
        try {
          pipe?.enqueue(bytes.encode(text))
        } catch {
          /* The reader has gone; `leave` is on its way. */
        }
      }
      const live = options.stream(method, path, url.searchParams, (data, name) => (pipe ? write(frame(data, name)) : early.push(frame(data, name))), ticket)
      if (live && 'reply' in live) return send(live.reply)
      if (live) {
        let beat: ReturnType<typeof setInterval> | null = null
        let gone = false
        const leave = () => {
          if (gone) return
          gone = true
          if (beat !== null) clearInterval(beat)
          live.close()
          try {
            pipe?.close()
          } catch {
            /* Already closed by the reader. */
          }
        }
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            pipe = controller
            write(': open\n\n')
            for (const text of early.splice(0)) write(text)
            beat = setInterval(() => write(': beat\n\n'), options.beatMs ?? 25_000)
            if (request.signal.aborted) leave()
            else request.signal.addEventListener('abort', leave)
          },
          cancel: leave,
        })
        return new Response(body, { status: 200, headers: stamp ? { ...STREAM_HEADERS, [BUILD_HEADER]: stamp } : STREAM_HEADERS })
      }
    }

    const read = await readJsonRequest(request, { maxBytes: options.maxBodyBytes })
    if (!read.ok) return send({ status: read.status, body: { ok: false, error: BODY_TOO_LARGE }, headers: { connection: 'close' } })
    const reply = await options.answer(method, path, url.searchParams, read.body, ticket)
    return reply ? send(healthy(reply, path, build, open)) : null
  }
}

/** The part of Vite's dev server the plugin touches. */
export interface DoorsServerLike {
  middlewares: { use(handler: DoorHandler): unknown }
  transformIndexHtml(url: string, html: string, originalUrl?: string): Promise<string>
}

export interface DoorsPlugin {
  name: string
  apply: 'serve'
  configureServer(server: DoorsServerLike): void
}

/**
 * The Vite plugin. It goes after `serves()`, which claims the port, and before
 * the framework's own plugins:
 *
 *     plugins: [serves({ id: ID, prefer: PREFERRED_PORT }), doors({ … }), react(), tailwindcss()]
 */
export function doors(options: DoorsOptions): DoorsPlugin {
  return {
    name: 'kehikot-module-doors',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(doorsHandler(options, (html, url, originalUrl) => server.transformIndexHtml(url, html, originalUrl)))
    },
  }
}
