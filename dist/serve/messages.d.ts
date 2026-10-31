import { type MessageToolDefinition } from '../agent-messages.js';
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
 * The message tools to list on this door for this session: `messageTools()` when the host keeps
 * messages for it, and none otherwise — no token (a session nothing started from a place), a host
 * before 2.41.0, a module whose manifest does not declare `agents:message`.
 */
export declare function messageToolsFor(token: string | null, options: Omit<MessageToolOptions, 'token'>): Promise<MessageToolDefinition[]>;
/** What a tool call answers: text for the agent, and whether it is a refusal. */
export interface MessageToolAnswer {
    text: string;
    isError: boolean;
}
/**
 * Answer `send_message` or `read_messages`; null for any other tool, so a door asks this first and
 * falls through. Arguments are passed to the host as they came; the host holds them to the method's
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
