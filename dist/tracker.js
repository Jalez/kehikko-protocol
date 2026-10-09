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
const instant = z.string().datetime({ offset: true });
const word = z.string().max(LIMITS.TRACKER_WORD);
const person = z.string().min(1).max(LIMITS.TRACKER_PERSON);
export const trackerLinkSchema = z.object({
    /** The other ref, spelled the way `spellTrackerRef` spells it. */
    ref,
    relation: z.enum(LINK_RELATIONS),
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
    /** On a change: its head pipeline. Absent on issues and where none ran or none was read. */
    pipeline: z.enum(PIPELINE_STATES).optional(),
    /** On a change: where its review stands. */
    review: z.enum(REVIEW_STATES).optional(),
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
//# sourceMappingURL=tracker.js.map