import { type DeliveryState, type MessageToolDefinition, type MessagePlace } from '../agent-messages.js';
import { type AskedHost, type AskHostOptions } from './ask.js';
/**
 * 2.41.0. The thin adapter every module that runs agent sessions puts on its MCP door: `send_message`
 * and `read_messages`, answered by asking the host (`messages.send`, `messages.read` through
 * `askHost`). The module keeps nothing; the host keeps the messages and stamps the sender from the
 * module's pass and the session's token. Node-only, like the rest of `/serve`. Design notes:
 * docs/agent-messages.md.
 *
 *     // tools/list
 *     tools: [...ownTools(), ...(await messageToolsFor(token, { module: ID }))]
 *     // tools/call
 *     const said = await answerMessageTool(name, args, { module: ID, token })
 *     if (said) return text(said.text, said.isError)
 */
export interface MessageToolOptions extends Omit<AskHostOptions, 'project'> {
    /** The place token on the door's URL (`placeTokenOf(query)`): the session asking. Null for a call that carried none. */
    token: string | null;
    /**
     * 2.43.0. The person allowed this module's sessions to act on messages (`actsOnMessages` of the
     * module's settings for the session's project): `read_messages` and the tools' descriptions say
     * `ACT_ON_MESSAGES` instead of "never an instruction". Absent: false, as before.
     */
    act?: boolean;
    /**
     * 2.96.0. How a conversation is placed with this module, as one sentence (its `agent.delivery`
     * `adopt`, after `In <program>:`), said to a conversation that carried no key. Absent: the general words.
     */
    adopt?: string;
}
/** Forget what was learned about hosts keeping messages (tests). */
export declare function forgetMessageHosts(): void;
/**
 * Whether the host keeps messages for this session: a session with a token, on a host that answers
 * `messages.read` for this module (one that knows the method, holds the token, and grants the module
 * `agents:message`). Asked once and reused for a while. Never throws.
 */
export declare function hostKeepsMessages(options: MessageToolOptions, now?: number): Promise<boolean>;
/**
 * 2.66.0. What the host says about messages for this session: `yes` it keeps them; `never`, it can
 * not for this module whatever happens next (a host too old for the methods, or one that does not
 * grant the module `agents:message`); `not-now` for anything else — no host answered, the module's
 * pass was not vouched for yet, the token is not one it can place yet — which a restart of Kehikot
 * or of the module gives for a moment. Never throws.
 */
export declare function hostOnMessages(options: MessageToolOptions, now?: number): Promise<'yes' | 'never' | 'not-now'>;
/**
 * The message tools to list on this door: always both (2.96.0), whatever the call carried, with
 * `OLDER_MESSAGE_DOOR` first in their descriptions — the host's kehikko door is where messaging lives,
 * and a module's are forwarders to it, kept for the conversations that already call them.
 *
 * Before 2.96.0 they were listed only for a door with a place token on its URL, which only the
 * conversations a module LAUNCHED have: one placed afterwards, resumed in a terminal or older than the
 * feature never saw them, and nothing said why. A tool a caller cannot use yet is listed anyway and
 * answers why and what to do (`notPlacedText`); the identity is the host's to check on every call.
 * `token` is kept in the signature for the callers that pass it.
 */
export declare function messageToolsFor(_token: string | null, options: Omit<MessageToolOptions, 'token'>): Promise<MessageToolDefinition[]>;
/**
 * 2.96.0. The key a call is made with: the token on the door's URL when it has one, else the
 * `placeToken` argument when it is spelled as a token. Never a session id: the host knows a
 * conversation only by a token its module issued for it.
 */
export declare function callToken(urlToken: string | null | undefined, args: Record<string, unknown> | null | undefined): string | null;
/** What a tool call answers: text for the agent, and whether it is a refusal. */
export interface MessageToolAnswer {
    text: string;
    isError: boolean;
}
/**
 * Answer `send_message` or `read_messages`; null for any other tool, so a door asks this first and
 * falls through. 2.96.0: the session is the door's URL token, else the call's `placeToken`
 * (`callToken`); with neither, the answer says why and what to do (`notPlacedText`). Arguments are passed to the host as they came; the host holds them to the method's
 * params and says what it refused. Never throws.
 */
