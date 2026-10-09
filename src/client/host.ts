import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { FilterGroup, Passage } from '../index.js'
import { HostRefused, NOBODY_TO_ASK, type AskOptions, type Connection, type HostEvents } from './connect.js'
import {
  JSON_KEPT,
  hostStore,
  type HostActions,
  type HostStanding,
  type HostStore,
  type HostStoreOptions,
  type KeptCodec,
} from './host-store.js'

/**
 * The host, as one React value with everything a screen reads already on it: the theme on `<html>`,
 * the flattened context, the kept state. A thin binding over `hostStore` (`host-store.ts`), which
 * is the same thing for a page whose state lives outside React. See docs/module-plumbing.md.
 */

export { JSON_KEPT, hostFields, type KeptCodec } from './host-store.js'

export type UseHostOptions<Kept = unknown> = HostStoreOptions<Kept>

export interface Host<Kept = unknown> extends HostStanding<Kept>, HostActions<Kept> {
  /**
   * The standing right now, ahead of the render: for a handler (`onEvent`, `onClear`), which can
   * be called for a message replayed before React has drawn the greeting it followed. Stable.
   */
  read: () => HostStanding<Kept>
  /** The live connection, or `null` between mounts. Read it when needed rather than capturing it. */
  connection: () => Connection | null
}

/**
 * Connect once for the life of the component. `events` may be rebuilt on every
 * render — it is read through a ref — so `onGoto` needs no memoising.
 */
export function useHost<Kept = unknown>(
  id: string,
  events: HostEvents = {},
  options: UseHostOptions<Kept> = {},
): Host<Kept> {
  /* An unstarted store is only its first standing: `listening`, and the theme the document decided. */
  const [standing, setStanding] = useState<HostStanding<Kept>>(() => hostStore<Kept>(id).get())
  const drawn = useRef(standing)
  drawn.current = standing

  const held = useRef<HostStore<Kept> | null>(null)
  const handlers = useRef(events)
  handlers.current = events
  const settings = useRef(options)
  settings.current = options

  useEffect(() => {
    const mounted = settings.current
    const read = (mounted.kept ?? (JSON_KEPT as KeptCodec<Kept>)).read
    const live = hostStore<Kept>(
      id,
      {
        onHello: (context, state) => handlers.current.onHello?.(context, state),
        onContext: (context) => handlers.current.onContext?.(context),
        onGoto: (message, answer) => {
          const handler = handlers.current.onGoto
          if (handler) handler(message, answer)
          else answer(false, 'This app is not showing anything that can be walked to.')
        },
        onEvent: (event) => handlers.current.onEvent?.(event),
        onClear: () => handlers.current.onClear?.(),
        onRefresh: () => handlers.current.onRefresh?.(),
      },
      /* The codec is read at mount and written through whichever one is current. */
      { ...mounted, kept: { read, write: (kept) => (settings.current.kept ?? (JSON_KEPT as KeptCodec<Kept>)).write(kept) } },
    )
    /* Stored BEFORE it starts: the mailbox replays synchronously inside `start`. */
    held.current = live
    live.subscribe(() => setStanding(live.get()))
    live.start()

    return () => {
      live.stop()
      if (held.current === live) held.current = null
    }
  }, [id])

  const request = useCallback((method: string, params: Record<string, unknown> = {}, asking?: AskOptions) => {
    const live = held.current
    if (live) return live.request(method, params, asking)
    return Promise.reject(new HostRefused({ reason: 'silent', error: NOBODY_TO_ASK }))
  }, [])

  const remember = useCallback((next: Kept) => {
    const live = held.current
    if (live) live.remember(next)
    else setStanding((was) => ({ ...was, kept: next }))
  }, [])

  const point = useCallback((passage: Passage | null) => held.current?.point(passage), [])
  const resize = useCallback((height: number) => held.current?.resize(height), [])
  const filters = useCallback((groups: FilterGroup[]) => held.current?.filters(groups), [])
  const clearable = useCallback((label: string | null) => held.current?.clearable(label), [])
  const refreshable = useCallback(
    (state: { can?: boolean; at?: string | null; busy?: boolean }) => held.current?.refreshable(state),
    [],
  )
  const connection = useCallback(() => held.current?.connection() ?? null, [])
  const read = useCallback(() => held.current?.get() ?? drawn.current, [])

  return useMemo(
    () => ({ ...standing, remember, point, request, resize, filters, clearable, refreshable, connection, read }),
    [standing, remember, point, request, resize, filters, clearable, refreshable, connection, read],
  )
}
