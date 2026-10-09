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
 * Where a module built before the rename serves its manifest. A host asks `WELL_KNOWN` first and
 * this second; a module built against this package may serve its manifest here too, in the old
 * dialect (`legacyManifest`). See `dialect.ts`.
 */
export const LEGACY_WELL_KNOWN = '/.well-known/roadmap-module.json';
/**
 * The word that makes a manifest a claim rather than a hopeful GET. A JSON document that does not
 * say this word is not a manifest, however many of the other fields it happens to have.
 */
export const MANIFEST_KIND = 'kehikot.module';
/**
 * The same word before the rename. Accepted by `manifestSchema`, and the way a
 * host knows to greet a module in its old dialect — see `dialectOfKind`.
 */
export const LEGACY_MANIFEST_KIND = 'roadmap.module';
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
};
/** The prefix every message type carries, so a listener can drop the rest cheaply. */
export const MESSAGE_PREFIX = 'kehikot.';
/**
 * The prefix message types carried before the rename. Still accepted on
 * receive, and still sent to a party that speaks only it. See `dialect.ts`.
 */
export const LEGACY_MESSAGE_PREFIX = 'roadmap.';
/** Both prefixes a listener lets through, the current one first. */
export const MESSAGE_PREFIXES = [MESSAGE_PREFIX, LEGACY_MESSAGE_PREFIX];
/** What the host says, and only the host. A module sending one of these is confused. */
export const HOST_MESSAGES = [
    MESSAGE.HELLO,
    MESSAGE.CONTEXT,
    MESSAGE.RESPONSE,
    MESSAGE.GOTO,
    MESSAGE.EVENT,
    MESSAGE.CLEAR,
    MESSAGE.REFRESH,
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
//# sourceMappingURL=constants.js.map