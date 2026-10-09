/**
 * The spellings, the numbers, and the one place each of them is written down.
 *
 * Everything in this file exists because two programs have to agree about it
 * and neither of them owns it. A host that spells the greeting `kehikot.hello`
 * and a module that listens for `kehikot.Hello` are not slightly wrong; they
 * are two programs that will never speak, and the failure has no symptom other
 * than silence. So there is one definition of each spelling and both sides
 * import it.
 */
/**
 * The protocol both sides speak.
 *
 * An integer, not a semver string, and deliberately so: a module has to state
 * which it speaks BEFORE anything is framed, and a comparison that can be got
 * wrong is a comparison that will be. When this becomes 2, a module still
 * saying `>=1 <2` is not broken — it is incompatible, which is a different
 * sentence and earns a different one on screen.
 *
 * ## Why it is 2, and why the new capability is not what raised it
 *
 * The rule has not moved: a number that goes up for ADDITIONS is a number
 * nobody can act on. Every module in the world becomes incompatible on the day
 * the host learns a new word, and the honest reading of that refusal is
 * "nothing is wrong". Raise it only when an existing message changes meaning or
 * an existing field changes shape.
 *
 * By that rule, none of these earned a bump, and it is worth listing them so
 * the reasoning stays visible the next time somebody adds something:
 *
 * - The greeting no longer carries a list of permissions, because there are no
 *   permissions. A module that reads that field finds nothing there and greys
 *   out nothing, which is a module showing MORE of itself than before.
 * - `kehikot.goto` and `kehikot.went` are message types both halves already
 *   ignore when unrecognised — they have to, since a window receives every
 *   `postMessage` sent to it — so sending one to a module that never heard of
 *   it produces silence, which is what it produced yesterday.
 * - `view.goto` is a new METHOD. A host that does not have it answers
 *   `unknown-method`, which is the refusal that already exists and the one a
 *   caller is already told to expect. A module built against a host without it
 *   loses a feature and keeps a page.
 * - `passage` is a new CONTEXT FIELD, and `passage.set` a new method for
 *   filling it. It defaults to `null`, which is exactly what a module reading
 *   it against an older host would have found there anyway: "nobody is pointing
 *   at anything". A module that never reads it is untouched, and a module that
 *   does reads a real state rather than an absence. Nothing that already had a
 *   shape changed shape.
 * - `kehikot.filters` is a new MESSAGE and `context.filters` a new context
 *   field, and both pass the same test. A module message a host has never heard
 *   of is dropped, which is what any unrecognised message has always produced,
 *   and the module is left drawing its own control exactly as it did — it loses
 *   a place to put the control, not the control. The context field defaults to
 *   `{}`, which is precisely what a module reading it against an older host
 *   would have found: nothing has been chosen for it, because nothing there can
 *   choose. Nothing gets a second meaning and nothing changes shape.
 * - `kehikot.clearable` and `kehikot.clear` are two new MESSAGES, one in each
 *   direction, and they pass the same test from both ends. A host that has
 *   never heard of `clearable` drops it and draws no control, which is what
 *   every module's header looked like the day before — the module loses a place
 *   to put a control, not the ability to clear anything, since a module that
 *   wants a button in its own page has always been free to draw one. A module
 *   that has never heard of `clear` drops it, and a host whose press produced
 *   nothing is a host that never had the control to press, because it only
 *   draws one for a module that announced itself. There is no version of this
 *   where one side acts on a half-understanding of the other.
 *
 * - `containers` is a new CONTEXT FIELD and `showing.set` a new method for
 *   filling part of it, and they pass the test from both ends. The field
 *   defaults to `[]`, which is what a module reading it against an older host
 *   would have found: that host has told it nothing about which containers
 *   are on the kehikko or what they show, and a consumer that narrows to what
 *   is picked out has nothing to narrow to and shows everything — which is
 *   what it showed yesterday. The method is answered `unknown-method` by an
 *   older host, exactly as `passage.set` was, and a module that asked loses a
 *   way to say what it shows and keeps its page. Going the other way, a module
 *   built against an older copy of this package parses the context with a
 *   schema that has no such field, and a `z.object` strips what it does not
 *   name — so the field never reaches the module at all, and the module is
 *   byte-for-byte the module it was. Nothing that already had a shape changed
 *   shape.
 *
 *   It is worth saying out loud that a DESTRUCTIVE addition does not earn a
 *   bump either, tempting as it is to raise the number to mark the occasion. A
 *   version is not a warning label. It says whether two programs can speak, and
 *   these two can speak to every host and module that already existed.
 *
 * What did raise it is a rename. **Epics are not journeys**: an epic belongs to
 * a project and is the host's own material; a journey is a different idea
 * living in a module app of its own. The context field naming what is open, the
 * methods that read it, the mode scope, the capability names and the slug
 * pattern all said "journey" and all meant "epic". That is an existing field
 * changing shape and existing methods changing name — the exact condition this
 * number is for — so it goes to 2, and a module built against 1 is
 * INCOMPATIBLE rather than degraded, which is the true sentence: it would ask
 * for `journey.get`, be refused, and read a context field that is no longer
 * there.
 *
 * There are no aliases for the old spellings, deliberately. A shim would let a
 * module keep the conflation working, and the conflation is the thing being
 * removed.
 */
