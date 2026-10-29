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
/**
 * The shape of an Inbox event's id (2.31.0): lowercase letters and digits in words joined by single
 * dashes, starting with a letter. `research-complete`.
 */
export declare const EVENT_ID: RegExp;
/**
 * The sounds a host has built in, by key (2.33.0): what an Inbox event may ask to play before the
 * person chooses one (`sound` on an event). Each is a short tune a host plays the same way for any
 * kind of item or event; the person can choose another, and a host plays the item's kind's sound for
 * a key it does not have. Free strings on the wire, like `shows`: a key a later version adds parses.
 */
export declare const EVENT_SOUNDS: {
    readonly bell: "Three rising notes, bright.";
    readonly marimba: "Three notes, warm and wooden.";
    readonly pluck: "Three falling notes, soft.";
    readonly twotone: "Two notes, down a fourth.";
    readonly rising: "Four notes up an octave, insistent.";
    readonly playful: "Five quick notes, light.";
    readonly answer: "A question, then its answer: up a fifth, a step back, then the octave.";
};
export type EventSound = keyof typeof EVENT_SOUNDS;
/** The shape of a sound's key (2.33.0): a lowercase letter, then lowercase letters and digits. */
export declare const SOUND_KEY: RegExp;
/**
 * One Inbox event a module declares (2.31.0, `events`): a named case of one state that a
 * person can tell apart and give its own sound. `says` is what the host calls it ("Research
 * complete"), `state` the state an item carrying it is in. A module's own words, shown as text.
 *
 * `sound` (2.33.0) is the host's built-in sound the event plays until the person chooses one
 * (`EVENT_SOUNDS`: `answer`). Optional; absent, or a key the host does not have, plays the kind's.
 * One that does not parse is dropped and the event kept. A host before 2.33.0 strips it.
 */
export declare const inboxEventSchema: z.ZodObject<{
    id: z.ZodString;
    says: z.ZodString;
    state: z.ZodEnum<["working", "attention", "done"]>;
    sound: z.ZodCatch<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    says: string;
    state: "working" | "attention" | "done";
    sound?: string | undefined;
}, {
    id: string;
    says: string;
    state: "working" | "attention" | "done";
    sound?: unknown;
}>;
export type InboxEvent = z.infer<typeof inboxEventSchema>;
/** A manifest's events: bounded, no id twice. */
export declare const inboxEventsSchema: z.ZodEffects<z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    says: z.ZodString;
    state: z.ZodEnum<["working", "attention", "done"]>;
    sound: z.ZodCatch<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    says: string;
    state: "working" | "attention" | "done";
    sound?: string | undefined;
}, {
    id: string;
    says: string;
    state: "working" | "attention" | "done";
    sound?: unknown;
}>, "many">, {
    id: string;
    says: string;
    state: "working" | "attention" | "done";
    sound?: string | undefined;
}[], {
    id: string;
    says: string;
    state: "working" | "attention" | "done";
    sound?: unknown;
}[]>;
/**
 * The built-in sound a declared event asks to play before the person chooses one (2.33.0), or null:
 * its `sound` when this host has a sound by that key (`known`), otherwise null — the kind's sound.
 */
export declare function eventSoundOf(event: Pick<InboxEvent, 'sound'> | null | undefined, known: (key: string) => boolean): string | null;
/**
 * The declared event an item is, or null: the item names an event (`event`), the module declares one
 * by that id, and it is declared for the state the item is in. Anything else is ignored, and the item
 * is an ordinary item of its state. The one rule a host applies to `event`.
 */
export declare function declaredEvent(declared: readonly InboxEvent[] | undefined, item: {
    event?: string;
    state: ActivityState;
}): InboxEvent | null;
export declare const activityItemSchema: z.ZodEffects<z.ZodObject<{
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
    /**
     * 2.1.0. The same project's `PROJECT_ID` (`context.projectId` there), only beside `project`. A host
     * that knows the id files the item by it, ahead of the path; otherwise by `project`. A 2.0.0 host
     * strips it and files by `project`, which is why the path is required with it.
     */
    projectId: z.ZodOptional<z.ZodString>;
    /**
     * 2.31.0. Which of the module's declared Inbox events this item is (`events`): a finished
     * thing that is "Research complete", say. A host names the item by the event's `says` and may play
     * a sound of its own for it; one the manifest does not declare, or declares for another state, is
     * ignored and the item is an ordinary item of its state (`declaredEvent`). A host before 2.31.0
     * strips it. An item is still one of the states: an event names a case, it is not a new state.
     */
    event: z.ZodOptional<z.ZodString>;
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
    projectId?: string | undefined;
    event?: string | undefined;
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
    projectId?: string | undefined;
    event?: string | undefined;
}>, {
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
    projectId?: string | undefined;
    event?: string | undefined;
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
    projectId?: string | undefined;
    event?: string | undefined;
}>;
export type ActivityItem = z.infer<typeof activityItemSchema>;
/** The whole list, bounded, with no id twice. */
export declare const activityItemsSchema: z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodObject<{
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
    /**
     * 2.1.0. The same project's `PROJECT_ID` (`context.projectId` there), only beside `project`. A host
     * that knows the id files the item by it, ahead of the path; otherwise by `project`. A 2.0.0 host
     * strips it and files by `project`, which is why the path is required with it.
     */
    projectId: z.ZodOptional<z.ZodString>;
    /**
     * 2.31.0. Which of the module's declared Inbox events this item is (`events`): a finished
     * thing that is "Research complete", say. A host names the item by the event's `says` and may play
     * a sound of its own for it; one the manifest does not declare, or declares for another state, is
     * ignored and the item is an ordinary item of its state (`declaredEvent`). A host before 2.31.0
     * strips it. An item is still one of the states: an event names a case, it is not a new state.
     */
    event: z.ZodOptional<z.ZodString>;
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
    projectId?: string | undefined;
    event?: string | undefined;
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
    projectId?: string | undefined;
    event?: string | undefined;
}>, {
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
    projectId?: string | undefined;
    event?: string | undefined;
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
    projectId?: string | undefined;
    event?: string | undefined;
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
    projectId?: string | undefined;
    event?: string | undefined;
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
    projectId?: string | undefined;
    event?: string | undefined;
}[]>;
/**
 * The mark of a container that holds these items: the worst state among them, `attention` over
 * `working` over `done`; `null` for none. A host applies this, with the "seen" rule applied first
 * (a seen `done` is not an item here).
 */
export declare function worstActivity(states: Iterable<ActivityState>): ActivityState | null;
