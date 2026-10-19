import { claim, sayClaim } from './ports.js';
import { registerAt, takesOver } from './registry.js';
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
            claimed = await claim({ id, prefer: preferred(prefer), span, timeoutMs });
            if (claimed.status === 'already-running') {
                /* Exit 0, not 1: nothing failed, the thing being asked for exists. And it EXITS rather
                   than drifting — a second copy of one module is not a fallback. */
                console.log(sayClaim(claimed));
                process.exit(0);
            }
            if (claimed.status === 'nowhere') {
                console.error(sayClaim(claimed));
                process.exit(1);
            }
            /* Loud, on stdout, naming both numbers — the port that was wanted and the one taken. */
            if (claimed.moved)
                console.log(sayClaim(claimed));
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
                const origin = `http://127.0.0.1:${bound.port}`;
                const here = dir ?? server.config.root;
                /* Another folder is the one the app runs this module from: this copy answers, and is not
                   registered in its place (see `takesOver`). */
                const may = takesOver(id, here);
                if (!may.ok) {
                    console.log(`${id} answers at ${origin} and was NOT registered: the app runs ${id} from ${may.held.dir}, and a copy `
                        + 'started from another folder does not take that over. `bun run register` here would.');
                    return;
                }
                const written = registerAt({ id, origin, dir: here });
                /* Said every time, and short. After a drift it is the only place both numbers appear
                   together. */
                console.log(`${id} registered: ${written.file} -> ${origin}`);
                if (written.was) {
                    /* Whoever started last wins, and the losing entry is named rather than overwritten in
                       silence. */
                    console.log(`  (was ${written.was.url}${written.was.dir ? ` in ${written.was.dir}` : ''})`);
                }
            });
        },
    };
}
