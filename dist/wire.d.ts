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
 * `epic` is null when none is open, and it is nullable rather than absent
 * because "no epic" is a state a module has to be able to move INTO. A field
 * that simply disappeared would leave the module showing the last epic it heard
 * about, forever, which is a page quietly describing the wrong work.
 *
 * `theme` rides along for the same reason the rest of it does: a module that
 * had to ask would render once in the wrong colours first.
 */
export declare const contextSchema: z.ZodObject<{
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
}, "strip", z.ZodTypeAny, {
    epic: string | null;
    project: string | null;
    theme: "light" | "dark";
}, {
    epic?: string | null | undefined;
    project?: string | null | undefined;
    theme?: "light" | "dark" | undefined;
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
        project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    }, "strip", z.ZodTypeAny, {
        epic: string | null;
        project: string | null;
        theme: "light" | "dark";
    }, {
        epic?: string | null | undefined;
        project?: string | null | undefined;
        theme?: "light" | "dark" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.hello";
    protocol: number;
    session: string;
    context: {
        epic: string | null;
        project: string | null;
        theme: "light" | "dark";
    };
}, {
    type: "roadmap.hello";
    protocol: number;
    session: string;
    context: {
        epic?: string | null | undefined;
        project?: string | null | undefined;
        theme?: "light" | "dark" | undefined;
    };
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
    project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
} & {
    type: z.ZodLiteral<"roadmap.context">;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.context";
    epic: string | null;
    protocol: number;
    project: string | null;
    theme: "light" | "dark";
}, {
    type: "roadmap.context";
    protocol: number;
    epic?: string | null | undefined;
    project?: string | null | undefined;
    theme?: "light" | "dark" | undefined;
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
export declare const hostMessageSchema: z.ZodUnion<[z.ZodObject<{
    type: z.ZodLiteral<"roadmap.hello">;
    protocol: z.ZodNumber;
    session: z.ZodString;
    context: z.ZodObject<{
        epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    }, "strip", z.ZodTypeAny, {
        epic: string | null;
        project: string | null;
        theme: "light" | "dark";
    }, {
        epic?: string | null | undefined;
        project?: string | null | undefined;
        theme?: "light" | "dark" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.hello";
    protocol: number;
    session: string;
    context: {
        epic: string | null;
        project: string | null;
        theme: "light" | "dark";
    };
}, {
    type: "roadmap.hello";
    protocol: number;
    session: string;
    context: {
        epic?: string | null | undefined;
        project?: string | null | undefined;
        theme?: "light" | "dark" | undefined;
    };
}>, z.ZodObject<{
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
} & {
    type: z.ZodLiteral<"roadmap.context">;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "roadmap.context";
    epic: string | null;
    protocol: number;
    project: string | null;
    theme: "light" | "dark";
}, {
    type: "roadmap.context";
    protocol: number;
    epic?: string | null | undefined;
    project?: string | null | undefined;
    theme?: "light" | "dark" | undefined;
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