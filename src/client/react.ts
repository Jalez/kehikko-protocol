import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { FilterGroup, ModuleContext } from '../wire.js'
import {
  HostRefused,
  NOBODY_TO_ASK,
  connect,
  type Connection,
  type AskOptions,
  type ConnectOptions,
  type HostEvents,
} from './connect.js'

/**
 * The bridge as one React value: `useKehikot`. Optional — a second subpath the plain client never
 * imports, and a module may hand-roll all of it.
 * Design notes: docs/client.md.
 */

/** How long, in ms, a page stays `listening` before it will say nobody is there (`unhosted`). */
export const GREETING_GRACE_MS = 700

/**
 * Whether anything is framing this page: `listening` (not heard yet, under a second), `unhosted`
 * (nobody is there, the standalone case) or `hosted`.
 */
export type Where = 'listening' | 'unhosted' | 'hosted'

export interface UseKehikotOptions extends ConnectOptions {
  /** Override `GREETING_GRACE_MS`, or pass `0` to say "unhosted" the moment the first paint lands. */
  grace?: number
}

export interface Kehikot {
  /** `listening` for under a second, then `unhosted`, or `hosted` from the greeting on. */
  where: Where
  /** The whole context, as the host last said it, or null before the greeting. */
  context: ModuleContext | null
  /** Whatever the host is keeping for this module, from the greeting. `null` when it keeps nothing. */
  state: string | null
  /**
   * Ask the host something. Rejects with `HostRefused`, always. Safe before the greeting: it
   * refuses. `options.within` is this one question's deadline — see `AskOptions`.
   */
  request: (method: string, params?: Record<string, unknown>, options?: AskOptions) => Promise<unknown>
  /** Say how tall this page would like its frame to be. Silent when nothing is framing it. */
  resize: (height: number) => void
  /**
   * Say what this page can be narrowed by. The host draws the control; the choice comes back in
   * `context.filters`. Stable across renders.
   */
  filters: (groups: FilterGroup[]) => void
  /**
   * Say that what this page shows can be cleared, and what to call it. `null` takes the control
   * away. Stable across renders. Nothing comes back through the context.
   */
  clearable: (label: string | null) => void
  /**
   * Say that this page can read its material again, and when it last did. Stable across renders.
   * `at` is the module's fact about its own data; a host never infers one.
   */
  refreshable: (state: { can?: boolean; at?: string | null; busy?: boolean }) => void
  /**
   * The live connection, or null between mounts. Read it at the moment you need it rather than
   * capturing it; do not build a second one.
   */
  connection: () => Connection | null
}

/**
 * Connect once, for the life of this component, and re-render when the host speaks. `events` is
 * read through a ref, so it need not be memoised; `id` is the only dependency that reconnects.
 */
export function useKehikot(id: string, events: HostEvents = {}, options: UseKehikotOptions = {}): Kehikot {
  const [where, setWhere] = useState<Where>('listening')
  const [context, setContext] = useState<ModuleContext | null>(null)
  const [state, setState] = useState<string | null>(null)

  const held = useRef<Connection | null>(null)

  /** The handlers, held in a ref and read when a message arrives, so the newest is the one called. */
  const handlers = useRef(events)
  handlers.current = events

  /* Read at connect time only. Changing a timeout mid-conversation would mean
     rebuilding the connection, which costs a second greeting to save nothing. */
  const settings = useRef(options)
  settings.current = options

  useEffect(() => {
    const { grace = GREETING_GRACE_MS, ...connectOptions } = settings.current

    const live = connect(
      id,
      {
        onHello: (next, kept) => {
          /* The discarded mount's answer must not overwrite the live one: `StrictMode` mounts
             twice, and the mailbox replays to EVERY subscriber including the stopped one. */
          if (held.current !== live) return
          setWhere('hosted')
          setContext(next)
          if (kept !== undefined) setState(kept)
          handlers.current.onHello?.(next, kept)
        },
        onContext: (next) => {
          if (held.current !== live) return
          setWhere('hosted')
          setContext(next)
          handlers.current.onContext?.(next)
        },
        onGoto: (message, answer) => {
          /* Not guarded, and that is deliberate: the host is WAITING on this one. Whichever mount
             hears it answers it. */
          const handler = handlers.current.onGoto
          if (handler) handler(message, answer)
          else answer(false, 'This app is not showing anything that can be walked to.')
        },
        onEvent: (event) => {
          if (held.current !== live) return
          handlers.current.onEvent?.(event)
        },
      },
      connectOptions,
    )

    /* Stored BEFORE it is told to listen: the mailbox replays synchronously inside `listen`, so a
       handler reading this ref must find it already assigned. */
    held.current = live
    live.listen()

    const grace_ = grace > 0 ? setTimeout(() => setWhere((was) => (was === 'listening' ? 'unhosted' : was)), grace) : null

    return () => {
      if (grace_ !== null) clearTimeout(grace_)
      live.stop()
      if (held.current === live) held.current = null
    }
  }, [id])

  const request = useCallback((method: string, params: Record<string, unknown> = {}, options?: AskOptions) => {
    const live = held.current
    if (live) return live.request(method, params, options)
    /* Refused in the connection's own words, so a caller sees one sentence for "nobody is there"
       whichever side of the mount it asked from. */
    return Promise.reject(new HostRefused({ reason: 'silent', error: NOBODY_TO_ASK }))
  }, [])

  const resize = useCallback((height: number) => held.current?.resize(height), [])
  const filters = useCallback((groups: FilterGroup[]) => held.current?.filters(groups), [])
  const clearable = useCallback((label: string | null) => held.current?.clearable(label), [])
  const refreshable = useCallback(
    (state: { can?: boolean; at?: string | null; busy?: boolean }) => held.current?.refreshable(state),
    [],
  )
  const connection = useCallback(() => held.current, [])

  return useMemo(
    () => ({ where, context, state, request, resize, filters, clearable, refreshable, connection }),
    [where, context, state, request, resize, filters, clearable, refreshable, connection],
  )
}

/* The parts focus, beside the bridge: the same entry, a hook that needs no
   connection. See `focus.ts`. */
export { useFocus, type Focus } from './focus.js'

/**
 * The names this hook and its types had before the app was renamed, kept so a
 * module that has not been updated still builds against this copy. Same
 * function, same types. Use `useKehikot`.
 *
 * @deprecated Renamed to `useKehikot`.
 */
export const useRoadmap = useKehikot
/** @deprecated Renamed to `Kehikot`. */
export type Roadmap = Kehikot
/** @deprecated Renamed to `UseKehikotOptions`. */
export type UseRoadmapOptions = UseKehikotOptions

/* The fuller listener and the shared not-ready screen. See `host.ts` and `cover.ts`. */
export { useHost, hostFields, JSON_KEPT, type Host, type KeptCodec, type UseHostOptions } from './host.js'
export {
  Cover,
  coverFor,
  useServerStanding,
  COVER_CSS,
  COVER_STYLE_ID,
  COVER_WORDS,
  TRY_AGAIN,
  type CoverProps,
  type CoverState,
} from './cover.js'
