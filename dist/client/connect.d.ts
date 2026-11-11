import { type ActivityItem } from '../activity.js';
import { type FilterGroup, type FooterItemInput, type Goto, type HeaderItemInput, type ModuleContext, type ModuleEvent, type Press, type ResponseFailureReason } from '../wire.js';
import type { Covered } from '../reveal.js';
import { type MessageSource } from './mailbox.js';
import { type PageFindOptions } from './find.js';
import type { FindCount, FindDirection, FindOptions } from '../find.js';
export { mayGreet, pageOrigins } from './greet.js';
/**
 * The bridge: one conversation with one window, in the shape this package's schemas define.
 * A greeting is taken from an origin the page may be framed by (`mayGreet`); after it, identity is
 * the greeting's window handle (`MessageEvent.source`), never the origin. Everything the host sends
 * is parsed with `hostMessageSchema`. A convenience — a module may hand-roll it all.
 * Design notes: docs/client.md.
 */
/**
 * Why a question came back without an answer: the protocol's three reasons, plus `silent` for a
 * timeout or a host that is not there.
 */
export type Refusal = {
    reason: ResponseFailureReason | 'silent';
    error: string;
    /**
     * 2.22.0. `host-too-old`: the host does not know the method and this package does, so the host is
     * older than the method (`since`, from this package's `SINCE`). Read it with `hostTooOld`.
     */
    declined?: 'host-too-old';
    /** 2.22.0. The version that has the method, beside `declined`; null when neither side can say. */
    since?: string | null;
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
    /**
     * 2.38.0. Whether this host draws the module's declared footer, or `null` when it did not say: a
     * host before 2.38.0, which does not. Only `true` means "declare it and draw none of your own".
     */
    footer: boolean | null;
    /**
     * 2.40.0. The acts this host carries out itself for a run in the person's click (`copy`, `open`), or
     * `null` from a host before 2.40.0, which carries out none. Give a run `copy` or `open` only when it
     * names the act; otherwise do the act in your own page.
     */
    carries: readonly string[] | null;
    /**
     * 2.46.0. The footer item kinds this host draws, or `null` from a host before 2.46.0, which draws
     * the 2.38.0 kinds and no field. `footerDraws(facts, 'input')` is the rule.
     */
    footerKinds: readonly string[] | null;
    /**
     * 2.69.0. Whether this host draws a find bar for this page, or `null` from a host before 2.69.0,
     * which does not. When `true`, `connect` catches ⌘F inside the page and answers the bar.
     */
    find?: boolean | null;
}
/**
 * 2.69.0. What an `onFind` listener says: the count (`{ total, current }`, `current` 1-based and 0
 * when there are none), `'unsupported'` for "this page cannot search what it shows", `'default'` to
 * leave this search to the client's own (`pageFind`), or nothing when the page will say the count
 * itself with `findResult` (a search that finishes later). A promise of any of them is waited for.
 */
