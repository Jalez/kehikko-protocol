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
