# Asking a module to show something, and asking whether it is done

How one module, an agent or the host makes another module show a thing, lets go of it again and learns whether a person has done it — without knowing that module's tools in advance. Also: how a tool says it only reads, how the context arguments are spelled, and how a module learns another module's name and door.

This is the page a module author follows. The shapes are in `src/door.ts`, `src/manifest.ts` (`mcp.subjects`), `src/serve/neighbours.ts` and `src/check/door.ts`.

Back to the [index](README.md).

## The short version

A module that can be asked says so in its manifest, beside the door the asking arrives at:

```ts
mcp: {
  url: '/mcp',
  transport: 'http',
  about: '…',
  subjects: [
    { kind: 'slide', about: 'One slide of a deck.', show: 'show_slide' },
  ],
},
```

Each entry names a **kind** of thing the module has, and up to three tools at its own MCP door:

| field | the tool that | its answer (`structuredContent`) | must be |
|---|---|---|---|
| `show` | points the open page at one of these | `showAnswerSchema`: `{ outcome, pages, why }` | read-only |
| `release` | stops showing what `show` held | anything that is not an error | read-only |
| `done` | says whether one of these is done | `doneAnswerSchema`: `{ done, items: [{ id, state }] }` | read-only |

A subject names `show`, `done`, or both. `release` is left out when a pointing holds nothing (a slide is turned to once, and that is all), and may name the same tool as `show` when that is how the module lets go.

The tools are ordinary MCP tools. The manifest does not repeat their argument schemas: `tools/list` already carries them. Two things about those schemas are fixed for every module:

- **The context arguments are spelled `project` and `epic`** (`DOOR_ARGUMENTS`). `project` is the absolute directory of the project, which is what `context.projectPath` carries; `epic` is the epic's slug. A caller fills them from where it stands. Everything else in the schema is the subject's own (`deck`, `index`, `id`, `stage`) and the caller supplies it.
- **Every tool says whether it only reads**, in MCP's own form: `annotations: { readOnlyHint: true }` for a tool that shows or reads, `{ readOnlyHint: false, destructiveHint: false }` for one that adds or edits and deletes nothing, `{ readOnlyHint: false }` for one that may delete or overwrite.

## Why declared tools and not a format the host carries

