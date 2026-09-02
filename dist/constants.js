/**
 * The spellings, the numbers, and the one place each of them is written down.
 *
 * Everything in this file exists because two programs have to agree about it
 * and neither of them owns it. A host that spells the greeting `roadmap.hello`
 * and a module that listens for `roadmap.Hello` are not slightly wrong; they
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
 * - `roadmap.goto` and `roadmap.went` are message types both halves already
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
 * - `roadmap.filters` is a new MESSAGE and `context.filters` a new context
 *   field, and both pass the same test. A module message a host has never heard
 *   of is dropped, which is what any unrecognised message has always produced,
 *   and the module is left drawing its own control exactly as it did — it loses
 *   a place to put the control, not the control. The context field defaults to
 *   `{}`, which is precisely what a module reading it against an older host
 *   would have found: nothing has been chosen for it, because nothing there can
 *   choose. Nothing gets a second meaning and nothing changes shape.
 * - `roadmap.clearable` and `roadmap.clear` are two new MESSAGES, one in each
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
/**
 * The one path a module has to answer on. Nothing else is ever asked for.
 *
 * Under `/.well-known/` because that is where a program publishes a fact about
 * itself that some other program came looking for, and because it cannot
 * collide with whatever the module's own pages are called.
 */
export const WELL_KNOWN = '/.well-known/roadmap-module.json';
/**
 * The word that makes a manifest a claim rather than a hopeful GET.
 *
 * Something else entirely may be listening on the port a host asks, and it must
 * not be possible for that something to become a tab by accident. A JSON
 * document that does not say this word is not a manifest, however many of the
 * other fields it happens to have.
 */
export const MANIFEST_KIND = 'roadmap.module';
/**
 * Every message type, spelled once.
 *
 * Prefixed `roadmap.` so that a page framed inside a host can tell a message
 * meant for it from the analytics beacon, the framework hot-reload socket, and
 * whatever else in a browser posts messages at windows all day. Both ends
 * filter on the prefix before they look at anything else.
 */
export const MESSAGE = {
    /** Host → module. The greeting, and the whole of what a module is given without asking. */
    HELLO: 'roadmap.hello',
    /** Module → host. "I heard you, and here is the protocol I answered in." */
    READY: 'roadmap.ready',
    /** Host → module. Which epic is open, which project it belongs to and where that project is, and which theme. */
    CONTEXT: 'roadmap.context',
    /** Module → host. One question, with an id the answer will carry back. */
    REQUEST: 'roadmap.request',
    /** Host → module. The answer to exactly one request. */
    RESPONSE: 'roadmap.response',
    /** Module → host. How tall the module would like its frame to be. */
    RESIZE: 'roadmap.resize',
    /** Host → module. "Go to this reference." */
    GOTO: 'roadmap.goto',
    /** Module → host. "I went" — or "there is nothing here by that name." */
    WENT: 'roadmap.went',
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
    EVENT: 'roadmap.event',
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
    FILTERS: 'roadmap.filters',
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
    CLEARABLE: 'roadmap.clearable',
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
     * Like `roadmap.event` and for a sharpened version of the same reason. There
     * is nothing for the host to do with an acknowledgement except display it,
     * and displaying it would mean the host reporting a number it did not count
     * about data it cannot see. What a module says afterwards is a new
     * `roadmap.clearable` — with a smaller count in the label, or `null` because
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
    CLEAR: 'roadmap.clear',
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
     * sent `roadmap.refresh` at 10:04, so the data is from 10:04. That is wrong
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
    REFRESHABLE: 'roadmap.refreshable',
    /**
     * Host → module. "Read your material again."
     *
     * The fourteenth, and `MESSAGE.CLEAR`'s twin in shape: a press, relayed,
     * carrying nothing and answered by nothing. What comes back is not a reply
     * but a new `roadmap.refreshable` — `busy: true` while it runs, then a new
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
     * `roadmap.refreshable`, so a press or a tick for a module that never did is
     * a press on a button that should not exist. The bound on how often it may be
     * sent is `REFRESH_EVERY_MIN`: a host must not run this faster than the
     * person asked for, and must not run it at all when nobody asked.
     */
    REFRESH: 'roadmap.refresh',
};
/** The prefix every message type carries, so a listener can drop the rest cheaply. */
export const MESSAGE_PREFIX = 'roadmap.';
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
/**
 * How long anything is allowed to be.
 *
 * Every one of these is load-bearing rather than hygiene, and the reason is
 * always the same: a manifest is a document written by a stranger, and most of
 * its fields end up on the host's own screen. Four rounds of review over the
 * implementation this package was distilled from found unbounded fields at four
 * different places, and each one was a paragraph of somebody else's text — or
 * two hundred thousand characters of it, or a right-to-left override — printed
 * under a name a person was about to make a decision about.
 *
 * `URL` is 2048 because that is the number browsers and proxies have long
 * treated as the practical limit of a URL, which makes it the longest one that
 * could ever be worth honouring rather than a figure invented here. `RANGE` is
 * 40 because `>=1 <2` is seven characters and the grammar `speaks()` reads
 * cannot spell anything long — and it matters more than its size suggests,
 * because a protocol range is the one manifest string a host is likely to quote
 * into a sentence when it refuses the module.
 *
 * They are exported so that a host writing its own copy of these schemas — and
 * it should; see the README — can hold to the same numbers without guessing at
 * them, and so a module can refuse its own too-long summary before publishing
 * it rather than being refused for it.
 */
