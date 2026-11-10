/**
 * The one message listener a framed page has, installed the moment this file is imported and never
 * removed. Import the client from the page's ENTRY, not from a component or a lazy chunk. Every
 * message is recorded in the backlog and then delivered, so a re-subscriber answers a greeting twice.
 * Design notes: docs/client.md.
 */
import { pageErrors } from './errors.js';
/** How many messages the backlog keeps. Oldest go first. */
export const KEEP = 64;
/**
 * Build a mailbox over one window, listening immediately. Exported for tests; nothing in a page
 * should call it — a second mailbox over the same window answers the same greeting twice.
 */
export function makeMailbox(target, 
/** Told of every message first (2.59.0): the page's error reporter, which learns from a greeting who to tell. */
heard) {
    const backlog = [];
    const listeners = new Set();
    target?.addEventListener('message', (ev) => {
        heard?.(ev);
        backlog.push(ev);
        if (backlog.length > KEEP)
            backlog.shift();
        for (const listener of listeners)
            listener(ev);
    });
    return {
        get parent() {
            return target?.parent ?? null;
        },
        forget() {
            backlog.length = 0;
        },
        addEventListener(_type, fn) {
            /* Replayed SYNCHRONOUSLY, inside this call, and the caller has to know it — see `listen()`
               in `connect.ts`. */
            for (const ev of backlog)
                fn(ev);
            listeners.add(fn);
        },
        removeEventListener(_type, fn) {
            listeners.delete(fn);
        },
    };
}
/**
 * The page's inbox: the two listener methods of `window`, except that subscribing replays
 * everything that has already arrived. Outside a browser nothing ever posts to it; it does not crash.
 */
export const mailbox = makeMailbox(typeof window === 'undefined' ? undefined : window, 
/* 2.59.0: and the page's failures, said to whoever greets it (`errors.ts`). */
(ev) => pageErrors.heard(ev));
