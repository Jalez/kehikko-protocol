/** A request's JSON body, bounded: the caller is whatever on this machine found the port. */
/** A megabyte: what every module's own copy of this allowed. */
export const MAX_BODY_BYTES = 1_000_000;
/** The methods that carry a body. A GET's is never read. */
export const BODY_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
export const BODY_TOO_LARGE = 'That request is too large.';
/**
 * Read the body as a JSON object. Not-JSON and not-an-object are `null`, because the door being
 * asked words that itself; too large is the one thing refused here, as 413.
 */
export function readJsonBody(request, options = {}) {
    const max = options.maxBytes ?? MAX_BODY_BYTES;
    const methods = options.methods ?? BODY_METHODS;
    if (!methods.includes((request.method ?? 'GET').toUpperCase()))
        return Promise.resolve({ ok: true, body: null });
    return new Promise((resolve) => {
        const chunks = [];
        let size = 0;
        let done = false;
        const finish = (read) => {
            if (done)
                return;
            done = true;
            resolve(read);
        };
        request.on('data', (chunk) => {
            if (done)
                return;
            size += chunk.length;
            if (size > max) {
                chunks.length = 0;
                /* Keep the socket flowing so the refusal can be delivered, and keep nothing. */
                request.resume?.();
                finish({ ok: false, status: 413, error: BODY_TOO_LARGE });
                return;
            }
            chunks.push(chunk);
        });
        request.on('end', () => finish({ ok: true, body: parse(chunks) }));
        request.on('close', () => finish({ ok: true, body: parse(chunks) }));
        request.on('error', () => finish({ ok: true, body: null }));
    });
}
function parse(chunks) {
    if (!chunks.length)
        return null;
    try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    }
    catch {
        return null;
    }
}
