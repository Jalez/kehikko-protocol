/**
 * Who a request to a door came from, read off the request itself. A door answers its own page and
 * a program on this machine; `/app` also answers a browser opening or framing it, and who may
 * frame it is `frame-ancestors`' to say. Pure. Design notes: docs/serving.md.
 */
/**
 * Where a request came from:
 * - `page`: the module's own page — an `Origin` that is this server's, or a browser saying `same-origin`.
 * - `program`: nothing a browser sends is on it. `curl`, a host's server, an agent's client.
 * - `person`: a browser asked on nobody's behalf — an address typed, a bookmark.
 * - `navigation`: a browser is opening the address as a document, from another origin: a frame, a link.
 * - `elsewhere`: a page on another origin asked.
 */
export type Asker = 'page' | 'program' | 'person' | 'navigation' | 'elsewhere';
/** What a request from `elsewhere` is told, with status 403. */
export declare const ELSEWHERE_REFUSAL = "This door answers its own page and programs on this computer. That request came from somewhere else.";
/** The headers this reads, however the server holds them: node's record, or a `Headers`. */
export type HeaderSource = Record<string, string | string[] | undefined> | {
    get(name: string): string | null;
};
/** One header's value, lower-cased name, from either holding. `null` for none and for an empty one. */
export declare function headerOf(headers: HeaderSource, name: string): string | null;
/**
 * Read where a request came from. `Origin` decides when it is there, because a browser writes it
 * and a page cannot; without one, `Sec-Fetch-Site` does. `same-site` is not `same-origin`: every
 * port of this machine is the same site. `host` is for a server whose requests carry no `Host`
 * header of their own (a `Request` built by hand): the host of the address asked.
 */
export declare function asker(headers: HeaderSource, host?: string | null): Asker;
/**
 * Whether a door answers this request. `document` is for an address that serves the page: a
 * browser may open that from anywhere, as a document. Every other door answers its own page, a
 * program, and a person asking directly.
 */
export declare function admits(who: Asker, document?: boolean): boolean;
