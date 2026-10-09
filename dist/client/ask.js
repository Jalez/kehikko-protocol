import { BUILD_HEADER, buildStamp } from '../build.js';
import { TICKET_ELEMENT, TICKET_HEADER, TICKET_REFUSED } from '../page.js';
import { pageBuild } from './build.js';
import { withQuery } from './query.js';
/**
 * A page asking its own server, with every failure as one typed result: `ask` never throws and
 * never hands back a raw response. See docs/module-plumbing.md.
 */
/** The ticket printed into this page, or `''` when there is none. Read on every call; it is one element. */
export function ticket() {
    if (typeof document === 'undefined')
        return '';
    const text = document.getElementById(TICKET_ELEMENT)?.textContent;
    if (!text)
        return '';
    try {
        const parsed = JSON.parse(text);
        return typeof parsed === 'string' ? parsed : '';
    }
    catch {
        return '';
    }
}
/** What a reader is told when nothing answered. One sentence, the same in every module. */
export const SERVER_DOWN = 'This app’s own server is not answering.';
/**
 * The fact, and nothing about what happens next: what a stale `ask` says as its `error`, whether
 * or not anything is about to reload. A page that keeps unsaved words says this beside them.
 */
export const PAGE_OLD = 'This page is older than its server.';
/** The same fact while a reload is on its way: what the stale `Cover` says, because it is the one reloading. */
export const PAGE_STALE = 'This page is older than its server — reloading…';
/** What is said of a 2xx that carried something other than JSON, and by `replied` of one that carried no object. */
export const NOT_A_REPLY = 'This app’s own server answered with something that is not a reply.';
/** What a cancelled `ask` says. */
export const CANCELLED = 'That was cancelled.';
/** The most a browser will carry in a `keepalive` request is 64 KiB across all of them; this leaves room. */
export const KEEPALIVE_BYTES = 48_000;
let standing = 'up';
const watchers = new Set();
function stand(next) {
    /* Stale does not heal: the ticket in this document will never be right again. */
    if (standing === next || standing === 'stale')
        return;
    standing = next;
    for (const watcher of [...watchers])
        watcher(next);
}
/** How this page's own server last answered: `up`, `down` (nothing answered) or `stale` (it refused the ticket). */
export function serverStanding() {
    return standing;
}
/** Hear the standing change. Returns the function that stops listening. */
export function onServerStanding(watcher) {
    watchers.add(watcher);
    return () => watchers.delete(watcher);
}
/** For tests: forget what was learned. */
export function resetServerStanding() {
    standing = 'up';
}
function sentence(body) {
    if (!body || typeof body !== 'object')
        return null;
    const error = body.error;
    if (typeof error === 'string' && error)
        return error;
    /* JSON-RPC's spelling, for a page that asks its own `/mcp`. */
    const message = error?.message;
    return typeof message === 'string' && message ? message : null;
}
/**
 * Ask this page's own server; relative paths, one origin. Anything but a GET carries the ticket.
 * A 2xx whose body says `ok: false` is a refusal, and a refusal keeps its `body`. A 2xx with no
 * body at all is `ok: true, body: null`; a 2xx with a body that is not JSON is a refusal
 * (`NOT_A_REPLY`) — something answered on this path, and it was not this module's door.
 */
export async function ask(path, options = {}) {
    const method = (options.method ?? (options.body === undefined ? 'GET' : 'POST')).toUpperCase();
    const url = withQuery(path, options.query);
    const headers = {};
    if (options.body !== undefined)
        headers['content-type'] = 'application/json';
    if (options.ticket ?? (method !== 'GET' && method !== 'HEAD'))
        headers[TICKET_HEADER] = ticket();
    const sent = options.body === undefined ? undefined : JSON.stringify(options.body);
    /* Three bytes a character is the most UTF-8 spends on one UTF-16 unit, so most bodies are never encoded to be measured. */
    const outlives = options.keepalive === true && (!sent || sent.length * 3 <= KEEPALIVE_BYTES || new TextEncoder().encode(sent).length <= KEEPALIVE_BYTES);
    let response;
    try {
        response = await (options.fetch ?? fetch)(url, {
            method,
            headers,
            body: sent,
            signal: options.signal,
            cache: 'no-store',
            ...(outlives ? { keepalive: true } : {}),
        });
    }
    catch (caught) {
        /* A caller that gave up is not a server that stopped, and not a server that said no. */
        if (options.signal?.aborted)
            return { ok: false, kind: 'cancelled', status: null, error: CANCELLED, body: null };
        stand('down');
        void caught;
        return { ok: false, kind: 'down', status: null, error: SERVER_DOWN, body: null };
    }
    /* Read as text first: an empty body and a body that is not JSON are different answers. */
    let body = null;
    let unreadable = false;
    if (response.status !== 204) {
        const text = await response.text().catch(() => '');
        if (text.trim()) {
            try {
                body = JSON.parse(text);
            }
            catch {
                unreadable = true;
            }
        }
    }
    if (response.status === 403 && body?.refused === TICKET_REFUSED) {
        stand('stale');
        return { ok: false, kind: 'stale', status: 403, error: PAGE_OLD, body };
    }
    /* The server answering is not the process that served this page: every write from here would be
       refused. The answer itself still stands — a read from the new server is a true read. */
    const mine = pageBuild();
    const theirs = response.headers.get(BUILD_HEADER);
    if (mine && theirs && theirs !== buildStamp(mine))
        stand('stale');
    else
        stand('up');
    const refused = body?.ok === false;
    if (!response.ok || refused) {
        return {
            ok: false,
            kind: 'refused',
            status: response.status,
            error: sentence(body) ?? `This app’s own server answered ${response.status}.`,
            body,
        };
    }
    /* A 2xx that is not JSON: HTML from whatever is behind the doors, a proxy's page. Not an answer. */
    if (unreadable)
        return { ok: false, kind: 'refused', status: response.status, error: NOT_A_REPLY, body: null };
    return { ok: true, status: response.status, body: body };
}
/** A failed `ask`, for code written around `try`/`catch`. `message` is the sentence. */
export class AskFailed extends Error {
    kind;
    status;
    body;
    constructor(failed) {
        super(failed.error);
        this.name = 'AskFailed';
        this.kind = failed.kind;
        this.status = failed.status;
        this.body = failed.body;
    }
}
/** The body of an `ask` that worked, or an `AskFailed` thrown for one that did not. */
export function answered(asked) {
    if (asked.ok)
        return asked.body;
    throw new AskFailed(asked);
}
/**
 * What the server itself said, whether that was yes or no, for a door whose "no" is an answer of
 * its own shape (`{ ok: false, nowhere: true }`, a conflict with what is there now). A refusal's
 * body comes back with `ok: false` and the sentence as `error`; `T` describes both. Thrown as
 * `AskFailed`: nothing answered, a stale page, and an answer that is not a JSON object.
 */
