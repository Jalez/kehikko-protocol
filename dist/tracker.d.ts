import { z } from 'zod';
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
export declare const TRACKERS: readonly ["github", "gitlab"];
export type Tracker = (typeof TRACKERS)[number];
/**
 * A piece of work, or a change to code. The same two words `facets.ts` uses,
 * and spelled again here rather than imported, because the main entry does not
 * reach into a subpath; the test file holds the two in step.
 */
export declare const TRACKER_KINDS: readonly ["issue", "change"];
/** Where it is. `merged` only ever applies to a change. */
export declare const TRACKER_STATES: readonly ["open", "closed", "merged"];
/**
 * How much of a ref to read.
 *
 * `summary` is the row: enough to draw it, filter it and decide whether it is
 * done. `detail` adds what you need to READ it — its description, the files a
 * change touched, who approved — which costs a call per ref, so it is asked for
 * by name, a few refs at a time, by a module such as Checklist that checks
 * content.
 */
export declare const TRACKER_DETAILS: readonly ["summary", "detail"];
export type TrackerDetail = (typeof TRACKER_DETAILS)[number];
/** A change's head pipeline, in GitLab's words; GitHub's check rollup is mapped onto them. */
export declare const PIPELINE_STATES: readonly ["success", "failed", "running", "pending", "canceled", "skipped", "manual"];
export type PipelineState = (typeof PIPELINE_STATES)[number];
/**
 * Where a change's review stands.
 *
 * `approved` — enough approvals, or GitHub's `APPROVED`. `changes-requested` —
 * GitHub only; GitLab has no such verdict. `required` — it still needs one.
 */
export declare const REVIEW_STATES: readonly ["approved", "changes-requested", "required"];
export type ReviewState = (typeof REVIEW_STATES)[number];
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
export declare const LINK_RELATIONS: readonly ["closes", "closed-by"];
export type LinkRelation = (typeof LINK_RELATIONS)[number];
export declare const trackerLinkSchema: z.ZodObject<{
    /** The other ref, spelled the way `spellTrackerRef` spells it. */
    ref: z.ZodString;
    relation: z.ZodEnum<["closes", "closed-by"]>;
}, "strip", z.ZodTypeAny, {
    ref: string;
    relation: "closes" | "closed-by";
}, {
    ref: string;
    relation: "closes" | "closed-by";
}>;
export type TrackerLink = z.infer<typeof trackerLinkSchema>;
/** One file a change touched. Counts are absent where the tracker did not say. */
export declare const trackerFileSchema: z.ZodObject<{
    path: z.ZodString;
    additions: z.ZodOptional<z.ZodNumber>;
    deletions: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    path: string;
    additions?: number | undefined;
    deletions?: number | undefined;
}, {
    path: string;
    additions?: number | undefined;
    deletions?: number | undefined;
}>;
export type TrackerFile = z.infer<typeof trackerFileSchema>;
/**
 * What `detail: 'detail'` adds. Present on a row only when it was asked for
 * and has been read; a summary row has no `detail` at all, which is not the
 * same as a detail with an empty body.
 */
export declare const trackerDetailSchema: z.ZodObject<{
    /** The description, as written. Clipped at `TRACKER_BODY`, and `bodyClipped` says so. */
    body: z.ZodDefault<z.ZodString>;
    bodyClipped: z.ZodDefault<z.ZodBoolean>;
    /** For a change: the files it touches. Empty for an issue. */
    files: z.ZodDefault<z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        additions: z.ZodOptional<z.ZodNumber>;
        deletions: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        additions?: number | undefined;
        deletions?: number | undefined;
    }, {
        path: string;
        additions?: number | undefined;
        deletions?: number | undefined;
    }>, "many">>;
    /** More files than `TRACKER_FILES` were touched, and the list stops there. */
    filesClipped: z.ZodDefault<z.ZodBoolean>;
    /** For a change: the commit the pipeline and the review are about. */
    headSha: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** For a change: who approved it, by name. */
    approvedBy: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** When this detail was read, which may be earlier than the row's `readAt`. */
    readAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    body: string;
    bodyClipped: boolean;
    files: {
        path: string;
        additions?: number | undefined;
        deletions?: number | undefined;
    }[];
    filesClipped: boolean;
    readAt: string;
    headSha?: string | null | undefined;
    approvedBy?: string[] | undefined;
}, {
    readAt: string;
    body?: string | undefined;
    bodyClipped?: boolean | undefined;
    files?: {
        path: string;
        additions?: number | undefined;
        deletions?: number | undefined;
    }[] | undefined;
    filesClipped?: boolean | undefined;
    headSha?: string | null | undefined;
    approvedBy?: string[] | undefined;
}>;
export type TrackerDetailFacts = z.infer<typeof trackerDetailSchema>;
/**
 * One ref, as the host last read it.
 *
 * Assignable to `Sighting` from `/facets`, on purpose — see the essay at the
 * top of this file.
 */
