/**
 * Citations: the `[^1]: <project-relative path> | "<exact words>"` source line, the `[^1]` marker,
 * and the rule for finding the words again. Only whitespace runs are forgiven in a match (not case,
 * punctuation or markup). Functions take the file's TEXT (`null`: unreadable); nothing here opens a file.
 * Design notes: docs/citations.md.
 */
/** One passage a text rests on: a file of the project, and its exact words there. */
export interface CitedSource {
    /** What the text's `[^label]` names. */
    label: string;
    /** Relative to the project root. */
    path: string;
    /** The passage's words as they are in the file; whitespace is not significant. */
    quote: string;
}
/**
 * What looking for a source's words in its file came to. `holds`: found exactly once. `ambiguous`: more
 * than once, the range is the first. `adrift`: not in the file. `unreadable`: no file, or outside the project.
 */
export declare const CITE_STATUSES: readonly ["holds", "ambiguous", "adrift", "unreadable"];
export type CiteStatus = (typeof CITE_STATUSES)[number];
/** Where a quote was found: UTF-8 byte offsets (what a passage carries) and 1-based lines. */
export interface CitedRange {
    from: number;
    to: number;
    line: number;
    endLine: number;
}
/**
 * A source as it was found on one read: what a server answers a page with, and
 * what a page draws. The range is looked for again every time and never
 * stored.
 */
export interface CitationView extends CitedSource {
    status: CiteStatus;
    /** Null unless the words were found. */
    at: CitedRange | null;
    /** How many times the words occur in the file. */
    count: number;
}
/**
 * A citation marker in a text: `[^label]`, not followed by `:` (which would be
 * a source line). Global, for `matchAll` and `replace`; do not `exec` or
 * `test` it, which would leave its `lastIndex` behind for the next caller.
 */
export declare const CITE_MARKER: RegExp;
/**
 * One `[^label]: path | "quote"` line, or null when it is not one. The path
 * ends at the first bar and the quote at the last quote mark, so a quote may
 * hold `|` and `"`.
 */
export declare function parseSource(line: string): CitedSource | null;
export declare function serialiseSource(source: CitedSource): string;
/**
 * Why a source cannot be written as a source line, or null when it can. The path must be relative,
 * inside the project and hold no `|`; the quote is one line. Checks the strings only, not the file.
 */
export declare function uncitable(source: Pick<CitedSource, 'path' | 'quote'>): string | null;
/** Where markers are looked for. */
export interface MarkerScan {
    /**
     * Leave Markdown code alone — fenced blocks and inline spans — so a `[^1]`
     * written inside code is shown as code and not read as a citation. For text
     * that is rendered as Markdown; off by default, for text that is not.
     */
    skipCode?: boolean;
}
/** The labels a text's markers name, in order, each once. */
export declare function markersIn(text: string, scan?: MarkerScan): string[];
/** A text with each marker replaced by what `as` makes of its label. */
export declare function replaceMarkers(text: string, as: (label: string) => string, scan?: MarkerScan): string;
/** A quote's words as they are compared: one space between runs, no ends. */
export declare function normaliseQuote(quote: string): string;
/** Where `quote` is in `file`, and how many times. The range is the first. */
export declare function findQuote(file: string, quote: string): {
    count: number;
    at: CitedRange | null;
};
/** A source, looked for in its file's text (null: the file could not be read). */
export declare function resolveSource(source: CitedSource, file: string | null): CitationView;
/** "lines 31–33" or "line 31". */
export declare function linesOf(at: Pick<CitedRange, 'line' | 'endLine'>): string;
//# sourceMappingURL=citations.d.ts.map