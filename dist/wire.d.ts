import { z } from 'zod';
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
 * `roadmap.context` from a coincidence.
 */
/**
 * What a module is told about where the reader is standing.
 *
 * ## An epic and a project, because that is what a host can vouch for
 *
 * The field used to be called `slug` and used to mean a journey, and a host is
 * not in a position to say that. A journey lives in a module app of its own; if
 * the host named one here it would be repeating something it was told, in a
 * message a module then treats as authoritative — and the module app that owns
 * journeys could be showing a different one, or none, or have been closed.
 * Context has to be the host's own knowledge or it is a rumour with a
 * protocol's name on it.
 *
 * What the host actually knows is which epic it opened and which project that
 * epic belongs to. So that is what it says. A module wanting to know what
 * journey a person is reading asks the program that owns journeys, and gets an
 * answer from something that can actually answer.
 *
 * The project arrives as two fields — what it is called, and where it is on
 * disk — for reasons argued at each of them below. The short version is that a
 * module has to be able to both NAME the project and OPEN it, and one string
 * cannot do both jobs well.
 *
 * `epic` is null when none is open, and it is nullable rather than absent
 * because "no epic" is a state a module has to be able to move INTO. A field
 * that simply disappeared would leave the module showing the last epic it heard
 * about, forever, which is a page quietly describing the wrong work.
 *
 * `theme` rides along for the same reason the rest of it does: a module that
 * had to ask would render once in the wrong colours first.
 */
/**
 * Where in a document the reader is pointing, at whatever precision they have
 * managed.
 *
 * ## One field, three states, and that is the whole design
 *
 * The ask this exists for was: a pane showing a page of a paper, and a pane
 * showing the notes on it, and the second one narrowing as the first one
 * narrows. Nothing selected but a page open should show the page's notes; a
 * passage selected should show that passage's. Those are not two facts. They
 * are one fact — what is being pointed at — known to two different depths, and
 * the shape has to say so or every consumer invents its own ladder.
 *
 * So there are exactly three readings, and no fourth is expressible:
 *
 *   1. `passage` is `null` — no document is open. Nothing is being pointed at
 *      and nothing narrower could be.
 *   2. `passage` is set and `from`/`to` are `null` — a document is open and the
 *      reader has selected nothing in it. `page`, if the pointing module
 *      paginates, says which sheet is in front of them.
 *   3. `passage` is set and `from`/`to` are numbers — a range of that document
 *      is selected, and `quoted` is what it said when they selected it.
 *
 * `from` and `to` are refused unless BOTH are present and `to` is greater. A
 * half-range is not a coarser answer, it is a malformed one: a consumer reading
 * `from` with no `to` has to invent an end, and the end it invents is a claim
 * about somebody's document. The refusal is where that gets noticed.
 *
 * ## Why not two fields, or a discriminated union
 *
 * `document` beside `selection` was the first shape and it is worse in the way
 * that matters: two fields can disagree — a selection in a document nobody
 * says is open — and every consumer would need a rule for the disagreement,
 * and three consumers would write three rules. A tagged union of `{kind:
 * 'page'} | {kind: 'range'}` cannot disagree, and costs every reader a branch
 * before it can print a path. Nesting the narrower thing inside the wider one
 * gets both: the states are ordered by construction, and the fields common to
 * all of them are read the same way in every state.
 *
 * ## What the host can vouch for, which is less than this carries
 *
 * The same limit `selection` has, and it is worth restating because there is
 * more here to be wrong about. A host relays this; it did not open the file. It
 * cannot say that `path` exists, that `from` and `to` are inside it, that
 * `quoted` is what is there now, or that it ever was. What a host CAN say is
 * that a module on this canvas reported somebody pointing here. Context is the
 * host's own knowledge or it is a rumour with a protocol's name on it — and
 * this one is honestly the second kind, so a consumer must treat every field as
 * a claim by the pointing module and check anything it is going to act on.
 *
 * That is not a flaw to be designed out. It is the reason `quoted` is here: a
 * consumer holding the words as well as the offsets can tell a good anchor from
 * a rotten one by looking, which nothing holding offsets alone can do.
 */
