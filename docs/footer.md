# The footer: a status row the host draws (2.38.0)

What a module declares so that its status line, its counts, its meters and its few buttons appear in one row at the bottom of its container, drawn by the host in the same look as the header, instead of in a bar each module draws for itself. It is the [header](header.md)'s grammar applied to the bottom edge: the module owns every bit of state, sends the whole list, and the host draws it and reports a press.

The shapes are in `src/footer.ts` and `src/messages.ts`; the client is `Connection.footer`, `HostEvents.onPress` (with `place`), `HostFacts.footer`, and `footer` / `drawsFooter` on `hostStore` and `useHost`.

Back to the [index](README.md).

## What goes in the header, and what in the footer (2.47.0)

A container has two rows the host draws: the header at the top and the footer at the bottom. They answer two different questions, and a module that keeps them apart works in every way a person folds or hides them.

**The header says how the module is set up.** What it shows, and how:

- view switches, modes, layouts, sorting, filters and scope;
- toggles and settings that change behaviour;
- creating or starting things (a new item, a new session, a run) and menus of general actions;
- picking which thing is shown (a document, a list, a branch), when that is a choice rather than a readout.

**The footer says what is going on now.** Live readouts about the thing on screen, and the actions that act directly on one of them:

- status and state: context or usage meters, model, cost, counts, progress, sync or compile state, errors, "last updated";
- where you are inside the content: the current location or address, page or stage x of y, the selected item's identity;
- an action tied to a readout beside it: Compact or Clear beside the context meter, Back, Forward and Reload beside the address, Retry beside an error, Next and Previous beside a stage counter.

Four tests for each item:

1. Would a person glance at it to KNOW something about the current state? The footer.
2. Would they press it to CHANGE how the module is set up, or to start something new? The header.
3. An action belongs in the footer only if it acts on a footer readout and sits beside it. Say which one with `actsOn` (2.47.0): the id of the `text`, `meter` or `input` it acts on. Otherwise it goes in the header.
4. Never put the same item in both rows. And leave nothing crucial drawn by your own page when a row can hold it: a module with state worth knowing (a count, a status, a location) should declare a footer.

**Why it matters.** A host folds a container to ONE row, the header alone, or to TWO rows, the header and the footer; the module's page is not drawn either way. One row has to be enough to see how the module is set up, and two rows enough to know how it is doing, so the footer carries the module's crucial at-a-glance state. A host may also hide both rows until the person points at the container or clicks into it, depending on that person's setting for it.

