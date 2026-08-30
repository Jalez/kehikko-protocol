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
];
/** And what the module says. */
export const MODULE_MESSAGES = [MESSAGE.READY, MESSAGE.REQUEST, MESSAGE.RESIZE, MESSAGE.WENT];
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
    /** A sentence explaining a refusal, going back to whoever asked. */
    REASON: 400,
    /** How many modes one module may offer. */
    MODES: 8,
    /** How many extensions it may name in each direction. */
    EXTENSIONS: 16,
    /** How many capabilities it may declare. */
    CAPABILITIES: 32,
    /** How many refs one payload may carry, and how many may be selected at once. */
    REFS: 32,
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