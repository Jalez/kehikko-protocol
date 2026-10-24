import { randomBytes } from 'node:crypto';
import { LIMITS } from '../limits.js';
import { methodResults } from '../methods.js';
import { SERVER_ASK_PATH, SERVER_PASS, SERVER_PASS_PATH, serverAskResult, } from '../server-ask.js';
import { frameOrigins } from './origins.js';
/**
 * A module's server asking the host (2.19.0): `askHost`, and the passes it mints for each question,
 * which the doors answer for at `SERVER_PASS_PATH`. Node-only, like the rest of `/serve`. The shapes
 * are `server-ask.ts`; design notes: docs/server-ask.md.
 */
/** Passes minted by this process and not yet spent, with when each stops being good. */
const minted = new Map();
function sweep(now) {
    for (const [pass, until] of minted)
        if (until <= now)
            minted.delete(pass);
}
/** A new pass for one question, good once for `LIMITS.SERVER_PASS_MS`. `askHost` mints its own. */
export function mintServerPass(now = Date.now()) {
    sweep(now);
    const pass = randomBytes(24).toString('base64url');
    minted.set(pass, now + LIMITS.SERVER_PASS_MS);
    return pass;
}
/** Whether this process minted `pass` and it is still good; spent by asking, so a second ask says no. */
export function spendServerPass(pass, now = Date.now()) {
    if (typeof pass !== 'string' || !SERVER_PASS.test(pass))
        return false;
    const until = minted.get(pass);
    minted.delete(pass);
    return until !== undefined && until > now;
}
/**
 * The doors' answer at `SERVER_PASS_PATH`, or null for any other path. Mounted by `doorsFetch` and
 * `doorsHandler` for every module, before its own `answer`.
 */
export function serverPassReply(method, path, query) {
    if (path !== SERVER_PASS_PATH)
        return null;
    if (method !== 'GET')
        return { status: 405, body: { ok: false, error: `${SERVER_PASS_PATH} answers GET.` } };
    return { status: 200, body: { ok: true, minted: spendServerPass(query.get('pass')) } };
}
/** The origins a host may be asked on: `KEHIKOT_ORIGINS` and its fallbacks, kept to `http(s)` loopback. */
function hostOrigins(env) {
    const out = [];
    for (const origin of frameOrigins(env)) {
        try {
            const url = new URL(origin);
            if ((url.protocol === 'http:' || url.protocol === 'https:') && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
                out.push(url.origin);
        }
        catch {
            /* Not a URL: nobody to ask there. */
        }
    }
    return [...new Set(out)];
}
/** The URLs `askHost` posts to, in order. Pure; exported for tests. */
export function hostAskUrls(env = process.env) {
    return hostOrigins(env).map((origin) => `${origin}${SERVER_ASK_PATH}`);
}
/** What a module's server is told when no host on this machine answered. */
export const NO_HOST_TO_ASK = 'No Kehikot host answered, so there is nothing to read: Kehikot is not running, or not on the origins this module was given.';
/**
 * Ask the host one question from a module's server, and get what its page would get:
 *
 *     const read = await askHost('tracker.get', { epic, parts: true }, { module: ID, project })
 *     if (read.ok) read.data.rows
 *
 * Asks each origin of `KEHIKOT_ORIGINS` in turn, with a pass minted for that ask, and takes the first
 * that answers it; a host that does not hold the project or does not know the module is passed over
 * for the next. Never throws.
 */
export async function askHost(method, params, options) {
    const asked = options.fetch ?? fetch;
    let last = null;
    for (const url of hostAskUrls(options.env ?? process.env)) {
        const pass = mintServerPass();
        const control = new AbortController();
        const timer = setTimeout(() => control.abort(), options.timeoutMs ?? LIMITS.SERVER_ASK_MS);
        try {
            const response = await asked(url, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ module: options.module, pass, project: options.project, method, params }),
                signal: control.signal,
            });
            const read = serverAskResult.safeParse(await response.json());
            if (!read.success)
                continue;
            if (!read.data.ok) {
                last = { ok: false, why: read.data.error, reason: read.data.reason, ...(read.data.refused ? { refused: read.data.refused } : {}) };
                /* Another host on this machine may hold the project, or have the module registered. */
                if (read.data.refused === 'project' || read.data.refused === 'module' || read.data.reason === 'unknown-module')
                    continue;
                return last;
            }
            const schema = methodResults[method];
            const data = schema ? schema.safeParse(read.data.data) : { success: true, data: read.data.data };
            if (!data.success)
                return { ok: false, why: `The host answered ${method} with something of another shape.`, reason: 'failed' };
            return { ok: true, data: data.data };
        }
        catch {
            /* Not this origin. */
        }
        finally {
            clearTimeout(timer);
            minted.delete(pass);
        }
    }
    return last ?? { ok: false, why: NO_HOST_TO_ASK };
}