export const PROTOCOL = 2;
/*
 * ## And why the rename did not raise it either
 *
 * Every name on the wire changed spelling — `roadmap.hello` became
 * `kehikot.hello`, `roadmap.module` became `kehikot.module`, the well-known
 * path, the extension names and the module ids with them — when the app that
 * was once called "roadmap" became Kehikot. That LOOKS like the condition above:
 * existing messages changing name. It is not, because nothing changed meaning
 * and nothing was taken away. Both spellings are read everywhere, and the old
 * one is still written to anybody known to speak only it — see `dialect.ts`.
 * A module built against the old names keeps working against a new host, and a
 * module built against the new ones keeps working against an old host. Two
 * programs that could speak yesterday can speak today, which is the only thing
 * this number is for, so it stays where it is.
 *
 * The essay above says there are no aliases for the epic/journey rename, and
 * that is not contradicted here. That rename removed a confusion and an alias
 * would have kept it alive. This one removes a NAME, and the alias keeps
 * nothing alive but the modules that have not been updated yet.
 */
/**
 * The one path a module has to answer on. Nothing else is ever asked for.
 *
 * Under `/.well-known/` because that is where a program publishes a fact about
 * itself that some other program came looking for, and because it cannot
 * collide with whatever the module's own pages are called.
 */
export const WELL_KNOWN = '/.well-known/kehikot-module.json';
/**
 * Where a module built before the rename serves its manifest.
 *
 * A host asks `WELL_KNOWN` first and this second, so an unchanged module is
 * still found. A module built against this package may serve its manifest here
 * too, in the old dialect (`legacyManifest`), so an unchanged host still finds
 * it. See `dialect.ts`.
 */
export const LEGACY_WELL_KNOWN = '/.well-known/roadmap-module.json';
/**
 * The word that makes a manifest a claim rather than a hopeful GET.
 *
 * Something else entirely may be listening on the port a host asks, and it must
 * not be possible for that something to become a tab by accident. A JSON
 * document that does not say this word is not a manifest, however many of the
 * other fields it happens to have.
 */
export const MANIFEST_KIND = 'kehikot.module';
/**
 * The same word before the rename. Accepted by `manifestSchema`, and the way a
 * host knows to greet a module in its old dialect — see `dialectOfKind`.
 */
