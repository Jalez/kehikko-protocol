import type { ActivityItem, AddressIntent, AddressOpenResult, CanvasContainer, CodeLocation, EpicPart, FilterChoice, FilterGroup, FooterItemInput, HeaderItemInput, LocationIntent, LocationSetResult, ModuleContext, Passage, SharedAddress, SharedLocation } from '../index.js'
import type { PageTheme } from '../page.js'
import type { FindCount } from '../find.js'
import { scopeOf, type ContextScope } from '../context.js'
import { readScope, type ModuleScope } from '../scope.js'
import { addressOpenResult, locationSetResult } from '../methods.js'
import {
  HostRefused,
  NOBODY_TO_ASK,
  connect,
  type AskOptions,
  type ConnectOptions,
  type Connection,
  type HostEvents,
  type HostFacts,
} from './connect.js'
import { reloadWhenStale } from './ask.js'
import { headerItemsSchema, pressRefusal, type HeaderItem } from '../header.js'
import {
  KEEP_SCROLL_AFTER_MS,
  KEEP_SCROLL_ATTRIBUTE,
  RESTORE_SCROLL_WITHIN_MS,
  headerValues,
  unwrapKept,
  wrapKept,
  type KeptView,
} from './kept-view.js'
import type { PointerTarget } from './connect.js'
import { applyTheme, pageTheme, systemTheme } from './theme.js'
import { NOT_COVERED, type Covered } from '../reveal.js'

/**
 * The host as one value outside React: everything `useHost` arranges — the grace before
 * "unhosted", the theme on `<html>`, the flattened context, the kept state, the stale reload — for
 * a page whose state lives in a store of its own. `useHost` is this, bound to a component.
 * See docs/module-plumbing.md.
 */

/** How long, in ms, a page stays `listening` before it will say nobody is there (`unhosted`). */
export const GREETING_GRACE_MS = 700

/**
 * 2.51.0. How long, in ms, `useKept` waits after the last change before it sends `state.set`: a run
 * of presses through a switch is one write. A write still waiting when the person moves to another
 * kehikko, or the page stops, is sent at once, for the kehikko it was about.
 */
export const KEEP_AFTER_MS = 300

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
  /**
   * 2.70.0. Keep this container's view with the host by itself: the page's main scroll position and
   * the value of each of its header's switches and toggles, given back on the next greeting (the
   * scroll is restored; a switch or toggle that is not on its kept value is pressed, through
   * `onPress`, as a person would). Kept in the same string as the page's own kept state, which it
   * never touches (`kept-view.ts`). On by default; `false` keeps nothing, and an object narrows it.
   * Written only to a host that answers `state.set` for this module (`declares.uses: ['state:keep']`).
   */
  keepView?: boolean | KeepViewOptions
}

/** 2.70.0. What the scroll position is read from and written to. An element, or the document's scroller. */
export interface ScrollBox {
  scrollTop: number
  readonly scrollHeight: number
  readonly clientHeight: number
}

/** 2.70.0. What of the view is kept, and where it is heard. */
export interface KeepViewOptions {
  /**
   * The main scroller: `true` (the default) is the element marked `data-kehikot-scroll`, else the
   * document's own scroller; a function names another. `false` keeps no scroll position.
   */
  scroll?: boolean | (() => ScrollBox | null)
  /** `false` keeps no header values. Default `true`. */
  header?: boolean
  /** Header item ids whose value is not kept: a switch that follows something else, a toggle that starts a thing. */
  except?: readonly string[]
  /** Where a scroll, and the person's own wheel, key or press, is heard: `window` by default. For tests. */
  events?: PointerTarget | null
}

/** The fields of a standing that keep their identity while they say the same thing. */
export type SteadyField = 'passage' | 'location' | 'address' | 'containers' | 'parts' | 'selection' | 'chosen' | 'kehikko'

/** A page's own rule for "the same", per field: `(was, now) => true` keeps the object it was. */
export type Steadiness = { [Field in SteadyField]?: (was: HostFields[Field], now: HostFields[Field]) => boolean }

