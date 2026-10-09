/**
 * The ref-facet vocabulary: pure functions by which every module says what a reference is, so one
 * filter reads the same in every container. At `kehikot-module-protocol/facets`, apart from the
 * wire; a host never imports it.
 * Design notes: docs/filters.md.
 */
import { LIMITS } from './limits.js';
/**
 * Every facet, and the words for it in a menu called "hide": kind × state, then why a closed ref
 * closed, from a person's mark or the tracker's reason (see `dispositionOf`).
 */
export const FACETS = {
    'issue:open': 'open issues',
    'issue:closed': 'closed issues',
    'change:open': 'open MRs/PRs',
    'change:closed': 'closed MRs/PRs',
    'change:merged': 'merged MRs/PRs',
    'closed:done': 'done',
    'closed:wont-do': 'won’t do',
    'closed:duplicate': 'duplicates',
    'closed:superseded': 'superseded',
    'closed:unknown': 'closed, reason unknown',
};
export const FACET_IDS = Object.keys(FACETS);
/**
 * Why a closed reference closed, as far as the tracker says, or null when it gives no readable
 * reason. A default, never a mark: a module showing it says it came from the tracker. A merged
 * change is done, as is a GitLab issue closed with a merged change under it.
 */
export function deriveDisposition(sighting) {
    if (sighting.state === 'open')
        return null;
    if (sighting.state === 'merged')
        return 'done';
    switch ((sighting.stateReason ?? '').toUpperCase()) {
        case 'COMPLETED':
            return 'done';
        case 'NOT_PLANNED':
            return 'wont-do';
        case 'DUPLICATE':
            return 'duplicate';
    }
    if (sighting.kind === 'issue' && sighting.closedByMerge)
        return 'done';
    return null;
}
/**
 * Put a person's mark and the tracker's reason together, the mark winning. `marks` is
 * `context.dispositions`, whole. A closed ref with neither is `unknown` with no source: flag it
 * for somebody to decide rather than count it either way.
 */
export function dispositionOf(ref, sighting, marks) {
    const mark = marks.find((m) => m.ref === ref) ?? null;
    if (mark)
        return { value: mark.value, source: 'person', mark };
    if (!sighting || sighting.state === 'open')
        return { value: null, source: null, mark: null };
    const derived = deriveDisposition(sighting);
    return derived ? { value: derived, source: 'tracker', mark: null } : { value: 'unknown', source: null, mark: null };
}
/**
 * Every facet one reference has. Kind × state always; for a closed or merged
 * ref, why it closed as well.
 */
export function facetsOf(sighting, shown) {
    const facets = [`${sighting.kind}:${sighting.kind === 'issue' && sighting.state === 'merged' ? 'closed' : sighting.state}`];
    if (sighting.state === 'open' && !shown?.value)
        return facets;
    const value = shown?.value ?? deriveDisposition(sighting) ?? 'unknown';
    facets.push(`closed:${value}`);
    return facets;
}
/** The group id this vocabulary is offered under unless a module says otherwise. */
export const HIDE_GROUP = 'hide';
/** A `toggles` group offering the facets, ready to go into `kehikot.filters`. */
export function offer(options = {}) {
    const { id = HIDE_GROUP, label = 'hide', facets = FACET_IDS, counts, hidden = [] } = options;
    const chosen = facets
        .filter((facet) => !counts || (counts[facet] ?? 0) > 0 || hidden.includes(facet))
        .slice(0, LIMITS.FILTER_OPTIONS);
    /* A toggles group needs an option; with nothing to hide, offer the first
       facet uncounted rather than a group a schema would refuse. */
    const listed = chosen.length ? chosen : facets.slice(0, 1);
    return {
        id,
        label,
        kind: 'toggles',
        options: listed.map((facet) => ({
            id: facet,
            label: (counts ? `${FACETS[facet]} (${counts[facet] ?? 0})` : FACETS[facet]).slice(0, LIMITS.FILTER_LABEL),
        })),
    };
}
/**
 * The facets switched on under one toggles group, from `context.filters`. Anything that is not a
 * list is the resting state, nothing hidden; ids this vocabulary does not know are dropped.
 */
export function hiddenIn(choice, group = HIDE_GROUP) {
    const value = Object.hasOwn(choice, group) ? choice[group] : undefined;
    if (!Array.isArray(value))
        return [];
    return value.filter((id) => Object.hasOwn(FACETS, id));
}
/**
 * Keep the rows none of whose facets are hidden. `facetsOfRow` is the module's own reading of a
 * row; a row with no facets is never hidden.
 */
export function sift(rows, hidden, facetsOfRow) {
    if (!hidden.length)
        return { kept: [...rows], hidden: 0 };
    const off = new Set(hidden);
    const kept = rows.filter((row) => !facetsOfRow(row).some((facet) => off.has(facet)));
    return { kept, hidden: rows.length - kept.length };
}
/** How many rows each facet would hide on its own, for `offer({ counts })`. */
export function countFacets(rows, facetsOfRow) {
    const counts = {};
    for (const row of rows) {
        for (const facet of facetsOfRow(row)) {
            if (Object.hasOwn(FACETS, facet))
                counts[facet] = (counts[facet] ?? 0) + 1;
        }
    }
    return counts;
}
