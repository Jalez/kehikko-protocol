import { z } from 'zod';
/**
 * Content: the signal that the material a container shows for an epic changed. The context says
 * that something changed, whose it was and for which epic; the module re-reads the material itself.
 * Design notes: docs/content.md.
 */
/**
 * The `source` when the changed material is the host's own: the epics it keeps, which `epics.list`,
 * `epic.get` and `steps.list` answer from. Every other source is a module id.
 */
export declare const CONTENT_HOST = "host";
/**
 * The `source` when the changed material is an epic's steps, whoever provides them (2.21.0): a host
 * announces it beside the module's own id whenever a module that provides steps (`declares.provides`)
 * reports a change or rewrites its `steps.json`. A reader that shows the union `steps.list` answers
 * follows this one source instead of naming every provider: `contentStamp(content, { sources:
 * [CONTENT_STEPS], epic })`. Like `CONTENT_HOST`, a word and not a module id: module ids are reverse-DNS, with a dot.
 */
export declare const CONTENT_STEPS = "steps";
/**
 * One source's last change for one epic. `source` is `CONTENT_HOST` or the id of the module that
 * keeps the material. `epic` is null when the host cannot tell which epic; a reader takes null as
 * "any epic of this source".
 */
export declare const contentChangeSchema: z.ZodObject<{
    source: z.ZodString;
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    at: string;
    epic: string | null;
    source: string;
}, {
    at: string;
    source: string;
    epic?: string | null | undefined;
}>;
export type ContentChange = z.infer<typeof contentChangeSchema>;
/**
 * What travels in the context: the last change per `(source, epic)` for the open project, newest
 * kept when there are more than `LIMITS.CONTENT`. `[]` means nothing has changed since the host
 * began keeping count. A dropped entry costs a module one unneeded re-read, never a change.
 */
export declare const contentSignalSchema: z.ZodArray<z.ZodObject<{
    source: z.ZodString;
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    at: string;
    epic: string | null;
    source: string;
}, {
    at: string;
    source: string;
    epic?: string | null | undefined;
}>, "many">;
export type ContentSignal = z.infer<typeof contentSignalSchema>;
/**
 * A string that moves when, and only when, material this container shows has changed: compare it
 * with the last one and re-read on a difference. `sources` are whose material it shows; `epic` is
 * the one open, or null for every epic's. An entry with `epic: null` counts for any epic.
 */
export declare function contentStamp(content: readonly ContentChange[] | undefined, about: {
    sources: readonly string[];
    epic?: string | null;
}): string;
