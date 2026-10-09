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
import { reloadWhenStale } from './ask.js'
import { applyTheme, pageTheme, systemTheme } from './theme.js'

/**
 * The host as one value outside React: everything `useHost` arranges — the grace before
 * "unhosted", the theme on `<html>`, the flattened context, the kept state, the stale reload — for
 * a page whose state lives in a store of its own. `useHost` is this, bound to a component.
 * See docs/module-plumbing.md.
 */

/** How long, in ms, a page stays `listening` before it will say nobody is there (`unhosted`). */
export const GREETING_GRACE_MS = 700

/**
 * Whether anything is framing this page: `listening` (not heard yet, under a second), `unhosted`
 * (nobody is there, the standalone case) or `hosted`.
 */
export type Where = 'listening' | 'unhosted' | 'hosted'

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

export interface HostStoreOptions<Kept = unknown> extends ConnectOptions {
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
  /**
   * When a field of the context counts as the one it was, for a page whose rule is looser than
   * "says the same thing all the way down": a passage whose section ends somewhere else is still
   * the same passage. Per field; a field without a rule here is compared deeply. Read at mount.
   */
  same?: Steadiness
}

/** The fields of a standing that keep their identity while they say the same thing. */
export type SteadyField = 'passage' | 'containers' | 'parts' | 'selection' | 'chosen' | 'kehikko'

/** A page's own rule for "the same", per field: `(was, now) => true` keeps the object it was. */
export type Steadiness = { [Field in SteadyField]?: (was: HostFields[Field], now: HostFields[Field]) => boolean }

/** The flattened fields of a context: what a screen reads, each `null` or empty rather than absent. */
export interface HostFields {
  /** What the open project is called. A name, not a path. */
  project: string | null
  /** The absolute directory of the open project. `null` also for an empty string, or one that is only spaces. */
  projectPath: string | null
  epic: string | null
  passage: Passage | null
  containers: readonly CanvasContainer[]
  /** The parts of the open epic, with which are picked out. Empty is the whole epic. */
  parts: readonly EpicPart[]
  selection: readonly string[]
  /** What the person chose in the filters this page offered with `filters()`. */
  chosen: FilterChoice
  /** Which kehikko (canvas) this page is on, or `null`. Compare with an event's `kehikko` to tell near from far. */
  kehikko: ModuleContext['kehikko']
}

/** Where the host stands, as one value. A new object whenever anything in it changed, and only then. */
export interface HostStanding<Kept = unknown> extends HostFields {
  /** `listening` for under a second, then `unhosted`, or `hosted` from the greeting on. */
  where: Where
  /** The whole context as the host last said it, or `null` before the greeting. */
  context: ModuleContext | null
  /** What is on `<html>`: the host's theme once it has said one, the page's own first guess before. */
  theme: PageTheme
  /** What the host kept for this module, read through the codec. `null` when nothing, or nothing recognised. */
  kept: Kept | null
}

/** What a page says to its host, the same from the hook and from the store. */
export interface HostActions<Kept = unknown> {
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
}

export interface HostStore<Kept = unknown> extends HostActions<Kept> {
  /** The standing now. The same object until something changes, so it is a `useSyncExternalStore` snapshot. */
  get: () => HostStanding<Kept>
  /** Hear every change, after `get()` already says it. Returns the function that stops hearing. */
  subscribe: (heard: () => void) => () => void
  /** Start listening. Whatever has already arrived is replayed inside this call. Once. */
  start: () => HostStore<Kept>
  /** Stop for good: the connection, the grace, the stale watch. A stopped store says nothing more. */
  stop: () => void
  /** The connection, or `null` before `start` and after `stop`. */
  connection: () => Connection | null
}

const STEADY: readonly SteadyField[] = ['passage', 'containers', 'parts', 'selection', 'chosen', 'kehikko']
const NONE: readonly never[] = []
const NO_CHOICE: FilterChoice = {}
const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null)

/** Whether two values off the wire say the same thing: JSON all the way down. */
function alike(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const [one, other] = [a as Record<string, unknown>, b as Record<string, unknown>]
  const keys = Object.keys(one)
  return keys.length === Object.keys(other).length && keys.every((key) => Object.hasOwn(other, key) && alike(one[key], other[key]))
}

/**
 * The flattened fields of a context. Pure, so a test can build a `Host` from a plain object.
 * Given the fields as they were, each one that still says the same thing IS the one it was: every
 * context is parsed afresh off the wire, and an effect that depends on `passage` should run when
 * the passage changed, not whenever the host spoke. `same` replaces that rule for the fields it names.
 */
