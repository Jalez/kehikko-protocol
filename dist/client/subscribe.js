import { follow } from './stream.js';
/**
 * Follow the event stream at `url` (`events` or `eventDoors` on the server): each event's data,
 * parsed as JSON, is handed to `onEvent` — the module's `initial` state first, then each `publish`.
 * The stream is closed while `document.hidden` and opened again when the page is shown, which
 * delivers the state again, so nothing that changed meanwhile is missed. A stream that drops is
 * reopened, with a pause (`follow`). Returns the function that stops it for good.
 *
 *     useEffect(() => subscribe('./api/events', (board: Board) => setBoard(board)), [])
 */
export function subscribe(url, onEvent, options = {}) {
    const page = options.document ?? (typeof document === 'undefined' ? null : document);
    let stop = null;
    let ended = false;
    const open = () => {
        if (ended || stop)
            return;
        stop = follow(url, onEvent, options);
    };
    const close = () => {
        stop?.();
        stop = null;
    };
    const seen = () => {
        if (!page || options.whileHidden)
            return;
        if (page.visibilityState === 'hidden')
            close();
        else
            open();
    };
    if (!page || options.whileHidden || page.visibilityState !== 'hidden')
        open();
    page?.addEventListener('visibilitychange', seen);
    return () => {
        ended = true;
        page?.removeEventListener('visibilitychange', seen);
        close();
    };
}
