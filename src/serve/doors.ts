import { BUILD_HEADER, LEGACY_WELL_KNOWN, WELL_KNOWN, buildStamp, legacyManifest, type Build, type Manifest } from '../index.js'
import { BODY_TOO_LARGE, readJsonBody, type BodySource } from './body.js'
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
  /** Extra response headers. */
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
  /** Served at both well-known paths, the legacy one in the legacy spelling. */
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

/**
 * The doors as a plain node handler — `(request, response, next)` — for a
 * module that is not served by Vite, and for tests. `transform` is where Vite's
 * `transformIndexHtml` goes; without one the document is sent as built.
 */
export function doorsHandler(
  options: DoorsOptions,
  transform?: (html: string, url: string, originalUrl?: string) => Promise<string>,
): DoorHandler {
  const pages = new Set([...PAGE_PATHS, ...(options.pages ?? [])])
  const ours = options.ours ?? oursByDefault
  const build = options.build
  const manifest = build ? { ...options.manifest, build } : options.manifest
  const stamp = build ? buildStamp(build) : null
  const document =
    typeof options.page === 'function' ? options.page : () => pageDocument({ build, ...(options.page as PageOptions) })

  return (request, response, next) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    const path = url.pathname
    const method = (request.method ?? 'GET').toUpperCase()

    const send = (reply: Reply) => {
      response.statusCode = reply.status
      if (stamp) response.setHeader(BUILD_HEADER, stamp)
      for (const [name, value] of Object.entries(reply.headers ?? {})) response.setHeader(name, value)
      if (reply.raw) {
        response.setHeader('content-type', reply.raw.type)
        return void response.end(reply.raw.bytes)
      }
      if (reply.body === null || reply.body === undefined) return void response.end()
      response.setHeader('content-type', 'application/json; charset=utf-8')
      response.end(JSON.stringify(reply.body, null, 2))
    }

    if (path === WELL_KNOWN) return send({ status: 200, body: manifest })
    /* The spelling a host from before the rename asks for, so that host still finds this module. */
    if (path === LEGACY_WELL_KNOWN) return send({ status: 200, body: legacyManifest(manifest) })

    if (pages.has(path)) {
      const built = document()
      void (transform ? transform(built, request.url ?? '/app', request.originalUrl) : Promise.resolve(built))
        .then((html) => {
          response.statusCode = 200
          response.setHeader('content-type', 'text/html; charset=utf-8')
          /* The ticket is per process; a cached page would have every write refused. */
          response.setHeader('cache-control', 'no-store')
          /* Framed by a host or by nothing. Which hosts: see `frameOrigins`. */
          response.setHeader('content-security-policy', frameAncestors())
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
      const event = (data: unknown, name?: string) =>
        response.write(`${name ? `event: ${name.replace(/[\r\n]/g, '')}\n` : ''}data: ${JSON.stringify(data)}\n\n`)
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
        response.setHeader('content-type', 'text/event-stream; charset=utf-8')
        response.setHeader('cache-control', 'no-store')
        response.setHeader('connection', 'keep-alive')
        response.setHeader('x-accel-buffering', 'no')
        response.flushHeaders?.()
        response.write(': open\n\n')
        opened = true
        for (const [data, name] of early.splice(0)) event(data, name)
        const beat = setInterval(() => response.write(': beat\n\n'), options.beatMs ?? 25_000)
        request.on('close', () => {
          clearInterval(beat)
          live.close()
        })
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
        /* The health check says which build is answering, without each module spelling it. */
        const body = reply.body
        const healthy = build && path === '/healthz' && body && typeof body === 'object' && !Array.isArray(body)
        send(healthy ? { ...reply, body: { ...(body as Record<string, unknown>), build } } : reply)
      })
      .catch(next)
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
