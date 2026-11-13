import { createHash } from 'node:crypto'

import { PLACE_PARAM } from '../door.js'
import { MODULE_ID } from '../ids.js'
import { frameOrigins } from './origins.js'

/**
 * The host that started this module, and the doors an agent session is handed on it (2.95.0).
 *
 * An agent module (one that starts agent sessions and writes them a door config: Claude Code's
 * `--mcp-config`, Codex's `-c mcp_servers…`, an `opencode.json`, …) hands every session the Kehikot
 * doors of its place. Three rules keep those entries alive and keep another host out of them:
 *
 *  1. **Only the host that started the module.** `startingHost(env)` is that host's origin: what it
 *     put in `KEHIKOT_HOST` when it spawned the module, or, from a host older than 2.95.0, the first
 *     loopback `http(s)` origin of `KEHIKOT_ORIGINS` / `KEHIKOT_ORIGIN`. Never an origin a page
 *     greeted from, a request came from, or a door list named. The module asks that host, and no
 *     other, for a session's doors (`POST /host/place`), its places and its projects.
 *  2. **Only its stable doors.** Every entry is `doorUrl(host, module, token)`: the host's own door at
 *     `<host>/mcp`, a module's at `<host>/m/<id>/mcp`, each with the session's place token. Never a
 *     module's own port, which changes on every restart that finds it taken; never another host.
 *     `stableDoors` rebuilds a host's answer that way, so a door list from any source can only ever
 *     name the starting host. `doorConfigProblems` is the conformance check over a written config.
 *  3. **Its own files.** A session's kept files are named for the host as well as the token
 *     (`keptFolderName`), so a scratch host running a copy of the module over a copy of the
 *     project (which carries the same conversation tokens) writes beside the real ones, never over
 *     them.
 *
 * Pure apart from hashing. Design notes: docs/serving.md ("The starting host").
 */

/** What a host puts in the environment of a module it starts: its own origin (2.95.0). */
export const HOST_ENV = 'KEHIKOT_HOST'

/** The module id a host's own door is listed under in a session's doors (`POST /host/place`). */
export const HOST_DOOR_MODULE = 'kehikko'

/** The path a module's stable program address starts with on its host: `/m/<id>`. */
export const MODULE_PATH_PREFIX = '/m/'

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]'])

/** An `http(s)` loopback origin, as an origin (no path), or null. */
export function loopbackOrigin(value: string | undefined | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!LOOPBACK.has(url.hostname)) return null
    return url.origin
  } catch {
    return null
  }
}

/**
 * The origin of the host that started this module, from its start environment alone; null for a
 * module nobody started (run by hand, with neither variable set). `KEHIKOT_HOST` first (a 2.95.0
 * host sets it on every module it starts); from an older host, the first loopback `http(s)` origin
 * of `KEHIKOT_ORIGINS`, then of `KEHIKOT_ORIGIN` — a host puts its own page origins before the
 * defaults there. The defaults (`DEFAULT_FRAME_ORIGINS`) are never a starting host.
 */
export function startingHost(env: Record<string, string | undefined> = process.env): string | null {
  const said = loopbackOrigin(env[HOST_ENV])
  if (said) return said
  for (const name of ['KEHIKOT_ORIGINS', 'KEHIKOT_ORIGIN']) {
    for (const word of (env[name] ?? '').split(/\s+/)) {
      const origin = loopbackOrigin(word)
      if (origin) return origin
    }
  }
  return null
}

/**
 * The hosts a module's server asks anything of (a place, a project, a pass, a service): the host
 * that started it and no other, when it said so (`KEHIKOT_HOST`) — so a scratch host an agent runs,
 * or a development page on a default port, is never asked by a module the person's host started.
 * Under a host older than 2.95.0, or nobody, the loopback `http(s)` origins of `frameOrigins`, in
 * order, as before.
 */
