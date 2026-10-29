import { type FollowOptions } from './stream.js';
/**
 * A page hearing that its module changed, over one held connection (2.32.0): the page half of
 * `events`/`publish` (`/serve`). A page never polls its own module. Design notes: docs/events.md.
 */
export interface SubscribeOptions extends FollowOptions {
    /**
     * Keep the stream open while the page is hidden. Off by default: a hidden page holds no
     * connection, and is sent the current state (`initial`) again when it is shown.
     */
    whileHidden?: boolean;
    /** For tests. Default: the page's own `document`. */
    document?: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
}
/**
 * Follow the event stream at `url` (`events` or `eventDoors` on the server): each event's data,
 * parsed as JSON, is handed to `onEvent` — the module's `initial` state first, then each `publish`.
 * The stream is closed while `document.hidden` and opened again when the page is shown, which
 * delivers the state again, so nothing that changed meanwhile is missed. A stream that drops is
 * reopened, with a pause (`follow`). Returns the function that stops it for good.
 *
 *     useEffect(() => subscribe('./api/events', (board: Board) => setBoard(board)), [])
 */
export declare function subscribe<T = unknown>(url: string, onEvent: (event: T, name?: string) => void, options?: SubscribeOptions): () => void;
