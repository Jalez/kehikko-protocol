/**
 * Citations: which exact words of which file a piece of writing rests on,
 * written down as one line and found again.
 *
 * Two modules cite a paper this way — a slide and a quiz question — and they
 * have to agree to the character, because a person edits both files by hand
 * and an agent reads the same four answers from each. So the line's syntax and
 * the rule for "found" are here, once.
 *
 * ## The line
 *
 * `[^1]: <project-relative path> | "<exact words>"`, and a `[^1]` in the text
 * is the place that rests on it. By the words, not by byte offsets: words
 * survive edits above them, and when they do not, the citation can SAY it is
 * adrift rather than quietly point at whatever moved into its bytes.
 *
 * ## Why whitespace is not significant, and nothing else is forgiven
 *
 * A paper's source wraps its sentences wherever its editor did, and a quote is
 * one line. So a run of whitespace in the quote matches any run of whitespace
 * in the file, and that is the only latitude. Forgiving more — case,
 * punctuation, LaTeX markup — would let a quote match words the paper no
 * longer says, which is the one failure a citation exists to make visible.
 *
 * ## The four answers
 *
 * - `holds`: the words are in the file exactly once. The range is where.
 * - `ambiguous`: they are in it more than once. The range is the first, and
 *   the fix is a longer quote; a citation that could mean two places means
 *   neither.
 * - `adrift`: they are not in it. The paper changed under the citation.
 * - `unreadable`: the file is not there, or not inside the project.
 *
 * ## What is not here
 *
 * Reading the file. Every function takes the file's TEXT (or `null` for a file
 * that could not be read), so nothing in this package opens anything: a module
 * reads the cited file behind its own fence and hands the text in. Which is
 * also why every rule here is a unit test.
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
/** What looking for a source's words in its file came to. See the four answers above. */
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
 * Why a source cannot be written as a source line, or null when it can. The
 * path must be relative, inside the project and hold no `|`; the quote is one
 * line. A reading of the strings: the module that opens the file keeps its own
 * fence.
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