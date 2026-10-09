import { z } from 'zod';
import { MESSAGE, MESSAGE_PREFIXES, PROTOCOL } from './constants.js';
import { LIMITS } from './limits.js';
import { canonicalName, legacyName } from './dialect.js';
import { EPIC_SLUG, MODULE_ID } from './ids.js';
import { contextSchema } from './context.js';
import { filterGroupSchema } from './filters.js';
import { gotoRef, kehikkoSchema, stepNumber } from './fragments.js';
/**
 * Everything the two sides say to each other.
 *
 * A module's page runs in a frame the host created, cross-origin to it, and the
 * only channel between them is `postMessage`. That is a good channel and a
 * narrow one: nothing structural stops either side from sending anything, so
 * every field below is a thing somebody else's program chose, and the shapes
 * here exist to make it cheap to say no to the ones that are wrong.
 *
 * ## Addressing, which is not this package's problem but is worth knowing
 *
 * A module without `declares.storage` runs on an opaque origin. It has no
 * origin string, so there is no `targetOrigin` that matches it and everything
 * it sends arrives with an origin of `"null"` — a string every opaque frame in
 * every tab shares, which is why it can only ever be a shape check and never an
 * identity one. The identity is the window: the exact frame handle the host
 * created and greeted, which nothing in the page and nothing in the frame can
 * forge. A module WITH storage has an origin, and then there is a second thing
 * to check as well as the window.
 *
 * None of that is modelled here, because none of it is a shape. It is written
 * down because a client library reading these schemas has to get it right and
 * the schemas will not tell it.
 *
 * ## Parse both directions
 *
 * A host validating what a module sends is obvious. A module validating what
 * the host sends is not, and is the same rule: a framed page receives every
 * message posted at its window, from the host, from a bundler's dev socket,
 * from anything else that has a handle on it. The type check is what tells a
 * `kehikot.context` from a coincidence.
 */
/**
 * A message type, read in either spelling and handed back in the current one.
 *
 * Every message schema below uses this for its `type`, so a host built
 * against this package reads `roadmap.ready` from a module that has not been
 * updated, and a module built against it reads `roadmap.hello` from a host
 * that has not been. Downstream of a parse there is only the `kehikot.`
 * spelling, and code comparing `message.type === MESSAGE.READY` is right for
 * both. Sending in the old spelling is `toDialect`'s job; see `dialect.ts`.
 */
function messageType(type) {
    return z.union([z.literal(type), z.literal(legacyName(type))]).transform(() => type);
}
/** The id correlating a question with its answer, or a `goto` with its `went`. */
const correlation = z.string().min(1).max(LIMITS.CORRELATION);
/**
 * What a module currently offers to be narrowed by. The whole offer, every time.
 *
 * Replacing rather than merging, and the difference is the one that matters
 * when a module's options CHANGE: a merge could never remove a group, so a
 * module that stopped offering something would leave a control behind it that a
 * person could press and nothing would answer. An empty array is a real message
 * — "nothing here can be narrowed now" — and a host that receives one takes the
 * control away.
 *
 * A module sends this whenever the answer changes, which includes whenever the
 * words change. See `filterOptionSchema` on why the count lives in the label.
 */
export const filtersSchema = z.object({
    type: messageType(MESSAGE.FILTERS),
    groups: z
        .array(filterGroupSchema)
        .max(LIMITS.FILTER_GROUPS)
        .refine((groups) => new Set(groups.map((g) => g.id)).size === groups.length, {
        message: 'two groups cannot share an id',
    }),
});
/* ------------------------------------------------------------------------ *
 * Clearing: a module offering to delete what it is showing
 * ------------------------------------------------------------------------ */