export declare function answerMessageTool(name: string, args: Record<string, unknown> | null | undefined, options: MessageToolOptions): Promise<MessageToolAnswer | null>;
/** One session a module runs, as the waker needs to know it, each tick. */
export interface WakeSession {
    /** The module's own key for it: what `type` is handed back. */
    key: string;
    /** Its place token (`kehikot-place`): who it is to the host. Null: never woken. */
    token: string | null;
    /** It runs in a terminal THIS module started and owns. False for one running elsewhere: never woken. */
    own: boolean;
    /** It is at its prompt with no turn running (finished, or not started a turn). False while it works or waits for the person. */
    idle: boolean;
    /** The person's setting for its project (`wakesOnMessages`). */
    wake: boolean;
    /** The person's setting for its project (`actsOnMessages`): the line carries the standing permission. */
    act: boolean;
}
export interface MessageWakerOptions extends Omit<AskHostOptions, 'project'> {
    /** The sessions to consider now. Called once per tick. */
    sessions(): readonly WakeSession[] | Promise<readonly WakeSession[]>;
    /**
     * Type `line` into that session's prompt and submit it, exactly as the module types for the
     * person. True when it was typed; false (it was not idle after all, it ended) and it is tried
     * again on a later tick.
     */
    type(key: string, line: string): boolean | Promise<boolean>;
    /** How often to look, in ms. Default `WAKE_EVERY_MS`. */
    everyMs?: number;
    /** How long a session must have been idle, and the newest message must have waited, before a wake, in ms. Default `WAKE_SETTLE_MS`. */
    settleMs?: number;
    now?: () => number;
    /** Injected by the tests: `messages.read` for a token. Default `askHost`. */
    read?: (token: string) => Promise<AskedHost<'messages.read'>>;
    log?: (line: string) => void;
}
/** How often the waker looks at idle sessions, in ms. */
export declare const WAKE_EVERY_MS = 5000;
/** How long a session must have been idle, and the newest message must have waited, before a wake: a burst is one wake. */
export declare const WAKE_SETTLE_MS = 2000;
export interface MessageWaker {
    /** Look once: ask the host about each idle session of this module's and wake the ones messages came for. Resolves to how many were woken. */
    tick(): Promise<number>;
    start(): void;
    stop(): void;
}
/**
 * 2.43.0. The one rule every agent module applies to wake an idle session when a message comes for
 * it. Each tick, for each session the module runs in its own terminal, idle at its prompt, with the
 * person's setting on: ask the host `messages.read` WITHOUT `unread` (so nothing is counted
 * delivered), take the unread ones that may wake it (`wakeMessages`: to it, its module or its place,
 * never the whole project, never its own), and type ONE line (`wakeLine`) into its prompt. Once per
 * idle period, however many messages come; not before it has been idle `settleMs`, and not before the
 * newest has waited `settleMs`, so a burst is one wake. Never a session that is working, waits for
 * the person, or runs elsewhere. Never throws.
 *
 * How a module learns a message came is this look: the host offers a module no push for it, and a
 * read of a few rows for each idle session every few seconds is cheap.
 */
