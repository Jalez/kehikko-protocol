/**
 * A module's whole port story, as one line in its `vite.config.ts`.
 *
 *     import { serves } from 'roadmap-module-protocol/serve'
 *     import { ID } from './manifest.ts'
 *
 *     plugins: [serves({ id: ID, prefer: 7960 }), doors(), react()]
 *
 * What that replaces is a number written in three places and true in none of
 * them: `--port` in `run.sh`, `Number(process.env.PORT ?? 7960)` in
 * `register.ts`, and whatever the registry file happened to say from the last
 * time somebody ran the second. Changing a port meant editing two files and
 * remembering the third. Now the preference is stated once, beside the id, in
 * the file that already knows both.
 *
 * ## Why this is a plugin and not a wrapper script
 *
 * Because of the last step, which is the one that cannot be got right anywhere
 * else. `run.sh` could claim a port and pass it to Vite; the registration it
 * then wrote would say the port it ASKED for. Vite is free to answer somewhere
 * else — that is the entire reason `strictPort` is turned off here — and the gap
 * between the requested port and the bound one is exactly where a stale
 * registration comes from. Inside the process, `server.httpServer.address()`
 * after `listening` is the one number that cannot be wrong, and it is the number
 * that gets written down.
 *
 * ## `strictPort: false`, on purpose
 *
 * `--strictPort` was the only honest thing to do when nothing handled a
 * collision: a server that silently moved was a server nobody could find. That
 * is no longer true. The move is decided deliberately before Vite starts, said
 * out loud, and recorded in the registry the host actually reads — so Vite's own
 * fallback is now a second net under a first one, catching only the race between
 * this releasing a probe socket and Vite binding it.
 *
 * ## `apply: 'serve'`
 *
 * A production build has no port to claim and no address to register. A plugin
 * that wrote into somebody's home directory during `vite build` would be a build
 * with a side effect on a machine it was only compiling for.
 */
export interface ServesOptions {
    /** The module's own id. The same constant its manifest is built from. */
    id: string;
    /** The port to take when nothing else has it. */
    prefer: number;
    /**
     * The directory a host would start this module in.
     *
     * Defaults to Vite's resolved `root`, which is the checkout — the same
     * directory `register.ts` derives from its own file location, and for the same
     * reason: a `dir` taken from `process.cwd()` would record where somebody
     * happened to be standing.
     */
    dir?: string;
    /** How far the drift may walk before giving up. */
    span?: number;
    /** How long a squatter gets to identify itself. */
    timeoutMs?: number;
}
/**
 * The shapes this plugin needs from Vite, stated structurally.
 *
 * This package does not depend on Vite and must not: it is imported by the host,
 * by module servers, and by a browser bundle through a different entry, and none
 * of those should acquire a bundler as a transitive dependency to read a
 * manifest schema. Vite's own `Plugin` is a superset of what is declared here, so
 * the object below still satisfies `PluginOption` in a module's config with no
 * cast — and if it ever stops doing so, the module's `tsc` says so, which is the
 * right place to find out.
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
 * `PORT` still wins, because the host passes it.
 *
 * When the host starts a module it spawns `run.sh` with `PORT` set to the port
 * in the registration — see `server/launch.ts`. Ignoring that would mean a
 * module the host started at its recorded address preferring a different one and
 * drifting away from the very place the host is about to look. So the
 * environment is the preference when it says anything, and the constant beside
 * the id is the preference when it does not.
 */
export declare function preferred(prefer: number, env?: Record<string, string | undefined>): number;
export declare function serves({ id, prefer, dir, span, timeoutMs }: ServesOptions): ServesPlugin;
//# sourceMappingURL=plugin.d.ts.map