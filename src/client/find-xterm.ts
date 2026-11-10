import type { FindAnswer, FindAsk } from './connect.js'
import type { FindCount } from '../find.js'

/**
 * 2.74.0. Find in a terminal: the host's find bar over an xterm.js emulator's screen AND its
 * scrollback, which only the emulator holds — its rows are drawn to a canvas, not text in the page,
 * so the client's own search (`pageFind`) finds nothing there. `@xterm/addon-search` does the
 * searching, marks every match with a decoration and the current one with another, and says the
 * count (`onDidChangeResults`); `xtermFind` is the one layer between it and `onFind`, so every
 * module that frames a terminal searches it the same way.
 *
 * The protocol takes no xterm dependency: the addon and the terminal are read through the few
 * members used here (`XtermSearch`, `XtermSelectable`), which `SearchAddon` and `Terminal` have.
 */

/** The marks' colours, in the addon's own words (`ISearchDecorationOptions`): xterm paints them and does not read the page's CSS. */
export interface XtermFindDecorations {
  matchBackground?: string
  matchBorder?: string
  matchOverviewRuler: string
  activeMatchBackground?: string
  activeMatchBorder?: string
  activeMatchColorOverviewRuler: string
}

/** The options a search is run with (`ISearchOptions`). */
export interface XtermSearchOptions {
  caseSensitive?: boolean
  wholeWord?: boolean
  regex?: boolean
  incremental?: boolean
  decorations?: XtermFindDecorations
}

/** What of `@xterm/addon-search`'s `SearchAddon` a search needs. Load the addon into a terminal made with `allowProposedApi: true`: its marks are decorations. */
export interface XtermSearch {
  findNext(term: string, options?: XtermSearchOptions): boolean
  findPrevious(term: string, options?: XtermSearchOptions): boolean
  clearDecorations(): void
  onDidChangeResults(listener: (event: { resultIndex: number; resultCount: number }) => void): { dispose(): void }
}

/** What of the emulator a search needs besides the addon: taking its selection (the current match) away on close. */
export interface XtermSelectable {
  clearSelection(): void
}

export interface XtermFindOptions {
  /**
   * A count that changed by itself under an open search — new output arrived — to say to the host:
   * `findResult` from `useHost`, `hostStore` or the connection. A count a search asked for is
   * returned instead, never said twice.
   */
  onCount?: (count: FindCount) => void
  /** The theme the marks are drawn for, read at each search (so a theme change takes effect on the next one). Light by default. */
  theme?: () => 'light' | 'dark'
  /** Colours of the page's own, read at each search, in place of `xtermFindColours(theme())`. */
  decorations?: () => XtermFindDecorations
}

/** An `onFind` listener for one terminal, and `dispose` to stop hearing its counts when the terminal goes. */
export type XtermFind = ((query: string, ask: FindAsk) => FindAnswer) & { dispose(): void }

/** The marks' default colours for a theme: the same yellow and orange as the client's own page search. */
export function xtermFindColours(theme: 'light' | 'dark'): XtermFindDecorations {
  return theme === 'dark'
    ? { matchBackground: '#5c4d14', activeMatchBackground: '#c2741a', matchOverviewRuler: '#a08a2a', activeMatchColorOverviewRuler: '#ff9632' }
    : { matchBackground: '#ffe48a', activeMatchBackground: '#ff9632', matchOverviewRuler: '#d9b200', activeMatchColorOverviewRuler: '#ff7a00' }
}

const NONE: FindCount = { total: 0, current: 0 }

/**
 * `xtermFind(search, terminal, options?)`: the `onFind` for a terminal. `first` searches as a query
 * is typed (keeping the match it is on while that still matches), `next` and `prev` step and wrap,
 * case and whole words narrow it, `close` (or an empty query) clears every mark and the selection.
 * The whole buffer is searched, scrollback included.
 */
export function xtermFind(search: XtermSearch, terminal: XtermSelectable, options: XtermFindOptions = {}): XtermFind {
  let answering = false
  let last: FindCount = NONE
  /* The rule the marks are for: the addon keeps its marks while the query is the same, so another case or word rule clears them first. */
  let marked = ''
  const listening = search.onDidChangeResults(({ resultIndex, resultCount }) => {
    last = { total: resultCount, current: resultIndex < 0 || resultCount === 0 ? 0 : resultIndex + 1 }
    if (!answering) options.onCount?.(last)
  })

  const clear = () => {
    search.clearDecorations()
    terminal.clearSelection()
    last = NONE
    marked = ''
  }

  const find = (query: string, ask: FindAsk): FindAnswer => {
    if (ask.direction === 'close') {
      clear()
      return
    }
    if (!query) {
      clear()
      return NONE
    }
    const searchOptions: XtermSearchOptions = {
      caseSensitive: ask.caseSensitive,
      wholeWord: ask.wholeWord,
      regex: false,
      incremental: ask.direction === 'first',
      decorations: options.decorations ? options.decorations() : xtermFindColours(options.theme?.() ?? 'light'),
    }
    const rule = `${ask.caseSensitive}:${ask.wholeWord}`
    if (marked && marked !== rule) search.clearDecorations()
    marked = rule
    answering = true
    let found = false
    try {
      found = ask.direction === 'prev' ? search.findPrevious(query, searchOptions) : search.findNext(query, searchOptions)
    } finally {
      answering = false
    }
    if (!found) last = NONE
    return last
  }
  return Object.assign(find, { dispose: () => listening.dispose() })
}

/**
 * 2.74.0. A place for whichever search is on screen now — a module that shows one of several
 * terminals, or none yet. `onFind` is steady, for `useHost`; whoever is on screen sets `current`
 * (it is a ref, so a React `useRef` slot can be handed to a view as one) and clears it when it goes.
 * With nothing in it the bar is told `unsupported`, and a close is nothing.
 */
export interface FindSlot {
  current: ((query: string, ask: FindAsk) => FindAnswer | Promise<FindAnswer>) | null
  readonly onFind: (query: string, ask: FindAsk) => FindAnswer | Promise<FindAnswer>
}

export function findSlot(): FindSlot {
  const slot: FindSlot = {
    current: null,
    onFind: (query, ask) => (slot.current ? slot.current(query, ask) : ask.direction === 'close' ? undefined : 'unsupported'),
  }
  return slot
}
