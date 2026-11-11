import { statSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'

import type { GuardCheckout } from '../guards.js'

/**
 * 2.78.0. The kind of git checkout a file is in, for an `edit` guard's `match.checkouts`
 * (`editDecision`'s `facts.checkout`): the nearest `.git` at or above the file's folder decides —
 * a directory is a repository's `main` checkout, a file is a `linked` worktree (or a submodule, which
 * is not the main checkout either), none is null. The file need not exist yet (a Write makes it): the
 * walk starts at the nearest folder that does. A relative path is resolved against `cwd`.
 */
export function checkoutOf(path: string, cwd: string = process.cwd()): GuardCheckout | 'linked' | null {
  if (typeof path !== 'string' || !path) return null
  let dir = isAbsolute(path) ? path : resolve(cwd, path)
  for (let steps = 0; steps < 256; steps++) {
    try {
      const dot = statSync(`${dir === '/' ? '' : dir}/.git`, { throwIfNoEntry: false })
      if (dot?.isDirectory()) return 'main'
      if (dot?.isFile()) return 'linked'
    } catch {
      /* unreadable: keep walking up */
    }
    const up = dirname(dir)
    if (up === dir) return null
    dir = up
  }
  return null
}
