import { DELIVER_MOST, RESUME_EVERY_MS, deliveryFor, isMessageTool, typedMessages, messageTools, readMessagesText, sentText, wakeLine, wakeMessages, } from '../agent-messages.js';
import { LIMITS } from '../limits.js';
import { askHost } from './ask.js';
/** How long a host's answer about whether it keeps messages is reused, per token, in ms. */
const KNOWN_FOR_MS = { yes: 5 * 60_000, no: 15_000 };
const known = new Map();
/** Forget what was learned about hosts keeping messages (tests). */
export function forgetMessageHosts() {
    known.clear();
}
/**
 * Whether the host keeps messages for this session: a session with a token, on a host that answers
 * `messages.read` for this module (one that knows the method, holds the token, and grants the module
 * `agents:message`). Asked once and reused for a while. Never throws.
 */
export async function hostKeepsMessages(options, now = Date.now()) {
    const { token, act: _act, ...rest } = options;
    if (!token)
        return false;
    const key = `${options.module}\u0000${token}`;
    const had = known.get(key);
    if (had && now - had.at < (had.yes ? KNOWN_FOR_MS.yes : KNOWN_FOR_MS.no))
        return had.yes;
    const read = await askHost('messages.read', { token, limit: 1 }, rest);
    known.set(key, { at: now, yes: read.ok });
    if (known.size > 500)
        known.delete(known.keys().next().value);
    return read.ok;
}
/**
 * The message tools to list on this door for this session: `messageTools()` when the host keeps
 * messages for it, and none otherwise — no token (a session nothing started from a place), a host
 * before 2.41.0, a module whose manifest does not declare `agents:message`.
 */
export async function messageToolsFor(token, options) {
    return (await hostKeepsMessages({ ...options, token })) ? messageTools(Boolean(options.act)) : [];
}
const NO_TOKEN = 'This conversation was not started from a Kehikot place (its door carries no place token), so it has no address to send from or read for. Nothing was sent or read.';
/**
 * Answer `send_message` or `read_messages`; null for any other tool, so a door asks this first and
 * falls through. Arguments are passed to the host as they came; the host holds them to the method's
 * params and says what it refused. Never throws.
 */
export async function answerMessageTool(name, args, options) {
    if (!isMessageTool(name))
        return null;
    const { token, act, ...rest } = options;
    if (!token)
        return { text: NO_TOKEN, isError: true };
    const given = args && typeof args === 'object' && !Array.isArray(args) ? args : {};
    if (name === 'send_message') {
        const params = { token, body: given.body };
        if (given.to !== undefined)
            params.to = given.to;
        if (given.thread !== undefined)
            params.thread = given.thread;
        /* 2.50.0: what it is, a question's choices, and what it answers. A host before 2.50.0 drops them. */
        for (const key of ['kind', 'choices', 'replyTo'])
            if (given[key] !== undefined)
                params[key] = given[key];
        const sent = await askHost('messages.send', params, rest);
        if (!sent.ok)
            return { text: `Not sent: ${sent.why}`, isError: true };
        return { text: sentText(sent.data), isError: sent.data.outcome !== 'sent' };
    }
    const params = { token };
    for (const key of ['unread', 'since', 'thread', 'limit'])
        if (given[key] !== undefined)
            params[key] = given[key];
    const read = await askHost('messages.read', params, rest);
    if (!read.ok)
        return { text: `Could not read messages: ${read.why}`, isError: true };
    return { text: readMessagesText(read.data, Boolean(act)), isError: false };
}
/** How often the waker looks at idle sessions, in ms. */
export const WAKE_EVERY_MS = 5_000;
/** How long a session must have been idle, and the newest message must have waited, before a wake: a burst is one wake. */
export const WAKE_SETTLE_MS = 2_000;
/**
 * 2.43.0. The one rule every agent module applies to wake an idle session when a message comes for
 * it. Each tick, for each session the module runs in its own terminal, idle at its prompt, with the
 * person's setting on: ask the host `messages.read` WITHOUT `unread` (so nothing is counted
 * delivered), take the unread ones that may wake it (`wakeMessages`: to it, its module or its place,
 * never the whole project, never its own), and type ONE line (`wakeLine`) into its prompt. Once per
 * idle period, however many messages come; not before it has been idle `settleMs`, and not before the
 * newest has waited `settleMs`, so a burst is one wake. Never a session that is working, waits for
 * the person, or runs elsewhere. Never throws.
 *
 * How a module learns a message came is this look: the host offers a module no push for it, and a
 * read of a few rows for each idle session every few seconds is cheap.
 */
