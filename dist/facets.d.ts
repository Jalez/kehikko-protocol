import type { Disposition, DispositionValue, FilterChoice, FilterGroup } from './wire.js';
/** What a reference is, as far as a filter cares: a piece of work, or a change to code. */
export type RefKind = 'issue' | 'change';
/** Where it is. `merged` only ever applies to a change. */
export type RefState = 'open' | 'closed' | 'merged';
/**
 * Every facet, and the words for it in a menu called "hide".
 *
 * Kind × state first, because "hide closed MRs/PRs, keep closed issues" is the
 * combination that made this file: a closed issue is usually finished work and
 * a closed change is usually abandoned, and the two must be separately
 * hideable. Then why a closed ref closed, from a person's mark or the
 * tracker's reason — see `dispositionOf`.
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
 * Why a closed reference closed, as far as the tracker says, or null.
 *
 * A DEFAULT, never a mark: a module showing it says it came from the tracker.
 * A merged change is done. GitHub's reason maps one-to-one where it has one;
 * a GitLab issue closed with a merged change under it is done. Everything else
 * closed has no reason anybody can read, and returns null — "closed, reason
 * unknown", which is a state a person is asked to settle, not one to guess.
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
 * Put a person's mark and the tracker's reason together, the mark winning.
 *
 * `marks` is `context.dispositions`, whole; this finds the ref's own row. A
 * closed ref with neither is `unknown` with no source — the case a module
 * should flag for somebody to decide rather than count either way.
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
/** A `toggles` group offering the facets, ready to go into `roadmap.filters`. */
export declare function offer(options?: OfferOptions): FilterGroup;
/**
 * The facets switched on under one toggles group, from `context.filters`.
 *
 * Anything that is not a list — nothing chosen, or a string left over from a
 * host or a version that had no toggles — is the resting state, which is
 * nothing hidden. Ids this vocabulary does not know are dropped, for the
 * reason a module drops any choice it does not recognise.
 */
export declare function hiddenIn(choice: FilterChoice, group?: string): Facet[];
/** What survived a filter, and how many did not — so a module can say "3 hidden by the filter". */
export interface Sifted<T> {
    kept: T[];
    hidden: number;
}
/**
 * Keep the rows none of whose facets are hidden.
 *
 * `facetsOfRow` is the module's own: it knows how to read a sighting off its
 * rows and where its marks are. A row that cannot be read — no sighting at all
 * — has no facets and is never hidden, because a filter that hides what it
 * cannot see is a filter that loses things silently.
 */
export declare function sift<T>(rows: readonly T[], hidden: readonly string[], facetsOfRow: (row: T) => readonly string[]): Sifted<T>;
/** How many rows each facet would hide on its own, for `offer({ counts })`. */
export declare function countFacets<T>(rows: readonly T[], facetsOfRow: (row: T) => readonly string[]): Partial<Record<Facet, number>>;
//# sourceMappingURL=facets.d.ts.map