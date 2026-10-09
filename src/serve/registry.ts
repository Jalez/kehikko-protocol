import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { canonicalName, legacyName } from '../dialect.js'
import { MODULE_ID } from '../ids.js'

/**
 * The one directory a host sweeps for registrations: `KEHIKOT_MODULES_DIR` (else
 * `ROADMAP_MODULES_DIR`) when set; `~/Library/Application Support/Kehikot/modules` on macOS;
 * `$XDG_DATA_HOME/kehikot/modules` (default `~/.local/share/kehikot/modules`) elsewhere.
 */
export function registryDir(env: Record<string, string | undefined> = process.env): string {
  const said = env.KEHIKOT_MODULES_DIR || env.ROADMAP_MODULES_DIR
  if (said) return said
  const home = env.HOME || homedir()
  if (process.platform === 'darwin') return join(home, 'Library', 'Application Support', 'Kehikot', 'modules')
  return join(env.XDG_DATA_HOME || join(home, '.local', 'share'), 'kehikot', 'modules')
}

/**
 * The registry before the rename, `~/.roadmap/modules` — READ, never written, so what a module
 * wrote there (`keep`, above all) is carried over. `null` when the registry was pointed somewhere
 * on purpose, so a test never reads a person's real one.
 */
export function legacyRegistryDir(env: Record<string, string | undefined> = process.env): string | null {
  if (env.KEHIKOT_MODULES_DIR || env.ROADMAP_MODULES_DIR) return null
  return join(env.HOME || homedir(), '.roadmap', 'modules')
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
  /* What this module said last time: under this id or its pre-rename one (`roadmap.x`), here or
     in the old `~/.roadmap/modules`. Only read — the older files are left exactly as they are. */
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

/* This module's file, then the files that are the same module under its
   pre-rename id, nearest first. See `registerAt`. */
function earlierFiles(id: string, where: string, file: string): string[] {
  const files = [file]
  const old = legacyName(id)
  if (old !== id) files.push(join(where, `${old}.json`))
  const legacy = legacyRegistryDir()
  if (legacy && legacy !== where) {
    files.push(join(legacy, `${id}.json`))
    if (old !== id) files.push(join(legacy, `${old}.json`))
  }
  return files
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
  /* And the pre-rename registry too, when this is the real one: a claim stated there is just as
     much a claim. */
  const legacy = where === registryDir() ? legacyRegistryDir() : null
  const ports = new Set<number>()
  for (const dir of legacy && legacy !== where ? [where, legacy] : [where]) {
    let names: string[]
    try {
      names = readdirSync(dir)
    } catch {
      /* No registry directory yet. The first module on a clean machine is not an error. */
      continue
    }
    for (const name of names) {
      if (!name.endsWith('.json')) continue
      const id = name.slice(0, -'.json'.length)
      /* Compared canonically: `roadmap.x.json` is this same module under its
         pre-rename id, and its port is our own, not a neighbour's. */
      if (canonicalName(id) === canonicalName(selfId) || !MODULE_ID.test(id)) continue
      const registration = readRegistration(join(dir, name))
      if (!registration) continue
      const port = portOf(registration.url)
      if (port !== null) ports.add(port)
    }
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
