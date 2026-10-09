import { z } from 'zod';
/**
 * A part's id: the same class of characters as an epic's slug (`EPIC_SLUG`). What a step's `part`
 * holds and what a host stores for the focus; never the heading, which is free to be reworded.
 */
export declare const PART_ID: RegExp;
/**
 * The module whose folder a paper is kept in. `moduleDir(projectPath, PAPER_MODULE)` is where a
 * project's papers are, one folder per epic, named by its slug.
 */
export declare const PAPER_MODULE = "kehikot.paper";
/**
 * One of a part's files in its stored form, or null: relative to the paper's folder, `/` only, no
 * empty, `.` or `..` segment, not absolute, no control character, NFC, at most `LIMITS.PART_FILE`
 * characters. Only outer space, a leading `./` and the normal form are tidied; `a/../b` is refused.
 */
export declare function partFile(raw: unknown): string | null;
/** Whether a string is ALREADY in `partFile`'s form, exactly. What the wire demands of each entry. */
export declare function isPartFile(value: unknown): value is string;
/**
 * The paper-relative name of a file, or null when it is not a file of the paper. An absolute path is
 * read by finding `/.kehikot/paper/<epic>/` in it (backslashes read as slashes); a relative one is taken
 * as paper-relative already. Pass `context.epic`: without it any epic's paper matches. Case-sensitive.
 */
export declare function paperFileOf(path: unknown, epic?: string | null): string | null;
export declare const partSchema: z.ZodObject<{
    id: z.ZodString;
    /** What a person calls it. Drawn as given; never compared. */
    heading: z.ZodDefault<z.ZodString>;
    /** The references the host says belong to this part. Never absent, for the reason `showing` never is. */
    refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Whether a person has picked this part out. None picked means the whole epic. */
    picked: z.ZodDefault<z.ZodBoolean>;
    /**
     * The files of the epic's paper this part owns, each relative to the paper's folder and in
     * `partFile`'s form exactly; any other entry is refused. Optional and not defaulted: absent means
     * none, so read it as `part.files ?? []`.
     */
    files: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    heading: string;
    refs: string[];
    picked: boolean;
    files?: string[] | undefined;
}, {
    id: string;
    files?: string[] | undefined;
    heading?: string | undefined;
    refs?: string[] | undefined;
    picked?: boolean | undefined;
}>;
export type EpicPart = z.infer<typeof partSchema>;
/**
 * `context.parts`, as a schema of its own so a host can check the list before composing a context.
 * Two parts sharing an id is not refused; the functions below read the first.
 */
export declare const partsSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    /** What a person calls it. Drawn as given; never compared. */
    heading: z.ZodDefault<z.ZodString>;
    /** The references the host says belong to this part. Never absent, for the reason `showing` never is. */
    refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Whether a person has picked this part out. None picked means the whole epic. */
    picked: z.ZodDefault<z.ZodBoolean>;
    /**
     * The files of the epic's paper this part owns, each relative to the paper's folder and in
     * `partFile`'s form exactly; any other entry is refused. Optional and not defaulted: absent means
     * none, so read it as `part.files ?? []`.
     */
    files: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    heading: string;
    refs: string[];
    picked: boolean;
    files?: string[] | undefined;
}, {
    id: string;
    files?: string[] | undefined;
    heading?: string | undefined;
    refs?: string[] | undefined;
    picked?: boolean | undefined;
}>, "many">;
/** The parts a person has picked out. Empty when the whole epic is in front of them. */
export declare function pickedParts(parts: readonly EpicPart[]): EpicPart[];
/** Whether anything is narrowed at all. False is the resting state, and the only one an older host produces. */
export declare function isFocused(parts: readonly EpicPart[]): boolean;
/**
 * Whether a reference is in front of the person: true when nothing is picked, otherwise exactly when
 * a picked part lists it. A reference no part lists is outside every focus; count it, do not drop it.
 */
export declare function refInFocus(parts: readonly EpicPart[], ref: string): boolean;
/**
 * Whether a thing assigned to a part (a step carrying `part`) is in front of the person: true when
 * nothing is picked, otherwise exactly when the part it names is picked. No part, or a part the epic
 * no longer has, is outside the focus and counted.
 */
