# The manifest

What a module says about itself at the well-known path: every field of `manifestSchema`, what a module says it reacts to, its tags, and how a protocol range is read.

This is the reasoning, not the reference: the shapes themselves, with their bounds, are in the source and show on hover. The first half is the overview that used to be in the README; the second half is the note that used to stand above each symbol in the source, under that symbol's name.

Back to the [index](README.md).

## Overview

### What a module says it reacts to

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

### Where a module files itself

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

### A module's data has a version of its own

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

### `health`

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

## Notes by symbol

### `src/manifest.ts`

#### `modeSchema`

What a module says about itself when a host asks.

One document, served at one path, describing one program: what it is called,
what it will show, where an agent would connect to it, and which parts of the
host's material it intends to use. It is the smaller half of any module and
the only half a host ever reads before deciding whether to frame it.

##### Every string is bounded, and that is not tidiness

A manifest is a document a stranger wrote, fetched off a port, and half of it
ends up on the host's own screen — in a list, in a tab, in the sentence a
person reads when the host refuses the module. An unbounded field there is
two hundred thousand characters of somebody else's text under somebody else's
name, needing no permission and nobody's agreement. The implementation this
package was distilled from found that four separate times, in four review
rounds, in fields nobody had thought of as text: a URL, an enum whose zod
refusal echoes what it was given, a version, a range quoted into a sentence.

So the rule is: no string in this schema without a `max`, ever, including the
next one somebody adds. The numbers live in `LIMITS` so that a host writing
its own copy of this schema — and it should — holds to the same ones.

##### What is NOT in here, and will not be

There is no field by which a module asks for a permission, because there is
no permission to ask for. `declares.uses` says what a module intends to call.
That is a sentence worth reading and worth showing to whoever installed the
program; it is not a request, it is not answered, and nothing in this package
— no field, no type, no function — models an approval. What a module may
actually do is decided by the host, at the moment of each call, out of
material the module never touches.

#### `modeSchema.scope`

`epic` gives the mode a tab that FOLLOWS THE READER: it is told which epic
is open and told again on every switch. `global` gives it one page for the
whole canvas, told nothing and never re-pointed.

Defaulted rather than required, because following the reader is what nearly
every module wants and a module that says nothing has not made a choice
about it.

The word was `journey` and is now `epic`, with no alias, because an epic is
what a host can point a tab at. See `PROTOCOL` in `constants.ts` for why
that rename is the thing that raised the number.

#### `url`

A URL as a manifest may write one.

A string, and bounded, and nothing more. It is not checked for being a URL
here and it is deliberately not resolved: whether a module may point at a
given address is the host's question, and the answer depends on things this
package cannot see — which origin the manifest was fetched from, whether that
origin is on this machine, what the host is willing to frame. A module that
points its entry somewhere off its own origin is asking the host to frame
somebody else, and the refusal for that belongs where the origin is known.

#### `REACTS_TO`

The context kinds a module can say it REACTS to.

##### What this is, and the one thing it is not

It is documentation a module writes about itself, for a person reading a
registry. Nothing else. A host must not gate, filter, withhold or route
anything on the strength of it: the context goes to every framed module on
the canvas, unchanged, whether or not the module said a word here. A module
that declares nothing keeps working exactly as it did, and a module that
declares everything gets nothing it did not already have — it is merely wrong
in a list, which is the whole of the penalty and should stay that way.

The next person to read this will be tempted to make it mean something, and
the temptation has a shape: it looks like it would be cheap to skip the
broadcast to frames that did not declare an interest. Do not. `context.ts`
composes ONE context per canvas on purpose, a host that composed a different
one per container would be deciding what each module may know, and the module
that gets an empty `passage` because it forgot a word in its manifest fails
silently and unfixably from inside. The saving is a `postMessage`; the cost
is a permission nobody agreed to build.

##### Why it is NOT beside `declares.uses`