export function messageWaker(options) {
    const { sessions, type, everyMs = WAKE_EVERY_MS, settleMs = WAKE_SETTLE_MS, now = Date.now, read: readFor, log = () => { }, ...ask } = options;
    const read = readFor ?? ((token) => askHost('messages.read', { token, limit: LIMITS.MESSAGES_READ }, ask));
    /* Per session: since when it is idle, whether it was woken in this idle period, and the newest message it was woken for. */
    const memory = new Map();
    let busy = false;
    let timer = null;
    async function tick() {
        if (busy)
            return 0;
        busy = true;
        let woken = 0;
        try {
            const listed = await Promise.resolve(sessions()).catch(() => []);
            const keys = new Set(listed.map((one) => one.key));
            for (const key of memory.keys())
                if (!keys.has(key))
                    memory.delete(key);
            for (const one of listed) {
                const at = now();
                let mem = memory.get(one.key);
                if (!mem)
                    memory.set(one.key, (mem = { idleSince: null, woke: false, after: 0 }));
                if (!one.idle) {
                    mem.idleSince = null;
                    mem.woke = false;
                    continue;
                }
                if (mem.idleSince === null)
                    mem.idleSince = at;
                if (!one.own || !one.wake || !one.token || mem.woke || at - mem.idleSince < settleMs)
                    continue;
                let asked;
                try {
                    asked = await read(one.token);
                }
                catch {
                    continue;
                }
                if (!asked.ok)
                    continue;
                const found = wakeMessages(asked.data, mem.after);
                const newest = found.at(-1);
                if (!newest)
                    continue;
                const sent = Date.parse(newest.at);
                if (Number.isFinite(sent) && now() - sent < settleMs)
                    continue;
                let typed = false;
                try {
                    typed = await type(one.key, wakeLine(found, one.act));
                }
                catch {
                    typed = false;
                }
                if (!typed)
                    continue;
                mem.woke = true;
                mem.after = Math.max(mem.after, ...found.map((m) => m.id));
                woken += 1;
                log(`woke ${one.key}: ${found.length} message${found.length === 1 ? '' : 's'} for it (newest #${newest.id})`);
            }
        }
        finally {
            busy = false;
        }
        return woken;
    }
    return {
        tick,
        start() {
            if (timer)
                return;
            timer = setInterval(() => void tick(), everyMs);
            timer.unref?.();
        },
        stop() {
            if (timer)
                clearInterval(timer);
            timer = null;
        },
    };
}
/** 2.48.0. How often an asleep session is asked about, at most, in ms. */
export const ASLEEP_EVERY_MS = 30_000;
/** 2.48.0. Messages read for a session (so counted delivered) and not yet typed are kept this long while it is not listed, in ms. */
export const DELIVERY_KEEP_MS = 10 * 60_000;
/**
 * 2.48.0. Delivery by typing: what every agent module runs in place of `messageWaker`. Each tick, for
 * each session the module lists: ask the host `messages.read` WITHOUT `unread` (nothing counted
 * delivered) for the unread ones that may wake it (`wakeMessages`), and decide (`deliveryFor`). To
 * type or resume: read them WITH `unread` (at most `DELIVER_MOST`; the host moves its cursor, so the
 * notes and `read_messages({ unread: true })` do not say them again), and type `typedMessages` into
 * its prompt — or resume it with that as the first prompt. A broadcast never causes a delivery, but
 * one waiting unread rides along with one, since the host counts it delivered too. Messages read and
 * not typed (the session moved on meanwhile) are kept and typed at the next chance, and never read
 * again. Never into a question for the person or text they have not sent; never a session running
 * elsewhere; never its own message. Never throws.
 */
