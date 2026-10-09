# Limits

Why every string and every list is bounded, and the reasoning behind each number in `LIMITS`.

This is the reasoning, not the reference: the shapes themselves, with their bounds, are in the source and show on hover. The first half is the overview that used to be in the README; the second half is the note that used to stand above each symbol in the source, under that symbol's name.

Back to the [index](README.md).

## Overview

### Every string is bounded

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

## Notes by symbol

### `src/limits.ts`

#### `LIMITS`

How long anything is allowed to be.

Every one of these is load-bearing rather than hygiene, and the reason is
always the same: a manifest is a document written by a stranger, and most of
its fields end up on the host's own screen. Four rounds of review over the
implementation this package was distilled from found unbounded fields at four
different places, and each one was a paragraph of somebody else's text — or
two hundred thousand characters of it, or a right-to-left override — printed
under a name a person was about to make a decision about.

`URL` is 2048 because that is the number browsers and proxies have long
treated as the practical limit of a URL, which makes it the longest one that
could ever be worth honouring rather than a figure invented here. `RANGE` is
40 because `>=1 <2` is seven characters and the grammar `speaks()` reads
cannot spell anything long — and it matters more than its size suggests,
because a protocol range is the one manifest string a host is likely to quote
into a sentence when it refuses the module.

They are exported so that a host writing its own copy of these schemas — and
it should; see the README — can hold to the same numbers without guessing at
them, and so a module can refuse its own too-long summary before publishing
it rather than being refused for it.

#### `LIMITS.DATA_VERSION`

The highest data-format number a manifest may declare in `dataVersion`.
Not a string, but a number a host records per project, and a host should
not have to store whatever a stranger typed. A million formats is more
than any module will ever ship.

#### `LIMITS.REACTION`

The name of a context kind a module says it reacts to. See `reacts`.

The same 64 as `CAPABILITY` and `EXTENSION`, and the sameness is deliberate
rather than lazy: all three are short registry words a module copies out of
a document, and an author made to remember three different ceilings for
three lists of short words will get one of them wrong. The words this
version knows are `passage`, `selection` and `containers`; the room is for
the ones a later host broadcasts.

#### `LIMITS.PATH`

An absolute path to a folder on the machine the host is running on.

4096 because that is Linux's `PATH_MAX`, and it is the larger of the two
numbers a host is likely to be standing on — macOS imposes 1024. Taking the
larger means this bound never refuses a path the operating system was
willing to hand out; a module that finds one too long for its own platform
finds out from the platform, which is the thing that actually knows.

It is a bound and not a validation. This package does no I/O: it cannot say
whether a path exists, is a directory, or is even absolute, and a regex
pretending otherwise would be a check that passes for `../../etc` on every
host in the world. What the bound does is stop a host putting a document in
a field a module is about to render, which is the same job every other
number here does.

#### `LIMITS.GOTO_REF`

A reference inside a `goto` or a `view.goto`, which is longer than `REF`
and deliberately not the same number.

`REF` bounds a reference being STORED — filed against work, in a database,
under somebody's name, where a clipped one is a *different* ref against
work nobody meant. This one bounds a reference being MATCHED: carried
across the frame, compared against the anchors in a rendered page, and
then forgotten. 200 is not invented here either — it is what the receiver
that already exists imposes on its own inbound `ref`, and the number is
restated so a sender knows what will survive rather than discovering it by
having a walk land nowhere.

If the two ever become one number it should be by lowering this one, and
that would be a break: a module already sending a 120-character ref would
stop being able to. Raising `REF` instead would loosen a bound on text that
gets written down, which is the wrong direction for the wrong reason.

#### `LIMITS.TITLE`

An epic's title, in the one place this package describes a host's own
material — the spine of `epics.list`. See `methods.ts`.

Worth a word, because this is text going the OTHER way: the host wrote it
and the module is what has to survive it. The bound is not protecting a
host from a stranger here. It tells a module author how much room to leave
in a list they are about to draw, so that a title is either shown whole or
known to be too long before the layout finds out — and it means a host
cannot hand a framed page a document where a name was expected.

#### `LIMITS.QUOTE`

The words of the passage a reader is pointing at, carried in the context.

##### Why a quote travels at all, when offsets already say where it is

