import { pageBuild } from './build.js';
import { HOLD_COVER_MS, MESSAGE, PROTOCOL, clampHeight, } from '../constants.js';
import { LIMITS } from '../limits.js';
import { activityItemsSchema } from '../activity.js';
import { footerItemsSchema, footerPressRefusal, headerItemsSchema, hostMessageSchema, looksLikeWireMessage, pressRefusal, } from '../wire.js';
import { FILE_DRAG_TYPE, fileDragSchema } from '../file-drag.js';
import { tooOldOf } from '../fit.js';
import { rowsAdvice } from '../rows.js';
import { mailbox } from './mailbox.js';
import { mayGreet, pageOrigins } from './greet.js';
import { reportPageError } from './errors.js';
import { applyBackground } from './theme.js';
import { backgroundOf } from '../page.js';
import { pageFind } from './find.js';
export { mayGreet, pageOrigins } from './greet.js';
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
/** 2.70.0. How long after the last header or footer declaration the client says a missing footer, in ms. */
export const ROWS_ADVICE_AFTER_MS = 1500;
/**
 * 2.50.1. How far, in CSS pixels, a press may wander and still be a press held in place. Past it the
 * press is a drag — a selection, a scroll, a move — and is told as `cancel`: a drag is not a long
 * press. Under it a hand's tremor on a trackpad is still holding still.
 */
export const POINTER_SLOP_PX = 8;
/** The page's clock for `kehikot.pointer`'s `at`: `performance.now()` where there is one. */
const pointerClock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
/**
 * Build one conversation. Nothing is sent, and nothing is heard, until `listen`; nothing is sent
 * before a greeting arrives either.
 */
