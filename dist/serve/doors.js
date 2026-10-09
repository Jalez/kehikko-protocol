import { BUILD_HEADER, WELL_KNOWN, buildStamp } from '../index.js';
import { TICKET_HEADER } from '../page.js';
import { BODY_TOO_LARGE, readJsonBody, readJsonRequest } from './body.js';
import { frameAncestors } from './origins.js';
import { pageDocument } from './page.js';
import { ticketOf } from './ticket.js';
export const PAGE_PATHS = ['/app', '/app/', '/'];
const oursByDefault = (path) => path === '/healthz' || path === '/mcp' || path.startsWith('/api/');
/** What both forms of the doors work out once, from the options. */
function standing(options) {
    const build = options.build;
    return {
        pages: new Set([...PAGE_PATHS, ...(options.pages ?? [])]),
        ours: options.ours ?? oursByDefault,
        build,
        manifest: build ? { ...options.manifest, build } : options.manifest,
        stamp: build ? buildStamp(build) : null,
        document: typeof options.page === 'function' ? options.page : () => pageDocument({ build, ...options.page }),
        /* Worked out per request: who may frame the page is read from the environment as it is then. */
        pageHeaders: () => ({
            'content-type': 'text/html; charset=utf-8',
            /* Never cached: the ticket is per process. */
            'cache-control': 'no-store',
            'content-security-policy': frameAncestors(process.env, options.ancestors),
        }),
        open: options.openHealth === true,
    };
}
/**
 * A reply as headers and a payload. Nothing the doors send may be cached — an answer is this
 * process's, now — unless the reply names a `cache-control` of its own, or an empty one for none.
 */
function wire(reply, stamp) {
    const headers = { 'cache-control': 'no-store' };
    if (stamp)
        headers[BUILD_HEADER] = stamp;
    for (const [name, value] of Object.entries(reply.headers ?? {})) {
        /* An empty value is "do not send this one": the only way to answer with no `cache-control`. */
        if (value === '')
            delete headers[name.toLowerCase()];
        else
            headers[name.toLowerCase()] = value;
    }
    if (reply.raw)
        return { headers: { ...headers, 'content-type': reply.raw.type }, payload: reply.raw.bytes };
    if (reply.body === null || reply.body === undefined)
        return { headers, payload: null };
    return { headers: { ...headers, 'content-type': 'application/json; charset=utf-8' }, payload: JSON.stringify(reply.body, null, 2) };
}
const STREAM_HEADERS = {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
};
const frame = (data, name) => `${name ? `event: ${name.replace(/[\r\n]/g, '')}\n` : ''}data: ${JSON.stringify(data)}\n\n`;
/** What lets a page on another origin — an opaque one — read the health check, and the build on it. */
const OPEN_HEALTH = { 'access-control-allow-origin': '*', 'access-control-expose-headers': BUILD_HEADER };
/**
 * The health check says which build is answering, without each module spelling it; and, for a
 * module that asked (`openHealth`), that any page may read it. A header the reply names wins.
 */
function healthy(reply, path, build, open) {
    if (path !== '/healthz')
        return reply;
    const body = reply.body;
    const said = build && body && typeof body === 'object' && !Array.isArray(body) ? { ...reply, body: { ...body, build } } : reply;
    return open ? { ...said, headers: { ...OPEN_HEALTH, ...said.headers } } : said;
}
/**
 * The doors as a plain node handler — `(request, response, next)` — for a
 * module that is not served by Vite, and for tests. `transform` is where Vite's
 * `transformIndexHtml` goes; without one the document is sent as built.
 */
