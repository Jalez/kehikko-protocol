import { z } from 'zod'
import { LIMITS } from './constants.js'

/**
 * The shared tracker reading: what the issues, merge requests and pull requests
 * a project names last said about themselves, read ONCE by the host and handed
 * to every module that asks.
 *
 * ## Why this is the protocol's business now
 *
 * Every module that showed a ref used to get its state its own way. Journeys
 * asked `live.get`, which reads a file nothing in Kehikot writes; References
 * ran its own `gh`, so it saw GitHub and nothing else; Checklist could not read
 * a ref at all. Three readings of three ages, two of them blind to GitLab, and
 * no press anywhere that refreshed what a person was looking at. The same
 * `#2274` could be open in one container and closed in the one beside it, and
 * both would be telling the truth about a different moment.
 *
 * So the reading moves to the host, which holds the person's logged-in CLIs and
 * is the only party that can read once for everybody, and this file is the
 * shape it hands over. Unlike `epic.get` — a host's own material, unspecified
 * on purpose — this answer IS specified, and the reason is the whole point of
 * it: two modules showing one ref must agree on what its state is, and they can
 * only agree if they read the same fields with the same meanings. See
 * `methodResults` in `methods.ts`.
 *
 * ## A row is a `Sighting`
 *
 * `kehikot-module-protocol/facets` reads a `Sighting` — `kind`, `state`,
 * `stateReason`, `closedByMerge` — and a row here carries exactly those fields
 * under exactly those names. A module hands a row straight to `facetsOf(row)`
 * and `dispositionOf(row.ref, row, context.dispositions)`; there is no mapping
 * to write and so no mapping to get wrong. The test that holds this is a type
 * assignment, in `test/tracker.test.ts`.
 *
 * ## Absent, never guessed
 *
 * A tracker that does not record a thing leaves the field out. GitLab has no
 * close reason, so a GitLab row has no `stateReason`; GitHub issues have no
 * pipeline, so an issue row has no `pipeline`. `null` and absence are not
 * interchangeable here: `closedAt: null` on an open issue is a fact (it has not
 * closed), while a missing `pipeline` says nothing about whether one ran.
 */

/** The trackers a host may read. Open to more — Jira, Gitea — by an entry here. */
export const TRACKERS = ['github', 'gitlab'] as const
export type Tracker = (typeof TRACKERS)[number]

/**
 * A piece of work, or a change to code. The same two words `facets.ts` uses,
 * and spelled again here rather than imported, because the main entry does not
 * reach into a subpath; the test file holds the two in step.
 */
export const TRACKER_KINDS = ['issue', 'change'] as const
/** Where it is. `merged` only ever applies to a change. */
export const TRACKER_STATES = ['open', 'closed', 'merged'] as const

/**
 * How much of a ref to read.
 *
 * `summary` is the row: enough to draw it, filter it and decide whether it is
 * done. `detail` adds what you need to READ it — its description, the files a
 * change touched, who approved — which costs a call per ref, so it is asked for
 * by name, a few refs at a time, by a module such as Checklist that checks
 * content.
 */
export const TRACKER_DETAILS = ['summary', 'detail'] as const
export type TrackerDetail = (typeof TRACKER_DETAILS)[number]

/** A change's head pipeline, in GitLab's words; GitHub's check rollup is mapped onto them. */
export const PIPELINE_STATES = ['success', 'failed', 'running', 'pending', 'canceled', 'skipped', 'manual'] as const
export type PipelineState = (typeof PIPELINE_STATES)[number]

/**
 * Where a change's review stands.
 *
 * `approved` — enough approvals, or GitHub's `APPROVED`. `changes-requested` —
 * GitHub only; GitLab has no such verdict. `required` — it still needs one.
 */
export const REVIEW_STATES = ['approved', 'changes-requested', 'required'] as const
export type ReviewState = (typeof REVIEW_STATES)[number]

/**
 * How two refs are tied together, from the side of the row carrying the link.
 *
 * `closes` — this change says it delivers that issue: GitHub's closing
 * references, or a GitLab merge request's own description saying "Closes #12".
 * `closed-by` — the reverse, on the issue: these changes say they deliver it.
 *
 * Direction is the whole point. GitLab attaches a merge request to an issue for
 * any cross-reference either way, so an issue that cites `!1772` as prior art
 * would come back with it attached and read as work in flight. A link here is
 * only the change's own claim.
 */
export const LINK_RELATIONS = ['closes', 'closed-by'] as const
export type LinkRelation = (typeof LINK_RELATIONS)[number]

