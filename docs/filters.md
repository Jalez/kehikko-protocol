# Filters, clearing and refreshing

The three things a module offers and the host draws: filters to narrow by, a control that clears what is shown, and a control that reads the material again. Also the shared reference facets behind `/facets`.

This is the reasoning, not the reference: the shapes themselves, with their bounds, are in the source and show on hover. The first half is the overview that used to be in the README; the second half is the note that used to stand above each symbol in the source, under that symbol's name.

Back to the [index](README.md).

## Overview

### A filter the host draws and the module means

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

#### Toggles, and the shared ref facets at `/facets`

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

### And a control that clears what a module is showing

The same shape a second time, for the other control a module cannot draw in a
strip it does not own. A module says that what it shows can be cleared and what
to call it; the host draws one button; a press comes back as `kehikot.clear`;
**the module does the deleting**.

```ts
live.clearable(`clear ${shown.length} shown`)   // and `null` to withdraw it
```

```ts
useHost(id, {
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

## Notes by symbol

### `src/filters.ts`

#### `RESERVED_IDS`

The id of a filter group, or of one option within one.

##### Three spellings a module may not use, and why the refusal is here

A choice travels as a RECORD keyed by group id, and a record is a plain
object. `__proto__`, `constructor` and `prototype` are the three keys that do
not behave like keys: assigning `__proto__` on an object literal re-parents
it rather than storing anything, and reading `constructor` off one finds
something inherited that was never written. A host that stored a choice under
one of those and read it back would get an answer it never put there — which
is the same hazard `own()` in `ids.ts` exists for, arriving from a new
direction, and this time in a key the module chose.

`own()` remains the rule for READING these — a host must not index a plain
object with a string a stranger sent, whatever this schema says. The refusal
here is the second half of the defence rather than a substitute for it: it
means the three names never reach storage in the first place, so a host that
gets a lookup wrong somewhere has nothing to get it wrong with.

Nothing else is legislated. A module's own vocabulary for its own filters is
not this package's business, and a regex over it would be this file deciding
what a program may call the thing it hides.

#### `filterOptionSchema`

One value a module can be narrowed to.

An id and a word, and there is deliberately nothing else. No icon, no colour,
no count field, no "kind", no hint about whether this option means more or
less of anything.

##### The host must not understand what a filter MEANS

This is the whole discipline of the feature and it is easy to erode one
helpful-looking field at a time. A host that knew `resolved` from `ignored`
would be a host to be updated every time a module has a new idea, and the
modules this was designed against have six different ideas between them —
resolved, ignored, preamble comments, which kehikko an event came from, what
kind a reference is, what state it is in. Enumerating those in a protocol
would freeze somebody else's vocabulary into a package they do not own.

So the host's entire knowledge is: there are some options, one of them is
current, and here are the words to print. It draws a menu and reports a
press. The meaning stays where the meaning is, which is in the module that
wrote the label.

##### The count rides in the label, on purpose

`hide 3 ignored` is one string, not a label and a number. A separate count
field would be the host deciding how a count is phrased and where it goes,
for a module that knows both far better — and it would be wrong immediately
for the modules whose interesting number is a fraction (`12 of 40 shown`) or
is not a number at all. A module re-announces its offer whenever the words
change, which it has to do anyway when its options change, so the count is
live for free.

What a host cannot do is count anything itself. It sees rows it does not
render, in a document it cannot read, in a frame on another origin. A module
for which the exact number must be visible without a press should go on
drawing it in its own page; a header control can say THAT something is
narrowed, not how much.

#### `filterGroupSchema`

One axis a module can be narrowed along, and the options on it.

##### Why groups, plural, rather than one list of options

Six of the seven filters this was designed against are a single choice from a
single list, and a facility taking one list would have fitted them all. The
seventh — a module that lists an epic's references — narrows by KIND and by
STATE at the same time, and the two are independent: issue-and-open is a
combination somebody actually wants, and it cannot be spelled as one choice
from one list without multiplying the two lists together into twelve options
that a person then has to read as a grid.

So the shape is a list of groups, each with its own current value, and the
one-group case is a list of length one. Two axes cost that module one more
entry and cost every other module nothing.

##### Free text, which this used to refuse and now has a kind for

What stood here said there was no shape for a typed query, that it was a
decision rather than an oversight, and that a module wanting one would have
its filtering in two places and might well prefer to keep all of it. The
reason given was that a text input in a container header needs room a
220-pixel header does not have, needs focus, needs a keyboard, and cannot be
debounced or interpreted by a host.

That was an argument about a text box in the header STRIP, and it is still
correct about one. It was applied to the whole feature, and the feature is a
twenty-four-pixel button that opens a MENU — a floating layer with its own
width and its own focus scope, where an input costs the header nothing.

So there is a `kind` now, `text` is the second value, and the consequence the
old paragraph called honest turned out to be the thing worth removing: the
module this was designed against had two of its three axes in a header and
the third in a row of its own chrome, and a person looking for one filter had
to know to look in two places. `LIMITS.FILTER_TEXT` carries the rest of the
argument and the bound.

A module is still not obliged to hand over anything, and one that keeps all
of its own filtering is still a conforming module.

##### `fallback` is what makes a stale choice recoverable

It names the option this group is on when nobody has chosen — the wide one,
the unnarrowed one, whatever the module considers its resting state. It does
three jobs, and each would otherwise need its own field or its own
convention:

- it is the choice for a container nobody has ever pressed this on;
- it is what a host returns to when a remembered choice names an option the
  module no longer offers, which is the difference between a filter degrading
  to normal and a container narrowed by a value nobody can see or clear;
- it is how a host can offer one press that puts everything back, without
  knowing which of the options means "everything".

It must name one of this group's own options, and the schema checks that,
because a fallback pointing at nothing would turn the recovery path into a
second broken state.

#### `filterGroupSchema.kind`

Whether this axis is chosen FROM or typed INTO.

Absent means `choice`, and that is load-bearing rather than a convenience:
every module written before this field existed sends a group without it,
and every one of them meant a list of options. A required field with a
default would have been a breaking change dressed as an addition.

`text` is one input. It has no options and no fallback — its resting state
is the empty string, which is not a value anybody stores — and what comes
back in `filterChoiceSchema` under this group's id is what somebody typed.
The essay on `LIMITS.FILTER_TEXT` is why this exists after being refused
twice, and the short version is that the refusal was about a text box in
a header STRIP and the control is a MENU.

A host that has never heard of `text` draws nothing for such a group,
which is the correct degradation: a group with no options renders as an
empty section rather than as a broken one, and the module goes on
receiving `{}` for it — which is what "nothing typed" means anyway.

`toggles` is a SET of independently hideable options. What comes back
under its id is a list of the option ids that are switched on — for a
group called "hide", the things hidden. It exists because one choice per
axis cannot say "hide closed changes, keep closed issues": kind and state
were two groups, each holding one value, and the combination people want
is a cell of their product. A toggles group says it in one group, which
also gives back the groups the product used to cost.

Its resting state is the empty set, so it has no fallback, for the reason
a text group has none. A host that has never heard of `toggles` draws
nothing and sends `{}` — every option off, which is the unnarrowed list.

#### `filterGroupSchema.options`

What can be chosen. Empty for a `text` group, at least one for a choice.

Defaulted so that a text group may leave it out entirely, and still an
array on the way out so that every host already written — `group.options.
some(...)` — goes on compiling and goes on being right.

#### `filterGroupSchema.fallback`

Which option this group is on when nobody has chosen. One of `options`.

Optional only because a `text` group has none: the resting state of an
input is empty, and a fallback naming a value would be a search box that
starts with something in it. The refinement below still requires it for
every choice group, which is every group anybody has written so far.

#### Inside `filterGroupSchema`

Both of these are a module confusing the two kinds, and both would
         produce a control nobody could operate: options nothing draws, or a
         fallback that no press can return the input to.

#### `filterChoiceSchema`

What each group is currently set to: group id → an option id, or what
somebody typed.

This is the half that travels back, and it travels in `kehikot.context` — see
the field there for why it is context rather than a message of its own.

Bounded to `FILTER_GROUPS` entries, so the record cannot be larger than the
offer that produced it. A host filling this in from its own store should also
drop anything the module is not currently offering, so that a module never
receives a choice it does not recognise; a module should nevertheless fall
back to its own default for an option id it does not know, because both
halves of a disagreement have to be able to survive it alone.

##### The key is still an id. The value is not, any more.

It was `filterId` on both sides when every group was a list of options, and
the value is now `FILTER_TEXT` — long enough for what somebody types into a
`text` group, and comfortably long enough for every option id there has ever
been, since `FILTER_ID` is a third of it.

Which half was widened matters, and this one is the safe half. The essay on
`filterId` is about strings a host uses as KEYS: `stored['constructor']`
finds something on the prototype that nobody put there, so the three
spellings that are not really keys are refused at the wire. Every one of
those defences is on the left-hand side of this record and none of them
moved. A value is looked at, compared against an offer, and drawn; it is
never used to index anything, and a host that indexes something with it has
a bug this bound was never going to prevent.

What the wider bound costs is precision on the choice half of a CHOICE group:
a stored `{kind: <a 190-character string>}` now validates where it used to be
refused at 64. It reaches nothing: a host reconciles every stored value
against the offer the module is making right now and drops anything that is
not one of that group's options, and the module falls back again on its own
side. Two programs already had to survive a value neither of them recognises,
because that is what a module shipping new options means; this makes the set
of such values slightly larger and changes nothing about what happens to one.

##### A list, for a toggles group and for nothing else

A `toggles` group's value is the list of its option ids that are on. The
value was a string for every group until then, so this is a widening, and it
is safe for the reason `kind` was: a module receives a list only under a
group it offered as `toggles`, which no module written before the kind
existed can have done. A host reconciles a list the way it reconciles a
string — drop every id the group does not offer now — and an empty list is
stored as nothing, since it means the resting state.

### `src/messages.ts`

#### `filtersSchema`

What a module currently offers to be narrowed by. The whole offer, every time.

Replacing rather than merging, and the difference is the one that matters
when a module's options CHANGE: a merge could never remove a group, so a
module that stopped offering something would leave a control behind it that a
person could press and nothing would answer. An empty array is a real message
— "nothing here can be narrowed now" — and a host that receives one takes the
control away.

A module sends this whenever the answer changes, which includes whenever the
words change. See `filterOptionSchema` on why the count lives in the label.

#### `clearableSchema`

What a module offers to clear, in its own words. The whole offer, every time.

A `label` and nothing else, and the emptiness of that is the same discipline
`filterOptionSchema` keeps: no count field, no icon, no severity, no "kind",
and above all no list of what would go. The host draws a control and reports
a press. What "shown" means, what is behind it, and how much of it there is
are the module's business, and a host that was told any of it would be a host
that could be updated every time a module has a new idea about its own data.

##### The count rides in the label, as it does for a filter

`clear 12 shown` is one string. It has to be one string, because the number
is the whole reason a person reads this control before pressing it — it is
how they discover that their filter narrowed things to three rather than
thirty, which is the difference between the press they meant and the press
they did not. A separate count field would be this package deciding how a
count is phrased, for a module that knows better and whose interesting
number is sometimes not a number (`everything from this run`).

##### `null` is a real message, and it is the withdrawal

It says there is nothing on screen to clear now. The host takes the control
away rather than leaving a button that deletes nothing — a button whose press
has no effect teaches a person that the button does not work, which they will
remember on the day it would have. It is the exact counterpart of `filters`
sending an empty `groups`, and it exists for the same reason: whole
replacement is what lets an offer be taken back.

A module re-announces whenever the words change, which — because the words
carry a count — is whenever what it shows changes. Including immediately
after it has been asked to clear, which is the only feedback loop this
feature has and the only one it needs.

#### `clearSchema`

The press, relayed. "Clear what you are showing."

Deliberately empty apart from its type, and every field somebody will want to
add to it is a field that would break the feature.

**Not a list of what to delete**, because the host does not know and must not
find out. **Not the filter choice**, because the module already has that from
`kehikot.context` and a second copy would be a second answer to one question,
arriving on its own schedule and disagreeing after any race. **Not a
correlation id**, because there is no answer: see `MESSAGE.CLEAR` for why an
acknowledgement would only tempt a host into reporting a number it did not
count.

`protocol` rides along as it does on every other host message, so a module
can tell which host it is talking to without keeping the greeting.

#### `refreshableSchema`

What a module says about being refreshed. The whole state, every time.

Three fields and no fourth, and the discipline is `clearableSchema`'s: no
count of what would be read, no description of where from, no error, no
interval. The host draws a control, reports a press, and formats one
timestamp it was handed.

##### `at` is the only fact in this protocol a host would otherwise guess

The essay on `MESSAGE.REFRESHABLE` is the long form and it is worth having
the short one here, beside the field: the host knows when it ASKED, and when
it asked is not when the data is from. A module may answer out of a cache, a
refresh may fail over a reading it keeps showing, and a module may refresh
itself for a reason the host has no view of. In all three a host that dated
the data from its own message would print a time that is wrong beside data
that is older than it says.

So it is an ISO 8601 instant, with an offset, from the module — and `null` is
a real answer meaning "I cannot say", for which a host draws no time at all
rather than inventing one. A module that has never successfully read anything
sends `null` and keeps sending it.

##### `can` is how the control is withdrawn, and it is not `busy`

`false` takes the control away: there is nothing to refresh right now — no
project, no document, nothing this module could read again — and a button
that cannot work teaches a person that the button does not work, which they
will remember on the day it would have. It is the counterpart of `clearable`
sending `null` and of `filters` sending an empty `groups`.

`busy` leaves the control there and says a read is in flight. Two presses
racing is two subprocesses and one answer that wins for no reason anybody
could predict, and the module is the only side that knows.

A module re-announces whenever any of the three changes, which is at least
twice per refresh — `busy: true` on the way in, a new `at` on the way out —
and that is the whole of the feedback this feature has.

#### `refreshSchema`

The press, relayed. "Read your material again."

Empty apart from its envelope, exactly like `clearSchema`, and every field
somebody will want to add is one that would break it.

**Not why.** A person pressed the button, or an interval elapsed; the module
cannot tell and must not need to, because a flag saying "this one was
automatic" would be used to behave differently and that is the module setting
policy from a fact about somebody else's timer.

**Not the interval**, because the host runs the clock — see `MESSAGE.REFRESH`
— and a module told the number would be a module tempted to run a second
timer beside it.

**Not a correlation id**, because there is no answer. What comes back is a
new `kehikot.refreshable`: `busy` while it runs, then a new `at`. An
acknowledgement would only tempt a host into reporting on work it cannot see.

### `src/constants.ts`

#### `MESSAGE.FILTERS`

Module → host. "Here is what I can be narrowed by."

The tenth message, and the first one where a module offers the host
something to DRAW rather than something to do. Everything else a module
says is either a question (`request`), an answer (`went`), an announcement
about itself (`ready`) or a wish about its own box (`resize`). This is a
module handing over a small piece of its own interface, because the place
that interface belongs is a strip the module cannot reach.

##### Why a message and not a manifest field

What a module can be narrowed by is not a fact about the program; it is a
fact about what the program is showing right now. A file tree offers "hide
ignored" and the label on it is `hide 3 ignored` in one directory and
`hide 41 ignored` in the next. A manifest is read once, before the module
runs, and could carry neither the count nor the fact that a particular
project has nothing ignored in it at all.

That is also what keeps this from becoming a third declaration beside
`declares.uses` and `reacts`. Those two are written in a document a person
reads BEFORE running the program, and the whole discipline around them is
that nothing is granted by them. This is not in the manifest, is not read
by anything before the module runs, and gates nothing: a module that never
sends one is a module the host draws no control for, which is exactly what
every module looked like the day before this existed.

##### Fire and forget, like `resize` and for the same reason

No id, no answer. The host may draw the offer, may draw part of it, may
ignore it entirely; a module that needed to know can watch what arrives
back in `context.filters`. A module posting this at a host that has never
heard of it gets silence, which is what an unrecognised message has always
produced in both directions.

The offer REPLACES whatever was last offered, whole. An empty `groups` is
how a module withdraws — it has nothing to be narrowed by any more, and the
host takes the control away rather than leaving a menu of options that no
longer mean anything.

#### `MESSAGE.CLEARABLE`

Module → host. "What I am showing can be cleared, and here is what to call it."

The eleventh message, and the second one where a module hands the host a
piece of its own interface to draw. `filters` is the model and this follows
it deliberately rather than inventing a second shape: an announcement about
what the module is showing RIGHT NOW, fire and forget, replacing whatever
was last said, absent by default, and gating nothing.

##### Why this is a second message and not a field on `filters`

They looked like one thing — two little controls a module offers for the
header — and folding them together would have saved a message type. It is
the wrong shape for three reasons, and the third is the one that would have
bitten.

They are INDEPENDENT. Most modules that can be narrowed cannot clear
anything: a paper cannot delete a paper, a file tree cannot delete a
repository. Some future module will be able to clear and have nothing to
narrow by. One message means every module has to state both facts to state
either.

They CHANGE FOR DIFFERENT REASONS. A filter offer changes when the options
or their counts change; a clear offer changes when what is on screen
becomes empty or non-empty. Folded together, each would re-announce the
other constantly, and the host's own "is this worth a write" comparison
would be comparing two unrelated facts.

And the WITHDRAWAL would become ambiguous, which is the failure. `filters`
withdraws by sending an empty `groups`, whole-replacement being the entire
point of that message. A module that had nothing to narrow by and sent
`{ groups: [] }` would, under one message, have silently withdrawn its
clear control too — with nothing erroring and a button simply gone. That is
exactly the class of silent failure this protocol keeps designing against,
and the cost of avoiding it is one more string in this object.

##### The offer, whole, every time

`label` is the module's own words for what would go, and `null` is how a
module withdraws — there is nothing on screen to clear, so the host takes
the control away rather than leaving a button that deletes nothing. It is
the exact counterpart of an empty `groups`.

#### `MESSAGE.CLEAR`

Host → module. "Clear what you are showing."

The twelfth, and the one message in this protocol that asks a module to
DESTROY something. So it is worth being exact about what it does and does
not say.

##### The host never touches the data and never learns what went

This carries no ids, no filter, no count, and gets no answer. It is a
press, relayed. The module does the deleting, out of its own store, and the
host is not told what was in it — which is the same discipline as
`filterOptionSchema`: the host draws a control and reports that it was
pressed, and the meaning stays where the meaning is.

##### "What you are showing" is the MODULE's determination

Under whatever narrowing is in force — its own filters, this protocol's
filters, a search box in its own page, a scroll position, anything. Only
the module knows what is on screen, and that is the whole reason this is a
message rather than a method with parameters: a host that named what to
delete would be a host deciding what "shown" means for somebody else's
page, and it would get it wrong the first time a module narrowed by
something the protocol has no word for.

The practical consequence is the one that makes the control worth having:
it COMPOSES with the filter beside it. Narrow to one file, press clear, and
one file's worth goes. Nothing in this message says so; it falls out of the
module being the one that answers the question.

##### Not answered, and not correlated

Like `kehikot.event` and for a sharpened version of the same reason. There
is nothing for the host to do with an acknowledgement except display it,
and displaying it would mean the host reporting a number it did not count
about data it cannot see. What a module says afterwards is a new
`kehikot.clearable` — with a smaller count in the label, or `null` because
there is nothing left — which is feedback the module wrote and the host
merely draws.

##### The two-press arm is the HOST's, and it has to be

A host that sends this on a single press has built a button that deletes
somebody's notes because they were aiming at the fold beside it. A host
cannot delegate the guard to the module either: `confirm()` inside a framed
page is silently `false` in any sandbox without `allow-modals`, which is
every sensible one. So the host arms, and this message is sent only by the
second press. Nothing here can enforce that, which is why it is written
down.

#### `MESSAGE.REFRESHABLE`

Module → host. "I can be refreshed, and this is when I last was."

The thirteenth, and the third control a module can put in its own
container's header. It is `clearable`'s shape — an offer, whole, every
time, withdrawable — with one field that is unlike anything else in this
protocol and is the reason the message exists at all.

##### `at` is the MODULE's fact, and a host must never infer it

"Last refreshed" looks like something a host could work out for itself: it
sent `kehikot.refresh` at 10:04, so the data is from 10:04. That is wrong
in every case anybody cares about, and wrong silently:

 - the module answered out of its own cache and the reading is an hour old;
 - the refresh failed and what is on screen is the last good one;
 - the module refreshed itself, on its own, for a reason the host has no
   view of — a project changed under it, somebody pressed something inside
   the page;
 - the host has never asked at all, and the module has been running for a
   day with a reading from when it started.

In all four the host would print a time that is not when the data was read,
beside data that is older than it says. A freshness line that can be wrong
is worse than no freshness line, because the entire reason to draw one is
that a stale list and a short list look identical. So the module says when,
in its own words about its own data, and the host formats what it was told
and nothing else. `null` is a real answer and means "I cannot say" — a host
draws no time rather than inventing one.

##### `busy` is here so that the host's control can be honest for the second
a refresh takes

The module knows whether a read is in flight; the host knows only that it
posted a message into a frame. Two presses racing is two subprocesses and
one answer that wins for no reason anybody could predict, and the cheapest
place to prevent it is the button.

##### What it does NOT carry

No interval. How often to refresh is the person's setting about one
container, the host stores it beside the filter choice, and the host runs
the clock — see `MESSAGE.REFRESH`. A module told the interval would be a
module tempted to run a second timer, and two timers on one list is a
program spending somebody's rate limit twice.

No error, and no result. A refresh that failed is the module's to draw, in
its own page, in its own words, with whatever remedy it can offer. The most
a host can honestly say is when the data is from, which is `at`.

#### `MESSAGE.REFRESH`

Host → module. "Read your material again."

The fourteenth, and `MESSAGE.CLEAR`'s twin in shape: a press, relayed,
carrying nothing and answered by nothing. What comes back is not a reply
but a new `kehikot.refreshable` — `busy: true` while it runs, then a new
`at` — which is the module reporting on its own work in its own words, the
only reporting anybody here is entitled to.

##### One message for two causes, deliberately

A person pressed refresh, or an interval elapsed. The module cannot tell
which and must not need to: what it is being asked to do is identical, and
a flag saying "this one was automatic" would immediately be used to behave
differently — to skip a cache on one and not the other — which is the
module deciding policy from a fact about somebody else's timer.

##### The interval belongs to the host, and it is stored per CONTAINER

"Every five minutes" is a person's setting about one container on one
canvas, in the same family as the filter choice and stored the same way. It
has to outlive the module's next reload, and a module cannot promise that:
its page is loaded once and shown wherever it is asked for, so a module
holding the interval would give every container of it the same one — which
is the exact failure `filters` on the placement schema exists to avoid.

So the host owns the clock. That also puts the timer where the facts are:
only the host knows whether the container is on the canvas somebody is
looking at, whether it is folded, and whether it is pinned — and an
interval that goes on spending a rate limit for a container nobody has open
is the thing this feature is most likely to become.

##### Not sent to a module that has not offered

A host draws this control only for a module that announced
`kehikot.refreshable`, so a press or a tick for a module that never did is
a press on a button that should not exist. The bound on how often it may be
sent is `REFRESH_EVERY_MIN`: a host must not run this faster than the
person asked for, and must not run it at all when nobody asked.

#### `REFRESH_EVERY_MIN`

How often a host may be asked to refresh one container, in MINUTES.

Here rather than in a host for the same reason the height bounds are: the
number is part of what the two sides have agreed, so a module reading this
package knows what a person can do to it, and a second host written against
this protocol does not have to guess.

Both ends are for a specific failure.

**One minute at the fast end**, and not seconds. Every module this exists for
spends something to refresh — a subprocess, a rate limit, somebody else's
API — and a control offering "every 10 seconds" is a control that will be set
to every 10 seconds by somebody who then goes to lunch. A minute is already
far more often than any of these lists actually change; the interesting
settings are five and fifteen.

**A day at the slow end**, because past that the setting is not really an
interval any more: a container refreshed every three days is one nobody is
watching, and the honest answer for that container is the button. The bound
keeps a number that cannot be reasoned about — a year, a random large
integer out of a database somebody hand-edited — out of a timer.

`null` rather than zero is how "not on a clock" is said, wherever this is
stored. Zero would be an interval of no length, which a program will one day
divide by or loop on.

### `src/facets.ts`

#### About `src/facets.ts`

The ref-facet vocabulary: one way for every module to say what a reference
IS, so that one filter reads the same in every container that offers it.

##### Why this is in the protocol package, and why on a subpath

References narrowed by kind and by state in a vocabulary of its own, and the
next module that wanted the same filter — Journeys — would have copied it,
and the two copies would have drifted the first time either learned a word.
The same choice has to mean the same thing in both containers, which is a
thing two modules agree on, which is what this package is for.

It is not a shape, though. It is a handful of pure functions, and the main
entry is "shapes only — no I/O, no state, no decisions". So it lives at
`kehikot-module-protocol/facets`, apart from the wire, and a host never
imports it: the host still draws options it does not understand. Only the
modules that build the offer and apply the choice need to agree on what the
ids mean, and this is where they agree.

##### Facets are data

A facet is an id and a word. Adding one — `draft`, `unassigned` — is an entry
in `FACETS` and a line in `facetsOf`, not a change in every module.

#### `FACETS`

Every facet, and the words for it in a menu called "hide".

Kind × state first, because "hide closed MRs/PRs, keep closed issues" is the
combination that made this file: a closed issue is usually finished work and
a closed change is usually abandoned, and the two must be separately
hideable. Then why a closed ref closed, from a person's mark or the
tracker's reason — see `dispositionOf`.

#### `deriveDisposition`

Why a closed reference closed, as far as the tracker says, or null.

A DEFAULT, never a mark: a module showing it says it came from the tracker.
A merged change is done. GitHub's reason maps one-to-one where it has one;
a GitLab issue closed with a merged change under it is done. Everything else
closed has no reason anybody can read, and returns null — "closed, reason
unknown", which is a state a person is asked to settle, not one to guess.

#### `dispositionOf`

Put a person's mark and the tracker's reason together, the mark winning.

`marks` is `context.dispositions`, whole; this finds the ref's own row. A
closed ref with neither is `unknown` with no source — the case a module
should flag for somebody to decide rather than count either way.

#### `hiddenIn`

The facets switched on under one toggles group, from `context.filters`.

Anything that is not a list — nothing chosen, or a string left over from a
host or a version that had no toggles — is the resting state, which is
nothing hidden. Ids this vocabulary does not know are dropped, for the
reason a module drops any choice it does not recognise.

#### `sift`

Keep the rows none of whose facets are hidden.

`facetsOfRow` is the module's own: it knows how to read a sighting off its
rows and where its marks are. A row that cannot be read — no sighting at all
— has no facets and is never hidden, because a filter that hides what it
cannot see is a filter that loses things silently.