/**
 * What a module offers to clear, in its own words. The whole offer, every time.
 *
 * A `label` and nothing else, and the emptiness of that is the same discipline
 * `filterOptionSchema` keeps: no count field, no icon, no severity, no "kind",
 * and above all no list of what would go. The host draws a control and reports
 * a press. What "shown" means, what is behind it, and how much of it there is
 * are the module's business, and a host that was told any of it would be a host
 * that could be updated every time a module has a new idea about its own data.
 *
 * ## The count rides in the label, as it does for a filter
 *
 * `clear 12 shown` is one string. It has to be one string, because the number
 * is the whole reason a person reads this control before pressing it — it is
 * how they discover that their filter narrowed things to three rather than
 * thirty, which is the difference between the press they meant and the press
 * they did not. A separate count field would be this package deciding how a
 * count is phrased, for a module that knows better and whose interesting
 * number is sometimes not a number (`everything from this run`).
 *
 * ## `null` is a real message, and it is the withdrawal
 *
 * It says there is nothing on screen to clear now. The host takes the control
 * away rather than leaving a button that deletes nothing — a button whose press
 * has no effect teaches a person that the button does not work, which they will
 * remember on the day it would have. It is the exact counterpart of `filters`
 * sending an empty `groups`, and it exists for the same reason: whole
 * replacement is what lets an offer be taken back.
 *
 * A module re-announces whenever the words change, which — because the words
 * carry a count — is whenever what it shows changes. Including immediately
 * after it has been asked to clear, which is the only feedback loop this
 * feature has and the only one it needs.
 */
export const clearableSchema = z.object({
    type: messageType(MESSAGE.CLEARABLE),
    /** The words on the control, or `null` to take the control away. */
    label: z.string().min(1).max(LIMITS.CLEAR_LABEL).nullable().default(null),
});
/**
 * The press, relayed. "Clear what you are showing."
 *
 * Deliberately empty apart from its type, and every field somebody will want to
 * add to it is a field that would break the feature.
 *
 * **Not a list of what to delete**, because the host does not know and must not
 * find out. **Not the filter choice**, because the module already has that from
 * `kehikot.context` and a second copy would be a second answer to one question,
 * arriving on its own schedule and disagreeing after any race. **Not a
 * correlation id**, because there is no answer: see `MESSAGE.CLEAR` for why an
 * acknowledgement would only tempt a host into reporting a number it did not
 * count.
 *
 * `protocol` rides along as it does on every other host message, so a module
 * can tell which host it is talking to without keeping the greeting.
 */
export const clearSchema = z.object({
    type: messageType(MESSAGE.CLEAR),
    protocol: z.number().int().min(1),
});
/* ------------------------------------------------------------------------ *
 * Refreshing: a module offering to read its material again
 * ------------------------------------------------------------------------ */
/**
 * What a module says about being refreshed. The whole state, every time.
 *
 * Three fields and no fourth, and the discipline is `clearableSchema`'s: no
 * count of what would be read, no description of where from, no error, no
 * interval. The host draws a control, reports a press, and formats one
 * timestamp it was handed.
 *
 * ## `at` is the only fact in this protocol a host would otherwise guess
 *
 * The essay on `MESSAGE.REFRESHABLE` is the long form and it is worth having
 * the short one here, beside the field: the host knows when it ASKED, and when
 * it asked is not when the data is from. A module may answer out of a cache, a
 * refresh may fail over a reading it keeps showing, and a module may refresh
 * itself for a reason the host has no view of. In all three a host that dated
 * the data from its own message would print a time that is wrong beside data
 * that is older than it says.
 *
 * So it is an ISO 8601 instant, with an offset, from the module — and `null` is
 * a real answer meaning "I cannot say", for which a host draws no time at all
 * rather than inventing one. A module that has never successfully read anything
 * sends `null` and keeps sending it.
 *
 * ## `can` is how the control is withdrawn, and it is not `busy`
 *
 * `false` takes the control away: there is nothing to refresh right now — no
 * project, no document, nothing this module could read again — and a button
 * that cannot work teaches a person that the button does not work, which they
 * will remember on the day it would have. It is the counterpart of `clearable`
 * sending `null` and of `filters` sending an empty `groups`.
 *
 * `busy` leaves the control there and says a read is in flight. Two presses
 * racing is two subprocesses and one answer that wins for no reason anybody
 * could predict, and the module is the only side that knows.
 *
 * A module re-announces whenever any of the three changes, which is at least
 * twice per refresh — `busy: true` on the way in, a new `at` on the way out —
 * and that is the whole of the feedback this feature has.
 */
