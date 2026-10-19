# The protocol number

Why `PROTOCOL` is 2 and what would raise it.


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

- `kehikot.header`, `kehikot.press` and `kehikot.pressed` (1.1.0) are three new
  MESSAGES and pass the test the same way `clearable` and `clear` did. A
  module that has never heard of `press` drops it, and a host only sends one
  for an item that module declared. A host that has never heard of `header`
  has no menus to draw it in. One thing is worth admitting: the host built on
  1.0.0 does not DROP a module message it cannot parse, it reports it on the
  container, so a module that declares a header there shows a fault line. The
  two programs can still speak, which is all this number says; the order of
  release (host first) and the rule that makes the order unnecessary next
  time are in [the header](header.md).
- `view.fold` is a new METHOD, answered `unknown-method` by an older host;
  `folded` on a container and `subjects` under a manifest's `mcp` are new
  FIELDS with defaults, stripped by a schema that does not name them.

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
