import { get as httpGet } from 'node:http'
import { createServer } from 'node:net'
import { join } from 'node:path'

import { MANIFEST_KIND, WELL_KNOWN } from '../constants.js'
import { neighbourPorts, portOf, readRegistration, registryDir } from './registry.js'

/**
 * Which port this module binds, decided rather than assumed. A taken preferred port means moving
 * (said on stdout, recorded in the registry) rather than dying — except when the occupant answers
 * with THIS module's own id: then it is already running, and nothing starts.
 * Design notes: docs/serving.md.
 */

/** Loopback, and only loopback. A module is a program on this machine. */
export const LOOPBACK = '127.0.0.1'

/** How long a squatter gets to say what it is before it counts as a stranger. */
export const IDENTIFY_TIMEOUT_MS = 700

/** How far up the drift will walk before giving up. See `search`. */
export const DRIFT_SPAN = 64

/** As much of a stranger's document as is worth reading to find one field. */
const MANIFEST_PEEK_BYTES = 64 * 1024

export function originFor(port: number): string {
  return `http://${LOOPBACK}:${port}`
}

/** Who is on a port. Three answers, because three different things follow. */
export type Occupant =
  /** Nothing took the socket. */
  | { at: 'free' }
  /** A module answered its manifest and said what it is called. */
  | { at: 'module'; id: string }
  /** Something is listening and it is not a module — or would not say. */
  | { at: 'stranger'; why: string }

/** What to do about it. Pure, and the whole of the decision. */
export type Verdict =
  | { take: 'preferred' }
  | { take: 'nothing'; because: 'already-running' }
  | { take: 'another'; because: string }

/** The decision, as a function of who is there and nothing else. Pure. */
export function verdict(id: string, occupant: Occupant): Verdict {
  if (occupant.at === 'free') return { take: 'preferred' }
  if (occupant.at === 'module' && occupant.id === id) return { take: 'nothing', because: 'already-running' }
  if (occupant.at === 'module') return { take: 'another', because: `${occupant.id} is answering there` }
  return { take: 'another', because: occupant.why }
}

/**
 * The first port at or after `from` that neither `taken` nor `reserved` claims. Pure. Bounded by
 * `span` and by the top of the port range; returns `null` rather than throwing when none is found.
 */
export function search(
  from: number,
  taken: (port: number) => boolean,
  reserved: (port: number) => boolean,
  span = DRIFT_SPAN,
): number | null {
  for (let port = from; port < from + span && port <= 65535; port++) {
    if (!taken(port) && !reserved(port)) return port
  }
  return null
}

/**
 * Every address a program on this machine can hold a port on and still be reached at `127.0.0.1`
 * (2.97.0). macOS (any BSD) lets a wildcard bind (`[::]`, `0.0.0.0`) and a loopback bind share one
 * port number, and a connection to `127.0.0.1` goes to the more specific of the two. So a port free
 * on `127.0.0.1` alone may be held by another program on `[::]`, and a port this module holds on
 * `127.0.0.1` can still be handed to another program's `[::]` server. Asking all four is how a port
 * is known to be nobody else's. Design notes: docs/serving.md, "Which port".
 */
export const ADDRESSES_A_PORT_IS_FREE_ON: readonly string[] = [LOOPBACK, '::1', '0.0.0.0', '::']

/**
 * The band a module started on any port (`PORT=0`) takes its port from (2.97.0), and the band a host
 * hands ports out of. Below every operating system's temporary range (macOS and Windows 49152–65535,
 * Linux 32768–60999), so a program that asks the system for "any port" is never given one a module
 * holds, and clear of the ports modules prefer (the official list's 7000s and 8000s) and the host's.
 */
export const MODULE_PORTS = { from: 20000, to: 21999 } as const

/** Whether `port` is in `MODULE_PORTS`. */
export function inModulePorts(port: number): boolean {
  return Number.isInteger(port) && port >= MODULE_PORTS.from && port <= MODULE_PORTS.to
}

/** The errors that say an address does not exist here (no IPv6 loopback), rather than that it is held. */
const NO_SUCH_ADDRESS = new Set(['EADDRNOTAVAIL', 'EAFNOSUPPORT', 'EPROTONOSUPPORT'])