`declares.uses` is what a module intends to ASK THE HOST FOR. This is what a
module says it DOES WITH WHAT IT IS ALREADY GIVEN. Those two point in
opposite directions and would look identical as two arrays of short lowercase
words in the same object — which is exactly how, six months from now, a host
comes to check one of them the way it checks the other. Keeping this at the
top level, under a verb rather than under `declares`, is the cheapest
available defence against that confusion. See `CAPABILITIES` in `methods.ts`,
where every single entry is a request; there is deliberately no entry there
for reading a context, and there must not be.

##### Why "reacts" and not "consumes"

Every framed module RECEIVES the whole context, so "consumes" is true of all
of them and would be worth writing down by none of them. What is worth
writing down is that this module DOES SOMETHING when the field changes — it
narrows, it scrolls, it re-queries. A module author reading "consumes" ticks
every box, because every box is factually being handed to them; an author
reading "reacts to" has to think about whether their program actually moves.
A host is free to render the word as "Consumes" in a list where that reads
better to a person browsing; the word in the manifest is chosen for the
author writing it.

##### Why these three and not more

`passage`, `selection` and `containers` are the context fields a module can
genuinely choose to ignore, and each has a matching capability —
`passage:set`, `selection:set`, `showing:set` — on the other side, which is
what lets a registry name both ends of one relationship instead of one and a
half. The third is the odd one: half of what it carries — which containers
are picked out — is the host's own act with no module at the other end, and
a registry that finds no setter for it is not finding an absence of the
fact, only an absence of anybody describing what they show. See `REACTS_TO`.

The obvious third, the open epic, is NOT here, and the reason is that it is
already declared: a mode with `scope: 'epic'` is a module saying it follows
the reader, and one with `scope: 'global'` is a module saying it does not. A
second field meaning the same thing is a second field that will disagree with
the first. `prompt` is out for the same reason — `declares.prompt` says it.
The rule for adding a word here is that no other field already says it.

Free strings on the wire rather than an enum, for the reason `extensions` is
free: a module built against a host that broadcasts more than yours is not a
malformed module. A host that does not know a word shows it or drops it, and
either way frames the module.

#### `REACTS_TO.containers`

The third word, and the first whose other end is partly the host itself.

`containers` is the list of what is arranged on the kehikko: which module
each container holds, whether it is picked out, and what it says it is
showing. Two things change it. A module calling `showing.set` — which is
the capability a registry pairs this with, exactly as `passage:set` pairs
with `passage` — and a person ticking a container's box, which is the
host's own act and needs no module at the other end. A module ticking this
word is saying it narrows to what is picked out; whether anything on the
canvas can also say what it shows is a separate question the registry
answers by looking for setters, as it does for the other two.

#### `REACTS_TO.tracker`

The fifth: the shared tracker reading changed. Paired with
`trackers:refresh` the way `selection` is with `selection:set` — and, like
`containers`, also moved by the host's own act: a person pressing "Refresh
all", or the project's schedule. A module ticking this re-asks
`tracker.get` when `context.tracker.at` moves.

#### `REACTS_TO.content`

The sixth: the material a container shows for an epic changed — a step, a
journey, an epic's own text. Paired with `content:report`, and, like
`tracker`, moved by the host's own acts as well: its own writes to an
epic, and an edit to the project's files by anybody. A module ticking this
re-reads what it shows when `contentStamp(context.content, …)` moves. See
`content.ts`.

#### `REACTS_TO.parts`

The seventh: which parts of the open epic a person picked out. Like half
of `containers`, its other end is the host itself — the picking is done in
the host's bar and no module sets it, so a registry finds no setter and is
not finding an absence. A module ticking this narrows to the picked parts
and says how much it left out. See `parts.ts`.

#### `TAGS`

The category words this version suggests for `tags`, each with what it is
for.

A suggestion and not a registry. `tags` is not checked against it, for the
reason `reacts` is not checked against `REACTS_TO`: a module that files
itself under a word nobody has heard of yet is not a malformed module, and a
host shows the word as it is. What the list buys is that two authors who
mean the same shelf write the same word, and that a host has an order to put
the shelves in without keeping a table of its own.

#### `manifestSchema.kind`

The word that makes this a claim rather than a hopeful GET. Something else
entirely may be listening on the port a host asked, and it must not be
possible for that something to become a tab by accident.

