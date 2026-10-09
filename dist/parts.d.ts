import { z } from 'zod';
/**
 * The parts of the open epic, and which of them a person has picked out.
 *
 * ## What this is for
 *
 * An epic grows. Forty steps and thirty references under one title is a thing
 * somebody still wants to call one piece of work, and cannot look at all at
 * once. So an epic may be divided into PARTS — "the posting seam", "what the
 * tests check" — and a person may point the whole workspace at one of them, or
 * at several, and still be able to see that the rest is there.
 *
 * The first design for this was an epic inside an epic, and it was refused.
 * Nesting makes every question the wire already answers ask "at which level":
 * which epic is open, which epic a ref was picked out of, which epic a module's
 * own material is filed under. A part is not a smaller epic. It is a heading
 * and the things under it, ONE level deep, and the open epic is still the open
 * epic.
 *
 * ## Every part is listed, and the picked ones are flagged
 *
 * The shape is `containers`' shape, on purpose, because the argument is the
 * same one. A host could send only the parts that are picked out — "narrow to
 * these" — and a module handed that could narrow and could never say what it
 * had hidden. "3 items outside the picked parts" is a sentence a module has to
 * be able to print, because a pane that is shorter than it was for a reason
 * nobody can see is the failure this whole field is arranged against; and it
 * cannot count what it was not told exists. So the list is the epic's whole
 * list of parts, in the epic's order, each with its `refs`, and `picked` says
 * which ones the person means.
 *
 * **None picked means the whole epic.** Not "nothing is in front of you" — the
 * opposite. That is the resting state, it is what a host that has never heard
 * of parts says by sending `[]`, and it is why a module that never reads this
 * field is exactly as correct as it was: it shows the whole epic, which is
 * what a module shown no narrowing should show.
 *
 * ## What `refs` holds, and whose word it is
 *
 * The references a host can say belong to the part: the ones the epic lists
 * under that heading, and the ones carried by steps that were ASSIGNED to it.
 * It is the host's reading of the epic it holds, which is the only reading a
 * host can vouch for — a module with a store of its own may hold steps the
 * host has never seen, and it decides about those itself; see `partInFocus`.
 *
 * Refs and nothing else, for the reason `selection` carries refs and nothing
 * else: they are the one name for a thing that two modules which have never
 * heard of each other both already use.
 *
 * ## A step says which part it is in. It is not worked out from its refs.
 *
 * A step may carry `part: <id>`, and that is the whole of how a step comes to
 * be in a part. A step that names `gh#12` is NOT thereby in the part that
 * lists `gh#12`: a step often names a reference it merely depends on, and a
 * rule that filed it under that reference's heading would move steps between
 * parts whenever somebody edited a sentence. A step with no `part` belongs to
 * the epic as a whole.
 *
 * So there are two questions and two functions, and a module asks the one that
 * matches what it is holding: `refInFocus` for a thing that IS a reference (a
 * row in a list of issues, a checklist held against a pull request), and
 * `partInFocus` for a thing that was assigned to a part (a step).
 *
 * ## The id, and why it is not the heading
 *
 * A heading is prose somebody will reword. If it were the name, rewording it
 * would silently unassign every step filed under it and drop a stored focus,
 * and nothing would say so. So a part has an `id` in the same class of
 * characters as an epic's slug, which is what a step's `part` holds and what a
 * host stores for the focus, and the heading is free to change.
 *
 * Where the id comes from used to be called the host's business, and this
 * package said only what an id looks like once it is on the wire. That stopped
 * being enough the day a second program had to name a part: the module that
 * edits steps writes a part's id into a step, the host compares it, and two
 * derivations of an id from a heading are a step that is in a part on one
 * screen and in none on the other. So the derivation is in this package too —
 * `partIdsOf` and `partsOf` in `journey.ts`, over the record the parts are
 * read from: an id written beside the heading is used, and one that is not is
 * derived from the heading.
 *
 * ## The files a part owns, and what their names are relative to
 *
 * References are not the only thing an epic has. An epic written as a paper
 * is a folder with a `main.tex` that pulls other files in, and a module that
 * shows a document — the paper itself, the notes on it, the questions about
 * it — could not narrow to a part while a part knew only references. So a
 * part may name the files of the paper that are its own: `files`.
 *
 * Each is a path RELATIVE TO THE PAPER'S FOLDER, which is
 * `<project>/.kehikot/paper/<epic>/` — the folder `main.tex` is in. So
 * `parts/posting-seam.tex` is `<project>/.kehikot/paper/<epic>/parts/posting-seam.tex`.
 * That one, out of three that were possible:
 *
 * - **Absolute** is what a `passage.path` is, and would compare with one by
 *   `===`. But this string is written into a record that is committed and
 *   cloned, and an absolute path in a repository is one person's home
 *   directory in everybody's checkout.
 * - **Relative to the project** survives a clone, and repeats
 *   `.kehikot/paper/<epic>/` in every entry: a fact the record already holds
 *   (its slug) written again by hand, free to disagree with it, and free to
 *   name a file of ANOTHER epic's paper or no paper's at all.
 * - **Relative to the paper's folder** is the name the Paper module already
 *   has for a file — the keys of its file list, of its hashes and of its
 *   page map are exactly these — and the name a person reads in
 *   `\input{parts/posting-seam}`, plus the extension. It cannot name
 *   anything outside the paper, because there is nothing in it to say so.
 *
 * It is the file's name AS IT IS ON DISK, extension included. TeX lets
 * `\input{parts/a}` mean `parts/a.tex`; this does not, because guessing an
 * extension is a second derivation and the Paper module's file list has
 * already made the first.
 *
 * ## One function compares, and it is `paperFileOf`
 *
 * A module does not hold that relative name. It holds what `passage.path`
 * carries: an absolute path, on this machine. Turning one into the other is
 * the step two modules would do two ways — one stripping `projectPath` (which
 * a host spells as it was typed and Paper spells resolved, so the prefix
 * differs under a symlink), one matching a suffix (which finds
 * `chapters/intro.tex` in the wrong epic's paper). So it is done here, once:
 * `paperFileOf(path, epic)` answers the paper-relative name a path has, or
 * null, and every other function here calls it. Nobody else should.
 *
 * ## Text that is in no part's file
 *
 * Whatever is written directly in `main.tex`, and every file no part names,
 * belongs to the epic as a whole — and so, like a step with no `part` and a
 * reference no part lists, it is in no PICKED part: outside the focus, and
 * counted. Naming `main.tex` in a part is allowed and means what it says.
 */
