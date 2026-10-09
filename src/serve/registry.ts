import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { ID_PREFIX_BEFORE_RENAME, MODULE_ID, canonicalModuleId } from '../ids.js'

/**
 * The one directory a host sweeps for registrations: `KEHIKOT_MODULES_DIR` when set;
 * `~/Library/Application Support/Kehikot/modules` on macOS; `$XDG_DATA_HOME/kehikot/modules`
 * (default `~/.local/share/kehikot/modules`) elsewhere.
 */
export function registryDir(env: Record<string, string | undefined> = process.env): string {
  const said = env.KEHIKOT_MODULES_DIR
  if (said) return said
  const home = env.HOME || homedir()
  if (process.platform === 'darwin') return join(home, 'Library', 'Application Support', 'Kehikot', 'modules')
  return join(env.XDG_DATA_HOME || join(home, '.local', 'share'), 'kehikot', 'modules')
}

/**
 * The file name a module's registration had before the app was renamed (`roadmap.<name>.json`), or
 * `null` for an id that never had one. READ, never written: a registry that was carried over from
 * `~/.roadmap/modules` may still hold one, and what it says (`keep`, above all) is this module's.
 */
export function registrationBeforeRename(id: string): string | null {
  return id.startsWith('kehikot.') ? `${ID_PREFIX_BEFORE_RENAME}${id.slice('kehikot.'.length)}.json` : null
}

/** What one registration says. The host reads `url`, `dir`, and a `keep` this never writes. */
export interface Registration {
  url: string
  dir: string
}

export interface Registered extends Registration {
  id: string
  /** The file that now says so. Printed, because a person who wants this undone deletes it. */
  file: string
  /** What the file said before, when it said something different. `null` when it agreed or was absent. */
  was: Registration | null
}

/**
 * Say where this module answers: write `<id>.json` with `url` and `dir`, the directory a host runs
 * `run.sh` in. Throws when `id` is not a module id. Merged, not replaced: other keys (`keep`)
 * survive. Whoever starts last wins; `was` carries what the file said before, when it differed.
 */
export function registerAt({ id, origin, dir }: { id: string; origin: string; dir: string }): Registered {
  /* Refused here rather than joined: a filename derived from an id is a PATH BUILT FROM DATA. */
  if (!MODULE_ID.test(id)) throw new Error(`"${id}" is not a module id, so there is no registration file to write`)

  const where = registryDir()
  const file = join(where, `${id}.json`)
  /* What this module said last time: under this id, or in the file it had before the rename
     (`roadmap.x.json`) beside it. Only read — the older file is left exactly as it is. */
  const earlier = earlierFiles(id, where, file)
  const before = earlier.map(readRegistration).find((r) => r !== null) ?? null

  /* Everything already in the file that this function does not manage, `keep: true` above all.
     This owns exactly `url` and `dir`, so the file is merged, not replaced. */
  const kept = earlier.map(readAll).find((all) => Object.keys(all).length > 0) ?? {}

  mkdirSync(where, { recursive: true })
  writeFileSync(file, `${JSON.stringify({ ...kept, url: origin, dir }, null, 2)}\n`)

  const was = before && (before.url !== origin || before.dir !== dir) ? before : null
  return { id, url: origin, dir, file, was }
}

/* This module's file, then the one it had before the rename, in the same directory. See `registerAt`. */
function earlierFiles(id: string, where: string, file: string): string[] {
  const old = registrationBeforeRename(id)
  return old ? [file, join(where, old)] : [file]
}

/**
 * The whole registration object as it stands on disk, unnarrowed, so it can be written back
 * without losing keys this package does not know. `{}` for anything unreadable.
 */
function readAll(file: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  return parsed as Record<string, unknown>
}

/** One registration file, or `null` for anything that is not one. Never throws. */
export function readRegistration(file: string): Registration | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const { url, dir } = parsed as { url?: unknown; dir?: unknown }
  if (typeof url !== 'string') return null
  /* `dir` is optional in the host's reading of this file; its absence must not turn a real
     registration into a `null` one. */
  return { url, dir: typeof dir === 'string' ? dir : '' }
}

/**
 * The ports the OTHER registered modules have claimed. Read before drifting: a neighbour's stated
 * port is treated as occupied even when nothing is listening on it.
 */
export function neighbourPorts(selfId: string, where = registryDir()): Set<number> {
  const ports = new Set<number>()
  let names: string[]
  try {
    names = readdirSync(where)
  } catch {
    /* No registry directory yet. The first module on a clean machine is not an error. */
    return ports
  }
  for (const name of names) {
    if (!name.endsWith('.json')) continue
    const id = name.slice(0, -'.json'.length)
    /* Compared canonically: a `roadmap.x.json` left from before the rename is this same module,
       and its port is our own, not a neighbour's. */
    if (canonicalModuleId(id) === canonicalModuleId(selfId) || !MODULE_ID.test(id)) continue
    const registration = readRegistration(join(where, name))
    if (!registration) continue
    const port = portOf(registration.url)
    if (port !== null) ports.add(port)
  }
  return ports
}

/** The port in an origin, or `null` for anything this cannot read. Pure. */
export function portOf(origin: string): number | null {
  try {
    const port = new URL(origin).port
    return port ? Number(port) : null
  } catch {
    return null
  }
}
