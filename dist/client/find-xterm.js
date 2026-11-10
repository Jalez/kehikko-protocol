/** The marks' default colours for a theme: the same yellow and orange as the client's own page search. */
export function xtermFindColours(theme) {
    return theme === 'dark'
        ? { matchBackground: '#5c4d14', activeMatchBackground: '#c2741a', matchOverviewRuler: '#a08a2a', activeMatchColorOverviewRuler: '#ff9632' }
        : { matchBackground: '#ffe48a', activeMatchBackground: '#ff9632', matchOverviewRuler: '#d9b200', activeMatchColorOverviewRuler: '#ff7a00' };
}
const NONE = { total: 0, current: 0 };
/**
 * `xtermFind(search, terminal, options?)`: the `onFind` for a terminal. `first` searches as a query
 * is typed (keeping the match it is on while that still matches), `next` and `prev` step and wrap,
 * case and whole words narrow it, `close` (or an empty query) clears every mark and the selection.
 * The whole buffer is searched, scrollback included.
 */
export function xtermFind(search, terminal, options = {}) {
    let answering = false;
    let last = NONE;
    /* The rule the marks are for: the addon keeps its marks while the query is the same, so another case or word rule clears them first. */
    let marked = '';
    const listening = search.onDidChangeResults(({ resultIndex, resultCount }) => {
        last = { total: resultCount, current: resultIndex < 0 || resultCount === 0 ? 0 : resultIndex + 1 };
        if (!answering)
            options.onCount?.(last);
    });
    const clear = () => {
        search.clearDecorations();
        terminal.clearSelection();
        last = NONE;
        marked = '';
    };
    const find = (query, ask) => {
        if (ask.direction === 'close') {
            clear();
            return;
        }
        if (!query) {
            clear();
            return NONE;
        }
        const searchOptions = {
            caseSensitive: ask.caseSensitive,
            wholeWord: ask.wholeWord,
            regex: false,
            incremental: ask.direction === 'first',
            decorations: options.decorations ? options.decorations() : xtermFindColours(options.theme?.() ?? 'light'),
        };
        const rule = `${ask.caseSensitive}:${ask.wholeWord}`;
        if (marked && marked !== rule)
            search.clearDecorations();
        marked = rule;
        answering = true;
        let found = false;
        try {
            found = ask.direction === 'prev' ? search.findPrevious(query, searchOptions) : search.findNext(query, searchOptions);
        }
        finally {
            answering = false;
        }
        if (!found)
            last = NONE;
        return last;
    };
    return Object.assign(find, { dispose: () => listening.dispose() });
}
export function findSlot() {
    const slot = {
        current: null,
        onFind: (query, ask) => (slot.current ? slot.current(query, ask) : ask.direction === 'close' ? undefined : 'unsupported'),
    };
    return slot;
}
