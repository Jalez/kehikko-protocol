import { type PlaceIssue } from '../door.js';
import { type AgentDeliverResult } from '../services.js';
import type { Reply } from './doors.js';
/**
 * 2.96.0. A conversation, however it started, proves which one it is with ONE key: the place token its
 * agent module issued for it to the host. Node-only, like the rest of `/serve`. Design notes:
 * docs/agent-messages.md#messaging-comes-from-the-host-2960.
 *
 * - A conversation the module LAUNCHES has the token on every Kehikot door's URL, as since 2.4.0.
 * - A conversation placed AFTERWARDS (the module's adopt command, `/kehikot-here`; one resumed in a
 *   terminal) is given the same kind of token in words: the module mints it (`freshPlaceToken`), files
 *   it in its record for that conversation, issues it to the host (`issuePlaceToken`), and puts
 *   `placeTokenLine(token)` in its answer. The conversation passes it once as `placeToken` on the
 *   kehikko door, which binds that connection to it.
 *
 * Unguessable (32 random bytes), one conversation's (the module's record maps it to one conversation
 * and the host to the module that issued it), and revocable: the host asks the module's record on
 * every call (`RECORDED_PLACE_PATH`), so a conversation the module disconnects or forgets is refused
 * at once. A session id is never a key.
 */
/** A new place token: 32 random bytes, URL-safe. */
export declare function freshPlaceToken(): string;
/**
 * Tell the host this module issued `token` for a conversation in a project (`POST /host/place`), so
 * the host knows whom to ask about it. True when a host on this machine took it. Never throws.
 */
export declare function issuePlaceToken(issue: PlaceIssue, options?: {
    env?: Record<string, string | undefined>;
    fetch?: typeof fetch;
    timeoutMs?: number;
}): Promise<boolean>;
/**
 * The answer at `agent.delivery`'s `deliver` route: read the host's knock (`agentDeliverParams`), hand
 * it to `deliver` (the module's own: wake its idle sessions in that project that have messages
 * waiting, and say how many), and answer `agentDeliverResult`. A knock grants nothing — what a session
 * may read is the host's to say when the module asks — so the route needs no ticket.
 */
export declare function deliveryReply(method: string, body: unknown, deliver: (project: string) => Promise<number | AgentDeliverResult>): Promise<Reply>;
