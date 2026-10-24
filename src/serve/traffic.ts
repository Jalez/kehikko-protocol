import { LIMITS } from '../limits.js'
import { trafficCommand, trafficNoteSchema, trafficTarget, type TrafficCache, type TrafficNote, type TrafficNoteResult } from '../traffic.js'
import { askHost, type AskedHost } from './ask.js'

/**
 * A module's server noting its own calls in the host's record of traffic (2.20.0): `trafficNotes`,
 * which wraps `fetch` with a reason, notes a program run or any other call, and sends the notes to
 * the host in batches with `askHost('traffic.note', …)` — the server-to-host path, with its pass.
 * Opt-in: a call the module does not note is not in the record, except as a connection the host
 * sees on the module's processes, "no reason given". Node-only, like the rest of `/serve`. Shapes:
 * `traffic.ts`; design notes: docs/traffic.md.
 */

/** How long notes wait to be sent together, in ms. */
export const TRAFFIC_FLUSH_MS = 2000
/** How many notes wait at most while no host answers; the oldest go first. */
export const TRAFFIC_PENDING = 500

/** One call to note, before it is sanitized: where it went as an address (`to`), never as parts. */
export interface TrafficCallSaid {
  /** A short plain phrase from the call site: "release list", "compile: paper". Null: none to give. */
  reason: string | null
  /** `GET`, `POST`, `git fetch`, `tectonic`. */
  kind: string
  /** The address: a URL, a git remote, a host name. Sanitized here (`trafficTarget`). */
  to: string | URL
  /** When it began, ms since the epoch. Default now. */
  at?: number
  ms?: number | null
  status?: number | null
  ok?: boolean | null
  bytesIn?: number
  bytesOut?: number
  cache?: TrafficCache
}

export interface TrafficNotesOptions {
  /** This module's id: whose calls they are. Its manifest has to ask for `traffic:report`. */
  module: string
  env?: Record<string, string | undefined>
  /** The `fetch` the traced calls go through. Default the global one. */
  fetch?: typeof fetch
  /** How the notes reach the host. Default `askHost('traffic.note', …)`; the tests replace it. */
  send?: (calls: TrafficNote[]) => Promise<AskedHost<'traffic.note'>>
  flushMs?: number
  now?: () => number
}

export interface TrafficNotes {
  /** `fetch`, noted with `reason`: method, sanitized address, status, time, and the bytes the headers say. Never the body or a header. */
  fetch(reason: string | null, input: string | URL | Request, init?: RequestInit): Promise<Response>
  /** Note one call made some other way. Dropped when it does not fit the shape. */
  note(call: TrafficCallSaid): void
  /** Note a program run, when it went over the network (`trafficCommand`): `git fetch`, `gh api`. Anything else is not noted. */
  command(reason: string | null, argv: readonly string[], ran: { ms: number; code: number | null; at?: number }): void
  /** Send what is waiting now. Null when nothing was waiting. */
  flush(): Promise<AskedHost<'traffic.note'> | null>
  /** Stop the timer; what is waiting is dropped. */
  stop(): void
  /** How many notes are waiting to be sent. */
  readonly pending: number
}

/** The bytes a request body is, when it can be told without reading a stream. */
function bodyBytes(body: unknown): number | undefined {
  if (typeof body === 'string') return Buffer.byteLength(body)
  if (body instanceof ArrayBuffer) return body.byteLength
  if (ArrayBuffer.isView(body)) return body.byteLength
  if (body instanceof URLSearchParams) return Buffer.byteLength(body.toString())
  return undefined
}

function lengthOf(response: Response): number | undefined {
  const said = Number(response.headers.get('content-length'))
  return Number.isInteger(said) && said >= 0 ? said : undefined
}

/**
 * The notes of one module's server. Make one per process:
 *
 *     const traffic = trafficNotes({ module: ID })
 *     const response = await traffic.fetch('release list', 'https://api.example.com/releases')
 *     traffic.command('pull the paper', ['git', '-C', dir, 'fetch', 'origin'], { ms, code })
 *
 * Notes are sanitized when they are made and sent together every `flushMs`. A host that is not
 * running keeps them waiting (at most `TRAFFIC_PENDING`); a host that refuses them — the manifest
 * does not ask for `traffic:report`, or the host is older than 2.20.0 — has them dropped. Never throws
 * but where the traced `fetch` itself would.
 */
