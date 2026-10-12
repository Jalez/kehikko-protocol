/** A request's JSON body, bounded: the caller is whatever on this machine found the port. */

/** A megabyte: what every module's own copy of this allowed. */
export const MAX_BODY_BYTES = 1_000_000

/** The methods that carry a body. A GET's is never read. */
export const BODY_METHODS: readonly string[] = ['POST', 'PUT', 'PATCH', 'DELETE']

/** The part of node's `IncomingMessage` this reads. */
export interface BodySource {
  method?: string
  /** What the request says its body is. A source with no headers at all is not asked: it is not a request off a socket. */
  headers?: Record<string, string | string[] | undefined>
  on(event: 'data', listener: (chunk: Uint8Array) => void): unknown
  on(event: 'end' | 'close', listener: () => void): unknown
  on(event: 'error', listener: (error: Error) => void): unknown
  resume?(): unknown
}

export type BodyRead =
  /** `body` is `null` for no body, a method that carries none, text that is not JSON, or JSON that is not an object. */
  | { ok: true; body: Record<string, unknown> | null }
  /** More than the bound. Nothing past it was kept; the rest of the request is discarded unread. */
  | { ok: false; status: 413; error: string }
  /** A body that does not say it is JSON. None of it was kept. */
  | { ok: false; status: 415; error: string }

export const BODY_TOO_LARGE = 'That request is too large.'

/** What a body sent as anything but `application/json` is told. */
export const BODY_NOT_JSON = 'A body sent to this door has to be JSON, and say so: content-type: application/json.'

/** Whether a `content-type` says JSON. Parameters after it (`; charset=utf-8`) are fine; any other type, and none, is not. */
export function saysJson(type: string | null | undefined): boolean {
  return (type ?? '').split(';')[0]!.trim().toLowerCase() === 'application/json'
}

export interface BodyOptions {
  /** Default `MAX_BODY_BYTES`. */
  maxBytes?: number
  /** Default `BODY_METHODS`. */
  methods?: readonly string[]
}

/**
 * Read the body as a JSON object. Not-JSON and not-an-object are `null`, because the door being
 * asked words that itself. Two things are refused here: too large, as 413, and a body that arrived
 * without `content-type: application/json`, as 415. A request with no body needs no content type.
 */
export function readJsonBody(request: BodySource, options: BodyOptions = {}): Promise<BodyRead> {
  const max = options.maxBytes ?? MAX_BODY_BYTES
  const methods = options.methods ?? BODY_METHODS
  if (!methods.includes((request.method ?? 'GET').toUpperCase())) return Promise.resolve({ ok: true, body: null })

  const type = request.headers?.['content-type']
  const json = request.headers === undefined || saysJson(Array.isArray(type) ? type[0] : type)

  return new Promise((resolve) => {
    const chunks: Uint8Array[] = []
    let size = 0
    let done = false
    const finish = (read: BodyRead) => {
      if (done) return
      done = true
      resolve(read)
    }

    request.on('data', (chunk) => {
      if (done) return
      size += chunk.length
      if (!json && size > 0) {
        /* As with a body past the bound: nothing is kept, and the socket keeps flowing for the refusal. */
        request.resume?.()
        finish({ ok: false, status: 415, error: BODY_NOT_JSON })
        return
      }
      if (size > max) {
        chunks.length = 0
        /* Keep the socket flowing so the refusal can be delivered, and keep nothing. */
        request.resume?.()
        finish({ ok: false, status: 413, error: BODY_TOO_LARGE })
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => finish({ ok: true, body: parse(chunks) }))
    request.on('close', () => finish({ ok: true, body: parse(chunks) }))
    request.on('error', () => finish({ ok: true, body: null }))
  })
}

/** The same reading, of a `Request`: bounded as it arrives, so a body past the bound is never held whole. */
export async function readJsonRequest(request: Request, options: BodyOptions = {}): Promise<BodyRead> {
  const max = options.maxBytes ?? MAX_BODY_BYTES
  const methods = options.methods ?? BODY_METHODS
  if (!methods.includes(request.method.toUpperCase()) || !request.body) return { ok: true, body: null }
  if (Number(request.headers.get('content-length') ?? 0) > max) return { ok: false, status: 413, error: BODY_TOO_LARGE }

  const json = saysJson(request.headers.get('content-type'))
  const chunks: Uint8Array[] = []
  let size = 0
  const reader = request.body.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (!json && size > 0) {
        void reader.cancel().catch(() => {})
        return { ok: false, status: 415, error: BODY_NOT_JSON }
      }
      if (size > max) {
        void reader.cancel().catch(() => {})
        return { ok: false, status: 413, error: BODY_TOO_LARGE }
      }
      chunks.push(value)
    }
  } catch {
    /* The sender went away mid-body. What arrived is not a request. */
    return { ok: true, body: null }
  }
  return { ok: true, body: parse(chunks) }
}

function parse(chunks: Uint8Array[]): Record<string, unknown> | null {
  if (!chunks.length) return null
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}
