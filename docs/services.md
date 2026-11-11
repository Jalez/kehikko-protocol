# Services (2.81.0)

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

## Adding a service

An entry in `SERVICES` with its `says` and its `schema`, the readers it needs, a row here, and a minor
version. Nothing changes in a host: it carries the descriptor and answers `services.find` for any name.
A service whose consumers CALL the provider (not only read its descriptor) will get a call path through
the host by service and operation — never by module id or tool name — when the first one needs it.
