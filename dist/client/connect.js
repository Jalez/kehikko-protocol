import { pageBuild } from './build.js';
import { MESSAGE, PROTOCOL, clampHeight, } from '../constants.js';
import { LIMITS } from '../limits.js';
import { activityItemsSchema } from '../activity.js';
import { ORIGINS_ELEMENT, originAmong } from '../page.js';
import { footerItemsSchema, footerPressRefusal, headerItemsSchema, hostMessageSchema, looksLikeWireMessage, pressRefusal, } from '../wire.js';
import { tooOldOf } from '../fit.js';
import { mailbox } from './mailbox.js';
/** The project folder a greeting or a context names, or null. */
function projectOf(context) {
    const path = context?.projectPath;
    return typeof path === 'string' && path ? path : null;
}
/** The project id (2.1.0) a greeting or a context names, or null: an older host names none. */
function projectIdOf(context) {
    const id = context?.projectId;
    return typeof id === 'string' && id ? id : null;
}
/**
 * The bridge: one conversation with one window, in the shape this package's schemas define.
 * A greeting is taken from an origin the page may be framed by (`mayGreet`); after it, identity is
 * the greeting's window handle (`MessageEvent.source`), never the origin. Everything the host sends
 * is parsed with `hostMessageSchema`. A convenience — a module may hand-roll it all.
 * Design notes: docs/client.md.
 */
/**
 * The origins this page was told it may be framed by: the island its server printed
 * (`ORIGINS_ELEMENT`, the list sent as `frame-ancestors`), or `null` for a document that carries
 * none — one this package's doors did not serve. Read on every greeting; it is one element.
 */
export function pageOrigins() {
    if (typeof document === 'undefined')
        return null;
    const text = document.getElementById(ORIGINS_ELEMENT)?.textContent;
    if (!text)
        return null;
    try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed.filter((one) => typeof one === 'string') : null;
    }
    catch {
        return null;
    }
}
/**
 * Whether a greeting may be answered: whether the window that sent it is one this page may be
 * framed by. `origins` is who that is; `null` is a page that was never told, which answers as it
 * always has. Otherwise a greeting counts from an origin on the list, from the page's own origin,
 * from the page's own window, and with no origin on it at all — an event the page's own script
 * made, since a message from another window always carries one. Pure.
 */
export function mayGreet(greeting, origins, self = {}) {
    if (origins === null)
        return true;
    const from = greeting.origin ?? '';
    if (from === '')
        return true;
    if (self.window != null && greeting.source === self.window)
        return true;
    if (from !== 'null' && from === self.origin)
        return true;
    return originAmong(from, origins);
}
/** A refusal, as a thrown thing. Every rejection from `request` is one of these, always. */
export class HostRefused extends Error {
    refusal;
    constructor(refusal) {
        super(refusal.error);
        this.refusal = refusal;
        this.name = 'HostRefused';
    }
}
/** How long to wait for one answer, in ms, before the question is refused as `silent`. */
export const ANSWER_WITHIN_MS = 12_000;
/**
 * How long to wait, in ms, for an answer that waits on a PERSON (`projects.pick`): five minutes.
 * Passed per question as `within`; never the connection's default.
 */
export const PERSON_ANSWERS_WITHIN_MS = 5 * 60_000;
/**
 * How long, in ms, a `goto` listener has before the backstop answers `false` for it. Far shorter
 * than the host's own timeout.
 */
export const GOTO_BACKSTOP_MS = 500;
/**
 * How long, in ms, an `onPress` listener has to say whether it took a press before the backstop
 * answers "not taken" for it. Long enough to ask the page's own server to start something; a run
 * that takes longer answers at once and reports through its header.
 */
export const PRESS_BACKSTOP_MS = 2_000;
/** What a question asked before any greeting is refused with. The React hook says the same between mounts. */
export const NOBODY_TO_ASK = 'Nothing has greeted this page, so there is nobody to ask.';
/**
 * Build one conversation. Nothing is sent, and nothing is heard, until `listen`; nothing is sent
 * before a greeting arrives either.
 */
