# kehikot-module-protocol

The contract between a Kehikot host and a module it frames.

A host application frames small programs somebody runs on their own machine.
Each program serves a manifest describing itself, a page the host embeds in a
frame, and its own MCP server. This package is the set of shapes both sides
agree on — the manifest, the eight messages that cross the frame, the extension
payloads — and nothing else.

```
npm install kehikot-module-protocol zod
```

`zod` is a peer dependency on purpose. Schemas from two copies of zod do not
interoperate, and this package exists so that two programs hold the *same*
schema.

## The rule

**This package contains shapes, never decisions.** Types, schemas, constants,
and pure functions over them. No filesystem, no network, no state, no
dispatch, no defaults that stand in for a policy.

The reason is not tidiness.

A host validates everything it receives with its own copy of these schemas.
Anything shipped in a package is code a module also runs, and a check that lives
only here is one somebody can run a patched copy of — a module author who wants
past a bound need only publish their own build with the bound removed, or edit
the copy in their `node_modules`, and nothing about the fact that the check
"came from the protocol package" survives that. A check is only a check where it
runs on the deciding side, over material the checked party cannot reach.

So: **the kit makes honest programs easy; it never makes the host's decision.**
Everything here is a way for a module author to get the shape right the first
time and for a host author to write the same shape without guessing. When a
host imports `manifestSchema`, it is importing a convenience, and it stays
responsible for having run it.

Concretely, the things this package deliberately does not do:

- It does not fetch a manifest, resolve a URL, or decide that an address is one
  worth talking to. `entry`, `icon`, `health` and `mcp.url` are bounded strings
  here; whether a module may point them where it pointed them depends on the
  origin the manifest arrived from, which this package never sees.
- It does not dispatch a method or shape a response. `methodParams` says what a
  caller must construct; what comes back is `unknown`, because no host promised
  otherwise.
- It does not route an extension payload, name its sender, or record anything.
  `schemaFor` hands back a schema. Delivering is a decision.
- It does not clamp anything on anybody's behalf. `clampHeight` is the host's
  arithmetic restated so a module can predict the answer; the host runs its own
  copy over the raw value it was handed.
- It contains no notion of an approval, a grant, a permission, or a consent
  handshake, and it never will. See below.

## What is in it

| | |
|---|---|
| `manifestSchema`, `Manifest` | What a module says about itself, served at `WELL_KNOWN`. Every string bounded. |
| `speaks(range, protocol)` | Whether a protocol range includes a number. A reading, not a decision. |
| `helloSchema` … `wentSchema` | The eight messages, and `hostMessageSchema` / `moduleMessageSchema` to parse a direction at a time. |
| `notificationPayload`, `callPayload`, `EXTENSIONS` | The versioned formats modules send each other through a host. |
| `PROTOCOL`, `WELL_KNOWN`, `MANIFEST_KIND`, `MESSAGE`, `LIMITS` | One spelling and one number each, so two packages cannot disagree. |
| `METHODS`, `methodParams`, `CAPABILITIES` | The questions a module can ask, by name and by shape. |
| `methodResults`, `resultSchemaFor` | The answers that are outcomes rather than material, and so have a shape. |
| `navigationResult`, `projectPickResult`, `epicsListResult`, `epicSpine` | Those answers. |
| `MODULE_ID`, `MODE_ID`, `EPIC_SLUG`, `own` | The name patterns, and one lookup that does not fall through a prototype. |
| `KEHIKOT_DIR`, `moduleFolder`, `moduleDir`, `moduleFile`, `within` | Where a module keeps this project's data, given `context.projectPath`. |
| `KEHIKOT_IGNORE`, `ignoresKehikot`, `withKehikotIgnored` | The lines that project's `.gitignore` gains, added once. |
| `partSchema`, `EpicPart`, `PART_ID`, `pickedParts`, `isFocused`, `refInFocus`, `partInFocus`, `focusCount` | The parts of the open epic in `context.parts`, and whether a thing is in the ones a person picked out. |
| `fileInFocus`, `pickedFiles`, `partsOfFile`, `paperFileOf`, `partFile`, `isPartFile`, `PAPER_MODULE` | The files of the epic's paper a part owns (0.32.0): whether a file is in the picked parts, and the one comparison between the path a module holds and the name a part stores. |
| `Anchor`, `anchorInFocus`, `narrowToFocus`, `focusSentence`, `FOCUS_WHERE`, `sameParts`, `partsDeclaration` | One anchor, one rule (0.34.0): what ties an item of a module's data to a part — a file, a ref or a part id — the one answer to "is it in front of the person", the list narrowed with its count, the sentence every module says about what it left out, and what a manifest says about all of it. |

| `journeyRecordSchema`, `journeyStepSchema`, `journeyGroupSchema`, `stepsFromSchema`, `journeysDocumentSchema`, `journeyIn`, `journeySlugs`, `stepsOf`, `stepPart`, `JOURNEYS_MODULE`, `JOURNEYS_FILE` | An epic's steps and groups as a project keeps them on disk: the one shape the module that writes them and a host that reads them both import. |
| `partsOf`, `partIdsOf`, `JourneyPart`, `slugFrom` | The parts of an epic read off its record, and the one derivation of a part's id from its heading: what a host composes `context.parts` from and what the module that edits steps checks a step's `part` against. |
| `parseSource`, `serialiseSource`, `uncitable`, `markersIn`, `replaceMarkers`, `CITE_MARKER`, `normaliseQuote`, `findQuote`, `resolveSource`, `linesOf`, `CITE_STATUSES`, `CitedSource`, `CitedRange`, `CitationView` | A citation (0.33.0): the `[^n]: <path> \| "<quote>"` line two modules write, the markers that name it, and the one rule for finding its words in a file again — `holds`, `ambiguous`, `adrift` or `unreadable`. |

And behind two subpaths, which are not shapes and say so:

| | |
|---|---|
| `kehikot-module-protocol/client` | `connect`, `mailbox`, `HostRefused` — the module half of the wire, for a page that would rather not write it again. Browser code, kept out of the front door so a Bun process can import shapes without it. **A convenience: a module may hand-roll its wire and be perfectly conforming.** |
| `kehikot-module-protocol/client/react` | `useKehikot` (once `useRoadmap`, still exported as an alias), and `useFocus` (0.34.0), the parts focus as one value. Optional; `react` is an optional peer dependency and `client` does not import it. |

## Renamed from "roadmap", and what a module has to change

This package was `roadmap-module-protocol`, and every name it put on the wire
said `roadmap.`. The app is Kehikot now, and since 0.25.0 the names say
`kehikot.`. Nothing about the protocol changed meaning, so `PROTOCOL` is still
2 — see the note on it in `constants.ts`, and `src/dialect.ts` for the design.

**Both spellings work, in both directions, for at least one version:**

- A host reads either spelling of everything: `roadmap.*` and `kehikot.*`
  messages, both manifest kinds, both well-known paths (new first), both
  spellings of an extension name, and `roadmap.x` as the same module as
  `kehikot.x`. Every schema here hands back the `kehikot.` spelling.
- A host greets a module in the dialect its manifest's `kind` says it speaks,
  so an unchanged module is greeted with `roadmap.hello` and hears everything
  after it in `roadmap.` too (`toDialect`).
- `connect()` answers in whatever dialect it was greeted in, so a module built
  against this version works under a host from before the rename as well.
- `moduleFolder('roadmap.x')` and `moduleFolder('kehikot.x')` are both `x`:
  no module's data moves.

**What a module changes, when it moves to this version:**

1. `package.json`: the dependency key becomes `kehikot-module-protocol`, same
   git URL (`git+ssh://git@github.com/Jalez/kehikko-protocol.git#main`). Then
   `bun install` and commit `bun.lock`.
2. Imports: `roadmap-module-protocol…` becomes `kehikot-module-protocol…`
   (`/client`, `/client/react`, `/serve`, `/facets`). `useRoadmap` is
   `useKehikot` (the old names are deprecated aliases).
3. The manifest: `kind: MANIFEST_KIND` (now `kehikot.module`) and the id
   `kehikot.<name>` instead of `roadmap.<name>`. The host treats both ids as
   one module, so its placements, state and registration carry over.
4. Serve the manifest at `WELL_KNOWN` (`/.well-known/kehikot-module.json`) —
   and, to stay visible to a host from before the rename, also at
   `LEGACY_WELL_KNOWN` with `legacyManifest(MANIFEST)`.
5. Message types: only a module that spells them by hand (rather than through
   `MESSAGE` and `connect()`) has anything to change — use `MESSAGE.*`, or
   `toDialect` if it posts its own.
6. Extension names: `kehikot.notifications@1`, `kehikot.calls@1` in
   `extensions.emits`/`consumes` and in `events.emit`.
7. `vite.config.ts`: `frame-ancestors` from `frameAncestors()` in `/serve`,
   which reads `KEHIKOT_ORIGINS` (the space-separated list a host passes:
   development page, desktop app page, Tauri window), then `KEHIKOT_ORIGIN`,
   then `ROADMAP_ORIGIN`, then every origin a host here serves from.
