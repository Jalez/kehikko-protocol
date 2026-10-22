import { z } from 'zod';
import { LIMITS } from './limits.js';
import { MODULE_ID } from './ids.js';
import { ref } from './fragments.js';
/**
 * 2.13.0. A place in the code of a change: which change, which file, which lines, on which side of
 * the diff, at which commit. What Review's comments point at, what Source opens and Diff scrolls to.
 * Design notes: docs/wire.md ("A place in a change's code").
 */
/**
 * Which side of a change a line is counted on: `new`, the file at the change's head (an added or
 * kept line); `old`, the file at its base (a removed line). Closed: a diff has two sides.
 */
export const CODE_SIDES = ['new', 'old'];
/**
 * Why somebody pointed: `show`, look here (Source opens the file there, Diff scrolls to the hunk);
 * `comment`, start a review comment here. Open to extension: a module meeting another reads `show`.
 */
export const LOCATION_INTENTS = ['show', 'comment'];
/** A commit's sha, abbreviated or whole, lowercase hex. The same spelling `buildSchema.commit` uses. */
export const COMMIT_SHA = /^[0-9a-f]{7,64}$/;
/**
 * A path inside a repository, as git spells it: forward slashes, relative to the repository's root,
 * no `.` or `..` segment, no empty segment, no backslash, no NUL. Refused rather than normalised: a
 * normalised path is a different claim. A consumer that reads the file still owes its own confinement.
 */
export const repoPath = z
    .string()
    .min(1)
    .max(LIMITS.PATH)
    .refine((p) => !p.includes('\\') && !p.includes('\0'), { message: 'a repository path uses forward slashes and no NUL' })
    .refine((p) => p.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..'), {
    message: 'a repository path is relative to the root: no leading or doubled slash, no . or .. segment',
});
const line = z.number().int().min(1).max(LIMITS.CODE_LINE);
/** The fields of a code location, before the rule that ties `endLine` to `line`. */
const codeLocationFields = {
    /** The change (a merge request, a pull request) the place is in: the ref spelling `selection` carries. */
    change: ref,
    /** The file, relative to the repository's root (`repoPath`). For a renamed file, its name on `side`. */
    path: repoPath,
    /** The first line, counted from one, on `side`. */
    line,
    /** The last line of a range, inclusive, at least `line`. Absent: the one line. */
    endLine: line.optional(),
    /** Which side of the diff `line` and `endLine` count on. `new` is the head; `old` is the base. */
    side: z.enum(CODE_SIDES),
    /**
     * The commit the lines were counted at, when the sender knows it: the head sha for `new`, the
     * base sha for `old`. A consumer at another commit may still show it, and says that it moved.
     */
    commit: z.string().regex(COMMIT_SHA).optional(),
};
const endsAtOrAfter = (place) => place.endLine === undefined || place.endLine >= place.line;
const ENDS = { message: 'a code location ends at or after the line it starts on' };
/**
 * A place in a change's code. Every field is the sender's claim: the host relays it unchecked,
 * against no repository, and a consumer reading the file checks `path` itself.
 */
export const codeLocationSchema = z.object(codeLocationFields).refine(endsAtOrAfter, ENDS);
/**
 * A code location as the context carries it: the place, why it was pointed at, and — the host's own
 * facts, absent from a host that does not say — which module pointed (`by`) and when (`at`, ISO 8601).
 * `at` moves on every `location.set`, so pointing again at the same line is still news: "comment here"
 * twice is two requests.
 */
export const sharedLocationSchema = z
    .object({
    ...codeLocationFields,
    intent: z.enum(LOCATION_INTENTS).catch('show'),
    by: z.string().regex(MODULE_ID).optional(),
    at: z.string().min(1).max(40).optional(),
})
    .refine(endsAtOrAfter, ENDS);
/**
 * Whether a location still stands beside a selection: its change is one of the refs picked out.
 * A host clears the location when this turns false; a module may read it the same way.
 */
export function locationStands(location, selection) {
    return !!location && selection.includes(location.change);
}
/**
 * Whether two locations name the same place: change, path, side and lines. Not the commit, the
 * intent, who pointed or when — so a consumer can tell "somewhere else" from "here again".
 */
export function samePlace(a, b) {
    if (!a || !b)
        return a === b;
    return a.change === b.change && a.path === b.path && a.side === b.side && a.line === b.line && (a.endLine ?? a.line) === (b.endLine ?? b.line);
}
/** `src/app.ts:42` or `src/app.ts:42-48`, for a person to read. */
export function locationLabel(location) {
    const { path, line: first, endLine } = location;
    return endLine !== undefined && endLine !== first ? `${path}:${first}-${endLine}` : `${path}:${first}`;
}
