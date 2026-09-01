import { z } from 'zod';
/**
 * The questions a module can ask, by name and by shape.
 *
 * A method name is a spelling two programs have to agree on exactly as much as
 * a message type is — a module calling `epics.get` at a host that answers
 * `epic.get` gets a refusal it cannot debug from the inside — so the names are
 * written down once, here, and both sides import them.
 *
 * What is NOT here is any of the answering. There is no dispatch table, no
 * handler and no default implementation. A host answers these out of its own
 * material by its own rules, and two hosts may answer the same question with
 * different amounts of the same epic. The request side is a contract because a
 * caller has to construct it; the CONTENT of a response is `unknown` on
 * purpose, because a client that assumed a shape for it would be asserting
 * something no host promised.
 *
 * ## Epics, and the word that is not here
 *
 * An **epic** belongs to a project and is what a host holds: the steps, their
 * order, the references they name, and what the last refresh read from the
 * trackers about them. A **journey** is a different idea, and it lives in a
 * module app of its own rather than in the host — so this package does not
 * name one, does not bound one, and has no method that returns one. A module
 * that wants journeys talks to whatever program owns them, which from this
 * protocol's side is not a special arrangement at all: it is just a program.
 *
 * These files inherited a codebase where the two words meant one thing. Every
 * method, field, capability and pattern that carried the conflation is renamed
 * rather than aliased, and `PROTOCOL` went to 2 for it. See the essay there.
 *
 * ## Two answers ARE described, and the line is not where you would guess
 *
 * `methodResults` below gives a shape to exactly two of these answers, which
 * looks at first like the rule above being broken. It is not, and the
 * distinction is worth stating because it decides what may be added later.
 *
 * An answer is **material** when it is a host's own holdings — what an epic
 * says, what a tracker last reported, how much of it this host chose to hand
 * over. Two honest hosts differ there, and a shape imposed on it would be this
 * package legislating what a host must hold.
 *
 * An answer is an **outcome** when it reports what happened to an act this
 * protocol itself defines. Nothing about a host's holdings varies there. If
 * `view.goto` came back as `unknown`, the caller could not tell "you are now
 * looking at it" from "I would rather not" from "there is nothing by that
 * name" without parsing English, and those three send a person to three
 * different places. An unspecified outcome is not modesty; it is a request
 * that cannot be acted on.
 *
 * `epics.list` is the third case, and the argument for it is different again —
 * see `epicsListResult`.
 */
/**
 * The areas of a host's material these methods touch.
 *
 * They are names for a KIND of question, not permissions — nothing grants one,
 * nothing checks one, and a module that declares none and calls everything is
 * treated exactly like a module that declared honestly. They exist so that
 * `declares.uses` can say something a person can read at a glance: "this
 * program reads the epics and reports where work is" is a sentence; a list of
 * seven method names is not.
 *
 * The colons in the spellings are a leftover from when these were permissions,
 * and they are kept rather than tidied: the punctuation was never the confusing
 * part, and a module author reading `epics:read` reads a subject and a verb,
 * which is all it ever really was. (The WORDS did change — `journeys:read` is
 * `epics:read` now — but that is the epic rename, which had a reason, and not a
 * tidy-up, which does not.)
 */
