import { pageBuild } from './build.js'
import {
  MESSAGE,
  PROTOCOL,
  clampHeight,
} from '../constants.js'
import { LIMITS } from '../limits.js'
import { activityItemsSchema, type ActivityItem } from '../activity.js'
import { ORIGINS_ELEMENT, originAmong } from '../page.js'
import {
  headerItemsSchema,
  hostMessageSchema,
  looksLikeWireMessage,
  pressRefusal,
  type FilterGroup,
  type Goto,
  type HeaderItem,
  type HeaderItemInput,
  type ModuleContext,
  type ModuleEvent,
  type Press,
  type ResponseFailureReason,
} from '../wire.js'

import { tooOldOf } from '../fit.js'
import { mailbox, type MessageSource } from './mailbox.js'


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
 * The origins this page was told it may be framed by: the island its server printed
 * (`ORIGINS_ELEMENT`, the list sent as `frame-ancestors`), or `null` for a document that carries
 * none — one this package's doors did not serve. Read on every greeting; it is one element.
 */
export function pageOrigins(): string[] | null {
  if (typeof document === 'undefined') return null
  const text = document.getElementById(ORIGINS_ELEMENT)?.textContent
  if (!text) return null
  try {
    const parsed: unknown = JSON.parse(text)
    return Array.isArray(parsed) ? parsed.filter((one): one is string => typeof one === 'string') : null
  } catch {
    return null
  }
}

/**
 * Whether a greeting may be answered: whether the window that sent it is one this page may be
 * framed by. `origins` is who that is; `null` is a page that was never told, which answers as it
 * always has. Otherwise a greeting counts from an origin on the list, from the page's own origin,
 * from the page's own window, and with no origin on it at all — an event the page's own script
 * made, since a message from another window always carries one. Pure.
 */
export function mayGreet(
  greeting: { origin?: string | null; source?: unknown },
  origins: readonly string[] | null,
  self: { window?: unknown; origin?: string | null } = {},
): boolean {
  if (origins === null) return true
  const from = greeting.origin ?? ''
  if (from === '') return true
  if (self.window != null && greeting.source === self.window) return true
  if (from !== 'null' && from === self.origin) return true
  return originAmong(from, origins)
}

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
   * cannot take is refused before this is called. Do it, declare the header again, and return
   * nothing — or return the sentence saying why not. `connect` answers the host exactly once.
   */
  onPress?: (press: Pick<Press, 'item' | 'value'>) => PressAnswer | Promise<PressAnswer>
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
}

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
      send({ type: MESSAGE.READY, id, protocol: message.protocol ?? PROTOCOL, ...(build ? { build } : {}) })
      /* After `ready` and before the page is told, so a handler that announces a NEW offer from
         `onHello` overwrites the replay rather than being overwritten by it. */
      if (offered !== null) send({ type: MESSAGE.FILTERS, groups: offered })
      if (clearing !== null) send({ type: MESSAGE.CLEARABLE, label: clearing.label })
      if (refreshing !== null) send({ type: MESSAGE.REFRESHABLE, ...refreshing })
      if (heading !== null) send({ type: MESSAGE.HEADER, items: heading })
      answered = message.answers ?? null
      activityTaken = null
      byProject = false
      projectNow = projectOf(message.context)
      projectIdNow = projectIdOf(message.context)
      sendActivity()
      events.onHello?.(message.context, message.state, { answers: message.answers ?? null, header: message.header ?? null })
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
      const press = { item: message.item, ...(message.value !== undefined ? { value: message.value } : {}) }
      /* Judged against what is declared NOW: the header may have changed since the menu was drawn. */
      const refused = pressRefusal(declared, press)
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
