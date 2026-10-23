import { type Claimed } from './ports.js';
/**
 * Options for `serves`, a module's whole port story as one line in its `vite.config.ts`:
 * `plugins: [serves({ id: ID, prefer: 7960 }), …]`. It claims a port before Vite starts and registers
 * the port actually bound once listening. Dev server only (`apply: 'serve'`); `strictPort` is off,
 * and so is `server.cors` unless the module's own config says otherwise.
 */
export interface ServesOptions {
    /** The module's own id. The same constant its manifest is built from. */
    id: string;
    /** The port to take when nothing else has it. */
    prefer: number;
    /** The directory a host would start this module in. Defaults to Vite's resolved `root`, the checkout. */
    dir?: string;
    /** How far the drift may walk before giving up. */
    span?: number;
    /** How long a squatter gets to identify itself. */
    timeoutMs?: number;
}
/**
 * The shapes this plugin needs from Vite, stated structurally: this package does not depend on
 * Vite and must not. Vite's own `Plugin` is a superset of what is declared here.
 */
export interface HttpServerLike {
    address(): string | {
        port: number;
    } | null;
    once(event: 'listening', listener: () => void): unknown;
}
export interface DevServerLike {
    httpServer: HttpServerLike | null;
    config: {
        root: string;
    };
}
export interface ServesPlugin {
    name: string;
    apply: 'serve';
    config(config?: {
        server?: {
            cors?: unknown;
        };
    }): Promise<{
        server: {
            host: string;
            port: number;
            strictPort: false;
            cors?: false;
        };
    }>;
    configureServer(server: DevServerLike): void;
}
/**
 * The port to prefer: `PORT` from the environment when it is an integer from 1 to 65535 — the host
 * passes it when it starts a module — and `prefer` otherwise.
 */
export declare function preferred(prefer: number, env?: Record<string, string | undefined>): number;
export declare function serves({ id, prefer, dir, span, timeoutMs }: ServesOptions): ServesPlugin;
/**
 * The port, decided once for a dev server (`serves`) and a built one (`run` in `/run`) alike: the
 * claim, and leaving when there is no port to take. Exit 0, not 1, when this module already answers:
 * nothing failed, the thing being asked for exists, and a second copy of one module is not a
 * fallback. Exit 1 when there is nowhere to go. A move is said on stdout, naming both numbers.
 */
export declare function claimOrLeave(options: {
    id: string;
    prefer: number;
    span?: number;
    timeoutMs?: number;
}): Promise<Extract<Claimed, {
    status: 'claimed';
}>>;
/**
 * Write down the address a server ACTUALLY bound, once it is listening, for a dev server and a built
 * one alike. Another folder that the app runs this module from is not taken over (see `takesOver`):
 * this copy answers and says why it was not registered. Whoever started last wins, and the losing
 * entry is named rather than overwritten in silence.
 */
export declare function registerBound(id: string, origin: string, here: string): void;
