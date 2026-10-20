# Review orchestration: kehikko-protocol (C2, 2.7.0)

> Task plan for this repository. Master plan: Jalez/kehikko-review
> `docs/superpowers/plans/2026-10-21-review-orchestration.md`, contract **C2**.
> Implement test-first; the orchestrator merges and tags `v2.7.0`.

**Goal:** a tracker row can carry the people of a change by login and the
roles the person has on it, plus the discussion counts and the last push.

**Shape (binding, C2):** every field optional, additive, `PROTOCOL` stays 2.

```ts
reviewers?: { login: string; name?: string; state: 'requested' | 'approved' | 'changes' | 'commented' }[]
authorLogin?: string | null
assigneeLogins?: string[]
myRoles?: ('reviewer-asked' | 'reviewer-done' | 'author' | 'assignee')[]
discussions?: { resolved: number; unresolved: number }
lastPushAt?: string   // ISO 8601
```

`LIMITS.REVIEWERS = 32`.

## Files

- `src/limits.ts`: `REVIEWERS: 32` under the tracker limits.
- `src/tracker.ts`:
  - `export const REVIEWER_STATES = ['requested', 'approved', 'changes', 'commented'] as const`, `type ReviewerState`.
  - `export const MY_ROLES = ['reviewer-asked', 'reviewer-done', 'author', 'assignee'] as const`, `type MyRole`.
  - `export const trackerReviewerSchema = z.object({ login: person, name: person.optional(), state: z.enum(REVIEWER_STATES) })`, `type TrackerReviewer`.
  - `export const trackerDiscussionsSchema = z.object({ resolved: int ≥ 0, unresolved: int ≥ 0 })`, `type TrackerDiscussions`.
  - `trackerRowSchema` gains `reviewers`, `authorLogin` (`person.nullable().optional()`),
    `assigneeLogins` (`person[] ≤ TRACKER_PEOPLE`), `myRoles` (`MY_ROLES[] ≤ 4`, no repeats),
    `discussions`, `lastPushAt` (`instant.optional()`).
- `src/index.ts`: export the new names.
- `src/build.ts`, `package.json`: `2.7.0`; `test/v1-6 … v2-6`: version expectations to `2.7.0`.
- `test/v2-7.test.ts`: new.
- `docs/tracker.md` ("People and my roles (2.7.0)"), `docs/limits.md` row for `REVIEWERS`, `CHANGELOG.md` 2.7.0.
- `dist/`: rebuilt with `bun run build` and committed.

## Tasks

### 1. Failing tests (`test/v2-7.test.ts`)

- version is `2.7.0`, `PROTOCOL` is 2, `LIMITS.REVIEWERS` is 32;
- `REVIEWER_STATES` and `MY_ROLES` are exactly the contract's words;
- a row without any new field parses as before (all absent);
- a row with every field parses and keeps them;
- `authorLogin: null` is a fact and parses;
- a reviewer with an unknown state, an empty login, or more than `REVIEWERS` reviewers is refused;
- `myRoles` refuses an unknown role and a repeated one;
- `discussions` refuses negative or fractional counts;
- `lastPushAt` refuses a non-ISO string.

Run `bun test test/v2-7.test.ts`: fails (exports missing).

### 2. Implement

Add the limit, constants, schemas and row fields above; export them. Bump
`PACKAGE_VERSION`/`package.json`; update the older version tests.

### 3. Docs and dist

Docs and changelog as listed; `bun run build`; `bun run typecheck`; `bun test`.

### 4. PR

Branch `review-roles`, PR "Tracker rows carry reviewers and my roles (2.7.0)". Not merged or tagged here.
