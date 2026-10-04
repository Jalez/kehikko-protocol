/**
 * The ref-facet vocabulary: one way for every module to say what a reference
 * IS, so that one filter reads the same in every container that offers it.
 *
 * ## Why this is in the protocol package, and why on a subpath
 *
 * References narrowed by kind and by state in a vocabulary of its own, and the
 * next module that wanted the same filter — Journeys — would have copied it,
 * and the two copies would have drifted the first time either learned a word.
 * The same choice has to mean the same thing in both containers, which is a
 * thing two modules agree on, which is what this package is for.
 *
 * It is not a shape, though. It is a handful of pure functions, and the main
 * entry is "shapes only — no I/O, no state, no decisions". So it lives at
 * `roadmap-module-protocol/facets`, apart from the wire, and a host never
 * imports it: the host still draws options it does not understand. Only the
 * modules that build the offer and apply the choice need to agree on what the
 * ids mean, and this is where they agree.
 *
 * ## Facets are data
 *
 * A facet is an id and a word. Adding one — `draft`, `unassigned` — is an entry
 * in `FACETS` and a line in `facetsOf`, not a change in every module.
 */
import { LIMITS } from './constants.js'
import type { Disposition, DispositionValue, FilterChoice, FilterGroup } from './wire.js'

/** What a reference is, as far as a filter cares: a piece of work, or a change to code. */
export type RefKind = 'issue' | 'change'
/** Where it is. `merged` only ever applies to a change. */
export type RefState = 'open' | 'closed' | 'merged'

/**
 * Every facet, and the words for it in a menu called "hide".
 *
 * Kind × state first, because "hide closed MRs/PRs, keep closed issues" is the
 * combination that made this file: a closed issue is usually finished work and
 * a closed change is usually abandoned, and the two must be separately
 * hideable. Then why a closed ref closed, from a person's mark or the
 * tracker's reason — see `dispositionOf`.
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
} as const

export type Facet = keyof typeof FACETS
export const FACET_IDS = Object.keys(FACETS) as Facet[]

/** What one module knows about one reference from its own tracker reading. */
export interface Sighting {
  kind: RefKind
  state: RefState
  /**
   * GitHub's `stateReason`, in whatever case it arrived: `COMPLETED`,
   * `NOT_PLANNED`, `DUPLICATE`, `REOPENED`. Absent where the tracker has none.
   */
  stateReason?: string | null
  /** True when a change this issue links to has merged — GitLab's sign that a closed issue was done. */
  closedByMerge?: boolean
}

/** Where the disposition being shown came from. A person's mark always wins. */
export type DispositionSource = 'person' | 'tracker'

/**
 * Why a closed reference closed, as far as the tracker says, or null.
 *
 * A DEFAULT, never a mark: a module showing it says it came from the tracker.
 * A merged change is done. GitHub's reason maps one-to-one where it has one;
 * a GitLab issue closed with a merged change under it is done. Everything else
 * closed has no reason anybody can read, and returns null — "closed, reason
 * unknown", which is a state a person is asked to settle, not one to guess.
 */
export function deriveDisposition(sighting: Sighting): DispositionValue | null {
  if (sighting.state === 'open') return null
  if (sighting.state === 'merged') return 'done'
  switch ((sighting.stateReason ?? '').toUpperCase()) {
    case 'COMPLETED':
      return 'done'
    case 'NOT_PLANNED':
      return 'wont-do'
    case 'DUPLICATE':
      return 'duplicate'
  }
  if (sighting.kind === 'issue' && sighting.closedByMerge) return 'done'
  return null
}

/** The disposition a module should show for one ref, and whose it is. */
export interface Shown {
  /** Null for a ref that is open and unmarked: there is nothing to say yet. */
  value: DispositionValue | 'unknown' | null
  source: DispositionSource | null
  /** The person's mark, when there is one, for its note, target, by and at. */
  mark: Disposition | null
}

/**
 * Put a person's mark and the tracker's reason together, the mark winning.
 *
 * `marks` is `context.dispositions`, whole; this finds the ref's own row. A
 * closed ref with neither is `unknown` with no source — the case a module
 * should flag for somebody to decide rather than count either way.
 */
export function dispositionOf(ref: string, sighting: Sighting | null, marks: readonly Disposition[]): Shown {
  const mark = marks.find((m) => m.ref === ref) ?? null
  if (mark) return { value: mark.value, source: 'person', mark }
  if (!sighting || sighting.state === 'open') return { value: null, source: null, mark: null }
  const derived = deriveDisposition(sighting)
  return derived ? { value: derived, source: 'tracker', mark: null } : { value: 'unknown', source: null, mark: null }
}

