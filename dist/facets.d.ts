import type { Disposition, DispositionValue, FilterChoice, FilterGroup } from './wire.js';
/** What a reference is, as far as a filter cares: a piece of work, or a change to code. */
export type RefKind = 'issue' | 'change';
/** Where it is. `merged` only ever applies to a change. */
export type RefState = 'open' | 'closed' | 'merged';
/**
 * Every facet, and the words for it in a menu called "hide": kind × state, then why a closed ref
 * closed, from a person's mark or the tracker's reason (see `dispositionOf`).
 */
export declare const FACETS: {
    readonly 'issue:open': "open issues";
    readonly 'issue:closed': "closed issues";
    readonly 'change:open': "open MRs/PRs";
    readonly 'change:closed': "closed MRs/PRs";
    readonly 'change:merged': "merged MRs/PRs";
    readonly 'closed:done': "done";
    readonly 'closed:wont-do': "won’t do";
    readonly 'closed:duplicate': "duplicates";
    readonly 'closed:superseded': "superseded";
    readonly 'closed:unknown': "closed, reason unknown";
};
export type Facet = keyof typeof FACETS;
export declare const FACET_IDS: Facet[];
/** What one module knows about one reference from its own tracker reading. */
export interface Sighting {
    kind: RefKind;
    state: RefState;
    /**
     * GitHub's `stateReason`, in whatever case it arrived: `COMPLETED`,
     * `NOT_PLANNED`, `DUPLICATE`, `REOPENED`. Absent where the tracker has none.
     */
    stateReason?: string | null;
    /** True when a change this issue links to has merged — GitLab's sign that a closed issue was done. */
    closedByMerge?: boolean;
}
/** Where the disposition being shown came from. A person's mark always wins. */
export type DispositionSource = 'person' | 'tracker';
/**
 * Why a closed reference closed, as far as the tracker says, or null when it gives no readable
 * reason. A default, never a mark: a module showing it says it came from the tracker. A merged
 * change is done, as is a GitLab issue closed with a merged change under it.
 */
export declare function deriveDisposition(sighting: Sighting): DispositionValue | null;
/** The disposition a module should show for one ref, and whose it is. */
export interface Shown {
    /** Null for a ref that is open and unmarked: there is nothing to say yet. */
    value: DispositionValue | 'unknown' | null;
    source: DispositionSource | null;
    /** The person's mark, when there is one, for its note, target, by and at. */
    mark: Disposition | null;
}
/**
 * Put a person's mark and the tracker's reason together, the mark winning. `marks` is
 * `context.dispositions`, whole. A closed ref with neither is `unknown` with no source: flag it
 * for somebody to decide rather than count it either way.
 */
export declare function dispositionOf(ref: string, sighting: Sighting | null, marks: readonly Disposition[]): Shown;
/**
 * Every facet one reference has. Kind × state always; for a closed or merged
 * ref, why it closed as well.
 */
export declare function facetsOf(sighting: Sighting, shown?: Pick<Shown, 'value'> | null): Facet[];
export interface OfferOptions {
    /** The group's id. `hide`, so that two modules offering this group store it under the same key. */
    id?: string;
    /** What the group is called in the menu. */
    label?: string;
    /** Which facets to offer, in order. Every one by default. */
    facets?: readonly Facet[];
    /**
     * How many rows each facet would hide, to ride in the label — `closed
     * issues (12)`. A facet counted zero is left out unless it is currently on,
     * so a person can always switch off what they switched on.
     */
    counts?: Partial<Record<Facet, number>>;
    /** What is on now, so a zero-count facet that is on stays offered. */
    hidden?: readonly string[];
}
/** The group id this vocabulary is offered under unless a module says otherwise. */
export declare const HIDE_GROUP = "hide";
/** A `toggles` group offering the facets, ready to go into `kehikot.filters`. */
export declare function offer(options?: OfferOptions): FilterGroup;
/**
 * The facets switched on under one toggles group, from `context.filters`. Anything that is not a
 * list is the resting state, nothing hidden; ids this vocabulary does not know are dropped.
 */
export declare function hiddenIn(choice: FilterChoice, group?: string): Facet[];
/** What survived a filter, and how many did not — so a module can say "3 hidden by the filter". */
export interface Sifted<T> {
    kept: T[];
    hidden: number;
}
/**
 * Keep the rows none of whose facets are hidden. `facetsOfRow` is the module's own reading of a
 * row; a row with no facets is never hidden.
 */
export declare function sift<T>(rows: readonly T[], hidden: readonly string[], facetsOfRow: (row: T) => readonly string[]): Sifted<T>;
/** How many rows each facet would hide on its own, for `offer({ counts })`. */
export declare function countFacets<T>(rows: readonly T[], facetsOfRow: (row: T) => readonly string[]): Partial<Record<Facet, number>>;
