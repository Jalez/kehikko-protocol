import { z } from 'zod';
import { MESSAGE, MESSAGE_PREFIX, PROTOCOL } from './constants.js';
import { LIMITS } from './limits.js';
import { EPIC_SLUG, MODULE_ID, PROTOCOL_VERSION } from './ids.js';
import { buildSchema } from './build.js';
import { contextSchema } from './context.js';
import { filterGroupSchema } from './filters.js';
import { footerItemsSchema } from './footer.js';
import { RUN_CARRIES, headerItemsSchema, pressValueSchema } from './header.js';
import { gotoRef, kehikkoSchema, stepNumber } from './fragments.js';
import { coveredFields } from './reveal.js';
import { FIND_DIRECTIONS, findCountFields, findOptionsFields, findQuerySchema } from './find.js';
import { INBOX_SIGNALS, inboxKeySchema } from './inbox.js';
/**
 * Everything the two sides say to each other: the schema of every `postMessage` between a host and
 * a framed, cross-origin module. Parse both directions: a module validates what the host sends too.
 * Design notes: docs/wire.md, and docs/filters.md for filters, clearing and refreshing.
 */
/** A message type: the one literal, in the one spelling. */
function messageType(type) {
    return z.literal(type);
}
/** The id correlating a question with its answer, or a `goto` with its `went`. */
const correlation = z.string().min(1).max(LIMITS.CORRELATION);
/**
 * Module → host. What a module currently offers to be narrowed by. The whole offer, every time: it
 * replaces, never merges, and an empty `groups` takes the control away. Sent whenever the answer
 * changes, including its words. Two groups cannot share an id.
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
 * Module → host. What a module offers to clear, in its own words. The whole offer, every time; any
 * count rides in the label. Re-announced whenever what it shows changes, including immediately
 * after it has been asked to clear.
 */
export const clearableSchema = z.object({
    type: messageType(MESSAGE.CLEARABLE),
    /** The words on the control, or `null` to take the control away. */
    label: z.string().min(1).max(LIMITS.CLEAR_LABEL).nullable().default(null),
});
/**
 * Host → module. The press, relayed: "clear what you are showing". Empty apart from `type` and
 * `protocol`: no list of what to delete, no filter choice, no correlation id, and no answer.
 */
export const clearSchema = z.object({
    type: messageType(MESSAGE.CLEAR),
    protocol: z.number().int().min(1),
});
/* ------------------------------------------------------------------------ *
 * Refreshing: a module offering to read its material again
 * ------------------------------------------------------------------------ */
/**
 * Module → host. What a module says about being refreshed. The whole state, every time, re-announced
 * whenever any of the three changes. `at` is an ISO 8601 instant with an offset, or null for "I
 * cannot say" (the host then draws no time). `busy` keeps the control and says a read is in flight.
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
 * Host → module. The press, relayed: "read your material again". Carries no reason, no interval and
 * no correlation id; what comes back is a new `kehikot.refreshable` (`busy`, then a new `at`).
 */
export const refreshSchema = z.object({
    type: messageType(MESSAGE.REFRESH),
    protocol: z.number().int().min(1),
});
/* ------------------------------------------------------------------------ *
 * The header: what a module can be switched to, jumped to and made to run
 * ------------------------------------------------------------------------ */
/**
 * Module → host. Every header item this module has, whole, every time: it replaces, never merges,
 * and an empty `items` takes the module's menus away. Sent again whenever anything in it changes —
 * a switch moved, a run went busy — including right after a press. See `header.ts`.
 */
export const headerSchema = z.object({
    type: messageType(MESSAGE.HEADER),
    items: headerItemsSchema,
});
/**
 * Module → host (2.38.0). Every footer item this module has, whole, every time, like the header: it
 * replaces, never merges, and an empty `items` takes the footer away. A host draws it as one row at
 * the bottom of the container. See `footer.ts` and docs/footer.md.
 */
export const footerSchema = z.object({
    type: messageType(MESSAGE.FOOTER),
    items: footerItemsSchema,
});
/** Where a pressed item was declared (2.38.0): the header, or the footer. */
export const PRESS_PLACES = ['header', 'footer'];
/**
 * Host → module. One item was pressed. `value` is the option chosen for a switch or a go item, the
 * state wanted for a toggle (so a press delivered twice does not flip twice), and absent for a run.
 * `id` pairs it with its `pressed`. A host sends this only for an item in the module's last header,
 * after any arm of its own, and must time out: no `pressed` means the press was not taken.
 */
