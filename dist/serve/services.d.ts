import { type Service, type ServiceDescriptor } from '../services.js';
import { type NeighbourOptions } from './neighbours.js';
/**
 * 2.83.0. Using a service from a module's SERVER, and proving who calls one. Node-only, like the rest of
 * `/serve`. The shapes are `services.ts`; design notes: docs/services.md.
 *
 * - `findService`: who provides a service here (`services.find`, asked of the host), the first whose
 *   descriptor parses, or why there is none.
 * - `callServiceTool`: a tool the descriptor names, on the provider's MCP door — found by the module id
 *   the host answered, never by one the consumer spells.
 * - `fetchService`: a route the descriptor names, on the provider's own origin.
 * - `vouchCaller`: on the provider's side, which module's server sent this request, proved by a pass the
 *   caller minted and confirms at its registered origin. Both calls above carry one.
 */
/** A provider found: its id (as the host answered it), its registered name, whether placed, and its descriptor parsed. */
export type FoundService<S extends Service> = {
    module: string;
    name: string;
    placed: boolean | null;
    descriptor: ServiceDescriptor<S>;
};
export interface FindServiceOptions {
    /** This module's id: who asks. */
    module: string;
    /** The project the question is about, when it is about one (then `kehikko` is a kehikko of it). */
    project?: string;
    kehikko?: string;
    env?: Record<string, string | undefined>;
    timeoutMs?: number;
    fetch?: typeof fetch;
}
/**
 * The first provider of a service here whose descriptor parses, or why there is none (a sentence that
 * names no module). With `kehikko`, a placed provider comes first. Never throws.
 */
export declare function findService<S extends Service>(service: S, options: FindServiceOptions): Promise<{
    ok: true;
    provider: FoundService<S>;
} | {
    ok: false;
    why: string;
}>;
export interface CallServiceOptions extends NeighbourOptions {
    /** This module's id: who calls. Sent with a pass it minted, so the provider can tell (`vouchCaller`). */
    from: string;
    /** How long the call gets, in ms. Default 60 s. */
    callTimeoutMs?: number;
}
/** The headers that say who calls: this module's id and a fresh pass. */
export declare function callerHeaders(from: string): Record<string, string>;
/**
 * One tool on a provider's MCP door, by the name its descriptor gives: `ok` and the text of the
 * result, or `ok: false` and a sentence. `module` is the id `findService` answered. Never throws.
 */
export declare function callServiceTool(module: string, tool: string, args: Record<string, unknown>, options: CallServiceOptions): Promise<{
    ok: boolean;
    text: string;
}>;
/**
 * A route a descriptor names (`/api/…`), on the provider's registered origin, with who calls in the
 * headers. The response, or a sentence when there is none. Never throws.
 */
export declare function fetchService(module: string, path: string, init: RequestInit, options: CallServiceOptions): Promise<{
    ok: true;
    response: Response;
} | {
    ok: false;
    why: string;
}>;
/** A request's headers as a reader: a `Headers`, or node's record. */
type HeaderBag = Headers | Record<string, string | string[] | undefined>;
export interface VouchOptions {
    registry?: string;
    timeoutMs?: number;
    fetch?: typeof fetch;
}
/**
 * Which module's server sent this request, or why that is not known: its id from
 * `SERVICE_CALLER_HEADER`, proved by asking it at its REGISTERED origin whether it minted the pass in
 * `SERVICE_PASS_HEADER` (spent by the asking). A page, an agent or any program that is not that module's
 * running server cannot pass. Never throws.
 */
export declare function vouchCaller(headers: HeaderBag, options?: VouchOptions): Promise<{
    ok: true;
    module: string;
} | {
    ok: false;
    why: string;
}>;
export interface VouchHostOptions {
    env?: Record<string, string | undefined>;
    timeoutMs?: number;
    fetch?: typeof fetch;
}
/**
 * 2.88.0. Whether this request came from the HOST's server: `SERVICE_CALLER_HEADER` is `HOST_CALLER`,
 * and the host, asked at its own origins (`KEHIKOT_ORIGINS`, loopback only) at `HOST_PASS_PATH`, says it
 * minted the pass in `SERVICE_PASS_HEADER` (spent by the asking). What a provider holds its host-only
 * service routes to (`conversations.finder`, `agent.tasks`). Never throws.
 */
export declare function vouchHost(headers: HeaderBag, options?: VouchHostOptions): Promise<{
    ok: true;
} | {
    ok: false;
    why: string;
}>;
/** What a module's slow start came to: the conversation it started, or why not, in words for the person. */
export type TaskStarting = {
    ok: true;
    conversation: string;
} | {
    ok: false;
    why: string;
};
export interface AcceptTaskOptions {
    /** This module's id: who reports. */
    module: string;
    /** A line for the module's log, when it has one. */
    log?: (line: string) => void;
    env?: Record<string, string | undefined>;
    fetch?: typeof fetch;
}
/**
 * 2.99.0. `agent.tasks`' `start`, the shape every agent module answers it in: ACCEPT at once (`started`,
 * `session` = `handle`, `pending: true`) and run `starting` after the answer has gone; what it came to
 * is reported to the host with `tasks.report` — `started` with the conversation's id, or `failed` with
 * why (a throw is a failure, in its message). Never throws; the report is best effort, logged when the
 * host did not take it.
 *
 * Checks that can be made at once (the body, the project, that the program is installed) belong BEFORE
 * this, as a `declined` answer: the person is told at once rather than through the Inbox.
 */
export declare function acceptTask(handle: string, starting: () => Promise<TaskStarting>, options: AcceptTaskOptions): {
    outcome: 'started';
    session: string;
    why: string;
    pending: true;
};
export {};
