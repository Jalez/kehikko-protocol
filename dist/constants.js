/**
 * The spellings and the numbers a host and a module have to agree on, each written down once so
 * that both sides import the same definition.
 * Design notes: docs/wire.md, and docs/protocol-number.md for PROTOCOL.
 */
/**
 * The protocol both sides speak: an integer, not a semver string. Raised only when an existing
 * message changes meaning or an existing field changes shape, never for additions. A module built
 * against 1 is incompatible with 2, and there are no aliases for the old `journey` spellings.
 */
export const PROTOCOL = 2;
/** The one path a module has to answer on. Nothing else is ever asked for. */
export const WELL_KNOWN = '/.well-known/kehikot-module.json';
/**
 * The word that makes a manifest a claim rather than a hopeful GET. A JSON document that does not
 * say this word is not a manifest, however many of the other fields it happens to have.
 */
export const MANIFEST_KIND = 'kehikot.module';
/**
 * Every message type, spelled once. Prefixed `kehikot.`, and both ends filter on the prefix before
 * they look at anything else.
 */
export const MESSAGE = {
    /** Host → module. The greeting, and the whole of what a module is given without asking. */
    HELLO: 'kehikot.hello',
    /** Module → host. "I heard you, and here is the protocol I answered in." */
    READY: 'kehikot.ready',
    /** Host → module. Which epic is open, which project it belongs to and where that project is, and which theme. */
    CONTEXT: 'kehikot.context',
    /** Module → host. One question, with an id the answer will carry back. */
    REQUEST: 'kehikot.request',
    /** Host → module. The answer to exactly one request. */
    RESPONSE: 'kehikot.response',
    /** Module → host. How tall the module would like its frame to be. */
    RESIZE: 'kehikot.resize',
    /** Host → module. "Go to this reference." */
    GOTO: 'kehikot.goto',
    /** Module → host. "I went" — or "there is nothing here by that name." */
    WENT: 'kehikot.went',
    /**
     * Host → module. An extension payload another module emitted, sent because the receiver's
     * manifest consumes the extension. Not a request: it carries no correlation id and is not answered.
     */
    EVENT: 'kehikot.event',
    /**
     * Module → host. "Here is what I can be narrowed by." Fire and forget: no id, no answer; the host
     * may draw all, part or none of it, and what was chosen arrives back in `context.filters`. The
     * offer replaces whatever was last offered, whole; an empty `groups` withdraws it.
     */
    FILTERS: 'kehikot.filters',
    /**
     * Module → host. "What I am showing can be cleared, and here is what to call it." Fire and
     * forget, the offer whole every time, independent of `filters`. `label` is the module's own words
     * for what would go; `null` withdraws the control.
     */
    CLEARABLE: 'kehikot.clearable',
    /**
     * Host → module. "Clear what you are showing." Carries no ids, filter or count and gets no
     * answer: the module decides what is shown and does the deleting, then says so with a new
     * `kehikot.clearable`. The host arms on a first press and sends this only on the second.
     */
    CLEAR: 'kehikot.clear',
    /**
     * Module → host. "I can be refreshed, and this is when I last was." The offer, whole, every time.
     * `at` is the module's fact and a host must never infer it; `null` means "I cannot say" and the
     * host draws no time. `busy` says a read is in flight. Carries no interval, error or result.
     */
    REFRESHABLE: 'kehikot.refreshable',
    /**
     * Host → module. "Read your material again." Carries nothing and is not answered; a new
     * `kehikot.refreshable` follows. Sent for a press or an elapsed interval alike; the host owns the
     * clock, per container, sends only to a module that offered, and never faster than `REFRESH_EVERY_MIN`.
     */
    REFRESH: 'kehikot.refresh',
    /**
     * Module → host. "These are the switches, toggles, jumps and runs I have." The whole list, every
     * time: it replaces, never merges, and an empty list takes the module's menus away. Fire and
     * forget; the module owns all the state and says it again whenever any of it changes.
     */
    HEADER: 'kehikot.header',
    /**
     * Module → host (2.38.0). "This is what my container's footer says and offers": status text,
     * meters, and the header's kinds of item. The whole list every time, like the header; an empty
     * list takes the footer away. Presses on it come back as `kehikot.press` with `place: 'footer'`.
     */
    FOOTER: 'kehikot.footer',
    /**
     * Host → module. "This item of yours was pressed", by a person in the header or by an agent
     * through the host. Carries a correlation id and is answered by exactly one `kehikot.pressed`.
     * Sent only to a module that declared the item.
     */
    PRESS: 'kehikot.press',
    /** Module → host. "I took that press", or "I did not, and here is why." One per `press`, by its `id`. */
    PRESSED: 'kehikot.pressed',
    /**
     * Host → module (2.35.0). "The person opened this Inbox item of yours": they pressed it in the
     * Inbox, on a toast or with Next, and the host has gone to its place. Carries the item's `id` as
     * the module reported it; no correlation id and no answer. The module may show that thing and
     * count it as seen; whether the item stays is still the module's next list.
     */
    OPENED: 'kehikot.opened',
    /**
     * Host → module (2.42.0). "My rows now cover this much of your frame": CSS pixels at its top and
     * at its bottom, sent to a module whose manifest says `reveal: 'over'` whenever that changes (a
     * hover revealed or hid the header and footer), and again after a greeting while anything is
     * covered. No answer. The frame itself is not resized; see `reveal.ts`.
     */
    COVERED: 'kehikot.covered',
    /**
     * Host → module (2.45.0). "Your page is on screen now", or "it is not": `{ visible }`, sent when
     * the host hides a page it keeps alive (the person left for a kehikko it is not on) or shows it
     * again, and once after every greeting. `visible: true` after a hide is the person arriving back
     * where this page is. No answer. A CSS-hidden frame fires no `visibilitychange`; this is the only
     * way a page can know. See docs/activity.md, "Whether the person can see the page".
     */
    VISIBLE: 'kehikot.visible',
    /**
     * Module → host (2.49.0). "The person pressed, or let go, inside my page": `{ phase, at }`, sent
     * only to a host whose greeting asked (`pointer: true`). A press inside a framed page is invisible
     * to the host otherwise — a click into a page that already has the keyboard moves no focus — so
     * this is how a host reveals a container's rows on a click or a held press inside it. `at` is the
     * page's own clock (`performance.now()`), for the length of a press; nothing else. No answer.
     */
    POINTER: 'kehikot.pointer',
    /**
     * Module → host (2.59.0). "My page failed": `{ message, where, stack }`, one uncaught error or
     * unhandled rejection on the page, an error a React boundary caught, or a greeting handler that
     * threw. Sent by the client by itself, rate-limited, to the window that greeted the page — and by
     * the page document's own blocking script when the page's scripts never ran at all, so a page that
     * cannot answer the greeting still says why. No answer. A host shows it in place of "not
     * answering"; a host before 2.59.0 drops it unread. See docs/client.md, "When the page fails".
     */
    PAGE_ERROR: 'kehikot.page.error',
    /**
     * Module → host (2.93.0). "I will not answer this window": `{ origin, allowed }`, sent instead of
     * silence when a greeting comes from a window whose origin the page was not told it may be framed
     * by (`mayGreet`) — `origin` is that window's, `allowed` the list the page's server printed. Sent
     * to that window only, once per greeting. The page answers nothing else to it. A host says why
     * the page will not speak — a module started for one window and framed by another — and offers
     * the restart that gives it this window's origin; a host before 2.93.0 drops it unread.
     */
    REFUSED: 'kehikot.refused',
    /**
     * Module → host (2.94.0). "The person is dragging a file of the project out of my page": `{ phase,
     * file, at, dropped }`, `start` when the drag begins, `end` when it ends, with where it ended in the
     * page's own coordinates and whether something took it (`dropEffect` not `none`). Sent by `connect`
     * by itself for a drag the page put a file on with `fileDrag.set`. WebKit hands no drag events to a
     * page of another origin than the one the drag began in, so a drop on another module's frame is
     * never heard there: the host, which knows where each frame is, hands it on as `kehikot.drop`. A
     * host before 2.94.0 drops it unread.
     */
    DRAG: 'kehikot.drag',
    /**
     * Host → module (2.94.0). "A file was dropped on your page": `{ file, at }`, `at` in this page's
     * own coordinates. Sent only to a module whose manifest says `opens: ['file']`, for a drag another
     * module's page told of (`kehikot.drag`) that nothing took where it ended, over this module's frame.
     * The file is the dragging page's claim: confine it like any path. No answer.
     */
    DROP: 'kehikot.drop',
    /**
     * Host → module (2.69.0). "Search what you show": `{ id, query, caseSensitive, wholeWord,
     * direction }`, sent while the host's find bar is open — for every change of the query or an
     * option (`first`), for previous and next, and once with `close` when the bar closes. Answered by
     * `kehikot.find.result` carrying the same `id`. See `find.ts` and docs/find.md.
     */
    FIND: 'kehikot.find',
    /**
     * Module → host (2.69.0). "This is what that search came to": `{ id, total, current }`, or
     * `{ id, unsupported: true }` from a page that cannot search. Sent for each `kehikot.find`, and
     * again by itself when what the page shows changes while the bar is open (the count moved).
     */
    FIND_RESULT: 'kehikot.find.result',
    /**
     * Module → host (2.69.0). "Open your find bar for me": the person pressed ⌘F (or ⌘G, `step`)
     * inside the page, where the host cannot hear a key. Carries the page's selected text, when there
     * is a short one, to start the search with. Sent only to a host whose greeting said `find: true`.
     */
    FIND_OPEN: 'kehikot.find.open',
    /**
     * Module → host (2.70.0). "My page is drawn: take your cover off." Sent once per greeting, after a
     * `kehikot.ready` that said `hold: true`, when the page calls `ready()` or the client's own
     * `HOLD_COVER_MS` passes. A host before 2.70.0 lifts its cover on `ready` and drops this unread.
     */
    DRAWN: 'kehikot.drawn',
    /**
     * Module → host (2.84.0). "I am drawing what your new context asks for": sent after a
     * `kehikot.context`, by a page whose redraw waits on something (a read of its own server, a file).
     * A host covers the container only if `kehikot.drawn` has not followed within
     * `LOADING_COVER_AFTER_MS`, saying `label` (or "Loading <module>…"), until `kehikot.drawn` or
     * `HOLD_COVER_MS`. Inside a greeting's hold it only gives that cover its label. A page that redraws
     * at once sends nothing. A host before 2.84.0 drops it unread.
     */
    LOADING: 'kehikot.loading',
    /**
     * Host → module (2.79.0). "The person's Inbox changed: read it again", or "they asked for the next
     * thing that needs them: go to it". Sent only to a frame whose manifest declares `inbox:person`.
     * No answer. See `inbox.ts` and docs/inbox.md.
     */
    INBOX: 'kehikot.inbox',
};
/**
 * 2.70.0. The longest a page asks a host to keep its cover up after `kehikot.ready` with `hold: true`,
 * in ms: the client says `kehikot.drawn` by itself when it passes. A host keeps its own bound too.
 */
