import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { CanvasContainer, EpicPart, FilterChoice, FilterGroup, ModuleContext, Passage } from '../index.js'
import type { PageTheme } from '../page.js'
import {
  HostRefused,
  NOBODY_TO_ASK,
  connect,
  type AskOptions,
  type ConnectOptions,
  type Connection,
  type HostEvents,
} from './connect.js'
import { GREETING_GRACE_MS, type Where } from './react.js'
import { reloadWhenStale } from './ask.js'
import { applyTheme, pageTheme, systemTheme } from './theme.js'

/**
 * The host, as one React value with everything a screen reads already on it: the theme on `<html>`,
 * the flattened context, the kept state. Built on `connect`, sharing nothing with `useKehikot` but
 * its three orderings, so that hook can be retired. See docs/module-plumbing.md.
 */

/** How the string a host keeps for a module becomes a value, and back. */
export interface KeptCodec<Kept> {
  /** `null` for anything unrecognised: an older version's string should give first-run behaviour, not a guess. */
  read: (state: string | null) => Kept | null
  write: (kept: Kept) => string
}

/** The default: JSON, and `null` for anything that does not parse. */
export const JSON_KEPT: KeptCodec<unknown> = {
  read: (state) => {
    if (state === null) return null
    try {
      return JSON.parse(state) as unknown
    } catch {
      return null
    }
  },
  write: (kept) => JSON.stringify(kept),
}

export interface UseHostOptions<Kept = unknown> extends ConnectOptions {
  /** Override `GREETING_GRACE_MS`, or pass `0` to never conclude "unhosted" from silence. */
  grace?: number
  /** How the kept state is read and written. Default `JSON_KEPT`. Read at mount. */
  kept?: KeptCodec<Kept>
  /** `false` leaves `<html>` alone. Default `true`: the host's theme is put on it. */
  applyTheme?: boolean
  /**
   * `false` leaves a page that is older than its own server as it is. Default `true`: it reloads,
   * once, a moment after `ask()` notices (see `reloadWhenStale`).
   */
  reloadWhenStale?: boolean
}

export interface Host<Kept = unknown> {
  /** `listening` for under a second, then `unhosted`, or `hosted` from the greeting on. */
  where: Where
  /** The whole context as the host last said it, or `null` before the greeting. */
  context: ModuleContext | null
  /** What the open project is called. A name, not a path. */
  project: string | null
  /** The absolute directory of the open project. `null` also for an empty string. */
  projectPath: string | null
  epic: string | null
  passage: Passage | null
  containers: readonly CanvasContainer[]
  /** The parts of the open epic, with which are picked out. Empty is the whole epic. */
  parts: readonly EpicPart[]
  selection: readonly string[]
  /** What the person chose in the filters this page offered with `filters()`. */
  chosen: FilterChoice
  /** What is on `<html>`: the host's theme once it has said one, the page's own first guess before. */
  theme: PageTheme
  /** What the host kept for this module, read through the codec. `null` when nothing, or nothing recognised. */
  kept: Kept | null
  /**
   * Keep a value with the host (`state.set`) and hold it here. Fire and
   * forget: a host may refuse, and then the choice holds for this session.
   * Silent when nothing is framing the page.
   */
  remember: (next: Kept) => void
  /**
   * Say which passage this page is pointing at (`passage.set`), or `null` for
   * none. Fire and forget, like `remember`.
   */
  point: (passage: Passage | null) => void
  /** Ask the host something. Rejects with `HostRefused`, always; safe before the greeting. Stable. */
  request: (method: string, params?: Record<string, unknown>, options?: AskOptions) => Promise<unknown>
  resize: (height: number) => void
  filters: (groups: FilterGroup[]) => void
  clearable: (label: string | null) => void
  refreshable: (state: { can?: boolean; at?: string | null; busy?: boolean }) => void
  /** The live connection, or `null` between mounts. Read it when needed rather than capturing it. */
  connection: () => Connection | null
}

const NONE: readonly never[] = []
const NO_CHOICE: FilterChoice = {}
const text = (value: unknown): string | null => (typeof value === 'string' && value ? value : null)