Either spelling is accepted, and it is handed back AS IT WAS SAID rather
than respelled, because it is the one place a host learns which dialect
the module speaks before it greets it: `roadmap.module` is a module built
against this package from before the rename. See `dialectOfKind`.

#### `manifestSchema.version`

The module's own version, which this protocol never parses and never
compares. It is shown to a person, and that is the whole of its job — a
host that made a decision out of it would be making a decision out of a
string with no agreed grammar.

#### `manifestSchema.dataVersion`

Which FORMAT this module writes its project data in, as one positive
integer. Absent means 1.

##### Why this is not `version`

`version` is a string this protocol never parses, and it says what the
PROGRAM is. This says what the program's DATA is — the files under
`<project>/.kehikot/<module>/` — and it is the one number a host compares.
A module ships many versions in one data format: a release that fixes a
button does not change what an older release can read. So the two move at
different speeds and must not be the same field; a host that made a
decision out of `version` would be refusing every downgrade, including the
thousand harmless ones.

##### What a host does with it

A host that can run more than one version of a module against the same
project — a container pinned to an older release beside one on the latest
— records, per project and module, the highest number any version has run
with. It refuses to run a version whose number is LOWER, because that
version may not be able to read what a newer one already migrated, and the
failure would be a module quietly overwriting data it misunderstood. The
refusal is the host's, and it must say why; nothing here decides it.

##### What a module author should do

Raise it in the same release that first writes data an earlier release
cannot read, and at no other time. Leaving it alone is the right answer for
almost every release. A module that never writes project data never needs
to raise it.

Bounded like everything else: it is an integer a stranger wrote, and a
host records it.

#### `manifestSchema.tags`

The categories this module files itself under, most fitting first.

Said by the module so that a host can group and search what it lists
without a table of which module is which, and so that somebody's own
module is shelved by the same rule as a first-party one. See `TAGS` for
the words this version suggests; a word outside it is carried as written.

The ORDER is the meaning: the first tag is where a host puts a module it
shows once, and the rest only widen what a search finds. Empty by default,
so a manifest written before this field existed is a module with no
category — which a host draws under whatever it calls "other" — and the
field could be added without moving `PROTOCOL`.

#### `manifestSchema.guidance`

What an agent should do about this module, given that it is here.

##### Not the same thing as `summary`, and not the same thing as a prompt

`summary` says what a module IS, and it is written for a person choosing
whether to put it on a canvas. This says what its PRESENCE IMPLIES, and it
is written for an agent that has just been told the module is there:
"every issue on this canvas has a checklist, and the work is not done until
its items are ticked" is guidance; "the checklist for a merge request" is a
summary. The two are often confused and produce very different sentences.

It is also not `context.prompt`. That is written by a PERSON, on a canvas,
aimed at one pane, and changes as they change their mind. This is written
by the module's AUTHOR, ships with the module, and is the same on every
canvas the module is ever placed on. A host composes both — the standing
notes from what is present, then the instructions somebody wrote — and the
order matters, because context comes before orders.

##### Why it is a claim and not an instruction

A module writes this about itself, so it is a module's own account of what
it is for. A host relays it and must not dress it up as its own: an agent
reading composed guidance should be able to tell which module said what,
which is why a host that concatenates these attributes each one. The same
argument as `selection` carrying refs and not kinds — a host can vouch that
a module said something, never that it is true.

Empty by default. A module with nothing to say to an agent says nothing,
which is better than a sentence written to fill the field.

#### `manifestSchema.health`

Cheap liveness, so that "not running" and "broken" can be different words.

##### Why it is still here when nothing fetches it

It has an obvious smell: a field in a published schema that no consumer
reads is a promise nobody is keeping, and the honest thing is usually to
delete it and add it back the day something needs it. It stays, for two
reasons that only apply to a field of this particular kind.

The first is that this package describes a wire, not an implementation. A
manifest is written by module authors against the published shape and read
by however many hosts exist; "no host polls it yet" is a fact about today's
hosts, and removing a field on the strength of that would make every
manifest that already carries it fail to parse. The shape is the contract,
and the contract is allowed to describe more than one program uses.