export function connect(id, events = {}, options = {}) {
    const source = options.source ?? mailbox;
    const answerWithin = options.answerWithin ?? ANSWER_WITHIN_MS;
    const gotoBackstop = options.gotoBackstop ?? GOTO_BACKSTOP_MS;
    const pressBackstop = options.pressBackstop ?? PRESS_BACKSTOP_MS;
    let host = null;
    let origin = '*';
    let live = true;
    let listening = false;
    /* The last offer, replayed on every greeting. `null` means nothing has been offered; an empty
       offer is a real one and has to be sent. */
    let offered = null;
    /* The last clear offer, replayed likewise. Wrapped in an object because a `null` label is a REAL
       value — nothing to clear — and cannot also mean "never said anything". */
    let clearing = null;
    /* The last refresh state, replayed likewise; what is replayed carries `at`. */
    let refreshing = null;
    /* The last header, replayed likewise, as it was written; and as parsed, to judge a press by. */
    let heading = null;
    let declared = [];
    /* The last footer (2.38.0), replayed and judged likewise. */
    let footing = null;
    let footed = [];
    /* The last activity list, as written, and the text of the one the host last took (`null`: none yet on
       this greeting, so the next is sent). `answered` is the greeting's `answers`, `null` when it did not say. */
    let activityNow = null;
    let activityTaken = null;
    let answered = null;
    /* 1.8.0. Whether this host said it files each item under its `project` (`activitySetResult.projects`),
       and the project it has open — until it has said so, only that project's items are sent, untagged. */
    let byProject = false;
    let projectNow = null;
    let projectIdNow = null;
    /** Correlation id -> the promise waiting on it. A `Map`, per the protocol's note on lookups. */
    const waiting = new Map();
    let counter = 0;
    const nextId = () => `${Date.now().toString(36)}-${(counter += 1).toString(36)}`;
    /** This page's own window and origin, where there is a page. */
    const here = () => typeof window === 'undefined' ? {} : { window, origin: typeof location === 'undefined' ? null : location.origin };
    const send = (message) => {
        if (!host)
            return;
        host.postMessage(message, origin);
    };
    const settle = (correlation, outcome) => {
        /* A late answer to a question nobody is waiting for is dropped, quietly. */
        const pending = waiting.get(correlation);
        if (!pending)
            return;
        waiting.delete(correlation);
        clearTimeout(pending.timer);
        if (outcome.ok)
            pending.resolve(outcome.data);
        else
            pending.reject(new HostRefused(outcome.refusal));
    };
    const onMessage = (ev) => {
        if (!live)
            return;
        if (!looksLikeWireMessage(ev.data))
            return;
        const parsed = hostMessageSchema.safeParse(ev.data);
        if (!parsed.success)
            return;
        const message = parsed.data;
        if (message.type === MESSAGE.HELLO) {
            /* Before anything is answered: a window this page may not be framed by is not its host. */
            if (!mayGreet(ev, options.origins ?? pageOrigins(), here()))
                return;
            /* Answered on EVERY greeting, not only the first: the newest greeting wins, its window
               becomes the one we answer, and `ready` goes back every time. */
            host = ev.source ?? source.parent ?? null;
            origin = ev.origin && ev.origin !== 'null' ? ev.origin : '*';
            /* With the build that served this page, when it printed one: a host compares it with the server's now. */
            const build = pageBuild();
            send({ type: MESSAGE.READY, id, protocol: message.protocol ?? PROTOCOL, ...(build ? { build } : {}) });
            /* After `ready` and before the page is told, so a handler that announces a NEW offer from
               `onHello` overwrites the replay rather than being overwritten by it. */
            if (offered !== null)
                send({ type: MESSAGE.FILTERS, groups: offered });
            if (clearing !== null)
                send({ type: MESSAGE.CLEARABLE, label: clearing.label });
            if (refreshing !== null)
                send({ type: MESSAGE.REFRESHABLE, ...refreshing });
            if (heading !== null)
                send({ type: MESSAGE.HEADER, items: heading });
            if (footing !== null)
                send({ type: MESSAGE.FOOTER, items: footing });
            answered = message.answers ?? null;
            activityTaken = null;
            byProject = false;
            projectNow = projectOf(message.context);
            projectIdNow = projectIdOf(message.context);
            sendActivity();
            events.onHello?.(message.context, message.state, { answers: message.answers ?? null, header: message.header ?? null, footer: message.footer ?? null, carries: message.carries ?? null });
            return;
        }
        /* Everything after the greeting has to come from the window that gave it.
           The origin cannot do this job and this can (docs/client.md). */
        if (ev.source !== host)
            return;
        if (message.type === MESSAGE.CONTEXT) {
            /* Handed on whole, with only the envelope (`type`, `protocol`) removed, so every field the
               protocol grows arrives without being listed here. */
            const { type: _envelope, protocol: _spoken, ...context } = message;
            const project = projectOf(context);
            const projectId = projectIdOf(context);
            /* Another project open: a host that does not file by project is sent THAT project's things now. */
            if (project !== projectNow || projectId !== projectIdNow) {
                projectNow = project;
                projectIdNow = projectId;
                if (!byProject)
                    sendActivity();
            }
            events.onContext?.(context);
            return;
        }
        if (message.type === MESSAGE.RESPONSE) {
            if (message.ok)
                settle(message.id, { ok: true, data: message.data });
            else {
                /* A method this package knows and the host does not: the host is older than it (2.22.0). */
                const asked = waiting.get(message.id)?.method ?? '';
                const tooOld = tooOldOf(asked, message);
                settle(message.id, {
                    ok: false,
                    refusal: tooOld
                        ? { reason: message.reason, error: message.error, declined: 'host-too-old', since: tooOld.since }
                        : { reason: message.reason, error: message.error },
                });
            }
            return;
        }
        if (message.type === MESSAGE.EVENT) {
            events.onEvent?.(message);
            return;
        }
        if (message.type === MESSAGE.CLEAR) {
            events.onClear?.();
            return;
        }
        if (message.type === MESSAGE.REFRESH) {
            events.onRefresh?.();
            return;
        }
        if (message.type === MESSAGE.OPENED) {
            events.onOpened?.({ item: message.item });
            return;
        }
        if (message.type === MESSAGE.PRESS) {
            /* Answered exactly once, like a `goto`: whatever the listener returns, throws or forgets. */
            let answered = false;
            const answer = (ok, why = '') => {
                if (answered)
                    return;
                answered = true;
                clearTimeout(backstop);
                send({ type: MESSAGE.PRESSED, id: message.id, ok, why: why.slice(0, LIMITS.REASON) });
            };
            const backstop = setTimeout(() => answer(false, 'This app did not say whether it took that press.'), pressBackstop);
            const footer = message.place === 'footer';
            const press = { item: message.item, ...(message.value !== undefined ? { value: message.value } : {}), ...(footer ? { place: 'footer' } : {}), ...(message.carried ? { carried: message.carried } : {}) };
            /* Judged against what is declared NOW: the header (or footer) may have changed since it was drawn. */
            const refused = footer ? footerPressRefusal(footed, press) : pressRefusal(declared, press);
            if (refused !== null)
                answer(false, refused);
            else if (!events.onPress)
                answer(false, 'This app declared that item and does not take presses.');
            else {
                const taken = (said) => answer(said === undefined || said === true, typeof said === 'string' ? said : '');
                const failed = () => answer(false, 'This app failed while doing that.');
                try {
                    const said = events.onPress(press);
                    if (said instanceof Promise)
                        said.then(taken, failed);
                    else
                        taken(said);
                }
                catch {
                    failed();
                }
            }
            return;
        }
        if (message.type === MESSAGE.GOTO) {
            /* Answered exactly once, whatever the listener does — including nothing, including
               throwing, including answering twice. */
            let answered = false;
            const answer = (found, why = '') => {
                if (answered)
                    return;
                answered = true;
                clearTimeout(backstop);
                send({ type: MESSAGE.WENT, id: message.id, found, why: why.slice(0, LIMITS.REASON) });
            };
            const backstop = setTimeout(() => answer(false, 'This app did not manage to say where that reference is.'), gotoBackstop);
            try {
                if (events.onGoto)
                    events.onGoto(message, answer);
                else
                    answer(false, 'This app is not showing anything that can be walked to.');
            }
            catch {
                answer(false, 'This app failed while looking for that reference.');
            }
            return;
        }
    };
    /* Sent when there is a host, a list, and a host that answers it; not again while the host has taken this very list. */
    function sendActivity() {
        if (activityNow === null || host === null)
            return;
        if (answered !== null && !answered.includes('activity.set'))
            return;
        const items = byProject ? activityNow : forOpenProject(activityNow, projectNow, projectIdNow);
        const key = JSON.stringify(items);
        if (key === activityTaken)
            return;
        activityTaken = key;
        const spans = activityNow.some((item) => item.project !== undefined);
        connection
            .request('activity.set', { items })
            .then((answer) => {
            const said = answer;
            if (said?.outcome === 'declined' && activityTaken === key)
                activityTaken = null;
            /* The host files by project: what it was sent was the open project's share, and the whole list goes now. */
            if (said?.outcome === 'taken' && said.projects === true && !byProject) {
                byProject = true;
                if (spans) {
                    activityTaken = null;
                    sendActivity();
                }
            }
        })
            .catch(() => {
            /* Not taken: try again with the next list, even an identical one. */
            if (activityTaken === key)
                activityTaken = null;
        });
    }
    /**
     * The items of the project open now, without `project` or `projectId`, for a host that does not file
     * by it. The id decides where the item and the host both name one (a renamed folder is still the
     * project); otherwise the path does.
     */
    function forOpenProject(items, open, openId) {
        return items
            .filter((item) => {
            if (item.project === undefined)
                return true;
            if (item.projectId !== undefined && openId !== null)
                return item.projectId === openId;
            return item.project === open;
        })
            .map(({ project: _project, projectId: _projectId, ...item }) => item);
    }
    const connection = {
        listen() {
            if (listening || !live)
                return this;
            listening = true;
            source.addEventListener('message', onMessage);
            return this;
        },
        request(method, params = {}, options) {
            if (!host) {
                return Promise.reject(new HostRefused({ reason: 'silent', error: NOBODY_TO_ASK }));
            }
            const correlation = nextId();
            /* This caller's `within`, or the connection's. Guarded: `within: 0` and `within: NaN` would
               both mean "time out before the message is posted". */
            const deadline = typeof options?.within === 'number' && Number.isFinite(options.within) && options.within > 0
                ? options.within
                : answerWithin;
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    settle(correlation, {
                        ok: false,
                        refusal: {
                            reason: 'silent',
                            error: `The host was asked ${method} and had not answered ${Math.round(deadline / 1000)} seconds later.`,
                        },
                    });
                }, deadline);
                waiting.set(correlation, { method, resolve, reject, timer });
                send({ type: MESSAGE.REQUEST, id: correlation, method, params });
            });
        },
        resize(height) {
            /* Clamped on our own side with the host's own arithmetic. The host runs its own copy
               regardless — this is prediction, not enforcement. */
            send({ type: MESSAGE.RESIZE, height: clampHeight(height) });
        },
        filters(groups) {
            /* Kept before it is sent, so an offer made before the greeting goes out with the replay:
               `send` is a no-op without a host. */
            offered = groups;
            send({ type: MESSAGE.FILTERS, groups });
        },
        clearable(label) {
            /* Kept before it is sent, for the same reason as the filter offer. */
            clearing = { label };
            send({ type: MESSAGE.CLEARABLE, label });
        },
        refreshable(state) {
            /* Merged onto what was last said; the whole state still goes on the wire. `busy` alone does
               NOT carry forward — it defaults to false, so a forgotten `busy: false` leaves no spinner. */
            refreshing = {
                can: state.can ?? refreshing?.can ?? true,
                at: state.at !== undefined ? state.at : (refreshing?.at ?? null),
                busy: state.busy ?? false,
            };
            send({ type: MESSAGE.REFRESHABLE, ...refreshing });
        },
        header(items) {
            /* Kept before it is sent, like the filter offer. A list that does not parse is still sent —
               the host is the one that reports it — and no press is taken against it. */
            heading = items;
            const parsed = headerItemsSchema.safeParse(items);
            declared = parsed.success ? parsed.data : [];
            send({ type: MESSAGE.HEADER, items });
        },
        footer(items) {
            /* As `header`: kept before it is sent, and a list that does not parse is still sent for the host to report. */
            footing = items;
            const parsed = footerItemsSchema.safeParse(items);
            footed = parsed.success ? parsed.data : [];
            send({ type: MESSAGE.FOOTER, items });
        },
        activity(items) {
            const parsed = activityItemsSchema.safeParse(items);
            if (!parsed.success)
                return;
            activityNow = parsed.data;
            sendActivity();
        },
        greeted: () => host !== null,
        stop() {
            live = false;
            if (listening) {
                listening = false;
                source.removeEventListener('message', onMessage);
            }
            for (const correlation of [...waiting.keys()]) {
                settle(correlation, { ok: false, refusal: { reason: 'silent', error: 'This page stopped listening.' } });
            }
        },
    };
    return connection;
}