export declare const CAPABILITIES: {
    readonly 'epics:read': "Read which epics exist, and their titles, ledes and projects.";
    readonly 'steps:read': "Read an epic's steps: their titles, bodies and the references they name.";
    readonly 'live:read': "Read what the last refresh found in the trackers for an epic.";
    readonly 'stage:report': "Say where work is — working, in review, or blocked — into the host's database.";
    readonly 'events:emit': "Send an extension payload: a notification, a report of its own calls.";
    /**
     * The one capability that does not read or write anything — it asks the host
     * to MOVE. See `view.goto`. Named for the area rather than for the method,
     * like the rest of these, so that the sentence a person reads before
     * installing a program is "reads the epics and asks to navigate" rather than
     * a list of method names.
     */
    readonly 'view:navigate': "Ask the roadmap to show a particular epic, step or reference. The roadmap decides.";
    /**
     * Say which references the person has picked out.
     *
     * A write, and a SHARED one: the selection goes into the context every framed
     * module receives, so a module declaring this is asking to change what its
     * neighbours are looking at. That belongs in the sentence somebody reads
     * before running the program, which is why it is spelled out here rather than
     * left as "sets the selection".
     */
    readonly 'selection:set': "Say which references the person has picked out. Every module on the canvas is told.";
    /**
     * Say where in a document the person is pointing.
     *
     * A write, and a SHARED one, exactly like `selection:set` — and one that
     * carries more. A passage names a file on the host's machine, a place in it,
     * and a paragraph of what was there. A module declaring this is asking to put
     * all of that in front of every other pane on the canvas, and somebody
     * deciding whether to run the program should read that in the sentence rather
     * than discover it from a field name.
     */
    readonly 'passage:set': "Say where in a document the person is pointing, and quote it. Every module on the canvas is told.";
    /**
     * Ask for its own container's filters to be moved.
     *
     * Narrow, and the sentence says how narrow: it reaches this container's own
     * narrowing and nothing else — not another container's, not the canvas, not
     * what anybody else is shown. A module wants it in order to answer "go to
     * this row" by clearing whatever is hiding that row, which is a thing the
     * person just asked for.
     */
    readonly 'filters:set': "Move this container’s own filters, so it can show you something you asked to see.";
    /**
     * Keep a little state of its own, and get it back next time.
     *
     * Named for what the module gets rather than for what the host does, because
     * from the host's side this is not storage of anything in particular — it is
     * a string it never reads.
     */
    readonly 'state:keep': "Keep a small amount of its own state between sessions. The roadmap does not read it.";
};
export type Capability = keyof typeof CAPABILITIES;
export declare const CAPABILITY_NAMES: Capability[];
/**
 * Every method, and the capability it belongs to.
 *
 * A plain object, and therefore a lookup hazard: `METHODS[method]` where
 * `method` is a string out of a frame answers with something inherited when the
 * string is `constructor`. Use `own()` from `./ids.js`, or a `Map`. The essay
 * on `MODULE_ID` is about exactly this and it applies here too — the method
 * name arrives from the same place the module id does.
 */
export declare const METHODS: {
    readonly 'epics.list': "epics:read";
    readonly 'epic.get': "epics:read";
    readonly 'steps.list': "steps:read";
    readonly 'live.get': "live:read";
    readonly 'stage.report': "stage:report";
    readonly 'events.emit': "events:emit";
    readonly 'view.goto': "view:navigate";
    readonly 'selection.set': "selection:set";
    readonly 'passage.set': "passage:set";
    readonly 'filters.set': "filters:set";
    readonly 'state.set': "state:keep";
};
export type Method = keyof typeof METHODS;
export declare const METHOD_NAMES: Method[];
/**
 * The three stages a module may report.
 *
 * Three of a longer line, because these are the three nothing else can see.
 * Whether somebody is working, whether they have handed a change over, whether
 * they are stuck — no tracker has an opinion, and the report is the only source
 * there will be. Everything else on the line is read from a tracker, and a
 * module writing it would be a second answer to a question that already has
 * one.
 */
