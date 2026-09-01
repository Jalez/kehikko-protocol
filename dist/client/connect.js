import { LIMITS, MESSAGE, PROTOCOL, clampHeight, } from '../constants.js';
import { hostMessageSchema, looksLikeWireMessage, } from '../wire.js';
import { mailbox } from './mailbox.js';
/**
 * A refusal, as a thrown thing.
 *
 * A class rather than a rejected string, so that `catch` can tell a refusal from
 * a `TypeError` in the caller's own handler without reading English. Every
 * rejection from `request` is one of these, always — a caller that writes
 * `catch (e) { e.refusal.reason }` is not making an assumption.
 */
export class HostRefused extends Error {
    refusal;
    constructor(refusal) {
        super(refusal.error);
        this.refusal = refusal;
        this.name = 'HostRefused';
    }
}
/**
 * How long to wait for one answer.
 *
 * A number rather than forever, because forever is a page that shows "asking…"
 * until somebody reloads it, which is the exact shape of dishonesty a spinner
 * has — it is a claim that an answer is coming. Twelve seconds is long enough
 * for a roadmap reading a file off a cold disk and short enough that nobody sits
 * through it twice.
 */
export const ANSWER_WITHIN_MS = 12_000;
/**
 * How long a `goto` listener has before the backstop answers for it.
 *
 * A timer rather than a line after the call, and the difference matters: a
 * listener may quite reasonably want to answer after a scroll settles, so
 * answering `false` the moment it returns would pre-empt the honest answer. Half
 * a second is longer than any of that and far shorter than the host's own
 * timeout, which means the reader gets the fallback link instead of a wait.
 */
export const GOTO_BACKSTOP_MS = 500;
/**
 * What a question asked before any greeting is refused with.
 *
 * One sentence in one place, because the React hook can be asked the same thing
 * between mounts and a caller should not have to tell two spellings of "nobody
 * is there" apart.
 */
export const NOBODY_TO_ASK = 'Nothing has greeted this page, so there is nobody to ask.';
/**
 * Build one conversation. Nothing is sent, and nothing is heard, until `listen`.
 *
 * Nothing is sent from here until a greeting arrives either, and nothing needs
 * to be: the host greets on every frame load, and a module that announced itself
 * first would be shouting at a window that may not be a host at all.
 */