export declare function partInFocus(parts: readonly EpicPart[], part: string | null | undefined): boolean;
/** The parts that own a file, in the epic's order. Usually one; `[]` for a file no part names. */
export declare function partsOfFile(parts: readonly EpicPart[], file: string, epic?: string | null): EpicPart[];
/**
 * The files the picked parts own, once each, in the parts' order. `[]` when nothing is picked, which
 * is not "show no files": ask `isFocused` first. `[]` while focused means the picked parts own no file.
 */
export declare function pickedFiles(parts: readonly EpicPart[]): string[];
/**
 * Whether a file of the epic's paper is in front of the person: true when nothing is picked, otherwise
 * exactly when a picked part owns it. `file` is an absolute `passage.path` or a paper-relative name and
 * `epic` is `context.epic`, as `paperFileOf` reads them. A file no part names is outside and counted.
 */
export declare function fileInFocus(parts: readonly EpicPart[], file: string, epic?: string | null): boolean;
/**
 * How many items are in front of the person (`shown`) and how many are outside the picked parts.
 * `inFocus` is `refInFocus`, `partInFocus` or `fileInFocus` per item; `outside` is 0 when nothing is picked.
 */
export declare function focusCount<T>(parts: readonly EpicPart[], items: readonly T[], inFocus: (item: T) => boolean): {
    shown: number;
    outside: number;
};
/**
 * Every item a module holds is anchored to a part by a file, a ref or a part id, or the module says
 * why it has none: `reacts: ['parts']` or `partless` in the manifest (`partsDeclaration` in `manifest.ts`).
 */
/**
 * What ties one item of a module's data to a part, told apart by its one key: `{ file }` (a paper file,
 * absolute or paper-relative; `fileInFocus`), `{ ref }` (`refInFocus`), or `{ part }` (a part's id,
 * `partInFocus`; null is "assigned to none").
 */
export type Anchor = {
    file: string;
} | {
    ref: string;
} | {
    part: string | null;
};
/**
 * What an item may answer: one anchor, several (a slide that cites three
 * files is in front when ANY of them is), or none. None — null, undefined or
 * an empty list — belongs to the epic as a whole.
 */
export type Anchors = Anchor | readonly Anchor[] | null | undefined;
/**
 * Whether an anchored thing is in front of the person: true when nothing is picked, otherwise exactly
 * when any one of its anchors is in a picked part. No anchor is outside the focus and counted.
 * `epic` is `context.epic`, for a `{ file }` anchor; pass it.
 */
export declare function anchorInFocus(parts: readonly EpicPart[], anchor: Anchors, epic?: string | null): boolean;
/** What a focus leaves of a list. */
export interface Narrowed<T> {
    /**
     * The items to draw, in the order they came. Every item when nothing is
     * picked — the same array's contents, untouched.
     */
    shown: T[];
    /** How many items are outside the picked parts. Zero when nothing is picked. `focusCount`'s number. */
    outside: number;
    /** How many of `shown` are outside and drawn anyway, because `keep` said the person is in the middle of them. */
    kept: number;
}
/**
 * A list narrowed to the picked parts: the items in front, and how many are not. `options.epic` is
 * `context.epic`, for a `{ file }` anchor; pass it. An item `options.keep` answers true for is drawn
 * though outside, still counted in `outside`, and counted in `kept`.
 */
export declare function narrowToFocus<T>(parts: readonly EpicPart[], items: readonly T[], anchorOf: (item: T) => Anchors, options?: {
    epic?: string | null;
    keep?: (item: T) => boolean;
}): Narrowed<T>;
/**
 * The sentence a module says while parts are picked: `3 questions outside the picked part (Heading).`
 * `''` when nothing is picked; `0 … outside` is said. `noun` names one item; give `[one, many]`
 * where adding an `s` is wrong.
 */
export declare function focusSentence(parts: readonly EpicPart[], outside: number, noun?: string | readonly [one: string, many: string]): string;
/**
 * Where the control is, for the sentence's tooltip or the line under an empty
 * pane: it is never on the module's own page.
 */
export declare const FOCUS_WHERE = "Parts are picked in the host\u2019s bar, beside the epic. Unpick them there to see the rest.";
/**
 * Two lists of parts, by value: what `context.parts` is compared with before
 * a page is redrawn for it. A host re-sends the context after every change
 * anywhere on the canvas, and the list is the same list on nearly all of them.
 */
export declare function sameParts(a: readonly EpicPart[], b: readonly EpicPart[]): boolean;
