import { type ProjectHoldings } from '../holdings.js';
/**
 * What every module in a project holds for its epics' parts, unioned per epic and part: every folder
 * directly under `.kehikot/` is asked for a `parts.json`, by name order, and no module is named. Never
 * throws and never writes; `{}` for no project. Junk costs the entry it is in; a file over
 * `LIMITS.HOLDINGS_BYTES`, or one that resolves outside the project, is skipped. Read with `own()`.
 */
export declare function readHoldings(projectPath: string | null | undefined): ProjectHoldings;
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
 * project-relative (`documentOf`). Atomic (a temporary file, renamed). Null when there is no project.
 * Throws for an id that is not one, and for a folder that resolves outside the project.
 */
export declare function writeHoldings(projectPath: string | null | undefined, moduleId: string, epic: string, holdings: Record<string, {
    documents?: readonly string[];
    refs?: readonly string[];
}>): HoldingsWritten | null;
