import { z } from 'zod';
import { LIMITS } from './limits.js';
/**
 * 2.42.0. How a module's page meets the host's header and footer when a host reveals them on
 * hover (a focus mode that hides them until the pointer is over the container).
 *
 * ## Why a module gets a say
 *
 * A host that reveals its rows by PUSHING — the rows come back into the column and the module's
 * frame shrinks to make room — covers nothing, and for most pages that is right. For a terminal it
 * is the worst thing that can happen on a hover: the frame shrinks, the emulator fits to fewer rows,
 * the pty is told (SIGWINCH), and the program redraws for the smaller screen; the pointer leaves and
 * all of it runs again the other way. Two full redraws and two scroll jumps per hover, in the place
 * a person is reading.
 *
 * So a module may say `reveal: 'over'`: its frame keeps its size whatever the host reveals, and the
 * host's rows are drawn OVER its top and bottom instead. Nothing is resized, so nothing is refitted
 * and nothing is redrawn. What the rows cover the host says in `kehikot.covered` (`coveredSchema`):
 * how many CSS pixels at the top and at the bottom of the frame are under a row now, sent when that
 * changes. The module keeps what matters out from under them — a terminal moves its content (a
 * transform, never a resize) so the last line stays above the footer (`keepInView`).
 *
 * `push`, or saying nothing, keeps the host's push. A host before 2.42.0 ignores the field (it is a
 * top-level manifest field, like `opens`) and sends no `kehikot.covered`; the module then behaves
 * exactly as it did, so declaring it is safe on any host. Free word on the wire: an unknown word is
 * dropped, not fatal. Design notes: docs/manifest.md ("How the host's rows meet the page").
 */
export const REVEAL_MODES = {
    push: 'The host’s revealed header and footer push the page: its frame shrinks to make room, and nothing is covered.',
    over: 'The page’s frame keeps its size; the host’s revealed header and footer are drawn over its top and bottom, and `kehikot.covered` says by how much.',
};
/** `reveal` in a manifest. */
export const revealModeSchema = z.enum(Object.keys(REVEAL_MODES));
/** What a module says about how the host's rows meet its page: `push` when it says nothing. */
export function revealModeOf(manifest) {
    return manifest?.reveal === 'over' ? 'over' : 'push';
}
/** How much of a frame the host's rows cover, in CSS pixels from its top and from its bottom. */
export const coveredFields = {
    top: z.number().finite().min(0).max(LIMITS.COVERED_PX),
    bottom: z.number().finite().min(0).max(LIMITS.COVERED_PX),
};
/** Nothing covered: the rows are hidden, or the host never said. */
export const NOT_COVERED = Object.freeze({ top: 0, bottom: 0 });
/**
 * How far to move a page's content (a `translateY`, in CSS pixels; negative is up) so that what
 * must stay readable is not under the host's rows.
 *
 * `height` is the frame's height and `last` the bottom edge, from the frame's top, of the last
 * thing that must stay seen — a terminal's last line with text or its cursor's line, whichever is
 * lower. The band left visible is `[covered.top, height - covered.bottom]`.
 *
 *   - `last` under the footer: move up just enough that it sits on the footer's edge. What goes
 *     under the header then is the oldest of what was showing.
 *   - Otherwise, move DOWN up to the header's height, as far as `last` can go without reaching the
 *     footer: a fresh shell whose prompt is on its first row keeps that row out from under the
 *     header.
 *
 * Nothing covered is always 0. Rounded to whole pixels, so text is never drawn between them.
 */
export function keepInView(covered, height, last) {
    const top = Math.max(0, covered.top);
    const bottom = Math.max(0, covered.bottom);
    if (!(height > 0) || (top === 0 && bottom === 0))
        return 0;
    const edge = height - bottom;
    const shift = last > edge ? edge - last : Math.min(top, edge - last);
    return Math.round(shift) || 0;
}