/** The flattened fields of a context: what a screen reads, each `null` or empty rather than absent. */
export interface HostFields {
  /** What the open project is called. A name, not a path. */
  project: string | null
  /** The absolute directory of the open project. `null` also for an empty string, or one that is only spaces. */
  projectPath: string | null
  /**
   * 2.1.0. The open project's permanent id (`context.projectId`): what to key machine-level state by,
   * with `projectPath` as the fallback while it is `null` (an older host). See `projectKey`.
   */
  projectId: string | null
  epic: string | null
  /**
   * 2.9.0. Whether the host is showing one epic (`epic`) or the whole project (`project`, "All epics";
   * `epic` is then `null` and `parts` empty). `epic` from a host that does not say. See `scopeOf`.
   */
  scope: ContextScope
  /**
   * 2.29.0. The scope this container works at (`context.scope`, read by `readScope`): `machine`,
   * `project`, `epic`, `part` or `kehikko`. `epic` from a host that does not say. `scope` above is the
   * same reading narrowed to the two words of 2.9.0.
   */
  workingScope: ModuleScope
  passage: Passage | null
  /**
   * 2.13.0. Where in a change's code somebody is pointing on this kehikko, and why
   * (`context.location`), or `null`. The same object while it says the same thing: a repeated
   * "comment here" is a new one, because `at` moved.
   */
  location: SharedLocation | null
  /**
   * 2.16.0. The last web address handed to this kehikko to be shown (`context.address`), or `null`.
   * The same object while it says the same thing; handed over again, it is a new one, because `at`
   * moved. A module that shows pages opens it when `addressIsNews`.
   */
  address: SharedAddress | null
  containers: readonly CanvasContainer[]
  /** The parts of the open epic, with which are picked out. Empty is the whole epic. */
  parts: readonly EpicPart[]
  selection: readonly string[]
  /** What the person chose in the filters this page offered with `filters()`. */
  chosen: FilterChoice
  /**
   * Which kehikko (canvas) this page is on, or `null`. Compare with an event's `kehikko` to tell
   * near from far. `key` is the identity to store; `id` is the host's row number, which changes when
   * a project is added again and differs between machines. `key` is absent from a host that does not send it.
   */
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
  /**
   * What the host kept for this module, read through the codec. `null` when nothing, or nothing recognised.
   * 2.51.0: for this CONTAINER — this module on the kehikko it was last told it is on — from a host
   * that says `context.kept`; replaced when the context names another kehikko. From an older host,
   * the one string per module its greeting carried.
   */
  kept: Kept | null
  /**
   * The methods this host said it will answer for this module (1.4.0), or `null` before the
   * greeting and from a host that does not say. `answers?.includes('parts.set')` is true or
   * false only when the host spoke; `null` means ask and see.
   */
  answers: readonly string[] | null
  /** Whether the host draws this module's header (1.4.0), or `null` when it did not say. See docs/header.md. */
  drawsHeader: boolean | null
  /**
   * 2.38.0. Whether the host draws this module's declared footer, or `null` when it did not say (a host
   * before 2.38.0, which does not). Declare a footer and draw none of your own only when this is `true`.
   * See docs/footer.md.
   */
  drawsFooter: boolean | null
  /** 2.40.0. The acts the host carries out itself for a run (`copy`, `open`), or `null` when it did not say (none). */
  hostCarries: readonly string[] | null
  /**
   * 2.46.0. The footer item kinds the host draws, or `null` when it did not say (a host before 2.46.0:
   * the 2.38.0 kinds, no field). `footerDraws({ footer: drawsFooter, footerKinds }, 'input')` is the rule.
   */
  footerKinds: readonly string[] | null
  /**
   * 2.42.0. How much of this page's frame the host's revealed header and footer cover now, in CSS
   * pixels from the top and from the bottom (`kehikot.covered`). Only ever non-zero for a module whose
   * manifest says `reveal: 'over'`, on a host that honours it; `{ top: 0, bottom: 0 }` otherwise. The
   * frame is not resized for it: move what must stay readable (`keepInView`), never refit.
   */
  covered: Covered
  /**
   * 2.45.0. Whether the host has this page on screen (`kehikot.visible`). `true` until a host says
   * otherwise — a host before 2.45.0 never does, and a page it frames is taken as shown. `false`
   * while the host keeps the page hidden on a kehikko the person left; nothing on it is being looked
   * at then.
   */
  visible: boolean
}

