import { z } from 'zod'
import { LIMITS } from './limits.js'
import { ref } from './fragments.js'

/**
 * The shared tracker reading: what the issues, merge requests and pull requests a project names last said about
 * themselves, read once by the host and handed to every module that asks. A row is assignable to `Sighting`
 * from `/facets`. A field the tracker does not record is absent, never guessed; `null` is a fact.
 * Design notes: docs/tracker.md.
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
 * How much of a ref to read. `summary` is the row: enough to draw it, filter it and decide whether
 * it is done. `detail` adds its description, the files a change touched and who approved; it costs
 * a call per ref, so it is asked for by name, a few refs at a time.
 */
export const TRACKER_DETAILS = ['summary', 'detail'] as const
export type TrackerDetail = (typeof TRACKER_DETAILS)[number]

/** A change's head pipeline, in GitLab's words; GitHub's check rollup is mapped onto them. */
export const PIPELINE_STATES = ['success', 'failed', 'running', 'pending', 'canceled', 'skipped', 'manual'] as const
export type PipelineState = (typeof PIPELINE_STATES)[number]

/**
 * Where a change's review stands. `approved`: enough approvals, or GitHub's `APPROVED`.
 * `changes-requested`: GitHub only; GitLab has no such verdict. `required`: it still needs one.
 */
export const REVIEW_STATES = ['approved', 'changes-requested', 'required'] as const
export type ReviewState = (typeof REVIEW_STATES)[number]

/**
 * How two refs are tied together, from the side of the row carrying the link. `closes`: this change
 * says it delivers that issue. `closed-by`: the reverse, on the issue. A link is only the change's
 * own closing claim, never a mere cross-reference. A change that says it delivers PART of an issue
 * ("Part of #12") is not a link: it is in `contributes` and `contributedBy` (2.26.0), which are
 * separate fields so that a module built before them, whose schema knows only these two words, reads
 * a row from a newer host whole.
 */
export const LINK_RELATIONS = ['closes', 'closed-by'] as const
export type LinkRelation = (typeof LINK_RELATIONS)[number]

/**
 * What kind of GitLab work item an issue is, when it is not a plain issue (2.11.0): GitLab's
 * `Issue.type` (GraphQL enum `IssueType`) in lower case, `ISSUE` left out. `task` is a task (a
 * child of an issue), `incident` an incident, `test_case` a test case, `requirement` a requirement,
 * `objective` and `key_result` the OKR types, `epic` a work-item epic, `ticket` a Service Desk
 * ticket. GitHub has no such types.
 */
export const WORK_ITEM_TYPES = ['task', 'incident', 'test_case', 'requirement', 'objective', 'key_result', 'epic', 'ticket'] as const
export type WorkItemType = (typeof WORK_ITEM_TYPES)[number]

const instant = z.string().datetime({ offset: true })
const word = z.string().max(LIMITS.TRACKER_WORD)
const person = z.string().min(1).max(LIMITS.TRACKER_PERSON)