The issue ([kehikko-protocol#28](https://github.com/Jalez/kehikko-protocol/issues/28)) names two shapes. Both were weighed against the three callers that exist.

**A. A format carried by the host**: a `kehikot.show@1` extension. One module emits a cue through `events.emit`; the host delivers it to every module whose manifest consumes it. The emitter does not know who consumes.

**B. Declared tools**: the manifest says which tool points, which lets go and which answers "done?", and MCP stays the transport.

B, for these reasons:

- **Two of the three callers cannot emit.** `events.emit` is a method a framed page asks its host. An agent is not a framed page, and neither is a module's server. Screenplay (a framed module) could emit; an agent explaining something live could not, and the issue says an agent has the same problem.
- **An event is never answered** (`eventSchema`: "Never answered, and lost if the receiver is still loading"). Two of the requirements are answers: a pointed-at module says whether a page is open to see it, and "is this done?" is a question. A format would need a second, answered channel beside it — which is what a tool call already is.
- **What is shown is the module's own.** "Slide 6 of deck intro", "stage 2 of flow field-kinds", "these three pieces of that diagram" share no fields. A shared payload would be `{ kind, arguments }`: a tool call without a reply.
- **The work is already built this way.** Slides' `show_slide` ([kehikko-slides#19](https://github.com/Jalez/kehikko-slides/issues/19)) and Learning's `quiz_state` ([kehikko-learning#15](https://github.com/Jalez/kehikko-learning/issues/15)) are tools, and Screenplay's script already calls tools by name. What was missing is not a transport but a way to find the right tool and trust its answer.

What A had and B must not lose is that **the asker need not know who answers**. B keeps it by declaration instead of by broadcast: a caller looks for the module that declares the kind (`slide`), reads which tool shows it, and calls that. A script can say "show a slide" and never name Slides.

One thing does stay a carried format, because it already is one and it fits: **a place in a document**. `passage.set` puts a file and a range in every module's context, and any module may follow. Slides follows a passage on its deck's file as well as answering `show_slide`. That is the right tool when the thing pointed at is a place in a file and no answer is needed; `subjects` is for a module's own things, and for when the asker needs to know what happened.

## Worked: "show slide 6"

### What Slides declares and lists

```ts
// manifest.ts
mcp: {
  url: '/mcp',
  transport: 'http',
  about: 'Read, draft and edit decks, and show a slide on the page.',
  subjects: [{ kind: 'slide', about: 'One slide of a deck, by the deck and the slide’s index from 0.', show: 'show_slide' }],
},
```

```ts
// doors.ts — the tool as tools/list gives it
{
  name: 'show_slide',
  description: 'Turn the Slides page to one slide of a deck. …',
  inputSchema: {
    type: 'object',
    properties: { project: { … }, deck: { … }, index: { … } },
    required: ['project', 'deck', 'index'],
  },
  outputSchema: SHOW_OUTPUT_SCHEMA,
  annotations: { readOnlyHint: true },
}
```

No `release`: a pointing at a slide is a gesture, nothing is held, and the person turns away by going to another slide.

### What it answers

The sentence it already wrote stays in `content`, for a person and for an agent. Beside it, the state:

```ts
return {
  content: [{ type: 'text', text: said }],
  structuredContent: { outcome, pages, why, deck, index /* and whatever else Slides counts: open, hidden, stale, presenting */ },
}
```

| `outcome` | means | what a caller does |
|---|---|---|
| `shown` | at least one open page is showing it; `pages` says how many | go on. `pages` is pages, not people who saw it |
| `unseen` | no page is open to see it, or none is known to be showing it (a hidden window, a page that did not say) | bring the module into view (`view.fold`, or ask the person), then ask again |
| `declined` | the open pages would not move: a talk is being given, a page holds unsaved text without that slide | do not retry in a loop; say so |

How sure `shown` is depends on the module. Slides' pages report back what they did with each pointing, so its `pages` counts pages that said the slide is on screen in a window that is not hidden. A module whose pages do not report counts the pages it sent the pointing to, and says so in its description. Either way the word is the module's best knowledge, and `pages` is never people.

A slide that does not exist is not an outcome. The tool refuses (`isError: true`) and names the slides the deck has, as it does today: the caller made a mistake a retry will not fix.

### What a caller does

A caller that has never heard of Slides, on a module's server:

```ts
import { showAnswerSchema, toolEffect } from 'kehikot-module-protocol'
import { listTools, readNeighbours } from 'kehikot-module-protocol/serve'

const modules = (await readNeighbours({ except: ME })).filter((one) => one.found)
const slides = modules.find((one) => one.manifest.mcp?.subjects.some((subject) => subject.kind === 'slide' && subject.show))
if (!slides?.door) return 'Nothing on this computer can show a slide.'

const subject = slides.manifest.mcp!.subjects.find((one) => one.kind === 'slide')!
const tool = (await listTools(slides.door))?.find((one) => one.name === subject.show)
if (!tool || toolEffect(tool) !== 'reads') return `${slides.manifest.name} does not say that showing a slide saves nothing.`

// tools/call on slides.door: name subject.show, arguments { project, deck: 'intro', index: 6 }
const answer = showAnswerSchema.parse(reply.result.structuredContent)
```

`project` comes from the caller's own context (`host.projectPath`); `deck` and `index` come from whoever wrote the cue. Whether Slides is on *this* kehikko is `context.containers` (its `module` ids, and from 1.1.0 whether each is `folded`); its name, for a sentence like "Slides is not on this kehikko", is `slides.manifest.name`.

An agent does the same with less ceremony: the host's `read_canvas` lists each container's subjects (see "What the host does"), and the agent calls the tool at that module's door.

## Worked: "is question X answered?"

### What Learning declares and lists

```ts
subjects: [{ kind: 'question', about: 'One question of an epic’s quiz, by its id.', done: 'quiz_state' }],
```

```ts
{
  name: 'quiz_state',
  inputSchema: { type: 'object', properties: { project: { … }, epic: { … }, id: { … }, ids: { … } } },
  outputSchema: DONE_OUTPUT_SCHEMA,   // Learning adds its own properties to it
  annotations: { readOnlyHint: true },
}
```

### What it answers

```ts
import { doneAnswer } from 'kehikot-module-protocol'

const STATE = { answered: 'done', unanswered: 'waiting', not_asked: 'unavailable', unknown: 'unknown' } as const
structuredContent: {
  project, epic,
  ...doneAnswer(questions.map((q) => ({ id: q.id, state: STATE[q.state], epic: q.epic, right: q.right, attempts: q.attempts, at: q.at }))),
}
```

```json
{ "done": false, "items": [
  { "id": "b13a66fc", "state": "done", "right": false, "attempts": 2 },
  { "id": "5e0c1d2a", "state": "waiting" } ] }
```

| `state` | means | a waiting caller |
|---|---|---|
| `done` | a person did it | counts it |
| `waiting` | it can be done and has not been | keeps waiting |
| `unavailable` | it exists and cannot be done as things are (no page shows it) | stops: waiting will not help |
| `unknown` | nothing has that id | stops: this is a mistake, not "not yet" |

`done` at the top is true only when at least one thing was asked about and every one is `done` (`doneAnswer` works it out). A script waits on that one boolean. Whether the answer was *right* is Learning's own fact and rides on the item; the protocol's question is only whether it was done.

This is why the answer is a state and not a sentence: Learning can reword every line of `quizzes` and no waiting script notices.

A module with something to answer for and nothing to show declares only `done`. One that can do both (bring question X in front of the reader, and say whether it was answered) names both tools under the one kind.

## Letting go

`release` is for a module whose `show` holds something until told otherwise: a highlighted stage, a spotlight on part of a diagram. The rule is one sentence: **the release tool is called with the context arguments and nothing else**, and afterwards the module shows what it would have shown had nobody pointed.

A module whose show tool already lets go when called without a subject (Flows clears its pointer when `show_flow` gets no `id`) declares `release: 'show_flow'` and changes nothing. A caller does not need to be told, per module, how to stop: it reads `release` and calls it with `{ project, epic }`.

A walk-through that pointed things calls each `release` when it ends or is stopped, and puts back what it unfolded (`view.fold`, below).

## Read-only, and what a caller may run unasked

A caller that will run whatever a script names has to tell `show_flow` from `drop_flow`. MCP already has the words; the protocol asks every door to use them and gives one reading of them:

```ts
toolEffect(tool)   // 'reads' | 'writes' | 'destroys' | 'unstated'
```

| annotations | `toolEffect` | |
|---|---|---|
| `{ readOnlyHint: true }` | `reads` | shows or reads; changes nothing a person kept |
| `{ readOnlyHint: false, destructiveHint: false }` | `writes` | adds or edits; deletes and overwrites nothing |
| `{ readOnlyHint: false }` or `destructiveHint: true` | `destroys` | may delete or overwrite (MCP's own default for a tool that writes) |
| none, or no `readOnlyHint` | `unstated` | says nothing; a careful caller treats it as `destroys` |

It is the tool's own claim and nothing verifies it, exactly like `declares.uses`. What the protocol does hold a module to is consistency with its own manifest: **a tool named in `subjects` must say `readOnlyHint: true`**, because pointing saves nothing and asking changes nothing. A "show" that writes a file is not a show.

"Read-only" here means: nothing is written that a person would have to undo. A show tool moves a page that is open; that is the point of it, and it is still read-only.

### `check:door`

```
bun run check:door [--running] [<module dir> …]      # the bin is kehikot-check-door
```

Without a running module it reads the files and can only hint, the way `check:parts`' import scan does: the manifest's `subjects` parse; no source file mentions `readOnlyHint` (so the door states nothing); a tool seems to take `projectPath`. It never fails a module on a hint.

`--running` is the explicit opt-in that asks the started module for its tools. It finds the module through the registry (`readNeighbour`), sends one `tools/list`, calls nothing, and then it can fail:

- a tool `subjects` names is not listed;
- a `show`, `release` or `done` tool is not `readOnlyHint: true`;
- a `show` tool's `outputSchema` lacks `outcome`/`pages`, or a `done` tool's lacks `done`/`items`.

and note, without failing: every tool that states nothing, by name; every tool that still takes `projectPath`.

## The context arguments, and the spelling that goes

Counted over every module's door on its `origin/main` (2026-10-12): 12 of the 18 modules have an MCP door, with 63 tools between them.

| spelling | modules | tools |
|---|---|---|
| `project` | 8: checklist, citations, history, journeys, learning, paper, slides, tests | 46 |
| `projectPath` | 4: explorer, notes, review, source | 16 |
| neither | | 1 (`stop_run` in tests) |

In every one the value is the absolute directory. So the one spelling is **`project`**. It is not the same word as in the context, where `project` is the name and `projectPath` the directory, and that is worth saying plainly: at a door there is no use for the name, every door already means the directory, and three quarters of them already call it `project`.

For the epic: 16 tools take `epic`, and journeys' 9 take `slug`. The one spelling is **`epic`**.

Renaming an argument breaks every caller that sends the old one, so the old one keeps being read:

```ts
import { doorContext } from 'kehikot-module-protocol'

const { project, epic, deprecated } = doorContext(args)              // reads projectPath when project is absent
const { project, epic } = doorContext(args, { epic: ['slug'] })      // journeys: reads slug when epic is absent
```

1. **Now**: a door advertises `project` (and `epic`) in its `inputSchema`, and reads its arguments through `doorContext`, which still takes the old name. `deprecated` lists the old names a call used, so the door can add a line to its answer ("`projectPath` is now `project`").
2. **`check:door`** notes any tool whose schema still advertises `projectPath`.
3. **The next breaking release** (2.0.0, with `clearable` and `refreshable`) takes `DOOR_ARGUMENTS_BEFORE` away, and a door stops reading the old name.

`/api/…` routes between a module's own page and its own server are not doors and are not touched by any of this.

## A project that moved (2.3.0)

A project is its id, not its path: a person renames or moves the folder and the host relinks it. An
agent that learnt the old path keeps sending it. So a door does not trust the `project` it is handed;
it asks the host, from its server, with `resolveDoorProject` (`kehikot-module-protocol/serve`):

```ts
import { DOOR_PROJECT_SAYS, resolveDoorProject } from 'kehikot-module-protocol/serve'

const at = await resolveDoorProject(args)       // or resolveDoorProject(folder)
if (!at.ok) return { isError: true, content: [{ type: 'text', text: at.why }] }
const answer = work(at.path)                    // the RETURNED path, never args.project
if (at.movedFrom) answer.content.push({ type: 'text', text: DOOR_PROJECT_SAYS.followed(at.movedFrom, at.path) })
```

It asks `GET /host/is-project` for the folder. A project answers `{ ok: true, path, id? }`. A former
path of a project answers `movedTo` and the project's `id`; the helper follows it ONCE — asks again on
the new path, which must answer `project: true` with the same id — and answers `{ ok: true, path:
<new>, id, movedFrom: <old> }`. Otherwise it refuses, in words every door shares (`DOOR_PROJECT_SAYS`):

| `reason` | `why` |
|---|---|
| `moved` (could not follow) | `That folder was moved to <new>; use that path.` |
| `not-project` (also: no host answered) | `<path> is not a project open in Kehikot.` |
| `unnamed` | ``Name the project: `project` is its absolute folder.`` |

- **Asking on every request is fine** (2.21.1): a "yes" is kept for `LIMITS.HOST_PROJECT_KEEP_MS`
  (60 s) while the same folder is at the path, so a page polling its server every few seconds puts
  the question to the host about once a minute, not every time. See
  [serving.md](serving.md#a-yes-kept-2211).
- **Work on the returned path**, never the argument. After a followed move they differ.
- **Say that you followed it**: add `DOOR_PROJECT_SAYS.followed(from, to)` to the answer, so the agent
  uses the new path from then on.
- **Key server state that outlives a request by the project's id** (`at.id`), and resolve the path
  again on every request. A map from path to state goes stale the moment the folder moves.
- **Page-side state** (held, session or local storage) is keyed by `projectKey(context)`, never by
  `context.projectPath`: the host tells a page the new path in its context after a relink, and the
  id does not change.

`hostHasProject` is still there, a boolean (`project: true` only), for a gate that only needs yes or no.

## A conversation's place (2.4.0)

A person runs several agent sessions at once, each about its own epic, and switches the epic on screen
while they work. A door that read "the open epic" would answer every session about whatever the person
looked at last. So a conversation's place is what a RECORD says about that conversation — never what is
on screen, never a folder taken as a stand-in.

**Records, each with one owner.** The module that starts a conversation keeps its records (Claude's:
which conversation belongs to which place — project, epic, picked parts, kehikko) and issues the
conversation a token. The host keeps only which module issued a token, in which project; it asks that
module what its record says, every time (`RECORDED_PLACE_PATH`), so a conversation moved to another
place, or carried on under a new id, is answered right.

**How it travels.** The module that starts a session issues the token to the host — `POST /host/place`
with `placeIssueSchema` — and the host answers `placeDoorsSchema`: every Kehikot door the session should
have (the host's, and those of the modules on that kehikko) with `?kehikot-place=<token>` (`PLACE_PARAM`)
on each URL, under the server name the person's agent config already uses for it. The session gets them
in a per-session config, so every Kehikot door it calls sees the token on its own URL.

**The skills kept everywhere (2.23.0).** To a module that installs skills itself
(`declares.agentSessions.installsSkills`), the answer also carries `everywhere`: the skills the host
keeps installed in the person's agent for every conversation, as its settings say — its own and every
module's that is not kehikko-bound, but never the skills of another module that runs agent sessions,
which are written for that module's own agent. Each is `{ module, name, version, origin }`, its text at
`origin` + `skillPath(name)`. The module keeps the same ones where ITS agent reads skills, so a person
who chose to have Kehikot's skills in every conversation has them in that agent too. Absent (an older
host): the module changes nothing it keeps for every conversation; empty: the host keeps none.

**What a session is told (2.36.0).** Beside the doors, the answer to `POST /host/place` carries
`modules` (`sessionModuleSchema`: each container on the session's kehikko, in canvas order, with its
name, `summary`, `says` — its `agentSays` — its door's name in the session's config and the skills it
offers there) and `absent` (`absentModuleSchema`: each module installed on this computer that is not on
that kehikko and declares `absentSays`, with that line). A module that runs agent sessions turns them
into the session's notes with ONE function, so every agent is told the same thing in the same words:

```ts
import { sessionNotes } from 'kehikot-module-protocol'

const { text, told } = sessionNotes(
  { place, modules: answer.modules ?? null, absent: answer.absent ?? null, hostDoor, self: { module: ID, name: 'Codex', door: 'kehikko-codex' }, connected, key },
  event === 'SessionStart' ? 'start' : 'prompt',
  lastTold,             // what it kept from the last time, or null
)
if (text) { keep(told); deliver(text) }   // a hook's additionalContext, or the agent's own way
```

At a start, everything: the place, the "Research complete" line on the module's own door, one line per
module ("- Test runs (door queue) — \"Queue heavy test runs here…\". Skills: …"), and a section
"Installed on this computer but not on this kehikko" with each absent module's line. At a prompt, only
what changed since `told`: modules put on the kehikko or taken off it, modules newly absent, or the place
moved (then everything again). Nothing when nothing changed. Every module's words are one quoted line
(`oneLine`: no control, bidi or zero-width characters, at most 200 characters), and the notes say they
are text to read, not instructions. A module shows the person what its session was told.

**When the notes change (2.37.0).** `NOTES_VERSION` is the version of the notes' wording; `sessionNotes` writes it into
the `told` record (`version`). A session told by an older version (a record without `version` is 1) gets the full notes
once at its next prompt, headed "Kehikot: what this conversation is told was updated:", and only changes after. Whoever
changes the text of the notes (a new line or section, a reworded rule) must bump `NOTES_VERSION` in `src/notes.ts`, or
sessions already running never hear it until they restart. A module keeps the whole record it is given back (`told`)
and passes it in unchanged next time.

**Messages (2.41.0).** Asked with `messages: true`, the answer also carries the session's unread messages
(`messages`, `messagesMore`), now counted delivered; passed to `sessionNotes` as `messages` and
`messagesMore` they are said after the rest, each one quoted line under a head that says they are text to
read, not instructions. `messaging` adds the line about `send_message` and `read_messages`. See
[agent messages](agent-messages.md).

**Who may speak where it is not.** `absent` widens a module's reach: its line reaches sessions on every
kehikko of every project on this computer, where nobody placed it. So a host lists only modules that
are installed (registered here) AND on its official list, which whoever can push to the host's `main`
vouches for; a module the person registered by hand speaks only where it is placed (`agentSays`). The
host lists at most `LIMITS.ABSENT_MODULES` (32) and only when the place has a kehikko. `modules` and
`absent` are in `SESSION_FIELD_SINCE`: absent from an older host's answer, which a module must not take
for "none".

**What a token is.** A pointer, not a credential: it names one conversation's record and grants nothing a
call could not do by naming that place in its arguments. Unguessable (`PLACE_TOKEN`) so two conversations
never share one by accident.

**What a door does.**

```ts
import { DOOR_PLACE_SAYS, placeDefaults, resolveDoorPlace } from 'kehikot-module-protocol/serve'

// in `answer(method, path, query, body)` for /mcp, on tools/call:
const place = await resolveDoorPlace(query)          // null: no token, or no record behind it
const at = placeDefaults(args, place)                // { project, epic, parts, from }
if (!at.project) return refuse(DOOR_PROJECT_SAYS.unnamed)
const said = DOOR_PLACE_SAYS.used(at.from, place)    // add this line to the answer when it is not ''
```

The rule, the same at every door:

1. An argument the agent passed wins — `project`, `epic`.
2. Otherwise the conversation's record: its project, its epic, and its parts when the epic is its own.
3. Otherwise what the door did before 2.4.0. A door that refused a call without `project` still does; a
   door that used the person's current view says so every time, in `DOOR_PLACE_SAYS.fellBack`.

`DOOR_PLACE_SAYS.belongs(place)` is the one-line answer to "which epic is this conversation about?";
`DOOR_PLACE_SAYS.looking(place)` says what the person has on screen now, when it differs.

`GET /host/place?kehikot-place=<token>` answers `placeResult`: `{ ok: true, place: DoorPlace | null, why? }`,
where `place.project` is the folder the project is at now, `place.conversation` the conversation the record
is about, and `place.looking` what a page of the host has on screen (null with no page open).
`hostPlace(token)` asks it; `placeTokenOf(query | url | request)` reads the token. Both fail closed to
null and never throw. Server-side only.

**A conversation nobody started from a place.** Measured on Claude Code 2.1.304: an MCP server is not told
which conversation is calling — no header, no `initialize` field, and `${CLAUDE_CODE_SESSION_ID}` in an MCP
config is not expanded to the session's own id. Claude Code's `SessionStart` hook IS told (`session_id`,
`cwd`), so a module that keeps conversation records can hear of one the moment it starts and list it as
not yet assigned. A door with no token answers as rule 3 says.

## Learning another module's name and door

`context.containers` stays small: a module id, whether it is picked out, whether it is folded, and what it says it is showing. Everything else about a neighbour is in that neighbour's manifest, and from 1.1.0 there is a reader for it beside `readRegistration`:

```ts
import { readNeighbour, readNeighbours, listTools } from 'kehikot-module-protocol/serve'

const flows = await readNeighbour('kehikot.flows')
if (!flows.found) return flows.sentence      // "kehikot.flows is not registered on this computer." / "… nothing answered there. It is not running."
flows.manifest.name                          // "Flows"
flows.manifest.reacts                        // whether it follows a passage
flows.manifest.mcp?.subjects                 // what it can be asked
flows.door                                   // "http://127.0.0.1:7410/mcp", or null
```

It reads the registration, asks the module's own well-known path, parses the answer with `manifestSchema`, and refuses an answer that carries another id (the registration is a hint; the answer is the fact). `door` is the MCP address resolved against the module's origin, and `null` when there is none, when it is `stdio`, or when it points off the module's origin.

It is node-only (`/serve`), which is where the caller is: a tool call to another module's door is made by a module's server or by an agent, not by a framed page, which would need that module to allow its origin. A page that wants a neighbour's name asks its own server.

"Is anything on this canvas following a passage?" is then `context.containers` (who is here) joined with each one's `manifest.reacts` (what it follows).

## What the host does

Nothing in this part of the protocol is carried by the host, and a 1.0.0 host is not in the way of any of it. Two things make it better, and they are specified here, not built:

- **`read_canvas` lists each container's `subjects`** from the manifest it already holds: kind, `about`, and the tool names, beside the door's address. An agent then learns "the tool that points" without opening every door.
- **`containers[].folded`** in the context, so a caller knows whether the module it is about to point is in view.

## Bringing the module into view: `view.fold`

Pointing a module that is folded to its header shows nothing. A framed module asks the host:

```ts
const said = foldResult.parse(await host.request('view.fold', { unfold: ['kehikot.learning'] }))
// { outcome: 'changed', folded: [], unfolded: ['kehikot.learning'], why: '' }
```

| `outcome` | |
|---|---|
| `changed` | at least one container was folded or unfolded; `folded` and `unfolded` list exactly those |
| `unchanged` | every one was already as asked |
| `declined` | the host will not, right now |
| `no-such-container` | an id is not on this kehikko; nothing was changed |

All four are `ok: true`, for the reason a declined `view.goto` is. A host without the method answers `unknown-method`.

The rules are the ones [kehikko#61](https://github.com/Jalez/kehikko/issues/61) sets, and they are the host's to keep: it is visible when it happens and says who asked; it folds and unfolds and does nothing else; a person's own press wins.

**Putting things back** is the caller's half. `folded` and `unfolded` are what the call changed, so `{ fold: said.unfolded, unfold: said.folded }` undoes it. Before sending that, drop every id whose `folded` in `context.containers` is no longer what this caller left it at: a person moved it, and it is theirs.

An agent does the same at the host's own door with `fold_modules`, which takes the same two lists.
