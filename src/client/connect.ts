import {
  LIMITS,
  MESSAGE,
  PROTOCOL,
  clampHeight,
} from '../constants.js'
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

/**
 * The bridge, and nothing about any one module.
 *
 * One conversation with one window, in the shape this package's schemas define.
 * It knows how to be greeted, how to ask a question and match the answer to it,
 * how to answer a `goto`, and how to say how tall it would like to be. It knows
 * nothing about what a module draws, and the code that draws knows nothing about
 * `postMessage`.
 *
 * This file was twelve files. Each of them was written by hand, and two of the
 * bugs below were found INDEPENDENTLY in several of them, months apart, because
 * a handshake copied by eye is a handshake whose reasoning did not travel with
 * it. The comments here are the record of what went wrong; a refactor that
 * shortens them will reintroduce what they prevent.
 *
 * ## Binding to the window, not to the origin
 *
 * A host may frame a module on an opaque origin — anything the module sends then
 * arrives at the host with an origin of `"null"`, and `"null"` is a string every
 * sandboxed frame in every tab shares, so it can never be an identity. A module
 * that declares storage does have a real origin of its own, and that changes
 * nothing here, because what it gained is an origin of OURS and not any
 * knowledge of the HOST's. The host's origin still arrives only in `ev.origin`,
 * it is still `"null"` exactly when the host is itself sandboxed, and a guess
 * that fails silently drops every message.
 *
 * So the identity is the window handle: the greeting arrives from exactly one
 * `MessageEvent.source`, nothing in this page or any other can forge that
 * handle, and after the greeting anything from another window is ignored. Not
 * because a stray message would be dangerous by itself, but because a second
 * sender answering our correlation ids is a page that quietly shows another
 * host's work under this one's name.
 *
 * We reply with `targetOrigin: '*'` where `ev.origin` gave us nothing to aim at.
 * There is nothing secret in what crosses this bridge — the name of an epic
 * somebody is already reading — and a module's own secrets never cross it at
 * all: they go to that module's own `/api` over an ordinary same-origin fetch.
 * Where `ev.origin` is a real origin we use it, because then it is a fact rather
 * than a guess.
 *
 * ## Parse what the host sends, too
 *
 * A framed page receives every message posted at its window: the host's, a dev
 * server's hot-reload socket, an extension's. `looksLikeWireMessage` is the
 * cheap filter and `hostMessageSchema` is the real one. A module that trusted
 * `data.type` alone would be one that a bundler's socket can put into an
 * unexplained state on a Tuesday.
 *
 * ## And it is still only a convenience
 *
 * Nothing here is the host's check, and nothing here is required of a module. A
 * module that hand-rolls all of this is exactly as conforming as one that
 * imports it — see the README. The moment this reads as mandatory, "a module is
 * a program somebody else could have written" has quietly become "a module is a
 * program that imports our client".
 */

/**
 * Why a question came back without an answer.
 *
 * The protocol's three, plus one more. `silent` is the timeout, and it is a
 * separate word rather than folded into `failed` because the two send a person
 * to different places: `failed` is the roadmap telling us it went wrong, and
 * `silent` is the roadmap not being there — which, from inside a frame, is
 * indistinguishable from a host that is still starting up. The protocol names
 * the same condition `silent` on the other side of the wire, for a module that
 * was greeted and never answered; the symmetry is intentional.
 */
export type Refusal = { reason: ResponseFailureReason | 'silent'; error: string }

/**
 * A refusal, as a thrown thing.
 *
 * A class rather than a rejected string, so that `catch` can tell a refusal from
 * a `TypeError` in the caller's own handler without reading English. Every
 * rejection from `request` is one of these, always — a caller that writes
 * `catch (e) { e.refusal.reason }` is not making an assumption.
 */
export class HostRefused extends Error {
  constructor(readonly refusal: Refusal) {
    super(refusal.error)
    this.name = 'HostRefused'
  }
}

