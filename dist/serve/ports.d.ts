/**
 * Which port this module binds, decided rather than assumed. A taken preferred port means moving
 * (said on stdout, recorded in the registry) rather than dying — except when the occupant answers
 * with THIS module's own id: then it is already running, and nothing starts.
 * Design notes: docs/serving.md.
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
/** The decision, as a function of who is there and nothing else. Pure. */
export declare function verdict(id: string, occupant: Occupant): Verdict;
/**
 * The first port at or after `from` that neither `taken` nor `reserved` claims. Pure. Bounded by
 * `span` and by the top of the port range; returns `null` rather than throwing when none is found.
 */
export declare function search(from: number, taken: (port: number) => boolean, reserved: (port: number) => boolean, span?: number): number | null;
/**
 * Every address a program on this machine can hold a port on and still be reached at `127.0.0.1`
 * (2.97.0). macOS (any BSD) lets a wildcard bind (`[::]`, `0.0.0.0`) and a loopback bind share one
 * port number, and a connection to `127.0.0.1` goes to the more specific of the two. So a port free
 * on `127.0.0.1` alone may be held by another program on `[::]`, and a port this module holds on
 * `127.0.0.1` can still be handed to another program's `[::]` server. Asking all four is how a port
 * is known to be nobody else's. Design notes: docs/serving.md, "Which port".
 */
export declare const ADDRESSES_A_PORT_IS_FREE_ON: readonly string[];
/**
 * The band a module started on any port (`PORT=0`) takes its port from (2.97.0), and the band a host
 * hands ports out of. Below every operating system's temporary range (macOS and Windows 49152–65535,
 * Linux 32768–60999), so a program that asks the system for "any port" is never given one a module
 * holds, and clear of the ports modules prefer (the official list's 7000s and 8000s) and the host's.
 */
export declare const MODULE_PORTS: {
    readonly from: 20000;
    readonly to: 21999;
};
/** Whether `port` is in `MODULE_PORTS`. */
export declare function inModulePorts(port: number): boolean;
/**
 * Whether a port can be bound, asked by binding it and releasing it — on every address in
 * `ADDRESSES_A_PORT_IS_FREE_ON` unless `host` names one (2.97.0; before, `127.0.0.1` alone, which
 * calls a port free that another program holds on `[::]`). An address the machine does not have
 * (no IPv6) is skipped. The port can be taken again before the caller binds it; `serves()` survives
 * that by leaving `strictPort` off.
 */
export declare function free(port: number, host?: string): Promise<boolean>;
export interface ModulePortOptions {
    /** Ports to pass over, e.g. the ones other modules are registered on. */
    taken?: (port: number) => boolean;
    /** Where in the band to start looking. Random by default, so two modules starting together rarely race. */
    start?: number;
    /** Injected by the tests. */
    probe?: (port: number) => Promise<boolean>;
}
/**
 * A port for a module started on any port (2.97.0): the first in `MODULE_PORTS`, from a random
 * place in it and around, that `taken` does not name and that is `free` on every address. `null`
 * when the whole band is held. What `PORT=0` binds — never port 0, which is the system's temporary
 * range, the range another program's "any port" server is given ports from.
 */
export declare function modulePort({ taken, start, probe }?: ModulePortOptions): Promise<number | null>;
/**
 * Ask whoever holds a port what they are, over `node:http` rather than `fetch`. Bounded in time
 * and in bytes: a program that says nothing within `timeoutMs` is a stranger.
 */
export declare function identify(port: number, timeoutMs?: number): Promise<Occupant>;
/**
 * What a document on that port makes the program serving it. Pure. `kind` must be `kehikot.module`
 * before the id counts for anything.
 */
export declare function readManifest(text: string, path?: string): Occupant;
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
 * Decide which port this module should bind. Returns rather than exiting, including in the
 * already-running case; the exit belongs to the caller — see `serves()` in `plugin.ts`, and `sayClaim()`.
 */
export declare function claim({ id, prefer, span, timeoutMs, registry, probes, }: ClaimOptions): Promise<Claimed>;
/** The sentence for each outcome, written once so every module says it the same way. */
export declare function sayClaim(claimed: Claimed): string;
