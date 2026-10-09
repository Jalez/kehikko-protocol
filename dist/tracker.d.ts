import { z } from 'zod';
/**
 * The shared tracker reading: what the issues, merge requests and pull requests a project names last said about
 * themselves, read once by the host and handed to every module that asks. A row is assignable to `Sighting`
 * from `/facets`. A field the tracker does not record is absent, never guessed; `null` is a fact.
 * Design notes: docs/tracker.md.
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
 * How much of a ref to read. `summary` is the row: enough to draw it, filter it and decide whether
 * it is done. `detail` adds its description, the files a change touched and who approved; it costs
 * a call per ref, so it is asked for by name, a few refs at a time.
 */
export declare const TRACKER_DETAILS: readonly ["summary", "detail"];
export type TrackerDetail = (typeof TRACKER_DETAILS)[number];
/** A change's head pipeline, in GitLab's words; GitHub's check rollup is mapped onto them. */
export declare const PIPELINE_STATES: readonly ["success", "failed", "running", "pending", "canceled", "skipped", "manual"];
export type PipelineState = (typeof PIPELINE_STATES)[number];
/**
 * Where a change's review stands. `approved`: enough approvals, or GitHub's `APPROVED`.
 * `changes-requested`: GitHub only; GitLab has no such verdict. `required`: it still needs one.
 */
export declare const REVIEW_STATES: readonly ["approved", "changes-requested", "required"];
export type ReviewState = (typeof REVIEW_STATES)[number];
/**
 * How two refs are tied together, from the side of the row carrying the link. `closes`: this change
 * says it delivers that issue. `closed-by`: the reverse, on the issue. A link is only the change's
 * own closing claim, never a mere cross-reference.
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
/** One ref, as the host last read it. Assignable to `Sighting` from `/facets`. */
export declare const trackerRowSchema: z.ZodObject<{
    /**
     * The ref this row answers for, spelled exactly as it was asked for or named in an epic (`gh#41`,
     * `!1848`, `gh:owner/repo#12`). Two spellings of one item are two rows with the same
     * `tracker`/`repo`/`number`.
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
/** One place the host reads (per source, not per tracker), and how that went last time. */
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
 * Why a ref asked for has no row. `pending`: not read yet, a read has been started; ask again when
 * `context.tracker.at` moves. `not-found`: the tracker has no such item. `no-tracker`: the spelling names no
 * tracker this project reads, or `readTrackerRef` cannot read it. `failed`: see `sources[].error`.
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
 * What `tracker.get` answers: the host's latest reading, at once, never waiting on a tracker. Refs
 * not read yet come back in `missing` as `pending` and a read is started; ask again when
 * `context.tracker.at` moves.
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
         * The ref this row answers for, spelled exactly as it was asked for or named in an epic (`gh#41`,
         * `!1848`, `gh:owner/repo#12`). Two spellings of one item are two rows with the same
         * `tracker`/`repo`/`number`.
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
 * What became of a `tracker.refresh`; all three are `ok: true`. `read`: every source asked about was read.
 * `failed`: at least one was not; its earlier rows stay. `declined`: the host would not read. Answered when the
 * read lands, so pass `within: TRACKER_REFRESH_WITHIN_MS`; a caller that times out loses nothing.
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
 * The half that travels in the context: when the reading last changed, and whether one is in flight. The
 * reading itself is not in the context; a module that declared `reacts: ['tracker']` re-asks `tracker.get` when
 * `at` moves. `{ at: null, refreshing: false }`: nothing read, nothing being read.
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
 * Read a ref spelling, or null for one this protocol does not know (a host answers it `no-tracker`). `gh#41`,
 * `gh:owner/repo#41`: GitHub issue or pull request, kind null. `gl#12`/`#12`: GitLab issue; `gl!7`/`!7`: merge
 * request; `gl:group/project#12`, `gl:group/project!7`. Short forms mean the default repository.
 */
export declare function readTrackerRef(spelling: string): TrackerRefName | null;
/**
 * The one spelling a host uses for a ref it found rather than was asked about. Short when the repository is its
 * tracker's default (`gh#41`, `#12`, `!7`), qualified otherwise (`gh:owner/repo#41`, `gl:group/project#12`). A
 * qualified spelling longer than `LIMITS.REF` is left out by the host, never clipped.
 */
export declare function spellTrackerRef(name: {
    tracker: Tracker;
    repo: string;
    kind: 'issue' | 'change';
    number: number;
    isDefault: boolean;
}): string;
//# sourceMappingURL=tracker.d.ts.map