export function connect(id, events = {}, options = {}) {
    const source = options.source ?? mailbox;
    const answerWithin = options.answerWithin ?? ANSWER_WITHIN_MS;
    const gotoBackstop = options.gotoBackstop ?? GOTO_BACKSTOP_MS;
    let host = null;
    let origin = '*';
    let live = true;
    let listening = false;
    /* The last offer, replayed on every greeting. See `filters` above for the
       reload this exists to survive. `null` means nothing has been offered, which
       is not the same as an empty offer: an empty one is a module saying it has
       nothing to be narrowed by now, and has to be sent. */
    let offered = null;
    /* And the last clear offer, replayed for the same reason.
  
       Wrapped in an object rather than held as a bare `string | null`, because
       for this offer `null` is a REAL value — it is how a module says there is
       nothing to clear — so it cannot also be the sentinel for "never said
       anything". A bare null would make a module that withdrew its offer before
       the greeting indistinguishable from one that never had a clear control, and
       the two produce the same drawing today but would diverge the moment the
       replay meant anything more than "post this again". */
    let clearing = null;
    /* And the last refresh state, replayed for the same reason and with one of
       its own: what is replayed carries `at`, so a frame that reloads without
       this would leave the host drawing a "last read" time from a conversation
       that no longer exists. A missing control is a thing somebody notices; a
       stale timestamp is a thing they believe. */
    let refreshing = null;
    /** Correlation id -> the promise waiting on it. A `Map`, per the protocol's note on lookups. */
    const waiting = new Map();
    let counter = 0;
    const nextId = () => `${Date.now().toString(36)}-${(counter += 1).toString(36)}`;
    const send = (message) => {
        if (!host)
            return;
        host.postMessage(message, origin);
    };
    const settle = (correlation, outcome) => {
        /*
         * A late answer to a question nobody is waiting for is dropped, quietly.
         *
         * It is the ordinary case rather than an anomaly: a question that timed out
         * and was answered a second later, a question the caller abandoned, a
         * duplicate. There is nothing to report and nobody to report it to, and a
         * module that threw here would be a module a slow host can crash.
         */
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
            /*
             * Answered on EVERY greeting, not only the first.
             *
             * Re-greeting is normal rather than an error: the host greets on every
             * frame load, and a frame that reloaded itself has forgotten the whole
             * conversation — it cannot tell a reload from a host that greeted twice,
             * and it must not have to. So the newest greeting wins, the window it came
             * from becomes the one we answer, and `ready` goes back every time. A
             * module that replied only once is a module that goes silent after any
             * reload of its own frame, which the host reports as a module that did not
             * answer its greeting.
             */
            host = ev.source ?? source.parent ?? null;
            origin = ev.origin && ev.origin !== 'null' ? ev.origin : '*';
            send({ type: MESSAGE.READY, id, protocol: message.protocol ?? PROTOCOL });
            /* After `ready` and before the page is told, so that a host which reads
               the offer while composing what to draw has it, and so that a handler
               which announces a NEW offer from `onHello` overwrites the replay rather
               than being overwritten by it. */
            if (offered !== null)
                send({ type: MESSAGE.FILTERS, groups: offered });
            if (clearing !== null)
                send({ type: MESSAGE.CLEARABLE, label: clearing.label });
            if (refreshing !== null)
                send({ type: MESSAGE.REFRESHABLE, ...refreshing });
            events.onHello?.(message.context, message.state);
            return;
        }
        /* Everything after the greeting has to come from the window that gave it.
           See the essay at the top: the origin cannot do this job and this can. */
        if (ev.source !== host)
            return;
        if (message.type === MESSAGE.CONTEXT) {
            /*
             * Handed on whole, with only the envelope removed.
             *
             * The version of this comment that stood in the modules argued carefully
             * for the wrong thing. It said the context was "rebuilt field by field"
             * because a context message carries a `type` a `ModuleContext` does not,
             * and then listed the fields — with a paragraph on `selection` explaining
             * that dropping it is the difference between a page that shows what
             * somebody picked and one that ignores every click on the canvas. That
             * diagnosis was right and the remedy was not.
             *
             * A list that has to be kept complete is a list that will be incomplete
             * again at the next protocol release, and it was, in FIVE modules: `prompt`
             * and `pinned` were both missing within a day of being added, and `kehikko`
             * — which says which canvas a pane is standing on — was missing the moment
             * the protocol grew it. The failure has no symptom. A field left out does
             * not error; it quietly becomes that page's belief that the host said
             * nothing about it.
             *
             * So the listing is gone, and it is gone from ONE place now rather than
             * from twelve. `type` and `protocol` are the only two things a
             * `ModuleContext` does not have, and removing exactly those means every
             * field the protocol grows arrives at every module whether or not anybody
             * has heard of it. What a module then chooses to READ is its own business;
             * the difference is that the rest now arrives rather than being discarded
             * on the way in.
             */
            const { type: _envelope, protocol: _spoken, ...context } = message;
            events.onContext?.(context);
            return;
        }
        if (message.type === MESSAGE.RESPONSE) {
            if (message.ok)
                settle(message.id, { ok: true, data: message.data });
            else
                settle(message.id, { ok: false, refusal: { reason: message.reason, error: message.error } });
            return;
        }
        if (message.type === MESSAGE.EVENT) {
            events.onEvent?.(message);
            return;
        }
        if (message.type === MESSAGE.CLEAR) {
            /* Nothing is unwrapped and nothing is passed on, because there is nothing
               in it — see `clearSchema`. A page that never registered `onClear` does
               nothing, which is correct rather than a dropped message: the host only
               draws the control for a page that announced `clearable`, so a module
               with a handler and no offer and one with an offer and no handler are
               both modules that asked for this to do nothing. */
            events.onClear?.();
            return;
        }
        if (message.type === MESSAGE.REFRESH) {
            /* Nothing to unwrap, for the same reason and with the same consequence
               as `MESSAGE.CLEAR` above: a page with no handler does nothing, which is
               what a page that never announced `refreshable` asked for. */
            events.onRefresh?.();
            return;
        }
        if (message.type === MESSAGE.GOTO) {
            /* Answered exactly once, whatever the listener does — including nothing,
               including throwing, including answering twice. The host is waiting on
               this and will time out into "not found"; a module that leaves it to the
               timeout has turned a hundred milliseconds into twelve seconds of a
               reader waiting, for every reference that points at it. */
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
    return {
        listen() {
            if (listening || !live)
                return this;
            listening = true;
            source.addEventListener('message', onMessage);
            return this;
        },
        request(method, params = {}) {
            if (!host) {
                return Promise.reject(new HostRefused({ reason: 'silent', error: NOBODY_TO_ASK }));
            }
            const correlation = nextId();
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    settle(correlation, {
                        ok: false,
                        refusal: {
                            reason: 'silent',
                            error: `The roadmap was asked ${method} and had not answered ${Math.round(answerWithin / 1000)} seconds later.`,
                        },
                    });
                }, answerWithin);
                waiting.set(correlation, { resolve, reject, timer });
                send({ type: MESSAGE.REQUEST, id: correlation, method, params });
            });
        },
        resize(height) {
            /* Clamped on our own side with the host's own arithmetic, so that what we
               ask for is what we will get. The host runs its own copy over the raw
               number regardless — this is prediction, not enforcement. */
            send({ type: MESSAGE.RESIZE, height: clampHeight(height) });
        },
        filters(groups) {
            /* Kept before it is sent, so that an offer made before the greeting is
               not lost — it goes out with the replay instead. `send` is a no-op
               without a host, and a page that announced early and never again would
               otherwise have a control that never appears. */
            offered = groups;
            send({ type: MESSAGE.FILTERS, groups });
        },
        clearable(label) {
            /* Kept before it is sent, for the same reason as the filter offer: an
               offer made before the greeting goes out with the replay rather than
               being lost. */
            clearing = { label };
            send({ type: MESSAGE.CLEARABLE, label });
        },
        refreshable(state) {
            /* Merged onto what was last said rather than replacing it, so a page can
               call `refreshable({ busy: true })` on the way into a read without
               restating a timestamp it has not changed. The whole state still goes on
               the wire — the message is an offer, whole, every time — and this is
               only about what a caller has to type.
      
               `busy` is the one field that does NOT carry forward, and the asymmetry
               is the point: `can` and `at` are facts that stay true until something
               changes them, and busy is true for the length of one read. Carried
               forward, a page that forgot to say `busy: false` on the way out would
               leave a spinner turning forever; defaulted off, a page that forgets is
               a page that merely did not show one. */
            refreshing = {
                can: state.can ?? refreshing?.can ?? true,
                at: state.at !== undefined ? state.at : (refreshing?.at ?? null),
                busy: state.busy ?? false,
            };
            send({ type: MESSAGE.REFRESHABLE, ...refreshing });
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
}
//# sourceMappingURL=connect.js.map