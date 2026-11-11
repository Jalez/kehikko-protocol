import { scopeOf } from '../context.js';
import { readScope } from '../scope.js';
import { addressOpenResult, locationSetResult } from '../methods.js';
import { HostRefused, NOBODY_TO_ASK, connect, } from './connect.js';
import { reloadWhenStale } from './ask.js';
import { headerItemsSchema, pressRefusal } from '../header.js';
import { KEEP_SCROLL_AFTER_MS, KEEP_SCROLL_ATTRIBUTE, RESTORE_SCROLL_WITHIN_MS, headerValues, unwrapKept, wrapKept, } from './kept-view.js';
import { applyTheme, pageTheme, systemTheme } from './theme.js';
import { NOT_COVERED } from '../reveal.js';
/**
 * The host as one value outside React: everything `useHost` arranges — the grace before
 * "unhosted", the theme on `<html>`, the flattened context, the kept state, the stale reload — for
 * a page whose state lives in a store of its own. `useHost` is this, bound to a component.
 * See docs/module-plumbing.md.
 */
/** How long, in ms, a page stays `listening` before it will say nobody is there (`unhosted`). */
export const GREETING_GRACE_MS = 700;
/**
 * 2.51.0. How long, in ms, `useKept` waits after the last change before it sends `state.set`: a run
 * of presses through a switch is one write. A write still waiting when the person moves to another
 * kehikko, or the page stops, is sent at once, for the kehikko it was about.
 */
