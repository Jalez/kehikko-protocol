import { BUILD_HEADER, buildStamp } from '../build.js'
import { TICKET_ELEMENT, TICKET_HEADER, TICKET_REFUSED } from '../page.js'
import { pageBuild } from './build.js'

/**
 * A page asking its own server, with every failure as one typed result: `ask` never throws and
 * never hands back a raw response. See docs/module-plumbing.md.
 */

/** The ticket printed into this page, or `''` when there is none. Read on every call; it is one element. */
export function ticket(): string {
  if (typeof document === 'undefined') return ''
  const text = document.getElementById(TICKET_ELEMENT)?.textContent
  if (!text) return ''
  try {
    const parsed: unknown = JSON.parse(text)
    return typeof parsed === 'string' ? parsed : ''
  } catch {
    return ''
  }
}

export type AskFailure =
  /** Nothing answered: the module's own server is stopped, or unreachable. */
  | 'down'
  /** The server refused this page's ticket: it restarted since the page loaded. The page should reload. */
  | 'stale'
  /** The server answered and said no. `error` is its own sentence. */
  | 'refused'

export type Asked<T> =
  | { ok: true; status: number; body: T }
  | { ok: false; kind: AskFailure; status: number | null; error: string; body: unknown }

export interface AskOptions {
  /** Default `GET`, or `POST` when there is a `body`. */
  method?: string
  /** Appended to the path as a query string. `null` and `undefined` values are left out. */
  query?: Record<string, string | number | boolean | null | undefined>
  /** Sent as JSON. */
  body?: unknown
  signal?: AbortSignal
  /** For tests. Default: the page's own `fetch`. */
  fetch?: typeof fetch
}

/** What a reader is told when nothing answered. One sentence, the same in every module. */
export const SERVER_DOWN = 'This app’s own server is not answering.'
/** What a reader is told while a page older than its server reloads. */
export const PAGE_STALE = 'This page is older than its server — reloading…'

export type ServerStanding = 'up' | 'down' | 'stale'

let standing: ServerStanding = 'up'
const watchers = new Set<(standing: ServerStanding) => void>()

function stand(next: ServerStanding): void {
  /* Stale does not heal: the ticket in this document will never be right again. */
  if (standing === next || standing === 'stale') return
  standing = next
  for (const watcher of [...watchers]) watcher(next)
}

/** How this page's own server last answered: `up`, `down` (nothing answered) or `stale` (it refused the ticket). */
export function serverStanding(): ServerStanding {
  return standing
}

/** Hear the standing change. Returns the function that stops listening. */
export function onServerStanding(watcher: (standing: ServerStanding) => void): () => void {
  watchers.add(watcher)
  return () => watchers.delete(watcher)
}

/** For tests: forget what was learned. */
export function resetServerStanding(): void {
  standing = 'up'
}

function sentence(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const error = (body as { error?: unknown }).error
  if (typeof error === 'string' && error) return error
  /* JSON-RPC's spelling, for a page that asks its own `/mcp`. */
  const message = (error as { message?: unknown } | null | undefined)?.message
  return typeof message === 'string' && message ? message : null
}

/**
 * Ask this page's own server; relative paths, one origin. Anything but a GET carries the ticket.
 * A 2xx whose body says `ok: false` is a refusal, and a refusal keeps its `body`.
 */
export async function ask<T = unknown>(path: string, options: AskOptions = {}): Promise<Asked<T>> {
  const method = (options.method ?? (options.body === undefined ? 'GET' : 'POST')).toUpperCase()
  const query = new URLSearchParams()
  for (const [name, value] of Object.entries(options.query ?? {})) {
    if (value !== null && value !== undefined) query.set(name, String(value))
  }
  const text = query.toString()
  const url = text ? `${path}${path.includes('?') ? '&' : '?'}${text}` : path

  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  if (method !== 'GET' && method !== 'HEAD') headers[TICKET_HEADER] = ticket()

  let response: Response
  try {
    response = await (options.fetch ?? fetch)(url, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      cache: 'no-store',
    })
  } catch (caught) {
    /* A caller that gave up is not a server that stopped. */
    if (options.signal?.aborted) return { ok: false, kind: 'refused', status: null, error: 'That was cancelled.', body: null }
    stand('down')
    void caught
    return { ok: false, kind: 'down', status: null, error: SERVER_DOWN, body: null }
  }

  const body: unknown = response.status === 204 ? null : await response.json().catch(() => null)

  if (response.status === 403 && (body as { refused?: unknown } | null)?.refused === TICKET_REFUSED) {
    stand('stale')
    return { ok: false, kind: 'stale', status: 403, error: PAGE_STALE, body }
  }

  /* The server answering is not the process that served this page: every write from here would be
     refused. The answer itself still stands — a read from the new server is a true read. */
  const mine = pageBuild()
  const theirs = response.headers.get(BUILD_HEADER)
  if (mine && theirs && theirs !== buildStamp(mine)) stand('stale')
  else stand('up')
  const refused = (body as { ok?: unknown } | null)?.ok === false
  if (!response.ok || refused) {
    return {
      ok: false,
      kind: 'refused',
      status: response.status,
      error: sentence(body) ?? `This app’s own server answered ${response.status}.`,
      body,
    }
  }
  return { ok: true, status: response.status, body: body as T }
}

/** A failed `ask`, for code written around `try`/`catch`. `message` is the sentence. */
export class AskFailed extends Error {
  readonly kind: AskFailure
  readonly status: number | null
  readonly body: unknown
  constructor(failed: { kind: AskFailure; status: number | null; error: string; body: unknown }) {
    super(failed.error)
    this.name = 'AskFailed'
    this.kind = failed.kind
    this.status = failed.status
    this.body = failed.body
  }
}

/** The body of an `ask` that worked, or an `AskFailed` thrown for one that did not. */
export function answered<T>(asked: Asked<T>): T {
  if (asked.ok) return asked.body
  throw new AskFailed(asked)
}

/**
 * Reload a page that is older than its server — once: a second call within `within` ms does
 * nothing, so a server that refuses even a fresh page cannot make a loop. Returns whether a reload
 * was started.
 */
export function reloadStalePage(within = 10_000): boolean {
  if (typeof location === 'undefined') return false
  const key = 'kehikot.reloaded'
  const now = Date.now()
  try {
    if (now - Number(sessionStorage.getItem(key) ?? 0) < within) return false
    sessionStorage.setItem(key, String(now))
  } catch {
    /* No storage (an opaque origin). The history entry survives a reload there, so it keeps the mark. */
    try {
      const state = (history.state ?? {}) as Record<string, unknown>
      if (now - Number(state[key] ?? 0) < within) return false
      history.replaceState({ ...state, [key]: now }, '')
    } catch {
      /* Nowhere to keep it: reload anyway, which is still the only thing that can help. */
    }
  }
  location.reload()
  return true
}

/** How long the sentence is on screen before a stale page reloads. */
export const STALE_RELOAD_MS = 900

/**
 * Reload automatically when this page's own server turns out to be a different process — once, a
 * moment after it is noticed. `useHost` and `Cover` both arrange this; a page with neither calls
 * it from its entry. Returns the function that stops watching.
 */
export function reloadWhenStale(delay = STALE_RELOAD_MS): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  const arm = () => {
    if (timer === null) timer = setTimeout(() => reloadStalePage(), delay)
  }
  if (standing === 'stale') arm()
  const stop = onServerStanding((next) => {
    if (next === 'stale') arm()
  })
  return () => {
    stop()
    if (timer !== null) clearTimeout(timer)
  }
}