/** What a page says to its host, the same from the hook and from the store. */
export interface HostActions<Kept = unknown> {
  /**
   * Keep a value with the host (`state.set`) and hold it here. Fire and
   * forget: a host may refuse, and then the choice holds for this session.
   * Silent when nothing is framing the page.
   *
   * 2.51.0. Sent with the kehikko it is for (`state.set`'s `kehikko`), so a host keeps it for this
   * container. `after` (ms) waits for more before sending, the newest value winning; a write still
   * waiting is sent at once when the context names another kehikko, when the page stops, and by the
   * next `remember` without `after`. `useKept` passes `KEEP_AFTER_MS`.
   */
  remember: (next: Kept, after?: number) => void
  /**
   * Say which passage this page is pointing at (`passage.set`), or `null` for
   * none. Fire and forget, like `remember`.
   */
  point: (passage: Passage | null) => void
  /**
   * 2.13.0. Say where in a change's code the person is pointing (`location.set`), and why (`show`
   * when not said, or `comment`); `null` clears it. Resolves with the host's answer, or `null` when
   * nothing is framing the page or the host did not answer in the shape `locationSetResult` says.
   * Never rejects.
   */
  locate: (location: CodeLocation | null, intent?: LocationIntent) => Promise<LocationSetResult | null>
  /**
   * 2.16.0. Hand a web address to the canvas (`address.open`), for whichever module shows pages.
   * Resolves with the host's answer, or `null` when nothing is framing the page, the host does not
   * answer `address.open` (`answers`), or it did not answer in the shape `addressOpenResult` says.
   * Never rejects. A page that gets `null` or `declined` may do what it did before, on the press.
   */
  openAddress: (url: string, options?: { title?: string; intent?: AddressIntent }) => Promise<AddressOpenResult | null>
  /** Ask the host something. Rejects with `HostRefused`, always; safe before the greeting. Stable. */
  request: (method: string, params?: Record<string, unknown>, options?: AskOptions) => Promise<unknown>
  resize: (height: number) => void
  filters: (groups: FilterGroup[]) => void
  clearable: (label: string | null) => void
  refreshable: (state: { can?: boolean; at?: string | null; busy?: boolean }) => void
  /** Declare this page's header items, whole (`kehikot.header`); `[]` withdraws them. See `Connection.header`. */
  header: (items: HeaderItemInput[]) => void
  /** Declare this page's footer items, whole (`kehikot.footer`, 2.38.0); `[]` withdraws them. See `Connection.footer`. */
  footer: (items: FooterItemInput[]) => void
  /** Say what this page's things are doing, whole (`activity.set`, 1.5.0); `[]` for nothing. See `Connection.activity`. */
  activity: (items: ActivityItem[]) => void
  /** 2.69.0. Say what the open search comes to now (`kehikot.find.result`), from an `onFind`. See `Connection.findResult`. */
  findResult: (count: FindCount | 'unsupported') => void
  /** 2.70.0. Say the page is drawn, so the host's cover comes off. See `Connection.ready` and `holdCover`. */
  ready: () => void
  /** 2.70.0. Hear presses on a nested window too, and tell the host of them. See `Connection.pointerFrom` and `relayPointer`. */
  pointerFrom: (target: PointerTarget) => () => void
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

const STEADY: readonly SteadyField[] = ['passage', 'location', 'address', 'containers', 'parts', 'selection', 'chosen', 'kehikko']
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
    projectId: text(context?.projectId),
    epic: text(context?.epic),
    scope: scopeOf(context),
    workingScope: readScope(context?.scope),
    passage: context?.passage ?? null,
    location: context?.location ?? null,
    address: context?.address ?? null,
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
  const { grace = GREETING_GRACE_MS, kept: given, applyTheme: themed = true, reloadWhenStale: reloads = true, same, keepView = true, ...connectOptions } = options
  const codec = given ?? (JSON_KEPT as KeptCodec<Kept>)

