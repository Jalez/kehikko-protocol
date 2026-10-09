import { type Query } from './query.js';
/**
 * A page following its own server's events. `EventSource` gives up for good when the answer is
 * not a stream; this reconnects then too, and says `detached` in the meantime.
 */
export type Attachment = 'connecting' | 'attached' | 'detached';
export interface FollowOptions {
    /** Appended to the path as a query string. A list repeats its key. */
    query?: Query;
    /**
     * The named events to hear as well (`event: line`). Each is handed over like an unnamed one,
     * with its name second. Names not listed are not heard: that is `EventSource`'s rule.
     */
    events?: readonly string[];
    /** Told every change: `connecting`, then `attached`, and `detached` whenever the stream is not open. */
    onAttachment?: (attachment: Attachment) => void;
    /**
     * Ask the server whether it is there each time the stream drops (`probeServer`), so a page that
     * asks nothing on a timer learns its server has stopped, or is another process: an `EventSource`
     * cannot tell a refusal from silence. `true` asks `/healthz`; a string is the door to ask.
     */
    probe?: boolean | string;
    /** The first pause before reconnecting, doubled up to `maxRetryMs`. Default 1000. */
    retryMs?: number;
    /** Default 15000. */
    maxRetryMs?: number;
    /** For tests. Default: the page's own `EventSource`. */
    EventSource?: typeof EventSource;
}
/**
 * Follow a server-sent-event door. Each event's data is parsed as JSON and
 * handed over; one that is not JSON is dropped. Unnamed events are heard, and
 * the named ones listed in `events`. Returns the function that stops following.
 */
export declare function follow<T = unknown>(path: string, onEvent: (event: T, name?: string) => void, options?: FollowOptions): () => void;
