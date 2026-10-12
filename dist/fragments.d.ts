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