export function askedHosts(env: Record<string, string | undefined> = process.env): string[] {
  const started = loopbackOrigin(env[HOST_ENV])
  if (started) return [started]
  const out: string[] = []
  for (const origin of frameOrigins(env)) {
    const loopback = loopbackOrigin(origin)
    if (loopback) out.push(loopback)
  }
  return [...new Set(out)]
}

/** A door's URL on `host`: the host's own (`module` is `HOST_DOOR_MODULE`) or a module's stable one, with the place token when given. */
export function doorUrl(host: string, module: string, token?: string | null, path = '/mcp'): string {
  const origin = loopbackOrigin(host)
  if (!origin) throw new Error(`${host} is not a loopback origin`)
  if (module !== HOST_DOOR_MODULE && !MODULE_ID.test(module)) throw new Error(`${module} is not a module id`)
  const at = new URL(module === HOST_DOOR_MODULE ? `${origin}${safePath(path)}` : `${origin}${MODULE_PATH_PREFIX}${module}${safePath(path)}`)
  if (token) at.searchParams.set(PLACE_PARAM, token)
  return at.toString()
}

/** A door path: absolute, no `..`, no query; `/mcp` for anything else. */
function safePath(path: string): string {
  return /^\/[A-Za-z0-9._~/-]{0,200}$/.test(path) && !path.split('/').includes('..') ? path : '/mcp'
}

/** A door as a session is handed it. */
export interface HandedDoor {
  module: string
  name: string
  url: string
  transport: 'http' | 'sse'
}

/**
 * Which module a door URL names, and the path of the door at that module: from the stable
 * address (`/m/<id>[@<tag>]/<path>`, any origin) or, for `module` given, a module's own port
 * (`/<path>`). The host's own door is `/mcp` on an origin with no `/m/` path, and needs `module`
 * to be `HOST_DOOR_MODULE`. Null when the URL names neither.
 */
export function doorTarget(url: string, module?: string): { module: string; tag: string | null; path: string } | null {
  let at: URL
  try {
    at = new URL(url)
  } catch {
    return null
  }
  const stable = /^\/m\/([a-z0-9][a-z0-9.-]{1,62}[a-z0-9])(?:@([^/]{1,64}))?(\/.*)?$/.exec(at.pathname)
  if (stable) return { module: stable[1]!, tag: stable[2] ? decodeURIComponent(stable[2]) : null, path: stable[3] || '/mcp' }
  if (module === HOST_DOOR_MODULE) return { module, tag: null, path: at.pathname || '/mcp' }
  if (module && MODULE_ID.test(module)) return { module, tag: null, path: at.pathname || '/mcp' }
  return null
}

/**
 * A door rebuilt on the starting host: whatever address it came with (another host, a module's
 * own port, the stable one), it leaves as `doorUrl(host, module, token, path)`. Null for a door
 * that names no module this can place — dropped rather than written somewhere it might not answer.
 */
export function stableDoor<T extends HandedDoor>(door: T, host: string, token: string | null): T | null {
  const target = doorTarget(door.url, door.module || undefined)
  if (!target) return null
  if (door.module && door.module !== target.module) return null
  try {
    const module = target.tag ? `${target.module}@${encodeURIComponent(target.tag)}` : target.module
    const url = target.module === HOST_DOOR_MODULE ? doorUrl(host, HOST_DOOR_MODULE, token, target.path) : stableModuleUrl(host, module, token, target.path)
    return { ...door, module: target.module, url }
  } catch {
    return null
  }
}

function stableModuleUrl(host: string, moduleAndTag: string, token: string | null, path: string): string {
  const origin = loopbackOrigin(host)
  if (!origin) throw new Error(`${host} is not a loopback origin`)
  const at = new URL(`${origin}${MODULE_PATH_PREFIX}${moduleAndTag}${safePath(path)}`)
  if (token) at.searchParams.set(PLACE_PARAM, token)
  return at.toString()
}

