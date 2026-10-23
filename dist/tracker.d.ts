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
/**
 * What kind of GitLab work item an issue is, when it is not a plain issue (2.11.0): GitLab's
 * `Issue.type` (GraphQL enum `IssueType`) in lower case, `ISSUE` left out. `task` is a task (a
 * child of an issue), `incident` an incident, `test_case` a test case, `requirement` a requirement,
 * `objective` and `key_result` the OKR types, `epic` a work-item epic, `ticket` a Service Desk
 * ticket. GitHub has no such types.
 */
export declare const WORK_ITEM_TYPES: readonly ["task", "incident", "test_case", "requirement", "objective", "key_result", "epic", "ticket"];
export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];
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
 * Where an item stands on one of the project's own boards: a GitHub Project (v2) and its Status
 * option, or a GitLab issue board and the list whose label the item carries. `board` is the
 * board's title, `name` the column. A closed item on a GitLab board is in its Closed list. (2.6.0)
 */
export declare const trackerColumnSchema: z.ZodObject<{
    /** The column: a GitHub Project's Status option, or a GitLab board list's label (`Closed` for a closed item). */
    name: z.ZodString;
    /** The board's title: a GitHub Project v2 title, or a GitLab board name. */
    board: z.ZodString;
    /** Where the board is, when the tracker said. */
    boardUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    board: string;
    boardUrl?: string | undefined;
}, {
    name: string;
    board: string;
    boardUrl?: string | undefined;
}>;
export type TrackerColumn = z.infer<typeof trackerColumnSchema>;
/**
 * Where one reviewer of a change stands (2.7.0). `requested`: asked and not yet reviewed (a GitHub
 * review request, a GitLab reviewer who has not approved). `approved`, `changes` (GitHub's
 * `CHANGES_REQUESTED`) and `commented` are their latest review.
 */
export declare const REVIEWER_STATES: readonly ["requested", "approved", "changes", "commented"];
export type ReviewerState = (typeof REVIEWER_STATES)[number];
/**
 * The person's roles on a row, worked out by the host from who the person is on that row's tracker
 * (2.7.0). `reviewer-asked`: asked to review and not done; `reviewer-done`: has reviewed. Being
 * mentioned in a comment is not a role.
 */
export declare const MY_ROLES: readonly ["reviewer-asked", "reviewer-done", "author", "assignee"];
export type MyRole = (typeof MY_ROLES)[number];
/** One reviewer of a change, by login. `name` is the display name when the tracker gave one. (2.7.0) */
export declare const trackerReviewerSchema: z.ZodObject<{
    login: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    state: z.ZodEnum<["requested", "approved", "changes", "commented"]>;
}, "strip", z.ZodTypeAny, {
    state: "approved" | "requested" | "changes" | "commented";
    login: string;
    name?: string | undefined;
}, {
    state: "approved" | "requested" | "changes" | "commented";
    login: string;
    name?: string | undefined;
}>;
export type TrackerReviewer = z.infer<typeof trackerReviewerSchema>;
/** A change's review discussions: those that can be resolved, counted by whether they are. (2.7.0) */
export declare const trackerDiscussionsSchema: z.ZodObject<{
    resolved: z.ZodNumber;
    unresolved: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    resolved: number;
    unresolved: number;
}, {
    resolved: number;
    unresolved: number;
}>;
export type TrackerDiscussions = z.infer<typeof trackerDiscussionsSchema>;
/**
 * What the latest activity on an item was (2.8.0). `comment`: a comment or a review note; `review`: a
 * review submitted or an approval; `commit`: a commit pushed to a change; `state`: opened, closed,
 * reopened or merged.
 */
export declare const LAST_ACTIVITY_KINDS: readonly ["comment", "review", "commit", "state"];
export type LastActivityKind = (typeof LAST_ACTIVITY_KINDS)[number];
/**
 * The latest thing somebody did on an item, among what the host read: its opening, comments, reviews,
 * commits and state changes (2.8.0). Absent when the host did not read them or could not tell who
 * did the latest one; the host never falls back to an earlier one.
 */
