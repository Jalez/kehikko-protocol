import { asker, type Asker } from './gate.js'
import type { DoorHandler, DoorRequest, DoorResponse } from './doors.js'
import { ticketOf } from './ticket.js'

/**
 * A door of a module's own that is asked before the protocol's (2.18.0): one function from a
 * `Request` to a `Response`, written once and mounted on both servers a module can be in front of —
 * Vite's dev server through `beforeHandler` (or the `beforeDoors` plugin), and the built one through
 * `run({ before })`. So the two cannot drift. Design notes: docs/ready-built.md.
 *
 * It sees every request first, headers included — a header the doors read past, a method they
 * refuse — and answers it with a `Response`, or returns `undefined` (or `null`) to leave it to the
 * doors, the files of `dist/`, or Vite, untouched: a request it hands on has not had its body read.
 *
 *     // factory.ts
 *     export const factoryDoor: Before = async (request, { asker, url }) => {
 *       if (url.pathname !== '/api/factory/send' || !request.headers.get(KEY_HEADER)) return undefined
 *       if (asker !== 'program') return Response.json({ ok: false, error: '…' }, { status: 403 })
 *       …
 *     }
 *     // vite.config.ts: plugins: [serves(…), beforeDoors(factoryDoor), doors(…), react()]
 *     // serve.ts:       await run({ …, before: factoryDoor })
 *
 * Nothing here fences anything: what it answers, and to whom, is the module's to decide, and
 * `asker` is handed over so it decides the way the doors do (`gate.ts`).
 */

/** What the doors work out about a request before they route it, handed to `before`. */
export interface BeforeInfo {
  /** Who asked, read the way the doors read it (`asker` in gate.ts). */
  asker: Asker
  /** The address asked, on this server's origin. */
  url: URL
  /** The write ticket the request carried (`TICKET_HEADER`), or null. Compare it with `sameTicket`. */
  ticket: string | null
}

/** `undefined` or `null` is "not mine": the request goes on to the doors, unread. */
export type Before = (request: Request, info: BeforeInfo) => Response | null | undefined | Promise<Response | null | undefined>

/** What `before` is handed for a `Request` a server received. The doors compute the same. */
export function beforeInfo(request: Request): BeforeInfo {
  const url = new URL(request.url)
  const headers: Record<string, string> = {}
  request.headers.forEach((value, name) => {
    headers[name] = value
  })
  return { asker: asker(request.headers, url.host), url, ticket: ticketOf(headers) }
}

/** A node request's headers as `Headers`; a repeated header is appended, as it arrived. */
function headersOf(record: DoorRequest['headers']): Headers {
  const headers = new Headers()
  for (const [name, value] of Object.entries(record)) {
    if (value === undefined) continue
    /* HTTP/2 pseudo-headers (`:path`) are not headers a `Request` may carry. */
    if (name.startsWith(':')) continue
    for (const one of Array.isArray(value) ? value : [value]) headers.append(name, one)
  }
  return headers
}

/**
 * A node request's body as a stream that reads nothing until it is read: a `before` that hands a
 * request on without reading it leaves the body for Vite and the doors, as if it had not been asked.
 */
function lazyBody(request: DoorRequest): ReadableStream<Uint8Array> {
  let attached = false
  return new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (attached) return
        attached = true
        request.on('data', (chunk) => controller.enqueue(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : new Uint8Array(chunk)))
        request.on('end', () => {
          try {
            controller.close()
          } catch {
            /* Already errored or cancelled. */
          }
        })
        request.on('error', (error) => {
          try {
            controller.error(error)
          } catch {
            /* Already closed. */
          }
        })
      },
    },
    /* No read ahead: `pull` is not called until somebody reads, so nothing is consumed by asking. */
    { highWaterMark: 0 },
  )
}

/** The `Request` a node request is, on `http://<Host>` (or 127.0.0.1 when it names none). */
export function requestOf(request: DoorRequest & { method?: string }): Request {
  const method = (request.method ?? 'GET').toUpperCase()
  const host = typeof request.headers.host === 'string' && request.headers.host ? request.headers.host : '127.0.0.1'
  let url: URL
  try {
    url = new URL(request.url ?? '/', `http://${host}`)
  } catch {
    url = new URL(request.url ?? '/', 'http://127.0.0.1')
  }
  const init: RequestInit & { duplex?: 'half' } = { method, headers: headersOf(request.headers) }
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = lazyBody(request)
    init.duplex = 'half'
  }
  return new Request(url, init)
}

/** Write a `Response` to node's response, streaming its body as it comes. */
async function sendTo(answer: Response, request: DoorRequest, response: DoorResponse): Promise<void> {
  response.statusCode = answer.status
  answer.headers.forEach((value, name) => {
    if (name !== 'set-cookie') response.setHeader(name, value)
  })
  const cookies = typeof answer.headers.getSetCookie === 'function' ? answer.headers.getSetCookie() : []
  if (cookies.length) (response as unknown as { setHeader(name: string, value: string[]): unknown }).setHeader('set-cookie', cookies)
  if (!answer.body) {
    response.end()
    return
  }
  const reader = answer.body.getReader()
  let gone = false
  const leave = () => {
    gone = true
    void reader.cancel().catch(() => {})
  }
  /* The response's `close` is the reader going away (or the answer done); node's request may say
     `close` as soon as its body has been read. */
  const closes = (response as unknown as { on?(event: 'close', listener: () => void): unknown }).on
  if (typeof closes === 'function') closes.call(response, 'close', leave)
  else request.on('close', leave)
  response.flushHeaders?.()
  const write = response.write as unknown as (chunk: Uint8Array) => unknown
  for (;;) {
    const { done, value } = await reader.read()
    if (done || gone) break
    write.call(response, value)
  }
  response.end()
}

/**
 * `before` as node middleware — `(request, response, next)` — for Vite's `configureServer`, in front
 * of the protocol's `doors()`. `next()` when it answers nothing; `next(error)` when it throws.
 */
export function beforeHandler(before: Before): DoorHandler {
  return (request, response, next) => {
    let asked: Request
    try {
      asked = requestOf(request as DoorRequest & { method?: string })
    } catch (error) {
      return next(error)
    }
    const info: BeforeInfo = {
      asker: asker(request.headers),
      url: new URL(asked.url),
      ticket: ticketOf(request.headers),
    }
    void Promise.resolve()
      .then(() => before(asked, info))
      .then((answer) => (answer ? sendTo(answer, request, response) : next()))
      .catch(next)
  }
}

/** The part of Vite's dev server `beforeDoors` touches. */
export interface BeforeServerLike {
  middlewares: { use(handler: DoorHandler): unknown }
}

export interface BeforePlugin {
  name: string
  apply: 'serve'
  configureServer(server: BeforeServerLike): void
}

/**
 * The Vite plugin: `before` mounted ahead of `doors()`. It goes after `serves()` and before
 * `doors()`, so it sees what the doors would refuse or read past:
 *
 *     plugins: [serves({ id: ID, prefer: PREFERRED_PORT }), beforeDoors(myDoor), doors({ … }), react()]
 *
 * `setup` runs once, when the dev server is made — the same moment `run` would be started.
 */
export function beforeDoors(before: Before, options: { name?: string; setup?: () => void } = {}): BeforePlugin {
  return {
    name: options.name ?? 'kehikot-module-before',
    apply: 'serve',
    configureServer(server) {
      options.setup?.()
      server.middlewares.use(beforeHandler(before))
    },
  }
}
