import { asker } from './gate.js';
import { ticketOf } from './ticket.js';
/** What `before` is handed for a `Request` a server received. The doors compute the same. */
export function beforeInfo(request) {
    const url = new URL(request.url);
    const headers = {};
    request.headers.forEach((value, name) => {
        headers[name] = value;
    });
    return { asker: asker(request.headers, url.host), url, ticket: ticketOf(headers) };
}
/** A node request's headers as `Headers`; a repeated header is appended, as it arrived. */
function headersOf(record) {
    const headers = new Headers();
    for (const [name, value] of Object.entries(record)) {
        if (value === undefined)
            continue;
        /* HTTP/2 pseudo-headers (`:path`) are not headers a `Request` may carry. */
        if (name.startsWith(':'))
            continue;
        for (const one of Array.isArray(value) ? value : [value])
            headers.append(name, one);
    }
    return headers;
}
/**
 * A node request's body as a stream that reads nothing until it is read: a `before` that hands a
 * request on without reading it leaves the body for Vite and the doors, as if it had not been asked.
 */
function lazyBody(request) {
    let attached = false;
    return new ReadableStream({
        pull(controller) {
            if (attached)
                return;
            attached = true;
            request.on('data', (chunk) => controller.enqueue(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : new Uint8Array(chunk)));
            request.on('end', () => {
                try {
                    controller.close();
                }
                catch {
                    /* Already errored or cancelled. */
                }
            });
            request.on('error', (error) => {
                try {
                    controller.error(error);
                }
                catch {
                    /* Already closed. */
                }
            });
        },
    }, 
    /* No read ahead: `pull` is not called until somebody reads, so nothing is consumed by asking. */
    { highWaterMark: 0 });
}
/** The `Request` a node request is, on `http://<Host>` (or 127.0.0.1 when it names none). */
export function requestOf(request) {
    const method = (request.method ?? 'GET').toUpperCase();
    const host = typeof request.headers.host === 'string' && request.headers.host ? request.headers.host : '127.0.0.1';
    let url;
    try {
        url = new URL(request.url ?? '/', `http://${host}`);
    }
    catch {
        url = new URL(request.url ?? '/', 'http://127.0.0.1');
    }
    const init = { method, headers: headersOf(request.headers) };
    if (method !== 'GET' && method !== 'HEAD') {
        init.body = lazyBody(request);
        init.duplex = 'half';
    }
    return new Request(url, init);
}
/** Write a `Response` to node's response, streaming its body as it comes. */
async function sendTo(answer, request, response) {
    response.statusCode = answer.status;
    answer.headers.forEach((value, name) => {
        if (name !== 'set-cookie')
            response.setHeader(name, value);
    });
    const cookies = typeof answer.headers.getSetCookie === 'function' ? answer.headers.getSetCookie() : [];
    if (cookies.length)
        response.setHeader('set-cookie', cookies);
    if (!answer.body) {
        response.end();
        return;
    }
    const reader = answer.body.getReader();
    let gone = false;
    const leave = () => {
        gone = true;
        void reader.cancel().catch(() => { });
    };
    /* The response's `close` is the reader going away (or the answer done); node's request may say
       `close` as soon as its body has been read. */
    const closes = response.on;
    if (typeof closes === 'function')
        closes.call(response, 'close', leave);
    else
        request.on('close', leave);
    response.flushHeaders?.();
    const write = response.write;
    for (;;) {
        const { done, value } = await reader.read();
        if (done || gone)
            break;
        write.call(response, value);
    }
    response.end();
}
/**
 * `before` as node middleware — `(request, response, next)` — for Vite's `configureServer`, in front
 * of the protocol's `doors()`. `next()` when it answers nothing; `next(error)` when it throws.
 */
export function beforeHandler(before) {
    return (request, response, next) => {
        let asked;
        try {
            asked = requestOf(request);
        }
        catch (error) {
            return next(error);
        }
        const info = {
            asker: asker(request.headers),
            url: new URL(asked.url),
            ticket: ticketOf(request.headers),
        };
        void Promise.resolve()
            .then(() => before(asked, info))
            .then((answer) => (answer ? sendTo(answer, request, response) : next()))
            .catch(next);
    };
}
/**
 * The Vite plugin: `before` mounted ahead of `doors()`. It goes after `serves()` and before
 * `doors()`, so it sees what the doors would refuse or read past:
 *
 *     plugins: [serves({ id: ID, prefer: PREFERRED_PORT }), beforeDoors(myDoor), doors({ … }), react()]
 *
 * `setup` runs once, when the dev server is made — the same moment `run` would be started.
 */
export function beforeDoors(before, options = {}) {
    return {
        name: options.name ?? 'kehikot-module-before',
        apply: 'serve',
        configureServer(server) {
            options.setup?.();
            server.middlewares.use(beforeHandler(before));
        },
    };
}