export declare const passageSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    /**
     * Which document. An identity string, and deliberately not promised to be
     * anything else.
     *
     * This package does no I/O and cannot say whether a path exists, is
     * absolute, or is inside anything — see `LIMITS.PATH`, which is the same
     * bound and the same argument. A host with a filesystem should send an
     * absolute path, because that is the only spelling two modules can agree on
     * without sharing a root; a host without one sends whatever names a document
     * in its world. Consumers compare it for EQUALITY. A consumer that resolves
     * it and opens it is opening a path a stranger's program chose, and owes
     * itself the confinement check it would owe any other.
     */
    path: z.ZodString;
    /**
     * Which page of it, or null.
     *
     * Nullable because pagination is not a property of documents; it is a thing
     * some readers do to them. A module showing a scrolling document has no page
     * to name and must not be forced to invent one, and a consumer receiving null
     * knows the difference between "not paginated" and "page 1".
     *
     * It is a FILTER and never an anchor, and the difference is the reason this
     * sits beside `from`/`to` rather than instead of them. Page numbers move when
     * anything above them is edited; byte offsets at least rot visibly against a
     * quote. Anything written down permanently should be written against the
     * range and the words, with the page kept as what it is — a fast way to
     * narrow a list to the sheet somebody is looking at.
     */
    page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    /**
     * The first byte of the selection within `path`, or null when nothing is
     * selected. Bytes rather than characters, because the consumer that opens
     * the file reads bytes and a character count would need the encoding to be
     * agreed on as well.
     */
    from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    /** One past the last byte, exclusive, or null. */
    to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    /**
     * What the selection said when it was made, as the pointing module saw it.
     *
     * Empty when nothing is selected, which is the only honest value then — there
     * is no text to quote for a whole page and a module that sent the page's text
     * would be sending a document through every frame on the canvas.
     *
     * Bounded at `LIMITS.QUOTE` and REFUSED rather than clipped; the essay on that
     * limit says why a clipped quote is worse than no quote at all.
     */
    quoted: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    page: number | null;
    from: number | null;
    to: number | null;
    quoted: string;
}, {
    path: string;
    page?: number | null | undefined;
    from?: number | null | undefined;
    to?: number | null | undefined;
    quoted?: string | undefined;
}>, {
    path: string;
    page: number | null;
    from: number | null;
    to: number | null;
    quoted: string;
}, {
    path: string;
    page?: number | null | undefined;
    from?: number | null | undefined;
    to?: number | null | undefined;
    quoted?: string | undefined;
}>, {
    path: string;
    page: number | null;
    from: number | null;
    to: number | null;
    quoted: string;
}, {
    path: string;
    page?: number | null | undefined;
    from?: number | null | undefined;
    to?: number | null | undefined;
    quoted?: string | undefined;
}>;
/** Where the reader is pointing, at whatever precision they have. */
export type Passage = z.infer<typeof passageSchema>;
export declare const contextSchema: z.ZodObject<{
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /**
     * What the project is CALLED. Unchanged, and deliberately still a name.
     *
     * This is the string a module puts on screen. A path is a bad label — it is
     * long, it is the same for its first forty characters as every other project
     * on the machine, and its last segment is a folder name somebody chose for
     * their disk rather than a name they chose for their work. A host that sent
     * only a path would make every module invent a display name by splitting a
     * string, and eleven modules would split it eleven ways.
     */
    project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /**
     * Where the project IS: an absolute folder path on the host's machine.
     *
     * ## Why a name was not enough
     *
     * A name is something to print. Everything a module actually wants to DO with
     * a project needs somewhere to open: read the epics under it, run a command
     * in it, show its history, list its chapters. Until this field existed each of
     * those modules had to be told its own root separately — an environment
     * variable per module, set by whoever started it — so a host could move a
     * person to another project and every module would go on reading the first
     * one, correctly, from the root it was given at launch. Nothing errored. The
     * modules simply described a different project from the one the host named.
     *
     * Absolute, and the host is the only one in a position to vouch for that.
     * This package does no I/O and cannot check it — see `LIMITS.PATH`. A module
     * receiving a relative path here has been handed something its host could not
     * have meant, and should treat it as it treats any other field it was lied
     * to about.
     *
     * Null is a real state and not an oversight. A host with no filesystem of its
     * own — a hosted one, a demo, a test harness — knows the name of the project
     * a person is looking at and has no folder to point at. A module handed a
     * name and no path can still say which project it is showing and must not
     * pretend it can open it.
     *
     * ## Why this is a second field and not `project: { name, path }`
     *
     * The tidier shape is the object: two facts about one thing, atomically
     * consistent, impossible to have a path without a name — and it is the shape
     * this package already uses for `kehikko`. It was rejected here for one
     * reason, and the reason is `PROTOCOL`.
     *
     * `PROTOCOL` goes up when an existing field CHANGES SHAPE, and stays put when
     * the wire merely learns a new word — see the essay on it in `constants.ts`,
     * which is emphatic that a number going up for additions is a number nobody
     * can act on. Turning `project` into an object is exactly a shape change: a
     * module rendering `context.project` in a span prints a project name today
     * and `[object Object]` afterwards, with no version signal to tell it why.
     * That module is not degraded, it is broken, and the protocol's own rule says
     * it should have been told it was INCOMPATIBLE rather than left to find out
     * on screen.
     *
     * So the choice was: bump the protocol and make every module in the world
     * incompatible in order to nest two strings, or add a field and break
     * nothing. The second is what the rule is for. `project` still means what it
     * meant, still parses as what it parsed as, and a module that never reads
     * `projectPath` is exactly as correct as it was yesterday — which is the test
     * this package applies to every addition.
     *
     * The cost is honest and worth naming: two nullable fields can disagree, and
     * nothing here prevents a host sending a path with no name. A host should
     * fill them in one place, from one project, so that they cannot; this package
     * can say that and cannot enforce it.
     */
    projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    /**
     * What the person has picked out, if anything.
     *
     * ## Why a selection is context and not a message between modules
     *
     * The case that produced this: one module lists an epic's references, another
     * shows a journey, and picking a reference in the first should show it in the
     * second. The obvious build is a channel from one to the other — and that
     * ends modularity, because the first module then has to know the second
     * exists, and a canvas without the second is a canvas where the first is
     * sending into nothing.
     *
     * A selection is the same KIND of fact as the open epic: it is what this
     * canvas is looking at. So it travels the way the epic travels. A module asks
     * the host to set it, the host tells everyone, and no module ever learns
     * which other module is listening — or whether any is. Each works alone, and
     * two of them work together without either having been written for the other.
     *
     * ## Refs and nothing else
     *
     * The sender knows more than this carries — which of these is an issue and
     * which a pull request — and that knowledge deliberately does not travel. See
     * `selection.set` in `methods.ts`: a host can vouch that these are the refs
     * somebody picked, and cannot vouch for what they ARE, because it was told
     * and never checked. Context is the host's own knowledge or it is a rumour
     * with a protocol's name on it, which is the same reason `slug` is not here.
     *
     * Empty rather than absent, for the reason `epic` is nullable rather than
     * optional: "nothing is selected" is a state a module has to be able to move
     * INTO, and a field that simply vanished would leave a module showing the
     * last selection forever.
     */
    selection: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /**
     * Where in a document the reader is pointing, or null.
     *
     * ## A passage is context, and the argument is the one above, unchanged
     *
     * The essay on `selection` a few lines up makes the case for a picked
     * reference travelling as context rather than as a message from one module to
     * another, and every line of it holds here with the nouns swapped. A reader
     * highlights a sentence in the module that shows the paper; a module that
     * keeps notes should narrow to it. The obvious build is a channel from the
     * first to the second, and it ends modularity: the paper would have to know
     * the notes exist, and a canvas without the notes is a paper sending into
     * nothing.
     *
     * There is a second argument here that `selection` did not need, and it is
     * the stronger one. **An event would be missed.** A selection made at
     * 10:04 and a module opened at 10:05 is the ordinary case — a person reads,
     * finds something worth a note, and only then puts a notes pane on the
     * canvas. A message sent at the moment of pointing is gone by then, and the
     * new pane would open empty beside a reader who is quite plainly pointing at
     * something. State is what a module can arrive late to, and pointing at a
     * passage is a state: it is true for as long as the highlight is on screen,
     * not for the instant the mouse came up.
     *
     * ## Null rather than absent, for the reason everything here is
     *
     * "No document is open" is a state a module has to be able to move INTO. A
     * field that vanished would leave a notes pane showing the notes on a chapter
     * the reader closed ten minutes ago, with no way to tell that from the
     * chapter still being open — which is a pane confidently describing the wrong
     * document, the failure this whole file is arranged against.
     *
     * A module reading this against a host that has never heard of it finds
     * `null`, which is the true answer there: that host has nobody pointing at
     * anything.
     */
    passage: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        /**
         * Which document. An identity string, and deliberately not promised to be
         * anything else.
         *
         * This package does no I/O and cannot say whether a path exists, is
         * absolute, or is inside anything — see `LIMITS.PATH`, which is the same
         * bound and the same argument. A host with a filesystem should send an
         * absolute path, because that is the only spelling two modules can agree on
         * without sharing a root; a host without one sends whatever names a document
         * in its world. Consumers compare it for EQUALITY. A consumer that resolves
         * it and opens it is opening a path a stranger's program chose, and owes
         * itself the confinement check it would owe any other.
         */
        path: z.ZodString;
        /**
         * Which page of it, or null.
         *
         * Nullable because pagination is not a property of documents; it is a thing
         * some readers do to them. A module showing a scrolling document has no page
         * to name and must not be forced to invent one, and a consumer receiving null
         * knows the difference between "not paginated" and "page 1".
         *
         * It is a FILTER and never an anchor, and the difference is the reason this
         * sits beside `from`/`to` rather than instead of them. Page numbers move when
         * anything above them is edited; byte offsets at least rot visibly against a
         * quote. Anything written down permanently should be written against the
         * range and the words, with the page kept as what it is — a fast way to
         * narrow a list to the sheet somebody is looking at.
         */
        page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        /**
         * The first byte of the selection within `path`, or null when nothing is
         * selected. Bytes rather than characters, because the consumer that opens
         * the file reads bytes and a character count would need the encoding to be
         * agreed on as well.
         */
        from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        /** One past the last byte, exclusive, or null. */
        to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        /**
         * What the selection said when it was made, as the pointing module saw it.
         *
         * Empty when nothing is selected, which is the only honest value then — there
         * is no text to quote for a whole page and a module that sent the page's text
         * would be sending a document through every frame on the canvas.
         *
         * Bounded at `LIMITS.QUOTE` and REFUSED rather than clipped; the essay on that
         * limit says why a clipped quote is worse than no quote at all.
         */
        quoted: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        page: number | null;
        from: number | null;
        to: number | null;
        quoted: string;
    }, {
        path: string;
        page?: number | null | undefined;
        from?: number | null | undefined;
        to?: number | null | undefined;
        quoted?: string | undefined;
    }>, {
        path: string;
        page: number | null;
        from: number | null;
        to: number | null;
        quoted: string;
    }, {
        path: string;
        page?: number | null | undefined;
        from?: number | null | undefined;
        to?: number | null | undefined;
        quoted?: string | undefined;
    }>, {
        path: string;
        page: number | null;
        from: number | null;
        to: number | null;
        quoted: string;
    }, {
        path: string;
        page?: number | null | undefined;
        from?: number | null | undefined;
        to?: number | null | undefined;
        quoted?: string | undefined;
    }>>>;
    /**
     * Whether this module has been pinned, and will stop being re-pointed.
     *
     * ## The field that makes pinning honest
     *
     * A person may want two panes on two different epics — last quarter's beside
     * this one, to compare — or a module holding still while they move the canvas
     * around it. Nothing stops a host doing that: it simply sends one frame a
     * different context, or stops sending it new ones.
     *
     * What stopped it being allowed was the other side. A module pinned by a host
     * that never said so has no way to tell a person's pin from the canvas not
     * having moved. It goes on describing itself as showing "the open epic" when
     * it is showing a remembered one; it cannot explain itself; and a module
     * written against one host's silent pinning behaves differently there in a
     * way its author cannot discover. That is a host-only convention, and this
     * package's whole position is that a module must be able to see what it is
     * subject to.
     *
     * So the pin is said out loud. `true` means: what you were last told is what
     * you keep, and further changes to this canvas will not reach you until this
     * goes false again. A module that ignores the field is exactly as correct as
     * it was before — it simply stops receiving updates, which is the behaviour a
     * host could always have chosen. A module that reads it can say "held" in its
     * own words, which is the whole point.
     *
     * The context carrying it is still sent when the pin CHANGES, in both
     * directions, and that is not a contradiction of "you will receive nothing":
     * the message announcing the freeze is the last one through, and the message
     * lifting it is the first. A pin nobody was told about is the thing this
     * field exists to prevent.
     */
    pinned: z.ZodDefault<z.ZodBoolean>;
    /**
     * What this canvas has been told to tell this module, or null.
     *
     * ## A prompt is a thing a person wrote, aimed at one pane
     *
     * Some modules do work that has to be described before it can be done —
     * "review these for security", "the house style is in CONTRIBUTING.md" — and
     * the description belongs to the person, not to the program. So it is written
     * on the canvas and delivered here, the same way the selection is: a module
     * declaring `prompt` in its manifest is saying it has a use for one, and a
     * host that has one for it puts it in the context.
     *
     * ## Why the host composes it, and a module receives one string
     *
     * Several panes on a canvas may each have something to say to the same
     * module. The obvious shape is a list of fragments with their authors, and it
     * is wrong here: it makes every module that reads a prompt responsible for
     * merging fragments, ordering them, and deciding what happens when two
     * contradict — which is a policy question about somebody's own canvas, and
     * three modules would answer it three ways.
     *
     * The host already knows what is on the canvas, who aimed what at whom, and
     * in what order they were written. So it composes, and hands over the result
     * as text. A module's job is to use it, and its author should be able to read
     * the whole of what they were given in one place — which is also what makes
     * it reviewable by the person who wrote it, in the host, before it is sent.
     *
     * Null rather than empty for the reason `epic` is nullable: "there is no
     * prompt for you" is a state a module must be able to move into, and a module
     * that kept the last one forever would be working from instructions somebody
     * deleted.
     */
    prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /**
     * Which kehikko this context is about.
     *
     * A module's page is loaded once and shown on whichever canvas asks for it,
     * so a module genuinely cannot tell where it is standing — and it needs to
     * the moment anything else on the wire says where IT came from. An event
     * carries the kehikko it happened on; this says the one being looked at; and
     * near-or-far becomes a comparison the module makes rather than a rule the
     * host imposes.
     *
     * Nullable because a host need not have canvases at all. A module that finds
     * it null can still show everything it is sent — it simply cannot sort near
     * from far, which is a smaller loss than being handed a wrong answer.
     */
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
    }, {
        id: number;
        name: string;
    }>>>;
}, "strip", z.ZodTypeAny, {
    epic: string | null;
    prompt: string | null;
    project: string | null;
    projectPath: string | null;
    theme: "light" | "dark";
    selection: string[];
    passage: {
        path: string;
        page: number | null;
        from: number | null;
        to: number | null;
        quoted: string;
    } | null;
    pinned: boolean;
    kehikko: {
        id: number;
        name: string;
    } | null;
}, {
    epic?: string | null | undefined;
    prompt?: string | null | undefined;
    project?: string | null | undefined;
    projectPath?: string | null | undefined;
    theme?: "light" | "dark" | undefined;
    selection?: string[] | undefined;
    passage?: {
        path: string;
        page?: number | null | undefined;
        from?: number | null | undefined;
        to?: number | null | undefined;
        quoted?: string | undefined;
    } | null | undefined;
    pinned?: boolean | undefined;
    kehikko?: {
        id: number;
        name: string;
    } | null | undefined;
}>;
export type ModuleContext = z.infer<typeof contextSchema>;
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
export declare const helloSchema: z.ZodObject<{
    type: z.ZodLiteral<"roadmap.hello">;
    protocol: z.ZodNumber;
    session: z.ZodString;
    context: z.ZodObject<{
        epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        /**
         * What the project is CALLED. Unchanged, and deliberately still a name.
         *
         * This is the string a module puts on screen. A path is a bad label — it is
         * long, it is the same for its first forty characters as every other project
         * on the machine, and its last segment is a folder name somebody chose for
         * their disk rather than a name they chose for their work. A host that sent
         * only a path would make every module invent a display name by splitting a
         * string, and eleven modules would split it eleven ways.
         */
        project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        /**
         * Where the project IS: an absolute folder path on the host's machine.
         *
         * ## Why a name was not enough
         *
         * A name is something to print. Everything a module actually wants to DO with
         * a project needs somewhere to open: read the epics under it, run a command
         * in it, show its history, list its chapters. Until this field existed each of
         * those modules had to be told its own root separately — an environment
         * variable per module, set by whoever started it — so a host could move a
         * person to another project and every module would go on reading the first
         * one, correctly, from the root it was given at launch. Nothing errored. The
         * modules simply described a different project from the one the host named.
         *
         * Absolute, and the host is the only one in a position to vouch for that.
         * This package does no I/O and cannot check it — see `LIMITS.PATH`. A module
         * receiving a relative path here has been handed something its host could not
         * have meant, and should treat it as it treats any other field it was lied
         * to about.
         *
         * Null is a real state and not an oversight. A host with no filesystem of its
         * own — a hosted one, a demo, a test harness — knows the name of the project
         * a person is looking at and has no folder to point at. A module handed a
         * name and no path can still say which project it is showing and must not
         * pretend it can open it.
         *
         * ## Why this is a second field and not `project: { name, path }`
         *
         * The tidier shape is the object: two facts about one thing, atomically
         * consistent, impossible to have a path without a name — and it is the shape
         * this package already uses for `kehikko`. It was rejected here for one
         * reason, and the reason is `PROTOCOL`.
         *
         * `PROTOCOL` goes up when an existing field CHANGES SHAPE, and stays put when
         * the wire merely learns a new word — see the essay on it in `constants.ts`,
         * which is emphatic that a number going up for additions is a number nobody
         * can act on. Turning `project` into an object is exactly a shape change: a
         * module rendering `context.project` in a span prints a project name today
         * and `[object Object]` afterwards, with no version signal to tell it why.
         * That module is not degraded, it is broken, and the protocol's own rule says
         * it should have been told it was INCOMPATIBLE rather than left to find out
         * on screen.
         *
         * So the choice was: bump the protocol and make every module in the world
         * incompatible in order to nest two strings, or add a field and break
         * nothing. The second is what the rule is for. `project` still means what it
         * meant, still parses as what it parsed as, and a module that never reads
         * `projectPath` is exactly as correct as it was yesterday — which is the test
         * this package applies to every addition.
         *
         * The cost is honest and worth naming: two nullable fields can disagree, and
         * nothing here prevents a host sending a path with no name. A host should
         * fill them in one place, from one project, so that they cannot; this package
         * can say that and cannot enforce it.
         */
        projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
        /**
         * What the person has picked out, if anything.
         *
         * ## Why a selection is context and not a message between modules
         *
         * The case that produced this: one module lists an epic's references, another
         * shows a journey, and picking a reference in the first should show it in the
         * second. The obvious build is a channel from one to the other — and that
         * ends modularity, because the first module then has to know the second
         * exists, and a canvas without the second is a canvas where the first is
         * sending into nothing.
         *
         * A selection is the same KIND of fact as the open epic: it is what this
         * canvas is looking at. So it travels the way the epic travels. A module asks
         * the host to set it, the host tells everyone, and no module ever learns
         * which other module is listening — or whether any is. Each works alone, and
         * two of them work together without either having been written for the other.
         *
         * ## Refs and nothing else
         *
         * The sender knows more than this carries — which of these is an issue and
         * which a pull request — and that knowledge deliberately does not travel. See
         * `selection.set` in `methods.ts`: a host can vouch that these are the refs
         * somebody picked, and cannot vouch for what they ARE, because it was told
         * and never checked. Context is the host's own knowledge or it is a rumour
         * with a protocol's name on it, which is the same reason `slug` is not here.
         *
         * Empty rather than absent, for the reason `epic` is nullable rather than
         * optional: "nothing is selected" is a state a module has to be able to move
         * INTO, and a field that simply vanished would leave a module showing the
         * last selection forever.
         */
        selection: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /**
         * Where in a document the reader is pointing, or null.
         *
         * ## A passage is context, and the argument is the one above, unchanged
         *
         * The essay on `selection` a few lines up makes the case for a picked
         * reference travelling as context rather than as a message from one module to
         * another, and every line of it holds here with the nouns swapped. A reader
         * highlights a sentence in the module that shows the paper; a module that
         * keeps notes should narrow to it. The obvious build is a channel from the
         * first to the second, and it ends modularity: the paper would have to know
         * the notes exist, and a canvas without the notes is a paper sending into
         * nothing.
         *
         * There is a second argument here that `selection` did not need, and it is
         * the stronger one. **An event would be missed.** A selection made at
         * 10:04 and a module opened at 10:05 is the ordinary case — a person reads,
         * finds something worth a note, and only then puts a notes pane on the
         * canvas. A message sent at the moment of pointing is gone by then, and the
         * new pane would open empty beside a reader who is quite plainly pointing at
         * something. State is what a module can arrive late to, and pointing at a
         * passage is a state: it is true for as long as the highlight is on screen,
         * not for the instant the mouse came up.
         *
         * ## Null rather than absent, for the reason everything here is
         *
         * "No document is open" is a state a module has to be able to move INTO. A
         * field that vanished would leave a notes pane showing the notes on a chapter
         * the reader closed ten minutes ago, with no way to tell that from the
         * chapter still being open — which is a pane confidently describing the wrong
         * document, the failure this whole file is arranged against.
         *
         * A module reading this against a host that has never heard of it finds
         * `null`, which is the true answer there: that host has nobody pointing at
         * anything.
         */
        passage: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
            /**
             * Which document. An identity string, and deliberately not promised to be
             * anything else.
             *
             * This package does no I/O and cannot say whether a path exists, is
             * absolute, or is inside anything — see `LIMITS.PATH`, which is the same
             * bound and the same argument. A host with a filesystem should send an
             * absolute path, because that is the only spelling two modules can agree on
             * without sharing a root; a host without one sends whatever names a document
             * in its world. Consumers compare it for EQUALITY. A consumer that resolves
             * it and opens it is opening a path a stranger's program chose, and owes
             * itself the confinement check it would owe any other.
             */
            path: z.ZodString;
            /**
             * Which page of it, or null.
             *
             * Nullable because pagination is not a property of documents; it is a thing
             * some readers do to them. A module showing a scrolling document has no page
             * to name and must not be forced to invent one, and a consumer receiving null
             * knows the difference between "not paginated" and "page 1".
             *
             * It is a FILTER and never an anchor, and the difference is the reason this
             * sits beside `from`/`to` rather than instead of them. Page numbers move when
             * anything above them is edited; byte offsets at least rot visibly against a
             * quote. Anything written down permanently should be written against the
             * range and the words, with the page kept as what it is — a fast way to
             * narrow a list to the sheet somebody is looking at.
             */
            page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            /**
             * The first byte of the selection within `path`, or null when nothing is
             * selected. Bytes rather than characters, because the consumer that opens
             * the file reads bytes and a character count would need the encoding to be
             * agreed on as well.
             */
            from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            /** One past the last byte, exclusive, or null. */
            to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            /**
             * What the selection said when it was made, as the pointing module saw it.
             *
             * Empty when nothing is selected, which is the only honest value then — there
             * is no text to quote for a whole page and a module that sent the page's text
             * would be sending a document through every frame on the canvas.
             *
             * Bounded at `LIMITS.QUOTE` and REFUSED rather than clipped; the essay on that
             * limit says why a clipped quote is worse than no quote at all.
             */
            quoted: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            page: number | null;
            from: number | null;
            to: number | null;
            quoted: string;
        }, {
            path: string;
            page?: number | null | undefined;
            from?: number | null | undefined;
            to?: number | null | undefined;
            quoted?: string | undefined;
        }>, {
            path: string;
            page: number | null;
            from: number | null;
            to: number | null;
            quoted: string;
        }, {
            path: string;
            page?: number | null | undefined;
            from?: number | null | undefined;
            to?: number | null | undefined;
            quoted?: string | undefined;
        }>, {
            path: string;
            page: number | null;
            from: number | null;
            to: number | null;
            quoted: string;
        }, {
            path: string;
            page?: number | null | undefined;
            from?: number | null | undefined;
            to?: number | null | undefined;
            quoted?: string | undefined;
        }>>>;
        /**
         * Whether this module has been pinned, and will stop being re-pointed.
         *
         * ## The field that makes pinning honest
         *
         * A person may want two panes on two different epics — last quarter's beside
         * this one, to compare — or a module holding still while they move the canvas
         * around it. Nothing stops a host doing that: it simply sends one frame a
         * different context, or stops sending it new ones.
         *
         * What stopped it being allowed was the other side. A module pinned by a host
         * that never said so has no way to tell a person's pin from the canvas not
         * having moved. It goes on describing itself as showing "the open epic" when
         * it is showing a remembered one; it cannot explain itself; and a module
         * written against one host's silent pinning behaves differently there in a
         * way its author cannot discover. That is a host-only convention, and this
         * package's whole position is that a module must be able to see what it is
         * subject to.
         *
         * So the pin is said out loud. `true` means: what you were last told is what
         * you keep, and further changes to this canvas will not reach you until this
         * goes false again. A module that ignores the field is exactly as correct as
         * it was before — it simply stops receiving updates, which is the behaviour a
         * host could always have chosen. A module that reads it can say "held" in its
         * own words, which is the whole point.
         *
         * The context carrying it is still sent when the pin CHANGES, in both
         * directions, and that is not a contradiction of "you will receive nothing":
         * the message announcing the freeze is the last one through, and the message
         * lifting it is the first. A pin nobody was told about is the thing this
         * field exists to prevent.
         */
        pinned: z.ZodDefault<z.ZodBoolean>;
        /**
         * What this canvas has been told to tell this module, or null.
         *
         * ## A prompt is a thing a person wrote, aimed at one pane
         *
         * Some modules do work that has to be described before it can be done —
         * "review these for security", "the house style is in CONTRIBUTING.md" — and
         * the description belongs to the person, not to the program. So it is written
         * on the canvas and delivered here, the same way the selection is: a module
         * declaring `prompt` in its manifest is saying it has a use for one, and a
         * host that has one for it puts it in the context.
         *
         * ## Why the host composes it, and a module receives one string
         *
         * Several panes on a canvas may each have something to say to the same
         * module. The obvious shape is a list of fragments with their authors, and it
         * is wrong here: it makes every module that reads a prompt responsible for
         * merging fragments, ordering them, and deciding what happens when two
         * contradict — which is a policy question about somebody's own canvas, and
         * three modules would answer it three ways.
         *
         * The host already knows what is on the canvas, who aimed what at whom, and
         * in what order they were written. So it composes, and hands over the result
         * as text. A module's job is to use it, and its author should be able to read
         * the whole of what they were given in one place — which is also what makes
         * it reviewable by the person who wrote it, in the host, before it is sent.
         *
         * Null rather than empty for the reason `epic` is nullable: "there is no
         * prompt for you" is a state a module must be able to move into, and a module
         * that kept the last one forever would be working from instructions somebody
         * deleted.
         */
        prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        /**
         * Which kehikko this context is about.
         *
         * A module's page is loaded once and shown on whichever canvas asks for it,
         * so a module genuinely cannot tell where it is standing — and it needs to
         * the moment anything else on the wire says where IT came from. An event
         * carries the kehikko it happened on; this says the one being looked at; and
         * near-or-far becomes a comparison the module makes rather than a rule the
         * host imposes.
         *
         * Nullable because a host need not have canvases at all. A module that finds
         * it null can still show everything it is sent — it simply cannot sort near
         * from far, which is a smaller loss than being handed a wrong answer.
         */
        kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            id: z.ZodNumber;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: number;
            name: string;
        }, {
            id: number;
            name: string;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        epic: string | null;
        prompt: string | null;
        project: string | null;
        projectPath: string | null;
        theme: "light" | "dark";
        selection: string[];
        passage: {
            path: string;
            page: number | null;
            from: number | null;
            to: number | null;
            quoted: string;
        } | null;
        pinned: boolean;
        kehikko: {
            id: number;
            name: string;
        } | null;
    }, {
        epic?: string | null | undefined;
        prompt?: string | null | undefined;
        project?: string | null | undefined;
        projectPath?: string | null | undefined;
        theme?: "light" | "dark" | undefined;
        selection?: string[] | undefined;
        passage?: {
            path: string;
            page?: number | null | undefined;
            from?: number | null | undefined;
            to?: number | null | undefined;
            quoted?: string | undefined;
        } | null | undefined;
        pinned?: boolean | undefined;
        kehikko?: {
            id: number;
            name: string;
        } | null | undefined;
    }>;
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
    state: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.hello";
    protocol: number;
    session: string;
    context: {
        epic: string | null;
        prompt: string | null;
        project: string | null;
        projectPath: string | null;
        theme: "light" | "dark";
        selection: string[];
        passage: {
            path: string;
            page: number | null;
            from: number | null;
            to: number | null;
            quoted: string;
        } | null;
        pinned: boolean;
        kehikko: {
            id: number;
            name: string;
        } | null;
    };
    state: string | null;
}, {
    type: "roadmap.hello";
    protocol: number;
    session: string;
    context: {
        epic?: string | null | undefined;
        prompt?: string | null | undefined;
        project?: string | null | undefined;
        projectPath?: string | null | undefined;
        theme?: "light" | "dark" | undefined;
        selection?: string[] | undefined;
        passage?: {
            path: string;
            page?: number | null | undefined;
            from?: number | null | undefined;
            to?: number | null | undefined;
            quoted?: string | undefined;
        } | null | undefined;
        pinned?: boolean | undefined;
        kehikko?: {
            id: number;
            name: string;
        } | null | undefined;
    };
    state?: string | null | undefined;
}>;
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
 * whole roadmap and gets one.
 */