A byte range names a place in a file and says nothing about what is there,
and the file is being edited while all of this is running. A module that
received only `from` and `to` and wanted to show the passage would have to
open the file — which most modules cannot, and none should have to in order
to draw a line of text — and would read whatever is at those offsets NOW,
which after one edit above them is a different sentence with nothing to say
so. The quote is the reader's own evidence, taken at the moment they
pointed, and it is what lets anything downstream NOTICE that the offsets
have rotted rather than confidently naming the wrong prose.

##### Why it is bounded far below a document

This rides in `kehikot.context`, which is broadcast to every framed module
on the canvas every time the reader moves. Unbounded, a reader who selected
a chapter would push a chapter through every frame on every change of
selection. Two kilobytes is several paragraphs — more than anybody
highlights to make a point about — and is nowhere near somewhere to put a
document.

A sender with more than this is REFUSED rather than clipped, by the rule
`stage.report`'s note follows: a clipped quote is a quote of something
nobody said, and a consumer comparing it against a file would then call a
good anchor rotten. Shorten the selection before sending it, so that the
side which knows it shortened something is the side that says so.

#### `LIMITS.TAGS`

How many of those it may give.

Five, because a tag is where a module goes in a list, and a module filed
under everything is filed nowhere. The first is the one a host uses when
it shows each module once; the rest are only there to be searched.

#### `LIMITS.REACTIONS`

How many context kinds it may say it reacts to.

Eight, against `CAPABILITIES`' thirty-two, and the smaller number is an
argument rather than an economy. A context has a handful of fields and
always will: this version broadcasts three things a module can meaningfully
choose to ignore, so a manifest listing eight is already claiming to react
to five kinds that do not exist yet. The bound sits where an honest list
stops, which means a manifest with thirty entries here is refused as the
nonsense it is rather than drawn as a module that reacts to everything.

#### `LIMITS.FILTER_ID`

The id of a filter group or of one of its options.

Sixty-four, the same as `CAPABILITY`, `EXTENSION` and `REACTION`, and the
sameness is the same argument: these are short machine words a module
author invents once and then copies about, and an author made to remember
four different ceilings for four kinds of short word will get one of them
wrong.

It is a bound and not a grammar. A host uses these as keys — in a stored
record, in a React list, in a lookup — and the protocol deliberately does
not say what they may contain, because a module's own vocabulary for its
own filters is none of this package's business. What a host must NOT do is
index a plain object with one; see `own()` in `ids.ts`, which exists for
exactly this class of string.

#### `LIMITS.FILTER_LABEL`

The words a person reads on one filter group, or on one of its options.

Forty-eight, which is deliberately twice `LABEL` and nowhere near
`SUMMARY`, and both halves of that are load-bearing.

Twice `LABEL` because these labels COUNT things. The five filters this was
designed against are spelled `hide resolved`, `show ignored`, `hide
preamble comments`, `this kehikko` — none of which needs the room — but the
one that mattered most is `show 41 ignored`, where the number is the whole
reason the label is worth reading. A label that had to be a fixed word
could not say how much is being hidden, and hiding things quietly is the
failure the modules that grew these controls were most careful about.

Nowhere near `SUMMARY` because this is a string a stranger's program wrote
that a host is about to lay out inside its own chrome. Forty-eight
characters is a phrase; two hundred is a sentence that would have to wrap
or truncate in a menu attached to a container that is often 220 pixels
wide. A host should truncate anyway — and the host this was built for does,
with the full text in a `title`, because a nowrap element carrying a
variable string once put an 1187-pixel min-content floor under a 220-pixel
container in this workspace. The bound is what keeps the truncation from
ever having a document to do it to.

#### `LIMITS.CLEAR_LABEL`

The words a person reads on the control that clears what a module shows.

Forty-eight, the same as `FILTER_LABEL`, and for the same two arguments:
this label COUNTS things (`12 shown`, `everything from this run`) so it
cannot be a fixed word, and it is a stranger's string that a host is about
to put on its own chrome, so it must be nowhere near `SUMMARY`.

It is a separate NAME at the same NUMBER, deliberately. A host that read
`FILTER_LABEL` when bounding a clear label would have tied two features
together that have nothing to do with each other, and the day somebody
changed one for a reason that belonged to filters, the other would move
with it. The sameness of the number is an argument that the two labels are
alike; sharing the constant would be a claim that they are the same thing.

