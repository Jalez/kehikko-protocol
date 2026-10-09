import { z } from 'zod';
/**
 * A section of a document: its heading, and where it spans when known. The title identifies it
 * across edits; the byte span `from`/`to` is null when the sender does not know it, both or neither.
 */
export declare const sectionSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    title: z.ZodString;
    from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    from: number | null;
    to: number | null;
    title: string;
}, {
    title: string;
    from?: number | null | undefined;
    to?: number | null | undefined;
}>, {
    from: number | null;
    to: number | null;
    title: string;
}, {
    title: string;
    from?: number | null | undefined;
    to?: number | null | undefined;
}>, {
    from: number | null;
    to: number | null;
    title: string;
}, {
    title: string;
    from?: number | null | undefined;
    to?: number | null | undefined;
}>;
/** A heading of a document, and its span when the sender knows it. */
export type Section = z.infer<typeof sectionSchema>;
/**
 * Where in a document the reader is pointing. `from`/`to` both null: a document is open with nothing
 * selected; both numbers: a range is selected. A half-range, or `to` not greater than `from`, is
 * refused. The host relays this unchecked: every field is the pointing module's claim.
 */
export declare const passageSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    /**
     * Which document: an identity string, compared for equality. A host with a filesystem should send an
     * absolute path; nothing here checks it, so a consumer that opens it owes its own confinement check.
     */
    path: z.ZodString;
    /** Which page of it, or null when not paginated (not the same as page 1). A filter, never an anchor. */
    page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    /** The first byte of the selection within `path`, or null when nothing is selected. Bytes, not characters. */
    from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    /** One past the last byte, exclusive, or null. */
    to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    /**
     * What the selection said when it was made, as the pointing module saw it. `''` when nothing is
     * selected. Over `LIMITS.QUOTE` it is refused rather than clipped.
     */
    quoted: z.ZodDefault<z.ZodString>;
    /**
     * Which section of `path` the reader is in, or null. Where the reader is, not a selection: a reader
     * that knows its outline says it here and keeps `from`/`to` for selected text.
     */
    section: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        title: z.ZodString;
        from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        from: number | null;
        to: number | null;
        title: string;
    }, {
        title: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
    }>, {
        from: number | null;
        to: number | null;
        title: string;
    }, {
        title: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
    }>, {
        from: number | null;
        to: number | null;
        title: string;
    }, {
        title: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    path: string;
    from: number | null;
    to: number | null;
    page: number | null;
    quoted: string;
    section: {
        from: number | null;
        to: number | null;
        title: string;
    } | null;
}, {
    path: string;
    from?: number | null | undefined;
    to?: number | null | undefined;
    page?: number | null | undefined;
    quoted?: string | undefined;
    section?: {
        title: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
    } | null | undefined;
}>, {
    path: string;
    from: number | null;
    to: number | null;
    page: number | null;
    quoted: string;
    section: {
        from: number | null;
        to: number | null;
        title: string;
    } | null;
}, {
    path: string;
    from?: number | null | undefined;
    to?: number | null | undefined;
    page?: number | null | undefined;
    quoted?: string | undefined;
    section?: {
        title: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
    } | null | undefined;
}>, {
    path: string;
    from: number | null;
    to: number | null;
    page: number | null;
    quoted: string;
    section: {
        from: number | null;
        to: number | null;
        title: string;
    } | null;
}, {
    path: string;
    from?: number | null | undefined;
    to?: number | null | undefined;
    page?: number | null | undefined;
    quoted?: string | undefined;
    section?: {
        title: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
    } | null | undefined;
}>;
/** Where the reader is pointing, at whatever precision they have. */
export type Passage = z.infer<typeof passageSchema>;