export const pressSchema = z.object({
    type: messageType(MESSAGE.PRESS),
    protocol: z.number().int().min(1),
    id: correlation,
    item: z.string().min(1).max(LIMITS.HEADER_ID),
    value: pressValueSchema.optional(),
    /**
     * 2.38.0. `footer` for an item of the module's footer; absent (or `header`) for one of its header,
     * as before. A module built before 2.38.0 strips it and judges the press against its header, where
     * a footer item is not, and answers "not taken": a host sends footer presses only to a module that
     * declared a footer, which an older one cannot have.
     */
    place: z.enum(PRESS_PLACES).optional(),
    /**
     * 2.40.0. What the host carried out itself, in the person's click, before sending this press: the
     * run's `copy` or its `open`. Absent when it did neither — a host before 2.40.0, a host that
     * could not (the clipboard refused), or a run that asks for neither.
     */
    carried: z.enum(RUN_CARRIES).optional(),
    /**
     * 2.46.0. The text submitted in a footer field (`kind: 'input'`): what the person typed when they
     * pressed Enter, whole, possibly empty. Only for a field; absent for every other press. A module
     * built before 2.46.0 strips it, and could not have declared a field.
     */
    text: z.string().max(LIMITS.FOOTER_INPUT).optional(),
});
/**
 * Module → host. What became of one press: taken, or not and why. "Taken" is not "finished": a run
 * that takes a minute answers at once and says how it is going by declaring its header again.
 */
export const pressedSchema = z.object({
    type: messageType(MESSAGE.PRESSED),
    id: correlation,
    ok: z.boolean(),
    why: z.string().max(LIMITS.REASON).default(''),
});
/* ------------------------------------------------------------------------ *
 * Host → module
 * ------------------------------------------------------------------------ */
/**
 * Host → module. Hello: the whole of what a module is given without asking, sent on every frame
 * load. `protocol` is what the two sides settled on when the manifest was read. `session` names
 * this conversation; it is not a credential and must never become one.
 */
export const helloSchema = z.object({
    type: messageType(MESSAGE.HELLO),
    protocol: z.number().int().min(1),
    session: z.string().min(1).max(LIMITS.SESSION),
    context: contextSchema,
    /**
     * Whatever this module last asked the host to keep for it (`state.set`), verbatim and opaque. This
     * module's alone, which is why it is not in the context. `null` when the host keeps nothing for it.
     */
    state: z.string().max(LIMITS.MODULE_STATE).nullable().default(null),
    /**
     * 1.4.0. The methods this host will answer for THIS module: spoken by the protocol, kept by the
     * host and granted by the manifest's `declares.uses`. Absent from a host before 1.4.0, which is
     * "unknown", not "none": ask and be refused, as before. An empty list is a host that answers
     * nothing for this module. Order carries no meaning; names are not checked against `METHODS`.
     */
    answers: z.array(z.string().min(1).max(LIMITS.METHOD)).max(LIMITS.ANSWERS).optional(),
    /**
     * 1.4.0. Whether this host draws the module's declared header (`kehikot.header`) in its own menus.
     * Absent from a host before 1.4.0: unknown. `false` is a host that does not, so the module keeps
     * its own control. See docs/header.md.
     */
    header: z.boolean().optional(),
    /**
     * 2.38.0. Whether this host draws the module's declared footer (`kehikot.footer`) as a row at the
     * bottom of its container. Absent from a host before 2.38.0: it does not, so a module keeps
     * drawing its own footer. See docs/footer.md.
     */
    footer: z.boolean().optional(),
    /**
     * 2.40.0. The acts this host carries out itself for a run, in the person's click (`RUN_CARRIES`:
     * `copy`, `open`). Absent from a host before 2.40.0, which carries out none: a module then does the
     * act in its own page, where it has the person's click. Names a host does not know are kept.
     */
    carries: z.array(z.string().min(1).max(16)).max(8).optional(),
    /**
     * 2.46.0. The footer item kinds this host draws (`FOOTER_KINDS`), when it draws a footer at all.
     * Absent from a host before 2.46.0, which draws the 2.38.0 kinds (`FOOTER_KINDS_2_38`) and refuses
     * a footer naming any other: declare a field (`input`) only when this names it. `footerDraws` is
     * the rule. Names a host does not know are kept.
     */
    footerKinds: z.array(z.string().min(1).max(16)).max(16).optional(),
    /**
     * 2.49.0. Whether this host wants to hear the person's presses inside the page (`kehikot.pointer`).
     * Absent from a host before 2.49.0: it does not, and nothing is sent. `connect` sends them for a
     * page by itself when this is `true`; a hand-rolled page may.
     */
    pointer: z.boolean().optional(),
    /**
     * 2.69.0. Whether this host draws a find bar for this module (`kehikot.find`). Absent from a host
     * before 2.69.0: it does not, so a page leaves ⌘F alone (a browser's own find may answer it).
     * `connect` catches ⌘F and ⌘G inside the page, and searches it, only when this is `true`.
     */
    find: z.boolean().optional(),
});
/**
 * Host → module. Which epic is open now: the `contextSchema` fields flat, not wrapped in `context`.
 * Sent when the reader switches epics and when the module's own tab is shown. Only epic-scoped
 * modes are told; a `global` mode is not.
 */