export declare const trackerRowSchema: z.ZodObject<{
    /**
     * The ref this row answers for, spelled exactly as it was asked for or named
     * in an epic — `gh#41`, `!1848`, `gh:owner/repo#12`. A module looks its own
     * string up and finds its own string; two spellings of one item are two rows
     * with the same `tracker`/`repo`/`number`.
     */
    ref: z.ZodString;
    tracker: z.ZodEnum<["github", "gitlab"]>;
    /** The tracker's host: `github.com`, `gitlab.com`, `gitlab.example.org`. */
    host: z.ZodString;
    /** `owner/repo` on GitHub, the full project path on GitLab. */
    repo: z.ZodString;
    number: z.ZodNumber;
    kind: z.ZodEnum<["issue", "change"]>;
    state: z.ZodEnum<["open", "closed", "merged"]>;
    title: z.ZodString;
    url: z.ZodString;
    /**
     * GitHub's `stateReason` on an issue, as GitHub spells it: `COMPLETED`,
     * `NOT_PLANNED`, `DUPLICATE`, `REOPENED`. Absent where the tracker has none —
     * every GitLab row and every change. `deriveDisposition` reads it.
     */
    stateReason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /**
     * On an issue: whether a change that says it closes this one has merged —
     * GitLab's sign that a closed issue was done. Absent when nothing read says
     * either way.
     */
    closedByMerge: z.ZodOptional<z.ZodBoolean>;
    /** On a change: whether it is marked draft. */
    draft: z.ZodOptional<z.ZodBoolean>;
    labels: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    assignees: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    author: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    createdAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    updatedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** Null on something still open; absent when the tracker did not say. */
    closedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    mergedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    links: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** The other ref, spelled the way `spellTrackerRef` spells it. */
        ref: z.ZodString;
        relation: z.ZodEnum<["closes", "closed-by"]>;
    }, "strip", z.ZodTypeAny, {
        ref: string;
        relation: "closes" | "closed-by";
    }, {
        ref: string;
        relation: "closes" | "closed-by";
    }>, "many">>;
    /** On a change: its head pipeline. Absent on issues and where none ran or none was read. */
    pipeline: z.ZodOptional<z.ZodEnum<["success", "failed", "running", "pending", "canceled", "skipped", "manual"]>>;
    /** On a change: where its review stands. */
    review: z.ZodOptional<z.ZodEnum<["approved", "changes-requested", "required"]>>;
    /** When the host read this row. A scoped refresh moves some rows and not others. */
    readAt: z.ZodString;
    detail: z.ZodOptional<z.ZodObject<{
        /** The description, as written. Clipped at `TRACKER_BODY`, and `bodyClipped` says so. */
        body: z.ZodDefault<z.ZodString>;
        bodyClipped: z.ZodDefault<z.ZodBoolean>;
        /** For a change: the files it touches. Empty for an issue. */
        files: z.ZodDefault<z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            additions: z.ZodOptional<z.ZodNumber>;
            deletions: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            additions?: number | undefined;
            deletions?: number | undefined;
        }, {
            path: string;
            additions?: number | undefined;
            deletions?: number | undefined;
        }>, "many">>;
        /** More files than `TRACKER_FILES` were touched, and the list stops there. */
        filesClipped: z.ZodDefault<z.ZodBoolean>;
        /** For a change: the commit the pipeline and the review are about. */
        headSha: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        /** For a change: who approved it, by name. */
        approvedBy: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** When this detail was read, which may be earlier than the row's `readAt`. */
        readAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        body: string;
        bodyClipped: boolean;
        files: {
            path: string;
            additions?: number | undefined;
            deletions?: number | undefined;
        }[];
        filesClipped: boolean;
        readAt: string;
        headSha?: string | null | undefined;
        approvedBy?: string[] | undefined;
    }, {
        readAt: string;
        body?: string | undefined;
        bodyClipped?: boolean | undefined;
        files?: {
            path: string;
            additions?: number | undefined;
            deletions?: number | undefined;
        }[] | undefined;
        filesClipped?: boolean | undefined;
        headSha?: string | null | undefined;
        approvedBy?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    number: number;
    host: string;
    ref: string;
    readAt: string;
    tracker: "github" | "gitlab";
    repo: string;
    kind: "issue" | "change";
    state: "open" | "closed" | "merged";
    title: string;
    url: string;
    labels: string[];
    assignees: string[];
    links: {
        ref: string;
        relation: "closes" | "closed-by";
    }[];
    detail?: {
        body: string;
        bodyClipped: boolean;
        files: {
            path: string;
            additions?: number | undefined;
            deletions?: number | undefined;
        }[];
        filesClipped: boolean;
        readAt: string;
        headSha?: string | null | undefined;
        approvedBy?: string[] | undefined;
    } | undefined;
    stateReason?: string | null | undefined;
    closedByMerge?: boolean | undefined;
    draft?: boolean | undefined;
    author?: string | null | undefined;
    createdAt?: string | null | undefined;
    updatedAt?: string | null | undefined;
    closedAt?: string | null | undefined;
    mergedAt?: string | null | undefined;
    pipeline?: "success" | "failed" | "running" | "pending" | "canceled" | "skipped" | "manual" | undefined;
    review?: "approved" | "changes-requested" | "required" | undefined;
}, {
    number: number;
    host: string;
    ref: string;
    readAt: string;
    tracker: "github" | "gitlab";
    repo: string;
    kind: "issue" | "change";
    state: "open" | "closed" | "merged";
    title: string;
    url: string;
    detail?: {
        readAt: string;
        body?: string | undefined;
        bodyClipped?: boolean | undefined;
        files?: {
            path: string;
            additions?: number | undefined;
            deletions?: number | undefined;
        }[] | undefined;
        filesClipped?: boolean | undefined;
        headSha?: string | null | undefined;
        approvedBy?: string[] | undefined;
    } | undefined;
    stateReason?: string | null | undefined;
    closedByMerge?: boolean | undefined;
    draft?: boolean | undefined;
    labels?: string[] | undefined;
    assignees?: string[] | undefined;
    author?: string | null | undefined;
    createdAt?: string | null | undefined;
    updatedAt?: string | null | undefined;
    closedAt?: string | null | undefined;
    mergedAt?: string | null | undefined;
    links?: {
        ref: string;
        relation: "closes" | "closed-by";
    }[] | undefined;
    pipeline?: "success" | "failed" | "running" | "pending" | "canceled" | "skipped" | "manual" | undefined;
    review?: "approved" | "changes-requested" | "required" | undefined;
}>;
export type TrackerRow = z.infer<typeof trackerRowSchema>;
/**
 * One place the host reads, and how that went last time.
 *
 * Per source rather than per tracker, because "GitLab failed" is less use than
 * "gitlab.example.org could not be reached" when a project reads two GitLab
 * hosts, and because freshness is a fact about one read.
 */
