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

`live.get` stays, answered by a host as a view over the same reading, until
the modules that ask it have moved.

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
