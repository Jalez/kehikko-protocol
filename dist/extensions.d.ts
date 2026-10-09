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
}, "strip", z.ZodTypeAny, {
    message: string;
    epic: string;
    refs: string[];
    level: "done" | "info" | "attention" | "blocked";
    step?: number | undefined;
}, {
    message: string;
    epic: string;
    refs?: string[] | undefined;
    level?: "done" | "info" | "attention" | "blocked" | undefined;
    step?: number | undefined;
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
