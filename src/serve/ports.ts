import { get as httpGet } from 'node:http'
import { createServer } from 'node:net'
import { join } from 'node:path'

import { MANIFEST_KIND, WELL_KNOWN } from '../constants.js'
import { neighbourPorts, portOf, readRegistration, registryDir } from './registry.js'

/**
 * Which port this module binds, decided rather than assumed.
 *
 * ## What this replaces
 *
 * `exec bunx vite --port "${PORT:-7960}" --strictPort`. On a taken port that
 * prints `Error: Port 7960 is already in use` and exits 1, which is a module
 * that does not start because of a program it has nothing to do with. `--host`
 * and `--strictPort` were doing the only thing they could: fail, loudly, and
 * leave the remedy to a person editing two files in one repository and then
 * remembering the registry is now stale.
 *
 * ## Drift, and the argument against failing loudly
 *
 * The choice made here is to MOVE rather than die, and it is a choice with a
 * real cost: a drifted module is not where a person expects it, so
 * `curl 127.0.0.1:7960` answers with somebody else. Two things pay for that.
 * The move is shouted on stdout naming both numbers, and the registry — which is
 * the only thing that decides what the host talks to — is rewritten to the port
 * actually bound. The address a person reads on a module's container is
 * therefore right even when the number in their head is not.
 *
 * The common case is deliberately untouched. If the preferred port is free it is
 * taken, with no probe, no search and no message: somebody typing
 * `curl 127.0.0.1:7960` after starting a module by hand must get their module,
 * and a system that sometimes moved for reasons of its own would have thrown
 * that away to solve a collision that had not happened.
 *
 * ## The one case that must NOT drift
 *
 * If the program already on that port answers the manifest with THIS module's
 * own id, this module is already running, and a second copy is not a fallback —
 * it is a fault. Two copies means two stores writing the same files, two MCP
 * doors a client can be pointed at, two committers on one repository, and a host
 * framing whichever of them the registry happens to name. That state has no
 * symptom that reads as "you started it twice"; it reads as data disappearing.
 *
 * It is also the most common collision here now, because the host starts modules
 * on its own AND a person runs `./run.sh` in a terminal. So it exits, cleanly,
 * with a sentence naming the address — the answer to "start it" when it is
 * already started is "it is already there", not "here is another one".
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

/**
 * The decision, as a function of who is there and nothing else.
 *
 * Split out from `claim` because everything else in that function is a socket, a
 * timeout or a filesystem, and a rule about WHAT TO DO tested through three of
 * those is a rule nobody will change with confidence later. This part is a
 * table; it is tested as one.
 */
export function verdict(id: string, occupant: Occupant): Verdict {
  if (occupant.at === 'free') return { take: 'preferred' }
  if (occupant.at === 'module' && occupant.id === id) return { take: 'nothing', because: 'already-running' }
  if (occupant.at === 'module') return { take: 'another', because: `${occupant.id} is answering there` }
  return { take: 'another', because: occupant.why }
}

/**
 * The first port at or after `from` that neither `taken` nor `reserved` claims.
 *
 * Pure over its two predicates so the walk itself can be tested without binding
 * a socket. Bounded by `span` and by the top of the port range, and it returns
 * `null` rather than throwing: a caller who has walked sixty-four consecutive
 * occupied ports is not in a situation any exception message improves, and the
 * one sentence worth printing belongs to whoever knows the module's name.
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
 * Whether a port can be bound, asked the only way that cannot be wrong.
 *
 * By binding it. A connect-and-see probe answers "nothing is listening", which
 * is a different question — a socket held by another process in a state that
 * refuses connections is still a socket Vite will fail to bind — and the failure
 * that matters here is the bind, so the bind is what is tried.
 *
 * There is a race between this closing and Vite opening, and it is not closed
 * here because it cannot be: the port has to be released before the thing that
 * wants it can take it. It is survived instead — `serves()` leaves `strictPort`
 * off and reads the port back off the listening server, so losing this race
 * costs one number in a log line and nothing else.
 */
export function free(port: number, host = LOOPBACK): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer()
    probe.once('error', () => resolve(false))
    probe.once('listening', () => probe.close(() => resolve(true)))
    probe.listen(port, host)
  })
}

/**
 * Ask whoever holds a port what they are.
 *
 * `node:http` rather than `fetch`, and deliberately. This file is imported by a
 * Vite config, which runs under Node and under Bun and, in this package's own
 * suite, under a preloaded happy-dom that installs a `fetch` of its own. A
 * request to loopback should not depend on which of those three provided the
 * global. `node:http` is the same request in all of them.
 *
 * Bounded in time and in bytes for the reason the host's `fetchManifest` gives:
 * whoever is on that port is a stranger, and a reader with no deadline hangs on
 * a program that accepts a connection and then says nothing.
 */
