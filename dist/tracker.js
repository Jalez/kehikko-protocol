import { z } from 'zod';
import { LIMITS } from './limits.js';
import { ref } from './fragments.js';
/**
 * The shared tracker reading: what the issues, merge requests and pull requests a project names last said about
 * themselves, read once by the host and handed to every module that asks. A row is assignable to `Sighting`
 * from `/facets`. A field the tracker does not record is absent, never guessed; `null` is a fact.
 * Design notes: docs/tracker.md.
 */
/** The trackers a host may read. Open to more — Jira, Gitea — by an entry here. */
export const TRACKERS = ['github', 'gitlab'];
/**
 * A piece of work, or a change to code. The same two words `facets.ts` uses,
 * and spelled again here rather than imported, because the main entry does not
 * reach into a subpath; the test file holds the two in step.
 */
export const TRACKER_KINDS = ['issue', 'change'];
/** Where it is. `merged` only ever applies to a change. */
export const TRACKER_STATES = ['open', 'closed', 'merged'];
/**
 * How much of a ref to read. `summary` is the row: enough to draw it, filter it and decide whether
 * it is done. `detail` adds its description, the files a change touched and who approved; it costs
 * a call per ref, so it is asked for by name, a few refs at a time.
 */
export const TRACKER_DETAILS = ['summary', 'detail'];
/** A change's head pipeline, in GitLab's words; GitHub's check rollup is mapped onto them. */
export const PIPELINE_STATES = ['success', 'failed', 'running', 'pending', 'canceled', 'skipped', 'manual'];
/**
 * Where a change's review stands. `approved`: enough approvals, or GitHub's `APPROVED`.
 * `changes-requested`: GitHub only; GitLab has no such verdict. `required`: it still needs one.
 */
export const REVIEW_STATES = ['approved', 'changes-requested', 'required'];
/**
 * How two refs are tied together, from the side of the row carrying the link. `closes`: this change
 * says it delivers that issue. `closed-by`: the reverse, on the issue. A link is only the change's
 * own closing claim, never a mere cross-reference.
 */
export const LINK_RELATIONS = ['closes', 'closed-by'];
/**
 * How a change is tied to an issue it is part of without closing it (2.19.0), from the side of the row
 * carrying it. `contributes-to`: this change says it is part of that issue's work ("Part of #12"), as the
 * earlier changes of work delivered in several do while only the last one closes it. `contributed-by`: the
 * reverse, on the issue. Like a link, only the change's own word: on GitHub, a cross-reference to the issue
 * made from the pull request by its author. Carried in a row's `contributions`, beside `links` and not in
 * it, so that a module built against an older copy of this package strips them instead of refusing the row.
 */
export const CONTRIBUTION_RELATIONS = ['contributes-to', 'contributed-by'];
/** What the row at the other end of a relation carries: `closes` and `closed-by`, `contributes-to` and `contributed-by`. (2.19.0) */
export const RELATION_MIRRORS = {
    closes: 'closed-by',
    'closed-by': 'closes',
    'contributes-to': 'contributed-by',
    'contributed-by': 'contributes-to',
};
/** A relation's mirror: `closes` for `closed-by`, `contributed-by` for `contributes-to`, and back. (2.19.0) */
export function mirrorRelation(relation) {
    return RELATION_MIRRORS[relation];
}
/**
 * What kind of GitLab work item an issue is, when it is not a plain issue (2.11.0): GitLab's
 * `Issue.type` (GraphQL enum `IssueType`) in lower case, `ISSUE` left out. `task` is a task (a
 * child of an issue), `incident` an incident, `test_case` a test case, `requirement` a requirement,
 * `objective` and `key_result` the OKR types, `epic` a work-item epic, `ticket` a Service Desk
 * ticket. GitHub has no such types.
 */
