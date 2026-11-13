import { join } from 'node:path'

import { LIMITS } from '../limits.js'
import { MODULE_ID } from '../ids.js'
import { SERVER_PASS, SERVER_PASS_PATH } from '../server-ask.js'
import { HOST_CALLER, HOST_PASS_PATH, SERVICE_CALLER_HEADER, SERVICE_PASS_HEADER, SERVICES, providerOf, type Service, type ServiceDescriptor } from '../services.js'
import { askHost, hostAskUrls, mintServerPass } from './ask.js'
import { SERVER_ASK_PATH } from '../server-ask.js'
import { readNeighbour, type NeighbourOptions } from './neighbours.js'
import { readRegistration, registryDir } from './registry.js'

/**
 * 2.83.0. Using a service from a module's SERVER, and proving who calls one. Node-only, like the rest of
 * `/serve`. The shapes are `services.ts`; design notes: docs/services.md.
 *
 * - `findService`: who provides a service here (`services.find`, asked of the host), the first whose
 *   descriptor parses, or why there is none.
 * - `callServiceTool`: a tool the descriptor names, on the provider's MCP door — found by the module id
 *   the host answered, never by one the consumer spells.
 * - `fetchService`: a route the descriptor names, on the provider's own origin.
 * - `vouchCaller`: on the provider's side, which module's server sent this request, proved by a pass the
 *   caller minted and confirms at its registered origin. Both calls above carry one.
 */

/** A provider found: its id (as the host answered it), its registered name, whether placed, and its descriptor parsed. */
export type FoundService<S extends Service> = { module: string; name: string; placed: boolean | null; descriptor: ServiceDescriptor<S> }

export interface FindServiceOptions {
  /** This module's id: who asks. */
  module: string
  /** The project the question is about, when it is about one (then `kehikko` is a kehikko of it). */
  project?: string
  kehikko?: string
  env?: Record<string, string | undefined>
  timeoutMs?: number
  fetch?: typeof fetch
}

/**
 * The first provider of a service here whose descriptor parses, or why there is none (a sentence that
 * names no module). With `kehikko`, a placed provider comes first. Never throws.
 */
export async function findService<S extends Service>(service: S, options: FindServiceOptions): Promise<{ ok: true; provider: FoundService<S> } | { ok: false; why: string }> {
  const asked = await askHost(
    'services.find',
    { service, ...(options.kehikko ? { kehikko: options.kehikko } : {}) },
    { module: options.module, ...(options.project ? { project: options.project } : {}), ...(options.env ? { env: options.env } : {}), ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}), ...(options.fetch ? { fetch: options.fetch } : {}) },
  )
  if (!asked.ok) return { ok: false, why: asked.why }
  const provider = providerOf(service, asked.data.providers)
  return provider ? { ok: true, provider } : { ok: false, why: `Nothing here provides ${service} (${SERVICES[service].says.replace(/\.$/, '').toLowerCase()}).` }
}

export interface CallServiceOptions extends NeighbourOptions {
  /** This module's id: who calls. Sent with a pass it minted, so the provider can tell (`vouchCaller`). */
  from: string
  /** How long the call gets, in ms. Default 60 s. */
  callTimeoutMs?: number
}

const CALL_TIMEOUT_MS = 60_000

/** The headers that say who calls: this module's id and a fresh pass. */
export function callerHeaders(from: string): Record<string, string> {
  return { [SERVICE_CALLER_HEADER]: from, [SERVICE_PASS_HEADER]: mintServerPass() }
}

