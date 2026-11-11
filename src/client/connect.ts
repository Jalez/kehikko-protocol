import { pageBuild } from './build.js'
import {
  HOLD_COVER_MS,
  MESSAGE,
  PROTOCOL,
  clampHeight,
} from '../constants.js'
import { LIMITS } from '../limits.js'
import { activityItemsSchema, type ActivityItem } from '../activity.js'
import {
  footerItemsSchema,
  footerPressRefusal,
  headerItemsSchema,
  hostMessageSchema,
  looksLikeWireMessage,
  pressRefusal,
  type FilterGroup,
  type FooterItem,
  type FooterItemInput,
  type Goto,
  type HeaderItem,
  type HeaderItemInput,
  type ModuleContext,
  type ModuleEvent,
  type Press,
  type ResponseFailureReason,
} from '../wire.js'

import { tooOldOf } from '../fit.js'
import { rowsAdvice } from '../rows.js'
import type { Covered } from '../reveal.js'
import { mailbox, type MessageSource } from './mailbox.js'
import { mayGreet, pageOrigins } from './greet.js'
import { reportPageError } from './errors.js'
import { pageFind, type PageFind, type PageFindOptions } from './find.js'
import type { FindCount, FindDirection, FindOptions } from '../find.js'

export { mayGreet, pageOrigins } from './greet.js'


/** The project folder a greeting or a context names, or null. */
function projectOf(context: unknown): string | null {
  const path = (context as { projectPath?: unknown } | null | undefined)?.projectPath
  return typeof path === 'string' && path ? path : null
}

/** The project id (2.1.0) a greeting or a context names, or null: an older host names none. */
function projectIdOf(context: unknown): string | null {
  const id = (context as { projectId?: unknown } | null | undefined)?.projectId
  return typeof id === 'string' && id ? id : null
}

/**
 * The bridge: one conversation with one window, in the shape this package's schemas define.
 * A greeting is taken from an origin the page may be framed by (`mayGreet`); after it, identity is
 * the greeting's window handle (`MessageEvent.source`), never the origin. Everything the host sends
 * is parsed with `hostMessageSchema`. A convenience — a module may hand-roll it all.
 * Design notes: docs/client.md.
 */

/**
 * Why a question came back without an answer: the protocol's three reasons, plus `silent` for a
 * timeout or a host that is not there.
 */
export type Refusal = {
  reason: ResponseFailureReason | 'silent'
  error: string
  /**
   * 2.22.0. `host-too-old`: the host does not know the method and this package does, so the host is
   * older than the method (`since`, from this package's `SINCE`). Read it with `hostTooOld`.
   */
  declined?: 'host-too-old'
  /** 2.22.0. The version that has the method, beside `declined`; null when neither side can say. */
  since?: string | null
}

/** A refusal, as a thrown thing. Every rejection from `request` is one of these, always. */
export class HostRefused extends Error {
  constructor(readonly refusal: Refusal) {
    super(refusal.error)
    this.name = 'HostRefused'
  }
}

/** How long to wait for one answer, in ms, before the question is refused as `silent`. */
export const ANSWER_WITHIN_MS = 12_000

/**
 * How long to wait, in ms, for an answer that waits on a PERSON (`projects.pick`): five minutes.
 * Passed per question as `within`; never the connection's default.
 */
export const PERSON_ANSWERS_WITHIN_MS = 5 * 60_000

/**
 * How long, in ms, a `goto` listener has before the backstop answers `false` for it. Far shorter
 * than the host's own timeout.
 */
export const GOTO_BACKSTOP_MS = 500

/**
 * How long, in ms, an `onPress` listener has to say whether it took a press before the backstop
 * answers "not taken" for it. Long enough to ask the page's own server to start something; a run
 * that takes longer answers at once and reports through its header.
 */
export const PRESS_BACKSTOP_MS = 2_000

/**
 * What an `onPress` listener says about one press: nothing or `true` for "taken", a sentence for
 * "not taken, and this is why", `false` for "not taken". A promise of any of them is waited for.
 */
export type PressAnswer = void | boolean | string

/** What a question asked before any greeting is refused with. The React hook says the same between mounts. */
export const NOBODY_TO_ASK = 'Nothing has greeted this page, so there is nobody to ask.'

/**
 * What a greeting says about the host itself (1.4.0). Each is `null` when the host did not say: a
 * host before 1.4.0, which is "unknown", not "no".
 */
export interface HostFacts {
  /** The methods this host will answer for this module, or `null`. `answers?.includes('parts.set')`. */
  answers: readonly string[] | null
  /** Whether this host draws the module's header in its own menus, or `null`. */
  header: boolean | null
  /**
   * 2.38.0. Whether this host draws the module's declared footer, or `null` when it did not say: a
   * host before 2.38.0, which does not. Only `true` means "declare it and draw none of your own".
   */
  footer: boolean | null
  /**
   * 2.40.0. The acts this host carries out itself for a run in the person's click (`copy`, `open`), or
   * `null` from a host before 2.40.0, which carries out none. Give a run `copy` or `open` only when it
   * names the act; otherwise do the act in your own page.
   */
  carries: readonly string[] | null
  /**
   * 2.46.0. The footer item kinds this host draws, or `null` from a host before 2.46.0, which draws
   * the 2.38.0 kinds and no field. `footerDraws(facts, 'input')` is the rule.
   */
  footerKinds: readonly string[] | null
  /**
   * 2.69.0. Whether this host draws a find bar for this page, or `null` from a host before 2.69.0,
   * which does not. When `true`, `connect` catches ⌘F inside the page and answers the bar.
   */
  find?: boolean | null
}