**Advice, never a refusal.** `rowsAdvice(header, footer)` returns one sentence per obvious misplacement: a `meter` in the header (which the header's schema refuses anyway, without saying where it belongs), a header label that reads as a readout (`41%`, `3 / 12`, `2 of 5`), a `switch` or `toggle` in the footer with no `actsOn`, and an `actsOn` that names no readout in the same footer. The client says each sentence once on the console when the page declares its rows; nothing is held back and nothing is refused.

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
| `input` (2.46.0) | one line the person types into | `label`, `value`, `placeholder`, `grow`, `agents` | submitted with Enter, with `text` |

Every item also has:

- `align`: `start` (default), `center` or `end`, the group it stands in. Items keep declaration order within a group.
- `optional`: the first to go when the row is narrow (below).
- `tooltip`: a sentence shown on hover and focus, for what the row has no room for.
- `actsOn` (2.47.0, the four pressable kinds): the id of the `text`, `meter` or `input` beside it that it acts on. A hint for the rule above, never checked as a refusal.

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
| `FOOTER_INPUT` | 2048 characters of a field's `value`, and of the `text` a press submits |
| `FOOTER_PLACEHOLDER` | 80 characters of a field's `placeholder` |
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

## A field to type into (2.46.0)

An address, a search, a filter: one line the person types into, drawn by the host in the row.

```ts
host.footer([
  { kind: 'run', id: 'back', label: 'Back', icon: 'arrow-left' },
  { kind: 'input', id: 'address', label: 'Address', value: 'https://example.com/', placeholder: 'Type an address', grow: true },
  { kind: 'run', id: 'reload', label: 'Reload', icon: 'refresh', align: 'end' },
])
```

| field | is |
|---|---|
| `id` | the item's id, as for every item |
| `label` | the field's accessible name (`Address`). Not drawn beside the field |
| `value` | the text the module holds now; `''` by default |
| `placeholder` | what the empty field says |
| `grow` | take the width the row has left over. Without it the field keeps a modest width; either way it shrinks |
| `agents` | an agent may submit text into it through the host. False unless said |

**The module owns the text.** `value` is what it holds now; the host draws it whenever the person is
not typing.

- **While the field has focus**, what the person types is theirs: a new declaration with another
  `value` does not overwrite it.
- **Enter** submits: the host sends `kehikot.press` with `item`, `place: 'footer'` and `text` (what is in
  the field, whole, possibly empty), and moves focus to the module's page, as after a header press.
  The module does what the text asks and declares the footer again with the `value` it now holds.
- **Escape** puts `value` back in the field and leaves the focus where it is.
- **Leaving the field** without Enter shows `value` again: nothing is sent.

```ts
const host = useHost(ID, {
  onPress: ({ item, place, text }) => {
    if (place === 'footer' && item === 'address' && text !== undefined) return go(text)
  },
})
```

Keys typed in the field are the field's: a host binds none of its own chords while it has focus.

`text` is a stranger's string to the module, as `value` is to the host: neither side treats it as
markup, and a host opens nothing from it. The module decides what the text means.

**Does the host draw it?** A host before 2.46.0 refuses a footer naming a kind it does not know, so the
whole row would go. The greeting says which kinds a host draws: `hello.footerKinds`, absent from a host
before 2.46.0, which draws the 2.38.0 kinds (`FOOTER_KINDS_2_38`). Ask `footerDraws`:

```ts
const { drawsFooter, footerKinds } = useHost(ID, { … })
if (footerDraws({ footer: drawsFooter, footerKinds }, 'input')) declareTheFieldInTheFooter()
else drawYourOwnField()
```

**Fit.** A field stays in the row at every width, shrinking, unless it is `optional`: then it goes with
the optional texts and meters under `FOOTER_ICONS_BELOW`. It is never in "⋯".

**Agents.** A field marked `agents: true` may be submitted by an agent through the host's door, with the
text to submit; `footerPressRefusal` refuses a field's press that carries no `text`.

## Fit: one row at every width

The footer is one row, as the header is, at every container width a person drags it to. `footerLayout(items, width)` is the rule, the same for every host; it uses the header's widths:

1. **Always.** The gaps close first, and every text is cut with an ellipsis, whole in its tooltip.
2. **Under `FOOTER_ICONS_BELOW` (300 px).** An `optional` text or meter is not drawn; an `optional` pressable item moves into the row's "⋯" menu; a pressable item with an icon is drawn as the icon alone (its label is its tooltip and accessible name); a meter loses its label and keeps its bar and value.
3. **Under `FOOTER_MERGE_BELOW` (220 px).** Every pressable item is in "⋯", the centre group joins the left, only the first text stays, and only the meters that are not optional.

Nothing pressable is lost: an item not in the row is in "⋯". A field (2.46.0) stays in the row unless it is `optional`. A host may be stricter than this, but never wraps the footer to a second row.

## Does the host draw it?

The greeting says: `hello.footer` is `true` when the host draws the module's declared footer, and absent from a host before 2.38.0, which does not. In the client it is `useHost().drawsFooter` (and `facts.footer` in `onHello`): `boolean | null`.

The rule:

- `drawsFooter === true`: declare the footer and draw none of your own.
- Anything else (`false`, or `null` from an older host or before the greeting): draw your own footer, and do not declare one.

So a module that moves to the declared footer keeps working in an older app. Unlike the header, there is no "hide after the first press" fallback: an older host never draws a footer at all.

## What a host does

1. **Read `kehikot.footer`** beside the header, and drop it with the frame that sent it. An older host drops the type without a word (it is in neither list it knows).
2. **Draw** one row at the bottom of the container, in the header's look, laid out by `footerLayout` at the container's measured width; no row for a module that declared nothing or `[]`.
3. **Send `kehikot.press`** with `place: 'footer'`, only for a pressable item in the last footer and only when `footerPressRefusal` is `null`; arm a `confirm` run on the first press; time out. For a field (2.46.0), on Enter, with `text`.
4. **Say `footer: true`** in the greeting, and (2.46.0) `footerKinds`: the kinds it draws.