export type FindAnswer = FindCount | 'unsupported' | 'default' | void;
/** 2.69.0. What an `onFind` listener is told beside the query. */
export interface FindAsk extends FindOptions {
    direction: FindDirection;
}
/** 2.69.0. What `connect` reads of a key: enough to tell ⌘F and ⌘G, and to leave a key a page took. */
export interface KeyEventLike {
    key: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    defaultPrevented?: boolean;
    preventDefault: () => void;
}
/** 2.69.0. Where `connect` hears ⌘F: a window, or anything shaped like one. */
export interface KeyTarget {
    addEventListener(type: 'keydown', listener: (event: KeyEventLike) => void): void;
    removeEventListener(type: 'keydown', listener: (event: KeyEventLike) => void): void;
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
     * cannot take is refused before this is called. 2.38.0: `place` is `'footer'` for an item of the
     * page's footer (declared with `footer`), absent for one of its header. 2.46.0: a footer field
     * submitted with Enter arrives here too, with `text` (what was typed). Do it, declare the header again, and return
     * nothing — or return the sentence saying why not. `connect` answers the host exactly once.
     */
    onPress?: (press: Pick<Press, 'item' | 'value' | 'place' | 'carried' | 'text'>) => PressAnswer | Promise<PressAnswer>;
    /**
     * The person opened one of this module's Inbox items (2.35.0): pressed it in the Inbox, on a
     * toast or with Next, and the host has gone to its place. `item` is the id the module reported.
     * Show that thing and count it as seen; nothing is answered. What the host shows next is still
     * the module's next `activity` list. See `openedSchema`.
     */
    onOpened?: (opened: {
        item: string;
    }) => void;
    /**
     * How much of this page's frame the host's revealed header and footer cover now (2.42.0), in CSS
     * pixels from the top and the bottom; `{ top: 0, bottom: 0 }` when they hid. Only for a module whose
     * manifest says `reveal: 'over'`. The frame keeps its size: move what must stay readable out from
     * under the rows (`keepInView`), never refit. `hostStore` and `useHost` also keep it as `covered`.
     */
    onCovered?: (covered: Covered) => void;
    /**
     * Whether this page is on screen now (2.45.0): `false` when the host hid it (the person left for a
     * kehikko it is not on; the page keeps running), `true` when it is shown again — the person
     * arriving back — and once after every greeting. A hidden page is not being looked at: do not count
     * anything as seen by the person while it is, and count what is in front of them when it is shown.
     * A host before 2.45.0 never calls it. `hostStore` and `useHost` also keep it as `visible`.
     */
    onVisible?: (visible: boolean) => void;
    /**
     * 2.79.0. The person's Inbox, for a module whose manifest declares `inbox:person`: `changed` — read
     * it again (`inbox.read`); `next` — the person pressed the host's shortcut for the next thing that
     * needs them, `next` names it (null: nothing does) and the page goes to it with `inbox.open`.
     * A host before 2.79.0 never calls it.
     */
    onInbox?: (signal: {
        kind: 'changed' | 'next';
        rev: number;
        next: {
            module: string;
            id: string;
        } | null;
    }) => void;
    /**
     * 2.69.0. The host's find bar asks this page to search what it shows: `query`, with `ask`'s
     * options and `direction` — `first` (search anew; go to the first match at or after what is on
     * screen), `next`/`prev` (move, wrapping), or `close` (clear every mark; the answer is not read).
     * Give it only when the page's text is not in the DOM — a terminal's buffer, a canvas, a
     * virtualised list, an editor with its own search — and return the count (`FindAnswer`). Without
     * it, the client searches the page's visible text itself (`pageFind`). When the count changes by
     * itself (new output while the bar is open), say it with `findResult`.
     */
    onFind?: (query: string, ask: FindAsk) => FindAnswer | Promise<FindAnswer>;
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
    /**
     * 2.49.0. Where the person's presses are heard, to tell a host that asked (`hello.pointer`):
     * this page's `window` by default; injectable so tests need no browser. `false` sends none.
     */
    pointerTarget?: PointerTarget | false;
    /**
     * 2.69.0. Where ⌘F and ⌘G are heard, to open the host's find bar (`hello.find`): this page's
     * `window` by default. `false` leaves the keys alone — for a page whose editor binds its own find;
     * a page can equally take the key itself (`preventDefault` in its own handler: a key a page took
     * is left alone). The bar still opens from the host and still reaches `onFind`.
     */
    findKeys?: KeyTarget | false;
    /**
     * 2.69.0. The client's own search of the page's text (`pageFind`), used when there is no
     * `onFind` or it answers `'default'`: where it searches and how. `false` has none, so a page with
     * no `onFind` answers that it cannot be searched.
     */
    findIn?: PageFindOptions | false;
    /** 2.69.0. Whether ⌘ (true) or Ctrl (false) is the find key. Found from the platform by default. */
    mac?: boolean;
    /**
     * 2.70.0. Keep the host's cover up until the page calls `ready()`: `ready` goes with `hold: true`, and
     * `kehikot.drawn` follows when the page is drawn — or by itself after `HOLD_COVER_MS` (a number here
     * is that wait instead). On by default, so a page draws no "Reading…" of its own; `false` says the
     * page is ready the moment it is greeted, as before 2.70.0. A host before 2.70.0 ignores the hold.
     */
    holdCover?: boolean | number;
    /**
     * 2.70.0. `false` keeps `rowsAdvice` off the console. On by default: each sentence once per page,
     * when a header or footer is declared, and "no footer" a moment after the last declaration.
     */
    rowsAdvice?: boolean;
}
/** 2.70.0. How long after the last header or footer declaration the client says a missing footer, in ms. */
export declare const ROWS_ADVICE_AFTER_MS = 1500;
/** What `connect` reads of a press: which button, whether it is the primary pointer, and where (2.50.1). */
export interface PointerEventLike {
    button?: number;
    isPrimary?: boolean;
    clientX?: number;
    clientY?: number;
    /** `mouse`, `pen` or `touch`, on a pointer event. */
    pointerType?: string;
}
/** What `connect` listens on for presses: a window, or anything shaped like one. */
export interface PointerTarget {
    addEventListener(type: string, listener: (event: PointerEventLike) => void, options?: {
        capture?: boolean;
        passive?: boolean;
    }): void;
    removeEventListener(type: string, listener: (event: PointerEventLike) => void, options?: {
        capture?: boolean;
    }): void;
}
/**
 * 2.50.1. How far, in CSS pixels, a press may wander and still be a press held in place. Past it the
 * press is a drag — a selection, a scroll, a move — and is told as `cancel`: a drag is not a long
 * press. Under it a hand's tremor on a trackpad is still holding still.
 */
