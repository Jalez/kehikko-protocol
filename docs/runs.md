# Run results

What a module that runs things publishes about each run, and the work it is for (2.27.0).

This is the reasoning, not the reference: the shapes themselves, with their bounds, are in `src/runs.ts` and `src/serve/runs.ts` and show on hover.

Back to the [index](README.md).

## Overview

Several things on one machine run checks for a piece of work: a pre-push hook runs the whole suite,
an agent verifies a fix, a review round runs the tests again. Whether those passed is a fact about
the work — the change `!3907`, the issue `gh#12` — and the natural place to see it is wherever that
work is shown: a checklist for the change, a board card, a review. The module that RAN the check
should not have to know which of those exist, and none of them should have to know which module ran it.

So a runner publishes, and readers read, the way parts and steps are published:

- A runner writes `<project>/.kehikot/<its id>/runs.json` with `writeRuns(projectPath, moduleId, runs)`:
  `{ version: 1, runs: RunResult[] }`, its whole list, newest `LIMITS.RUNS` kept.
- A reader calls `readRuns(projectPath)`: every folder directly under `.kehikot/` is asked for a
  `runs.json`, and every run comes back with `from`, the folder it was read from. No module id is
  named on either side.
- A reader showing one ref takes `latestRuns(runs, ref)`: the newest run of each `label` on that ref.
  The same label on the same ref is the same check run again, so a newer run replaces the older one's
  state — a pass followed by a failure reads failed, and a run queued after a pass reads queued.

Nothing here involves the host. The file is a module's own data in its own folder; the host's watch
of `.kehikot/` already tells every page that `from`'s material changed (`context.content`, with
`from` as the source and a null epic), which is a reader's cue to read again.

## What a run says

- `id` — the publisher's, unique in its file.
- `label` — what the run is, in the asker's words ("pre-push monorepo", "bun test"). Short, and what a
  reader shows: "Tests pass: pre-push monorepo".
- `kind` — `push` (a hook, somebody waiting), `verify`, `review`, `other`. A word this version does
  not know reads as `other`.
- `refs` — the work the run is for, spelled the way the tracker reading spells refs (`!3907`,
  `gh#12`; `readTrackerRef`/`spellTrackerRef` in `facets`). `[]` for a run that is for nothing in
  particular; such a run is still worth publishing, it only has nowhere to be shown.
- `epic` — the epic the run was asked for from, or null.
- `state` — `queued`, `running`, `passed` (exit 0), `failed` (anything else, including a signal and a
  command that could not start), `cancelled` (stopped by whoever asked, or the person; says nothing
  about the work).
- `queuedAt`, `startedAt`, `finishedAt` — ms since the epoch; null until they happen.
- `exit` — the exit code once ended, null for a signal, a cancel, or not yet.

## What a reader may take from it

A run result is the publisher's claim, as an activity item is. A reader shows it as coming from a
run — never as something a person ticked — and says whose folder it came from if it says anything.
It does not let a person "tick" a check that is a run's: the way to make it pass is to run it again.
It may let a person hide it.
