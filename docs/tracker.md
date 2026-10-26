# Trackers

One reading of GitHub and GitLab shared by every module: the row a host hands back, what is missing and why, refreshing, and how a reference is spelled.

This is the reasoning, not the reference: the shapes themselves, with their bounds, are in the source and show on hover. The first half is the overview that used to be in the README; the second half is the note that used to stand above each symbol in the source, under that symbol's name.

Back to the [index](README.md).

## Overview

### One tracker reading, shared

Every module that showed a ref used to read its state its own way, so two
containers could disagree about whether `#2274` was open. The host now reads
GitHub and GitLab once per project, with the person's own logged-in CLIs, and
every module reads that one reading. The shapes are in `src/tracker.ts`.

```ts
// what the trackers last said — answered at once from the host's reading
const reading = await request('tracker.get', { refs: ['gh#41', '!1848'] })   // or { epic } or { project: true }
// reading: { at, refreshing, sources: [{ tracker, host, repo, default, listed, at, error, refreshing }],
//            rows: TrackerRow[], missing: [{ ref, reason: 'pending' | 'not-found' | 'no-tracker' | 'failed' }] }

// ask for a new read; answered when it lands
await request('tracker.refresh', { epic: 'modes-are-modules' }, { within: TRACKER_REFRESH_WITHIN_MS })
// → { outcome: 'read' | 'failed' | 'declined', at, why }
```

- **Capabilities** `trackers:read` (`tracker.get`) and `trackers:refresh`
  (`tracker.refresh`). Refreshing is apart because it spends the person's rate
  limit for everybody on the canvas.
- **Scope**: exactly one of `refs` (up to `TRACKER_ASK`), `epic`, or
  `project: true` — the refs every epic names, the refs modules asked about,
  and the recent issues and changes of each listed source. Asking for a ref the
  host has not read is how it gets read: it comes back in `missing` as
  `pending`, and a read starts.
- **Detail**: `detail: 'detail'` (only with `refs`) adds `row.detail` —
  description, changed files, head sha, approvers — for modules that check
  content.
- **A row is a `Sighting`.** `kind`, `state`, `stateReason` (GitHub's, as
  GitHub spells it) and `closedByMerge` sit on the row under the names
  `/facets` reads, so `facetsOf(row)` and `dispositionOf(row.ref, row,
  context.dispositions)` take a row as it is. Fields a tracker does not record
  are absent, never guessed.
- **The signal**: `context.tracker` is `{ at, refreshing }` for the open
  project — the reading's last change and whether a read is in flight. Not the
  rows: context is broadcast and bounded. A module that re-asks `tracker.get`
  when `at` moves says `reacts: ['tracker']`.
- **Ref spellings**: `readTrackerRef` reads `gh#41`, `gh:owner/repo#41`,
  `#12`/`gl#12` (GitLab issue), `!7`/`gl!7` (merge request),
  `gl:group/project#12`; `spellTrackerRef` spells a ref the host found.
  A row's `ref` is the spelling it was asked for or named by.

### Board columns (2.6.0)

A row carries `column?: { name, board, boardUrl? }` — where the item stands on
the project's own kanban board. On GitHub that is a Project (v2): `board` is the
project's title and `name` its Status option (or, without a field named Status,
the first single-select field the board groups by). On GitLab it is an issue
board: `name` is the list whose label the issue carries, scoped labels
included, and a closed issue is in the board's Closed list. An item on several
boards also has `columns`, every one of them, `column` first.

Absent is not "no column": the item may be on no board, the project may have
none, or the host may be unable to read them (a GitHub token without
`read:project`). A module shows a column when there is one and nothing when
there is not.

```ts
const { boards } = await request('tracker.columns', {})
// boards: [{ board: 'Roadmap', boardUrl, columns: ['Todo', 'In progress', 'Done'] }]
```

`tracker.columns` is under `trackers:read`: the same reading, another view of it.

### People and my roles (2.7.0)

A change's row names its people by login, so a module can tell who is who
without matching display names: `reviewers?: { login, name?, state }[]` with
`state` one of `requested` (asked, not reviewed yet), `approved`, `changes`
(changes requested) or `commented` — the reviewer's latest review —
`authorLogin?` and `assigneeLogins?` beside the `author` and `assignees` that
were already there.

The host knows who the person is on each tracker host (`gh api user`,
`glab api user`) and adds `myRoles?`: any of `reviewer-asked`,
`reviewer-done`, `author`, `assignee`. Absent when the host does not know who
the person is there; `[]` when they have no role. Being mentioned is not a role.

