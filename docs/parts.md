# Parts of an epic: one list, one rule

What a part is, who keeps the list, what each module holds for a part and how it says so, the one rule for what a pick shows, and the contract every module that follows parts keeps. Rewritten for 1.2.0; what it replaces is under [What 1.2.0 deprecated](#what-120-deprecated).

This is the reasoning and the how-to. The shapes, with their bounds, are in the source and show on hover.

Back to the [index](README.md).

## In plain words

**A part belongs to the epic.** It is an id, a name and a place in an order: one level deep, not an epic inside an epic. It is not a thing of any module. Nothing about parts, in this package or in a host, names a module.

**The list lives with the epic, and the host is its only writer.** A host keeps `parts: [{ id, name }]` in the file it already keeps for the epic. A person adds, renames, reorders and removes parts in the host's picker, which is in the bar beside the epic. A module that wants an edit — "a part for each chapter" — asks the host with [`parts.set`](#partsset-asking-the-host-to-edit-the-list); it never writes the list.

**Each module keeps what it has for a part in its own data, keyed by the part's id**, and publishes the two things anything else can be tied to — documents and references — in [`parts.json`](#what-a-module-holds-for-a-part-partsjson) in its own folder. The host reads that file from every module folder and unions them into the part it sends. So a module that shows notes can narrow by a document another module said belongs to a part, and neither knows the other exists.

**One rule, the same in every module.** With nothing picked, everything is shown. With parts picked, an item is shown exactly when one of its anchors is in a picked part.

## What arrives: `context.parts`

Every part of the open epic, in the epic's order, picked or not:

```ts
parts: Array<{
  id: string            // PART_ID: lowercase, digits, dashes. Stable; what to store.
  heading: string       // the part's name. Drawn, never compared, never stored as a key.
  picked: boolean       // whether the person picked it out
  refs: string[]        // the references the modules hold for it, unioned
  documents?: string[]  // the documents the modules hold for it, unioned; project-relative (1.2.0)
  files?: string[]      // deprecated: the paper-relative names among them, for a module that still reads those
}>
```

- **None picked means the whole epic.** It is the resting state, and it is what an epic with no parts, no epic at all, and a host that has never heard of parts all send. A module that never reads the field shows the whole epic.
- **Every part is listed**, so a module can name a part and can tell a picked part from one that is merely there.
- **At most `LIMITS.PARTS` (128)**. It was 32 until 1.2.0; a part may be one step of a journey, and journeys of more than thirty-two steps exist. A module built with a package before 1.2.0 refuses a context that lists more than 32, so a host sends such a module `partsFor(parts, manifest.build?.protocol)`: every picked part, and the rest in order, up to 32.
- **`documents` and `files` are optional and absent means none.** Read them through the functions below, or as `part.documents ?? []`.
- No module sets the pick. A pinned container keeps the parts it was pinned with. Moving to another epic sends that epic's parts with nothing picked.

**The id is stable; the name is not.** A host makes the id once, when the part is added, from the name it had then (`partIdFor`), and no rename changes it. Store the id. See [ids.md](ids.md#which-ids-are-stable-and-which-are-only-good-for-now).

## The rule: anchors

One item of a module's data says what ties it to a part with an `Anchor`, told apart by its one key:

```ts
type Anchor = { part: string | null } | { file: string } | { ref: string } | { whole: true }
```

| Anchor | For an item that… | In a picked part when… |
|---|---|---|
| `{ part }` | is filed by part id: the one X this module keeps for the part | the part with that id is picked. `null`, or an id the epic no longer has, is in none. |
| `{ file }` | is about a document: a note on a file, a question from one, a row that IS a file | a picked part lists that document. Absolute or project-relative; see [documents](#documents-project-relative-and-compared-in-one-place). |
| `{ ref }` | is about a reference: a row in a list of issues, a run of a pull request's tests | a picked part lists that ref |
| `{ whole: true }` | is about the epic itself, or the whole of its paper | always: it belongs to **every** part |

An item may answer several — it is in front when **any one** is — or none (`null`, `undefined`, `[]`).

**An item with no anchor belongs to the epic as a whole and is hidden while parts are picked.** It is back the moment nothing is picked. No module shows unanchored items under a pick, and none counts them on screen.

**`{ whole: true }` is not the absence of an anchor, and it is not a way out of narrowing.** It says something true about the item: this checklist is held against the whole paper; this note is about the epic and no chapter of it. Such an item is part of every part, so it stays under any pick. Use it only for that. An item that simply has not been tied to anything answers no anchor and is hidden; a module that answered `whole` for everything would be a module that ignores the pick, which is what `partless` is for when it is true and a defect when it is not. A module never uses it for a "show anyway" switch.

`anchorInFocus(parts, anchor, epic, projectPath)` is the rule, and `narrowToFocus` and `useFocus` are that rule over a list. Nothing else compares a file, a ref or a part id with the pick.

## The contract for a module that follows parts

A module that says `reacts: ['parts']` MUST:

1. **Give every item its anchors** in one function, `anchorOf(item)`.
2. **Narrow through `useFocus(context).narrow(items, anchorOf, { noun, keep })`** — or `narrowToFocus(parts, items, anchorOf, { epic, projectPath, keep })` in a page that is not React — and through nothing of its own. No hand-written comparison of files or ids.
3. **Hide an item that has no anchor while parts are picked.** That is what the rule does; the module does not undo it.
4. **Keep what is in hand.** The one item a person is in the middle of — an editor with unsaved words, the item they selected or opened — is passed as `keep` and stays drawn in its place. Every module does this.
5. **Say one sentence when the pick leaves nothing, inside the empty view, and nothing else anywhere**: `emptySaid(parts, noun)`, which `narrow` hands back as `empty`. While anything is shown, nothing about the pick is drawn: no count line, no notice row, no "outside" marks, no part names in a header. Space is the scarce thing, and the host's bar already says what is picked.
6. **Leave its MCP door un-narrowed.** An agent has no canvas.
7. **Never set the pick, and never widen it locally.** No "show all" of the module's own.

A module is **`partless`** — one sentence in the manifest instead of `reacts: ['parts']` — only when it has no item that could carry an anchor (a terminal), or when it is not about one epic at all: its scope is the project or the machine (a log across projects, a canvas of every epic). "It shows one selected thing, which is always in hand" is such a reason. "The owner chose not to", and "narrowing would hide the selection" (`keep` holds the selection), are not.

`kehikot-check-parts` fails a manifest that says neither or both, and prints hints for what of this can be seen in a module's files; see [the check](#the-check).

### The one sentence

```ts
emptySaid(parts, 'note')   // 'No note is in the picked part.'    one part picked
emptySaid(parts, 'note')   // 'No note is in the picked parts.'   several
emptySaid(parts, 'note')   // ''                                  nothing picked
```

`noun` is what one item is called, in the singular: `step`, `note`, `question`, `slide`, `entry`, `checklist`, `reference`, `page`. Seven modules each had a wording of their own; this is the one. `narrow(...).empty` is that sentence when the pick left **nothing** of a list that **had something**, and `''` otherwise — so a list that is empty anyway keeps the module's own "nothing here yet", and a view with one kept item says nothing.

## A worked module: one sketch per part

`kehikot.sketches` keeps one drawing for each part of an epic. Everything a "one X per part" module does is here.

**The manifest** says it follows the parts, and that it may ask for a part to be added:

```ts
reacts: ['parts'],
declares: { uses: ['parts:set', 'content:report'] },
```

**Its own data is keyed by part id**, in its own folder (`moduleFile(project, ID, 'sketches')`). Never by name, and nowhere outside `<project>/.kehikot/sketches/`:

```json
{ "version": 1, "epics": { "thesis": { "methods": { "file": "thesis/methods.svg", "refs": ["gh#12"] } } } }
```

**After every write, it publishes what it holds**, from its server. Its own file is the truth; `parts.json` is that truth said in the two words everybody shares:

```ts
import { writeHoldings } from 'kehikot-module-protocol/serve'

function publish(project: string, epic: string, sketches: Record<string, { file: string; refs: string[] }>) {
  writeHoldings(project, ID, epic, Object.fromEntries(
    Object.entries(sketches).map(([part, sketch]) => [
      part,
      { documents: [`.kehikot/sketches/${sketch.file}`], refs: sketch.refs },
    ]),
  ))
}
```

Then it tells the canvas (`content.changed`, with the epic), which is the host's cue to read the holdings again.

**Its page narrows by the one rule.** A sketch is filed by part, so its anchor is `{ part }`; one that was drawn for the whole epic answers `{ whole: true }`:

```tsx
import { useFocus } from 'kehikot-module-protocol/client/react'

const focus = useFocus(context)        // or useFocus({ parts, epic, projectPath })
const { shown, empty } = focus.narrow(
  sketches,
  (sketch) => (sketch.part === WHOLE_EPIC ? { whole: true } : { part: sketch.part }),
  { noun: 'sketch', keep: (sketch) => sketch.id === editing },
)

return shown.length ? shown.map(draw) : <p className="text-muted-foreground">{empty || 'No sketch yet.'}</p>
```

That is all of it. No header line, no count, no switch. `focus.parts` gives the names for a sketch's own label (`part.heading`); the name is drawn and never kept.

**It offers a sketch for a part that does not exist yet by asking the host**, on a person's press:

```ts
import { partsSetResult } from 'kehikot-module-protocol'

const said = partsSetResult.parse(await host.request('parts.set', { epic, add: { name: 'Methods', after: 'introduction' } }))
if (said.outcome === 'changed' && said.id) createSketch(epic, said.id)   // the id the host made
else if (said.outcome === 'declined') show(said.why)
```

The new part arrives in `context.parts` for every module, like any other change to the list.

**A part that was removed leaves its sketch.** The sketch is still in the module's file under the id; `{ part: 'gone-id' }` is in no picked part, so it is hidden under a pick and shown — the module may label it "no part" — when nothing is picked. The module does not delete it, and it leaves it out of `parts.json` or not as it likes: a holding for an id the epic no longer has is read by nobody.

**Its MCP door** lists every sketch whatever is picked.

A module whose items are *about* something rather than filed by part — a note on a file, a run of a pull request's tests — has no data keyed by part id and writes no `parts.json`. Its `anchorOf` answers `{ file: note.path }` or `{ ref: run.ref }` and the rest is the same four lines.

## What a module holds for a part: `parts.json`

One file per module per project, in the module's own folder:

```
<project>/.kehikot/<module>/parts.json
```

```json
{
  "version": 1,
  "epics": {
    "thesis": {
      "methods": { "documents": [".kehikot/paper/thesis/chapters/3_methods.tex"], "refs": ["gh#12"] }
    }
  }
}
```

`epics` is keyed by the epic's slug, then by the part's id. `documents` are project-relative, in `partDocument`'s form; `refs` are references as everything else spells them. Both lists are always written. A part the module holds nothing for is not listed.

```ts
import { readHoldings, writeHoldings } from 'kehikot-module-protocol/serve'

// A module, about ONE epic, after its own write has landed:
writeHoldings(projectPath, MODULE_ID, epic, { methods: { documents: [absoluteOrRelative], refs: ['gh#12'] } })

// A host, for a project:
const holdings = readHoldings(projectPath)        // { <epic>: { <part id>: { documents, refs } } }
own(own(holdings, epic) ?? {}, part.id)           // read with own(): an id may be `constructor`
```

**`writeHoldings(projectPath, moduleId, epic, holdings)`**

- Replaces what this module's file says for **that epic**, whole. Every other epic, and every key it does not know, stays exactly as it was. `{}` takes the epic out.
- A document may be given absolute or project-relative; it is stored project-relative. An absolute one has to be under THIS project, as given or as the disk resolves it (a symlinked spelling of the project is read; another project's `/.kehikot/…` of the same relative name is not: stricter than `documentOf`, which has no disk to ask). One that is not under the project, and a ref that is not one, are not written and come back in `dropped`.
- Once each; the first `LIMITS.PART_DOCUMENTS` (64) documents and `LIMITS.PART_REFS` (256) refs of a part are kept.
- Atomic: a temporary file beside it, renamed. Synchronous from the read to the rename, so no other write of the same process can fall between. Writes nothing when the file already says exactly this (`changed: false`).
- Whatever is there under the name and cannot be read as a JSON object (junk, a link, a pipe, a folder, a file without permission) is kept beside the new one as `parts.json.unreadable`, not written over and not read through. One name, so at most one is kept: the latest.
- `null` when there is no project. Throws for a module id, an epic slug or a part id that is not one, and for a `.kehikot` or a module folder that resolves outside the project, before anything is made through it.
- It writes under `<project>/.kehikot/<module>/` (`moduleFile`) and nowhere else.

### Who has spoken: `published` (1.4.0)

`writeHoldings` drops a part, and an epic, that holds nothing. So a module that publishes nothing
looked the same as one that never published, and a host's legacy fallback (what it did before parts
existed) came back the moment a last chapter was set to "no part". `parts.json` now also says which
KINDS each epic has been published for, beside `epics` and not inside it, so that no part id can
collide with it:

```json
{
  "version": 1,
  "epics": { "thesis": { "methods": { "documents": ["…"], "refs": [] } } },
  "published": { "thesis": ["documents", "refs"], "notes": ["documents"] }
}
```

`published[<epic>]` is a subset of `HOLDING_KINDS` (`documents`, `refs`), kept **even when the lists
are empty** — `"notes"` above has no part held and has still been spoken for.

- **`writeHoldings(projectPath, moduleId, epic, holdings, { published? })`**: the kinds this call
  speaks for are `options.published` when given; otherwise each kind some part in `holdings` was given
  a list for, an empty list included (`{ a: { documents: [] } }` speaks for `documents`); otherwise,
  for a call that gives no part at all (`{}`), both. A module that only knows documents should pass
  `{ published: ['documents'] }` and not claim `refs`. **Once spoken, spoken**: what a module said
  earlier for the epic is kept and the kinds only grow.
- **`holdingsSpoken(projectPath, epic)`** (`/serve`) → `{ documents: boolean, refs: boolean }`:
  true for a kind when ANY module's file says it was published for that epic. Both false is
  "nobody has", and the host's fallback is allowed. A file written before 1.4.0 (no `published`)
  counts for the kinds its parts hold (`spokenIn`, pure, is what reads one file).
- `readHoldings` is unchanged and still returns only what is held.
- Compatibility: `HOLDINGS_VERSION` is still 1. A 1.3.0 `readHoldings` reads a 1.4.0 file and ignores
  `published`; a 1.3.0 `writeHoldings` keeps it (every key it does not know is kept), so the memory
  of who spoke survives an older module writing. Checked against the 1.3.0 build.

**`readHoldings(projectPath)`**

- Asks every folder directly under `.kehikot/` for a `parts.json`, in name order, and unions what they say per epic and part, once each, under the same bounds. It names no module: a new module's file is read the day it is written.
- Never throws and never writes. `{}` for no project, a relative path, no folder.
- Junk costs the entry it is in: a file that is not JSON, an epic key that is not a slug, a part key that is not an id, a document that is absolute or has `..` in it. A file over `LIMITS.HOLDINGS_BYTES` (4 MB), a `parts.json` that is not a regular file, and a folder or file that resolves outside the project, are skipped whole. At most `LIMITS.HOLDINGS_MODULES` folders and `LIMITS.HOLDINGS_EPICS` epics a file.
- A holding under a part id the epic's list does not have is read and is nobody's: the host unions holdings into the parts the list has.

`parts.json` is a publication, not a store. A module can rebuild it from its own data at any time, and should on start.

## Documents: project-relative, and compared in one place

A part's `documents` are paths **relative to the project**: `.kehikot/paper/thesis/chapters/3_methods.tex`, `src/sim/run.ts`, `docs/design.md`. Forward slashes, the extension written, no `..`, not absolute, NFC, at most `LIMITS.PART_DOCUMENT` (512) characters; `partDocument(raw)` is the form and `isPartDocument` the check the wire applies.

Project-relative, because it is the one spelling that needs no module to be read: a path under any module's folder and a path in the repository are the same kind of string, and it survives a clone. This is what replaces `files`, which was relative to one module's folder (`.kehikot/paper/<epic>/`) and could therefore only ever name that module's files.

A module does not hold that spelling; it holds an absolute path (`passage.path`), or whatever its own data has. **One function turns one into the other: `documentOf(path, projectPath)`**, and every comparison goes through it:

- A relative path is taken as project-relative already.
- An absolute path under `projectPath` (`context.projectPath`) is what follows it.
- An absolute path that is not under it is read from the **last `/.kehikot/`** in it. A module publishes a path it resolved, a host sends the project as it was typed, and under a symlink the two share no prefix; the app's folder is spelled the same in every project. The cost, accepted: another project's file with the same name under `.kehikot/` reads as this one's. It decides only what is drawn under a pick, and a module holds items for the open project; `writeHoldings`, which writes the name down, does not take it.
- An absolute path that is neither is no document: outside every pick.

So pass the project. `useFocus(context)` takes it from the context; a page that hands `useFocus` only `{ parts, epic }` still narrows correctly for every document under `.kehikot/`, and needs `projectPath` for a file of the repository. Do not strip a prefix or match a suffix yourself.

```ts
fileInFocus(parts, passage.path, context.epic, context.projectPath)
partsOfFile(parts, path, context.epic, context.projectPath)   // which parts have it
pickedDocuments(parts)                                        // the picked parts' documents, once each
```

**Both generations work together.** `fileInFocus` (and so a `{ file }` anchor) accepts a file when a picked part lists it in `documents` **or**, as before 1.2.0, lists its paper-relative name in `files`:

| | host sends only `files` (≤ 1.1.0) | host sends `documents` and `files` (1.2.0) |
|---|---|---|
| module on ≤ 1.1.0 | as before | as before: it reads `files`, which the host goes on filling |
| module on 1.2.0, absolute or paper-relative anchor | as before | matches either |
| module on 1.2.0, project-relative anchor | matches `files` when the path is under the paper's folder | matches `documents` |

## `parts.set`: asking the host to edit the list

A request, under the capability `parts:set` (`declares.uses: ['parts:set']`). One edit a call:

```ts
host.request('parts.set', { epic, add:    { name: 'Methods', after: 'introduction' } })
host.request('parts.set', { epic, rename: { id: 'methods', name: 'How it was done' } })
host.request('parts.set', { epic, move:   { id: 'methods', after: null } })
host.request('parts.set', { epic, remove: { id: 'methods' } })
```

- **`epic` is required.** The edit is written down, so it names what it is for; a host refuses an epic that is not one of the open project's.
- **`after`** is where the part goes: right after that part; `null` is first; absent is last. The same for `add` and `move`.
- **`name`** is trimmed, not empty, at most `LIMITS.TITLE`; a longer one is refused, not clipped.
- Exactly one of the four. A call naming none, or two, is refused before it reaches the host's answer.

Answered with `partsSetResult`:

```ts
{ outcome: 'changed' | 'unchanged' | 'declined' | 'no-such-part', parts: [{ id, name }], id: string | null, why: string }
```

| `outcome` | |
|---|---|
| `changed` | The list is different now. `parts` is the whole list, in order; `id` is the part the call was about — for `add`, the id the host made. |
| `unchanged` | It already was as asked: the same name, the same place. |
| `declined` | The host will not, and `why` says so in a sentence: no such epic in the open project, the list is full (`LIMITS.PARTS`), not now. |
| `no-such-part` | An `id` or an `after` names no part of the epic. Nothing changed. |

All four are `ok: true`: a refusal is an answer, not a failure. A host older than 1.2.0 answers `unknown-method`, which a caller is already told to expect; offer nothing then.

**What the host guarantees** (this package specifies it and does not do it):

- The host is the only writer of the list. It makes a new part's id with `partIdFor(name, takenIds)` — `slugFrom(name)`, `part` when the name has nothing usable, `-2`, `-3` against the ids taken — writes it with the part, and **never changes it**: `rename` changes `name` only; `move` changes the order only.
- `remove` takes the part out of the list and touches nothing else. What modules filed under its id is theirs. A stored pick naming it names nothing from then on.
- An id is told apart from the ids in the list **now**. A part added under the name of one that was removed gets the removed one's id again, and what modules still hold under that id is its.
- Every edit, whoever asked — the picker, a module, an agent at the host's door — goes through the one writer and reaches every module as `context.parts`.
- It is a person's edit. A module calls this on a press, not on its own judgement.

## The declaration, and the check

`reacts: ['parts']`, or `partless: '<one sentence>'`. `manifestSchema` refuses a manifest that says neither or both (`partsDeclaration` has the sentences).

### The check

`bun run check:parts <module dir>…` (the bin `kehikot-check-parts`; from a module, `bun node_modules/kehikot-module-protocol/bin/check-parts.ts .`) reads a module's `manifest.ts` and **exits 1 only on what the manifest says**: neither `parts` nor `partless`, both, or no manifest that loads.

Everything it reads out of the sources is a **note, never a failure**. It is a scan of text, so `import * as`, a wrapper's re-export and a dynamic import get past it. From 1.2.0 it also says, for a module that follows parts:

- it imports a focus helper and never calls `useFocus().narrow` or `narrowToFocus` — a narrowing of its own;
- it narrows and passes no `keep`;
- it still imports what 1.2.0 deprecated for parts (`focusSentence`, `FOCUS_WHERE`, `paperFileOf`, `PAPER_MODULE`, `pickedFiles`, `JOURNEYS_MODULE`, `partsOf`), with the file;

and for a `partless` module, that its sentence gives a reason the contract no longer accepts (a choice; "would hide the selection"; "files of the paper"). Whether the narrowing is right is a review's question.

## What a host does

Stated here because modules rely on it; the code is the host's.

1. **Keeps the list** in the epic's own file, as `parts: [{ id, name }]` (`partListSchema`), and is its only writer.
2. **Adopts once.** For an epic whose file has no `parts` key, the list is read as before 1.2.0 (`partsOf` over the Journeys record's `groups`: the released behaviour, and the fallback). The first time the list is edited, the adopted list is written into the epic's file — ids and names exactly as read — and from then on only that is read.
3. **Unions the holdings.** `context.parts[i].refs` and `.documents` are what `readHoldings(project)` says for that epic and part. `files` is filled from the documents under the paper's folder, for modules that still read it. Until a module publishes holdings, what the adopted record said (a group's `files`, its steps' refs) is folded in as before.
4. **Answers `parts.set`** with the same writer the picker uses.
5. **Sends an older module no more than it can take**: `partsFor(parts, manifest.build?.protocol)`.

## What 1.2.0 deprecated

All of it still works, unchanged. None of it is for new code.

| Deprecated | Because | Instead |
|---|---|---|
| `focusSentence`, `FOCUS_WHERE`, `narrow(...).sentence` | The standing count line ("3 questions outside the picked part") was removed from every module: nothing about the pick is drawn while anything is shown. | `emptySaid`, `narrow(...).empty`, in a view the pick left empty |
| `partSchema.files`, `pickedFiles`, `partFile` as a part's file | Relative to one module's folder, so it could only name that module's files. | `documents`, `pickedDocuments`, `partDocument` |
| `paperFileOf`, `PAPER_MODULE` | They read one module's folder out of a path. A part names no module. | `documentOf`, `fileInFocus`, a `{ file }` anchor |
| `partsOf(record)`, `partIdsOf`, `JourneyPart`, and `JOURNEYS_MODULE` / `readJourneys` as where parts are | The list is the epic's own, kept by the host; what each module holds is read with `readHoldings`. | `listedPartSchema`, `partIdFor`, `readHoldings` |

`partsOf` stays as how a host adopts the list of an epic that has none yet. `readJourneys`, `readJourney`, `journeyIn`, `stepsOf` and the record's schemas are still how an epic's **steps** are read; only their use for parts is deprecated.

## An epic's steps, and the record they are read from

Unchanged by 1.2.0, and no longer about parts. **Deprecated in 2.21.0**: an
epic's steps are a plan any module publishes in its own `steps.json` and a host
answers `steps.list` from the union of them all — see [plans](plans.md). What
follows is the older record, which a 2.21.0 host still reads as the fallback for
a Journeys that has not published, and which goes in 3.0.

The Journeys module keeps `.kehikot/journeys/journeys.json`, `{ version, journeys: { <slug>: record } }`, and a host answers `epics.list`, `epic.get` and `steps.list` out of it, falling back to its own file when a project has no record under a slug. The format is `journey.ts`, here, so the writer and the reader import one shape.

```ts
import { journeyIn, stepsOf, stepPart } from 'kehikot-module-protocol'
import { readJourneys, readJourney } from 'kehikot-module-protocol/serve'

const record = readJourney(projectPath, 'the-posting-seam')   // JourneyRecord | null
if (record) {
  const said = stepsOf(record)        // 'stored' | 'elsewhere' | 'none'
  if (said.kind === 'stored') for (const step of said.steps) stepPart(step)
}
```

- **Every object is `.passthrough()`**, and nothing is bounded: it is a document a person wrote in their own repository. A writer that parsed with a stripping schema before saving would delete fields from somebody's file.
- **`journeyIn` never throws and reads one record at a time**: null for a non-document, a slug that is not one, an unknown slug, a record that will not parse, and a record filed under one slug that calls itself another. The lookup is `Object.hasOwn`.
- **An empty `steps` is two different things**, and `stepsOf` tells them apart: `stored`, `elsewhere` (there are steps, kept where this reader cannot see — never "none") or `none`. Read `stepsOf(record)`, never `record.steps`.
- **A step's `part`** is the id of the part it is the step of (`stepPart`). It is the Journeys module's own data, keyed by part id like any module's.
- **`groups`** is what a host before 1.2.0 read as the epic's parts, and what a 1.2.0 host adopts the list from once. A record keeps the key for those hosts.
- **`readJourneys`** answers the parsed document or null — no project, a relative path, no file, not JSON — and does not follow a folder that resolves outside the project.

## Notes by symbol

### `src/parts.ts`

#### `PART_ID`

The same class of characters as an epic's slug. What a host stores for the pick and what a module files its own data under. Never the name.

#### `partSchema`, `partsSchema`

One part in a context, and the list. Two parts sharing an id are not refused in a context — one doubtful field must not cost every module its greeting — and the functions read the first. `documents` and `files` are the two fields not defaulted to empty: a part without them parses to `{ id, heading, refs, picked }` exactly, which is the shape hosts and modules hold in their own comparisons.

#### `listedPartSchema`, `partListSchema`

One part as the epic keeps it, `{ id, name }`, and the whole list: at most `LIMITS.PARTS`, no id twice. What a host writes into the epic's file and answers `parts.set` with. The context calls the same name `heading`; the two words are one fact, and `heading` is kept on the wire because every module already reads it.

#### `partIdFor`

The one derivation of a new part's id, so a host's picker, its `parts.set` and its MCP door cannot come to three answers. Made once; never called for a rename.

#### `partsFor`, `PARTS_BEFORE_1_2`

A module built before 1.2.0 parses `context.parts` with a schema that stops at 32 and drops the whole message past it. So the bound is raised for a module that can take it and held for one that cannot, per module, by the package version in its manifest's `build.protocol`. An unknown build is treated as an old one. Picked parts are kept first, so an older module on a long epic still narrows; it cannot name a part it was not sent.

#### `partDocument`, `documentOf`

The form and the normalisation; see [documents](#documents-project-relative-and-compared-in-one-place). `..` is refused, not resolved: this package opens nothing and cannot know a segment is not a link. A module will join the string onto a folder; it keeps its own fence, and this is the second.

Names are compared as written, case included.

#### `refInFocus`, `partInFocus`, `fileInFocus`

The three questions an anchor delegates to. A module asks them through `anchorInFocus`, not one at a time around a filter of its own.

A step, or any item filed by part, is in a part **because it says so** and for no other reason — not because it names a ref the part lists. A step often names a reference it merely depends on.

#### `Anchor`, `anchorInFocus`, `narrowToFocus`

The rule. `narrowToFocus` returns `shown` (in the order the items came), and two numbers, `outside` and `kept`, which are for a module's own logic and its tests. Nothing draws them.

#### `emptySaid`

See [the one sentence](#the-one-sentence).

#### `sameParts`

Two lists by value: what `context.parts` is compared with before a page is redrawn for it. A host re-sends the context after every change anywhere on the canvas, and the list is the same list on nearly all of them.

### `src/client/focus.ts`

#### `useFocus`

The rule as one React value. It takes whatever of the context the page holds — the whole `ModuleContext`, or `{ parts, epic, projectPath }` — and wants nothing from the connection, because half the modules keep the context in a hook of their own.

`context` may be null (before the greeting) and may lack `parts`: both are no parts, nothing picked. The value changes identity only when the parts change by value or the epic or project changes, so it is safe in a dependency list.

`focus.inFocus(anchor)` is for a module that sets an item back rather than removing it — a deck is an ordered thing. It still says nothing about the pick while anything is shown.

### `src/holdings.ts`, `src/serve/holdings.ts`

See [`parts.json`](#what-a-module-holds-for-a-part-partsjson). The shapes and the tolerant readers are pure and behind the front door's types; the two functions that open the file are behind `/serve`, with the rest of what touches the machine. `readHoldings` is, with `readJourneys`, one of the two things there a host runs.

### `src/methods.ts`

`parts.set`, `partsSetResult`, `PARTS_SET_OUTCOMES`: see [`parts.set`](#partsset-asking-the-host-to-edit-the-list), and [methods.md](methods.md).

### `src/check/parts.ts`

`checkParts` is the check, pure over a manifest and sources; `contractNotes` is the 1.2.0 reading of the contract out of text. `FOCUS_HELPERS` are the functions that are the rule; the three the rule delegates to stay on the list, so a module that uses them is still seen to follow the parts, and is hinted towards `narrow`.