8. `run.sh`: `bun install --frozen-lockfile` whenever `bun.lock` or
   `package.json` is newer than the last install — see `template/run.sh`.
9. `register.ts` needs nothing: `registerAt` now writes the Kehikot machine
   directory (`~/Library/Application Support/Kehikot/modules`), reading what the
   old `roadmap.x.json` said (`keep` above all) and leaving that file alone.

## The wire

Ten messages, across a frame, by `postMessage`.

| Host → module | |
|---|---|
| `kehikot.hello` | The greeting, on every frame load. Carries the protocol both sides settled on, a session name, and the current context. |
| `kehikot.context` | Which epic is open, which project it belongs to and where that project is on disk, which theme. Sent on every switch. |
| `kehikot.response` | The answer to exactly one request. |
| `kehikot.goto` | Go to this reference. |
| `kehikot.event` | An extension payload another module emitted. |
| `kehikot.clear` | "Clear what you are showing." The press, relayed — no ids, no answer. |

| Module → host | |
|---|---|
| `kehikot.ready` | "I heard you." |
| `kehikot.request` | One question, with an id the answer carries back. |
| `kehikot.resize` | How tall it would like to be. |
| `kehikot.went` | Whether the `goto` found anything. |
| `kehikot.filters` | What this module can be narrowed by, so the host can draw the control. |
| `kehikot.clearable` | That what it shows can be cleared, and what to call the control. `null` withdraws it. |

`goto` and `went` are the new pair, and `went` is the piece the protocol has
always lacked. Everything else the host says is fire-and-forget. `goto` cannot
be, because a host's reference index decides whether to walk the reader in place
or fall back to an ordinary link, and it decides by whether the walk found
anything. In a host's own page that answer was a return value; across a frame it
has to be a message. This is the only place a host waits on a module, so:
**a host must time out, and the timeout must mean the same thing as
`found: false`.** A module that never answers must not be able to hang a
reference.

A refusal always carries two things. `reason` is a word from a closed set, for
the program — `unknown-module`, `unknown-method`, `failed` — because "ask again"
and "never" are different futures and code should not have to read English to
tell them apart. `error` is a sentence, for the person writing the module, who
reads it in their own console and has to know which call was wrong. Neither
substitutes for the other.

## Epics are not journeys

An **epic** belongs to a project. It is the thing a host holds — the steps,
their order, the references they name, what the last refresh read from the
trackers — and it is therefore the only thing a host is in a position to tell a
module about. A **journey** is a different idea, and it lives in a module app of
its own.

These files were distilled from a codebase where the two words meant one thing,
and the conflation had reached the methods (`journeys.list`, `journey.get`), the
context field a module reads on every switch, the mode `scope` enum, the
capability names and the slug pattern. All of it now says `epic`, with **no
aliases** — a shim would keep the confusion working, which is the whole of what
was wrong with it.

The consequence worth naming is `kehikot.context`. It used to say which journey
was open, and a host saying that is repeating something it was told: the module
that owns journeys could be showing a different one, or none, or have been
closed. Context has to be the host's own knowledge or it is a rumour with a
protocol's name on it. So context names an epic and a project, and a module that
wants to know what journey somebody is reading asks the program that owns
journeys — which from this protocol's side is not a special arrangement at all.
It is just a program.

`EPIC_SLUG` describes an epic slug and only that. If a journey slug turns out to
be spelled differently, nothing here changes, because a host is not the
authority on that name.

All of that is about the **wire**, and all of it still holds. What 0.30.0 adds
is about the **disk**, and it is narrower than it sounds: the record the
Journeys module keeps for an epic is now something a host reads, so its shape
is written here. See "An epic's steps are kept once", below, for what was
decided.

## A project is named and a project is somewhere

`context.project` says what the project is called. `context.projectPath` says
where it is: an absolute folder on the host's machine, or `null` when the host
has no filesystem to point at.

Two fields rather than one object, and the argument is on `projectPath` in
`wire.ts`. In short: a name is what a module PRINTS and a path is what a module
OPENS, one string cannot do both jobs well, and nesting them would have changed
the shape of a field that already exists — which is the one thing `PROTOCOL` is
supposed to go up for. Adding a field is not. A module that never reads
`projectPath` is exactly as correct as it was before it existed.

What it replaces is an environment variable per module, set at launch by
whoever started the program. Under that arrangement a host could move a person
to another project and every module would go on reading the first one,
correctly, from the root it was handed — nothing erroring, and every module
describing a different project from the one the host had named.

## And a module's data lives in the project, at `.kehikot/`

`moduleFile(context.projectPath, 'kehikot.notes', 'notes')` is
`<projectPath>/.kehikot/notes/notes.json`, and that is the whole convention:
one folder for the app, one folder per module inside it, and the module's own
files in there.

    <projectPath>/.kehikot/
        checklist/checklists.json
        checklist/papers.json
        notes/notes.json
        learning/questions.json
        journeys/journeys.json

It is here rather than in each module because it is the same class of thing as
`kehikot.hello`: a spelling two programs have to share, whose disagreement has
no symptom. A module writing `.kehikot/` and one writing `kehikot/` both work,
both look right, and the person who opens their project finds half their work
in one folder and half in another with nothing on any screen to say why.

`kehikot` and not `kehikko`, deliberately. **Kehikot is the app; a kehikko is
one canvas inside it.** The folder holds the app's data for a project, which
belongs to every canvas that person has rather than to one of them. It is
spelled in exactly one constant, `KEHIKOT_DIR`, so renaming it is one edit.

A **folder per module** rather than a flat directory of files, for two reasons
that are the whole of what the extra level buys:

- **A module may keep more than one file** without inventing a prefix.
  Checklist keeps two, and under a flat directory the second would have needed
  a name saying whose it was — which is a folder spelled badly.
- **One module's data can be deleted, copied or read on its own.** That is most
  of what "transparent, and usable by others in the project" actually buys
  somebody. `rm -r .kehikot/notes` is a sentence.

The folder's name is `moduleFolder(id)`: the module's id with `kehikot.` (or
the pre-rename `roadmap.`) taken off — so `roadmap.notes` and `kehikot.notes`
both keep their data in `.kehikot/notes` and the rename moves nothing — because a directory called `kehikot.checklist` in somebody's own
repository carries a prefix that means nothing to the person reading it. That
derivation is a PATH BUILT FROM DATA — the id came off a manifest on a port —
so it is checked against a rule of its own and throws rather than falling back.
An id with neither prefix is used whole; this package does not get to
decide somebody else's namespace is noise.

Three more things follow, and they are why this is worth a section:

- **The path is the partition.** A module does not key its store by project.
  The file it opened is already that project's, so switching project is opening
  a different file rather than filtering a bigger one — and a store that has
  never heard of a project cannot leak one project's rows into another's view.
- **`null` in, `null` out.** No project open, or a host too old to send a path,
  and `kehikotDir` answers `null`. A module then has nowhere to read and nowhere
  to write, and says so. What it must not do is fall back to its own directory:
  that is somebody's notes written into a folder they will never open, under a
  screen that says they were saved.
- **The path arrived over the wire, so the module still owns the fence.**
  `within()` is a string comparison, offered because `startsWith` gets it wrong
  for `/p/.kehikot/notes-elsewhere`. It is not the check. A module writing under
  a path a host handed it has to `realpath` both sides and compare the results,
  in its own process, where the filesystem is — this package does no I/O and
  cannot do it for you.

`withKehikotIgnored()` is the last piece: the text a project's `.gitignore`
should have once that folder exists. Append-only, idempotent, and it carries a
comment explaining what the folder is and that deleting the rule is how you
share it — because a rule somebody cannot explain is a rule they delete. It
ignores the whole `.kehikot/`, not one module's folder, so adding a module
never means editing somebody's ignore file again.

## Asking the host to move

A module could be walked and could not walk. `kehikot.goto` goes one way, and
the module's four words are `ready`, `request`, `resize`, `went` — none of which
moves anybody. So a program showing a person every project and epic on the
machine could draw the whole map and never travel on it.

The missing capability is a **method**, `view.goto`, under a new capability
`view:navigate`:

```ts
ask('view.goto', { epic: 'modes-are-modules', step: 3 })  // any one of the three
ask('view.goto', { ref: 'gh#41' })
```

A method rather than a ninth message type, for three reasons. It needs an
answer, and `request`/`response` already has correlation, a timeout discipline
and a refusal envelope — a second answered pair would be that machinery again,
differently, for one act. It belongs to a capability, so `declares.uses` still
reads as a sentence. And the tone is right: the module's messages are three
statements and one unanswerable ask (`resize`, which the host clamps and may
ignore), so a `kehikot.navigate` posted at a host would read like a thing done
rather than a thing asked. Two programs both believing they decide what is on
screen is the defect this arrangement exists to prevent.

The answer is one of three words, because they send a person to three different
places:

| | |
|---|---|
| `moved` | The reader is looking at it. Say nothing; the screen already said it. |
| `declined` | The host will not, right now. The target may well exist. Leave the row pressable, offer an ordinary link. |
| `no-such-target` | There is no such epic, step, or reference. Say so — a dead reference is worth showing as dead. |