export function connect(id, events = {}, options = {}) {
    const source = options.source ?? mailbox;
    const answerWithin = options.answerWithin ?? ANSWER_WITHIN_MS;
    const gotoBackstop = options.gotoBackstop ?? GOTO_BACKSTOP_MS;
    const pressBackstop = options.pressBackstop ?? PRESS_BACKSTOP_MS;
    const appearing = options.appearance !== false;
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
    /* 2.47.0. What `rowsAdvice` has already said on the console about the header and footer, so each
       sentence is said once per page and never again for a re-declaration. Advice only: nothing is held back. */
    const advised = new Set();
    const advising = options.rowsAdvice !== false;
    /* 2.70.0. "No footer" waits for the declarations to settle, and only for a host that draws one. */
    let footerDrawn = false;
    let adviseLater = null;
    const say = (lines) => {
        for (const line of lines) {
            if (advised.has(line))
                continue;
            advised.add(line);
            console.warn(`[kehikot] ${line}`);
        }
    };
    const advise = () => {
        if (!advising)
            return;
        say(rowsAdvice(heading, footing, { footer: false }));
        if (adviseLater !== null)
            clearTimeout(adviseLater);
        adviseLater = setTimeout(() => {
            adviseLater = null;
            if (live && footerDrawn)
                say(rowsAdvice(heading, footing));
        }, ROWS_ADVICE_AFTER_MS);
    };
    /* 2.70.0. The cover: held from each greeting until the page says it is drawn, or the wait passes. */
    const holdFor = options.holdCover === false ? 0 : typeof options.holdCover === 'number' ? Math.max(0, options.holdCover) : HOLD_COVER_MS;
    let drawn = holdFor === 0;
    let holding = false;
    let holdTimer = null;
    /* 2.84.0. What the cover says, as the page last gave it (`loading`), and when the last context came
       that the page has not said `ready()` for: a `loading()` is taken only within `holdFor` of it. */
    let coverLabel = null;
    let contextAt = null;
    const release = () => {
        if (holdTimer !== null)
            clearTimeout(holdTimer);
        holdTimer = null;
        if (!holding)
            return;
        holding = false;
        send({ type: MESSAGE.DRAWN });
    };
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
    /* 2.49.0. Presses, told to a host whose greeting asked; `null` while nothing is listened to. */
    const pointerTarget = options.pointerTarget === false ? null : (options.pointerTarget ?? (typeof window === 'undefined' ? null : window));
    let pointing = null;
    /* 2.70.0. Other windows heard as well (`pointerFrom`), each with the function that stops hearing it while listened to. */
    const nested = new Map();
    let hearOn = null;
    const pointer = (want) => {
        if (!want) {
            pointing?.();
            pointing = null;
            return;
        }
        if (pointing)
            return;
        const targets = [...(pointerTarget ? [pointerTarget] : [])];
        /*
         * One press at a time: where it went down, whether the page's own browser took it away
         * (`pointercancel`) while it was held still, and whether it has been told as over.
         *
         * 2.50.1. A browser cancels a press for reasons of its own that are not the person letting go:
         * WebKit hands a press held on text, or on a selection, to its own drag or look-up machinery and
         * fires `pointercancel` while the button is still down. Told as `cancel`, that ended a long press
         * a person was still holding — in exactly the pages that are mostly text. So a cancel of a mouse
         * press that has not moved is not told; the press ends when the button comes up, which is then heard
         * as whichever of `pointerup`, `mouseup` or `dragend` the browser still sends. A press that moved
         * past `POINTER_SLOP_PX` is a drag, and is told as `cancel` the moment it does.
         */
        let pressed = null;
        const end = (phase) => {
            if (!pressed)
                return;
            pressed = null;
            send({ type: MESSAGE.POINTER, phase, at: pointerClock() });
        };
        /* The primary button, a touch or a pen: a right click is a menu, not a press. */
        const down = (event) => {
            if ((event.button ?? 0) !== 0 || event.isPrimary === false)
                return;
            pressed = { x: event.clientX ?? 0, y: event.clientY ?? 0, mouse: (event.pointerType ?? 'mouse') === 'mouse' };
            send({ type: MESSAGE.POINTER, phase: 'down', at: pointerClock() });
        };
        const up = (event) => {
            if (event.isPrimary === false)
                return;
            /* An up with no press this page saw (one that began outside it) is still said, as before. */
            if (!pressed) {
                send({ type: MESSAGE.POINTER, phase: 'up', at: pointerClock() });
                return;
            }
            end('up');
        };
        const moved = (event) => {
            if (!pressed || event.isPrimary === false)
                return;
            if (event.clientX === undefined || event.clientY === undefined)
                return;
            if (Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > POINTER_SLOP_PX)
                end('cancel');
        };
        /* A mouse held still: the browser took the press, not the person, and it ends when the button
           comes up. A touch or a pen cancelled is the browser's scroll or zoom starting, which no button
           coming up will follow: that is a cancel, as before. */
        const cancel = () => {
            if (pressed?.mouse)
                return;
            pressed = null;
            send({ type: MESSAGE.POINTER, phase: 'cancel', at: pointerClock() });
        };
        /* After a cancel, the button coming up is a mouse event or the end of the browser's drag. */
        const released = () => end('up');
        const listening = [
            ['pointerdown', down],
            ['pointerup', up],
            ['pointercancel', cancel],
            ['pointermove', moved],
            ['mousemove', moved],
            ['mouseup', released],
            ['dragend', released],
        ];
        /* On the window, in the capture phase: before any element of the page can stop it, and still
           heard while an element holds the pointer captured. */
        const hear = (target) => {
            for (const [type, listener] of listening)
                target.addEventListener(type, listener, { capture: true, passive: true });
            return () => {
                for (const [type, listener] of listening)
                    target.removeEventListener(type, listener, { capture: true });
            };
        };
        const stops = targets.map(hear);
        for (const target of nested.keys())
            nested.set(target, hear(target));
        hearOn = hear;
        pointing = () => {
            for (const stop of stops)
                stop();
            for (const [target, stop] of nested) {
                stop?.();
                nested.set(target, null);
            }
            hearOn = null;
            pressed = null;
        };
    };
    /* 2.69.0. Find: the id of the search open now (`null`: the bar is closed), the client's own search
       once one was needed, and the keys, heard while a host that draws the bar greeted us. */
    let finding = null;
    let finder = null;
    const finderOf = () => {
        if (options.findIn === false)
            return null;
        finder ??= pageFind((count) => sayFound(count), options.findIn ?? {});
        return finder;
    };
    const sayFound = (count) => {
        if (finding === null)
            return;
        if (count === 'unsupported') {
            send({ type: MESSAGE.FIND_RESULT, id: finding, total: 0, current: 0, unsupported: true });
            return;
        }
        const total = Math.max(0, Math.floor(count.total || 0));
        const current = Math.min(Math.max(0, Math.floor(count.current || 0)), total);
        send({ type: MESSAGE.FIND_RESULT, id: finding, total, current });
    };
    const keyTarget = options.findKeys === false ? null : (options.findKeys ?? (typeof window === 'undefined' ? null : window));
    const mac = options.mac ?? (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(`${navigator.platform ?? ''} ${navigator.userAgent ?? ''}`));
    let keying = null;
    const findKeys = (want) => {
        if (!want || !keyTarget) {
            keying?.();
            keying = null;
            return;
        }
        if (keying)
            return;
        const target = keyTarget;
        /* In the bubble phase, so an editor with its own find has taken ⌘F (and said so) before this hears it. */
        const heard = (event) => {
            if (event.defaultPrevented || event.altKey)
                return;
            if (mac ? !event.metaKey || event.ctrlKey : !event.ctrlKey || event.metaKey)
                return;
            const key = (event.key ?? '').toLowerCase();
            if (key !== 'f' && key !== 'g')
                return;
            if (key === 'f' && event.shiftKey)
                return;
            event.preventDefault();
            const step = key === 'g' ? (event.shiftKey ? 'prev' : 'next') : undefined;
            const query = key === 'f' ? selected() : undefined;
            send({ type: MESSAGE.FIND_OPEN, ...(query ? { query } : {}), ...(step ? { step } : {}) });
        };
        target.addEventListener('keydown', heard);
        keying = () => target.removeEventListener('keydown', heard);
    };
    /* The page's selection, when it is a short one on one line: what ⌘F starts searching for. */
    const selected = () => {
        const text = typeof getSelection === 'function' ? (getSelection()?.toString() ?? '') : '';
        const trimmed = text.trim();
        if (!trimmed || trimmed.length > LIMITS.FIND_QUERY || /[\r\n]/.test(trimmed))
            return undefined;
        return trimmed;
    };
    const closeFind = () => {
        finding = null;
        finder?.close();
    };
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
    /*
     * 2.94.0. A file dragged out of this page (`fileDrag.set`), told to the host as it starts and as it
     * ends, so a drop on another module's frame — which WebKit never tells that frame — can be handed on.
     * Heard on the window in the bubble phase, after the page's own `dragstart` put the file on the drag.
     */
    const dragWindow = options.dragTarget === false ? null : (options.dragTarget ?? (typeof window === 'undefined' ? null : window));
    let dragging = null;
    const dragStarted = (event) => {
        dragging = null;
        const data = event.dataTransfer;
        let said = '';
        try {
            said = data?.getData(FILE_DRAG_TYPE) ?? '';
        }
        catch {
            said = '';
        }
        if (!said || said.length > LIMITS.PATH * 3)
            return;
        let file = null;
        try {
            const read = fileDragSchema.safeParse(JSON.parse(said));
            file = read.success ? read.data : null;
        }
        catch {
            file = null;
        }
        if (!file)
            return;
        dragging = file;
        send({ type: MESSAGE.DRAG, phase: 'start', file });
    };
    const dragEnded = (event) => {
        const file = dragging;
        dragging = null;
        if (!file)
            return;
        const effect = event.dataTransfer?.dropEffect ?? 'none';
        const x = Number(event.clientX);
        const y = Number(event.clientY);
        const inBounds = (n) => Number.isFinite(n) && Math.abs(n) <= LIMITS.DRAG_POINT;
        send({
            type: MESSAGE.DRAG,
            phase: 'end',
            file,
            ...(inBounds(x) && inBounds(y) ? { at: { x, y } } : {}),
            dropped: effect !== 'none',
        });
    };
    const drags = (want) => {
        if (!dragWindow)
            return;
        if (want) {
            dragWindow.addEventListener('dragstart', dragStarted, { passive: true });
            dragWindow.addEventListener('dragend', dragEnded, { passive: true });
        }
        else {
            dragWindow.removeEventListener('dragstart', dragStarted);
            dragWindow.removeEventListener('dragend', dragEnded);
            dragging = null;
        }
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
    /**
     * 2.93.0. Tell a window whose greeting this page will not answer why: its origin, and the origins
     * the page was told it may be framed by. To that window only, and nothing else is ever sent it.
     */
    const refuse = (ev) => {
        const to = ev.source;
        if (!to || typeof to.postMessage !== 'function')
            return;
        const allowed = (options.origins ?? pageOrigins() ?? []).slice(0, LIMITS.REFUSED_ALLOWED);
        try {
            to.postMessage({ type: MESSAGE.REFUSED, origin: ev.origin || 'null', allowed: [...allowed] }, ev.origin && ev.origin !== 'null' ? ev.origin : '*');
        }
        catch {
            /* A window that went away: there is nobody to tell. */
        }
    };
    const onMessage = (ev) => {
        if (!live)
            return;
        if (!looksLikeWireMessage(ev.data))
            return;
        const parsed = hostMessageSchema.safeParse(ev.data);
        if (!parsed.success) {
            /* 2.93.0. A greeting this page cannot read is said, not dropped: the host would otherwise see
               a page that loaded and never answered. Said as a failure to whoever greeted (`errors.ts`). */
            if (ev.data.type === MESSAGE.HELLO) {
                const issue = parsed.error.issues[0];
                reportPageError(new Error(`This page could not read the host's greeting${issue ? ` (${issue.path.join('.') || 'the message'}: ${issue.message})` : ''}. The module and this Kehikot do not agree on the protocol.`), 'greeting');
            }
            return;
        }
        const message = parsed.data;
        if (message.type === MESSAGE.HELLO) {
            /* Before anything is answered: a window this page may not be framed by is not its host.
               2.93.0: it is told so, once, instead of being met with silence (`refused`). */
            if (!mayGreet(ev, options.origins ?? pageOrigins(), here())) {
                refuse(ev);
                return;
            }
            /* Answered on EVERY greeting, not only the first: the newest greeting wins, its window
               becomes the one we answer, and `ready` goes back every time. */
            host = ev.source ?? source.parent ?? null;
            origin = ev.origin && ev.origin !== 'null' ? ev.origin : '*';
            /* With the build that served this page, when it printed one: a host compares it with the server's now. */
            const build = pageBuild();
            /* 2.70.0. A page not drawn yet asks for the cover to stay, and the wait starts again with every greeting. */
            if (holdTimer !== null)
                clearTimeout(holdTimer);
            holdTimer = null;
            holding = !drawn;
            send({
                type: MESSAGE.READY,
                id,
                protocol: message.protocol ?? PROTOCOL,
                ...(build ? { build } : {}),
                ...(holding ? { hold: true, ...(coverLabel ? { label: coverLabel } : {}) } : {}),
            });
            if (holding)
                holdTimer = setTimeout(release, holdFor);
            footerDrawn = message.footer === true;
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
            pointer(message.pointer === true);
            if (appearing)
                applyBackground(backgroundOf(message.context), { theme: message.context.theme === 'dark' ? 'dark' : 'light', remember: true });
            closeFind();
            findKeys(message.find === true);
            /* 2.59.0. A greeting handler that throws is said to the host (`kehikot.page.error`, `greeting`),
               not left to break the mailbox's other listeners: `ready` has gone, and the page may be blank. */
            try {
                events.onHello?.(message.context, message.state, { answers: message.answers ?? null, header: message.header ?? null, footer: message.footer ?? null, carries: message.carries ?? null, footerKinds: message.footerKinds ?? null, find: message.find ?? null });
            }
            catch (error) {
                console.error(error);
                reportPageError(error, 'greeting');
            }
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
            /* 2.84.0. From now until `ready()`, a `loading()` says the page is drawing THIS. */
            contextAt = Date.now();
            const project = projectOf(context);
            const projectId = projectIdOf(context);
            /* Another project open: a host that does not file by project is sent THAT project's things now. */
            if (project !== projectNow || projectId !== projectIdNow) {
                projectNow = project;
                projectIdNow = projectId;
                if (!byProject)
                    sendActivity();
            }
            if (appearing)
                applyBackground(backgroundOf(context), { theme: context.theme === 'dark' ? 'dark' : 'light', remember: true });
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
        if (message.type === MESSAGE.DROP) {
            events.onDrop?.({ file: message.file, at: message.at });
            return;
        }
        if (message.type === MESSAGE.COVERED) {
            events.onCovered?.({ top: message.top, bottom: message.bottom });
            return;
        }
        if (message.type === MESSAGE.VISIBLE) {
            events.onVisible?.(message.visible);
            return;
        }
        if (message.type === MESSAGE.INBOX) {
            events.onInbox?.({ kind: message.kind, rev: message.rev, next: message.next ?? null });
            return;
        }
        if (message.type === MESSAGE.FIND) {
            const ask = { caseSensitive: message.caseSensitive, wholeWord: message.wholeWord, direction: message.direction };
            if (message.direction === 'close') {
                closeFind();
                try {
                    void events.onFind?.(message.query, ask);
                }
                catch {
                    /* A listener that throws on close has nothing to say. */
                }
                return;
            }
            finding = message.id;
            const id = message.id;
            const own = (direction) => {
                const search = finderOf();
                return search ? search.run(message.query, ask, direction) : 'unsupported';
            };
            const said = (answer) => {
                if (finding !== id)
                    return;
                if (answer === 'default')
                    sayFound(own(message.direction));
                else if (answer !== undefined)
                    sayFound(answer);
            };
            if (!events.onFind) {
                said('default');
                return;
            }
            try {
                const answer = events.onFind(message.query, ask);
                if (answer instanceof Promise)
                    answer.then(said, () => said('unsupported'));
                else
                    said(answer);
            }
            catch {
                said('unsupported');
            }
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
            const press = { item: message.item, ...(message.value !== undefined ? { value: message.value } : {}), ...(footer ? { place: 'footer' } : {}), ...(message.carried ? { carried: message.carried } : {}), ...(footer && message.text !== undefined ? { text: message.text } : {}) };
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
        findResult(count) {
            sayFound(count);
        },
        ready() {
            contextAt = null;
            if (drawn)
                return;
            drawn = true;
            release();
        },
        loading(label) {
            if (holdFor === 0)
                return;
            const said = typeof label === 'string' ? label.trim().slice(0, LIMITS.LOADING_LABEL) : '';
            coverLabel = said || null;
            /* Not greeted yet: the greeting's hold carries it. Held now: the cover is up, and only its words change. */
            if (!host)
                return;
            if (holding) {
                send({ type: MESSAGE.LOADING, ...(coverLabel ? { label: coverLabel } : {}) });
                return;
            }
            /* Only for a context the page has not said it drew: anything else is the page's own to show. */
            if (contextAt === null || Date.now() - contextAt > holdFor)
                return;
            contextAt = null;
            drawn = false;
            holding = true;
            send({ type: MESSAGE.LOADING, ...(coverLabel ? { label: coverLabel } : {}) });
            holdTimer = setTimeout(release, holdFor);
        },
        pointerFrom(target) {
            if (!nested.has(target))
                nested.set(target, hearOn ? hearOn(target) : null);
            return () => {
                nested.get(target)?.();
                nested.delete(target);
            };
        },
        listen() {
            if (listening || !live)
                return this;
            listening = true;
            source.addEventListener('message', onMessage);
            drags(true);
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
            advise();
        },
        footer(items) {
            /* As `header`: kept before it is sent, and a list that does not parse is still sent for the host to report. */
            footing = items;
            const parsed = footerItemsSchema.safeParse(items);
            footed = parsed.success ? parsed.data : [];
            send({ type: MESSAGE.FOOTER, items });
            advise();
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
            if (holdTimer !== null)
                clearTimeout(holdTimer);
            holdTimer = null;
            if (adviseLater !== null)
                clearTimeout(adviseLater);
            adviseLater = null;
            pointer(false);
            findKeys(false);
            closeFind();
            if (listening) {
                listening = false;
                source.removeEventListener('message', onMessage);
                drags(false);
            }
            for (const correlation of [...waiting.keys()]) {
                settle(correlation, { ok: false, refusal: { reason: 'silent', error: 'This page stopped listening.' } });
            }
        },
    };
    return connection;
}