/**
 * How long to wait for one answer.
 *
 * A number rather than forever, because forever is a page that shows "asking…"
 * until somebody reloads it, which is the exact shape of dishonesty a spinner
 * has — it is a claim that an answer is coming. Twelve seconds is long enough
 * for a roadmap reading a file off a cold disk and short enough that nobody sits
 * through it twice.
 */
export const ANSWER_WITHIN_MS = 12_000

/**
 * How long a `goto` listener has before the backstop answers for it.
 *
 * A timer rather than a line after the call, and the difference matters: a
 * listener may quite reasonably want to answer after a scroll settles, so
 * answering `false` the moment it returns would pre-empt the honest answer. Half
 * a second is longer than any of that and far shorter than the host's own
 * timeout, which means the reader gets the fallback link instead of a wait.
 */
export const GOTO_BACKSTOP_MS = 500

/**
 * What a question asked before any greeting is refused with.
 *
 * One sentence in one place, because the React hook can be asked the same thing
 * between mounts and a caller should not have to tell two spellings of "nobody
 * is there" apart.
 */
export const NOBODY_TO_ASK = 'Nothing has greeted this page, so there is nobody to ask.'

export interface HostEvents {
  /**
   * The greeting arrived, carrying the context that came with it and whatever
   * this module last asked the host to keep for it.
   *
   * The kept string rides beside the context rather than inside it because it
   * belongs to one module and the context is broadcast to all of them — the
   * protocol's own note on `state` in `helloSchema` makes that argument. It is
   * `null` when the host keeps nothing, which is a first run, a host that does
   * not answer `state.set`, or a module that has never written any; a module has
   * to be able to tell that from a field that is missing because the host is
   * older than the idea, and only one of those means it should draw its defaults
   * with confidence.
   *
   * And it arrives HERE, in the greeting, rather than being fetched — so a page
   * has it before its first render instead of drawing the wrong filter and
   * correcting it a moment later.
   */
  onHello?: (context: ModuleContext, state: string | null) => void
  /** The reader switched epics, or this tab was shown again. */
  onContext?: (context: ModuleContext) => void
  /**
   * "Go to this reference." The answer is not optional and not deferrable: the
   * host is waiting on it, and the protocol is explicit that a module which
   * never answers must not be able to hang a reference. So `answer` is handed
   * in rather than returned, and `connect` guarantees it is called — see below.
   */
  onGoto?: (goto: Goto, answer: (found: boolean, why?: string) => void) => void
  /**
   * Something another module emitted, carried here by the host.
   *
   * Handed over whole rather than unwrapped, because unlike a context this
   * envelope is the message: `extension` says which format `payload` is in, and
   * `from`, `at` and `kehikko` are what a receiver filters on. A module that
   * declares no interest in any extension never registers this and never hears
   * one, which is the same as before it existed.
   */
  onEvent?: (event: ModuleEvent) => void
}

export interface ConnectOptions {
  /**
   * What to listen to. The `mailbox` by default, and it is the default for a
   * reason — see the essay in `mailbox.ts`.
   *
   * Injectable because everything this function decides is tested without a
   * browser, and that has to keep being true.
   */
  source?: MessageSource
  /** Override `ANSWER_WITHIN_MS`, for a module whose one question is genuinely slower. */
  answerWithin?: number
  /** Override `GOTO_BACKSTOP_MS`. Shorten it freely; lengthening it past the host's own timeout does nothing. */
  gotoBackstop?: number
}

