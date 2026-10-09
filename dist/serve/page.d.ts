import type { Build } from '../build.js';
import { type PageTheme } from '../page.js';
/**
 * The document a module serves at `/app`, built per process so the write ticket and the build can
 * be printed into it. `doors()` runs it through Vite's `transformIndexHtml`.
 *
 * It paints a themed background before any script of the module's has run: two colours inline and
 * one blocking script that decides the theme — `?theme=` on the address, else what the host said
 * last time (`THEME_KEY`), else the system's when nothing frames the page and `FRAMED_DEFAULT_THEME`
 * when something does. See docs/module-plumbing.md.
 */
export interface PageOptions {
    /** The document title. */
    title: string;
    /** This process's write ticket. Omit for a page that never writes. */
    ticket?: string | null;
    /** This process's build, printed beside the ticket so the page can tell when its server has changed. */
    build?: Build | null;
    /** The module script. Default `/src/main.tsx`. */
    entry?: string;
    /** Default `en`. */
    lang?: string;
    /** The page background at each end of the palette, when it is not the scaffold's. */
    background?: Partial<Record<PageTheme, string>>;
    /** Extra markup for the end of `<head>` (fonts, a meta). Trusted: it is written as given. */
    head?: string;
}
/**
 * What a framed page paints when nothing has told it a theme: the host's own default, which is
 * dark whatever the system prefers. Leaving the frame unpainted is not an option — measured in
 * WebKit, a framed document that has started loading its modules is an opaque white rectangle.
 */
export declare const FRAMED_DEFAULT_THEME: PageTheme;
/** The blocking script. It cannot import, so the names it needs are written into it; nothing in it throws. */
export declare function themeScript(): string;
export declare function pageDocument(options: PageOptions): string;
