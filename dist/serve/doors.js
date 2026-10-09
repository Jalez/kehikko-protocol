import { BUILD_HEADER, LEGACY_WELL_KNOWN, WELL_KNOWN, buildStamp, legacyManifest } from '../index.js';
import { BODY_TOO_LARGE, readJsonBody } from './body.js';
import { frameAncestors } from './origins.js';
import { pageDocument } from './page.js';
import { ticketOf } from './ticket.js';
export const PAGE_PATHS = ['/app', '/app/', '/'];
const oursByDefault = (path) => path === '/healthz' || path === '/mcp' || path.startsWith('/api/');
/**
 * The doors as a plain node handler — `(request, response, next)` — for a
 * module that is not served by Vite, and for tests. `transform` is where Vite's
 * `transformIndexHtml` goes; without one the document is sent as built.
 */
export function doorsHandler(options, transform) {
    const pages = new Set([...PAGE_PATHS, ...(options.pages ?? [])]);
    const ours = options.ours ?? oursByDefault;
    const build = options.build;
    const manifest = build ? { ...options.manifest, build } : options.manifest;
    const stamp = build ? buildStamp(build) : null;
    const document = typeof options.page === 'function' ? options.page : () => pageDocument({ build, ...options.page });
    return (request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://127.0.0.1');
        const path = url.pathname;
        const method = (request.method ?? 'GET').toUpperCase();
        const send = (reply) => {
            response.statusCode = reply.status;
            if (stamp)
                response.setHeader(BUILD_HEADER, stamp);
            for (const [name, value] of Object.entries(reply.headers ?? {}))
                response.setHeader(name, value);
            if (reply.raw) {
                response.setHeader('content-type', reply.raw.type);
                return void response.end(reply.raw.bytes);
            }
            if (reply.body === null || reply.body === undefined)
                return void response.end();
            response.setHeader('content-type', 'application/json; charset=utf-8');
            response.end(JSON.stringify(reply.body, null, 2));
        };
        if (path === WELL_KNOWN)
            return send({ status: 200, body: manifest });
        /* The spelling a host from before the rename asks for, so that host still finds this module. */
        if (path === LEGACY_WELL_KNOWN)
            return send({ status: 200, body: legacyManifest(manifest) });
        if (pages.has(path)) {
            const built = document();
            void (transform ? transform(built, request.url ?? '/app', request.originalUrl) : Promise.resolve(built))
                .then((html) => {
                response.statusCode = 200;
                response.setHeader('content-type', 'text/html; charset=utf-8');
                /* The ticket is per process; a cached page would have every write refused. */
                response.setHeader('cache-control', 'no-store');
                /* Framed by a host or by nothing. Which hosts: see `frameOrigins`. */
                response.setHeader('content-security-policy', frameAncestors());
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
            const event = (data, name) => response.write(`${name ? `event: ${name.replace(/[\r\n]/g, '')}\n` : ''}data: ${JSON.stringify(data)}\n\n`);
            /* An event emitted while the door is still deciding is held until the stream is open. */
            const live = options.stream(method, path, url.searchParams, (data, name) => (opened ? event(data, name) : early.push([data, name])), ticket);
            if (live && 'reply' in live)
                return send(live.reply);
            if (live) {
                response.statusCode = 200;
                response.setHeader('content-type', 'text/event-stream; charset=utf-8');
                response.setHeader('cache-control', 'no-store');
                response.setHeader('connection', 'keep-alive');
                response.setHeader('x-accel-buffering', 'no');
                response.flushHeaders?.();
                response.write(': open\n\n');
                opened = true;
                for (const [data, name] of early.splice(0))
                    event(data, name);
                const beat = setInterval(() => response.write(': beat\n\n'), options.beatMs ?? 25_000);
                request.on('close', () => {
                    clearInterval(beat);
                    live.close();
                });
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
            /* The health check says which build is answering, without each module spelling it. */
            const body = reply.body;
            const healthy = build && path === '/healthz' && body && typeof body === 'object' && !Array.isArray(body);
            send(healthy ? { ...reply, body: { ...body, build } } : reply);
        })
            .catch(next);
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
