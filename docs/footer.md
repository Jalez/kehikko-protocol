# The footer: a status row the host draws (2.38.0)

What a module declares so that its status line, its counts, its meters and its few buttons appear in one row at the bottom of its container, drawn by the host in the same look as the header, instead of in a bar each module draws for itself. It is the [header](header.md)'s grammar applied to the bottom edge: the module owns every bit of state, sends the whole list, and the host draws it and reports a press.

The shapes are in `src/footer.ts` and `src/messages.ts`; the client is `Connection.footer`, `HostEvents.onPress` (with `place`), `HostFacts.footer`, and `footer` / `drawsFooter` on `hostStore` and `useHost`.

Back to the [index](README.md).

## The messages

| message | direction | carries | answered |
|---|---|---|---|
| `kehikot.footer` | module → host | `items`: every footer item, whole | no |
| `kehikot.press` | host → module | as for the header, with `place: 'footer'` | by `pressed` |
| `kehikot.pressed` | module → host | `id`, `ok`, `why` | — |

**The module owns all the state.** After every change, a press included, it declares the footer again. The host holds the last list per container and nothing else.

**Whole list, every time.** A declaration replaces the last one. `items: []` takes the footer away. The client remembers the last list and sends it again after every greeting, as it does for the header.

**A module that declares nothing gets nothing.** No message, no row: a host draws no empty footer.

## The kinds

```ts
host.footer([
  { kind: 'text', id: 'model', text: 'Opus · high' },
  { kind: 'meter', id: 'context', label: 'Context', value: 0.62, text: '124k / 200k', level: 'warn',
    tooltip: '124,000 of 200,000 tokens of context used.' },
  { kind: 'meter', id: 'usage', label: 'Usage', value: 0.3, align: 'center', optional: true },
  { kind: 'run', id: 'compact', label: 'Compact', icon: 'refresh', align: 'end', agents: true },
  { kind: 'run', id: 'clear', label: 'Clear', icon: 'x', align: 'end', confirm: true },
])
```

| kind | is | its own fields | pressable |
|---|---|---|---|
| `text` | a status line or a count | `text` (one line), `level` | no |
| `meter` | how full something is | `label`, `value` (0 to 1), `level`, `text` (instead of the percentage) | no |
| `switch` | one of several options | as in the header: `options`, `value` | yes, with the option's id |
| `toggle` | on or off | `checked` | yes, with the state wanted |
| `go` | a jump to one of several places | `options` | yes, with the option's id |
| `run` | an act | `state`, `result`, `disabled`, `confirm` | yes |

Every item also has:

- `align`: `start` (default), `center` or `end`, the group it stands in. Items keep declaration order within a group.
- `optional`: the first to go when the row is narrow (below).
- `tooltip`: a sentence shown on hover and focus, for what the row has no room for.

A footer `run` may also carry `copy` or `open` (2.40.0): the host writes the clipboard or opens the page itself in the person's click, then sends the press with `carried`. See [the header](header.md#acts-the-host-carries-out-2400).

The four pressable kinds are the header's, with the header's fields (`label`, `icon`, `shortcut`, `group`, `agents`, `tool`) and the same rules: option ids unique, a switch's `value` one of its options, `agents` never beside `tool` and never on a `confirm` run. A footer run is always a button, so `pinned` is stripped, and `surface` (full screen) stays the header's: it is stripped too.

`level` is `normal` (default), `warn` or `critical`. A host never says it with colour alone: a meter at `critical` carries a mark or a word as well as a colour.

**Everything is text.** Labels, texts, tooltips and results are a stranger's strings: a host draws them as text nodes, never as markup or a link, and opens no URL from one. `icon` is a name from [`HEADER_ICONS`](header.md#pinned-actions-160), never a path.

### Limits

| | |
|---|---|
| `FOOTER_ITEMS` | 16 items, over every kind |
| `FOOTER_TEXT` | 120 characters of a text |
| `FOOTER_METER_TEXT` | 24 characters of a meter's `text` |
| `FOOTER_TOOLTIP` | 240 characters of a tooltip |
| ids, labels, options, icons | the header's (`HEADER_ID`, `HEADER_LABEL`, …) |

Ids are unique within a footer. A footer id may repeat a header id: the press says which it meant.

## The press

A press on a footer item is the header's `kehikot.press` with `place: 'footer'`; an absent `place` is the header, as before. The client judges it against the footer as declared now (`footerPressRefusal`: the header's `pressRefusal` over the pressable items, and a sentence for a text or a meter), then calls the same `onPress`:

```ts
const host = useHost(ID, {
  onPress: ({ item, place }) => {
    if (place === 'footer' && item === 'compact') return compact()
  },
})
```

Who may press is said per item, exactly as in the header: `agents: true`, `tool`, or nobody but the person. A host's agent door may press a footer item marked `agents: true` and refuses the rest in the header's words.

## Fit: one row at every width

The footer is one row, as the header is, at every container width a person drags it to. `footerLayout(items, width)` is the rule, the same for every host; it uses the header's widths:

1. **Always.** The gaps close first, and every text is cut with an ellipsis, whole in its tooltip.
2. **Under `FOOTER_ICONS_BELOW` (300 px).** An `optional` text or meter is not drawn; an `optional` pressable item moves into the row's "⋯" menu; a pressable item with an icon is drawn as the icon alone (its label is its tooltip and accessible name); a meter loses its label and keeps its bar and value.
3. **Under `FOOTER_MERGE_BELOW` (220 px).** Every pressable item is in "⋯", the centre group joins the left, only the first text stays, and only the meters that are not optional.

Nothing pressable is lost: an item not in the row is in "⋯". A host may be stricter than this, but never wraps the footer to a second row.

## Does the host draw it?

The greeting says: `hello.footer` is `true` when the host draws the module's declared footer, and absent from a host before 2.38.0, which does not. In the client it is `useHost().drawsFooter` (and `facts.footer` in `onHello`): `boolean | null`.

The rule:

- `drawsFooter === true`: declare the footer and draw none of your own.
- Anything else (`false`, or `null` from an older host or before the greeting): draw your own footer, and do not declare one.

So a module that moves to the declared footer keeps working in an older app. Unlike the header, there is no "hide after the first press" fallback: an older host never draws a footer at all.

## What a host does

1. **Read `kehikot.footer`** beside the header, and drop it with the frame that sent it. An older host drops the type without a word (it is in neither list it knows).
2. **Draw** one row at the bottom of the container, in the header's look, laid out by `footerLayout` at the container's measured width; no row for a module that declared nothing or `[]`.
3. **Send `kehikot.press`** with `place: 'footer'`, only for a pressable item in the last footer and only when `footerPressRefusal` is `null`; arm a `confirm` run on the first press; time out.
4. **Say `footer: true`** in the greeting.
