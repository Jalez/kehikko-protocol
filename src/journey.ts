import { z } from 'zod'
import { LIMITS } from './limits.js'
import { EPIC_SLUG, slugFrom } from './ids.js'
import { PART_ID, partFile } from './parts.js'

/**
 * An epic's steps and groups as a project keeps them, in the Journeys module's file a host reads.
 * Journeys owns the steps, the groups and the prose; a host owns the slug, the title and existence.
 * Every object is `.passthrough()` and nothing is bounded; shapes only, no I/O.
 * Design notes: docs/parts.md.
 */

/**
 * The module that keeps the record, and the file it keeps it in:
 * `moduleFile(projectPath, JOURNEYS_MODULE, JOURNEYS_FILE)` is `<project>/.kehikot/journeys/journeys.json`.
 */
export const JOURNEYS_MODULE = 'kehikot.journeys'
export const JOURNEYS_FILE = 'journeys'

const ref = z.string().min(1)

/**
 * One step. `part` is the id of the part the step was assigned to; a plain string, not a `PART_ID`,
 * so one mistyped `part` does not make the record unreadable. Read it with `stepPart`.
 */
export const journeyStepSchema = z
  .object({
    title: z.string().min(1),
    body: z.string().default(''),
    /** Issues and changes that deliver this step. */
    refs: z.array(ref).default([]),
    /** Free-text chips for work with no ticket. */
    notes: z.array(z.string()).default([]),
    /** The part this step was assigned to. Absent means the epic as a whole. */
    part: z.string().optional(),
  })
  .passthrough()
export type JourneyStep = z.infer<typeof journeyStepSchema>

/**
 * One group: a heading and the references under it; a host reads it as a part of the epic. `id` is
 * what a step's `part` and a stored focus name; optional, and derived from the heading when absent.
 * `id` and `files` are plain strings: a mistyped one costs that name, not the record.
 */
export const journeyGroupSchema = z
  .object({
    heading: z.string().default(''),
    refs: z.array(ref).default([]),
    id: z.string().optional(),
    /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
    files: z.array(z.string()).optional(),
  })
  .passthrough()
export type JourneyGroup = z.infer<typeof journeyGroupSchema>

/**
 * Where an epic's steps are, when they are not in the record (a paper's sections, say). Such a record
 * carries `"steps": []`, which does not mean there are none; read it with `stepsOf`.
 */
export const stepsFromSchema = z
  .object({
    /** What does the projecting. `paper` is the only one there has been. */
    projector: z.string().min(1),
    /** Where the source is, as a person would go and look at it. */
    where: z.string().min(1),
    /** Said on screen, in the record's own words. */
    why: z.string().default(''),
  })
  .passthrough()
export type StepsFrom = z.infer<typeof stepsFromSchema>

/** The record for one epic. `slug` is the epic's slug: the same name as the host's `epic`. */
export const journeyRecordSchema = z
  .object({
    slug: z.string().regex(EPIC_SLUG),
    title: z.string().min(1),
    /** The one-line answer to "what is this about". */
    lede: z.string().default(''),
    /** The product this belongs to, as a person would name it. */
    project: z.string().optional(),
    /** The tracking issue that stands for the whole of it. */
    umbrella: z.string().optional(),
    steps: z.array(journeyStepSchema).default([]),
    /** See `stepsFromSchema`. Absent means the steps here are the steps. */
    stepsFrom: stepsFromSchema.optional(),
    groups: z.array(journeyGroupSchema).default([]),
    /** "What already exists". Counted, with `steps` and `open`, for an epic's size. */
    exists: z.array(z.string()).default([]),
    /** "Still open". */
    open: z.array(z.string()).default([]),
  })
  .passthrough()
export type JourneyRecord = z.infer<typeof journeyRecordSchema>

/**
 * The whole file: every record in one project, keyed by slug. What a writer checks before it saves;
 * a reader uses `journeyIn` instead. A document with a later `version` is opened, not refused.
 */
export const journeysDocumentSchema = z
  .object({
    version: z.number().int().min(1).default(1),
    journeys: z.record(z.string(), journeyRecordSchema).default({}),
  })
  .passthrough()
export type JourneysDocument = z.infer<typeof journeysDocumentSchema>

/**
 * The record for one epic out of a parsed document, or null; never throws. Null for a non-document, a
 * slug that is not a slug, no own record under it, a record that will not parse, or one whose `slug`
 * differs from its key. Only that one record is parsed, so another epic's bad record costs nothing here.
 */
export function journeyIn(document: unknown, slug: string): JourneyRecord | null {
  if (typeof slug !== 'string' || !EPIC_SLUG.test(slug)) return null
  if (!document || typeof document !== 'object' || Array.isArray(document)) return null
  const journeys = (document as { journeys?: unknown }).journeys
  if (!journeys || typeof journeys !== 'object' || Array.isArray(journeys)) return null
  if (!Object.hasOwn(journeys, slug)) return null
  const parsed = journeyRecordSchema.safeParse((journeys as Record<string, unknown>)[slug])
  if (!parsed.success || parsed.data.slug !== slug) return null
  return parsed.data
}

/** Every slug a parsed document has a readable record under, sorted. */
export function journeySlugs(document: unknown): string[] {
  if (!document || typeof document !== 'object' || Array.isArray(document)) return []
  const journeys = (document as { journeys?: unknown }).journeys
  if (!journeys || typeof journeys !== 'object' || Array.isArray(journeys)) return []
  return Object.keys(journeys)
    .filter((slug) => journeyIn(document, slug) !== null)
    .sort()
}

