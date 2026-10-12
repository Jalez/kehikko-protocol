import { z } from 'zod';
/**
 * A part's id: the same class of characters as an epic's slug (`EPIC_SLUG`). What a step's `part`
 * holds and what a host stores for the focus; never the heading, which is free to be reworded.
 */
export declare const PART_ID: RegExp;
/**
 * The module whose folder a paper is kept in. `moduleDir(projectPath, PAPER_MODULE)` is where a
 * project's papers are, one folder per epic, named by its slug.
 * @deprecated 1.2.0. A part names no module. A part's files are its `documents`, project-relative,
 * whichever module keeps them; nothing new should spell this id. Kept, and unchanged, for `files`.
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
 * @deprecated 1.2.0. It reads one module's folder out of a path. Compare a file with a part through
 * `fileInFocus` or a `{ file }` anchor, which read `documents` (`documentOf`). Kept, and unchanged.
 */
export declare function paperFileOf(path: unknown, epic?: string | null): string | null;
/**
 * One of a part's documents in its stored form, or null: a path relative to the PROJECT, `/` only, no
 * empty, `.` or `..` segment, not absolute, no control character, NFC, at most `LIMITS.PART_DOCUMENT`
 * characters. `partFile`'s form with the project as its root; `a/../b` is refused, not resolved.
 */
export declare function partDocument(raw: unknown): string | null;
/** Whether a string is ALREADY in `partDocument`'s form, exactly. What the wire demands of each entry. */
export declare function isPartDocument(value: unknown): value is string;
/**
 * The project-relative name of a file a caller is holding, or null: THE normalisation, and the only
 * place a path is turned into what `documents` lists. A relative path is taken as project-relative
 * already. An absolute one is read against `projectPath` (`context.projectPath`) when it is under it;
 * otherwise from the last `/.kehikot/` in it, so a path a module resolved through a symlink is still
 * read. An absolute path that is neither is null. Backslashes read as slashes; case-sensitive.
 */
export declare function documentOf(path: unknown, projectPath?: string | null): string | null;
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
     * @deprecated 1.2.0. Read `documents`. A host goes on filling this for modules that read it.
     */
    files: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    /**
     * The documents this part has, whichever modules keep them: each a path relative to the PROJECT, in
     * `partDocument`'s form exactly; any other entry is refused. The host's union of what every module
     * published for the part. Optional and not defaulted, like `files`: read it as `part.documents ?? []`.
     */
    documents: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    heading: string;
    refs: string[];
    picked: boolean;
    files?: string[] | undefined;
    documents?: string[] | undefined;
}, {
    id: string;
    files?: string[] | undefined;
    heading?: string | undefined;
    refs?: string[] | undefined;
    picked?: boolean | undefined;
    documents?: string[] | undefined;
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
     * @deprecated 1.2.0. Read `documents`. A host goes on filling this for modules that read it.
     */
    files: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    /**
     * The documents this part has, whichever modules keep them: each a path relative to the PROJECT, in
     * `partDocument`'s form exactly; any other entry is refused. The host's union of what every module
     * published for the part. Optional and not defaulted, like `files`: read it as `part.documents ?? []`.
     */
    documents: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    heading: string;
    refs: string[];
    picked: boolean;
    files?: string[] | undefined;
    documents?: string[] | undefined;
}, {
    id: string;
    files?: string[] | undefined;
    heading?: string | undefined;
    refs?: string[] | undefined;
    picked?: boolean | undefined;
    documents?: string[] | undefined;
}>, "many">;
/**
 * One part as the epic keeps it: an id and a name, and its place is its place in the list. `id` is made
 * once and never changes; `name` is what a person calls it and is free to. What a host stores in the
 * epic's own file and answers `parts.set` with; `context.parts` carries the same part with `picked` and
 * what the modules hold for it (and calls the name `heading`).
 */
export declare const listedPartSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
}, {
    id: string;
    name: string;
}>;
export type ListedPart = z.infer<typeof listedPartSchema>;
/** An epic's whole list of parts, in order: at most `LIMITS.PARTS`, and no id twice. */
export declare const partListSchema: z.ZodEffects<z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
}, {
    id: string;
    name: string;
}>, "many">, {
    id: string;
    name: string;
}[], {
    id: string;
    name: string;
}[]>;
/**
 * The id a new part is given, from its name: `slugFrom(name)`, or `part` when the name has nothing
 * usable in it, told apart from the ids already `taken` by `-2`, `-3`. Made once, when the part is
 * added; a rename does not call this. The one derivation, so a host's picker and its MCP door agree.
 */
export declare function partIdFor(name: unknown, taken: Iterable<string>): string;
/**
 * How many parts a module built with this package before 1.2.0 can be sent. Its own schema refuses a
 * context that lists more, and a refused context is a module with no greeting at all.
 */
export declare const PARTS_BEFORE_1_2 = 32;
/**
 * The parts a host sends ONE module, given the package version that module was built with (its
 * manifest's `build.protocol`): the whole list from 1.2.0 on, and at most `PARTS_BEFORE_1_2` for an
 * older or unknown build, in the epic's order, every picked part first to be kept. An older module on
 * a long epic then still narrows to what is picked; it cannot list the parts it was not sent.
 */