A host must truncate anyway, and this one does — with the full text in a
tooltip and in the accessible name, because the header is a flex row where
a `whitespace-nowrap` element carrying a variable string once put an
1187-pixel min-content floor under a 220-pixel container.

#### `LIMITS.FILTER_GROUPS`

How many groups one module may offer at once.

Four, and this is the number most likely to be argued with later, so here
is the reasoning. Six of the seven filters in the workspace this was
designed for are ONE group — a single choice from a single list. The
seventh offers two independent groups that combine (a kind and a state),
which is why the facility takes a list of groups at all rather than a list
of options. Four leaves that module room to grow one more axis and still
refuses the shape this control cannot be: a menu hanging off a
twenty-four-pixel button in a container header is not somewhere to put a
settings screen. A module with five axes has a settings screen, and it
belongs in the module's own page where there is room for it.

#### `LIMITS.FILTER_OPTIONS`

How many options one group may offer.

Twelve, against the four the longest real one uses (all files → this file →
this section → this selection). The room is for a group whose options are
DISCOVERED rather than written — the branches in a repository, the people
who wrote something — which is the obvious next thing somebody will want
and the obvious way to hand a host a list of nine hundred. Twelve is more
than a menu of this kind should hold and far less than a list that has to
be scrolled, searched or paged, and a module whose options genuinely run to
hundreds is a module that needs a control this one is not.

#### `LIMITS.FILTER_TEXT`

What somebody TYPED into a filter, which is the newest thing in this list
and the first value here that is not an identifier.

##### Why there is a text kind at all, having refused one twice

`filterGroupSchema` said, in its own words, that free text was refused by
design: a text input in a container header needs room a 220-pixel header
does not have, it needs focus, it needs a keyboard, and a host cannot
debounce or interpret somebody else's search. Every clause of that was
about a text box laid out IN the header strip beside six icon buttons, and
every clause of it is still true of that.

What the argument never examined is that the header strip is not where the
filter lives. It is one twenty-four-pixel button that opens a MENU, and a
menu is a floating layer with its own width, its own focus scope and as
many rows as it likes. An input in there costs the header nothing, takes
focus because a menu already does, and is dismissed the way every other
menu is. The refusal was right about the strip and wrong about the feature.

The module that forced it is the one this whole facility was shaped around
— a list of references narrowed by kind, by state, and by a typed query.
Two of its three axes moved to the header and the third stayed behind,
which left one module drawing a row of chrome for the sake of one control,
and a person looking in two places for one filter.

##### Two hundred, and what the number is protecting

This is stored per container in a host's database, echoed back in every
`kehikot.context`, and rendered inside somebody else's chrome — the same
three exposures `FILTER_LABEL` has, and one more: a module can WRITE it
with `filters.set`, so it is the one value here that a program rather than
a person can produce at speed.

Two hundred is `SUMMARY`, deliberately: it is the length this package has
already decided is "a sentence somebody wrote, not a document". Nobody
types two hundred characters into a search box on purpose, and a paste that
would have is clipped by the module rather than refused by the wire — a
clipped query is still a query, where a refused one is a filter that
silently stops working the first time somebody pastes a stack trace into
it.

A host must not use this as a key, index anything with it, or read meaning
into it. It is what somebody typed. The KEY beside it is still a
`FILTER_ID` and still refuses the three spellings that are not really keys;
see the essay there, which is what this bound does not weaken.

#### `LIMITS.DISPOSITIONS`

How many dispositions a context may carry: the marks people put on refs to
say why each one closed. See `dispositionSchema` in `wire.ts`.

Two hundred and fifty-six, because these are a person's own verdicts, made
one press at a time, and a project's worth of them is the tens. What a
tracker already says about a close is NOT in this list — every module
derives that from its own reading with `deriveDisposition` in `facets.ts` —
so the bound is on what people wrote, which is the small number.

#### `LIMITS.PARTS`

How many parts of the open epic one context may list. See `parts.ts`.

Thirty-two. A part is a heading a person wrote to divide one epic, and an
epic with more than a handful has stopped being divided and started being
indexed. Like `CONTAINERS`, this bounds a list a HOST built out of its own
material, so it protects a module from a host: a module reading
`context.parts` knows the size of the list it is about to draw a checkbox
for.

#### `LIMITS.PART_REFS`

How many references one part may list.