export const refreshableSchema = z.object({
    type: messageType(MESSAGE.REFRESHABLE),
    /** Whether there is anything to read again right now. `false` withdraws the control. */
    can: z.boolean().default(true),
    /** When this module's material was last read, as the MODULE knows it. */
    at: z.string().datetime({ offset: true }).nullable().default(null),
    /** Whether a read is in flight this second. */
    busy: z.boolean().default(false),
});
/**
 * The press, relayed. "Read your material again."
 *
 * Empty apart from its envelope, exactly like `clearSchema`, and every field
 * somebody will want to add is one that would break it.
 *
 * **Not why.** A person pressed the button, or an interval elapsed; the module
 * cannot tell and must not need to, because a flag saying "this one was
 * automatic" would be used to behave differently and that is the module setting
 * policy from a fact about somebody else's timer.
 *
 * **Not the interval**, because the host runs the clock — see `MESSAGE.REFRESH`
 * — and a module told the number would be a module tempted to run a second
 * timer beside it.
 *
 * **Not a correlation id**, because there is no answer. What comes back is a
 * new `kehikot.refreshable`: `busy` while it runs, then a new `at`. An
 * acknowledgement would only tempt a host into reporting on work it cannot see.
 */
export const refreshSchema = z.object({
    type: messageType(MESSAGE.REFRESH),
    protocol: z.number().int().min(1),
});
/* ------------------------------------------------------------------------ *
 * Host → module
 * ------------------------------------------------------------------------ */
/**
 * Hello: the whole of what a module is given without asking.
 *
 * Sent on every frame LOAD, not on the first one only: a frame that reloads
 * itself has forgotten the conversation, and greeting it again is cheaper than
 * either side wondering. And sent on load rather than on a timer, because a
 * guess long enough to be safe is a guess a slow machine still loses, and a
 * module greeted before its own script ran is one that never hears the
 * greeting.
 *
 * `protocol` is the host's answer — what the two sides settled on when the
 * manifest was read — and not either half's opinion of it.
 *
 * `session` names this conversation so a module can tell a reload from a second
 * frame. It is not a credential and must never become one: a module holds no
 * token, and every question it asks is checked by the host on the host's own
 * terms rather than against anything it was handed here. A session id that
 * unlocked something would be a secret sitting in a frame that any script in
 * that frame can read.
 *
 * The context rides along because the first thing every module wants is which
 * epic is open, and a second round trip to learn it is a round trip for
 * nothing.
 *
 * There is no list of permissions in the greeting. There was, in an earlier
 * design where a person answered a dialog; there is nothing to list now, and a
 * field here saying what a module "may" do would be this package modelling an
 * approval it has no business modelling.
 */
export const helloSchema = z.object({
    type: messageType(MESSAGE.HELLO),
    protocol: z.number().int().min(1),
    session: z.string().min(1).max(LIMITS.SESSION),
    context: contextSchema,
    /**
     * Whatever this module last asked the host to keep for it, verbatim.
     *
     * Beside the context rather than inside it, and that placement is the whole
     * point: context is broadcast to every framed module, and this belongs to one
     * of them. A module's remembered state travelling in a shared message would
     * be every module reading every other module's preferences.
     *
     * `null` when the host keeps nothing for it — a first run, a host that does
     * not answer `state.set`, a module that has never written any. It is not
     * optional, because a module has to be able to tell "nothing kept" from "the
     * field is missing because this host is older than the idea", and only one of
     * those means it should draw its defaults with confidence.
     *
     * In the GREETING rather than fetched, so a module has it before its first
     * render. Asking for it afterwards would mean drawing the wrong filter first
     * and correcting it, which is the visible-flicker failure in a different
     * costume.
     *
     * Opaque. The host stored a string and hands the same string back; see
     * `state.set` in `methods.ts` for why it must never learn what is in it.
     */
    state: z.string().max(LIMITS.MODULE_STATE).nullable().default(null),
});
/**
 * Which epic is open now.
 *
 * Sent when the reader switches epics and when the module's own tab is
 * shown. Flat rather than wrapping a `context` object, which is an
 * inconsistency with `hello` and is kept because it is what both halves already
 * speak — the same fields, one level up. `contextSchema` is the shared
 * definition either way, so the two cannot drift apart in what they carry.
 *
 * Only epic-scoped modes are told. A `global` mode asked for one page over the
 * whole canvas and gets one.
 */
