import { type UninstallItem, type UninstallLeft, type UninstallReport } from '../uninstall.js';
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
    removed?: UninstallItem[];
    left?: UninstallLeft[];
}
export type UninstallStep = () => UninstallOutcome | void | Promise<UninstallOutcome | void>;
/** Run every step, print the report's line, and return the report. Never throws; exits nothing. */
export declare function runUninstall(steps: readonly UninstallStep[], print?: (line: string) => void): Promise<UninstallReport>;
/**
 * Remove a file or folder that is this module's alone (a folder it made in the temporary directory,
 * a file of its own beside the registry), and its parent when that is left empty and `parentToo`.
 * Absent is nothing to say. A failure is `left`, with the reason.
 */
export declare function removeOwned(path: string, what: string, options?: {
    parentToo?: string;
}): UninstallOutcome;
