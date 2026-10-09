import { pageBuild } from './build.js'
import {
  MESSAGE,
  PROTOCOL,
  clampHeight,
} from '../constants.js'
import { LIMITS } from '../limits.js'
import { dialectOfType, toDialect, type Dialect } from '../dialect.js'
import {
  hostMessageSchema,
  looksLikeWireMessage,
  type FilterGroup,
  type Goto,
  type ModuleContext,
  type ModuleEvent,
  type ResponseFailureReason,
} from '../wire.js'

import { mailbox, type MessageSource } from './mailbox.js'
import { deprecated } from '../deprecated.js'

/**
 * The bridge: one conversation with one window, in the shape this package's schemas define.
 * Identity is the greeting's window handle (`MessageEvent.source`), never the origin; everything
 * the host sends is parsed with `hostMessageSchema`. A convenience — a module may hand-roll it all.
 * Design notes: docs/client.md.
 */

/**
 * Why a question came back without an answer: the protocol's three reasons, plus `silent` for a
 * timeout or a host that is not there.
 */
export type Refusal = { reason: ResponseFailureReason | 'silent'; error: string }

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

/** What a question asked before any greeting is refused with. The React hook says the same between mounts. */
export const NOBODY_TO_ASK = 'Nothing has greeted this page, so there is nobody to ask.'

export interface HostEvents {
  /**
   * The greeting arrived, with its context and whatever this module last asked the host to keep.
   * `state` is `null` when the host keeps nothing: a first run, a host that does not answer
   * `state.set`, or a module that has never written any.
   */
  onHello?: (context: ModuleContext, state: string | null) => void
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

  /** Correlation id -> the promise waiting on it. A `Map`, per the protocol's note on lookups. */
  const waiting = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: HostRefused) => void; timer: ReturnType<typeof setTimeout> }
  >()

  let counter = 0
  const nextId = () => `${Date.now().toString(36)}-${(counter += 1).toString(36)}`

  /* Which spelling the host greeted us in, and so the one we answer in. Everything this file
     builds is canonical, and is respelled only in `send`. See `dialect.ts`. */
  let dialect: Dialect = 'kehikot'

  const send = (message: unknown) => {
    if (!host) return
    host.postMessage(toDialect(message, dialect), origin)
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
      /* Answered on EVERY greeting, not only the first: the newest greeting wins, its window
         becomes the one we answer, and `ready` goes back every time. */
      host = (ev.source as Window | null) ?? source.parent ?? null
      origin = ev.origin && ev.origin !== 'null' ? ev.origin : '*'
      dialect = dialectOfType((ev.data as { type: string }).type) ?? 'kehikot'
      /* Once per page, at a greeting: never per message. */
      if (dialect === 'roadmap') {
        deprecated('Being greeted in the pre-rename dialect (roadmap.hello)', 'Update the host framing this page: it should say kehikot.hello.')
      }
      /* With the build that served this page, when it printed one: a host compares it with the server's now. */
      const build = pageBuild()
      send({ type: MESSAGE.READY, id, protocol: message.protocol ?? PROTOCOL, ...(build ? { build } : {}) })
      /* After `ready` and before the page is told, so a handler that announces a NEW offer from
         `onHello` overwrites the replay rather than being overwritten by it. */
      if (offered !== null) send({ type: MESSAGE.FILTERS, groups: offered })
      if (clearing !== null) send({ type: MESSAGE.CLEARABLE, label: clearing.label })
      if (refreshing !== null) send({ type: MESSAGE.REFRESHABLE, ...refreshing })
      events.onHello?.(message.context, message.state)
      return
    }

    /* Everything after the greeting has to come from the window that gave it.
       The origin cannot do this job and this can (docs/client.md). */
    if (ev.source !== host) return

    if (message.type === MESSAGE.CONTEXT) {
      /* Handed on whole, with only the envelope (`type`, `protocol`) removed, so every field the
         protocol grows arrives without being listed here. */
      const { type: _envelope, protocol: _spoken, ...context } = message
      events.onContext?.(context)
      return
    }

    if (message.type === MESSAGE.RESPONSE) {
      if (message.ok) settle(message.id, { ok: true, data: message.data })
      else settle(message.id, { ok: false, refusal: { reason: message.reason, error: message.error } })
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

  return {
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
        waiting.set(correlation, { resolve, reject, timer })
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
}
