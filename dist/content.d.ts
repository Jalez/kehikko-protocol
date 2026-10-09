import { z } from 'zod';
/**
 * Content: the material a container shows for an epic changed.
 *
 * A step gains a ref, a journey is edited, an epic's text is rewritten — by a
 * person in a page, by an agent through a module's MCP door, or by somebody
 * editing the project's files. Before this, every open container kept what it
 * loaded when the epic was opened, and the only way to see the change was to
 * reload the window.
 *
 * ## The signal travels, the material does not
 *
 * The same split as `trackerSignalSchema`: the context says THAT something
 * changed, whose it was and for which epic, and the module re-reads the
 * material through the door it already reads it by — `steps.list`, `epic.get`,
 * its own server. Nothing here carries a journey or an epic's text.
 *
 * ## Why a list and not the latest change
 *
 * Context is broadcast whole, and a host may fold two changes into one
 * broadcast. A single "latest change" would then lose the first of them — an
 * epic edit hidden behind the journey edit that followed it — and the module
 * showing epics would never hear. So the host keeps the last instant per
 * `(source, epic)` and sends them all, and a module compares only the entries
 * for what it shows. `contentStamp` does that comparison.
 */
/**
 * Whose material changed, when it is the host's own: the epics it keeps, which
 * is what `epics.list`, `epic.get` and `steps.list` answer from. Every other
 * source is a module id, and a module id always has a dot in it by convention,
 * so the two do not meet.
 */
export declare const CONTENT_HOST = "host";
/**
 * One source's last change for one epic.
 *
 * `source` is `CONTENT_HOST` or the id of the module whose material it is —
 * the module that keeps it, not the one that happened to notice. `epic` is the
 * epic it changed for, or null when the host cannot tell: an outside edit to a
 * file holding every epic's journeys says which module's folder moved and
 * nothing finer. A reader takes null as "any epic of this source".
 */
export declare const contentChangeSchema: z.ZodObject<{
    source: z.ZodEffects<z.ZodString, string, string>;
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    at: string;
    source: string;
    epic: string | null;
}, {
    at: string;
    source: string;
    epic?: string | null | undefined;
}>;
export type ContentChange = z.infer<typeof contentChangeSchema>;
/**
 * What travels in the context: the last change per `(source, epic)` for the
 * open project, newest kept when there are more than `LIMITS.CONTENT`.
 *
 * `[]` is the honest default — nothing has changed since the host began
 * keeping count — and is also what a host that has never heard of content
 * changes says. An entry dropped for the bound, or a host starting again with
 * an empty list, moves a module's stamp and costs it one re-read it did not
 * need; it never costs it a change.
 */
export declare const contentSignalSchema: z.ZodArray<z.ZodObject<{
    source: z.ZodEffects<z.ZodString, string, string>;
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    at: string;
    source: string;
    epic: string | null;
}, {
    at: string;
    source: string;
    epic?: string | null | undefined;
}>, "many">;
export type ContentSignal = z.infer<typeof contentSignalSchema>;
/**
 * A string that moves when, and only when, material this container shows has
 * changed: compare it with the one from the last context and re-read on a
 * difference. In React it is an effect dependency.
 *
 * `sources` are whose material the container shows — a page drawing an epic's
 * steps under a journey names `[CONTENT_HOST, 'kehikot.journeys']` — and
 * `epic` is the one it has open, or null for a container that shows every
 * epic's. An entry with `epic: null` counts for any epic.
 *
 * Re-read the one epic, keep the reader's scroll, selection and whatever they
 * had folded open, and let a burst land as one read: the stamp is the same
 * string however many broadcasts carried it.
 */
export declare function contentStamp(content: readonly ContentChange[] | undefined, about: {
    sources: readonly string[];
    epic?: string | null;
}): string;
//# sourceMappingURL=content.d.ts.map