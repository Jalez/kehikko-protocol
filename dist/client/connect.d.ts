import { type ActivityItem } from '../activity.js';
import { type FilterGroup, type Goto, type HeaderItemInput, type ModuleContext, type ModuleEvent, type Press, type ResponseFailureReason } from '../wire.js';
import { type MessageSource } from './mailbox.js';
/**
 * The bridge: one conversation with one window, in the shape this package's schemas define.
 * A greeting is taken from an origin the page may be framed by (`mayGreet`); after it, identity is
 * the greeting's window handle (`MessageEvent.source`), never the origin. Everything the host sends
 * is parsed with `hostMessageSchema`. A convenience — a module may hand-roll it all.
 * Design notes: docs/client.md.
 */
/**
 * The origins this page was told it may be framed by: the island its server printed
 * (`ORIGINS_ELEMENT`, the list sent as `frame-ancestors`), or `null` for a document that carries
 * none — one this package's doors did not serve. Read on every greeting; it is one element.
 */
export declare function pageOrigins(): string[] | null;
/**
 * Whether a greeting may be answered: whether the window that sent it is one this page may be
 * framed by. `origins` is who that is; `null` is a page that was never told, which answers as it
 * always has. Otherwise a greeting counts from an origin on the list, from the page's own origin,
 * from the page's own window, and with no origin on it at all — an event the page's own script
 * made, since a message from another window always carries one. Pure.
 */
export declare function mayGreet(greeting: {
    origin?: string | null;
    source?: unknown;
}, origins: readonly string[] | null, self?: {
    window?: unknown;
    origin?: string | null;
}): boolean;
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
/**
 * How long, in ms, an `onPress` listener has to say whether it took a press before the backstop
 * answers "not taken" for it. Long enough to ask the page's own server to start something; a run
 * that takes longer answers at once and reports through its header.
 */
export declare const PRESS_BACKSTOP_MS = 2000;
/**
 * What an `onPress` listener says about one press: nothing or `true` for "taken", a sentence for
 * "not taken, and this is why", `false` for "not taken". A promise of any of them is waited for.
 */
export type PressAnswer = void | boolean | string;
/** What a question asked before any greeting is refused with. The React hook says the same between mounts. */
export declare const NOBODY_TO_ASK = "Nothing has greeted this page, so there is nobody to ask.";
/**
 * What a greeting says about the host itself (1.4.0). Each is `null` when the host did not say: a
 * host before 1.4.0, which is "unknown", not "no".
 */
export interface HostFacts {
    /** The methods this host will answer for this module, or `null`. `answers?.includes('parts.set')`. */
    answers: readonly string[] | null;
    /** Whether this host draws the module's header in its own menus, or `null`. */
    header: boolean | null;
}
export interface HostEvents {
    /**
     * The greeting arrived, with its context and whatever this module last asked the host to keep.
     * `state` is `null` when the host keeps nothing: a first run, a host that does not answer
     * `state.set`, or a module that has never written any.
     */
    onHello?: (context: ModuleContext, state: string | null, host?: HostFacts) => void;
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
    /**
     * One of this page's header items was pressed, by a person in the host's menus or by an agent
     * through the host: `item` is its id, `value` the option chosen (switch, go) or the state wanted
     * (toggle). Only reaches a page that declared the item with `header`; a press the last header
     * cannot take is refused before this is called. Do it, declare the header again, and return
     * nothing — or return the sentence saying why not. `connect` answers the host exactly once.
     */
    onPress?: (press: Pick<Press, 'item' | 'value'>) => PressAnswer | Promise<PressAnswer>;
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
    /** Override `PRESS_BACKSTOP_MS`. */
    pressBackstop?: number;
    /**
     * The origins a greeting is taken from, instead of the ones the page's server printed
     * (`pageOrigins`): for a page that is not served by this package's doors.
     */
    origins?: readonly string[];
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
    /**
     * Say which switches, toggles, jumps and runs this page has, so the host can draw them in the
     * container's menus. The whole list every time; `[]` withdraws it. Fire and forget, remembered
     * and replayed on every greeting. Call it again whenever anything in it changes, including after
     * `onPress`: the host draws what was last declared and holds no state of its own.
     */
    header: (items: HeaderItemInput[]) => void;
    /**
     * Say what this page's things are doing now (`activity.set`, 1.5.0): the COMPLETE list, replacing
     * what was said before; `[]` says nothing is going on. Fire and forget. A list identical to the one
     * last taken is not sent again, the last list is re-sent after every greeting, and nothing is sent
     * to a host whose greeting said it does not answer `activity.set` (the module simply gets no dots).
     * A list that does not parse is dropped here, not sent. See docs/activity.md.
     *
     * 1.8.0: items may carry `project`. Until the host has answered `projects: true`, only the items of the
     * project it has open (and those with no `project`) are sent, without the field; after, the whole list.
     */
    activity: (items: ActivityItem[]) => void;
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
