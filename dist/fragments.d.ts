import { z } from 'zod';
/**
 * Schema fragments that more than one file spells, written once: a reference, a step number, the
 * kehikko something happened on. Nothing here is exported from the package.
 * Design notes: docs/wire.md.
 */
/** A reference like `gh#41`, `gl#340`, `gh:owner/repo#12`. The same bound wherever one appears. */
export declare const ref: z.ZodString;
/**
 * A reference a walk is aimed at. Bounded at `GOTO_REF` rather than `REF`, and
 * refused rather than clipped: a clipped ref is a different ref.
 */
export declare const gotoRef: z.ZodString;
/** A step of an epic, counted from one. */
export declare const stepNumber: z.ZodNumber;
/**
 * A kehikko — one canvas — as the wire names it: the host's number for it, what it is called, and
 * the key it keeps.
 *
 * `id` is a row number in the host's database: good for comparing while that database lives, and
 * different after the project is removed and added again, and on another machine. `key` is the one
 * to STORE: it stays through a rename, a reorder and a re-add, and is unique within the project,
 * so it is stored beside (or inside) the project. Optional, not defaulted: a host that
 * does not know the field does not send it, and a reader then has only `id`.
 */
export declare const kehikkoSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    key: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: number;
    name: string;
    key?: string | undefined;
}, {
    id: number;
    name: string;
    key?: string | undefined;
}>;
/**
 * A place to be taken to, beyond an epic (1.4.0): which parts to pick out, and which kehikko to be
 * on. `parts` are ids from `context.parts`, never names; `kehikko` is a kehikko's `key`, the identity
 * that is stored, never its row number. Both are only meaningful beside an epic.
 */
export declare const placeParts: z.ZodArray<z.ZodString, "many">;
export declare const placeKehikko: z.ZodString;
/**
 * A place, as a notification line and an activity item both carry it (1.4.0, 1.5.0): the epic, the
 * parts to pick out, the kehikko to be on. A press answers with `view.goto` carrying the same three.
 */
export declare const placeSchema: z.ZodObject<{
    epic: z.ZodOptional<z.ZodString>;
    parts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    kehikko: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    epic?: string | undefined;
    parts?: string[] | undefined;
    kehikko?: string | undefined;
}, {
    epic?: string | undefined;
    parts?: string[] | undefined;
    kehikko?: string | undefined;
}>;
/** A span of bytes whose ends are each known or not. */
interface Span {
    from: number | null;
    to: number | null;
}
/** Both ends of a span are named, or neither is: a half-range is malformed. */
export declare const bothEndsOrNeither: (span: Span) => boolean;
/** A span that names its ends ends after it starts. */
export declare const endsAfterStart: (span: Span) => boolean;
export {};
