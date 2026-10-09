# Parts of an epic, focus, and the record of an epic's steps

The parts an epic is divided into, what it means for some of them to be picked out, the one rule for whether a thing is in focus, the files a part owns, and the on-disk record of an epic's steps that parts are read from.

This is the reasoning, not the reference: the shapes themselves, with their bounds, are in the source and show on hover. The first half is the overview that used to be in the README; the second half is the note that used to stand above each symbol in the source, under that symbol's name.

Back to the [index](README.md).

## Overview

### The parts of an epic, and focusing on some of them

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

#### The files a part owns (0.32.0)

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

#### Every module's data is part-specific, or the module says why not (0.34.0)

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
`kehikot-check-parts`, from a module: `bun node_modules/kehikot-module-protocol/bin/check-parts.ts .`)
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

### An epic's steps are kept once, and this is the shape they are kept in

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

## Notes by symbol

### `src/parts.ts`

#### `PART_ID`

The parts of the open epic, and which of them a person has picked out.

##### What this is for

An epic grows. Forty steps and thirty references under one title is a thing
somebody still wants to call one piece of work, and cannot look at all at
once. So an epic may be divided into PARTS — "the posting seam", "what the
tests check" — and a person may point the whole workspace at one of them, or
at several, and still be able to see that the rest is there.

The first design for this was an epic inside an epic, and it was refused.
Nesting makes every question the wire already answers ask "at which level":
which epic is open, which epic a ref was picked out of, which epic a module's
own material is filed under. A part is not a smaller epic. It is a heading
and the things under it, ONE level deep, and the open epic is still the open
epic.

##### Every part is listed, and the picked ones are flagged

The shape is `containers`' shape, on purpose, because the argument is the
same one. A host could send only the parts that are picked out — "narrow to
these" — and a module handed that could narrow and could never say what it
had hidden. "3 items outside the picked parts" is a sentence a module has to
be able to print, because a pane that is shorter than it was for a reason
nobody can see is the failure this whole field is arranged against; and it
cannot count what it was not told exists. So the list is the epic's whole
list of parts, in the epic's order, each with its `refs`, and `picked` says
which ones the person means.

**None picked means the whole epic.** Not "nothing is in front of you" — the
opposite. That is the resting state, it is what a host that has never heard
of parts says by sending `[]`, and it is why a module that never reads this
field is exactly as correct as it was: it shows the whole epic, which is
what a module shown no narrowing should show.

##### What `refs` holds, and whose word it is

The references a host can say belong to the part: the ones the epic lists
under that heading, and the ones carried by steps that were ASSIGNED to it.
It is the host's reading of the epic it holds, which is the only reading a
host can vouch for — a module with a store of its own may hold steps the
host has never seen, and it decides about those itself; see `partInFocus`.

Refs and nothing else, for the reason `selection` carries refs and nothing
else: they are the one name for a thing that two modules which have never
heard of each other both already use.

##### A step says which part it is in. It is not worked out from its refs.

A step may carry `part: <id>`, and that is the whole of how a step comes to
be in a part. A step that names `gh#12` is NOT thereby in the part that
lists `gh#12`: a step often names a reference it merely depends on, and a
rule that filed it under that reference's heading would move steps between
parts whenever somebody edited a sentence. A step with no `part` belongs to
the epic as a whole.

So there are two questions and two functions, and a module asks the one that
matches what it is holding: `refInFocus` for a thing that IS a reference (a
row in a list of issues, a checklist held against a pull request), and
`partInFocus` for a thing that was assigned to a part (a step).

##### The id, and why it is not the heading

A heading is prose somebody will reword. If it were the name, rewording it
would silently unassign every step filed under it and drop a stored focus,
and nothing would say so. So a part has an `id` in the same class of
characters as an epic's slug, which is what a step's `part` holds and what a
host stores for the focus, and the heading is free to change.

Where the id comes from used to be called the host's business, and this
package said only what an id looks like once it is on the wire. That stopped
being enough the day a second program had to name a part: the module that
edits steps writes a part's id into a step, the host compares it, and two
derivations of an id from a heading are a step that is in a part on one
screen and in none on the other. So the derivation is in this package too —
`partIdsOf` and `partsOf` in `journey.ts`, over the record the parts are
read from: an id written beside the heading is used, and one that is not is
derived from the heading.