export const WORK_ITEM_TYPES = ['task', 'incident', 'test_case', 'requirement', 'objective', 'key_result', 'epic', 'ticket'];
const instant = z.string().datetime({ offset: true });
const word = z.string().max(LIMITS.TRACKER_WORD);
const person = z.string().min(1).max(LIMITS.TRACKER_PERSON);
export const trackerLinkSchema = z.object({
    /** The other ref, spelled the way `spellTrackerRef` spells it. */
    ref,
    relation: z.enum(LINK_RELATIONS),
});
/** One change an issue is part-delivered by, or one issue a change is part of. (2.19.0) */
export const trackerContributionSchema = z.object({
    /** The other ref, spelled the way `spellTrackerRef` spells it. */
    ref,
    relation: z.enum(CONTRIBUTION_RELATIONS),
});
/** One file a change touched. Counts are absent where the tracker did not say. */
export const trackerFileSchema = z.object({
    path: z.string().min(1).max(LIMITS.PATH),
    additions: z.number().int().min(0).optional(),
    deletions: z.number().int().min(0).optional(),
});
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
});
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
});
/**
 * Where one reviewer of a change stands (2.7.0). `requested`: asked and not yet reviewed (a GitHub
 * review request, a GitLab reviewer who has not approved). `approved`, `changes` (GitHub's
 * `CHANGES_REQUESTED`) and `commented` are their latest review.
 */
export const REVIEWER_STATES = ['requested', 'approved', 'changes', 'commented'];
/**
 * The person's roles on a row, worked out by the host from who the person is on that row's tracker
 * (2.7.0). `reviewer-asked`: asked to review and not done; `reviewer-done`: has reviewed. Being
 * mentioned in a comment is not a role.
 */
export const MY_ROLES = ['reviewer-asked', 'reviewer-done', 'author', 'assignee'];
/** One reviewer of a change, by login. `name` is the display name when the tracker gave one. (2.7.0) */
export const trackerReviewerSchema = z.object({
    login: person,
    name: person.optional(),
    state: z.enum(REVIEWER_STATES),
});
/** A change's review discussions: those that can be resolved, counted by whether they are. (2.7.0) */
export const trackerDiscussionsSchema = z.object({
    resolved: z.number().int().min(0),
    unresolved: z.number().int().min(0),
});
/**
 * What the latest activity on an item was (2.8.0). `comment`: a comment or a review note; `review`: a
 * review submitted or an approval; `commit`: a commit pushed to a change; `state`: opened, closed,
 * reopened or merged.
 */
export const LAST_ACTIVITY_KINDS = ['comment', 'review', 'commit', 'state'];
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
});
const branch = z.string().min(1).max(LIMITS.BRANCH);
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
});
/**
 * Whether a string is an `https:` URL. An avatar is drawn by a module's page from wherever the
 * tracker keeps it, so nothing but `https:` is carried: no `http:`, no `data:`, no `javascript:`. (2.10.0)
 */
export function isHttpsUrl(value) {
    try {
        return new URL(value).protocol === 'https:';
    }
    catch {
        return false;
    }
}
/** A person's picture: an absolute `https:` URL, at most `LIMITS.URL` long. (2.10.0) */
export const avatarUrlSchema = z
    .string()
    .max(LIMITS.URL)
    .refine(isHttpsUrl, { message: 'An avatar is an absolute https: URL.' });
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
});
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
    /**
     * The refs tied to this one without closing it (2.19.0): on an issue, `contributed-by` each change that
     * says it is part of the issue's work; on a change, `contributes-to` each issue it says so of, mirrored
     * by the host from the issues its reading holds. A ref already in `links` is not here. Absent when the
     * host read none (an older host, or a tracker it does not read them from); empty when it read and there
     * are none.
     */
    contributions: z.array(trackerContributionSchema).max(LIMITS.TRACKER_LINKS).optional(),
    /** On a change: its head pipeline. Absent on issues and where none ran or none was read. */
    pipeline: z.enum(PIPELINE_STATES).optional(),
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
    /** When the host read this row. A scoped refresh moves some rows and not others. */
    readAt: instant,
    detail: trackerDetailSchema.optional(),
});
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
});
/**
 * Why a ref asked for has no row. `pending`: not read yet, a read has been started; ask again when
 * `context.tracker.at` moves. `not-found`: the tracker has no such item. `no-tracker`: the spelling names no
 * tracker this project reads, or `readTrackerRef` cannot read it. `failed`: see `sources[].error`.
 */
export const MISSING_REASONS = ['pending', 'not-found', 'no-tracker', 'failed'];
export const trackerMissingSchema = z.object({
    ref,
    reason: z.enum(MISSING_REASONS),
});
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
});
/**
 * What became of a `tracker.refresh`; all three are `ok: true`. `read`: every source asked about was read.
 * `failed`: at least one was not; its earlier rows stay. `declined`: the host would not read. Answered when the
 * read lands, so pass `within: TRACKER_REFRESH_WITHIN_MS`; a caller that times out loses nothing.
 */
