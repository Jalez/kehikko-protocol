/**
 * 2.70.0. The kept view: what every container keeps without its module writing a line — where its
 * page was scrolled to, and which option each of its header's switches and toggles was on — in the
 * same string the host keeps for the container (`state.set`, `context.kept`, `LIMITS.MODULE_STATE`).
 * Design notes: docs/client.md, "What every container gets by default (2.70.0)".
 *
 * The module's own kept state is not touched: the string is an envelope, `KEPT_VIEW_MARK` and then
 * `{"view":…,"state":…}`, with the module's own string as it wrote it under `state`. A string without
 * the mark is the module's own, whole, as before 2.70.0, and is what is written while the view is
 * empty. A client before 2.70.0 reading an envelope finds something its codec does not recognise and
 * starts as a first run: nothing is misread.
 */
/** What starts an envelope. No JSON value, and no string a codec wrote before 2.70.0, starts with it. */
export declare const KEPT_VIEW_MARK = "kehikot.view/1:";
/** The attribute that names a page's main scroller, when it is not the document itself. */
export declare const KEEP_SCROLL_ATTRIBUTE = "data-kehikot-scroll";
/** How long, in ms, after the last scroll the position is kept: a scroll is many events and one write. */
export declare const KEEP_SCROLL_AFTER_MS = 600;
/** How long, in ms, a restored position is tried for while the page is still drawing what it reaches. */
export declare const RESTORE_SCROLL_WITHIN_MS = 3000;
/** What the client keeps for a container by itself. */
export interface KeptView {
    /** The main scroller's `scrollTop`, in whole CSS pixels. */
    scroll?: number;
    /** Each header switch's `value` and toggle's `checked`, by item id. */
    header?: Record<string, string | boolean>;
}
/** The view and the module's own string, read out of what the host kept. Pure; never throws. */
export declare function unwrapKept(raw: string | null | undefined): {
    view: KeptView | null;
    state: string | null;
};
/**
 * The string to keep: the module's own when the view is empty, the envelope otherwise. When the
 * envelope would be longer than the host keeps, the view gives way (header values first, then the
 * scroll): the module's own state always wins. Pure.
 */
export declare function wrapKept(view: KeptView | null, state: string | null, most?: number): string | null;
/** A view off the wire, or null when there is nothing in it. Pure. */
export declare function viewOf(value: unknown): KeptView | null;
/** Each switch's `value` and toggle's `checked` in a header as a module wrote it, by id. Pure. */
export declare function headerValues(items: unknown, keep?: (id: string) => boolean): Record<string, string | boolean>;