export interface Connection {
  /**
   * Start hearing messages. Call it AFTER the connection has been stored.
   *
   * ## Why this is not part of `connect`, which is a bug in five modules
   *
   * The mailbox replays what arrived before anybody listened, and it replays
   * SYNCHRONOUSLY inside `addEventListener`. The greeting almost always arrived
   * before the page mounted — that is the entire reason the mailbox exists — so
   * with a one-step `connect`, `onHello` fires DURING the call, before the
   * caller's `host.current = connect(...)` has run. Anything the handler does
   * that reads the connection finds `null` and quietly does nothing.
   *
   * Worse, it works often enough to look fine. When the host happens to greet
   * after the effect returns — a slow module, a reload, a busy machine — the
   * assignment has already happened and everything behaves. A race whose good
   * outcome is the common one is the kind that ships, and it did: two modules
   * hit it independently, and each spent an afternoon on a symptom that reads
   * "the module will not speak" while the host's own log shows a module that
   * answered `ready`.
   *
   * Deferring the replay to a microtask would hide it rather than fix it. So the
   * two steps are in the caller's hands and in the caller's order:
   *
   * ```ts
   * const live = connect(id, events)
   * host.current = live
   * live.listen()
   * ```
   *
   * Idempotent, so a second call is nothing rather than a second subscription.
   */
  listen: () => Connection
  /** Ask one question. Rejects with `HostRefused` — never with a bare string. */
  request: (method: string, params?: Record<string, unknown>) => Promise<unknown>
  /** Say how tall we would like to be. Fire and forget, by design. */
  resize: (height: number) => void
  /**
   * Say what this page can be narrowed by, so the host can draw the control.
   *
   * Fire and forget, like `resize`, and for the same reason: the host may draw
   * it, may draw part of it, or may not have heard of the idea. What comes back
   * is not an answer but a `roadmap.context` with `filters` in it, which is
   * where a page reads the choice — including the first time, out of the
   * greeting, before it has drawn anything.
   *
   * ## Remembered, and re-sent on every greeting
   *
   * The offer is held here and posted again whenever the host greets. That is
   * not a convenience; without it the feature has a silent failure with the
   * shape this package keeps finding.
   *
   * A page normally announces its offer from an effect after its first render,
   * and the greeting normally arrived before that — that is the entire reason
   * `mailbox` exists — so the ordinary case is fine. The case that is not is a
   * frame that RELOADS: the host greets again, and a page whose offer had not
   * changed since would have no reason to send anything, so the host would
   * carry an offer from a conversation that no longer exists, or none at all.
   * Neither errors. The control simply goes missing, or stops matching what is
   * on screen, on a page that looks entirely normal.
   *
   * So the last offer is replayed after `ready`, every time. A page that calls
   * this once at mount and never again is correct across every reload.
   */
  filters: (groups: FilterGroup[]) => void
  /** Whether anything has greeted us yet. */
  greeted: () => boolean
  /** Stop listening. Every question still waiting is refused rather than left hanging. */
  stop: () => void
}

/**
 * Build one conversation. Nothing is sent, and nothing is heard, until `listen`.
 *
 * Nothing is sent from here until a greeting arrives either, and nothing needs
 * to be: the host greets on every frame load, and a module that announced itself
 * first would be shouting at a window that may not be a host at all.
 */