export const contextMessageSchema = contextSchema.extend({
    type: messageType(MESSAGE.CONTEXT),
    protocol: z.number().int().min(1),
});
/**
 * The answer to exactly one request.
 *
 * Two shapes under one type, and the split is the point: a caller either got
 * data or got a refusal, and a single object with four optional fields makes
 * that a thing to work out rather than a thing to branch on.
 *
 * A refusal carries BOTH halves, always. `reason` is a word from a closed set,
 * for the program: "ask again later" and "never, this method does not exist"
 * are different futures and code has to be able to tell them apart without
 * reading English. `error` is a sentence, for the person: whoever is writing
 * the module reads it in their own console and has to know which of their calls
 * was wrong. Neither substitutes for the other. A reason with no sentence is a
 * developer bisecting their own code to find out what happened; a sentence with
 * no reason is a client parsing prose.
 */
export const responseFailureReasons = ['unknown-module', 'unknown-method', 'failed'];
/**
 * Three reasons, and there used to be four.
 *
 * `not-allowed` is gone with the permission system it described. What remains
 * are: this host has no module by that name (which is a module talking to a
 * host that has forgotten it, usually after being removed while its frame was
 * still open); this host has no such method (which is a module built against a
 * protocol this host no longer speaks, and is the one refusal an author should
 * treat as fatal); and it went wrong (which is everything else, and is the only
 * one worth retrying).
 *
 * A host may of course refuse a call for reasons of its own — that is the whole
 * of what a host is for. It says so with `failed` and a sentence. Adding a
 * reason per policy would be this package enumerating hosts' policies, which is
 * a list that cannot be kept and would read as the set of policies allowed.
 */
export const responseSchema = z.discriminatedUnion('ok', [
    z.object({
        type: messageType(MESSAGE.RESPONSE),
        id: correlation,
        ok: z.literal(true),
        /**
         * Whatever the method answers with, and deliberately untyped. See the note
         * at the top of `methods.ts`: a client that asserted a shape here would be
         * asserting something no host promised.
         */
        data: z.unknown(),
    }),
    z.object({
        type: messageType(MESSAGE.RESPONSE),
        id: correlation,
        ok: z.literal(false),
        reason: z.enum(responseFailureReasons),
        /**
         * Bounded, because a refusal is the one place a host quotes a module's own
         * text back at it — the method name it asked for, the extension it named —
         * and a sentence that carried two hundred thousand characters of that back
         * across the frame would be a module's document, round-tripped, at the
         * module's own request. Long enough for every sentence anybody actually
         * writes; short enough that no answer is ever a document.
         */
        error: z.string().max(LIMITS.REASON).default(''),
    }),
]);
/**
 * Go to a reference.
 *
 * ## Why this message is the interesting one
 *
 * A host walks a reader to a reference by reaching into the panel: query for
 * the anchor, open whatever is folded above it, scroll it to the middle, flash
 * it. That works while the panel is part of the host's own page and stops
 * working entirely the moment the panel is a module, because the frame is
 * cross-origin, its document is unreachable, and there is no way to reach in.
 *
 * There is a fallback that needs no protocol at all — set the frame's location
 * to `#epic=x&ref=y`, which a page may do cross-origin — and it costs a
 * navigation: the document reloads and the handshake happens again. That is why
 * it is the fallback and this is the message.
 *
 * `ref` is a reference as the host spells them. `step` is 1-based. `epic` is
 * optional and means "switch first", which the host would ordinarily have sent
 * as context anyway. The bounds — `GOTO_REF`, 1..999, the slug pattern — are
 * not invented here: they are what the receiving end already imposes, restated
 * so the sender knows what will survive.
 *
 * `id` is required, and it is the reason this message needed designing rather
 * than just writing down. See `wentSchema`.
 *
 * The mirror of this message is the `view.goto` method, which is a module
 * asking for the same act. The fields are named the same on both sides
 * deliberately. They differ in exactly one way, and it is the direction of the
 * asking: a `goto` naming only an epic is refused here, because a host with
 * nothing to say but "this epic" says it as context; a `view.goto` naming only
 * an epic is the commonest ask a module has.
 */
