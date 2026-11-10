import { type Build } from '../build.js';
/** The commit checked out in `dir`, or null: not a git checkout, no git, or git said no. */
export declare function commitOf(dir: string): string | null;
/**
 * This process's build. Call it once, at module scope, so it is one identity for the life of the
 * process: `export const BUILD = establishBuild({ version: VERSION, dir: import.meta.dirname })`.
 *
 * Since 2.60.0 it carries `start`, the start token the host handed this process in
 * `KEHIKOT_START_TOKEN` (read from `env`, default `process.env`), when there is a well-formed one;
 * `start` in the options overrides it (null for none). The doors and `run` then say it in
 * `START_HEADER` on every answer, and the manifest carries it in `build`, so a host can tell the
 * process it started from anything else that answers on that port.
 */
export declare function establishBuild(options: {
    version: string;
    dir?: string;
    now?: Date;
    commit?: string | null;
    start?: string | null;
    env?: Record<string, string | undefined>;
}): Build;