It also carries `epic`, where the reader ended up, for the `global` mode that is
never sent context and would otherwise be drawing a map with no marker on it;
and `why`, the sentence, for whoever is reading.

**A decline comes back `ok: true`.** It is not a failed call: the host
understood the question, considered it, and answered no. `ok: false` stays what
it was — the call did not happen — because collapsing "the answer is no" into
"the question failed" leaves a caller unable to tell a host that refuses from a
host too old to have been asked, and those are the two futures the refusal
design exists to keep apart.

## Asking the person which project, without being told what projects there are

A module is handed one `projectPath` and may read what the host named. That is
the rule the whole arrangement rests on, and the obvious way to break it is a
method called `projects.list` — a module holding that has been given a listing
of somebody's disk, and everything after is a question of how fast it can walk
it.

`projects.pick` is the other shape, and it is the browser's file picker's shape:

```ts
const answer = await ask('projects.pick', {}, { within: PERSON_ANSWERS_WITHIN_MS })
// { outcome: 'picked', project: { path: '/Users/…/thesis', name: 'thesis' }, why: '' }
```

The call takes **nothing**. No path to prefer, no filter, no sentence for the
dialog: a suggested path is a claim that a folder exists, a filter is a probe
run against a listing the module was not given, and a sentence in the host's
dialog is a sentence a person reads as the host's. The host composes what it
says out of the registration the conversation was built on, exactly as it
supplies `from` to `events.emit` and `filters.set`.

What comes back is one answer to one question a person just answered:

| | |
|---|---|
| `picked` | Somebody chose one. `project.path` is absolute and resolved, like `context.projectPath`; `project.name` is for a sentence and never for locating anything. |
| `cancelled` | The picker was opened and closed without a choice. Nothing is wrong. |
| `declined` | The host would not ask — including because it holds no projects. |

**`declined` covers "there are none", and that is deliberate.** A fourth outcome
saying so is an enumeration with a count of zero, and a module that could tell
"you have no projects" from "I would rather not" could learn about the disk by
asking. A module treats the two the same way: stop asking, say nothing
alarming, leave the control where it was.

No new KIND of thing crosses the wire. `context.projectPath` already gives a
module an absolute path; this gives it a second one, chosen, one at a time. The
person is the gate, and there is no version of this where they are not.

**Its answer arrives late, and that is a property of the question.** The
client's `ANSWER_WITHIN_MS` is twelve seconds, tuned for a host reading a file
off a cold disk; somebody reading a list of thirty folders beats it. So
`request` takes a per-call `{ within }` — because how long an answer takes
belongs to the question, not to the wire, and a connection raised to five
minutes would take five minutes to discover the host is gone. See
`PERSON_ANSWERS_WITHIN_MS`.

## Some answers have a shape, and the line is not where you would guess

`methodParams` says what a caller constructs; what comes back is `unknown`,
because no host promised otherwise. That still holds for `epic.get`,
`steps.list` and `live.get`, and the reason is about **material**: two honest
hosts hold different amounts of an epic, and a schema over that would be this
package legislating what a host must keep.

Some answers are not material, and `methodResults` gives those a shape.

An **outcome** reports what happened to an act this protocol itself defines.
Nothing about a host's holdings varies there. An unspecified `view.goto` answer
is not modesty — a caller that cannot tell "you are looking at it" from "I would
rather not" from "there is nothing by that name" without parsing English has a
request it cannot act on.

`projects.pick` is an outcome by the same test: `picked`, `cancelled` and
`declined` send a module three different ways.

**`epics.list`** is the case the rule does not cover, and its argument is
different. Every other
question takes an epic slug, and `epics.list` is the only way to get one. If its
answer may be anything, a module cannot rely on an epic having a name, and a
protocol whose entry point returns an unknown shape has one reachable method.
So `epicSpine` requires `slug`, bounds `title` and `project` if they are there,
and **passes everything else through untouched**. It names the fields without
which the question cannot be answered; it does not name the set of fields, and a
host with ledes, counts, owners or dates hands them over and keeps them.

`resultSchemaFor(method)` returns nothing for the rest, and nothing means
*unspecified* rather than *empty*. Do not write a fallback that treats a missing
schema as "expects nothing". And it asks with `Object.hasOwn`, because a method
name is a stranger's string — see the prototype section below.

## No consent, and what that changes

An earlier design had a module ask for permissions in its manifest and a person
answer a dialog. That mechanism is gone in full: the scope vocabulary, the
generated per-extension scopes, the manifest digest that made a changed module
ask again, the grant store, the `offered` and `changed` states, and the
`not-allowed` refusal. None of it is modelled here and none of it should be
reintroduced under another name.

What survives is the **declaration**. `declares.uses` is where a module says
what it intends to call. It is worth reading — it is a sentence somebody can
weigh before installing the program — and it is not a request, is not answered,
and unlocks nothing. The field is called `declares` rather than `needs` or
`requests` for exactly that reason: a name that reads like half of a handshake
would be this package implying the other half exists.

A host still refuses whatever it likes, at every call, out of material a module
never touches. Note the consequence for `uses`: a host must not check calls
against it, because a declaration is a string the module wrote, and a check
against that is one the module passes by writing something different.

A module is in one of three conditions, and each is a fact rather than a
verdict: `ready`, `incompatible`, `silent`. `silent` earns its place in a list —
a module that silently fails to appear is indistinguishable from one that was
never installed.

## What a module says it reacts to

`reacts` is the other half of the registry sentence, and it is the half that had
been missing. A host reading manifests can already say who SENDS: `emits` names
a format, and `passage:set` and `selection:set` in `declares.uses` name a module
that can put something in front of every framed pane on a canvas. It could not
say who RECEIVES a context, because nothing in a manifest said so — every framed
module is handed the whole context, so receiving one distinguished nobody.

So `reacts` is a top-level array of context kinds, and `REACTS_TO` is the
vocabulary this version knows: `passage`, `selection`, `containers`,
`dispositions`, `tracker`, `content` and `parts`. A
registry can now put "Consumes: X, Y" beside "Provides to: Z, W" and mean
something by both.

`containers` is the third and the first whose other end is partly
the host. `context.containers` lists every container on the kehikko: which
module, whether a person has picked it out as a target, and what it says it is
showing — references and places in documents, sent with `showing.set` under
`showing:set`. A module that files things against references and documents
reads it to show what belongs to everything on the canvas, and to narrow to the
containers that are picked out. The essays on `showingSchema` and
`containerSchema` in `src/wire.ts` are the argument, including why `passage` and
`selection` could not already say it and what a host may fold into the list.

Three things about it, and each is load-bearing:

**It is not a permission, and must never become one.** A context is broadcast to
every framed module. A host that skipped the broadcast to frames which had not
declared an interest would have invented a permission over something it was
already sending, and would have made a forgotten word in a manifest into a
module that fails silently from the inside. A module that declares nothing here
behaves exactly as it did; a module that declares everything gains nothing. The
penalty for lying is being wrong in a list.

**It is not beside `declares.uses`, on purpose.** A capability is what a module
asks the host FOR. This is what a module says it DOES with what it is already
given. Two arrays of short lowercase words in one object, pointing in opposite
directions, is how one of them eventually gets checked the way the other is.

**It is not folded into `extensions.consumes`.** An extension is *carried*: the
host reads both manifests and posts the payload into a frame, so the host may
vouch for both ends. A context is *broadcast*, and what a module writes here is
its own account of itself, which no host can check. Merging the two arrays would
merge a claim a host can stand behind with one it cannot.

The open epic is deliberately not in the vocabulary: `modes[].scope` already
says whether a module follows the reader, and `declares.prompt` already says
whether it wants a prompt. The rule for adding a word is that no other field in
the manifest already says it.

## Where a module files itself

`tags` is a short list of category words a module gives about itself, most
fitting first: `tags: ['code', 'review']`. A host that lists modules can then
group and search them without a table of which module is which, and somebody's
own module is shelved by the same rule as a first-party one.

The words this version suggests are in `TAGS`:

| tag | for |
| --- | --- |
| `planning` | deciding what the work is: journeys, references, checklists |
| `reading` | reading a document somebody else wrote |
| `writing` | writing one: a paper, a deck, notes |
| `code` | looking at and working in source |
| `review` | judging a change before it lands |
| `agents` | running agents and hearing back from them |
| `tests` | running checks and reading what they said |

**It is a suggestion, and nothing is checked against it.** The same rule as
`reacts`: a word no host has heard of is carried as written and drawn as it is.
What is checked is the shape — lowercase, starting with a letter, letters,
digits and hyphens, at most `LIMITS.TAG` long, at most `LIMITS.TAGS` of them —
because a tag ends up in a heading and a search box.

**The order is the meaning.** The first tag is the module's primary category,
which is where a host that shows each module once puts it. The rest only widen
what a search finds.

Empty by default, so the field is additive: a manifest that says nothing parses
to a module with no category, and a host files it under whatever it calls
"other".

## A module's data has a version of its own

`dataVersion` is a positive integer naming the format a module writes under
`<project>/.kehikot/<module>/`. Absent means 1, so every manifest written before
it parses unchanged.