export const contextMessageSchema = contextSchema.extend({
    type: messageType(MESSAGE.CONTEXT),
    protocol: z.number().int().min(1),
});
/**
 * Why a request was refused, a closed set: `unknown-module`, this host has no module by that name;
 * `unknown-method`, no such method, which an author should treat as fatal; `failed`, everything
 * else including a host's own refusals, and the only one worth retrying.
 */
export const responseFailureReasons = ['unknown-module', 'unknown-method', 'failed'];
/**
 * Why a host declined a call rather than failing it (2.22.0), said beside `reason` on a refusal as
 * `declined`. One word: `host-too-old`, the method is newer than this host, which answers
 * `reason: 'unknown-method'` with it. A reader before 2.22.0 strips the field and sees
 * `unknown-method`, as before. Read it with `hostTooOld` (`fit.ts`).
 */
export const DECLINED_REASONS = ['host-too-old'];
/**
 * The two fields a refusal may carry for a call the host is too old for (2.22.0): `declined`, and
 * `since`, the version that has the method when the host can say (it usually cannot: the module's
 * own `SINCE` knows). Optional, and dropped rather than fatal when out of shape.
 */
export const declinedFields = {
    declined: z.enum(DECLINED_REASONS).optional().catch(undefined),
    since: z.string().regex(PROTOCOL_VERSION).optional().catch(undefined),
};
/**
 * Host → module. The answer to exactly one request: data or a refusal, two shapes under one type.
 * A refusal always carries both `reason`, a word from `responseFailureReasons` for the program, and
 * `error`, a sentence for the person writing the module.
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
        /** The sentence for the person. Bounded because a refusal quotes the module's own text back at it. */
        error: z.string().max(LIMITS.REASON).default(''),
        /** 2.22.0. `host-too-old` (with `since` when the host knows it) for a method newer than this host. */
        ...declinedFields,
    }),
]);
/**
 * Host → module. Go to a reference. Names a `ref` or a 1-based `step`; an epic alone is refused,
 * and `epic` means "switch first". `id` is required and pairs it with its `went`; see `wentSchema`.
 * Mirrors the `view.goto` method, which does accept an epic alone.
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
 * Host → module. An extension payload one module emitted, delivered to a module whose manifest
 * consumes that format. The host validated `extension` and `payload` and names `from` itself; the
 * contents are the sender's claim. Never answered, and lost if the receiver is still loading.
 */
export const eventSchema = z.object({
    type: messageType(MESSAGE.EVENT),
    protocol: z.number().int().min(1),
    /** The format, e.g. `kehikot.notifications@1`. Known to the host, or unsent. */
    extension: z.string().min(1).max(LIMITS.EXTENSION),
    /** Whatever that format says. Validated by the host before it left. */
    payload: z.unknown(),
    /** The module that emitted it, named by the host from its own registry. */
    from: z.string().regex(MODULE_ID),
    /**
     * When the host accepted it, ISO 8601. A receiver ordering by arrival would
     * be ordering by its own scheduler instead.
     */
    at: z.string().min(1).max(40),
    /**
     * The kehikko it happened on, or null. Compare with `context.kehikko` to tell near from far; a
     * receiver that KEEPS an event files it under the kehikko's `key` when there is one, not its `id`.
     */
    kehikko: kehikkoSchema.nullable().default(null),
});
/* ------------------------------------------------------------------------ *
 * Module → host
 * ------------------------------------------------------------------------ */
/**
 * Module → host. "I heard you." `id` is the module's own, so a host can confirm the frame holds the
 * program whose manifest it read; a mismatch is a fault to report, not how the host identifies it.
 * A host waits a bounded time, counted from the greeting, then says the module did not answer.
 */
