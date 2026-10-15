import { z } from 'zod';
/**
 * What a module's things are doing right now (1.5.0): the list `activity.set` carries, and the one
 * rule a host and a module share about it. Shapes and one pure function; the drawing is the host's.
 * Design notes: docs/activity.md.
 */
/**
 * `attention`: waiting for the person. `working`: going on, nobody needed. `done`: finished, and the
 * host keeps it marked until the person has been to its place.
 */
export declare const ACTIVITY_STATES: readonly ["working", "attention", "done"];
export type ActivityState = (typeof ACTIVITY_STATES)[number];
export declare const activityItemSchema: z.ZodObject<{
    /** Stable and unique within the module: the same thing keeps its id for as long as it exists. */
    id: z.ZodString;
    state: z.ZodEnum<["working", "attention", "done"]>;
    /** A short line a person recognises the thing by. REFUSED, not clipped, when longer. */
    label: z.ZodString;
    /** Where the thing belongs; the shape `kehikot.notifications@1` and `view.goto` use. Absent: the project. */
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
    /** Milliseconds since the epoch at which the thing entered `state`. Lets a host decide "seen". */
    since: z.ZodOptional<z.ZodNumber>;
    /** A sentence for a tooltip: "waiting for a permission". */
    detail: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    state: "working" | "attention" | "done";
    label: string;
    place?: {
        epic?: string | undefined;
        parts?: string[] | undefined;
        kehikko?: string | undefined;
    } | undefined;
    since?: number | undefined;
    detail?: string | undefined;
}, {
    id: string;
    state: "working" | "attention" | "done";
    label: string;
    place?: {
        epic?: string | undefined;
        parts?: string[] | undefined;
        kehikko?: string | undefined;
    } | undefined;
    since?: number | undefined;
    detail?: string | undefined;
}>;
export type ActivityItem = z.infer<typeof activityItemSchema>;
/** The whole list, bounded, with no id twice. */
export declare const activityItemsSchema: z.ZodEffects<z.ZodArray<z.ZodObject<{
    /** Stable and unique within the module: the same thing keeps its id for as long as it exists. */
    id: z.ZodString;
    state: z.ZodEnum<["working", "attention", "done"]>;
    /** A short line a person recognises the thing by. REFUSED, not clipped, when longer. */
    label: z.ZodString;
    /** Where the thing belongs; the shape `kehikot.notifications@1` and `view.goto` use. Absent: the project. */
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
    /** Milliseconds since the epoch at which the thing entered `state`. Lets a host decide "seen". */
    since: z.ZodOptional<z.ZodNumber>;
    /** A sentence for a tooltip: "waiting for a permission". */
    detail: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    state: "working" | "attention" | "done";
    label: string;
    place?: {
        epic?: string | undefined;
        parts?: string[] | undefined;
        kehikko?: string | undefined;
    } | undefined;
    since?: number | undefined;
    detail?: string | undefined;
}, {
    id: string;
    state: "working" | "attention" | "done";
    label: string;
    place?: {
        epic?: string | undefined;
        parts?: string[] | undefined;
        kehikko?: string | undefined;
    } | undefined;
    since?: number | undefined;
    detail?: string | undefined;
}>, "many">, {
    id: string;
    state: "working" | "attention" | "done";
    label: string;
    place?: {
        epic?: string | undefined;
        parts?: string[] | undefined;
        kehikko?: string | undefined;
    } | undefined;
    since?: number | undefined;
    detail?: string | undefined;
}[], {
    id: string;
    state: "working" | "attention" | "done";
    label: string;
    place?: {
        epic?: string | undefined;
        parts?: string[] | undefined;
        kehikko?: string | undefined;
    } | undefined;
    since?: number | undefined;
    detail?: string | undefined;
}[]>;
/**
 * The mark of a container that holds these items: the worst state among them, `attention` over
 * `working` over `done`; `null` for none. A host applies this, with the "seen" rule applied first
 * (a seen `done` is not an item here).
 */
export declare function worstActivity(states: Iterable<ActivityState>): ActivityState | null;
