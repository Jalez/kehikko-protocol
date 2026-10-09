import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HostRefused, NOBODY_TO_ASK, connect, } from './connect.js';
import { GREETING_GRACE_MS } from './react.js';
import { reloadWhenStale } from './ask.js';
import { applyTheme, pageTheme, systemTheme } from './theme.js';
/** The default: JSON, and `null` for anything that does not parse. */
export const JSON_KEPT = {
    read: (state) => {
        if (state === null)
            return null;
        try {
            return JSON.parse(state);
        }
        catch {
            return null;
        }
    },
    write: (kept) => JSON.stringify(kept),
};
const NONE = [];
const NO_CHOICE = {};
const text = (value) => (typeof value === 'string' && value ? value : null);
/** The flattened fields of a context. Pure, so a test can build a `Host` from a plain object. */
export function hostFields(context) {
    return {
        project: text(context?.project),
        projectPath: text(context?.projectPath),
        epic: text(context?.epic),
        passage: context?.passage ?? null,
        containers: context?.containers ?? NONE,
        parts: context?.parts ?? NONE,
        selection: context?.selection ?? NONE,
        chosen: context?.filters ?? NO_CHOICE,
    };
}
/**
 * Connect once for the life of the component. `events` may be rebuilt on every
 * render — it is read through a ref — so `onGoto` needs no memoising.
 */
export function useHost(id, events = {}, options = {}) {
    const [where, setWhere] = useState('listening');
    const [context, setContext] = useState(null);
    const [kept, setKept] = useState(null);
    const [theme, setTheme] = useState(() => pageTheme() ?? 'light');
    const held = useRef(null);
    const handlers = useRef(events);
    handlers.current = events;
    const settings = useRef(options);
    settings.current = options;
    useEffect(() => {
        const { grace = GREETING_GRACE_MS, kept: codec, applyTheme: themed = true, reloadWhenStale: _reload, ...connectOptions } = settings.current;
        const read = (codec ?? JSON_KEPT).read;
        const arrived = (next) => {
            const said = next.theme === 'dark' ? 'dark' : 'light';
            if (themed)
                applyTheme(said, { remember: true });
            setTheme(said);
            setWhere('hosted');
            setContext(next);
        };
        const live = connect(id, {
            onHello: (next, state) => {
                /* The discarded mount's answer must not overwrite the live one; see `useKehikot`. */
                if (held.current !== live)
                    return;
                /* Before the context, so the first hosted render already has the remembered choice. */
                if (state !== undefined)
                    setKept(read(state));
                arrived(next);
                handlers.current.onHello?.(next, state);
            },
            onContext: (next) => {
                if (held.current !== live)
                    return;
                arrived(next);
                handlers.current.onContext?.(next);
            },
            onGoto: (message, answer) => {
                /* Not guarded: the host is waiting on this one. Whichever mount hears it answers. */
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
            onClear: () => {
                if (held.current !== live)
                    return;
                handlers.current.onClear?.();
            },
            onRefresh: () => {
                if (held.current !== live)
                    return;
                handlers.current.onRefresh?.();
            },
        }, connectOptions);
        /* Stored BEFORE it listens: the mailbox replays synchronously inside `listen`. */
        held.current = live;
        live.listen();
        const timer = grace > 0
            ? setTimeout(() => {
                if (held.current !== live || live.greeted())
                    return;
                setWhere((was) => (was === 'listening' ? 'unhosted' : was));
                /* Nobody will say a theme. If the document decided none, the system's is the answer. */
                if (themed && pageTheme() === null) {
                    const own = systemTheme();
                    applyTheme(own);
                    setTheme(own);
                }
            }, grace)
            : null;
        return () => {
            if (timer !== null)
                clearTimeout(timer);
            live.stop();
            if (held.current === live)
                held.current = null;
        };
    }, [id]);
    useEffect(() => (settings.current.reloadWhenStale === false ? undefined : reloadWhenStale()), []);
    const request = useCallback((method, params = {}, asking) => {
        const live = held.current;
        if (live)
            return live.request(method, params, asking);
        return Promise.reject(new HostRefused({ reason: 'silent', error: NOBODY_TO_ASK }));
    }, []);
    const remember = useCallback((next) => {
        setKept(next);
        const live = held.current;
        if (!live || !live.greeted())
            return;
        const write = (settings.current.kept ?? JSON_KEPT).write;
        void live.request('state.set', { state: write(next) }).catch(() => {
            /* Reported nowhere on purpose: the choice holds for this session. */
        });
    }, []);
    const point = useCallback((passage) => {
        const live = held.current;
        if (!live || !live.greeted())
            return;
        void live.request('passage.set', { passage }).catch(() => { });
    }, []);
    const resize = useCallback((height) => held.current?.resize(height), []);
    const filters = useCallback((groups) => held.current?.filters(groups), []);
    const clearable = useCallback((label) => held.current?.clearable(label), []);
    const refreshable = useCallback((state) => held.current?.refreshable(state), []);
    const connection = useCallback(() => held.current, []);
    return useMemo(() => ({
        where,
        context,
        ...hostFields(context),
        theme,
        kept,
        remember,
        point,
        request,
        resize,
        filters,
        clearable,
        refreshable,
        connection,
    }), [where, context, theme, kept, remember, point, request, resize, filters, clearable, refreshable, connection]);
}
