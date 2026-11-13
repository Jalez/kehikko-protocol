import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ActivityItem, AddressIntent, CodeLocation, FilterGroup, FooterItemInput, HeaderItemInput, LocationIntent, Passage } from '../index.js'
import { HostRefused, NOBODY_TO_ASK, type AskOptions, type Connection, type HostEvents, type PointerTarget } from './connect.js'
import type { FindCount } from '../find.js'
import {
  JSON_KEPT,
  KEEP_AFTER_MS,
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

export { JSON_KEPT, KEEP_AFTER_MS, hostFields, type KeptCodec } from './host-store.js'

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
  /* 2.70.0. Nested windows to hear presses on, kept across mounts: a child's effect runs before this one's. */
  const relays = useRef(new Map<PointerTarget, (() => void) | null>())
  /* And whether the page said it is drawn before the store was there to say it — or, 2.84.0, what it said it is loading. */
  const saidReady = useRef(false)
  const saidLoading = useRef<{ label: string | null } | null>(null)

  useEffect(() => {
    const mounted = settings.current
    const read = (mounted.kept ?? (JSON_KEPT as KeptCodec<Kept>)).read
    const live = hostStore<Kept>(
      id,
      {
        onHello: (context, state, facts) => handlers.current.onHello?.(context, state, facts),
        onContext: (context) => handlers.current.onContext?.(context),
        onGoto: (message, answer) => {
          const handler = handlers.current.onGoto
          if (handler) handler(message, answer)
          else answer(false, 'This app is not showing anything that can be walked to.')
        },
        onEvent: (event) => handlers.current.onEvent?.(event),
        onClear: () => handlers.current.onClear?.(),
        onRefresh: () => handlers.current.onRefresh?.(),
        onOpened: (opened) => handlers.current.onOpened?.(opened),
        onDrop: (drop) => handlers.current.onDrop?.(drop),
        onCovered: (covered) => handlers.current.onCovered?.(covered),
        onVisible: (visible) => handlers.current.onVisible?.(visible),
        onInbox: (signal) => handlers.current.onInbox?.(signal),
        /* Always given, and read through the ref: a handler added on a later render is heard. */
        onPress: (press) => (handlers.current.onPress ? handlers.current.onPress(press) : 'This app declared that item and does not take presses.'),
        /* 2.69.0. Always given, through the ref; without a handler the client's own search answers. */
        onFind: (query, ask) => (handlers.current.onFind ? handlers.current.onFind(query, ask) : 'default'),
      },
      /* The codec is read at mount and written through whichever one is current. */
      { ...mounted, kept: { read, write: (kept) => (settings.current.kept ?? (JSON_KEPT as KeptCodec<Kept>)).write(kept) } },
    )
    /* Stored BEFORE it starts: the mailbox replays synchronously inside `start`. */
    held.current = live
    live.subscribe(() => setStanding(live.get()))
    for (const target of relays.current.keys()) relays.current.set(target, live.pointerFrom(target))
    live.start()
    if (saidReady.current) live.ready()
    else if (saidLoading.current) live.loading(saidLoading.current.label)

    return () => {
      for (const [target, stop] of relays.current) {
        stop?.()
        relays.current.set(target, null)
      }
      live.stop()
      if (held.current === live) held.current = null
    }
  }, [id])

  const request = useCallback((method: string, params: Record<string, unknown> = {}, asking?: AskOptions) => {
    const live = held.current
    if (live) return live.request(method, params, asking)
    return Promise.reject(new HostRefused({ reason: 'silent', error: NOBODY_TO_ASK }))
  }, [])

  const remember = useCallback((next: Kept, after?: number) => {
    const live = held.current
    if (live) live.remember(next, after)
    else setStanding((was) => ({ ...was, kept: next }))
  }, [])

  const point = useCallback((passage: Passage | null) => held.current?.point(passage), [])
  const locate = useCallback(
    (location: CodeLocation | null, intent?: LocationIntent) => held.current?.locate(location, intent) ?? Promise.resolve(null),
    [],
  )
  const openAddress = useCallback(
    (url: string, options?: { title?: string; intent?: AddressIntent }) => held.current?.openAddress(url, options) ?? Promise.resolve(null),
    [],
  )
  const resize = useCallback((height: number) => held.current?.resize(height), [])
  const filters = useCallback((groups: FilterGroup[]) => held.current?.filters(groups), [])
  const clearable = useCallback((label: string | null) => held.current?.clearable(label), [])
  const refreshable = useCallback(
    (state: { can?: boolean; at?: string | null; busy?: boolean }) => held.current?.refreshable(state),
    [],
  )
  const header = useCallback((items: HeaderItemInput[]) => held.current?.header(items), [])
  const footer = useCallback((items: FooterItemInput[]) => held.current?.footer(items), [])
  const activity = useCallback((items: ActivityItem[]) => held.current?.activity(items), [])
  const findResult = useCallback((count: FindCount | 'unsupported') => held.current?.findResult(count), [])
  const connection = useCallback(() => held.current?.connection() ?? null, [])
  const ready = useCallback(() => {
    saidReady.current = true
    saidLoading.current = null
    held.current?.ready()
  }, [])
  const loading = useCallback((label?: string | null) => {
    saidReady.current = false
    saidLoading.current = { label: label ?? null }
    held.current?.loading(label)
  }, [])
  const pointerFrom = useCallback((target: PointerTarget) => {
    const map = relays.current
    if (!map.has(target)) map.set(target, held.current ? held.current.pointerFrom(target) : null)
    return () => {
      map.get(target)?.()
      map.delete(target)
    }
  }, [])
  const read = useCallback(() => held.current?.get() ?? drawn.current, [])

  return useMemo(
    () => ({ ...standing, remember, point, locate, openAddress, request, resize, filters, clearable, refreshable, header, footer, activity, findResult, ready, loading, pointerFrom, connection, read }),
    [standing, remember, point, locate, openAddress, request, resize, filters, clearable, refreshable, header, footer, activity, findResult, ready, loading, pointerFrom, connection, read],
  )
}