const ref = z.string().min(1).max(LIMITS.REF)
const instant = z.string().datetime({ offset: true })
const word = z.string().max(LIMITS.TRACKER_WORD)
const person = z.string().min(1).max(LIMITS.TRACKER_PERSON)

export const trackerLinkSchema = z.object({
  /** The other ref, spelled the way `spellTrackerRef` spells it. */
  ref,
  relation: z.enum(LINK_RELATIONS),
})
export type TrackerLink = z.infer<typeof trackerLinkSchema>

/** One file a change touched. Counts are absent where the tracker did not say. */
export const trackerFileSchema = z.object({
  path: z.string().min(1).max(LIMITS.PATH),
  additions: z.number().int().min(0).optional(),
  deletions: z.number().int().min(0).optional(),
})
export type TrackerFile = z.infer<typeof trackerFileSchema>

/**
 * What `detail: 'detail'` adds. Present on a row only when it was asked for
 * and has been read; a summary row has no `detail` at all, which is not the
 * same as a detail with an empty body.
 */
export const trackerDetailSchema = z.object({
  /** The description, as written. Clipped at `TRACKER_BODY`, and `bodyClipped` says so. */
  body: z.string().max(LIMITS.TRACKER_BODY).default(''),
  bodyClipped: z.boolean().default(false),
  /** For a change: the files it touches. Empty for an issue. */
  files: z.array(trackerFileSchema).max(LIMITS.TRACKER_FILES).default([]),
  /** More files than `TRACKER_FILES` were touched, and the list stops there. */
  filesClipped: z.boolean().default(false),
  /** For a change: the commit the pipeline and the review are about. */
  headSha: z.string().max(LIMITS.TRACKER_WORD).nullable().optional(),
  /** For a change: who approved it, by name. */
  approvedBy: z.array(person).max(LIMITS.TRACKER_PEOPLE).optional(),
  /** When this detail was read, which may be earlier than the row's `readAt`. */
  readAt: instant,
})
export type TrackerDetailFacts = z.infer<typeof trackerDetailSchema>

/**
 * One ref, as the host last read it.
 *
 * Assignable to `Sighting` from `/facets`, on purpose — see the essay at the
 * top of this file.
 */
export const trackerRowSchema = z.object({
  /**
   * The ref this row answers for, spelled exactly as it was asked for or named
   * in an epic — `gh#41`, `!1848`, `gh:owner/repo#12`. A module looks its own
   * string up and finds its own string; two spellings of one item are two rows
   * with the same `tracker`/`repo`/`number`.
   */
  ref,
  tracker: z.enum(TRACKERS),
  /** The tracker's host: `github.com`, `gitlab.com`, `gitlab.example.org`. */
  host: z.string().min(1).max(LIMITS.TRACKER_HOST),
  /** `owner/repo` on GitHub, the full project path on GitLab. */
  repo: z.string().min(1).max(LIMITS.TRACKER_REPO),
  number: z.number().int().positive(),
  kind: z.enum(TRACKER_KINDS),
  state: z.enum(TRACKER_STATES),
  title: z.string().max(LIMITS.TITLE),
  url: z.string().max(LIMITS.URL),
  /**
   * GitHub's `stateReason` on an issue, as GitHub spells it: `COMPLETED`,
   * `NOT_PLANNED`, `DUPLICATE`, `REOPENED`. Absent where the tracker has none —
   * every GitLab row and every change. `deriveDisposition` reads it.
   */
  stateReason: word.nullable().optional(),
  /**
   * On an issue: whether a change that says it closes this one has merged —
   * GitLab's sign that a closed issue was done. Absent when nothing read says
   * either way.
   */
  closedByMerge: z.boolean().optional(),
  /** On a change: whether it is marked draft. */
  draft: z.boolean().optional(),
  labels: z.array(z.string().min(1).max(LIMITS.TRACKER_LABEL)).max(LIMITS.TRACKER_LABELS).default([]),
  assignees: z.array(person).max(LIMITS.TRACKER_PEOPLE).default([]),
  author: person.nullable().optional(),
  createdAt: instant.nullable().optional(),
  updatedAt: instant.nullable().optional(),
  /** Null on something still open; absent when the tracker did not say. */
  closedAt: instant.nullable().optional(),
  mergedAt: instant.nullable().optional(),
  links: z.array(trackerLinkSchema).max(LIMITS.TRACKER_LINKS).default([]),
  /** On a change: its head pipeline. Absent on issues and where none ran or none was read. */
  pipeline: z.enum(PIPELINE_STATES).optional(),
  /** On a change: where its review stands. */
  review: z.enum(REVIEW_STATES).optional(),
  /** When the host read this row. A scoped refresh moves some rows and not others. */
  readAt: instant,
  detail: trackerDetailSchema.optional(),
})
export type TrackerRow = z.infer<typeof trackerRowSchema>

