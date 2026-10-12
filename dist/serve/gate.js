/**
 * Who a request to a door came from, read off the request itself. A door answers its own page and
 * a program on this machine; `/app` also answers a browser opening or framing it, and who may
 * frame it is `frame-ancestors`' to say. Pure. Design notes: docs/serving.md.
 */
/** What a request from `elsewhere` is told, with status 403. */
export const ELSEWHERE_REFUSAL = 'This door answers its own page and programs on this computer. That request came from somewhere else.';
/** One header's value, lower-cased name, from either holding. `null` for none and for an empty one. */
export function headerOf(headers, name) {
    if (typeof headers.get === 'function')
        return headers.get(name) || null;
    const value = headers[name];
    if (typeof value === 'string')
        return value || null;
    if (Array.isArray(value))
        return value[0] || null;
    return null;
}
/** Whether an `Origin` names the server a request was sent to: the same host and port as its `Host`. */
function own(origin, host) {
    if (!host)
        return false;
    try {
        return new URL(origin).host.toLowerCase() === host.toLowerCase();
    }
    catch {
        /* `null`, the origin of a page that has none, and anything else that is not an address. */
        return false;
    }
}
/**
 * Read where a request came from. `Origin` decides when it is there, because a browser writes it
 * and a page cannot; without one, `Sec-Fetch-Site` does. `same-site` is not `same-origin`: every
 * port of this machine is the same site. `host` is for a server whose requests carry no `Host`
 * header of their own (a `Request` built by hand): the host of the address asked.
 */
export function asker(headers, host = null) {
    const origin = headerOf(headers, 'origin');
    if (origin !== null)
        return own(origin, headerOf(headers, 'host') ?? host) ? 'page' : 'elsewhere';
    const site = headerOf(headers, 'sec-fetch-site')?.toLowerCase() ?? null;
    if (site === null)
        return 'program';
    if (site === 'same-origin')
        return 'page';
    if (site === 'none')
        return 'person';
    return headerOf(headers, 'sec-fetch-mode')?.toLowerCase() === 'navigate' ? 'navigation' : 'elsewhere';
}
/**
 * Whether a door answers this request. `document` is for an address that serves the page: a
 * browser may open that from anywhere, as a document. Every other door answers its own page, a
 * program, and a person asking directly.
 */
export function admits(who, document = false) {
    if (who === 'elsewhere')
        return false;
    return who !== 'navigation' || document;
}
