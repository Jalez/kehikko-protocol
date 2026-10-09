# The protocol number, and the rename from "roadmap"

Why `PROTOCOL` is 2 and what would raise it, and how both spellings of every name (`kehikot.` and `roadmap.`) are read and written.

> **Deprecated in 0.37, removed in the next breaking release.** The second spelling — `roadmap.` message types, `roadmap.module`, `/.well-known/roadmap-module.json`, and everything in `dialect.ts` except `canonicalModuleId` — goes. The next breaking release reads and writes `kehikot.` only; `canonicalModuleId` stays for an id written to disk before the rename. `PROTOCOL` does not change for it: no `kehikot.` message changes meaning.

This is the reasoning, not the reference: the shapes themselves, with their bounds, are in the source and show on hover. The first half is the overview that used to be in the README; the second half is the note that used to stand above each symbol in the source, under that symbol's name.

Back to the [index](README.md).

## Overview

### Why the protocol number is 2, and why the new method is not the reason

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

## Notes by symbol

### `src/constants.ts`

#### `PROTOCOL`

The protocol both sides speak.

An integer, not a semver string, and deliberately so: a module has to state
which it speaks BEFORE anything is framed, and a comparison that can be got
wrong is a comparison that will be. When this becomes 2, a module still
saying `>=1 <2` is not broken — it is incompatible, which is a different
sentence and earns a different one on screen.

##### Why it is 2, and why the new capability is not what raised it

The rule has not moved: a number that goes up for ADDITIONS is a number
nobody can act on. Every module in the world becomes incompatible on the day
the host learns a new word, and the honest reading of that refusal is
"nothing is wrong". Raise it only when an existing message changes meaning or
an existing field changes shape.

By that rule, none of these earned a bump, and it is worth listing them so
the reasoning stays visible the next time somebody adds something:

- The greeting no longer carries a list of permissions, because there are no
  permissions. A module that reads that field finds nothing there and greys
  out nothing, which is a module showing MORE of itself than before.
- `kehikot.goto` and `kehikot.went` are message types both halves already
  ignore when unrecognised — they have to, since a window receives every
  `postMessage` sent to it — so sending one to a module that never heard of
  it produces silence, which is what it produced yesterday.
- `view.goto` is a new METHOD. A host that does not have it answers
  `unknown-method`, which is the refusal that already exists and the one a
  caller is already told to expect. A module built against a host without it
  loses a feature and keeps a page.
- `passage` is a new CONTEXT FIELD, and `passage.set` a new method for
  filling it. It defaults to `null`, which is exactly what a module reading
  it against an older host would have found there anyway: "nobody is pointing
  at anything". A module that never reads it is untouched, and a module that
  does reads a real state rather than an absence. Nothing that already had a
  shape changed shape.
- `kehikot.filters` is a new MESSAGE and `context.filters` a new context
  field, and both pass the same test. A module message a host has never heard
  of is dropped, which is what any unrecognised message has always produced,
  and the module is left drawing its own control exactly as it did — it loses
  a place to put the control, not the control. The context field defaults to
  `{}`, which is precisely what a module reading it against an older host
  would have found: nothing has been chosen for it, because nothing there can
  choose. Nothing gets a second meaning and nothing changes shape.
- `kehikot.clearable` and `kehikot.clear` are two new MESSAGES, one in each
  direction, and they pass the same test from both ends. A host that has
  never heard of `clearable` drops it and draws no control, which is what
  every module's header looked like the day before — the module loses a place
  to put a control, not the ability to clear anything, since a module that
  wants a button in its own page has always been free to draw one. A module
  that has never heard of `clear` drops it, and a host whose press produced
  nothing is a host that never had the control to press, because it only
  draws one for a module that announced itself. There is no version of this
  where one side acts on a half-understanding of the other.

- `containers` is a new CONTEXT FIELD and `showing.set` a new method for
  filling part of it, and they pass the test from both ends. The field
  defaults to `[]`, which is what a module reading it against an older host
  would have found: that host has told it nothing about which containers
  are on the kehikko or what they show, and a consumer that narrows to what
  is picked out has nothing to narrow to and shows everything — which is
  what it showed yesterday. The method is answered `unknown-method` by an
  older host, exactly as `passage.set` was, and a module that asked loses a
  way to say what it shows and keeps its page. Going the other way, a module
  built against an older copy of this package parses the context with a
  schema that has no such field, and a `z.object` strips what it does not
  name — so the field never reaches the module at all, and the module is
  byte-for-byte the module it was. Nothing that already had a shape changed
  shape.

  It is worth saying out loud that a DESTRUCTIVE addition does not earn a
  bump either, tempting as it is to raise the number to mark the occasion. A
  version is not a warning label. It says whether two programs can speak, and
  these two can speak to every host and module that already existed.

