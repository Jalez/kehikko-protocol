import { type Anchors, type EpicPart, type Narrowed } from '../parts.js';
/**
 * The parts focus as one React value: the rule, the count and the sentence. Takes whatever of the
 * context the page holds and wants nothing from the connection; a non-React page uses `anchorInFocus`,
 * `narrowToFocus`, `focusSentence` and `sameParts` from the package's root.
 */
export interface Focus {
    /** Every part of the open epic, picked or not. The same array until the list changes BY VALUE. */
    parts: readonly EpicPart[];
    /** Whether anything is picked. False is the resting state: draw the page as it always was. */
    focused: boolean;
    /** Whether one anchored thing is in front of the person. True for everything when nothing is picked. */
    inFocus: (anchor: Anchors) => boolean;
    /**
     * A list narrowed to the picked parts, and the sentence about what was left out (`''` when nothing
     * is picked). `noun` is what one item is called (`'note'`, or `['entry', 'entries']`); `keep` holds
     * on to what the person is in the middle of, as in `narrowToFocus`; `total: true` has the sentence
     * say how many items there were (`2 of 3 notes are outside …`).
     */
    narrow: <T>(items: readonly T[], anchorOf: (item: T) => Anchors, options?: {
        noun?: string | readonly [string, string];
        keep?: (item: T) => boolean;
        total?: boolean;
    }) => Narrowed<T> & {
        sentence: string;
    };
}
/**
 * `context` may be null (before the greeting) or lack `parts` (a host older than 0.29.0): both mean no
 * parts, nothing picked. The returned value changes identity only when the parts change by value or
 * the epic changes, so it is safe in a dependency list.
 */
export declare function useFocus(context: {
    parts?: readonly EpicPart[];
    epic?: string | null;
} | null | undefined): Focus;
