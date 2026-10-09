import { useMemo, useRef } from 'react'

import {
  anchorInFocus,
  focusSentence,
  isFocused,
  narrowToFocus,
  sameParts,
  type Anchors,
  type EpicPart,
  type Narrowed,
} from '../parts.js'

/**
 * The parts focus as one React value: the rule, the count and the sentence,
 * so that a module writes `anchorOf(item)` and where the sentence is drawn,
 * and nothing else.
 *
 * It is here and not in `useKehikot` because half the modules keep the context
 * in a hook of their own, and this has to work for those too: it takes
 * whatever of the context the page is holding — the whole `ModuleContext`, or
 * `{ parts, epic }` — and wants nothing from the connection.
 *
 * Pure functions under it, all exported from the package's root
 * (`anchorInFocus`, `narrowToFocus`, `focusSentence`, `sameParts`), for a page
 * that is not React.
 */
export interface Focus {
  /** Every part of the open epic, picked or not. The same array until the list changes BY VALUE. */
  parts: readonly EpicPart[]
  /** Whether anything is picked. False is the resting state: draw the page as it always was. */
  focused: boolean
  /** Whether one anchored thing is in front of the person. True for everything when nothing is picked. */
  inFocus: (anchor: Anchors) => boolean
  /**
   * A list narrowed to the picked parts, and the sentence about what was left
   * out — `''` when nothing is picked.
   *
   * `noun` is what one item is called in the sentence (`'note'`, or
   * `['entry', 'entries']`). `keep` holds on to what the person is in the
   * middle of; see `narrowToFocus`.
   */
  narrow: <T>(
    items: readonly T[],
    anchorOf: (item: T) => Anchors,
    options?: { noun?: string | readonly [string, string]; keep?: (item: T) => boolean },
  ) => Narrowed<T> & { sentence: string }
}

const NONE: readonly EpicPart[] = []

/**
 * `context` may be null (before the greeting) and may lack `parts` (a host
 * older than 0.29.0): both are no parts, nothing picked, the whole epic.
 *
 * The value it returns changes identity only when the parts change by value or
 * the epic changes, so it is safe in a dependency list: a context re-sent
 * because something else on the canvas moved redraws nothing here.
 */
export function useFocus(context: { parts?: readonly EpicPart[]; epic?: string | null } | null | undefined): Focus {
  const next = context?.parts ?? NONE
  const held = useRef(next)
  if (!sameParts(held.current, next)) held.current = next
  const parts = held.current
  const epic = context?.epic ?? null

  return useMemo<Focus>(
    () => ({
      parts,
      focused: isFocused(parts),
      inFocus: (anchor) => anchorInFocus(parts, anchor, epic),
      narrow: (items, anchorOf, options = {}) => {
        const narrowed = narrowToFocus(parts, items, anchorOf, epic, options.keep)
        return { ...narrowed, sentence: focusSentence(parts, narrowed.outside, options.noun) }
      },
    }),
    [parts, epic],
  )
}