  /* 2.70.0. The kept view: what is kept of it, the module's own string beside it, what is to be given back. */
  const viewing: KeepViewOptions | null = keepView === false ? null : keepView === true ? {} : keepView
  const keepHeader = viewing !== null && viewing.header !== false
  const except = new Set(viewing?.except ?? [])
  const scrollOf: (() => ScrollBox | null) | null =
    viewing === null || viewing.scroll === false
      ? null
      : typeof viewing.scroll === 'function'
        ? viewing.scroll
        : () => {
            if (typeof document === 'undefined') return null
            return (document.querySelector(`[${KEEP_SCROLL_ATTRIBUTE}]`) as ScrollBox | null) ?? (document.scrollingElement as ScrollBox | null)
          }
  const heardOn: PointerTarget | null = viewing === null ? null : viewing.events !== undefined ? viewing.events : typeof window === 'undefined' ? null : (window as unknown as PointerTarget)
  let ownRaw: string | null = null
  let view: KeptView = {}
  let keptRaw: string | null = null
  let restoreHeader: Record<string, string | boolean> | null = null
  let declaredHeader: HeaderItem[] = []
  let headerWritten: unknown = null
  const relays = new Set<PointerTarget>()
  const relayStops = new Map<PointerTarget, () => void>()

  let standing: HostStanding<Kept> = { where: 'listening', context: null, ...hostFields(null), theme: pageTheme() ?? 'light', kept: null, answers: null, drawsHeader: null, drawsFooter: null, hostCarries: null, footerKinds: null, covered: NOT_COVERED, visible: true }
  const hearers = new Set<() => void>()
  let live: Connection | null = null
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let unwatch: (() => void) | null = null
  /* 2.51.0. The kehikko the kept value is for (`undefined` before the greeting), and a write waiting to be sent. */
  let keptOn: number | null | undefined = undefined
  let waitingWrite: { state: string; kehikko: number | null } | null = null
  let writeTimer: ReturnType<typeof setTimeout> | null = null
  const sendWrite = () => {
    if (writeTimer !== null) clearTimeout(writeTimer)
    writeTimer = null
    const write = waitingWrite
    waitingWrite = null
    if (!write || !live || !live.greeted()) return
    keptRaw = write.state
    void live.request('state.set', write.kehikko === null ? { state: write.state } : { state: write.state, kehikko: write.kehikko }).catch(() => {
      /* Reported nowhere on purpose: the choice holds for this session. */
    })
  }

  const change = (next: Partial<HostStanding<Kept>>) => {
    standing = { ...standing, ...next }
    for (const heard of [...hearers]) heard()
  }

  /* 2.70.0. What is written for this container: the page's own string, and the view around it. */
  const keptString = (): string | null => (viewing === null ? ownRaw : wrapKept(view, ownRaw))
  /* The view changed: written after a pause, and only to a host that keeps state for this module. */
  const viewChanged = (after: number) => {
    if (!live || !live.greeted() || keptOn === undefined) return
    if (standing.answers !== null && !standing.answers.includes('state.set')) return
    const state = keptString()
    if (state === null || state === keptRaw) return
    waitingWrite = { state, kehikko: keptOn ?? null }
    if (writeTimer !== null) clearTimeout(writeTimer)
    writeTimer = setTimeout(sendWrite, after)
  }
  /* A kept switch or toggle that the page's header is not on: pressed, as the person would. */
  const giveBackHeader = (): Set<string> => {
    const pressed = new Set<string>()
    const onPress = events.onPress
    if (!onPress) restoreHeader = null
    if (!restoreHeader || !onPress) return pressed
    for (const [item, want] of Object.entries(restoreHeader)) {
      const declared = declaredHeader.find((one) => one.id === item)
      if (!declared) continue
      delete restoreHeader[item]
      const now = declared.kind === 'switch' ? declared.value : declared.kind === 'toggle' ? declared.checked : undefined
      if (now === undefined || now === want || pressRefusal(declaredHeader, { item, value: want }) !== null) continue
      pressed.add(item)
      try {
        const said = onPress({ item, value: want })
        if (said instanceof Promise) said.catch(() => {})
      } catch {
        /* A page that fails on its own press stays where it is. */
      }
    }
    if (!Object.keys(restoreHeader).length) restoreHeader = null
    return pressed
  }
  /* What the page's header is on now goes into the view, but for what is still to be given back. */
  const heardHeader = (items: unknown, skip: ReadonlySet<string> = new Set()) => {
    const parsed = headerItemsSchema.safeParse(items)
    declaredHeader = parsed.success ? parsed.data : []
    if (!keepHeader || keptOn === undefined) return
    const pressed = giveBackHeader()
    const values = headerValues(items, (id) => !except.has(id) && !pressed.has(id) && !skip.has(id) && !(restoreHeader && id in restoreHeader))
    const next = { ...(view.header ?? {}), ...values }
    for (const id of except) delete next[id]
    if (JSON.stringify(next) === JSON.stringify(view.header ?? {})) return
    view = { ...view, header: next }
    viewChanged(KEEP_AFTER_MS)
  }

