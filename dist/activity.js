import { z } from 'zod';
import { LIMITS } from './limits.js';
import { placeSchema } from './fragments.js';
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