/**
 * Every facet one reference has. Kind × state always; for a closed or merged
 * ref, why it closed as well.
 */
export function facetsOf(sighting: Sighting, shown?: Pick<Shown, 'value'> | null): Facet[] {
  const facets: Facet[] = [`${sighting.kind}:${sighting.kind === 'issue' && sighting.state === 'merged' ? 'closed' : sighting.state}` as Facet]
  if (sighting.state === 'open' && !shown?.value) return facets
  const value = shown?.value ?? deriveDisposition(sighting) ?? 'unknown'
  facets.push(`closed:${value}` as Facet)
  return facets
}

export interface OfferOptions {
  /** The group's id. `hide`, so that two modules offering this group store it under the same key. */
  id?: string
  /** What the group is called in the menu. */
  label?: string
  /** Which facets to offer, in order. Every one by default. */
  facets?: readonly Facet[]
  /**
   * How many rows each facet would hide, to ride in the label — `closed
   * issues (12)`. A facet counted zero is left out unless it is currently on,
   * so a person can always switch off what they switched on.
   */
  counts?: Partial<Record<Facet, number>>
  /** What is on now, so a zero-count facet that is on stays offered. */
  hidden?: readonly string[]
}

/** The group id this vocabulary is offered under unless a module says otherwise. */
export const HIDE_GROUP = 'hide'

/** A `toggles` group offering the facets, ready to go into `roadmap.filters`. */
export function offer(options: OfferOptions = {}): FilterGroup {
  const { id = HIDE_GROUP, label = 'hide', facets = FACET_IDS, counts, hidden = [] } = options
  const chosen = facets
    .filter((facet) => !counts || (counts[facet] ?? 0) > 0 || hidden.includes(facet))
    .slice(0, LIMITS.FILTER_OPTIONS)
  /* A toggles group needs an option; with nothing to hide, offer the first
     facet uncounted rather than a group a schema would refuse. */
  const listed = chosen.length ? chosen : facets.slice(0, 1)
  return {
    id,
    label,
    kind: 'toggles',
    options: listed.map((facet) => ({
      id: facet,
      label: (counts ? `${FACETS[facet]} (${counts[facet] ?? 0})` : FACETS[facet]).slice(0, LIMITS.FILTER_LABEL),
    })),
  }
}

/**
 * The facets switched on under one toggles group, from `context.filters`.
 *
 * Anything that is not a list — nothing chosen, or a string left over from a
 * host or a version that had no toggles — is the resting state, which is
 * nothing hidden. Ids this vocabulary does not know are dropped, for the
 * reason a module drops any choice it does not recognise.
 */
export function hiddenIn(choice: FilterChoice, group: string = HIDE_GROUP): Facet[] {
  const value = Object.hasOwn(choice, group) ? choice[group] : undefined
  if (!Array.isArray(value)) return []
  return value.filter((id): id is Facet => Object.hasOwn(FACETS, id))
}

/** What survived a filter, and how many did not — so a module can say "3 hidden by the filter". */
export interface Sifted<T> {
  kept: T[]
  hidden: number
}

/**
 * Keep the rows none of whose facets are hidden.
 *
 * `facetsOfRow` is the module's own: it knows how to read a sighting off its
 * rows and where its marks are. A row that cannot be read — no sighting at all
 * — has no facets and is never hidden, because a filter that hides what it
 * cannot see is a filter that loses things silently.
 */
export function sift<T>(rows: readonly T[], hidden: readonly string[], facetsOfRow: (row: T) => readonly string[]): Sifted<T> {
  if (!hidden.length) return { kept: [...rows], hidden: 0 }
  const off = new Set(hidden)
  const kept = rows.filter((row) => !facetsOfRow(row).some((facet) => off.has(facet)))
  return { kept, hidden: rows.length - kept.length }
}

/** How many rows each facet would hide on its own, for `offer({ counts })`. */
export function countFacets<T>(rows: readonly T[], facetsOfRow: (row: T) => readonly string[]): Partial<Record<Facet, number>> {
  const counts: Partial<Record<Facet, number>> = {}
  for (const row of rows) {
    for (const facet of facetsOfRow(row)) {
      if (Object.hasOwn(FACETS, facet)) counts[facet as Facet] = (counts[facet as Facet] ?? 0) + 1
    }
  }
  return counts
}
