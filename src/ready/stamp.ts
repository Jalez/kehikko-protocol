import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { commitOf } from '../serve/build.js'

/**
 * Which commit a module's `dist/` was built from (2.17.0). Node-only. Design notes: docs/ready-built.md.
 *
 * The stamp is one file in `dist/` holding the commit on its first line, and nothing a shell cannot
 * read: a module's `run.sh` compares it with `git rev-parse HEAD` before it chooses the built server
 * over Vite, without starting a process to ask.
 *
 *     read -r built < dist/.kehikot-built && [ "$built" = "$(git rev-parse HEAD)" ]
 *
 * A build with no stamp is a build nobody vouches for: the stamp is taken off before a build starts
 * and written only after it succeeded, from a tree whose tracked files match `HEAD`.
 */

/** The stamp's file name, in `dist/`. A dot file, so it is never served as an asset. */
export const STAMP_FILE = '.kehikot-built'

/** The commit a `dist/` says it was built from, or null: no stamp, or not a commit on its first line. */
export function readStamp(dist: string): string | null {
  try {
    const first = readFileSync(join(dist, STAMP_FILE), 'utf8').split('\n')[0]?.trim() ?? ''
    return /^[0-9a-f]{7,64}$/.test(first) ? first : null
  } catch {
    return null
  }
}

/** Write the stamp: the commit, then when, for a person reading the file. */
export function writeStamp(dist: string, commit: string, now: Date = new Date()): string {
  const file = join(dist, STAMP_FILE)
  writeFileSync(file, `${commit}\nbuilt ${now.toISOString()}\n`, 'utf8')
  return file
}

/** Take the stamp off, before a build: a build that fails half way must not be vouched for by the last one's. */
export function clearStamp(dist: string): void {
  rmSync(join(dist, STAMP_FILE), { force: true })
}

/**
 * Whether the tracked files of the checkout in `dir` are what `HEAD` says, or null when git cannot
 * say. Untracked files do not count: a project's `.kehikot/` or a leftover log is not the module.
 */
export function cleanTree(dir: string): boolean | null {
  try {
    const out = execFileSync('git', ['-C', dir, 'status', '--porcelain', '--untracked-files=no'], {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return out.trim() === ''
  } catch {
    return null
  }
}

/** Whether a built copy may be served, and if not, the sentence that says why and what to run. */
export type Readiness = { ok: true; commit: string } | { ok: false; why: string }

const short = (commit: string) => commit.slice(0, 7)

/**
 * May the build in `dist` be served for the checkout in `dir`? Only when `dist/index.html` is there
 * and the stamp names `commit` — the checkout's `HEAD` unless given (a server passes the commit it
 * started at, so a rebuild for another commit while it runs is refused too, until it restarts).
 */
export function readiness(dir: string, dist: string = join(dir, 'dist'), commit: string | null = commitOf(dir)): Readiness {
  if (!existsSync(join(dist, 'index.html'))) {
    return { ok: false, why: `There is no built page in ${dist}. Run \`bun run build\` in ${dir}, then start it again.` }
  }
  const stamp = readStamp(dist)
  if (!stamp) {
    return {
      ok: false,
      why: `The build in ${dist} has no stamp, so nothing says which commit it is: it failed, it is older than stamps, or it was built from a checkout with changes. Run \`bun run build\` in ${dir} from a clean checkout.`,
    }
  }
  if (!commit) {
    return { ok: false, why: `${dir} is not a git checkout, so nothing can say whether the build in ${dist} is its code.` }
  }
  if (stamp !== commit) {
    return {
      ok: false,
      why: `The build in ${dist} is of ${short(stamp)}, and this checkout is at ${short(commit)}: it is stale. Run \`bun run build\` in ${dir}, then start it again.`,
    }
  }
  return { ok: true, commit }
}
