import { readFileSync, statSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';
import { commitOf } from '../serve/build.js';
import { PAGE_PATHS, doorsFetch } from '../serve/doors.js';
import { frameOrigins } from '../serve/origins.js';
import { fillPage } from '../serve/page.js';
import { claimOrLeave, preferred, registerBound } from '../serve/plugin.js';
import { readStamp, readiness } from './stamp.js';
export { STAMP_FILE, readStamp, readiness } from './stamp.js';
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
const TEXT = { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' };
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
    const unservable = (why) => new Response(`${why}\n`, { status: 503, headers: TEXT });
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
                const file = fileIn(dist, path);
                if (file) {
                    if (!now.ok)
                        return unservable(now.why);
                    return new Response(bun.file(file), {
                        headers: {
                            'cache-control': path.startsWith('/assets/') ? IMMUTABLE : 'no-cache',
                            'x-content-type-options': 'nosniff',
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
    let stopped = false;
    const stop = () => {
        if (stopped)
            return;
        stopped = true;
        try {
            options.onStop?.();
        }
        finally {
            server.stop(true);
        }
    };
    for (const signal of ['SIGINT', 'SIGTERM']) {
        process.once(signal, () => {
            stop();
            process.exit(0);
        });
    }
    process.once('exit', stop);
    return { port, origin, ready, stop };
}
