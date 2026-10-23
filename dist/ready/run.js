import { readFileSync, statSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';
import { WELL_KNOWN } from '../index.js';
import { beforeInfo } from '../serve/before.js';
import { commitOf } from '../serve/build.js';
import { PAGE_PATHS, doorsFetch } from '../serve/doors.js';
import { frameOrigins } from '../serve/origins.js';
import { fillPage } from '../serve/page.js';
import { claimOrLeave, preferred, registerBound } from '../serve/plugin.js';
import { readStamp, readiness } from './stamp.js';
export { STAMP_FILE, readStamp, readiness } from './stamp.js';
export { beforeDoors, beforeHandler, beforeInfo } from '../serve/before.js';
/**
 * Is this WebSocket handshake from this module's own page? A browser always sends `Origin` on one
 * and a page cannot forge it, so none at all is not a page; `Host` is held to the same two names so
 * that a name resolving to 127.0.0.1 (DNS rebinding) is not here. Pure.
 */
export function socketFence(headers, port) {
    const allowed = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
    const origin = headers.get('origin');
    if (!origin)
        return { ok: false, why: 'That handshake carried no Origin. Every browser sends one, so this did not come from a page.' };
    if (!allowed.has(origin))
        return { ok: false, why: `${origin} is not this module's own page, and only its own page may open a socket here.` };
    const host = headers.get('host');
    if (!host || !allowed.has(`http://${host}`)) {
        return { ok: false, why: `That handshake asked for host ${host ?? '(none)'}, which is not this module's address. A name that resolves here is still not here.` };
    }
    return { ok: true };
}
/** How long a signal waits for a module's `onStop` before the process exits anyway (2.18.1). */
export const STOP_TIMEOUT_MS = 5000;
const TEXT = { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' };
/** What a request sent under a name that is not this machine's is told, with status 403. */
export const NOT_HERE = 'This address is not one this module answers at.';
/**
 * Whether a `Host` header names this machine — `127.0.0.1`, `[::1]`, `localhost` or a name under
 * it, with or without a port — or one of `also` (2.18.0). Pure.
 *
 * The doors' gate reads `Origin` against `Host`, so it trusts `Host` to be this server. A page on a
 * name somebody pointed at 127.0.0.1 (DNS rebinding) sends an `Origin` and a `Host` that agree, and
 * would be "its own page". Vite refuses such a `Host` before its middleware runs
 * (`server.allowedHosts`); `run` refuses it first, the same way, whatever the path.
 */
export function hostFence(host, also = []) {
    if (!host)
        return false;
    let name;
    try {
        name = new URL(`http://${host}`).hostname.toLowerCase();
    }
    catch {
        return false;
    }
    if (name === '127.0.0.1' || name === '[::1]' || name === 'localhost' || name.endsWith('.localhost'))
        return true;
    return also.some((one) => one.toLowerCase() === name);
}
/**
 * The origin a cross-origin load of a file of `dist/` is answered for, or null (2.18.0): `null`, an
 * opaque page's, and the frame origins, when `cors` is on. Pure.
 */
export function corsOrigin(origin, allowed) {
    if (!origin || !allowed)
        return null;
    return allowed.has(origin) ? origin : null;
}
/** The doors' own paths when a module names none (`ours` in doors.ts). */
const oursByDefault = (path) => path === '/healthz' || path === '/mcp' || path.startsWith('/api/');
/** Hashed by Vite: a file under `/assets/` never changes meaning, so a browser may keep it for good. */
const IMMUTABLE = 'public, max-age=31536000, immutable';
/**
 * One file out of `dist`, or null. Never a directory (no listing), never a dot file (the stamp),
 * never a path that leaves `dist` once normalised.
 */
export function fileIn(dist, pathname) {
    let decoded;
    try {
        decoded = decodeURIComponent(pathname);
    }
    catch {
        return null;
    }
    if (decoded.includes('\0'))
        return null;
    const wanted = normalize(join(dist, decoded));
    if (!wanted.startsWith(dist + sep))
        return null;
    if (wanted.slice(dist.length + 1).split(sep).some((part) => part.startsWith('.')))
        return null;
    try {
        return statSync(wanted).isFile() ? wanted : null;
    }
    catch {
        return null;
    }
}
/** Serve a module's built page and its doors. Resolves once the server is listening and registered. */
export async function run(options) {
    const bun = globalThis.Bun;
    if (!bun)
        throw new Error('kehikot-module-protocol/run serves with Bun.serve: start it with `bun`, not node.');
    const { id, dir } = options;
    const dist = normalize(options.dist ?? join(dir, 'dist'));
    const index = join(dist, 'index.html');
    /* The commit this process started at. A rebuild for another commit while it runs is refused too. */
    const commit = options.build?.commit ?? commitOf(dir);
    const ready = readiness(dir, dist, commit);
    if (!ready.ok)
        console.error(`${id}: NOT serving the built page. ${ready.why}`);
    /* Re-read per page: a stamp is a few bytes, and a build replaced under a running server is seen. */
    const servable = () => {
        if (!ready.ok)
            return ready;
        if (readStamp(dist) === commit)
            return ready;
        return readiness(dir, dist, commit);
    };
    const unservable = (why, extra = {}) => new Response(`${why}\n`, { status: 503, headers: { ...TEXT, ...extra } });
    /* Read per request, like `frame-ancestors`: who may frame the page is the environment's to say. */
    const cors = options.cors;
    const corsAllowed = () => cors ? new Set(['null', ...frameOrigins(process.env, options.ancestors), ...(typeof cors === 'object' ? (cors.origins ?? []) : [])]) : null;
    /* `Vary` on every file while `cors` is on, crossed or not: a copy cached for one origin is not another's. */
    const corsHeaders = (origin) => !cors ? {} : origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : { vary: 'Origin' };
    const before = options.before;
    const hosts = options.hosts ?? [];
    const pages = new Set([...PAGE_PATHS, ...(options.pages ?? [])]);
    const through = doorsFetch({
        ...options,
        page: () => fillPage(readFileSync(index, 'utf8'), {
            ticket: options.ticket ?? null,
            build: options.build ?? null,
            origins: frameOrigins(process.env, options.ancestors),
        }),
    });
    const claimed = await claimOrLeave({ id, prefer: preferred(options.prefer), span: options.span, timeoutMs: options.timeoutMs });
    const sockets = options.sockets;
    const socketPaths = new Set(sockets?.paths ?? []);
    let port = claimed.port;
    const server = bun.serve({
        hostname: '127.0.0.1',
        port: claimed.port,
        idleTimeout: options.idleTimeout ?? 0,
        async fetch(request, server) {
            const url = new URL(request.url);
            const path = url.pathname;
            const method = request.method.toUpperCase();
            /* Asked under a name that is not this machine's: not answered, whatever the path. */
            if (!hostFence(request.headers.get('host') ?? url.host, hosts)) {
                return new Response(`${NOT_HERE}\n`, { status: 403, headers: TEXT });
            }
            /* Who may load a file of `dist/` from another origin, when the module said so. */
            const crossed = corsOrigin(request.headers.get('origin'), corsAllowed());
            /* A preflight for a file of `dist/`, from an origin `cors` answers. Every other OPTIONS goes on. */
            if (crossed && method === 'OPTIONS' && request.headers.get('access-control-request-method')) {
                const door = pages.has(path) || path === WELL_KNOWN || (options.ours ?? oursByDefault)(path);
                if (!door && (fileIn(dist, path) ?? (path.startsWith('/app/') ? fileIn(dist, path.slice('/app'.length)) : null))) {
                    return new Response(null, {
                        status: 204,
                        headers: {
                            ...corsHeaders(crossed),
                            'access-control-allow-methods': 'GET, HEAD',
                            'access-control-allow-headers': request.headers.get('access-control-request-headers') ?? '',
                            'access-control-max-age': '600',
                            'cache-control': 'no-store',
                        },
                    });
                }
            }
            if (sockets && socketPaths.has(path) && request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
                const gate = socketFence(request.headers, port);
                if (!gate.ok) {
                    sockets.refused?.(gate.why);
                    return new Response(null, { status: 403, headers: { connection: 'close' } });
                }
                const data = (sockets.data ? sockets.data(request) : undefined);
                if (server.upgrade(request, { data }))
                    return undefined;
                return new Response('That was not a WebSocket handshake.\n', { status: 400, headers: TEXT });
            }
            if (before) {
                try {
                    const mine = await before(request, beforeInfo(request));
                    if (mine)
                        return mine;
                }
                catch (error) {
                    console.error(`${id}: a door of its own failed on ${method} ${path}:`, error);
                    return new Response('That door failed. The module says why in its log.\n', { status: 500, headers: TEXT });
                }
            }
            const document = pages.has(path) && (method === 'GET' || method === 'HEAD');
            if (document) {
                const now = servable();
                if (!now.ok)
                    return unservable(now.why);
            }
            const answered = await through(request);
            if (answered)
                return answered;
            if (method === 'GET' || method === 'HEAD') {
                const now = servable();
                /* A page built with a relative base (`base: './'`) and opened at `/app/` asks for
                   `/app/assets/…`: the same file as `/assets/…`. */
                const file = fileIn(dist, path) ?? (path.startsWith('/app/') ? fileIn(dist, path.slice('/app'.length)) : null);
                if (file) {
                    if (!now.ok)
                        return unservable(now.why, corsHeaders(crossed));
                    return new Response(bun.file(file), {
                        headers: {
                            'cache-control': path.startsWith('/assets/') || path.startsWith('/app/assets/') ? IMMUTABLE : 'no-cache',
                            'x-content-type-options': 'nosniff',
                            ...corsHeaders(crossed),
                        },
                    });
                }
                const html = (request.headers.get('accept') ?? '').includes('text/html');
                if (options.spa && html && !path.startsWith('/assets/')) {
                    if (!now.ok)
                        return unservable(now.why);
                    return (await through(new Request(new URL('/app', url), request))) ?? unservable('The page could not be served.');
                }
            }
            return new Response('Not found\n', { status: 404, headers: TEXT });
        },
        websocket: {
            maxPayloadLength: sockets?.maxPayloadLength ?? 1024 * 1024,
            ...(sockets?.backpressureLimit !== undefined ? { backpressureLimit: sockets.backpressureLimit } : {}),
            open: (socket) => sockets?.open?.(socket),
            message: (socket, message) => sockets?.message(socket, typeof message === 'string' ? message : new Uint8Array(message)),
            close: (socket, code, reason) => sockets?.close?.(socket, code, reason),
            drain: (socket) => sockets?.drain?.(socket),
        },
    });
    port = server.port ?? claimed.port;
    const origin = `http://127.0.0.1:${port}`;
    registerBound(id, origin, dir);
    console.log(`${id} serves its built page on ${origin}/app${ready.ok ? ` (${ready.commit.slice(0, 7)})` : ' — refused, see above'}`);
    /*
     * Stopping happens once, whoever asks first. `onStop` may be asynchronous, and a signal waits for
     * it, for at most `stopTimeoutMs`, before the process exits (2.18.1): until then a module's
     * `onStop` was cut off by the `process.exit` right behind it.
     */
    let stopping = null;
    let begun = false;
    const stop = () => {
        if (stopping)
            return stopping;
        /* Asked again from inside `onStop` (it exited, say): the first call is the one that stops. */
        if (begun)
            return Promise.resolve();
        begun = true;
        let ended;
        try {
            ended = options.onStop?.();
        }
        catch (error) {
            console.error(`${id}: onStop failed:`, error);
        }
        /* No request is answered once stopping began: one could start again what `onStop` is ending. */
        try {
            void server.stop(true);
        }
        catch {
            /* Already stopped. */
        }
        const cap = options.stopTimeoutMs ?? STOP_TIMEOUT_MS;
        stopping = (async () => {
            if (ended && typeof ended.then === 'function') {
                let timer;
                const late = new Promise((resolve) => {
                    timer = setTimeout(() => resolve('late'), cap);
                });
                const said = await Promise.race([ended.then(() => 'done', (error) => error), late]);
                clearTimeout(timer);
                if (said === 'late')
                    console.error(`${id}: onStop did not finish within ${cap} ms; stopping anyway.`);
                else if (said !== 'done')
                    console.error(`${id}: onStop failed:`, said);
            }
        })();
        return stopping;
    };
    for (const signal of ['SIGINT', 'SIGTERM']) {
        process.once(signal, () => {
            void stop().finally(() => process.exit(0));
        });
    }
    /* An exit nobody asked for by signal: nothing can be awaited here, so `onStop` is only begun. */
    process.once('exit', () => void stop());
    return { port, origin, ready, stop };
}