export const readySchema = z.object({
    type: messageType(MESSAGE.READY),
    id: z.string().regex(MODULE_ID),
    protocol: z.number().int().min(1).default(PROTOCOL),
    /** The build that served this page, as printed into it. A host compares it with the server's now. */
    build: buildSchema.optional().catch(undefined),
    /**
     * 2.70.0. "Keep your cover up until I say `kehikot.drawn`": the page is still reading what it shows,
     * and would otherwise draw a "Reading…" of its own. Absent or false: the page is ready now. A host
     * before 2.70.0 strips it and lifts its cover on this message, as before.
     */
    hold: z.boolean().optional(),
    /**
     * 2.84.0. What the held cover says while it is up: "Loading the journey…". Plain text, one line.
     * Absent: the host's own words ("Loading <module>…"). Out of shape: dropped, not the message.
     */
    label: z.string().trim().min(1).max(LIMITS.LOADING_LABEL).optional().catch(undefined),
});
/**
 * Module → host (2.70.0). The page that said `hold: true` in its `ready` is drawn: lift the cover.
 * Nothing else is said; a host that was not holding drops it.
 */
export const drawnSchema = z.object({
    type: messageType(MESSAGE.DRAWN),
});
/**
 * Module → host (2.84.0). After a `kehikot.context`: the page is drawing what it asks for, and that
 * waits on something. Cover the container if `kehikot.drawn` has not followed within
 * `LOADING_COVER_AFTER_MS`, saying `label`, until it does or `HOLD_COVER_MS` passes. Sent while a
 * greeting's hold is up, it only gives that cover its label. Plain text, one line.
 */
export const loadingSchema = z.object({
    type: messageType(MESSAGE.LOADING),
    label: z.string().trim().min(1).max(LIMITS.LOADING_LABEL).optional().catch(undefined),
});
/** One question, with an id the answer will carry back. */
export const requestSchema = z.object({
    type: messageType(MESSAGE.REQUEST),
    id: correlation,
    /**
     * Bounded but not held to the list of known methods. A host may refuse one it does not have, with
     * `unknown-method`.
     */
    method: z.string().min(1).max(LIMITS.METHOD),
    params: z.record(z.string(), z.unknown()).default({}),
});
/**
 * Module → host. How tall the module would like to be. No id and no answer: the host clamps it
 * (`clampHeight`) and may ignore it entirely.
 */
export const resizeSchema = z.object({
    type: messageType(MESSAGE.RESIZE),
    height: z.number().finite(),
});
/**
 * Module → host. "I went", or "there is nothing here by that name": one per `goto`, carrying its
 * `id`, sent only once the walk has settled. `found` is what the host acts on; `why` is for the
 * person. A host must time out, and a timeout means `found: false`: fall back to the link.
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
 * Host → module (2.35.0). The person opened one of this module's Inbox items — pressed it in the
 * Inbox, on a toast, or with "Next that needs me" — and the host has gone to its place. `item` is the
 * item's `id`, exactly as the module's last `activity.set` carried it. Fire and forget: no id, no
 * answer. Sent to the module's pages on the kehikko the host arrived at, after it got there.
 *
 * What a module does with it is its own: show that thing (the session, the question) and count it
 * as seen. It changes nothing on the host by itself: an `attention` item stays until the module's
 * next list drops it or moves it on. An id the module no longer has is ignored. A host before
 * 2.35.0 sends nothing; a module before it drops the message unread (`HOST_MESSAGES`).
 */
export const openedSchema = z.object({
    type: messageType(MESSAGE.OPENED),
    protocol: z.number().int().min(1),
    item: z.string().min(1).max(LIMITS.ACTIVITY_ID),
});
/**
 * Host → module (2.42.0). How much of this module's frame the host's own rows cover now: `top` and
 * `bottom` in CSS pixels. Sent only to a module whose manifest says `reveal: 'over'`, whenever it
 * changes, and after a greeting while anything is covered; `{ top: 0, bottom: 0 }` says the rows
 * are gone. The frame keeps its size throughout, so a module never refits for it: it moves what
 * must stay readable out from under the rows (`keepInView`). Fire and forget. A host before 2.42.0
 * sends nothing; a module before it drops the message unread (`HOST_MESSAGES`).
 */
