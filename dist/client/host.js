import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HostRefused, NOBODY_TO_ASK } from './connect.js';
import { JSON_KEPT, hostStore, } from './host-store.js';
/**
 * The host, as one React value with everything a screen reads already on it: the theme on `<html>`,
 * the flattened context, the kept state. A thin binding over `hostStore` (`host-store.ts`), which
 * is the same thing for a page whose state lives outside React. See docs/module-plumbing.md.
 */
export { JSON_KEPT, hostFields } from './host-store.js';
/**
 * Connect once for the life of the component. `events` may be rebuilt on every
 * render — it is read through a ref — so `onGoto` needs no memoising.
 */
export function useHost(id, events = {}, options = {}) {
    /* An unstarted store is only its first standing: `listening`, and the theme the document decided. */
    const [standing, setStanding] = useState(() => hostStore(id).get());
    const drawn = useRef(standing);
    drawn.current = standing;
    const held = useRef(null);
    const handlers = useRef(events);
    handlers.current = events;
    const settings = useRef(options);
    settings.current = options;
    useEffect(() => {
        const mounted = settings.current;
        const read = (mounted.kept ?? JSON_KEPT).read;
        const live = hostStore(id, {
            onHello: (context, state) => handlers.current.onHello?.(context, state),
            onContext: (context) => handlers.current.onContext?.(context),
            onGoto: (message, answer) => {
                const handler = handlers.current.onGoto;
                if (handler)
                    handler(message, answer);
                else
                    answer(false, 'This app is not showing anything that can be walked to.');
            },
            onEvent: (event) => handlers.current.onEvent?.(event),
            onClear: () => handlers.current.onClear?.(),
            onRefresh: () => handlers.current.onRefresh?.(),
        }, 
        /* The codec is read at mount and written through whichever one is current. */
        { ...mounted, kept: { read, write: (kept) => (settings.current.kept ?? JSON_KEPT).write(kept) } });
        /* Stored BEFORE it starts: the mailbox replays synchronously inside `start`. */
        held.current = live;
        live.subscribe(() => setStanding(live.get()));
        live.start();
        return () => {
            live.stop();
            if (held.current === live)
                held.current = null;
        };
    }, [id]);
    const request = useCallback((method, params = {}, asking) => {
        const live = held.current;
        if (live)
            return live.request(method, params, asking);
        return Promise.reject(new HostRefused({ reason: 'silent', error: NOBODY_TO_ASK }));
    }, []);
    const remember = useCallback((next) => {
        const live = held.current;
        if (live)
            live.remember(next);
        else
            setStanding((was) => ({ ...was, kept: next }));
    }, []);
    const point = useCallback((passage) => held.current?.point(passage), []);
    const resize = useCallback((height) => held.current?.resize(height), []);
    const filters = useCallback((groups) => held.current?.filters(groups), []);
    const clearable = useCallback((label) => held.current?.clearable(label), []);
    const refreshable = useCallback((state) => held.current?.refreshable(state), []);
    const connection = useCallback(() => held.current?.connection() ?? null, []);
    const read = useCallback(() => held.current?.get() ?? drawn.current, []);
    return useMemo(() => ({ ...standing, remember, point, request, resize, filters, clearable, refreshable, connection, read }), [standing, remember, point, request, resize, filters, clearable, refreshable, connection, read]);
}
