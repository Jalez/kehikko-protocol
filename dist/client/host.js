import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HostRefused, NOBODY_TO_ASK } from './connect.js';
import { JSON_KEPT, KEEP_AFTER_MS, hostStore, } from './host-store.js';
/**
 * The host, as one React value with everything a screen reads already on it: the theme on `<html>`,
 * the flattened context, the kept state. A thin binding over `hostStore` (`host-store.ts`), which
 * is the same thing for a page whose state lives outside React. See docs/module-plumbing.md.
 */
export { JSON_KEPT, KEEP_AFTER_MS, hostFields } from './host-store.js';
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
            onHello: (context, state, facts) => handlers.current.onHello?.(context, state, facts),
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
            onOpened: (opened) => handlers.current.onOpened?.(opened),
            onCovered: (covered) => handlers.current.onCovered?.(covered),
            onVisible: (visible) => handlers.current.onVisible?.(visible),
            /* Always given, and read through the ref: a handler added on a later render is heard. */
            onPress: (press) => (handlers.current.onPress ? handlers.current.onPress(press) : 'This app declared that item and does not take presses.'),
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
    const remember = useCallback((next, after) => {
        const live = held.current;
        if (live)
            live.remember(next, after);
        else
            setStanding((was) => ({ ...was, kept: next }));
    }, []);
    const point = useCallback((passage) => held.current?.point(passage), []);
    const locate = useCallback((location, intent) => held.current?.locate(location, intent) ?? Promise.resolve(null), []);
    const openAddress = useCallback((url, options) => held.current?.openAddress(url, options) ?? Promise.resolve(null), []);
    const resize = useCallback((height) => held.current?.resize(height), []);
    const filters = useCallback((groups) => held.current?.filters(groups), []);
    const clearable = useCallback((label) => held.current?.clearable(label), []);
    const refreshable = useCallback((state) => held.current?.refreshable(state), []);
    const header = useCallback((items) => held.current?.header(items), []);
    const footer = useCallback((items) => held.current?.footer(items), []);
    const activity = useCallback((items) => held.current?.activity(items), []);
    const connection = useCallback(() => held.current?.connection() ?? null, []);
    const read = useCallback(() => held.current?.get() ?? drawn.current, []);
    return useMemo(() => ({ ...standing, remember, point, locate, openAddress, request, resize, filters, clearable, refreshable, header, footer, activity, connection, read }), [standing, remember, point, locate, openAddress, request, resize, filters, clearable, refreshable, header, footer, activity, connection, read]);
}
/** Whether a kept value can stand for `initial`: the same kind of value (an array for an array). */
function sameKind(initial, value) {
    if (initial === null || initial === undefined)
        return true;
    if (Array.isArray(initial))
        return Array.isArray(value);
    return typeof value === typeof initial && value !== null;
}
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
/**
 * 2.51.0. One field of this container's kept view, as `useState`: `const [view, setView] =
 * useKept(host, 'view', 'list')`. Read from the host's kept value (a JSON object, one key per field)
 * and written back into it, the other fields kept, after `KEEP_AFTER_MS`. The host keeps it per
 * container — this module on this kehikko — so the same module on two kehikot keeps two views, and
 * each is back after the app restarts. Nothing goes to browser storage.
 *
 * `initial` is what is shown when nothing is kept, or what is kept is not the same kind of value
 * (`valid`, when given, decides instead: a switch's options, say). The kept value arrives with the
 * greeting, before the first hosted render, so a page that waits for `where === 'hosted'` never
 * draws the default first. Several `useKept` on one host share its kept object; a page that also
 * calls `remember` itself must keep that object's other keys.
 */
export function useKept(host, key, initial, valid) {
    const kept = isRecord(host.kept) ? host.kept : null;
    const raw = kept && Object.prototype.hasOwnProperty.call(kept, key) ? kept[key] : undefined;
    const value = raw !== undefined && (valid ? valid(raw) : sameKind(initial, raw)) ? raw : initial;
    const now = useRef(value);
    now.current = value;
    const bound = useRef(host);
    bound.current = host;
    const set = useCallback((next) => {
        const resolved = typeof next === 'function' ? next(now.current) : next;
        now.current = resolved;
        const was = bound.current.read().kept;
        const base = isRecord(was) ? was : {};
        bound.current.remember({ ...base, [key]: resolved }, KEEP_AFTER_MS);
    }, [key]);
    return [value, set];
}