export declare const contextMessageSchema: z.ZodObject<{
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /**
     * What the project is CALLED. Unchanged, and deliberately still a name.
     *
     * This is the string a module puts on screen. A path is a bad label — it is
     * long, it is the same for its first forty characters as every other project
     * on the machine, and its last segment is a folder name somebody chose for
     * their disk rather than a name they chose for their work. A host that sent
     * only a path would make every module invent a display name by splitting a
     * string, and eleven modules would split it eleven ways.
     */
    project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /**
     * Where the project IS: an absolute folder path on the host's machine.
     *
     * ## Why a name was not enough
     *
     * A name is something to print. Everything a module actually wants to DO with
     * a project needs somewhere to open: read the epics under it, run a command
     * in it, show its history, list its chapters. Until this field existed each of
     * those modules had to be told its own root separately — an environment
     * variable per module, set by whoever started it — so a host could move a
     * person to another project and every module would go on reading the first
     * one, correctly, from the root it was given at launch. Nothing errored. The
     * modules simply described a different project from the one the host named.
     *
     * Absolute, and the host is the only one in a position to vouch for that.
     * This package does no I/O and cannot check it — see `LIMITS.PATH`. A module
     * receiving a relative path here has been handed something its host could not
     * have meant, and should treat it as it treats any other field it was lied
     * to about.
     *
     * Null is a real state and not an oversight. A host with no filesystem of its
     * own — a hosted one, a demo, a test harness — knows the name of the project
     * a person is looking at and has no folder to point at. A module handed a
     * name and no path can still say which project it is showing and must not
     * pretend it can open it.
     *
     * ## Why this is a second field and not `project: { name, path }`
     *
     * The tidier shape is the object: two facts about one thing, atomically
     * consistent, impossible to have a path without a name — and it is the shape
     * this package already uses for `kehikko`. It was rejected here for one
     * reason, and the reason is `PROTOCOL`.
     *
     * `PROTOCOL` goes up when an existing field CHANGES SHAPE, and stays put when
     * the wire merely learns a new word — see the essay on it in `constants.ts`,
     * which is emphatic that a number going up for additions is a number nobody
     * can act on. Turning `project` into an object is exactly a shape change: a
     * module rendering `context.project` in a span prints a project name today
     * and `[object Object]` afterwards, with no version signal to tell it why.
     * That module is not degraded, it is broken, and the protocol's own rule says
     * it should have been told it was INCOMPATIBLE rather than left to find out
     * on screen.
     *
     * So the choice was: bump the protocol and make every module in the world
     * incompatible in order to nest two strings, or add a field and break
     * nothing. The second is what the rule is for. `project` still means what it
     * meant, still parses as what it parsed as, and a module that never reads
     * `projectPath` is exactly as correct as it was yesterday — which is the test
     * this package applies to every addition.
     *
     * The cost is honest and worth naming: two nullable fields can disagree, and
     * nothing here prevents a host sending a path with no name. A host should
     * fill them in one place, from one project, so that they cannot; this package
     * can say that and cannot enforce it.
     */
    projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    /**
     * What the person has picked out, if anything.
     *
     * ## Why a selection is context and not a message between modules
     *
     * The case that produced this: one module lists an epic's references, another
     * shows a journey, and picking a reference in the first should show it in the
     * second. The obvious build is a channel from one to the other — and that
     * ends modularity, because the first module then has to know the second
     * exists, and a canvas without the second is a canvas where the first is
     * sending into nothing.
     *
     * A selection is the same KIND of fact as the open epic: it is what this
     * canvas is looking at. So it travels the way the epic travels. A module asks
     * the host to set it, the host tells everyone, and no module ever learns
     * which other module is listening — or whether any is. Each works alone, and
     * two of them work together without either having been written for the other.
     *
     * ## Refs and nothing else
     *
     * The sender knows more than this carries — which of these is an issue and
     * which a pull request — and that knowledge deliberately does not travel. See
     * `selection.set` in `methods.ts`: a host can vouch that these are the refs
     * somebody picked, and cannot vouch for what they ARE, because it was told
     * and never checked. Context is the host's own knowledge or it is a rumour
     * with a protocol's name on it, which is the same reason `slug` is not here.
     *
     * Empty rather than absent, for the reason `epic` is nullable rather than
     * optional: "nothing is selected" is a state a module has to be able to move
     * INTO, and a field that simply vanished would leave a module showing the
     * last selection forever.
     */
    selection: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /**
     * Where in a document the reader is pointing, or null.
     *
     * ## A passage is context, and the argument is the one above, unchanged
     *
     * The essay on `selection` a few lines up makes the case for a picked
     * reference travelling as context rather than as a message from one module to
     * another, and every line of it holds here with the nouns swapped. A reader
     * highlights a sentence in the module that shows the paper; a module that
     * keeps notes should narrow to it. The obvious build is a channel from the
     * first to the second, and it ends modularity: the paper would have to know
     * the notes exist, and a canvas without the notes is a paper sending into
     * nothing.
     *
     * There is a second argument here that `selection` did not need, and it is
     * the stronger one. **An event would be missed.** A selection made at
     * 10:04 and a module opened at 10:05 is the ordinary case — a person reads,
     * finds something worth a note, and only then puts a notes pane on the
     * canvas. A message sent at the moment of pointing is gone by then, and the
     * new pane would open empty beside a reader who is quite plainly pointing at
     * something. State is what a module can arrive late to, and pointing at a
     * passage is a state: it is true for as long as the highlight is on screen,
     * not for the instant the mouse came up.
     *
     * ## Null rather than absent, for the reason everything here is
     *
     * "No document is open" is a state a module has to be able to move INTO. A
     * field that vanished would leave a notes pane showing the notes on a chapter
     * the reader closed ten minutes ago, with no way to tell that from the
     * chapter still being open — which is a pane confidently describing the wrong
     * document, the failure this whole file is arranged against.
     *
     * A module reading this against a host that has never heard of it finds
     * `null`, which is the true answer there: that host has nobody pointing at
     * anything.
     */
    passage: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        /**
         * Which document. An identity string, and deliberately not promised to be
         * anything else.
         *
         * This package does no I/O and cannot say whether a path exists, is
         * absolute, or is inside anything — see `LIMITS.PATH`, which is the same
         * bound and the same argument. A host with a filesystem should send an
         * absolute path, because that is the only spelling two modules can agree on
         * without sharing a root; a host without one sends whatever names a document
         * in its world. Consumers compare it for EQUALITY. A consumer that resolves
         * it and opens it is opening a path a stranger's program chose, and owes
         * itself the confinement check it would owe any other.
         */
        path: z.ZodString;
        /**
         * Which page of it, or null.
         *
         * Nullable because pagination is not a property of documents; it is a thing
         * some readers do to them. A module showing a scrolling document has no page
         * to name and must not be forced to invent one, and a consumer receiving null
         * knows the difference between "not paginated" and "page 1".
         *
         * It is a FILTER and never an anchor, and the difference is the reason this
         * sits beside `from`/`to` rather than instead of them. Page numbers move when
         * anything above them is edited; byte offsets at least rot visibly against a
         * quote. Anything written down permanently should be written against the
         * range and the words, with the page kept as what it is — a fast way to
         * narrow a list to the sheet somebody is looking at.
         */
        page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        /**
         * The first byte of the selection within `path`, or null when nothing is
         * selected. Bytes rather than characters, because the consumer that opens
         * the file reads bytes and a character count would need the encoding to be
         * agreed on as well.
         */
        from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        /** One past the last byte, exclusive, or null. */
        to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        /**
         * What the selection said when it was made, as the pointing module saw it.
         *
         * Empty when nothing is selected, which is the only honest value then — there
         * is no text to quote for a whole page and a module that sent the page's text
         * would be sending a document through every frame on the canvas.
         *
         * Bounded at `LIMITS.QUOTE` and REFUSED rather than clipped; the essay on that
         * limit says why a clipped quote is worse than no quote at all.
         */
        quoted: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        page: number | null;
        from: number | null;
        to: number | null;
        quoted: string;
    }, {
        path: string;
        page?: number | null | undefined;
        from?: number | null | undefined;
        to?: number | null | undefined;
        quoted?: string | undefined;
    }>, {
        path: string;
        page: number | null;
        from: number | null;
        to: number | null;
        quoted: string;
    }, {
        path: string;
        page?: number | null | undefined;
        from?: number | null | undefined;
        to?: number | null | undefined;
        quoted?: string | undefined;
    }>, {
        path: string;
        page: number | null;
        from: number | null;
        to: number | null;
        quoted: string;
    }, {
        path: string;
        page?: number | null | undefined;
        from?: number | null | undefined;
        to?: number | null | undefined;
        quoted?: string | undefined;
    }>>>;
    /**
     * Whether this module has been pinned, and will stop being re-pointed.
     *
     * ## The field that makes pinning honest
     *
     * A person may want two panes on two different epics — last quarter's beside
     * this one, to compare — or a module holding still while they move the canvas
     * around it. Nothing stops a host doing that: it simply sends one frame a
     * different context, or stops sending it new ones.
     *
     * What stopped it being allowed was the other side. A module pinned by a host
     * that never said so has no way to tell a person's pin from the canvas not
     * having moved. It goes on describing itself as showing "the open epic" when
     * it is showing a remembered one; it cannot explain itself; and a module
     * written against one host's silent pinning behaves differently there in a
     * way its author cannot discover. That is a host-only convention, and this
     * package's whole position is that a module must be able to see what it is
     * subject to.
     *
     * So the pin is said out loud. `true` means: what you were last told is what
     * you keep, and further changes to this canvas will not reach you until this
     * goes false again. A module that ignores the field is exactly as correct as
     * it was before — it simply stops receiving updates, which is the behaviour a
     * host could always have chosen. A module that reads it can say "held" in its
     * own words, which is the whole point.
     *
     * The context carrying it is still sent when the pin CHANGES, in both
     * directions, and that is not a contradiction of "you will receive nothing":
     * the message announcing the freeze is the last one through, and the message
     * lifting it is the first. A pin nobody was told about is the thing this
     * field exists to prevent.
     */
    pinned: z.ZodDefault<z.ZodBoolean>;
    /**
     * What this canvas has been told to tell this module, or null.
     *
     * ## A prompt is a thing a person wrote, aimed at one pane
     *
     * Some modules do work that has to be described before it can be done —
     * "review these for security", "the house style is in CONTRIBUTING.md" — and
     * the description belongs to the person, not to the program. So it is written
     * on the canvas and delivered here, the same way the selection is: a module
     * declaring `prompt` in its manifest is saying it has a use for one, and a
     * host that has one for it puts it in the context.
     *
     * ## Why the host composes it, and a module receives one string
     *
     * Several panes on a canvas may each have something to say to the same
     * module. The obvious shape is a list of fragments with their authors, and it
     * is wrong here: it makes every module that reads a prompt responsible for
     * merging fragments, ordering them, and deciding what happens when two
     * contradict — which is a policy question about somebody's own canvas, and
     * three modules would answer it three ways.
     *
     * The host already knows what is on the canvas, who aimed what at whom, and
     * in what order they were written. So it composes, and hands over the result
     * as text. A module's job is to use it, and its author should be able to read
     * the whole of what they were given in one place — which is also what makes
     * it reviewable by the person who wrote it, in the host, before it is sent.
     *
     * Null rather than empty for the reason `epic` is nullable: "there is no
     * prompt for you" is a state a module must be able to move into, and a module
     * that kept the last one forever would be working from instructions somebody
     * deleted.
     */
    prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /**
     * Which kehikko this context is about.
     *
     * A module's page is loaded once and shown on whichever canvas asks for it,
     * so a module genuinely cannot tell where it is standing — and it needs to
     * the moment anything else on the wire says where IT came from. An event
     * carries the kehikko it happened on; this says the one being looked at; and
     * near-or-far becomes a comparison the module makes rather than a rule the
     * host imposes.
     *
     * Nullable because a host need not have canvases at all. A module that finds
     * it null can still show everything it is sent — it simply cannot sort near
     * from far, which is a smaller loss than being handed a wrong answer.
     */
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
    }, {
        id: number;
        name: string;
    }>>>;
} & {
    type: z.ZodLiteral<"roadmap.context">;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.context";
    epic: string | null;
    protocol: number;
    prompt: string | null;
    project: string | null;
    projectPath: string | null;
    theme: "light" | "dark";
    selection: string[];
    passage: {
        path: string;
        page: number | null;
        from: number | null;
        to: number | null;
        quoted: string;
    } | null;
    pinned: boolean;
    kehikko: {
        id: number;
        name: string;
    } | null;
}, {
    type: "roadmap.context";
    protocol: number;
    epic?: string | null | undefined;
    prompt?: string | null | undefined;
    project?: string | null | undefined;
    projectPath?: string | null | undefined;
    theme?: "light" | "dark" | undefined;
    selection?: string[] | undefined;
    passage?: {
        path: string;
        page?: number | null | undefined;
        from?: number | null | undefined;
        to?: number | null | undefined;
        quoted?: string | undefined;
    } | null | undefined;
    pinned?: boolean | undefined;
    kehikko?: {
        id: number;
        name: string;
    } | null | undefined;
}>;
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
export declare const responseFailureReasons: readonly ["unknown-module", "unknown-method", "failed"];
export type ResponseFailureReason = (typeof responseFailureReasons)[number];
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
export declare const responseSchema: z.ZodDiscriminatedUnion<"ok", [z.ZodObject<{
    type: z.ZodLiteral<"roadmap.response">;
    id: z.ZodString;
    ok: z.ZodLiteral<true>;
    /**
     * Whatever the method answers with, and deliberately untyped. See the note
     * at the top of `methods.ts`: a client that asserted a shape here would be
     * asserting something no host promised.
     */
    data: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.response";
    ok: true;
    id: string;
    data?: unknown;
}, {
    type: "roadmap.response";
    ok: true;
    id: string;
    data?: unknown;
}>, z.ZodObject<{
    type: z.ZodLiteral<"roadmap.response">;
    id: z.ZodString;
    ok: z.ZodLiteral<false>;
    reason: z.ZodEnum<["unknown-module", "unknown-method", "failed"]>;
    /**
     * Bounded, because a refusal is the one place a host quotes a module's own
     * text back at it — the method name it asked for, the extension it named —
     * and a sentence that carried two hundred thousand characters of that back
     * across the frame would be a module's document, round-tripped, at the
     * module's own request. Long enough for every sentence anybody actually
     * writes; short enough that no answer is ever a document.
     */
    error: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.response";
    ok: false;
    id: string;
    reason: "unknown-module" | "unknown-method" | "failed";
    error: string;
}, {
    type: "roadmap.response";
    ok: false;
    id: string;
    reason: "unknown-module" | "unknown-method" | "failed";
    error?: string | undefined;
}>]>;
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
export declare const gotoSchema: z.ZodEffects<z.ZodObject<{
    type: z.ZodLiteral<"roadmap.goto">;
    id: z.ZodString;
    ref: z.ZodOptional<z.ZodString>;
    step: z.ZodOptional<z.ZodNumber>;
    epic: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.goto";
    id: string;
    epic?: string | undefined;
    step?: number | undefined;
    ref?: string | undefined;
}, {
    type: "roadmap.goto";
    id: string;
    epic?: string | undefined;
    step?: number | undefined;
    ref?: string | undefined;
}>, {
    type: "roadmap.goto";
    id: string;
    epic?: string | undefined;
    step?: number | undefined;
    ref?: string | undefined;
}, {
    type: "roadmap.goto";
    id: string;
    epic?: string | undefined;
    step?: number | undefined;
    ref?: string | undefined;
}>;
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
export declare const readySchema: z.ZodObject<{
    type: z.ZodLiteral<"roadmap.ready">;
    id: z.ZodString;
    protocol: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.ready";
    id: string;
    protocol: number;
}, {
    type: "roadmap.ready";
    id: string;
    protocol?: number | undefined;
}>;
/** One question, with an id the answer will carry back. */
export declare const requestSchema: z.ZodObject<{
    type: z.ZodLiteral<"roadmap.request">;
    id: z.ZodString;
    /**
     * Bounded but not held to the list of known methods, which would be this
     * schema deciding what a host answers. A host with a method this package has
     * never heard of is a host doing its job; a host without one this package
     * knows is entitled to refuse it, with `unknown-method`.
     */
    method: z.ZodString;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    params: Record<string, unknown>;
    type: "roadmap.request";
    id: string;
    method: string;
}, {
    type: "roadmap.request";
    id: string;
    method: string;
    params?: Record<string, unknown> | undefined;
}>;
/**
 * How tall the module would like to be.
 *
 * The one message with no id and no answer. It is a request in the ordinary
 * sense and not in the protocol's: the host clamps it (`clampHeight`) and may
 * ignore it entirely, and a module that needed to know the outcome can measure
 * itself.
 */