export declare const REPORTED_STAGES: readonly ["working", "in-review", "blocked"];
export type ReportedStage = (typeof REPORTED_STAGES)[number];
export declare const methodParams: {
    readonly 'epics.list': z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    readonly 'epic.get': z.ZodObject<{
        epic: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        epic: string;
    }, {
        epic: string;
    }>;
    readonly 'steps.list': z.ZodObject<{
        epic: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        epic: string;
    }, {
        epic: string;
    }>;
    readonly 'live.get': z.ZodObject<{
        epic: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        epic: string;
    }, {
        epic: string;
    }>;
    /**
     * Ask the roadmap to show something. See the essay on `navigationResult`.
     *
     * The same triple `roadmap.goto` carries, and named the same way on purpose:
     * a module that can receive a walk and a module that can ask for one are
     * describing the same act from two ends, and two spellings of it would be two
     * things to get wrong.
     *
     * One difference, and it is deliberate. `gotoSchema` refuses a message that
     * names only an epic, because a host with nothing to say but "this epic" says
     * it as context and has no reason to send a walk. Here, an epic alone is the
     * commonest ask there is — a module showing everything on the machine wants
     * "open that one", with no step and no reference in mind — so it is allowed,
     * and what is refused is a call that names nothing at all. A `view.goto` with
     * no target is not a request for anything; it is a call with a typo in it,
     * and the sooner the author sees that the better.
     */
    readonly 'view.goto': z.ZodEffects<z.ZodObject<{
        epic: z.ZodOptional<z.ZodString>;
        step: z.ZodOptional<z.ZodNumber>;
        /**
         * Bounded at `GOTO_REF` rather than `REF`, and REFUSED rather than
         * clipped. The receiver that exists today clips its inbound ref to 200
         * characters, which is the wrong half of the rule: a clipped sentence is
         * still the sentence, but a clipped ref is a DIFFERENT ref, and walking
         * somebody confidently to the wrong place is worse than telling them the
         * ask was malformed.
         */
        ref: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        epic?: string | undefined;
        step?: number | undefined;
        ref?: string | undefined;
    }, {
        epic?: string | undefined;
        step?: number | undefined;
        ref?: string | undefined;
    }>, {
        epic?: string | undefined;
        step?: number | undefined;
        ref?: string | undefined;
    }, {
        epic?: string | undefined;
        step?: number | undefined;
        ref?: string | undefined;
    }>;
    /**
     * Say which references the person has picked out.
     *
     * ## Refs, and deliberately nothing else
     *
     * A module sending this knows more than it puts in the call — References
     * knows `gh#131` is an issue and `gh#105` is a pull request, because it read
     * them out of four differently-named bags and the bag is the only thing that
     * says which. It is tempting to carry that along so the next module does not
     * have to look it up.
     *
     * It must not. The host relays this into the context every module receives,
     * and context is the host's own knowledge or it is a rumour with a protocol's
     * name on it — the same argument that took `slug` out of context when it
     * meant a journey. A host can vouch that these are the refs somebody picked;
     * it cannot vouch that one of them is an issue, because it was told that and
     * never checked. A module that needs the kind asks `live.get` and reads it
     * from the source the sender read it from.
     *
     * An empty list is how a selection is CLEARED, and it is a real call rather
     * than an absence — "nothing is selected" is a state a module has to be able
     * to move into, the same reason `epic` is nullable rather than optional.
     */
    readonly 'selection.set': z.ZodObject<{
        refs: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        refs: string[];
    }, {
        refs: string[];
    }>;
    /**
     * Say where in a document the person is pointing.
     *
     * ## The same act `selection.set` performs, on a different kind of thing
     *
     * A module asks; the host relays into the context every framed module
     * receives; no module ever learns which of its neighbours was listening, or
     * whether any was. The whole argument is in `contextSchema.passage` and in
     * the `selection` essay above it, and it is not repeated here.
     *
     * ## `null` is a real call, not an omission
     *
     * The reader closed the document, or moved to a pane that is not a document
     * at all. That has to be sendable, for the reason an empty `refs` array has
     * to be: a consumer holding the last passage forever would show the notes on
     * a chapter nobody has open. So `passage` is required and nullable rather
     * than optional — a call that simply left it out would be indistinguishable
     * from a caller with a typo in the field name, and one of those means "clear
     * it" while the other means nothing at all.
     *
     * ## The shape is imported rather than restated
     *
     * `selection.set` spells its own `refs` array out again, and that is fine for
     * an array of bounded strings. This is five fields with two cross-field rules
     * on them, and two copies of those rules is a wire where the host accepts
     * what the context schema will later drop, or the reverse — a passage that
     * validates on the way in and vanishes on the way out, with nothing anywhere
     * saying so. One definition, in `wire.ts`, read by both.
     */
    readonly 'passage.set': z.ZodObject<{
        passage: z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
            path: z.ZodString;
            page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
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
        }>>;
    }, "strip", z.ZodTypeAny, {
        passage: {
            path: string;
            page: number | null;
            from: number | null;
            to: number | null;
            quoted: string;
        } | null;
    }, {
        passage: {
            path: string;
            page?: number | null | undefined;
            from?: number | null | undefined;
            to?: number | null | undefined;
            quoted?: string | undefined;
        } | null;
    }>;
    /**
     * Ask the host to put this container's filters somewhere.
     *
     * ## The offer went one way, and that was the gap
     *
     * `roadmap.filters` lets a module say what it can be narrowed by; the host
     * draws the control and the choice comes back in `context.filters`. There was
     * no way back. The host owned the choice completely, which is right — it is
     * per container, it outlives a reload, and a module that could silently move
     * its own control would be a control that moves on its own.
     *
     * What that cost was discovered in References, which declined the header
     * control altogether and wrote down why. Two behaviours depended on the
     * module being able to clear its own narrowing:
     *
     *   - Answering `view.goto`. "Go to !1848" is answered by clearing whatever
     *     is hiding that row and scrolling to it. A module that cannot clear a
     *     host-held filter must either answer `found: true` about a row nobody
     *     can see, or refuse a reference it is looking at.
     *   - "One press puts everything back". A Clear that clears two thirds of the
     *     narrowing is a button that does not do what it says.
     *
     * ## It is a REQUEST, which is the whole reason this is safe
     *
     * The same shape as `passage.set` and `selection.set`: the module asks, the
     * host decides, and a refusal is survivable. The host may refuse for any
     * reason it likes — the container is pinned, the module is asking for a group
     * it never offered, the person is in the middle of choosing — and a module
     * has to keep working when it does. Nothing here entitles a module to a
     * setting; it entitles it to ask.
     *
     * ## What may be asked for
     *
     * A whole choice, replacing what is there, in the shape the host already
     * sends back in `context.filters`. `{}` is the meaningful empty value — every
     * group back to its fallback, which is what "clear the narrowing" is — and is
     * why this is not a per-group message: a module clearing three groups one at
     * a time would produce three contexts and three renders, and the page would
     * be seen part-way through its own reset.
     *
     * A host must drop any group the module is not currently offering, exactly as
     * it does when filling `context.filters` from its own store. The result is
     * whatever the host settled on, so a module learns what actually happened
     * rather than assuming it got what it asked for.
     */
    readonly 'filters.set': z.ZodObject<{
        filters: z.ZodEffects<z.ZodRecord<z.ZodEffects<z.ZodString, string, string>, z.ZodEffects<z.ZodString, string, string>>, Record<string, string>, Record<string, string>>;
    }, "strip", z.ZodTypeAny, {
        filters: Record<string, string>;
    }, {
        filters: Record<string, string>;
    }>;
    /**
     * Keep a small amount of this module's own state.
     *
     * ## The host does not read it, and that is the whole design
     *
     * A module framed without `allow-same-origin` runs on an opaque origin, where
     * `localStorage` does not merely return nothing — it throws. So a module has
     * nowhere of its own to remember which filter was on, and the alternatives
     * were both bad: declare storage and weaken the sandbox in order to remember
     * a toggle, or put the toggle in the URL, which does not survive the host
     * rebuilding the frame from `entry` on the next load.
     *
     * So the host keeps a string for it. An OPAQUE string: the host does not
     * parse it, does not validate its contents beyond a length, and has no
     * opinion about what is in it. That is what keeps this from becoming a
     * settings API the protocol would then have to describe — the moment the host
     * knows that a module has "filters", every module's preferences are the
     * protocol's business.
     *
     * ## Per module, not per pane
     *
     * A module's page is loaded once and shown on whichever canvas asks for it, so
     * one module is one document with one set of filters. State attached to a
     * PANE would need the document to be told it had moved between canvases, and
     * there is no message for that and should not be: a page cannot re-render its
     * own controls in response to something it is never told.
     *
     * It comes back in the greeting rather than being fetched, so a module has it
     * before its first render and does not draw the wrong filter first.
     */
    readonly 'state.set': z.ZodObject<{
        state: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        state: string;
    }, {
        state: string;
    }>;
    readonly 'stage.report': z.ZodObject<{
        ref: z.ZodString;
        stage: z.ZodEnum<["working", "in-review", "blocked"]>;
        /**
         * A line a person reads beside the report. Bounded, and REFUSED rather than
         * clipped when it is too long — which is the opposite of what happens to
         * text merely crossing back in a refusal, and the difference matters: a
         * clipped sentence is still the sentence, while a clipped ref is a
         * DIFFERENT ref, silently filed against work nobody meant, and a clipped
         * note is one that ends mid-word with nobody told it was cut. What is
         * stored has to be what was sent, or refused outright.
         */
        note: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        ref: string;
        stage: "blocked" | "working" | "in-review";
        note: string;
    }, {
        ref: string;
        stage: "blocked" | "working" | "in-review";
        note?: string | undefined;
    }>;
    readonly 'events.emit': z.ZodObject<{
        extension: z.ZodString;
        /**
         * Unknown here, and checked against the named extension's own schema by
         * whoever routes it — see `./extensions.js`. Typing it as a union of every
         * known payload would mean this method could not carry an extension this
         * version of the package has never heard of, which is the one thing a
         * versioned format registry is supposed to allow.
         */
        payload: z.ZodUnknown;
    }, "strip", z.ZodTypeAny, {
        extension: string;
        payload?: unknown;
    }, {
        extension: string;
        payload?: unknown;
    }>;
};
/** The params one method takes, as a caller must construct them. */
export type MethodParams<M extends Method> = z.input<(typeof methodParams)[M]>;
/**
 * What became of a `view.goto`.
 *
 * ## The wall this removes
 *
 * Until now a module could be walked and could not walk. `roadmap.goto` goes
 * one way, and the module → host words were `ready`, `request`, `resize`,
 * `went` — none of which moves anybody. So a program that shows a person every
 * project and epic on the machine could draw the whole map and never travel on
 * it: press a row, and the best it could do was describe where you would have
 * gone.
 *
 * ## Why a method and not a ninth message
 *
 * A new top-level `roadmap.navigate` was the other candidate, and it loses on
 * three counts.
 *
 * The first is that it would need an answer, and an answer needs correlation,
 * and correlation is a thing `request`/`response` already has, tested, with an
 * id and a timeout discipline and a refusal envelope carrying both a word and a
 * sentence. A second answered pair would be that machinery again, differently,
 * for one act. `went` exists as its own message only because `goto` is the host
 * speaking, and the host has no request channel; a module does.
 *
 * The second is legibility. `declares.uses` is a sentence somebody reads before
 * installing a program. A method belongs to a capability, so "this program
 * reads the epics and asks to navigate" is a sentence that writes itself. A
 * top-level message belongs to nothing and appears in no declaration.
 *
 * The third is the tone of the thing, which matters most. Look at what the
 * module's messages are: three statements and one unanswerable ask. `resize` is
 * the closest to a demand and it is deliberately fire-and-forget — the host
 * clamps it, may ignore it, and never replies. A module posting
 * `roadmap.navigate` at a host would read like `resize`: a thing done rather
 * than a thing asked, with no place for a no. Two programs both believing they
 * decide what is on screen is the defect this whole arrangement exists to
 * prevent. A REQUEST is a question with an answer, and the answer may be no.
 *
 * ## The three outcomes, and why refusing is not `ok: false`
 *
 * `moved` — the reader is now looking at what was asked for.
 *
 * `declined` — the host will not, right now. The target may well exist. A
 * reader may be mid-edit, the module may not be the surface with the person's
 * attention, a host may simply not let framed programs move anybody. No reason
 * is enumerated, for the same reason `responseFailureReasons` enumerates none:
 * a list of hosts' policies is a list that cannot be kept and reads as the set
 * of policies allowed.
 *
 * `no-such-target` — there is no such epic, no such step, nothing naming that
 * ref. The host looked and there is nothing there.
 *
 * The three are apart because they send a person somewhere different. `moved`:
 * say nothing, the screen already said it. `declined`: leave the row pressable
 * and perhaps offer an ordinary link, because trying again later is sensible.
 * `no-such-target`: say so — a dead reference is worth showing as dead, and a
 * module that retries it forever is a module lying about a map.
 *
 * Now the part that is easy to get wrong. A declined navigation comes back
 * `ok: true`. It is not a failed call: the host understood the question,
 * considered it, and answered no. `ok: false` stays what it was — the call
 * itself did not happen (no such method, no such module, something broke) —
 * and collapsing "the answer is no" into "the question failed" would leave a
 * caller unable to tell a host that refuses from a host too old to have been
 * asked. Those are the two futures the whole refusal design is built to keep
 * apart, so: **the question succeeded; the navigation did not.**
 *
 * `epic` is where the reader ended up, and it is here for the mode that would
 * otherwise have no way to know. A `global` mode is never sent context — that
 * is what `global` means — so after moving somebody it would be drawing a map
 * with no marker on it until the next thing happened to tell it. A
 * epic-scoped mode gets a `roadmap.context` too and can ignore this. Null
 * when the host did not move, and null is also honest for a move within the
 * epic already open.
 *
 * `why` is the sentence, for the person writing the module and sometimes for
 * the person reading it: "nothing in this epic names gh#41" is worth showing,
 * and a module that only knew `no-such-target` would have to invent a sentence
 * that might be wrong about which part was missing.
 */