function bindsOn(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    /* A connection that arrives while the probe listens (somebody polling the port) is dropped:
       `close` waits for every connection to end, and one left open would hold the probe forever. */
    const probe = createServer({ pauseOnConnect: true }, (socket) => socket.destroy())
    probe.once('error', (error: NodeJS.ErrnoException) => resolve(NO_SUCH_ADDRESS.has(error.code ?? '') && host !== LOOPBACK))
    probe.once('listening', () => probe.close(() => resolve(true)))
    /* `ipv6Only` off: `[::]` is the dual-stack wildcard, as another program's server binds it. */
    probe.listen({ port, host, ipv6Only: false, exclusive: true })
  })
}

/**
 * Whether a port can be bound, asked by binding it and releasing it — on every address in
 * `ADDRESSES_A_PORT_IS_FREE_ON` unless `host` names one (2.97.0; before, `127.0.0.1` alone, which
 * calls a port free that another program holds on `[::]`). An address the machine does not have
 * (no IPv6) is skipped. The port can be taken again before the caller binds it; `serves()` survives
 * that by leaving `strictPort` off.
 */
export async function free(port: number, host?: string): Promise<boolean> {
  for (const address of host === undefined ? ADDRESSES_A_PORT_IS_FREE_ON : [host]) {
    if (!(await bindsOn(port, address))) return false
  }
  return true
}

export interface ModulePortOptions {
  /** Ports to pass over, e.g. the ones other modules are registered on. */
  taken?: (port: number) => boolean
  /** Where in the band to start looking. Random by default, so two modules starting together rarely race. */
  start?: number
  /** Injected by the tests. */
  probe?: (port: number) => Promise<boolean>
}

/**
 * A port for a module started on any port (2.97.0): the first in `MODULE_PORTS`, from a random
 * place in it and around, that `taken` does not name and that is `free` on every address. `null`
 * when the whole band is held. What `PORT=0` binds — never port 0, which is the system's temporary
 * range, the range another program's "any port" server is given ports from.
 */
export async function modulePort({ taken = () => false, start, probe = free }: ModulePortOptions = {}): Promise<number | null> {
  const size = MODULE_PORTS.to - MODULE_PORTS.from + 1
  const first = start !== undefined && inModulePorts(start) ? start - MODULE_PORTS.from : Math.floor(Math.random() * size)
  for (let i = 0; i < size; i++) {
    const port = MODULE_PORTS.from + ((first + i) % size)
    if (taken(port)) continue
    if (await probe(port)) return port
  }
  return null
}

/**
 * Ask whoever holds a port what they are, over `node:http` rather than `fetch`. Bounded in time
 * and in bytes: a program that says nothing within `timeoutMs` is a stranger.
 */
export async function identify(port: number, timeoutMs = IDENTIFY_TIMEOUT_MS): Promise<Occupant> {
  return peek(port, WELL_KNOWN, timeoutMs)
}

function peek(port: number, path: string, timeoutMs: number): Promise<Occupant> {
  return new Promise((resolve) => {
    let settled = false
    const done = (occupant: Occupant) => {
      if (settled) return
      settled = true
      resolve(occupant)
    }

    const request = httpGet(
      { host: LOOPBACK, port, path, headers: { accept: 'application/json' }, timeout: timeoutMs },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume()
          return done({ at: 'stranger', why: `something answered ${response.statusCode} at ${path}` })
        }
        let text = ''
        response.setEncoding('utf8')
        response.on('data', (chunk: string) => {
          text += chunk
          if (text.length > MANIFEST_PEEK_BYTES) {
            request.destroy()
            done({ at: 'stranger', why: `something is serving more than ${MANIFEST_PEEK_BYTES} bytes at ${path}` })
          }
        })
        response.on('end', () => done(readManifest(text, path)))
        response.on('error', () => done({ at: 'stranger', why: 'something took the port and then dropped the connection' }))
      },
    )

    request.on('timeout', () => {
      request.destroy()
      done({ at: 'stranger', why: `something took the port and did not answer within ${timeoutMs}ms` })
    })
    /* Only ever called after `free()` said no, so an error here is a program that was there a
       moment ago: a stranger. */
    request.on('error', () => done({ at: 'stranger', why: 'something took the port and would not talk' }))
  })
}

/**
 * What a document on that port makes the program serving it. Pure. `kind` must be `kehikot.module`
 * before the id counts for anything.
 */
export function readManifest(text: string, path: string = WELL_KNOWN): Occupant {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { at: 'stranger', why: `something is serving a non-JSON document at ${path}` }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { at: 'stranger', why: `something is serving JSON that is not a manifest at ${path}` }
  }
  const { kind, id } = parsed as { kind?: unknown; id?: unknown }
  if (kind !== MANIFEST_KIND || typeof id !== 'string') {
    return { at: 'stranger', why: `something is serving a document that does not call itself ${MANIFEST_KIND}` }
  }
  return { at: 'module', id }
}

