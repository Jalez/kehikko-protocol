import { type BundleInfo } from './format.js';
import { type TarFile, type TarLimits } from './tar.js';
/**
 * A bundle checked and unpacked (2.102.0). Node or Bun. Design notes: docs/bundles.md.
 *
 * Everything is checked BEFORE a byte is written: the archive's sha256 against the one published
 * beside it, every entry's path and type (`readTarGz`), `bundle.json`'s shape, that it is the module
 * and version that was asked for, that it runs on this platform, and that the archive holds exactly
 * the files `bundle.json` lists, each with its sha256 and size. Then it is written into a folder that
 * did not exist, and nowhere else.
 */
export interface UnpackExpect {
    /** The sha256 the release published beside the archive. Required: an archive nobody vouched for is not unpacked. */
    sha256: string;
    /** The module it must be. */
    id?: string;
    /** The version it must be. */
    version?: string;
    /** This machine, as `platformHere` says it. */
    platform?: string;
}
export type Unpacked = {
    ok: true;
    info: BundleInfo;
    dir: string;
    files: number;
    bytes: number;
} | {
    ok: false;
    why: string;
};
/**
 * Check `archive` and, only when every check passes, write it into `target`, which must not exist
 * yet (its parent is made). On a refusal nothing is left at `target`. Never throws for a bad
 * archive: the answer says why, in a sentence.
 */
export declare function unpackBundle(archive: Uint8Array, target: string, expect: UnpackExpect, limits?: TarLimits & {
    archiveBytes?: number;
}): Unpacked;
/** Every check `unpackBundle` makes, without writing anything: the files and what `bundle.json` says, or why not. */
export declare function checkBundle(archive: Uint8Array, expect: UnpackExpect, limits?: TarLimits & {
    archiveBytes?: number;
}): {
    ok: true;
    info: BundleInfo;
    files: TarFile[];
} | {
    ok: false;
    why: string;
};
/**
 * `bundle.json` of an unpacked bundle in `dir`, or null when `dir` holds none (or one that does not
 * read). Checks the shape only, not the files: `verifyUnpacked` does that.
 */
export declare function readBundleInfo(dir: string): BundleInfo | null;
/**
 * Whether the bundle unpacked in `dir` is still what its `bundle.json` lists: every file there with
 * its sha256, and nothing a link. What a host asks before it starts a bundle it unpacked earlier
 * would cost a read of every file; it is for a check a person asks for, and for tests.
 */
export declare function verifyUnpacked(dir: string): {
    ok: true;
    info: BundleInfo;
} | {
    ok: false;
    why: string;
};
/** How many files and bytes are under `dir`, links not followed: what a person is told a folder held. */
export declare function sizeOf(dir: string): {
    files: number;
    bytes: number;
};