export declare const POINTER_SLOP_PX = 8;
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
     * 2.38.0. Say what this page's footer shows and offers, so the host can draw it as one row at the
     * bottom of the container: status text, meters, and the header's kinds of item. The whole list
     * every time; `[]` withdraws it. Remembered and replayed on every greeting, like `header`. Presses
     * reach `onPress` with `place: 'footer'`. Declare it only when the greeting said the host draws it
     * (`HostFacts.footer === true`); otherwise draw the footer yourself. See docs/footer.md.
     */
    footer: (items: FooterItemInput[]) => void;
    /**
     * Say what this page's things are doing now (`activity.set`, 1.5.0): the COMPLETE list, replacing
     * what was said before; `[]` says nothing is going on. Fire and forget. A list identical to the one
     * last taken is not sent again, the last list is re-sent after every greeting, and nothing is sent
     * to a host whose greeting said it does not answer `activity.set` (the module simply gets no dots).
     * A list that does not parse is dropped here, not sent. See docs/activity.md.
     *
     * 1.8.0: items may carry `project`. Until the host has answered `projects: true`, only the items of the
     * project it has open (and those with no `project`) are sent, without the field; after, the whole list.
     * 2.1.0: an item may also carry `projectId`, beside `project`. Judging "the open project", the id
     * decides where the item and the host both have one, else the path; both fields are dropped then.
     */
    activity: (items: ActivityItem[]) => void;
    /**
     * 2.69.0. Say what the open search comes to now, from an `onFind` that answered nothing at once or
     * whose count changed by itself (new output arrived). Dropped while no search is open.
     */
    findResult: (count: FindCount | 'unsupported') => void;
    /**
     * 2.70.0. Say the page is drawn: the host's cover, held since the greeting (`holdCover`), comes off.
     * Call it once what the page shows has been read and drawn; calling it again, or with `holdCover:
     * false`, does nothing. A greeting after it is answered without a hold.
     */
    ready: () => void;
    /**
     * 2.70.0. Hear presses on another window or element too — a nested frame the page owns — and tell
     * the host of them as `kehikot.pointer`, as presses on the page itself are. Returns the function
     * that stops hearing it. `relayPointer` is the way to call it for an iframe.
     */
    pointerFrom: (target: PointerTarget) => () => void;
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
