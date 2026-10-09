import { type Build } from '../build.js';
/** The commit checked out in `dir`, or null: not a git checkout, no git, or git said no. */
export declare function commitOf(dir: string): string | null;
/**
 * This process's build. Call it once, at module scope, so it is one identity for the life of the
 * process: `export const BUILD = establishBuild({ version: VERSION, dir: import.meta.dirname })`.
 */
export declare function establishBuild(options: {
    version: string;
    dir?: string;
    now?: Date;
    commit?: string | null;
}): Build;
