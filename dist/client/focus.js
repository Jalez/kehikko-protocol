import { useMemo, useRef } from 'react';
import { anchorInFocus, focusSentence, isFocused, narrowToFocus, sameParts, } from '../parts.js';
const NONE = [];
/**
 * `context` may be null (before the greeting) and may lack `parts` (a host
 * older than 0.29.0): both are no parts, nothing picked, the whole epic.
 *
 * The value it returns changes identity only when the parts change by value or
 * the epic changes, so it is safe in a dependency list: a context re-sent
 * because something else on the canvas moved redraws nothing here.
 */
export function useFocus(context) {
    const next = context?.parts ?? NONE;
    const held = useRef(next);
    if (!sameParts(held.current, next))
        held.current = next;
    const parts = held.current;
    const epic = context?.epic ?? null;
    return useMemo(() => ({
        parts,
        focused: isFocused(parts),
        inFocus: (anchor) => anchorInFocus(parts, anchor, epic),
        narrow: (items, anchorOf, options = {}) => {
            const narrowed = narrowToFocus(parts, items, anchorOf, epic, options.keep);
            return { ...narrowed, sentence: focusSentence(parts, narrowed.outside, options.noun) };
        },
    }), [parts, epic]);
}
//# sourceMappingURL=focus.js.map