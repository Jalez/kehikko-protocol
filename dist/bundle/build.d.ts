import { type BundleInfo } from './format.js';
/**
 * Build a module's ready-built bundle from its checkout (2.102.0): `kehikot-bundle build`. Bun only
 * (it calls `Bun.build`). Design notes: docs/bundles.md.
 *
 * What goes in, and why each rule:
 *
 *  - **The server, bundled in place.** `serve.ts` is bundled with every JS dependency inlined and
 *    written back as `serve.ts`, so a host starts it with `bun serve.ts` and no `node_modules`.
 *  - **Every other script that is run by path, bundled in place too**: a tracked script the server
 *    does not import (a CLI in `bin/`, a hook), and one it does import whose file name another file
 *    spells (it is run by path as well). One that imports nothing is copied as it is.
 *  - **Files the server reads at run time, copied**: every tracked file outside what only a
 *    developer uses (`test/`, `dev/`, the page's `src/`, configs, the lockfile).
 *  - **The built page**, `dist/` as `bun run build` stamped it. A build that is not of this commit,
 *    or of a tree with changes, is refused: a bundle says which commit it is, and has to be it.
 *  - **Native code, carried as files**: a dependency with a `.node` addon cannot be inlined, so it is
 *    left external and copied under `node_modules/` with the prebuilt binaries of the platforms it
 *    has them for, which the bundle then names (`platforms`). So is a package the module lists in
 *    `kehikot.bundle.external` (package.json) because it reads its own files at run time. Which
 *    packages those are is decided by what the server's (and each script's) imports reach, in bun
 *    build's own graph — never by walking package.json's `dependencies`, which also lists what only
 *    the page uses (a PDF reader with native optionals) and would fail or fatten a bundle for it.
 *
 * `import.meta.dirname` (and `dir`, `url`, `path`, `filename`) in a file below the entry's folder is
 * rewritten to the folder that file sat in, so `join(import.meta.dirname, '..', 'notes')` still
 * finds `notes/` once everything is one file at the root.
 */
/** What a module may say about its bundle, in package.json's `kehikot.bundle`. */
export interface BundleConfig {
    /** More scripts to bundle in place, relative to the module. */
    entries?: string[];
    /** Packages to carry as files instead of inlining (they read their own files at run time). */
    external?: string[];
    /** Tracked paths (a file, or a folder ending in `/`) to leave out on top of the defaults. */
    exclude?: string[];
    /** Paths the defaults leave out that this module needs at run time. */
    include?: string[];
    /** `false` (with `why`) keeps the module on the git path: no bundle is made. */
    enabled?: boolean;
    why?: string;
}
export interface BuildBundleOptions {
    /** The module's checkout, built (`bun run build`) and with its dependencies installed. */
    dir: string;
    /** Where the archive and its `.sha256` are written. Default `<dir>/bundle-out`. */
    out?: string;
    /** The script the server starts from. Default `serve.ts`. */
    entry?: string;
    /** The file that exports the manifest. Default `manifest.ts`. */
    manifest?: string;
    /** Build from a tree with changes (a test); the bundle still names `HEAD`, so never for a release. */
    allowChanges?: boolean;
    log?: (line: string) => void;
    /** Default now. */
    now?: Date;
}
export type BundleBuilt = {
    ok: true;
    archive: string;
    checksum: string;
    sha256: string;
    info: BundleInfo;
    bytes: number;
    files: number;
} | {
    ok: false;
    why: string;
    skipped?: boolean;
};
/** The first protocol whose `run` serves a bundle's page (it reads the commit from `bundle.json`). */
export declare const BUNDLES_SINCE = "2.102.0";
/** Whether a tracked path is part of the running module, by the defaults and the module's own `exclude`/`include`. */
export declare function keptByDefault(path: string, config?: BundleConfig): boolean;
/** package.json's `kehikot.bundle`, or `{}`. */
export declare function bundleConfigOf(pkg: unknown): BundleConfig;
/** The protocol version a package.json pins (`#vX.Y.Z` or a range), or null. */
export declare function pinnedProtocol(pkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}): string | null;
/** A source without its comments and its import, export-from and require lines: what is left spells a file only to use it by path. */
export declare function spokenOf(source: string): string;
/** The package a bare import names (`@scope/name` or `name`, without a sub-path), or null for a relative, absolute or runtime import. */
export declare function packageNameOf(specifier: string): string | null;
/** The `run.sh` a bundle carries: no install, no build, no git — the entry, with the Bun the host puts first on PATH. */
export declare function bundleRunScript(info: Pick<BundleInfo, 'id' | 'version' | 'commit' | 'entry'>): string;
/**
 * Build the bundle of the module in `options.dir`: `<id>-<version>.tar.gz` and its `.sha256` in
 * `out`. Never throws for a module that cannot be bundled: the answer says why (and `skipped` when
 * the module said `kehikot.bundle.enabled: false`).
 */
export declare function buildBundle(options: BuildBundleOptions): Promise<BundleBuilt>;