export function connect(id: string, events: HostEvents = {}, options: ConnectOptions = {}): Connection {
  const source = options.source ?? mailbox
  const answerWithin = options.answerWithin ?? ANSWER_WITHIN_MS
  const gotoBackstop = options.gotoBackstop ?? GOTO_BACKSTOP_MS

  let host: Window | null = null
  let origin = '*'
  let live = true
  let listening = false
  /* The last offer, replayed on every greeting. See `filters` above for the
     reload this exists to survive. `null` means nothing has been offered, which
     is not the same as an empty offer: an empty one is a module saying it has
     nothing to be narrowed by now, and has to be sent. */
  let offered: FilterGroup[] | null = null

  /** Correlation id -> the promise waiting on it. A `Map`, per the protocol's note on lookups. */
  const waiting = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: HostRefused) => void; timer: ReturnType<typeof setTimeout> }
  >()

  let counter = 0
  const nextId = () => `${Date.now().toString(36)}-${(counter += 1).toString(36)}`

  const send = (message: unknown) => {
    if (!host) return
    host.postMessage(message, origin)
  }

  const settle = (correlation: string, outcome: { ok: true; data: unknown } | { ok: false; refusal: Refusal }) => {
    /*
     * A late answer to a question nobody is waiting for is dropped, quietly.
     *
     * It is the ordinary case rather than an anomaly: a question that timed out
     * and was answered a second later, a question the caller abandoned, a
     * duplicate. There is nothing to report and nobody to report it to, and a
     * module that threw here would be a module a slow host can crash.
     */
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
      /*
       * Answered on EVERY greeting, not only the first.
       *
       * Re-greeting is normal rather than an error: the host greets on every
       * frame load, and a frame that reloaded itself has forgotten the whole
       * conversation — it cannot tell a reload from a host that greeted twice,
       * and it must not have to. So the newest greeting wins, the window it came
       * from becomes the one we answer, and `ready` goes back every time. A
       * module that replied only once is a module that goes silent after any
       * reload of its own frame, which the host reports as a module that did not
       * answer its greeting.
       */
      host = (ev.source as Window | null) ?? source.parent ?? null
      origin = ev.origin && ev.origin !== 'null' ? ev.origin : '*'
      send({ type: MESSAGE.READY, id, protocol: message.protocol ?? PROTOCOL })
      /* After `ready` and before the page is told, so that a host which reads
         the offer while composing what to draw has it, and so that a handler
         which announces a NEW offer from `onHello` overwrites the replay rather
         than being overwritten by it. */
      if (offered !== null) send({ type: MESSAGE.FILTERS, groups: offered })
      events.onHello?.(message.context, message.state)
      return
    }

    /* Everything after the greeting has to come from the window that gave it.
       See the essay at the top: the origin cannot do this job and this can. */
    if (ev.source !== host) return

    if (message.type === MESSAGE.CONTEXT) {
      /*
       * Handed on whole, with only the envelope removed.
       *
       * The version of this comment that stood in the modules argued carefully
       * for the wrong thing. It said the context was "rebuilt field by field"
       * because a context message carries a `type` a `ModuleContext` does not,
       * and then listed the fields — with a paragraph on `selection` explaining
       * that dropping it is the difference between a page that shows what
       * somebody picked and one that ignores every click on the canvas. That
       * diagnosis was right and the remedy was not.
       *
       * A list that has to be kept complete is a list that will be incomplete
       * again at the next protocol release, and it was, in FIVE modules: `prompt`
       * and `pinned` were both missing within a day of being added, and `kehikko`
       * — which says which canvas a pane is standing on — was missing the moment
       * the protocol grew it. The failure has no symptom. A field left out does
       * not error; it quietly becomes that page's belief that the host said
       * nothing about it.
       *
       * So the listing is gone, and it is gone from ONE place now rather than
       * from twelve. `type` and `protocol` are the only two things a
       * `ModuleContext` does not have, and removing exactly those means every
       * field the protocol grows arrives at every module whether or not anybody
       * has heard of it. What a module then chooses to READ is its own business;
       * the difference is that the rest now arrives rather than being discarded
       * on the way in.
       */
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

    if (message.type === MESSAGE.GOTO) {
      /* Answered exactly once, whatever the listener does — including nothing,
         including throwing, including answering twice. The host is waiting on
         this and will time out into "not found"; a module that leaves it to the
         timeout has turned a hundred milliseconds into twelve seconds of a
         reader waiting, for every reference that points at it. */
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

    request(method, params = {}) {
      if (!host) {
        return Promise.reject(
          new HostRefused({ reason: 'silent', error: NOBODY_TO_ASK }),
        )
      }
      const correlation = nextId()
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          settle(correlation, {
            ok: false,
            refusal: {
              reason: 'silent',
              error: `The roadmap was asked ${method} and had not answered ${Math.round(answerWithin / 1000)} seconds later.`,
            },
          })
        }, answerWithin)
        waiting.set(correlation, { resolve, reject, timer })
        send({ type: MESSAGE.REQUEST, id: correlation, method, params })
      })
    },

    resize(height) {
      /* Clamped on our own side with the host's own arithmetic, so that what we
         ask for is what we will get. The host runs its own copy over the raw
         number regardless — this is prediction, not enforcement. */
      send({ type: MESSAGE.RESIZE, height: clampHeight(height) })
    },

    filters(groups) {
      /* Kept before it is sent, so that an offer made before the greeting is
         not lost — it goes out with the replay instead. `send` is a no-op
         without a host, and a page that announced early and never again would
         otherwise have a control that never appears. */
      offered = groups
      send({ type: MESSAGE.FILTERS, groups })
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
