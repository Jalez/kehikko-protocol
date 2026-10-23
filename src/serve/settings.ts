import { LIMITS } from '../limits.js'
import {
  SETTINGS_PASS,
  SETTINGS_PASS_PATH,
  SETTINGS_PATH,
  doorMethodParams,
  settingsPassResult,
  settingsSetRefusal,
  settingsValues,
  type SettingField,
  type SettingsGetResult,
  type SettingsPassAbout,
  type SettingsSetResult,
} from '../settings.js'
import type { Answer, Reply } from './doors.js'
import { frameOrigins } from './origins.js'
import { sameTicket } from './ticket.js'

/**
 * A module's settings door (2.15.0): `settings.get` and `settings.set` at `SETTINGS_PATH`, answered
 * from the module's own store, and the question a module's server asks the host about a person's
 * pass. Node-only, like the rest of `/serve`. Design notes: docs/settings.md.
 */

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

export interface HostVouchesOptions {
  env?: Record<string, string | undefined>
  /** How long each origin gets, in ms. Default `LIMITS.HOST_ASK_MS`. */
  timeoutMs?: number
  /** Injected by the tests. */
  fetch?: typeof fetch
}

/** The URLs `hostVouches` asks, in order. Pure; exported for tests. */
export function hostVouchUrls(pass: string, about: SettingsPassAbout, env: Record<string, string | undefined> = process.env): string[] {
  const query = new URLSearchParams({ pass, module: about.module, key: about.key })
  if (about.project) query.set('project', about.project)
  return hostOrigins(env).map((origin) => `${origin}${SETTINGS_PASS_PATH}?${query.toString()}`)
}

/**
 * Whether the host minted `pass` for a person's change of `about.key` of `about.module` (in
 * `about.project`). Asks each origin of `KEHIKOT_ORIGINS` until one says `person: true`. Fails closed:
 * a malformed pass, no answer, a refusal, a slow host or a reply of another shape is `false`. Never throws.
 */
export async function hostVouches(pass: string | null | undefined, about: SettingsPassAbout, options: HostVouchesOptions = {}): Promise<boolean> {
  if (typeof pass !== 'string' || !SETTINGS_PASS.test(pass)) return false
  const asked = options.fetch ?? fetch
  for (const url of hostVouchUrls(pass, about, options.env ?? process.env)) {
    const control = new AbortController()
    const timer = setTimeout(() => control.abort(), options.timeoutMs ?? LIMITS.HOST_ASK_MS)
    try {
      const response = await asked(url, { signal: control.signal })
      if (!response.ok) continue
      const read = settingsPassResult.safeParse(await response.json())
      if (read.success && read.data.person) return true
    } catch {
      /* Not this origin. */
    } finally {
      clearTimeout(timer)
    }
  }
  return false
}

/** What a module's store says about its settings: the values as kept (any shape), and where. */
export interface SettingsRead {
  /** The values the store holds, by key; a missing or ill-typed one reads as the field's default. */
  values: Record<string, unknown>
  /** The project's settings file, relative to the project: `.kehikot/<module>/settings.json`. */
  file?: string
  /** A sentence when the store could not be read; the values are then the defaults. */
  problem?: string
}

export interface SettingsDoorOptions {
  /** The module's id: what a pass is asked about. */
  module: string
  /** The module's declared settings: the same list its manifest serves as `declares.settings`. */
  fields: readonly SettingField[]
  /** Read the store for this project (null: no project named, for a module whose settings are all `machine`). */
  read(project: string | null): SettingsRead | Promise<SettingsRead>
  /**
   * Write ONE checked change, in the store's own format. Return a sentence to refuse (the project is
   * not one, the file cannot be read and would be lost), or null when it is written.
   */
  write(project: string | null, key: string, value: unknown): string | null | Promise<string | null>
  /** The module page's ticket: a change carrying it is the person's. */
  ticket?: string
  /** Asked for a `by: 'person'` change with a pass. Default `hostVouches`. */
  vouch?: (pass: string, about: SettingsPassAbout) => Promise<boolean>
}

const json = (status: number, body: unknown): Reply => ({ status, body })

/**
 * The `answer` for `SETTINGS_PATH`, or `null` for any other path, to call first from a module's own
 * `answer`:
 *
 *     const settings = settingsDoor({ module: ID, fields: SETTINGS, read, write, ticket: TICKET })
 *     // inside answer(method, path, query, body, ticket):
 *     const said = await settings(method, path, query, body, ticket)
 *     if (said) return said
 *
 * `GET` answers `settingsGetResult`. `POST` checks the change with `settingsSetRefusal` — the person is
 * a call carrying the page's ticket, or `by: 'person'` with a pass the host vouches for — then calls
 * `write`, and answers `settingsSetResult` with the values as they then stand. A refusal is 200 with
 * `outcome: 'refused'`; a call that is not one (no key, a malformed pass) is 400.
 */
export function settingsDoor(options: SettingsDoorOptions): Answer {
  const vouch = options.vouch ?? ((pass: string, about: SettingsPassAbout) => hostVouches(pass, about))
  const valuesOf = async (project: string | null): Promise<SettingsGetResult> => {
    const read = await options.read(project)
    return {
      values: settingsValues(options.fields, read.values),
      ...(read.file ? { file: read.file } : {}),
      ...(read.problem ? { problem: read.problem.slice(0, LIMITS.REASON) } : {}),
    }
  }
  return async (method, path, query, body, ticket) => {
    if (path !== SETTINGS_PATH) return null
    if (method === 'GET') {
      const asked = doorMethodParams['settings.get'].safeParse({ project: query.get('project') ?? undefined })
      if (!asked.success) return json(400, { ok: false, error: asked.error.issues[0]?.message ?? 'not a settings.get' })
      return json(200, { ok: true, ...(await valuesOf(asked.data.project ?? null)) })
    }
    if (method !== 'POST') return json(405, { ok: false, error: `${SETTINGS_PATH} answers GET and POST.` })
    const asked = doorMethodParams['settings.set'].safeParse(body ?? {})
    if (!asked.success) return json(400, { ok: false, error: asked.error.issues[0]?.message ?? 'not a settings.set' })
    const change = asked.data
    const project = change.project ?? null
    const ticketed = options.ticket !== undefined && sameTicket(ticket, options.ticket)
    const person =
      ticketed ||
      (change.by === 'person' && change.pass !== undefined && (await vouch(change.pass, { module: options.module, key: change.key, ...(change.project ? { project: change.project } : {}) })))
    const refused = settingsSetRefusal(options.fields, { key: change.key, value: change.value, project: change.project }, person)
    const answer = (result: SettingsSetResult): Reply => json(200, { ok: true, ...result })
    if (refused) return answer({ outcome: 'refused', why: refused.slice(0, LIMITS.REASON) })
    const notWritten = await options.write(project, change.key, change.value)
    if (notWritten) return answer({ outcome: 'refused', why: notWritten.slice(0, LIMITS.REASON) })
    return answer({ outcome: 'saved', why: '', values: (await valuesOf(project)).values })
  }
}