/** Every door rebuilt on the starting host (`stableDoor`), the ones that name nothing dropped, the first of each name kept. */
export function stableDoors<T extends HandedDoor>(doors: readonly T[], host: string, token: string | null): T[] {
  const out: T[] = []
  const named = new Set<string>()
  for (const door of doors) {
    const rebuilt = stableDoor(door, host, token)
    if (!rebuilt || named.has(rebuilt.name)) continue
    named.add(rebuilt.name)
    out.push(rebuilt)
  }
  return out
}

/** Whether `url` is one of `host`'s stable doors: on that origin, at `/mcp` (the host's own) or under `/m/<id>/`. */
export function isStableDoor(url: string, host: string): boolean {
  const origin = loopbackOrigin(host)
  if (!origin) return false
  try {
    const at = new URL(url)
    if (at.origin !== origin) return false
    return at.pathname === '/mcp' || /^\/m\/[a-z0-9][a-z0-9.-]{1,62}[a-z0-9](?:@[^/]{1,64})?\/./.test(at.pathname)
  } catch {
    return false
  }
}

/**
 * The conformance check over a door config a module wrote, as JSON (`{ mcpServers: { name: { url } } }`,
 * Claude Code's and the shape most agents read) or as a list of `{ name, url }`: one sentence per entry
 * that is not a stable door of `host`. Empty is a pass. An entry with no URL (a local command) is not
 * a door and is not judged.
 */
export function doorConfigProblems(config: unknown, host: string): string[] {
  const entries: { name: string; url: string }[] = []
  if (Array.isArray(config)) {
    for (const one of config) if (one && typeof one === 'object' && typeof (one as { url?: unknown }).url === 'string') entries.push({ name: String((one as { name?: unknown }).name ?? '?'), url: (one as { url: string }).url })
  } else if (config && typeof config === 'object') {
    const servers = (config as { mcpServers?: unknown; mcp_servers?: unknown; mcp?: unknown }).mcpServers ?? (config as { mcp_servers?: unknown }).mcp_servers ?? (config as { mcp?: unknown }).mcp
    if (servers && typeof servers === 'object') {
      for (const [name, one] of Object.entries(servers as Record<string, unknown>)) {
        const url = one && typeof one === 'object' ? (one as { url?: unknown; serverUrl?: unknown }).url ?? (one as { serverUrl?: unknown }).serverUrl : undefined
        if (typeof url === 'string') entries.push({ name, url })
      }
    }
  }
  const problems: string[] = []
  for (const entry of entries) {
    if (isStableDoor(entry.url, host)) continue
    const target = doorTarget(entry.url)
    problems.push(
      target
        ? `${entry.name} names ${entry.url}, which is not on the host that started this module (${host}): a door goes on the starting host's stable address, ${host}/m/${target.module}/mcp.`
        : `${entry.name} names ${entry.url}, a raw address: a door goes on the starting host's stable address (${host}/mcp for the host, ${host}/m/<id>/mcp for a module), never a module's own port.`,
    )
  }
  return problems
}

/**
 * The name of a session's kept folder (its door config and other files kept while it may be woken):
 * `session-` and 24 hex characters of a hash of the starting host and the token, so the same token
 * under another host (a copy of the project opened by a scratch host) names another folder.
 * `null` host: a module nobody started; its folders are named as before 2.95.0 (`legacyKeptFolderName`).
 */
export function keptFolderName(token: string, host: string | null): string {
  if (!host) return legacyKeptFolderName(token)
  return `session-${createHash('sha256').update(`${host}\n${token}`).digest('hex').slice(0, 24)}`
}

/** The kept folder name before 2.95.0: the token alone. A session started then names it in its saved options. */
export function legacyKeptFolderName(token: string): string {
  return `session-${createHash('sha256').update(token).digest('hex').slice(0, 24)}`
}

/** The place token on a door URL, or null. */
export function tokenOnDoor(url: string): string | null {
  try {
    return new URL(url).searchParams.get(PLACE_PARAM)
  } catch {
    return null
  }
}
