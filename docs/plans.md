# An epic's plan: steps any module can provide

What has to become true for an epic, in what order, in which phase, and what holds each step — published by whichever module keeps it, and read by every other one through `steps.list` (2.21.0).

Back to the [index](README.md).

## Overview

### Why

Until 2.21.0 an epic's steps were one module's file. The Journeys module kept `.kehikot/journeys/journeys.json`, the protocol shipped its format (`journey.ts`), and a host answered `steps.list` out of it. Nothing else could provide steps, and every module that wanted more than a step's refs — Flows drawing the tree, Factory weighing a change against the plan, Screenplay — read Journeys' file off the disk, through fields the format never typed (`phases`, `under`, `after`, `blockedBy`, `gates`).

Steps now work the way parts already did. A module that keeps steps **publishes** them as a holding in its own folder; a host takes **the union of every publisher**, keyed by epic; and `steps.list` answers from that union, each step saying which module provides it. No module is named anywhere in it.

### Publishing: `steps.json`

```ts
import { writePlan } from 'kehikot-module-protocol/serve'

writePlan(projectPath, 'kehikot.my-planner', 'the-posting-seam', {
  goal: 'A person can post from the seam',
  phases: [{ id: 'shape', title: 'Shaping' }, { id: 'build', title: 'Building' }],
  steps: [
    { id: 'draft', title: 'Draft the seam', refs: ['gh#12'], phase: 'shape' },
    { id: 'wire', title: 'Wire it up', refs: ['gh#13'], after: ['draft'], phase: 'build',
      gates: [{ id: 'legal', title: 'Legal signs off', kind: 'decision', owner: 'Legal' }] },
  ],
})
// → { file: '<project>/.kehikot/my-planner/steps.json', changed: true, dropped: [] }
```

The file is `{ version: 1, module: '<id>', epics: { <epic slug>: Plan } }`. `writePlan` replaces one epic's plan and leaves every other epic, and every key it does not know, as it was; `null` takes the epic out. A plan that does not fit `planSchema` is refused whole, with the issue; an `under`, `after` or `phase` that names nothing in the plan is dropped and listed in `dropped`. The write is atomic, stays inside the project (a `.kehikot` or module folder that is a link out of it is refused), and sets aside an unreadable file as `steps.json.unreadable` rather than writing over it.