export function doorsHandler(options, transform) {
    const { pages, ours, build, manifest, stamp, document, pageHeaders, open } = standing(options);
    return (request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://127.0.0.1');
        const path = url.pathname;
        const method = (request.method ?? 'GET').toUpperCase();
        const send = (reply) => {
            const { headers, payload } = wire(reply, stamp);
            response.statusCode = reply.status;
            for (const [name, value] of Object.entries(headers))
                response.setHeader(name, value);
            if (payload === null)
                response.end();
            else
                response.end(payload);
        };
        if (path === WELL_KNOWN)
            return send({ status: 200, body: manifest });
        if (pages.has(path)) {
            const built = document();
            void (transform ? transform(built, request.url ?? '/app', request.originalUrl) : Promise.resolve(built))
                .then((html) => {
                response.statusCode = 200;
                for (const [name, value] of Object.entries(pageHeaders()))
                    response.setHeader(name, value);
                response.end(html);
            })
                .catch(next);
            return;
        }
        if (!ours(path))
            return next();
        const ticket = ticketOf(request.headers);
        if (options.stream) {
            const early = [];
            let opened = false;
            const event = (data, name) => response.write(frame(data, name));
            /* An event emitted while the door is still deciding is held until the stream is open. */
            const live = options.stream(method, path, url.searchParams, (data, name) => (opened ? event(data, name) : early.push([data, name])), ticket);
            if (live && 'reply' in live)
                return send(live.reply);
            if (live) {
                response.statusCode = 200;
                for (const [name, value] of Object.entries(STREAM_HEADERS))
                    response.setHeader(name, value);
                if (stamp)
                    response.setHeader(BUILD_HEADER, stamp);
                /* An event is a few bytes; held back for more, a live line arrives a beat late. */
                try {
                    request.socket?.setNoDelay?.(true);
                }
                catch {
                    /* A socket that is already gone. The close below says so. */
                }
                response.flushHeaders?.();
                response.write(': open\n\n');
                opened = true;
                for (const [data, name] of early.splice(0))
                    event(data, name);
                const beat = setInterval(() => response.write(': beat\n\n'), options.beatMs ?? 25_000);
                /* Once, whichever of the two a reader that went away is reported as: node fires both on some failures. */
                let gone = false;
                const leave = () => {
                    if (gone)
                        return;
                    gone = true;
                    clearInterval(beat);
                    live.close();
                };
                request.on('close', leave);
                request.on('error', leave);
                return;
            }
        }
        /* Only these paths read a body. Vite has to keep seeing an unconsumed request for everything else. */
        void readJsonBody(request, { maxBytes: options.maxBodyBytes })
            .then(async (read) => {
            if (!read.ok) {
                return send({ status: read.status, body: { ok: false, error: BODY_TOO_LARGE }, headers: { connection: 'close' } });
            }
            const reply = await options.answer(method, path, url.searchParams, read.body, ticket);
            if (!reply)
                return next();
            send(healthy(reply, path, build, open));
        })
            .catch(next);
    };
}
/**
 * The same doors as one function from a `Request` to a `Response`, for a server that is not node's
 * (`Bun.serve`, a test): `fetch: async (request) => (await doors(request)) ?? notFound()`. `null`
 * is what `next()` is in the other form — the module's own assets, or its 404. `transform` is as
 * in `doorsHandler`; a page built ahead of time is `page: () => fillPage(built, { ticket, build })`.
 */
export function doorsFetch(options, transform) {
    const { pages, ours, build, manifest, stamp, document, pageHeaders, open } = standing(options);
    const send = (reply) => {
        const { headers, payload } = wire(reply, stamp);
        return new Response(payload, { status: reply.status, headers });
    };
    return async (request) => {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method.toUpperCase();
        if (path === WELL_KNOWN)
            return send({ status: 200, body: manifest });
        if (pages.has(path)) {
            const built = document();
            return new Response(transform ? await transform(built, `${path}${url.search}`) : built, { status: 200, headers: pageHeaders() });
        }
        if (!ours(path))
            return null;
        const ticket = request.headers.get(TICKET_HEADER) || null;
        if (options.stream) {
            const bytes = new TextEncoder();
            const early = [];
            let pipe = null;
            const write = (text) => {
                try {
                    pipe?.enqueue(bytes.encode(text));
                }
                catch {
                    /* The reader has gone; `leave` is on its way. */
                }
            };
            const live = options.stream(method, path, url.searchParams, (data, name) => (pipe ? write(frame(data, name)) : early.push(frame(data, name))), ticket);
            if (live && 'reply' in live)
                return send(live.reply);
            if (live) {
                let beat = null;
                let gone = false;
                const leave = () => {
                    if (gone)
                        return;
                    gone = true;
                    if (beat !== null)
                        clearInterval(beat);
                    live.close();
                    try {
                        pipe?.close();
                    }
                    catch {
                        /* Already closed by the reader. */
                    }
                };
                const body = new ReadableStream({
                    start(controller) {
                        pipe = controller;
                        write(': open\n\n');
                        for (const text of early.splice(0))
                            write(text);
                        beat = setInterval(() => write(': beat\n\n'), options.beatMs ?? 25_000);
                        if (request.signal.aborted)
                            leave();
                        else
                            request.signal.addEventListener('abort', leave);
                    },
                    cancel: leave,
                });
                return new Response(body, { status: 200, headers: stamp ? { ...STREAM_HEADERS, [BUILD_HEADER]: stamp } : STREAM_HEADERS });
            }
        }
        const read = await readJsonRequest(request, { maxBytes: options.maxBodyBytes });
        if (!read.ok)
            return send({ status: read.status, body: { ok: false, error: BODY_TOO_LARGE }, headers: { connection: 'close' } });
        const reply = await options.answer(method, path, url.searchParams, read.body, ticket);
        return reply ? send(healthy(reply, path, build, open)) : null;
    };
}
/**
 * The Vite plugin. It goes after `serves()`, which claims the port, and before
 * the framework's own plugins:
 *
 *     plugins: [serves({ id: ID, prefer: PREFERRED_PORT }), doors({ … }), react(), tailwindcss()]
 */
export function doors(options) {
    return {
        name: 'kehikot-module-doors',
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use(doorsHandler(options, (html, url, originalUrl) => server.transformIndexHtml(url, html, originalUrl)));
        },
    };
}
