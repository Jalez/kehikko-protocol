import { execFileSync } from 'node:child_process'

import { PACKAGE_VERSION, START_TOKEN, startTokenOf, type Build } from '../build.js'

/** The commit checked out in `dir`, or null: not a git checkout, no git, or git said no. */
export function commitOf(dir: string): string | null {
  try {
    const out = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      timeout: 2000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    return /^[0-9a-f]{7,64}$/.test(out) ? out : null
  } catch {
    return null
  }
}

/**
 * This process's build. Call it once, at module scope, so it is one identity for the life of the
 * process: `export const BUILD = establishBuild({ version: VERSION, dir: import.meta.dirname })`.
 *
 * Since 2.60.0 it carries `start`, the start token the host handed this process in
 * `KEHIKOT_START_TOKEN` (read from `env`, default `process.env`), when there is a well-formed one;
 * `start` in the options overrides it (null for none). The doors and `run` then say it in
 * `START_HEADER` on every answer, and the manifest carries it in `build`, so a host can tell the
 * process it started from anything else that answers on that port.
 */
export function establishBuild(options: {
  version: string
  dir?: string
  now?: Date
  commit?: string | null
  start?: string | null
  env?: Record<string, string | undefined>
}): Build {
  const start =
    options.start !== undefined
      ? options.start !== null && START_TOKEN.test(options.start)
        ? options.start
        : null
      : startTokenOf(options.env ?? process.env)
  return {
    version: options.version,
    commit: options.commit !== undefined ? options.commit : options.dir ? commitOf(options.dir) : null,
    started: (options.now ?? new Date()).toISOString(),
    protocol: PACKAGE_VERSION,
    ...(start ? { start } : {}),
  }
}
