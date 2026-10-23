import { type PageOptions } from '../serve/page.js';
export { STAMP_FILE, cleanTree, clearStamp, readStamp, readiness, writeStamp, type Readiness } from './stamp.js';
/**
 * A module's page built ahead of time (2.17.0), served by `run` from `/run`. Node or Bun; it does
 * not depend on Vite and never imports it at module scope: the Vite it builds with is the module's
 * own, found from the module's folder. Design notes: docs/ready-built.md.
 *
 *     // build.ts
 *     import { buildModule } from 'kehikot-module-protocol/build'
 *     await buildModule({ dir: import.meta.dirname, page: { title: 'Terminal' } })
 */
/** The part of Vite this calls. Vite's own `build` is a superset. */
export interface ViteLike {
    build(config: {
        root: string;
        mode?: string;
        logLevel?: 'info' | 'warn' | 'error' | 'silent';
        build?: {
            outDir?: string;
            emptyOutDir?: boolean;
        };
    }): Promise<unknown>;
}
export interface BuildModuleOptions {
    /** The module's checkout: Vite's root, where `vite.config.ts` is and where the stamp's commit is read. */
    dir: string;
    /**
     * The document to build from, when the module has no `index.html` of its own: what `pageDocument`
     * takes, without a ticket, a build or origins — `run` puts those in per request (`fillPage`).
     * It is written to `<dir>/index.html` for the build and taken away after, so there is one shell.
     * `null` (the default) is "the module has its own `index.html`".
     */
    page?: Omit<PageOptions, 'ticket' | 'build' | 'origins'> | null;
    /** Default `dist`, under `dir`. */
    outDir?: string;
    /** The Vite to build with. Default: the module's own, resolved from `dir`. */
    vite?: ViteLike;
    /** Default Vite's `info`. */
    logLevel?: 'info' | 'warn' | 'error' | 'silent';
    /** Where a sentence about the stamp goes. Default `console.log`. */
    log?: (line: string) => void;
}
export interface ModuleBuilt {
    dist: string;
    /** The commit the build was made from, or null when `dir` is not a git checkout. */
    commit: string | null;
    /** Whether the build was stamped, so `run` will serve it. */
    stamped: boolean;
    /** Why not, when it was not. */
    why: string | null;
}
/**
 * Build the page into `dist/` and stamp it with the commit, or leave it unstamped and say why.
 *
 * The stamp is taken off first and written last, so a build that fails — or is killed — leaves a
 * `dist/` that `run` refuses and a `run.sh` falls back from. A checkout whose tracked files differ
 * from `HEAD` is built and NOT stamped: the commit would be a lie about what was compiled. A failed
 * Vite build throws, as Vite does.
 */
export declare function buildModule(options: BuildModuleOptions): Promise<ModuleBuilt>;
