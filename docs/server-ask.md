# A module's server asking the host

How the process behind a module — its MCP door, a job it runs — reads what its page would be told, when no page is open (2.19.0).

Back to the [index](README.md).

## Overview

A module's page asks the host through the frame (`kehikot.request`), and the host answers it from its own material: the tracker reading above all. A module's SERVER has no frame. Before 2.19.0 the only way its MCP door could say what the trackers say was to keep what its page last drew, so an agent asking with no page open was told nothing.

`askHost` asks the host from the server, and is answered what the page would be answered:

```ts
import { askHost, resolveDoorPlace } from 'kehikot-module-protocol/serve'

const read = await askHost('tracker.get', { epic, parts: true }, { module: ID, project })
if (read.ok) read.data.rows        // TrackerRow[], exactly what the page's tracker.get gets
else read.why                      // a sentence; read.refused says when it was who asked or about what
```

- **Which methods.** `SERVER_METHODS`: `tracker.get` and `tracker.columns`, reads of the host's material that need no frame; since 2.20.0 also `traffic.read` and `traffic.note` ([traffic](traffic.md)), which are about this computer and name no project; since 2.21.0 the epic's own material — `epics.list`, `epic.get`, `steps.list`, `parts.get` and `dispositions.get` (below); since 2.41.0 `messages.send` and `messages.read` ([agent messages](agent-messages.md)), which take the project from the session's token and name none. A method that writes into a canvas or waits on a person is the page's to ask. The list grows by an entry.
- **Which project.** `project` is the absolute folder the question is about — what a door is handed (`resolveDoorProject`, `resolveDoorPlace`). A host that holds no project there refuses it (`refused: 'project'`) and `askHost` asks the next origin.
- **The same grant.** The host holds the call to the module's manifest exactly as it holds a page's: a method is answered only when `declares.uses` lists the capability `METHODS` files it under. A module that did not declare `trackers:read` gets `refused: 'grant'` and no rows.
- **The same reading.** The answer is the host's stored reading, at once. A server's question costs no tracker request a page's question would not: a ref the host has not read comes back `pending`, as for a page.
- **Never throws.** No host answering is `{ ok: false, why: NO_HOST_TO_ASK }`.

## Epics, steps, parts and dispositions (2.21.0)

A module's server — an MCP door answering an agent, a job judging a change — needs the epic it is about as much as its page does. Before 2.21.0 it could not ask, so servers read files that were not theirs: the host's `.kehikot/host/epics/`, the Journeys module's `journeys.json`, another module's folder. Each of those is a private format that changes without notice. Now the server asks:

```ts
import { askHost } from 'kehikot-module-protocol/serve'

const asking = { module: ID, project }                                  // the door's project
const epics = await askHost('epics.list', {}, asking)                   // { epics: EpicSpine[] }
const epic  = await askHost('epic.get', { epic: slug }, asking)         // the epic as the host keeps it
const steps = await askHost('steps.list', { epic: slug }, asking)       // { steps, phases, providers }
const parts = await askHost('parts.get', { epic: slug }, asking)        // { parts }: context.parts' shape
const marks = await askHost('dispositions.get', {}, asking)             // { dispositions }
```

| method | capability | answered with |
|---|---|---|
| `epics.list` | `epics:read` | `epicsListResult` |
| `epic.get` | `epics:read` | the epic as the host keeps it (title, lede, callout, the shaping prose, its steps) — material, no schema |
| `steps.list` | `steps:read` | `stepsListResult`: every provider's plan ([plans](plans.md)) |
| `parts.get` | `parts:read` | `partsGetResult`: the parts, each with what the modules hold, `picked` false |
| `dispositions.get` | `dispositions:read` | `dispositionsGetResult` |
| `messages.send` | `agents:message` | `messageSendResult` (2.41.0; names no project — the session token's is used, see [agent messages](agent-messages.md)) |
| `messages.read` | `agents:message` | `messageReadResult` (2.41.0) |

Each is held to the same capability as on the page, through the same pass and the same grant, and answered from the same code: a server and a page asking the same question at the same moment get the same answer. `parts:read` and `dispositions:read` are new in 2.21.0 because a page is handed that material in its context and never asked for it; a server asks by name, with nobody looking, and says so in `declares.uses`.

What this replaces, module by module:

- **Factory**'s vision of an epic (its title, lede, callout, parts, and Journeys' goal, measure, appetite, rabbit holes and no-gos) — `epic.get` and `parts.get`, instead of the host's epic files and `readJourney`. Which epic holds a change's ref — `epics.list`, then `steps.list` and `parts.get` per epic.
- **Screenplay**'s epics and their steps — `epics.list`, `epic.get` and `steps.list`, instead of the host's files and `journeys.json`.
- **Flows**' tree — `steps.list` (phases, `under`, `after`, gates), instead of `readJourney` and the untyped fields.

## Who is asking: the pass

A host answers a module, not a program that names one. Every question carries a pass the module's server minted for it (`mintServerPass`, good once for `LIMITS.SERVER_PASS_MS`), and before the host looks at anything else it asks the module at its REGISTERED origin — the address in the registry, never one in the question — whether it minted that pass:

```
module server                         host                                module (its registered origin)
POST /host/server-ask  ─────────────▶
  { module, pass, project,            GET <origin>/api/kehikot/server-pass?pass=<pass>  ─────▶
    method, params }                                                    ◀───── { ok: true, minted: true }
                                      (spent: a second ask says false)
                       ◀─────────────  { ok: true, data } | { ok: false, reason, error, refused? }
```

Only the process serving at the module's origin can say yes, so a program elsewhere on the machine that names the module is told `refused: 'pass'`. The protocol's doors answer `SERVER_PASS_PATH` for every module (`doorsFetch`, `doorsHandler`, so `run` and the Vite plugin too), before the module's own `answer` and whatever its `ours` says; a module mounts nothing. They answer a program on this machine and refuse a page on another origin, like every door.

A module on a protocol before 2.19.0 has no such door, so a host refuses its server's questions with `refused: 'pass'`; its page is answered as before.

## The route, for a host

`POST SERVER_ASK_PATH` (`/host/server-ask`) with `serverAskSchema` — `module`, `pass` (`SERVER_PASS`), `project`, `method` (one of `SERVER_METHODS`), `params` — answered `serverAskResult`. In this order, each a refusal with `reason: 'failed'` and the sentence a module author reads:

1. The question parses, else 400.
2. `module` is registered (`refused: 'module'`, reason `unknown-module`).
3. The module at its registered origin vouches for the pass (`refused: 'pass'`).
4. The manifest the host last read asks for the method's capability (`refused: 'grant'`).
5. `project` is a project the host holds (`refused: 'project'`).
6. `params` parse as `methodParams[method]`; the answer is what the page's call would get, held to `methodResults[method]`.

## Symbols

### `askHost(method, params, options)`

Mints a pass per origin asked, posts the question, and takes the first host that answers it. A host that refuses `project` or `module`, or does not answer, is passed over for the next origin of `KEHIKOT_ORIGINS`; any other refusal is the answer. The data is parsed with the method's result schema, so defaults are filled in as for a page. `fetch` and `env` are injected by tests.

### `SERVER_PASS_PATH`, `serverPassReply`, `spendServerPass`

`/api/kehikot/server-pass`, under `/api/` so a module whose `ours` is the default already routes it, and answered by the doors whatever `ours` says. Spending is by asking: the answer `minted: true` is given once.
