import {
  type EpicPart,
  useFocus as useParts,
} from 'kehikot-module-protocol/client/react'
export const x: EpicPart[] = []
export { useParts }

/** One anchor per item, narrowed through the protocol, with what is in hand kept: the contract. */
export function shownOf(focus: ReturnType<typeof useParts>, notes: readonly { id: string; path: string }[], open: string | null) {
  return focus.narrow(notes, (note) => ({ file: note.path }), { noun: 'note', keep: (note) => note.id === open })
}