export declare const NAVIGATION_OUTCOMES: readonly ["moved", "declined", "no-such-target"];
export type NavigationOutcome = (typeof NAVIGATION_OUTCOMES)[number];
export declare const navigationResult: z.ZodObject<{
    outcome: z.ZodEnum<["moved", "declined", "no-such-target"]>;
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    epic: string | null;
    why: string;
    outcome: "moved" | "declined" | "no-such-target";
}, {
    outcome: "moved" | "declined" | "no-such-target";
    epic?: string | null | undefined;
    why?: string | undefined;
}>;
export type NavigationResult = z.infer<typeof navigationResult>;
/**
 * The least an `epics.list` can answer with and still be an answer.
 *
 * ## Why this one gets a shape when `epic.get` does not
 *
 * The argument for leaving responses unspecified is a good one and it is about
 * CONTENT: two hosts hold different amounts of an epic, and a schema over that
 * would be this package deciding what a host keeps. That argument covers
 * `epic.get`, `steps.list` and `live.get` completely, and they stay unspecified
 * here.
 *
 * It had gone too far by one method. Every other question on the list takes an
 * epic slug, and `epics.list` is the only way to obtain one. If its answer may
 * be anything, then a module cannot rely on an epic having a name, and a
 * protocol whose entry point returns an unknown shape is a protocol with one
 * reachable method. That is not modesty about a host's material; it is the
 * front door being unspecified.
 *
 * So the spine is the smallest thing that makes the rest reachable, and no
 * more:
 *
 * - `slug` is required, because it is the argument to every other call.
 * - `title` and `project` are optional and bounded. Optional because a host
 *   that has no title for something is not malformed; bounded because if it
 *   sends one, a module is about to draw it.
 * - Everything else passes through untouched. A host with ledes, counts,
 *   owners, dates or anything else hands them over and this schema keeps them.
 *   The spine says what a field MEANS if it is there; it does not say the set
 *   of fields.
 *
 * That is the line: the package names the fields without which the question
 * cannot be answered usefully, and says nothing about what a host holds.
 *
 * There is no bound on how many epics come back, and that is not an oversight.
 * The bounds elsewhere exist because a stranger's text was about to reach the
 * host's own screen; this is the host's own material going the other way, at
 * the module's own request, and a host that decides to answer with a page at a
 * time is deciding that for itself and can say so with a field of its own.
 */