##### The files a part owns, and what their names are relative to

References are not the only thing an epic has. An epic written as a paper
is a folder with a `main.tex` that pulls other files in, and a module that
shows a document — the paper itself, the notes on it, the questions about
it — could not narrow to a part while a part knew only references. So a
part may name the files of the paper that are its own: `files`.

Each is a path RELATIVE TO THE PAPER'S FOLDER, which is
`<project>/.kehikot/paper/<epic>/` — the folder `main.tex` is in. So
`parts/posting-seam.tex` is `<project>/.kehikot/paper/<epic>/parts/posting-seam.tex`.
That one, out of three that were possible:

- **Absolute** is what a `passage.path` is, and would compare with one by
  `===`. But this string is written into a record that is committed and
  cloned, and an absolute path in a repository is one person's home
  directory in everybody's checkout.
- **Relative to the project** survives a clone, and repeats
  `.kehikot/paper/<epic>/` in every entry: a fact the record already holds
  (its slug) written again by hand, free to disagree with it, and free to
  name a file of ANOTHER epic's paper or no paper's at all.
- **Relative to the paper's folder** is the name the Paper module already
  has for a file — the keys of its file list, of its hashes and of its
  page map are exactly these — and the name a person reads in
  `\input{parts/posting-seam}`, plus the extension. It cannot name
  anything outside the paper, because there is nothing in it to say so.

It is the file's name AS IT IS ON DISK, extension included. TeX lets
`\input{parts/a}` mean `parts/a.tex`; this does not, because guessing an
extension is a second derivation and the Paper module's file list has
already made the first.

##### One function compares, and it is `paperFileOf`

