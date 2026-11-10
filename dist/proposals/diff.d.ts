/**
 * Where two versions of a text differ, as the places a person reviews (2.71.0).
 *
 * Pure: no filesystem, no DOM, so it runs in a module's server and in its page
 * alike, and "what changed" is a test and not a paragraph. Offsets are UTF-16
 * units into the strings given.
 *
 * ## Blocks are lines, hunks are blocks tightened to words
 *
 * A paragraph of prose is often one line of a thousand characters, so a line is
 * the right unit to find WHERE two texts differ (cheap, and an anchor of equal
 * lines is a strong one) and the wrong unit to SHOW: a block is tightened by
 * the words both sides share at its front and its back, so one changed word in
 * a long line is one changed word on screen.
 *
 * This is the diff Paper reviews its `.tex` with, lifted here so every module
 * that shows a proposed change to a text file draws the same hunks.
 */
export interface Block {
    oldFrom: number;
    oldTo: number;
    newFrom: number;
    newTo: number;
}
/** A block with its texts: what leaves (`oldText`) and what arrives (`newText`). */
export interface Hunk extends Block {
    oldText: string;
    newText: string;
}
/**
 * Prose, in the units a reader compares it in: words, runs of whitespace, and
 * single characters for everything else. Punctuation is one token each rather
 * than glued to the word before it, so a comma that moved is a comma that
 * moved; whitespace is its own token so the join between two words survives.
 */
export declare function tokenize(text: string): string[];
/** The line-aligned stretches that differ, in order, as offsets into each text. */
export declare function diffBlocks(oldText: string, newText: string): Block[];
/** What differs between a base text and a proposed one, as hunks a person can read, in order. */
export declare function hunksOf(base: string, proposed: string): Hunk[];
/** `base` with the given hunks taken in: each `old` range replaced by its `new` text. The others stay as they were. */
export declare function takeHunks(base: string, hunks: readonly Hunk[]): string;
/**
 * What a text looks like with only SOME of a proposal's hunks accepted: the
 * hunks of `base` → `proposed`, those at the given indexes taken in, the rest
 * left as the base has them. The partial accept of a proposal.
 */
export declare function partOf(base: string, proposed: string, chosen: readonly number[]): string;