export declare const trackerSourceSchema: z.ZodObject<{
    tracker: z.ZodEnum<["github", "gitlab"]>;
    host: z.ZodString;
    repo: z.ZodString;
    /**
     * Short spellings — `gh#41`, `gl#12`, `!7` — resolve to the default source of
     * their tracker. A project has at most one default per tracker.
     */
    default: z.ZodDefault<z.ZodBoolean>;
    /** Whether its recent issues and changes are listed, beyond the refs somebody named. */
    listed: z.ZodDefault<z.ZodBoolean>;
    /** When this source was last read successfully. Null if it never has been. */
    at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /**
     * Why the last read of this source failed, in a sentence a person can act
     * on, or null. A failure never blanks the rows the source last gave: they
     * stay, with their own `readAt`, and this says why they are not newer.
     */
    error: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    refreshing: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    at: string | null;
    host: string;
    tracker: "github" | "gitlab";
    repo: string;
    default: boolean;
    listed: boolean;
    error: string | null;
    refreshing: boolean;
}, {
    host: string;
    tracker: "github" | "gitlab";
    repo: string;
    at?: string | null | undefined;
    default?: boolean | undefined;
    listed?: boolean | undefined;
    error?: string | null | undefined;
    refreshing?: boolean | undefined;
}>;
export type TrackerSource = z.infer<typeof trackerSourceSchema>;
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
export declare const MISSING_REASONS: readonly ["pending", "not-found", "no-tracker", "failed"];
export type MissingReason = (typeof MISSING_REASONS)[number];
export declare const trackerMissingSchema: z.ZodObject<{
    ref: z.ZodString;
    reason: z.ZodEnum<["pending", "not-found", "no-tracker", "failed"]>;
}, "strip", z.ZodTypeAny, {
    ref: string;
    reason: "failed" | "pending" | "not-found" | "no-tracker";
}, {
    ref: string;
    reason: "failed" | "pending" | "not-found" | "no-tracker";
}>;
export type TrackerMissing = z.infer<typeof trackerMissingSchema>;
/**
 * What `tracker.get` answers.
 *
 * Answered from the host's latest reading, at once. The host never makes a
 * module wait on a tracker to answer this: what it has not read yet comes back
 * in `missing` as `pending`, a read is started, and the context says when it
 * lands. A module therefore draws what it was given, marks what is pending, and
 * asks again when `context.tracker.at` moves.
 */
