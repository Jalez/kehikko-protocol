import { z } from 'zod';
/**
 * `kehikot.notifications@1` — a line on a notification panel: what happened, and on which work
 * (`refs`). There is no field for who sent it, and there must never be: the side doing the showing
 * states the by-line.
 */
export declare const notificationPayload: z.ZodObject<{
    epic: z.ZodString;
    message: z.ZodString;
    level: z.ZodDefault<z.ZodEnum<["info", "attention", "done", "blocked"]>>;
    refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    step: z.ZodOptional<z.ZodNumber>;
    /**
     * 1.4.0. Where a press on this line goes, more exactly than `epic` alone: parts to pick out
     * (`context.parts` ids) and the kehikko to be on (its `key`). A panel answers a press with
     * `view.goto` carrying the same three. Optional: a line without it goes to its epic as before, and
     * a reader before 1.4.0 strips it.
     */
    place: z.ZodOptional<z.ZodObject<{
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
    }>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    epic: string;
    refs: string[];
    level: "done" | "info" | "attention" | "blocked";
    step?: number | undefined;
    place?: {
        epic?: string | undefined;
        parts?: string[] | undefined;
        kehikko?: string | undefined;
    } | undefined;
}, {
    message: string;
    epic: string;
    refs?: string[] | undefined;
    level?: "done" | "info" | "attention" | "blocked" | undefined;
    step?: number | undefined;
    place?: {
        epic?: string | undefined;
        parts?: string[] | undefined;
        kehikko?: string | undefined;
    } | undefined;
}>;
export type NotificationPayload = z.infer<typeof notificationPayload>;
/**
 * `kehikot.calls@1` — one call somebody made, whether or not the host made it: a module reporting
 * its own traffic. Reported, not intercepted; whether a row was reported or observed is stated by
 * the recorder and is not a field here.
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
    why: string;
    refs: string[];
    target: string;
    ok: boolean;
    ms: number;
}, {
    target: string;
    ok: boolean;
    ms: number;
    why?: string | undefined;
    refs?: string[] | undefined;
}>;
export type CallPayload = z.infer<typeof callPayload>;
export interface ExtensionFormat {
    /** One line saying what a module speaking this is doing. */
    about: string;
    payload: z.ZodTypeAny;
}
/**
 * The formats this version of the protocol describes. A plain object: look names up with `known()`
 * or `Object.hasOwn`, never `EXTENSIONS[name]`. A host may know formats that are not in here, but
 * must not accept a payload for a name it cannot check.
 */
export declare const EXTENSIONS: Record<string, ExtensionFormat>;
export declare const EXTENSION_NAMES: string[];
/**
 * A name this version of the protocol can check, which is the only kind worth accepting. Exact:
 * the name as `EXTENSIONS` spells it.
 */
export declare function known(extension: string): boolean;
/**
 * The schema for one extension, or `undefined` for a name this version does not know. A reading,
 * not a router: delivery, to whom and under whose name, belongs to whoever is delivering.
 */
export declare function schemaFor(extension: string): z.ZodTypeAny | undefined;
