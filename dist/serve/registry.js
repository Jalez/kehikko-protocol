import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { canonicalName, legacyName } from '../dialect.js';
import { MODULE_ID } from '../ids.js';
/**
 * The one directory a host sweeps, and the one shape it finds there.
 *
 * ## Why this is written here rather than copied a fourteenth time
 *
 * Every module in this workspace ships a `register.ts` that spells this
 * directory out by hand, under a comment saying the line "must say exactly what
 * a host's own registry sweep says". Fourteen copies of a sentence that has to
 * be identical is not a convention, it is a countdown — and the failure it
 * produces is the worst one a module can have, because a registration written to
 * the wrong directory means the host finds nothing and finds it SILENTLY. No
 * error, no empty container, no address to go looking at. The module simply does
 * not exist.
 *
 * So the path is spelled once, in the package both halves already import.
 *
 * ## Where it is now, and where it was
 *
 * `~/Library/Application Support/Kehikot/modules` on macOS — the place the
 * platform keeps an app's own data — and `$XDG_DATA_HOME/kehikot/modules`
 * (default `~/.local/share/kehikot/modules`) elsewhere. The same directory the
 * host reads first; see `machineDirs.ts` in the host.
 *
 * It used to be `~/.roadmap/modules`, named after the app before it was called
 * Kehikot. Modules built against an older copy of this package still write
 * there, and the host still reads it as a fallback, so nothing is lost by a
 * module moving: it writes the new place, and where an id is in both, the
 * newer file wins in the host.
 *
 * ## `KEHIKOT_MODULES_DIR` is honoured, and that is not a convenience
 *
 * It is how any of this can be tested. A test that wrote into a person's real
 * registry would be a test that ADOPTS a module onto their canvas, and the
 * only way to notice is a container appearing in an app the test never
 * opened. The host reads the same variable, so a whole second registry is a
 * directory and an environment variable away. `ROADMAP_MODULES_DIR`, its name
 * before the rename, is read when it is not set.
 */
export function registryDir(env = process.env) {
    const said = env.KEHIKOT_MODULES_DIR || env.ROADMAP_MODULES_DIR;
    if (said)
        return said;
    const home = env.HOME || homedir();
    if (process.platform === 'darwin')
        return join(home, 'Library', 'Application Support', 'Kehikot', 'modules');
    return join(env.XDG_DATA_HOME || join(home, '.local', 'share'), 'kehikot', 'modules');
}
/**
 * The registry before the rename, `~/.roadmap/modules` — READ, never written,
 * so that what a module wrote there (`keep`, above all) is carried over the
 * first time it registers in the new place. `null` when the registry was
 * pointed somewhere on purpose, so a test never reads a person's real one.
 */
export function legacyRegistryDir(env = process.env) {
    if (env.KEHIKOT_MODULES_DIR || env.ROADMAP_MODULES_DIR)
        return null;
    return join(env.HOME || homedir(), '.roadmap', 'modules');
}
/**
 * Say where this module answers.
 *
 * The filename carries the id — `kehikot.history.json`, not a field inside the
 * document — because that is what makes the id unforgeable. A host takes the id
 * from the NAME, so two files claiming one module cannot both exist: the
 * filesystem already refuses that, and a uniqueness rule enforced by the
 * filesystem is one nobody has to re-implement. See `server/registrations.ts` in
 * the host, whose essay this restates deliberately rather than links to.
 *
 * `dir` is here for the reason every module's `register.ts` gives: the url is
 * where to TALK to this program and the directory is where to START it, and the
 * moment a host needs the second is exactly the moment there is no manifest to
 * read the first from. It has to be a directory rather than a command line — a
 * string a host handed to a shell would make this file a place to write shell —
 * and what the host runs inside it is `run.sh`, no arguments.
 *
 * ## The honest part: this is now written on every start
 *
 * Every module's `register.ts` opens with an argument this has to answer rather
 * than delete: registration writes into somebody's home directory and says
 * "frame this", which is a decision a person makes once, and a start script that
 * did it quietly would be making that decision on their behalf.
 *
 * That argument is about ADOPTION and it still stands whole. `bun run register`
 * is still the act that puts a module on somebody's canvas, still a separate
 * program, and nothing here is meant to be the first thing that ever writes a
 * module's file — the plugin that calls this is one a person added to their own
 * `vite.config.ts`, in their own checkout, which is the same deliberate act
 * wearing different clothes.
 *
 * What is genuinely different is RE-STATING a url for a module already in the
 * registry. The person decided to be framed; they did not decide to be framed at
 * port 7960 in particular, and after a drift the number in that file is simply
 * wrong. Leaving it wrong out of respect for the earlier decision respects
 * nothing: the host sweeps the stale address, finds nothing there, and reports
 * the module as not running while it is running one port over — with a Start
 * button that will spawn a second copy. The decision a person made was "frame
 * this program". Keeping that decision TRUE is what this write is for.
 *
 * ## Two checkouts, and who wins
 *
 * If one id is registered from two directories, whoever started last wins — both
 * `url` and `dir`. That is an answer rather than a shrug: the host frames ONE
 * program per id, and the one worth framing is the one actually running now.
 * Refusing to overwrite a differing `dir` would leave the registry naming a
 * checkout nobody has started, and hand the Start button a directory that is not
 * where the running server is.
 *
 * It is still a surprise, so it is never silent: `was` carries whatever the file
 * said before, and the caller prints it whenever it differs.
 */
