import { type HoldingKind, type ProjectHoldings } from '../holdings.js';
/**
 * What every module in a project holds for its epics' parts, unioned per epic and part: every folder
 * directly under `.kehikot/` is asked for a `parts.json`, by name order, and no module is named. Never
 * throws and never writes; `{}` for no project. Junk costs the entry it is in; a file over
 * `LIMITS.HOLDINGS_BYTES`, one that is not a regular file, or one that resolves outside the project,
 * is skipped. Read with `own()`.
 */
export declare function readHoldings(projectPath: string | null | undefined): ProjectHoldings;
/**
 * Which kinds of holdings anybody has published for one epic (1.4.0): `documents` and `refs`, each
 * true when some module's `parts.json` says it spoke for that kind in this epic — also when what it
 * said was nothing (`published`, kept by `writeHoldings` even for an empty epic). False for both
 * means nobody has: a host may then fall back to whatever it did before parts. Same reading rules as
 * `readHoldings`; never throws.
 */
export declare function holdingsSpoken(projectPath: string | null | undefined, epic: string): Record<HoldingKind, boolean>;
/** What `writeHoldings` did. */
export interface HoldingsWritten {
    /** The module's `parts.json`. */
    file: string;
    /** Whether the file was written. False when it already said exactly this. */
    changed: boolean;
    /** What was given and could not be said: a document that is not under the project, a ref that is not one. As given. */
    dropped: string[];
}
/**
 * Publish what ONE module holds for ONE epic's parts: `holdings[<part id>] = { documents, refs }`,
 * replacing whatever the module's `parts.json` said for that epic and leaving every other epic, and
 * every key this does not know, as it was. `{}` takes the epic out. A document may be absolute or
 * project-relative; an absolute one must be under this project. Atomic (a temporary file, renamed).
 * Null when there is no project. Throws for an id that is not one, and for a `.kehikot` or a module
 * folder that resolves outside the project. Whatever has the file's name and is not a readable JSON
 * object is set aside as `parts.json.unreadable` (one, the latest), never read through or written over.
 */
export declare function writeHoldings(projectPath: string | null | undefined, moduleId: string, epic: string, holdings: Record<string, {
    documents?: readonly string[];
    refs?: readonly string[];
}>, options?: {
    published?: readonly HoldingKind[];
}): HoldingsWritten | null;
