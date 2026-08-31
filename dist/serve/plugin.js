import { claim, sayClaim } from './ports.js';
import { registerAt } from './registry.js';
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
export function preferred(prefer, env = process.env) {
    const said = Number(env.PORT);
    return Number.isInteger(said) && said > 0 && said <= 65535 ? said : prefer;
}
export function serves({ id, prefer, dir, span, timeoutMs }) {
    let claimed = null;
    return {
        name: 'roadmap-module-serves',
        apply: 'serve',
        async config() {
            claimed = await claim({ id, prefer: preferred(prefer), span, timeoutMs });
            if (claimed.status === 'already-running') {
                /* Exit 0, not 1. Nothing failed: the thing being asked for exists. A
                   non-zero exit here would make `./run.sh` look broken to a person who
                   has simply started their module twice, and would make a host's own
                   start attempt report a module that cannot run while that module is
                   answering on the port named in the sentence below.
        
                   And it EXITS rather than drifting, which is the one place drift is
                   refused. A second copy of one module is two stores writing the same
                   files, two MCP doors, two committers on one repository, and a host
                   framing whichever the registry names. That is not a fallback. */
                console.log(sayClaim(claimed));
                process.exit(0);
            }
            if (claimed.status === 'nowhere') {
                console.error(sayClaim(claimed));
                process.exit(1);
            }
            /* Loud, on stdout, naming both numbers — the port that was wanted and the
               one taken. A drift a person cannot see is a module answering somewhere
               nobody will think to look. */
            if (claimed.moved)
                console.log(sayClaim(claimed));
            return { server: { host: '127.0.0.1', port: claimed.port, strictPort: false } };
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
                const written = registerAt({ id, origin, dir: dir ?? server.config.root });
                /* Said every time, and short. It is the answer to "where is this thing"
                   for anybody reading the terminal it started in, and after a drift it
                   is the only place both numbers appear together. */
                console.log(`${id} registered: ${written.file} -> ${origin}`);
                if (written.was) {
                    /* Whoever started last wins, and the losing entry is named rather than
                       overwritten in silence. Two checkouts of one module is the case this
                       is for: the registry can only describe one program, and a person who
                       sees their other checkout's path scroll past knows immediately which
                       one the host is about to frame. */
                    console.log(`  (was ${written.was.url}${written.was.dir ? ` in ${written.was.dir}` : ''})`);
                }
            });
        },
    };
}
//# sourceMappingURL=plugin.js.map