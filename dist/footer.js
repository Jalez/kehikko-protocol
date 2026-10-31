import { z } from 'zod';
import { HEADER_ITEM_SHAPES, checkPressable, headerIdSchema, headerLabelSchema, pressRefusal } from './header.js';
import { LIMITS } from './limits.js';
/**
 * The footer a module declares (2.38.0): one row at the bottom of its container, drawn by the host
 * in the same look as the header, instead of a status bar each module draws for itself. What a
 * footer says — a status line, a count, a meter — and what it offers — a run, a toggle, a switch, a
 * jump — are the module's; the host draws the latest list and reports a press, exactly as for the
 * header. Design notes: docs/footer.md.
 */
/** Where in the row an item stands: the left, the middle or the right group. */
export const FOOTER_ALIGNS = ['start', 'center', 'end'];
/** How much a text or a meter asks to be noticed. A host never says it with colour alone. */
export const FOOTER_LEVELS = ['normal', 'warn', 'critical'];
/** The kinds of footer item: two that only say something, and the header's four that can be pressed. */
export const FOOTER_KINDS = ['text', 'meter', 'switch', 'toggle', 'go', 'run'];
/** The kinds a person (or an agent, when the item says so) can press. */
export const FOOTER_PRESSABLE = ['switch', 'toggle', 'go', 'run'];
/** What every footer item has besides its kind's own fields. */
const placed = {
    /** The group the item stands in. Items keep declaration order within their group. */
    align: z.enum(FOOTER_ALIGNS).default('start'),
    /**
     * The first to go when the row is narrow (see `footerLayout`): under `FOOTER_ICONS_BELOW` an optional
     * text or meter is not drawn, and an optional pressable item moves into the row's "⋯" menu.
     */
    optional: z.boolean().default(false),
    /** More than the row has room for, as a sentence shown on hover and focus. Text, never markup. */
    tooltip: z.string().min(1).max(LIMITS.FOOTER_TOOLTIP).optional(),
};
const level = z.enum(FOOTER_LEVELS).default('normal');
const textItem = z.object({
    kind: z.literal('text'),
    id: headerIdSchema,
    /** The words: a status line or a count. One line; a host cuts it with an ellipsis and shows it whole on hover. */
    text: z.string().min(1).max(LIMITS.FOOTER_TEXT),
    level,
    ...placed,
});
const meterItem = z.object({
    kind: z.literal('meter'),
    id: headerIdSchema,
    /** What is being measured: `Context`, `Usage`. Also the meter's accessible name. */
    label: headerLabelSchema,
    /** How full, from 0 to 1. A module that thinks in percent divides by 100. */
    value: z.number().min(0).max(1),
    level,
    /** What to show for the value instead of the rounded percentage: `41k / 200k`. */
    text: z.string().min(1).max(LIMITS.FOOTER_METER_TEXT).optional(),
    ...placed,
});
/* The header's own kinds, with the same fields and rules. A run in a footer is always a button, so
   `pinned` means nothing here, and `surface` (full screen) is the header's alone: both are stripped. */
const switchItem = HEADER_ITEM_SHAPES.switch.extend(placed);
const toggleItem = HEADER_ITEM_SHAPES.toggle.extend(placed);
const goItem = HEADER_ITEM_SHAPES.go.extend(placed);
const runItem = HEADER_ITEM_SHAPES.run.omit({ surface: true, pinned: true }).extend(placed);
/**
 * One item of a module's footer. `text`: a status line or a count. `meter`: how full something is,
 * with how worried to be about it. `switch`, `toggle`, `go`, `run`: the header's kinds, the same
 * fields and the same press.
 */
export const footerItemSchema = z
    .discriminatedUnion('kind', [textItem, meterItem, switchItem, toggleItem, goItem, runItem])
    .superRefine((item, ctx) => {
    if (pressableFooterItem(item))
        checkPressable(item, ctx);
});
/** A module's whole footer: every item, in order within its group. Ids are unique within the footer. */
export const footerItemsSchema = z
    .array(footerItemSchema)
    .max(LIMITS.FOOTER_ITEMS)
    .refine((items) => new Set(items.map((item) => item.id)).size === items.length, {
    message: 'two footer items cannot share an id',
});
/** Whether a footer item can be pressed. */
export function pressableFooterItem(item) {
    return item.kind !== 'text' && item.kind !== 'meter';
}
/**
 * Why a press on a footer item cannot be taken, or `null` when it can: `pressRefusal`'s rule over the
 * footer's pressable items, and a sentence for a text or a meter, which only say something.
 */
export function footerPressRefusal(items, press) {
    const item = items.find((one) => one.id === press.item);
    if (item && !pressableFooterItem(item))
        return `"${item.id}" only says something; it cannot be pressed.`;
    return pressRefusal(items.filter(pressableFooterItem), press);
}
/** The rounded percentage a meter shows when it gives no `text`: `62%`. */
export function meterSaid(item) {
    return item.text ?? `${Math.round(item.value * 100)}%`;
}
/* ------------------------------------------------------------------------ *
 * Fit: one row at every width
 * ------------------------------------------------------------------------ */
/** Under this many pixels of footer, pressable items with an icon are the icon alone, meters lose their label and optional items go. The header's `ICONS_BELOW`. */
export const FOOTER_ICONS_BELOW = 300;
/** Under this many, every pressable item is in one "⋯" menu, and only the first text and the meters that are not optional stay. The header's `MERGE_BELOW`. */
export const FOOTER_MERGE_BELOW = 220;
/** The mode for a footer this wide; `null` is "not measured yet", drawn as the widest. */
export function footerModeFor(width) {
    if (width === null)
        return 'words';
    if (width < FOOTER_MERGE_BELOW)
        return 'merged';
    return width < FOOTER_ICONS_BELOW ? 'icons' : 'words';
}
/**
 * What a footer draws at a width, and the order it gives way in as the room runs out:
 *
 *  1. the gaps close, and every text is cut with an ellipsis, whole in its tooltip (at every width);
 *  2. under `FOOTER_ICONS_BELOW`, an `optional` text or meter goes, an `optional` pressable item
 *     moves into "⋯", a pressable item with an icon is the icon alone, and meters lose their label;
 *  3. under `FOOTER_MERGE_BELOW`, every pressable item is in "⋯", the centre group joins the left,
 *     only the first text is kept, and only the meters that are not optional.
 *
 * Nothing pressable is ever lost: an item not drawn in the row is in "⋯". Pure, the same rule for
 * every host; a host may be stricter (drop a group it cannot fit) but never wraps to a second row.
 */
export function footerLayout(items, width) {
    const mode = footerModeFor(width);
    const overflow = [];
    const kept = [];
    let texts = 0;
    for (const item of items) {
        if (mode === 'words') {
            kept.push(item);
            continue;
        }
        if (pressableFooterItem(item)) {
            if (mode === 'merged' || item.optional)
                overflow.push(item);
            else
                kept.push(item);
            continue;
        }
        if (item.optional)
            continue;
        if (mode === 'merged' && item.kind === 'text') {
            if (texts++ > 0)
                continue;
        }
        kept.push(item);
    }
    const at = (align) => kept.filter((item) => (mode === 'merged' && align === 'start' ? item.align !== 'end' : item.align === align));
    return {
        mode,
        start: at('start'),
        center: mode === 'merged' ? [] : at('center'),
        end: at('end'),
        overflow,
        iconsOnly: mode !== 'words',
        meterLabels: mode === 'words',
    };
}
