import { type Before } from '../serve/before.js';
import { type DoorsOptions } from '../serve/doors.js';
import { type Readiness } from './stamp.js';
export { STAMP_FILE, readStamp, readiness, type Readiness } from './stamp.js';
export { beforeDoors, beforeHandler, beforeInfo, type Before, type BeforeInfo } from '../serve/before.js';
/**
 * A module served from its BUILT page (2.17.0): one Bun server, the same doors the dev server
 * mounts (`doorsFetch`, the adapter `doors()` is the other form of), the files of `dist/`, and a
 * WebSocket hook for a module that holds sockets. Bun-only. Design notes: docs/ready-built.md.
 *
 *     // serve.ts
 *     import { run } from 'kehikot-module-protocol/run'
 *     await run({ id: ID, prefer: PREFERRED_PORT, dir: import.meta.dirname, manifest: MANIFEST, answer, build: BUILD, ticket: TICKET })
 *
 * What it decides the way the dev server does, by the same functions: the port (`PORT`, else
 * `prefer`, then the drift rules of `claim`), loopback only, and the registration of the port it
 * actually bound. What it adds: it serves a build only when the build's stamp is the commit this
 * process started at, and otherwise answers the page with a 503 that says why — a stale page is
 * never served with a 200.
 */
/** The part of Bun's `ServerWebSocket` a module's socket handlers are handed. */
export interface RunSocket<T = unknown> {
    readonly data: T;
    /** 0 connecting, 1 open, 2 closing, 3 closed. */
    readonly readyState: number;
    /** Bytes sent, -1 when queued behind backpressure, 0 when dropped. */
    send(data: string | Uint8Array, compress?: boolean): number;
    close(code?: number, reason?: string): void;
    terminate(): void;
    getBufferedAmount(): number;
}
/**
 * A module's WebSocket doors. A handshake on one of `paths` is upgraded only from this module's own
 * page: an `Origin` and a `Host` that name this server's own loopback address (`socketFence`). Every
 * other handshake is a bare 403 — the reason goes to `refused`, not to the caller.
 */
