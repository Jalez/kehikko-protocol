# Content changes

How a container is told that the material it shows has changed, and how a module reports a change of its own.

This is the reasoning, not the reference: the shapes themselves, with their bounds, are in the source and show on hover. The first half is the overview that used to be in the README; the second half is the note that used to stand above each symbol in the source, under that symbol's name.

Back to the [index](README.md).

## Overview

### When what a container shows has changed

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

## Notes by symbol

### `src/content.ts`

#### About `src/content.ts`

Content: the material a container shows for an epic changed.

A step gains a ref, a journey is edited, an epic's text is rewritten — by a
person in a page, by an agent through a module's MCP door, or by somebody
editing the project's files. Before this, every open container kept what it
loaded when the epic was opened, and the only way to see the change was to
reload the window.

##### The signal travels, the material does not

The same split as `trackerSignalSchema`: the context says THAT something
changed, whose it was and for which epic, and the module re-reads the
material through the door it already reads it by — `steps.list`, `epic.get`,
its own server. Nothing here carries a journey or an epic's text.

##### Why a list and not the latest change

Context is broadcast whole, and a host may fold two changes into one
broadcast. A single "latest change" would then lose the first of them — an
epic edit hidden behind the journey edit that followed it — and the module
showing epics would never hear. So the host keeps the last instant per
`(source, epic)` and sends them all, and a module compares only the entries
for what it shows. `contentStamp` does that comparison.

#### `CONTENT_HOST`

Whose material changed, when it is the host's own: the epics it keeps, which
is what `epics.list`, `epic.get` and `steps.list` answer from. Every other
source is a module id, and a module id always has a dot in it by convention,
so the two do not meet.

#### `contentChangeSchema`

One source's last change for one epic.

`source` is `CONTENT_HOST` or the id of the module whose material it is —
the module that keeps it, not the one that happened to notice. `epic` is the
epic it changed for, or null when the host cannot tell: an outside edit to a
file holding every epic's journeys says which module's folder moved and
nothing finer. A reader takes null as "any epic of this source".

#### `contentSignalSchema`

What travels in the context: the last change per `(source, epic)` for the
open project, newest kept when there are more than `LIMITS.CONTENT`.

`[]` is the honest default — nothing has changed since the host began
keeping count — and is also what a host that has never heard of content
changes says. An entry dropped for the bound, or a host starting again with
an empty list, moves a module's stamp and costs it one re-read it did not
need; it never costs it a change.

#### `contentStamp`

A string that moves when, and only when, material this container shows has
changed: compare it with the one from the last context and re-read on a
difference. In React it is an effect dependency.

`sources` are whose material the container shows — a page drawing an epic's
steps under a journey names `[CONTENT_HOST, 'kehikot.journeys']` — and
`epic` is the one it has open, or null for a container that shows every
epic's. An entry with `epic: null` counts for any epic.

Re-read the one epic, keep the reader's scroll, selection and whatever they
had folded open, and let a burst land as one read: the stamp is the same
string however many broadcasts carried it.
