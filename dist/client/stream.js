import { probeServer } from './ask.js';
import { withQuery } from './query.js';
/**
 * Follow a server-sent-event door. Each event's data is parsed as JSON and
 * handed over; one that is not JSON is dropped. Unnamed events are heard, and
 * the named ones listed in `events`. Returns the function that stops following.
 */
export function follow(path, onEvent, options = {}) {
    const Source = options.EventSource ?? (typeof EventSource === 'undefined' ? null : EventSource);
    const say = (attachment) => options.onAttachment?.(attachment);
    if (!Source) {
        say('detached');
        return () => { };
    }
    const url = withQuery(path, options.query);
    const first = options.retryMs ?? 1000;
    const most = options.maxRetryMs ?? 15_000;
    let pause = first;
    let source = null;
    let timer = null;
    let stopped = false;
    const open = () => {
        if (stopped)
            return;
        say('connecting');
        const live = new Source(url);
        source = live;
        live.onopen = () => {
            pause = first;
            say('attached');
        };
        const hear = (data, name) => {
            try {
                const event = JSON.parse(String(data));
                if (name === undefined)
                    onEvent(event);
                else
                    onEvent(event, name);
            }
            catch {
                /* Not JSON, so not ours. */
            }
        };
        live.onmessage = (message) => hear(message.data);
        for (const name of options.events ?? []) {
            live.addEventListener(name, (message) => {
                if (!stopped)
                    hear(message.data, name);
            });
        }
        live.onerror = () => {
            if (stopped)
                return;
            say('detached');
            if (options.probe)
                void probeServer(options.probe === true ? undefined : options.probe);
            /* Still CONNECTING means the browser is retrying by itself. CLOSED means it gave up. */
            if (live.readyState !== 2)
                return;
            live.close();
            timer = setTimeout(open, pause);
            pause = Math.min(pause * 2, most);
        };
    };
    open();
    return () => {
        stopped = true;
        if (timer !== null)
            clearTimeout(timer);
        source?.close();
    };
}
