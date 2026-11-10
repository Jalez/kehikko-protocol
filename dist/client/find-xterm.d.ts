import type { FindAnswer, FindAsk } from './connect.js';
import type { FindCount } from '../find.js';
/**
 * 2.74.0. Find in a terminal: the host's find bar over an xterm.js emulator's screen AND its
 * scrollback, which only the emulator holds — its rows are drawn to a canvas, not text in the page,
 * so the client's own search (`pageFind`) finds nothing there. `@xterm/addon-search` does the
 * searching, marks every match with a decoration and the current one with another, and says the
 * count (`onDidChangeResults`); `xtermFind` is the one layer between it and `onFind`, so every
 * module that frames a terminal searches it the same way.
 *
 * The protocol takes no xterm dependency: the addon and the terminal are read through the few
 * members used here (`XtermSearch`, `XtermSelectable`), which `SearchAddon` and `Terminal` have.
 */
/** The marks' colours, in the addon's own words (`ISearchDecorationOptions`): xterm paints them and does not read the page's CSS. */
export interface XtermFindDecorations {
    matchBackground?: string;
    matchBorder?: string;
    matchOverviewRuler: string;
    activeMatchBackground?: string;
    activeMatchBorder?: string;
    activeMatchColorOverviewRuler: string;
}
/** The options a search is run with (`ISearchOptions`). */
export interface XtermSearchOptions {
    caseSensitive?: boolean;
    wholeWord?: boolean;
    regex?: boolean;
    incremental?: boolean;
    decorations?: XtermFindDecorations;
}
/** What of `@xterm/addon-search`'s `SearchAddon` a search needs. Load the addon into a terminal made with `allowProposedApi: true`: its marks are decorations. */
export interface XtermSearch {
    findNext(term: string, options?: XtermSearchOptions): boolean;
    findPrevious(term: string, options?: XtermSearchOptions): boolean;
    clearDecorations(): void;
    onDidChangeResults(listener: (event: {
        resultIndex: number;
        resultCount: number;
    }) => void): {
        dispose(): void;
    };
}
/** What of the emulator a search needs besides the addon: taking its selection (the current match) away on close. */
export interface XtermSelectable {
    clearSelection(): void;
}
export interface XtermFindOptions {
    /**
     * A count that changed by itself under an open search — new output arrived — to say to the host:
     * `findResult` from `useHost`, `hostStore` or the connection. A count a search asked for is
     * returned instead, never said twice.
     */
    onCount?: (count: FindCount) => void;
    /** The theme the marks are drawn for, read at each search (so a theme change takes effect on the next one). Light by default. */
    theme?: () => 'light' | 'dark';
    /** Colours of the page's own, read at each search, in place of `xtermFindColours(theme())`. */
    decorations?: () => XtermFindDecorations;
}
/** An `onFind` listener for one terminal, and `dispose` to stop hearing its counts when the terminal goes. */
export type XtermFind = ((query: string, ask: FindAsk) => FindAnswer) & {
    dispose(): void;
};
/** The marks' default colours for a theme: the same yellow and orange as the client's own page search. */
export declare function xtermFindColours(theme: 'light' | 'dark'): XtermFindDecorations;
/**
 * `xtermFind(search, terminal, options?)`: the `onFind` for a terminal. `first` searches as a query
 * is typed (keeping the match it is on while that still matches), `next` and `prev` step and wrap,
 * case and whole words narrow it, `close` (or an empty query) clears every mark and the selection.
 * The whole buffer is searched, scrollback included.
 */
export declare function xtermFind(search: XtermSearch, terminal: XtermSelectable, options?: XtermFindOptions): XtermFind;
/**
 * 2.74.0. A place for whichever search is on screen now — a module that shows one of several
 * terminals, or none yet. `onFind` is steady, for `useHost`; whoever is on screen sets `current`
 * (it is a ref, so a React `useRef` slot can be handed to a view as one) and clears it when it goes.
 * With nothing in it the bar is told `unsupported`, and a close is nothing.
 */
export interface FindSlot {
    current: ((query: string, ask: FindAsk) => FindAnswer | Promise<FindAnswer>) | null;
    readonly onFind: (query: string, ask: FindAsk) => FindAnswer | Promise<FindAnswer>;
}
export declare function findSlot(): FindSlot;