export declare const resizeSchema: z.ZodObject<{
    type: z.ZodLiteral<"roadmap.resize">;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.resize";
    height: number;
}, {
    type: "roadmap.resize";
    height: number;
}>;
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
export declare const wentSchema: z.ZodObject<{
    type: z.ZodLiteral<"roadmap.went">;
    id: z.ZodString;
    found: z.ZodBoolean;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.went";
    why: string;
    id: string;
    found: boolean;
}, {
    type: "roadmap.went";
    id: string;
    found: boolean;
    why?: string | undefined;
}>;
/**
 * Not a `discriminatedUnion`, because `responseSchema` is itself a union on a
 * different key and cannot be an option of one. A plain union costs a little
 * more to parse and reports its failures less precisely; it is the honest shape
 * of a wire where one message type has two forms.
 */
/**
 * An extension payload one module emitted, delivered to a module that consumes
 * that format.
 *
 * ## Why the host is in the middle at all
 *
 * The sender does not name a recipient and cannot: a module has no way to know
 * what else is on the canvas, and giving it one would end modularity. It names
 * a FORMAT — `roadmap.notifications@1` — and the host works out who has said,
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
export declare const eventSchema: z.ZodObject<{
    type: z.ZodLiteral<"roadmap.event">;
    protocol: z.ZodNumber;
    /** The format, e.g. `roadmap.notifications@1`. Known to the host, or unsent. */
    extension: z.ZodString;
    /** Whatever that format says. Validated by the host before it left. */
    payload: z.ZodUnknown;
    /** The module that emitted it, named by the host from its own registry. */
    from: z.ZodString;
    /**
     * When the host accepted it, ISO 8601. A receiver ordering by arrival would
     * be ordering by its own scheduler instead.
     */
    at: z.ZodString;
    /**
     * The kehikko it happened on, so a receiver can tell near from far.
     *
     * A module is loaded once and shown on whichever canvas asks for it, so "this
     * kehikko" is a question it cannot answer alone. `context.kehikko` says where
     * the receiver is standing and this says where the event came from; comparing
     * the two is the whole of a near/far filter, and it is a comparison rather
     * than a rule so a module can present it however it likes.
     */
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
    }, {
        id: number;
        name: string;
    }>>>;
}, "strip", z.ZodTypeAny, {
    at: string;
    type: "roadmap.event";
    protocol: number;
    from: string;
    kehikko: {
        id: number;
        name: string;
    } | null;
    extension: string;
    payload?: unknown;
}, {
    at: string;
    type: "roadmap.event";
    protocol: number;
    from: string;
    extension: string;
    kehikko?: {
        id: number;
        name: string;
    } | null | undefined;
    payload?: unknown;
}>;
export declare const hostMessageSchema: z.ZodUnion<[z.ZodObject<{
    type: z.ZodLiteral<"roadmap.hello">;
    protocol: z.ZodNumber;
    session: z.ZodString;
    context: z.ZodObject<{
        epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        /**
         * What the project is CALLED. Unchanged, and deliberately still a name.
         *
         * This is the string a module puts on screen. A path is a bad label — it is
         * long, it is the same for its first forty characters as every other project
         * on the machine, and its last segment is a folder name somebody chose for
         * their disk rather than a name they chose for their work. A host that sent
         * only a path would make every module invent a display name by splitting a
         * string, and eleven modules would split it eleven ways.
         */
        project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        /**
         * Where the project IS: an absolute folder path on the host's machine.
         *
         * ## Why a name was not enough
         *
         * A name is something to print. Everything a module actually wants to DO with
         * a project needs somewhere to open: read the epics under it, run a command
         * in it, show its history, list its chapters. Until this field existed each of
         * those modules had to be told its own root separately — an environment
         * variable per module, set by whoever started it — so a host could move a
         * person to another project and every module would go on reading the first
         * one, correctly, from the root it was given at launch. Nothing errored. The
         * modules simply described a different project from the one the host named.
         *
         * Absolute, and the host is the only one in a position to vouch for that.
         * This package does no I/O and cannot check it — see `LIMITS.PATH`. A module
         * receiving a relative path here has been handed something its host could not
         * have meant, and should treat it as it treats any other field it was lied
         * to about.
         *
         * Null is a real state and not an oversight. A host with no filesystem of its
         * own — a hosted one, a demo, a test harness — knows the name of the project
         * a person is looking at and has no folder to point at. A module handed a
         * name and no path can still say which project it is showing and must not
         * pretend it can open it.
         *
         * ## Why this is a second field and not `project: { name, path }`
         *
         * The tidier shape is the object: two facts about one thing, atomically
         * consistent, impossible to have a path without a name — and it is the shape
         * this package already uses for `kehikko`. It was rejected here for one
         * reason, and the reason is `PROTOCOL`.
         *
         * `PROTOCOL` goes up when an existing field CHANGES SHAPE, and stays put when
         * the wire merely learns a new word — see the essay on it in `constants.ts`,
         * which is emphatic that a number going up for additions is a number nobody
         * can act on. Turning `project` into an object is exactly a shape change: a
         * module rendering `context.project` in a span prints a project name today
         * and `[object Object]` afterwards, with no version signal to tell it why.
         * That module is not degraded, it is broken, and the protocol's own rule says
         * it should have been told it was INCOMPATIBLE rather than left to find out
         * on screen.
         *
         * So the choice was: bump the protocol and make every module in the world
         * incompatible in order to nest two strings, or add a field and break
         * nothing. The second is what the rule is for. `project` still means what it
         * meant, still parses as what it parsed as, and a module that never reads
         * `projectPath` is exactly as correct as it was yesterday — which is the test
         * this package applies to every addition.
         *
         * The cost is honest and worth naming: two nullable fields can disagree, and
         * nothing here prevents a host sending a path with no name. A host should
         * fill them in one place, from one project, so that they cannot; this package
         * can say that and cannot enforce it.
         */
        projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
        /**
         * What the person has picked out, if anything.
         *
         * ## Why a selection is context and not a message between modules
         *
         * The case that produced this: one module lists an epic's references, another
         * shows a journey, and picking a reference in the first should show it in the
         * second. The obvious build is a channel from one to the other — and that
         * ends modularity, because the first module then has to know the second
         * exists, and a canvas without the second is a canvas where the first is
         * sending into nothing.
         *
         * A selection is the same KIND of fact as the open epic: it is what this
         * canvas is looking at. So it travels the way the epic travels. A module asks
         * the host to set it, the host tells everyone, and no module ever learns
         * which other module is listening — or whether any is. Each works alone, and
         * two of them work together without either having been written for the other.
         *
         * ## Refs and nothing else
         *
         * The sender knows more than this carries — which of these is an issue and
         * which a pull request — and that knowledge deliberately does not travel. See
         * `selection.set` in `methods.ts`: a host can vouch that these are the refs
         * somebody picked, and cannot vouch for what they ARE, because it was told
         * and never checked. Context is the host's own knowledge or it is a rumour
         * with a protocol's name on it, which is the same reason `slug` is not here.
         *
         * Empty rather than absent, for the reason `epic` is nullable rather than
         * optional: "nothing is selected" is a state a module has to be able to move
         * INTO, and a field that simply vanished would leave a module showing the
         * last selection forever.
         */
        selection: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /**
         * Where in a document the reader is pointing, or null.
         *
         * ## A passage is context, and the argument is the one above, unchanged
         *
         * The essay on `selection` a few lines up makes the case for a picked
         * reference travelling as context rather than as a message from one module to
         * another, and every line of it holds here with the nouns swapped. A reader
         * highlights a sentence in the module that shows the paper; a module that
         * keeps notes should narrow to it. The obvious build is a channel from the
         * first to the second, and it ends modularity: the paper would have to know
         * the notes exist, and a canvas without the notes is a paper sending into
         * nothing.
         *
         * There is a second argument here that `selection` did not need, and it is
         * the stronger one. **An event would be missed.** A selection made at
         * 10:04 and a module opened at 10:05 is the ordinary case — a person reads,
         * finds something worth a note, and only then puts a notes pane on the
         * canvas. A message sent at the moment of pointing is gone by then, and the
         * new pane would open empty beside a reader who is quite plainly pointing at
         * something. State is what a module can arrive late to, and pointing at a
         * passage is a state: it is true for as long as the highlight is on screen,
         * not for the instant the mouse came up.
         *
         * ## Null rather than absent, for the reason everything here is
         *
         * "No document is open" is a state a module has to be able to move INTO. A
         * field that vanished would leave a notes pane showing the notes on a chapter
         * the reader closed ten minutes ago, with no way to tell that from the
         * chapter still being open — which is a pane confidently describing the wrong
         * document, the failure this whole file is arranged against.
         *
         * A module reading this against a host that has never heard of it finds
         * `null`, which is the true answer there: that host has nobody pointing at
         * anything.
         */
        passage: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
            /**
             * Which document. An identity string, and deliberately not promised to be
             * anything else.
             *
             * This package does no I/O and cannot say whether a path exists, is
             * absolute, or is inside anything — see `LIMITS.PATH`, which is the same
             * bound and the same argument. A host with a filesystem should send an
             * absolute path, because that is the only spelling two modules can agree on
             * without sharing a root; a host without one sends whatever names a document
             * in its world. Consumers compare it for EQUALITY. A consumer that resolves
             * it and opens it is opening a path a stranger's program chose, and owes
             * itself the confinement check it would owe any other.
             */
            path: z.ZodString;
            /**
             * Which page of it, or null.
             *
             * Nullable because pagination is not a property of documents; it is a thing
             * some readers do to them. A module showing a scrolling document has no page
             * to name and must not be forced to invent one, and a consumer receiving null
             * knows the difference between "not paginated" and "page 1".
             *
             * It is a FILTER and never an anchor, and the difference is the reason this
             * sits beside `from`/`to` rather than instead of them. Page numbers move when
             * anything above them is edited; byte offsets at least rot visibly against a
             * quote. Anything written down permanently should be written against the
             * range and the words, with the page kept as what it is — a fast way to
             * narrow a list to the sheet somebody is looking at.
             */
            page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            /**
             * The first byte of the selection within `path`, or null when nothing is
             * selected. Bytes rather than characters, because the consumer that opens
             * the file reads bytes and a character count would need the encoding to be
             * agreed on as well.
             */
            from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            /** One past the last byte, exclusive, or null. */
            to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            /**
             * What the selection said when it was made, as the pointing module saw it.
             *
             * Empty when nothing is selected, which is the only honest value then — there
             * is no text to quote for a whole page and a module that sent the page's text
             * would be sending a document through every frame on the canvas.
             *
             * Bounded at `LIMITS.QUOTE` and REFUSED rather than clipped; the essay on that
             * limit says why a clipped quote is worse than no quote at all.
             */
            quoted: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            page: number | null;
            from: number | null;
            to: number | null;
            quoted: string;
        }, {
            path: string;
            page?: number | null | undefined;
            from?: number | null | undefined;
            to?: number | null | undefined;
            quoted?: string | undefined;
        }>, {
            path: string;
            page: number | null;
            from: number | null;
            to: number | null;
            quoted: string;
        }, {
            path: string;
            page?: number | null | undefined;
            from?: number | null | undefined;
            to?: number | null | undefined;
            quoted?: string | undefined;
        }>, {
            path: string;
            page: number | null;
            from: number | null;
            to: number | null;
            quoted: string;
        }, {
            path: string;
            page?: number | null | undefined;
            from?: number | null | undefined;
            to?: number | null | undefined;
            quoted?: string | undefined;
        }>>>;
        /**
         * Whether this module has been pinned, and will stop being re-pointed.
         *
         * ## The field that makes pinning honest
         *
         * A person may want two panes on two different epics — last quarter's beside
         * this one, to compare — or a module holding still while they move the canvas
         * around it. Nothing stops a host doing that: it simply sends one frame a
         * different context, or stops sending it new ones.
         *
         * What stopped it being allowed was the other side. A module pinned by a host
         * that never said so has no way to tell a person's pin from the canvas not
         * having moved. It goes on describing itself as showing "the open epic" when
         * it is showing a remembered one; it cannot explain itself; and a module
         * written against one host's silent pinning behaves differently there in a
         * way its author cannot discover. That is a host-only convention, and this
         * package's whole position is that a module must be able to see what it is
         * subject to.
         *
         * So the pin is said out loud. `true` means: what you were last told is what
         * you keep, and further changes to this canvas will not reach you until this
         * goes false again. A module that ignores the field is exactly as correct as
         * it was before — it simply stops receiving updates, which is the behaviour a
         * host could always have chosen. A module that reads it can say "held" in its
         * own words, which is the whole point.
         *
         * The context carrying it is still sent when the pin CHANGES, in both
         * directions, and that is not a contradiction of "you will receive nothing":
         * the message announcing the freeze is the last one through, and the message
         * lifting it is the first. A pin nobody was told about is the thing this
         * field exists to prevent.
         */
        pinned: z.ZodDefault<z.ZodBoolean>;
        /**
         * What this canvas has been told to tell this module, or null.
         *
         * ## A prompt is a thing a person wrote, aimed at one pane
         *
         * Some modules do work that has to be described before it can be done —
         * "review these for security", "the house style is in CONTRIBUTING.md" — and
         * the description belongs to the person, not to the program. So it is written
         * on the canvas and delivered here, the same way the selection is: a module
         * declaring `prompt` in its manifest is saying it has a use for one, and a
         * host that has one for it puts it in the context.
         *
         * ## Why the host composes it, and a module receives one string
         *
         * Several panes on a canvas may each have something to say to the same
         * module. The obvious shape is a list of fragments with their authors, and it
         * is wrong here: it makes every module that reads a prompt responsible for
         * merging fragments, ordering them, and deciding what happens when two
         * contradict — which is a policy question about somebody's own canvas, and
         * three modules would answer it three ways.
         *
         * The host already knows what is on the canvas, who aimed what at whom, and
         * in what order they were written. So it composes, and hands over the result
         * as text. A module's job is to use it, and its author should be able to read
         * the whole of what they were given in one place — which is also what makes
         * it reviewable by the person who wrote it, in the host, before it is sent.
         *
         * Null rather than empty for the reason `epic` is nullable: "there is no
         * prompt for you" is a state a module must be able to move into, and a module
         * that kept the last one forever would be working from instructions somebody
         * deleted.
         */
        prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        /**
         * Which kehikko this context is about.
         *
         * A module's page is loaded once and shown on whichever canvas asks for it,
         * so a module genuinely cannot tell where it is standing — and it needs to
         * the moment anything else on the wire says where IT came from. An event
         * carries the kehikko it happened on; this says the one being looked at; and
         * near-or-far becomes a comparison the module makes rather than a rule the
         * host imposes.
         *
         * Nullable because a host need not have canvases at all. A module that finds
         * it null can still show everything it is sent — it simply cannot sort near
         * from far, which is a smaller loss than being handed a wrong answer.
         */
        kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            id: z.ZodNumber;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: number;
            name: string;
        }, {
            id: number;
            name: string;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        epic: string | null;
        prompt: string | null;
        project: string | null;
        projectPath: string | null;
        theme: "light" | "dark";
        selection: string[];
        passage: {
            path: string;
            page: number | null;
            from: number | null;
            to: number | null;
            quoted: string;
        } | null;
        pinned: boolean;
        kehikko: {
            id: number;
            name: string;
        } | null;
    }, {
        epic?: string | null | undefined;
        prompt?: string | null | undefined;
        project?: string | null | undefined;
        projectPath?: string | null | undefined;
        theme?: "light" | "dark" | undefined;
        selection?: string[] | undefined;
        passage?: {
            path: string;
            page?: number | null | undefined;
            from?: number | null | undefined;
            to?: number | null | undefined;
            quoted?: string | undefined;
        } | null | undefined;
        pinned?: boolean | undefined;
        kehikko?: {
            id: number;
            name: string;
        } | null | undefined;
    }>;
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
    state: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.hello";
    protocol: number;
    session: string;
    context: {
        epic: string | null;
        prompt: string | null;
        project: string | null;
        projectPath: string | null;
        theme: "light" | "dark";
        selection: string[];
        passage: {
            path: string;
            page: number | null;
            from: number | null;
            to: number | null;
            quoted: string;
        } | null;
        pinned: boolean;
        kehikko: {
            id: number;
            name: string;
        } | null;
    };
    state: string | null;
}, {
    type: "roadmap.hello";
    protocol: number;
    session: string;
    context: {
        epic?: string | null | undefined;
        prompt?: string | null | undefined;
        project?: string | null | undefined;
        projectPath?: string | null | undefined;
        theme?: "light" | "dark" | undefined;
        selection?: string[] | undefined;
        passage?: {
            path: string;
            page?: number | null | undefined;
            from?: number | null | undefined;
            to?: number | null | undefined;
            quoted?: string | undefined;
        } | null | undefined;
        pinned?: boolean | undefined;
        kehikko?: {
            id: number;
            name: string;
        } | null | undefined;
    };
    state?: string | null | undefined;
}>, z.ZodObject<{
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /**
     * What the project is CALLED. Unchanged, and deliberately still a name.
     *
     * This is the string a module puts on screen. A path is a bad label — it is
     * long, it is the same for its first forty characters as every other project
     * on the machine, and its last segment is a folder name somebody chose for
     * their disk rather than a name they chose for their work. A host that sent
     * only a path would make every module invent a display name by splitting a
     * string, and eleven modules would split it eleven ways.
     */
    project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /**
     * Where the project IS: an absolute folder path on the host's machine.
     *
     * ## Why a name was not enough
     *
     * A name is something to print. Everything a module actually wants to DO with
     * a project needs somewhere to open: read the epics under it, run a command
     * in it, show its history, list its chapters. Until this field existed each of
     * those modules had to be told its own root separately — an environment
     * variable per module, set by whoever started it — so a host could move a
     * person to another project and every module would go on reading the first
     * one, correctly, from the root it was given at launch. Nothing errored. The
     * modules simply described a different project from the one the host named.
     *
     * Absolute, and the host is the only one in a position to vouch for that.
     * This package does no I/O and cannot check it — see `LIMITS.PATH`. A module
     * receiving a relative path here has been handed something its host could not
     * have meant, and should treat it as it treats any other field it was lied
     * to about.
     *
     * Null is a real state and not an oversight. A host with no filesystem of its
     * own — a hosted one, a demo, a test harness — knows the name of the project
     * a person is looking at and has no folder to point at. A module handed a
     * name and no path can still say which project it is showing and must not
     * pretend it can open it.
     *
     * ## Why this is a second field and not `project: { name, path }`
     *
     * The tidier shape is the object: two facts about one thing, atomically
     * consistent, impossible to have a path without a name — and it is the shape
     * this package already uses for `kehikko`. It was rejected here for one
     * reason, and the reason is `PROTOCOL`.
     *
     * `PROTOCOL` goes up when an existing field CHANGES SHAPE, and stays put when
     * the wire merely learns a new word — see the essay on it in `constants.ts`,
     * which is emphatic that a number going up for additions is a number nobody
     * can act on. Turning `project` into an object is exactly a shape change: a
     * module rendering `context.project` in a span prints a project name today
     * and `[object Object]` afterwards, with no version signal to tell it why.
     * That module is not degraded, it is broken, and the protocol's own rule says
     * it should have been told it was INCOMPATIBLE rather than left to find out
     * on screen.
     *
     * So the choice was: bump the protocol and make every module in the world
     * incompatible in order to nest two strings, or add a field and break
     * nothing. The second is what the rule is for. `project` still means what it
     * meant, still parses as what it parsed as, and a module that never reads
     * `projectPath` is exactly as correct as it was yesterday — which is the test
     * this package applies to every addition.
     *
     * The cost is honest and worth naming: two nullable fields can disagree, and
     * nothing here prevents a host sending a path with no name. A host should
     * fill them in one place, from one project, so that they cannot; this package
     * can say that and cannot enforce it.
     */
    projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    /**
     * What the person has picked out, if anything.
     *
     * ## Why a selection is context and not a message between modules
     *
     * The case that produced this: one module lists an epic's references, another
     * shows a journey, and picking a reference in the first should show it in the
     * second. The obvious build is a channel from one to the other — and that
     * ends modularity, because the first module then has to know the second
     * exists, and a canvas without the second is a canvas where the first is
     * sending into nothing.
     *
     * A selection is the same KIND of fact as the open epic: it is what this
     * canvas is looking at. So it travels the way the epic travels. A module asks
     * the host to set it, the host tells everyone, and no module ever learns
     * which other module is listening — or whether any is. Each works alone, and
     * two of them work together without either having been written for the other.
     *
     * ## Refs and nothing else
     *
     * The sender knows more than this carries — which of these is an issue and
     * which a pull request — and that knowledge deliberately does not travel. See
     * `selection.set` in `methods.ts`: a host can vouch that these are the refs
     * somebody picked, and cannot vouch for what they ARE, because it was told
     * and never checked. Context is the host's own knowledge or it is a rumour
     * with a protocol's name on it, which is the same reason `slug` is not here.
     *
     * Empty rather than absent, for the reason `epic` is nullable rather than
     * optional: "nothing is selected" is a state a module has to be able to move
     * INTO, and a field that simply vanished would leave a module showing the
     * last selection forever.
     */
    selection: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /**
     * Where in a document the reader is pointing, or null.
     *
     * ## A passage is context, and the argument is the one above, unchanged
     *
     * The essay on `selection` a few lines up makes the case for a picked
     * reference travelling as context rather than as a message from one module to
     * another, and every line of it holds here with the nouns swapped. A reader
     * highlights a sentence in the module that shows the paper; a module that
     * keeps notes should narrow to it. The obvious build is a channel from the
     * first to the second, and it ends modularity: the paper would have to know
     * the notes exist, and a canvas without the notes is a paper sending into
     * nothing.
     *
     * There is a second argument here that `selection` did not need, and it is
     * the stronger one. **An event would be missed.** A selection made at
     * 10:04 and a module opened at 10:05 is the ordinary case — a person reads,
     * finds something worth a note, and only then puts a notes pane on the
     * canvas. A message sent at the moment of pointing is gone by then, and the
     * new pane would open empty beside a reader who is quite plainly pointing at
     * something. State is what a module can arrive late to, and pointing at a
     * passage is a state: it is true for as long as the highlight is on screen,
     * not for the instant the mouse came up.
     *
     * ## Null rather than absent, for the reason everything here is
     *
     * "No document is open" is a state a module has to be able to move INTO. A
     * field that vanished would leave a notes pane showing the notes on a chapter
     * the reader closed ten minutes ago, with no way to tell that from the
     * chapter still being open — which is a pane confidently describing the wrong
     * document, the failure this whole file is arranged against.
     *
     * A module reading this against a host that has never heard of it finds
     * `null`, which is the true answer there: that host has nobody pointing at
     * anything.
     */
    passage: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        /**
         * Which document. An identity string, and deliberately not promised to be
         * anything else.
         *
         * This package does no I/O and cannot say whether a path exists, is
         * absolute, or is inside anything — see `LIMITS.PATH`, which is the same
         * bound and the same argument. A host with a filesystem should send an
         * absolute path, because that is the only spelling two modules can agree on
         * without sharing a root; a host without one sends whatever names a document
         * in its world. Consumers compare it for EQUALITY. A consumer that resolves
         * it and opens it is opening a path a stranger's program chose, and owes
         * itself the confinement check it would owe any other.
         */
        path: z.ZodString;
        /**
         * Which page of it, or null.
         *
         * Nullable because pagination is not a property of documents; it is a thing
         * some readers do to them. A module showing a scrolling document has no page
         * to name and must not be forced to invent one, and a consumer receiving null
         * knows the difference between "not paginated" and "page 1".
         *
         * It is a FILTER and never an anchor, and the difference is the reason this
         * sits beside `from`/`to` rather than instead of them. Page numbers move when
         * anything above them is edited; byte offsets at least rot visibly against a
         * quote. Anything written down permanently should be written against the
         * range and the words, with the page kept as what it is — a fast way to
         * narrow a list to the sheet somebody is looking at.
         */
        page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        /**
         * The first byte of the selection within `path`, or null when nothing is
         * selected. Bytes rather than characters, because the consumer that opens
         * the file reads bytes and a character count would need the encoding to be
         * agreed on as well.
         */
        from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        /** One past the last byte, exclusive, or null. */
        to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        /**
         * What the selection said when it was made, as the pointing module saw it.
         *
         * Empty when nothing is selected, which is the only honest value then — there
         * is no text to quote for a whole page and a module that sent the page's text
         * would be sending a document through every frame on the canvas.
         *
         * Bounded at `LIMITS.QUOTE` and REFUSED rather than clipped; the essay on that
         * limit says why a clipped quote is worse than no quote at all.
         */
        quoted: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        page: number | null;
        from: number | null;
        to: number | null;
        quoted: string;
    }, {
        path: string;
        page?: number | null | undefined;
        from?: number | null | undefined;
        to?: number | null | undefined;
        quoted?: string | undefined;
    }>, {
        path: string;
        page: number | null;
        from: number | null;
        to: number | null;
        quoted: string;
    }, {
        path: string;
        page?: number | null | undefined;
        from?: number | null | undefined;
        to?: number | null | undefined;
        quoted?: string | undefined;
    }>, {
        path: string;
        page: number | null;
        from: number | null;
        to: number | null;
        quoted: string;
    }, {
        path: string;
        page?: number | null | undefined;
        from?: number | null | undefined;
        to?: number | null | undefined;
        quoted?: string | undefined;
    }>>>;
    /**
     * Whether this module has been pinned, and will stop being re-pointed.
     *
     * ## The field that makes pinning honest
     *
     * A person may want two panes on two different epics — last quarter's beside
     * this one, to compare — or a module holding still while they move the canvas
     * around it. Nothing stops a host doing that: it simply sends one frame a
     * different context, or stops sending it new ones.
     *
     * What stopped it being allowed was the other side. A module pinned by a host
     * that never said so has no way to tell a person's pin from the canvas not
     * having moved. It goes on describing itself as showing "the open epic" when
     * it is showing a remembered one; it cannot explain itself; and a module
     * written against one host's silent pinning behaves differently there in a
     * way its author cannot discover. That is a host-only convention, and this
     * package's whole position is that a module must be able to see what it is
     * subject to.
     *
     * So the pin is said out loud. `true` means: what you were last told is what
     * you keep, and further changes to this canvas will not reach you until this
     * goes false again. A module that ignores the field is exactly as correct as
     * it was before — it simply stops receiving updates, which is the behaviour a
     * host could always have chosen. A module that reads it can say "held" in its
     * own words, which is the whole point.
     *
     * The context carrying it is still sent when the pin CHANGES, in both
     * directions, and that is not a contradiction of "you will receive nothing":
     * the message announcing the freeze is the last one through, and the message
     * lifting it is the first. A pin nobody was told about is the thing this
     * field exists to prevent.
     */
    pinned: z.ZodDefault<z.ZodBoolean>;
    /**
     * What this canvas has been told to tell this module, or null.
     *
     * ## A prompt is a thing a person wrote, aimed at one pane
     *
     * Some modules do work that has to be described before it can be done —
     * "review these for security", "the house style is in CONTRIBUTING.md" — and
     * the description belongs to the person, not to the program. So it is written
     * on the canvas and delivered here, the same way the selection is: a module
     * declaring `prompt` in its manifest is saying it has a use for one, and a
     * host that has one for it puts it in the context.
     *
     * ## Why the host composes it, and a module receives one string
     *
     * Several panes on a canvas may each have something to say to the same
     * module. The obvious shape is a list of fragments with their authors, and it
     * is wrong here: it makes every module that reads a prompt responsible for
     * merging fragments, ordering them, and deciding what happens when two
     * contradict — which is a policy question about somebody's own canvas, and
     * three modules would answer it three ways.
     *
     * The host already knows what is on the canvas, who aimed what at whom, and
     * in what order they were written. So it composes, and hands over the result
     * as text. A module's job is to use it, and its author should be able to read
     * the whole of what they were given in one place — which is also what makes
     * it reviewable by the person who wrote it, in the host, before it is sent.
     *
     * Null rather than empty for the reason `epic` is nullable: "there is no
     * prompt for you" is a state a module must be able to move into, and a module
     * that kept the last one forever would be working from instructions somebody
     * deleted.
     */
    prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /**
     * Which kehikko this context is about.
     *
     * A module's page is loaded once and shown on whichever canvas asks for it,
     * so a module genuinely cannot tell where it is standing — and it needs to
     * the moment anything else on the wire says where IT came from. An event
     * carries the kehikko it happened on; this says the one being looked at; and
     * near-or-far becomes a comparison the module makes rather than a rule the
     * host imposes.
     *
     * Nullable because a host need not have canvases at all. A module that finds
     * it null can still show everything it is sent — it simply cannot sort near
     * from far, which is a smaller loss than being handed a wrong answer.
     */
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
    }, {
        id: number;
        name: string;
    }>>>;
} & {
    type: z.ZodLiteral<"roadmap.context">;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.context";
    epic: string | null;
    protocol: number;
    prompt: string | null;
    project: string | null;
    projectPath: string | null;
    theme: "light" | "dark";
    selection: string[];
    passage: {
        path: string;
        page: number | null;
        from: number | null;
        to: number | null;
        quoted: string;
    } | null;
    pinned: boolean;
    kehikko: {
        id: number;
        name: string;
    } | null;
}, {
    type: "roadmap.context";
    protocol: number;
    epic?: string | null | undefined;
    prompt?: string | null | undefined;
    project?: string | null | undefined;
    projectPath?: string | null | undefined;
    theme?: "light" | "dark" | undefined;
    selection?: string[] | undefined;
    passage?: {
        path: string;
        page?: number | null | undefined;
        from?: number | null | undefined;
        to?: number | null | undefined;
        quoted?: string | undefined;
    } | null | undefined;
    pinned?: boolean | undefined;
    kehikko?: {
        id: number;
        name: string;
    } | null | undefined;
}>, z.ZodDiscriminatedUnion<"ok", [z.ZodObject<{
    type: z.ZodLiteral<"roadmap.response">;
    id: z.ZodString;
    ok: z.ZodLiteral<true>;
    /**
     * Whatever the method answers with, and deliberately untyped. See the note
     * at the top of `methods.ts`: a client that asserted a shape here would be
     * asserting something no host promised.
     */
    data: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.response";
    ok: true;
    id: string;
    data?: unknown;
}, {
    type: "roadmap.response";
    ok: true;
    id: string;
    data?: unknown;
}>, z.ZodObject<{
    type: z.ZodLiteral<"roadmap.response">;
    id: z.ZodString;
    ok: z.ZodLiteral<false>;
    reason: z.ZodEnum<["unknown-module", "unknown-method", "failed"]>;
    /**
     * Bounded, because a refusal is the one place a host quotes a module's own
     * text back at it — the method name it asked for, the extension it named —
     * and a sentence that carried two hundred thousand characters of that back
     * across the frame would be a module's document, round-tripped, at the
     * module's own request. Long enough for every sentence anybody actually
     * writes; short enough that no answer is ever a document.
     */
    error: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.response";
    ok: false;
    id: string;
    reason: "unknown-module" | "unknown-method" | "failed";
    error: string;
}, {
    type: "roadmap.response";
    ok: false;
    id: string;
    reason: "unknown-module" | "unknown-method" | "failed";
    error?: string | undefined;
}>]>, z.ZodEffects<z.ZodObject<{
    type: z.ZodLiteral<"roadmap.goto">;
    id: z.ZodString;
    ref: z.ZodOptional<z.ZodString>;
    step: z.ZodOptional<z.ZodNumber>;
    epic: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.goto";
    id: string;
    epic?: string | undefined;
    step?: number | undefined;
    ref?: string | undefined;
}, {
    type: "roadmap.goto";
    id: string;
    epic?: string | undefined;
    step?: number | undefined;
    ref?: string | undefined;
}>, {
    type: "roadmap.goto";
    id: string;
    epic?: string | undefined;
    step?: number | undefined;
    ref?: string | undefined;
}, {
    type: "roadmap.goto";
    id: string;
    epic?: string | undefined;
    step?: number | undefined;
    ref?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"roadmap.event">;
    protocol: z.ZodNumber;
    /** The format, e.g. `roadmap.notifications@1`. Known to the host, or unsent. */
    extension: z.ZodString;
    /** Whatever that format says. Validated by the host before it left. */
    payload: z.ZodUnknown;
    /** The module that emitted it, named by the host from its own registry. */
    from: z.ZodString;
    /**
     * When the host accepted it, ISO 8601. A receiver ordering by arrival would
     * be ordering by its own scheduler instead.
     */
    at: z.ZodString;
    /**
     * The kehikko it happened on, so a receiver can tell near from far.
     *
     * A module is loaded once and shown on whichever canvas asks for it, so "this
     * kehikko" is a question it cannot answer alone. `context.kehikko` says where
     * the receiver is standing and this says where the event came from; comparing
     * the two is the whole of a near/far filter, and it is a comparison rather
     * than a rule so a module can present it however it likes.
     */
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
    }, {
        id: number;
        name: string;
    }>>>;
}, "strip", z.ZodTypeAny, {
    at: string;
    type: "roadmap.event";
    protocol: number;
    from: string;
    kehikko: {
        id: number;
        name: string;
    } | null;
    extension: string;
    payload?: unknown;
}, {
    at: string;
    type: "roadmap.event";
    protocol: number;
    from: string;
    extension: string;
    kehikko?: {
        id: number;
        name: string;
    } | null | undefined;
    payload?: unknown;
}>]>;
export type HostMessage = z.infer<typeof hostMessageSchema>;
export declare const moduleMessageSchema: z.ZodUnion<[z.ZodObject<{
    type: z.ZodLiteral<"roadmap.ready">;
    id: z.ZodString;
    protocol: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.ready";
    id: string;
    protocol: number;
}, {
    type: "roadmap.ready";
    id: string;
    protocol?: number | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"roadmap.request">;
    id: z.ZodString;
    /**
     * Bounded but not held to the list of known methods, which would be this
     * schema deciding what a host answers. A host with a method this package has
     * never heard of is a host doing its job; a host without one this package
     * knows is entitled to refuse it, with `unknown-method`.
     */
    method: z.ZodString;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    params: Record<string, unknown>;
    type: "roadmap.request";
    id: string;
    method: string;
}, {
    type: "roadmap.request";
    id: string;
    method: string;
    params?: Record<string, unknown> | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"roadmap.resize">;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.resize";
    height: number;
}, {
    type: "roadmap.resize";
    height: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"roadmap.went">;
    id: z.ZodString;
    found: z.ZodBoolean;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.went";
    why: string;
    id: string;
    found: boolean;
}, {
    type: "roadmap.went";
    id: string;
    found: boolean;
    why?: string | undefined;
}>]>;
export type ModuleMessage = z.infer<typeof moduleMessageSchema>;
export type WireMessage = HostMessage | ModuleMessage;
export type Hello = z.infer<typeof helloSchema>;
export type ContextMessage = z.infer<typeof contextMessageSchema>;
export type Response = z.infer<typeof responseSchema>;
export type Goto = z.infer<typeof gotoSchema>;
export type ModuleEvent = z.infer<typeof eventSchema>;
export type Ready = z.infer<typeof readySchema>;
export type Request = z.infer<typeof requestSchema>;
export type Resize = z.infer<typeof resizeSchema>;
export type Went = z.infer<typeof wentSchema>;
/**
 * Is this worth parsing at all?
 *
 * The cheap first filter, before a schema is run over a `MessageEvent` from a
 * window that receives messages from everything. It says nothing about whether
 * the message is valid or whether the sender is anybody — it says the value is
 * an object with a `type` that starts `roadmap.`, which is what separates a
 * message meant for this protocol from the several that are not.
 */
export declare function looksLikeWireMessage(value: unknown): value is {
    type: string;
};
//# sourceMappingURL=wire.d.ts.map