A module that publishes steps says so in its manifest, `declares.provides: ['steps']` (see [the manifest](manifest.md#what-a-module-provides-2210)): that is how a skill that needs steps finds it, and how a host knows its changes are changes to the steps.

After a write, report it (`content.changed { epic }`) as for any material: the host announces it as the module's change and as `CONTENT_STEPS`, and every reader of `steps.list` re-reads.

### The shape: `planSchema`

```ts
Plan = {
  goal?: string, measure?: string,
  phases: { id, title }[],
  steps: {
    id, title, body,                 // body: '' by default
    refs: ref[],                     // the refs that DELIVER the step
    issue?: ref,                     // which of them is its issue, when the publisher says
    related: ref[],                  // named beside it, not delivering it: prior art, related work
    part?: partId,                   // the part of the epic it is the step of
    under?: stepId,                  // the step it is a prerequisite of; absent: the goal
    after: stepId[],                 // steps that must be done before it can start
    phase?: phaseId,                 // absent: the phase of the nearest step above it (phaseOf)
    gates: { id, title, kind: 'decision' | 'access' | 'work' | 'ref',
             ref?, epic?, owner?, waitsOn: ref[], done: boolean }[],
  }[],
}
```

- **Ids** (`PLAN_ID`, the class of a part id) are unique within their list of one plan. Two modules' plans may use the same id: a reader keys by `(module, id)`.
- **A step that is one part's step** uses `part`; it may use the part's id as its own id too.
- **`under` and `after`** name steps of the same plan. A plan is meant to be a tree with an order (no step a prerequisite of itself); a reader guards against a loop anyway. An `after` or a gate on a step that others are `under` holds those too.
- **Gates** are what holds a step that is not another step: a decision, access somebody must grant, work with no issue yet, or a `ref` — an issue or change that is no step of this plan, here or in another epic (`epic`). A gate that holds two steps is listed on both under one `id`, so a reader that draws each gate once keys them by id. A `ref` gate is done when its row closes, whatever `done` says.
- **Bounds** are `LIMITS.PLAN_*`: 256 steps, 32 phases, 32 gates a step, 64 refs a list, 32 `after`s, 4000 characters of body.

### Reading: `steps.list`

```ts
const said = await host.request('steps.list', { epic })
// { steps: [{ ...planStep, module: 'kehikot.journeys' }, { ...planStep, module: 'kehikot.my-planner' }],
//   phases: [{ id, title, module }], providers: [{ module, goal?, measure?, fallback? }] }
```

A module's page asks it under `steps:read`, as before; a module's server asks the same through `askHost` ([server-ask](server-ask.md)). The answer is `stepsListResult`: every provider's steps and phases, provider by provider (by folder name) and each in its plan's order, and the providers. `fallback: true` on a provider says the host read that plan from an older file rather than the module's `steps.json` (below).

An epic whose steps are kept where no module publishes them — an older record's `stepsFrom` — is answered `{ stepsFrom }` with **no `steps` key**: an empty list would say there are none.

The union is `plansUnion` (pure), so two hosts reading the same files answer alike. A host may also read the files itself with `readPlans(projectPath)` / `readPlansFor(projectPath, epic)`; a module never needs to, and should not read another module's folder.

### Following changes

`contentStamp(context.content, { sources: [CONTENT_STEPS], epic })` moves whenever any steps provider's material changes. See [content](content.md#content_steps).

### Journeys, until it publishes

A 2.21.0 host still reads `.kehikot/journeys/journeys.json` as a **fallback provider**: for as long as the Journeys module has no `steps.json`, its records are turned into plans (`planOfJourney`) and appear in the union under `kehikot.journeys` with `fallback: true`. Nothing changes for a person while modules move. Once Journeys writes a `steps.json` the fallback stops, file and all.

`journey.ts`, `readJourney`, `readJourneys` and `JOURNEYS_MODULE` are deprecated from 2.21.0 and removed in 3.0. `planOfJourney(record)` is the bridge: what the host reads the fallback with, and what Journeys can publish its records with.

## Notes by symbol

### `src/plan.ts`

#### `PLAN_FILE`, `PLAN_VERSION`

`steps`, so the file is `steps.json` beside a module's `parts.json`; version 1. A reader opens a later version and reads what it knows.

#### `planSchema` and `planIn`

The writer's shape and the reader's reading of it. `planSchema` refuses two steps or two phases with one id; `planIn` takes anything, never throws, reads entry by entry (a bad step, phase, gate or ref costs that entry), keeps the first of two ids, and drops an `under`, `after` or `phase` that names nothing in the plan or the step itself.

#### `plansIn`

Every epic's plan in one parsed `steps.json`. An epic present with no steps is kept: the module has said it has none for that epic, which is not the same as saying nothing.

#### `phaseOf`

The rule for a step that names no phase, said once: the phase of the nearest step above it (`under`, then that one's) that names one.

#### `providedStepSchema`, `providedPhaseSchema`, `stepsProviderSchema`, `stepsListResult`, `plansUnion`

The answer a host gives and the one function that makes it.

### `src/serve/plans.ts`

#### `writePlan`

One module's plan for one epic, as above. Synchronous, like `writeHoldings`, so nothing runs between the read of the file and the write that follows.

#### `readPlans`, `readPlansFor`

Every folder under `.kehikot/` asked for a `steps.json`, by name order, at most `LIMITS.HOLDINGS_MODULES`. A file over `LIMITS.HOLDINGS_BYTES`, one that is not a regular file and one that resolves outside the project are skipped. `module` is the id the file names when that id's folder IS the folder; a host maps the folder to a registered module when it is null.
