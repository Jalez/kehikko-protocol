import { z } from 'zod';
import { LIMITS } from './limits.js';
import { bothEndsOrNeither, endsAfterStart } from './fragments.js';
/**
 * A section of a document: its heading, and where it spans when known. The title identifies it
 * across edits; the byte span `from`/`to` is null when the sender does not know it, both or neither.
 */
export const sectionSchema = z
    .object({
    title: z.string().min(1).max(LIMITS.QUOTE),
    from: z.number().int().min(0).nullable().default(null),
    to: z.number().int().min(0).nullable().default(null),
})
    .refine(bothEndsOrNeither, {
    message: 'a section names both ends of its span or neither',
})
    .refine(endsAfterStart, {
    message: 'a section ends after it starts',
});
/**
 * Where in a document the reader is pointing. `from`/`to` both null: a document is open with nothing
 * selected; both numbers: a range is selected. A half-range, or `to` not greater than `from`, is
 * refused. The host relays this unchecked: every field is the pointing module's claim.
 */
export const passageSchema = z.object({
    /**
     * Which document: an identity string, compared for equality. A host with a filesystem should send an
     * absolute path; nothing here checks it, so a consumer that opens it owes its own confinement check.
     */
    path: z.string().min(1).max(LIMITS.PATH),
    /** Which page of it, or null when not paginated (not the same as page 1). A filter, never an anchor. */
    page: z.number().int().min(1).nullable().default(null),
    /** The first byte of the selection within `path`, or null when nothing is selected. Bytes, not characters. */
    from: z.number().int().min(0).nullable().default(null),
    /** One past the last byte, exclusive, or null. */
    to: z.number().int().min(0).nullable().default(null),
    /**
     * What the selection said when it was made, as the pointing module saw it. `''` when nothing is
     * selected. Over `LIMITS.QUOTE` it is refused rather than clipped.
     */
    quoted: z.string().max(LIMITS.QUOTE).default(''),
    /**
     * Which section of `path` the reader is in, or null. Where the reader is, not a selection: a reader
     * that knows its outline says it here and keeps `from`/`to` for selected text.
     */
    section: sectionSchema.nullable().default(null),
})
    .refine(bothEndsOrNeither, {
    message: 'a passage names both ends of a selection or neither; a half-range is a malformed answer, not a coarser one',
})
    .refine(endsAfterStart, {
    message: 'a passage ends after it starts',
});
//# sourceMappingURL=passage.js.map