export function registerAt({ id, origin, dir }) {
    /* Refused here rather than joined. A filename derived from an id is a PATH
       BUILT FROM DATA, and an id can arrive from a manifest that came off a port.
       Same argument `moduleFolder` makes in `project.ts`, for the same reason. */
    if (!MODULE_ID.test(id))
        throw new Error(`"${id}" is not a module id, so there is no registration file to write`);
    const where = registryDir();
    const file = join(where, `${id}.json`);
    /* What this module said last time, wherever it said it: under this id; under
       the same id spelled as before the rename (`roadmap.x`), beside it or in
       the old `~/.roadmap/modules`. Only read — the older files are left exactly
       as they are, for a host that has not been updated. */
    const earlier = earlierFiles(id, where, file);
    const before = earlier.map(readRegistration).find((r) => r !== null) ?? null;
    /*
     * Everything already in the file that this function does not manage.
     *
     * This owns exactly two fields: where the module answers, and which checkout
     * to start. Every other key belongs to whoever wrote the file, and a start
     * script is not entitled to delete somebody's decision on its way past.
     *
     * `keep: true` is the one that makes this urgent rather than tidy. It is how
     * a person tells the host it may NOT stop a module — see the lifecycle essay
     * in the host, which argues at length that stopping is not the mirror of
     * starting because it destroys what the program was holding. The terminal
     * carries it, and a terminal is holding a live shell. Rewriting `{url, dir}`
     * over that file would have quietly returned the host's permission to kill
     * it, and nothing anywhere would have said so — the module would keep working
     * until the day it was reaped mid-command.
     *
     * So the file is merged, not replaced. Unknown keys survive by default, which
     * is also what makes a field added to this format later safe from every
     * module still running the version before it.
     */
    const kept = earlier.map(readAll).find((all) => Object.keys(all).length > 0) ?? {};
    mkdirSync(where, { recursive: true });
    writeFileSync(file, `${JSON.stringify({ ...kept, url: origin, dir }, null, 2)}\n`);
    const was = before && (before.url !== origin || before.dir !== dir) ? before : null;
    return { id, url: origin, dir, file, was };
}
/* This module's file, then the files that are the same module under its
   pre-rename id, nearest first. See `registerAt`. */
function earlierFiles(id, where, file) {
    const files = [file];
    const old = legacyName(id);
    if (old !== id)
        files.push(join(where, `${old}.json`));
    const legacy = legacyRegistryDir();
    if (legacy && legacy !== where) {
        files.push(join(legacy, `${id}.json`));
        if (old !== id)
            files.push(join(legacy, `${old}.json`));
    }
    return files;
}
/**
 * The whole registration object as it stands on disk, unnarrowed.
 *
 * `readRegistration` answers what this package UNDERSTANDS — a url and a dir —
 * and that is the right shape for deciding anything. This answers what is
 * actually in the file, which is the only shape that can be written back
 * without losing what nobody here knows about. See `registerAt`.
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
    /* `dir` is optional in the host's reading of this file — a module somebody
       starts themselves is an ordinary module — so its absence is not a fault and
       must not turn a real registration into a `null` one. */
    return { url, dir: typeof dir === 'string' ? dir : '' };
}
/**
 * The ports the OTHER registered modules have claimed.
 *
 * Read before drifting, and the reason is a failure that would otherwise arrive
 * a week later with nothing connecting it to its cause. The modules on this
 * machine sit ten apart — 7820 through 7960 — and a module drifting upward from
 * 7940 walks straight into 7950 if 7950 happens to be free at that second. It IS
 * free: its owner is not running, which is the normal state of most modules most
 * of the time. The drifter takes it and registers there. The next person to
 * press Start on the module that owns 7950 gets a port collision they did not
 * cause, in a module they did not change, and the program holding their port is
 * one whose registration says it lives somewhere else entirely.
 *
 * So a neighbour's stated port is treated as occupied even when nothing is
 * listening on it. A registration is a claim, and this is the one place in the
 * system where reading somebody's claim is cheaper than discovering it.
 */
export function neighbourPorts(selfId, where = registryDir()) {
    /* And the pre-rename registry too, when this is the real one: a module that
       has not been updated still states its port there, and that claim is just
       as much a claim. */
    const legacy = where === registryDir() ? legacyRegistryDir() : null;
    const ports = new Set();
    for (const dir of legacy && legacy !== where ? [where, legacy] : [where]) {
        let names;
        try {
            names = readdirSync(dir);
        }
        catch {
            /* No registry directory yet. The first module on a clean machine is not an
               error, and a drift that refused to happen because nobody had registered
               anything would be a strange first experience. */
            continue;
        }
        for (const name of names) {
            if (!name.endsWith('.json'))
                continue;
            const id = name.slice(0, -'.json'.length);
            /* Compared canonically: `roadmap.x.json` is this same module under its
               pre-rename id, and its port is our own, not a neighbour's. */
            if (canonicalName(id) === canonicalName(selfId) || !MODULE_ID.test(id))
                continue;
            const registration = readRegistration(join(dir, name));
            if (!registration)
                continue;
            const port = portOf(registration.url);
            if (port !== null)
                ports.add(port);
        }
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
//# sourceMappingURL=registry.js.map