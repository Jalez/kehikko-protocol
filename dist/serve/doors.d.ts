import { type Build, type Manifest } from '../index.js';
import { type BodySource } from './body.js';
import { type PageOptions } from './page.js';
/**
 * Every door a module answers on, served by the process that serves its page: a module is ONE
 * ORIGIN. What stays the module's is `answer`, a pure function from a request to a status and a
 * body. `/app` is claimed here before Vite's resolver sees it. See docs/module-plumbing.md.
 */
export interface Reply {
    status: number;
    /** Sent as JSON. `null` is "answer with no body", which is what a notification gets. */
    body: unknown;
    /** Extra response headers. */
    headers?: Record<string, string>;
    /** Sent as it is, with this content type, instead of `body` as JSON: a PDF, plain text. */
    raw?: {
        bytes: Uint8Array | string;
        type: string;
    };
}
/** `null` is "not ours": the request goes on to whatever is behind this (Vite). */
export type Answer = (method: string, path: string, query: URLSearchParams, body: Record<string, unknown> | null, ticket: string | null) => Reply | null | Promise<Reply | null>;
/**
 * The server-sent-event doors, asked before `answer`. `emit` is handed each
 * event as it happens. The answer is a refusal to send instead of opening the
 * stream, the function to call when the reader goes away, or `null` for "not a
 * stream door".
 */
export type Stream = (method: string, path: string, query: URLSearchParams, emit: (event: unknown, name?: string) => void, ticket: string | null) => {
    reply: Reply;
} | {
    close: () => void;
} | null;
export interface DoorsOptions {
    /** Served at both well-known paths, the legacy one in the legacy spelling. */
    manifest: Manifest;
    answer: Answer;
    stream?: Stream;
    /**
     * This process's build (`establishBuild`). Given, it is added to the manifest, to the health
     * check's answer, to the page, and — as a stamp — to a header on every answer.
     */
    build?: Build;
    /**
     * The page: what `pageDocument` takes (with this process's `ticket` in it),
     * or a function for a module that builds its own document.
     */
    page: PageOptions | (() => string);
    /** Paths that serve the page besides `/app`, `/app/` and `/`. */
    pages?: readonly string[];
    /**
     * Which paths go to `answer` and `stream`. Default: `/healthz`, `/mcp`, and
     * anything under `/api/`. Everything else is left to Vite unread.
     */
    ours?: (path: string) => boolean;
    /** Default `MAX_BODY_BYTES`. */
    maxBodyBytes?: number;
    /** How often an open stream is sent a comment so nothing in between closes it. Default 25000. */
    beatMs?: number;
}
/** The part of node's `IncomingMessage` the doors read. */
export interface DoorRequest extends BodySource {
    url?: string;
    originalUrl?: string;
    headers: Record<string, string | string[] | undefined>;
    on(event: 'data', listener: (chunk: Uint8Array) => void): unknown;
    on(event: 'end' | 'close', listener: () => void): unknown;
    on(event: 'error', listener: (error: Error) => void): unknown;
}
/** The part of node's `ServerResponse` the doors write. */
export interface DoorResponse {
    statusCode: number;
    setHeader(name: string, value: string): unknown;
    write(chunk: string): unknown;
    end(chunk?: string | Uint8Array): unknown;
    flushHeaders?(): unknown;
}
export type DoorHandler = (request: DoorRequest, response: DoorResponse, next: (error?: unknown) => void) => void;
export declare const PAGE_PATHS: readonly string[];
/**
 * The doors as a plain node handler — `(request, response, next)` — for a
 * module that is not served by Vite, and for tests. `transform` is where Vite's
 * `transformIndexHtml` goes; without one the document is sent as built.
 */
export declare function doorsHandler(options: DoorsOptions, transform?: (html: string, url: string, originalUrl?: string) => Promise<string>): DoorHandler;
/** The part of Vite's dev server the plugin touches. */
export interface DoorsServerLike {
    middlewares: {
        use(handler: DoorHandler): unknown;
    };
    transformIndexHtml(url: string, html: string, originalUrl?: string): Promise<string>;
}
export interface DoorsPlugin {
    name: string;
    apply: 'serve';
    configureServer(server: DoorsServerLike): void;
}
/**
 * The Vite plugin. It goes after `serves()`, which claims the port, and before
 * the framework's own plugins:
 *
 *     plugins: [serves({ id: ID, prefer: PREFERRED_PORT }), doors({ … }), react(), tailwindcss()]
 */
export declare function doors(options: DoorsOptions): DoorsPlugin;