It exists because a host may run more than one release of a module against one
project — a container pinned to `v1.2.0` beside one on the latest. Data stays
shared between them, so a newer release that migrated the files could leave an
older one reading something it does not understand. A host records, per project
and module, the highest `dataVersion` that has run there, and refuses — with a
sentence saying why — to run a release that declares a lower one.

It is not `version`. `version` is the program's own string, which this protocol
never parses; most releases change it and leave the data format alone, and a
host that compared `version` would refuse every harmless downgrade. Raise
`dataVersion` in the one release that first writes data an earlier release
cannot read, and at no other time.

## A filter the host draws and the module means

Five modules in the workspace this was distilled from had each built the same
control: a toggle spelled `hide resolved`, or `show 3 ignored`, or `hide
preamble comments`, or `all / this kehikko / no kehikko`, each drawn inside a
module's own page, each eating a row in a column that is often 220 pixels wide.
A sixth was about to grow two more. They are the same idea seven times, and none
of them could be put anywhere but inside the module, because the strip around a
module belongs to the host.

So a module can hand the host the values and let the host draw the control.

```ts
live.filters([
  {
    id: 'ignored',
    label: 'ignored files',
    fallback: 'hide',
    options: [
      { id: 'hide', label: 'hide 3 ignored' },
      { id: 'show', label: 'show them' },
    ],
  },
])
```

`kehikot.filters` goes module → host and replaces the whole offer every time; an
empty `groups` withdraws it. The choice comes back the other way in
`context.filters`, a record of group id → option id.

**The host must not understand what a filter means.** An option is an id and a
short label, and there is deliberately no icon, no count field, no kind and no
hint about whether one option means more of anything than another. A host that
knew `resolved` from `ignored` would be a host to be updated every time a module
has a new idea, and the modules this was built for have six different ideas
between them. The host draws a menu and reports a press; the meaning stays in
the program that wrote the label.

**It is a third thing, and not a third declaration.** `declares.uses` is what a
module asks the host FOR. `reacts` is what a module says it DOES with what it is
already given. Both are written in a manifest, read before the program runs, by
a person deciding whether to run it. This is none of those: it is not in the
manifest, is sent by a running module about what it is showing right now, and
gates nothing. A module that never sends one is a module the host draws no
control for — which is what every module looked like the day before this
existed, and is still what most of them look like.

**Groups, plural, because two axes can be live at once.** Six of the seven real
filters are one choice from one list. The seventh narrows by kind and by state
independently, which cannot be spelled as one list without multiplying the two
together. The one-group case is a list of length one.

**Free text is not expressible, and that is a decision.** A text input in a
container header needs room a 220-pixel header does not have, needs focus, needs
a keyboard, and cannot be debounced or interpreted by a host that does not know
what it is searching. A module with a query box keeps it in its own page — and
may reasonably decide that having its filtering in two places is worse than
having it in one, in which case it keeps all of it.

**`fallback` is what makes a stale choice recoverable.** It names the option a
group is on when nobody has chosen. It is also what a host returns to when a
remembered choice names an option the module no longer offers, and what lets a
host offer one press that puts everything back without knowing which option
means "everything". A module should ALSO fall back to its own default for an id
it does not recognise: a host cannot prune a stored choice before the module has
said what it offers, and the greeting goes out first. Both halves have to be
able to survive the disagreement alone.

**The count rides in the label.** `hide 3 ignored` is one string. A separate
count field would be the protocol deciding how a count is phrased, for a module
that knows better and whose interesting number is sometimes a fraction. A host
cannot count anything itself — it sees rows it does not render, in a document it
cannot read, in a frame on another origin. A module for which the exact number
must be visible without a press should go on drawing it in its own page.

Where the choice is REMEMBERED is the host's business and not this package's.
The one thing the shapes insist on is that it arrives in the greeting, so a
module never draws its defaults and corrects them a moment later — the same
argument `state` makes, and the same flicker.

### Toggles, and the shared ref facets at `/facets`

A third group kind, `toggles`, is a set of options each switched on or off on
its own; its value in `context.filters` is the list of ids that are on. It is
what lets one "hide" group say *hide closed MRs/PRs, keep closed issues* —
a cell of kind × state that two single-choice groups could not reach.

The modules that list references agree on what those ids mean through
`kehikot-module-protocol/facets`: `issue:closed`, `change:closed`,
`change:merged`, `closed:wont-do`, … with `facetsOf`, `offer`, `hiddenIn`,
`sift` and `countFacets` to build the group and apply a choice. It is pure,
off the main entry because it is vocabulary rather than shape, and a host never
imports it — the host still draws options it does not understand.

## The parts of an epic, and focusing on some of them

An epic that has grown to forty steps is still one piece of work, and nobody
can look at all of it at once. So an epic may be divided into **parts** — one
level deep, a heading and what is under it; not an epic inside an epic — and a
person may pick out one or several in the host's bar, beside the epic. The
subject of a canvas is then the epic, the parts picked out of it, and the refs
selected: three widths of the same fact, all held per project and none of them
by a kehikko.

`context.parts` is every part of the open epic, in the epic's order:

```ts
parts: Array<{
  id: string        // PART_ID: lowercase, digits, dashes. What a step's `part` names.
  heading: string   // what a person calls it; drawn, never compared
  refs: string[]    // the references the host says belong to it
  picked: boolean   // whether the person picked it out
  files?: string[]  // the paper's files it owns, relative to the paper's folder (0.32.0); absent means none
}>
```

Four things about it, and each is load-bearing:

**None picked means the whole epic.** That is the resting state, it is what an
epic with no parts sends, and it is what a host that has never heard of parts
sends — `[]`. A module that never reads this field shows the whole epic, which
is exactly what it did before and exactly what it should do.

**Every part is listed, not only the picked ones.** The shape is `containers`'
shape for `containers`' reason. A module handed only the picked parts could
narrow and could never say what it had hidden, and a pane that is shorter than
it was for a reason nobody can see is the failure this field is arranged
against. A module that narrows says so, in its own header — "6 shown · 14
outside the picked parts" — and offers a way to see them. `focusCount` gives the
two numbers so that three modules do not count three ways.

**A reference is in a part because the part lists it; a step is in a part
because it says so.** A step may carry `part: <id>`, and that is the whole of
how a step comes to be in one — it is not worked out from the refs the step
names, because a step often names a reference it merely depends on. A step with
no `part` belongs to the epic as a whole, which means it is in no *picked* part:
under a focus it is one of the things counted as outside. So there are two
questions: `refInFocus(parts, ref)` for a thing that is a reference, and
`partInFocus(parts, step.part)` for a thing that was assigned. The host folds
the refs of the steps it holds into the `refs` of the part each was assigned to,
so a module that only knows references narrows correctly without learning what
a step is.

**The id is not the heading.** A heading is prose somebody will reword; the id
is what a step and a stored focus hold on to. It is one written beside the
heading, or one derived from it — and since 0.31.0 the derivation is this
package's and not a host's own; see `partsOf` below.

### The files a part owns (0.32.0)

A part knew only references, so a module that shows a document — the paper,
the notes on it, the questions about it — could not narrow to one. A part may
now name the files of the epic's paper that are its own. A paper is a folder
with a `main.tex` that pulls other files in; a part's file is one of those.

**What the strings are.** Each is a path **relative to the paper's folder**,
`<project>/.kehikot/paper/<epic>/` — the folder `main.tex` is in — with forward
slashes and the file's extension: `parts/posting-seam.tex`. Not absolute,
because the string is written into a record that is committed and cloned. Not
relative to the project, because that repeats `.kehikot/paper/<epic>/` — a fact
the record already holds as its slug — in every entry, free to disagree with it.
Relative to the paper's folder is the name the Paper module already keys its
file list, its hashes and its page map by, and the one a person reads in
`\input{parts/posting-seam}`, plus `.tex`: the extension is written, never
guessed.

**The form, and what is refused.** `partFile(raw)` answers the stored form or
`null`: no leading `/` or drive letter, no `\`, no empty, `.` or `..` segment
(`a/../b` is refused, not resolved — nothing here opens anything), no control
character, at most `LIMITS.PART_FILE` (256) characters, Unicode in NFC. Only
space around the name and a leading `./` are tidied. A module will join this
string onto a folder; it keeps its own fence, and this is the second. On the
wire every entry must already be in the form (`isPartFile`) or the part is
refused, and a part lists at most `LIMITS.PART_FILES` (32).

**One function compares: `paperFileOf(path, epic)`.** A module does not hold
the relative name; it holds the absolute `passage.path` the Paper module
publishes. `paperFileOf` turns one into the other, or answers `null`:

```ts
import { fileInFocus, focusCount, paperFileOf, pickedFiles } from 'kehikot-module-protocol'

paperFileOf('/p/.kehikot/paper/my-epic/parts/a.tex', 'my-epic')   // 'parts/a.tex'
paperFileOf('/p/.kehikot/paper/other/parts/a.tex', 'my-epic')     // null: another epic's paper
paperFileOf('/p/README.md', 'my-epic')                            // null: not a file of the paper
paperFileOf('parts/a.tex', 'my-epic')                             // 'parts/a.tex': already the paper's name