  /* 2.70.0. The scroll: kept after the person stops, given back while the page draws what it reaches. */
  let restoring: { top: number; until: number; timer: ReturnType<typeof setTimeout> | null } | null = null
  let scrollTimer: ReturnType<typeof setTimeout> | null = null
  const stopRestoring = () => {
    if (restoring?.timer) clearTimeout(restoring.timer)
    restoring = null
  }
  const tryRestore = () => {
    if (!restoring || stopped) return
    const box = scrollOf?.()
    if (box) {
      box.scrollTop = restoring.top
      if (Math.abs(box.scrollTop - restoring.top) <= 1) {
        stopRestoring()
        return
      }
    }
    if (Date.now() >= restoring.until) {
      stopRestoring()
      return
    }
    restoring.timer = setTimeout(tryRestore, 100)
  }
  const restoreScroll = (top: number | undefined) => {
    stopRestoring()
    if (!scrollOf || top === undefined) return
    restoring = { top, until: Date.now() + RESTORE_SCROLL_WITHIN_MS, timer: null }
    tryRestore()
  }
  const scrolled = () => {
    if (restoring || !scrollOf || keptOn === undefined) return
    if (scrollTimer !== null) clearTimeout(scrollTimer)
    scrollTimer = setTimeout(() => {
      scrollTimer = null
      const box = scrollOf()
      if (!box || stopped) return
      const top = Math.max(0, Math.round(box.scrollTop))
      if ((view.scroll ?? 0) === top) return
      view = { ...view, ...(top > 0 ? { scroll: top } : { scroll: undefined }) }
      if (top === 0) delete view.scroll
      viewChanged(0)
    }, KEEP_SCROLL_AFTER_MS)
  }
  /* The person's own scroll wins over one still being given back. */
  const tookOver = () => {
    if (restoring) stopRestoring()
  }
  const listening: [string, () => void][] = [['scroll', scrolled], ['wheel', tookOver], ['touchstart', tookOver], ['keydown', tookOver], ['pointerdown', tookOver]]
  let unlisten: (() => void) | null = null