export declare const trackerActivitySchema: z.ZodObject<{
    /** Who did it, by login on the row's tracker. */
    login: z.ZodString;
    at: z.ZodString;
    kind: z.ZodEnum<["comment", "review", "commit", "state"]>;
    /**
     * Whether it was the person, worked out by the host the way it works out `myRoles`. Absent when the
     * host does not know who the person is there: a module then cannot tell, and does not guess.
     */
    mine: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    at: string;
    login: string;
    kind: "state" | "commit" | "comment" | "review";
    mine?: boolean | undefined;
}, {
    at: string;
    login: string;
    kind: "state" | "commit" | "comment" | "review";
    mine?: boolean | undefined;
}>;
export type TrackerActivity = z.infer<typeof trackerActivitySchema>;
/**
 * Where a change sits in a stack of changes (2.8.0): changes in one repository, each targeting the
 * branch the one below it comes from. Worked out by the host across its reading, open changes only.
 * `below`: the open change whose head branch is this one's base. `above`: the open changes whose base
 * is this one's head branch, more than one where the stack forks. At least one of the two is there.
 * The whole stack is found by following `below` down and `above` up through the reading's rows.
 */
export declare const trackerStackSchema: z.ZodEffects<z.ZodObject<{
    below: z.ZodOptional<z.ZodString>;
    above: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    above: string[];
    below?: string | undefined;
}, {
    below?: string | undefined;
    above?: string[] | undefined;
}>, {
    above: string[];
    below?: string | undefined;
}, {
    below?: string | undefined;
    above?: string[] | undefined;
}>;
export type TrackerStack = z.infer<typeof trackerStackSchema>;
/**
 * Whether a string is an `https:` URL. An avatar is drawn by a module's page from wherever the
 * tracker keeps it, so nothing but `https:` is carried: no `http:`, no `data:`, no `javascript:`. (2.10.0)
 */
export declare function isHttpsUrl(value: string): boolean;
/** A person's picture: an absolute `https:` URL, at most `LIMITS.URL` long. (2.10.0) */
export declare const avatarUrlSchema: z.ZodEffects<z.ZodString, string, string>;
/**
 * What the tracker says about one person a row names by login (2.10.0). `name`: their display name,
 * when the tracker gave one. `avatarUrl`: their picture, absolute `https:`, as the tracker serves it
 * (a host makes a relative one absolute against the tracker's host, and drops one it cannot). An
 * entry says at least one of the two.
 */
