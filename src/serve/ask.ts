import { randomBytes } from 'node:crypto'

import { LIMITS } from '../limits.js'
import { FIT_SAYS, tooOldOf } from '../fit.js'
import { methodResults } from '../methods.js'
import { sinceOf } from '../since.js'
import {
  SERVER_ASK_PATH,
  SERVER_PASS,
  SERVER_PASS_PATH,
  serverAskResult,
  type ServerAskRefusal,
  type ServerMethod,
} from '../server-ask.js'
import type { TrackerColumns, TrackerReading } from '../tracker.js'
import type { TrafficNoteResult, TrafficReadResult } from '../traffic.js'
import type { DispositionsGetResult, EpicsListResult, PartsGetResult } from '../methods.js'
import type { StepsListResult } from '../plan.js'
import type { MessageReadResult, MessageSendResult } from '../agent-messages.js'
import type { Reply } from './doors.js'
import { frameOrigins } from './origins.js'

/**
 * A module's server asking the host (2.19.0): `askHost`, and the passes it mints for each question,
 * which the doors answer for at `SERVER_PASS_PATH`. Node-only, like the rest of `/serve`. The shapes
 * are `server-ask.ts`; design notes: docs/server-ask.md.
 */

/** Passes minted by this process and not yet spent, with when each stops being good. */
const minted = new Map<string, number>()

function sweep(now: number): void {
  for (const [pass, until] of minted) if (until <= now) minted.delete(pass)
}

/** A new pass for one question, good once for `LIMITS.SERVER_PASS_MS`. `askHost` mints its own. */
export function mintServerPass(now: number = Date.now()): string {
  sweep(now)
  const pass = randomBytes(24).toString('base64url')
  minted.set(pass, now + LIMITS.SERVER_PASS_MS)
  return pass
}

/** Whether this process minted `pass` and it is still good; spent by asking, so a second ask says no. */
export function spendServerPass(pass: string | null | undefined, now: number = Date.now()): boolean {
  if (typeof pass !== 'string' || !SERVER_PASS.test(pass)) return false
  const until = minted.get(pass)
  minted.delete(pass)
  return until !== undefined && until > now
}

/**
 * The doors' answer at `SERVER_PASS_PATH`, or null for any other path. Mounted by `doorsFetch` and
 * `doorsHandler` for every module, before its own `answer`.
 */
export function serverPassReply(method: string, path: string, query: URLSearchParams): Reply | null {
  if (path !== SERVER_PASS_PATH) return null
  if (method !== 'GET') return { status: 405, body: { ok: false, error: `${SERVER_PASS_PATH} answers GET.` } }
  return { status: 200, body: { ok: true, minted: spendServerPass(query.get('pass')) } }
}

/** The origins a host may be asked on: `KEHIKOT_ORIGINS` and its fallbacks, kept to `http(s)` loopback. */
function hostOrigins(env: Record<string, string | undefined>): string[] {
  const out: string[] = []
  for (const origin of frameOrigins(env)) {
    try {
      const url = new URL(origin)
      if ((url.protocol === 'http:' || url.protocol === 'https:') && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) out.push(url.origin)
    } catch {
      /* Not a URL: nobody to ask there. */
    }
  }
  return [...new Set(out)]
}

/** The URLs `askHost` posts to, in order. Pure; exported for tests. */
export function hostAskUrls(env: Record<string, string | undefined> = process.env): string[] {
  return hostOrigins(env).map((origin) => `${origin}${SERVER_ASK_PATH}`)
}

/** What each method a server may ask is answered with. */
export interface ServerAnswers {
  'tracker.get': TrackerReading
  'tracker.columns': TrackerColumns
  'traffic.read': TrafficReadResult
  'traffic.note': TrafficNoteResult
  /** 2.21.0. The project's epics. */
  'epics.list': EpicsListResult
  /** 2.21.0. One epic, as the host keeps it: its own material, which the protocol gives no shape. */
  'epic.get': Record<string, unknown>
  /** 2.21.0. Every provider's steps for the epic (`plansUnion`). */
  'steps.list': StepsListResult
  /** 2.21.0. The epic's parts, with what the modules hold. */
  'parts.get': PartsGetResult
  /** 2.21.0. The project's dispositions. */
  'dispositions.get': DispositionsGetResult
  /** 2.41.0. What became of a message. */
  'messages.send': MessageSendResult
  /** 2.41.0. The messages a session may read. */
  'messages.read': MessageReadResult
}

/**
 * What came of one question. `ok: true`: the host's answer, held to the method's result schema.
 * `ok: false`: `why`, a sentence; `refused` when the host would not take it from this module or about
 * this project (see `SERVER_ASK_REFUSALS`); `reason` when a host answered with a refusal; neither when
 * no host answered at all.
 */
