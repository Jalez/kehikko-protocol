/**
 * A page following its own server's events. `EventSource` gives up for good when the answer is
 * not a stream; this reconnects then too, and says `detached` in the meantime.
 */
export type Attachment = 'connecting' | 'attached' | 'detached';
export interface FollowOptions {
    /** Appended to the path as a query string. */
    query?: Record<string, string | number | boolean | null | undefined>;
    /** Told every change: `connecting`, then `attached`, and `detached` whenever the stream is not open. */
    onAttachment?: (attachment: Attachment) => void;
    /** The first pause before reconnecting, doubled up to `maxRetryMs`. Default 1000. */
    retryMs?: number;
    /** Default 15000. */
    maxRetryMs?: number;
    /** For tests. Default: the page's own `EventSource`. */
    EventSource?: typeof EventSource;
}
/**
 * Follow a server-sent-event door. Each event's data is parsed as JSON and
 * handed over; one that is not JSON is dropped. Returns the function that
 * stops following.
 */
export declare function follow<T = unknown>(path: string, onEvent: (event: T) => void, options?: FollowOptions): () => void;
