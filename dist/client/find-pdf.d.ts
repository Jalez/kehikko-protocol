import type { FindAnswer, FindAsk } from './connect.js';
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
export declare const PDF_TEXT_LAYER = ".textLayer";
/** How long a search waits for every sheet's text layer before it reads what is there, in milliseconds. */
export declare const PDF_LAID_OUT_WITHIN_MS = 4000;
/** How often the wait looks again, in milliseconds. */
export declare const PDF_LAID_OUT_EVERY_MS = 50;
export interface PdfTextLayerFindOptions {
    /** Where the sheets are. Default `document`. */
    root?: () => ParentNode | null | undefined;
    /** A selector for one sheet of the PDF. Default `'.pdf-page'`. */
    sheet?: string;
    /** A selector, inside a sheet, for its text layer. Default `PDF_TEXT_LAYER`. */
    layer?: string;
    /** How long to wait for every sheet's layer. Default `PDF_LAID_OUT_WITHIN_MS`. */
    within?: number;
    /** How often to look while waiting. Default `PDF_LAID_OUT_EVERY_MS`. */
    every?: number;
}
export interface PdfTextLayerFind {
    /** The page's `onFind`: lays every sheet's text out, waits for it, then leaves the search to the client. */
    onFind: (query: string, ask: FindAsk) => Promise<FindAnswer>;
    /** Whether the find bar is open, so every sheet should have its text layer. */
    open: () => boolean;
    /** Hear `open` change (the shape `useSyncExternalStore` takes); returns the unsubscribe. */
    subscribe: (heard: () => void) => () => void;
    /** Resolves once every sheet has its text layer, or after `within` with whatever is laid out. */
    laidOut: () => Promise<void>;
    /** Close it from the page's side (a document swapped, say), as the bar's close would. */
    close: () => void;
}
export declare function pdfTextLayerFind(options?: PdfTextLayerFindOptions): PdfTextLayerFind;