fileInFocus(context.parts, passage.path, context.epic)
focusCount(context.parts, files, (file) => fileInFocus(context.parts, file, context.epic))   // { shown, outside }
pickedFiles(context.parts)   // the picked parts' files, once each; ask isFocused first
```

- An **absolute** path is a file of the paper when it has
  `/.kehikot/paper/<epic>/` in it, and its name is what follows. The path is
  not measured against `context.projectPath`: Paper publishes a resolved path
  and a host sends the project as it was typed, and under a symlink those do
  not share a prefix. Backslashes are read as slashes.
- A **relative** path is taken to be the paper's own name already — what the
  Paper module holds for its files.
- Pass `context.epic`. Without it any epic's paper folder is read, and another
  epic's `parts/intro.tex` is indistinguishable from this one's.
- Names are compared as written, case included.
- Not seen: a paper folder that is itself a symlink elsewhere. Paper publishes
  the far path, which names no paper folder, so it is counted outside a focus
  rather than guessed into one.

Do not strip a prefix or match a suffix yourself; that is the second derivation
this function exists to prevent.

**The rule is the one already decided.** Nothing picked: every file is in
focus. Otherwise a file is in focus exactly when a picked part owns it. Text
written directly in `main.tex`, and any file no part names, belongs to the epic
as a whole and is therefore in no *picked* part — outside the focus, and
counted. `partsOfFile(parts, file, epic)` says which parts own a file.

**`files` is optional, and absent means none.** It is the one field of a part
that is not defaulted to empty: a part from a host older than 0.32.0, and a
part that owns no file, parse to `{ id, heading, refs, picked }` exactly as
before, so nothing that compares that shape changes. The helpers read absent
as none; read it yourself as `part.files ?? []`. A module on an older version
never sees the field — its schema strips it.

No module sets this. The picking is the host's own control, so there is no
capability and no method; a module that moves when it changes says
`reacts: ['parts']`. A pinned container keeps the parts it was pinned with, for
the reason it keeps its epic. Moving to another epic sends that epic's parts
with nothing picked, for the reason it clears the selection.

### Every module's data is part-specific, or the module says why not (0.34.0)

Until here a module could read `context.parts` or not, and most did not: a
person ticked a part, the paper narrowed, and the questions about the paper
went on showing all thirty-seven. Correct by the letter — a module that
ignores the field shows the whole epic — and not what a tick means. Four
modules had narrowed, each with its own filter, count, sentence and
comparison. So the requirement is stated once, and it is about data:

> **Every item of a module's data is anchored to a part by a file, a ref or a
> part id, or the module says why it has none.**

**The anchor.** One item answers with an `Anchor`, told apart by its key:

```ts
type Anchor = { file: string } | { ref: string } | { part: string | null }
```

`file` is a file of the epic's paper, absolute or relative to the paper's
folder (a note, a question, a citation); `ref` is a reference; `part` is a
part's id, for a thing assigned to one. An item may answer with several — it is
in front when any one is — or with none.

**The rule.** `anchorInFocus(parts, anchor, epic)` is the one answer, and it
decides nothing itself: it asks `fileInFocus`, `refInFocus` or `partInFocus`.
True for everything when nothing is picked. With something picked, an item
with no anchor is outside, like a step with no part — counted, never dropped.

**What a module writes.** `anchorOf(item)`, and where the sentence is drawn:

```tsx
import { FOCUS_WHERE } from 'kehikot-module-protocol'
import { useFocus } from 'kehikot-module-protocol/client/react'

const focus = useFocus(context)                    // or useFocus({ parts, epic })
const { shown, sentence } = focus.narrow(notes, (note) => ({ file: note.path }), {
  noun: 'note',
  keep: (note) => note.id === open,                // what the person is in the middle of
})
// draw `shown`; and when `sentence` is not '':
<p title={FOCUS_WHERE}>{sentence}</p>
```

`useFocus` compares the parts by value, so a context re-sent because something
else on the canvas moved hands back the same value and redraws nothing. A page
that is not React calls `narrowToFocus(parts, items, anchorOf, { epic, keep })`
and `focusSentence(parts, outside, noun)`, which are all the hook is. A module that sets an item back instead of removing it — a deck is an
ordered thing — asks `focus.inFocus(anchor)` per item and still says the
sentence.

**The sentence** is one sentence, in every module:

```
3 questions outside the picked part (The posting seam).
1 note outside the 2 picked parts (The posting seam, What the tests check).
```

Nothing when nothing is picked. `0 … outside` is said: it is how a person sees
that the pane is following their ticks. `FOCUS_WHERE` says where the control
is, for the tooltip, since it is never on the module's page.

**Nothing in somebody's hands is taken away by a tick.** `keep` answers true
for the note being written, the question on screen. It is drawn in its place,
it is still counted outside because it is, and `kept` says how many so the
page can say why it is there.

**The declaration.** A module that follows the parts says `reacts: ['parts']`.
One with nothing to narrow says so in one sentence, in the manifest's new
optional `partless`:

```ts
partless: 'A terminal: nothing in it belongs to an epic.',
```

What such a sentence looks like, for the modules that have nothing a part
could own: a file browser ("Lists the repository's files; a part owns files of
the paper, not of the repository."), a source view ("One passage, and no list
to narrow."), a diff or a review ("The pull request the person selected."), a
history ("Commits carry no part."), an atlas ("Above epics."), a terminal ("A
shell."), notifications ("Events carry no ref, epic or part."). A module whose
items are each tied to SEVERAL things — a bibliography entry cited from three
files, a slide with a linked section and four citations — is not one of these:
it answers with all its anchors, and is in front when any one is.

`partsDeclaration(manifest)` returns what is wrong — saying neither, or both —
as sentences. **In this version that is a warning:** `manifestSchema` does not
call it, every existing manifest parses to exactly what it did, and a host may
show the list. **In the next minor version a manifest that says neither will
not parse.**

**The check.** `bun run check:parts <module dir>…` (the bin
`kehikko-check-parts`, from a module: `bun node_modules/kehikot-module-protocol/bin/check-parts.ts .`)
reads a module's `manifest.ts` and exits 1 on exactly what the manifest says:
the module declares neither `parts` nor `partless`, declares both, or has no
manifest that loads. It also scans the module's sources for a named import of
a focus helper from this package (`useFocus`, `narrowToFocus`, `anchorInFocus`,
`fileInFocus`, `refInFocus`, `partInFocus`) and prints where it found one;
a module that declares `parts` and shows none gets a **note, not a failure**.
The scan is a hint: it reads import text, so `import * as` or a wrapper's
re-export gets past it and any import satisfies it. Whether the narrowing is
right is a review's question.

**Which build of this package a module has.** Every module depends on this
package at git `#main`, which floats: each install holds whichever commit its
lockfile pinned, so two modules on one canvas can hold two builds. A module
that says `reacts: ['parts']` through these helpers needs 0.34.0 or later in
its lockfile. Bringing every module under the requirement should pin each to a
protocol version rather than to `#main`.

## An epic's steps are kept once, and this is the shape they are kept in

Every epic used to exist twice in a project. A host kept
`.kehikot/kehikko/epics/<slug>.json` and answered `epics.list`, `epic.get`,
`steps.list`, `context.parts` and the tracker scope out of it; the Journeys
module kept `.kehikot/journeys/journeys.json`, which is where a step was
actually edited. Nothing kept them in step, and in one real project they had
come apart — nine steps in one, twelve in the other — with nothing on screen to
say so.