/**
 * One place the host reads, and how that went last time.
 *
 * Per source rather than per tracker, because "GitLab failed" is less use than
 * "gitlab.example.org could not be reached" when a project reads two GitLab
 * hosts, and because freshness is a fact about one read.
 */
export const trackerSourceSchema = z.object({
  tracker: z.enum(TRACKERS),
  host: z.string().min(1).max(LIMITS.TRACKER_HOST),
  repo: z.string().min(1).max(LIMITS.TRACKER_REPO),
  /**
   * Short spellings — `gh#41`, `gl#12`, `!7` — resolve to the default source of
   * their tracker. A project has at most one default per tracker.
   */
  default: z.boolean().default(false),
  /** Whether its recent issues and changes are listed, beyond the refs somebody named. */
  listed: z.boolean().default(false),
  /** When this source was last read successfully. Null if it never has been. */
  at: instant.nullable().default(null),
  /**
   * Why the last read of this source failed, in a sentence a person can act
   * on, or null. A failure never blanks the rows the source last gave: they
   * stay, with their own `readAt`, and this says why they are not newer.
   */
  error: z.string().max(LIMITS.REASON).nullable().default(null),
  refreshing: z.boolean().default(false),
})
export type TrackerSource = z.infer<typeof trackerSourceSchema>

/**
 * Why a ref asked for has no row.
 *
 * `pending` — not read yet. A read has been started; when it lands
 * `context.tracker.at` moves, and asking again finds it.
 * `not-found` — the tracker answered and has no such issue or change.
 * `no-tracker` — the spelling names no tracker this project reads: `gl#12` in a
 * project with no GitLab source, or a spelling `readTrackerRef` cannot read.
 * `failed` — its source's last read failed; `sources[].error` says why.
 */
export const MISSING_REASONS = ['pending', 'not-found', 'no-tracker', 'failed'] as const
export type MissingReason = (typeof MISSING_REASONS)[number]

export const trackerMissingSchema = z.object({
  ref,
  reason: z.enum(MISSING_REASONS),
})
export type TrackerMissing = z.infer<typeof trackerMissingSchema>

/**
 * What `tracker.get` answers.
 *
 * Answered from the host's latest reading, at once. The host never makes a
 * module wait on a tracker to answer this: what it has not read yet comes back
 * in `missing` as `pending`, a read is started, and the context says when it
 * lands. A module therefore draws what it was given, marks what is pending, and
 * asks again when `context.tracker.at` moves.
 */
export const trackerReadingResult = z.object({
  /** When the reading last changed. Null when nothing has ever been read for this project. */
  at: instant.nullable().default(null),
  /** Whether a read is in flight for this project right now. */
  refreshing: z.boolean().default(false),
  sources: z.array(trackerSourceSchema).max(LIMITS.TRACKER_SOURCES).default([]),
  rows: z.array(trackerRowSchema).max(LIMITS.TRACKER_ROWS).default([]),
  missing: z.array(trackerMissingSchema).max(LIMITS.TRACKER_ROWS).default([]),
})
export type TrackerReading = z.infer<typeof trackerReadingResult>

/**
 * What became of a `tracker.refresh`. An outcome, like `view.goto`'s.
 *
 * `read` — every source asked about was read. `failed` — at least one was not;
 * the rows it gave before stay, and `tracker.get` says which source and why.
 * `declined` — the host would not read: no project, nothing to read, or a host
 * that does not read trackers for frames. All three are `ok: true`; the
 * question succeeded, the reading may not have.
 *
 * Answered when the read LANDS, which may take longer than `ANSWER_WITHIN_MS`.
 * A caller passes `within: TRACKER_REFRESH_WITHIN_MS`. A caller that times out
 * anyway loses nothing: the read goes on, and `context.tracker.at` moves when it
 * lands, for this module and every other.
 */
export const REFRESH_OUTCOMES = ['read', 'failed', 'declined'] as const
export type RefreshOutcome = (typeof REFRESH_OUTCOMES)[number]

export const trackerRefreshResult = z.object({
  outcome: z.enum(REFRESH_OUTCOMES),
  /** The reading's `at` after this refresh. */
  at: instant.nullable().default(null),
  why: z.string().max(LIMITS.REASON).default(''),
})
export type TrackerRefreshResult = z.infer<typeof trackerRefreshResult>

/** How long to wait for a `tracker.refresh` to answer. A read of a few hundred refs over two trackers. */
export const TRACKER_REFRESH_WITHIN_MS = 90_000