What did raise it is a rename. **Epics are not journeys**: an epic belongs to
a project and is the host's own material; a journey is a different idea
living in a module app of its own. The context field naming what is open, the
methods that read it, the mode scope, the capability names and the slug
pattern all said "journey" and all meant "epic". That is an existing field
changing shape and existing methods changing name — the exact condition this
number is for — so it goes to 2, and a module built against 1 is
INCOMPATIBLE rather than degraded, which is the true sentence: it would ask
for `journey.get`, be refused, and read a context field that is no longer
there.

There are no aliases for the old spellings, deliberately. A shim would let a
module keep the conflation working, and the conflation is the thing being
removed.

#### A note in `src/constants.ts`

##### And why the rename did not raise it either

Every name on the wire changed spelling — `roadmap.hello` became
`kehikot.hello`, `roadmap.module` became `kehikot.module`, the well-known
path, the extension names and the module ids with them — when the app that
was once called "roadmap" became Kehikot. That LOOKS like the condition above:
existing messages changing name. It is not, because nothing changed meaning
and nothing was taken away. Both spellings are read everywhere, and the old
one is still written to anybody known to speak only it — see `dialect.ts`.
A module built against the old names keeps working against a new host, and a
module built against the new ones keeps working against an old host. Two
programs that could speak yesterday can speak today, which is the only thing
this number is for, so it stays where it is.

The essay above says there are no aliases for the epic/journey rename, and
that is not contradicted here. That rename removed a confusion and an alias
would have kept it alive. This one removes a NAME, and the alias keeps
nothing alive but the modules that have not been updated yet.

### `src/dialect.ts`

#### About `src/dialect.ts`

The two spellings of one protocol, and the only place that knows there are two.

##### Why there are two

This protocol was first written for an app called "roadmap", and every name
it put on the wire said so: `roadmap.hello`, `roadmap.module`,
`/.well-known/roadmap-module.json`, `roadmap.notifications@1`, and module ids
like `roadmap.journeys`. The app is called Kehikot now and the names say
`kehikot.` — but a module is a program somebody runs from their own
checkout, pinned to whatever copy of this package it last installed, and it
does not change on the day the host does. A host that only spoke the new
names would greet every one of those modules in a language it cannot hear,
and the failure would be silence: no error, an empty container, a "did not
answer" sentence about a program that is running fine.

So for at least one version, BOTH spellings are read, everywhere, and the
old one is written only to a party known to need it.

##### The rules, which are the whole design

 1. **One canonical name.** Inside a host and inside a module, everything is
    the `kehikot.` spelling. Every schema in this package that reads a
    message type, a module id or an extension name accepts either spelling
    and hands back the canonical one, so code downstream of a parse never
    compares against two strings.
 2. **Receive both.** `looksLikeWireMessage` lets either prefix through, and
    every schema accepts either type.
 3. **Send in the other side's dialect.** A host knows which dialect a module
    speaks before it says a word to it: the manifest's `kind` says, because a
    module built against an older copy of this package serves
    `roadmap.module`. A host greets such a module with `roadmap.hello` (see
    `toDialect`), and the module's own old client answers in kind. A module
    built against this copy answers in whatever dialect it was GREETED in —
    `connect()` remembers the greeting's prefix — so it is understood by an
    old host and a new one alike.
 4. **Translate at the edge and nowhere else.** `toDialect` is applied at
    the moment a message is posted and `canonical*` at the moment one is
    parsed. Nothing in between knows a second spelling exists.

##### Why the protocol number did not move

See the essay on `PROTOCOL` in `constants.ts`: a module built against the
old names keeps working against a new host, and a new module keeps working
against an old host (it answers in the dialect it was greeted in, and can
serve its manifest at the old path too — see `legacyManifest`). Nothing that
already had a meaning lost it, which is the test.

#### `Dialect`

Which spelling one side speaks.

`kehikot` is this package. `roadmap` is every copy of it from before the
rename, which is still what an unchanged module or an older host speaks.

#### `canonicalModuleId`

A module's one id, whichever spelling it arrived in.

`roadmap.journeys` and `kehikot.journeys` are the SAME module — the one
named before the rename and after it — and a host keys everything it keeps
about a module by this. A registration file, a manifest, a placement in an
old database and an MCP call naming the old id all land on one row.

#### `toDialect`

One message, respelled for a receiver that speaks `dialect`.

Applied by a sender at the moment it posts, so everything before that moment
is canonical. For the `kehikot` dialect it respells nothing old into new
except what was already canonical — a no-op on anything this package built.

What it touches, and why each is here: the `type`; the module ids a message
carries (`ready.id`, `event.from`, `context.containers[].module`, in a
`hello` and in a `context`) because an unchanged module compares them with
its own `roadmap.` id; and the extension names (`event.extension`, and
`params.extension` on an `events.emit` request) because an unchanged party
looks them up by the old spelling. Nothing else on the wire is a dotted name.

Pure: the message is copied, never edited.
