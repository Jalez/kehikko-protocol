import { useEffect, useMemo } from 'react'

import { pickedParts } from 'kehikot-module-protocol'
import { useKehikot as useProtocolKehikot, type Kehikot, type Where } from 'kehikot-module-protocol/client/react'

import { ID } from '../../manifest.ts'

/**
 * What the screen needs from the host, and nothing about how it arrived.
 *
 * A thin wrapper over the protocol's `useKehikot`: it applies the host's theme
 * to <html> and flattens the context into the fields this module reads, so a
 * screen can be rendered in a test with a plain object (see `Host`).
 */
export interface Host {
  /** 'listening' until a host greets or the grace runs out; then 'hosted' or 'unhosted'. */
  where: Where
  project: string | null
  /** The absolute directory of the open project. Where this module keeps its data. */
  projectPath: string | null
  epic: string | null
  /**
   * The headings of the parts of the epic the person picked out in the host's
   * bar. Empty means the whole epic, which is also what a host that has never
   * heard of parts says. A module that narrows to these has to SAY it narrowed
   * — see `context.parts`, `refInFocus` and `partInFocus` in the protocol.
   */
  focus: string[]
  theme: 'light' | 'dark'
  /** Ask the host for something (a method from the protocol). Rejects when unhosted. */
  request: Kehikot['request']
}

export function useKehikot(): Host {
  const kehikot = useProtocolKehikot(ID)
  const context = kehikot.context
  const theme = context?.theme ?? 'light'

  useEffect(() => {
    if (!context) return
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.classList.toggle('light', theme === 'light')
  }, [context, theme])

  return useMemo(
    () => ({
      where: kehikot.where,
      project: context?.project ?? null,
      projectPath: context?.projectPath ?? null,
      epic: context?.epic ?? null,
      focus: pickedParts(context?.parts ?? []).map((part) => part.heading || part.id),
      theme,
      request: kehikot.request,
    }),
    [kehikot.where, kehikot.request, context, theme],
  )
}