export const LIMITS = {
    /** A URL of any kind: `entry`, `icon`, `health`, `mcp.url`. */
    URL: 2048,
    /** `needs.protocol`, the range a module says it speaks. */
    RANGE: 40,
    /** A module's display name. */
    NAME: 40,
    /** Its version string, which this protocol never parses. */
    VERSION: 32,
    /** One line about what it is. */
    SUMMARY: 200,
    /** The word on a tab. */
    LABEL: 24,
    /** An extension name, e.g. `roadmap.notifications@1`. */
    EXTENSION: 64,
    /** A capability a module declares it will use. */
    CAPABILITY: 64,
    /**
     * The name of a context kind a module says it reacts to. See `reacts`.
     *
     * The same 64 as `CAPABILITY` and `EXTENSION`, and the sameness is deliberate
     * rather than lazy: all three are short registry words a module copies out of
     * a document, and an author made to remember three different ceilings for
     * three lists of short words will get one of them wrong. The words this
     * version knows are `passage`, `selection` and `containers`; the room is for
     * the ones a later host broadcasts.
     */
    REACTION: 64,
    /** An epic slug, everywhere one appears. */
    EPIC_SLUG: 80,
    /** A project name, as read off the page. */
    PROJECT: 80,
    /**
     * An absolute path to a folder on the machine the host is running on.
     *
     * 4096 because that is Linux's `PATH_MAX`, and it is the larger of the two
     * numbers a host is likely to be standing on — macOS imposes 1024. Taking the
     * larger means this bound never refuses a path the operating system was
     * willing to hand out; a module that finds one too long for its own platform
     * finds out from the platform, which is the thing that actually knows.
     *
     * It is a bound and not a validation. This package does no I/O: it cannot say
     * whether a path exists, is a directory, or is even absolute, and a regex
     * pretending otherwise would be a check that passes for `../../etc` on every
     * host in the world. What the bound does is stop a host putting a document in
     * a field a module is about to render, which is the same job every other
     * number here does.
     */
    PATH: 4096,
    /** The name of one conversation with one frame. */
    SESSION: 128,
    /** The id correlating a request with its response, or a goto with its answer. */
    CORRELATION: 64,
    /** A method name on the wire. */
    METHOD: 80,
    /** A reference like `gh#41`, wherever one is carried. */
    REF: 64,
    /**
     * A reference inside a `goto` or a `view.goto`, which is longer than `REF`
     * and deliberately not the same number.
     *
     * `REF` bounds a reference being STORED — filed against work, in a database,
     * under somebody's name, where a clipped one is a *different* ref against
     * work nobody meant. This one bounds a reference being MATCHED: carried
     * across the frame, compared against the anchors in a rendered page, and
     * then forgotten. 200 is not invented here either — it is what the receiver
     * that already exists imposes on its own inbound `ref`, and the number is
     * restated so a sender knows what will survive rather than discovering it by
     * having a walk land nowhere.
     *
     * If the two ever become one number it should be by lowering this one, and
     * that would be a break: a module already sending a 120-character ref would
     * stop being able to. Raising `REF` instead would loosen a bound on text that
     * gets written down, which is the wrong direction for the wrong reason.
     */
    GOTO_REF: 200,
    /**
     * An epic's title, in the one place this package describes a host's own
     * material — the spine of `epics.list`. See `methods.ts`.
     *
     * Worth a word, because this is text going the OTHER way: the host wrote it
     * and the module is what has to survive it. The bound is not protecting a
     * host from a stranger here. It tells a module author how much room to leave
     * in a list they are about to draw, so that a title is either shown whole or
     * known to be too long before the layout finds out — and it means a host
     * cannot hand a framed page a document where a name was expected.
     */
    TITLE: 200,
    /** A line of prose a person will read: a notification, a note. */
    MESSAGE: 2000,
    /**
     * The words of the passage a reader is pointing at, carried in the context.
     *
     * ## Why a quote travels at all, when offsets already say where it is
     *
     * A byte range names a place in a file and says nothing about what is there,
     * and the file is being edited while all of this is running. A module that
     * received only `from` and `to` and wanted to show the passage would have to
     * open the file — which most modules cannot, and none should have to in order
     * to draw a line of text — and would read whatever is at those offsets NOW,
     * which after one edit above them is a different sentence with nothing to say
     * so. The quote is the reader's own evidence, taken at the moment they
     * pointed, and it is what lets anything downstream NOTICE that the offsets
     * have rotted rather than confidently naming the wrong prose.
     *
     * ## Why it is bounded far below a document
     *
     * This rides in `roadmap.context`, which is broadcast to every framed module
     * on the canvas every time the reader moves. Unbounded, a reader who selected
     * a chapter would push a chapter through every frame on every change of
     * selection. Two kilobytes is several paragraphs — more than anybody
     * highlights to make a point about — and is nowhere near somewhere to put a
     * document.
     *
     * A sender with more than this is REFUSED rather than clipped, by the rule
     * `stage.report`'s note follows: a clipped quote is a quote of something
     * nobody said, and a consumer comparing it against a file would then call a
     * good anchor rotten. Shorten the selection before sending it, so that the
     * side which knows it shortened something is the side that says so.
     */
    QUOTE: 2000,
    /** A sentence explaining a refusal, going back to whoever asked. */
    REASON: 400,
    /** How many modes one module may offer. */
    MODES: 8,
    /** How many extensions it may name in each direction. */
    EXTENSIONS: 16,
    /** How many capabilities it may declare. */
    CAPABILITIES: 32,
    /**
     * How many context kinds it may say it reacts to.
     *
     * Eight, against `CAPABILITIES`' thirty-two, and the smaller number is an
     * argument rather than an economy. A context has a handful of fields and
     * always will: this version broadcasts three things a module can meaningfully
     * choose to ignore, so a manifest listing eight is already claiming to react
     * to five kinds that do not exist yet. The bound sits where an honest list
     * stops, which means a manifest with thirty entries here is refused as the
     * nonsense it is rather than drawn as a module that reacts to everything.
     */
    REACTIONS: 8,
    /**
     * The id of a filter group or of one of its options.
     *
     * Sixty-four, the same as `CAPABILITY`, `EXTENSION` and `REACTION`, and the
     * sameness is the same argument: these are short machine words a module
     * author invents once and then copies about, and an author made to remember
     * four different ceilings for four kinds of short word will get one of them
     * wrong.
     *
     * It is a bound and not a grammar. A host uses these as keys — in a stored
     * record, in a React list, in a lookup — and the protocol deliberately does
     * not say what they may contain, because a module's own vocabulary for its
     * own filters is none of this package's business. What a host must NOT do is
     * index a plain object with one; see `own()` in `ids.ts`, which exists for
     * exactly this class of string.
     */
    FILTER_ID: 64,
    /**
     * The words a person reads on one filter group, or on one of its options.
     *
     * Forty-eight, which is deliberately twice `LABEL` and nowhere near
     * `SUMMARY`, and both halves of that are load-bearing.
     *
     * Twice `LABEL` because these labels COUNT things. The five filters this was
     * designed against are spelled `hide resolved`, `show ignored`, `hide
     * preamble comments`, `this kehikko` — none of which needs the room — but the
     * one that mattered most is `show 41 ignored`, where the number is the whole
     * reason the label is worth reading. A label that had to be a fixed word
     * could not say how much is being hidden, and hiding things quietly is the
     * failure the modules that grew these controls were most careful about.
     *
     * Nowhere near `SUMMARY` because this is a string a stranger's program wrote
     * that a host is about to lay out inside its own chrome. Forty-eight
     * characters is a phrase; two hundred is a sentence that would have to wrap
     * or truncate in a menu attached to a container that is often 220 pixels
     * wide. A host should truncate anyway — and the host this was built for does,
     * with the full text in a `title`, because a nowrap element carrying a
     * variable string once put an 1187-pixel min-content floor under a 220-pixel
     * container in this workspace. The bound is what keeps the truncation from
     * ever having a document to do it to.
     */
    FILTER_LABEL: 48,
    /**
     * The words a person reads on the control that clears what a module shows.
     *
     * Forty-eight, the same as `FILTER_LABEL`, and for the same two arguments:
     * this label COUNTS things (`12 shown`, `everything from this run`) so it
     * cannot be a fixed word, and it is a stranger's string that a host is about
     * to put on its own chrome, so it must be nowhere near `SUMMARY`.
     *
     * It is a separate NAME at the same NUMBER, deliberately. A host that read
     * `FILTER_LABEL` when bounding a clear label would have tied two features
     * together that have nothing to do with each other, and the day somebody
     * changed one for a reason that belonged to filters, the other would move
     * with it. The sameness of the number is an argument that the two labels are
     * alike; sharing the constant would be a claim that they are the same thing.
     *
     * A host must truncate anyway, and this one does — with the full text in a
     * tooltip and in the accessible name, because the header is a flex row where
     * a `whitespace-nowrap` element carrying a variable string once put an
     * 1187-pixel min-content floor under a 220-pixel container.
     */
    CLEAR_LABEL: 48,
    /**
     * How many groups one module may offer at once.
     *
     * Four, and this is the number most likely to be argued with later, so here
     * is the reasoning. Six of the seven filters in the workspace this was
     * designed for are ONE group — a single choice from a single list. The
     * seventh offers two independent groups that combine (a kind and a state),
     * which is why the facility takes a list of groups at all rather than a list
     * of options. Four leaves that module room to grow one more axis and still
     * refuses the shape this control cannot be: a menu hanging off a
     * twenty-four-pixel button in a container header is not somewhere to put a
     * settings screen. A module with five axes has a settings screen, and it
     * belongs in the module's own page where there is room for it.
     */
    FILTER_GROUPS: 4,
    /**
     * How many options one group may offer.
     *
     * Twelve, against the four the longest real one uses (all files → this file →
     * this section → this selection). The room is for a group whose options are
     * DISCOVERED rather than written — the branches in a repository, the people
     * who wrote something — which is the obvious next thing somebody will want
     * and the obvious way to hand a host a list of nine hundred. Twelve is more
     * than a menu of this kind should hold and far less than a list that has to
     * be scrolled, searched or paged, and a module whose options genuinely run to
     * hundreds is a module that needs a control this one is not.
     */
    FILTER_OPTIONS: 12,
    /**
     * What somebody TYPED into a filter, which is the newest thing in this list
     * and the first value here that is not an identifier.
     *
     * ## Why there is a text kind at all, having refused one twice
     *
     * `filterGroupSchema` said, in its own words, that free text was refused by
     * design: a text input in a container header needs room a 220-pixel header
     * does not have, it needs focus, it needs a keyboard, and a host cannot
     * debounce or interpret somebody else's search. Every clause of that was
     * about a text box laid out IN the header strip beside six icon buttons, and
     * every clause of it is still true of that.
     *
     * What the argument never examined is that the header strip is not where the
     * filter lives. It is one twenty-four-pixel button that opens a MENU, and a
     * menu is a floating layer with its own width, its own focus scope and as
     * many rows as it likes. An input in there costs the header nothing, takes
     * focus because a menu already does, and is dismissed the way every other
     * menu is. The refusal was right about the strip and wrong about the feature.
     *
     * The module that forced it is the one this whole facility was shaped around
     * — a list of references narrowed by kind, by state, and by a typed query.
     * Two of its three axes moved to the header and the third stayed behind,
     * which left one module drawing a row of chrome for the sake of one control,
     * and a person looking in two places for one filter.
     *
     * ## Two hundred, and what the number is protecting
     *
     * This is stored per container in a host's database, echoed back in every
     * `roadmap.context`, and rendered inside somebody else's chrome — the same
     * three exposures `FILTER_LABEL` has, and one more: a module can WRITE it
     * with `filters.set`, so it is the one value here that a program rather than
     * a person can produce at speed.
     *
     * Two hundred is `SUMMARY`, deliberately: it is the length this package has
     * already decided is "a sentence somebody wrote, not a document". Nobody
     * types two hundred characters into a search box on purpose, and a paste that
     * would have is clipped by the module rather than refused by the wire — a
     * clipped query is still a query, where a refused one is a filter that
     * silently stops working the first time somebody pastes a stack trace into
     * it.
     *
     * A host must not use this as a key, index anything with it, or read meaning
     * into it. It is what somebody typed. The KEY beside it is still a
     * `FILTER_ID` and still refuses the three spellings that are not really keys;
     * see the essay there, which is what this bound does not weaken.
     */
    FILTER_TEXT: 200,
    /** How many refs one payload may carry, and how many may be selected at once. */
    REFS: 32,
    /**
     * How many places in documents one container may say it is showing.
     *
     * Sixteen, and the number is about what the field is FOR rather than about
     * any document. A container saying what it shows names the file a reader has
     * open, or the file and the section they are in, or — for a program that
     * lists things — a handful of places at once. That is one, two, or a few. A
     * program with more than sixteen is enumerating its own material into every
     * frame on the canvas on every change, and the essay on `QUOTE` already says
     * why the context is not the place for a document: it is broadcast, to
     * everybody, on every change of anything.
     *
     * Each entry is a whole `passage`, with `quoted` bounded at `QUOTE` — so
     * the worst case is bounded too, and is far larger than any honest use. A
     * module saying what it shows should leave `quoted` EMPTY, and the essay on
     * `containerSchema` in `wire.ts` says why: a quote is a reader's evidence for
     * a highlight, and a file being shown has no highlight to evidence.
     */
    SHOWING_DOCUMENTS: 16,
    /**
     * How many containers one context may describe.
     *
     * Sixty-four, which is the most a host this was written against lets onto one
     * kehikko, restated here so that a module reading `context.containers` knows
     * the size of the list it is about to walk. It bounds an array a HOST built
     * out of its own arrangement, so unlike almost every other number here it is
     * not protecting a host from a stranger — it is protecting a module from a
     * host, the same direction `TITLE` runs in.
     */
    CONTAINERS: 64,
    /**
     * A module's own state, which the host keeps and never reads.
     *
     * Four kilobytes is far more than the thing it is for — which filter is on,
     * which column is sorted — and far less than somewhere to put a document.
     * The bound does two jobs and the second is the interesting one: it says what
     * this is FOR. A module that finds four kilobytes tight is keeping something
     * that belongs in its own store, on its own port, where it can be queried and
     * backed up and read by its author. The host is not a database for modules,
     * and this number is where that is said out loud.
     */
    MODULE_STATE: 4 * 1024,
    /**
     * A prompt a person wrote on a canvas for one module to work from.
     *
     * Larger than a note and smaller than a document. Eight kilobytes holds a
     * paragraph of instruction, a house style, a list of things to watch for —
     * and does not hold a specification, which belongs in a file the prompt can
     * point at rather than in a field the host has to carry to every frame on
     * every context change.
     */
    PROMPT: 8 * 1024,
    /**
     * A module's standing note about what its presence implies.
     *
     * A kilobyte, which is a paragraph — deliberately much smaller than a
     * `PROMPT`. A person writing a prompt is instructing one agent about one
     * piece of work and may need room. A module author is saying one thing, once,
     * to every agent that will ever see this module on a canvas, and it has to
     * survive being concatenated with four others without becoming the whole of
     * what an agent reads. The bound is the design: if it does not fit in a
     * paragraph it is documentation, and documentation goes behind a link.
     */
    GUIDANCE: 1024,
    /** As much of a manifest as anyone should read from a stranger on a port. */
    MANIFEST_BYTES: 64 * 1024,
};
//# sourceMappingURL=constants.js.map