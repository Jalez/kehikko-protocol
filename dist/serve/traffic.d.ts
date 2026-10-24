import { type TrafficCache, type TrafficNote, type TrafficNoteResult } from '../traffic.js';
import { type AskedHost } from './ask.js';
/**
 * A module's server noting its own calls in the host's record of traffic (2.20.0): `trafficNotes`,
 * which wraps `fetch` with a reason, notes a program run or any other call, and sends the notes to
 * the host in batches with `askHost('traffic.note', …)` — the server-to-host path, with its pass.
 * Opt-in: a call the module does not note is not in the record, except as a connection the host
 * sees on the module's processes, "no reason given". Node-only, like the rest of `/serve`. Shapes:
 * `traffic.ts`; design notes: docs/traffic.md.
 */
/** How long notes wait to be sent together, in ms. */
export declare const TRAFFIC_FLUSH_MS = 2000;
/** How many notes wait at most while no host answers; the oldest go first. */
export declare const TRAFFIC_PENDING = 500;
/** One call to note, before it is sanitized: where it went as an address (`to`), never as parts. */
export interface TrafficCallSaid {
    /** A short plain phrase from the call site: "release list", "compile: paper". Null: none to give. */
    reason: string | null;
    /** `GET`, `POST`, `git fetch`, `tectonic`. */
    kind: string;
    /** The address: a URL, a git remote, a host name. Sanitized here (`trafficTarget`). */
    to: string | URL;
    /** When it began, ms since the epoch. Default now. */
    at?: number;
    ms?: number | null;
    status?: number | null;
    ok?: boolean | null;
    bytesIn?: number;
    bytesOut?: number;
    cache?: TrafficCache;
}
export interface TrafficNotesOptions {
    /** This module's id: whose calls they are. Its manifest has to ask for `traffic:report`. */
    module: string;
    env?: Record<string, string | undefined>;
    /** The `fetch` the traced calls go through. Default the global one. */
    fetch?: typeof fetch;
    /** How the notes reach the host. Default `askHost('traffic.note', …)`; the tests replace it. */
    send?: (calls: TrafficNote[]) => Promise<AskedHost<'traffic.note'>>;
    flushMs?: number;
    now?: () => number;
}
export interface TrafficNotes {
    /** `fetch`, noted with `reason`: method, sanitized address, status, time, and the bytes the headers say. Never the body or a header. */
    fetch(reason: string | null, input: string | URL | Request, init?: RequestInit): Promise<Response>;
    /** Note one call made some other way. Dropped when it does not fit the shape. */
    note(call: TrafficCallSaid): void;
    /** Note a program run, when it went over the network (`trafficCommand`): `git fetch`, `gh api`. Anything else is not noted. */
    command(reason: string | null, argv: readonly string[], ran: {
        ms: number;
        code: number | null;
        at?: number;
    }): void;
    /** Send what is waiting now. Null when nothing was waiting. */
    flush(): Promise<AskedHost<'traffic.note'> | null>;
    /** Stop the timer; what is waiting is dropped. */
    stop(): void;
    /** How many notes are waiting to be sent. */
    readonly pending: number;
}
/**
 * The notes of one module's server. Make one per process:
 *
 *     const traffic = trafficNotes({ module: ID })
 *     const response = await traffic.fetch('release list', 'https://api.example.com/releases')
 *     traffic.command('pull the paper', ['git', '-C', dir, 'fetch', 'origin'], { ms, code })
 *
 * Notes are sanitized when they are made and sent together every `flushMs`. A host that is not
 * running keeps them waiting (at most `TRAFFIC_PENDING`); a host that refuses them — the manifest
 * does not ask for `traffic:report`, or the host is older than 2.20.0 — has them dropped. Never throws
 * but where the traced `fetch` itself would.
 */
export declare function trafficNotes(options: TrafficNotesOptions): TrafficNotes;
export type { TrafficNoteResult };