export function hostFields(context: ModuleContext | null, was?: HostFields, same: Steadiness = {}): HostFields {
  const now: HostFields = {
    project: text(context?.project),
    projectPath: text(context?.projectPath),
    epic: text(context?.epic),
    passage: context?.passage ?? null,
    containers: context?.containers ?? NONE,
    parts: context?.parts ?? NONE,
    selection: context?.selection ?? NONE,
    chosen: context?.filters ?? NO_CHOICE,
    kehikko: context?.kehikko ?? null,
  }
  if (!was) return now
  for (const name of STEADY) {
    const rule = same[name] as ((a: unknown, b: unknown) => boolean) | undefined
    if (rule ? rule(was[name], now[name]) : alike(was[name], now[name])) (now as unknown as Record<string, unknown>)[name] = was[name]
  }
  return now
}

/**
 * Build the store. Nothing is heard until `start()`. `events` are the page's own handlers, called
 * AFTER the standing has changed — so a handler that reads `get()` finds what it was just told,
 * which matters for a greeting replayed before anything has rendered.
 */
export function hostStore<Kept = unknown>(
  id: string,
  events: HostEvents = {},
  options: HostStoreOptions<Kept> = {},
): HostStore<Kept> {
  const { grace = GREETING_GRACE_MS, kept: given, applyTheme: themed = true, reloadWhenStale: reloads = true, same, ...connectOptions } = options
  const codec = given ?? (JSON_KEPT as KeptCodec<Kept>)

  let standing: HostStanding<Kept> = { where: 'listening', context: null, ...hostFields(null), theme: pageTheme() ?? 'light', kept: null }
  const hearers = new Set<() => void>()
  let live: Connection | null = null
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let unwatch: (() => void) | null = null

  const change = (next: Partial<HostStanding<Kept>>) => {
    standing = { ...standing, ...next }
    for (const heard of [...hearers]) heard()
  }

  const arrived = (context: ModuleContext, state?: string | null) => {
    const theme: PageTheme = context.theme === 'dark' ? 'dark' : 'light'
    if (themed) applyTheme(theme, { remember: true })
    /* The kept state with the context, in one change, so the first hosted standing already has the remembered choice. */
    change({ where: 'hosted', context, ...hostFields(context, standing, same), theme, ...(state !== undefined ? { kept: codec.read(state) } : {}) })
  }

  const store: HostStore<Kept> = {
    get: () => standing,
    subscribe(heard) {
      hearers.add(heard)
      return () => hearers.delete(heard)
    },

    start() {
      if (live || stopped) return store
      const connection = connect(
        id,
        {
          onHello: (context, state) => {
            /* A stopped store's answer must not overwrite the live one: `StrictMode` mounts twice,
               and the mailbox replays to every subscriber. */
            if (stopped) return
            arrived(context, state)
            events.onHello?.(context, state)
          },
          onContext: (context) => {
            if (stopped) return
            arrived(context)
            events.onContext?.(context)
          },
          onGoto: (message, answer) => {
            /* Not guarded: the host is waiting on this one. Whoever hears it answers. */
            if (events.onGoto) events.onGoto(message, answer)
            else answer(false, 'This app is not showing anything that can be walked to.')
          },
          onEvent: (event) => {
            if (!stopped) events.onEvent?.(event)
          },
          onClear: () => {
            if (!stopped) events.onClear?.()
          },
          onRefresh: () => {
            if (!stopped) events.onRefresh?.()
          },
        },
        connectOptions,
      )
      /* Stored BEFORE it listens: the mailbox replays synchronously inside `listen`. */
      live = connection
      connection.listen()

      if (grace > 0) {
        timer = setTimeout(() => {
          if (stopped || connection.greeted()) return
          const unhosted: Partial<HostStanding<Kept>> = standing.where === 'listening' ? { where: 'unhosted' } : {}
          /* Nobody will say a theme. If the document decided none, the system's is the answer. */
          if (themed && pageTheme() === null) {
            const own = systemTheme()
            applyTheme(own)
            unhosted.theme = own
          }
          if (Object.keys(unhosted).length) change(unhosted)
        }, grace)
      }
      if (reloads) unwatch = reloadWhenStale()
      return store
    },

    stop() {
      stopped = true
      if (timer !== null) clearTimeout(timer)
      unwatch?.()
      live?.stop()
      live = null
      hearers.clear()
    },

    remember(next) {
      change({ kept: next })
      if (!live || !live.greeted()) return
      void live.request('state.set', { state: codec.write(next) }).catch(() => {
        /* Reported nowhere on purpose: the choice holds for this session. */
      })
    },

    point(passage) {
      if (!live || !live.greeted()) return
      void live.request('passage.set', { passage }).catch(() => {})
    },

    request(method, params = {}, asking) {
      if (live) return live.request(method, params, asking)
      /* Refused in the connection's own words, so a caller sees one sentence for "nobody is there". */
      return Promise.reject(new HostRefused({ reason: 'silent', error: NOBODY_TO_ASK }))
    },

    resize: (height) => live?.resize(height),
    filters: (groups) => live?.filters(groups),
    clearable: (label) => live?.clearable(label),
    refreshable: (state) => live?.refreshable(state),
    connection: () => live,
  }
  return store
}