export function messageDelivery(options) {
    const { sessions, type, resume, queues = false, everyMs = WAKE_EVERY_MS, asleepEveryMs = ASLEEP_EVERY_MS, settleMs = WAKE_SETTLE_MS, now = Date.now, read: readFor, log = () => { }, ...ask } = options;
    const read = readFor ?? ((token, unread) => askHost('messages.read', unread ? { token, unread: true, limit: DELIVER_MOST } : { token, limit: LIMITS.MESSAGES_READ }, ask));
    /* Per session: since when it is idle, what was read for it and not yet typed, when it was last resumed for a message, and when it was last listed. */
    const memory = new Map();
    let resumes = [];
    let busy = false;
    let timer = null;
    async function tick() {
        if (busy)
            return 0;
        busy = true;
        let done = 0;
        try {
            const listed = await Promise.resolve(sessions()).catch(() => []);
            const keys = new Set(listed.map((one) => one.key));
            for (const [key, mem] of memory) {
                if (keys.has(key) || (mem.held.length && now() - mem.seenAt < DELIVERY_KEEP_MS))
                    continue;
                if (mem.held.length)
                    log(`${mem.held.length} message${mem.held.length === 1 ? '' : 's'} read for ${key} could not be typed before it went; read_messages lists them`);
                memory.delete(key);
            }
            resumes = resumes.filter((at) => now() - at < RESUME_EVERY_MS);
            for (const one of listed) {
                const at = now();
                let mem = memory.get(one.key);
                if (!mem)
                    memory.set(one.key, (mem = { idleSince: null, held: [], resumedAt: null, seenAt: at, peekedAt: Number.NEGATIVE_INFINITY }));
                mem.seenAt = at;
                if (one.state === 'idle')
                    mem.idleSince ??= at;
                else
                    mem.idleSince = null;
                if (!one.own || !one.token || !one.wake)
                    continue;
                if (one.state === 'asleep' && !resume)
                    continue;
                /* What waits: what was read for it and not typed, or else the unread that may wake it. */
                let waiting = mem.held.length;
                let newestAt = Number.NEGATIVE_INFINITY;
                if (!waiting) {
                    if (one.state === 'asleep' && at - mem.peekedAt < asleepEveryMs)
                        continue;
                    mem.peekedAt = at;
                    let peeked;
                    try {
                        peeked = await read(one.token, false);
                    }
                    catch {
                        continue;
                    }
                    if (!peeked.ok)
                        continue;
                    const found = wakeMessages(peeked.data);
                    waiting = found.length;
                    const sent = Date.parse(found.at(-1)?.at ?? '');
                    newestAt = Number.isFinite(sent) ? sent : Number.NEGATIVE_INFINITY;
                }
                const decided = deliveryFor({
                    own: one.own,
                    token: true,
                    wake: one.wake,
                    state: one.state,
                    queues,
                    waiting,
                    newestWaitedMs: now() - newestAt,
                    idleForMs: mem.idleSince === null ? 0 : now() - mem.idleSince,
                    settleMs,
                    resumedAt: mem.resumedAt,
                    resumedRecently: resumes.length,
                    now: now(),
                });
                if (decided.act !== 'type' && decided.act !== 'resume')
                    continue;
                if (!mem.held.length) {
                    let taken;
                    try {
                        taken = await read(one.token, true);
                    }
                    catch {
                        continue;
                    }
                    if (!taken.ok)
                        continue;
                    const data = taken.data;
                    const you = data.you;
                    mem.held = data.messages.filter((m) => !you || !(m.from.module === you.module && m.from.session !== null && m.from.session === you.session));
                    if (!mem.held.length)
                        continue;
                }
                const text = typedMessages(mem.held, one.act);
                const count = mem.held.length;
                const newest = mem.held.at(-1).id;
                let ok = false;
                if (decided.act === 'resume') {
                    mem.resumedAt = now();
                    resumes.push(mem.resumedAt);
                }
                try {
                    ok = decided.act === 'resume' ? await resume(one.key, text) : await type(one.key, text);
                }
                catch {
                    ok = false;
                }
                if (!ok) {
                    log(`${count} message${count === 1 ? '' : 's'} for ${one.key} not ${decided.act === 'resume' ? 'resumed with' : 'typed'} yet (newest #${newest}); tried again later`);
                    continue;
                }
                mem.held = [];
                done += 1;
                log(`${decided.act === 'resume' ? 'resumed' : 'typed into'} ${one.key}: ${count} message${count === 1 ? '' : 's'} (newest #${newest}) — ${decided.why}`);
            }
        }
        finally {
            busy = false;
        }
        return done;
    }
    return {
        tick,
        start() {
            if (timer)
                return;
            timer = setInterval(() => void tick(), everyMs);
            timer.unref?.();
        },
        stop() {
            if (timer)
                clearInterval(timer);
            timer = null;
        },
    };
}
