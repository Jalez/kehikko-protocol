import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { WELL_KNOWN } from '../constants.js';
import { doorToolSchema } from '../door.js';
import { MODULE_ID, canonicalModuleId } from '../ids.js';
import { LIMITS } from '../limits.js';
import { manifestSchema } from '../manifest.js';
import { readRegistration, registrationBeforeRename, registryDir } from './registry.js';
/**
 * Another module, as this one can learn of it: where the registry says it answers, and what its
 * manifest says when asked there — its name, what it reacts to, and where its MCP door is. For a
 * module's SERVER; a page asks its own server. Reads the registry and one loopback address, and
 * writes nothing. Design notes: docs/asking.md.
 */
/** How long a neighbour gets to hand over its manifest, or its list of tools, in ms. */
export const NEIGHBOUR_TIMEOUT_MS = 1500;
async function get(url, init, options) {
    const control = new AbortController();
    const timer = setTimeout(() => control.abort(), options.timeoutMs ?? NEIGHBOUR_TIMEOUT_MS);
    try {
        return await (options.fetch ?? fetch)(url, { ...init, signal: control.signal });
    }
    finally {
        clearTimeout(timer);
    }
}
/**
 * One registered module, by id: its registration read, and its manifest asked for where that says
 * it answers. Never throws. A manifest that names another id is `unreadable`: the registration is
 * a hint, and only an answer carrying this id is this module.
 */
export async function readNeighbour(id, options = {}) {
    if (!MODULE_ID.test(id))
        return { found: false, id, why: 'unregistered', sentence: `"${id.slice(0, 80)}" is not a module id.` };
    const where = options.registry ?? registryDir();
    const before = registrationBeforeRename(id);
    const registration = readRegistration(join(where, `${id}.json`)) ?? (before ? readRegistration(join(where, before)) : null);
    if (!registration)
        return { found: false, id, why: 'unregistered', sentence: `${id} is not registered on this computer.` };
    let origin;
    try {
        origin = new URL(registration.url).origin;
    }
    catch {
        return { found: false, id, why: 'unregistered', sentence: `${id} is registered at an address that is not a URL.` };
    }
    let text;
    try {
        const response = await get(`${origin}${WELL_KNOWN}`, { headers: { accept: 'application/json' } }, options);
        if (!response.ok)
            return { found: false, id, why: 'unreadable', sentence: `${origin} answered ${response.status} when asked for ${id}'s manifest.` };
        text = await response.text();
    }
    catch {
        return { found: false, id, why: 'silent', sentence: `${id} is registered at ${origin} and nothing answered there. It is not running.` };
    }
    if (text.length > LIMITS.MANIFEST_BYTES)
        return { found: false, id, why: 'unreadable', sentence: `${origin} sent more than a manifest.` };
    let parsed;
    try {
        parsed = manifestSchema.safeParse(JSON.parse(text));
    }
    catch {
        return { found: false, id, why: 'unreadable', sentence: `${origin} did not answer with a manifest.` };
    }
    if (!parsed.success)
        return { found: false, id, why: 'unreadable', sentence: `${origin} answered with a manifest this version of the protocol cannot read.` };
    if (canonicalModuleId(parsed.data.id) !== canonicalModuleId(id)) {
        return { found: false, id, why: 'unreadable', sentence: `${origin} is ${parsed.data.id}, not ${id}.` };
    }
    return { found: true, id, origin, manifest: parsed.data, door: doorOf(parsed.data, origin) };
}
/** A manifest's MCP door as an absolute URL on `origin`, or `null` for none, for stdio, and for one that leaves the origin. Pure. */
export function doorOf(manifest, origin) {
    if (!manifest.mcp || manifest.mcp.transport === 'stdio')
        return null;
    try {
        const door = new URL(manifest.mcp.url, origin);
        return door.origin === new URL(origin).origin ? door.href : null;
    }
    catch {
        return null;
    }
}
/** Every registered module, each read as `readNeighbour` reads one, in id order. `except` leaves one out: the caller. */
export async function readNeighbours(options = {}) {
    const where = options.registry ?? registryDir();
    let names;
    try {
        names = readdirSync(where);
    }
    catch {
        return [];
    }
    const ids = new Set();
    for (const name of names) {
        if (!name.endsWith('.json'))
            continue;
        const id = canonicalModuleId(name.slice(0, -'.json'.length));
        if (MODULE_ID.test(id) && id !== (options.except ? canonicalModuleId(options.except) : null))
            ids.add(id);
    }
    return Promise.all([...ids].sort().map((id) => readNeighbour(id, options)));
}
const toolsReply = z.object({ result: z.object({ tools: z.array(doorToolSchema) }) });
/**
 * The tools a door lists (`tools/list`), each as `doorToolSchema` reads it, or `null` when the
 * door did not answer with a list. One JSON-RPC POST; nothing is called. Never throws.
 */
export async function listTools(door, options = {}) {
    try {
        const response = await get(door, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
        }, options);
        if (!response.ok)
            return null;
        const parsed = toolsReply.safeParse(await response.json());
        return parsed.success ? parsed.data.result.tools : null;
    }
    catch {
        return null;
    }
}
