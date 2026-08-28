import { z } from 'zod';
import { LIMITS } from './constants.js';
import { EPIC_SLUG } from './ids.js';
/**
 * The formats modules agree on, so the panels that show them can leave.
 *
 * A host's frame is not the notification panel and not the activity chart. Both
 * of those are surfaces, and a surface is a module. What the frame keeps is the
 * one thing neither a sender nor a shower can own alone: the SHAPE of the
 * message between them.
 *
 * An extension is one such shape, named and versioned — `roadmap.notifications@1`.
 * A module that emits one is saying "here is a notification, in the form
 * everything agrees a notification takes"; a module that consumes one is saying
 * "I will show them". Neither has to know the other exists, which is the whole
 * point: something posts a notification without knowing what will draw it, and
 * the drawer draws notifications without knowing who will send them.
 *
 * ## The version is in the NAME
 *
 * `roadmap.notifications@1` and not `{ name, version }`, and this is the field
 * every consumer binds to, so it is worth saying why the version is welded into
 * the string.
 *
 * A consumer subscribes to a SHAPE. If the version is a separate field, a
 * consumer that forgot to check it accepts a payload of a shape it does not
 * understand and shows something wrong — silently, because a payload of the
 * next version usually parses as the previous one with a field missing. If the
 * version is part of the name, forgetting is not available: the name either
 * matches what the consumer registered for or it does not, and an unmatched
 * name is routed nowhere and can be said out loud.
 *
 * So a shape that quietly changed is worse than one that was replaced.
 * `roadmap.notifications@2` is a different extension, a consumer says which of
 * the two it speaks, and a module may speak both. Nothing in this package will
 * ever mutate the fields of an `@1` payload; that is the promise the number in
 * the name makes.
 */
/**
 * An epic slug, since everything here is filed against one.
 *
 * Held to the same shape every other slug is held to rather than to "some
 * text", and it is worth being clear that this is not about traversal. A
 * notification's epic is spent on a column and never joined onto a path. What
 * makes it the same rule anyway: it names an epic, it decides which epic's
 * panel a line appears under, and it is text a module chose that a person then
 * reads. A hundred thousand characters of it, or one with a right-to-left
 * override in it, is a sentence on somebody's screen that nobody wrote.
 *
 * It also arrives past the door. A method that takes an epic slug is checked at
 * the bridge; `events.emit` carries its slug INSIDE a payload, so it arrives
 * beside that check rather than through it. That is why the rule is restated
 * here rather than assumed.
 */
const epic = z.string().regex(EPIC_SLUG, 'an epic slug is lowercase letters, digits and dashes');
/** A reference like `gh#41`. The same bound wherever one appears. */
const refs = z.array(z.string().min(1).max(LIMITS.REF)).max(LIMITS.REFS).default([]);
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
export const notificationPayload = z.object({
    epic,
    message: z.string().min(1).max(LIMITS.MESSAGE),
    level: z.enum(['info', 'attention', 'done', 'blocked']).default('info'),
    refs,
    step: z.number().int().min(1).optional(),
});
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
export const callPayload = z.object({
    /** What was called, as a person would name it: `api.github.com`, `tectonic`. */
    target: z.string().min(1).max(LIMITS.PROJECT),
    ok: z.boolean(),
    /** How long it took. Bounded at an hour, which is longer than anything worth charting. */
    ms: z.number().int().min(0).max(3_600_000),
    /** Optional, for a call that concerns particular work. */
    refs,
    /** Free, short, and only worth showing when the call failed. */
    why: z.string().max(LIMITS.SUMMARY).default(''),
});
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
export const EXTENSIONS = {
    'roadmap.notifications@1': {
        about: 'Say what it did, and on which issues or changes — a line on a notification panel.',
        payload: notificationPayload,
    },
    'roadmap.calls@1': {
        about: 'Report the calls it makes to the outside, so an activity chart covers more than the host.',
        payload: callPayload,
    },
};
export const EXTENSION_NAMES = Object.keys(EXTENSIONS);
/** A name this version of the protocol can check, which is the only kind worth accepting. */
export function known(extension) {
    return Object.hasOwn(EXTENSIONS, extension);
}
/**
 * The schema for one extension, or nothing.
 *
 * A reading, not a router. It hands back a schema; whether the payload is then
 * delivered, to whom, and under whose name are all decisions, and all of them
 * belong to whoever is doing the delivering.
 */
export function schemaFor(extension) {
    return Object.hasOwn(EXTENSIONS, extension) ? EXTENSIONS[extension]?.payload : undefined;
}
//# sourceMappingURL=extensions.js.map