export const REFRESH_OUTCOMES = ['read', 'failed', 'declined'];
export const trackerRefreshResult = z.object({
    outcome: z.enum(REFRESH_OUTCOMES),
    /** The reading's `at` after this refresh. */
    at: instant.nullable().default(null),
    why: z.string().max(LIMITS.REASON).default(''),
});
/** One board of the project, with its columns in board order. See `tracker.columns`. (2.6.0) */
export const trackerBoardSchema = z.object({
    board: z.string().min(1).max(LIMITS.TITLE),
    boardUrl: z.string().max(LIMITS.URL).optional(),
    /** The columns, left to right as the board shows them. */
    columns: z.array(z.string().min(1).max(LIMITS.TRACKER_LABEL)).max(LIMITS.TRACKER_COLUMNS).default([]),
});
/**
 * What `tracker.columns` answers: the boards of the project's sources and their columns, from the
 * host's reading. Empty when the project has no board or the host could not read them. (2.6.0)
 */
export const trackerColumnsResult = z.object({
    boards: z.array(trackerBoardSchema).max(LIMITS.TRACKER_BOARDS).default([]),
});
/** How long to wait for a `tracker.refresh` to answer. A read of a few hundred refs over two trackers. */
export const TRACKER_REFRESH_WITHIN_MS = 90_000;
/**
 * The half that travels in the context: when the reading last changed, and whether one is in flight. The
 * reading itself is not in the context; a module that declared `reacts: ['tracker']` re-asks `tracker.get` when
 * `at` moves. `{ at: null, refreshing: false }`: nothing read, nothing being read.
 */
export const trackerSignalSchema = z.object({
    at: instant.nullable().default(null),
    refreshing: z.boolean().default(false),
});
const NUMBER = '([1-9][0-9]{0,9})';
const REPO = '([A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)+)';
const SPELLINGS = [
    { re: new RegExp(`^gh#${NUMBER}$`), read: (m) => ({ tracker: 'github', repo: null, kind: null, number: +m[1] }) },
    { re: new RegExp(`^gh:${REPO}#${NUMBER}$`), read: (m) => ({ tracker: 'github', repo: m[1], kind: null, number: +m[2] }) },
    { re: new RegExp(`^(?:gl)?#${NUMBER}$`), read: (m) => ({ tracker: 'gitlab', repo: null, kind: 'issue', number: +m[1] }) },
    { re: new RegExp(`^(?:gl)?!${NUMBER}$`), read: (m) => ({ tracker: 'gitlab', repo: null, kind: 'change', number: +m[1] }) },
    { re: new RegExp(`^gl:${REPO}#${NUMBER}$`), read: (m) => ({ tracker: 'gitlab', repo: m[1], kind: 'issue', number: +m[2] }) },
    { re: new RegExp(`^gl:${REPO}!${NUMBER}$`), read: (m) => ({ tracker: 'gitlab', repo: m[1], kind: 'change', number: +m[2] }) },
];
/**
 * Read a ref spelling, or null for one this protocol does not know (a host answers it `no-tracker`). `gh#41`,
 * `gh:owner/repo#41`: GitHub issue or pull request, kind null. `gl#12`/`#12`: GitLab issue; `gl!7`/`!7`: merge
 * request; `gl:group/project#12`, `gl:group/project!7`. Short forms mean the default repository.
 */
export function readTrackerRef(spelling) {
    if (spelling.length > LIMITS.REF)
        return null;
    for (const { re, read } of SPELLINGS) {
        const m = re.exec(spelling);
        if (m)
            return read(m);
    }
    return null;
}
/**
 * The one spelling a host uses for a ref it found rather than was asked about. Short when the repository is its
 * tracker's default (`gh#41`, `#12`, `!7`), qualified otherwise (`gh:owner/repo#41`, `gl:group/project#12`). A
 * qualified spelling longer than `LIMITS.REF` is left out by the host, never clipped.
 */
export function spellTrackerRef(name) {
    if (name.tracker === 'github')
        return name.isDefault ? `gh#${name.number}` : `gh:${name.repo}#${name.number}`;
    const mark = name.kind === 'change' ? '!' : '#';
    return name.isDefault ? `${mark}${name.number}` : `gl:${name.repo}${mark}${name.number}`;
}
