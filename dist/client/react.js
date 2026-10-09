import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HostRefused, NOBODY_TO_ASK, connect, } from './connect.js';
import { GREETING_GRACE_MS } from './host-store.js';
import { deprecated } from '../deprecated.js';
/**
 * The bridge as one React value: `useKehikot`. Optional — a second subpath the plain client never
 * imports, and a module may hand-roll all of it.
 * Design notes: docs/client.md.
 *
 * `useKehikot` is deprecated in 0.37 and removed in the next breaking release: `useHost` (below,
 * from `host.ts`) is the hook, and `hostStore` in `/client` is the same thing outside React.
 */
/* Stated beside the store, which needs them without React; still exported from here. */
export { GREETING_GRACE_MS };
/**
 * Connect once, for the life of this component, and re-render when the host speaks. `events` is
 * read through a ref, so it need not be memoised; `id` is the only dependency that reconnects.
 *
 * @deprecated Removed in the next breaking release. Use `useHost`: the same connection, with the
 * context flattened, the theme applied, the kept state typed, and `onClear` / `onRefresh` delivered.
 */
export function useKehikot(id, events = {}, options = {}) {
    deprecated('useKehikot (and its alias useRoadmap)', 'Use useHost from kehikot-module-protocol/client/react.');
    const [where, setWhere] = useState('listening');
    const [context, setContext] = useState(null);
    const [state, setState] = useState(null);
    const held = useRef(null);
    /** The handlers, held in a ref and read when a message arrives, so the newest is the one called. */
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
                /* The discarded mount's answer must not overwrite the live one: `StrictMode` mounts
                   twice, and the mailbox replays to EVERY subscriber including the stopped one. */
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
                /* Not guarded, and that is deliberate: the host is WAITING on this one. Whichever mount
                   hears it answers it. */
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
        /* Stored BEFORE it is told to listen: the mailbox replays synchronously inside `listen`, so a
           handler reading this ref must find it already assigned. */
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
        /* Refused in the connection's own words, so a caller sees one sentence for "nobody is there"
           whichever side of the mount it asked from. */
        return Promise.reject(new HostRefused({ reason: 'silent', error: NOBODY_TO_ASK }));
    }, []);
    const resize = useCallback((height) => held.current?.resize(height), []);
    const filters = useCallback((groups) => held.current?.filters(groups), []);
    const clearable = useCallback((label) => held.current?.clearable(label), []);
    const refreshable = useCallback((state) => held.current?.refreshable(state), []);
    const connection = useCallback(() => held.current, []);
    return useMemo(() => ({ where, context, state, request, resize, filters, clearable, refreshable, connection }), [where, context, state, request, resize, filters, clearable, refreshable, connection]);
}
/* The parts focus, beside the bridge: the same entry, a hook that needs no
   connection. See `focus.ts`. */
export { useFocus } from './focus.js';
/**
 * The names this hook and its types had before the app was renamed, kept so a
 * module that has not been updated still builds against this copy. Same
 * function, same types. Use `useKehikot`.
 *
 * @deprecated Removed in the next breaking release, with `useKehikot`. Use `useHost`.
 */
export const useRoadmap = useKehikot;
/* The fuller listener and the shared not-ready screen. See `host.ts` and `cover.ts`. */
export { useHost, hostFields, JSON_KEPT } from './host.js';
export {} from './host-store.js';
export { Cover, coverFor, useServerStanding, COVER_CSS, COVER_STYLE_ID, COVER_WORDS, TRY_AGAIN, } from './cover.js';
