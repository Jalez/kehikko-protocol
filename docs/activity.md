# Activity

*1.5.0. Source: `src/activity.ts`, `activity.set` in `src/methods.ts`. Capability `activity:report`.*

What a module's things are doing RIGHT NOW, said so that the host can mark them everywhere a person
looks: yellow for "needs you", green for "finished and not yet seen", grey and pulsing for "working".
The Claude module's sessions are the first case (a session is working, needs the person, or has
finished), and anything else a module runs that takes time and may want somebody can say the same.

Before this a module had `events.emit` with `kehikot.notifications@1`: one line on a transition,
which scrolls away and says nothing about what is true now. Activity is the standing counterpart:
the list of what is going on, replaced whole each time it changes.

## The call

`activity.set`, capability `activity:report` (`declares.uses: ['activity:report']`).

```ts
{ items: ActivityItem[] }          // at most LIMITS.ACTIVITY_ITEMS (64)

type ActivityItem = {
  id: string                       // stable, unique in the module, 1..LIMITS.ACTIVITY_ID (128); a session id
  state: 'working' | 'attention' | 'done'
  label: string                    // a short line a person knows it by, at most LIMITS.ACTIVITY_LABEL (120)
  place?: { epic?: string; parts?: string[]; kehikko?: string }
  since?: number                   // ms since the epoch at which it entered `state`
  detail?: string                  // a tooltip sentence, at most LIMITS.ACTIVITY_DETAIL (200)
  priority?: 'urgent' | 'normal' | 'low'   // 1.7.0; absent is 'normal'
  refs?: string[]                  // 1.7.0; tracker refs (gh#12, !7), at most LIMITS.ACTIVITY_REFS (16)
  group?: string                   // 1.7.0; a fold key, 1..LIMITS.ACTIVITY_GROUP (64)
  project?: string                 // 1.8.0; the absolute folder of the project it belongs to
  event?: string                   // 2.31.0; one of the ids in the manifest's `events`
}
```

- **Replace, never merge.** The list is what is true now. An item absent from it is gone (a finished
  session the module no longer tracks, a run that ended). `[]` is a real call: nothing is going on.
- **Refused, not clipped**: a label or detail too long, more than 64 items, two items with one id.
- **`place`** is the shape `kehikot.notifications@1` carries and `view.goto` takes (`placeSchema`):
  `epic` an epic slug, `parts` ids from `context.parts` (at most `LIMITS.PLACE_PARTS`), `kehikko` a
  kehikko `key`. An item with no place belongs to the project.
- **`since`** lets the host decide "seen": an item that re-enters `done` later has a new `since`
  and is unseen again.
- The answer is `activitySetResult`: `{ outcome: 'taken' | 'declined', taken, why }`, `ok: true` both
  ways. `taken` is how many items the host holds. A refusal for the grant is the usual one.

