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
/** The server answered and said no. `error` is its own sentence. */
 | 'refused';
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
    /** Appended to the path as a query string. `null` and `undefined` values are left out. */
    query?: Record<string, string | number | boolean | null | undefined>;
    /** Sent as JSON. */
    body?: unknown;
    signal?: AbortSignal;
    /** For tests. Default: the page's own `fetch`. */
    fetch?: typeof fetch;
}
/** What a reader is told when nothing answered. One sentence, the same in every module. */
export declare const SERVER_DOWN = "This app\u2019s own server is not answering.";
/** What a reader is told while a page older than its server reloads. */
export declare const PAGE_STALE = "This page is older than its server \u2014 reloading\u2026";
export type ServerStanding = 'up' | 'down' | 'stale';
/** How this page's own server last answered: `up`, `down` (nothing answered) or `stale` (it refused the ticket). */
export declare function serverStanding(): ServerStanding;
/** Hear the standing change. Returns the function that stops listening. */
export declare function onServerStanding(watcher: (standing: ServerStanding) => void): () => void;
/** For tests: forget what was learned. */
export declare function resetServerStanding(): void;
/**
 * Ask this page's own server; relative paths, one origin. Anything but a GET carries the ticket.
 * A 2xx whose body says `ok: false` is a refusal, and a refusal keeps its `body`.
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