The owner decided: **Journeys owns the steps, the groups (an epic's parts) and
the prose; a host owns the epic's slug, its title and whether it exists.** A
host reads steps and groups out of Journeys' file, and falls back to what it
holds itself when the project has no record under that slug — including when
Journeys was never installed.

A host reading another program's file is a host parsing a private format. So
the format is not private: it is `journey.ts`, here, and both the writer and
the reader import it.

```ts
import { journeyIn, stepsOf, stepPart } from 'kehikot-module-protocol'
import { readJourneys, readJourney } from 'kehikot-module-protocol/serve'

const record = readJourney(projectPath, 'the-posting-seam')   // JourneyRecord | null
if (record) {
  const said = stepsOf(record)        // 'stored' | 'elsewhere' | 'none'
  if (said.kind === 'stored') for (const step of said.steps) stepPart(step)
}

// Every epic in a project: read the file once, ask per slug.
const document = readJourneys(projectPath)
const one = journeyIn(document, slug)
```

**The shape.** The file is `{ version, journeys: { <slug>: record } }`. A
record models only what a host has to read to answer what it already answers:

| | |
|---|---|
| `slug`, `title`, `lede`, `project?`, `umbrella?` | What a list of epics is drawn from. `slug` is `EPIC_SLUG`: the host's `epic` and this are one name. |
| `steps: [{ title, body, refs, notes, part? }]` | `part` is the id of the part a step was assigned to. |
| `groups: [{ heading, refs, id?, files? }]` | What a host reads as the epic's parts. `id` is what `part` and a stored focus name. `files` (0.32.0) is the files of the epic's paper the part owns, each relative to `<project>/.kehikot/paper/<slug>/`: `parts/posting-seam.tex`. |
| `stepsFrom?: { projector, where, why }` | The steps are kept somewhere else. See below. |
| `exists`, `open` | Counted, with `steps`, for an epic's size. |

Everything else Journeys keeps in a record is its own, and **every object is
`.passthrough()`**: a field this version has never heard of comes out of a
parse exactly as it went in, at every level. A reader that stripped would hand
over part of somebody's document; a *writer* that parsed with a stripping
schema before saving would delete it from the file. Parse with these schemas,
or extend them — do not restate them with `z.object` and write the result back.

**Nothing in it is bounded**, unlike everything else here. This is a document a
person wrote in their own repository, not a message from a stranger, and a
reader that refused a record over a long title would be a host declining to
show somebody their own work. The bounds bite where something is put on the
wire (`partsSchema`) and at the writer's own door. For the same reason `part`
and `id` are plain strings in the schema, and `stepPart` is how a `part` is
read: anything that is not a `PART_ID` is no assignment.

**`journeyIn` never throws and reads one record at a time.** Null for a
document that is not one, a slug that is not one, an unknown slug, a record
that will not parse, and a record filed under one slug that calls itself
another. One epic with a step nobody titled costs that epic its record and no
other. The lookup is `Object.hasOwn` — `constructor` matches `EPIC_SLUG`.
`journeysDocumentSchema` is the strict whole-file check, and it is for the
writer, which must not write over a file it could not read.

**An empty `steps` is two different things, and `stepsOf` is how to tell.**
Some epics are written as a paper and their steps are its sections, projected
by something that can read LaTeX. Their record carries `"steps": []` and a
`stepsFrom`. `stepsOf` answers `stored` (the steps, and `alsoProjected` when a
paper sits beside them), `elsewhere` (there are steps, not here — **never
"none"**) or `none`. Read `stepsOf(record)`, never `record.steps`, wherever the
answer is shown or counted: a host that answered `steps.list` with `[]` for an
`elsewhere` record would be reporting an epic with twenty sections as having
no steps.

**The parts are derived here, once (0.31.0).** A host composes `context.parts`
out of a record's groups, and the module that edits steps has to name the same
parts — to check a step's `part`, and to draw which part a step is in. Two
derivations of an id from a heading would be a step that is in a part on one
screen and in none on the next, so there is one:

```ts
import { partsOf, partIdsOf, slugFrom } from 'kehikot-module-protocol'

partsOf(record)            // [{ id, heading, refs, steps, files? }], in the record's order
partIdsOf(record.groups)   // ['the-posting-seam', null, 'tests-2']: ids[i] is groups[i]'s
slugFrom('What the page shows')   // 'what-the-page-shows'
```

- A group's `id`, when it is a `PART_ID`, is the part's id. Otherwise it is
  `slugFrom(heading)`: lowercased, accents folded, every run of anything else
  one dash, cut at eighty.
- Two groups that come out alike are told apart by `-2`, `-3` in the record's
  order; a heading with nothing usable in it is `part-<n>`, by position. A
  group is never dropped for its name.
- A step carrying `part: <id>` is counted in that part and its refs are folded
  into the part's, once each. A step is never filed by the refs it names, and
  a `part` naming nothing the record has is no assignment.
- A group's `files` come out in `partFile`'s form, once each, at most
  `LIMITS.PART_FILES`; a name not in the form is dropped like any other junk.
  Nothing is folded in from steps — a step names no file. The key is absent
  when a group names none, so a record that says nothing about files reads
  exactly as it did. A host puts it on the wire as it is:
  `partsOf(record).map(({ steps, ...part }) => ({ ...part, picked }))`.
- It takes `unknown` and never throws: a host falls back to a file of its own
  when a project has no record, and the same function has to read both.
- Bounded at `LIMITS.PARTS`, `LIMITS.PART_REFS` and `LIMITS.PART_FILES`, because this is what goes
  into a context.

`partIdsOf` keeps the groups' positions — `null` where an entry is not a part —
so the writer can put a derived id onto the group it belongs to the first time
a step is assigned there, and the heading is free from then on. **The ids these
produce are already in people's files and stored focuses. They do not change.**

**The file is read behind `/serve`**, with the rest of what touches the
machine. `readJourneys` answers the parsed document or null — no project, a
relative path, no folder, no file, not JSON, not an object — and does not
follow a `.kehikot` or a `.kehikot/journeys` that resolves outside the project
it was asked about.

## Why a reference closed

A tracker's `closed` is done, won't do, duplicate and superseded at once.
`disposition.set` (capability `disposition:set`) lets a person — or an agent
through the host's MCP door — say which; the host keeps the marks per project
and sends them to every module as `context.dispositions`, and a module that
moves when one changes says `reacts: ['dispositions']`. Only people's marks
travel. What the tracker says (GitHub `stateReason`, a GitLab issue closed by a
merged change) is derived on each side with `deriveDisposition`, and
`dispositionOf` puts the two together with the mark winning and the source
named, so a module can always say whose verdict it is showing.

## One tracker reading, shared

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

## When what a container shows has changed

A step gains a ref, a journey is edited, an epic's text is rewritten — by a
person, by an agent through a module's MCP door, or by an edit to the project's
files. A container that loaded the epic when it opened would go on showing the
old material until the window was reloaded. `context.content` says what
changed, and a module that re-reads on it says `reacts: ['content']`. The shapes
are in `src/content.ts`.

```ts
// context.content: [{ source: 'host' | '<module id>', epic: '<slug>' | null, at }]
// the last change per source and epic, for the open project

// a string that moves only when material this container shows changed
const stamp = contentStamp(context.content, {
  sources: [CONTENT_HOST, 'kehikot.journeys'],
  epic: context.epic,
})
useEffect(() => { reread() }, [stamp])

// after this module's own write has landed
await request('content.changed', { epic: 'modes-are-modules' })
```

- **The signal, not the material.** The context says whose material changed
  and for which epic; the module re-reads it through the door it already reads
  by — `steps.list`, `epic.get`, its own server.
- **Sources**: `CONTENT_HOST` (`'host'`) is the epics the host keeps, which is
  what `epics.list`, `epic.get` and `steps.list` answer from. Anything else is
  the id of the module that keeps the material. `epic: null` means the host
  could not tell which epic — an edited file holding several — and counts for
  any.
- **A list, not the latest**: a host may fold two changes into one broadcast,
  and "the latest change" would lose the first. `contentStamp` compares only
  the entries for what a container shows.
- **Reporting**: `content.changed` (capability `content:report`) is a module
  saying its own material changed. The host names the source — it knows who is
  asking — and tells every container in the project, the caller's included. A
  host also announces its own epic writes, and edits it sees made to the
  project's files, so a write from a module's server process is heard without
  the page reporting it.
- **Re-reading well**: re-read the one epic, not everything. Keep the reader's
  scroll position, their selection and whatever they had folded open — the
  material moved, the reader did not. Let a burst land as one read: the stamp
  is one string however many broadcasts carried it, and a read still in flight
  when it moves again needs one more read after it, not one per change.

## And a control that clears what a module is showing

The same shape a second time, for the other control a module cannot draw in a
strip it does not own. A module says that what it shows can be cleared and what
to call it; the host draws one button; a press comes back as `kehikot.clear`;
**the module does the deleting**.

```ts
live.clearable(`clear ${shown.length} shown`)   // and `null` to withdraw it
```

```ts
useKehikot(id, {
  onClear: () => forget(shown.map((one) => one.id)),   // exactly what is on screen
})
```

**The host never touches the data and never learns what went.** `kehikot.clear`
carries no ids, no filter, no count, and gets no answer. It is a press, relayed.
What a module says afterwards is a new `clearable` — with a smaller count, or
`null` because there is nothing left — which is feedback the module wrote and
the host merely draws.

**"Showing" is the module's determination, and it composes with the filter.**
Only the module knows what is on screen: under this protocol's filters, under a
search box in its own page, under whatever narrowing it invented. A person who
narrowed to one file and pressed clear means that file, and that falls out of
the module being the side that answers the question rather than out of anything
in the message. A module that cleared its whole store in `onClear` would delete
a hundred records while somebody could see three, which is the worst thing this
feature can do and the easiest to do by accident.

**Two messages, not one field on `filters`.** They looked like one thing. They
are independent — most modules that can be narrowed cannot delete anything, and
a paper cannot delete a paper — they change for different reasons, and their
withdrawals collide: `filters` withdraws by sending an empty `groups`, so a
module with nothing to narrow by would have silently taken its clear button away
at the same time, with nothing erroring and a control simply gone.

**The two-press arm is the host's.** This is a destructive control with no modal
behind it, and it cannot have one: `confirm()` inside a framed page returns
`false` silently under any sandbox without `allow-modals`, so a module that
guarded its own `onClear` would have built a guard that always says no. A host
drawing this button arms on the first press and sends on the second. Nothing in
these schemas can enforce that, which is why it is said here and on
`MESSAGE.CLEAR`.

**Absent by default, like everything else here.** A module that never calls
`clearable` gets no button, which is what every module's header looked like the
day before this existed.

## A citation is written one way, and found one way (0.33.0)

A slide and a quiz question both rest on passages of a paper, and both say so
in the file a person edits by hand:

```md
- Mean **3.51**[^1] after the first module

Sources:
[^1]: chapters/4_results.tex | "The mean rating was highest after the vanilla-JavaScript module (3.51)."
```

Slides wrote that first and Learning copied it, function for function, with a
comment asking that neither copy be changed alone. Two copies of a rule is two
rules the first time one is edited, so it is here.

```ts
import { findQuote, linesOf, markersIn, parseSource, resolveSource, serialiseSource, uncitable } from 'kehikot-module-protocol'

parseSource('[^1]: chapters/4.tex | "The mean rating"')   // { label: '1', path: 'chapters/4.tex', quote: 'The mean rating' }
serialiseSource({ label: '1', path: 'chapters/4.tex', quote: 'The mean rating' })
uncitable({ path: '../4.tex', quote: 'x' })               // a sentence, or null when it can be written
markersIn('Mean 3.51[^1] `code[^2]`', { skipCode: true }) // ['1']

const view = resolveSource(source, text)   // text: the cited file's, or null when it could not be read
view.status                                // 'holds' | 'ambiguous' | 'adrift' | 'unreadable'
view.at                                    // { from, to, line, endLine } | null — UTF-8 BYTE offsets, 1-based lines
view.at && linesOf(view.at)                // 'lines 31–33'
```

- **The line.** `[^label]: <project-relative path> | "<exact words>"`. The
  label is 1–20 of `A-Za-z0-9_-`. The path ends at the first `|` and the quote
  at the last `"`, so a quote may hold both. `parseSource` answers `null` for a
  line that is not one, and a module keeps such a line as the person wrote it.
- **By the words, not by offsets.** Words survive edits above them; offsets do
  not, and a stale offset points confidently at whatever moved into its bytes.
  So the range is never stored: it is looked for on every read.
- **Whitespace is not significant, and nothing else is forgiven.** A run of
  whitespace in the quote matches any run in the file, because a paper's source
  wraps where its editor did (`normaliseQuote` is the comparison's spelling of
  a quote). Case, punctuation and markup are compared as written: forgiving
  them would let a quote match words the paper no longer says.
- **Four answers** (`CITE_STATUSES`). `holds`: once, and `at` is where.
  `ambiguous`: more than once; `at` is the first and `count` says how many — the
  fix is a longer quote. `adrift`: not there; the paper changed under the
  citation. `unreadable`: the file's text was `null`.
- **`at` is in bytes.** `from` and `to` are UTF-8 byte offsets, which is what
  `context.passage` carries, so a found citation and a selection in the paper
  are compared without conversion. `line` and `endLine` are for saying.
- **Markers.** `[^label]` not followed by `:`. `markersIn` lists the labels a
  text names, each once; `replaceMarkers` rewrites them. Both read all of the
  text unless told `{ skipCode: true }`, which leaves fenced and inline code
  alone — right for a body that is rendered as Markdown (a slide), and not
  wanted for a heading that is not (a question).
- **`CitationView`** is a source with its answer — `{ label, path, quote,
  status, at, count }` — the shape a module's server sends its page.

**This package still opens nothing.** Every function takes the file's text, so
reading the cited file — and refusing a path that resolves outside the project —
stays in the module, behind the fence it already keeps. `uncitable` reads the
path as a string and is not that fence. Not here either, each a candidate for
later: the atomic write both modules do (a temporary file, renamed), the undo
trail (`history.json`), and the fence itself.

## Every string is bounded

Not hygiene. A manifest is a document a stranger wrote, and most of its fields
end up on the host's own screen. Four separate review rounds over the
implementation this package was distilled from found unbounded fields reaching a
person's display — a URL, a version, a range quoted into a refusal, and an enum
whose validation message echoes back whatever it was given, so twenty thousand
characters of a bad `scope` value became twenty thousand characters of a row
under a module's own name.

So no string in these schemas is without a `max`, including the next one
somebody adds, and the numbers live in `LIMITS` so a host writing its own copy
holds to the same ones. Where the shapes differ from clipping, they refuse: a
clipped sentence is still the sentence, but a clipped ref is a *different* ref,
filed against work nobody meant.

## The prototype hazard is the host's, at every lookup

`MODULE_ID` accepts `constructor`. It accepts `prototype`, `toString`, and every
other name on `Object.prototype`. They are ordinary lowercase letters, and no
rule about the shape of a name can exclude them without becoming a list of
forbidden spellings — a list of the ways somebody already thought of, which is
the kind of rule this protocol argues against everywhere. The pattern will not
be narrowed, and there is a test asserting it accepts `constructor` so that
narrowing it fails loudly.

**Every lookup keyed by a module's string must ask the object, never everything
the object inherits.** `Object.hasOwn` first, or `own()` from this package, or a
`Map` — which has no prototype chain to fall through and is the better answer
wherever the code allows one. This applies to module ids, to method names, and
to extension names, all three of which arrive from a stranger's program.

The failure is not dramatic and that is what makes it worth a section: the
lookup returns something truthy, the caller believes it holds a real entry, and
the lie surfaces two frames later as a `TypeError` where nothing is catching, or
as a row on a panel confidently describing a module nobody installed. In the
host this protocol came from, it was found and fixed four separate times.

There is no version of this package that handles it for you. The lookups are in
your process.

## `health`

It is in the schema, bounded, and carried on the parsed manifest.

It is worth explaining because it has an obvious smell: nothing fetches it. A
field in a published schema that no consumer reads is usually a promise nobody
is keeping, and the honest move is to delete it and add it back when something
needs it. Two things make this one different.

First, this package describes a wire, not an implementation. "No host polls it
yet" is a fact about today's hosts; the shape is written against by module
authors and read by however many hosts exist, and removing the field would make
every manifest already carrying it fail to parse.

Second — the real argument — the day something *does* poll it, that something
will be a process making a request to whatever address a stranger's manifest
named. That is precisely the crossing a host must hold to its own rules. If the
field is undeclared until then, the check gets retrofitted onto a population of
manifests nobody ever validated. Declaring it now means it is bounded now.

And it is carried on the parsed result, which is the part the earlier
implementation got wrong: it validated `health`, held it to the module's own
origin, and then dropped it — so the only way to reach the value was to re-read
the raw JSON, which is how a second, looser check gets written. A field worth
validating is a field worth handing on.

What a host must still do for itself: resolve it against the origin the manifest
came from, and refuse it if it leaves. A module may not use a host to point a
poller at a third party.

## Why the protocol number is 2, and why the new method is not the reason

The rule has not moved: a number that goes up for **additions** is a number
nobody can act on. Every module in the world becomes incompatible the day the
host learns a new word, and the honest reading of that refusal is "nothing is
wrong". Raise `PROTOCOL` when an existing message changes meaning or an existing
field changes shape.

By that rule, none of these earned a bump, and they are worth listing so the
reasoning stays visible next time:

- The greeting no longer carries a permission list. A module reading that field
  finds nothing and greys out nothing, which shows *more* of itself, not less.
- `goto`/`went` are new message types, which both halves already ignore when
  unrecognised, because a window receives every message posted at it.
- **`view.goto` is a new method.** A host without it answers `unknown-method`,
  which is the refusal that already exists and the one a caller is already told
  to expect. A module loses a feature and keeps a page.

What raised it is the **epic rename**. Existing methods changed name and an
existing context field changed shape, which is exactly the condition the number
is for. A module built against 1 is `incompatible` rather than degraded, and
that is the true sentence: it would call `journey.get`, be refused, and read a
context field that is no longer there.

One thing sits on the line and is worth admitting rather than filing under
"addition": specifying the `epics.list` answer means a host that previously
answered with some other shape was conforming and now is not. It is a tightening
of an existing contract. It rides along with the rename because nothing in the
world depends on this package yet, and because doing it at 2 is free where doing
it at 3 would not be — but if you are adding a result schema for a method that
already has consumers, that is a bump of its own.

## The client, which is a second entry point and an optional one

```
import { connect } from 'kehikot-module-protocol/client'
import { useKehikot } from 'kehikot-module-protocol/client/react'   // optional again
```

Twelve modules wrote the same `postMessage` handshake by hand — 7,519 lines of
`mailbox.ts`, `host.ts` and `use-roadmap.ts` (now `use-kehikot.ts`) between them — and two bugs turned
up in several of those copies INDEPENDENTLY, months apart:

- **The replayed greeting nobody was there for.** The host greets on the frame's
  `load` event; a React effect runs strictly after that. A listener installed in
  `useEffect` is installed after the greeting has come and gone, and nothing
  retries. The remedy is a listener at module scope with a backlog — and the
  remedy has its own race, because that backlog replays SYNCHRONOUSLY inside
  `subscribe`, so `onHello` fires before the caller has stored the connection.
  Two modules hit that second one and each spent an afternoon on a symptom that
  reads "the module will not speak" while the host sees a module that answered
  `ready`.
- **The context rebuilt field by field.** A module that lists the fields it
  copies out of `kehikot.context` silently drops every field the protocol later
  adds. No error; just that module's settled belief that the host said nothing
  about it. Five modules had it, and it was fixed five times with the same
  one-liner: `const { type, protocol, ...context } = message`.

So the client is here, once, with the reasoning attached. It knows how to be
greeted, how to answer `ready` on **every** hello, how to correlate a request
with its answer and time it out, how to turn a refusal into a `HostRefused`
rather than a bare string, and how to guarantee `goto` is answered exactly once
even when the module finds nothing — because `goto` is the one place a host
WAITS on a module, and silence there makes every reference pointing at that
module sit out the host's whole timeout.

**It is a separate entry point, and that is not packaging trivia.** The front
door of this package is shapes and nothing else, and a host's server or a
module's server imports it from a Bun process where `window` does not exist.
`kehikot-module-protocol/client` is where the browser code lives, so that rule
stays true of `kehikot-module-protocol`.

**The React hook is a third entry point, and optional twice over.** Not every
module is a React app and none is obliged to be, so `client` imports no React;
`client/react` is where the hook lives, `react` is an optional peer dependency,
and everything the hook does can be done by hand with `connect`.

### It is a convenience, and never a requirement

The sentence about the schemas above is true of this too, and it matters more
here than it does there.

**A module that hand-rolls its own `postMessage` handshake is exactly as
conforming as one that imports `connect`.** Nothing a host does looks at whether
this package was imported, no manifest field records it, and no check will ever
be added that does. What the client saves is not correctness — it is the twelfth
author rediscovering the two races above.

This is the whole design standing on one sentence, so it is worth saying the
failure out loud: the moment the client reads as mandatory, *a module is an
independent program somebody else could have written* has quietly become *a
module is a program that imports our client*. Those are different projects. This
package is the first one.

### The two steps, which are the point

```ts
// main.tsx — for its side effect, from the ENTRY, before React renders anything.
import 'kehikot-module-protocol/client'

const live = connect('kehikot.example', {
  onHello: (context, state) => { … },
  onContext: (context) => { … },
  onGoto: (message, answer) => answer(false, 'nothing here to walk to'),
})
held.current = live   // store it FIRST
live.listen()         // then let the backlog replay
```

`connect` builds the conversation and hears nothing. `listen` subscribes, which
is when a greeting already in the backlog is delivered — synchronously, inside
that call. Splitting them is the only thing that makes the ordering the caller's
to get right rather than the library's to get wrong silently.

### `sideEffects`, and why it is no longer `false`

This package declared `"sideEffects": false` for its whole life, correctly: a set
of schemas has none. `src/client/mailbox.ts` has exactly one, and it is the
entire point of the file — importing it installs a `message` listener at module
scope, which is what catches a greeting posted before React has rendered.

A bundler told `"sideEffects": false` is entitled to delete a bare
`import 'kehikot-module-protocol/client'` that binds no names, and it would be
right to. That deletion produces precisely the bug this client exists to prevent,
in production only, silently. So `sideEffects` now names the two client files
rather than saying `false`, and everything else in the package stays as
shakeable as it was.

`connect` also takes `answerWithin`, `gotoBackstop` and `source`, because the
modules already disagree about the first two and every one of those differences
may be load-bearing. Adopting the client should not quietly change what a module
does on the wire.

## `/serve`, which is a fourth entry point and the only one that touches the disk

```ts
// vite.config.ts
import { serves } from 'kehikot-module-protocol/serve'
import { ID } from './manifest.ts'

export default defineConfig({
  plugins: [serves({ id: ID, prefer: 7960 }), doors(), react()],
})
```

That line is a module's whole port story. `run.sh` passes no `--port` and no
`--strictPort`; `register.ts` hardcodes no number; the preference is stated once,
beside the id, in the file that already knows both.

### What it does, and the one case where it refuses to be clever

If the preferred port is free it is taken, with no probe, no search and no
message. That case is the common one and it is deliberately untouched: somebody
who types `curl 127.0.0.1:7960` after starting a module by hand must get their
module, and a system that sometimes moved for reasons of its own would have
thrown that away to solve a collision that had not happened.

If something is listening there, it is asked
`GET /.well-known/kehikot-module.json` with a short deadline, and what happens
next depends on **who** answered.

- **The same module id.** This module is already running. It exits 0 with a
  sentence naming the address, and starts nothing. A second copy is not a
  fallback — it is two stores writing the same files, two MCP doors a client can
  be pointed at, and a host framing whichever one the registry happens to name.
  That state's symptom is data disappearing, not an error. It is also the most
  common collision here now, because the host starts modules on its own *and* a
  person runs `./run.sh` in a terminal.
- **A different module, a non-module, or silence.** It moves to the next free
  port, says so on stdout naming both numbers, and registers where it landed.

Before it drifts, it also asks the port its own registration names, when that is
somewhere else. That case was found by running the thing rather than by thinking
about it: with a squatter still on 7960, a second `./run.sh` sees a stranger on
the preferred port, never reaches the already-running check, and walks past its
own copy on 7961 to start a second one on 7962 — the exact state that check
exists to prevent, arriving through the one door it did not cover. The
registration is a hint and never an authority: it is asked the same question, and
only an answer carrying this module's own id stops the start.

The drift steps over ports other modules have *registered* even when nothing is
listening on them. Modules here sit ten apart, and most of them are not running
most of the time; a drifter that took a neighbour's number would hand that
neighbour a collision it did not cause, days later, in a module nobody changed.

### The bound port, not the requested one

`strictPort` is turned **off**, which reads like a regression and is not.
`--strictPort` was the only honest thing to do when nothing handled a collision:
a server that silently moved was a server nobody could find. Now the move is
decided before Vite starts, said out loud, and written into the registry the host
actually reads — so Vite's own fallback is a second net under a first one,
catching only the race between releasing a probe socket and binding it.

And the number written down is read off `server.httpServer.address()` after
`listening`, not the number that was asked for. That is the whole reason this is
a plugin rather than a wrapper script: a script can claim a port and pass it to
Vite, but the registration it then writes says the port it *hoped* for, and the
gap between hoped and bound is exactly where a stale registration comes from.

### `claim` returns; it does not exit

Including in the already-running case. A library that calls `process.exit` is a
library whose most important branch cannot be tested, and that branch has a suite
aimed at it. `serves()` is where the exit lives, because it knows it is a program
rather than a test.

### It is node-only, and that is what the subpath is for

Everything here binds sockets, reads a port, and writes into somebody's home
directory. One line of it behind the front door would make
`import { WELL_KNOWN } from 'kehikot-module-protocol'` an import of `node:fs`, in
a browser bundle, in every module that renders a page. So it stands beside the
front door the way `/client` does and for the mirror reason: `/client` exists so
a server with no `window` can import this package, `/serve` exists so a page with
no filesystem can.

It is absent from `sideEffects` on purpose. Nothing in `src/serve/` does anything
at module scope — the side effects are all inside functions somebody calls — so
there is no bare import for a bundler to be wrong about deleting, which is the
exact thing the two client files are listed for.

### And it is still not a decision the host imports

The rule at the top of this README is unbroken, which is worth saying because a
file that decides a port looks like a counterexample. Nothing in `/serve` that decides
anything is ever run by the host. (One thing in it IS run by a host and decides
nothing: `readJourneys`, which opens the file an epic's steps are kept in — it
is here because it reads a disk, and its judgement is `journeyIn` behind the
front door.) The host reads the registry and asks each address what it is,
and would reach identical conclusions about a module that had never heard of this
file. What is here is a *module's* own housekeeping — where to bind, what to
write down about itself — and both of those were already the module's to decide.
Fourteen modules were deciding them fourteen times, in two files each, with the
port literal duplicated between them.

## Making a new module

```
bun run create <name> [--dir <path>] [--register]
```

From a checkout of this repository. `bun run create slides` makes
`~/Projects/kehikko-slides` from `template/`: id `kehikot.slides`, data under
`<project>/.kehikot/slides/`, and a preferred port on the ten-apart grid above
every module registered on this machine (the highest registered port, or the
preferred port in that checkout's `manifest.ts`, rounded up to the next free
multiple of ten, never below 7960). It then runs `git init`, `bun install` and
the new module's own `bun test`. `--register` also writes its registration;
otherwise `bun run register` in the new module does that. No GitHub repository
is created.

What you get is a working module with nothing in it: the manifest, the doors
(`/app`, the manifest route, `/healthz`, `/mcp` with one example tool, `/api`
with a write ticket), a JSON store inside the project, the host connection, a
placeholder screen with a header switcher in the host's menu grammar
(`src/components/menu.tsx`), shadcn components, and tests. `test/create.test.ts`
here generates one against this checkout and runs its tests and typecheck, so
the template cannot drift from the protocol silently.

## Development

```
bun test        # what a bound refuses, what a bad id refuses, that a version is part of a name,
                # that a caller can tell a decline from a dead reference from a broken call,
                # for the client — that a greeting already in the backlog reaches a page
                # that has stored its connection, which a one-step connect fails by construction,
                # and for /serve — the table over who is on a port, the walk that steps over a
                # neighbour's claim, and the same decisions again against a listener the suite
                # starts and stops, because injected probes cannot show that the real ones agree
bun run build   # tsc to dist/
```
