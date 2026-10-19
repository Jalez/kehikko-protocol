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
/**
 * How pressing an item is, by the module's own judgement (1.7.0). `urgent`: something is broken or
 * blocked and nothing else will proceed. `normal` (the default): waiting for an answer. `low`:
 * informational.
 */
export declare const ACTIVITY_PRIORITIES: readonly ["urgent", "normal", "low"];
export type ActivityPriority = (typeof ACTIVITY_PRIORITIES)[number];
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
    /** 1.7.0. The module's own sense of how pressing it is; absent is `normal`. A 1.6.0 host strips it. */
    priority: z.ZodOptional<z.ZodEnum<["urgent", "normal", "low"]>>;
    /** 1.7.0. Tracker refs (`gh#12`, `!7`) the item concerns, at most `LIMITS.ACTIVITY_REFS`. */
    refs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** 1.7.0. A key a host may fold repeats under ("3 tests failed"); grouping is the host's display choice. */
    group: z.ZodOptional<z.ZodString>;
    /**
     * 1.8.0. The absolute folder of the project the item belongs to, for a module whose things span
     * projects (an agent session runs in one, and is reported from a page framed in another). Absent:
     * the project the host has open. Sent only to a host that said it files by it (`activitySetResult.projects`);
     * a 1.7.0 host strips it and would file the item under the open project.
     */
    project: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
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
    priority?: "urgent" | "normal" | "low" | undefined;
    refs?: string[] | undefined;
    group?: string | undefined;
    project?: string | undefined;
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
    priority?: "urgent" | "normal" | "low" | undefined;
    refs?: string[] | undefined;
    group?: string | undefined;
    project?: string | undefined;
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
    /** 1.7.0. The module's own sense of how pressing it is; absent is `normal`. A 1.6.0 host strips it. */
    priority: z.ZodOptional<z.ZodEnum<["urgent", "normal", "low"]>>;
    /** 1.7.0. Tracker refs (`gh#12`, `!7`) the item concerns, at most `LIMITS.ACTIVITY_REFS`. */
    refs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** 1.7.0. A key a host may fold repeats under ("3 tests failed"); grouping is the host's display choice. */
    group: z.ZodOptional<z.ZodString>;
    /**
     * 1.8.0. The absolute folder of the project the item belongs to, for a module whose things span
     * projects (an agent session runs in one, and is reported from a page framed in another). Absent:
     * the project the host has open. Sent only to a host that said it files by it (`activitySetResult.projects`);
     * a 1.7.0 host strips it and would file the item under the open project.
     */
    project: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
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
    priority?: "urgent" | "normal" | "low" | undefined;
    refs?: string[] | undefined;
    group?: string | undefined;
    project?: string | undefined;
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
    priority?: "urgent" | "normal" | "low" | undefined;
    refs?: string[] | undefined;
    group?: string | undefined;
    project?: string | undefined;
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
    priority?: "urgent" | "normal" | "low" | undefined;
    refs?: string[] | undefined;
    group?: string | undefined;
    project?: string | undefined;
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
    priority?: "urgent" | "normal" | "low" | undefined;
    refs?: string[] | undefined;
    group?: string | undefined;
    project?: string | undefined;
}[]>;
/**
 * The mark of a container that holds these items: the worst state among them, `attention` over
 * `working` over `done`; `null` for none. A host applies this, with the "seen" rule applied first
 * (a seen `done` is not an item here).
 */
export declare function worstActivity(states: Iterable<ActivityState>): ActivityState | null;
