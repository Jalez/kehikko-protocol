import { z } from 'zod';
/**
 * 2.13.0. A place in the code of a change: which change, which file, which lines, on which side of
 * the diff, at which commit. What Review's comments point at, what Source opens and Diff scrolls to.
 * Design notes: docs/wire.md ("A place in a change's code").
 */
/**
 * Which side of a change a line is counted on: `new`, the file at the change's head (an added or
 * kept line); `old`, the file at its base (a removed line). Closed: a diff has two sides.
 */
export declare const CODE_SIDES: readonly ["new", "old"];
export type CodeSide = (typeof CODE_SIDES)[number];
/**
 * Why somebody pointed: `show`, look here (Source opens the file there, Diff scrolls to the hunk);
 * `comment`, start a review comment here. Open to extension: a module meeting another reads `show`.
 */
export declare const LOCATION_INTENTS: readonly ["show", "comment"];
export type LocationIntent = (typeof LOCATION_INTENTS)[number];
/** A commit's sha, abbreviated or whole, lowercase hex. The same spelling `buildSchema.commit` uses. */
export declare const COMMIT_SHA: RegExp;
/**
 * A path inside a repository, as git spells it: forward slashes, relative to the repository's root,
 * no `.` or `..` segment, no empty segment, no backslash, no NUL. Refused rather than normalised: a
 * normalised path is a different claim. A consumer that reads the file still owes its own confinement.
 */
export declare const repoPath: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
/**
 * A place in a change's code. Every field is the sender's claim: the host relays it unchecked,
 * against no repository, and a consumer reading the file checks `path` itself.
 */
export declare const codeLocationSchema: z.ZodEffects<z.ZodObject<{
    /** The change (a merge request, a pull request) the place is in: the ref spelling `selection` carries. */
    change: z.ZodString;
    /** The file, relative to the repository's root (`repoPath`). For a renamed file, its name on `side`. */
    path: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    /** The first line, counted from one, on `side`. */
    line: z.ZodNumber;
    /** The last line of a range, inclusive, at least `line`. Absent: the one line. */
    endLine: z.ZodOptional<z.ZodNumber>;
    /** Which side of the diff `line` and `endLine` count on. `new` is the head; `old` is the base. */
    side: z.ZodEnum<["new", "old"]>;
    /**
     * The commit the lines were counted at, when the sender knows it: the head sha for `new`, the
     * base sha for `old`. A consumer at another commit may still show it, and says that it moved.
     */
    commit: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    line: number;
    change: string;
    side: "new" | "old";
    commit?: string | undefined;
    endLine?: number | undefined;
}, {
    path: string;
    line: number;
    change: string;
    side: "new" | "old";
    commit?: string | undefined;
    endLine?: number | undefined;
}>, {
    path: string;
    line: number;
    change: string;
    side: "new" | "old";
    commit?: string | undefined;
    endLine?: number | undefined;
}, {
    path: string;
    line: number;
    change: string;
    side: "new" | "old";
    commit?: string | undefined;
    endLine?: number | undefined;
}>;
export type CodeLocation = z.infer<typeof codeLocationSchema>;
/**
 * A code location as the context carries it: the place, why it was pointed at, and — the host's own
 * facts, absent from a host that does not say — which module pointed (`by`) and when (`at`, ISO 8601).
 * `at` moves on every `location.set`, so pointing again at the same line is still news: "comment here"
 * twice is two requests.
 */
export declare const sharedLocationSchema: z.ZodEffects<z.ZodObject<{
    intent: z.ZodCatch<z.ZodEnum<["show", "comment"]>>;
    by: z.ZodOptional<z.ZodString>;
    at: z.ZodOptional<z.ZodString>;
    /** The change (a merge request, a pull request) the place is in: the ref spelling `selection` carries. */
    change: z.ZodString;
    /** The file, relative to the repository's root (`repoPath`). For a renamed file, its name on `side`. */
    path: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    /** The first line, counted from one, on `side`. */
    line: z.ZodNumber;
    /** The last line of a range, inclusive, at least `line`. Absent: the one line. */
    endLine: z.ZodOptional<z.ZodNumber>;
    /** Which side of the diff `line` and `endLine` count on. `new` is the head; `old` is the base. */
    side: z.ZodEnum<["new", "old"]>;
    /**
     * The commit the lines were counted at, when the sender knows it: the head sha for `new`, the
     * base sha for `old`. A consumer at another commit may still show it, and says that it moved.
     */
    commit: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    intent: "show" | "comment";
    line: number;
    change: string;
    side: "new" | "old";
    at?: string | undefined;
    by?: string | undefined;
    commit?: string | undefined;
    endLine?: number | undefined;
}, {
    path: string;
    line: number;
    change: string;
    side: "new" | "old";
    at?: string | undefined;
    intent?: unknown;
    by?: string | undefined;
    commit?: string | undefined;
    endLine?: number | undefined;
}>, {
    path: string;
    intent: "show" | "comment";
    line: number;
    change: string;
    side: "new" | "old";
    at?: string | undefined;
    by?: string | undefined;
    commit?: string | undefined;
    endLine?: number | undefined;
}, {
    path: string;
    line: number;
    change: string;
    side: "new" | "old";
    at?: string | undefined;
    intent?: unknown;
    by?: string | undefined;
    commit?: string | undefined;
    endLine?: number | undefined;
}>;
export type SharedLocation = z.infer<typeof sharedLocationSchema>;
/**
 * Whether a location still stands beside a selection: its change is one of the refs picked out.
 * A host clears the location when this turns false; a module may read it the same way.
 */
export declare function locationStands(location: Pick<CodeLocation, 'change'> | null | undefined, selection: readonly string[]): boolean;
/**
 * Whether two locations name the same place: change, path, side and lines. Not the commit, the
 * intent, who pointed or when — so a consumer can tell "somewhere else" from "here again".
 */
export declare function samePlace(a: CodeLocation | null | undefined, b: CodeLocation | null | undefined): boolean;
/** `src/app.ts:42` or `src/app.ts:42-48`, for a person to read. */
export declare function locationLabel(location: Pick<CodeLocation, 'path' | 'line' | 'endLine'>): string;