A module sends it again on every change of the list, and again after every greeting (a host that
reloaded holds nothing). The client does both: `connection.activity(items)` (also `useHost().activity`
and the store's `activity`), which drops a list identical to the one last taken, re-sends the last
list on each greeting, drops a list that does not parse, and sends nothing to a host whose
`hello.answers` lacks `activity.set`.

## An older host

A host before 1.5.0 does not know the method and refuses it as `unknown-method`; the module has no
dots and nothing else changes. To avoid asking at all: `answers?.includes('activity.set')` from
`useHost()` (`null` is "did not say": send, and be refused if refused). Declaring `activity:report` in
`declares.uses` is safe on a 1.4.0 host: `uses` is free strings that are documentation for a person,
and a 1.4.0 reader accepts the manifest (tested against the tag, `test/v1-5.test.ts`).

There is nothing new from host to module: the host aggregates, and the module need not know who
displays.

## The host's contract

What follows is the spec for the host; the protocol cannot enforce it.

1. **Held per module, per session.** The host keeps each module's last list. A module's list goes
   when its container is removed or the module stops (its items are not kept as "done").
2. **Aggregation.** A container's mark is the worst state among the module's items that belong to it:
   `attention` over `working` over `done` (`worstActivity`). Items with a `done` the person has seen
   are not counted.
3. **Where an item maps.** `place.epic` marks that epic (in an epic picker and wherever the epic is
   named); each id of `place.parts` marks that part (in parts pickers, and the part's chip); `place.kehikko`
   marks that kehikko (in the kehikko switcher). A place naming a part marks the epic too: the
   epic's mark is the worst of its own items and its parts'. An item with no place marks the project, and
   the module's own container. An item naming an epic, part or kehikko that does not exist marks nothing
   but is still listed in the menu.
4. **Seen.** A `done` item stays green until the person has been to its place: the host remembers
   `id` and `since` of what it has shown as seen (per project), and an item is seen when its place was
   opened (the epic, those parts, that kehikko) while it was `done`, or when the person pressed it
   in the menu. `attention` and `working` are never cleared by seen: they end when the module says so.
   A `done` item with a new `since` is unseen again.
5. **Colours.** Attention is yellow; done is green; working is grey. Working pulses only while
   `prefers-reduced-motion` allows it; otherwise it is a still grey ring. Colour is never the only
   sign: each mark carries its state as a word for assistive technology and the tooltip.
6. **Pressing.** Pressing an item (in the menu or on its mark) goes to its place with `view.goto`
   (`epic`, `parts`, `kehikko`); an item with no place shows its module's container. That also
   counts as seen for a `done` item.
7. **No standing rows.** Marks are small dots on what already exists (pickers, tabs, headers). The list
   itself lives in one host menu, worst first, then most recent `since`, each row: dot, label, module,
   place; `detail` is its tooltip.
8. **Agents.** The host lists the activity in `read_canvas`: per container, the module's items with
   state, label, place and whether seen, so an agent can tell what needs the person. Nothing here is
   pressable by an agent beyond what `press_item` already is.
9. **Grant.** The call is answered only when `declares.uses` named `activity:report` (as every
   capability); `hello.answers` lists `activity.set` for such a module.

## Across projects (1.8.0)

A module's things may belong to projects other than the one open: an agent session runs in its own
project's folder, and keeps running when the person switches project. The page that can report it is
the one framed now. So an item may say which project it belongs to:

- **`project`**: the absolute folder of the project. Absent: the project open now, as before.
- **Only to a host that files by it.** A host that does answers `activity.set` with `projects: true`.
  Until a module has heard that, it reports only the open project's things, untagged; a 1.7.0 host
  strips `project` and would file every item under the open project, which is the misfiling this exists
  to end.
- **Complete across projects.** A list that carries `project` on any item is the module's whole list
  for every project: an item absent from it is gone wherever it was. A host keeps that rule per module.
- A host shows another project's items with that project's name, and pressing one opens that project
  first.

### And by id (2.1.0)

An item that names its project may also name the project's id, `projectId`, beside `project` (never
instead of it: an item with `projectId` and no `project` is refused). The precedence:

1. A host that knows project ids files the item under the project with that id, wherever its
   folder is now. The id outlives a rename; the path the module remembered may not.
2. Otherwise — the id is absent, or names no project the host knows, or the host is older than
   2.1.0 and stripped it — the host files it by `project`, as in 1.8.0.
3. An item with neither is the open project's.

The client helper uses the same order when it decides which items are "the open project's" for a
host that does not file by project: the id where both the item and the host's context have one,
else the path. Both fields are dropped from what it sends such a host.

## One system (1.7.0)

`activity.set` is the ONE way a module tells the host about what needs a person's attention, what is
going on, and what just finished, including one-off notices. The host can therefore embed a single
inbox; there is no separate notifications module to feed.

- **An item has a life.** It opens when a module first reports it, changes state (`working` ->
  `attention` -> `done`) as the module re-sends the list, and closes when the module drops it. The
  host keeps each item's timeline. Open items are "now"; closed items and past transitions are
  "earlier", the log.
- **A one-off notice is an item** the module reports once (state `attention`, label "Tracker read
  failed") and may drop at once. The host records it on receipt, so it stays in the log although it
  was never in two lists.
- **Vendor neutral.** Nothing in the protocol or in a host names a vendor or a module. A Claude
  session is one reporter among others; a test runner, a tracker module or a build are the same shape.
- **`events.emit` with `kehikot.notifications@1` is the legacy path for notices.** A host still
  accepts it and maps each line into the same store as an item that is born closed. New modules use
  `activity.set`. See [extensions](extensions.md).

### New optional fields

- **`priority`** (`urgent`, `normal`, `low`; absent is `normal`): the module's own sense of how
  pressing the item is. `urgent`: something is broken or blocked and nothing else will proceed.
  `normal`: waiting for an answer. `low`: informational. A module should be sparing with `urgent`;
  a host may stop trusting a module that uses it for everything.
- **`refs`**: tracker refs the item concerns (what a notice used to carry), so a host can link them
  and filter by them. Each is a `LIMITS.REF` string, at most `LIMITS.ACTIVITY_REFS` (16).
- **`group`**: a key under which a host may fold repeats. "3 tests failed" reported as three items
  with the same group may show as one row with a count. Grouping is a host display choice; an item
  is still an item with its own id and timeline.

A 1.6.0 host strips all three and still takes the list (`test/v1-7.test.ts`, against the 1.6.0 tag).

## Named events (2.31.0)

An item stays one of the three states; an **event** names a case of one of them that a person can
tell apart and give its own sound: "Research complete" is a `done`, not a new state. A module
declares its events in the manifest and names one on an item:

```ts
events: [{ id: 'research-complete', says: 'Research complete', state: 'done' }]   // the manifest, top level
// …
{ id: sessionId, state: 'done', label: 'Protocol audit', event: 'research-complete' }
```

- **`events`** at the manifest's top level (`inboxEventsSchema`): at most `LIMITS.EVENTS` (16), each with an `id`
  (`EVENT_ID`: lowercase words joined by single dashes, at most `LIMITS.EVENT_ID`, 40), `says` (what
  a person is shown, at most `LIMITS.EVENT_SAYS`, 40) and the `state` its items are in. An id is
  declared once. A list that does not parse is dropped, not fatal: the module runs without events.
- **`event`** on an item: an id of the same shape. A host applies one rule, `declaredEvent(declared,
  item)`: the event counts only when the manifest declares it AND declares it for the item's state.
  Otherwise the host ignores the field and the item is an ordinary item of its state. A bad shape is
  refused with the list, like any field.
- **What a host does with one**: names the item by the event's `says` (beside or in place of the
  state's word), lets a person give the event a sound of its own (falling back to the state's), and
  reports the event to an agent that reads the Inbox. `says` is the module's text: drawn as text,
  never as markup.
- **An older host** strips `event`, and does not read `events`: the item is an ordinary
  item of its state. Additive both ways, so neither field is in `DECLARATION_SINCE` (`fitOf` does
  not hold a module that declares events to a newer host). `events` is at the top level, beside
  `reacts` and `shows`, and NOT under `declares`: a host before 2.31.0 reads an unknown `declares`
  key as a declaration from a newer protocol and would say it is too old to run the module. `ACTIVITY_FIELD_SINCE.event` says which
  version a host has to be to act on it.

## What a host does with items

The spec for a host's inbox; the protocol cannot enforce it.

1. **Timeline store.** Per project, per module, per item id: the item and each state it has been in
   with its `since`. Receipt of a list opens new ids, records changed state, and closes ids no longer
   listed. Closed items stay in the log (bounded and trimmed by age by the host).
2. **Now and earlier.** "Now" is open items; "earlier" is closed items and past transitions, newest
   first.
3. **Ordering of "what needs me".** State first (`attention`, then `working`, then `done`), then
   `priority` (`urgent`, `normal`, `low`), then how long it has waited (oldest `since` first for
   `attention`, newest first for `done`).
4. **Next that needs me.** One control that goes to the top unseen `attention` item with
   `view.goto` and its `place`, so a person can clear the list in order.
5. **Scope.** A filter between this kehikko and everywhere, so a person sees what happens in other
   kehikkos, parts and epics and can switch to them with one press.
6. **Seen, dismiss, forget.** Seen: as in the host's contract above. Dismiss: hide an open item
   from "now" without telling the module (it returns if its state changes). Forget: remove a closed
   item from the log.
7. **Attribution.** A row says who said it: the by-line comes before the claim, and is the host's,
   out of who it knows the module to be. An item has no field for a sender, and must not.
8. **Folding.** Items with one `group` from one module may be shown as one row with a count; a
   press opens the members.
9. **Silence.** Items from a module that stopped answering (crashed, removed, disconnected) are
   closed, not kept alive as `working` or `attention`.
10. **`events.emit` notices** (`kehikot.notifications@1`) go into the same store as items born
    closed: `refs` to `refs`, `place` to `place`, the line to `label`.

## What a module author should report

- **A session waits for a permission**: `{ id: sessionId, state: 'attention', label: 'Wants to run
  rm -rf build', priority: 'normal', place }`. Back to `working` when answered; drop or `done` when
  the session ends.
- **A test run failed**: `{ id: 'tests:' + runId, state: 'attention', label: 'Tests failed: 3',
  group: 'tests', refs: ['gh#12'] }`; drop it when the next run passes.
- **A compile failed and nothing else will build**: the same with `priority: 'urgent'`.
- **A long job finished**: `{ id: jobId, state: 'done', label: 'Export finished', priority: 'low' }`.
- **A session finished a piece of research**: `{ id: sessionId, state: 'done', label: 'Protocol
  audit', event: 'research-complete' }`, with `research-complete` in `events`.
- **An unread review comment**: `{ id: 'review:' + commentId, state: 'attention', label: 'Comment
  on !7', refs: ['!7'] }`.
- **A one-off notice**: report it once with a fresh id and drop it in the next list.

Keep ids stable for the same thing, labels short, and report only what a person would want to know.
