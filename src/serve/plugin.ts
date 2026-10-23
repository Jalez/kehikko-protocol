import { claim, sayClaim, type Claimed } from './ports.js'
import { registerAt, takesOver } from './registry.js'

/**
 * Options for `serves`, a module's whole port story as one line in its `vite.config.ts`:
 * `plugins: [serves({ id: ID, prefer: 7960 }), …]`. It claims a port before Vite starts and registers
 * the port actually bound once listening. Dev server only (`apply: 'serve'`); `strictPort` is off,
 * and so is `server.cors` unless the module's own config says otherwise.
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
  config(config?: { server?: { cors?: unknown } }): Promise<{ server: { host: string; port: number; strictPort: false; cors?: false } }>
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

    async config(config) {
      claimed = await claimOrLeave({ id, prefer: preferred(prefer), span, timeoutMs })

      /* No cross-origin sharing unless the module wrote `server.cors` itself: a module's page asks
         its own origin, and Vite's own default answers other origins on this machine. */
      const said = config?.server?.cors !== undefined
      return { server: { host: '127.0.0.1', port: claimed.port, strictPort: false, ...(said ? {} : { cors: false as const }) } }
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

        registerBound(id, `http://127.0.0.1:${bound.port}`, dir ?? server.config.root)
      })
    },
  }
}

/**
 * The port, decided once for a dev server (`serves`) and a built one (`run` in `/run`) alike: the
 * claim, and leaving when there is no port to take. Exit 0, not 1, when this module already answers:
 * nothing failed, the thing being asked for exists, and a second copy of one module is not a
 * fallback. Exit 1 when there is nowhere to go. A move is said on stdout, naming both numbers.
 */
export async function claimOrLeave(options: { id: string; prefer: number; span?: number; timeoutMs?: number }): Promise<Extract<Claimed, { status: 'claimed' }>> {
  const claimed = await claim(options)
  if (claimed.status === 'already-running') {
    console.log(sayClaim(claimed))
    process.exit(0)
  }
  if (claimed.status === 'nowhere') {
    console.error(sayClaim(claimed))
    process.exit(1)
  }
  if (claimed.moved) console.log(sayClaim(claimed))
  return claimed
}

/**
 * Write down the address a server ACTUALLY bound, once it is listening, for a dev server and a built
 * one alike. Another folder that the app runs this module from is not taken over (see `takesOver`):
 * this copy answers and says why it was not registered. Whoever started last wins, and the losing
 * entry is named rather than overwritten in silence.
 */
export function registerBound(id: string, origin: string, here: string): void {
  const may = takesOver(id, here)
  if (!may.ok) {
    console.log(
      `${id} answers at ${origin} and was NOT registered: the app runs ${id} from ${may.held.dir}, and a copy `
        + 'started from another folder does not take that over. `bun run register` here would.',
    )
    return
  }
  const written = registerAt({ id, origin, dir: here })
  console.log(`${id} registered: ${written.file} -> ${origin}`)
  if (written.was) console.log(`  (was ${written.was.url}${written.was.dir ? ` in ${written.was.dir}` : ''})`)
}