  const arrived = (context: ModuleContext, state?: string | null, facts?: HostFacts) => {
    const theme: PageTheme = context.theme === 'dark' ? 'dark' : 'light'
    if (themed) applyTheme(theme, { remember: true })
    /*
     * 2.51.0. Which string is this container's: the context's `kept` from a host that keeps one per
     * container, read on the greeting and whenever the context names another kehikko — never on a
     * context for the same one, which may be the echo of a write this page has since overtaken.
     * From an older host, the greeting's `state`, as before.
     */
    const on = context.kehikko?.id ?? null
    const greeting = state !== undefined
    let kept: string | null | undefined
    if (context.kept !== undefined && (greeting || on !== keptOn)) kept = context.kept
    else if (greeting) kept = state
    let own: string | null | undefined
    if (kept !== undefined) {
      /* A write still waiting is about the kehikko it was made on: sent before the next one's value arrives. */
      if (waitingWrite && on !== keptOn) sendWrite()
      keptOn = on
      /* 2.70.0. The module's own string out of the envelope, and the view to give back. */
      const opened = unwrapKept(kept)
      own = opened.state
      ownRaw = opened.state
      keptRaw = kept ?? null
      view = viewing !== null && opened.view ? { ...opened.view } : {}
      restoreHeader = keepHeader && view.header ? { ...view.header } : null
      for (const id of except) if (restoreHeader) delete restoreHeader[id]
    }
    /* The page never sees the envelope: its context carries its own string. */
    const seen = context.kept !== undefined ? { ...context, kept: unwrapKept(context.kept).state } : context
    /* The kept state with the context, in one change, so the first hosted standing already has the remembered choice. */
    change({ where: 'hosted', context: seen, ...hostFields(seen, standing, same), theme, ...(own !== undefined ? { kept: codec.read(own) } : {}), ...(facts ? { answers: facts.answers, drawsHeader: facts.header, drawsFooter: facts.footer ?? null, hostCarries: facts.carries ?? null, footerKinds: facts.footerKinds ?? null, covered: NOT_COVERED } : {}) })
    if (own !== undefined && viewing !== null) {
      heardHeader(headerWritten)
      restoreScroll(view.scroll)
    }
    return seen
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
          onHello: (context, state, facts) => {
            /* A stopped store's answer must not overwrite the live one: `StrictMode` mounts twice,
               and the mailbox replays to every subscriber. */
            if (stopped) return
            const seen = arrived(context, state, facts)
            events.onHello?.(seen, unwrapKept(state).state, facts)
          },
          onContext: (context) => {
            if (stopped) return
            const seen = arrived(context)
            events.onContext?.(seen)
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
          onOpened: (opened) => {
            if (!stopped) events.onOpened?.(opened)
          },
          onCovered: (covered) => {
            if (stopped) return
            if (covered.top !== standing.covered.top || covered.bottom !== standing.covered.bottom) change({ covered })
            events.onCovered?.(covered)
          },
          onVisible: (visible) => {
            if (stopped) return
            if (visible !== standing.visible) change({ visible })
            events.onVisible?.(visible)
          },
          onInbox: (signal) => {
            if (!stopped) events.onInbox?.(signal)
          },
          /* Only when the page takes presses: without a listener the connection answers for it. */
          ...(events.onPress ? { onPress: (press) => (stopped ? false : events.onPress!(press)) } : {}),
          /* 2.69.0. Only when the page searches itself: without a listener the client searches the page. */
          ...(events.onFind ? { onFind: (query, ask) => (stopped ? undefined : events.onFind!(query, ask)) } : {}),
        },
        connectOptions,
      )
      /* Stored BEFORE it listens: the mailbox replays synchronously inside `listen`. */
      live = connection
      for (const target of relays) relayStops.set(target, connection.pointerFrom(target))
      if (heardOn && scrollOf) {
        for (const [type, fn] of listening) heardOn.addEventListener(type, fn, { capture: true, passive: true })
        unlisten = () => {
          for (const [type, fn] of listening) heardOn.removeEventListener(type, fn, { capture: true })
        }
      }
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
      sendWrite()
      stopped = true
      stopRestoring()
      if (scrollTimer !== null) clearTimeout(scrollTimer)
      unlisten?.()
      unlisten = null
      if (timer !== null) clearTimeout(timer)
      unwatch?.()
      live?.stop()
      live = null
      hearers.clear()
    },

    remember(next, after = 0) {
      change({ kept: next })
      ownRaw = codec.write(next)
      if (!live || !live.greeted()) return
      waitingWrite = { state: keptString() ?? ownRaw, kehikko: keptOn ?? null }
      if (after > 0) {
        if (writeTimer !== null) clearTimeout(writeTimer)
        writeTimer = setTimeout(sendWrite, after)
        return
      }
      sendWrite()
    },

    point(passage) {
      if (!live || !live.greeted()) return
      void live.request('passage.set', { passage }).catch(() => {})
    },

    locate(location, intent) {
      if (!live || !live.greeted()) return Promise.resolve(null)
      return live
        .request('location.set', intent === undefined ? { location } : { location, intent })
        .then((answer) => {
          const read = locationSetResult.safeParse(answer)
          return read.success ? read.data : null
        })
        .catch(() => null)
    },

    openAddress(url, options = {}) {
      if (!live || !live.greeted()) return Promise.resolve(null)
      const answers = standing.answers
      if (answers !== null && !answers.includes('address.open')) return Promise.resolve(null)
      const params: Record<string, unknown> = { url }
      if (options.title !== undefined) params.title = options.title
      if (options.intent !== undefined) params.intent = options.intent
      return live
        .request('address.open', params)
        .then((answer) => {
          const read = addressOpenResult.safeParse(answer)
          return read.success ? read.data : null
        })
        .catch(() => null)
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
    header: (items) => {
      headerWritten = items
      live?.header(items)
      heardHeader(items)
    },
    footer: (items) => live?.footer(items),
    activity: (items) => live?.activity(items),
    findResult: (count) => live?.findResult(count),
    ready: () => live?.ready(),
    pointerFrom(target) {
      relays.add(target)
      if (live && !relayStops.has(target)) relayStops.set(target, live.pointerFrom(target))
      return () => {
        relays.delete(target)
        relayStops.get(target)?.()
        relayStops.delete(target)
      }
    },
    connection: () => live,
  }
  return store
}
