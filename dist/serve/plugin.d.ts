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
 * Whether the host asked for ANY free port (2.65.0): `PORT=0`. A host that reaches modules at
 * stable addresses of its own does not need a module on a port it knows in advance; it reads the
 * port the module registers (`registerBound`). Then neither `claim` nor the drift rules run: the
 * module takes a port from `MODULE_PORTS` that is free on every address (`anyPortOrLeave`, 2.97.0;
 * before, port 0, which the system fills from the range it also gives other programs' servers),
 * binds it, and says so in its registration. Any other `PORT` (or none) is as before: `preferred`,
 * then `claim`'s drift.
 */
export declare function anyPort(env?: Record<string, string | undefined>): boolean;
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
 * The port for `PORT=0` (2.97.0), for a dev server (`serves`) and a built one (`run`) alike: one of
 * `MODULE_PORTS` that nothing holds on any address (`modulePort`). Never port 0: the system fills
 * that from its temporary range, where another program asking for "any port" on `[::]` is handed
 * the same number and its own requests to `127.0.0.1` reach this module instead. Exit 1 when the
 * whole band is held.
 */
export declare function anyPortOrLeave(id: string): Promise<number>;
/**
 * Write down the address a server ACTUALLY bound, once it is listening, for a dev server and a built
 * one alike. Another folder that the app runs this module from is not taken over (see `takesOver`):
 * this copy answers and says why it was not registered. Whoever started last wins, and the losing
 * entry is named rather than overwritten in silence.
 */
export declare function registerBound(id: string, origin: string, here: string): void;
