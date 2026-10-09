import { type Query } from './query.js';
/**
 * A page asking its own server, with every failure as one typed result: `ask` never throws and
 * never hands back a raw response. See docs/module-plumbing.md.
 */
/** The ticket printed into this page, or `''` when there is none. Read on every call; it is one element. */
export declare function ticket(): string;
export type AskFailure = 
/** Nothing answered: the module's own server is stopped, or unreachable. */
'down'
/** The server refused this page's ticket: it restarted since the page loaded. The page should reload. */
 | 'stale'
/** The server answered and said no — or with something that is not an answer. `error` is the sentence. */
 | 'refused'
/** The caller gave up: its `signal` aborted. Nothing is wrong with the server, and nothing was learned about it. */
 | 'cancelled';
export type Asked<T> = {
    ok: true;
    status: number;
    body: T;
} | {
    ok: false;
    kind: AskFailure;
    status: number | null;
    error: string;
    body: unknown;
};
export interface AskOptions {
    /** Default `GET`, or `POST` when there is a `body`. */
    method?: string;
    /** Appended to the path as a query string. `null` and `undefined` values are left out; a list repeats its key. */
    query?: Query;
    /** Sent as JSON. */
    body?: unknown;
    /**
     * `true` carries the ticket on a GET too, for a door that fences its reads. Default: every
     * method but GET and HEAD carries it.
     */
    ticket?: boolean;
    /**
     * `true` asks the browser to finish the request after the page has gone: a save sent from
     * `pagehide`. Left off, quietly, for a body past `KEEPALIVE_BYTES` — a browser refuses those outright.
     */
    keepalive?: boolean;
    /** Stops the asking. The result is then `cancelled`, with no status: not a refusal, and not a server that stopped. */
    signal?: AbortSignal;
    /** For tests. Default: the page's own `fetch`. */
    fetch?: typeof fetch;
}
/** What a reader is told when nothing answered. One sentence, the same in every module. */
export declare const SERVER_DOWN = "This app\u2019s own server is not answering.";
/**
 * The fact, and nothing about what happens next: what a stale `ask` says as its `error`, whether
 * or not anything is about to reload. A page that keeps unsaved words says this beside them.
 */
export declare const PAGE_OLD = "This page is older than its server.";
/** The same fact while a reload is on its way: what the stale `Cover` says, because it is the one reloading. */
export declare const PAGE_STALE = "This page is older than its server \u2014 reloading\u2026";
/** What is said of a 2xx that carried something other than JSON, and by `replied` of one that carried no object. */
export declare const NOT_A_REPLY = "This app\u2019s own server answered with something that is not a reply.";
/** What a cancelled `ask` says. */
export declare const CANCELLED = "That was cancelled.";
/** The most a browser will carry in a `keepalive` request is 64 KiB across all of them; this leaves room. */
export declare const KEEPALIVE_BYTES = 48000;
export type ServerStanding = 'up' | 'down' | 'stale';
/** How this page's own server last answered: `up`, `down` (nothing answered) or `stale` (it refused the ticket). */
export declare function serverStanding(): ServerStanding;
/** Hear the standing change. Returns the function that stops listening. */
export declare function onServerStanding(watcher: (standing: ServerStanding) => void): () => void;
/** For tests: forget what was learned. */
export declare function resetServerStanding(): void;
/**
 * Ask this page's own server; relative paths, one origin. Anything but a GET carries the ticket.
 * A 2xx whose body says `ok: false` is a refusal, and a refusal keeps its `body`. A 2xx with no
 * body at all is `ok: true, body: null`; a 2xx with a body that is not JSON is a refusal
 * (`NOT_A_REPLY`) — something answered on this path, and it was not this module's door.
 */
export declare function ask<T = unknown>(path: string, options?: AskOptions): Promise<Asked<T>>;
/** A failed `ask`, for code written around `try`/`catch`. `message` is the sentence. */
export declare class AskFailed extends Error {
    readonly kind: AskFailure;
    readonly status: number | null;
    readonly body: unknown;
    constructor(failed: {
        kind: AskFailure;
        status: number | null;
        error: string;
        body: unknown;
    });
}
/** The body of an `ask` that worked, or an `AskFailed` thrown for one that did not. */
export declare function answered<T>(asked: Asked<T>): T;
/**
 * What the server itself said, whether that was yes or no, for a door whose "no" is an answer of
 * its own shape (`{ ok: false, nowhere: true }`, a conflict with what is there now). A refusal's
 * body comes back with `ok: false` and the sentence as `error`; `T` describes both. Thrown as
 * `AskFailed`: nothing answered, a stale page, and an answer that is not a JSON object.
 */
export declare function replied<T extends object>(asked: Asked<T | null>): T;
/**
 * Ask the server whether it is there, for a page that asks nothing on a timer: the answer is the
 * standing, which is also what `useServerStanding` and the covers read. Any door of the module's
 * that answers a GET will do; `/healthz` is the one every module has.
 */
export declare function probeServer(path?: string, options?: Pick<AskOptions, 'fetch' | 'signal'>): Promise<ServerStanding>;
/** How often `watchServer` asks, in ms, unless told otherwise. */
export declare const WATCH_SERVER_MS = 15000;
/**
 * Keep asking whether the server is there, for a page that never asks it anything else — one whose
 * rows all come from the host — and so would never notice it had stopped: `probeServer` every
 * `every` ms while the page is visible, and once each time it becomes visible again. The answer is
 * the standing the covers read. Returns the function that stops watching. A page on an opaque
 * origin needs its server's `openHealth` (`doors`) for the answer to be readable.
 */
export declare function watchServer(options?: {
    path?: string;
    every?: number;
    fetch?: typeof fetch;
}): () => void;
/**
 * Reload a page that is older than its server — once: a second call within `within` ms does
 * nothing, so a server that refuses even a fresh page cannot make a loop. Returns whether a reload
 * was started.
 */
export declare function reloadStalePage(within?: number): boolean;
/** How long the sentence is on screen before a stale page reloads. */
export declare const STALE_RELOAD_MS = 900;
/**
 * Reload automatically when this page's own server turns out to be a different process — once, a
 * moment after it is noticed. `useHost` and `Cover` both arrange this; a page with neither calls
 * it from its entry. Returns the function that stops watching.
 */
export declare function reloadWhenStale(delay?: number): () => void;