export function trafficNotes(options: TrafficNotesOptions): TrafficNotes {
  const now = options.now ?? Date.now
  const raw = options.fetch ?? fetch
  const flushMs = options.flushMs ?? TRAFFIC_FLUSH_MS
  const send =
    options.send ??
    ((calls: TrafficNote[]) => askHost('traffic.note', { calls }, { module: options.module, ...(options.env ? { env: options.env } : {}), ...(options.fetch ? { fetch: options.fetch } : {}) }))
  let waiting: TrafficNote[] = []
  let timer: ReturnType<typeof setTimeout> | null = null
  let stopped = false
  let sending: Promise<AskedHost<'traffic.note'> | null> | null = null

  const schedule = () => {
    if (timer || stopped || !waiting.length) return
    timer = setTimeout(() => {
      timer = null
      void flush()
    }, flushMs)
    ;(timer as { unref?: () => void }).unref?.()
  }

  /* `where` is already sanitized: `trafficTarget` of an address, or `trafficCommand` of a run. */
  const push = (call: Omit<TrafficCallSaid, 'to'>, where: { host: string; path: string }) => {
    if (stopped) return
    const target = where
    const read = trafficNoteSchema.safeParse({
      at: Math.max(0, Math.round(call.at ?? now())),
      ms: call.ms === undefined || call.ms === null ? null : Math.max(0, Math.min(3_600_000, Math.round(call.ms))),
      reason: typeof call.reason === 'string' && call.reason.trim() ? call.reason.trim().slice(0, LIMITS.TRAFFIC_REASON) : null,
      kind: String(call.kind ?? '').trim().slice(0, LIMITS.TRAFFIC_KIND) || 'call',
      host: target.host,
      path: target.path,
      status: call.status ?? null,
      ok: call.ok ?? null,
      ...(call.bytesIn !== undefined ? { bytesIn: call.bytesIn } : {}),
      ...(call.bytesOut !== undefined ? { bytesOut: call.bytesOut } : {}),
      ...(call.cache ? { cache: call.cache } : {}),
    })
    if (!read.success) return
    waiting.push(read.data)
    if (waiting.length > TRAFFIC_PENDING) waiting = waiting.slice(-TRAFFIC_PENDING)
    schedule()
  }

  const note = (call: TrafficCallSaid) => push(call, trafficTarget(call.to))

  const flush = async (): Promise<AskedHost<'traffic.note'> | null> => {
    if (sending) await sending
    if (!waiting.length) return null
    const batch = waiting.slice(0, LIMITS.TRAFFIC_NOTE)
    waiting = waiting.slice(batch.length)
    const asking: Promise<AskedHost<'traffic.note'>> = send(batch).catch((error: unknown) => ({ ok: false as const, why: error instanceof Error ? error.message : String(error) }))
    sending = asking
    const said = await asking
    sending = null
    /* No host answered: keep them for the next one, oldest first. Any answer — taken or refused — settles them. */
    if (!said.ok && said.reason === undefined && said.refused === undefined) waiting = [...batch, ...waiting].slice(-TRAFFIC_PENDING)
    schedule()
    return said
  }

  return {
    async fetch(reason, input, init) {
      const at = now()
      const url = input instanceof Request ? input.url : String(input)
      const kind = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
      const bytesOut = bodyBytes(init?.body)
      try {
        const response = await raw(input, init)
        const bytesIn = lengthOf(response)
        note({
          reason,
          kind,
          to: url,
          at,
          ms: now() - at,
          status: response.status,
          ok: response.ok || response.status === 304,
          ...(bytesIn !== undefined ? { bytesIn } : {}),
          ...(bytesOut !== undefined ? { bytesOut } : {}),
          ...(response.status === 304 ? { cache: 'not-modified' as const } : {}),
        })
        return response
      } catch (error) {
        note({ reason, kind, to: url, at, ms: now() - at, status: null, ok: false, ...(bytesOut !== undefined ? { bytesOut } : {}) })
        throw error
      }
    },
    note,
    command(reason, argv, ran) {
      const said = trafficCommand(argv)
      if (!said) return
      push({ reason, kind: said.kind, at: ran.at ?? now() - ran.ms, ms: ran.ms, status: ran.code, ok: ran.code === 0 }, said)
    },
    flush,
    stop() {
      stopped = true
      if (timer) clearTimeout(timer)
      timer = null
      waiting = []
    },
    get pending() {
      return waiting.length
    },
  }
}

export type { TrafficNoteResult }
