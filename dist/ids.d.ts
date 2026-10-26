/**
 * The names things are called by: three patterns, a slug derivation and a safe lookup.
 * A pattern says what a spelling looks like; it decides nothing about what the named thing may do.
 * Design notes: docs/ids.md.
 */
/**
 * A module's id: reverse-DNS by convention; lowercase, digits, dots and dashes by rule. The pattern
 * accepts `constructor`, `toString` and every other `Object.prototype` name, so every lookup keyed
 * by one must use `Object.hasOwn`, `own()` or a `Map`, never `record[id]` on a plain object.
 */
export declare const MODULE_ID: RegExp;
/**
 * A kehikko's key: the identity of one canvas that outlives the host's database. Two to 32
 * characters of lowercase letters, digits and dashes, neither end a dash; a host generates eight
 * hex characters and a person may write a word. Unique within a project, not across projects. It
 * can be all digits, so it is never told from a kehikko's `id` by its spelling.
 */
export declare const KEHIKKO_KEY: RegExp;
/**
 * A project's id (2.1.0): the identity of one project that outlives its folder's path. 8 to 64
 * characters of lowercase letters, digits and dashes, neither end a dash, so it is a safe file or
 * folder name as it stands (no dot, no slash). A host mints a random lowercase UUID
 * (`crypto.randomUUID()`, 36 characters); the pattern does not insist on one. Kept in
 * `.kehikot/project.json` (`PROJECT_FILE`), written only by the host. Design notes: docs/project-data.md.
 */
export declare const PROJECT_ID: RegExp;
/** A mode's id: one module's own name for one of its tabs. */
/**
 * A protocol package version as this package spells its own (2.22.0): `major.minor.patch`, digits
 * only, as `PACKAGE_VERSION`, `build.protocol` and every entry of `SINCE` are written.
 */
export declare const PROTOCOL_VERSION: RegExp;
export declare const MODE_ID: RegExp;
/**
 * An epic's slug: lowercase letters, digits and dashes, at most `LIMITS.EPIC_SLUG` characters. No
 * dot and no slash, so it cannot leave a directory. It describes an epic slug only, not a journey's.
 */
export declare const EPIC_SLUG: RegExp;
/**
 * A slug out of a line of prose: lowercased, accents folded, each run of non-alphanumerics one
 * dash, end dashes trimmed, cut at 80 characters (the bound `EPIC_SLUG` and `PART_ID` share). `''`
 * when nothing usable is left. The output is a contract: ids it made are already in people's files.
 */
export declare function slugFrom(text: string): string;
/**
 * One lookup that does not fall through to a prototype: `undefined` unless `key` is the record's
 * own. See the hazard on `MODULE_ID`; a `Map` keyed by id is better still where you can have one.
 */
export declare function own<T>(record: Record<string, T>, key: string): T | undefined;
