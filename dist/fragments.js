import { z } from 'zod';
import { KEHIKKO_KEY } from './ids.js';
import { LIMITS } from './limits.js';
/**
 * Schema fragments that more than one file spells, written once: a reference, a step number, the
 * kehikko something happened on. Nothing here is exported from the package.
 * Design notes: docs/wire.md.
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
export const kehikkoSchema = z.object({
    id: z.number().int(),
    name: z.string().max(KEHIKKO_NAME),
    key: z.string().regex(KEHIKKO_KEY).optional(),
});
/** Both ends of a span are named, or neither is: a half-range is malformed. */
export const bothEndsOrNeither = (span) => (span.from === null) === (span.to === null);
/** A span that names its ends ends after it starts. */
export const endsAfterStart = (span) => span.from === null || span.to === null || span.to > span.from;
