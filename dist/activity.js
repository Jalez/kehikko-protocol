import { z } from 'zod';
import { LIMITS } from './limits.js';
import { placeSchema, ref } from './fragments.js';
import { PROJECT_ID } from './ids.js';
/**
 * What a module's things are doing right now (1.5.0): the list `activity.set` carries, and the one
 * rule a host and a module share about it. Shapes and one pure function; the drawing is the host's.
 * Design notes: docs/activity.md.
 */
/**
 * `attention`: waiting for the person. `working`: going on, nobody needed. `done`: finished, and the
 * host keeps it marked until the person has been to its place.
 */
export const ACTIVITY_STATES = ['working', 'attention', 'done'];
/**
 * How pressing an item is, by the module's own judgement (1.7.0). `urgent`: something is broken or
 * blocked and nothing else will proceed. `normal` (the default): waiting for an answer. `low`:
 * informational.
 */
export const ACTIVITY_PRIORITIES = ['urgent', 'normal', 'low'];
/**
 * The shape of an Inbox event's id (2.31.0): lowercase letters and digits in words joined by single
 * dashes, starting with a letter. `research-complete`.
 */
export const EVENT_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
/**
 * The sounds a host has built in, by key (2.33.0): what an Inbox event may ask to play before the
 * person chooses one (`sound` on an event). Each is a short tune a host plays the same way for any
 * kind of item or event; the person can choose another, and a host plays the item's kind's sound for
 * a key it does not have. Free strings on the wire, like `shows`: a key a later version adds parses.
 */
export const EVENT_SOUNDS = {
    bell: 'Three rising notes, bright.',
    marimba: 'Three notes, warm and wooden.',
    pluck: 'Three falling notes, soft.',
    twotone: 'Two notes, down a fourth.',
    rising: 'Four notes up an octave, insistent.',
    playful: 'Five quick notes, light.',
    answer: 'A question, then its answer: up a fifth, a step back, then the octave.',
};
/** The shape of a sound's key (2.33.0): a lowercase letter, then lowercase letters and digits. */
export const SOUND_KEY = /^[a-z][a-z0-9]*$/;
/**
 * One Inbox event a module declares (2.31.0, `events`): a named case of one state that a
 * person can tell apart and give its own sound. `says` is what the host calls it ("Research
 * complete"), `state` the state an item carrying it is in. A module's own words, shown as text.
 *
 * `sound` (2.33.0) is the host's built-in sound the event plays until the person chooses one
 * (`EVENT_SOUNDS`: `answer`). Optional; absent, or a key the host does not have, plays the kind's.
 * One that does not parse is dropped and the event kept. A host before 2.33.0 strips it.
 */
export const inboxEventSchema = z.object({
    id: z.string().max(LIMITS.EVENT_ID).regex(EVENT_ID, 'an event id is lowercase letters, digits and single dashes'),
    says: z.string().trim().min(1).max(LIMITS.EVENT_SAYS),
    state: z.enum(ACTIVITY_STATES),
    sound: z.string().max(LIMITS.SOUND_KEY).regex(SOUND_KEY).optional().catch(undefined),
});
/** A manifest's events: bounded, no id twice. */
export const inboxEventsSchema = z
    .array(inboxEventSchema)
    .max(LIMITS.EVENTS)
    .refine((events) => new Set(events.map((one) => one.id)).size === events.length, {
    message: 'an event is declared once',
});
/**
 * The built-in sound a declared event asks to play before the person chooses one (2.33.0), or null:
 * its `sound` when this host has a sound by that key (`known`), otherwise null — the kind's sound.
 */
export function eventSoundOf(event, known) {
    const key = event?.sound;
    return key && known(key) ? key : null;
}
/**
 * The declared event an item is, or null: the item names an event (`event`), the module declares one
 * by that id, and it is declared for the state the item is in. Anything else is ignored, and the item
 * is an ordinary item of its state. The one rule a host applies to `event`.
 */
