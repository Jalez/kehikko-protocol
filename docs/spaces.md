# Spaces (2.89.0)

A project holds a **tree of spaces**. A space can hold spaces, to any depth (bounded on the wire at
`LIMITS.SPACE_DEPTH`). This replaces the two fixed levels the protocol had, epic → parts:

- a **top-level space** is what was an epic, with the same id (the epic's slug);
- its **child spaces** are what were its parts, with the same ids (the part ids);
- anything deeper is new, and has no epic or part spelling of its own.

So whatever a module keyed by an epic's slug, or by a part's id, still names the same thing.

## What a module is told

`context.space` is where the person stands:

```ts
{ id: 'errors', path: [{ id: 'auth', name: 'Auth' }, { id: 'login', name: 'Login' }, { id: 'errors', name: 'Errors' }], picked: [] }
```

- `id` is the picked space, the last step of `path`.
- `path` runs from the top-level space down, with names to draw (`spaceSaid(path)` → `Auth › Login › Errors`).
- `picked` is several children picked out together (what "pick several parts" was). One picked child is
  never sent this way: the host stands in that child.
- `null`: no space open, "All spaces", or a host before 2.89.0.

`context.epic` and `context.parts` are still filled, by the one mapping `epicPartsOf(space)`:

| The person stands in | `epic` | `parts` (picked) |
| --- | --- | --- |
| a top-level space | its id | none |
| a top-level space, several children picked | its id | those children |
| a depth-2 space | its top-level space | that space |
| anything deeper | its top-level space | its depth-2 ancestor |

A module that reads only `epic` and `parts` therefore keeps working; inside a deep space it shows what
the depth-2 ancestor holds, which is wider than the space but never wrong.

## Narrowing by space, going forward

Narrow by the **subtree**: what belongs to the picked space or to any space under it.

```ts
import { spaceWithin } from 'kehikot-module-protocol'

const shown = items.filter((item) => spaceWithin(context.space, item.space))
```

`spaceWithin(selected, candidate)` compares ids along the path: the candidate is in when the selected
path is a prefix of its path, and, with children picked, when it is at or under one of them. A null
selection is the whole project. Compare paths, never a bare id: ids that came from parts of two epics
can repeat (`auth/login` and `billing/login`); a space a host makes is given an id unique in the whole
tree (`spaceIdFor`).

Keep what you file under a space by its **path of ids** (`spaceIdsOf(context.space)`), or by its id
when you also keep which top-level space it is in. A move in the tree keeps every id, so keying by id
survives a move; keying by path follows it if you re-read the path.

Until a module does this, it is told epic and parts as above. A module that keeps data per part keeps
finding it at depth 2, and deeper spaces read as their depth-2 ancestor.

## Places, jumps and doors

Every place that carried `epic` and `parts` may carry `space` beside them, as a path of ids, with the
epic it is in — its first id is the place's `epic` (`spaceGoesWithEpic`):

- `place` on a notification line and an activity item, `view.goto`, a message's `to.place`;
- the place of a conversation (`doorPlaceSchema.space`, `lookingSchema.space`, `recordedPlaceResult`);
- adopting an Inbox item (`inbox.adopt` `space`; `inbox.adoption` answers the tree in `spaces`).

Send `epic` and `parts` too (`epicPartsOf`): a host before 2.89.0 strips `space` and goes there.

A door takes a `space` argument (`DOOR_SPACE_ARGUMENT`) beside `project` and `epic`: a path of ids
(`["auth", "login"]` or `"auth/login"`) or one id. `doorSpace(args)` reads it; `findSpace(tree, asked)`
resolves it, and refuses an id that names two spaces by listing their paths. `placeSpaceDefaults` is
`placeDefaults` with the session's space (`space`, a path of ids) and an unresolved bare id (`spaceId`).

## The tree

`spaceTreeSchema` is a whole tree: `[{ id, name, children }]`, siblings in order, no two siblings with
one id. `nodeAt`, `spaceAt` and `spaceOf` read a path out of it; `spaceFromEpicParts` and `spaceAgrees`
read an older place against it.