export function replied(asked) {
    const body = asked.body;
    const object = typeof body === 'object' && body !== null && !Array.isArray(body);
    if (asked.ok) {
        if (object)
            return body;
        throw new AskFailed({ kind: 'refused', status: asked.status, error: NOT_A_REPLY, body });
    }
    if (asked.kind === 'refused' && asked.status !== null && object)
        return { ...body, ok: false, error: asked.error };
    throw new AskFailed(asked);
}
/**
 * Ask the server whether it is there, for a page that asks nothing on a timer: the answer is the
 * standing, which is also what `useServerStanding` and the covers read. Any door of the module's
 * that answers a GET will do; `/healthz` is the one every module has.
 */
export async function probeServer(path = '/healthz', options = {}) {
    await ask(path, options);
    return standing;
}
/** How often `watchServer` asks, in ms, unless told otherwise. */
export const WATCH_SERVER_MS = 15_000;
/**
 * Keep asking whether the server is there, for a page that never asks it anything else — one whose
 * rows all come from the host — and so would never notice it had stopped: `probeServer` every
 * `every` ms while the page is visible, and once each time it becomes visible again. The answer is
 * the standing the covers read. Returns the function that stops watching. A page on an opaque
 * origin needs its server's `openHealth` (`doors`) for the answer to be readable.
 */
export function watchServer(options = {}) {
    if (typeof document === 'undefined')
        return () => { };
    const every = typeof options.every === 'number' && options.every > 0 ? options.every : WATCH_SERVER_MS;
    const knock = () => {
        if (document.visibilityState !== 'hidden')
            void probeServer(options.path, { fetch: options.fetch });
    };
    const timer = setInterval(knock, every);
    document.addEventListener('visibilitychange', knock);
    return () => {
        clearInterval(timer);
        document.removeEventListener('visibilitychange', knock);
    };
}
/**
 * Reload a page that is older than its server — once: a second call within `within` ms does
 * nothing, so a server that refuses even a fresh page cannot make a loop. Returns whether a reload
 * was started.
 */
export function reloadStalePage(within = 10_000) {
    if (typeof location === 'undefined')
        return false;
    const key = 'kehikot.reloaded';
    const now = Date.now();
    try {
        if (now - Number(sessionStorage.getItem(key) ?? 0) < within)
            return false;
        sessionStorage.setItem(key, String(now));
    }
    catch {
        /* No storage (an opaque origin). The history entry survives a reload there, so it keeps the mark. */
        try {
            const state = (history.state ?? {});
            if (now - Number(state[key] ?? 0) < within)
                return false;
            history.replaceState({ ...state, [key]: now }, '');
        }
        catch {
            /* Nowhere to keep it: reload anyway, which is still the only thing that can help. */
        }
    }
    location.reload();
    return true;
}
/** How long the sentence is on screen before a stale page reloads. */
export const STALE_RELOAD_MS = 900;
/**
 * Reload automatically when this page's own server turns out to be a different process — once, a
 * moment after it is noticed. `useHost` and `Cover` both arrange this; a page with neither calls
 * it from its entry. Returns the function that stops watching.
 */
export function reloadWhenStale(delay = STALE_RELOAD_MS) {
    let timer = null;
    const arm = () => {
        if (timer === null)
            timer = setTimeout(() => reloadStalePage(), delay);
    };
    if (standing === 'stale')
        arm();
    const stop = onServerStanding((next) => {
        if (next === 'stale')
            arm();
    });
    return () => {
        stop();
        if (timer !== null)
            clearTimeout(timer);
    };
}
