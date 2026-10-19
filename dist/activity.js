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
