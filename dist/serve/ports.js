import { get as httpGet } from 'node:http';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { LEGACY_MANIFEST_KIND, LEGACY_WELL_KNOWN, MANIFEST_KIND, WELL_KNOWN } from '../constants.js';
import { canonicalName, legacyName } from '../dialect.js';
import { neighbourPorts, portOf, readRegistration, registryDir } from './registry.js';
/**
 * Which port this module binds, decided rather than assumed. A taken preferred port means moving
 * (said on stdout, recorded in the registry) rather than dying — except when the occupant answers
 * with THIS module's own id: then it is already running, and nothing starts.
 * Design notes: docs/serving.md.
 */
/** Loopback, and only loopback. A module is a program on this machine. */
export const LOOPBACK = '127.0.0.1';
/** How long a squatter gets to say what it is before it counts as a stranger. */
export const IDENTIFY_TIMEOUT_MS = 700;
/** How far up the drift will walk before giving up. See `search`. */
export const DRIFT_SPAN = 64;
/** As much of a stranger's document as is worth reading to find one field. */
const MANIFEST_PEEK_BYTES = 64 * 1024;
export function originFor(port) {
    return `http://${LOOPBACK}:${port}`;
}
/** The decision, as a function of who is there and nothing else. Pure. */
export function verdict(id, occupant) {
    if (occupant.at === 'free')
        return { take: 'preferred' };
    if (occupant.at === 'module' && occupant.id === canonicalName(id))
        return { take: 'nothing', because: 'already-running' };
    if (occupant.at === 'module')
        return { take: 'another', because: `${occupant.id} is answering there` };
    return { take: 'another', because: occupant.why };
}
/**
 * The first port at or after `from` that neither `taken` nor `reserved` claims. Pure. Bounded by
 * `span` and by the top of the port range; returns `null` rather than throwing when none is found.
 */
export function search(from, taken, reserved, span = DRIFT_SPAN) {
    for (let port = from; port < from + span && port <= 65535; port++) {
        if (!taken(port) && !reserved(port))
            return port;
    }
    return null;
}
/**
 * Whether a port can be bound, asked by binding it and releasing it. The port can be taken again
 * before the caller binds it; `serves()` survives that by leaving `strictPort` off.
 */
export function free(port, host = LOOPBACK) {
    return new Promise((resolve) => {
        const probe = createServer();
        probe.once('error', () => resolve(false));
        probe.once('listening', () => probe.close(() => resolve(true)));
        probe.listen(port, host);
    });
}
/**
 * Ask whoever holds a port what they are, over `node:http` rather than `fetch`. Bounded in time
 * and in bytes: a program that says nothing within `timeoutMs` is a stranger.
 */
export async function identify(port, timeoutMs = IDENTIFY_TIMEOUT_MS) {
    /* The current path first, then the pre-rename one — but only after a plain 404, so a module
       answering the first path is asked once. */
    const first = await peek(port, WELL_KNOWN, timeoutMs);
    if (first.at !== 'stranger' || !first.notHere)
        return strip(first);
    return strip(await peek(port, LEGACY_WELL_KNOWN, timeoutMs));
}
function strip(occupant) {
    if (occupant.at !== 'stranger')
        return occupant;
    return { at: 'stranger', why: occupant.why };
}
function peek(port, path, timeoutMs) {
    return new Promise((resolve) => {
        let settled = false;
        const done = (occupant) => {
            if (settled)
                return;
            settled = true;
            resolve(occupant);
        };
        const request = httpGet({ host: LOOPBACK, port, path, headers: { accept: 'application/json' }, timeout: timeoutMs }, (response) => {
            if (response.statusCode !== 200) {
                response.resume();
                return done({ at: 'stranger', why: `something answered ${response.statusCode} at ${path}`, notHere: response.statusCode === 404 });
            }
            let text = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => {
                text += chunk;
                if (text.length > MANIFEST_PEEK_BYTES) {
                    request.destroy();
                    done({ at: 'stranger', why: `something is serving more than ${MANIFEST_PEEK_BYTES} bytes at ${path}` });
                }
            });
            response.on('end', () => done(readManifest(text, path)));
            response.on('error', () => done({ at: 'stranger', why: 'something took the port and then dropped the connection' }));
        });
        request.on('timeout', () => {
            request.destroy();
            done({ at: 'stranger', why: `something took the port and did not answer within ${timeoutMs}ms` });
        });
        /* Only ever called after `free()` said no, so an error here is a program that was there a
           moment ago: a stranger. */
        request.on('error', () => done({ at: 'stranger', why: 'something took the port and would not talk' }));
    });
}
/**
 * What a document on that port makes the program serving it. Pure. `kind` must be `kehikot.module`
 * (or `roadmap.module`, its spelling before the rename) before the id counts for anything.
 */
