import { claim, sayClaim, type Claimed } from './ports.js'
import { registerAt } from './registry.js'

/**
 * Options for `serves`, a module's whole port story as one line in its `vite.config.ts`:
 * `plugins: [serves({ id: ID, prefer: 7960 }), …]`. It claims a port before Vite starts and registers
 * the port actually bound once listening. Dev server only (`apply: 'serve'`); `strictPort` is off.
 */
export interface ServesOptions {
  /** The module's own id. The same constant its manifest is built from. */
  id: string
  /** The port to take when nothing else has it. */
  prefer: number
  /** The directory a host would start this module in. Defaults to Vite's resolved `root`, the checkout. */
  dir?: string
  /** How far the drift may walk before giving up. */
  span?: number
  /** How long a squatter gets to identify itself. */
  timeoutMs?: number
}

/**
 * The shapes this plugin needs from Vite, stated structurally: this package does not depend on
 * Vite and must not. Vite's own `Plugin` is a superset of what is declared here.
 */
export interface HttpServerLike {
  address(): string | { port: number } | null
  once(event: 'listening', listener: () => void): unknown
}

export interface DevServerLike {
  httpServer: HttpServerLike | null
  config: { root: string }
}

export interface ServesPlugin {
  name: string
  apply: 'serve'
  config(): Promise<{ server: { host: string; port: number; strictPort: false } }>
  configureServer(server: DevServerLike): void
}

/**
 * The port to prefer: `PORT` from the environment when it is an integer from 1 to 65535 — the host
 * passes it when it starts a module — and `prefer` otherwise.
 */
export function preferred(prefer: number, env: Record<string, string | undefined> = process.env): number {
  const said = Number(env.PORT)
  return Number.isInteger(said) && said > 0 && said <= 65535 ? said : prefer
}

export function serves({ id, prefer, dir, span, timeoutMs }: ServesOptions): ServesPlugin {
  let claimed: Claimed | null = null

  return {
    name: 'kehikot-module-serves',
    apply: 'serve',

    async config() {
      claimed = await claim({ id, prefer: preferred(prefer), span, timeoutMs })

      if (claimed.status === 'already-running') {
        /* Exit 0, not 1: nothing failed, the thing being asked for exists. And it EXITS rather
           than drifting — a second copy of one module is not a fallback. */
        console.log(sayClaim(claimed))
        process.exit(0)
      }

      if (claimed.status === 'nowhere') {
        console.error(sayClaim(claimed))
        process.exit(1)
      }

      /* Loud, on stdout, naming both numbers — the port that was wanted and the one taken. */
      if (claimed.moved) console.log(sayClaim(claimed))

      return { server: { host: '127.0.0.1', port: claimed.port, strictPort: false } }
    },

    configureServer(server: DevServerLike) {
      const http = server.httpServer
      if (!http) {
        /* Middleware mode: somebody else owns the socket, so there is no port to
           read and no address this plugin has any business writing down. */
        console.error(`${id}: no http server of its own, so nothing was registered`)
        return
      }

      http.once('listening', () => {
        const bound = http.address()
        if (!bound || typeof bound === 'string') {
          console.error(`${id}: listening on ${String(bound)}, which is not an address a host can be told about`)
          return
        }

        const origin = `http://127.0.0.1:${bound.port}`
        const written = registerAt({ id, origin, dir: dir ?? server.config.root })

        /* Said every time, and short. After a drift it is the only place both numbers appear
           together. */
        console.log(`${id} registered: ${written.file} -> ${origin}`)

        if (written.was) {
          /* Whoever started last wins, and the losing entry is named rather than overwritten in
             silence. */
          console.log(`  (was ${written.was.url}${written.was.dir ? ` in ${written.was.dir}` : ''})`)
        }
      })
    },
  }
}
