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
/**
 * The id of the JSON island the origins that may frame a page are printed into: the same list its
 * server sends as `frame-ancestors`. The page's `connect` answers a greeting from one of them only.
 */
export declare const ORIGINS_ELEMENT = "origins";
/**
 * Whether `origin` — a `MessageEvent.origin`, an `Origin` header — is one of `sources`, each
 * written as `frame-ancestors` takes them: `http://127.0.0.1:4170`, `http://localhost:*` for any
 * port, `https://*.example.org` for any name under one, `*` for anywhere. Pure. An origin that is
 * not an address (`null`, the empty string) is among nothing but `*`.
 */
export declare function originAmong(origin: string, sources: readonly string[]): boolean;
/** How many different failures one document says, at most. Each is said once; the rest are dropped. */
export declare const PAGE_ERRORS_MAX = 5;
/** How many lines of a stack are sent: the message's and the frames nearest the throw. */
export declare const STACK_LINES = 12;
/**
 * The window property the page document's blocking script keeps what it caught in (`errorsScript`):
 * `{ list, off }`. The client reads `list` and sets `off` when it installs.
 */
export declare const PAGE_ERRORS_GLOBAL = "__kehikotPageErrors";
/** What is said for a failure that carries no words at all (`throw undefined`, a bare rejection). */
export declare const NO_MESSAGE = "An error with no message.";
/**
 * What the host draws behind a module's page, as Settings › Appearance › "Container background"
 * says: `card`, the container's own surface, or `none`, the canvas showing through. A host tells it
 * in `context.appearance.background`; absent means `card`.
 */
export declare const PAGE_BACKGROUNDS: readonly ["card", "none"];
export type PageBackground = (typeof PAGE_BACKGROUNDS)[number];
/** The attribute the client puts on the page's `<html>`: `data-kehikot-background="card" | "none"`. */
export declare const BACKGROUND_ATTR = "data-kehikot-background";
/**
 * The attribute a module puts on its outermost page element (`<div data-kehikot-page>`): it is made
 * transparent with `html`, `body` and `#root` when the background is `none`. Cards, popovers and
 * dialogs inside keep their own surfaces.
 */
export declare const PAGE_MARK = "data-kehikot-page";
/** Where a page remembers the background its host last said, beside the theme (`THEME_KEY`), for its next first paint. */
export declare const BACKGROUND_KEY = "kehikot.background";
/** A page address may say the background outright: `/app?background=none`. */
export declare const BACKGROUND_PARAM = "background";
/** The id of the style element the client adds once, holding `BACKGROUND_CSS`. */
export declare const BACKGROUND_STYLE_ID = "kehikot-background";
/**
 * What makes a page transparent when its host draws no background: `html`, `body`, `#root` and the
 * element marked `PAGE_MARK`, and nothing inside them. Unlayered and `!important`, so a page-level
 * utility class (`bg-background` on `body`, in a Tailwind layer) or an inline style does not paint
 * over it. A module that needs an opaque surface for legibility keeps one under
 * `html[data-kehikot-background="card"]` (or on an element inside the marked one).
 */
export declare const BACKGROUND_CSS: string;
/** The background a context says, `card` when it says none (a host before 2.82.0) or one this package does not know. */
export declare function backgroundOf(context: {
    appearance?: {
        background?: string;
    } | null;
} | null | undefined): PageBackground;