export const trackerLinkSchema = z.object({
  /** The other ref, spelled the way `spellTrackerRef` spells it. */
  ref,
  relation: z.enum(LINK_RELATIONS),
  /**
   * On a `closed-by` link (2.100.0): where the closing change stands — `open`, `merged` or `closed`
   * without merging. It is what lets an issue say "closing in !56" while that change is still open,
   * even when the change's own row is not in the reading. Absent when the host did not know (an
   * older host; a change it never read); dropped, not fatal, when it does not parse.
   */
  state: z.enum(TRACKER_STATES).optional().catch(undefined),
  /** On a `closed-by` link to an open change (2.100.0): whether that change is a draft. Absent when unknown. */
  draft: z.boolean().optional().catch(undefined),
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
 * What a comment in a ref's `detail` is (2.98.0). `comment`: a comment on the item's conversation.
 * `review`: a review submitted with words (GitHub's review body; GitLab has none apart from notes).
 * `line`: a comment on a line of a change's diff, with `path` saying which file.
 */
export const COMMENT_KINDS = ['comment', 'review', 'line'] as const
export type CommentKind = (typeof COMMENT_KINDS)[number]

/**
 * One comment on an item, as its tracker last said (2.98.0). The text is Markdown as written,
 * clipped at `LIMITS.TRACKER_COMMENT` (`bodyClipped` says so); a module renders it as text or as
 * Markdown without raw HTML, never as markup the tracker sent. A tracker's own notes about the
 * item (GitLab's system notes: "changed the description", "added 1 commit") are not comments.
 */
export const trackerCommentSchema = z.object({
  /** The tracker's id for it, as a string; unique within the item. */
  id: z.string().min(1).max(LIMITS.TRACKER_WORD),
  kind: z.enum(COMMENT_KINDS).default('comment'),
  /** Who wrote it, by login. Absent when the tracker named nobody (a deleted account). */
  login: person.optional(),
  /** Their display name, when the tracker gave one. */
  name: person.optional(),
  at: instant,
  /** When it was last edited, when the tracker says it was. */
  editedAt: instant.optional(),
  body: z.string().max(LIMITS.TRACKER_COMMENT).default(''),
  bodyClipped: z.boolean().default(false),
  /** Where a person reads it on its tracker, `https:`, when the host could spell one. */
  url: z.string().max(LIMITS.URL).optional().catch(undefined),
  /** On a `line` comment: the file of the change it is on. */
  path: z.string().max(LIMITS.PATH).optional(),
  /** On a `review`: what the review said, in `REVIEWER_STATES`' words (`approved`, `changes`, `commented`). */
  verdict: z.enum(['approved', 'changes', 'commented']).optional(),
})
export type TrackerComment = z.infer<typeof trackerCommentSchema>

/**
 * One check of a change's head commit (2.98.0): a GitHub check run or commit status, or a job of
 * a GitLab merge request's head pipeline. `state` in the same words as the row's `pipeline`.
 */
export const trackerCheckSchema = z.object({
  name: z.string().min(1).max(LIMITS.TRACKER_LABEL),
  state: z.enum(PIPELINE_STATES),
  /** Where a person sees it on its tracker, `https:`, when the host could spell one. */
  url: z.string().max(LIMITS.URL).optional().catch(undefined),
  /** When its state last moved: finished, else started, else made. */
  at: instant.optional().catch(undefined),
  /** GitLab: the stage the job is in. */
  stage: z.string().max(LIMITS.TRACKER_LABEL).optional(),
})
export type TrackerCheck = z.infer<typeof trackerCheckSchema>

/** The milestone an item is in (2.98.0). `dueOn` is a calendar date, `YYYY-MM-DD`, when it has one. */
export const trackerMilestoneSchema = z.object({
  title: z.string().min(1).max(LIMITS.TITLE),
  url: z.string().max(LIMITS.URL).optional().catch(undefined),
  dueOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .catch(undefined),
})
export type TrackerMilestone = z.infer<typeof trackerMilestoneSchema>

/**
 * Where a change from a fork comes from (2.98.0): the fork's repository and its branch. The row's
 * `headBranch` is left out for such a change, since no change here can target it; this says it.
 */
export const trackerForkSchema = z.object({
  repo: z.string().min(1).max(LIMITS.TRACKER_REPO),
  branch: z.string().min(1).max(LIMITS.BRANCH),
})
export type TrackerFork = z.infer<typeof trackerForkSchema>

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
  /**
   * The item's milestone (2.98.0). Absent when it has none or the host did not read it; an older
   * host never sends it. Dropped, not fatal, when it does not parse.
   */
  milestone: trackerMilestoneSchema.optional().catch(undefined),
  /**
   * The newest comments on the item, oldest first, at most `LIMITS.TRACKER_COMMENTS` (2.98.0):
   * its conversation, reviews with words, and on a change the comments on its lines. Absent when
   * the host did not read them; empty when there are none. Dropped, not fatal, when it does not parse.
   */
  comments: z.array(trackerCommentSchema).max(LIMITS.TRACKER_COMMENTS).optional().catch(undefined),
  /**
   * How many comments the item has in all, by the tracker's count (2.98.0). More than
   * `comments.length` when the thread is longer than what is carried; the rest is on the tracker.
   */
  commentCount: z.number().int().min(0).optional().catch(undefined),
  /**
   * For a change: the checks of its head commit, or the jobs of its head pipeline (2.98.0), in the
   * tracker's order. Absent when none ran or the host did not read them. Dropped, not fatal, when it
   * does not parse.
   */
  checks: z.array(trackerCheckSchema).max(LIMITS.TRACKER_CHECKS).optional().catch(undefined),
  /** More checks than `TRACKER_CHECKS` ran, and the list stops there. (2.98.0) */
  checksClipped: z.boolean().optional().catch(undefined),
  /** For a change from a fork: the fork and its branch (2.98.0). Absent for a change from the row's own repository. */
  fork: trackerForkSchema.optional().catch(undefined),
  /** When this detail was read, which may be earlier than the row's `readAt`. */
  readAt: instant,
})
export type TrackerDetailFacts = z.infer<typeof trackerDetailSchema>

/**
 * Where an item stands on one of the project's own boards: a GitHub Project (v2) and its Status
 * option, or a GitLab issue board and the list whose label the item carries. `board` is the
 * board's title, `name` the column. A closed item on a GitLab board is in its Closed list. (2.6.0)
 */
export const trackerColumnSchema = z.object({
  /** The column: a GitHub Project's Status option, or a GitLab board list's label (`Closed` for a closed item). */
  name: z.string().min(1).max(LIMITS.TRACKER_LABEL),
  /** The board's title: a GitHub Project v2 title, or a GitLab board name. */
  board: z.string().min(1).max(LIMITS.TITLE),
  /** Where the board is, when the tracker said. */
  boardUrl: z.string().max(LIMITS.URL).optional(),
})
export type TrackerColumn = z.infer<typeof trackerColumnSchema>

/**
 * Where one reviewer of a change stands (2.7.0). `requested`: asked and not yet reviewed (a GitHub
 * review request, a GitLab reviewer who has not approved). `approved`, `changes` (GitHub's
 * `CHANGES_REQUESTED`) and `commented` are their latest review.
 */
export const REVIEWER_STATES = ['requested', 'approved', 'changes', 'commented'] as const
export type ReviewerState = (typeof REVIEWER_STATES)[number]

/**
 * The person's roles on a row, worked out by the host from who the person is on that row's tracker
 * (2.7.0). `reviewer-asked`: asked to review and not done; `reviewer-done`: has reviewed. Being
 * mentioned in a comment is not a role.
 */
export const MY_ROLES = ['reviewer-asked', 'reviewer-done', 'author', 'assignee'] as const
export type MyRole = (typeof MY_ROLES)[number]

/** One reviewer of a change, by login. `name` is the display name when the tracker gave one. (2.7.0) */
export const trackerReviewerSchema = z.object({
  login: person,
  name: person.optional(),
  state: z.enum(REVIEWER_STATES),
  /**
   * When their latest review was submitted: the approval, the changes requested or the review that
   * made `state` (2.67.0). Absent for `requested` with no review, and where the tracker did not say.
   * Dropped, not fatal, when it does not parse.
   */
  reviewedAt: instant.optional().catch(undefined),
  /**
   * The latest thing they did on the item among what the host read (2.67.0): a comment, a note in a
   * thread, a review or an approval. A reviewer still `requested` who has commented has started.
   * Absent when the host read nothing of theirs, which is not "has done nothing": a host reads a
   * bounded number of the newest notes. Dropped, not fatal, when it does not parse.
   */
  activeAt: instant.optional().catch(undefined),
  /**
   * The unresolved review threads they started (2.67.0). Only when the host read every thread on the
   * change; absent otherwise. Dropped, not fatal, when it does not parse.
   */
  openThreads: z.number().int().min(0).optional().catch(undefined),
})
export type TrackerReviewer = z.infer<typeof trackerReviewerSchema>

/** A change's review discussions: those that can be resolved, counted by whether they are. (2.7.0) */
export const trackerDiscussionsSchema = z.object({
  resolved: z.number().int().min(0),
  unresolved: z.number().int().min(0),
})
export type TrackerDiscussions = z.infer<typeof trackerDiscussionsSchema>

/**
 * What the latest activity on an item was (2.8.0). `comment`: a comment or a review note; `review`: a
 * review submitted or an approval; `commit`: a commit pushed to a change; `state`: opened, closed,
 * reopened or merged.
 */
export const LAST_ACTIVITY_KINDS = ['comment', 'review', 'commit', 'state'] as const
export type LastActivityKind = (typeof LAST_ACTIVITY_KINDS)[number]

/**
 * The latest thing somebody did on an item, among what the host read: its opening, comments, reviews,
 * commits and state changes (2.8.0). Absent when the host did not read them or could not tell who
 * did the latest one; the host never falls back to an earlier one.
 */
export const trackerActivitySchema = z.object({
  /** Who did it, by login on the row's tracker. */
  login: person,
  at: instant,
  kind: z.enum(LAST_ACTIVITY_KINDS),
  /**
   * Whether it was the person, worked out by the host the way it works out `myRoles`. Absent when the
   * host does not know who the person is there: a module then cannot tell, and does not guess.
   */
  mine: z.boolean().optional(),
  /**
   * On `commit`: how many commits that push added, when the tracker said (2.67.0). Dropped, not
   * fatal, when it does not parse.
   */
  commits: z.number().int().min(1).optional().catch(undefined),
  /**
   * On `comment`: the file a comment on a change's diff is on, as the change spells it (2.67.0).
   * Absent for a comment on the item as a whole. Dropped, not fatal, when it does not parse.
   */
  path: z.string().min(1).max(LIMITS.PATH).optional().catch(undefined),
  /** On `comment` with a `path`: the line of the new file it is on, else of the old (2.67.0). */
  line: z.number().int().min(1).optional().catch(undefined),
  /**
   * On `review`: what the review said (2.67.0) — `approved`, `changes` requested, or `commented`.
   * The same words as a reviewer's `state`. Dropped, not fatal, when it does not parse.
   */
  verdict: z.enum(['approved', 'changes', 'commented']).optional().catch(undefined),
})
export type TrackerActivity = z.infer<typeof trackerActivitySchema>

const branch = z.string().min(1).max(LIMITS.BRANCH)

/**
 * Where a change sits in a stack of changes (2.8.0): changes in one repository, each targeting the
 * branch the one below it comes from. Worked out by the host across its reading, open changes only.
 * `below`: the open change whose head branch is this one's base. `above`: the open changes whose base
 * is this one's head branch, more than one where the stack forks. At least one of the two is there.
 * The whole stack is found by following `below` down and `above` up through the reading's rows.
 */
export const trackerStackSchema = z
  .object({
    below: ref.optional(),
    above: z.array(ref).max(LIMITS.TRACKER_LINKS).default([]),
  })
  .refine((s) => s.below !== undefined || s.above.length > 0, {
    message: 'A stack link names the change below or one above.',
  })
export type TrackerStack = z.infer<typeof trackerStackSchema>

/**
 * Whether a string is an `https:` URL. An avatar is drawn by a module's page from wherever the
 * tracker keeps it, so nothing but `https:` is carried: no `http:`, no `data:`, no `javascript:`. (2.10.0)
 */
export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

/** A person's picture: an absolute `https:` URL, at most `LIMITS.URL` long. (2.10.0) */
export const avatarUrlSchema = z
  .string()
  .max(LIMITS.URL)
  .refine(isHttpsUrl, { message: 'An avatar is an absolute https: URL.' })

/**
 * What the tracker says about one person a row names by login (2.10.0). `name`: their display name,
 * when the tracker gave one. `avatarUrl`: their picture, absolute `https:`, as the tracker serves it
 * (a host makes a relative one absolute against the tracker's host, and drops one it cannot). An
 * entry says at least one of the two.
 */
export const trackerPersonSchema = z
  .object({
    name: person.optional(),
    avatarUrl: avatarUrlSchema.optional(),
  })
  .refine((p) => p.name !== undefined || p.avatarUrl !== undefined, {
    message: 'A person entry says a name or an avatar.',
  })
export type TrackerPerson = z.infer<typeof trackerPersonSchema>

/**
 * A branch linked to an issue (2.19.0): GitHub's Development branches (`linkedBranches`), GitLab's
 * related branches (named `<iid>-…`, as GitLab's "Create branch" names them). `url` is the branch on
 * its tracker, `https:`, when the host could spell one.
 */
export const trackerBranchSchema = z.object({
  name: branch,
  url: z.string().max(LIMITS.URL).optional(),
})
export type TrackerBranch = z.infer<typeof trackerBranchSchema>

/** One ref, as the host last read it. Assignable to `Sighting` from `/facets`. */
export const trackerRowSchema = z.object({
  /**
   * The ref this row answers for, spelled exactly as it was asked for or named in an epic (`gh#41`,
   * `!1848`, `gh:owner/repo#12`). Two spellings of one item are two rows with the same
   * `tracker`/`repo`/`number`.
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
   * either way. A change that only contributes to the issue (`contributedBy`)
   * never sets it.
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
  /**
   * On a change: the issues it says it delivers part of without closing them (2.26.0) — "Part of
   * #12" or "Implements #12" in its description, or the forge listing it as related to the issue but
   * not as closing it. A mere mention is neither. Never a `closes` link, and a ref in `links` is not repeated
   * here. Absent from an older host and where nothing was read; dropped, not fatal, when it does
   * not parse.
   */
  contributes: z.array(ref).max(LIMITS.TRACKER_LINKS).optional().catch(undefined),
  /**
   * On an issue: the changes that say they deliver part of it (2.26.0), the reverse of
   * `contributes`. Their merging never makes the issue closed or `closedByMerge`: the issue is
   * done when it is closed, or when a change in `links` as `closed-by` merges. Absent from an older
   * host and where nothing was read; dropped, not fatal, when it does not parse.
   */
  contributedBy: z.array(ref).max(LIMITS.TRACKER_LINKS).optional().catch(undefined),
  /** On a change: its head pipeline. Absent on issues and where none ran or none was read. */
  pipeline: z.enum(PIPELINE_STATES).optional(),
  /**
   * On a change with a `pipeline`: where a person sees it on its tracker (2.34.0), `https:` — the
   * pipeline's own page where the tracker has one, else the change's checks page. Absent when the
   * host could not spell one; dropped, not fatal, when it does not parse.
   */
  pipelineUrl: z.string().max(LIMITS.URL).optional().catch(undefined),
  /**
   * On a change with a `pipeline`: when its state last moved (2.34.0) — when it finished, else when
   * it started, else when it was made. Absent when the tracker did not say; dropped, not fatal,
   * when it does not parse.
   */
  pipelineAt: instant.optional().catch(undefined),
  /** On a change: where its review stands. */
  review: z.enum(REVIEW_STATES).optional(),
  /**
   * Where the item stands on the project's board (2.6.0). Absent when it is on no board, when the
   * project has none, or when the host could not read boards (a GitHub token without `read:project`)
   * — absent says nothing about which. On several boards: the first of `columns`.
   */
  column: trackerColumnSchema.optional(),
  /** Every board the item is on, `column` first. Present only when it is on more than one. (2.6.0) */
  columns: z.array(trackerColumnSchema).max(LIMITS.TRACKER_BOARDS).optional(),
  /**
   * On a change: its reviewers by login, asked and done (2.7.0). Absent when the host did not read
   * them; empty when nobody was asked and nobody reviewed.
   */
  reviewers: z.array(trackerReviewerSchema).max(LIMITS.REVIEWERS).optional(),
  /** The author's login, beside `author` (which may be a display name). Null: the tracker named none. (2.7.0) */
  authorLogin: person.nullable().optional(),
  /** The assignees' logins, beside `assignees`. (2.7.0) */
  assigneeLogins: z.array(person).max(LIMITS.TRACKER_PEOPLE).optional(),
  /**
   * The person's roles on this item, worked out by the host from who they are on this row's tracker
   * (2.7.0). Absent when the host does not know who the person is there; empty when they have none.
   */
  myRoles: z
    .array(z.enum(MY_ROLES))
    .max(MY_ROLES.length)
    .refine((roles) => new Set(roles).size === roles.length, { message: 'A role is named once.' })
    .optional(),
  /** On a change: its resolvable review discussions, resolved and not. (2.7.0) */
  discussions: trackerDiscussionsSchema.optional(),
  /** On a change: when its head was last pushed, or its last commit's time where the tracker gives no push. (2.7.0) */
  lastPushAt: instant.optional(),
  /** On a change: the branch it would merge into (GitHub's base, GitLab's target). (2.8.0) */
  baseBranch: branch.optional(),
  /**
   * On a change: the branch it comes from (GitHub's head, GitLab's source), when it lives in the
   * row's own repository. Absent for a change from a fork, whose branch no change here can target. (2.8.0)
   */
  headBranch: branch.optional(),
  /**
   * On an open change: where it sits in a stack of open changes (2.8.0). Absent when it is in none, or
   * when the host did not read branches.
   */
  stack: trackerStackSchema.optional(),
  /** The latest activity on the item and who did it (2.8.0). Absent when not read or not attributable. */
  lastActivity: trackerActivitySchema.optional(),
  /**
   * The people the row names by login — `reviewers[].login`, `assigneeLogins`, `authorLogin`,
   * `lastActivity.login` — keyed by that login, with their display name and avatar where the
   * tracker gave them (2.10.0). One map for the row rather than a field beside every login. Absent
   * when the host did not read them; a login missing from it has nothing known. At most
   * `LIMITS.ROW_PEOPLE` entries.
   */
  people: z
    .record(person, trackerPersonSchema)
    .refine((m) => Object.keys(m).length <= LIMITS.ROW_PEOPLE, {
      message: `A row names at most ${LIMITS.ROW_PEOPLE} people.`,
    })
    .optional(),
  /**
   * On a GitLab issue that is a work item of another type: which (2.11.0). Absent on a plain issue,
   * on a change, on every GitHub row, on a type outside `WORK_ITEM_TYPES` (a namespace's own
   * configured type), and where the host could not read the type (an older GitLab). A module
   * that tells tasks from issues reads `workItem === 'task'`.
   */
  workItem: z.enum(WORK_ITEM_TYPES).optional(),
  /**
   * On an issue: the branches linked to it (2.19.0) — GitHub's Development branches, GitLab's
   * related branches. Absent when the host did not read them (an older host, a tracker that would
   * not say); empty when it read them and there are none. At most `LIMITS.TRACKER_BRANCHES`.
   */
  branches: z.array(trackerBranchSchema).max(LIMITS.TRACKER_BRANCHES).optional(),
  /** When the host read this row. A scoped refresh moves some rows and not others. */
  readAt: instant,
  detail: trackerDetailSchema.optional(),
})
export type TrackerRow = z.infer<typeof trackerRowSchema>

/** One place the host reads (per source, not per tracker), and how that went last time. */
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
 * Why a ref asked for has no row. `pending`: not read yet, a read has been started; ask again when
 * `context.tracker.at` moves. `not-found`: the tracker has no such item. `no-tracker`: the spelling names no
 * tracker this project reads, or `readTrackerRef` cannot read it. `failed`: see `sources[].error`.
 */
export const MISSING_REASONS = ['pending', 'not-found', 'no-tracker', 'failed'] as const
export type MissingReason = (typeof MISSING_REASONS)[number]

export const trackerMissingSchema = z.object({
  ref,
  reason: z.enum(MISSING_REASONS),
})
export type TrackerMissing = z.infer<typeof trackerMissingSchema>

/**
 * What `tracker.get` answers: the host's latest reading, at once, never waiting on a tracker. Refs
 * not read yet come back in `missing` as `pending` and a read is started; ask again when
 * `context.tracker.at` moves.
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
 * What became of a `tracker.refresh`; all three are `ok: true`. `read`: every source asked about was read.
 * `failed`: at least one was not; its earlier rows stay. `declined`: the host would not read. Answered when the
 * read lands, so pass `within: TRACKER_REFRESH_WITHIN_MS`; a caller that times out loses nothing.
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

/** One board of the project, with its columns in board order. See `tracker.columns`. (2.6.0) */
export const trackerBoardSchema = z.object({
  board: z.string().min(1).max(LIMITS.TITLE),
  boardUrl: z.string().max(LIMITS.URL).optional(),
  /** The columns, left to right as the board shows them. */
  columns: z.array(z.string().min(1).max(LIMITS.TRACKER_LABEL)).max(LIMITS.TRACKER_COLUMNS).default([]),
})
export type TrackerBoard = z.infer<typeof trackerBoardSchema>

/**
 * What `tracker.columns` answers: the boards of the project's sources and their columns, from the
 * host's reading. Empty when the project has no board or the host could not read them. (2.6.0)
 */
export const trackerColumnsResult = z.object({
  boards: z.array(trackerBoardSchema).max(LIMITS.TRACKER_BOARDS).default([]),
})
export type TrackerColumns = z.infer<typeof trackerColumnsResult>

/** How long to wait for a `tracker.refresh` to answer. A read of a few hundred refs over two trackers. */
export const TRACKER_REFRESH_WITHIN_MS = 90_000

/**
 * The half that travels in the context: when the reading last changed, and whether one is in flight. The
 * reading itself is not in the context; a module that declared `reacts: ['tracker']` re-asks `tracker.get` when
 * `at` moves. `{ at: null, refreshing: false }`: nothing read, nothing being read.
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
 * Read a ref spelling, or null for one this protocol does not know (a host answers it `no-tracker`). `gh#41`,
 * `gh:owner/repo#41`: GitHub issue or pull request, kind null. `gl#12`/`#12`: GitLab issue; `gl!7`/`!7`: merge
 * request; `gl:group/project#12`, `gl:group/project!7`. Short forms mean the default repository.
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
 * The one spelling a host uses for a ref it found rather than was asked about. Short when the repository is its
 * tracker's default (`gh#41`, `#12`, `!7`), qualified otherwise (`gh:owner/repo#41`, `gl:group/project#12`). A
 * qualified spelling longer than `LIMITS.REF` is left out by the host, never clipped.
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