export declare const epicSpine: z.ZodObject<{
    slug: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    slug: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    slug: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.ZodTypeAny, "passthrough">>;
export type EpicSpine = z.infer<typeof epicSpine>;
export declare const epicsListResult: z.ZodObject<{
    epics: z.ZodArray<z.ZodObject<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    epics: z.ZodArray<z.ZodObject<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    epics: z.ZodArray<z.ZodObject<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough">>;
export type EpicsListResult = z.infer<typeof epicsListResult>;
/**
 * The answers this package describes, by method.
 *
 * Partial on purpose, and absence means UNSPECIFIED rather than empty: a method
 * with no entry here answers with a host's own material, and a module reading
 * it is reading something no host promised the shape of. Do not write a
 * fallback that treats a missing schema as "expects nothing".
 *
 * A plain object, so the same lookup hazard as everywhere else — a method name
 * arrives from a stranger's program and `methodResults['constructor']` finds
 * something on the prototype. Use `resultSchemaFor`, which asks properly.
 *
 * And, like every schema here: running this is a convenience, not the check.
 * A module validating what a host sent it is doing the same thing the host does
 * in the other direction, and for the same reason — it is the only side that
 * can.
 */
export declare const methodResults: Partial<Record<Method, z.ZodTypeAny>>;
/** The schema for one method's answer, or nothing — which means unspecified. */
export declare function resultSchemaFor(method: string): z.ZodTypeAny | undefined;
//# sourceMappingURL=methods.d.ts.map