export const HOLD_COVER_MS = 3000;
/**
 * 2.84.0. How long after `kehikot.loading` a host waits for `kehikot.drawn` before it covers the
 * container, in ms: a redraw quicker than this is never covered, so a quick one does not flash.
 */
export const LOADING_COVER_AFTER_MS = 150;
/** The prefix every message type carries, so a listener can drop the rest cheaply. There is one spelling. */
export const MESSAGE_PREFIX = 'kehikot.';
/**
 * What the host says, and only the host. A module sending one of these is confused.
 *
 * These two lists are also how a receiver tells a message it does not KNOW from one it cannot READ:
 * a `kehikot.` type that is in neither list was added by a later version of this package, and is
 * dropped without a word; a type that is listed and does not parse is a fault worth reporting.
 * See docs/header.md, "A message type the other side does not know".
 */
export const HOST_MESSAGES = [
    MESSAGE.HELLO,
    MESSAGE.CONTEXT,
    MESSAGE.RESPONSE,
    MESSAGE.GOTO,
    MESSAGE.EVENT,
    MESSAGE.CLEAR,
    MESSAGE.REFRESH,
    MESSAGE.PRESS,
    MESSAGE.OPENED,
    MESSAGE.COVERED,
    MESSAGE.VISIBLE,
    MESSAGE.FIND,
    MESSAGE.INBOX,
    MESSAGE.DROP,
];
/** And what the module says. */
export const MODULE_MESSAGES = [
    MESSAGE.READY,
    MESSAGE.REQUEST,
    MESSAGE.RESIZE,
    MESSAGE.WENT,
    MESSAGE.FILTERS,
    MESSAGE.CLEARABLE,
    MESSAGE.REFRESHABLE,
    MESSAGE.HEADER,
    MESSAGE.PRESSED,
    MESSAGE.FOOTER,
    MESSAGE.POINTER,
    MESSAGE.PAGE_ERROR,
    MESSAGE.REFUSED,
    MESSAGE.FIND_RESULT,
    MESSAGE.FIND_OPEN,
    MESSAGE.DRAWN,
    MESSAGE.LOADING,
    MESSAGE.DRAG,
];
/**
 * How tall a frame may be asked to be, in pixels, bounded on both sides. `clampHeight` restates
 * the host's answer so a module can do the arithmetic on its own side.
 */
export const MIN_HEIGHT = 200;
export const MAX_HEIGHT = 20000;
/**
 * How often a host may be asked to refresh one container, in minutes: one minute at the fast end,
 * a day at the slow end. Wherever the setting is stored, `null` rather than zero says "not on a clock".
 */
export const REFRESH_EVERY_MIN = 1;
export const REFRESH_EVERY_MAX = 1440;
/**
 * What a host will make of a height a module asked for. Pure, so a module can predict the answer.
 * It is not the check: the host runs its own copy of this over the raw value it was handed.
 */
export function clampHeight(height) {
    if (!Number.isFinite(height))
        return MIN_HEIGHT;
    return Math.max(MIN_HEIGHT, Math.min(Math.round(height), MAX_HEIGHT));
}