export declare const PART_ID: RegExp;
/**
 * The module whose folder a paper is kept in.
 *
 * Spelled here for the reason `JOURNEYS_MODULE` is spelled in `journey.ts`:
 * `paperFileOf` has to recognise that folder in a path, and a second spelling
 * of `'kehikot.paper'` would be the day the two disagreed.
 * `moduleDir(projectPath, PAPER_MODULE)` is where a project's papers are, one
 * folder per epic, named by its slug.
 */
export declare const PAPER_MODULE = "kehikot.paper";
/**
 * One of a part's files, in the form it is stored and sent in — or null.
 *
 * The form: relative to the paper's folder; `/` between segments and never
 * `\`; no segment empty, `.` or `..`; not absolute in either platform's
 * spelling (`/x`, `C:x`); no control character; at most `LIMITS.PART_FILE`
 * characters; Unicode in NFC, because one filesystem hands names back
 * decomposed and two spellings of `ä` are two strings.
 *
 * What is tidied rather than refused is only what cannot change which file is
 * meant: space around the name, a leading `./`, and the normal form. Anything
 * else is null. `..` is not resolved — `a/../b` is refused, not read as `b` —
 * because this package opens nothing and cannot know that `a` is not a link.
 *
 * Why so strict for a name nobody opens HERE: a module on the other end will
 * join this onto a folder and read it. That module has its own fence and must
 * keep it; this is the second one, and it means a string that reached a
 * module through `context.parts` was never a way out of the paper.
 */
