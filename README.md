# roadmap-module-protocol

The contract between a roadmap host and a module it frames.

A host application frames small programs somebody runs on their own machine.
Each program serves a manifest describing itself, a page the host embeds in a
frame, and its own MCP server. This package is the set of shapes both sides
agree on — the manifest, the eight messages that cross the frame, the extension
payloads — and nothing else.

```
npm install roadmap-module-protocol zod
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
| `methodResults`, `resultSchemaFor` | The two answers that are outcomes rather than material, and so have a shape. |
| `navigationResult`, `epicsListResult`, `epicSpine` | Those two answers. |
| `MODULE_ID`, `MODE_ID`, `EPIC_SLUG`, `own` | The name patterns, and one lookup that does not fall through a prototype. |
| `KEHIKOT_DIR`, `moduleFolder`, `moduleDir`, `moduleFile`, `within` | Where a module keeps this project's data, given `context.projectPath`. |
| `KEHIKOT_IGNORE`, `ignoresKehikot`, `withKehikotIgnored` | The lines that project's `.gitignore` gains, added once. |

## The wire

Eight messages. Four each way, across a frame, by `postMessage`.

| Host → module | |
|---|---|
| `roadmap.hello` | The greeting, on every frame load. Carries the protocol both sides settled on, a session name, and the current context. |
| `roadmap.context` | Which epic is open, which project it belongs to and where that project is on disk, which theme. Sent on every switch. |
| `roadmap.response` | The answer to exactly one request. |
| `roadmap.goto` | Go to this reference. |

| Module → host | |
|---|---|
| `roadmap.ready` | "I heard you." |
| `roadmap.request` | One question, with an id the answer carries back. |
| `roadmap.resize` | How tall it would like to be. |
| `roadmap.went` | Whether the `goto` found anything. |

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

The consequence worth naming is `roadmap.context`. It used to say which journey
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

`moduleFile(context.projectPath, 'roadmap.notes', 'notes')` is
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
`roadmap.hello`: a spelling two programs have to share, whose disagreement has
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

The folder's name is `moduleFolder(id)`: the module's id with `roadmap.` taken
off, because a directory called `roadmap.checklist` in somebody's own
repository carries a prefix that means nothing to the person reading it. That
derivation is a PATH BUILT FROM DATA — the id came off a manifest on a port —
so it is checked against a rule of its own and throws rather than falling back.
An id with no `roadmap.` prefix is used whole; this package does not get to
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

A module could be walked and could not walk. `roadmap.goto` goes one way, and
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
ignore), so a `roadmap.navigate` posted at a host would read like a thing done
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

## Two answers have a shape, and the line is not where you would guess

`methodParams` says what a caller constructs; what comes back is `unknown`,
because no host promised otherwise. That still holds for `epic.get`,
`steps.list` and `live.get`, and the reason is about **material**: two honest
hosts hold different amounts of an epic, and a schema over that would be this
package legislating what a host must keep.

Two answers are not material, and `methodResults` gives those a shape.

An **outcome** reports what happened to an act this protocol itself defines.
Nothing about a host's holdings varies there. An unspecified `view.goto` answer
is not modesty — a caller that cannot tell "you are looking at it" from "I would
rather not" from "there is nothing by that name" without parsing English has a
request it cannot act on.

**`epics.list`** is the other, and its argument is different. Every other
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

## Development

```
bun test        # what a bound refuses, what a bad id refuses, that a version is part of a name,
                # and that a caller can tell a decline from a dead reference from a broken call
bun run build   # tsc to dist/
```