/**
 * 2.69.0. What an `onFind` listener says: the count (`{ total, current }`, `current` 1-based and 0
 * when there are none), `'unsupported'` for "this page cannot search what it shows", `'default'` to
 * leave this search to the client's own (`pageFind`), or nothing when the page will say the count
 * itself with `findResult` (a search that finishes later). A promise of any of them is waited for.
 */
export type FindAnswer = FindCount | 'unsupported' | 'default' | void

/** 2.69.0. What an `onFind` listener is told beside the query. */
export interface FindAsk extends FindOptions {
  direction: FindDirection
}

/** 2.69.0. What `connect` reads of a key: enough to tell ⌘F and ⌘G, and to leave a key a page took. */
export interface KeyEventLike {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  defaultPrevented?: boolean
  preventDefault: () => void
}

/** 2.69.0. Where `connect` hears ⌘F: a window, or anything shaped like one. */
export interface KeyTarget {
  addEventListener(type: 'keydown', listener: (event: KeyEventLike) => void): void
  removeEventListener(type: 'keydown', listener: (event: KeyEventLike) => void): void
}

export interface HostEvents {
  /**
   * The greeting arrived, with its context and whatever this module last asked the host to keep.
   * `state` is `null` when the host keeps nothing: a first run, a host that does not answer
   * `state.set`, or a module that has never written any.
   */
  onHello?: (context: ModuleContext, state: string | null, host?: HostFacts) => void
  /** The reader switched epics, or this tab was shown again. */
  onContext?: (context: ModuleContext) => void
  /**
   * "Go to this reference." The host is waiting on `answer`, which may be called later than the
   * listener returns. `connect` guarantees exactly one answer: it says `false` itself after
   * `GOTO_BACKSTOP_MS`, when the listener throws, or when there is no listener.
   */
  onGoto?: (goto: Goto, answer: (found: boolean, why?: string) => void) => void
  /**
   * Something another module emitted, carried here by the host. Handed over whole: `extension`
   * says which format `payload` is in; `from`, `at` and `kehikko` are what a receiver filters on.
   */
  onEvent?: (event: ModuleEvent) => void
  /**
   * The host's clear control was pressed, twice: delete what this page is showing, applying the
   * same narrowing the render did. Only reaches a module that announced `clearable`. No parameters
   * and no reply — call `clearable` again when done, with the new label or `null`.
   */
  onClear?: () => void
  /**
   * The host's refresh control was pressed, or this container's interval elapsed: read your
   * material again. Only reaches a module that announced `refreshable`; it is not told which of the
   * two it was. No reply — call `refreshable` with `busy: true` going in and with `at` coming out.
   */
  onRefresh?: () => void
  /**
   * One of this page's header items was pressed, by a person in the host's menus or by an agent
   * through the host: `item` is its id, `value` the option chosen (switch, go) or the state wanted
   * (toggle). Only reaches a page that declared the item with `header`; a press the last header
   * cannot take is refused before this is called. 2.38.0: `place` is `'footer'` for an item of the
   * page's footer (declared with `footer`), absent for one of its header. 2.46.0: a footer field
   * submitted with Enter arrives here too, with `text` (what was typed). Do it, declare the header again, and return
   * nothing — or return the sentence saying why not. `connect` answers the host exactly once.
   */
  onPress?: (press: Pick<Press, 'item' | 'value' | 'place' | 'carried' | 'text'>) => PressAnswer | Promise<PressAnswer>
  /**
   * The person opened one of this module's Inbox items (2.35.0): pressed it in the Inbox, on a
   * toast or with Next, and the host has gone to its place. `item` is the id the module reported.
   * Show that thing and count it as seen; nothing is answered. What the host shows next is still
   * the module's next `activity` list. See `openedSchema`.
   */
  onOpened?: (opened: { item: string }) => void
  /**
   * How much of this page's frame the host's revealed header and footer cover now (2.42.0), in CSS
   * pixels from the top and the bottom; `{ top: 0, bottom: 0 }` when they hid. Only for a module whose
   * manifest says `reveal: 'over'`. The frame keeps its size: move what must stay readable out from
   * under the rows (`keepInView`), never refit. `hostStore` and `useHost` also keep it as `covered`.
   */
  onCovered?: (covered: Covered) => void
  /**
   * Whether this page is on screen now (2.45.0): `false` when the host hid it (the person left for a
   * kehikko it is not on; the page keeps running), `true` when it is shown again — the person
   * arriving back — and once after every greeting. A hidden page is not being looked at: do not count
   * anything as seen by the person while it is, and count what is in front of them when it is shown.
   * A host before 2.45.0 never calls it. `hostStore` and `useHost` also keep it as `visible`.
   */
  onVisible?: (visible: boolean) => void
  /**
   * 2.79.0. The person's Inbox, for a module whose manifest declares `inbox:person`: `changed` — read
   * it again (`inbox.read`); `next` — the person pressed the host's shortcut for the next thing that
   * needs them, `next` names it (null: nothing does) and the page goes to it with `inbox.open`.
   * A host before 2.79.0 never calls it.
   */
  onInbox?: (signal: { kind: 'changed' | 'next'; rev: number; next: { module: string; id: string } | null }) => void
  /**
   * 2.69.0. The host's find bar asks this page to search what it shows: `query`, with `ask`'s
   * options and `direction` — `first` (search anew; go to the first match at or after what is on
   * screen), `next`/`prev` (move, wrapping), or `close` (clear every mark; the answer is not read).
   * Give it only when the page's text is not in the DOM — a terminal's buffer, a canvas, a
   * virtualised list, an editor with its own search — and return the count (`FindAnswer`). Without
   * it, the client searches the page's visible text itself (`pageFind`). When the count changes by
   * itself (new output while the bar is open), say it with `findResult`.
   */
  onFind?: (query: string, ask: FindAsk) => FindAnswer | Promise<FindAnswer>
}

