import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HostRefused, NOBODY_TO_ASK, connect, } from './connect.js';
/**
 * The bridge as one React value — and it is OPTIONAL, twice over.
 *
 * Optional because it is a second subpath: `roadmap-module-protocol/client` has
 * no idea this file exists, imports no React, and works in a page built with
 * anything or nothing. A client that imported React would make this package
 * opinionated about a thing it has no business having an opinion on. Not every
 * module is a React app and none is obliged to be.
 *
 * Optional because a module may hand-roll all of it and be perfectly conforming.
 * See the note in `index.ts`.
 *
 * What it adds over calling `connect` yourself is three orderings that are easy
 * to get wrong and silent when you do — the store-before-listen split, the
 * handler refs, and the discarded-mount guard. Each is described where it
 * happens.
 */
/**
 * How long a page waits before it will say nobody is there.
 *
 * A page cannot know at load whether it is framed. It has to wait to find out,
 * because the greeting arrives when the host is ready rather than when we are,
 * and a page that concluded "nobody is there" in the first frame would say so
 * and then be greeted a moment later — the reader would see the standalone
 * paragraph flash past and be replaced, which teaches them that paragraph is
 * noise. So there is a `listening` state with its own words, it lasts under a
 * second, and only then does the page say the harder thing.
 *
 * It is not a spinner. A page using it should say what it is waiting for.
 */
export const GREETING_GRACE_MS = 700;
/**
 * Connect once, for the life of this component, and re-render when the host speaks.
 *
 * `events` may be rebuilt on every render — it is read through a ref, never
 * captured — so there is no need to memoise it at the call site. `id` is the
 * only dependency, because reconnecting is a second `ready` and a torn-down
 * listener during whatever millisecond the host chose to greet in.
 */
export function useRoadmap(id, events = {}, options = {}) {
    const [where, setWhere] = useState('listening');
    const [context, setContext] = useState(null);
    const [state, setState] = useState(null);
    const held = useRef(null);
    /**
     * The handlers, held in a ref and read at the moment a message arrives.
     *
     * A view rebuilds `onGoto` whenever its rows change, and connecting to the
     * window again on every render would mean a torn-down listener during the one
     * millisecond a host chose to greet in. So the listener is established once
     * and always calls the newest handler — which is also the only one that knows
     * what is currently on screen.
     */
    const handlers = useRef(events);
    handlers.current = events;
    /* Read at connect time only. Changing a timeout mid-conversation would mean
       rebuilding the connection, which costs a second greeting to save nothing. */
    const settings = useRef(options);
    settings.current = options;
    useEffect(() => {
        const { grace = GREETING_GRACE_MS, ...connectOptions } = settings.current;
        const live = connect(id, {
            onHello: (next, kept) => {
                /*
                 * The discarded mount's answer must not overwrite the live one.
                 *
                 * `StrictMode` mounts, unmounts and mounts again. The first
                 * connection is stopped in the first cleanup, but a message already
                 * in flight — or, far more often, one being replayed out of the
                 * mailbox's backlog — can still reach its handlers, and the mailbox
                 * replays to EVERY subscriber including the doomed one. Without this
                 * line the second mount's fresh context is overwritten by the first
                 * mount's stale one, in the order the two happen to be delivered, and
                 * the page draws a greeting it has since been told to forget.
                 *
                 * It is one comparison and it is the difference between a
                 * double-mounted page that is right and one that is right most of the
                 * time.
                 */
                if (held.current !== live)
                    return;
                setWhere('hosted');
                setContext(next);
                if (kept !== undefined)
                    setState(kept);
                handlers.current.onHello?.(next, kept);
            },
            onContext: (next) => {
                if (held.current !== live)
                    return;
                setWhere('hosted');
                setContext(next);
                handlers.current.onContext?.(next);
            },
            onGoto: (message, answer) => {
                /* Not guarded, and that is deliberate: the host is WAITING on this
                   one, and a discarded mount refusing to answer is a reference that
                   sits out the host's timeout. Whichever mount hears it answers it. */
                const handler = handlers.current.onGoto;
                if (handler)
                    handler(message, answer);
                else
                    answer(false, 'This app is not showing anything that can be walked to.');
            },
            onEvent: (event) => {
                if (held.current !== live)
                    return;
                handlers.current.onEvent?.(event);
            },
        }, connectOptions);
        /*
         * Stored BEFORE it is told to listen, and the order is the whole of a bug
         * that made two modules hang. The mailbox replays synchronously inside
         * `listen`, so anything reading this ref from a handler must find it
         * already assigned. See `listen` in `connect.ts`.
         */
        held.current = live;
        live.listen();
        const grace_ = grace > 0 ? setTimeout(() => setWhere((was) => (was === 'listening' ? 'unhosted' : was)), grace) : null;
        return () => {
            if (grace_ !== null)
                clearTimeout(grace_);
            live.stop();
            if (held.current === live)
                held.current = null;
        };
    }, [id]);
    const request = useCallback((method, params = {}, options) => {
        const live = held.current;
        if (live)
            return live.request(method, params, options);
        /* Refused in the connection's own words rather than a second spelling of
           them, so a caller sees one sentence for "nobody is there" whichever side
           of the mount it asked from. */
        return Promise.reject(new HostRefused({ reason: 'silent', error: NOBODY_TO_ASK }));
    }, []);
    const resize = useCallback((height) => held.current?.resize(height), []);
    const filters = useCallback((groups) => held.current?.filters(groups), []);
    const clearable = useCallback((label) => held.current?.clearable(label), []);
    const refreshable = useCallback((state) => held.current?.refreshable(state), []);
    const connection = useCallback(() => held.current, []);
    return useMemo(() => ({ where, context, state, request, resize, filters, clearable, refreshable, connection }), [where, context, state, request, resize, filters, clearable, refreshable, connection]);
}
//# sourceMappingURL=react.js.map