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
export declare const LOOPBACK = "127.0.0.1";
/** How long a squatter gets to say what it is before it counts as a stranger. */
export declare const IDENTIFY_TIMEOUT_MS = 700;
/** How far up the drift will walk before giving up. See `search`. */
export declare const DRIFT_SPAN = 64;
export declare function originFor(port: number): string;
/** Who is on a port. Three answers, because three different things follow. */
export type Occupant = 
/** Nothing took the socket. */
{
    at: 'free';
}
/** A module answered its manifest and said what it is called. */
 | {
    at: 'module';
    id: string;
}
/** Something is listening and it is not a module — or would not say. */
 | {
    at: 'stranger';
    why: string;
};
/** What to do about it. Pure, and the whole of the decision. */
export type Verdict = {
    take: 'preferred';
} | {
    take: 'nothing';
    because: 'already-running';
} | {
    take: 'another';
    because: string;
};
/**
 * The decision, as a function of who is there and nothing else.
 *
 * Split out from `claim` because everything else in that function is a socket, a
 * timeout or a filesystem, and a rule about WHAT TO DO tested through three of
 * those is a rule nobody will change with confidence later. This part is a
 * table; it is tested as one.
 */
export declare function verdict(id: string, occupant: Occupant): Verdict;
/**
 * The first port at or after `from` that neither `taken` nor `reserved` claims.
 *
 * Pure over its two predicates so the walk itself can be tested without binding
 * a socket. Bounded by `span` and by the top of the port range, and it returns
 * `null` rather than throwing: a caller who has walked sixty-four consecutive
 * occupied ports is not in a situation any exception message improves, and the
 * one sentence worth printing belongs to whoever knows the module's name.
 */
export declare function search(from: number, taken: (port: number) => boolean, reserved: (port: number) => boolean, span?: number): number | null;
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
export declare function free(port: number, host?: string): Promise<boolean>;
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
export declare function identify(port: number, timeoutMs?: number): Promise<Occupant>;
/**
 * What a document on that port makes the program serving it. Pure.
 *
 * The `kind` word is checked before the id, which is the whole reason that word
 * exists: a JSON document that does not say `roadmap.module` is not a manifest
 * however many of the other fields it happens to have, and a program with an
 * `id` field is not thereby a module. Without that check a module could be
 * talked out of starting by any JSON server that happened to have an `id`.
 */
export declare function readManifest(text: string): Occupant;
export interface ClaimOptions {
    id: string;
    prefer: number;
    /** How far the drift may walk. */
    span?: number;
    /** How long a squatter gets to identify itself. */
    timeoutMs?: number;
    /** The registry to read neighbours' claims from. Defaults to the one the host sweeps. */
    registry?: string;
    /** Injected by the tests, so the decision can be exercised without real sockets. */
    probes?: {
        free?: typeof free;
        identify?: typeof identify;
    };
}
/** What `claim` concluded. `moved` is the one field a caller usually branches on. */
export type Claimed = {
    status: 'claimed';
    id: string;
    prefer: number;
    port: number;
    origin: string;
    moved: boolean;
    /** Why it moved, in the words a person is shown. `null` when it did not. */
    why: string | null;
} | {
    status: 'already-running';
    id: string;
    prefer: number;
    port: number;
    origin: string;
    moved: false;
    why: string;
} | {
    status: 'nowhere';
    id: string;
    prefer: number;
    moved: false;
    why: string;
};
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
export declare function claim({ id, prefer, span, timeoutMs, registry, probes, }: ClaimOptions): Promise<Claimed>;
/**
 * The sentence, written once so every module says it the same way.
 *
 * Loud on purpose. A drift that scrolled past in the same grey as everything
 * else would be a module answering somewhere nobody looks, which is the cost of
 * drifting and the only part of it a person can act on.
 */
export declare function sayClaim(claimed: Claimed): string;
//# sourceMappingURL=ports.d.ts.map