export function readManifest(text, path = WELL_KNOWN) {
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        return { at: 'stranger', why: `something is serving a non-JSON document at ${path}` };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { at: 'stranger', why: `something is serving JSON that is not a manifest at ${path}` };
    }
    const { kind, id } = parsed;
    if ((kind !== MANIFEST_KIND && kind !== LEGACY_MANIFEST_KIND) || typeof id !== 'string') {
        return { at: 'stranger', why: `something is serving a document that does not call itself ${MANIFEST_KIND}` };
    }
    /* Canonical, so a module from before the rename (`roadmap.x`) is recognised
       as the same module as `kehikot.x`. See `dialect.ts`. */
    return { at: 'module', id: canonicalName(id) };
}
/**
 * Decide which port this module should bind. Returns rather than exiting, including in the
 * already-running case; the exit belongs to the caller — see `serves()` in `plugin.ts`, and `sayClaim()`.
 */
export async function claim({ id, prefer, span = DRIFT_SPAN, timeoutMs = IDENTIFY_TIMEOUT_MS, registry = registryDir(), probes = {}, }) {
    const isFree = probes.free ?? free;
    const ask = probes.identify ?? identify;
    /* The common case, and deliberately the cheapest: no manifest fetched, no registry read, no
       message printed. */
    if (await isFree(prefer)) {
        return { status: 'claimed', id, prefer, port: prefer, origin: originFor(prefer), moved: false, why: null };
    }
    const said = verdict(id, await ask(prefer, timeoutMs));
    if (said.take === 'nothing') {
        return {
            status: 'already-running',
            id,
            prefer,
            port: prefer,
            origin: originFor(prefer),
            moved: false,
            why: `${id} is already answering at ${originFor(prefer)}`,
        };
    }
    /* `take === 'preferred'` cannot be reached here: `verdict` only says it for a free port. The
       fallback sentence keeps this drifting rather than crashing if an occupant is ever added. */
    const because = said.take === 'another' ? said.because : `something is listening on ${prefer}`;
    /**
     * Before drifting: is this module already answering where its registration last said it was?
     * The registration is a hint, never an authority — only an answer carrying THIS id stops the start.
     */
    const mine = portOf((readRegistration(join(registry, `${id}.json`)) ?? readRegistration(join(registry, `${legacyName(id)}.json`)))?.url ?? '');
    if (mine !== null && mine !== prefer && !(await isFree(mine))) {
        const there = await ask(mine, timeoutMs);
        if (there.at === 'module' && there.id === canonicalName(id)) {
            return {
                status: 'already-running',
                id,
                prefer,
                port: mine,
                origin: originFor(mine),
                moved: false,
                why: `${id} is already answering at ${originFor(mine)}, where it moved to last time`,
            };
        }
    }
    const reserved = neighbourPorts(id, registry);
    let port = null;
    for (let candidate = prefer + 1; candidate < prefer + span && candidate <= 65535; candidate++) {
        if (reserved.has(candidate))
            continue;
        if (await isFree(candidate)) {
            port = candidate;
            break;
        }
    }
    if (port === null) {
        return {
            status: 'nowhere',
            id,
            prefer,
            moved: false,
            why: `${because}, and nothing between ${prefer + 1} and ${prefer + span - 1} was free either`,
        };
    }
    return { status: 'claimed', id, prefer, port, origin: originFor(port), moved: true, why: because };
}
/** The sentence for each outcome, written once so every module says it the same way. */
export function sayClaim(claimed) {
    switch (claimed.status) {
        case 'already-running':
            return `${claimed.id} is already running at ${claimed.origin}. Nothing started; use the one that is there.`;
        case 'nowhere':
            return `${claimed.id} could not find a free port: ${claimed.why}`;
        default:
            return claimed.moved
                ? `PORT MOVED: ${claimed.prefer} was taken (${claimed.why}). ${claimed.id} is at ${claimed.origin} instead.`
                : `${claimed.id} at ${claimed.origin}`;
    }
}
