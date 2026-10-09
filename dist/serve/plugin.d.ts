/**
 * Options for `serves`, a module's whole port story as one line in its `vite.config.ts`:
 * `plugins: [serves({ id: ID, prefer: 7960 }), …]`. It claims a port before Vite starts and registers
 * the port actually bound once listening. Dev server only (`apply: 'serve'`); `strictPort` is off.
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
    config(): Promise<{
        server: {
            host: string;
            port: number;
            strictPort: false;
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
//# sourceMappingURL=plugin.d.ts.map