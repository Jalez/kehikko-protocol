/**
 * The one archive a bundle travels in (2.102.0): a gzipped ustar of regular files, and nothing a
 * reader cannot check before it writes a byte. Node or Bun; no `tar` program is run. Design notes:
 * docs/bundles.md.
 *
 * Written here and read here, so both sides agree on the subset: regular files and directories,
 * relative paths of plain segments, a mode of 0644 or 0755. A reader REFUSES everything else —
 * a symlink, a hard link, a device, an absolute path, a `..`, a dot segment that is not a name,
 * a name with a NUL or a backslash — instead of skipping it, because an archive that carries one
 * was not made by `kehikot-bundle` and is not one to unpack at all.
 */
/** One file in or out of an archive. `path` uses `/`, is relative, and names a file, never a directory. */
export interface TarFile {
    path: string;
    data: Uint8Array;
    /** Executable or not. Every other bit of a mode is dropped. */
    executable?: boolean;
}
/** What a reader will take. Both caps count the UNPACKED bytes, so a small archive that inflates to a disk's worth is refused while inflating. */
export interface TarLimits {
    /** The most bytes the archive may unpack to. Default `BUNDLE_LIMITS.unpackedBytes`. */
    maxBytes?: number;
    /** The most files it may hold. Default `BUNDLE_LIMITS.files`. */
    maxFiles?: number;
}
/** The caps a bundle is held to, here and in a host: generous for a module, small for a disk. */
export declare const BUNDLE_LIMITS: {
    /** The archive as downloaded. */
    readonly archiveBytes: number;
    /** What it unpacks to. */
    readonly unpackedBytes: number;
    /** How many files. A bundle is tens to a few hundred; a `node_modules` is tens of thousands. */
    readonly files: 20000;
};
/** Why an archive was refused: a sentence naming the entry. */
export declare class TarRefused extends Error {
    constructor(why: string);
}
/**
 * Whether `path` may be a file's place inside a target directory: relative, `/`-separated plain
 * segments, none of them empty, `.` or `..`, no NUL, no backslash, no colon-led drive. Pure, and
 * what both the writer and the reader ask.
 */
export declare function safeRelative(path: string): boolean;
/**
 * The archive of `files`, gzipped: sorted by path, no times, no owners, so the same files always
 * make the same bytes. Throws `TarRefused` on a path `safeRelative` refuses or one given twice.
 */
export declare function writeTarGz(files: readonly TarFile[]): Uint8Array;
/**
 * The files of a gzipped tar, checked before anything is returned: every entry a regular file
 * (or a directory, which is dropped: a file's folders are made for it) at a path `safeRelative`
 * takes, no path twice, a checksum that adds up, and the whole within `limits`. Anything else
 * throws `TarRefused` naming the entry. Nothing is written anywhere.
 */
export declare function readTarGz(archive: Uint8Array, limits?: TarLimits): TarFile[];