export const LEGACY_MANIFEST_KIND = 'roadmap.module';
/**
 * Every message type, spelled once.
 *
 * Prefixed `kehikot.` so that a page framed inside a host can tell a message
 * meant for it from the analytics beacon, the framework hot-reload socket, and
 * whatever else in a browser posts messages at windows all day. Both ends
 * filter on the prefix before they look at anything else.
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
     * Host → module. An extension payload another module emitted.
     *
     * The ninth message, and it exists because the eight before it left
     * `events.emit` with nowhere to land. A module could emit a notification, a
     * host could check the extension was one it knew and validate the payload
     * against that format's schema and read from every manifest which modules
     * `consume` the name — and then had no way to say it. One host's own comment
     * called that its principal piece of feedback on this protocol.
     *
     * A module receives one of these because its manifest CONSUMES the extension.
     * It is not a request, carries no correlation id, and is not answered: a
     * module that ignores every event it is sent is a conforming module, and a
     * host that waited for acknowledgement would be a host that can be hung by a
     * pane nobody is looking at.
     */
    EVENT: 'kehikot.event',
    /**
     * Module → host. "Here is what I can be narrowed by."
     *
     * The tenth message, and the first one where a module offers the host
     * something to DRAW rather than something to do. Everything else a module
     * says is either a question (`request`), an answer (`went`), an announcement
     * about itself (`ready`) or a wish about its own box (`resize`). This is a
     * module handing over a small piece of its own interface, because the place
     * that interface belongs is a strip the module cannot reach.
     *
     * ## Why a message and not a manifest field
     *
     * What a module can be narrowed by is not a fact about the program; it is a
     * fact about what the program is showing right now. A file tree offers "hide
     * ignored" and the label on it is `hide 3 ignored` in one directory and
     * `hide 41 ignored` in the next. A manifest is read once, before the module
     * runs, and could carry neither the count nor the fact that a particular
     * project has nothing ignored in it at all.
     *
     * That is also what keeps this from becoming a third declaration beside
     * `declares.uses` and `reacts`. Those two are written in a document a person
     * reads BEFORE running the program, and the whole discipline around them is
     * that nothing is granted by them. This is not in the manifest, is not read
     * by anything before the module runs, and gates nothing: a module that never
     * sends one is a module the host draws no control for, which is exactly what
     * every module looked like the day before this existed.
     *
     * ## Fire and forget, like `resize` and for the same reason
     *
     * No id, no answer. The host may draw the offer, may draw part of it, may
     * ignore it entirely; a module that needed to know can watch what arrives
     * back in `context.filters`. A module posting this at a host that has never
     * heard of it gets silence, which is what an unrecognised message has always
     * produced in both directions.
     *
     * The offer REPLACES whatever was last offered, whole. An empty `groups` is
     * how a module withdraws — it has nothing to be narrowed by any more, and the
     * host takes the control away rather than leaving a menu of options that no
     * longer mean anything.
     */
    FILTERS: 'kehikot.filters',
    /**
     * Module → host. "What I am showing can be cleared, and here is what to call it."
     *
     * The eleventh message, and the second one where a module hands the host a
     * piece of its own interface to draw. `filters` is the model and this follows
     * it deliberately rather than inventing a second shape: an announcement about
     * what the module is showing RIGHT NOW, fire and forget, replacing whatever
     * was last said, absent by default, and gating nothing.
     *
     * ## Why this is a second message and not a field on `filters`
     *
     * They looked like one thing — two little controls a module offers for the
     * header — and folding them together would have saved a message type. It is
     * the wrong shape for three reasons, and the third is the one that would have
     * bitten.
     *
     * They are INDEPENDENT. Most modules that can be narrowed cannot clear
     * anything: a paper cannot delete a paper, a file tree cannot delete a
     * repository. Some future module will be able to clear and have nothing to
     * narrow by. One message means every module has to state both facts to state
     * either.
     *
     * They CHANGE FOR DIFFERENT REASONS. A filter offer changes when the options
     * or their counts change; a clear offer changes when what is on screen
     * becomes empty or non-empty. Folded together, each would re-announce the
     * other constantly, and the host's own "is this worth a write" comparison
     * would be comparing two unrelated facts.
     *
     * And the WITHDRAWAL would become ambiguous, which is the failure. `filters`
     * withdraws by sending an empty `groups`, whole-replacement being the entire
     * point of that message. A module that had nothing to narrow by and sent
     * `{ groups: [] }` would, under one message, have silently withdrawn its
     * clear control too — with nothing erroring and a button simply gone. That is
     * exactly the class of silent failure this protocol keeps designing against,
     * and the cost of avoiding it is one more string in this object.
     *
     * ## The offer, whole, every time
     *
     * `label` is the module's own words for what would go, and `null` is how a
     * module withdraws — there is nothing on screen to clear, so the host takes
     * the control away rather than leaving a button that deletes nothing. It is
     * the exact counterpart of an empty `groups`.
     */
    CLEARABLE: 'kehikot.clearable',
    /**
     * Host → module. "Clear what you are showing."
     *
     * The twelfth, and the one message in this protocol that asks a module to
     * DESTROY something. So it is worth being exact about what it does and does
     * not say.
     *
     * ## The host never touches the data and never learns what went
     *
     * This carries no ids, no filter, no count, and gets no answer. It is a
     * press, relayed. The module does the deleting, out of its own store, and the
     * host is not told what was in it — which is the same discipline as
     * `filterOptionSchema`: the host draws a control and reports that it was
     * pressed, and the meaning stays where the meaning is.
     *
     * ## "What you are showing" is the MODULE's determination
     *
     * Under whatever narrowing is in force — its own filters, this protocol's
     * filters, a search box in its own page, a scroll position, anything. Only
     * the module knows what is on screen, and that is the whole reason this is a
     * message rather than a method with parameters: a host that named what to
     * delete would be a host deciding what "shown" means for somebody else's
     * page, and it would get it wrong the first time a module narrowed by
     * something the protocol has no word for.
     *
     * The practical consequence is the one that makes the control worth having:
     * it COMPOSES with the filter beside it. Narrow to one file, press clear, and
     * one file's worth goes. Nothing in this message says so; it falls out of the
     * module being the one that answers the question.
     *
     * ## Not answered, and not correlated
     *
     * Like `kehikot.event` and for a sharpened version of the same reason. There
     * is nothing for the host to do with an acknowledgement except display it,
     * and displaying it would mean the host reporting a number it did not count
     * about data it cannot see. What a module says afterwards is a new
     * `kehikot.clearable` — with a smaller count in the label, or `null` because
     * there is nothing left — which is feedback the module wrote and the host
     * merely draws.
     *
     * ## The two-press arm is the HOST's, and it has to be
     *
     * A host that sends this on a single press has built a button that deletes
     * somebody's notes because they were aiming at the fold beside it. A host
     * cannot delegate the guard to the module either: `confirm()` inside a framed
     * page is silently `false` in any sandbox without `allow-modals`, which is
     * every sensible one. So the host arms, and this message is sent only by the
     * second press. Nothing here can enforce that, which is why it is written
     * down.
     */
    CLEAR: 'kehikot.clear',
    /**
     * Module → host. "I can be refreshed, and this is when I last was."
     *
     * The thirteenth, and the third control a module can put in its own
     * container's header. It is `clearable`'s shape — an offer, whole, every
     * time, withdrawable — with one field that is unlike anything else in this
     * protocol and is the reason the message exists at all.
     *
     * ## `at` is the MODULE's fact, and a host must never infer it
     *
     * "Last refreshed" looks like something a host could work out for itself: it
     * sent `kehikot.refresh` at 10:04, so the data is from 10:04. That is wrong
     * in every case anybody cares about, and wrong silently:
     *
     *  - the module answered out of its own cache and the reading is an hour old;
     *  - the refresh failed and what is on screen is the last good one;
     *  - the module refreshed itself, on its own, for a reason the host has no
     *    view of — a project changed under it, somebody pressed something inside
     *    the page;
     *  - the host has never asked at all, and the module has been running for a
     *    day with a reading from when it started.
     *
     * In all four the host would print a time that is not when the data was read,
     * beside data that is older than it says. A freshness line that can be wrong
     * is worse than no freshness line, because the entire reason to draw one is
     * that a stale list and a short list look identical. So the module says when,
     * in its own words about its own data, and the host formats what it was told
     * and nothing else. `null` is a real answer and means "I cannot say" — a host
     * draws no time rather than inventing one.
     *
     * ## `busy` is here so that the host's control can be honest for the second
     * a refresh takes
     *
     * The module knows whether a read is in flight; the host knows only that it
     * posted a message into a frame. Two presses racing is two subprocesses and
     * one answer that wins for no reason anybody could predict, and the cheapest
     * place to prevent it is the button.
     *
     * ## What it does NOT carry
     *
     * No interval. How often to refresh is the person's setting about one
     * container, the host stores it beside the filter choice, and the host runs
     * the clock — see `MESSAGE.REFRESH`. A module told the interval would be a
     * module tempted to run a second timer, and two timers on one list is a
     * program spending somebody's rate limit twice.
     *
     * No error, and no result. A refresh that failed is the module's to draw, in
     * its own page, in its own words, with whatever remedy it can offer. The most
     * a host can honestly say is when the data is from, which is `at`.
     */
    REFRESHABLE: 'kehikot.refreshable',
    /**
     * Host → module. "Read your material again."
     *
     * The fourteenth, and `MESSAGE.CLEAR`'s twin in shape: a press, relayed,
     * carrying nothing and answered by nothing. What comes back is not a reply
     * but a new `kehikot.refreshable` — `busy: true` while it runs, then a new
     * `at` — which is the module reporting on its own work in its own words, the
     * only reporting anybody here is entitled to.
     *
     * ## One message for two causes, deliberately
     *
     * A person pressed refresh, or an interval elapsed. The module cannot tell
     * which and must not need to: what it is being asked to do is identical, and
     * a flag saying "this one was automatic" would immediately be used to behave
     * differently — to skip a cache on one and not the other — which is the
     * module deciding policy from a fact about somebody else's timer.
     *
     * ## The interval belongs to the host, and it is stored per CONTAINER
     *
     * "Every five minutes" is a person's setting about one container on one
     * canvas, in the same family as the filter choice and stored the same way. It
     * has to outlive the module's next reload, and a module cannot promise that:
     * its page is loaded once and shown wherever it is asked for, so a module
     * holding the interval would give every container of it the same one — which
     * is the exact failure `filters` on the placement schema exists to avoid.
     *
     * So the host owns the clock. That also puts the timer where the facts are:
     * only the host knows whether the container is on the canvas somebody is
     * looking at, whether it is folded, and whether it is pinned — and an
     * interval that goes on spending a rate limit for a container nobody has open
     * is the thing this feature is most likely to become.
     *
     * ## Not sent to a module that has not offered
     *
     * A host draws this control only for a module that announced
     * `kehikot.refreshable`, so a press or a tick for a module that never did is
     * a press on a button that should not exist. The bound on how often it may be
     * sent is `REFRESH_EVERY_MIN`: a host must not run this faster than the
     * person asked for, and must not run it at all when nobody asked.
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
 * How tall a frame may be asked to be.
 *
 * Bounded on both sides, and the two bounds are for opposite failures. A module
 * cannot make itself two pixels tall and disappear from a page somebody is
 * looking at, and it cannot push everything below it over the horizon either.
 *
 * The numbers are here rather than in the host so that a module can do the
 * arithmetic on its own side and know what it will get. `clampHeight` is the
 * host's answer restated, not a substitute for it — see the note on that
 * function.
 */