export const KEEP_AFTER_MS = 300;
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
const STEADY = ['passage', 'location', 'address', 'containers', 'parts', 'selection', 'chosen', 'kehikko'];
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
        projectId: text(context?.projectId),
        epic: text(context?.epic),
        scope: scopeOf(context),
        workingScope: readScope(context?.scope),
        passage: context?.passage ?? null,
        location: context?.location ?? null,
        address: context?.address ?? null,
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
    const { grace = GREETING_GRACE_MS, kept: given, applyTheme: themed = true, reloadWhenStale: reloads = true, same, keepView = true, ...connectOptions } = options;
    const codec = given ?? JSON_KEPT;
    /* 2.70.0. The kept view: what is kept of it, the module's own string beside it, what is to be given back. */
    const viewing = keepView === false ? null : keepView === true ? {} : keepView;
    const keepHeader = viewing !== null && viewing.header !== false;
    const except = new Set(viewing?.except ?? []);
    const scrollOf = viewing === null || viewing.scroll === false
        ? null
        : typeof viewing.scroll === 'function'
            ? viewing.scroll
            : () => {
                if (typeof document === 'undefined')
                    return null;
                return document.querySelector(`[${KEEP_SCROLL_ATTRIBUTE}]`) ?? document.scrollingElement;
            };
    const heardOn = viewing === null ? null : viewing.events !== undefined ? viewing.events : typeof window === 'undefined' ? null : window;
    let ownRaw = null;
    let view = {};
    let keptRaw = null;
    let restoreHeader = null;
    let declaredHeader = [];
    let headerWritten = null;
    const relays = new Set();
    const relayStops = new Map();
    let standing = { where: 'listening', context: null, ...hostFields(null), theme: pageTheme() ?? 'light', kept: null, answers: null, drawsHeader: null, drawsFooter: null, hostCarries: null, footerKinds: null, covered: NOT_COVERED, visible: true };
    const hearers = new Set();
    let live = null;
    let stopped = false;
    let timer = null;
    let unwatch = null;
    /* 2.51.0. The kehikko the kept value is for (`undefined` before the greeting), and a write waiting to be sent. */
    let keptOn = undefined;
    let waitingWrite = null;
    let writeTimer = null;
    const sendWrite = () => {
        if (writeTimer !== null)
            clearTimeout(writeTimer);
        writeTimer = null;
        const write = waitingWrite;
        waitingWrite = null;
        if (!write || !live || !live.greeted())
            return;
        keptRaw = write.state;
        void live.request('state.set', write.kehikko === null ? { state: write.state } : { state: write.state, kehikko: write.kehikko }).catch(() => {
            /* Reported nowhere on purpose: the choice holds for this session. */
        });
    };
    const change = (next) => {
        standing = { ...standing, ...next };
        for (const heard of [...hearers])
            heard();
    };
    /* 2.70.0. What is written for this container: the page's own string, and the view around it. */
    const keptString = () => (viewing === null ? ownRaw : wrapKept(view, ownRaw));
    /* The view changed: written after a pause, and only to a host that keeps state for this module. */
    const viewChanged = (after) => {
        if (!live || !live.greeted() || keptOn === undefined)
            return;
        if (standing.answers !== null && !standing.answers.includes('state.set'))
            return;
        const state = keptString();
        if (state === null || state === keptRaw)
            return;
        waitingWrite = { state, kehikko: keptOn ?? null };
        if (writeTimer !== null)
            clearTimeout(writeTimer);
        writeTimer = setTimeout(sendWrite, after);
    };
    /* A kept switch or toggle that the page's header is not on: pressed, as the person would. */
    const giveBackHeader = () => {
        const pressed = new Set();
        const onPress = events.onPress;
        if (!onPress)
            restoreHeader = null;
        if (!restoreHeader || !onPress)
            return pressed;
        for (const [item, want] of Object.entries(restoreHeader)) {
            const declared = declaredHeader.find((one) => one.id === item);
            if (!declared)
                continue;
            delete restoreHeader[item];
            const now = declared.kind === 'switch' ? declared.value : declared.kind === 'toggle' ? declared.checked : undefined;
            if (now === undefined || now === want || pressRefusal(declaredHeader, { item, value: want }) !== null)
                continue;
            pressed.add(item);
            try {
                const said = onPress({ item, value: want });
                if (said instanceof Promise)
                    said.catch(() => { });
            }
            catch {
                /* A page that fails on its own press stays where it is. */
            }
        }
        if (!Object.keys(restoreHeader).length)
            restoreHeader = null;
        return pressed;
    };
    /* What the page's header is on now goes into the view, but for what is still to be given back. */
    const heardHeader = (items, skip = new Set()) => {
        const parsed = headerItemsSchema.safeParse(items);
        declaredHeader = parsed.success ? parsed.data : [];
        if (!keepHeader || keptOn === undefined)
            return;
        const pressed = giveBackHeader();
        const values = headerValues(items, (id) => !except.has(id) && !pressed.has(id) && !skip.has(id) && !(restoreHeader && id in restoreHeader));
        const next = { ...(view.header ?? {}), ...values };
        for (const id of except)
            delete next[id];
        if (JSON.stringify(next) === JSON.stringify(view.header ?? {}))
            return;
        view = { ...view, header: next };
        viewChanged(KEEP_AFTER_MS);
    };
    /* 2.70.0. The scroll: kept after the person stops, given back while the page draws what it reaches. */
    let restoring = null;
    let scrollTimer = null;
    const stopRestoring = () => {
        if (restoring?.timer)
            clearTimeout(restoring.timer);
        restoring = null;
    };
    const tryRestore = () => {
        if (!restoring || stopped)
            return;
        const box = scrollOf?.();
        if (box) {
            box.scrollTop = restoring.top;
            if (Math.abs(box.scrollTop - restoring.top) <= 1) {
                stopRestoring();
                return;
            }
        }
        if (Date.now() >= restoring.until) {
            stopRestoring();
            return;
        }
        restoring.timer = setTimeout(tryRestore, 100);
    };
    const restoreScroll = (top) => {
        stopRestoring();
        if (!scrollOf || top === undefined)
            return;
        restoring = { top, until: Date.now() + RESTORE_SCROLL_WITHIN_MS, timer: null };
        tryRestore();
    };
    const scrolled = () => {
        if (restoring || !scrollOf || keptOn === undefined)
            return;
        if (scrollTimer !== null)
            clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
            scrollTimer = null;
            const box = scrollOf();
            if (!box || stopped)
                return;
            const top = Math.max(0, Math.round(box.scrollTop));
            if ((view.scroll ?? 0) === top)
                return;
            view = { ...view, ...(top > 0 ? { scroll: top } : { scroll: undefined }) };
            if (top === 0)
                delete view.scroll;
            viewChanged(0);
        }, KEEP_SCROLL_AFTER_MS);
    };
    /* The person's own scroll wins over one still being given back. */
    const tookOver = () => {
        if (restoring)
            stopRestoring();
    };
    const listening = [['scroll', scrolled], ['wheel', tookOver], ['touchstart', tookOver], ['keydown', tookOver], ['pointerdown', tookOver]];
    let unlisten = null;
    const arrived = (context, state, facts) => {
        const theme = context.theme === 'dark' ? 'dark' : 'light';
        if (themed)
            applyTheme(theme, { remember: true });
        /*
         * 2.51.0. Which string is this container's: the context's `kept` from a host that keeps one per
         * container, read on the greeting and whenever the context names another kehikko — never on a
         * context for the same one, which may be the echo of a write this page has since overtaken.
         * From an older host, the greeting's `state`, as before.
         */
        const on = context.kehikko?.id ?? null;
        const greeting = state !== undefined;
        let kept;
        if (context.kept !== undefined && (greeting || on !== keptOn))
            kept = context.kept;
        else if (greeting)
            kept = state;
        let own;
        if (kept !== undefined) {
            /* A write still waiting is about the kehikko it was made on: sent before the next one's value arrives. */
            if (waitingWrite && on !== keptOn)
                sendWrite();
            keptOn = on;
            /* 2.70.0. The module's own string out of the envelope, and the view to give back. */
            const opened = unwrapKept(kept);
            own = opened.state;
            ownRaw = opened.state;
            keptRaw = kept ?? null;
            view = viewing !== null && opened.view ? { ...opened.view } : {};
            restoreHeader = keepHeader && view.header ? { ...view.header } : null;
            for (const id of except)
                if (restoreHeader)
                    delete restoreHeader[id];
        }
        /* The page never sees the envelope: its context carries its own string. */
        const seen = context.kept !== undefined ? { ...context, kept: unwrapKept(context.kept).state } : context;
        /* The kept state with the context, in one change, so the first hosted standing already has the remembered choice. */
        change({ where: 'hosted', context: seen, ...hostFields(seen, standing, same), theme, ...(own !== undefined ? { kept: codec.read(own) } : {}), ...(facts ? { answers: facts.answers, drawsHeader: facts.header, drawsFooter: facts.footer ?? null, hostCarries: facts.carries ?? null, footerKinds: facts.footerKinds ?? null, covered: NOT_COVERED } : {}) });
        if (own !== undefined && viewing !== null) {
            heardHeader(headerWritten);
            restoreScroll(view.scroll);
        }
        return seen;
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
                onHello: (context, state, facts) => {
                    /* A stopped store's answer must not overwrite the live one: `StrictMode` mounts twice,
                       and the mailbox replays to every subscriber. */
                    if (stopped)
                        return;
                    const seen = arrived(context, state, facts);
                    events.onHello?.(seen, unwrapKept(state).state, facts);
                },
                onContext: (context) => {
                    if (stopped)
                        return;
                    const seen = arrived(context);
                    events.onContext?.(seen);
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
                onOpened: (opened) => {
                    if (!stopped)
                        events.onOpened?.(opened);
                },
                onCovered: (covered) => {
                    if (stopped)
                        return;
                    if (covered.top !== standing.covered.top || covered.bottom !== standing.covered.bottom)
                        change({ covered });
                    events.onCovered?.(covered);
                },
                onVisible: (visible) => {
                    if (stopped)
                        return;
                    if (visible !== standing.visible)
                        change({ visible });
                    events.onVisible?.(visible);
                },
                onInbox: (signal) => {
                    if (!stopped)
                        events.onInbox?.(signal);
                },
                /* Only when the page takes presses: without a listener the connection answers for it. */
                ...(events.onPress ? { onPress: (press) => (stopped ? false : events.onPress(press)) } : {}),
                /* 2.69.0. Only when the page searches itself: without a listener the client searches the page. */
                ...(events.onFind ? { onFind: (query, ask) => (stopped ? undefined : events.onFind(query, ask)) } : {}),
            }, connectOptions);
            /* Stored BEFORE it listens: the mailbox replays synchronously inside `listen`. */
            live = connection;
            for (const target of relays)
                relayStops.set(target, connection.pointerFrom(target));
            if (heardOn && scrollOf) {
                for (const [type, fn] of listening)
                    heardOn.addEventListener(type, fn, { capture: true, passive: true });
                unlisten = () => {
                    for (const [type, fn] of listening)
                        heardOn.removeEventListener(type, fn, { capture: true });
                };
            }
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
            sendWrite();
            stopped = true;
            stopRestoring();
            if (scrollTimer !== null)
                clearTimeout(scrollTimer);
            unlisten?.();
            unlisten = null;
            if (timer !== null)
                clearTimeout(timer);
            unwatch?.();
            live?.stop();
            live = null;
            hearers.clear();
        },
        remember(next, after = 0) {
            change({ kept: next });
            ownRaw = codec.write(next);
            if (!live || !live.greeted())
                return;
            waitingWrite = { state: keptString() ?? ownRaw, kehikko: keptOn ?? null };
            if (after > 0) {
                if (writeTimer !== null)
                    clearTimeout(writeTimer);
                writeTimer = setTimeout(sendWrite, after);
                return;
            }
            sendWrite();
        },
        point(passage) {
            if (!live || !live.greeted())
                return;
            void live.request('passage.set', { passage }).catch(() => { });
        },
        locate(location, intent) {
            if (!live || !live.greeted())
                return Promise.resolve(null);
            return live
                .request('location.set', intent === undefined ? { location } : { location, intent })
                .then((answer) => {
                const read = locationSetResult.safeParse(answer);
                return read.success ? read.data : null;
            })
                .catch(() => null);
        },
        openAddress(url, options = {}) {
            if (!live || !live.greeted())
                return Promise.resolve(null);
            const answers = standing.answers;
            if (answers !== null && !answers.includes('address.open'))
                return Promise.resolve(null);
            const params = { url };
            if (options.title !== undefined)
                params.title = options.title;
            if (options.intent !== undefined)
                params.intent = options.intent;
            return live
                .request('address.open', params)
                .then((answer) => {
                const read = addressOpenResult.safeParse(answer);
                return read.success ? read.data : null;
            })
                .catch(() => null);
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
        header: (items) => {
            headerWritten = items;
            live?.header(items);
            heardHeader(items);
        },
        footer: (items) => live?.footer(items),
        activity: (items) => live?.activity(items),
        findResult: (count) => live?.findResult(count),
        ready: () => live?.ready(),
        pointerFrom(target) {
            relays.add(target);
            if (live && !relayStops.has(target))
                relayStops.set(target, live.pointerFrom(target));
            return () => {
                relays.delete(target);
                relayStops.get(target)?.();
                relayStops.delete(target);
            };
        },
        connection: () => live,
    };
    return store;
}