export function declaredEvent(declared, item) {
    if (!item.event || !declared)
        return null;
    const found = declared.find((one) => one.id === item.event);
    return found && found.state === item.state ? found : null;
}
export const activityItemSchema = z.object({
    /** Stable and unique within the module: the same thing keeps its id for as long as it exists. */
    id: z.string().min(1).max(LIMITS.ACTIVITY_ID),
    state: z.enum(ACTIVITY_STATES),
    /** A short line a person recognises the thing by. REFUSED, not clipped, when longer. */
    label: z.string().max(LIMITS.ACTIVITY_LABEL),
    /** Where the thing belongs; the shape `kehikot.notifications@1` and `view.goto` use. Absent: the project. */
    place: placeSchema.optional(),
    /** Milliseconds since the epoch at which the thing entered `state`. Lets a host decide "seen". */
    since: z.number().int().min(0).optional(),
    /** A sentence for a tooltip: "waiting for a permission". */
    detail: z.string().max(LIMITS.ACTIVITY_DETAIL).optional(),
    /** 1.7.0. The module's own sense of how pressing it is; absent is `normal`. A 1.6.0 host strips it. */
    priority: z.enum(ACTIVITY_PRIORITIES).optional(),
    /** 1.7.0. Tracker refs (`gh#12`, `!7`) the item concerns, at most `LIMITS.ACTIVITY_REFS`. */
    refs: z.array(ref).max(LIMITS.ACTIVITY_REFS).optional(),
    /** 1.7.0. A key a host may fold repeats under ("3 tests failed"); grouping is the host's display choice. */
    group: z.string().min(1).max(LIMITS.ACTIVITY_GROUP).optional(),
    /**
     * 1.8.0. The absolute folder of the project the item belongs to, for a module whose things span
     * projects (an agent session runs in one, and is reported from a page framed in another). Absent:
     * the project the host has open. Sent only to a host that said it files by it (`activitySetResult.projects`);
     * a 1.7.0 host strips it and would file the item under the open project.
     */
    project: z.string().min(1).max(LIMITS.ACTIVITY_PROJECT).refine((path) => path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path), { message: 'an activity item’s project is an absolute folder' }).optional(),
    /**
     * 2.1.0. The same project's `PROJECT_ID` (`context.projectId` there), only beside `project`. A host
     * that knows the id files the item by it, ahead of the path; otherwise by `project`. A 2.0.0 host
     * strips it and files by `project`, which is why the path is required with it.
     */
    projectId: z.string().regex(PROJECT_ID).optional(),
    /**
     * 2.31.0. Which of the module's declared Inbox events this item is (`events`): a finished
     * thing that is "Research complete", say. A host names the item by the event's `says` and may play
     * a sound of its own for it; one the manifest does not declare, or declares for another state, is
     * ignored and the item is an ordinary item of its state (`declaredEvent`). A host before 2.31.0
     * strips it. An item is still one of the states: an event names a case, it is not a new state.
     */
    event: z.string().max(LIMITS.EVENT_ID).regex(EVENT_ID, 'an event id is lowercase letters, digits and single dashes').optional(),
}).refine((item) => item.projectId === undefined || item.project !== undefined, {
    message: 'an activity item that names its project’s id names its folder too (`project`)',
    path: ['project'],
});
/** The whole list, bounded, with no id twice. */
export const activityItemsSchema = z
    .array(activityItemSchema)
    .max(LIMITS.ACTIVITY_ITEMS)
    .refine((items) => new Set(items.map((item) => item.id)).size === items.length, {
    message: 'activity items have to have distinct ids',
});
const RANK = { attention: 3, working: 2, done: 1 };
/**
 * The mark of a container that holds these items: the worst state among them, `attention` over
 * `working` over `done`; `null` for none. A host applies this, with the "seen" rule applied first
 * (a seen `done` is not an item here).
 */
export function worstActivity(states) {
    let worst = null;
    for (const state of states)
        if (worst === null || RANK[state] > RANK[worst])
            worst = state;
    return worst;
}
