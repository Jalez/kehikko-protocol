import { findMatches, stepMatch } from '../find.js';
/**
 * 2.69.0. The page client's own search, for a page whose text is in the DOM: the default answer to
 * `kehikot.find` when a page gives no `onFind`, so a module with plain text is searchable with no
 * code at all.
 *
 * It walks the visible text under the root, finds the matches with `findMatches` (a match may span
 * several text nodes: `<b>Find</b>er`), marks them with the CSS Custom Highlight API
 * (`CSS.highlights`, which changes nothing in the DOM) or, where that is missing, by wrapping each
 * match in a `<mark data-kehikot-find>`, and scrolls the current match into view. While a search is
 * open it watches the root and searches again, debounced, when the page changes, and says the new
 * count (`onRecount`) without scrolling. `close` clears every mark.
 *
 * A page whose text is not in the DOM (a terminal, a canvas, a virtualised list) answers `onFind`
 * itself; this would find nothing there. Design notes: docs/find.md.
 */
/** The names the marks are registered under in `CSS.highlights`, for a page that styles them itself. */
export const FIND_HIGHLIGHT = 'kehikot-find';
export const FIND_HIGHLIGHT_CURRENT = 'kehikot-find-current';
/** The attribute on a fallback `<mark>`; the current match's also carries `data-current`. */
export const FIND_MARK_ATTRIBUTE = 'data-kehikot-find';
/** An element (and everything under it) the search skips: a page's own chrome, say. */
export const FIND_SKIP_ATTRIBUTE = 'data-kehikot-find-skip';
/** The `<style>` the marks' colours are put in, once per document. */
export const FIND_STYLE_ID = 'kehikot-find-style';
/** How long the page must be still before a search runs again after it changed, in milliseconds. */
export const FIND_RECOUNT_MS = 200;
/** At most this many matches are marked; the count says how many there are past it. */
export const FIND_MARK_MAX = 10_000;
/** The colours, plain so every engine draws them; a page overrides them with its own rules. */
export const FIND_CSS = `::highlight(${FIND_HIGHLIGHT}){background-color:rgba(255,213,0,.45);color:inherit}
::highlight(${FIND_HIGHLIGHT_CURRENT}){background-color:#ff9632;color:#000}
mark[${FIND_MARK_ATTRIBUTE}]{background-color:rgba(255,213,0,.45);color:inherit;padding:0;border-radius:0}
mark[${FIND_MARK_ATTRIBUTE}][data-current]{background-color:#ff9632;color:#000}`;
/* Never text a person reads as the page: code, styles, templates, and a field's own text. */
const SKIPPED = 'script,style,noscript,template,textarea,select,option,[hidden],[' + FIND_SKIP_ATTRIBUTE + ']';
function registry() {
    const css = globalThis.CSS;
    const Highlight = globalThis.Highlight;
    if (!css?.highlights || typeof Highlight !== 'function')
        return null;
    return { registry: css.highlights, Highlight };
}
function defaultVisible(element) {
    const el = element;
    if (typeof el.checkVisibility === 'function')
        return el.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: false });
    return typeof el.getClientRects !== 'function' || el.getClientRects().length > 0;
}
/**
 * Build the page's search. Nothing is read or marked until `run`; `onRecount` hears the count
 * again when the page changed under an open search.
 */
