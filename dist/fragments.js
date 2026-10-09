import { z } from 'zod';
import { LIMITS } from './limits.js';
/**
 * Schema fragments that more than one file spells, written once.
 *
 * Nothing here is exported from the package. Each is a piece several schemas
 * share — a reference, a step number, the kehikko something happened on — and
 * a second copy of any of them is a bound that can be changed in one place and
 * forgotten in another.
 */
/** A reference like `gh#41`, `gl#340`, `gh:owner/repo#12`. The same bound wherever one appears. */
export const ref = z.string().min(1).max(LIMITS.REF);
/**
 * A reference a walk is aimed at. Bounded at `GOTO_REF` rather than `REF`, and
 * refused rather than clipped: a clipped ref is a different ref.
 */
export const gotoRef = z.string().min(1).max(LIMITS.GOTO_REF);
/** The highest step number a walk or a request can name. */
const STEP_MAX = 999;
/** A step of an epic, counted from one. */
export const stepNumber = z.number().int().min(1).max(STEP_MAX);
/** The longest name a kehikko carries on the wire. */
const KEHIKKO_NAME = 80;
/** A kehikko — one canvas — as the wire names it: the host's id for it, and what it is called. */
export const kehikkoSchema = z.object({ id: z.number().int(), name: z.string().max(KEHIKKO_NAME) });
/** Both ends of a span are named, or neither is: a half-range is malformed. */
export const bothEndsOrNeither = (span) => (span.from === null) === (span.to === null);
/** A span that names its ends ends after it starts. */
export const endsAfterStart = (span) => span.from === null || span.to === null || span.to > span.from;
//# sourceMappingURL=fragments.js.map