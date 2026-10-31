import { type MessageToolDefinition } from '../agent-messages.js';
import { type AskHostOptions } from './ask.js';
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
