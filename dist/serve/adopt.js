import { randomBytes } from 'node:crypto';
import { placeIssueSchema } from '../door.js';
import { agentDeliverParams, agentDeliverResult } from '../services.js';
import { frameOrigins } from './origins.js';
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
export function freshPlaceToken() {
    return randomBytes(32).toString('base64url');
}
/**
 * Tell the host this module issued `token` for a conversation in a project (`POST /host/place`), so
 * the host knows whom to ask about it. True when a host on this machine took it. Never throws.
 */
export async function issuePlaceToken(issue, options = {}) {
    const read = placeIssueSchema.safeParse(issue);
    if (!read.success)
        return false;
    for (const origin of frameOrigins(options.env ?? process.env)) {
        let url;
        try {
            url = new URL('/host/place', origin);
        }
        catch {
            continue;
        }
        if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
            continue;
        const control = new AbortController();
        const timer = setTimeout(() => control.abort(), options.timeoutMs ?? 1500);
        try {
            const response = await (options.fetch ?? fetch)(url, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(read.data),
                signal: control.signal,
            });
            if (!response.ok)
                continue;
            const said = (await response.json().catch(() => null));
            if (said?.ok === true && said.token === read.data.token)
                return true;
        }
        catch {
            /* Not this origin. */
        }
        finally {
            clearTimeout(timer);
        }
    }
    return false;
}
/**
 * The answer at `agent.delivery`'s `deliver` route: read the host's knock (`agentDeliverParams`), hand
 * it to `deliver` (the module's own: wake its idle sessions in that project that have messages
 * waiting, and say how many), and answer `agentDeliverResult`. A knock grants nothing — what a session
 * may read is the host's to say when the module asks — so the route needs no ticket.
 */
export async function deliveryReply(method, body, deliver) {
    if (method !== 'POST')
        return { status: 405, body: { ok: false, error: 'this door takes POST' } };
    const read = agentDeliverParams.safeParse(body);
    if (!read.success)
        return { status: 400, body: { ok: false, error: 'a knock is { project }: the project folder whose messages changed' } };
    try {
        const done = await deliver(read.data.project);
        const result = typeof done === 'number' ? { outcome: done > 0 ? 'delivered' : 'none', delivered: done } : done;
        return { status: 200, body: agentDeliverResult.parse(result) };
    }
    catch (error) {
        return { status: 200, body: agentDeliverResult.parse({ outcome: 'later', why: (error instanceof Error ? error.message : String(error)).slice(0, 200) }) };
    }
}
