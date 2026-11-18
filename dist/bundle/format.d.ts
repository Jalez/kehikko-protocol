/**
 * What a ready-built bundle says about itself (2.102.0): `bundle.json` at the root of the unpacked
 * archive. Design notes: docs/bundles.md.
 */
/** The file at a bundle's root that describes it. Never listed in its own `files`. */
export declare const BUNDLE_FILE = "bundle.json";
/** `format` in `bundle.json`. */
export declare const BUNDLE_FORMAT = "kehikot.bundle";
/** The version of the shape below. A host refuses one it does not know. */
export declare const BUNDLE_FORMAT_VERSION = 1;
/** The script a host runs, as it runs every module's (`run.sh`), written by `kehikot-bundle`. */
export declare const BUNDLE_RUN = "run.sh";
/** The platforms a bundle can name. A bundle with no native code names none: it runs anywhere Bun does. */
export declare const BUNDLE_PLATFORMS: readonly ["darwin-arm64", "darwin-x64", "linux-x64", "linux-arm64"];
export type BundlePlatform = (typeof BUNDLE_PLATFORMS)[number];
export interface BundleFile {
    sha256: string;
    size: number;
    executable?: boolean;
}
/** A package a bundle carries as files rather than inlined: native code, or one its module said cannot be inlined. */
export interface BundleNative {
    name: string;
    version: string;
    /** Why it is carried: `native` (it has a `.node` addon) or `declared` (the module's `kehikot.bundle.external`). */
    why: 'native' | 'declared';
}
export interface BundleInfo {
    format: typeof BUNDLE_FORMAT;
    formatVersion: typeof BUNDLE_FORMAT_VERSION;
    /** The module id, as its manifest says it. */
    id: string;
    /** package.json's version, the release's `vX.Y.Z` without the `v`. */
    version: string;
    /** The protocol package the module pins, `major.minor.patch`, or null when it pins none. */
    protocol: string | null;
    /** The commit it was built from: the stamp of its `dist/`, and what `commitOf` answers in a bundle. */
    commit: string;
    /** The script `run.sh` starts, relative: `serve.ts`, bundled in place. */
    entry: string;
    /** When it was built, ISO 8601. */
    builtAt: string;
    /** The Bun it was built with. */
    bun: string | null;
    /** Null when it runs on any platform; otherwise the only ones it has native code for. */
    platforms: BundlePlatform[] | null;
    /** Packages carried under `node_modules/`, each with why. Empty for most modules. */
    native: BundleNative[];
    /** Every other file of the bundle, by its relative path. */
    files: Record<string, BundleFile>;
}
/** The sha256 of `data`, lowercase hex. */
export declare function sha256(data: Uint8Array | string): string;
/**
 * `bundle.json` read back, or the sentence that says what is wrong with it. Pure: checks the shape
 * and nothing on disk.
 */
export declare function bundleInfoOf(value: unknown): {
    ok: true;
    info: BundleInfo;
} | {
    ok: false;
    why: string;
};
/** This process's platform as a bundle names one. */
export declare function platformHere(platform?: string, arch?: string): string;
/** Whether a bundle runs here: no platforms named, or this one among them. */
export declare function runsHere(info: Pick<BundleInfo, 'platforms'>, here?: string): boolean;
/** The checksum file published beside an archive: `<sha256>  <archive name>`, as `shasum -a 256` writes it. */
export declare function checksumLine(archive: Uint8Array, name: string): string;
/** The sha256 a checksum file says, or null when it says none. Takes `shasum`'s format and a bare hash. */
export declare function checksumOf(text: string): string | null;
/** The archive's name on a release: `<id>-<version>.tar.gz`. */
export declare function bundleArchiveName(id: string, version: string): string;