export const MIN_HEIGHT = 200;
export const MAX_HEIGHT = 20000;
/**
 * How often a host may be asked to refresh one container, in MINUTES.
 *
 * Here rather than in a host for the same reason the height bounds are: the
 * number is part of what the two sides have agreed, so a module reading this
 * package knows what a person can do to it, and a second host written against
 * this protocol does not have to guess.
 *
 * Both ends are for a specific failure.
 *
 * **One minute at the fast end**, and not seconds. Every module this exists for
 * spends something to refresh — a subprocess, a rate limit, somebody else's
 * API — and a control offering "every 10 seconds" is a control that will be set
 * to every 10 seconds by somebody who then goes to lunch. A minute is already
 * far more often than any of these lists actually change; the interesting
 * settings are five and fifteen.
 *
 * **A day at the slow end**, because past that the setting is not really an
 * interval any more: a container refreshed every three days is one nobody is
 * watching, and the honest answer for that container is the button. The bound
 * keeps a number that cannot be reasoned about — a year, a random large
 * integer out of a database somebody hand-edited — out of a timer.
 *
 * `null` rather than zero is how "not on a clock" is said, wherever this is
 * stored. Zero would be an interval of no length, which a program will one day
 * divide by or loop on.
 */
export const REFRESH_EVERY_MIN = 1;
export const REFRESH_EVERY_MAX = 1440;
/**
 * What a host will make of a height a module asked for.
 *
 * Pure, and offered so a module can predict the answer rather than discovering
 * it by watching its own layout jump. It is not the check: the host runs its
 * own copy of this, over the raw value it was handed, because a module could
 * post a height of `NaN`, of `"600"`, or of nothing at all, and a host that
 * trusted a number because a package existed would be trusting the module.
 */
export function clampHeight(height) {
    if (!Number.isFinite(height))
        return MIN_HEIGHT;
    return Math.max(MIN_HEIGHT, Math.min(Math.round(height), MAX_HEIGHT));
}
//# sourceMappingURL=constants.js.map