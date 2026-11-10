# Find

A person presses ⌘F (Ctrl+F off a Mac) in any container and gets the same bar: an input, `3 of
17`, previous and next, case, close. The host draws the bar; the module's page does the searching.
Added in 2.69.0. Source: `src/find.ts` (the messages' parts and the one matching rule),
`src/messages.ts` (`findSchema`, `findResultSchema`, `findOpenSchema`), `src/client/find.ts` (the
client's own search) and `src/client/connect.ts` (the keys and the wiring).

## Overview

### Why it is split this way

A module is a cross-origin frame: the host cannot read the text inside it. A desktop shell built on
WKWebView has no native find bar either, so without this ⌘F does nothing at all. Only the page can
see its text, and only the host can draw one bar that looks the same in every container. So:

- the host draws the bar and sends `kehikot.find` for every change of the query or an option
  (`direction: 'first'`), for previous and next (`prev`, `next`), and once with `close` when the
  bar closes;
- the page answers each one with `kehikot.find.result`: `total` and `current` (1-based, 0 when
  there are none), or `unsupported: true` when it cannot search what it shows. It sends another,
  with the same `id`, when what it shows changes while the bar is open and the count moved;
- a key pressed inside a frame never reaches the host, so the page asks for the bar on ⌘F with
  `kehikot.find.open` (carrying its selected text, when there is a short one, to search for), and
  on ⌘G and ⇧⌘G with `step: 'next'` or `'prev'`.

`id` pairs a result with its find. A host draws only the result for its latest `id`, so a slow
answer to an older query never overwrites a newer one.

### What a module has to do: usually nothing

`connect` (and so `hostStore` and `useHost`) does all of it when the greeting says `find: true`:

- it hears ⌘F and ⌘G on the page's window, in the bubble phase, and sends `kehikot.find.open`;
- it answers `kehikot.find` by searching the page's **visible text** (`pageFind`): it walks the text
  nodes under `document.body`, skipping what is not drawn (`checkVisibility`), scripts, styles,
  fields and anything under `data-kehikot-find-skip`; finds the matches with `findMatches` — a match
  may span text nodes (`<b>Find</b>er`); marks them with the CSS Custom Highlight API
  (`CSS.highlights`, names `kehikot-find` and `kehikot-find-current`), which changes nothing in the
  DOM, or, in an engine without it, by wrapping each match in `<mark data-kehikot-find>`; and
  scrolls the current match into view;
- while the bar is open it watches the page and searches again, debounced (`FIND_RECOUNT_MS`), when
  the page changes, and says the new count without scrolling;
- on `close` it clears every mark.

A fresh search (`first`) goes to the first match at or below the top of what is on screen, as a
browser's find does; `next` and `prev` wrap.

The colours are put in a `<style id="kehikot-find-style">` once (`FIND_CSS`). A page styles them its
own way with its own `::highlight(kehikot-find)` and `::highlight(kehikot-find-current)` rules.

### When the text is not in the DOM: `onFind`

A terminal (its rows are drawn to a canvas, its scrollback is a buffer), a canvas, a virtualised
list that renders only what is on screen, a PDF viewer, an editor with its own search: there the
client's search would find nothing, or not everything. Such a page gives `onFind`:

```ts
useHost(ID, {
  onFind: (query, { caseSensitive, wholeWord, direction }) => {
    if (direction === 'close') return search.clear()
    const found = direction === 'prev' ? search.previous(query, { caseSensitive, wholeWord }) : search.next(query, { caseSensitive, wholeWord })
    return { total: found.count, current: found.index + 1 }
  },
})
```

It returns the count, `'unsupported'`, `'default'` (leave this one to the client's search after
all), or nothing — and then says the count with `findResult` when it has it. A search whose count
changes by itself (new output arriving under an open search) calls `findResult` again. `findMatches`
and `stepMatch` are the client's own rules, for a page that searches a buffer of its own text.

### Keeping ⌘F

An editor that binds its own find keeps it two ways:

- its own key handler calls `preventDefault()` on ⌘F: the client hears keys in the bubble phase and
  leaves a key a page took alone;
- or the page passes `findKeys: false` to `connect` (`useHost`'s options): the client hears no keys.

The host's bar still opens from the host (⌘F in the host's chrome on a picked container), and still
reaches `onFind`, which may hand the query to the editor's search.

`findIn: false` turns the client's own search off: a page with no `onFind` then answers
`unsupported`.

### Adapters

A page whose text is in the DOM but not all of it at once needs only the wait, and that is shared,
under `kehikot-module-protocol/client/find` (`src/client/find-adapters.ts`), structural only:

- **`pdfTextLayerFind`**: a PDF viewer that lays pdf.js's text layer only on the sheets near the view.
  While the bar is open `open()` is true, so the sheet lays its layer whatever its distance
  (`useSyncExternalStore(pdfFind.subscribe, pdfFind.open)`); `onFind` waits until every sheet has its
  layer, or `PDF_LAID_OUT_WITHIN_MS`, and answers `'default'`, so `pageFind` searches the whole PDF.

```ts
import { pdfTextLayerFind } from 'kehikot-module-protocol/client/find'
const pdfFind = pdfTextLayerFind()
useHost({ onFind: pdfFind.onFind })
```

- **`xtermFind`** (2.74.0): a terminal. Its rows are drawn to a canvas and its scrollback is a buffer,
  so it searches through `@xterm/addon-search`, read by structural types (no xterm dependency): the
  screen and the scrollback, steps that wrap, case and whole words, every match and the current one
  marked, the count (and a count new output changed, through `onCount`), and the marks and selection
  cleared on `close`. Colours default to `xtermFindColours(theme)`; `decorations` gives the page's own.
  A module that shows one of several terminals, or none yet, hands `useHost` a `findSlot()`'s steady
  `onFind`, and the terminal on screen sets `slot.current` (an empty slot answers `unsupported`).

```ts
import { findSlot, xtermFind } from 'kehikot-module-protocol/client/find'
const terminal = new Terminal({ allowProposedApi: true }) // the addon's marks are decorations
const search = new SearchAddon()
terminal.loadAddon(search)
const find = xtermFind(search, terminal, { onCount: host.findResult, theme: () => host.theme })
useHost(ID, { onFind: find })   // and find.dispose() when the terminal goes
```

An editor with its own find (CodeMirror) keeps it: mark it `data-kehikot-find-skip` and its key
handler takes ⌘F first (see "Keeping ⌘F").

### Older on either side

A host before 2.69.0 greets with no `find`: the client hears no keys (a browser's own find may answer
them) and searches nothing. A module before 2.69.0 drops `kehikot.find` unread (`HOST_MESSAGES`), so
a host that hears no result within a moment says the module cannot be searched yet.

## Notes by symbol

### `find.ts`

- **`FIND_DIRECTIONS`**: `first`, `next`, `prev`, `close`. `close` is in the list rather than a
  message of its own so one listener hears the whole life of a search.
- **`findMatches(text, query, options)`**: non-overlapping `[start, end)` offsets. Case folds with
  `toLowerCase`; when folding changes a string's length the search is exact rather than misplaced.
  A whole word has no letter, digit or underscore (Unicode) on either side, or begins or ends at
  one of `breaks` (2.69.1): where two elements' text meets side by side with nothing between them
  in the string (`<span>#12</span><span>Migrate</span>`). Text inside an element in a run of text
  (`Re<b>find</b>ing`) is one run with it.
- **`stepMatch(current, total, direction, start)`**: the 0-based current match after a step, -1
  for none.
- **`findSaid(result, query)`**: `3 of 17`, `No results`, or nothing — the words a host draws.

### `messages.ts`

- **`findSchema`**: `query` at most `LIMITS.FIND_QUERY` (256); an empty query matches nothing and
  clears the marks. `caseSensitive` and `wholeWord` default to off.
- **`findResultSchema`**: `current` is never past `total`.
- **`findOpenSchema`**: `query` only for a selection that is short and on one line.
- **`helloSchema.find`**: whether the host draws the bar.

### `client/find.ts`

- **`pageFind(onRecount, options)`**: `run(query, options, direction)` and `close()`. At most
  `FIND_MARK_MAX` matches are marked. `root`, `visible` and `highlights` are injectable for tests.

### `client/find-xterm.ts` (`client/find`)

- **`xtermFind(search, terminal, options)`**: `incremental` on `first`; another case or word rule
  clears the marks first, since the addon keeps them while the query is the same.
- **`findSlot()`**: `current` is a ref, so a React `useRef`-shaped slot can be handed down as one.

### `client/connect.ts`

- **`HostEvents.onFind`**, **`Connection.findResult`**, **`ConnectOptions.findKeys`**, **`findIn`**,
  **`mac`**, **`HostFacts.find`**.
