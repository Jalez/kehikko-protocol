import { useMemo, useRef } from 'react'

import {
  anchorInFocus,
  emptySaid,
  focusSentence,
  isFocused,
  narrowToFocus,
  sameParts,
  type Anchors,
  type EpicPart,
  type Narrowed,
} from '../parts.js'

/**
 * The parts focus as one React value: the rule, and the one sentence for a view the pick left empty.
 * Takes whatever of the context the page holds and wants nothing from the connection; a non-React page
 * uses `anchorInFocus`, `narrowToFocus`, `emptySaid` and `sameParts` from the package's root.
 */
export interface Focus {
  /** Every part of the open epic, picked or not. The same array until the list changes BY VALUE. */
  parts: readonly EpicPart[]
  /** Whether anything is picked. False is the resting state: draw the page as it always was. */
  focused: boolean
  /** Whether one anchored thing is in front of the person. True for everything when nothing is picked. */
  inFocus: (anchor: Anchors) => boolean
  /**
   * A list narrowed to the picked parts. `noun` is what one item is called, in the singular (`'note'`);
   * `keep` holds on to what the person is in the middle of, as in `narrowToFocus`. `empty` (1.2.0) is
   * the one sentence to draw where the items would have been, `emptySaid`'s, and `''` unless the pick
   * left NOTHING of a list that had something. `sentence` is the deprecated count line (`focusSentence`;
   * `total: true` has it say how many there were); draw `empty` and nothing else.
   */
  narrow: <T>(
    items: readonly T[],
    anchorOf: (item: T) => Anchors,
    options?: { noun?: string | readonly [string, string]; keep?: (item: T) => boolean; total?: boolean },
  ) => Narrowed<T> & { sentence: string; empty: string }
}

const NONE: readonly EpicPart[] = []

/**
 * `context` may be null (before the greeting) or lack `parts` (a host older than 0.29.0): both mean no
 * parts, nothing picked. Pass the whole context, or `{ parts, epic, projectPath }`: `projectPath` is how
 * a `{ file }` anchor outside `.kehikot/` is read. The returned value changes identity only when the
 * parts change by value or the epic or project changes, so it is safe in a dependency list.
 */
export function useFocus(
  context: { parts?: readonly EpicPart[]; epic?: string | null; projectPath?: string | null } | null | undefined,
): Focus {
  const next = context?.parts ?? NONE
  const held = useRef(next)
  if (!sameParts(held.current, next)) held.current = next
  const parts = held.current
  const epic = context?.epic ?? null
  const projectPath = context?.projectPath ?? null

  return useMemo<Focus>(
    () => ({
      parts,
      focused: isFocused(parts),
      inFocus: (anchor) => anchorInFocus(parts, anchor, epic, projectPath),
      narrow: (items, anchorOf, options = {}) => {
        const narrowed = narrowToFocus(parts, items, anchorOf, { epic, projectPath, keep: options.keep })
        const total = options.total ? { total: items.length } : undefined
        const one = typeof options.noun === 'string' ? options.noun : options.noun?.[0]
        return {
          ...narrowed,
          sentence: focusSentence(parts, narrowed.outside, options.noun, total),
          empty: items.length > 0 && narrowed.shown.length === 0 ? emptySaid(parts, one) : '',
        }
      },
    }),
    [parts, epic, projectPath],
  )
}