export declare const trackerReadingResult: z.ZodObject<{
    /** When the reading last changed. Null when nothing has ever been read for this project. */
    at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /** Whether a read is in flight for this project right now. */
    refreshing: z.ZodDefault<z.ZodBoolean>;
    sources: z.ZodDefault<z.ZodArray<z.ZodObject<{
        tracker: z.ZodEnum<["github", "gitlab"]>;
        host: z.ZodString;
        repo: z.ZodString;
        /**
         * Short spellings — `gh#41`, `gl#12`, `!7` — resolve to the default source of
         * their tracker. A project has at most one default per tracker.
         */
        default: z.ZodDefault<z.ZodBoolean>;
        /** Whether its recent issues and changes are listed, beyond the refs somebody named. */
        listed: z.ZodDefault<z.ZodBoolean>;
        /** When this source was last read successfully. Null if it never has been. */
        at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        /**
         * Why the last read of this source failed, in a sentence a person can act
         * on, or null. A failure never blanks the rows the source last gave: they
         * stay, with their own `readAt`, and this says why they are not newer.
         */
        error: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        refreshing: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        at: string | null;
        host: string;
        tracker: "github" | "gitlab";
        repo: string;
        default: boolean;
        listed: boolean;
        error: string | null;
        refreshing: boolean;
    }, {
        host: string;
        tracker: "github" | "gitlab";
        repo: string;
        at?: string | null | undefined;
        default?: boolean | undefined;
        listed?: boolean | undefined;
        error?: string | null | undefined;
        refreshing?: boolean | undefined;
    }>, "many">>;
    rows: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /**
         * The ref this row answers for, spelled exactly as it was asked for or named
         * in an epic — `gh#41`, `!1848`, `gh:owner/repo#12`. A module looks its own
         * string up and finds its own string; two spellings of one item are two rows
         * with the same `tracker`/`repo`/`number`.
         */
        ref: z.ZodString;
        tracker: z.ZodEnum<["github", "gitlab"]>;
        /** The tracker's host: `github.com`, `gitlab.com`, `gitlab.example.org`. */
        host: z.ZodString;
        /** `owner/repo` on GitHub, the full project path on GitLab. */
        repo: z.ZodString;
        number: z.ZodNumber;
        kind: z.ZodEnum<["issue", "change"]>;
        state: z.ZodEnum<["open", "closed", "merged"]>;
        title: z.ZodString;
        url: z.ZodString;
        /**
         * GitHub's `stateReason` on an issue, as GitHub spells it: `COMPLETED`,
         * `NOT_PLANNED`, `DUPLICATE`, `REOPENED`. Absent where the tracker has none —
         * every GitLab row and every change. `deriveDisposition` reads it.
         */
        stateReason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        /**
         * On an issue: whether a change that says it closes this one has merged —
         * GitLab's sign that a closed issue was done. Absent when nothing read says
         * either way.
         */
        closedByMerge: z.ZodOptional<z.ZodBoolean>;
        /** On a change: whether it is marked draft. */
        draft: z.ZodOptional<z.ZodBoolean>;
        labels: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        assignees: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        author: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        createdAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        updatedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        /** Null on something still open; absent when the tracker did not say. */
        closedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        mergedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        links: z.ZodDefault<z.ZodArray<z.ZodObject<{
            /** The other ref, spelled the way `spellTrackerRef` spells it. */
            ref: z.ZodString;
            relation: z.ZodEnum<["closes", "closed-by"]>;
        }, "strip", z.ZodTypeAny, {
            ref: string;
            relation: "closes" | "closed-by";
        }, {
            ref: string;
            relation: "closes" | "closed-by";
        }>, "many">>;
        /** On a change: its head pipeline. Absent on issues and where none ran or none was read. */
        pipeline: z.ZodOptional<z.ZodEnum<["success", "failed", "running", "pending", "canceled", "skipped", "manual"]>>;
        /** On a change: where its review stands. */
        review: z.ZodOptional<z.ZodEnum<["approved", "changes-requested", "required"]>>;
        /** When the host read this row. A scoped refresh moves some rows and not others. */
        readAt: z.ZodString;
        detail: z.ZodOptional<z.ZodObject<{
            /** The description, as written. Clipped at `TRACKER_BODY`, and `bodyClipped` says so. */
            body: z.ZodDefault<z.ZodString>;
            bodyClipped: z.ZodDefault<z.ZodBoolean>;
            /** For a change: the files it touches. Empty for an issue. */
            files: z.ZodDefault<z.ZodArray<z.ZodObject<{
                path: z.ZodString;
                additions: z.ZodOptional<z.ZodNumber>;
                deletions: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                path: string;
                additions?: number | undefined;
                deletions?: number | undefined;
            }, {
                path: string;
                additions?: number | undefined;
                deletions?: number | undefined;
            }>, "many">>;
            /** More files than `TRACKER_FILES` were touched, and the list stops there. */
            filesClipped: z.ZodDefault<z.ZodBoolean>;
            /** For a change: the commit the pipeline and the review are about. */
            headSha: z.ZodOptional<z.ZodNullable<z.ZodString>>;
            /** For a change: who approved it, by name. */
            approvedBy: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            /** When this detail was read, which may be earlier than the row's `readAt`. */
            readAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            body: string;
            bodyClipped: boolean;
            files: {
                path: string;
                additions?: number | undefined;
                deletions?: number | undefined;
            }[];
            filesClipped: boolean;
            readAt: string;
            headSha?: string | null | undefined;
            approvedBy?: string[] | undefined;
        }, {
            readAt: string;
            body?: string | undefined;
            bodyClipped?: boolean | undefined;
            files?: {
                path: string;
                additions?: number | undefined;
                deletions?: number | undefined;
            }[] | undefined;
            filesClipped?: boolean | undefined;
            headSha?: string | null | undefined;
            approvedBy?: string[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        number: number;
        host: string;
        ref: string;
        readAt: string;
        tracker: "github" | "gitlab";
        repo: string;
        kind: "issue" | "change";
        state: "open" | "closed" | "merged";
        title: string;
        url: string;
        labels: string[];
        assignees: string[];
        links: {
            ref: string;
            relation: "closes" | "closed-by";
        }[];
        detail?: {
            body: string;
            bodyClipped: boolean;
            files: {
                path: string;
                additions?: number | undefined;
                deletions?: number | undefined;
            }[];
            filesClipped: boolean;
            readAt: string;
            headSha?: string | null | undefined;
            approvedBy?: string[] | undefined;
        } | undefined;
        stateReason?: string | null | undefined;
        closedByMerge?: boolean | undefined;
        draft?: boolean | undefined;
        author?: string | null | undefined;
        createdAt?: string | null | undefined;
        updatedAt?: string | null | undefined;
        closedAt?: string | null | undefined;
        mergedAt?: string | null | undefined;
        pipeline?: "success" | "failed" | "running" | "pending" | "canceled" | "skipped" | "manual" | undefined;
        review?: "approved" | "changes-requested" | "required" | undefined;
    }, {
        number: number;
        host: string;
        ref: string;
        readAt: string;
        tracker: "github" | "gitlab";
        repo: string;
        kind: "issue" | "change";
        state: "open" | "closed" | "merged";
        title: string;
        url: string;
        detail?: {
            readAt: string;
            body?: string | undefined;
            bodyClipped?: boolean | undefined;
            files?: {
                path: string;
                additions?: number | undefined;
                deletions?: number | undefined;
            }[] | undefined;
            filesClipped?: boolean | undefined;
            headSha?: string | null | undefined;
            approvedBy?: string[] | undefined;
        } | undefined;
        stateReason?: string | null | undefined;
        closedByMerge?: boolean | undefined;
        draft?: boolean | undefined;
        labels?: string[] | undefined;
        assignees?: string[] | undefined;
        author?: string | null | undefined;
        createdAt?: string | null | undefined;
        updatedAt?: string | null | undefined;
        closedAt?: string | null | undefined;
        mergedAt?: string | null | undefined;
        links?: {
            ref: string;
            relation: "closes" | "closed-by";
        }[] | undefined;
        pipeline?: "success" | "failed" | "running" | "pending" | "canceled" | "skipped" | "manual" | undefined;
        review?: "approved" | "changes-requested" | "required" | undefined;
    }>, "many">>;
    missing: z.ZodDefault<z.ZodArray<z.ZodObject<{
        ref: z.ZodString;
        reason: z.ZodEnum<["pending", "not-found", "no-tracker", "failed"]>;
    }, "strip", z.ZodTypeAny, {
        ref: string;
        reason: "failed" | "pending" | "not-found" | "no-tracker";
    }, {
        ref: string;
        reason: "failed" | "pending" | "not-found" | "no-tracker";
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    at: string | null;
    refreshing: boolean;
    sources: {
        at: string | null;
        host: string;
        tracker: "github" | "gitlab";
        repo: string;
        default: boolean;
        listed: boolean;
        error: string | null;
        refreshing: boolean;
    }[];
    rows: {
        number: number;
        host: string;
        ref: string;
        readAt: string;
        tracker: "github" | "gitlab";
        repo: string;
        kind: "issue" | "change";
        state: "open" | "closed" | "merged";
        title: string;
        url: string;
        labels: string[];
        assignees: string[];
        links: {
            ref: string;
            relation: "closes" | "closed-by";
        }[];
        detail?: {
            body: string;
            bodyClipped: boolean;
            files: {
                path: string;
                additions?: number | undefined;
                deletions?: number | undefined;
            }[];
            filesClipped: boolean;
            readAt: string;
            headSha?: string | null | undefined;
            approvedBy?: string[] | undefined;
        } | undefined;
        stateReason?: string | null | undefined;
        closedByMerge?: boolean | undefined;
        draft?: boolean | undefined;
        author?: string | null | undefined;
        createdAt?: string | null | undefined;
        updatedAt?: string | null | undefined;
        closedAt?: string | null | undefined;
        mergedAt?: string | null | undefined;
        pipeline?: "success" | "failed" | "running" | "pending" | "canceled" | "skipped" | "manual" | undefined;
        review?: "approved" | "changes-requested" | "required" | undefined;
    }[];
    missing: {
        ref: string;
        reason: "failed" | "pending" | "not-found" | "no-tracker";
    }[];
}, {
    at?: string | null | undefined;
    refreshing?: boolean | undefined;
    sources?: {
        host: string;
        tracker: "github" | "gitlab";
        repo: string;
        at?: string | null | undefined;
        default?: boolean | undefined;
        listed?: boolean | undefined;
        error?: string | null | undefined;
        refreshing?: boolean | undefined;
    }[] | undefined;
    rows?: {
        number: number;
        host: string;
        ref: string;
        readAt: string;
        tracker: "github" | "gitlab";
        repo: string;
        kind: "issue" | "change";
        state: "open" | "closed" | "merged";
        title: string;
        url: string;
        detail?: {
            readAt: string;
            body?: string | undefined;
            bodyClipped?: boolean | undefined;
            files?: {
                path: string;
                additions?: number | undefined;
                deletions?: number | undefined;
            }[] | undefined;
            filesClipped?: boolean | undefined;
            headSha?: string | null | undefined;
            approvedBy?: string[] | undefined;
        } | undefined;
        stateReason?: string | null | undefined;
        closedByMerge?: boolean | undefined;
        draft?: boolean | undefined;
        labels?: string[] | undefined;
        assignees?: string[] | undefined;
        author?: string | null | undefined;
        createdAt?: string | null | undefined;
        updatedAt?: string | null | undefined;
        closedAt?: string | null | undefined;
        mergedAt?: string | null | undefined;
        links?: {
            ref: string;
            relation: "closes" | "closed-by";
        }[] | undefined;
        pipeline?: "success" | "failed" | "running" | "pending" | "canceled" | "skipped" | "manual" | undefined;
        review?: "approved" | "changes-requested" | "required" | undefined;
    }[] | undefined;
    missing?: {
        ref: string;
        reason: "failed" | "pending" | "not-found" | "no-tracker";
    }[] | undefined;
}>;
export type TrackerReading = z.infer<typeof trackerReadingResult>;
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
export declare const REFRESH_OUTCOMES: readonly ["read", "failed", "declined"];
export type RefreshOutcome = (typeof REFRESH_OUTCOMES)[number];
export declare const trackerRefreshResult: z.ZodObject<{
    outcome: z.ZodEnum<["read", "failed", "declined"]>;
    /** The reading's `at` after this refresh. */
    at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    at: string | null;
    outcome: "failed" | "read" | "declined";
    why: string;
}, {
    outcome: "failed" | "read" | "declined";
    at?: string | null | undefined;
    why?: string | undefined;
}>;
export type TrackerRefreshResult = z.infer<typeof trackerRefreshResult>;
/** How long to wait for a `tracker.refresh` to answer. A read of a few hundred refs over two trackers. */
export declare const TRACKER_REFRESH_WITHIN_MS = 90000;
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
export declare const trackerSignalSchema: z.ZodObject<{
    at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    refreshing: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    at: string | null;
    refreshing: boolean;
}, {
    at?: string | null | undefined;
    refreshing?: boolean | undefined;
}>;
export type TrackerSignal = z.infer<typeof trackerSignalSchema>;
/** What a ref spelling names, before anything is read. */
export interface TrackerRefName {
    tracker: Tracker;
    /** The repository it names, or null for a short spelling that means the project's default. */
    repo: string | null;
    /** `change` for `!12`, `issue` for GitLab's `#12`, null where the spelling does not say (`gh#12` is either). */
    kind: 'issue' | 'change' | null;
    number: number;
}
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
export declare function readTrackerRef(spelling: string): TrackerRefName | null;
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
export declare function spellTrackerRef(name: {
    tracker: Tracker;
    repo: string;
    kind: 'issue' | 'change';
    number: number;
    isDefault: boolean;
}): string;
//# sourceMappingURL=tracker.d.ts.map