export type AskedHost<M extends ServerMethod> =
  | { ok: true; data: ServerAnswers[M] }
  | {
      ok: false
      why: string
      reason?: 'unknown-module' | 'unknown-method' | 'failed'
      refused?: ServerAskRefusal
      /**
       * 2.22.0. `host-too-old`: the host does not answer this method yet, and `since` is the version
       * that does (`SERVER_METHOD_SINCE`). Read it with `hostTooOld`; show `FIT_SAYS.tooOld(since)`.
       */
      declined?: 'host-too-old'
      since?: string | null
    }

export interface AskHostOptions {
  /** This module's id: who asks. Its manifest is what the host holds the call to. */
  module: string
  /**
   * The project the question is about: its absolute folder (`resolveDoorProject`, `resolveDoorPlace`).
   * Left out for a question about this computer rather than a project (`traffic.*`, 2.20.0).
   */
  project?: string
  env?: Record<string, string | undefined>
  /** How long each host gets, in ms. Default `LIMITS.SERVER_ASK_MS`. */
  timeoutMs?: number
  /** Injected by the tests. */
  fetch?: typeof fetch
}

/** What a module's server is told when no host on this machine answered. */
export const NO_HOST_TO_ASK = 'No Kehikot host answered, so there is nothing to read: Kehikot is not running, or not on the origins this module was given.'

/**
 * Ask the host one question from a module's server, and get what its page would get:
 *
 *     const read = await askHost('tracker.get', { epic, parts: true }, { module: ID, project })
 *     if (read.ok) read.data.rows
 *
 * Asks each origin of `KEHIKOT_ORIGINS` in turn, with a pass minted for that ask, and takes the first
 * that answers it; a host that does not hold the project or does not know the module is passed over
 * for the next. Never throws.
 */
export async function askHost<M extends ServerMethod>(method: M, params: Record<string, unknown>, options: AskHostOptions): Promise<AskedHost<M>> {
  const asked = options.fetch ?? fetch
  let last: AskedHost<M> | null = null
  for (const url of hostAskUrls(options.env ?? process.env)) {
    const pass = mintServerPass()
    const control = new AbortController()
    const timer = setTimeout(() => control.abort(), options.timeoutMs ?? LIMITS.SERVER_ASK_MS)
    try {
      const response = await asked(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ module: options.module, pass, ...(options.project !== undefined ? { project: options.project } : {}), method, params }),
        signal: control.signal,
      })
      const body: unknown = await response.json()
      const read = serverAskResult.safeParse(body)
      if (!read.success) {
        /* A host before 2.22.0 refuses a question whose method it does not have as a question of the
           wrong shape (`{ ok: false, error }`, no reason). The question is this package's own, so
           the shape that is wrong is the host's: it is older than the method. */
        if (olderHostRefused(body)) return tooOld(method)
        continue
      }
      if (!read.data.ok) {
        const declined = tooOldOf(method, read.data, 'serverMethod')
        if (declined) return tooOld(method, declined.since)
        last = { ok: false, why: read.data.error, reason: read.data.reason, ...(read.data.refused ? { refused: read.data.refused } : {}) }
        /* Another host on this machine may hold the project, or have the module registered. */
        if (read.data.refused === 'project' || read.data.refused === 'module' || read.data.reason === 'unknown-module') continue
        return last
      }
      const schema = methodResults[method]
      const data = schema ? schema.safeParse(read.data.data) : { success: true as const, data: read.data.data }
      if (!data.success) return { ok: false, why: `The host answered ${method} with something of another shape.`, reason: 'failed' }
      return { ok: true, data: data.data as ServerAnswers[M] }
    } catch {
      /* Not this origin. */
    } finally {
      clearTimeout(timer)
      minted.delete(pass)
    }
  }
  return last ?? { ok: false, why: NO_HOST_TO_ASK }
}

/** A refusal with no reason that names the method: a host before 2.22.0 taking the question for malformed. */
function olderHostRefused(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false
  const { ok, error, reason } = body as { ok?: unknown; error?: unknown; reason?: unknown }
  return ok === false && reason === undefined && typeof error === 'string' && /\bmethod\b/.test(error)
}

/** `host-too-old`, with the line a module may show as its `why`. */
function tooOld<M extends ServerMethod>(method: M, since: string | null = sinceOf('serverMethod', method)): AskedHost<M> {
  return {
    ok: false,
    why: FIT_SAYS.tooOld(since),
    reason: 'unknown-method',
    declined: 'host-too-old',
    since,
  }
}
