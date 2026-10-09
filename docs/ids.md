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
do about that — a host making an epic refuses with a sentence, and `partsOf`
calls the part `part-<n>`.

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