export interface ClaimOptions {
  id: string
  prefer: number
  /** How far the drift may walk. */
  span?: number
  /** How long a squatter gets to identify itself. */
  timeoutMs?: number
  /** The registry to read neighbours' claims from. Defaults to the one the host sweeps. */
  registry?: string
  /** Injected by the tests, so the decision can be exercised without real sockets. */
  probes?: { free?: typeof free; identify?: typeof identify }
}

/** What `claim` concluded. `moved` is the one field a caller usually branches on. */
export type Claimed =
  | {
      status: 'claimed'
      id: string
      prefer: number
      port: number
      origin: string
      moved: boolean
      /** Why it moved, in the words a person is shown. `null` when it did not. */
      why: string | null
    }
  | {
      status: 'already-running'
      id: string
      prefer: number
      port: number
      origin: string
      moved: false
      why: string
    }
  | {
      status: 'nowhere'
      id: string
      prefer: number
      moved: false
      why: string
    }

/**
 * Decide which port this module should bind. Returns rather than exiting, including in the
 * already-running case; the exit belongs to the caller — see `serves()` in `plugin.ts`, and `sayClaim()`.
 */
export async function claim({
  id,
  prefer,
  span = DRIFT_SPAN,
  timeoutMs = IDENTIFY_TIMEOUT_MS,
  registry = registryDir(),
  probes = {},
}: ClaimOptions): Promise<Claimed> {
  const isFree = probes.free ?? free
  const ask = probes.identify ?? identify

  /* The common case, and deliberately the cheapest: no manifest fetched, no registry read, no
     message printed. */
  if (await isFree(prefer)) {
    return { status: 'claimed', id, prefer, port: prefer, origin: originFor(prefer), moved: false, why: null }
  }

  const said = verdict(id, await ask(prefer, timeoutMs))

  if (said.take === 'nothing') {
    return {
      status: 'already-running',
      id,
      prefer,
      port: prefer,
      origin: originFor(prefer),
      moved: false,
      why: `${id} is already answering at ${originFor(prefer)}`,
    }
  }

  /* `take === 'preferred'` cannot be reached here: `verdict` only says it for a free port. The
     fallback sentence keeps this drifting rather than crashing if an occupant is ever added. */
  const because = said.take === 'another' ? said.because : `something is listening on ${prefer}`

  /**
   * Before drifting: is this module already answering where its registration last said it was?
   * The registration is a hint, never an authority — only an answer carrying THIS id stops the start.
   */
  const mine = portOf(readRegistration(join(registry, `${id}.json`))?.url ?? '')
  if (mine !== null && mine !== prefer && !(await isFree(mine))) {
    const there = await ask(mine, timeoutMs)
    if (there.at === 'module' && there.id === id) {
      return {
        status: 'already-running',
        id,
        prefer,
        port: mine,
        origin: originFor(mine),
        moved: false,
        why: `${id} is already answering at ${originFor(mine)}, where it moved to last time`,
      }
    }
  }

  const reserved = neighbourPorts(id, registry)
  let port: number | null = null
  for (let candidate = prefer + 1; candidate < prefer + span && candidate <= 65535; candidate++) {
    if (reserved.has(candidate)) continue
    if (await isFree(candidate)) {
      port = candidate
      break
    }
  }

  if (port === null) {
    return {
      status: 'nowhere',
      id,
      prefer,
      moved: false,
      why: `${because}, and nothing between ${prefer + 1} and ${prefer + span - 1} was free either`,
    }
  }

  return { status: 'claimed', id, prefer, port, origin: originFor(port), moved: true, why: because }
}

/** The sentence for each outcome, written once so every module says it the same way. */
export function sayClaim(claimed: Claimed): string {
  switch (claimed.status) {
    case 'already-running':
      return `${claimed.id} is already running at ${claimed.origin}. Nothing started; use the one that is there.`
    case 'nowhere':
      return `${claimed.id} could not find a free port: ${claimed.why}`
    default:
      return claimed.moved
        ? `PORT MOVED: ${claimed.prefer} was taken (${claimed.why}). ${claimed.id} is at ${claimed.origin} instead.`
        : `${claimed.id} at ${claimed.origin}`
  }
}
