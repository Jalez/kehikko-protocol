/**
 * The names a module's server and its own page agree on, stated once so the two halves (`/serve`
 * and `/client`) cannot drift by a character. See docs/module-plumbing.md.
 */
/** The header a page write carries the ticket in. */
export const TICKET_HEADER = 'x-module-ticket';
/** The id of the JSON island the ticket is printed into. */
export const TICKET_ELEMENT = 'ticket';
/** The id of the element a module's page renders into. */
export const ROOT_ELEMENT = 'root';
/**
 * What a refusal for a missing or old ticket carries in its body, beside the
 * sentence: `{ ok: false, error, refused: TICKET_REFUSED }` with status 403.
 * A page that reads it knows it is older than the server answering it — the
 * server restarted and minted a new ticket — rather than merely refused.
 */
export const TICKET_REFUSED = 'ticket';
/** A page address may say the theme outright: `/app?theme=dark`. */
export const THEME_PARAM = 'theme';
/**
 * Where a page remembers the theme its host last said, so its NEXT load can
 * paint that before any script has run. Its own `localStorage`, which only a
 * module that declared storage has; a page without it falls back quietly.
 */
export const THEME_KEY = 'kehikot.theme';
/**
 * The two backgrounds a page paints before its stylesheet exists: the
 * `--background` token at each end of the palette every scaffolded module
 * ships. A module with a different palette passes its own to `pageDocument`.
 */
export const PAGE_BACKGROUND = {
    light: 'oklch(1 0 0)',
    dark: 'oklch(0.145 0 0)',
};
/**
 * The id of the JSON island the origins that may frame a page are printed into: the same list its
 * server sends as `frame-ancestors`. The page's `connect` answers a greeting from one of them only.
 */
export const ORIGINS_ELEMENT = 'origins';
/**
 * Whether `origin` — a `MessageEvent.origin`, an `Origin` header — is one of `sources`, each
 * written as `frame-ancestors` takes them: `http://127.0.0.1:4170`, `http://localhost:*` for any
 * port, `https://*.example.org` for any name under one, `*` for anywhere. Pure. An origin that is
 * not an address (`null`, the empty string) is among nothing but `*`.
 */
export function originAmong(origin, sources) {
    let asked;
    try {
        asked = new URL(origin);
    }
    catch {
        return sources.includes('*');
    }
    const port = (url) => url.port || (url.protocol === 'http:' ? '80' : url.protocol === 'https:' ? '443' : '');
    return sources.some((source) => {
        if (source === '*')
            return true;
        const read = /^([a-z][a-z0-9+.-]*:)\/\/([^/:]+|\[[^\]]+\])(?::(\d+|\*))?\/?$/i.exec(source);
        if (!read)
            return false;
        const [, protocol, name, at] = read;
        if (protocol.toLowerCase() !== asked.protocol)
            return false;
        const host = name.toLowerCase();
        const named = host.startsWith('*.') ? asked.hostname.endsWith(host.slice(1)) : asked.hostname === host;
        if (!named)
            return false;
        return at === '*' || port(asked) === (at ?? port({ protocol: asked.protocol, port: '' }));
    });
}
/* When the page fails (2.59.0): what the page document's blocking script (`errorsScript`) and the client (`client/errors.ts`) agree on. */
/** How many different failures one document says, at most. Each is said once; the rest are dropped. */
export const PAGE_ERRORS_MAX = 5;
/** How many lines of a stack are sent: the message's and the frames nearest the throw. */
export const STACK_LINES = 12;
/**
 * The window property the page document's blocking script keeps what it caught in (`errorsScript`):
 * `{ list, off }`. The client reads `list` and sets `off` when it installs.
 */
export const PAGE_ERRORS_GLOBAL = '__kehikotPageErrors';
/** What is said for a failure that carries no words at all (`throw undefined`, a bare rejection). */
export const NO_MESSAGE = 'An error with no message.';
