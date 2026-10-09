import { execFileSync } from 'node:child_process'

import { PACKAGE_VERSION, type Build } from '../build.js'

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
 */
export function establishBuild(options: { version: string; dir?: string; now?: Date; commit?: string | null }): Build {
  return {
    version: options.version,
    commit: options.commit !== undefined ? options.commit : options.dir ? commitOf(options.dir) : null,
    started: (options.now ?? new Date()).toISOString(),
    protocol: PACKAGE_VERSION,
  }
}