export declare function partsFor(parts: readonly EpicPart[], builtWith: string | null | undefined): EpicPart[];
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
/**
 * The parts that have a file, in the epic's order. Usually one; `[]` for a file no part names. `file`,
 * `epic` and `projectPath` are read as `fileInFocus` reads them.
 */
export declare function partsOfFile(parts: readonly EpicPart[], file: string, epic?: string | null, projectPath?: string | null): EpicPart[];
/**
 * The documents the picked parts have, once each, in the parts' order, project-relative. `[]` when
 * nothing is picked, which is not "show no documents": ask `isFocused` first.
 */
export declare function pickedDocuments(parts: readonly EpicPart[]): string[];
/**
 * The files the picked parts own, once each, in the parts' order. `[]` when nothing is picked, which
 * is not "show no files": ask `isFocused` first. `[]` while focused means the picked parts own no file.
 * @deprecated 1.2.0. Paper-relative names, from `files`. Use `pickedDocuments`.
 */
export declare function pickedFiles(parts: readonly EpicPart[]): string[];
/**
 * Whether a file is in front of the person: true when nothing is picked, otherwise exactly when a
 * picked part has it. `file` is an absolute path (a `passage.path`) or a project-relative name, read by
 * `documentOf` against the parts' `documents`; `projectPath` is `context.projectPath`, needed for an
 * absolute path outside `.kehikot/`. A host that sends only `files` is answered as before 1.2.0: `epic`
 * is `context.epic`, and a paper-relative name still matches `files`. A file no part names is outside.
 */
export declare function fileInFocus(parts: readonly EpicPart[], file: string, epic?: string | null, projectPath?: string | null): boolean;
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
 * What ties one item of a module's data to a part, told apart by its one key: `{ file }` (a document,
 * absolute or project-relative; `fileInFocus`), `{ ref }` (`refInFocus`), `{ part }` (a part's id,
 * `partInFocus`; null is "assigned to none"), or `{ whole: true }` (1.2.0): the item is about the epic
 * itself or its whole paper, so it belongs to EVERY part and is in front under any pick. `whole` is for
 * an item that is really about all of it; an item about nothing in particular answers no anchor.
 */
export type Anchor = {
    file: string;
} | {
    ref: string;
} | {
    part: string | null;
} | {
    whole: true;
};
/**
 * What an item may answer: one anchor, several (a slide that cites three
 * files is in front when ANY of them is), or none. None — null, undefined or
 * an empty list — belongs to the epic as a whole.
 */
export type Anchors = Anchor | readonly Anchor[] | null | undefined;
/**
 * Whether an anchored thing is in front of the person. THE rule: true when nothing is picked, otherwise
 * exactly when any one of its anchors is in a picked part; `{ whole: true }` is in every part. No
 * anchor is outside the focus. `epic` and `projectPath` are the context's, for a `{ file }` anchor.
 */
export declare function anchorInFocus(parts: readonly EpicPart[], anchor: Anchors, epic?: string | null, projectPath?: string | null): boolean;
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
 * A list narrowed to the picked parts: the items in front, and how many are not. `options.epic` and
 * `options.projectPath` are the context's, for a `{ file }` anchor; pass them. An item `options.keep`
 * answers true for is drawn though outside, still counted in `outside`, and counted in `kept`.
 */
export declare function narrowToFocus<T>(parts: readonly EpicPart[], items: readonly T[], anchorOf: (item: T) => Anchors, options?: {
    epic?: string | null;
    projectPath?: string | null;
    keep?: (item: T) => boolean;
}): Narrowed<T>;
/**
 * The one sentence a module shows INSIDE a view the pick left empty: `No note is in the picked part.`,
 * `No note is in the picked parts.` for several. `''` when nothing is picked. `noun` names one item, in
 * the singular. Drawn where the items would have been and only when none is drawn; while anything is
 * shown, a module says nothing about the pick.
 */
export declare function emptySaid(parts: readonly EpicPart[], noun?: string): string;
/**
 * The sentence a module says while parts are picked: `3 questions outside the picked part (Heading).`
 * `''` when nothing is picked; `0 … outside` is said. `noun` names one item; give `[one, many]`
 * where adding an `s` is wrong. With `total` — how many items the count was taken over — it reads
 * `2 of 3 questions are outside the picked part (Heading).`
 * @deprecated 1.2.0. No module draws a standing line about the pick. Use `emptySaid`, in a view the
 * pick left empty, and say nothing otherwise. Kept, and unchanged.
 */
export declare function focusSentence(parts: readonly EpicPart[], outside: number, noun?: string | readonly [one: string, many: string], options?: {
    total?: number;
}): string;
/**
 * Where the control is, for the sentence's tooltip or the line under an empty
 * pane: it is never on the module's own page.
 * @deprecated 1.2.0. It went with the standing count line (`focusSentence`). Kept, and unchanged.
 */
export declare const FOCUS_WHERE = "Parts are picked in the host\u2019s bar, beside the epic. Unpick them there to see the rest.";
/**
 * Two lists of parts, by value: what `context.parts` is compared with before
 * a page is redrawn for it. A host re-sends the context after every change
 * anywhere on the canvas, and the list is the same list on nearly all of them.
 */
export declare function sameParts(a: readonly EpicPart[], b: readonly EpicPart[]): boolean;
