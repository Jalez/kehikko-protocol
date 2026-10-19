import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { MODULE_ID } from '../ids.js';
/**
 * The one directory a host sweeps for registrations: `KEHIKOT_MODULES_DIR` when set;
 * `~/Library/Application Support/Kehikot/modules` on macOS; `$XDG_DATA_HOME/kehikot/modules`
 * (default `~/.local/share/kehikot/modules`) elsewhere.
 */
export function registryDir(env = process.env) {
    const said = env.KEHIKOT_MODULES_DIR;
    if (said)
        return said;
    const home = env.HOME || homedir();
    if (process.platform === 'darwin')
        return join(home, 'Library', 'Application Support', 'Kehikot', 'modules');
    return join(env.XDG_DATA_HOME || join(home, '.local', 'share'), 'kehikot', 'modules');
}
/**
 * Say where this module answers: write `<id>.json` with `url` and `dir`, the directory a host runs
 * `run.sh` in. Throws when `id` is not a module id. Merged, not replaced: other keys (`keep`)
 * survive. Whoever starts last wins; `was` carries what the file said before, when it differed.
 */
export function registerAt({ id, origin, dir }) {
    /* Refused here rather than joined: a filename derived from an id is a PATH BUILT FROM DATA. */
    if (!MODULE_ID.test(id))
        throw new Error(`"${id}" is not a module id, so there is no registration file to write`);
    const where = registryDir();
    const file = join(where, `${id}.json`);
    const before = readRegistration(file);
    /* Everything already in the file that this function does not manage, `keep: true` above all.
       This owns exactly `url` and `dir`, so the file is merged, not replaced. */
    const kept = readAll(file);
    mkdirSync(where, { recursive: true });
    writeFileSync(file, `${JSON.stringify({ ...kept, url: origin, dir }, null, 2)}\n`);
    const was = before && (before.url !== origin || before.dir !== dir) ? before : null;
    return { id, url: origin, dir, file, was };
}
/**
 * Whether a copy of a module running from `dir` may write its registration, or whose it is.
 *
 * A registration names the ONE folder the app runs the module from: its installed copy. A copy of
 * the same module started anywhere else — a worktree an agent is working in, a developer's clone —
 * must not take that over: the app would start the module from a half-written change, or from a
 * folder that is gone next week. So it may write only when nothing is registered yet, when what is
 * registered is this same folder, or when the registered folder no longer exists. `bun run
 * register` (calling `registerAt` itself) is the deliberate way to point the app somewhere else.
 */
export function takesOver(id, dir, where = registryDir()) {
    const held = MODULE_ID.test(id) ? readRegistration(join(where, `${id}.json`)) : null;
    if (!held || !held.dir || !existsSync(held.dir))
        return { ok: true };
    return sameFolder(held.dir, dir) ? { ok: true } : { ok: false, held };
}
/** Two spellings of one folder: resolved, and through links where they exist. */
function sameFolder(a, b) {
    const real = (path) => {
        try {
            return realpathSync(path);
        }
        catch {
            return resolve(path);
        }
    };
    return real(a) === real(b);
}
/**
 * The whole registration object as it stands on disk, unnarrowed, so it can be written back
 * without losing keys this package does not know. `{}` for anything unreadable.
 */
function readAll(file) {
    let parsed;
    try {
        parsed = JSON.parse(readFileSync(file, 'utf8'));
    }
    catch {
        return {};
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        return {};
    return parsed;
}
/** One registration file, or `null` for anything that is not one. Never throws. */
export function readRegistration(file) {
    let parsed;
    try {
        parsed = JSON.parse(readFileSync(file, 'utf8'));
    }
    catch {
        return null;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        return null;
    const { url, dir } = parsed;
    if (typeof url !== 'string')
        return null;
    /* `dir` is optional in the host's reading of this file; its absence must not turn a real
       registration into a `null` one. */
    return { url, dir: typeof dir === 'string' ? dir : '' };
}
/**
 * The ports the OTHER registered modules have claimed. Read before drifting: a neighbour's stated
 * port is treated as occupied even when nothing is listening on it.
 */
export function neighbourPorts(selfId, where = registryDir()) {
    const ports = new Set();
    let names;
    try {
        names = readdirSync(where);
    }
    catch {
        /* No registry directory yet. The first module on a clean machine is not an error. */
        return ports;
    }
    for (const name of names) {
        if (!name.endsWith('.json'))
            continue;
        const id = name.slice(0, -'.json'.length);
        if (id === selfId || !MODULE_ID.test(id))
            continue;
        const registration = readRegistration(join(where, name));
        if (!registration)
            continue;
        const port = portOf(registration.url);
        if (port !== null)
            ports.add(port);
    }
    return ports;
}
/** The port in an origin, or `null` for anything this cannot read. Pure. */
export function portOf(origin) {
    try {
        const port = new URL(origin).port;
        return port ? Number(port) : null;
    }
    catch {
        return null;
    }
}
