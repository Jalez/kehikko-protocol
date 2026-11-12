# Services (2.81.0, 2.83.0, 2.85.0, 2.86.0, 2.88.0)

One module PROVIDES a service; others CONSUME it; neither names the other. A consumer never hard-codes
a provider's id, name, program path or tool names, and a provider never knows who consumes it. What
connects them is a service NAME and the DESCRIPTOR whose shape the protocol gives for that name.

Shapes and readers: `src/services.ts`.

## The provider

At the top level of its manifest (`services`, so a host before 2.81.0 ignores it and runs the module):

```ts
services: {
  'work.queue': {
    name: 'Queue',
    run: { test: "'/…/bin/runner' run --kind verify -- {command}", build: "'/…/bin/runner' run --kind build -- {command}" },
    cli: '/…/bin/runner',
    tool: 'queue_run',
    direct: 'KEHIKOT_DIRECT=1',
    marks: ['"$@"; c=$?'],
  },
}
```

- A known service's descriptor must parse with its schema (`SERVICES[name].schema`); if one does not,
  the whole field is dropped and the module still runs. A service this package does not know is carried
  as it came.
- The provider fills in what only it knows — its own program's path, its tools — when it serves its
  manifest. Those words live only there.

## The host: `services.find`

`services.find { service, kehikko? }`, under **`services:read`**, from a module's server
(`SERVER_METHODS`, naming no project, or the project the question names) or its page:

- answers `{ providers: [{ module, name, descriptor, placed }] }` (`servicesFindResult`): the modules
  that provide the service and are **in use** — registered with this host and answering, as its last
  look at the modules found them — with the descriptor as the manifest says it;
- `placed` says whether the provider is placed on the kehikko asked about (`null` when none was asked),
  and placed ones come first. A machine-wide service such as `work.queue` is in use whatever is placed;
  a consumer that cares about the kehikko reads `placed`;
- empty when nothing provides it. A host before 2.81.0 answers `host-too-old`; the consumer does without.

## The consumer

```ts
import { askHost } from 'kehikot-module-protocol/serve'
import { WORK_QUEUE, providerOf, workQueueSaid } from 'kehikot-module-protocol'

const found = await askHost('services.find', { service: WORK_QUEUE }, { module: ID })
const queue = found.ok ? providerOf(WORK_QUEUE, found.data.providers) : null
if (queue) say(workQueueSaid(queue.descriptor, 'test', command))
```

`providerOf(service, providers)` is the first provider whose descriptor parses with the service's schema.
Every word the consumer says about the provider comes from that descriptor.

## The services

| Service | Descriptor | What it is |
| --- | --- | --- |
| `work.queue` | `workQueueSchema` | Runs heavy work — tests, typechecks, builds, big installs — in turn. |
| `document.proposals` | `documentProposalsSchema` | A document per epic that takes edits only as proposals (2.83.0). |
| `review.drafts` | `reviewDraftsSchema` | The person's draft review of a change; takes comments and a proposed review (2.83.0). |
| `checklist.holder` | `checklistHolderSchema` | The person's checklists, held against work; takes an answer to an item (2.83.0). |
| `work.status` | `workStatusSchema` | The stage of work, by its issue (2.83.0). |
| `diagram.writer` | `diagramWriterSchema` | Diagrams an agent writes, per epic, with one tool (2.83.0). |
| `page.viewer` | `pageViewerSchema` | Shows web pages on the kehikko; opens an address an agent hands it (2.85.0). |
| `cue.targets` | `cueTargetsSchema` | Tools a narrated walk-through may cue, with what each takes and the tool that checks a cue (2.85.0). |
| `module.folders` | `moduleFoldersSchema` | The folders a module owns under `.kehikot/`, each with what is in it (2.85.0). |

### `work.queue`

- `name`: what it is called where it is told about. Say this, never your own word for it.
- `run`: per kind of work it takes (`WORK_KINDS`: `test`, `typecheck`, `build`, `install`), a shell line
  with `{command}` (`WORK_COMMAND`) where the command goes, run from the command's own folder. A kind not
  listed is not taken. `workRunLine` fills one in; `workQueueSaid` says it in one sentence.
- `cli`: its program, a path a shell can run, for a session whose tools are gone (an agent module's
  restart notes).