/**
 * The small half that travels in the context: when the reading last changed,
 * and whether one is in flight.
 *
 * The reading itself is NOT in the context. Context is broadcast to every
 * framed module on every change of anything and is bounded to fit; a reading
 * is hundreds of rows with descriptions in them. So the context carries the
 * signal and `tracker.get` carries the material — and a module that declared
 * `reacts: ['tracker']` re-asks when `at` moves.
 *
 * `{ at: null, refreshing: false }` is the honest default: nothing has been
 * read, and nothing is being read — which is also what a host that has never
 * heard of tracker readings would say.
 */
export const trackerSignalSchema = z.object({
  at: instant.nullable().default(null),
  refreshing: z.boolean().default(false),
})
export type TrackerSignal = z.infer<typeof trackerSignalSchema>

/* ------------------------------------------------------------------------ *
 * Ref spellings
 * ------------------------------------------------------------------------ */

/** What a ref spelling names, before anything is read. */
export interface TrackerRefName {
  tracker: Tracker
  /** The repository it names, or null for a short spelling that means the project's default. */
  repo: string | null
  /** `change` for `!12`, `issue` for GitLab's `#12`, null where the spelling does not say (`gh#12` is either). */
  kind: 'issue' | 'change' | null
  number: number
}

const NUMBER = '([1-9][0-9]{0,9})'
const REPO = '([A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)+)'
const SPELLINGS: Array<{ re: RegExp; read: (m: RegExpExecArray) => TrackerRefName }> = [
  { re: new RegExp(`^gh#${NUMBER}$`), read: (m) => ({ tracker: 'github', repo: null, kind: null, number: +m[1]! }) },
  { re: new RegExp(`^gh:${REPO}#${NUMBER}$`), read: (m) => ({ tracker: 'github', repo: m[1]!, kind: null, number: +m[2]! }) },
  { re: new RegExp(`^(?:gl)?#${NUMBER}$`), read: (m) => ({ tracker: 'gitlab', repo: null, kind: 'issue', number: +m[1]! }) },
  { re: new RegExp(`^(?:gl)?!${NUMBER}$`), read: (m) => ({ tracker: 'gitlab', repo: null, kind: 'change', number: +m[1]! }) },
  { re: new RegExp(`^gl:${REPO}#${NUMBER}$`), read: (m) => ({ tracker: 'gitlab', repo: m[1]!, kind: 'issue', number: +m[2]! }) },
  { re: new RegExp(`^gl:${REPO}!${NUMBER}$`), read: (m) => ({ tracker: 'gitlab', repo: m[1]!, kind: 'change', number: +m[2]! }) },
]

/**
 * Read a ref spelling, or null for one this protocol does not know.
 *
 * The spellings Kehikot already writes:
 *
 * - `gh#41` — GitHub, the project's default repository. An issue or a pull
 *   request: GitHub numbers both from one sequence, so the spelling cannot say
 *   which, and the reading does.
 * - `gh:owner/repo#41` — GitHub, a named repository.
 * - `gl#12` or `#12` — a GitLab issue in the default project; `gl!7` or `!7` a
 *   merge request.
 * - `gl:group/project#12`, `gl:group/project!7` — a named GitLab project.
 *
 * A ref no rule reads comes back null and a host answers it `no-tracker`.
 */
export function readTrackerRef(spelling: string): TrackerRefName | null {
  if (spelling.length > LIMITS.REF) return null
  for (const { re, read } of SPELLINGS) {
    const m = re.exec(spelling)
    if (m) return read(m)
  }
  return null
}

/**
 * The one spelling a host uses for a ref it found rather than was asked about —
 * a row in a listing, the other end of a link. Short when the repository is the
 * default of its tracker, qualified otherwise: `gh#41`, `#12` and `!7` — the
 * spellings epics on GitLab projects already use for issues and merge requests
 * — or `gh:owner/repo#41`, `gl:group/project#12`.
 *
 * A qualified spelling can be longer than `LIMITS.REF` for a deep GitLab path.
 * A host leaves such a link out rather than clip it: a clipped ref is a
 * different ref.
 */
export function spellTrackerRef(name: {
  tracker: Tracker
  repo: string
  kind: 'issue' | 'change'
  number: number
  isDefault: boolean
}): string {
  if (name.tracker === 'github') return name.isDefault ? `gh#${name.number}` : `gh:${name.repo}#${name.number}`
  const mark = name.kind === 'change' ? '!' : '#'
  return name.isDefault ? `${mark}${name.number}` : `gl:${name.repo}${mark}${name.number}`
}