export function pageFind(onRecount, options = {}) {
    const doc = typeof document === 'undefined' ? null : document;
    const rootOf = () => options.root ?? doc?.body ?? null;
    const visible = options.visible ?? defaultVisible;
    const recountAfter = options.recountAfter ?? FIND_RECOUNT_MS;
    let query = '';
    let opts = { caseSensitive: false, wholeWord: false };
    let ranges = [];
    let marks = [];
    let current = -1;
    let total = 0;
    let observer = null;
    let timer = null;
    const native = () => options.highlights === false ? null : typeof options.highlights === 'object' ? options.highlights : registry();
    const styled = () => {
        if (!doc || doc.getElementById(FIND_STYLE_ID))
            return;
        const style = doc.createElement('style');
        style.id = FIND_STYLE_ID;
        style.textContent = FIND_CSS;
        (doc.head ?? doc.documentElement).appendChild(style);
    };
    /* The visible text under the root, as one string, with where each text node starts in it. */
    const collect = () => {
        const root = rootOf();
        if (!doc || !root)
            return { text: '', segments: [], breaks: new Set() };
        const shown = new Map();
        const isShown = (element) => {
            if (!element)
                return true;
            const known = shown.get(element);
            if (known !== undefined)
                return known;
            const answer = !element.closest(SKIPPED) && visible(element);
            shown.set(element, answer);
            return answer;
        };
        const segments = [];
        /* 2.69.1. Where two pieces of text meet with nothing between them that the page did not draw as
           one run: a whole word may begin or end there. Two text nodes are one run when one's element
           holds the other's (`Find <b>this</b> now`); side by side (`<span>#12</span><span>Fix</span>`,
           a PDF's text runs), they are two. */
        const breaks = new Set();
        let before = null;
        let text = '';
        const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const value = node.nodeValue ?? '';
            if (!value)
                continue;
            const parent = node.parentElement;
            if (!isShown(parent))
                continue;
            if (before && parent && before !== parent && !before.contains(parent) && !parent.contains(before))
                breaks.add(text.length);
            before = parent;
            segments.push({ node, start: text.length });
            text += value;
        }
        return { text, segments, breaks };
    };
    /* Which segment holds `at` in the collected string; `end` takes the one before a boundary. */
    const segmentAt = (segments, at, end) => {
        let lo = 0;
        let hi = segments.length - 1;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            const start = segments[mid].start;
            if (start < at || (!end && start === at))
                lo = mid;
            else
                hi = mid - 1;
        }
        return lo;
    };
    const locate = (segments, at, end) => {
        const seg = segments[segmentAt(segments, at, end)];
        return [seg.node, at - seg.start];
    };
    const unmark = () => {
        const reg = native();
        reg?.registry.delete(FIND_HIGHLIGHT);
        reg?.registry.delete(FIND_HIGHLIGHT_CURRENT);
        if (marks.length) {
            quiet(() => {
                const parents = new Set();
                for (const pieces of marks) {
                    for (const mark of pieces) {
                        const parent = mark.parentNode;
                        if (!parent)
                            continue;
                        while (mark.firstChild)
                            parent.insertBefore(mark.firstChild, mark);
                        parent.removeChild(mark);
                        parents.add(parent);
                    }
                }
                for (const parent of parents)
                    parent.normalize();
            });
        }
        marks = [];
        ranges = [];
    };
    /* DOM changes of our own, unheard by the watcher. */
    const quiet = (change) => {
        observer?.disconnect();
        try {
            change();
        }
        finally {
            observer?.takeRecords?.();
            watch();
        }
    };
    const mark = (found, segments) => {
        const kept = found.slice(0, FIND_MARK_MAX);
        const reg = native();
        if (reg && doc) {
            ranges = kept.map(([from, to]) => {
                const range = doc.createRange();
                const [startNode, startOffset] = locate(segments, from, false);
                const [endNode, endOffset] = locate(segments, to, true);
                range.setStart(startNode, startOffset);
                range.setEnd(endNode, endOffset);
                return range;
            });
            reg.registry.set(FIND_HIGHLIGHT, new reg.Highlight(...ranges));
            return;
        }
        if (!doc)
            return;
        /* The fallback wraps: last match first, so the offsets of the ones before it stay true. */
        const wrapped = new Array(kept.length);
        quiet(() => {
            for (let i = kept.length - 1; i >= 0; i -= 1) {
                const [from, to] = kept[i];
                const pieces = [];
                for (let s = segmentAt(segments, to, true), first = segmentAt(segments, from, false); s >= first; s -= 1) {
                    const seg = segments[s];
                    const length = seg.node.nodeValue?.length ?? 0;
                    const a = Math.max(from, seg.start);
                    const b = Math.min(to, seg.start + length);
                    if (a >= b)
                        continue;
                    let node = seg.node;
                    if (b - seg.start < (node.nodeValue?.length ?? 0))
                        node.splitText(b - seg.start);
                    if (a - seg.start > 0)
                        node = node.splitText(a - seg.start);
                    const element = doc.createElement('mark');
                    element.setAttribute(FIND_MARK_ATTRIBUTE, '');
                    node.parentNode?.insertBefore(element, node);
                    element.appendChild(node);
                    pieces.unshift(element);
                }
                wrapped[i] = pieces;
            }
        });
        marks = wrapped;
    };
    const showCurrent = (scroll) => {
        const reg = native();
        if (reg) {
            reg.registry.delete(FIND_HIGHLIGHT_CURRENT);
            const range = ranges[current];
            if (!range)
                return;
            reg.registry.set(FIND_HIGHLIGHT_CURRENT, new reg.Highlight(range));
            if (scroll)
                bringIntoView(range.startContainer.parentElement, range);
            return;
        }
        marks.forEach((pieces, i) => {
            for (const piece of pieces) {
                if (i === current)
                    piece.setAttribute('data-current', '');
                else
                    piece.removeAttribute('data-current');
            }
        });
        const first = marks[current]?.[0];
        if (first && scroll)
            bringIntoView(first, null);
    };
    /* The first match at or below the top of what is on screen: where a fresh search starts. */
    const firstOnScreen = () => {
        for (let i = 0; i < Math.max(ranges.length, marks.length); i += 1) {
            const rect = rectOf(ranges[i] ?? marks[i]?.[0] ?? null);
            if (!rect)
                return 0;
            if (rect.bottom >= 0)
                return i;
        }
        return 0;
    };
    const search = (direction) => {
        const was = current;
        unmark();
        const { text, segments, breaks } = collect();
        const found = findMatches(text, query, opts, breaks);
        total = found.length;
        if (!segments.length || !found.length) {
            current = -1;
            return;
        }
        styled();
        mark(found, segments);
        const kept = Math.min(found.length, FIND_MARK_MAX);
        current = direction === 'first' ? stepMatch(-1, kept, 'first', firstOnScreen()) : Math.min(Math.max(was, 0), kept - 1);
    };
    function watch() {
        const root = rootOf();
        if (!root || !query || typeof MutationObserver === 'undefined')
            return;
        observer ??= new MutationObserver(() => {
            if (timer)
                clearTimeout(timer);
            timer = setTimeout(recount, recountAfter);
        });
        observer.observe(root, { subtree: true, childList: true, characterData: true });
    }
    function recount() {
        timer = null;
        if (!query)
            return;
        const before = `${total}:${current}`;
        search('recount');
        showCurrent(false);
        if (`${total}:${current}` !== before)
            onRecount(count());
    }
    const count = () => ({ total, current: current < 0 ? 0 : current + 1 });
    return {
        run(nextQuery, nextOptions, direction) {
            const fresh = direction === 'first' || nextQuery !== query || nextOptions.caseSensitive !== opts.caseSensitive || nextOptions.wholeWord !== opts.wholeWord;
            query = nextQuery;
            opts = { caseSensitive: nextOptions.caseSensitive, wholeWord: nextOptions.wholeWord };
            if (!query) {
                this.close();
                return { total: 0, current: 0 };
            }
            if (fresh)
                search('first');
            else
                current = stepMatch(current, Math.min(total, FIND_MARK_MAX), direction);
            showCurrent(true);
            watch();
            return count();
        },
        close() {
            query = '';
            if (timer)
                clearTimeout(timer);
            timer = null;
            observer?.disconnect();
            observer = null;
            unmark();
            total = 0;
            current = -1;
        },
    };
}
function rectOf(target) {
    if (!target || typeof target.getBoundingClientRect !== 'function')
        return null;
    const rect = target.getBoundingClientRect();
    return rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0 ? null : rect;
}
/* Scroll the match into view when it is not already: its element first, then its scroller, to the middle. */
function bringIntoView(element, range) {
    if (!element)
        return;
    const view = typeof window === 'undefined' ? null : window;
    const height = view?.innerHeight ?? 0;
    const width = view?.innerWidth ?? 0;
    const inView = (rect) => !!rect && rect.top >= 0 && rect.bottom <= height && rect.left >= 0 && rect.right <= width;
    if (inView(rectOf(range ?? element)))
        return;
    element.scrollIntoView?.({ block: 'center', inline: 'nearest' });
    /* An element taller than the view (a long paragraph, a log) can be in view without its match being. */
    const rect = rectOf(range ?? element);
    if (!rect || inView(rect))
        return;
    for (let el = element.parentElement; el; el = el.parentElement) {
        if (el.scrollHeight <= el.clientHeight)
            continue;
        const box = el.getBoundingClientRect();
        el.scrollTop += rect.top - (box.top + el.clientHeight / 2);
        return;
    }
    view?.scrollBy?.(0, rect.top - height / 2);
}