- `tool`: the MCP tool an agent calls instead of the shell.
- `direct`: what in front of a command runs it directly after all (a guard's words).
- `marks`: text in an ancestor's command line of one of its own runs, so a consumer watching processes
  does not flag work already in turn.
- `wants` (2.86.0, optional): which runs started outside it the provider wants flagged, per kind of
  work: `{ minCpu?, sustainedSeconds?, wholeSuiteOnly? }` (`workWantSchema`).
  - `minCpu` (percent of one core) held for `sustainedSeconds`: a short spike or a light run is not
    flagged.
  - `wholeSuiteOnly`, for tests: only a run of the whole suite (`wholeSuite`: no file arguments, only
    folders, no name filter — `bun test`, `vitest run`), never `bun test a.test.ts`.
  - A kind left out is not flagged (an install that is network-bound and quick). With no `wants` at all,
    every kind in `run` is, under `WORK_WANT_DEFAULTS` (80% for 20 s; tests as whole suites only).

  A consumer tracks each process's CPU over time and asks `wantsQueued(queue, { kind, command, cpu,
  seconds })` — `cpu` the least it used over the last `seconds` — and flags only on `true`.
  `workWant(queue, kind)` gives the rule with its defaults, for the `minCpu` to track against:

  ```ts
  const want = workWant(queue, kind)              // null: never flag this kind
  const streak = heldSince(pid, want.minCpu)      // the consumer's own samples
  if (wantsQueued(queue, { kind, command, cpu: streak.least, seconds: streak.seconds })) flag()
  ```

## Calling a provider (2.83.0)

A service whose consumers CALL the provider names, in its descriptor, the provider's tools (`serviceTool`:
a name on its MCP door) or routes (`servicePath`: `/api/…` on its own origin). The consumer calls them
through the module id `services.find` answered — never one it spells:

```ts
import { callServiceTool, findService } from 'kehikot-module-protocol/serve'
import { DOCUMENT_PROPOSALS } from 'kehikot-module-protocol'

