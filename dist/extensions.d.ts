import { z } from 'zod';
/**
 * `roadmap.notifications@1` — a line on a notification panel: what happened,
 * and on which work.
 *
 * `refs` is the field that earns the whole extension. A line saying a module
 * did something is a log entry; the same line naming the change it did it to is
 * an entry ON that change, and can be shown beside that change by something
 * that understands nothing else about the sender. That is why `refs` is in the
 * shape rather than in each sender's own prose.
 *
 * There is no field for who sent it, and there must never be. A by-line is
 * stated by the side doing the showing, out of who it knows the sender to be. A
 * sender choosing its own by-line is how a sentence nobody said ends up on a
 * page under somebody else's name.
 */
export declare const notificationPayload: z.ZodObject<{
    epic: z.ZodString;
    message: z.ZodString;
    level: z.ZodDefault<z.ZodEnum<["info", "attention", "done", "blocked"]>>;
    refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    step: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    message: string;
    epic: string;
    level: "info" | "attention" | "done" | "blocked";
    refs: string[];
    step?: number | undefined;
}, {
    message: string;
    epic: string;
    level?: "info" | "attention" | "done" | "blocked" | undefined;
    refs?: string[] | undefined;
    step?: number | undefined;
}>;
export type NotificationPayload = z.infer<typeof notificationPayload>;
/**
 * `roadmap.calls@1` — one call somebody made, whether or not the host made it.
 *
 * A host records its own outbound calls already, and counts every question a
 * module asks it. What it cannot see is a module's own traffic — a module
 * compiling against a typesetting service, a module reading an API of its own —
 * and "what is this machine doing, and how much of it is us" is exactly the
 * question an activity chart exists to answer. So a module may report its own,
 * in the same shape, into the same chart.
 *
 * Reported, not intercepted. Nothing can see a module's network traffic, and a
 * module that does not report has not lied — it has said nothing. Worth being
 * plain about, because a chart that looks complete and is not is the kind of
 * thing this protocol refuses everywhere else. Whoever draws one should be able
 * to say which rows are reported and which are observed, which is why the
 * distinction is stated by the RECORDER and is not a field here: a `kind` a
 * module could set would be a module deciding whether its own failures were
 * counted as its own.
 */
export declare const callPayload: z.ZodObject<{
    /** What was called, as a person would name it: `api.github.com`, `tectonic`. */
    target: z.ZodString;
    ok: z.ZodBoolean;
    /** How long it took. Bounded at an hour, which is longer than anything worth charting. */
    ms: z.ZodNumber;
    /** Optional, for a call that concerns particular work. */
    refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Free, short, and only worth showing when the call failed. */
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    refs: string[];
    target: string;
    ok: boolean;
    ms: number;
    why: string;
}, {
    target: string;
    ok: boolean;
    ms: number;
    refs?: string[] | undefined;
    why?: string | undefined;
}>;
export type CallPayload = z.infer<typeof callPayload>;
export interface ExtensionFormat {
    /** One line saying what a module speaking this is doing. */
    about: string;
    payload: z.ZodTypeAny;
}
/**
 * The formats this version of the protocol describes.
 *
 * A plain object, and therefore the same lookup hazard as everywhere else: an
 * extension name is a string a module chose, and `EXTENSIONS[name]` finds
 * something on the prototype when the name is `constructor`. `known()` below
 * asks properly; so should anything that indexes this directly.
 *
 * A host is free to know formats that are not in here, and a module is free to
 * name one — see the note on `manifest.extensions`. What a host must not do is
 * accept a payload for a name it cannot check, because an event delivered
 * unvalidated is one a future consumer has to distrust.
 */
export declare const EXTENSIONS: Record<string, ExtensionFormat>;
export declare const EXTENSION_NAMES: string[];
/** A name this version of the protocol can check, which is the only kind worth accepting. */
export declare function known(extension: string): boolean;
/**
 * The schema for one extension, or nothing.
 *
 * A reading, not a router. It hands back a schema; whether the payload is then
 * delivered, to whom, and under whose name are all decisions, and all of them
 * belong to whoever is doing the delivering.
 */
export declare function schemaFor(extension: string): z.ZodTypeAny | undefined;
//# sourceMappingURL=extensions.d.ts.map