export declare function partFile(raw: unknown): string | null;
/** Whether a string is ALREADY in `partFile`'s form, exactly. What the wire demands of each entry. */
export declare function isPartFile(value: unknown): value is string;
/**
 * The paper-relative name of a file a caller is holding — or null when it is
 * not a file of the paper. THE comparison; see the essay at the top.
 *
 * `path` is either of the two things a module has:
 *
 * - **An absolute path**, as `passage.path` carries. It is a file of the
 *   paper exactly when it has `/.kehikot/paper/<epic>/` in it, and its name is
 *   what follows the first such segment. The segment is looked for IN the
 *   path, and the path is not measured against `context.projectPath`, on
 *   purpose: the Paper module publishes a path it has resolved, a host sends
 *   the project as somebody typed it, and under one symlink those two do not
 *   share a prefix. Backslashes are read as slashes, so a path from the other
 *   platform is read too.
 * - **A relative path**, which is taken to be relative to the paper's folder
 *   already — what the Paper module holds for its own files. It is the
 *   caller's word that it is; a module that has an absolute path should pass
 *   that and not trim it itself.
 *
 * `epic` is the open epic, `context.epic`. Pass it. Without it an absolute
 * path under ANY epic's paper folder is read, and `parts/intro.tex` of another
 * epic's paper is then indistinguishable from this one's — which is right
 * only for a caller that already knows every path it holds is the open
 * epic's. Something that is not a slug is no epic, and the answer is null.
 *
 * Names are compared as written, case and all. A filesystem that folds case
 * is the machine's own business and this package opens nothing; write the
 * name the way the folder spells it.
 *
 * What this cannot see: a paper folder that is itself a symlink to somewhere
 * else. The Paper module resolves it, publishes the far path, and that path
 * has no `.kehikot/paper/<epic>/` in it — so it is no part's file here, and
 * is counted outside a focus rather than guessed into one.
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
     * The files of the epic's paper this part owns, each relative to the paper's
     * folder and in `partFile`'s form exactly.
     *
     * OPTIONAL, and absent means none — the one field here that is not defaulted
     * to empty. A part parsed before 0.32.0 is `{ id, heading, refs, picked }`
     * exactly, and hosts and modules hold that shape in their own tests and
     * comparisons; a key that appeared on every part from a host that never
     * sent it would be a change to all of them for a fact about none. So a part
     * from an older host, and a part that owns no file, have no `files`, and
     * the functions below read both as owning none. Read it yourself as
     * `part.files ?? []`, or not at all: `fileInFocus`, `pickedFiles` and
     * `partsOfFile` are the three questions there are.
     *
     * An entry that is not in the form is REFUSED, like an `id` that is not a
     * `PART_ID`, and for a reason of its own: a module will join this onto a
     * folder. A host composes the list with `partsOf`, which only produces the
     * form.
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
 * `context.parts`, as a schema of its own so a host can check the list before
 * it composes a context around it. Two parts sharing an id is not refused
 * here: this rides in a context, and one doubtful field must not cost every
 * module on the canvas its greeting. The functions below read the first.
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
     * The files of the epic's paper this part owns, each relative to the paper's
     * folder and in `partFile`'s form exactly.
     *
     * OPTIONAL, and absent means none — the one field here that is not defaulted
     * to empty. A part parsed before 0.32.0 is `{ id, heading, refs, picked }`
     * exactly, and hosts and modules hold that shape in their own tests and
     * comparisons; a key that appeared on every part from a host that never
     * sent it would be a change to all of them for a fact about none. So a part
     * from an older host, and a part that owns no file, have no `files`, and
     * the functions below read both as owning none. Read it yourself as
     * `part.files ?? []`, or not at all: `fileInFocus`, `pickedFiles` and
     * `partsOfFile` are the three questions there are.
     *
     * An entry that is not in the form is REFUSED, like an `id` that is not a
     * `PART_ID`, and for a reason of its own: a module will join this onto a
     * folder. A host composes the list with `partsOf`, which only produces the
     * form.
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
 * Whether a REFERENCE is in front of the person.
 *
 * True when nothing is picked out — the whole epic is in front of them — and
 * otherwise true exactly when a picked part lists it. A reference no part
 * lists is outside every focus, and is one of the "N outside the picked
 * parts" a module should count rather than drop.
 */
export declare function refInFocus(parts: readonly EpicPart[], ref: string): boolean;
/**
 * Whether a thing ASSIGNED to a part — a step carrying `part` — is in front of
 * the person.
 *
 * True when nothing is picked out. Otherwise true exactly when the part it
 * names is picked. Something with no part belongs to the epic as a whole and
 * is therefore not in any PICKED part: it is outside the focus, and counted.
 * So is something naming a part the epic no longer has — an assignment to
 * nothing is not an assignment, and guessing which part was meant would be
 * the inference this field exists to avoid.
 */
export declare function partInFocus(parts: readonly EpicPart[], part: string | null | undefined): boolean;
/** The parts that own a file, in the epic's order. Usually one; `[]` for a file no part names. */
export declare function partsOfFile(parts: readonly EpicPart[], file: string, epic?: string | null): EpicPart[];
/**
 * The files the picked parts own, once each, in the parts' order — the list a
 * module showing the paper draws under a focus.
 *
 * `[]` when nothing is picked, which is NOT "show no files": ask `isFocused`
 * first, as with `pickedParts`. `[]` while focused is real, and means the
 * picked parts own no file — everything the paper has is outside them.
 */
