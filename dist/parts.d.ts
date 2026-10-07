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
 */
export declare const PART_ID: RegExp;
export declare const partSchema: z.ZodObject<{
    id: z.ZodString;
    /** What a person calls it. Drawn as given; never compared. */
    heading: z.ZodDefault<z.ZodString>;
    /** The references the host says belong to this part. Never absent, for the reason `showing` never is. */
    refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Whether a person has picked this part out. None picked means the whole epic. */
    picked: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    refs: string[];
    heading: string;
    picked: boolean;
}, {
    id: string;
    refs?: string[] | undefined;
    heading?: string | undefined;
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
}, "strip", z.ZodTypeAny, {
    id: string;
    refs: string[];
    heading: string;
    picked: boolean;
}, {
    id: string;
    refs?: string[] | undefined;
    heading?: string | undefined;
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
/**
 * The sentence's two numbers: how many of these are in front of the person,
 * and how many are outside the picked parts.
 *
 * Offered so that three modules do not count three ways. `inFocus` is the
 * module's own answer per item — `refInFocus` or `partInFocus`, or both — and
 * `outside` is zero whenever nothing is picked, which is the cue to say
 * nothing at all.
 */
export declare function focusCount<T>(parts: readonly EpicPart[], items: readonly T[], inFocus: (item: T) => boolean): {
    shown: number;
    outside: number;
};
//# sourceMappingURL=parts.d.ts.map