/**
 * What a single question may say about itself, beyond its params. A ceiling on waiting, never a
 * promise about answering; nothing here reaches the host.
 */
export interface AskOptions {
  /** Milliseconds to wait for this one answer. Defaults to the connection's own. */
  within?: number
}

export interface ConnectOptions {
  /** What to listen to. The `mailbox` by default; injectable so tests need no browser. */
  source?: MessageSource
  /** Override `ANSWER_WITHIN_MS`, for a module whose one question is genuinely slower. */
  answerWithin?: number
  /** Override `GOTO_BACKSTOP_MS`. Shorten it freely; lengthening it past the host's own timeout does nothing. */
  gotoBackstop?: number
  /** Override `PRESS_BACKSTOP_MS`. */
  pressBackstop?: number
  /**
   * The origins a greeting is taken from, instead of the ones the page's server printed
   * (`pageOrigins`): for a page that is not served by this package's doors.
   */
  origins?: readonly string[]
  /**
   * 2.49.0. Where the person's presses are heard, to tell a host that asked (`hello.pointer`):
   * this page's `window` by default; injectable so tests need no browser. `false` sends none.
   */
  pointerTarget?: PointerTarget | false
  /**
   * 2.69.0. Where ⌘F and ⌘G are heard, to open the host's find bar (`hello.find`): this page's
   * `window` by default. `false` leaves the keys alone — for a page whose editor binds its own find;
   * a page can equally take the key itself (`preventDefault` in its own handler: a key a page took
   * is left alone). The bar still opens from the host and still reaches `onFind`.
   */
  findKeys?: KeyTarget | false
  /**
   * 2.69.0. The client's own search of the page's text (`pageFind`), used when there is no
   * `onFind` or it answers `'default'`: where it searches and how. `false` has none, so a page with
   * no `onFind` answers that it cannot be searched.
   */
  findIn?: PageFindOptions | false
  /** 2.69.0. Whether ⌘ (true) or Ctrl (false) is the find key. Found from the platform by default. */
  mac?: boolean
  /**
   * 2.70.0. Keep the host's cover up until the page calls `ready()`: `ready` goes with `hold: true`, and
   * `kehikot.drawn` follows when the page is drawn — or by itself after `HOLD_COVER_MS` (a number here
   * is that wait instead). On by default, so a page draws no "Reading…" of its own; `false` says the
   * page is ready the moment it is greeted, as before 2.70.0. A host before 2.70.0 ignores the hold.
   */
  holdCover?: boolean | number
  /**
   * 2.70.0. `false` keeps `rowsAdvice` off the console. On by default: each sentence once per page,
   * when a header or footer is declared, and "no footer" a moment after the last declaration.
   */
  rowsAdvice?: boolean
}

/** 2.70.0. How long after the last header or footer declaration the client says a missing footer, in ms. */
export const ROWS_ADVICE_AFTER_MS = 1500

/** What `connect` reads of a press: which button, whether it is the primary pointer, and where (2.50.1). */
export interface PointerEventLike {
  button?: number
  isPrimary?: boolean
  clientX?: number
  clientY?: number
  /** `mouse`, `pen` or `touch`, on a pointer event. */
  pointerType?: string
}

/** What `connect` listens on for presses: a window, or anything shaped like one. */
export interface PointerTarget {
  addEventListener(type: string, listener: (event: PointerEventLike) => void, options?: { capture?: boolean; passive?: boolean }): void
  removeEventListener(type: string, listener: (event: PointerEventLike) => void, options?: { capture?: boolean }): void
}

/**
 * 2.50.1. How far, in CSS pixels, a press may wander and still be a press held in place. Past it the
 * press is a drag — a selection, a scroll, a move — and is told as `cancel`: a drag is not a long
 * press. Under it a hand's tremor on a trackpad is still holding still.
 */
export const POINTER_SLOP_PX = 8

/** The page's clock for `kehikot.pointer`'s `at`: `performance.now()` where there is one. */
const pointerClock = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now())

