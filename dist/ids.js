/**
 * The names things are called by: three patterns, a slug derivation and a safe lookup.
 * A pattern says what a spelling looks like; it decides nothing about what the named thing may do.
 * Design notes: docs/ids.md.
 */
import { LIMITS } from './limits.js';
/**
 * A module's id: reverse-DNS by convention; lowercase, digits, dots and dashes by rule. The pattern
 * accepts `constructor`, `toString` and every other `Object.prototype` name, so every lookup keyed
 * by one must use `Object.hasOwn`, `own()` or a `Map`, never `record[id]` on a plain object.
 */
export const MODULE_ID = /^[a-z0-9][a-z0-9.-]{1,62}[a-z0-9]$/;
/** A mode's id: one module's own name for one of its tabs. */
export const MODE_ID = /^[a-z0-9][a-z0-9-]{0,30}$/;
/**
 * An epic's slug: lowercase letters, digits and dashes, at most `LIMITS.EPIC_SLUG` characters. No
 * dot and no slash, so it cannot leave a directory. It describes an epic slug only, not a journey's.
 */
export const EPIC_SLUG = new RegExp(`^[a-z0-9-]{1,${LIMITS.EPIC_SLUG}}$`);
/**
 * A slug out of a line of prose: lowercased, accents folded, each run of non-alphanumerics one
 * dash, end dashes trimmed, cut at 80 characters (the bound `EPIC_SLUG` and `PART_ID` share). `''`
 * when nothing usable is left. The output is a contract: ids it made are already in people's files.
 */
export function slugFrom(text) {
    return text
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, LIMITS.EPIC_SLUG)
        .replace(/-+$/, '');
}
/**
 * One lookup that does not fall through to a prototype: `undefined` unless `key` is the record's
 * own. See the hazard on `MODULE_ID`; a `Map` keyed by id is better still where you can have one.
 */
export function own(record, key) {
    return Object.hasOwn(record, key) ? record[key] : undefined;
}
