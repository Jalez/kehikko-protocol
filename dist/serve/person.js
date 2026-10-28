import { realpathSync } from 'node:fs';
import { basename, delimiter, join } from 'node:path';
/**
 * The variable a host names, joined by the path delimiter, the folders it put first on a module's
 * `PATH` for the module's own process (a `bun` that is the host itself, say). `personEnv` takes
 * them out again.
 */
export const HOST_PATH_ENV = 'KEHIKOT_HOST_PATH';
/** What makes a compiled host answer as Bun. Meant for the module's process, never the person's. */
const BE_BUN = 'BUN_BE_BUN';
/** Folders a runtime makes to hold a `bun` or `node` that is itself: Bun's own and a host's. */
const SHIM_FOLDER = /^(bun-node-|kehikot-bun-)/;
/** A runtime that is plainly Bun or Node, and not a program compiled with one inside. */
const PLAIN_RUNTIME = /^(bun|node)(\.exe)?$/i;
function real(file) {
    try {
        return realpathSync(file);
    }
    catch {
        return null;
    }
}
function pathKey(env) {
    return Object.keys(env).find((key) => key.toUpperCase() === 'PATH') ?? 'PATH';
}
/**
 * The environment for a program a module starts on the person's behalf: a session, a shell, a
 * command they typed. `env` (this process's when not given) without what the host gave the module
 * for its own use:
 *
 * - the folders named in `KEHIKOT_HOST_PATH` are taken off `PATH` (one occurrence each, the first,
 *   so the same folder the person has further along stays);
 * - a folder on `PATH` whose `bun` or `node` is this process's own runtime goes too, when that
 *   runtime is a compiled host rather than Bun or Node, and so does a `bun-node-*` or
 *   `kehikot-bun-*` folder whose `bun` or `node` is this runtime, whatever it is;
 * - `BUN_BE_BUN` and `KEHIKOT_HOST_PATH` are dropped.
 *
 * Everything else is kept as it was. Unset values are left out.
 */
export function personEnv(env = process.env, options = {}) {
    const own = real(options.execPath ?? process.execPath);
    const compiled = !PLAIN_RUNTIME.test(basename(options.execPath ?? process.execPath));
    const key = pathKey(env);
    const named = (env[HOST_PATH_ENV] ?? '').split(delimiter).filter(Boolean);
    const isOwn = (dir) => own !== null && (real(join(dir, 'bun')) === own || real(join(dir, 'node')) === own);
    const dropped = new Set();
    const kept = [];
    for (const dir of (env[key] ?? '').split(delimiter)) {
        if (named.includes(dir) && !dropped.has(dir)) {
            dropped.add(dir);
            continue;
        }
        if (dir && (compiled || SHIM_FOLDER.test(basename(dir))) && isOwn(dir))
            continue;
        kept.push(dir);
    }
    const out = {};
    for (const [name, value] of Object.entries(env)) {
        if (value === undefined || name === BE_BUN || name === HOST_PATH_ENV)
            continue;
        out[name] = name === key ? kept.join(delimiter) : value;
    }
    return out;
}
