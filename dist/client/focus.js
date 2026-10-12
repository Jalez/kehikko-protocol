import { useMemo, useRef } from 'react';
import { anchorInFocus, emptySaid, focusSentence, isFocused, narrowToFocus, sameParts, } from '../parts.js';
const NONE = [];
/**
 * `context` may be null (before the greeting) or lack `parts` (a host older than 0.29.0): both mean no
 * parts, nothing picked. Pass the whole context, or `{ parts, epic, projectPath }`: `projectPath` is how
 * a `{ file }` anchor outside `.kehikot/` is read. The returned value changes identity only when the
 * parts change by value or the epic or project changes, so it is safe in a dependency list.
 */
export function useFocus(context) {
    const next = context?.parts ?? NONE;
    const held = useRef(next);
    if (!sameParts(held.current, next))
        held.current = next;
    const parts = held.current;
    const epic = context?.epic ?? null;
    const projectPath = context?.projectPath ?? null;
    return useMemo(() => ({
        parts,
        focused: isFocused(parts),
        inFocus: (anchor) => anchorInFocus(parts, anchor, epic, projectPath),
        narrow: (items, anchorOf, options = {}) => {
            const narrowed = narrowToFocus(parts, items, anchorOf, { epic, projectPath, keep: options.keep });
            const total = options.total ? { total: items.length } : undefined;
            const one = typeof options.noun === 'string' ? options.noun : options.noun?.[0];
            return {
                ...narrowed,
                sentence: focusSentence(parts, narrowed.outside, options.noun, total),
                empty: items.length > 0 && narrowed.shown.length === 0 ? emptySaid(parts, one) : '',
            };
        },
    }), [parts, epic, projectPath]);
}