export const gotoSchema = z
    .object({
    type: messageType(MESSAGE.GOTO),
    id: correlation,
    ref: gotoRef.optional(),
    step: stepNumber.optional(),
    epic: z.string().regex(EPIC_SLUG).optional(),
})
    .refine((g) => g.ref !== undefined || g.step !== undefined, {
    message: 'a goto has to name a ref or a step; an epic alone only says which epic',
});
/**
 * An extension payload one module emitted, delivered to a module that consumes
 * that format.
 *
 * ## Why the host is in the middle at all
 *
 * The sender does not name a recipient and cannot: a module has no way to know
 * what else is on the canvas, and giving it one would end modularity. It names
 * a FORMAT — `kehikot.notifications@1` — and the host works out who has said,
 * in their manifest, that they consume it. So a module emits into the room and
 * the room decides who hears, which is why either can be removed without the
 * other noticing.
 *
 * ## What the host vouches for, and what it does not
 *
 * `extension` and `payload` were checked before this was sent: the host knew
 * the format and validated the payload against that format's own schema, so a
 * receiver is entitled to assume the shape.
 *
 * `from` is the id of the module that emitted it, taken from the host's own
 * registry rather than from anything the sender said, so it cannot be forged by
 * a module claiming to be another. It is the one field a receiver may safely
 * attribute by.
 *
 * The CONTENTS are the sender's claim and nothing more. A notification saying
 * "the tests passed" is one module's word for it; a host relaying it has not
 * checked that any test ran. A receiver drawing it should attribute it, for the
 * same reason `selection` carries refs and not kinds.
 *
 * ## Not answered, ever
 *
 * No correlation id and no reply. A module that ignores every event it is sent
 * is a conforming module, and a host that waited for acknowledgement could be
 * hung by a pane nobody is looking at. Delivery is best-effort by design: an
 * event sent to a module that is still loading is lost, and a receiver that
 * needs history should keep its own rather than expect the wire to hold it.
 */
export const eventSchema = z.object({
    type: messageType(MESSAGE.EVENT),
    protocol: z.number().int().min(1),
    /** The format, e.g. `kehikot.notifications@1`. Known to the host, or unsent. */
    extension: z.string().min(1).max(LIMITS.EXTENSION).transform(canonicalName),
    /** Whatever that format says. Validated by the host before it left. */
    payload: z.unknown(),
    /** The module that emitted it, named by the host from its own registry. */
    from: z.string().regex(MODULE_ID).transform(canonicalName),
    /**
     * When the host accepted it, ISO 8601. A receiver ordering by arrival would
     * be ordering by its own scheduler instead.
     */
    at: z.string().min(1).max(40),
    /**
     * The kehikko it happened on, so a receiver can tell near from far.
     *
     * A module is loaded once and shown on whichever canvas asks for it, so "this
     * kehikko" is a question it cannot answer alone. `context.kehikko` says where
     * the receiver is standing and this says where the event came from; comparing
     * the two is the whole of a near/far filter, and it is a comparison rather
     * than a rule so a module can present it however it likes.
     */
    kehikko: kehikkoSchema.nullable().default(null),
});
/* ------------------------------------------------------------------------ *
 * Module → host
 * ------------------------------------------------------------------------ */
/**
 * "I heard you."
 *
 * The id is the module's own, and it is here so that a host greeting a frame
 * can confirm the program in it is the one whose manifest it read. It is not
 * how the host identifies the module — that is the frame handle, which cannot
 * be forged — so a mismatch is a fault to report rather than an impersonation
 * to defend against. The distinction matters: a check that looks like security
 * and is not teaches people to lean on it.
 *
 * Silence after a greeting is the failure this message exists to make visible.
 * A host should give it a bounded wait and then say, in words, that the module
 * was greeted and did not answer — and should count that wait from the
 * GREETING, not from the mount, because a module cannot be silent in answer to
 * a word nobody has said yet.
 */
export const readySchema = z.object({
    type: messageType(MESSAGE.READY),
    /* Canonical once parsed: an unchanged module still answers as `roadmap.x`. */
    id: z.string().regex(MODULE_ID).transform(canonicalName),
    protocol: z.number().int().min(1).default(PROTOCOL),
});
/** One question, with an id the answer will carry back. */
export const requestSchema = z.object({
    type: messageType(MESSAGE.REQUEST),
    id: correlation,
    /**
     * Bounded but not held to the list of known methods, which would be this
     * schema deciding what a host answers. A host with a method this package has
     * never heard of is a host doing its job; a host without one this package
     * knows is entitled to refuse it, with `unknown-method`.
     */
    method: z.string().min(1).max(LIMITS.METHOD),
    params: z.record(z.string(), z.unknown()).default({}),
});
/**
 * How tall the module would like to be.
 *
 * The one message with no id and no answer. It is a request in the ordinary
 * sense and not in the protocol's: the host clamps it (`clampHeight`) and may
 * ignore it entirely, and a module that needed to know the outcome can measure
 * itself.
 */