export const coveredSchema = z.object({
    type: messageType(MESSAGE.COVERED),
    protocol: z.number().int().min(1),
    ...coveredFields,
});
/**
 * Host → module (2.45.0). Whether this module's page is on screen: the host keeps the pages of
 * kehikot the person left alive and hidden (CSS, so no `visibilitychange` fires inside), and tells
 * a page `visible: false` when it hides it and `visible: true` when it shows it again — which is the
 * person arriving back at it. Sent once after every greeting too, so a page always knows. Fire and
 * forget. A page that is hidden is not being looked at: a module that counts "the person saw this"
 * from what is on screen must not count it then, and may count what is in front of the person when
 * it is shown. A host before 2.45.0 sends nothing (the page is to be taken as shown); a module before
 * it drops the message unread (`HOST_MESSAGES`).
 */
export const visibleSchema = z.object({
    type: messageType(MESSAGE.VISIBLE),
    protocol: z.number().int().min(1),
    visible: z.boolean(),
});
/**
 * Host → module (2.79.0). The person's Inbox: `changed` (read it again with `inbox.read`; `rev` is the
 * record's newest), or `next` — the person pressed the host's shortcut for the next thing that needs
 * them, and `next` names it (null: nothing does). Sent only to a frame whose manifest declares
 * `inbox:person`; a module before 2.79.0 could not have, and drops it unread. See `inbox.ts`.
 */
export const inboxMessageSchema = z.object({
    type: messageType(MESSAGE.INBOX),
    protocol: z.number().int().min(1),
    kind: z.enum(INBOX_SIGNALS),
    rev: z.number().int().min(0),
    next: inboxKeySchema.nullable().optional(),
});
/** 2.49.0. What a `kehikot.pointer` says happened: a press began, ended, or was taken away (`cancel`). */
export const POINTER_PHASES = ['down', 'up', 'cancel'];
/**
 * Module → host (2.49.0). A press inside the page: `down` when the primary button (or a touch, or a
 * pen) went down, `up` when it came up, `cancel` when the press was taken away (a scroll, the window
 * losing it). `at` is the page's `performance.now()` in milliseconds: only the difference between a
 * `down` and its `up` means anything, which is how long the press was held. Sent only to a host whose
 * greeting said `pointer: true`; carries no position and no target — what was pressed is the page's.
 * Fire and forget. A host before 2.49.0 drops it unread; one that asked uses it for when a
 * container's rows show (a click, or a held press, inside the page).
 */
export const pointerSchema = z.object({
    type: messageType(MESSAGE.POINTER),
    phase: z.enum(POINTER_PHASES),
    at: z.number().finite().min(0),
});
/**
 * 2.59.0. Where a page's failure was caught: an uncaught `error` on the window (a script that threw,
 * or failed to load or link), an unhandled promise `rejection`, a React `render` caught by the
 * client's boundary (`ReportErrors`), a `greeting` handler that threw (`onHello`), or one the page
 * `reported` itself (`reportPageError`). Words a host does not know are kept: the field is text.
 */
export const PAGE_ERROR_WHERE = ['error', 'rejection', 'render', 'greeting', 'reported'];
/** Text cut to a length rather than refused for it: a failure is said even when it is long. */
const cut = (most) => z.string().transform((text) => text.slice(0, most));
/**
 * Module → host (2.59.0). The page failed: an uncaught error or unhandled rejection, a render a
 * boundary caught, or a greeting handler that threw. `message` is the error's own (`TypeError: x is
 * undefined`), `where` says how it was caught (`PAGE_ERROR_WHERE`), `stack` its first lines, trimmed
 * (`trimStack`). Sent by the client without being asked, rate-limited, to the window that greeted
 * the page; buffered until a greeting when it came first. The page document's blocking script
 * (`errorsScript`) sends it for a page whose scripts never ran, so a page that cannot answer the
 * greeting still says why. Fire and forget.
 *
 * A host shows it as the module's own words, as text, never markup: it is the reason a page did not
 * answer, in place of "not answering". A host before 2.59.0 drops it unread (`MODULE_MESSAGES`).
 * Long text is cut, never refused.
 */
export const pageErrorSchema = z.object({
    type: messageType(MESSAGE.PAGE_ERROR),
    message: cut(LIMITS.PAGE_ERROR_MESSAGE).pipe(z.string().min(1)),
    where: cut(LIMITS.PAGE_ERROR_WHERE).default('error'),
    stack: cut(LIMITS.PAGE_ERROR_STACK).default(''),
});
/**
 * Module → host (2.93.0). The page will not answer this window: the greeting came from `origin`,
 * which is not among the origins the page was told it may be framed by (`allowed`, as its server
 * printed them — the same list its `frame-ancestors` names, so nothing here is a secret). Before
 * 2.93.0 such a greeting was dropped without a word, and a host could only see a page that loaded
 * every script and said nothing, which reads as a broken module. Sent to the greeting's window
 * only, once per greeting; nothing else is answered to it. Text, never markup. A host shows why
 * and offers the restart that starts the module with this window's origin; a host before 2.93.0
 * drops it unread (`MODULE_MESSAGES`).
 */