export interface Connection {
  /**
   * Start hearing messages. Call it AFTER the connection has been stored: the mailbox replays
   * synchronously inside this call, so `onHello` can fire before it returns. Idempotent.
   */
  listen: () => Connection
  /**
   * Ask one question. Rejects with `HostRefused` — never with a bare string. `options.within`
   * overrides `ANSWER_WITHIN_MS` for this call and no other.
   */
  request: (method: string, params?: Record<string, unknown>, options?: AskOptions) => Promise<unknown>
  /** Say how tall we would like to be. Fire and forget, by design. */
  resize: (height: number) => void
  /**
   * Say what this page can be narrowed by, so the host can draw the control. Fire and forget; the
   * choice comes back in a `kehikot.context` with `filters` in it. The last offer is remembered and
   * re-sent after `ready` on every greeting, so one call at mount is correct across reloads.
   */
  filters: (groups: FilterGroup[]) => void
  /**
   * Say that what this page is showing can be cleared, and what to call it; `null` withdraws the
   * control. Fire and forget, remembered and replayed on every greeting. Send it whenever the words
   * change, including after `onClear`. Add no confirmation of your own: the two-press arm is the host's.
   */
  clearable: (label: string | null) => void
  /**
   * Say that this page can read its material again, and when it last did. Fire and forget,
   * remembered and replayed on every greeting. Send it whenever a field changes. `at` is the
   * module's own fact, `null` for "I cannot say"; `can: false` withdraws the control.
   */
  refreshable: (state: { can?: boolean; at?: string | null; busy?: boolean }) => void
  /**
   * Say which switches, toggles, jumps and runs this page has, so the host can draw them in the
   * container's menus. The whole list every time; `[]` withdraws it. Fire and forget, remembered
   * and replayed on every greeting. Call it again whenever anything in it changes, including after
   * `onPress`: the host draws what was last declared and holds no state of its own.
   */
  header: (items: HeaderItemInput[]) => void
  /**
   * 2.38.0. Say what this page's footer shows and offers, so the host can draw it as one row at the
   * bottom of the container: status text, meters, and the header's kinds of item. The whole list
   * every time; `[]` withdraws it. Remembered and replayed on every greeting, like `header`. Presses
   * reach `onPress` with `place: 'footer'`. Declare it only when the greeting said the host draws it
   * (`HostFacts.footer === true`); otherwise draw the footer yourself. See docs/footer.md.
   */
  footer: (items: FooterItemInput[]) => void
  /**
   * Say what this page's things are doing now (`activity.set`, 1.5.0): the COMPLETE list, replacing
   * what was said before; `[]` says nothing is going on. Fire and forget. A list identical to the one
   * last taken is not sent again, the last list is re-sent after every greeting, and nothing is sent
   * to a host whose greeting said it does not answer `activity.set` (the module simply gets no dots).
   * A list that does not parse is dropped here, not sent. See docs/activity.md.
   *
   * 1.8.0: items may carry `project`. Until the host has answered `projects: true`, only the items of the
   * project it has open (and those with no `project`) are sent, without the field; after, the whole list.
   * 2.1.0: an item may also carry `projectId`, beside `project`. Judging "the open project", the id
   * decides where the item and the host both have one, else the path; both fields are dropped then.
   */
  activity: (items: ActivityItem[]) => void
  /**
   * 2.69.0. Say what the open search comes to now, from an `onFind` that answered nothing at once or
   * whose count changed by itself (new output arrived). Dropped while no search is open.
   */
  findResult: (count: FindCount | 'unsupported') => void
  /**
   * 2.70.0. Say the page is drawn: the host's cover, held since the greeting (`holdCover`), comes off.
   * Call it once what the page shows has been read and drawn; calling it again, or with `holdCover:
   * false`, does nothing. A greeting after it is answered without a hold.
   */
  ready: () => void
  /**
   * 2.70.0. Hear presses on another window or element too — a nested frame the page owns — and tell
   * the host of them as `kehikot.pointer`, as presses on the page itself are. Returns the function
   * that stops hearing it. `relayPointer` is the way to call it for an iframe.
   */
  pointerFrom: (target: PointerTarget) => () => void
  /** Whether anything has greeted us yet. */
  greeted: () => boolean
  /** Stop listening. Every question still waiting is refused rather than left hanging. */
  stop: () => void
}

/**
 * Build one conversation. Nothing is sent, and nothing is heard, until `listen`; nothing is sent
 * before a greeting arrives either.
 */
