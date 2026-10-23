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
export declare const STAMP_FILE = ".kehikot-built";
/** The commit a `dist/` says it was built from, or null: no stamp, or not a commit on its first line. */
export declare function readStamp(dist: string): string | null;
/** Write the stamp: the commit, then when, for a person reading the file. */
export declare function writeStamp(dist: string, commit: string, now?: Date): string;
/** Take the stamp off, before a build: a build that fails half way must not be vouched for by the last one's. */
export declare function clearStamp(dist: string): void;
/**
 * Whether the tracked files of the checkout in `dir` are what `HEAD` says, or null when git cannot
 * say. Untracked files do not count: a project's `.kehikot/` or a leftover log is not the module.
 */
export declare function cleanTree(dir: string): boolean | null;
/** Whether a built copy may be served, and if not, the sentence that says why and what to run. */
export type Readiness = {
    ok: true;
    commit: string;
} | {
    ok: false;
    why: string;
};
/**
 * May the build in `dist` be served for the checkout in `dir`? Only when `dist/index.html` is there
 * and the stamp names `commit` — the checkout's `HEAD` unless given (a server passes the commit it
 * started at, so a rebuild for another commit while it runs is refused too, until it restarts).
 */
export declare function readiness(dir: string, dist?: string, commit?: string | null): Readiness;