A change also carries `discussions?: { resolved, unresolved }` — its
resolvable review threads — and `lastPushAt?`, when its head was last pushed
(or its last commit's time where the tracker gives no push time). Absent is not
zero: the host may not have read them.

```ts
const { rows } = await request('tracker.get', { project: true })
const mine = rows.filter((r) => r.myRoles?.includes('reviewer-asked'))
```

### Stacks and last activity (2.8.0)

A change's row says which branch it would merge into, `baseBranch?`, and
which it comes from, `headBranch?` (absent for a change from a fork: no
change in the repository can be based on a fork's branch).

A stacked change is one whose base branch is another open change's head
branch in the same repository. The host works that out across its whole
reading, open changes only, and puts it on each row as `stack?`:
`below?` is the ref of the change underneath, `above` the refs of the changes
built on this one (more than one where the stack forks). A row in no stack
has no `stack`. Follow `below` down and `above` up through the reading's rows
for the whole stack; a ref the reading does not hold ends the walk.

```ts
const byRef = new Map(rows.map((r) => [r.ref, r]))
const bottom = (r) => (r.stack?.below && byRef.get(r.stack.below) ? bottom(byRef.get(r.stack.below)) : r)
```

`lastActivity?: { login, at, kind, mine? }` is the latest thing somebody did
on the item among what the host read: its opening and state changes
(`state`), comments (`comment`), reviews and approvals (`review`) and, on a
change, its commits (`commit`). `mine` says whether that was the person, the
way `myRoles` does; it is absent when the host does not know who the person
is, and a module that wants to say "somebody else had the last word" says
nothing then. When the latest activity cannot be put to a login the field is
absent; the host never falls back to an earlier one.

### People and their pictures (2.10.0)

A row names people by login in four places: `reviewers[].login`,
`assigneeLogins`, `authorLogin` and `lastActivity.login`. What the tracker says
about each of them is in ONE map on the row, keyed by login, rather than a
field beside every login:

```ts
people?: Record<login, { name?: string; avatarUrl?: string }>
```

`name` is the display name where the tracker gave one; `avatarUrl` is the
person's picture, always an absolute `https:` URL (`avatarUrlSchema`,
`isHttpsUrl`). The host makes a tracker's relative avatar path (a self-hosted
GitLab's `/uploads/...`) absolute against the tracker's host, and leaves out one
that is not `https:`. An entry says at least one of the two; a login with
nothing known is not in the map; the map is absent when the host did not read
people at all. At most `LIMITS.ROW_PEOPLE` entries.

The protocol carries the URL; where a module may load a picture from is its own
decision. A module that draws avatars should load them only from the hosts it
expects for that tracker (its CSP `img-src` saying the same), with
`referrerpolicy="no-referrer"`, and fall back to the person's initials when
there is no URL or the picture does not load.

```ts
const face = (row, login) => row.people?.[login]?.avatarUrl
```

### Work item types (2.11.0)

A GitLab issue can be another kind of work item: a task (a child of an issue),
an incident, a test case, a requirement, an OKR objective or key result, a
work-item epic, or a Service Desk ticket. A row says which:

```ts
workItem?: 'task' | 'incident' | 'test_case' | 'requirement' | 'objective' | 'key_result' | 'epic' | 'ticket'
```

The words are GitLab's GraphQL `Issue.type` (enum `IssueType`), lower-cased,
with `ISSUE` left out (`WORK_ITEM_TYPES`, `WorkItemType`). REST's `issue_type`
spells the same words. `kind` stays `issue`: a task is still a piece of work,
and every module that reads `kind` reads it as before.

The field is absent on a plain issue, on a change, on every GitHub row (GitHub
has no work item types), on a type a namespace configured for itself (GitLab
18.8 and later), and where the host could not read the type: a GitLab too old
for the field, which the host says in the source's sentence. So "absent" is not
proof of a plain issue; a module that must know says so only when the field is
there.

```ts
const isTask = (row) => row.workItem === 'task'
```

`live.get` stays, answered by a host as a view over the same reading, until
the modules that ask it have moved.

### Linked branches (2.19.0)

An issue's row carries `branches?: { name, url? }[]`: the branches linked to it. On GitHub they are
the issue's Development branches (GraphQL `linkedBranches`, the "Create a branch" link and any
branch linked by hand); on GitLab, the issue's related branches — the branches named `<iid>-…`, as
GitLab's "Create branch" names them, the rule its own related-branches list applies. `url` is the
branch on its tracker when the host could spell one. Absent when the host did not read them (an
older host, a tracker that would not say); `[]` when it read them and there are none. At most
`LIMITS.TRACKER_BRANCHES`.

A host reads them with the reads it already makes — the field in the issue query on GitHub, one
listing of the repository's branches per source on a whole read on GitLab — never a request per
issue. A module that takes a branch as "somebody started" reads `row.branches?.length`.

