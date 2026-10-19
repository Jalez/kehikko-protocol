# Names and ids

The patterns for a module id, a mode id and an epic slug, the one derivation of a slug from prose, and the lookup that does not fall through a prototype.

This is the reasoning, not the reference: the shapes themselves, with their bounds, are in the source and show on hover. The first half is the overview that used to be in the README; the second half is the note that used to stand above each symbol in the source, under that symbol's name.

Back to the [index](README.md).

## Overview

### The prototype hazard is the host's, at every lookup

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

### Which ids are stable, and which are only good for now

A module that writes something down — a session, a note, a setting — files it under the ids it
was handed, and reads it back later: after a restart, after a `git pull`, on another computer.
So what matters about an id is how long it means the same thing.

| id | where it arrives | means the same thing… |
|---|---|---|
| a module id (`MODULE_ID`) | the manifest, `containers[].module`, `event.from` | always: the module's author chose it |
| an epic slug (`EPIC_SLUG`) | `context.epic` | for as long as the epic's file is in the project; it travels with the project |
| a part id (`PART_ID`) | `context.parts[].id`, `parts.set`'s answer | for as long as the part is in the epic's list: through a rename and a reorder. The host makes it once, when the part is added (`partIdFor`), and never changes it |
| a part's **name** | `context.parts[].heading` | **only until somebody rewords it.** Draw it; never file anything under it |
| a ref (`gh#41`) | `context.selection`, `containers[].showing.refs` | as long as the tracker keeps the number |
| `projectPath` | `context.projectPath` | on this machine, until the folder is moved or renamed |
| a project's **id** (`PROJECT_ID`, 2.1.0) | `context.projectId`, `projects.pick`'s `id`, an activity item's `projectId` | for as long as `<project>/.kehikot/project.json` exists: through a rename and a move of the folder. `null` from an older host |
| a kehikko's **`key`** (`KEHIKKO_KEY`) | `context.kehikko.key`, `event.kehikko.key` | for as long as the kehikko exists: through a rename, a reorder, the project being removed from the host and added again, and on another machine |
| a kehikko's **`id`** | `context.kehikko.id`, `event.kehikko.id` | **only for the life of one host's database** |

**A part's id is what to store; its name is not.** A module that keeps one thing per part files
it under `context.parts[].id`. The name beside it (`heading` in a context, `name` in the epic's
own list) is what a person calls the part today, and a rename changes the name and nothing else.
Two parts may come to have the same name; no two have the same id. Before 1.2.0 an id written
nowhere was derived from the heading on every read, so rewording a heading could move it; a host
on 1.2.0 writes the id into the epic's own file the first time the list is edited, and it stands
from then on.

Three things to know when storing one:

- **A removed part's id names nothing.** What a module filed under it stays in the module's own
  data; under a pick it is in no picked part, and with nothing picked it is shown like anything
  else. Nobody deletes it for the module.
- **An id can come back.** A new part is told apart from the ids in the list *now*, so a part
  added under the name of one that was removed gets the same id, and what is still filed under
  it is the new part's.
- **It is unique within an epic**, not across epics: file under the epic's slug and then the
  part's id, as `parts.json` does.

**`kehikko.id` is a row number. Do not store it.** The host hands out the next integer whenever a
kehikko becomes a row, and a kehikko becomes a row again each time its project is added: one
kehikko was 2, then 9, then 28, without anybody touching it. On a second machine the same kehikko
has whatever number that database had free. It is good for exactly one thing — comparing
`context.kehikko.id` with `event.kehikko.id` inside one running page, to tell near from far.

**`kehikko.key` is what to store.** The host writes it into the project's own
`.kehikot/kehikko/kehikot.json` beside the kehikko's name, and reads the file back by it, so it
is the same wherever and whenever that project is opened. It is unique **within a project** and
not across projects: two projects may both have a kehikko keyed `writing`. Store it with the
project — inside `<project>/.kehikot/<module>/`, or keyed by the project as well.

`key` is optional. A host that does not send it leaves a module with `id` alone, and a module
that must keep something anyway falls back to `id` knowing what that costs. Tell the two apart by
which field they came from, never by how they look: a key may be all digits (`12345678` is a
plausible eight hex characters), so a store that holds both spells them differently —
`key:4072c9e5` and `id:3`, say — rather than guessing later.

