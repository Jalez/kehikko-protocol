import { z } from 'zod';
/**
 * Schema fragments that more than one file spells, written once.
 *
 * Nothing here is exported from the package. Each is a piece several schemas
 * share — a reference, a step number, the kehikko something happened on — and
 * a second copy of any of them is a bound that can be changed in one place and
 * forgotten in another.
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
/** A kehikko — one canvas — as the wire names it: the host's id for it, and what it is called. */
export declare const kehikkoSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: number;
    name: string;
}, {
    id: number;
    name: string;
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
//# sourceMappingURL=fragments.d.ts.map