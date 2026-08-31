import { type Goto, type ModuleContext, type ModuleEvent, type ResponseFailureReason } from '../wire.js';
import { type MessageSource } from './mailbox.js';
/**
 * The bridge, and nothing about any one module.
 *
 * One conversation with one window, in the shape this package's schemas define.
 * It knows how to be greeted, how to ask a question and match the answer to it,
 * how to answer a `goto`, and how to say how tall it would like to be. It knows
 * nothing about what a module draws, and the code that draws knows nothing about
 * `postMessage`.
 *
 * This file was twelve files. Each of them was written by hand, and two of the
 * bugs below were found INDEPENDENTLY in several of them, months apart, because
 * a handshake copied by eye is a handshake whose reasoning did not travel with
 * it. The comments here are the record of what went wrong; a refactor that
 * shortens them will reintroduce what they prevent.
 *
 * ## Binding to the window, not to the origin
 *
 * A host may frame a module on an opaque origin — anything the module sends then
 * arrives at the host with an origin of `"null"`, and `"null"` is a string every
 * sandboxed frame in every tab shares, so it can never be an identity. A module
 * that declares storage does have a real origin of its own, and that changes
 * nothing here, because what it gained is an origin of OURS and not any
 * knowledge of the HOST's. The host's origin still arrives only in `ev.origin`,
 * it is still `"null"` exactly when the host is itself sandboxed, and a guess
 * that fails silently drops every message.
 *
 * So the identity is the window handle: the greeting arrives from exactly one
 * `MessageEvent.source`, nothing in this page or any other can forge that
 * handle, and after the greeting anything from another window is ignored. Not
 * because a stray message would be dangerous by itself, but because a second
 * sender answering our correlation ids is a page that quietly shows another
 * host's work under this one's name.
 *
 * We reply with `targetOrigin: '*'` where `ev.origin` gave us nothing to aim at.
 * There is nothing secret in what crosses this bridge — the name of an epic
 * somebody is already reading — and a module's own secrets never cross it at
 * all: they go to that module's own `/api` over an ordinary same-origin fetch.
 * Where `ev.origin` is a real origin we use it, because then it is a fact rather
 * than a guess.
 *
 * ## Parse what the host sends, too
 *
 * A framed page receives every message posted at its window: the host's, a dev
 * server's hot-reload socket, an extension's. `looksLikeWireMessage` is the
 * cheap filter and `hostMessageSchema` is the real one. A module that trusted
 * `data.type` alone would be one that a bundler's socket can put into an
 * unexplained state on a Tuesday.
 *
 * ## And it is still only a convenience
 *
 * Nothing here is the host's check, and nothing here is required of a module. A
 * module that hand-rolls all of this is exactly as conforming as one that
 * imports it — see the README. The moment this reads as mandatory, "a module is
 * a program somebody else could have written" has quietly become "a module is a
 * program that imports our client".
 */
/**
 * Why a question came back without an answer.
 *
 * The protocol's three, plus one more. `silent` is the timeout, and it is a
 * separate word rather than folded into `failed` because the two send a person
 * to different places: `failed` is the roadmap telling us it went wrong, and
 * `silent` is the roadmap not being there — which, from inside a frame, is
 * indistinguishable from a host that is still starting up. The protocol names
 * the same condition `silent` on the other side of the wire, for a module that
 * was greeted and never answered; the symmetry is intentional.
 */
export type Refusal = {
    reason: ResponseFailureReason | 'silent';
    error: string;
};
/**
 * A refusal, as a thrown thing.
 *
 * A class rather than a rejected string, so that `catch` can tell a refusal from
 * a `TypeError` in the caller's own handler without reading English. Every
 * rejection from `request` is one of these, always — a caller that writes
 * `catch (e) { e.refusal.reason }` is not making an assumption.
 */
export declare class HostRefused extends Error {
    readonly refusal: Refusal;
    constructor(refusal: Refusal);
}
/**
 * How long to wait for one answer.
 *
 * A number rather than forever, because forever is a page that shows "asking…"
 * until somebody reloads it, which is the exact shape of dishonesty a spinner
 * has — it is a claim that an answer is coming. Twelve seconds is long enough
 * for a roadmap reading a file off a cold disk and short enough that nobody sits
 * through it twice.
 */
export declare const ANSWER_WITHIN_MS = 12000;
/**
 * How long a `goto` listener has before the backstop answers for it.
 *
 * A timer rather than a line after the call, and the difference matters: a
 * listener may quite reasonably want to answer after a scroll settles, so
 * answering `false` the moment it returns would pre-empt the honest answer. Half
 * a second is longer than any of that and far shorter than the host's own
 * timeout, which means the reader gets the fallback link instead of a wait.
 */
