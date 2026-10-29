import type { Stream } from './doors.js';
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
export declare const MAX_EVENT_STREAMS = 64;
/** A topic is a short name: `board`, `board:/path/to/project`. */
export declare const MAX_TOPIC_LENGTH = 512;
/** What a refused stream says. */
export declare const EVENTS_FULL = "Too many pages are following this module at once. Close one and it will reconnect.";
export declare const EVENTS_BAD_TOPIC = "An event stream needs a topic: a non-empty name of at most 512 characters.";
/** The value of `initial`: a value, or what to compute when a stream opens. `undefined` sends nothing first. */
export type Initial = unknown | (() => unknown | Promise<unknown>);
type Deliver = (data: unknown, name?: string) => void;
/**
 * Send `data` to every stream following `topic`, as one event (`name` makes it a named event, which
 * `subscribe` hears only when asked to). Returns how many streams it reached: 0 when no page is
 * watching, which is the module's cue that it may skip work only a page would see.
 */
export declare function publish(topic: string, data: unknown, name?: string): number;
/** How many streams follow `topic` now, or every topic when none is named. */
export declare function watching(topic?: string): number;
/**
 * Follow `topic` with `deliver`: the initial state first, then what is published. `null` when the
 * process already holds `MAX_EVENT_STREAMS`. The answer's `close` is idempotent.
 */
export declare function attach(topic: string, deliver: Deliver, initial?: Initial): {
    close: () => void;
} | null;
/** One event on the wire. A name is one line; the data is JSON, which never holds a raw newline. */
export declare function eventFrame(data: unknown, name?: string): string;
/** What `events` routes a path to: the topic, and the state to send first. */
export interface EventRoute {
    /** What the stream follows. `publish(topic, …)` reaches it. */
    topic: string;
    /**
     * The state the page starts from, sent before anything published: a value, or a function asked
     * as the stream opens (it may be async; what is published meanwhile waits behind it). A page
     * that reconnects — after a drop, or after being hidden — is sent it again, so it never misses
     * a change. Leave it out to send nothing first.
     */
    initial?: Initial;
    /**
     * Called once when this stream closes, after the topic has forgotten it: `watching(topic)` is
     * already the count without it. Where a module stops a file watcher nobody needs any more.
     */
    closed?: () => void;
}
/**
 * The doors' `stream` option, from a route: `(path, query, ticket) => { topic, initial } | null`,
 * `null` for "not an event door" (the request goes on to `answer`). Only `GET` is routed. The doors
 * gate it, write the headers and the heartbeat, and close it when the reader goes away.
 *
 *     doors({ manifest, answer, stream: events((path, query) =>
 *       path === '/api/events' ? { topic: 'board', initial: () => readBoard() } : null) })
 */
export declare function events(route: (path: string, query: URLSearchParams, ticket: string | null) => EventRoute | null): Stream;
/**
 * Several `stream` doors as one: each is asked in turn and the first that is not `null` answers.
 * For a module that has a stream door of its own (a log it tails) beside its topics.
 */
export declare function streams(...doors: readonly Stream[]): Stream;
export {};