/**
 * What a record says about its steps: `stored` (they are here; `alsoProjected` set when a paper also
 * projects some), `elsewhere` (there are steps this reader cannot see; never "none"), or `none`.
 * Read `stepsOf(record)`, never `record.steps`, wherever the answer is shown or counted.
 */
export type JourneySteps =
  | { kind: 'stored'; steps: JourneyStep[]; alsoProjected: StepsFrom | null }
  | { kind: 'elsewhere'; from: StepsFrom }
  | { kind: 'none' }

export function stepsOf(record: Pick<JourneyRecord, 'steps' | 'stepsFrom'>): JourneySteps {
  if (record.steps.length) return { kind: 'stored', steps: record.steps, alsoProjected: record.stepsFrom ?? null }
  if (record.stepsFrom) return { kind: 'elsewhere', from: record.stepsFrom }
  return { kind: 'none' }
}

/**
 * The part a step says it is in, or null: anything that is not a `PART_ID` is no assignment. Whether
 * the epic still has that part is `partInFocus`'s question.
 */
export function stepPart(step: unknown): string | null {
  if (!step || typeof step !== 'object') return null
  const part = (step as { part?: unknown }).part
  return typeof part === 'string' && PART_ID.test(part) ? part : null
}

/**
 * One part of an epic, as read off the epic's record: `EpicPart`'s `id`, `heading` and `refs` without
 * `picked`, plus a count of the steps that say they are in the part.
 */
export interface JourneyPart {
  id: string
  heading: string
  /** The refs listed under the heading, and the refs of the steps assigned here. */
  refs: string[]
  /** How many steps say they are in this part. */
  steps: number
  /**
   * The files of the epic's paper this part owns, in `partFile`'s form. Absent, not `[]`, when the
   * group names none; read it as `part.files ?? []`.
   */
  files?: string[]
}

/** Files out of whatever a group holds under `files`: each in `partFile`'s form, once each, bounded. */
function filesIn(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const one of raw) {
    const file = partFile(one)
    if (file === null || out.includes(file)) continue
    out.push(file)
    if (out.length >= LIMITS.PART_FILES) break
  }
  return out
}

/** Refs out of whatever a file holds under `refs`: short non-empty strings, once each. */
function refsIn(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const one of raw) {
    if (typeof one !== 'string') continue
    const ref = one.trim()
    if (!ref || ref.length > LIMITS.REF || out.includes(ref)) continue
    out.push(ref)
  }
  return out
}

/**
 * The id of each group's part, by position: `ids[i]` is for `groups[i]`, null where the entry is not an
 * object or is past `LIMITS.PARTS`; `[]` for a non-array. A written `id` in `PART_ID`'s class is used,
 * else `slugFrom(heading)`, else `part-<n>` (position from one); duplicates get `-2`, `-3` in order.
 */
export function partIdsOf(groups: unknown): (string | null)[] {
  if (!Array.isArray(groups)) return []
  const ids: (string | null)[] = []
  const taken = new Set<string>()
  groups.forEach((group, index) => {
    if (taken.size >= LIMITS.PARTS || !group || typeof group !== 'object') {
      ids.push(null)
      return
    }
    const { id: written, heading: said } = group as { id?: unknown; heading?: unknown }
    const heading = typeof said === 'string' ? said.trim().slice(0, LIMITS.TITLE) : ''
    const wanted =
      typeof written === 'string' && PART_ID.test(written) ? written : slugFrom(heading) || `part-${index + 1}`
    let id = wanted
    for (let n = 2; taken.has(id); n += 1) id = `${wanted.slice(0, 76)}-${n}`
    taken.add(id)
    ids.push(id)
  })
  return ids
}

/**
 * Every part an epic has, in the record's order; takes anything, never throws, `[]` for a non-record.
 * A step is in a part only because its `part` names it; its refs are folded in after the listed ones.
 * Bounded by `LIMITS.PARTS`, `PART_REFS`, `PART_FILES`, `TITLE`, `REF`; an empty heading becomes the id.
 */
export function partsOf(record: unknown): JourneyPart[] {
  if (!record || typeof record !== 'object') return []
  const { groups, steps } = record as { groups?: unknown; steps?: unknown }
  if (!Array.isArray(groups)) return []

  const parts: JourneyPart[] = []
  partIdsOf(groups).forEach((id, index) => {
    if (id === null) return
    const { heading: said, refs, files } = groups[index] as { heading?: unknown; refs?: unknown; files?: unknown }
    const heading = typeof said === 'string' ? said.trim().slice(0, LIMITS.TITLE) : ''
    const part: JourneyPart = { id, heading: heading || id, refs: refsIn(refs), steps: 0 }
    const owned = filesIn(files)
    if (owned.length) part.files = owned
    parts.push(part)
  })

  /* The steps that say which part they are in bring their refs with them. */
  if (Array.isArray(steps)) {
    const byId = new Map(parts.map((part) => [part.id, part]))
    for (const step of steps) {
      const assigned = stepPart(step)
      const part = assigned === null ? undefined : byId.get(assigned)
      if (!part) continue
      part.steps += 1
      for (const ref of refsIn((step as { refs?: unknown }).refs)) {
        if (!part.refs.includes(ref)) part.refs.push(ref)
      }
    }
  }
  for (const part of parts) part.refs = part.refs.slice(0, LIMITS.PART_REFS)
  return parts
}