export interface RunSockets<T = unknown> {
    paths: readonly string[];
    /** What each socket carries, made from its handshake. */
    data?: (request: Request) => T;
    open?(socket: RunSocket<T>): void;
    message(socket: RunSocket<T>, message: string | Uint8Array): void;
    close?(socket: RunSocket<T>, code: number, reason: string): void;
    drain?(socket: RunSocket<T>): void;
    refused?(why: string): void;
    /** Bun's: how much one socket may queue before a send is dropped. Default Bun's (16 MiB). */
    backpressureLimit?: number;
    /** Bun's: the largest message read. Default 1 MiB. */
    maxPayloadLength?: number;
}
export interface RunOptions<T = unknown> extends Omit<DoorsOptions, 'page'> {
    /** The module's own id. */
    id: string;
    /** The port to take when nothing else has it; `PORT` from the environment wins, as for `serves()`. */
    prefer: number;
    /** The module's checkout: where `dist/` is, whose commit the stamp must name, and what is registered. */
    dir: string;
    /** Default `<dir>/dist`. */
    dist?: string;
    /** This process's write ticket, printed into the page. */
    ticket?: string | null;
    /**
     * `true` answers a GET for an address that is not a door and not a file with the page, for a
     * module whose page routes by its address (a browser asking for `text/html` only). Default off:
     * an address that is nothing is a 404.
     */
    spa?: boolean;
    sockets?: RunSockets<T>;
    /** How far the port may drift, and how long a squatter gets to say who it is (`claim`). */
    span?: number;
    timeoutMs?: number;
    /**
     * Called once when the process is asked to stop (SIGINT, SIGTERM) or exits: end what it started.
     * A promise it returns is awaited on a signal (2.18.1), for at most `stopTimeoutMs`, before the
     * process exits: a browser told to close writes its cookies, one killed does not. On a plain exit
     * (`process.exit`, the event loop running dry) nothing can be awaited: it is called and not waited for.
     */
    onStop?: () => void | Promise<void>;
    /** How long a signal waits for `onStop` before the process exits anyway, in ms (2.18.1). Default 5000. */
    stopTimeoutMs?: number;
    /** Bun's idle timeout in seconds. Default 0, none: an event stream or a long MCP call is not idle. */
    idleTimeout?: number;
    /**
     * A door of the module's own, asked before the protocol's doors and the files of `dist/` (2.18.0):
     * a `Response` answers, `undefined` hands the request on. The same function a module mounts on
     * Vite with `beforeDoors` (`kehikot-module-protocol/serve`), so the two servers cannot drift.
     * Not asked for a socket handshake on one of `sockets.paths`, nor for a request whose `Host` is
     * refused (`hostFence`).
     */
    before?: Before;
    /**
     * Let a page on another origin load the files of `dist/` (2.18.0). For a module framed WITHOUT
     * `allow-same-origin` — its manifest declares `storage: false` — whose page is on an opaque
     * origin: a module script is always fetched in CORS mode, and from an opaque origin it carries
     * `Origin: null`, so without a header saying otherwise not one script of the page runs. What Vite's
     * `server.cors` does in development.
     *
     * `true` answers `Origin: null` and the origins that may frame the page (`frameOrigins`: the
     * environment's `KEHIKOT_ORIGINS`, and `ancestors`); `origins` adds more. The answer echoes the
     * origin, with `Vary: Origin`, on the files of `dist/` and a preflight for one. The page and the
     * doors are not opened by it: their gate still refuses another origin (`openHealth` is the
     * health check's own opening).
     */
    cors?: boolean | {
        origins?: readonly string[];
    };
    /**
     * Names this server answers to besides the loopback ones (`hostFence`). Default none: as Vite's
     * `server.allowedHosts`, a request whose `Host` is another name is a 403, whatever it asks.
     */
    hosts?: readonly string[];
}
export interface Running {
    port: number;
    origin: string;
    /** Whether the build was servable when the server started, and why not. */
    ready: Readiness;
    /** End what the module started (`onStop`, awaited for at most `stopTimeoutMs`) and stop serving. Once. */
    stop(): Promise<void>;
}
/**
 * Is this WebSocket handshake from this module's own page? A browser always sends `Origin` on one
 * and a page cannot forge it, so none at all is not a page; `Host` is held to the same two names so
 * that a name resolving to 127.0.0.1 (DNS rebinding) is not here. Pure.
 */
export declare function socketFence(headers: {
    get(name: string): string | null;
}, port: number): {
    ok: true;
} | {
    ok: false;
    why: string;
};
/** How long a signal waits for a module's `onStop` before the process exits anyway (2.18.1). */
export declare const STOP_TIMEOUT_MS = 5000;
/** What a request sent under a name that is not this machine's is told, with status 403. */
export declare const NOT_HERE = "This address is not one this module answers at.";
/**
 * Whether a `Host` header names this machine — `127.0.0.1`, `[::1]`, `localhost` or a name under
 * it, with or without a port — or one of `also` (2.18.0). Pure.
 *
 * The doors' gate reads `Origin` against `Host`, so it trusts `Host` to be this server. A page on a
 * name somebody pointed at 127.0.0.1 (DNS rebinding) sends an `Origin` and a `Host` that agree, and
 * would be "its own page". Vite refuses such a `Host` before its middleware runs
 * (`server.allowedHosts`); `run` refuses it first, the same way, whatever the path.
 */
export declare function hostFence(host: string | null, also?: readonly string[]): boolean;
/**
 * The origin a cross-origin load of a file of `dist/` is answered for, or null (2.18.0): `null`, an
 * opaque page's, and the frame origins, when `cors` is on. Pure.
 */
export declare function corsOrigin(origin: string | null, allowed: ReadonlySet<string> | null): string | null;
/**
 * One file out of `dist`, or null. Never a directory (no listing), never a dot file (the stamp),
 * never a path that leaves `dist` once normalised.
 */
export declare function fileIn(dist: string, pathname: string): string | null;
/** Serve a module's built page and its doors. Resolves once the server is listening and registered. */
export declare function run<T = unknown>(options: RunOptions<T>): Promise<Running>;