export declare const GOTO_BACKSTOP_MS = 500;
/**
 * What a question asked before any greeting is refused with.
 *
 * One sentence in one place, because the React hook can be asked the same thing
 * between mounts and a caller should not have to tell two spellings of "nobody
 * is there" apart.
 */
export declare const NOBODY_TO_ASK = "Nothing has greeted this page, so there is nobody to ask.";
export interface HostEvents {
    /**
     * The greeting arrived, carrying the context that came with it and whatever
     * this module last asked the host to keep for it.
     *
     * The kept string rides beside the context rather than inside it because it
     * belongs to one module and the context is broadcast to all of them — the
     * protocol's own note on `state` in `helloSchema` makes that argument. It is
     * `null` when the host keeps nothing, which is a first run, a host that does
     * not answer `state.set`, or a module that has never written any; a module has
     * to be able to tell that from a field that is missing because the host is
     * older than the idea, and only one of those means it should draw its defaults
     * with confidence.
     *
     * And it arrives HERE, in the greeting, rather than being fetched — so a page
     * has it before its first render instead of drawing the wrong filter and
     * correcting it a moment later.
     */
    onHello?: (context: ModuleContext, state: string | null) => void;
    /** The reader switched epics, or this tab was shown again. */
    onContext?: (context: ModuleContext) => void;
    /**
     * "Go to this reference." The answer is not optional and not deferrable: the
     * host is waiting on it, and the protocol is explicit that a module which
     * never answers must not be able to hang a reference. So `answer` is handed
     * in rather than returned, and `connect` guarantees it is called — see below.
     */
    onGoto?: (goto: Goto, answer: (found: boolean, why?: string) => void) => void;
    /**
     * Something another module emitted, carried here by the host.
     *
     * Handed over whole rather than unwrapped, because unlike a context this
     * envelope is the message: `extension` says which format `payload` is in, and
     * `from`, `at` and `kehikko` are what a receiver filters on. A module that
     * declares no interest in any extension never registers this and never hears
     * one, which is the same as before it existed.
     */
    onEvent?: (event: ModuleEvent) => void;
}
export interface ConnectOptions {
    /**
     * What to listen to. The `mailbox` by default, and it is the default for a
     * reason — see the essay in `mailbox.ts`.
     *
     * Injectable because everything this function decides is tested without a
     * browser, and that has to keep being true.
     */
    source?: MessageSource;
    /** Override `ANSWER_WITHIN_MS`, for a module whose one question is genuinely slower. */
    answerWithin?: number;
    /** Override `GOTO_BACKSTOP_MS`. Shorten it freely; lengthening it past the host's own timeout does nothing. */
    gotoBackstop?: number;
}
export interface Connection {
    /**
     * Start hearing messages. Call it AFTER the connection has been stored.
     *
     * ## Why this is not part of `connect`, which is a bug in five modules
     *
     * The mailbox replays what arrived before anybody listened, and it replays
     * SYNCHRONOUSLY inside `addEventListener`. The greeting almost always arrived
     * before the page mounted — that is the entire reason the mailbox exists — so
     * with a one-step `connect`, `onHello` fires DURING the call, before the
     * caller's `host.current = connect(...)` has run. Anything the handler does
     * that reads the connection finds `null` and quietly does nothing.
     *
     * Worse, it works often enough to look fine. When the host happens to greet
     * after the effect returns — a slow module, a reload, a busy machine — the
     * assignment has already happened and everything behaves. A race whose good
     * outcome is the common one is the kind that ships, and it did: two modules
     * hit it independently, and each spent an afternoon on a symptom that reads
     * "the module will not speak" while the host's own log shows a module that
     * answered `ready`.
     *
     * Deferring the replay to a microtask would hide it rather than fix it. So the
     * two steps are in the caller's hands and in the caller's order:
     *
     * ```ts
     * const live = connect(id, events)
     * host.current = live
     * live.listen()
     * ```
     *
     * Idempotent, so a second call is nothing rather than a second subscription.
     */
    listen: () => Connection;
    /** Ask one question. Rejects with `HostRefused` — never with a bare string. */
    request: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
    /** Say how tall we would like to be. Fire and forget, by design. */
    resize: (height: number) => void;
    /** Whether anything has greeted us yet. */
    greeted: () => boolean;
    /** Stop listening. Every question still waiting is refused rather than left hanging. */
    stop: () => void;
}
/**
 * Build one conversation. Nothing is sent, and nothing is heard, until `listen`.
 *
 * Nothing is sent from here until a greeting arrives either, and nothing needs
 * to be: the host greets on every frame load, and a module that announced itself
 * first would be shouting at a window that may not be a host at all.
 */
export declare function connect(id: string, events?: HostEvents, options?: ConnectOptions): Connection;
//# sourceMappingURL=connect.d.ts.map