export function identify(port: number, timeoutMs = IDENTIFY_TIMEOUT_MS): Promise<Occupant> {
  return new Promise((resolve) => {
    let settled = false
    const done = (occupant: Occupant) => {
      if (settled) return
      settled = true
      resolve(occupant)
    }

    const request = httpGet(
      { host: LOOPBACK, port, path: WELL_KNOWN, headers: { accept: 'application/json' }, timeout: timeoutMs },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume()
          return done({ at: 'stranger', why: `something answered ${response.statusCode} at ${WELL_KNOWN}` })
        }
        let text = ''
        response.setEncoding('utf8')
        response.on('data', (chunk: string) => {
          text += chunk
          if (text.length > MANIFEST_PEEK_BYTES) {
            request.destroy()
            done({ at: 'stranger', why: `something is serving more than ${MANIFEST_PEEK_BYTES} bytes at ${WELL_KNOWN}` })
          }
        })
        response.on('end', () => done(readManifest(text)))
        response.on('error', () => done({ at: 'stranger', why: 'something took the port and then dropped the connection' }))
      },
    )

    request.on('timeout', () => {
      request.destroy()
      done({ at: 'stranger', why: `something took the port and did not answer within ${timeoutMs}ms` })
    })
    /* A refused connection means nothing is listening — but `free()` has already
       decided that question, and this is only ever called after it said no. So
       an error here is a program that was there a moment ago, which is a
       stranger for every purpose that follows. */
    request.on('error', () => done({ at: 'stranger', why: 'something took the port and would not talk' }))
  })
}

/**
 * What a document on that port makes the program serving it. Pure.
 *
 * The `kind` word is checked before the id, which is the whole reason that word
 * exists: a JSON document that does not say `roadmap.module` is not a manifest
 * however many of the other fields it happens to have, and a program with an
 * `id` field is not thereby a module. Without that check a module could be
 * talked out of starting by any JSON server that happened to have an `id`.
 */
export function readManifest(text: string): Occupant {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { at: 'stranger', why: `something is serving a non-JSON document at ${WELL_KNOWN}` }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { at: 'stranger', why: `something is serving JSON that is not a manifest at ${WELL_KNOWN}` }
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
 * Decide which port this module should bind.
 *
 * It returns rather than exiting, including in the already-running case, and
 * that is on purpose: a library that calls `process.exit` is a library whose
 * most important branch cannot be tested, and this one has a whole suite aimed
 * at exactly that branch. The exit belongs to the caller who knows it is a
 * program rather than a test — see `serves()` in `plugin.ts`, and `sayClaim()`
 * for the sentence.
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

  /* The common case, and it is deliberately the cheapest one: no manifest
     fetched, no registry read, no message printed. Nothing about starting a
     module on a machine where nothing is wrong should cost a round trip. */
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

  /* `take === 'preferred'` cannot be reached here: `verdict` only says it for a
     free port, and this port was not free. The fallback sentence exists so that
     the rule stays a table `verdict` owns rather than a shape this function
     re-derives — if a fourth occupant is ever added, the compiler asks about it
     there and this keeps drifting rather than crashing. */
  const because = said.take === 'another' ? said.because : `something is listening on ${prefer}`

  /**
   * Before drifting: is this module already answering where it last said it was?
   *
   * This was found by running the thing rather than by thinking about it, and it
   * is the second start after a first one has already drifted. The squatter is
   * still on 7960, so the preferred port is occupied by a stranger, so the
   * already-running check above never fires — and the module walks past its own
   * running copy on 7961 to start a SECOND one on 7962. Two stores, two MCP
   * doors, two committers, which is precisely the state that check exists to
   * make impossible, arriving through the one door it did not cover.
   *
   * So the module's own registration is consulted, and only in the drift path.
   * It costs one file read and one request in a case that is already going
   * slowly, and it costs the common case nothing at all.
   *
   * The registration is a hint and never an authority. It is asked the same
   * question the preferred port was asked, and only an answer carrying THIS id
   * stops the start — a stale file naming a port somebody else now holds says
   * nothing about whether this module is running, and treating it as if it did
   * would be a module refusing to start because of a line in a file.
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

/**
 * The sentence, written once so every module says it the same way.
 *
 * Loud on purpose. A drift that scrolled past in the same grey as everything
 * else would be a module answering somewhere nobody looks, which is the cost of
 * drifting and the only part of it a person can act on.
 */
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
