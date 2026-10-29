import type { Reply, Stream } from './doors.js'

/**
 * A module telling its page that something changed, over one held connection (2.32.0). The server
 * side of `subscribe` (`/client`): a page never polls its own module; it subscribes to a topic,
 * and the module `publish`es to that topic where its state actually changes — a write, a file
 * watcher, a finished job. Design notes: docs/events.md.
 *
 * It is the doors' own `stream` door with topics on it, not a second mechanism: `events(route)` is a
 * `Stream` for `doors({ stream })` and `run({ stream })`, so a stream is behind the doors' gate and
 * their `ours` routing on Vite and on `run` alike, and gets their headers, the opening comment, the
 * heartbeat (`beatMs`, 25 s), `setNoDelay` and the close when the reader goes away.
 *
 * The hub is per process and kept on `globalThis`, so a module whose server code is loaded twice
 * (Vite's config and an `ssrLoadModule`, two copies of this package) still has one set of streams.
 */

/**
 * The most streams one process holds open at once, over every topic. A page holds one per topic it
 * follows; a person with the module on a few kehikot, each in a couple of windows, is a handful.
 * Past this a new stream is refused with 503 and `subscribe` tries again later, so a page that
 * leaks streams cannot take a module's sockets.
 */
export const MAX_EVENT_STREAMS = 64

/** A topic is a short name: `board`, `board:/path/to/project`. */
export const MAX_TOPIC_LENGTH = 512

/** What a refused stream says. */
export const EVENTS_FULL = 'Too many pages are following this module at once. Close one and it will reconnect.'
export const EVENTS_BAD_TOPIC = 'An event stream needs a topic: a non-empty name of at most 512 characters.'

/** The value of `initial`: a value, or what to compute when a stream opens. `undefined` sends nothing first. */
export type Initial = unknown | (() => unknown | Promise<unknown>)

type Deliver = (data: unknown, name?: string) => void

interface Listener {
  topic: string
  send: Deliver
}

const HUB = Symbol.for('kehikot-module-protocol.events')

function hub(): Map<string, Set<Listener>> {
  const holder = globalThis as unknown as Record<symbol, Map<string, Set<Listener>> | undefined>
  let topics = holder[HUB]
  if (!topics) {
    topics = new Map()
    holder[HUB] = topics
  }
  return topics
}

const goodTopic = (topic: unknown): topic is string => typeof topic === 'string' && topic.length > 0 && topic.length <= MAX_TOPIC_LENGTH

/**
 * Send `data` to every stream following `topic`, as one event (`name` makes it a named event, which
 * `subscribe` hears only when asked to). Returns how many streams it reached: 0 when no page is
 * watching, which is the module's cue that it may skip work only a page would see.
 */
export function publish(topic: string, data: unknown, name?: string): number {
  const listeners = hub().get(topic)
  if (!listeners) return 0
  let reached = 0
  for (const listener of [...listeners]) {
    try {
      listener.send(data, name)
      reached += 1
    } catch {
      /* One stream that broke is that stream's; its close is on its way. */
    }
  }
  return reached
}

/** How many streams follow `topic` now, or every topic when none is named. */
export function watching(topic?: string): number {
  const topics = hub()
  if (topic !== undefined) return topics.get(topic)?.size ?? 0
  let all = 0
  for (const listeners of topics.values()) all += listeners.size
  return all
}

/**
 * Follow `topic` with `deliver`: the initial state first, then what is published. `null` when the
 * process already holds `MAX_EVENT_STREAMS`. The answer's `close` is idempotent.
 */
export function attach(topic: string, deliver: Deliver, initial?: Initial): { close: () => void } | null {
  if (watching() >= MAX_EVENT_STREAMS) return null
  const topics = hub()
  let ready = initial === undefined
  let closed = false
  const waiting: [unknown, string | undefined][] = []
  const listener: Listener = {
    topic,
    send: (data, name) => {
      if (closed) return
      if (ready) deliver(data, name)
      else waiting.push([data, name])
    },
  }
  let listeners = topics.get(topic)
  if (!listeners) {
    listeners = new Set()
    topics.set(topic, listeners)
  }
  listeners.add(listener)

  const flush = () => {
    ready = true
    for (const [data, name] of waiting.splice(0)) if (!closed) deliver(data, name)
  }
  const first = (value: unknown) => {
    if (closed) return
    if (value !== undefined) {
      try {
        deliver(value)
      } catch {
        /* The reader went away while the state was read. */
      }
    }
    flush()
  }
  if (!ready) {
    let value: unknown
    try {
      value = typeof initial === 'function' ? (initial as () => unknown)() : initial
    } catch {
      value = undefined
    }
    if (value instanceof Promise) value.then(first, () => first(undefined))
    else first(value)
  }

  return {
    close: () => {
      if (closed) return
      closed = true
      waiting.length = 0
      const now = topics.get(topic)
      if (!now) return
      now.delete(listener)
      if (now.size === 0) topics.delete(topic)
    },
  }
}

/** One event on the wire. A name is one line; the data is JSON, which never holds a raw newline. */
export function eventFrame(data: unknown, name?: string): string {
  return `${name ? `event: ${name.replace(/[\r\n]/g, '')}\n` : ''}data: ${JSON.stringify(data)}\n\n`
}

/** What `events` routes a path to: the topic, and the state to send first. */
export interface EventRoute {
  /** What the stream follows. `publish(topic, …)` reaches it. */
  topic: string
  /**
   * The state the page starts from, sent before anything published: a value, or a function asked
   * as the stream opens (it may be async; what is published meanwhile waits behind it). A page
   * that reconnects — after a drop, or after being hidden — is sent it again, so it never misses
   * a change. Leave it out to send nothing first.
   */
  initial?: Initial
  /**
   * Called once when this stream closes, after the topic has forgotten it: `watching(topic)` is
   * already the count without it. Where a module stops a file watcher nobody needs any more.
   */
  closed?: () => void
}

/**
 * The doors' `stream` option, from a route: `(path, query, ticket) => { topic, initial } | null`,
 * `null` for "not an event door" (the request goes on to `answer`). Only `GET` is routed. The doors
 * gate it, write the headers and the heartbeat, and close it when the reader goes away.
 *
 *     doors({ manifest, answer, stream: events((path, query) =>
 *       path === '/api/events' ? { topic: 'board', initial: () => readBoard() } : null) })
 */
export function events(route: (path: string, query: URLSearchParams, ticket: string | null) => EventRoute | null): Stream {
  return (method, path, query, emit, ticket) => {
    if (method !== 'GET') return null
    const to = route(path, query, ticket)
    if (!to) return null
    if (!goodTopic(to.topic)) return { reply: { status: 400, body: { ok: false, error: EVENTS_BAD_TOPIC } } }
    const held = attach(to.topic, emit, to.initial)
    if (!held) return { reply: { status: 503, body: { ok: false, error: EVENTS_FULL }, headers: { 'retry-after': '5' } } satisfies Reply }
    if (!to.closed) return held
    let done = false
    return {
      close: () => {
        held.close()
        if (done) return
        done = true
        try {
          to.closed?.()
        } catch {
          /* The module's own clean-up; the stream is closed either way. */
        }
      },
    }
  }
}

/**
 * Several `stream` doors as one: each is asked in turn and the first that is not `null` answers.
 * For a module that has a stream door of its own (a log it tails) beside its topics.
 */
export function streams(...doors: readonly Stream[]): Stream {
  return (method, path, query, emit, ticket) => {
    for (const door of doors) {
      const live = door(method, path, query, emit, ticket)
      if (live) return live
    }
    return null
  }
}