export declare const trackerPersonSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    avatarUrl?: string | undefined;
}, {
    name?: string | undefined;
    avatarUrl?: string | undefined;
}>, {
    name?: string | undefined;
    avatarUrl?: string | undefined;
}, {
    name?: string | undefined;
    avatarUrl?: string | undefined;
}>;
export type TrackerPerson = z.infer<typeof trackerPersonSchema>;
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
    /**
     * Where the item stands on the project's board (2.6.0). Absent when it is on no board, when the
     * project has none, or when the host could not read boards (a GitHub token without `read:project`)
     * — absent says nothing about which. On several boards: the first of `columns`.
     */
    column: z.ZodOptional<z.ZodObject<{
        /** The column: a GitHub Project's Status option, or a GitLab board list's label (`Closed` for a closed item). */
        name: z.ZodString;
        /** The board's title: a GitHub Project v2 title, or a GitLab board name. */
        board: z.ZodString;
        /** Where the board is, when the tracker said. */
        boardUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        board: string;
        boardUrl?: string | undefined;
    }, {
        name: string;
        board: string;
        boardUrl?: string | undefined;
    }>>;
    /** Every board the item is on, `column` first. Present only when it is on more than one. (2.6.0) */
    columns: z.ZodOptional<z.ZodArray<z.ZodObject<{
        /** The column: a GitHub Project's Status option, or a GitLab board list's label (`Closed` for a closed item). */
        name: z.ZodString;
        /** The board's title: a GitHub Project v2 title, or a GitLab board name. */
        board: z.ZodString;
        /** Where the board is, when the tracker said. */
        boardUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        board: string;
        boardUrl?: string | undefined;
    }, {
        name: string;
        board: string;
        boardUrl?: string | undefined;
    }>, "many">>;
    /**
     * On a change: its reviewers by login, asked and done (2.7.0). Absent when the host did not read
     * them; empty when nobody was asked and nobody reviewed.
     */
    reviewers: z.ZodOptional<z.ZodArray<z.ZodObject<{
        login: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        state: z.ZodEnum<["requested", "approved", "changes", "commented"]>;
    }, "strip", z.ZodTypeAny, {
        state: "approved" | "requested" | "changes" | "commented";
        login: string;
        name?: string | undefined;
    }, {
        state: "approved" | "requested" | "changes" | "commented";
        login: string;
        name?: string | undefined;
    }>, "many">>;
    /** The author's login, beside `author` (which may be a display name). Null: the tracker named none. (2.7.0) */
    authorLogin: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** The assignees' logins, beside `assignees`. (2.7.0) */
    assigneeLogins: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /**
     * The person's roles on this item, worked out by the host from who they are on this row's tracker
     * (2.7.0). Absent when the host does not know who the person is there; empty when they have none.
     */
    myRoles: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodEnum<["reviewer-asked", "reviewer-done", "author", "assignee"]>, "many">, ("reviewer-asked" | "reviewer-done" | "author" | "assignee")[], ("reviewer-asked" | "reviewer-done" | "author" | "assignee")[]>>;
    /** On a change: its resolvable review discussions, resolved and not. (2.7.0) */
    discussions: z.ZodOptional<z.ZodObject<{
        resolved: z.ZodNumber;
        unresolved: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        resolved: number;
        unresolved: number;
    }, {
        resolved: number;
        unresolved: number;
    }>>;
    /** On a change: when its head was last pushed, or its last commit's time where the tracker gives no push. (2.7.0) */
    lastPushAt: z.ZodOptional<z.ZodString>;
    /** On a change: the branch it would merge into (GitHub's base, GitLab's target). (2.8.0) */
    baseBranch: z.ZodOptional<z.ZodString>;
    /**
     * On a change: the branch it comes from (GitHub's head, GitLab's source), when it lives in the
     * row's own repository. Absent for a change from a fork, whose branch no change here can target. (2.8.0)
     */
    headBranch: z.ZodOptional<z.ZodString>;
    /**
     * On an open change: where it sits in a stack of open changes (2.8.0). Absent when it is in none, or
     * when the host did not read branches.
     */
    stack: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        below: z.ZodOptional<z.ZodString>;
        above: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        above: string[];
        below?: string | undefined;
    }, {
        below?: string | undefined;
        above?: string[] | undefined;
    }>, {
        above: string[];
        below?: string | undefined;
    }, {
        below?: string | undefined;
        above?: string[] | undefined;
    }>>;
    /** The latest activity on the item and who did it (2.8.0). Absent when not read or not attributable. */
    lastActivity: z.ZodOptional<z.ZodObject<{
        /** Who did it, by login on the row's tracker. */
        login: z.ZodString;
        at: z.ZodString;
        kind: z.ZodEnum<["comment", "review", "commit", "state"]>;
        /**
         * Whether it was the person, worked out by the host the way it works out `myRoles`. Absent when the
         * host does not know who the person is there: a module then cannot tell, and does not guess.
         */
        mine: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        at: string;
        login: string;
        kind: "state" | "commit" | "comment" | "review";
        mine?: boolean | undefined;
    }, {
        at: string;
        login: string;
        kind: "state" | "commit" | "comment" | "review";
        mine?: boolean | undefined;
    }>>;
    /**
     * The people the row names by login — `reviewers[].login`, `assigneeLogins`, `authorLogin`,
     * `lastActivity.login` — keyed by that login, with their display name and avatar where the
     * tracker gave them (2.10.0). One map for the row rather than a field beside every login. Absent
     * when the host did not read them; a login missing from it has nothing known. At most
     * `LIMITS.ROW_PEOPLE` entries.
     */
    people: z.ZodOptional<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        avatarUrl: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        avatarUrl?: string | undefined;
    }, {
        name?: string | undefined;
        avatarUrl?: string | undefined;
    }>, {
        name?: string | undefined;
        avatarUrl?: string | undefined;
    }, {
        name?: string | undefined;
        avatarUrl?: string | undefined;
    }>>, Record<string, {
        name?: string | undefined;
        avatarUrl?: string | undefined;
    }>, Record<string, {
        name?: string | undefined;
        avatarUrl?: string | undefined;
    }>>>;
    /**
     * On a GitLab issue that is a work item of another type: which (2.11.0). Absent on a plain issue,
     * on a change, on every GitHub row, on a type outside `WORK_ITEM_TYPES` (a namespace's own
     * configured type), and where the host could not read the type (an older GitLab). A module
     * that tells tasks from issues reads `workItem === 'task'`.
     */
    workItem: z.ZodOptional<z.ZodEnum<["task", "incident", "test_case", "requirement", "objective", "key_result", "epic", "ticket"]>>;
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
    state: "open" | "closed" | "merged";
    url: string;
    title: string;
    host: string;
    ref: string;
    readAt: string;
    kind: "issue" | "change";
    tracker: "github" | "gitlab";
    repo: string;
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
    author?: string | null | undefined;
    review?: "approved" | "changes-requested" | "required" | undefined;
    stateReason?: string | null | undefined;
    closedByMerge?: boolean | undefined;
    draft?: boolean | undefined;
    createdAt?: string | null | undefined;
    updatedAt?: string | null | undefined;
    closedAt?: string | null | undefined;
    mergedAt?: string | null | undefined;
    pipeline?: "success" | "failed" | "running" | "pending" | "canceled" | "skipped" | "manual" | undefined;
    column?: {
        name: string;
        board: string;
        boardUrl?: string | undefined;
    } | undefined;
    columns?: {
        name: string;
        board: string;
        boardUrl?: string | undefined;
    }[] | undefined;
    reviewers?: {
        state: "approved" | "requested" | "changes" | "commented";
        login: string;
        name?: string | undefined;
    }[] | undefined;
    authorLogin?: string | null | undefined;
    assigneeLogins?: string[] | undefined;
    myRoles?: ("reviewer-asked" | "reviewer-done" | "author" | "assignee")[] | undefined;
    discussions?: {
        resolved: number;
        unresolved: number;
    } | undefined;
    lastPushAt?: string | undefined;
    baseBranch?: string | undefined;
    headBranch?: string | undefined;
    stack?: {
        above: string[];
        below?: string | undefined;
    } | undefined;
    lastActivity?: {
        at: string;
        login: string;
        kind: "state" | "commit" | "comment" | "review";
        mine?: boolean | undefined;
    } | undefined;
    people?: Record<string, {
        name?: string | undefined;
        avatarUrl?: string | undefined;
    }> | undefined;
    workItem?: "epic" | "task" | "incident" | "test_case" | "requirement" | "objective" | "key_result" | "ticket" | undefined;
}, {
    number: number;
    state: "open" | "closed" | "merged";
    url: string;
    title: string;
    host: string;
    ref: string;
    readAt: string;
    kind: "issue" | "change";
    tracker: "github" | "gitlab";
    repo: string;
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
    author?: string | null | undefined;
    review?: "approved" | "changes-requested" | "required" | undefined;
    stateReason?: string | null | undefined;
    closedByMerge?: boolean | undefined;
    draft?: boolean | undefined;
    labels?: string[] | undefined;
    assignees?: string[] | undefined;
    createdAt?: string | null | undefined;
    updatedAt?: string | null | undefined;
    closedAt?: string | null | undefined;
    mergedAt?: string | null | undefined;
    links?: {
        ref: string;
        relation: "closes" | "closed-by";
    }[] | undefined;
    pipeline?: "success" | "failed" | "running" | "pending" | "canceled" | "skipped" | "manual" | undefined;
    column?: {
        name: string;
        board: string;
        boardUrl?: string | undefined;
    } | undefined;
    columns?: {
        name: string;
        board: string;
        boardUrl?: string | undefined;
    }[] | undefined;
    reviewers?: {
        state: "approved" | "requested" | "changes" | "commented";
        login: string;
        name?: string | undefined;
    }[] | undefined;
    authorLogin?: string | null | undefined;
    assigneeLogins?: string[] | undefined;
    myRoles?: ("reviewer-asked" | "reviewer-done" | "author" | "assignee")[] | undefined;
    discussions?: {
        resolved: number;
        unresolved: number;
    } | undefined;
    lastPushAt?: string | undefined;
    baseBranch?: string | undefined;
    headBranch?: string | undefined;
    stack?: {
        below?: string | undefined;
        above?: string[] | undefined;
    } | undefined;
    lastActivity?: {
        at: string;
        login: string;
        kind: "state" | "commit" | "comment" | "review";
        mine?: boolean | undefined;
    } | undefined;
    people?: Record<string, {
        name?: string | undefined;
        avatarUrl?: string | undefined;
    }> | undefined;
    workItem?: "epic" | "task" | "incident" | "test_case" | "requirement" | "objective" | "key_result" | "ticket" | undefined;
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
        /**
         * Where the item stands on the project's board (2.6.0). Absent when it is on no board, when the
         * project has none, or when the host could not read boards (a GitHub token without `read:project`)
         * — absent says nothing about which. On several boards: the first of `columns`.
         */
        column: z.ZodOptional<z.ZodObject<{
            /** The column: a GitHub Project's Status option, or a GitLab board list's label (`Closed` for a closed item). */
            name: z.ZodString;
            /** The board's title: a GitHub Project v2 title, or a GitLab board name. */
            board: z.ZodString;
            /** Where the board is, when the tracker said. */
            boardUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            board: string;
            boardUrl?: string | undefined;
        }, {
            name: string;
            board: string;
            boardUrl?: string | undefined;
        }>>;
        /** Every board the item is on, `column` first. Present only when it is on more than one. (2.6.0) */
        columns: z.ZodOptional<z.ZodArray<z.ZodObject<{
            /** The column: a GitHub Project's Status option, or a GitLab board list's label (`Closed` for a closed item). */
            name: z.ZodString;
            /** The board's title: a GitHub Project v2 title, or a GitLab board name. */
            board: z.ZodString;
            /** Where the board is, when the tracker said. */
            boardUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            board: string;
            boardUrl?: string | undefined;
        }, {
            name: string;
            board: string;
            boardUrl?: string | undefined;
        }>, "many">>;
        /**
         * On a change: its reviewers by login, asked and done (2.7.0). Absent when the host did not read
         * them; empty when nobody was asked and nobody reviewed.
         */
        reviewers: z.ZodOptional<z.ZodArray<z.ZodObject<{
            login: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            state: z.ZodEnum<["requested", "approved", "changes", "commented"]>;
        }, "strip", z.ZodTypeAny, {
            state: "approved" | "requested" | "changes" | "commented";
            login: string;
            name?: string | undefined;
        }, {
            state: "approved" | "requested" | "changes" | "commented";
            login: string;
            name?: string | undefined;
        }>, "many">>;
        /** The author's login, beside `author` (which may be a display name). Null: the tracker named none. (2.7.0) */
        authorLogin: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        /** The assignees' logins, beside `assignees`. (2.7.0) */
        assigneeLogins: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /**
         * The person's roles on this item, worked out by the host from who they are on this row's tracker
         * (2.7.0). Absent when the host does not know who the person is there; empty when they have none.
         */
        myRoles: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodEnum<["reviewer-asked", "reviewer-done", "author", "assignee"]>, "many">, ("reviewer-asked" | "reviewer-done" | "author" | "assignee")[], ("reviewer-asked" | "reviewer-done" | "author" | "assignee")[]>>;
        /** On a change: its resolvable review discussions, resolved and not. (2.7.0) */
        discussions: z.ZodOptional<z.ZodObject<{
            resolved: z.ZodNumber;
            unresolved: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            resolved: number;
            unresolved: number;
        }, {
            resolved: number;
            unresolved: number;
        }>>;
        /** On a change: when its head was last pushed, or its last commit's time where the tracker gives no push. (2.7.0) */
        lastPushAt: z.ZodOptional<z.ZodString>;
        /** On a change: the branch it would merge into (GitHub's base, GitLab's target). (2.8.0) */
        baseBranch: z.ZodOptional<z.ZodString>;
        /**
         * On a change: the branch it comes from (GitHub's head, GitLab's source), when it lives in the
         * row's own repository. Absent for a change from a fork, whose branch no change here can target. (2.8.0)
         */
        headBranch: z.ZodOptional<z.ZodString>;
        /**
         * On an open change: where it sits in a stack of open changes (2.8.0). Absent when it is in none, or
         * when the host did not read branches.
         */
        stack: z.ZodOptional<z.ZodEffects<z.ZodObject<{
            below: z.ZodOptional<z.ZodString>;
            above: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            above: string[];
            below?: string | undefined;
        }, {
            below?: string | undefined;
            above?: string[] | undefined;
        }>, {
            above: string[];
            below?: string | undefined;
        }, {
            below?: string | undefined;
            above?: string[] | undefined;
        }>>;
        /** The latest activity on the item and who did it (2.8.0). Absent when not read or not attributable. */
        lastActivity: z.ZodOptional<z.ZodObject<{
            /** Who did it, by login on the row's tracker. */
            login: z.ZodString;
            at: z.ZodString;
            kind: z.ZodEnum<["comment", "review", "commit", "state"]>;
            /**
             * Whether it was the person, worked out by the host the way it works out `myRoles`. Absent when the
             * host does not know who the person is there: a module then cannot tell, and does not guess.
             */
            mine: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            at: string;
            login: string;
            kind: "state" | "commit" | "comment" | "review";
            mine?: boolean | undefined;
        }, {
            at: string;
            login: string;
            kind: "state" | "commit" | "comment" | "review";
            mine?: boolean | undefined;
        }>>;
        /**
         * The people the row names by login — `reviewers[].login`, `assigneeLogins`, `authorLogin`,
         * `lastActivity.login` — keyed by that login, with their display name and avatar where the
         * tracker gave them (2.10.0). One map for the row rather than a field beside every login. Absent
         * when the host did not read them; a login missing from it has nothing known. At most
         * `LIMITS.ROW_PEOPLE` entries.
         */
        people: z.ZodOptional<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodObject<{
            name: z.ZodOptional<z.ZodString>;
            avatarUrl: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        }, "strip", z.ZodTypeAny, {
            name?: string | undefined;
            avatarUrl?: string | undefined;
        }, {
            name?: string | undefined;
            avatarUrl?: string | undefined;
        }>, {
            name?: string | undefined;
            avatarUrl?: string | undefined;
        }, {
            name?: string | undefined;
            avatarUrl?: string | undefined;
        }>>, Record<string, {
            name?: string | undefined;
            avatarUrl?: string | undefined;
        }>, Record<string, {
            name?: string | undefined;
            avatarUrl?: string | undefined;
        }>>>;
        /**
         * On a GitLab issue that is a work item of another type: which (2.11.0). Absent on a plain issue,
         * on a change, on every GitHub row, on a type outside `WORK_ITEM_TYPES` (a namespace's own
         * configured type), and where the host could not read the type (an older GitLab). A module
         * that tells tasks from issues reads `workItem === 'task'`.
         */
        workItem: z.ZodOptional<z.ZodEnum<["task", "incident", "test_case", "requirement", "objective", "key_result", "epic", "ticket"]>>;
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
        state: "open" | "closed" | "merged";
        url: string;
        title: string;
        host: string;
        ref: string;
        readAt: string;
        kind: "issue" | "change";
        tracker: "github" | "gitlab";
        repo: string;
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
        author?: string | null | undefined;
        review?: "approved" | "changes-requested" | "required" | undefined;
        stateReason?: string | null | undefined;
        closedByMerge?: boolean | undefined;
        draft?: boolean | undefined;
        createdAt?: string | null | undefined;
        updatedAt?: string | null | undefined;
        closedAt?: string | null | undefined;
        mergedAt?: string | null | undefined;
        pipeline?: "success" | "failed" | "running" | "pending" | "canceled" | "skipped" | "manual" | undefined;
        column?: {
            name: string;
            board: string;
            boardUrl?: string | undefined;
        } | undefined;
        columns?: {
            name: string;
            board: string;
            boardUrl?: string | undefined;
        }[] | undefined;
        reviewers?: {
            state: "approved" | "requested" | "changes" | "commented";
            login: string;
            name?: string | undefined;
        }[] | undefined;
        authorLogin?: string | null | undefined;
        assigneeLogins?: string[] | undefined;
        myRoles?: ("reviewer-asked" | "reviewer-done" | "author" | "assignee")[] | undefined;
        discussions?: {
            resolved: number;
            unresolved: number;
        } | undefined;
        lastPushAt?: string | undefined;
        baseBranch?: string | undefined;
        headBranch?: string | undefined;
        stack?: {
            above: string[];
            below?: string | undefined;
        } | undefined;
        lastActivity?: {
            at: string;
            login: string;
            kind: "state" | "commit" | "comment" | "review";
            mine?: boolean | undefined;
        } | undefined;
        people?: Record<string, {
            name?: string | undefined;
            avatarUrl?: string | undefined;
        }> | undefined;
        workItem?: "epic" | "task" | "incident" | "test_case" | "requirement" | "objective" | "key_result" | "ticket" | undefined;
    }, {
        number: number;
        state: "open" | "closed" | "merged";
        url: string;
        title: string;
        host: string;
        ref: string;
        readAt: string;
        kind: "issue" | "change";
        tracker: "github" | "gitlab";
        repo: string;
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
        author?: string | null | undefined;
        review?: "approved" | "changes-requested" | "required" | undefined;
        stateReason?: string | null | undefined;
        closedByMerge?: boolean | undefined;
        draft?: boolean | undefined;
        labels?: string[] | undefined;
        assignees?: string[] | undefined;
        createdAt?: string | null | undefined;
        updatedAt?: string | null | undefined;
        closedAt?: string | null | undefined;
        mergedAt?: string | null | undefined;
        links?: {
            ref: string;
            relation: "closes" | "closed-by";
        }[] | undefined;
        pipeline?: "success" | "failed" | "running" | "pending" | "canceled" | "skipped" | "manual" | undefined;
        column?: {
            name: string;
            board: string;
            boardUrl?: string | undefined;
        } | undefined;
        columns?: {
            name: string;
            board: string;
            boardUrl?: string | undefined;
        }[] | undefined;
        reviewers?: {
            state: "approved" | "requested" | "changes" | "commented";
            login: string;
            name?: string | undefined;
        }[] | undefined;
        authorLogin?: string | null | undefined;
        assigneeLogins?: string[] | undefined;
        myRoles?: ("reviewer-asked" | "reviewer-done" | "author" | "assignee")[] | undefined;
        discussions?: {
            resolved: number;
            unresolved: number;
        } | undefined;
        lastPushAt?: string | undefined;
        baseBranch?: string | undefined;
        headBranch?: string | undefined;
        stack?: {
            below?: string | undefined;
            above?: string[] | undefined;
        } | undefined;
        lastActivity?: {
            at: string;
            login: string;
            kind: "state" | "commit" | "comment" | "review";
            mine?: boolean | undefined;
        } | undefined;
        people?: Record<string, {
            name?: string | undefined;
            avatarUrl?: string | undefined;
        }> | undefined;
        workItem?: "epic" | "task" | "incident" | "test_case" | "requirement" | "objective" | "key_result" | "ticket" | undefined;
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
        state: "open" | "closed" | "merged";
        url: string;
        title: string;
        host: string;
        ref: string;
        readAt: string;
        kind: "issue" | "change";
        tracker: "github" | "gitlab";
        repo: string;
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
        author?: string | null | undefined;
        review?: "approved" | "changes-requested" | "required" | undefined;
        stateReason?: string | null | undefined;
        closedByMerge?: boolean | undefined;
        draft?: boolean | undefined;
        createdAt?: string | null | undefined;
        updatedAt?: string | null | undefined;
        closedAt?: string | null | undefined;
        mergedAt?: string | null | undefined;
        pipeline?: "success" | "failed" | "running" | "pending" | "canceled" | "skipped" | "manual" | undefined;
        column?: {
            name: string;
            board: string;
            boardUrl?: string | undefined;
        } | undefined;
        columns?: {
            name: string;
            board: string;
            boardUrl?: string | undefined;
        }[] | undefined;
        reviewers?: {
            state: "approved" | "requested" | "changes" | "commented";
            login: string;
            name?: string | undefined;
        }[] | undefined;
        authorLogin?: string | null | undefined;
        assigneeLogins?: string[] | undefined;
        myRoles?: ("reviewer-asked" | "reviewer-done" | "author" | "assignee")[] | undefined;
        discussions?: {
            resolved: number;
            unresolved: number;
        } | undefined;
        lastPushAt?: string | undefined;
        baseBranch?: string | undefined;
        headBranch?: string | undefined;
        stack?: {
            above: string[];
            below?: string | undefined;
        } | undefined;
        lastActivity?: {
            at: string;
            login: string;
            kind: "state" | "commit" | "comment" | "review";
            mine?: boolean | undefined;
        } | undefined;
        people?: Record<string, {
            name?: string | undefined;
            avatarUrl?: string | undefined;
        }> | undefined;
        workItem?: "epic" | "task" | "incident" | "test_case" | "requirement" | "objective" | "key_result" | "ticket" | undefined;
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
        state: "open" | "closed" | "merged";
        url: string;
        title: string;
        host: string;
        ref: string;
        readAt: string;
        kind: "issue" | "change";
        tracker: "github" | "gitlab";
        repo: string;
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
        author?: string | null | undefined;
        review?: "approved" | "changes-requested" | "required" | undefined;
        stateReason?: string | null | undefined;
        closedByMerge?: boolean | undefined;
        draft?: boolean | undefined;
        labels?: string[] | undefined;
        assignees?: string[] | undefined;
        createdAt?: string | null | undefined;
        updatedAt?: string | null | undefined;
        closedAt?: string | null | undefined;
        mergedAt?: string | null | undefined;
        links?: {
            ref: string;
            relation: "closes" | "closed-by";
        }[] | undefined;
        pipeline?: "success" | "failed" | "running" | "pending" | "canceled" | "skipped" | "manual" | undefined;
        column?: {
            name: string;
            board: string;
            boardUrl?: string | undefined;
        } | undefined;
        columns?: {
            name: string;
            board: string;
            boardUrl?: string | undefined;
        }[] | undefined;
        reviewers?: {
            state: "approved" | "requested" | "changes" | "commented";
            login: string;
            name?: string | undefined;
        }[] | undefined;
        authorLogin?: string | null | undefined;
        assigneeLogins?: string[] | undefined;
        myRoles?: ("reviewer-asked" | "reviewer-done" | "author" | "assignee")[] | undefined;
        discussions?: {
            resolved: number;
            unresolved: number;
        } | undefined;
        lastPushAt?: string | undefined;
        baseBranch?: string | undefined;
        headBranch?: string | undefined;
        stack?: {
            below?: string | undefined;
            above?: string[] | undefined;
        } | undefined;
        lastActivity?: {
            at: string;
            login: string;
            kind: "state" | "commit" | "comment" | "review";
            mine?: boolean | undefined;
        } | undefined;
        people?: Record<string, {
            name?: string | undefined;
            avatarUrl?: string | undefined;
        }> | undefined;
        workItem?: "epic" | "task" | "incident" | "test_case" | "requirement" | "objective" | "key_result" | "ticket" | undefined;
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
/** One board of the project, with its columns in board order. See `tracker.columns`. (2.6.0) */
export declare const trackerBoardSchema: z.ZodObject<{
    board: z.ZodString;
    boardUrl: z.ZodOptional<z.ZodString>;
    /** The columns, left to right as the board shows them. */
    columns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    board: string;
    columns: string[];
    boardUrl?: string | undefined;
}, {
    board: string;
    boardUrl?: string | undefined;
    columns?: string[] | undefined;
}>;
export type TrackerBoard = z.infer<typeof trackerBoardSchema>;
/**
 * What `tracker.columns` answers: the boards of the project's sources and their columns, from the
 * host's reading. Empty when the project has no board or the host could not read them. (2.6.0)
 */
export declare const trackerColumnsResult: z.ZodObject<{
    boards: z.ZodDefault<z.ZodArray<z.ZodObject<{
        board: z.ZodString;
        boardUrl: z.ZodOptional<z.ZodString>;
        /** The columns, left to right as the board shows them. */
        columns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        board: string;
        columns: string[];
        boardUrl?: string | undefined;
    }, {
        board: string;
        boardUrl?: string | undefined;
        columns?: string[] | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    boards: {
        board: string;
        columns: string[];
        boardUrl?: string | undefined;
    }[];
}, {
    boards?: {
        board: string;
        boardUrl?: string | undefined;
        columns?: string[] | undefined;
    }[] | undefined;
}>;
export type TrackerColumns = z.infer<typeof trackerColumnsResult>;
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
