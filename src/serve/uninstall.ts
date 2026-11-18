import { existsSync, readdirSync, rmSync, rmdirSync } from 'node:fs'

import { uninstallLine, uninstallReportSchema, type UninstallItem, type UninstallLeft, type UninstallReport } from '../uninstall.js'

/**
 * Running a module's own clean-up (2.108.0, `UNINSTALL_SCRIPT`). A module's `uninstall.ts` is a list
 * of steps handed to `runUninstall`, which runs each one, keeps going past one that throws (said as
 * `left`), and prints the one line a host reads:
 *
 *     // uninstall.ts
 *     import { runUninstall, removeOwned } from 'kehikot-module-protocol/serve'
 *     await runUninstall([
 *       () => removeHookEntry(),                          // returns { removed, left }
 *       () => removeOwned(sessionsDir(), 'Its session folders'),
 *     ])
 *
 * Design notes: docs/uninstall.md.
 */

/** What one step did. Either list may be absent. */
export interface UninstallOutcome {
  removed?: UninstallItem[]
  left?: UninstallLeft[]
}

export type UninstallStep = () => UninstallOutcome | void | Promise<UninstallOutcome | void>

/** Run every step, print the report's line, and return the report. Never throws; exits nothing. */
export async function runUninstall(steps: readonly UninstallStep[], print: (line: string) => void = (line) => console.log(line)): Promise<UninstallReport> {
  const removed: UninstallItem[] = []
  const left: UninstallLeft[] = []
  for (const [index, step] of steps.entries()) {
    try {
      const out = await step()
      if (out?.removed) removed.push(...out.removed)
      if (out?.left) left.push(...out.left)
    } catch (error) {
      left.push({ what: `Step ${index + 1} of the clean-up`, why: (error instanceof Error ? error.message : String(error)).slice(0, 300) || 'it failed without saying why' })
    }
  }
  const report = uninstallReportSchema.parse({ removed, left })
  print(uninstallLine(report))
  return report
}

/**
 * Remove a file or folder that is this module's alone (a folder it made in the temporary directory,
 * a file of its own beside the registry), and its parent when that is left empty and `parentToo`.
 * Absent is nothing to say. A failure is `left`, with the reason.
 */
export function removeOwned(path: string, what: string, options: { parentToo?: string } = {}): UninstallOutcome {
  if (!existsSync(path)) return {}
  try {
    rmSync(path, { recursive: true, force: true })
  } catch (error) {
    return { left: [{ what, path, why: (error as Error).message.slice(0, 300) }] }
  }
  const parent = options.parentToo
  if (parent && existsSync(parent)) {
    try {
      if (readdirSync(parent).length === 0) rmdirSync(parent)
    } catch {
      /* Not empty, or not ours to remove: left. */
    }
  }
  return { removed: [{ what, path }] }
}
