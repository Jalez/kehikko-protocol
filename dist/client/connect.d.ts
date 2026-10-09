import { type FilterGroup, type Goto, type ModuleContext, type ModuleEvent, type ResponseFailureReason } from '../wire.js';
import { type MessageSource } from './mailbox.js';
/**
 * The bridge: one conversation with one window, in the shape this package's schemas define.
 * Identity is the greeting's window handle (`MessageEvent.source`), never the origin; everything
 * the host sends is parsed with `hostMessageSchema`. A convenience — a module may hand-roll it all.
 * Design notes: docs/client.md.
 */
/**
 * Why a question came back without an answer: the protocol's three reasons, plus `silent` for a
 * timeout or a host that is not there.
 */
export type Refusal = {
    reason: ResponseFailureReason | 'silent';
    error: string;
};
/** A refusal, as a thrown thing. Every rejection from `request` is one of these, always. */
export declare class HostRefused extends Error {
    readonly refusal: Refusal;
    constructor(refusal: Refusal);
}
/** How long to wait for one answer, in ms, before the question is refused as `silent`. */
export declare const ANSWER_WITHIN_MS = 12000;
/**
 * How long to wait, in ms, for an answer that waits on a PERSON (`projects.pick`): five minutes.
 * Passed per question as `within`; never the connection's default.
 */
export declare const PERSON_ANSWERS_WITHIN_MS: number;
/**
 * How long, in ms, a `goto` listener has before the backstop answers `false` for it. Far shorter
 * than the host's own timeout.
 */
export declare const GOTO_BACKSTOP_MS = 500;
/** What a question asked before any greeting is refused with. The React hook says the same between mounts. */
export declare const NOBODY_TO_ASK = "Nothing has greeted this page, so there is nobody to ask.";
export interface HostEvents {
    /**
     * The greeting arrived, with its context and whatever this module last asked the host to keep.
     * `state` is `null` when the host keeps nothing: a first run, a host that does not answer
     * `state.set`, or a module that has never written any.
     */
    onHello?: (context: ModuleContext, state: string | null) => void;
    /** The reader switched epics, or this tab was shown again. */
    onContext?: (context: ModuleContext) => void;
    /**
     * "Go to this reference." The host is waiting on `answer`, which may be called later than the
     * listener returns. `connect` guarantees exactly one answer: it says `false` itself after
     * `GOTO_BACKSTOP_MS`, when the listener throws, or when there is no listener.
     */
    onGoto?: (goto: Goto, answer: (found: boolean, why?: string) => void) => void;
    /**
     * Something another module emitted, carried here by the host. Handed over whole: `extension`
     * says which format `payload` is in; `from`, `at` and `kehikko` are what a receiver filters on.
     */
    onEvent?: (event: ModuleEvent) => void;
    /**
     * The host's clear control was pressed, twice: delete what this page is showing, applying the
     * same narrowing the render did. Only reaches a module that announced `clearable`. No parameters
     * and no reply — call `clearable` again when done, with the new label or `null`.
     */
    onClear?: () => void;
    /**
     * The host's refresh control was pressed, or this container's interval elapsed: read your
     * material again. Only reaches a module that announced `refreshable`; it is not told which of the
     * two it was. No reply — call `refreshable` with `busy: true` going in and with `at` coming out.
     */
    onRefresh?: () => void;
}
/**
 * What a single question may say about itself, beyond its params. A ceiling on waiting, never a
 * promise about answering; nothing here reaches the host.
 */
export interface AskOptions {
    /** Milliseconds to wait for this one answer. Defaults to the connection's own. */
    within?: number;
}
export interface ConnectOptions {
    /** What to listen to. The `mailbox` by default; injectable so tests need no browser. */
    source?: MessageSource;
    /** Override `ANSWER_WITHIN_MS`, for a module whose one question is genuinely slower. */
    answerWithin?: number;
    /** Override `GOTO_BACKSTOP_MS`. Shorten it freely; lengthening it past the host's own timeout does nothing. */
    gotoBackstop?: number;
}
export interface Connection {
    /**
     * Start hearing messages. Call it AFTER the connection has been stored: the mailbox replays
     * synchronously inside this call, so `onHello` can fire before it returns. Idempotent.
     */
    listen: () => Connection;
    /**
     * Ask one question. Rejects with `HostRefused` — never with a bare string. `options.within`
     * overrides `ANSWER_WITHIN_MS` for this call and no other.
     */
    request: (method: string, params?: Record<string, unknown>, options?: AskOptions) => Promise<unknown>;
    /** Say how tall we would like to be. Fire and forget, by design. */
    resize: (height: number) => void;
    /**
     * Say what this page can be narrowed by, so the host can draw the control. Fire and forget; the
     * choice comes back in a `kehikot.context` with `filters` in it. The last offer is remembered and
     * re-sent after `ready` on every greeting, so one call at mount is correct across reloads.
     */
    filters: (groups: FilterGroup[]) => void;
    /**
     * Say that what this page is showing can be cleared, and what to call it; `null` withdraws the
     * control. Fire and forget, remembered and replayed on every greeting. Send it whenever the words
     * change, including after `onClear`. Add no confirmation of your own: the two-press arm is the host's.
     */
    clearable: (label: string | null) => void;
    /**
     * Say that this page can read its material again, and when it last did. Fire and forget,
     * remembered and replayed on every greeting. Send it whenever a field changes. `at` is the
     * module's own fact, `null` for "I cannot say"; `can: false` withdraws the control.
     */
    refreshable: (state: {
        can?: boolean;
        at?: string | null;
        busy?: boolean;
    }) => void;
    /** Whether anything has greeted us yet. */
    greeted: () => boolean;
    /** Stop listening. Every question still waiting is refused rather than left hanging. */
    stop: () => void;
}
/**
 * Build one conversation. Nothing is sent, and nothing is heard, until `listen`; nothing is sent
 * before a greeting arrives either.
 */
export declare function connect(id: string, events?: HostEvents, options?: ConnectOptions): Connection;
