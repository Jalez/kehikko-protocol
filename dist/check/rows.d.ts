/**
 * 2.70.0. `kehikot-check-rows [--file <rows>] [--warn] [<module dir> …]`: `rowsAdvice` over the rows a
 * module declares, in CI, where the console of a running page is not read. A page builds its header
 * and footer at run time, so the module states them for the check: `kehikot.rows.json` beside its
 * manifest, or a module whose `rows` (or default) export is the same thing or a function returning it.
 * Each is one state (`{ header, footer }`) or a list of them (`[{ name, header, footer, state }]`): a
 * view each, a busy moment, an empty one. Any advice fails the check, unless `--warn`. Node-only.
 * Design notes: docs/footer.md, "What goes in the header, and what in the footer".
 */
/** The file the check reads when it is not told another. */
export declare const ROWS_FILE = "kehikot.rows.json";
/** One moment of a module's rows. `state`: the module has live state worth knowing then. */
export interface RowsState {
    name?: string;
    header?: unknown;
    footer?: unknown;
    state?: boolean;
}
export interface RowsCheck {
    /** What was read: a file, or null when the module states no rows. */
    read: string | null;
    /** Advice, as failures: each sentence, with the state it was said of. */
    failures: string[];
    notes: string[];
}
/** The states in what a rows file holds: one state, a list of them, or nothing. Pure. */
export declare function rowsStatesOf(value: unknown): RowsState[];
/** The advice over each state, as failures. Pure. */
export declare function checkRowsStates(states: readonly RowsState[], read: string | null): RowsCheck;
/** Read a module's rows and check them. */
export declare function checkModuleRows(dir: string, options?: {
    file?: string;
}): Promise<RowsCheck>;
/** What the check prints. */
export declare function saidRows(check: RowsCheck, warnOnly?: boolean): string;