const found = await findService(DOCUMENT_PROPOSALS, { module: ID, project, kehikko })
if (!found.ok) return say(`No document here takes proposals: ${found.why}`)
const { module, name, descriptor } = found.provider
const filed = await callServiceTool(module, descriptor.tools.propose, { project, epic, find, replace, why }, { from: ID })
```

What each operation is called with, and answers, is in the service's schema comment in `src/services.ts`;
the provider keeps its tools' arguments to that.

### Who calls

Both `callServiceTool` and `fetchService` send the caller's id (`SERVICE_CALLER_HEADER`) and a pass it
minted (`SERVICE_PASS_HEADER`). A provider that takes something only from another module's server — not
from an agent at its MCP door, not from a page — checks it with `vouchCaller(request.headers)`: that asks
the named module at its REGISTERED origin (`SERVER_PASS_PATH`) whether it minted the pass, the proof a
host already takes for a server's question. No secret is shared through the disk, and a provider never
needs to know which module that is. `review.drafts`'s `send` is such a route.

### The 2.83.0 services

- `document.proposals`: `name`; `root`, the document's folder for an epic relative to the project with
  `{epic}` in it (`documentRoot(d, epic)`; `documentsFolder(d)` is the folder every epic's is under);
  `main`, its main file relative to `root`; `tools.sections` (`{ project, epic }` → JSON
  `[{ path, title, level, from, to }]`, path relative to the project), `tools.source` (`{ project, epic,
  file? }` → the file's text), `tools.propose` (`{ project, epic, file?, find, replace, why, agent?,
  group? }`), `tools.proposals` (`{ project, epic }` → pending and lately answered proposals).
- `review.drafts`: `name`; `tools.comment` (`{ project, change, path, line, start_line?, side, body,
  meta? }`), `tools.propose` (`{ project, change, run, summary, verdict, door, uiux, pathToSuccess }`),
  `tools.drop` (`{ project, change, run }`); `send?`, `POST { project, change, run }` from a vouched
  module server.
- `checklist.holder`: `name`; `tools.list` (`{ project, checklist?, ref? }`), `tools.create` (`{ project,
  name, agent }`), `tools.add` (`{ project, checklist, text, agent }`), `tools.hold` (`{ project,
  checklist, ref, agent }`), `tools.check` (`{ project, checklist, item, ref, state, note, agent }`).
  The list's print is in the schema comment.
- `work.status`: `name`; `jobs`, `GET <jobs>?ref=<ref>&projectPath=<abs>` → `{ jobs }` (`workJobsIn`).
  A consumer says "<name>: <stage>".
- `diagram.writer`: `name`; `tool`, what an agent calls to write one; `kinds` (`sequence`, `graph`).

### The 2.85.0 services

- `page.viewer`: `name`; `tool`, called with `{ url }`, opens that address. A consumer that would tell an
  agent "open it in the page viewer" says "open it in <name>" and, with no provider, says nothing of the
  kind. A page opens an address through the host (`address.open`), not through this.
- `cue.targets`: `name`; `cues`, each `{ tool, says, args, reader?, stop }` — the tool a cue calls, what
  it shows, each argument's name and what it takes, the read-only tool that lists the values that hold,
  and whether calling it with no arguments takes down what the cues put up. A cue calls one as
  `<module>.<tool>(<arg>=<value>, …)`, `<module>` being the id `services.find` answered. The module that
  writes walk-throughs finds the providers placed on a kehikko and hands its agent what they take.
- `module.folders`: `name`; `folders`, each `{ folder, says, derived }` — one name directly under
  `.kehikot/` (`KEHIKOT_FOLDER`), what is in it, and whether it is a cache rebuilt from elsewhere (a data
  history leaves it out). The provider is that folder's only writer. `foldersOwned(providers)` maps
  each folder to its owner. A module that shows the project's files names a file's owner from this, and
  says "the <folder> module" for a folder nobody in use declares.
- `checklist.holder` gains `formats: ['json']`: its `list` tool then also takes `format: 'json'` and
  answers `checklistListsJson` (no `checklist`) or `checklistJson` (with one); read either with
  `checklistJsonIn(shape, text)`. A consumer asks for JSON only when `holderTakesJson(descriptor)`.

### A skill that needs a service (2.85.0)

A skill's `needs` takes `{ service: '<name>' }`: met by a module on the kehikko whose manifest provides
that service (`services`). `meetsNeed` reads `ProvidingManifest.services`; `needSaid` says it from the
service's `says`. A host before 2.85.0 carries the need and never meets it, so the skill does not load
there (`skills.needs.service` in `DECLARATION_SINCE`).

### Where a session is filed: `sessions.placeOf` (2.85.0)

Not a service but a host method, under **`sessions:place`**, from a module's server about one project
(`SERVER_PROJECT_METHODS`): `sessions.placeOf { session }` answers `{ place: { epic, parts, kehikko } |
null }` for the agent session with that id, from the records the host already reads for its door (the
modules that issued place tokens in the project, at `RECORDED_PLACE_PATH`). A module whose work is
started from a session uses it instead of reading the agent module's own folder.

## Adding a service

An entry in `SERVICES` with its `says` and its `schema`, the readers it needs, a row here, and a minor
version. Nothing changes in a host: it carries the descriptor and answers `services.find` for any name.
A service whose consumers CALL the provider (not only read its descriptor) will get a call path through
the host by service and operation — never by module id or tool name — when the first one needs it.

## The host as a consumer (2.88.0)

Two services are called by the HOST, not by another module: `conversations.finder` and `agent.tasks`
(and a third, `agent.setup`, is read by it: see below).
The host's server sends `x-kehikot-caller: kehikko` (`HOST_CALLER`) and a pass it minted; the provider
holds the route to `vouchHost`, which asks the host at its own origins (`HOST_PASS_PATH`) whether it
minted that pass. No page, agent or other module can pass for the host.

### `conversations.finder`

`{ name, program, find, bring }`. An agent module provides it from what it already reads of its CLI's
conversations — its session listing, and transcripts only where it already reads them; nothing new
from outside its CLI's own folders.

- `POST <find> { project, refs, url?, branch?, repo? }` → `{ conversations: [{ session, title, folder,
  lastActive, match, reason, place, running }] }`. `match` is `created` | `pushed` | `branch` |
  `mentioned` | `folder`, strongest first; `reason` says it in words ("created !4721", "pushed branch
  feat/x", "worked in this repository"). Titles and reasons only. Read with `candidatesIn`.
- `POST <bring> { project, session, to, from }`: a compare-and-set of one conversation's place — the
  record writes `/kehikot-here` does — taken only when the conversation is filed under `from` now.
  `elsewhere` otherwise, with where it is. A running conversation is not restarted: it gains the place
  now, and the module's guards and messaging when the module next resumes it, or at once when the
  module holds its terminal (`resumed`).

### `agent.tasks`

`{ name, program, start, view }`.

- `POST <start> { project, brief, place, title }` → `{ outcome, session, why }`: a NEW conversation fed
  `brief` on launch, filed under `place`, kept in the module's records like any other.
- `view`: the module's page for that one conversation, `/app?…{session}…` (`agentTaskView`), which the
  host frames in its dialog while the task runs.

### `agent.setup` (2.91.0)

`{ name, program, cli }`. An agent module whose program can use every module's MCP tools and skills
in conversations started OUTSIDE Kehikot too. The module owns the person's choice, as its own `machine`
settings: `agentSetupSettings(program)` declares the four (`AGENT_SETUP_KEYS`: tools on or off and the
modules left out, the same for skills), off by default and `personOnly`. A host reads them with
`settings.get` at the module's door (no project) and acts on them with `agentSetupChoice`; it writes
them only as the person (a pass, like any change in its Settings), and `agentSetupValues` says the
values that carry an earlier choice over.

`cli` is the program's command (`claude`): it says which of the host's ways of writing a program's
user-wide configuration applies. A host with none for that command sets nothing up for it. The host,
not the module, keeps that configuration in step — it runs while the module sleeps, and it is the one
that sees modules installed, moved and uninstalled.
