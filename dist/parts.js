import { z } from 'zod';
import { LIMITS } from './constants.js';
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
 * Where the id comes from is the host's business, as an epic's slug is: a host
 * that finds one written beside the heading uses it, and one that does not
 * derives one from the heading. This package says only what the id looks like
 * once it is on the wire.
 */
export const PART_ID = /^[a-z0-9-]{1,80}$/;
export const partSchema = z.object({
    id: z.string().regex(PART_ID),
    /** What a person calls it. Drawn as given; never compared. */
    heading: z.string().max(LIMITS.TITLE).default(''),
    /** The references the host says belong to this part. Never absent, for the reason `showing` never is. */
    refs: z.array(z.string().min(1).max(LIMITS.REF)).max(LIMITS.PART_REFS).default([]),
    /** Whether a person has picked this part out. None picked means the whole epic. */
    picked: z.boolean().default(false),
});
/**
 * `context.parts`, as a schema of its own so a host can check the list before
 * it composes a context around it. Two parts sharing an id is not refused
 * here: this rides in a context, and one doubtful field must not cost every
 * module on the canvas its greeting. The functions below read the first.
 */
export const partsSchema = z.array(partSchema).max(LIMITS.PARTS);
/** The parts a person has picked out. Empty when the whole epic is in front of them. */
export function pickedParts(parts) {
    return parts.filter((part) => part.picked);
}
/** Whether anything is narrowed at all. False is the resting state, and the only one an older host produces. */
export function isFocused(parts) {
    return parts.some((part) => part.picked);
}
/**
 * Whether a REFERENCE is in front of the person.
 *
 * True when nothing is picked out — the whole epic is in front of them — and
 * otherwise true exactly when a picked part lists it. A reference no part
 * lists is outside every focus, and is one of the "N outside the picked
 * parts" a module should count rather than drop.
 */
export function refInFocus(parts, ref) {
    const picked = pickedParts(parts);
    if (picked.length === 0)
        return true;
    return picked.some((part) => part.refs.includes(ref));
}
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
export function partInFocus(parts, part) {
    const picked = pickedParts(parts);
    if (picked.length === 0)
        return true;
    return typeof part === 'string' && picked.some((one) => one.id === part);
}
/**
 * The sentence's two numbers: how many of these are in front of the person,
 * and how many are outside the picked parts.
 *
 * Offered so that three modules do not count three ways. `inFocus` is the
 * module's own answer per item — `refInFocus` or `partInFocus`, or both — and
 * `outside` is zero whenever nothing is picked, which is the cue to say
 * nothing at all.
 */
export function focusCount(parts, items, inFocus) {
    if (!isFocused(parts))
        return { shown: items.length, outside: 0 };
    let shown = 0;
    for (const item of items)
        if (inFocus(item))
            shown += 1;
    return { shown, outside: items.length - shown };
}
//# sourceMappingURL=parts.js.map