import { MODULE_PORTS, claim, modulePort, sayClaim } from './ports.js';
import { registerAt, takesOver } from './registry.js';
/**
 * Whether the host asked for ANY free port (2.65.0): `PORT=0`. A host that reaches modules at
 * stable addresses of its own does not need a module on a port it knows in advance; it reads the
 * port the module registers (`registerBound`). Then neither `claim` nor the drift rules run: the
 * module takes a port from `MODULE_PORTS` that is free on every address (`anyPortOrLeave`, 2.97.0;
 * before, port 0, which the system fills from the range it also gives other programs' servers),
 * binds it, and says so in its registration. Any other `PORT` (or none) is as before: `preferred`,
 * then `claim`'s drift.
 */
export function anyPort(env = process.env) {
    return env.PORT?.trim() === '0';
}
/**
 * The port to prefer: `PORT` from the environment when it is an integer from 1 to 65535 — the host
 * passes it when it starts a module — and `prefer` otherwise.
 */
export function preferred(prefer, env = process.env) {
    const said = Number(env.PORT);
    return Number.isInteger(said) && said > 0 && said <= 65535 ? said : prefer;
}
export function serves({ id, prefer, dir, span, timeoutMs }) {
    let claimed = null;
    return {
        name: 'kehikot-module-serves',
        apply: 'serve',
        async config(config) {
            /* Any free port (2.65.0): one of `MODULE_PORTS`, free on every address (2.97.0), and
               `configureServer` registers what was bound. */
            if (anyPort()) {
                const said = config?.server?.cors !== undefined;
                return { server: { host: '127.0.0.1', port: await anyPortOrLeave(id), strictPort: false, ...(said ? {} : { cors: false }) } };
            }
            claimed = await claimOrLeave({ id, prefer: preferred(prefer), span, timeoutMs });
            /* No cross-origin sharing unless the module wrote `server.cors` itself: a module's page asks
               its own origin, and Vite's own default answers other origins on this machine. */
            const said = config?.server?.cors !== undefined;
            return { server: { host: '127.0.0.1', port: claimed.port, strictPort: false, ...(said ? {} : { cors: false }) } };
        },
        configureServer(server) {
            const http = server.httpServer;
            if (!http) {
                /* Middleware mode: somebody else owns the socket, so there is no port to
                   read and no address this plugin has any business writing down. */
                console.error(`${id}: no http server of its own, so nothing was registered`);
                return;
            }
            http.once('listening', () => {
                const bound = http.address();
                if (!bound || typeof bound === 'string') {
                    console.error(`${id}: listening on ${String(bound)}, which is not an address a host can be told about`);
                    return;
                }
                registerBound(id, `http://127.0.0.1:${bound.port}`, dir ?? server.config.root);
            });
        },
    };
}
/**
 * The port, decided once for a dev server (`serves`) and a built one (`run` in `/run`) alike: the
 * claim, and leaving when there is no port to take. Exit 0, not 1, when this module already answers:
 * nothing failed, the thing being asked for exists, and a second copy of one module is not a
 * fallback. Exit 1 when there is nowhere to go. A move is said on stdout, naming both numbers.
 */
export async function claimOrLeave(options) {
    const claimed = await claim(options);
    if (claimed.status === 'already-running') {
        console.log(sayClaim(claimed));
        process.exit(0);
    }
    if (claimed.status === 'nowhere') {
        console.error(sayClaim(claimed));
        process.exit(1);
    }
    if (claimed.moved)
        console.log(sayClaim(claimed));
    return claimed;
}
/**
 * The port for `PORT=0` (2.97.0), for a dev server (`serves`) and a built one (`run`) alike: one of
 * `MODULE_PORTS` that nothing holds on any address (`modulePort`). Never port 0: the system fills
 * that from its temporary range, where another program asking for "any port" on `[::]` is handed
 * the same number and its own requests to `127.0.0.1` reach this module instead. Exit 1 when the
 * whole band is held.
 */
export async function anyPortOrLeave(id) {
    const port = await modulePort();
    if (port === null) {
        console.error(`${id} could not find a free port: every port from ${MODULE_PORTS.from} to ${MODULE_PORTS.to} is held`);
        process.exit(1);
    }
    return port;
}
/**
 * Write down the address a server ACTUALLY bound, once it is listening, for a dev server and a built
 * one alike. Another folder that the app runs this module from is not taken over (see `takesOver`):
 * this copy answers and says why it was not registered. Whoever started last wins, and the losing
 * entry is named rather than overwritten in silence.
 */
export function registerBound(id, origin, here) {
    const may = takesOver(id, here);
    if (!may.ok) {
        console.log(`${id} answers at ${origin} and was NOT registered: the app runs ${id} from ${may.held.dir}, and a copy `
            + 'started from another folder does not take that over. `bun run register` here would.');
        return;
    }
    const written = registerAt({ id, origin, dir: here });
    console.log(`${id} registered: ${written.file} -> ${origin}`);
    if (written.was)
        console.log(`  (was ${written.was.url}${written.was.dir ? ` in ${written.was.dir}` : ''})`);
}