**A project's id is what to key machine-level state by (2.1.0).** A module that keeps something
for a project OUTSIDE the project — under the machine's Kehikot directory, in a cache, in a
database of its own — used to key it by the project's path, or a hash of it, and renaming the
folder orphaned it. `context.projectId` is the host's permanent name for the project, kept in the
project's own `.kehikot/project.json`; key by it, and fall back to the path while it is `null`
(`projectKey` does both, and says which it used). See
[project-data.md](project-data.md#the-projects-id-projectjson-210).

## Notes by symbol

### `src/ids.ts`

#### About `src/ids.ts`

The names things are called by, and the one hazard that comes with them.

Three patterns and one helper. Nothing here decides anything: a pattern says
what a spelling looks like, and whether a program answering to that spelling
is allowed to do anything at all is a question this package never asks.

#### `MODULE_ID`

A module's id.

It is a key in a store, it is written into an element attribute, and it is
printed under the module's own name on a panel a person reads. Reverse-DNS by
convention; lowercase, dots and dashes by rule, so none of those three places
has to wonder what it has just been handed.

##### The prototype hazard, which is the host's and not this package's

READ THIS BEFORE YOU WRITE `record[id]`.

This pattern accepts `constructor`. It accepts `prototype`, `toString`,
`valueOf` and every other name that lives on `Object.prototype`. They are
ordinary lowercase letters, and no rule about the SHAPE of a name can tell
them from `kehikot.checklist` without becoming a list of forbidden spellings
— which is a list of the ways somebody has already thought of, and is exactly
the kind of rule this protocol argues against everywhere else. So the pattern
is not going to be narrowed to close this, and the hazard is permanent and by
design.

What it means in practice: a module's id is a string a stranger chose, and
`table[id]` on a plain object answers with something inherited when the id is
one of those names. Truthy, so the caller goes on believing it holds a real
entry; then the field it reads off that entry is undefined, and the method it
calls on THAT throws somewhere nothing is catching. In the host this protocol
grew from, that shape of bug appeared four separate times — a permission
lookup, a method lookup, a delivery lookup, and the list of modules a person
reads before deciding what to remove — and each one was a different lie told
on a panel.

So: **every lookup keyed by a module's string must ask the object, never
everything the object inherits.** `Object.hasOwn` first, or `own()` below, or
a `Map`, which has no prototype chain to fall through and is the better
answer wherever the shape of the code allows one. There is no version of this
package that does it for you, because the lookups are in your process and not
in this one.

#### `KEHIKKO_KEY`

A kehikko's key: the identity of one canvas that outlives the host's database.

Two to thirty-two characters of lowercase letters, digits and dashes, with a
letter or digit at each end. The bounds are the host's, not a choice made
here: this is the pattern the host holds a `key` in `kehikot.json` to, and
the wire carries nothing the file could not. A host generates eight hex
characters; a person editing the file may write a word — `writing`,
`review`. Lowercase only, because it is compared as an identity and two
spellings of one key would be two kehikot.

No character in it can leave a directory or end a field in a delimited
string — no dot, slash, colon, semicolon, equals or plus — so it can be a
file name or one part of a composed key without escaping.

It is unique within one project's `kehikot.json` and nowhere wider. And it
can be all digits, which is why nothing may tell a key from an `id` by its
shape: see "Which ids are stable" above.

#### `PROJECT_ID`

A project's id (2.1.0): 8 to 64 characters of lowercase letters, digits and dashes, neither end a
dash. Chosen over "a UUID" for two reasons:

- **It is a safe path segment as it stands.** No dot, no slash, no leading dash, so a module may
  name a folder or a file after it under its machine directory without escaping or hashing it —
  the job it exists for. A UUID happens to have that property; the pattern says it outright.
- **The package does not decide how a host mints it.** A host mints a lowercase random UUID
  (`crypto.randomUUID()`, 36 characters), and that is the recommendation. Holding every reader to
  the UUID grammar would refuse a whole context over a hand-repaired `project.json` for no gain:
  nothing reads structure out of the id. The floor of 8 keeps hand-written ids from being words
  two projects would both pick.

Uppercase is refused rather than folded, so one project never has two spellings: a store keyed by
it compares strings.

#### `EPIC_SLUG`

An epic's slug.

Lowercase letters, digits and dashes, and bounded at 80 wherever it appears.
There is no character in this class that can leave a directory — no dot, so
no `..`; no slash, so no path — which is worth knowing but is not the reason
it is here. It is here because a slug is a name two programs have to spell
the same way, and one of them reads it off a page while the other joins it
onto a store.

##### Why the name says EPIC, and what this pattern is not

An epic belongs to a project, and it is the thing a host holds and can
therefore tell a module about. A JOURNEY is a different idea living in a
different program — a module app of its own — and this package deliberately
says nothing about one ON THE WIRE: not its name, not its shape, not its
bounds. (The one thing it does describe is the record that module keeps on
disk for an epic's steps, because a host reads it; see `journey.ts`, which
says what was decided and why that is narrower than it sounds.) An
earlier draft of these files inherited a codebase where the two words meant
one thing, and every place that conflation reached is renamed rather than
aliased, because an alias would preserve exactly the confusion being removed.

So this pattern describes an epic slug and only that. If a journey slug turns
out to be spelled differently — longer, or with characters this class refuses
— nothing here has to change, because a host is not the authority on that
name and a protocol between a host and a module is the wrong place to write
it down. The module that owns journeys owns their names.

#### `slugFrom`

A slug out of a line of prose, the way a person would write one by hand.

Lowercased, accents folded to their base letters, every run of anything that
is not a letter or a digit becomes one dash, and the dashes at the ends go.
Cut at eighty characters — the bound `EPIC_SLUG` and `PART_ID` share — and
then trimmed of a trailing dash again, because a cut can land on one.

The empty string for a line with nothing usable in it. Not a fallback, not
`untitled`: "!!!" has no slug, and the caller is the one who knows what to
do about that — a host making an epic refuses with a sentence, `partIdFor`
calls a new part `part`, and the deprecated `partsOf` calls one `part-<n>`.

##### Why a derivation is in a package of shapes

It came from a host, where it made an epic's slug out of its title and then,
when parts arrived, a part's id out of its heading. The second use is what
moved it. A part's id is written into a step (`part`) by the program that
edits steps and compared by the program that composes `context.parts`, and
those are two programs: one deriving `what-the-page-shows` and the other
`what-the-page-shows-` for the same heading is a step that is in a part on
one screen and in none on the next. One spelling of the derivation, here,
is the same argument as one spelling of a method name.

**The output is a contract.** Ids made by this function are already written
in people's files. A change to what it returns for any input is a change to
which part every such step is in, and is made — if it ever is — as a
migration and not as a tidy-up.

#### `own`

One lookup that does not fall through to a prototype.

A convenience, offered because the hazard above is easy to write around and
easier to forget. It does not relieve you of anything: `own()` is one lookup,
and the essay on `MODULE_ID` is about all of them. A `Map` keyed by id is
better still where you can have one.