export function connect(id: string, events: HostEvents = {}, options: ConnectOptions = {}): Connection {
  const source = options.source ?? mailbox
  const answerWithin = options.answerWithin ?? ANSWER_WITHIN_MS
  const gotoBackstop = options.gotoBackstop ?? GOTO_BACKSTOP_MS
  const pressBackstop = options.pressBackstop ?? PRESS_BACKSTOP_MS

  let host: Window | null = null
  let origin = '*'
  let live = true
  let listening = false
  /* The last offer, replayed on every greeting. `null` means nothing has been offered; an empty
     offer is a real one and has to be sent. */
  let offered: FilterGroup[] | null = null
  /* The last clear offer, replayed likewise. Wrapped in an object because a `null` label is a REAL
     value — nothing to clear — and cannot also mean "never said anything". */
  let clearing: { label: string | null } | null = null
  /* The last refresh state, replayed likewise; what is replayed carries `at`. */
  let refreshing: { can: boolean; at: string | null; busy: boolean } | null = null
  /* The last header, replayed likewise, as it was written; and as parsed, to judge a press by. */
  let heading: HeaderItemInput[] | null = null
  let declared: HeaderItem[] = []
  /* The last footer (2.38.0), replayed and judged likewise. */
  let footing: FooterItemInput[] | null = null
  let footed: FooterItem[] = []
  /* 2.47.0. What `rowsAdvice` has already said on the console about the header and footer, so each
     sentence is said once per page and never again for a re-declaration. Advice only: nothing is held back. */
  const advised = new Set<string>()
  const advising = options.rowsAdvice !== false
  /* 2.70.0. "No footer" waits for the declarations to settle, and only for a host that draws one. */
  let footerDrawn = false
  let adviseLater: ReturnType<typeof setTimeout> | null = null
  const say = (lines: readonly string[]) => {
    for (const line of lines) {
      if (advised.has(line)) continue
      advised.add(line)
      console.warn(`[kehikot] ${line}`)
    }
  }
  const advise = () => {
    if (!advising) return
    say(rowsAdvice(heading, footing, { footer: false }))
    if (adviseLater !== null) clearTimeout(adviseLater)
    adviseLater = setTimeout(() => {
      adviseLater = null
      if (live && footerDrawn) say(rowsAdvice(heading, footing))
    }, ROWS_ADVICE_AFTER_MS)
  }

  /* 2.70.0. The cover: held from each greeting until the page says it is drawn, or the wait passes. */
  const holdFor = options.holdCover === false ? 0 : typeof options.holdCover === 'number' ? Math.max(0, options.holdCover) : HOLD_COVER_MS
  let drawn = holdFor === 0
  let holding = false
  let holdTimer: ReturnType<typeof setTimeout> | null = null
  const release = () => {
    if (holdTimer !== null) clearTimeout(holdTimer)
    holdTimer = null
    if (!holding) return
    holding = false
    send({ type: MESSAGE.DRAWN })
  }
  /* The last activity list, as written, and the text of the one the host last took (`null`: none yet on
     this greeting, so the next is sent). `answered` is the greeting's `answers`, `null` when it did not say. */
  let activityNow: ActivityItem[] | null = null
  let activityTaken: string | null = null
  let answered: readonly string[] | null = null
  /* 1.8.0. Whether this host said it files each item under its `project` (`activitySetResult.projects`),
     and the project it has open — until it has said so, only that project's items are sent, untagged. */
  let byProject = false
  let projectNow: string | null = null
  let projectIdNow: string | null = null
  /* 2.49.0. Presses, told to a host whose greeting asked; `null` while nothing is listened to. */
  const pointerTarget: PointerTarget | null =
    options.pointerTarget === false ? null : (options.pointerTarget ?? (typeof window === 'undefined' ? null : (window as unknown as PointerTarget)))
  let pointing: (() => void) | null = null
  /* 2.70.0. Other windows heard as well (`pointerFrom`), each with the function that stops hearing it while listened to. */
  const nested = new Map<PointerTarget, (() => void) | null>()
  let hearOn: ((target: PointerTarget) => () => void) | null = null
  const pointer = (want: boolean) => {
    if (!want) {
      pointing?.()
      pointing = null
      return
    }
    if (pointing) return
    const targets = [...(pointerTarget ? [pointerTarget] : [])]
    /*
     * One press at a time: where it went down, whether the page's own browser took it away
     * (`pointercancel`) while it was held still, and whether it has been told as over.
     *
     * 2.50.1. A browser cancels a press for reasons of its own that are not the person letting go:
     * WebKit hands a press held on text, or on a selection, to its own drag or look-up machinery and
     * fires `pointercancel` while the button is still down. Told as `cancel`, that ended a long press
     * a person was still holding — in exactly the pages that are mostly text. So a cancel of a mouse
     * press that has not moved is not told; the press ends when the button comes up, which is then heard
     * as whichever of `pointerup`, `mouseup` or `dragend` the browser still sends. A press that moved
     * past `POINTER_SLOP_PX` is a drag, and is told as `cancel` the moment it does.
     */
    let pressed: { x: number; y: number; mouse: boolean } | null = null
    const end = (phase: 'up' | 'cancel') => {
      if (!pressed) return
      pressed = null
      send({ type: MESSAGE.POINTER, phase, at: pointerClock() })
    }
    /* The primary button, a touch or a pen: a right click is a menu, not a press. */
    const down = (event: PointerEventLike) => {
      if ((event.button ?? 0) !== 0 || event.isPrimary === false) return
      pressed = { x: event.clientX ?? 0, y: event.clientY ?? 0, mouse: (event.pointerType ?? 'mouse') === 'mouse' }
      send({ type: MESSAGE.POINTER, phase: 'down', at: pointerClock() })
    }
    const up = (event: PointerEventLike) => {
      if (event.isPrimary === false) return
      /* An up with no press this page saw (one that began outside it) is still said, as before. */
      if (!pressed) {
        send({ type: MESSAGE.POINTER, phase: 'up', at: pointerClock() })
        return
      }
      end('up')
    }
    const moved = (event: PointerEventLike) => {
      if (!pressed || event.isPrimary === false) return
      if (event.clientX === undefined || event.clientY === undefined) return
      if (Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > POINTER_SLOP_PX) end('cancel')
    }
    /* A mouse held still: the browser took the press, not the person, and it ends when the button
       comes up. A touch or a pen cancelled is the browser's scroll or zoom starting, which no button
       coming up will follow: that is a cancel, as before. */
    const cancel = () => {
      if (pressed?.mouse) return
      pressed = null
      send({ type: MESSAGE.POINTER, phase: 'cancel', at: pointerClock() })
    }
    /* After a cancel, the button coming up is a mouse event or the end of the browser's drag. */
    const released = () => end('up')
    const listening: [string, (event: PointerEventLike) => void][] = [
      ['pointerdown', down],
      ['pointerup', up],
      ['pointercancel', cancel],
      ['pointermove', moved],
      ['mousemove', moved],
      ['mouseup', released],
      ['dragend', released],
    ]
    /* On the window, in the capture phase: before any element of the page can stop it, and still
       heard while an element holds the pointer captured. */
    const hear = (target: PointerTarget) => {
      for (const [type, listener] of listening) target.addEventListener(type, listener, { capture: true, passive: true })
      return () => {
        for (const [type, listener] of listening) target.removeEventListener(type, listener, { capture: true })
      }
    }
    const stops = targets.map(hear)
    for (const target of nested.keys()) nested.set(target, hear(target))
    hearOn = hear
    pointing = () => {
      for (const stop of stops) stop()
      for (const [target, stop] of nested) {
        stop?.()
        nested.set(target, null)
      }
      hearOn = null
      pressed = null
    }
  }

  /* 2.69.0. Find: the id of the search open now (`null`: the bar is closed), the client's own search
     once one was needed, and the keys, heard while a host that draws the bar greeted us. */
  let finding: string | null = null
  let finder: PageFind | null = null
  const finderOf = (): PageFind | null => {
    if (options.findIn === false) return null
    finder ??= pageFind((count) => sayFound(count), options.findIn ?? {})
    return finder
  }
  const sayFound = (count: FindCount | 'unsupported') => {
    if (finding === null) return
    if (count === 'unsupported') {
      send({ type: MESSAGE.FIND_RESULT, id: finding, total: 0, current: 0, unsupported: true })
      return
    }
    const total = Math.max(0, Math.floor(count.total || 0))
    const current = Math.min(Math.max(0, Math.floor(count.current || 0)), total)
    send({ type: MESSAGE.FIND_RESULT, id: finding, total, current })
  }
  const keyTarget: KeyTarget | null =
    options.findKeys === false ? null : (options.findKeys ?? (typeof window === 'undefined' ? null : (window as unknown as KeyTarget)))
  const mac =
    options.mac ?? (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(`${(navigator as { platform?: string }).platform ?? ''} ${navigator.userAgent ?? ''}`))
  let keying: (() => void) | null = null
  const findKeys = (want: boolean) => {
    if (!want || !keyTarget) {
      keying?.()
      keying = null
      return
    }
    if (keying) return
    const target = keyTarget
    /* In the bubble phase, so an editor with its own find has taken ⌘F (and said so) before this hears it. */
    const heard = (event: KeyEventLike) => {
      if (event.defaultPrevented || event.altKey) return
      if (mac ? !event.metaKey || event.ctrlKey : !event.ctrlKey || event.metaKey) return
      const key = (event.key ?? '').toLowerCase()
      if (key !== 'f' && key !== 'g') return
      if (key === 'f' && event.shiftKey) return
      event.preventDefault()
      const step = key === 'g' ? (event.shiftKey ? 'prev' : 'next') : undefined
      const query = key === 'f' ? selected() : undefined
      send({ type: MESSAGE.FIND_OPEN, ...(query ? { query } : {}), ...(step ? { step } : {}) })
    }
    target.addEventListener('keydown', heard)
    keying = () => target.removeEventListener('keydown', heard)
  }
  /* The page's selection, when it is a short one on one line: what ⌘F starts searching for. */
  const selected = (): string | undefined => {
    const text = typeof getSelection === 'function' ? (getSelection()?.toString() ?? '') : ''
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > LIMITS.FIND_QUERY || /[\r\n]/.test(trimmed)) return undefined
    return trimmed
  }
  const closeFind = () => {
    finding = null
    finder?.close()
  }

  /** Correlation id -> the promise waiting on it. A `Map`, per the protocol's note on lookups. */
  const waiting = new Map<
    string,
    { method: string; resolve: (v: unknown) => void; reject: (e: HostRefused) => void; timer: ReturnType<typeof setTimeout> }
  >()

  let counter = 0
  const nextId = () => `${Date.now().toString(36)}-${(counter += 1).toString(36)}`

  /** This page's own window and origin, where there is a page. */
  const here = () =>
    typeof window === 'undefined' ? {} : { window, origin: typeof location === 'undefined' ? null : location.origin }

  const send = (message: unknown) => {
    if (!host) return
    host.postMessage(message, origin)
  }

  const settle = (correlation: string, outcome: { ok: true; data: unknown } | { ok: false; refusal: Refusal }) => {
    /* A late answer to a question nobody is waiting for is dropped, quietly. */
    const pending = waiting.get(correlation)
    if (!pending) return
    waiting.delete(correlation)
    clearTimeout(pending.timer)
    if (outcome.ok) pending.resolve(outcome.data)
    else pending.reject(new HostRefused(outcome.refusal))
  }

  const onMessage = (ev: MessageEvent) => {
    if (!live) return
    if (!looksLikeWireMessage(ev.data)) return
    const parsed = hostMessageSchema.safeParse(ev.data)
    if (!parsed.success) return
    const message = parsed.data

    if (message.type === MESSAGE.HELLO) {
      /* Before anything is answered: a window this page may not be framed by is not its host. */
      if (!mayGreet(ev, options.origins ?? pageOrigins(), here())) return
      /* Answered on EVERY greeting, not only the first: the newest greeting wins, its window
         becomes the one we answer, and `ready` goes back every time. */
      host = (ev.source as Window | null) ?? source.parent ?? null
      origin = ev.origin && ev.origin !== 'null' ? ev.origin : '*'
      /* With the build that served this page, when it printed one: a host compares it with the server's now. */
      const build = pageBuild()
      /* 2.70.0. A page not drawn yet asks for the cover to stay, and the wait starts again with every greeting. */
      if (holdTimer !== null) clearTimeout(holdTimer)
      holdTimer = null
      holding = !drawn
      send({ type: MESSAGE.READY, id, protocol: message.protocol ?? PROTOCOL, ...(build ? { build } : {}), ...(holding ? { hold: true } : {}) })
      if (holding) holdTimer = setTimeout(release, holdFor)
      footerDrawn = message.footer === true
      /* After `ready` and before the page is told, so a handler that announces a NEW offer from
         `onHello` overwrites the replay rather than being overwritten by it. */
      if (offered !== null) send({ type: MESSAGE.FILTERS, groups: offered })
      if (clearing !== null) send({ type: MESSAGE.CLEARABLE, label: clearing.label })
      if (refreshing !== null) send({ type: MESSAGE.REFRESHABLE, ...refreshing })
      if (heading !== null) send({ type: MESSAGE.HEADER, items: heading })
      if (footing !== null) send({ type: MESSAGE.FOOTER, items: footing })
      answered = message.answers ?? null
      activityTaken = null
      byProject = false
      projectNow = projectOf(message.context)
      projectIdNow = projectIdOf(message.context)
      sendActivity()
      pointer(message.pointer === true)
      closeFind()
      findKeys(message.find === true)
      /* 2.59.0. A greeting handler that throws is said to the host (`kehikot.page.error`, `greeting`),
         not left to break the mailbox's other listeners: `ready` has gone, and the page may be blank. */
      try {
        events.onHello?.(message.context, message.state, { answers: message.answers ?? null, header: message.header ?? null, footer: message.footer ?? null, carries: message.carries ?? null, footerKinds: message.footerKinds ?? null, find: message.find ?? null })
      } catch (error) {
        console.error(error)
        reportPageError(error, 'greeting')
      }
      return
    }

    /* Everything after the greeting has to come from the window that gave it.
       The origin cannot do this job and this can (docs/client.md). */
    if (ev.source !== host) return

    if (message.type === MESSAGE.CONTEXT) {
      /* Handed on whole, with only the envelope (`type`, `protocol`) removed, so every field the
         protocol grows arrives without being listed here. */
      const { type: _envelope, protocol: _spoken, ...context } = message
      const project = projectOf(context)
      const projectId = projectIdOf(context)
      /* Another project open: a host that does not file by project is sent THAT project's things now. */
      if (project !== projectNow || projectId !== projectIdNow) {
        projectNow = project
        projectIdNow = projectId
        if (!byProject) sendActivity()
      }
      events.onContext?.(context)
      return
    }

    if (message.type === MESSAGE.RESPONSE) {
      if (message.ok) settle(message.id, { ok: true, data: message.data })
      else {
        /* A method this package knows and the host does not: the host is older than it (2.22.0). */
        const asked = waiting.get(message.id)?.method ?? ''
        const tooOld = tooOldOf(asked, message)
        settle(message.id, {
          ok: false,
          refusal: tooOld
            ? { reason: message.reason, error: message.error, declined: 'host-too-old', since: tooOld.since }
            : { reason: message.reason, error: message.error },
        })
      }
      return
    }

    if (message.type === MESSAGE.EVENT) {
      events.onEvent?.(message)
      return
    }

    if (message.type === MESSAGE.CLEAR) {
      events.onClear?.()
      return
    }

    if (message.type === MESSAGE.REFRESH) {
      events.onRefresh?.()
      return
    }

    if (message.type === MESSAGE.OPENED) {
      events.onOpened?.({ item: message.item })
      return
    }

    if (message.type === MESSAGE.COVERED) {
      events.onCovered?.({ top: message.top, bottom: message.bottom })
      return
    }

    if (message.type === MESSAGE.VISIBLE) {
      events.onVisible?.(message.visible)
      return
    }

    if (message.type === MESSAGE.INBOX) {
      events.onInbox?.({ kind: message.kind, rev: message.rev, next: message.next ?? null })
      return
    }

    if (message.type === MESSAGE.FIND) {
      const ask: FindAsk = { caseSensitive: message.caseSensitive, wholeWord: message.wholeWord, direction: message.direction }
      if (message.direction === 'close') {
        closeFind()
        try {
          void events.onFind?.(message.query, ask)
        } catch {
          /* A listener that throws on close has nothing to say. */
        }
        return
      }
      finding = message.id
      const id = message.id
      const own = (direction: Exclude<FindDirection, 'close'>) => {
        const search = finderOf()
        return search ? search.run(message.query, ask, direction) : ('unsupported' as const)
      }
      const said = (answer: FindAnswer) => {
        if (finding !== id) return
        if (answer === 'default') sayFound(own(message.direction as Exclude<FindDirection, 'close'>))
        else if (answer !== undefined) sayFound(answer)
      }
      if (!events.onFind) {
        said('default')
        return
      }
      try {
        const answer = events.onFind(message.query, ask)
        if (answer instanceof Promise) answer.then(said, () => said('unsupported'))
        else said(answer)
      } catch {
        said('unsupported')
      }
      return
    }

    if (message.type === MESSAGE.PRESS) {
      /* Answered exactly once, like a `goto`: whatever the listener returns, throws or forgets. */
      let answered = false
      const answer = (ok: boolean, why = '') => {
        if (answered) return
        answered = true
        clearTimeout(backstop)
        send({ type: MESSAGE.PRESSED, id: message.id, ok, why: why.slice(0, LIMITS.REASON) })
      }
      const backstop = setTimeout(() => answer(false, 'This app did not say whether it took that press.'), pressBackstop)
      const footer = message.place === 'footer'
      const press = { item: message.item, ...(message.value !== undefined ? { value: message.value } : {}), ...(footer ? { place: 'footer' as const } : {}), ...(message.carried ? { carried: message.carried } : {}), ...(footer && message.text !== undefined ? { text: message.text } : {}) }
      /* Judged against what is declared NOW: the header (or footer) may have changed since it was drawn. */
      const refused = footer ? footerPressRefusal(footed, press) : pressRefusal(declared, press)
      if (refused !== null) answer(false, refused)
      else if (!events.onPress) answer(false, 'This app declared that item and does not take presses.')
      else {
        const taken = (said: PressAnswer) => answer(said === undefined || said === true, typeof said === 'string' ? said : '')
        const failed = () => answer(false, 'This app failed while doing that.')
        try {
          const said = events.onPress(press)
          if (said instanceof Promise) said.then(taken, failed)
          else taken(said)
        } catch {
          failed()
        }
      }
      return
    }

    if (message.type === MESSAGE.GOTO) {
      /* Answered exactly once, whatever the listener does — including nothing, including
         throwing, including answering twice. */
      let answered = false
      const answer = (found: boolean, why = '') => {
        if (answered) return
        answered = true
        clearTimeout(backstop)
        send({ type: MESSAGE.WENT, id: message.id, found, why: why.slice(0, LIMITS.REASON) })
      }
      const backstop = setTimeout(
        () => answer(false, 'This app did not manage to say where that reference is.'),
        gotoBackstop,
      )
      try {
        if (events.onGoto) events.onGoto(message, answer)
        else answer(false, 'This app is not showing anything that can be walked to.')
      } catch {
        answer(false, 'This app failed while looking for that reference.')
      }
      return
    }
  }

  /* Sent when there is a host, a list, and a host that answers it; not again while the host has taken this very list. */
  function sendActivity(): void {
    if (activityNow === null || host === null) return
    if (answered !== null && !answered.includes('activity.set')) return
    const items = byProject ? activityNow : forOpenProject(activityNow, projectNow, projectIdNow)
    const key = JSON.stringify(items)
    if (key === activityTaken) return
    activityTaken = key
    const spans = activityNow.some((item) => item.project !== undefined)
    connection
      .request('activity.set', { items })
      .then((answer) => {
        const said = answer as { outcome?: unknown; projects?: unknown } | null
        if (said?.outcome === 'declined' && activityTaken === key) activityTaken = null
        /* The host files by project: what it was sent was the open project's share, and the whole list goes now. */
        if (said?.outcome === 'taken' && said.projects === true && !byProject) {
          byProject = true
          if (spans) {
            activityTaken = null
            sendActivity()
          }
        }
      })
      .catch(() => {
        /* Not taken: try again with the next list, even an identical one. */
        if (activityTaken === key) activityTaken = null
      })
  }

  /**
   * The items of the project open now, without `project` or `projectId`, for a host that does not file
   * by it. The id decides where the item and the host both name one (a renamed folder is still the
   * project); otherwise the path does.
   */
  function forOpenProject(items: readonly ActivityItem[], open: string | null, openId: string | null): ActivityItem[] {
    return items
      .filter((item) => {
        if (item.project === undefined) return true
        if (item.projectId !== undefined && openId !== null) return item.projectId === openId
        return item.project === open
      })
      .map(({ project: _project, projectId: _projectId, ...item }) => item)
  }

  const connection: Connection = {
    findResult(count) {
      sayFound(count)
    },

    ready() {
      if (drawn) return
      drawn = true
      release()
    },

    pointerFrom(target) {
      if (!nested.has(target)) nested.set(target, hearOn ? hearOn(target) : null)
      return () => {
        nested.get(target)?.()
        nested.delete(target)
      }
    },

    listen() {
      if (listening || !live) return this
      listening = true
      source.addEventListener('message', onMessage)
      return this
    },

    request(method, params = {}, options) {
      if (!host) {
        return Promise.reject(
          new HostRefused({ reason: 'silent', error: NOBODY_TO_ASK }),
        )
      }
      const correlation = nextId()
      /* This caller's `within`, or the connection's. Guarded: `within: 0` and `within: NaN` would
         both mean "time out before the message is posted". */
      const deadline =
        typeof options?.within === 'number' && Number.isFinite(options.within) && options.within > 0
          ? options.within
          : answerWithin
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          settle(correlation, {
            ok: false,
            refusal: {
              reason: 'silent',
              error: `The host was asked ${method} and had not answered ${Math.round(deadline / 1000)} seconds later.`,
            },
          })
        }, deadline)
        waiting.set(correlation, { method, resolve, reject, timer })
        send({ type: MESSAGE.REQUEST, id: correlation, method, params })
      })
    },

    resize(height) {
      /* Clamped on our own side with the host's own arithmetic. The host runs its own copy
         regardless — this is prediction, not enforcement. */
      send({ type: MESSAGE.RESIZE, height: clampHeight(height) })
    },

    filters(groups) {
      /* Kept before it is sent, so an offer made before the greeting goes out with the replay:
         `send` is a no-op without a host. */
      offered = groups
      send({ type: MESSAGE.FILTERS, groups })
    },

    clearable(label) {
      /* Kept before it is sent, for the same reason as the filter offer. */
      clearing = { label }
      send({ type: MESSAGE.CLEARABLE, label })
    },

    refreshable(state) {
      /* Merged onto what was last said; the whole state still goes on the wire. `busy` alone does
         NOT carry forward — it defaults to false, so a forgotten `busy: false` leaves no spinner. */
      refreshing = {
        can: state.can ?? refreshing?.can ?? true,
        at: state.at !== undefined ? state.at : (refreshing?.at ?? null),
        busy: state.busy ?? false,
      }
      send({ type: MESSAGE.REFRESHABLE, ...refreshing })
    },

    header(items) {
      /* Kept before it is sent, like the filter offer. A list that does not parse is still sent —
         the host is the one that reports it — and no press is taken against it. */
      heading = items
      const parsed = headerItemsSchema.safeParse(items)
      declared = parsed.success ? parsed.data : []
      send({ type: MESSAGE.HEADER, items })
      advise()
    },

    footer(items) {
      /* As `header`: kept before it is sent, and a list that does not parse is still sent for the host to report. */
      footing = items
      const parsed = footerItemsSchema.safeParse(items)
      footed = parsed.success ? parsed.data : []
      send({ type: MESSAGE.FOOTER, items })
      advise()
    },

    activity(items) {
      const parsed = activityItemsSchema.safeParse(items)
      if (!parsed.success) return
      activityNow = parsed.data
      sendActivity()
    },

    greeted: () => host !== null,

    stop() {
      live = false
      if (holdTimer !== null) clearTimeout(holdTimer)
      holdTimer = null
      if (adviseLater !== null) clearTimeout(adviseLater)
      adviseLater = null
      pointer(false)
      findKeys(false)
      closeFind()
      if (listening) {
        listening = false
        source.removeEventListener('message', onMessage)
      }
      for (const correlation of [...waiting.keys()]) {
        settle(correlation, { ok: false, refusal: { reason: 'silent', error: 'This page stopped listening.' } })
      }
    },
  }
  return connection
}
