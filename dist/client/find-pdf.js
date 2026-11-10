/**
 * 2.73.0. Find in a PDF drawn with a text layer (pdf.js's `TextLayer`, or anything like it): the
 * client's own search (`pageFind`) reads the words a text layer lays over each sheet, so it finds them
 * with no code — but only on the sheets that have their layer, and a viewer that keeps its work to
 * the pages near the view lays the layer on those alone. This is the rest: while the host's find bar
 * is open the page lays every sheet's layer (`open()` tells it, `subscribe` says when that changes),
 * and the search waits until every sheet has one, or `within` passes, before the client reads the
 * page. Structural only: it never imports pdf.js, it looks for elements.
 *
 * ```ts
 * const pdfFind = pdfTextLayerFind()
 * connect({ onFind: pdfFind.onFind })
 * // in the sheet: const laid = near || useSyncExternalStore(pdfFind.subscribe, pdfFind.open)
 * ```
 *
 * Design notes: docs/find.md, "Adapters".
 */
/** The class pdf.js gives a sheet's text layer. */
export const PDF_TEXT_LAYER = '.textLayer';
/** How long a search waits for every sheet's text layer before it reads what is there, in milliseconds. */
export const PDF_LAID_OUT_WITHIN_MS = 4000;
/** How often the wait looks again, in milliseconds. */
export const PDF_LAID_OUT_EVERY_MS = 50;
export function pdfTextLayerFind(options = {}) {
    const sheet = options.sheet ?? '.pdf-page';
    const layer = options.layer ?? PDF_TEXT_LAYER;
    const within = options.within ?? PDF_LAID_OUT_WITHIN_MS;
    const every = options.every ?? PDF_LAID_OUT_EVERY_MS;
    const rootOf = () => options.root?.() ?? (typeof document === 'undefined' ? null : document);
    let isOpen = false;
    const hearers = new Set();
    const set = (next) => {
        if (next === isOpen)
            return;
        isOpen = next;
        for (const heard of [...hearers])
            heard();
    };
    const done = () => {
        const root = rootOf();
        if (!root)
            return true;
        for (const page of Array.from(root.querySelectorAll(sheet)))
            if (!page.querySelector(layer))
                return false;
        return true;
    };
    const laidOut = () => new Promise((resolve) => {
        if (done())
            return resolve();
        const started = Date.now();
        const look = setInterval(() => {
            if (!done() && Date.now() - started < within)
                return;
            clearInterval(look);
            resolve();
        }, every);
    });
    return {
        async onFind(_query, ask) {
            if (ask.direction === 'close') {
                set(false);
                return;
            }
            if (!isOpen) {
                set(true);
                await laidOut();
            }
            return 'default';
        },
        open: () => isOpen,
        subscribe(heard) {
            hearers.add(heard);
            return () => void hearers.delete(heard);
        },
        laidOut,
        close: () => set(false),
    };
}
