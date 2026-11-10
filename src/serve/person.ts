import { realpathSync } from 'node:fs'
import { basename, delimiter, join } from 'node:path'

import { START_TOKEN_ENV } from '../build.js'

/**
 * The variable a host names, joined by the path delimiter, the folders it put first on a module's
 * `PATH` for the module's own process (a `bun` that is the host itself, say). `personEnv` takes
 * them out again.
 */
export const HOST_PATH_ENV = 'KEHIKOT_HOST_PATH'

/** What makes a compiled host answer as Bun. Meant for the module's process, never the person's. */
const BE_BUN = 'BUN_BE_BUN'

/** Folders a runtime makes to hold a `bun` or `node` that is itself: Bun's own and a host's. */
const SHIM_FOLDER = /^(bun-node-|kehikot-bun-)/

/** A runtime that is plainly Bun or Node, and not a program compiled with one inside. */
const PLAIN_RUNTIME = /^(bun|node)(\.exe)?$/i

function real(file: string): string | null {
  try {
    return realpathSync(file)
  } catch {
    return null
  }
}

function pathKey(env: Record<string, string | undefined>): string {
  return Object.keys(env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH'
}

export interface PersonEnvOptions {
  /** The module's own runtime. `process.execPath` when not given. */
  execPath?: string
  /** The platform the program runs on, for its UTF-8 locale. `process.platform` when not given. */
  platform?: NodeJS.Platform
}

/**
 * 2.75.0. The locale a person's program is given when nothing names one: a host started by the
 * desktop (launchd on macOS) has no `LANG`, and a program started without a locale reads and writes
 * text in the C locale's encoding. macOS's `pbcopy` then takes UTF-8 as Mac Roman — an em dash an
 * agent's terminal copies arrives as "‚Äî". `LC_CTYPE` alone (the encoding, not the language): `UTF-8`
 * on macOS, `C.UTF-8` elsewhere.
 */
export const utf8Locale = (platform: NodeJS.Platform = process.platform): string => (platform === 'darwin' ? 'UTF-8' : 'C.UTF-8')


/**
 * The environment for a program a module starts on the person's behalf: a session, a shell, a
 * command they typed. `env` (this process's when not given) without what the host gave the module
 * for its own use:
 *
 * - the folders named in `KEHIKOT_HOST_PATH` are taken off `PATH` (one occurrence each, the first,
 *   so the same folder the person has further along stays);
 * - a folder on `PATH` whose `bun` or `node` is this process's own runtime goes too, when that
 *   runtime is a compiled host rather than Bun or Node, and so does a `bun-node-*` or
 *   `kehikot-bun-*` folder whose `bun` or `node` is this runtime, whatever it is;
 * - `BUN_BE_BUN` and `KEHIKOT_HOST_PATH` are dropped, and so is `KEHIKOT_START_TOKEN` (2.60.0): it
 *   names the module's process, and a module the person starts from a shell here is another one.
 *
 * - (2.75.0) when none of `LC_ALL`, `LC_CTYPE` and `LANG` names a locale, `LC_CTYPE` is set to UTF-8
 *   (`utf8Locale`), so what the program copies, pastes and prints is UTF-8, as in the person's terminal.
 *
 * Everything else is kept as it was. Unset values are left out.
 */
export function personEnv(
  env: Record<string, string | undefined> = process.env,
  options: PersonEnvOptions = {},
): Record<string, string> {
  const own = real(options.execPath ?? process.execPath)
  const compiled = !PLAIN_RUNTIME.test(basename(options.execPath ?? process.execPath))
  const key = pathKey(env)
  const named = (env[HOST_PATH_ENV] ?? '').split(delimiter).filter(Boolean)

  const isOwn = (dir: string) => own !== null && (real(join(dir, 'bun')) === own || real(join(dir, 'node')) === own)
  const dropped = new Set<string>()
  const kept: string[] = []
  for (const dir of (env[key] ?? '').split(delimiter)) {
    if (named.includes(dir) && !dropped.has(dir)) {
      dropped.add(dir)
      continue
    }
    if (dir && (compiled || SHIM_FOLDER.test(basename(dir))) && isOwn(dir)) continue
    kept.push(dir)
  }

  const out: Record<string, string> = {}
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined || name === BE_BUN || name === HOST_PATH_ENV || name === START_TOKEN_ENV) continue
    out[name] = name === key ? kept.join(delimiter) : value
  }
  if (!out.LC_ALL && !out.LC_CTYPE && !out.LANG) out.LC_CTYPE = utf8Locale(options.platform)
  return out
}
