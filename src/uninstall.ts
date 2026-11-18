import { z } from 'zod'

import { LIMITS } from './limits.js'

/**
 * A module's own clean-up when a person uninstalls it (2.108.0). Shapes only; the running is
 * `runUninstall` in `/serve`. Design notes: docs/uninstall.md.
 *
 * Uninstall in a host deletes everything the HOST put on the computer for a module: its installed
 * copy, its registration, its logs, its rows in the host's database. What the MODULE itself put
 * somewhere — an entry in an agent's settings, skills it copied into an agent's folder, a file of
 * its own beside the module registry, session folders in the temporary directory — only the module
 * knows, and a host never edits an agent's configuration for it. So a module that writes anything
 * outside its own folder and outside projects ships `UNINSTALL_SCRIPT` at its root, and the host
 * runs it on Uninstall:
 *
 *  - after the module is stopped, before its folder is deleted;
 *  - as `bun uninstall.ts`, with the module's folder as the working directory, and the environment
 *    the host starts the module with (its `KEHIKOT_*` locations, `HOME`);
 *  - for at most `LIMITS.UNINSTALL_MS`, after which it is stopped and what it did not say is not known.
 *
 * It removes only what this module wrote — never a person's entry beside it, never a file a person
 * changed (that is `left`, with why), never anything under a project (`<project>/.kehikot/…` is the
 * person's work; a host offers to remove that separately). It may run twice, or after a partial
 * run: what is already gone is not an error. It prints ONE line, `UNINSTALL_MARK` and the report as
 * JSON (`uninstallReportSchema`), and exits 0 even when something was left.
 *
 * A module with no such script writes nothing outside its folder, or is older than 2.108.0; a host
 * then removes only what it can prove the module owns and says the rest.
 */

/** The file at a module's root that a host runs on Uninstall. Always carried in a ready-built bundle. */
export const UNINSTALL_SCRIPT = 'uninstall.ts'

/** What the report's line starts with on stdout. Anything else the script prints is ignored. */
export const UNINSTALL_MARK = 'kehikot-uninstall '

const what = z.string().trim().min(1).max(LIMITS.REASON)
const where = z.string().min(1).max(LIMITS.PATH)

/** One thing removed: what it was, in words a person reads ("Its SessionStart hook"), and where. */
export const uninstallItemSchema = z.object({ what, path: where.optional() })
export type UninstallItem = z.infer<typeof uninstallItemSchema>

/** One thing left in place: what, where, and why ("you changed it", "it could not be read"). */
export const uninstallLeftSchema = z.object({ what, path: where.optional(), why: what })
export type UninstallLeft = z.infer<typeof uninstallLeftSchema>

/** What a module's clean-up did. Extra items past `LIMITS.UNINSTALL_ITEMS` are cut, never refused. */
export const uninstallReportSchema = z.object({
  removed: z.array(uninstallItemSchema).default([]).transform((items) => items.slice(0, LIMITS.UNINSTALL_ITEMS)),
  left: z.array(uninstallLeftSchema).default([]).transform((items) => items.slice(0, LIMITS.UNINSTALL_ITEMS)),
})
export type UninstallReport = z.infer<typeof uninstallReportSchema>
export type UninstallReportInput = z.input<typeof uninstallReportSchema>

/** The line a clean-up prints. */
export function uninstallLine(report: UninstallReportInput): string {
  return `${UNINSTALL_MARK}${JSON.stringify(uninstallReportSchema.parse(report))}`
}

/** The report in a clean-up's output: the last marked line that parses, or null when there is none. Pure. */
export function readUninstallReport(output: string): UninstallReport | null {
  const lines = output.split(/\r?\n/).filter((line) => line.startsWith(UNINSTALL_MARK)).reverse()
  for (const line of lines) {
    try {
      const read = uninstallReportSchema.safeParse(JSON.parse(line.slice(UNINSTALL_MARK.length)))
      if (read.success) return read.data
    } catch {
      /* Not JSON: an earlier line may be. */
    }
  }
  return null
}