export declare function pickedFiles(parts: readonly EpicPart[]): string[];
/**
 * Whether a FILE of the epic's paper is in front of the person.
 *
 * The same rule as its two siblings. True when nothing is picked out.
 * Otherwise true exactly when a picked part owns the file. A file no part
 * names — `main.tex`, usually, and whatever is written directly in it — is
 * outside every focus and is counted, not dropped; so is a path that is not a
 * file of this epic's paper at all.
 *
 * `file` is whatever the caller holds, an absolute `passage.path` or a name
 * relative to the paper's folder, and `epic` is `context.epic`: both are
 * `paperFileOf`'s, which does the comparing. For "N files outside the picked
 * parts", hand this to `focusCount`:
 * `focusCount(parts, files, (file) => fileInFocus(parts, file, epic))`.
 */
export declare function fileInFocus(parts: readonly EpicPart[], file: string, epic?: string | null): boolean;
/**
 * The sentence's two numbers: how many of these are in front of the person,
 * and how many are outside the picked parts.
 *
 * Offered so that three modules do not count three ways. `inFocus` is the
 * module's own answer per item — `refInFocus`, `partInFocus` or `fileInFocus` — and
 * `outside` is zero whenever nothing is picked, which is the cue to say
 * nothing at all.
 */
export declare function focusCount<T>(parts: readonly EpicPart[], items: readonly T[], inFocus: (item: T) => boolean): {
    shown: number;
    outside: number;
};
/**
 * ## One anchor, one rule (0.34.0)
 *
 * The three functions above are the three questions there are, and for a
 * while each module picked one and wrote the rest itself: the filter, the
 * count, the sentence, the comparison that keeps a re-sent context from
 * redrawing. Four modules did, four ways, and the others showed the whole
 * epic whatever was ticked — which is correct by the letter of this file and
 * not what a person ticking a part meant.
 *
 * So the requirement is said once, here, and it is about DATA: **every item a
 * module holds is anchored to a part by a file, a ref or a part id — or the
 * module says why it has none.** An `Anchor` is that statement for one item,
 * `anchorInFocus` is the one rule over it, and a module contributes only
 * `anchorOf(item)`. The declaration is in the manifest: `reacts: ['parts']`,
 * or `partless` with the reason. See `partsDeclaration` in `manifest.ts`.
 */
/**
 * What ties one item of a module's data to a part of the epic.
 *
 * Told apart by its one key, which is also the name of the function that
 * answers for it:
 *
 * - `{ file }` — a file of the epic's paper, absolute or relative to the
 *   paper's folder: a note, a question, a slide's citation. `fileInFocus`.
 * - `{ ref }` — a reference: a row in a list of issues, a checklist held
 *   against a pull request. `refInFocus`.
 * - `{ part }` — a part's id, for a thing that was ASSIGNED to one: a step.
 *   `partInFocus`. Null is "assigned to none".
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
 * Whether an anchored thing is in front of the person. THE rule.
 *
 * True when nothing is picked out. Otherwise true exactly when one of its
 * anchors is in a picked part, each asked of the function above that owns the
 * question. Something with no anchor is in no PICKED part: outside the focus,
 * and counted — the same answer as a step with no `part`, a ref no part lists
 * and a file no part names.
 *
 * `epic` is `context.epic`, for `fileInFocus`. Pass it.
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
 * A list, narrowed to the picked parts: the items in front, and how many are
 * not.
 *
 * `anchorOf` is the whole of what a module writes. Everything optional is in
 * `options`, under the names `useFocus().narrow` uses: `epic` is
 * `context.epic`, for a `{ file }` anchor — pass it. `keep` is for the one thing
 * a tick in another control must never do, which is take away what somebody's
 * hands are in — the note being written, the question on screen. An item it
 * answers true for is drawn though it is outside, and is still COUNTED
 * outside, because it is; `kept` says how many, so the page can say why they
 * are there.
 */
export declare function narrowToFocus<T>(parts: readonly EpicPart[], items: readonly T[], anchorOf: (item: T) => Anchors, options?: {
    epic?: string | null;
    keep?: (item: T) => boolean;
}): Narrowed<T>;
/**
 * The sentence every module says while parts are picked: how many of its
 * items are outside them, and which parts.
 *
 *     3 questions outside the picked part (The posting seam).
 *     1 note outside the 2 picked parts (The posting seam, What the tests check).
 *
 * `''` when nothing is picked, which is the cue to draw nothing. `0 … outside`
 * IS said: a focus that hides nothing today is still a focus, and it is how a
 * person sees that this pane is following their ticks.
 *
 * The wording is the Checklist module's, which is the References module's
 * (`14 outside the picked part · The posting seam`) with the noun in it and a
 * full stop — a sentence that can stand alone in a pane. `noun` is what the
 * module calls one item; give `[one, many]` where adding an `s` is wrong.
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
//# sourceMappingURL=parts.d.ts.map