The second is the more important one. The day something DOES poll it, that
something will be a process making a request to whatever address a
stranger's manifest named — which is precisely the crossing every host must
hold to its own rules. If the field is undeclared until then, every manifest
in the wild will already have been accepted under a looser rule, and the
check will be retrofitted onto a population of documents nobody validated.
Declaring it now means it is bounded now.

And it is CARRIED, on the parsed manifest like every other field, which is
the one thing the implementation this was distilled from got wrong: it
validated `health`, held it to the module's own origin, and then dropped it
on the floor rather than putting it on the result — so the only way to
reach it was to re-read the raw JSON, which is the way a second, looser
check gets written. A field worth validating is a field worth handing on.

What a host must still do for itself: resolve this against the origin the
manifest came from and refuse it if it leaves. A module may not use a host
to point a poller at a third party.

#### `manifestSchema.mcp`

Where the module's OWN MCP server answers.

A module is two surfaces over one store: a page for a person, and an MCP
server for an agent. A host does not proxy the second and does not speak to
it — it says where it is, so a person can connect a session to it and an
agent can be told which tools belong to which module. Naming it in the
manifest rather than in a second file is the point: one program, one
document, both its doors.

#### `manifestSchema.extensions`

The formats this module speaks, by name and version.

`emits` is what it will send — a notification, a report of its own network
calls. `consumes` is what it will show, which is how a notification panel
and an activity chart become modules rather than parts of the frame.

Neither list is checked against the extensions this package knows about,
and that is on purpose. A name this version has never heard of is a module
built against a later version of the format registry, or against somebody
else's; refusing the whole manifest for it would mean a module cannot
mention a format until every host it might meet has been upgraded. A host
that does not know a name simply does not route it, and can say so.

#### `manifestSchema.reacts`

The parts of the context this module says it REACTS to. See `REACTS_TO`.

##### Why this is not a third entry in `extensions`

`extensions.consumes` already names things a module receives, so folding
`passage` in beside `kehikot.notifications@1` would have cost one field and
looked tidier. It would also have destroyed the only distinction a registry
has worth drawing. An extension is CARRIED: a host reads `emits` on one
manifest and `consumes` on another and posts the payload into the second
module's frame, so the host performed the delivery and may vouch for both
ends of it. A context is BROADCAST: it goes to everybody, and what a module
writes here is its own account of what it does with it, which the host
cannot check and must not pretend to.

Two claims of different strength in one array become one claim of the
weaker strength, and the weaker one is the one a host would then be quoting
about its own event bus. Two fields, and a host that wants to show them
under one heading can join them where the joining is a rendering decision
rather than a loss of what it knew.

##### What a module author should put here

Only what the program actually moves for. You are SENT the whole context
regardless; ticking a word here buys you nothing and costs the next person
a list they cannot trust. Empty is the honest and common answer.

#### `manifestSchema.partless`

Why this module has nothing to narrow to the picked parts — one sentence,
for the module that does not say `reacts: ['parts']` (0.34.0).

Every item of a module's data is anchored to a part of the epic by a
file, a ref or a part id (`Anchor` in `parts.ts`), and a module that holds
such items follows the picked parts. Some hold none: a terminal, a list of
notifications, a canvas of every project. Those say so HERE, in words a
person can read in a registry — "A terminal: nothing in it belongs to an
epic." — so that "does not follow the parts" is a statement somebody made
and not something nobody got round to.

OPTIONAL and never defaulted, so a manifest written before this parses to
exactly what it did. A module that says neither is REPORTED by
`partsDeclaration`, not refused; the next version refuses it.

#### `manifestSchema.declares`

What the module says about itself and its host, as distinct from what it
says it IS.

The name is `declares` rather than `needs` or `wants` or `requests`, and
the difference is the whole of it. A field called `needs` reads as a demand
with an answer; a field called `requests` reads as half of a consent
handshake. Neither exists. What a module writes here is a statement of
intent that a person can read before installing the program, and that a
host may show, log, ignore, or contradict. Nothing is granted by it and
nothing is unlocked by it.

#### `manifestSchema.declares.uses`

What it intends to call.

Free strings, not an enum, for the same reason `extensions` is free:
a module built against a host that knows more capabilities than yours
is not a malformed module. See `CAPABILITIES` in `methods.ts` for the
names this version of the protocol describes.

