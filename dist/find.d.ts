import { z } from 'zod';
/**
 * 2.69.0. Find: searching what a module's page shows, with one bar the host draws.
 *
 * ## Why the host draws it and the page searches
 *
 * A module is a cross-origin frame, so the host cannot read the text inside it, and a webview
 * without a native find bar (WKWebView in a desktop shell) gives the person nothing on ⌘F. So the
 * two halves are split: the host draws the bar — the same input, count, previous/next, case and
 * close for every module — and the page does the searching, because only the page can see its text.
 *
 * The host sends `kehikot.find` (`findSchema`): the query, the options and what to do — go to the
 * `first` match, the `next`, the `prev`ious, or `close` the search and clear what it marked. The page
 * answers with `kehikot.find.result` (`findResultSchema`): how many matches there are and which one
 * is current, or `unsupported` when it cannot search. Inside the page, ⌘F (Ctrl+F off a Mac) and ⌘G
 * ask the host to open its bar with `kehikot.find.open` (`findOpenSchema`), because a key pressed
 * inside a frame never reaches the host.
 *
 * The client (`connect`) does all of this for a page by itself: it catches the keys, and it searches
 * the page's visible text, marks the matches and scrolls to the current one (`client/find.ts`). A
 * page whose text is not in the DOM — a terminal, a canvas, a virtualised list — answers `onFind`
 * itself. Design notes: docs/find.md.
 */
/**
 * What a `kehikot.find` asks for. `first`: search anew and go to the first match at or after what is
 * on screen (the query or an option changed). `next` and `prev`: move from the current match,
 * wrapping at either end. `close`: the bar closed; clear every mark and forget the query.
 */
export declare const FIND_DIRECTIONS: readonly ["first", "next", "prev", "close"];
export type FindDirection = (typeof FIND_DIRECTIONS)[number];
/** The two ways a search can be narrowed. Both default to off. */
export declare const findOptionsFields: {
    /** Match letters' case exactly. Off: `Find` matches `find`. */
    caseSensitive: z.ZodDefault<z.ZodBoolean>;
    /** Match only whole words: `find` does not match inside `finder`. */
    wholeWord: z.ZodDefault<z.ZodBoolean>;
};
/** The options of one search, as a page reads them. */
export interface FindOptions {
    caseSensitive: boolean;
    wholeWord: boolean;
}
/** What a search came to: how many matches, and which is current (1-based; 0 when there are none). */
export interface FindCount {
    total: number;
    current: number;
}
/** The query, bounded: a search box, not a document. */
export declare const findQuerySchema: z.ZodString;
/** A count as it travels: whole numbers, `current` never past `total`. */
export declare const findCountFields: {
    total: z.ZodNumber;
    current: z.ZodNumber;
};
/**
 * Where every match of `query` is in `text`: `[start, end)` offsets, in order, never overlapping.
 * An empty query matches nothing. Case folds with `toLowerCase` unless `caseSensitive`; a whole word
 * is one with no letter, digit or underscore on either side. Pure, so a page's own search (a
 * terminal's buffer, a document's model) can use the same rule as the client's.
 */
export declare function findMatches(text: string, query: string, options?: Partial<FindOptions>): Array<[number, number]>;
/**
 * Which match is current after `direction`, 0-based, or -1 when there is none. `next` and `prev`
 * wrap; `first` takes `start` (the first match at or after what is on screen, 0 when the caller
 * cannot say); `close` is -1. A current index past a shrunken total is brought back inside it.
 */
export declare function stepMatch(current: number, total: number, direction: FindDirection, start?: number): number;
/**
 * The words a host draws for a result: `3 of 17`, `No results`, or nothing while the query is empty.
 * `null` from a page that cannot search: the host says that in its own words.
 */
export declare function findSaid(result: {
    total: number;
    current: number;
    unsupported?: boolean;
} | null, query: string): string;
