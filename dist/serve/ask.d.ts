import { type ServerAskRefusal, type ServerMethod } from '../server-ask.js';
import type { TrackerColumns, TrackerReading } from '../tracker.js';
import type { TrafficNoteResult, TrafficReadResult } from '../traffic.js';
import type { DispositionsGetResult, EpicsListResult, PartsGetResult } from '../methods.js';
import type { StepsListResult } from '../plan.js';
import type { MessageReadResult, MessageSendResult } from '../agent-messages.js';
import type { Reply } from './doors.js';
/** A new pass for one question, good once for `LIMITS.SERVER_PASS_MS`. `askHost` mints its own. */
export declare function mintServerPass(now?: number): string;
/** Whether this process minted `pass` and it is still good; spent by asking, so a second ask says no. */
export declare function spendServerPass(pass: string | null | undefined, now?: number): boolean;
/**
 * The doors' answer at `SERVER_PASS_PATH`, or null for any other path. Mounted by `doorsFetch` and
 * `doorsHandler` for every module, before its own `answer`.
 */
export declare function serverPassReply(method: string, path: string, query: URLSearchParams): Reply | null;
/** The URLs `askHost` posts to, in order. Pure; exported for tests. */
export declare function hostAskUrls(env?: Record<string, string | undefined>): string[];
/** What each method a server may ask is answered with. */
export interface ServerAnswers {
    'tracker.get': TrackerReading;
    'tracker.columns': TrackerColumns;
    'traffic.read': TrafficReadResult;
    'traffic.note': TrafficNoteResult;
    /** 2.21.0. The project's epics. */
    'epics.list': EpicsListResult;
    /** 2.21.0. One epic, as the host keeps it: its own material, which the protocol gives no shape. */
    'epic.get': Record<string, unknown>;
    /** 2.21.0. Every provider's steps for the epic (`plansUnion`). */
    'steps.list': StepsListResult;
    /** 2.21.0. The epic's parts, with what the modules hold. */
    'parts.get': PartsGetResult;
    /** 2.21.0. The project's dispositions. */
    'dispositions.get': DispositionsGetResult;
    /** 2.41.0. What became of a message. */
    'messages.send': MessageSendResult;
    /** 2.41.0. The messages a session may read. */
    'messages.read': MessageReadResult;
}
/**
 * What came of one question. `ok: true`: the host's answer, held to the method's result schema.
 * `ok: false`: `why`, a sentence; `refused` when the host would not take it from this module or about
 * this project (see `SERVER_ASK_REFUSALS`); `reason` when a host answered with a refusal; neither when
 * no host answered at all.
 */
export type AskedHost<M extends ServerMethod> = {
    ok: true;
    data: ServerAnswers[M];
} | {
    ok: false;
    why: string;
    reason?: 'unknown-module' | 'unknown-method' | 'failed';
    refused?: ServerAskRefusal;
    /**
     * 2.22.0. `host-too-old`: the host does not answer this method yet, and `since` is the version
     * that does (`SERVER_METHOD_SINCE`). Read it with `hostTooOld`; show `FIT_SAYS.tooOld(since)`.
     */
    declined?: 'host-too-old';
    since?: string | null;
};
export interface AskHostOptions {
    /** This module's id: who asks. Its manifest is what the host holds the call to. */
    module: string;
    /**
     * The project the question is about: its absolute folder (`resolveDoorProject`, `resolveDoorPlace`).
     * Left out for a question about this computer rather than a project (`traffic.*`, 2.20.0).
     */
    project?: string;
    env?: Record<string, string | undefined>;
    /** How long each host gets, in ms. Default `LIMITS.SERVER_ASK_MS`. */
    timeoutMs?: number;
    /** Injected by the tests. */
    fetch?: typeof fetch;
}
/** What a module's server is told when no host on this machine answered. */
export declare const NO_HOST_TO_ASK = "No Kehikot host answered, so there is nothing to read: Kehikot is not running, or not on the origins this module was given.";
/**
 * Ask the host one question from a module's server, and get what its page would get:
 *
 *     const read = await askHost('tracker.get', { epic, parts: true }, { module: ID, project })
 *     if (read.ok) read.data.rows
 *
 * Asks each origin of `KEHIKOT_ORIGINS` in turn, with a pass minted for that ask, and takes the first
 * that answers it; a host that does not hold the project or does not know the module is passed over
 * for the next. Never throws.
 */
export declare function askHost<M extends ServerMethod>(method: M, params: Record<string, unknown>, options: AskHostOptions): Promise<AskedHost<M>>;
