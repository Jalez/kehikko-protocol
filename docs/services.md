# Services (2.81.0, 2.83.0)

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

## Adding a service

An entry in `SERVICES` with its `says` and its `schema`, the readers it needs, a row here, and a minor
version. Nothing changes in a host: it carries the descriptor and answers `services.find` for any name.
A service whose consumers CALL the provider (not only read its descriptor) will get a call path through
the host by service and operation — never by module id or tool name — when the first one needs it.
