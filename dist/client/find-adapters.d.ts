/**
 * `kehikot-module-protocol/client/find`: find adapters for a page whose text the client's own search
 * (`pageFind`, 2.69.0) cannot reach by itself. Structural only — none imports the library it adapts.
 * Design notes: docs/find.md, "Adapters".
 */
export { PDF_LAID_OUT_EVERY_MS, PDF_LAID_OUT_WITHIN_MS, PDF_TEXT_LAYER, pdfTextLayerFind, type PdfTextLayerFind, type PdfTextLayerFindOptions, } from './find-pdf.js';
export { xtermFind, xtermFindColours, findSlot, type XtermFind, type XtermFindOptions, type XtermFindDecorations, type XtermSearch, type XtermSearchOptions, type XtermSelectable, type FindSlot, } from './find-xterm.js';