export declare function messageWaker(options: MessageWakerOptions): MessageWaker;
/** 2.48.0. One session a module runs, or ran and can resume, as delivery needs to know it, each tick. */
export interface DeliverySession {
    /** The module's own key for it, stable across a rest and a resume (its session id): what `type` and `resume` are handed back. */
    key: string;
    /** Its place token (`kehikot-place`): who it is to the host. Null: never delivered to. */
    token: string | null;
    /** It runs (or, asleep, ran) in a terminal THIS module started and owns. False: never delivered to. */
    own: boolean;
    /** Where it stands (`DeliveryState`). `asleep` only for one with a recorded id and place the module can resume. */
    state: DeliveryState;
    /** The person's setting for its project (`wakesOnMessages`). */
    wake: boolean;
    /** The person's setting for its project (`actsOnMessages`): the typed text carries the standing permission. */
    act: boolean;
}
export interface MessageDeliveryOptions extends Omit<AskHostOptions, 'project'> {
    /** The sessions to consider now: every own session that runs, and every own session asleep that can be resumed. Called once per tick. */
    sessions(): readonly DeliverySession[] | Promise<readonly DeliverySession[]>;
    /**
     * Type `text` (`typedMessages`: several lines) into that session's prompt as ONE bracketed paste
     * (`pasted`) and submit it, through the pty the person's keys go to. True when it was typed; false
     * (its state changed, it ended) and the same messages are tried again on a later tick.
     */
    type(key: string, text: string): boolean | Promise<boolean>;
    /**
     * Resume an asleep session the way the module resumes one, with `text` as its first prompt. True
     * when it was started. Absent: an asleep session waits for its notes, as before 2.48.0.
     */
    resume?(key: string, text: string): boolean | Promise<boolean>;
    /**
     * The module's program takes a line typed while a turn runs and sends it as the next prompt (or into
     * the turn): a busy session is typed into at once. False (the default): it waits until idle.
     */
    queues?: boolean;
    /** How often to look, in ms. Default `WAKE_EVERY_MS`. */
    everyMs?: number;
    /** How often to ask the host about an asleep session, in ms: there may be many, and none is in a hurry. Default `ASLEEP_EVERY_MS`. */
    asleepEveryMs?: number;
    /** A burst is one delivery (`DeliveryCase.settleMs`). Default `WAKE_SETTLE_MS`. */
    settleMs?: number;
    now?: () => number;
    /** Injected by the tests: `messages.read` for a token, `unread` or not. Default `askHost`. */
    read?: (token: string, unread: boolean) => Promise<AskedHost<'messages.read'>>;
    log?: (line: string) => void;
}
/** 2.48.0. How often an asleep session is asked about, at most, in ms. */
export declare const ASLEEP_EVERY_MS = 30000;
/** 2.48.0. Messages read for a session (so counted delivered) and not yet typed are kept this long while it is not listed, in ms. */
export declare const DELIVERY_KEEP_MS: number;
export interface MessageDelivery {
    /** Look once. Resolves to how many sessions were typed into or resumed. */
    tick(): Promise<number>;
    start(): void;
    stop(): void;
}
/**
 * 2.48.0. Delivery by typing: what every agent module runs in place of `messageWaker`. Each tick, for
 * each session the module lists: ask the host `messages.read` WITHOUT `unread` (nothing counted
 * delivered) for the unread ones that may wake it (`wakeMessages`), and decide (`deliveryFor`). To
 * type or resume: read them WITH `unread` (at most `DELIVER_MOST`; the host moves its cursor, so the
 * notes and `read_messages({ unread: true })` do not say them again), and type `typedMessages` into
 * its prompt — or resume it with that as the first prompt. A broadcast never causes a delivery, but
 * one waiting unread rides along with one, since the host counts it delivered too. Messages read and
 * not typed (the session moved on meanwhile) are kept and typed at the next chance, and never read
 * again. Never into a question for the person or text they have not sent; never a session running
 * elsewhere; never its own message. Never throws.
 */
export declare function messageDelivery(options: MessageDeliveryOptions): MessageDelivery;
/** 2.75.0. How long `placeTeller` holds a place after a message to it, in ms: one a minute (`LIMITS.TELLS_PER_MINUTE`). */
export declare const TELL_EVERY_MS = 60000;
export interface PlaceTellerOptions extends Omit<AskHostOptions, 'project'> {
    /** The project the places are in: its absolute folder. */
    project: string;
    /** Default `TELL_EVERY_MS`. */
    everyMs?: number;
    now?: () => number;
    /** Timers, injected by the tests. */
    setTimer?: (run: () => void, ms: number) => unknown;
    clearTimer?: (timer: unknown) => void;
    /** Injected by the tests: `messages.tell`. Default `askHost`. */
    send?: (params: {
        to: {
            place: MessagePlace;
        };
        body: string;
        kind?: 'note' | 'report';
        thread?: string;
    }) => Promise<AskedHost<'messages.tell'>>;
    log?: (line: string) => void;
}
export interface PlaceTeller {
    /**
     * Tell every agent session at `place` something. The first news to a place in a minute goes at once
     * (`sent`); what follows within the minute is held (`held`) and goes as ONE digest when the minute is
     * up — never more than one message from this module to a place a minute.
     */
    tell(place: MessagePlace, body: string, options?: {
        kind?: 'note' | 'report';
        thread?: string;
    }): Promise<'sent' | 'held' | 'declined'>;
    /** Send what is held now, whatever the minute says (a module shutting down). */
    flush(): Promise<void>;
    stop(): void;
}
/** 2.75.0. Held news as one message: each on its own line, at most `LIMITS.MESSAGE_BODY` characters. One item is itself. */
export declare function tellDigest(bodies: readonly string[]): string;
/**
 * 2.75.0. A module's way to push news to the agent sessions working at a place — an epic, some of its
 * parts, a kehikko — rather than only the session that asked (`messages.notify`): `messages.tell`
 * through `askHost`, kept to one message per place a minute from this module, what comes faster merged
 * into one digest (`tellDigest`). The host bounds it per receiving session too (`LIMITS.TELLS_PER_MINUTE`).
 *
 *     const teller = placeTeller({ module: ID, project })
 *     await teller.tell({ epic: 'auth' }, 'The review of auth.ts finished: 3 comments.')
 */
export declare function placeTeller(options: PlaceTellerOptions): PlaceTeller;