/**
 * 2.84.0. Tell the host whether the page shows what it is for: `drawn` true says `ready()`, false says
 * `loading(label)`. Pass the page's own "is what I show read and drawn?" — false while it reads what
 * a new epic, project or set of parts asks for. The host covers the container, with the module's icon
 * and `label` ("Loading the journey…"), only when a context came and the page did not draw it within
 * `LOADING_COVER_AFTER_MS`; a page that stays drawn through a context is never covered. On the first
 * greeting `label` is what the held cover says.
 */
export function useDrawn(host: { ready: () => void; loading: (label?: string | null) => void }, drawn: boolean, label?: string | null): void {
  const { ready, loading } = host
  useEffect(() => {
    if (drawn) ready()
    else loading(label)
  }, [drawn, label, ready, loading])
}

/** What `useKept` needs of a host: `useHost`'s value, or anything with the same three members. */
export interface KeepsFor {
  kept: unknown
  read: () => { kept: unknown }
  remember: (next: never, after?: number) => void
}

/** Whether a kept value can stand for `initial`: the same kind of value (an array for an array). */
function sameKind(initial: unknown, value: unknown): boolean {
  if (initial === null || initial === undefined) return true
  if (Array.isArray(initial)) return Array.isArray(value)
  return typeof value === typeof initial && value !== null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * 2.51.0. One field of this container's kept view, as `useState`: `const [view, setView] =
 * useKept(host, 'view', 'list')`. Read from the host's kept value (a JSON object, one key per field)
 * and written back into it, the other fields kept, after `KEEP_AFTER_MS`. The host keeps it per
 * container — this module on this kehikko — so the same module on two kehikot keeps two views, and
 * each is back after the app restarts. Nothing goes to browser storage.
 *
 * `initial` is what is shown when nothing is kept, or what is kept is not the same kind of value
 * (`valid`, when given, decides instead: a switch's options, say). The kept value arrives with the
 * greeting, before the first hosted render, so a page that waits for `where === 'hosted'` never
 * draws the default first. Several `useKept` on one host share its kept object; a page that also
 * calls `remember` itself must keep that object's other keys.
 */
export function useKept<T>(
  host: KeepsFor,
  key: string,
  initial: T,
  valid?: (value: unknown) => boolean,
): [T, (next: T | ((was: T) => T)) => void] {
  const kept = isRecord(host.kept) ? host.kept : null
  const raw = kept && Object.prototype.hasOwnProperty.call(kept, key) ? kept[key] : undefined
  const value = raw !== undefined && (valid ? valid(raw) : sameKind(initial, raw)) ? (raw as T) : initial
  const now = useRef(value)
  now.current = value
  const bound = useRef(host)
  bound.current = host
  const set = useCallback(
    (next: T | ((was: T) => T)) => {
      const resolved = typeof next === 'function' ? (next as (was: T) => T)(now.current) : next
      now.current = resolved
      const was = bound.current.read().kept
      const base = isRecord(was) ? was : {}
      ;(bound.current.remember as (next: unknown, after?: number) => void)({ ...base, [key]: resolved }, KEEP_AFTER_MS)
    },
    [key],
  )
  return [value, set]
}