Read it as documentation. A module that declares nothing and calls
everything is refused by the host at each call, exactly as if it had
declared honestly — the declaration is not what the host checks
against, because a check against a string the module wrote is a check
the module passes by writing a different string.

#### `manifestSchema.declares.storage`

Whether the frame needs its own origin back — cookies, localStorage,
IndexedDB.

False by default, which is the whole reason it is a field: a module
that never says this runs on an opaque origin and cannot reach even its
own storage. It is the one field here that changes what a host does,
and it still changes nothing on its own — the host decides whether to
hand back an origin, and a host that always refuses is a conforming
host. What the field buys is that the module can be told why its
storage is empty instead of finding out by exception.

A module that asks for this is also asking to be addressable: with an
origin of its own, messages to it can be addressed by that origin
rather than by `'*'`. That is a consequence, not a second field.

#### `manifestSchema.declares.prompt`

Whether this module has a use for a prompt somebody writes for it.

A declaration, not a demand. It is how a host knows to OFFER one — to
list this module among the panes a prompt can be aimed at, and to show
that a prompt is expected here and has not been written yet. A host
that offers nothing is still a conforming host, so a module declaring
this must work with `context.prompt` null, because on such a host it
always will be.

Declared rather than inferred from behaviour, for the reason every
other declaration here exists: somebody deciding whether to run a
program should be able to read what it expects before it runs, and a
host should not have to watch a module to find out what it wants.

#### `legacyManifest`

A parsed manifest, spelled for a host from before the rename.

What a module built against this package serves at `LEGACY_WELL_KNOWN`, so
a host that has not been updated still finds it: the old `kind`, the old
module id, the old extension names. Everything else is the same document.
That host then greets the module with `roadmap.hello`, and `connect()`
answers in the dialect it was greeted in, so the module is the same module
to both hosts.

Pure. The manifest passed in is not changed.

#### `speaks`

Does a range include a protocol number?

The grammar is a handful of comparisons against an integer — `>=1 <2`, or
bare `1` — separated by spaces, and all of them must hold. Anything it cannot
read is treated as naming NOTHING rather than as naming everything: a module
whose claim is unreadable is incompatible, which is a sentence somebody can
act on, while a module whose unreadable claim was waved through is a frame
nobody agreed to.

Pure, and it is a reading rather than a decision. It answers what a string
says; whether to frame the module is a separate question, and a host asking
it has at least one more comparison to make — its own protocol number against
`manifest.protocol` — because a permissive range from a module claiming
protocol 9 is not an argument for anything.

#### `partsDeclaration`

What is wrong with what a module says about the parts of an epic — as
sentences a host can show, and `[]` when nothing is.

The requirement (0.34.0): a module either follows the picked parts
(`reacts` has `parts`) or says in `partless` why it has nothing to narrow.
Saying NEITHER is the case this exists to find: a module nobody has asked
the question of, which shows the whole epic whatever is ticked. Saying both
is a contradiction, and is reported too.

**A warning in this version, a refusal in the next.** `manifestSchema` does
not call this, so every manifest parses as it did; a host shows the list,
and `bun run check:parts` fails on it. From the next minor version a
manifest that declares neither will not parse.

Pure, and a function of two fields, so it takes a parsed manifest or the
object a module is about to hand to `manifestSchema.parse`.

#### `ModuleCondition`

What a host has concluded about one module, in one word.

Three, where an earlier design had five. `offered` and `changed` are gone
with the consent mechanism they belonged to: both meant "waiting on a
person", and there is nobody to wait for. What is left are the three states
that are facts rather than decisions — it works, it speaks a protocol we do
not, or nothing is answering — and each of them is something a host can
establish without asking anyone.

`silent` is the one worth keeping in a list rather than dropping. A module
that was there a minute ago and is not now has a row saying so; a tab that
vanishes under the cursor of somebody about to press it is worse than one
that says the program is not running. A module that silently fails to appear
is indistinguishable from one that was never installed.

This type is here because both a host and a client library will name these
states and should name them the same way. Which state a given module is in is
never computed here.