Two hundred and fifty-six, and deliberately not `REFS`. `REFS` bounds what
somebody PICKED — a gesture, made by hand — and a part is not a gesture,
it is a chapter of the work: everything the epic files under one heading.
The number is the one `DISPOSITIONS` uses for the same reason, a project's
worth of something. It is still a bound, because this list is broadcast to
every frame on every change of anything, and a host that has more than
this under one heading sends the first of them and is expected to say so
on its own screen.

#### `LIMITS.PART_FILES`

How many of the paper's files one part may name. See `partFile` in
`parts.ts`.

Thirty-two. A part of a paper is a chapter or a section kept in a file of
its own, and sometimes that file pulls in a few more — a table, a figure's
source, a subsection. It is a list a person wrote by hand, one name at a
time, so it is the small number: `PARTS`' number and not `PART_REFS`',
which bounds what a tracker can pile under a heading. Like `PART_REFS`
this rides in a context that is broadcast to every frame, and a part with
more files than this sends the first of them.

#### `LIMITS.PART_FILE`

How long one of those file names may be.

Two hundred and fifty-six, and deliberately not `PATH`. `PATH` bounds an
ABSOLUTE path, where the operating system is the authority and four
thousand characters is its number. This is a name RELATIVE to one paper's
folder — `parts/posting-seam.tex`, `chapters/3_method/tables/results.tex`
— and 255 is the longest a single component may be on every filesystem a
host is likely to stand on. A paper whose files sit deeper than that is
not refused anything by its engine; it is a file a part cannot name.

#### `LIMITS.SHOWING_DOCUMENTS`

How many places in documents one container may say it is showing.

Sixteen, and the number is about what the field is FOR rather than about
any document. A container saying what it shows names the file a reader has
open, or the file and the section they are in, or — for a program that
lists things — a handful of places at once. That is one, two, or a few. A
program with more than sixteen is enumerating its own material into every
frame on the canvas on every change, and the essay on `QUOTE` already says
why the context is not the place for a document: it is broadcast, to
everybody, on every change of anything.

Each entry is a whole `passage`, with `quoted` bounded at `QUOTE` — so
the worst case is bounded too, and is far larger than any honest use. A
module saying what it shows should leave `quoted` EMPTY, and the essay on
`containerSchema` in `wire.ts` says why: a quote is a reader's evidence for
a highlight, and a file being shown has no highlight to evidence.

#### `LIMITS.CONTAINERS`

How many containers one context may describe.

Sixty-four, which is the most a host this was written against lets onto one
kehikko, restated here so that a module reading `context.containers` knows
the size of the list it is about to walk. It bounds an array a HOST built
out of its own arrangement, so unlike almost every other number here it is
not protecting a host from a stranger — it is protecting a module from a
host, the same direction `TITLE` runs in.

#### `LIMITS.MODULE_STATE`

A module's own state, which the host keeps and never reads.

Four kilobytes is far more than the thing it is for — which filter is on,
which column is sorted — and far less than somewhere to put a document.
The bound does two jobs and the second is the interesting one: it says what
this is FOR. A module that finds four kilobytes tight is keeping something
that belongs in its own store, on its own port, where it can be queried and
backed up and read by its author. The host is not a database for modules,
and this number is where that is said out loud.

#### `LIMITS.PROMPT`

A prompt a person wrote on a canvas for one module to work from.

Larger than a note and smaller than a document. Eight kilobytes holds a
paragraph of instruction, a house style, a list of things to watch for —
and does not hold a specification, which belongs in a file the prompt can
point at rather than in a field the host has to carry to every frame on
every context change.

#### `LIMITS.GUIDANCE`

A module's standing note about what its presence implies.

A kilobyte, which is a paragraph — deliberately much smaller than a
`PROMPT`. A person writing a prompt is instructing one agent about one
piece of work and may need room. A module author is saying one thing, once,
to every agent that will ever see this module on a canvas, and it has to
survive being concatenated with four others without becoming the whole of
what an agent reads. The bound is the design: if it does not fit in a
paragraph it is documentation, and documentation goes behind a link.

#### Inside `LIMITS`

The shared tracker reading. See `tracker.ts`.

These bound an answer a HOST built from what a tracker said, so like
`CONTAINERS` they protect a module from a host — and a host from a tracker
that hands back a ten-megabyte description. Text is clipped to them when
the host reads it, with a flag where clipping loses something a reader
would want to know about (`bodyClipped`, `filesClipped`); refs never are.