async function timed(url: string, init: RequestInit, options: CallServiceOptions): Promise<Response> {
  const control = new AbortController()
  const timer = setTimeout(() => control.abort(), options.callTimeoutMs ?? CALL_TIMEOUT_MS)
  try {
    return await (options.fetch ?? fetch)(url, { ...init, signal: control.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * One tool on a provider's MCP door, by the name its descriptor gives: `ok` and the text of the
 * result, or `ok: false` and a sentence. `module` is the id `findService` answered. Never throws.
 */
export async function callServiceTool(module: string, tool: string, args: Record<string, unknown>, options: CallServiceOptions): Promise<{ ok: boolean; text: string }> {
  const found = await readNeighbour(module, options)
  if (!found.found) return { ok: false, text: found.sentence }
  if (!found.door) return { ok: false, text: `${found.manifest.name} has no MCP door to call.` }
  try {
    const response = await timed(
      found.door,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', ...callerHeaders(options.from) },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: tool, arguments: args } }),
      },
      options,
    )
    const body = (await response.json()) as { result?: { content?: { text?: string }[]; isError?: boolean }; error?: { message?: string } }
    if (body.error) return { ok: false, text: body.error.message ?? `${found.manifest.name} refused ${tool}.` }
    const text = (body.result?.content ?? []).map((one) => one.text ?? '').join('\n')
    return { ok: body.result?.isError !== true, text }
  } catch (e) {
    return { ok: false, text: `${found.manifest.name} did not answer ${tool}: ${e instanceof Error ? e.message : String(e)}` }
  }
}

/**
 * A route a descriptor names (`/api/…`), on the provider's registered origin, with who calls in the
 * headers. The response, or a sentence when there is none. Never throws.
 */
export async function fetchService(module: string, path: string, init: RequestInit, options: CallServiceOptions): Promise<{ ok: true; response: Response } | { ok: false; why: string }> {
  if (!path.startsWith('/api/') || path.split('/').includes('..')) return { ok: false, why: `"${path.slice(0, 80)}" is not a route on the provider's own origin.` }
  const found = await readNeighbour(module, options)
  if (!found.found) return { ok: false, why: found.sentence }
  try {
    const headers = { ...(init.headers as Record<string, string> | undefined), ...callerHeaders(options.from) }
    return { ok: true, response: await timed(`${found.origin}${path}`, { ...init, headers }, options) }
  } catch (e) {
    return { ok: false, why: `${found.manifest.name} did not answer: ${e instanceof Error ? e.message : String(e)}` }
  }
}

/** A request's headers as a reader: a `Headers`, or node's record. */
type HeaderBag = Headers | Record<string, string | string[] | undefined>

function header(headers: HeaderBag, name: string): string | null {
  if (typeof (headers as Headers).get === 'function') return (headers as Headers).get(name)
  const value = (headers as Record<string, string | string[] | undefined>)[name]
  return typeof value === 'string' ? value : Array.isArray(value) ? (value[0] ?? null) : null
}

export interface VouchOptions {
  registry?: string
  timeoutMs?: number
  fetch?: typeof fetch
}

/**
 * Which module's server sent this request, or why that is not known: its id from
 * `SERVICE_CALLER_HEADER`, proved by asking it at its REGISTERED origin whether it minted the pass in
 * `SERVICE_PASS_HEADER` (spent by the asking). A page, an agent or any program that is not that module's
 * running server cannot pass. Never throws.
 */
export async function vouchCaller(headers: HeaderBag, options: VouchOptions = {}): Promise<{ ok: true; module: string } | { ok: false; why: string }> {
  const module = header(headers, SERVICE_CALLER_HEADER)?.trim() ?? ''
  const pass = header(headers, SERVICE_PASS_HEADER)?.trim() ?? ''
  if (!module || !MODULE_ID.test(module)) return { ok: false, why: 'The request does not say which module sent it.' }
  if (!SERVER_PASS.test(pass)) return { ok: false, why: 'The request carries no pass from the module that sent it.' }
  const registration = readRegistration(join(options.registry ?? registryDir(), `${module}.json`))
  if (!registration) return { ok: false, why: `${module} is not registered on this computer.` }
  let origin: string
  try {
    origin = new URL(registration.url).origin
  } catch {
    return { ok: false, why: `${module} is registered at an address that is not a URL.` }
  }
  const control = new AbortController()
  const timer = setTimeout(() => control.abort(), options.timeoutMs ?? LIMITS.SERVER_ASK_MS)
  try {
    const response = await (options.fetch ?? fetch)(`${origin}${SERVER_PASS_PATH}?pass=${encodeURIComponent(pass)}`, { headers: { accept: 'application/json' }, signal: control.signal })
    const body = (await response.json()) as { ok?: unknown; minted?: unknown }
    return response.ok && body.minted === true ? { ok: true, module } : { ok: false, why: `${module} did not vouch for that pass.` }
  } catch {
    return { ok: false, why: `${module} did not answer when asked about its pass.` }
  } finally {
    clearTimeout(timer)
  }
}

export interface VouchHostOptions {
  env?: Record<string, string | undefined>
  timeoutMs?: number
  fetch?: typeof fetch
}

/**
 * 2.88.0. Whether this request came from the HOST's server: `SERVICE_CALLER_HEADER` is `HOST_CALLER`,
 * and the host, asked at its own origins (`KEHIKOT_ORIGINS`, loopback only) at `HOST_PASS_PATH`, says it
 * minted the pass in `SERVICE_PASS_HEADER` (spent by the asking). What a provider holds its host-only
 * service routes to (`conversations.finder`, `agent.tasks`). Never throws.
 */
export async function vouchHost(headers: HeaderBag, options: VouchHostOptions = {}): Promise<{ ok: true } | { ok: false; why: string }> {
  const caller = header(headers, SERVICE_CALLER_HEADER)?.trim() ?? ''
  const pass = header(headers, SERVICE_PASS_HEADER)?.trim() ?? ''
  if (caller !== HOST_CALLER) return { ok: false, why: 'Only Kehikot itself may ask this.' }
  if (!SERVER_PASS.test(pass)) return { ok: false, why: 'The request carries no pass from Kehikot.' }
  const origins = hostAskUrls(options.env ?? process.env).map((url) => url.slice(0, -SERVER_ASK_PATH.length))
  for (const origin of origins) {
    const control = new AbortController()
    const timer = setTimeout(() => control.abort(), options.timeoutMs ?? LIMITS.SERVER_ASK_MS)
    try {
      const response = await (options.fetch ?? fetch)(`${origin}${HOST_PASS_PATH}?pass=${encodeURIComponent(pass)}`, { headers: { accept: 'application/json' }, signal: control.signal })
      const body = (await response.json()) as { minted?: unknown }
      if (response.ok && body.minted === true) return { ok: true }
    } catch {
      /* Not this origin: the next. */
    } finally {
      clearTimeout(timer)
    }
  }
  return { ok: false, why: 'Kehikot did not vouch for that pass.' }
}

/* ---------------------------------------------------------------- agent.tasks: accept now, start after (2.99.0) */

/** What a module's slow start came to: the conversation it started, or why not, in words for the person. */
export type TaskStarting = { ok: true; conversation: string } | { ok: false; why: string }

export interface AcceptTaskOptions {
  /** This module's id: who reports. */
  module: string
  /** A line for the module's log, when it has one. */
  log?: (line: string) => void
  env?: Record<string, string | undefined>
  fetch?: typeof fetch
}

/**
 * 2.99.0. `agent.tasks`' `start`, the shape every agent module answers it in: ACCEPT at once (`started`,
 * `session` = `handle`, `pending: true`) and run `starting` after the answer has gone; what it came to
 * is reported to the host with `tasks.report` — `started` with the conversation's id, or `failed` with
 * why (a throw is a failure, in its message). Never throws; the report is best effort, logged when the
 * host did not take it.
 *
 * Checks that can be made at once (the body, the project, that the program is installed) belong BEFORE
 * this, as a `declined` answer: the person is told at once rather than through the Inbox.
 */
export function acceptTask(handle: string, starting: () => Promise<TaskStarting>, options: AcceptTaskOptions): { outcome: 'started'; session: string; why: string; pending: true } {
  const report = async (params: { outcome: 'started' | 'failed'; conversation?: string | null; why?: string }) => {
    const said = await askHost('tasks.report', { session: handle, conversation: params.conversation ?? null, outcome: params.outcome, why: (params.why ?? '').slice(0, LIMITS.REASON) }, { module: options.module, env: options.env, fetch: options.fetch }).catch(
      (error: unknown) => ({ ok: false as const, why: error instanceof Error ? error.message : String(error) }),
    )
    if (!said.ok) options.log?.(`the host was not told what became of task ${handle} (${said.why})`)
  }
  /* After the answer: a macrotask, so the route has returned before any of the slow work begins. */
  setTimeout(() => {
    void (async () => {
      let came: TaskStarting
      try {
        came = await starting()
      } catch (error) {
        came = { ok: false, why: error instanceof Error ? error.message : String(error) }
      }
      if (came.ok) await report({ outcome: 'started', conversation: came.conversation })
      else await report({ outcome: 'failed', why: came.why || 'it gave no reason' })
    })()
  }, 0)
  return { outcome: 'started', session: handle, why: '', pending: true }
}
