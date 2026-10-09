import { HostRefused, NOBODY_TO_ASK, connect, } from './connect.js';
import { reloadWhenStale } from './ask.js';
import { applyTheme, pageTheme, systemTheme } from './theme.js';
/**
 * The host as one value outside React: everything `useHost` arranges — the grace before
 * "unhosted", the theme on `<html>`, the flattened context, the kept state, the stale reload — for
 * a page whose state lives in a store of its own. `useHost` is this, bound to a component.
 * See docs/module-plumbing.md.
 */
/** How long, in ms, a page stays `listening` before it will say nobody is there (`unhosted`). */
export const GREETING_GRACE_MS = 700;
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
const STEADY = ['passage', 'containers', 'parts', 'selection', 'chosen', 'kehikko'];
const NONE = [];
const NO_CHOICE = {};
const text = (value) => (typeof value === 'string' && value.trim() ? value : null);
/** Whether two values off the wire say the same thing: JSON all the way down. */
function alike(a, b) {
    if (a === b)
        return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null)
        return false;
    if (Array.isArray(a) !== Array.isArray(b))
        return false;
    const [one, other] = [a, b];
    const keys = Object.keys(one);
    return keys.length === Object.keys(other).length && keys.every((key) => Object.hasOwn(other, key) && alike(one[key], other[key]));
}
/**
 * The flattened fields of a context. Pure, so a test can build a `Host` from a plain object.
 * Given the fields as they were, each one that still says the same thing IS the one it was: every
 * context is parsed afresh off the wire, and an effect that depends on `passage` should run when
 * the passage changed, not whenever the host spoke. `same` replaces that rule for the fields it names.
 */
export function hostFields(context, was, same = {}) {
    const now = {
        project: text(context?.project),
        projectPath: text(context?.projectPath),
        epic: text(context?.epic),
        passage: context?.passage ?? null,
        containers: context?.containers ?? NONE,
        parts: context?.parts ?? NONE,
        selection: context?.selection ?? NONE,
        chosen: context?.filters ?? NO_CHOICE,
        kehikko: context?.kehikko ?? null,
    };
    if (!was)
        return now;
    for (const name of STEADY) {
        const rule = same[name];
        if (rule ? rule(was[name], now[name]) : alike(was[name], now[name]))
            now[name] = was[name];
    }
    return now;
}
/**
 * Build the store. Nothing is heard until `start()`. `events` are the page's own handlers, called
 * AFTER the standing has changed — so a handler that reads `get()` finds what it was just told,
 * which matters for a greeting replayed before anything has rendered.
 */
export function hostStore(id, events = {}, options = {}) {
    const { grace = GREETING_GRACE_MS, kept: given, applyTheme: themed = true, reloadWhenStale: reloads = true, same, ...connectOptions } = options;
    const codec = given ?? JSON_KEPT;
    let standing = { where: 'listening', context: null, ...hostFields(null), theme: pageTheme() ?? 'light', kept: null };
    const hearers = new Set();
    let live = null;
    let stopped = false;
    let timer = null;
    let unwatch = null;
    const change = (next) => {
        standing = { ...standing, ...next };
        for (const heard of [...hearers])
            heard();
    };
    const arrived = (context, state) => {
        const theme = context.theme === 'dark' ? 'dark' : 'light';
        if (themed)
            applyTheme(theme, { remember: true });
        /* The kept state with the context, in one change, so the first hosted standing already has the remembered choice. */
        change({ where: 'hosted', context, ...hostFields(context, standing, same), theme, ...(state !== undefined ? { kept: codec.read(state) } : {}) });
    };
    const store = {
        get: () => standing,
        subscribe(heard) {
            hearers.add(heard);
            return () => hearers.delete(heard);
        },
        start() {
            if (live || stopped)
                return store;
            const connection = connect(id, {
                onHello: (context, state) => {
                    /* A stopped store's answer must not overwrite the live one: `StrictMode` mounts twice,
                       and the mailbox replays to every subscriber. */
                    if (stopped)
                        return;
                    arrived(context, state);
                    events.onHello?.(context, state);
                },
                onContext: (context) => {
                    if (stopped)
                        return;
                    arrived(context);
                    events.onContext?.(context);
                },
                onGoto: (message, answer) => {
                    /* Not guarded: the host is waiting on this one. Whoever hears it answers. */
                    if (events.onGoto)
                        events.onGoto(message, answer);
                    else
                        answer(false, 'This app is not showing anything that can be walked to.');
                },
                onEvent: (event) => {
                    if (!stopped)
                        events.onEvent?.(event);
                },
                onClear: () => {
                    if (!stopped)
                        events.onClear?.();
                },
                onRefresh: () => {
                    if (!stopped)
                        events.onRefresh?.();
                },
            }, connectOptions);
            /* Stored BEFORE it listens: the mailbox replays synchronously inside `listen`. */
            live = connection;
            connection.listen();
            if (grace > 0) {
                timer = setTimeout(() => {
                    if (stopped || connection.greeted())
                        return;
                    const unhosted = standing.where === 'listening' ? { where: 'unhosted' } : {};
                    /* Nobody will say a theme. If the document decided none, the system's is the answer. */
                    if (themed && pageTheme() === null) {
                        const own = systemTheme();
                        applyTheme(own);
                        unhosted.theme = own;
                    }
                    if (Object.keys(unhosted).length)
                        change(unhosted);
                }, grace);
            }
            if (reloads)
                unwatch = reloadWhenStale();
            return store;
        },
        stop() {
            stopped = true;
            if (timer !== null)
                clearTimeout(timer);
            unwatch?.();
            live?.stop();
            live = null;
            hearers.clear();
        },
        remember(next) {
            change({ kept: next });
            if (!live || !live.greeted())
                return;
            void live.request('state.set', { state: codec.write(next) }).catch(() => {
                /* Reported nowhere on purpose: the choice holds for this session. */
            });
        },
        point(passage) {
            if (!live || !live.greeted())
                return;
            void live.request('passage.set', { passage }).catch(() => { });
        },
        request(method, params = {}, asking) {
            if (live)
                return live.request(method, params, asking);
            /* Refused in the connection's own words, so a caller sees one sentence for "nobody is there". */
            return Promise.reject(new HostRefused({ reason: 'silent', error: NOBODY_TO_ASK }));
        },
        resize: (height) => live?.resize(height),
        filters: (groups) => live?.filters(groups),
        clearable: (label) => live?.clearable(label),
        refreshable: (state) => live?.refreshable(state),
        connection: () => live,
    };
    return store;
}