A module does not hold that relative name. It holds what `passage.path`
carries: an absolute path, on this machine. Turning one into the other is
the step two modules would do two ways — one stripping `projectPath` (which
a host spells as it was typed and Paper spells resolved, so the prefix
differs under a symlink), one matching a suffix (which finds
`chapters/intro.tex` in the wrong epic's paper). So it is done here, once:
`paperFileOf(path, epic)` answers the paper-relative name a path has, or
null, and every other function here calls it. Nobody else should.

##### Text that is in no part's file

Whatever is written directly in `main.tex`, and every file no part names,
belongs to the epic as a whole — and so, like a step with no `part` and a
reference no part lists, it is in no PICKED part: outside the focus, and
counted. Naming `main.tex` in a part is allowed and means what it says.

#### `PAPER_MODULE`

The module whose folder a paper is kept in.

Spelled here for the reason `JOURNEYS_MODULE` is spelled in `journey.ts`:
`paperFileOf` has to recognise that folder in a path, and a second spelling
of `'kehikot.paper'` would be the day the two disagreed.
`moduleDir(projectPath, PAPER_MODULE)` is where a project's papers are, one
folder per epic, named by its slug.

#### `partFile`

One of a part's files, in the form it is stored and sent in — or null.

The form: relative to the paper's folder; `/` between segments and never
`\`; no segment empty, `.` or `..`; not absolute in either platform's
spelling (`/x`, `C:x`); no control character; at most `LIMITS.PART_FILE`
characters; Unicode in NFC, because one filesystem hands names back
decomposed and two spellings of `ä` are two strings.

What is tidied rather than refused is only what cannot change which file is
meant: space around the name, a leading `./`, and the normal form. Anything
else is null. `..` is not resolved — `a/../b` is refused, not read as `b` —
because this package opens nothing and cannot know that `a` is not a link.

Why so strict for a name nobody opens HERE: a module on the other end will
join this onto a folder and read it. That module has its own fence and must
keep it; this is the second one, and it means a string that reached a
module through `context.parts` was never a way out of the paper.

#### `paperFileOf`

The paper-relative name of a file a caller is holding — or null when it is
not a file of the paper. THE comparison; see the essay at the top.

`path` is either of the two things a module has:

- **An absolute path**, as `passage.path` carries. It is a file of the
  paper exactly when it has `/.kehikot/paper/<epic>/` in it, and its name is
  what follows the first such segment. The segment is looked for IN the
  path, and the path is not measured against `context.projectPath`, on
  purpose: the Paper module publishes a path it has resolved, a host sends
  the project as somebody typed it, and under one symlink those two do not
  share a prefix. Backslashes are read as slashes, so a path from the other
  platform is read too.
- **A relative path**, which is taken to be relative to the paper's folder
  already — what the Paper module holds for its own files. It is the
  caller's word that it is; a module that has an absolute path should pass
  that and not trim it itself.

`epic` is the open epic, `context.epic`. Pass it. Without it an absolute
path under ANY epic's paper folder is read, and `parts/intro.tex` of another
epic's paper is then indistinguishable from this one's — which is right
only for a caller that already knows every path it holds is the open
epic's. Something that is not a slug is no epic, and the answer is null.

Names are compared as written, case and all. A filesystem that folds case
is the machine's own business and this package opens nothing; write the
name the way the folder spells it.

What this cannot see: a paper folder that is itself a symlink to somewhere
else. The Paper module resolves it, publishes the far path, and that path
has no `.kehikot/paper/<epic>/` in it — so it is no part's file here, and
is counted outside a focus rather than guessed into one.

#### `partSchema.files`

The files of the epic's paper this part owns, each relative to the paper's
folder and in `partFile`'s form exactly.

OPTIONAL, and absent means none — the one field here that is not defaulted
to empty. A part parsed before 0.32.0 is `{ id, heading, refs, picked }`
exactly, and hosts and modules hold that shape in their own tests and
comparisons; a key that appeared on every part from a host that never
sent it would be a change to all of them for a fact about none. So a part
from an older host, and a part that owns no file, have no `files`, and
the functions below read both as owning none. Read it yourself as
`part.files ?? []`, or not at all: `fileInFocus`, `pickedFiles` and
`partsOfFile` are the three questions there are.

An entry that is not in the form is REFUSED, like an `id` that is not a
`PART_ID`, and for a reason of its own: a module will join this onto a
folder. A host composes the list with `partsOf`, which only produces the
form.

#### `partsSchema`

`context.parts`, as a schema of its own so a host can check the list before
it composes a context around it. Two parts sharing an id is not refused
here: this rides in a context, and one doubtful field must not cost every
module on the canvas its greeting. The functions below read the first.

#### `refInFocus`

Whether a REFERENCE is in front of the person.

True when nothing is picked out — the whole epic is in front of them — and
otherwise true exactly when a picked part lists it. A reference no part
lists is outside every focus, and is one of the "N outside the picked
parts" a module should count rather than drop.

#### `partInFocus`

Whether a thing ASSIGNED to a part — a step carrying `part` — is in front of
the person.

True when nothing is picked out. Otherwise true exactly when the part it
names is picked. Something with no part belongs to the epic as a whole and
is therefore not in any PICKED part: it is outside the focus, and counted.
So is something naming a part the epic no longer has — an assignment to
nothing is not an assignment, and guessing which part was meant would be
the inference this field exists to avoid.

#### `pickedFiles`

The files the picked parts own, once each, in the parts' order — the list a
module showing the paper draws under a focus.

`[]` when nothing is picked, which is NOT "show no files": ask `isFocused`
first, as with `pickedParts`. `[]` while focused is real, and means the
picked parts own no file — everything the paper has is outside them.

#### `fileInFocus`

Whether a FILE of the epic's paper is in front of the person.

The same rule as its two siblings. True when nothing is picked out.
Otherwise true exactly when a picked part owns the file. A file no part
names — `main.tex`, usually, and whatever is written directly in it — is
outside every focus and is counted, not dropped; so is a path that is not a
file of this epic's paper at all.

`file` is whatever the caller holds, an absolute `passage.path` or a name
relative to the paper's folder, and `epic` is `context.epic`: both are
`paperFileOf`'s, which does the comparing. For "N files outside the picked
parts", hand this to `focusCount`:
`focusCount(parts, files, (file) => fileInFocus(parts, file, epic))`.

#### `focusCount`

The sentence's two numbers: how many of these are in front of the person,
and how many are outside the picked parts.

Offered so that three modules do not count three ways. `inFocus` is the
module's own answer per item — `refInFocus`, `partInFocus` or `fileInFocus` — and
`outside` is zero whenever nothing is picked, which is the cue to say
nothing at all.

#### A note in `src/parts.ts`

##### One anchor, one rule (0.34.0)

The three functions above are the three questions there are, and for a
while each module picked one and wrote the rest itself: the filter, the
count, the sentence, the comparison that keeps a re-sent context from
redrawing. Four modules did, four ways, and the others showed the whole
epic whatever was ticked — which is correct by the letter of this file and
not what a person ticking a part meant.

So the requirement is said once, here, and it is about DATA: **every item a
module holds is anchored to a part by a file, a ref or a part id — or the
module says why it has none.** An `Anchor` is that statement for one item,
`anchorInFocus` is the one rule over it, and a module contributes only
`anchorOf(item)`. The declaration is in the manifest: `reacts: ['parts']`,
or `partless` with the reason. See `partsDeclaration` in `manifest.ts`.

#### `Anchor`

What ties one item of a module's data to a part of the epic.

Told apart by its one key, which is also the name of the function that
answers for it:

- `{ file }` — a file of the epic's paper, absolute or relative to the
  paper's folder: a note, a question, a slide's citation. `fileInFocus`.
- `{ ref }` — a reference: a row in a list of issues, a checklist held
  against a pull request. `refInFocus`.
- `{ part }` — a part's id, for a thing that was ASSIGNED to one: a step.
  `partInFocus`. Null is "assigned to none".

#### `anchorInFocus`

Whether an anchored thing is in front of the person. THE rule.

True when nothing is picked out. Otherwise true exactly when one of its
anchors is in a picked part, each asked of the function above that owns the
question. Something with no anchor is in no PICKED part: outside the focus,
and counted — the same answer as a step with no `part`, a ref no part lists
and a file no part names.

`epic` is `context.epic`, for `fileInFocus`. Pass it.

#### `narrowToFocus`

A list, narrowed to the picked parts: the items in front, and how many are
not.

`anchorOf` is the whole of what a module writes. Everything optional is in
`options`, under the names `useFocus().narrow` uses: `epic` is
`context.epic`, for a `{ file }` anchor — pass it. `keep` is for the one thing
a tick in another control must never do, which is take away what somebody's
hands are in — the note being written, the question on screen. An item it
answers true for is drawn though it is outside, and is still COUNTED
outside, because it is; `kept` says how many, so the page can say why they
are there.

#### `focusSentence`

The sentence every module says while parts are picked: how many of its
items are outside them, and which parts.

    3 questions outside the picked part (The posting seam).
    1 note outside the 2 picked parts (The posting seam, What the tests check).

`''` when nothing is picked, which is the cue to draw nothing. `0 … outside`
IS said: a focus that hides nothing today is still a focus, and it is how a
person sees that this pane is following their ticks.

With `{ total }` (0.34.1) it says how many of how many:

    2 of 3 references are outside the picked part (The posting seam).
    1 of 3 references is outside the picked part (The posting seam).

The noun is counted by the total and the verb by the number outside. It is
for a module that marks what is outside rather than removing it: every item
is still on screen, so the total is a number the reader can check. A
qualifier is the module's own and rides in the noun —
`['reference shown here', 'references shown here']`. `useFocus().narrow`
takes `total: true` and passes the length of the list it was given.

The wording is the Checklist module's, which is the References module's
(`14 outside the picked part · The posting seam`) with the noun in it and a
full stop — a sentence that can stand alone in a pane. `noun` is what the
module calls one item; give `[one, many]` where adding an `s` is wrong.

### `src/journey.ts`

#### About `src/journey.ts`

An epic's steps and groups, as a project keeps them — and whose they are.

##### The decision this file records

Every epic used to exist twice in a project. A host kept a file per epic,
`.kehikot/kehikko/epics/<slug>.json`, and answered `epics.list`, `epic.get`,
`steps.list`, `context.parts` and the tracker scope out of it. The Journeys
module kept `.kehikot/journeys/journeys.json`, and that is where a step was
actually edited. Nothing kept the two in step, and in one real project they
had already come apart: nine steps in the host's copy and twelve in
Journeys'. A module that re-asked the host after Journeys changed a step was
answered out of the stale one, correctly, with nothing to indicate it.

So the owner decided, and this is the decision rather than a reading of it:

- **Journeys owns the steps, the groups (which a host reads as an epic's
  parts) and the prose around them.**
- **A host owns the epic's slug, its title, and whether it exists.**
- A host reads the steps and the groups from Journeys' file on disk, and
  falls back to what it holds itself when the project has no record under
  that slug — which includes a project where Journeys was never installed.

##### Why the shape is here, and not in either of them

A host reading another program's file is a host parsing a private format,
and the day that program reorganised its file the host would go on reading
the old shape, find nothing, and fall back to its own copy without a word.
That is the failure above with one more step in it. The alternative to a
private format is a shared one, and this package is where the two programs
already agree on things: so the shape of the record is written here, once,
and both the writer and the reader import it.

`ids.ts` used to say this package "deliberately says nothing" about a
journey — "not its name, not its shape, not its bounds" — and for the wire
that is still exactly true: no message names a journey, and `context` still
names an epic and a project and nothing a module told the host. What changed
is narrower. One module's record of an epic's steps is now something a host
reads off the disk, and two programs reading one file have to spell it the
same way.

##### What is modelled, and what is only carried

Only what a host has to read to answer the questions it already answers:
the slug, the title, the lede and the project a list is drawn from; the
steps; the groups; where the steps come from when they are not here; and
the three lists a host counts for an epic's size. Everything else Journeys
keeps in a record — the callout, what blocks what, the quizzes that are the
Learning module's — is Journeys' own, and this package has no opinion about
it.

**But nothing is dropped.** Every object below is `.passthrough()`: a field
this version has never heard of comes out of a parse exactly as it went in.
That is not politeness. A writer newer than this reader will add fields, and
a reader that stripped them would hand a host an `epic.get` with part of
somebody's document missing — and a WRITER that parsed with a stripping
schema before saving would delete them from the file. `part` and a group's
`id` are the standing example: a store that parsed a step as `{ title,
body, refs, notes }` and wrote the result back would unassign every step in
the project on the first save.

##### Nothing here is bounded, and that is deliberate

Everything else in this package bounds every string, because everything
else in this package crosses a wire from a stranger. This is a document a
person wrote, in their own repository, and a reader that refused a record
because one step's title ran past a number would be a host declining to
show somebody their own work. The bounds bite where something is put ON the
wire — `partsSchema`, `LIMITS.PART_REFS` — and on the writer's own door.

##### Still shapes, and still no I/O

Nothing in this file opens anything. `journeyIn` is handed a parsed
document. The few lines that read the file are behind `/serve`, with the
rest of what touches the machine; see `serve/journeys.ts`.

#### `JOURNEYS_MODULE`

The module that keeps the record, and the file it keeps it in.

Spelled here because a reader has to name both, and a host that spelled
`'kehikot.journeys'` itself would be the second place it was written.
`moduleFile(projectPath, JOURNEYS_MODULE, JOURNEYS_FILE)` is the path:
`<project>/.kehikot/journeys/journeys.json`.

#### `journeyStepSchema`

One step.

`part` is the id of the part the step was ASSIGNED to, and it is optional —
see `parts.ts` for why a step says which part it is in rather than having
it worked out from its refs. It is a plain string here and not a `PART_ID`,
on purpose: one hand-edited step with a stray capital in its `part` must
not make the whole record unreadable. `stepPart` is how it is read, and
anything that is not an id is no assignment.

#### `journeyGroupSchema`

One group: a heading and the references under it. A host reads it as a PART
of the epic.

`id` is what a step's `part` and a stored focus name, so that the heading is
free to be reworded. Optional, because every group written before parts has
none and a host derives one from the heading; see `parts.ts`. A plain string
for the reason `part` is one.

`files` is the files of the epic's paper this part owns, each named RELATIVE
TO THE PAPER'S FOLDER, `<project>/.kehikot/paper/<slug>/`, with forward
slashes and its extension: `parts/posting-seam.tex`. See `partFile` in
`parts.ts` for the form and for why it is that one. Optional and not
defaulted, so a writer that parses a record and saves it does not write an
empty list onto every group that never had one. Plain strings here, for the
reason `id` is one: a name somebody mistyped costs that name, in `partsOf`,
and not the record.

#### `stepsFromSchema`

Where an epic's steps are, when they are not in the record.

Some epics are written as a paper, and their steps are the paper's sections,
projected out of LaTeX by a program that can read it. The record for one of
those carries `"steps": []`, and that array does not mean there are none.
See `stepsOf`, which is the only honest way to read it.

#### `journeyRecordSchema`

The record for one epic.

`slug` is the epic's slug and nothing else: the host's `epic` and this
`slug` are one name for one thing, which is why it is `EPIC_SLUG` and not a
pattern of this file's own.

#### `journeysDocumentSchema`

The whole file: every record in one project, keyed by slug.

This is what a WRITER checks before it saves. A reader does not use it —
see `journeyIn` — because a reader asked about one epic must not be refused
over a different one.

`version` is read loosely: a document from a later version is opened rather
than refused, because every field this version knows is still where it was
and refusing would leave somebody unable to read their own work with the
older program they happen to be running.

#### `journeyIn`

The record for one epic out of a parsed document, or null.

##### Null is "nothing here to read", and it never throws

Null for a document that is not one — `null`, a string, an array, an object
with no `journeys` — for a slug that is not a slug, for a slug the document
has no record under, and for a record that will not parse. A caller that
gets null falls back to whatever it holds itself, and that is the same
action in every one of those cases, which is why they are one answer.

##### One record at a time

The document is not parsed whole. A reader asked about `the-posting-seam`
looks at that one record, so a different epic with a step somebody left
without a title costs that epic its record and no other. The module that
owns the file may well refuse all of it and say so on its own page — it is
about to write the file back, and must not write over what it could not
read. A reader writes nothing and has no such reason.

##### It asks the object, never its prototype

`journeys` is keyed by a string somebody chose, and the pattern is no
protection: `constructor` is eleven lowercase letters and matches
`EPIC_SLUG`. So the lookup is `Object.hasOwn` and nothing else; see the
essay on `MODULE_ID`.

##### The key is the name

A record filed under one slug and calling itself another is not handed over
under either. Two names for one record is exactly the disagreement this file
exists to end, and guessing which was meant would bring it back.

#### `JourneySteps`

What a record can honestly say about its steps.

Three answers and not two, and the middle one is why this is a function
rather than `record.steps`:

- `stored` — the steps are here, and they are the steps. `alsoProjected` is
  set when something else projects a different set from a paper beside
  them; the stored ones are still real and still the answer.
- `elsewhere` — there ARE steps, kept somewhere this record's reader cannot
  see. **Never "none".** A host that answered `steps.list` with `[]` here
  would be reporting an epic with twenty sections as having no steps, which
  is a bug a host in this workspace has already had once.
- `none` — nobody has written any. Genuinely none.

An empty array cannot tell the last two apart, and they send a reader to
opposite places. So: read `stepsOf(record)`, never `record.steps`, wherever
the answer is going to be shown or counted.

#### `stepPart`

The part a step says it is in, or null.

Read off whatever is there, because a step is somebody's JSON: anything
that is not a `PART_ID` is no assignment, and the step belongs to the epic
as a whole. Whether the id names a part the epic still HAS is a second
question, and `partInFocus` answers it.

#### `JourneyPart`

One part of an epic, as it is read off the epic's record.

`EpicPart` in `parts.ts` is what goes on the wire, and carries `picked`,
which is a fact about a person and not about a record. This is the reading
underneath it: the same `id`, `heading` and `refs`, and a count of the steps
that say they are in the part, which a picker draws and the wire has no use
for.

#### `JourneyPart.files`

The files of the epic's paper this part owns, in `partFile`'s form.

ABSENT when the group names none — not `[]`. Every reading made before a
part could own a file is `{ id, heading, refs, steps }` exactly, and it
stays exactly that for a record that says nothing about files. Read it as
`part.files ?? []`; that is what goes on the wire.

#### `partIdsOf`

The id of the part each group is, in the groups' own positions.

One entry per entry of `groups`, so `ids[i]` is the id of `groups[i]` —
and `null` where that entry is not a part at all: something that is not an
object, or a group past `LIMITS.PARTS`. `[]` for anything that is not an
array.

##### Where an id comes from

A group that carries an `id` in `PART_ID`'s class is called that. One that
does not — every group written before parts existed — is called
`slugFrom(heading)`, so every record already on disk has ids without
anybody editing it, stable for as long as the heading is.

Two groups that come out with one id are told apart by a suffix — `-2`,
`-3` — in the record's order, and a heading with nothing usable in it
becomes `part-<n>`, where `n` is the group's position counted from one.
Both are better than dropping a group: a part that vanished from a picker
is exactly the silent hiding parts exist to avoid.

##### Why the positions are kept

`partsOf` wants the parts and has no use for the gaps. The program that
edits the record does: the day it assigns a step to a part whose group has
no `id` written, it writes the derived id onto THAT group, so the heading
is free to be reworded from then on — and it has to know which group that
is. An id written that way is the one this function would have derived, so
writing it changes nothing any reader sees.

##### One derivation, and it does not move

A host derives these to compose `context.parts`; the Journeys module derives
them to check a step's `part` and to draw which part a step is in. Those
must be one function or they will one day be two answers, and the ids it has
produced are already in files and in stored focuses. See `slugFrom`.

#### `partsOf`

Every part an epic has, in the record's order.

##### A part is a group, read

A record has always had `groups: [{ heading, refs }]`. A part is not a new
idea beside that — it IS a group, with an id (`partIdsOf`), one level deep.

##### A step says which part it is in

`steps[].part` is the id of a part. A step is in a part because it says so
and for no other reason — not because it names a ref the part lists. A step
with no `part`, or one naming a part the record does not have, belongs to
the epic as a whole and is counted nowhere here.

What an assignment does is fold the step's refs into its part's `refs`, once
each, after the ones listed under the heading. That is one fact projected
into a second place by one function, and it is what lets a module that knows
only references narrow correctly without learning what a step is.

##### It takes anything, and nothing here throws

`unknown`, and not `JourneyRecord`, although a parsed record is what it is
for. A host falls back to a file of its own when a project has no record,
and that file is whatever somebody left in it: the same derivation has to
read both, or the fallback would be a second derivation. So junk costs the
entry it is in and nothing else — a group that is not an object is skipped,
a ref that is not a short string is dropped — and `[]` is the answer for a
record with no `groups` and for anything that is not a record at all.

##### Bounded, because this is what goes on the wire

At `LIMITS.PARTS` parts and `LIMITS.PART_REFS` refs each, a heading at
`LIMITS.TITLE` and a ref at `LIMITS.REF`: the list goes out in a context
broadcast to every frame. What is past a bound is not in the answer; the
record is where the whole of it is. A part with no heading is called by its
id, so that there is always something to draw.

##### The files a part owns

A group may carry `files`, the files of the epic's paper that are this
part's. They come out under `files` in `partFile`'s form — relative to the
paper's folder, forward slashes, once each, at most `LIMITS.PART_FILES` —
and a name that is not in that form (an absolute path, a `..`, a backslash)
is dropped like any other junk. Unlike refs, NOTHING is folded in from the
steps: a step names no file. The key is absent when a group names none; see
`JourneyPart`.

### `src/serve/journeys.ts`

#### `readJourneys`

The few lines that open the file `journey.ts` describes.

##### Why this is behind `/serve`

The front door of this package is shapes and pure functions, importable by
a page with no filesystem. This reads a file. So it stands with the rest of
what touches the machine, and `journeyIn` — the part with the judgement in
it — stays where a browser and a test can both reach it without a disk.

##### And it is the one thing here a host runs

Everything else in this directory is a module's own housekeeping, and the
note on the index says a host never runs it. This is the exception and it
is named as one: a host reads an epic's steps out of a file the Journeys
module wrote, and the reading is here so that the host is not the second
program to spell that path or parse that format. The module that owns the
file may use it as well; nothing here writes.

##### Null, for every way of there being nothing to read

No project, a relative path, a path that is not a folder, no
`.kehikot/journeys`, no file, a file that is not JSON, JSON that is not an
object. All of them are "there is no document here to answer from", a
reader that is going to fall back does
the same thing for each, and none of them is worth an exception thrown
through a wire call. A caller that needs to tell them apart — the module
that is about to WRITE the file, which must never treat "would not parse" as
"empty" — has to ask the disk itself, and should.

##### A folder that points somewhere else is not followed

`.kehikot`, or `.kehikot/journeys`, or the file may be a symlink out of the
project. Followed, that is one project's steps answered under another's
name. So both ends are resolved and the file has to really be under the
project it was asked about — `within` is the comparison, and the
`realpath` on either side is what makes it a check; see its note.

#### Inside `readJourneys`

A relative path would be resolved against whatever directory this process
     happens to have been started in, which is a guess about which project was
     meant. `kehikotDir` gives the reason a guess is the one thing not to do.

#### `readJourney`

The record a project keeps for one epic, or null.

`readJourneys` and `journeyIn`, in that order, for the caller asking about
one epic. A caller walking every epic in a project reads the document once
and asks `journeyIn` per slug, so that one listing is one reading of the
file and not a different one per row.

### `src/client/focus.ts`

#### `Focus`

The parts focus as one React value: the rule, the count and the sentence,
so that a module writes `anchorOf(item)` and where the sentence is drawn,
and nothing else.

It is here and not in `useHost` because half the modules keep the context
in a hook of their own, and this has to work for those too: it takes
whatever of the context the page is holding — the whole `ModuleContext`, or
`{ parts, epic }` — and wants nothing from the connection.

Pure functions under it, all exported from the package's root
(`anchorInFocus`, `narrowToFocus`, `focusSentence`, `sameParts`), for a page
that is not React.

#### `Focus.narrow`

A list narrowed to the picked parts, and the sentence about what was left
out — `''` when nothing is picked.

`noun` is what one item is called in the sentence (`'note'`, or
`['entry', 'entries']`). `keep` holds on to what the person is in the
middle of; see `narrowToFocus`.

#### `useFocus`

`context` may be null (before the greeting) and may lack `parts` (a host
older than 0.29.0): both are no parts, nothing picked, the whole epic.

The value it returns changes identity only when the parts change by value or
the epic changes, so it is safe in a dependency list: a context re-sent
because something else on the canvas moved redraws nothing here.

### `src/check/parts.ts`

#### About `src/check/parts.ts`

`bun run check:parts <module dir>…`: does a module do what its manifest says
about the parts of an epic?

The requirement is in `parts.ts`: every item of a module's data is anchored
to a part by a file, a ref or a part id, or the module says why it has none.
`partsDeclaration` reads the manifest's half of that, and that half is what
this FAILS on: a module that declares neither, declares both, or whose
manifest cannot be loaded.

It also looks through the sources for an import of the protocol's focus
helpers, and that is ADVICE, never a failure. It is a regex over import
text: `import * as`, a re-export through a wrapper file or a dynamic import
all get past it, and any import at all satisfies it. So a module that says
`reacts: ['parts']` and shows no such import gets a NOTE saying what was
looked for, for a person to read; whether the narrowing is right is a
review's question and no scan's.

Node-only and behind no entry point in `exports`, like `create/`: it is run
from a checkout or a module's `node_modules` (`bin/check-parts.ts`), never
imported by a page. Read-only.

#### `FOCUS_HELPERS`

The functions that ARE the rule. Importing any one of them from this
package is using it.

The last three are the ones the rule delegates to, and they stay on the
list: Paper, Journeys, References, Checklist and Tests followed the parts
with them before `useFocus` existed, and leaving them out would put a note
on five modules that do exactly what the requirement asks.