### An epic with its parts (2.19.0)

`tracker.get { epic, parts: true }` answers the refs the epic names and the refs its parts hold
(`context.parts[].refs`, what modules filed under a part) in one answer. `parts` goes with `epic`
only. A host before 2.19.0 strips it and answers the epic's own refs, so a module that needs the
parts' refs from an older host still asks `{ refs }` for the ones the answer did not cover —
which, from a newer host, are none.

### Work that is part of an issue (2.26.0)

A change can deliver an issue, or deliver part of it. "Closes #12" says the first: the change is a
`closes` link, the issue carries it back as `closed-by`, and when it merges the issue is
`closedByMerge`. "Part of #12" says the second, and before 2.26.0 a host had no other word than
`closes` for it, so an issue with one of three changes merged read as done.

Now a change that delivers part of an issue is in two fields of their own, never in `links`:

- `contributes?: ref[]` on the change — the issues it says it is part of: words such as "Part of
  #12" or "Implements #12" in its description, or, where a host reads it, the forge listing the
  change as related to the issue (GitLab's related merge requests) without listing it as closing it
  (GitLab's `closed_by`, GitHub's closing references). A mere mention is neither.
- `contributedBy?: ref[]` on the issue — the reverse.

What these never do: make the issue closed, or `closedByMerge`, or a `closed-by` link. An issue
with only contributions is open until somebody closes it or a closing change merges. A change that
both closes an issue and says it is part of it closes it: the ref is in `links` and not repeated in
`contributes`. The forge's own closing list wins over the words: a change GitLab or GitHub says
closes the issue is `closes` whatever its description says.

Why two fields rather than two more `LINK_RELATIONS`: `relation` is an enum, a module built before
2.26.0 parses `tracker.get` with that enum, and a word it does not know fails the link, the row and
with it the whole answer. A field it does not know is stripped. So a newer host's rows read whole in
an older module, which simply does not see the contributions — the same as before, minus the
contributions it used to misread as closing. Both fields are dropped, not fatal, when they do not
parse. `TRACKER_FIELD_SINCE` (`since.ts`) says which host version fills each row field.

A module that shows the tie draws it from the change's side ("part of #12") and from the issue's
("has contributions from !7"), and leaves both out of anything that counts done.

### Asked from a module's server (2.19.0)

A module's server reads the same reading through `askHost` (`/serve`), held to the same
`trackers:read`: see [server-ask](server-ask.md).

## Notes by symbol

### `src/tracker.ts`

#### About `src/tracker.ts`

The shared tracker reading: what the issues, merge requests and pull requests
a project names last said about themselves, read ONCE by the host and handed
to every module that asks.

##### Why this is the protocol's business now

Every module that showed a ref used to get its state its own way. Journeys
asked `live.get`, which reads a file nothing in Kehikot writes; References
ran its own `gh`, so it saw GitHub and nothing else; Checklist could not read
a ref at all. Three readings of three ages, two of them blind to GitLab, and
no press anywhere that refreshed what a person was looking at. The same
`#2274` could be open in one container and closed in the one beside it, and
both would be telling the truth about a different moment.

So the reading moves to the host, which holds the person's logged-in CLIs and
is the only party that can read once for everybody, and this file is the
shape it hands over. Unlike `epic.get` — a host's own material, unspecified
on purpose — this answer IS specified, and the reason is the whole point of
it: two modules showing one ref must agree on what its state is, and they can
only agree if they read the same fields with the same meanings. See
`methodResults` in `methods.ts`.

##### A row is a `Sighting`

`kehikot-module-protocol/facets` reads a `Sighting` — `kind`, `state`,
`stateReason`, `closedByMerge` — and a row here carries exactly those fields
under exactly those names. A module hands a row straight to `facetsOf(row)`
and `dispositionOf(row.ref, row, context.dispositions)`; there is no mapping
to write and so no mapping to get wrong. The test that holds this is a type
assignment, in `test/tracker.test.ts`.

##### Absent, never guessed

A tracker that does not record a thing leaves the field out. GitLab has no
close reason, so a GitLab row has no `stateReason`; GitHub issues have no
pipeline, so an issue row has no `pipeline`. `null` and absence are not
interchangeable here: `closedAt: null` on an open issue is a fact (it has not
closed), while a missing `pipeline` says nothing about whether one ran.

#### `TRACKER_DETAILS`

How much of a ref to read.

`summary` is the row: enough to draw it, filter it and decide whether it is
done. `detail` adds what you need to READ it — its description, the files a
change touched, who approved — which costs a call per ref, so it is asked for
by name, a few refs at a time, by a module such as Checklist that checks
content.

#### `REVIEW_STATES`

Where a change's review stands.

`approved` — enough approvals, or GitHub's `APPROVED`. `changes-requested` —
GitHub only; GitLab has no such verdict. `required` — it still needs one.

#### `LINK_RELATIONS`

How two refs are tied together, from the side of the row carrying the link.

`closes` — this change says it delivers that issue: GitHub's closing
references, or a GitLab merge request's own description saying "Closes #12".
`closed-by` — the reverse, on the issue: these changes say they deliver it.

Direction is the whole point. GitLab attaches a merge request to an issue for
any cross-reference either way, so an issue that cites `!1772` as prior art
would come back with it attached and read as work in flight. A link here is
only the change's own claim.

A change that says it delivers only PART of an issue is not a link: it is in
`contributes`, and the issue has it in `contributedBy` (2.26.0). See "Work that
is part of an issue" above. The two words here stay the only two, so a module
built against them reads every row a newer host sends.

#### `trackerRowSchema`

One ref, as the host last read it.

Assignable to `Sighting` from `/facets`, on purpose — see the essay at the
top of this file.

#### `trackerRowSchema.ref`

The ref this row answers for, spelled exactly as it was asked for or named
in an epic — `gh#41`, `!1848`, `gh:owner/repo#12`. A module looks its own
string up and finds its own string; two spellings of one item are two rows
with the same `tracker`/`repo`/`number`.

#### `trackerSourceSchema`

One place the host reads, and how that went last time.

Per source rather than per tracker, because "GitLab failed" is less use than
"gitlab.example.org could not be reached" when a project reads two GitLab
hosts, and because freshness is a fact about one read.

#### `MISSING_REASONS`

Why a ref asked for has no row.

`pending` — not read yet. A read has been started; when it lands
`context.tracker.at` moves, and asking again finds it.
`not-found` — the tracker answered and has no such issue or change.
`no-tracker` — the spelling names no tracker this project reads: `gl#12` in a
project with no GitLab source, or a spelling `readTrackerRef` cannot read.
`failed` — its source's last read failed; `sources[].error` says why.

#### `trackerReadingResult`

What `tracker.get` answers.

Answered from the host's latest reading, at once. The host never makes a
module wait on a tracker to answer this: what it has not read yet comes back
in `missing` as `pending`, a read is started, and the context says when it
lands. A module therefore draws what it was given, marks what is pending, and
asks again when `context.tracker.at` moves.

#### `REFRESH_OUTCOMES`

What became of a `tracker.refresh`. An outcome, like `view.goto`'s.

`read` — every source asked about was read. `failed` — at least one was not;
the rows it gave before stay, and `tracker.get` says which source and why.
`declined` — the host would not read: no project, nothing to read, or a host
that does not read trackers for frames. All three are `ok: true`; the
question succeeded, the reading may not have.

Answered when the read LANDS, which may take longer than `ANSWER_WITHIN_MS`.
A caller passes `within: TRACKER_REFRESH_WITHIN_MS`. A caller that times out
anyway loses nothing: the read goes on, and `context.tracker.at` moves when it
lands, for this module and every other.

#### `trackerSignalSchema`

The small half that travels in the context: when the reading last changed,
and whether one is in flight.

The reading itself is NOT in the context. Context is broadcast to every
framed module on every change of anything and is bounded to fit; a reading
is hundreds of rows with descriptions in them. So the context carries the
signal and `tracker.get` carries the material — and a module that declared
`reacts: ['tracker']` re-asks when `at` moves.

`{ at: null, refreshing: false }` is the honest default: nothing has been
read, and nothing is being read — which is also what a host that has never
heard of tracker readings would say.

#### `readTrackerRef`

Read a ref spelling, or null for one this protocol does not know.

The spellings Kehikot already writes:

- `gh#41` — GitHub, the project's default repository. An issue or a pull
  request: GitHub numbers both from one sequence, so the spelling cannot say
  which, and the reading does.
- `gh:owner/repo#41` — GitHub, a named repository.
- `gl#12` or `#12` — a GitLab issue in the default project; `gl!7` or `!7` a
  merge request.
- `gl:group/project#12`, `gl:group/project!7` — a named GitLab project.

A ref no rule reads comes back null and a host answers it `no-tracker`.

#### `spellTrackerRef`

The one spelling a host uses for a ref it found rather than was asked about —
a row in a listing, the other end of a link. Short when the repository is the
default of its tracker, qualified otherwise: `gh#41`, `#12` and `!7` — the
spellings epics on GitLab projects already use for issues and merge requests
— or `gh:owner/repo#41`, `gl:group/project#12`.

A qualified spelling can be longer than `LIMITS.REF` for a deep GitLab path.
A host leaves such a link out rather than clip it: a clipped ref is a
different ref.