export const refusedSchema = z.object({
    type: messageType(MESSAGE.REFUSED),
    origin: cut(LIMITS.REFUSED_ORIGIN),
    allowed: z.array(cut(LIMITS.REFUSED_ORIGIN)).transform((list) => list.slice(0, LIMITS.REFUSED_ALLOWED)).default([]),
});
/* ------------------------------------------------------------------------ *
 * Find (2.69.0): the host's bar, the page's search
 * ------------------------------------------------------------------------ */
/**
 * Host → module (2.69.0). Search what this page shows. `direction` says what to do: `first` (the
 * query or an option changed: search anew, go to the first match at or after what is on screen),
 * `next` and `prev` (move, wrapping), or `close` (the bar closed: clear every mark). `id` pairs it
 * with its `kehikot.find.result`; a host draws only the result for its latest `id`. An empty query
 * matches nothing and clears the marks. A module before 2.69.0 drops it unread (`HOST_MESSAGES`), so
 * a host that hears nothing back says the module cannot be searched. See `find.ts`.
 */
export const findSchema = z.object({
    type: messageType(MESSAGE.FIND),
    protocol: z.number().int().min(1),
    id: correlation,
    query: findQuerySchema.default(''),
    ...findOptionsFields,
    direction: z.enum(FIND_DIRECTIONS),
});
/**
 * Module → host (2.69.0). What a search came to: `total` matches and the `current` one (1-based, 0
 * when there are none), or `unsupported: true` from a page that cannot search what it shows. `id`
 * is the `kehikot.find` it answers; a page that re-counts by itself (what it shows changed while the
 * bar is open) sends the id of the last one again. No answer to a `close`.
 */
export const findResultSchema = z
    .object({
    type: messageType(MESSAGE.FIND_RESULT),
    id: correlation,
    ...findCountFields,
    unsupported: z.boolean().default(false),
})
    .refine((r) => r.current <= r.total, { message: 'the current match cannot be past the total' });
/** 2.69.0. What ⌘G and ⇧⌘G ask the host's bar for, beside opening it. */
export const FIND_STEPS = ['next', 'prev'];
/**
 * Module → host (2.69.0). The person pressed ⌘F inside the page: open the find bar for this
 * container, and put focus in it. `query` is the page's selected text when there is a short one on
 * one line, to search for; absent otherwise (the host keeps what the bar last held). `step` is ⌘G
 * (`next`) or ⇧⌘G (`prev`): open the bar if it is closed and move. Sent only to a host whose greeting
 * said `find: true`; a host before 2.69.0 drops it unread.
 */
export const findOpenSchema = z.object({
    type: messageType(MESSAGE.FIND_OPEN),
    query: findQuerySchema.optional(),
    step: z.enum(FIND_STEPS).optional(),
});
/**
 * Every message a host sends. A plain union, not a `discriminatedUnion`, because `responseSchema`
 * is itself a union on a different key and cannot be an option of one.
 */
export const hostMessageSchema = z.union([
    helloSchema,
    contextMessageSchema,
    responseSchema,
    gotoSchema,
    eventSchema,
    clearSchema,
    refreshSchema,
    pressSchema,
    openedSchema,
    coveredSchema,
    visibleSchema,
    findSchema,
    inboxMessageSchema,
]);
export const moduleMessageSchema = z.union([
    readySchema,
    requestSchema,
    resizeSchema,
    wentSchema,
    filtersSchema,
    clearableSchema,
    refreshableSchema,
    headerSchema,
    pressedSchema,
    footerSchema,
    pointerSchema,
    pageErrorSchema,
    refusedSchema,
    findResultSchema,
    findOpenSchema,
    drawnSchema,
    loadingSchema,
]);
/**
 * Is this worth parsing at all? The cheap first filter: true when the value is an object whose
 * `type` starts `kehikot.`. Says nothing about validity or the sender.
 */
export function looksLikeWireMessage(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'type' in value &&
        typeof value.type === 'string' &&
        value.type.startsWith(MESSAGE_PREFIX));
}