/** The flattened fields of a context. Pure, so a test can build a `Host` from a plain object. */
export function hostFields(
  context: ModuleContext | null,
): Pick<Host, 'project' | 'projectPath' | 'epic' | 'passage' | 'containers' | 'parts' | 'selection' | 'chosen'> {
  return {
    project: text(context?.project),
    projectPath: text(context?.projectPath),
    epic: text(context?.epic),
    passage: context?.passage ?? null,
    containers: context?.containers ?? NONE,
    parts: context?.parts ?? NONE,
    selection: context?.selection ?? NONE,
    chosen: context?.filters ?? NO_CHOICE,
  }
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
  const [where, setWhere] = useState<Where>('listening')
  const [context, setContext] = useState<ModuleContext | null>(null)
  const [kept, setKept] = useState<Kept | null>(null)
  const [theme, setTheme] = useState<PageTheme>(() => pageTheme() ?? 'light')

  const held = useRef<Connection | null>(null)
  const handlers = useRef(events)
  handlers.current = events
  const settings = useRef(options)
  settings.current = options

  useEffect(() => {
    const { grace = GREETING_GRACE_MS, kept: codec, applyTheme: themed = true, reloadWhenStale: _reload, ...connectOptions } = settings.current
    const read = (codec ?? (JSON_KEPT as KeptCodec<Kept>)).read

    const arrived = (next: ModuleContext) => {
      const said: PageTheme = next.theme === 'dark' ? 'dark' : 'light'
      if (themed) applyTheme(said, { remember: true })
      setTheme(said)
      setWhere('hosted')
      setContext(next)
    }

    const live = connect(
      id,
      {
        onHello: (next, state) => {
          /* The discarded mount's answer must not overwrite the live one; see `useKehikot`. */
          if (held.current !== live) return
          /* Before the context, so the first hosted render already has the remembered choice. */
          if (state !== undefined) setKept(read(state))
          arrived(next)
          handlers.current.onHello?.(next, state)
        },
        onContext: (next) => {
          if (held.current !== live) return
          arrived(next)
          handlers.current.onContext?.(next)
        },
        onGoto: (message, answer) => {
          /* Not guarded: the host is waiting on this one. Whichever mount hears it answers. */
          const handler = handlers.current.onGoto
          if (handler) handler(message, answer)
          else answer(false, 'This app is not showing anything that can be walked to.')
        },
        onEvent: (event) => {
          if (held.current !== live) return
          handlers.current.onEvent?.(event)
        },
        onClear: () => {
          if (held.current !== live) return
          handlers.current.onClear?.()
        },
        onRefresh: () => {
          if (held.current !== live) return
          handlers.current.onRefresh?.()
        },
      },
      connectOptions,
    )

    /* Stored BEFORE it listens: the mailbox replays synchronously inside `listen`. */
    held.current = live
    live.listen()

    const timer =
      grace > 0
        ? setTimeout(() => {
            if (held.current !== live || live.greeted()) return
            setWhere((was) => (was === 'listening' ? 'unhosted' : was))
            /* Nobody will say a theme. If the document decided none, the system's is the answer. */
            if (themed && pageTheme() === null) {
              const own = systemTheme()
              applyTheme(own)
              setTheme(own)
            }
          }, grace)
        : null

    return () => {
      if (timer !== null) clearTimeout(timer)
      live.stop()
      if (held.current === live) held.current = null
    }
  }, [id])

  useEffect(() => (settings.current.reloadWhenStale === false ? undefined : reloadWhenStale()), [])

  const request = useCallback((method: string, params: Record<string, unknown> = {}, asking?: AskOptions) => {
    const live = held.current
    if (live) return live.request(method, params, asking)
    return Promise.reject(new HostRefused({ reason: 'silent', error: NOBODY_TO_ASK }))
  }, [])

  const remember = useCallback((next: Kept) => {
    setKept(next)
    const live = held.current
    if (!live || !live.greeted()) return
    const write = (settings.current.kept ?? (JSON_KEPT as KeptCodec<Kept>)).write
    void live.request('state.set', { state: write(next) }).catch(() => {
      /* Reported nowhere on purpose: the choice holds for this session. */
    })
  }, [])

  const point = useCallback((passage: Passage | null) => {
    const live = held.current
    if (!live || !live.greeted()) return
    void live.request('passage.set', { passage }).catch(() => {})
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
    () => ({
      where,
      context,
      ...hostFields(context),
      theme,
      kept,
      remember,
      point,
      request,
      resize,
      filters,
      clearable,
      refreshable,
      connection,
    }),
    [where, context, theme, kept, remember, point, request, resize, filters, clearable, refreshable, connection],
  )
}
