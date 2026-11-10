import { type FindCount, type FindDirection, type FindOptions } from '../find.js';
/**
 * 2.69.0. The page client's own search, for a page whose text is in the DOM: the default answer to
 * `kehikot.find` when a page gives no `onFind`, so a module with plain text is searchable with no
 * code at all.
 *
 * It walks the visible text under the root, finds the matches with `findMatches` (a match may span
 * several text nodes: `<b>Find</b>er`), marks them with the CSS Custom Highlight API
 * (`CSS.highlights`, which changes nothing in the DOM) or, where that is missing, by wrapping each
 * match in a `<mark data-kehikot-find>`, and scrolls the current match into view. While a search is
 * open it watches the root and searches again, debounced, when the page changes, and says the new
 * count (`onRecount`) without scrolling. `close` clears every mark.
 *
 * A page whose text is not in the DOM (a terminal, a canvas, a virtualised list) answers `onFind`
 * itself; this would find nothing there. Design notes: docs/find.md.
 */
/** The names the marks are registered under in `CSS.highlights`, for a page that styles them itself. */
export declare const FIND_HIGHLIGHT = "kehikot-find";
export declare const FIND_HIGHLIGHT_CURRENT = "kehikot-find-current";
/** The attribute on a fallback `<mark>`; the current match's also carries `data-current`. */
export declare const FIND_MARK_ATTRIBUTE = "data-kehikot-find";
/** An element (and everything under it) the search skips: a page's own chrome, say. */
export declare const FIND_SKIP_ATTRIBUTE = "data-kehikot-find-skip";
/** The `<style>` the marks' colours are put in, once per document. */
export declare const FIND_STYLE_ID = "kehikot-find-style";
/** How long the page must be still before a search runs again after it changed, in milliseconds. */
export declare const FIND_RECOUNT_MS = 200;
/** At most this many matches are marked; the count says how many there are past it. */
export declare const FIND_MARK_MAX = 10000;
/** The colours, plain so every engine draws them; a page overrides them with its own rules. */
export declare const FIND_CSS = "::highlight(kehikot-find){background-color:rgba(255,213,0,.45);color:inherit}\n::highlight(kehikot-find-current){background-color:#ff9632;color:#000}\nmark[data-kehikot-find]{background-color:rgba(255,213,0,.45);color:inherit;padding:0;border-radius:0}\nmark[data-kehikot-find][data-current]{background-color:#ff9632;color:#000}";
export interface PageFindOptions {
    /** What is searched: the document's `body` by default. */
    root?: Node | null;
    /**
     * Whether an element is drawn. `checkVisibility` where the engine has it, else whether it has any
     * box; injectable so a test needs no layout.
     */
    visible?: (element: Element) => boolean;
    /**
     * `false` marks with `<mark>` even where `CSS.highlights` exists; an object is the registry and
     * constructor to use instead of the engine's. For tests, and for nobody else.
     */
    highlights?: boolean | HighlightApi;
    /** Override `FIND_RECOUNT_MS`. */
    recountAfter?: number;
}
export interface PageFind {
    /** Search (or move) and mark, scroll the current match into view, and say what it came to. */
    run: (query: string, options: FindOptions, direction: Exclude<FindDirection, 'close'>) => FindCount;
    /** Clear every mark and stop watching the page. */
    close: () => void;
}
/** What `CSS.highlights` is to the search: a registry, and the `Highlight` it holds. */
export interface HighlightApi {
    registry: {
        set: (name: string, highlight: unknown) => void;
        delete: (name: string) => void;
    };
    Highlight: new (...ranges: Range[]) => unknown;
}
/**
 * Build the page's search. Nothing is read or marked until `run`; `onRecount` hears the count
 * again when the page changed under an open search.
 */
export declare function pageFind(onRecount: (count: FindCount) => void, options?: PageFindOptions): PageFind;