export const resizeSchema = z.object({
    type: messageType(MESSAGE.RESIZE),
    height: z.number().finite(),
});
/**
 * "I went" — or "there is nothing here by that name."
 *
 * ## The acknowledgement the protocol has always lacked
 *
 * Everything else the host says to a module is fire-and-forget, and can be,
 * because nothing downstream of it depends on the answer. `goto` is different,
 * and the difference is concrete: a host's reference index decides whether to
 * walk the reader to a reference in place or to fall back to an ordinary link,
 * and it decides by whether the walk found anything. In the host's own page
 * that answer was a return value. Across a frame there is no return value, so
 * either the host stops asking — and accepts that pressing a reference may land
 * nowhere, silently, which is the failure this whole protocol keeps refusing —
 * or the message gets an answer.
 *
 * So it gets one, and `goto` carries an id to pair it with. This is the first
 * and only place the host waits on a module for anything, and it is worth being
 * plain about what that means: the host is now depending on somebody else's
 * program to reply, so it must time out, and the timeout must mean the same
 * thing as `found: false` — fall back to the link. A module that never answers
 * must not be able to hang a reference.
 *
 * `found` is the field the index reads. `why` is for the person: "nothing in
 * this epic names gh#41" is a sentence worth showing, and a host that only knew
 * `false` would have to invent one that might be wrong about the reason.
 *
 * ## Answer when you know, not when you are asked
 *
 * There is one `went` per `goto` and it is the last word, so a module must not
 * send it until the walk has actually settled. The tempting bug is visible in
 * the receiver this pair was designed against: told to go to a ref in an epic
 * it does not currently have loaded, it starts the load, remembers where it was
 * going, and returns "yes" — before anything has been looked for. Answering
 * `found: true` there is a guess, and the host acts on it by NOT falling back
 * to a link, so a wrong guess is a press that lands nowhere and says nothing,
 * which is the exact failure this pair exists to remove.
 *
 * Holding the answer until the load finishes is safe, because the host's
 * timeout is the backstop and a timeout already means what `found: false`
 * means. A slow honest answer degrades to the fallback. A fast dishonest one
 * degrades to silence.
 */
export const wentSchema = z.object({
    type: messageType(MESSAGE.WENT),
    id: correlation,
    found: z.boolean(),
    why: z.string().max(LIMITS.REASON).default(''),
});
/* ------------------------------------------------------------------------ *
 * The two directions, each as one thing to parse
 * ------------------------------------------------------------------------ */
/**
 * Not a `discriminatedUnion`, because `responseSchema` is itself a union on a
 * different key and cannot be an option of one. A plain union costs a little
 * more to parse and reports its failures less precisely; it is the honest shape
 * of a wire where one message type has two forms.
 */
export const hostMessageSchema = z.union([
    helloSchema,
    contextMessageSchema,
    responseSchema,
    gotoSchema,
    eventSchema,
    clearSchema,
    refreshSchema,
]);
export const moduleMessageSchema = z.union([
    readySchema,
    requestSchema,
    resizeSchema,
    wentSchema,
    filtersSchema,
    clearableSchema,
    refreshableSchema,
]);
/**
 * Is this worth parsing at all?
 *
 * The cheap first filter, before a schema is run over a `MessageEvent` from a
 * window that receives messages from everything. It says nothing about whether
 * the message is valid or whether the sender is anybody — it says the value is
 * an object with a `type` that starts `kehikot.` — or `roadmap.`, the same
 * protocol before the rename, which is still read (see `dialect.ts`) — and that
 * is what separates a message meant for this protocol from the several that
 * are not.
 */
export function looksLikeWireMessage(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'type' in value &&
        typeof value.type === 'string' &&
        MESSAGE_PREFIXES.some((prefix) => value.type.startsWith(prefix)));
}
//# sourceMappingURL=messages.js.map