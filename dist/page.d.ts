/**
 * The names a module's server and its own page agree on, stated once so the two halves (`/serve`
 * and `/client`) cannot drift by a character. See docs/module-plumbing.md.
 */
/** The header a page write carries the ticket in. */
export declare const TICKET_HEADER = "x-module-ticket";
/** The id of the JSON island the ticket is printed into. */
export declare const TICKET_ELEMENT = "ticket";
/** The id of the element a module's page renders into. */
export declare const ROOT_ELEMENT = "root";
/**
 * What a refusal for a missing or old ticket carries in its body, beside the
 * sentence: `{ ok: false, error, refused: TICKET_REFUSED }` with status 403.
 * A page that reads it knows it is older than the server answering it — the
 * server restarted and minted a new ticket — rather than merely refused.
 */
export declare const TICKET_REFUSED = "ticket";
/** A page address may say the theme outright: `/app?theme=dark`. */
export declare const THEME_PARAM = "theme";
/**
 * Where a page remembers the theme its host last said, so its NEXT load can
 * paint that before any script has run. Its own `localStorage`, which only a
 * module that declared storage has; a page without it falls back quietly.
 */
export declare const THEME_KEY = "kehikot.theme";
export type PageTheme = 'light' | 'dark';
/**
 * The two backgrounds a page paints before its stylesheet exists: the
 * `--background` token at each end of the palette every scaffolded module
 * ships. A module with a different palette passes its own to `pageDocument`.
 */
export declare const PAGE_BACKGROUND: Record<PageTheme, string>;
