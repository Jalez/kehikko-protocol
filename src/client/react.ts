import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { FilterGroup, ModuleContext } from '../wire.js'
import {
  HostRefused,
  NOBODY_TO_ASK,
  connect,
  type Connection,
  type ConnectOptions,
  type HostEvents,
} from './connect.js'

/**
 * The bridge as one React value — and it is OPTIONAL, twice over.
 *
 * Optional because it is a second subpath: `roadmap-module-protocol/client` has
 * no idea this file exists, imports no React, and works in a page built with
 * anything or nothing. A client that imported React would make this package
 * opinionated about a thing it has no business having an opinion on. Not every
 * module is a React app and none is obliged to be.
 *
 * Optional because a module may hand-roll all of it and be perfectly conforming.
 * See the note in `index.ts`.
 *
 * What it adds over calling `connect` yourself is three orderings that are easy
 * to get wrong and silent when you do — the store-before-listen split, the
 * handler refs, and the discarded-mount guard. Each is described where it
 * happens.
 */

/**
 * How long a page waits before it will say nobody is there.
 *
 * A page cannot know at load whether it is framed. It has to wait to find out,
 * because the greeting arrives when the host is ready rather than when we are,
 * and a page that concluded "nobody is there" in the first frame would say so
 * and then be greeted a moment later — the reader would see the standalone
 * paragraph flash past and be replaced, which teaches them that paragraph is
 * noise. So there is a `listening` state with its own words, it lasts under a
 * second, and only then does the page say the harder thing.
 *
 * It is not a spinner. A page using it should say what it is waiting for.
 */
export const GREETING_GRACE_MS = 700

/**
 * Whether anything is framing this page, in the three states that matter.
 *
 * Three rather than a boolean, because "we have not heard yet" is not "nobody is
 * there": one lasts under a second and the other is the standalone case a module
 * is expected to work in. Drawing the second while in the first is the flicker
 * the grace above exists to prevent.
 */
export type Where = 'listening' | 'unhosted' | 'hosted'

export interface UseRoadmapOptions extends ConnectOptions {
  /** Override `GREETING_GRACE_MS`, or pass `0` to say "unhosted" the moment the first paint lands. */
  grace?: number
}

export interface Roadmap {
  /** `listening` for under a second, then `unhosted`, or `hosted` from the greeting on. */
  where: Where
  /**
   * The whole context, as the host last said it, or null before the greeting.
   *
   * Whole and not picked apart, deliberately: a hook that returned a chosen few
   * fields would be the enumerated-context bug wearing a different hat, and
   * every field the protocol grows would stop at this line. Read what you need.
   */
  context: ModuleContext | null
  /** Whatever the host is keeping for this module, from the greeting. `null` when it keeps nothing. */
  state: string | null
  /** Ask the host something. Rejects with `HostRefused`, always. Safe before the greeting: it refuses. */
  request: (method: string, params?: Record<string, unknown>) => Promise<unknown>
  /** Say how tall this page would like its frame to be. Silent when nothing is framing it. */
  resize: (height: number) => void
  /**
   * Say what this page can be narrowed by. The host draws the control; the
   * choice comes back in `context.filters`.
   *
   * Stable across renders, so it can be called from an effect whose only other
   * dependency is whatever made the offer change — which is the ordinary
   * pattern, because a label that carries a count changes whenever the count
   * does.
   */
  filters: (groups: FilterGroup[]) => void
  /**
   * Say that what this page shows can be cleared, and what to call it. `null`
   * takes the control away.
   *
   * Stable across renders like `filters`, and for the same reason: the ordinary
   * call site is an effect whose only real dependency is whatever the label
   * counts, so this must not be one of the things that changed.
   *
   * The press arrives at `onClear` in the `events` given to this hook. Nothing
   * comes back through the context and there is no state to read here — the
   * host relays a press and learns nothing about what went.
   */
  clearable: (label: string | null) => void
  /**
   * Say that this page can read its material again, and when it last did.
   *
   * Stable across renders like `filters` and `clearable`, and the ordinary call
   * site is the same shape: an effect whose dependency is the reading, calling
   * this with a new `at` whenever one arrives.
   *
   * The press arrives at `onRefresh` in the `events` given to this hook. `at` is
   * the module's fact about its own data, and a host never infers one — see
   * `refreshableSchema` for the four ways such a guess is wrong.
   */
  refreshable: (state: { can?: boolean; at?: string | null; busy?: boolean }) => void
  /**
   * The live connection, or null between mounts.
   *
   * Here because a page with its own machinery — a poll that emits, a store that
   * asks — needs the same connection the hook is holding, and building a second
   * one would be a second `ready` and a second backlog replay. Read it at the
   * moment you need it rather than capturing it.
   */
  connection: () => Connection | null
}

/**
 * Connect once, for the life of this component, and re-render when the host speaks.
 *
 * `events` may be rebuilt on every render — it is read through a ref, never
 * captured — so there is no need to memoise it at the call site. `id` is the
 * only dependency, because reconnecting is a second `ready` and a torn-down
 * listener during whatever millisecond the host chose to greet in.
 */
export function useRoadmap(id: string, events: HostEvents = {}, options: UseRoadmapOptions = {}): Roadmap {
  const [where, setWhere] = useState<Where>('listening')
  const [context, setContext] = useState<ModuleContext | null>(null)
  const [state, setState] = useState<string | null>(null)

  const held = useRef<Connection | null>(null)

  /**
   * The handlers, held in a ref and read at the moment a message arrives.
   *
   * A view rebuilds `onGoto` whenever its rows change, and connecting to the
   * window again on every render would mean a torn-down listener during the one
   * millisecond a host chose to greet in. So the listener is established once
   * and always calls the newest handler — which is also the only one that knows
   * what is currently on screen.
   */
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
          /*
           * The discarded mount's answer must not overwrite the live one.
           *
           * `StrictMode` mounts, unmounts and mounts again. The first
           * connection is stopped in the first cleanup, but a message already
           * in flight — or, far more often, one being replayed out of the
           * mailbox's backlog — can still reach its handlers, and the mailbox
           * replays to EVERY subscriber including the doomed one. Without this
           * line the second mount's fresh context is overwritten by the first
           * mount's stale one, in the order the two happen to be delivered, and
           * the page draws a greeting it has since been told to forget.
           *
           * It is one comparison and it is the difference between a
           * double-mounted page that is right and one that is right most of the
           * time.
           */
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
          /* Not guarded, and that is deliberate: the host is WAITING on this
             one, and a discarded mount refusing to answer is a reference that
             sits out the host's timeout. Whichever mount hears it answers it. */
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

    /*
     * Stored BEFORE it is told to listen, and the order is the whole of a bug
     * that made two modules hang. The mailbox replays synchronously inside
     * `listen`, so anything reading this ref from a handler must find it
     * already assigned. See `listen` in `connect.ts`.
     */
    held.current = live
    live.listen()

    const grace_ = grace > 0 ? setTimeout(() => setWhere((was) => (was === 'listening' ? 'unhosted' : was)), grace) : null

    return () => {
      if (grace_ !== null) clearTimeout(grace_)
      live.stop()
      if (held.current === live) held.current = null
    }
  }, [id])

  const request = useCallback((method: string, params: Record<string, unknown> = {}) => {
    const live = held.current
    if (live) return live.request(method, params)
    /* Refused in the connection's own words rather than a second spelling of
       them, so a caller sees one sentence for "nobody is there" whichever side
       of the mount it asked from. */
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
