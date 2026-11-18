import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PACKAGE_VERSION, START_TOKEN, startTokenOf } from '../build.js';
/**
 * The commit checked out in `dir`, or null: not a git checkout, no git, or git said no.
 *
 * A ready-built bundle (2.102.0, docs/bundles.md) is not a checkout: its `bundle.json` says the
 * commit it was built from, and that is the answer — asked first, so a bundle unpacked somewhere a
 * git repository happens to enclose (a home folder kept in git) is never taken for that repository.
 */
export function commitOf(dir) {
    const bundled = bundledCommit(dir);
    if (bundled)
        return bundled;
    try {
        const out = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], {
            encoding: 'utf8',
            timeout: 2000,
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
        return /^[0-9a-f]{7,64}$/.test(out) ? out : null;
    }
    catch {
        return null;
    }
}
/** The commit a bundle's `bundle.json` in `dir` names, or null when there is none. */
function bundledCommit(dir) {
    try {
        const said = JSON.parse(readFileSync(join(dir, 'bundle.json'), 'utf8'));
        return said.format === 'kehikot.bundle' && typeof said.commit === 'string' && /^[0-9a-f]{7,64}$/.test(said.commit) ? said.commit : null;
    }
    catch {
        return null;
    }
}
/**
 * This process's build. Call it once, at module scope, so it is one identity for the life of the
 * process: `export const BUILD = establishBuild({ version: VERSION, dir: import.meta.dirname })`.
 *
 * Since 2.60.0 it carries `start`, the start token the host handed this process in
 * `KEHIKOT_START_TOKEN` (read from `env`, default `process.env`), when there is a well-formed one;
 * `start` in the options overrides it (null for none). The doors and `run` then say it in
 * `START_HEADER` on every answer, and the manifest carries it in `build`, so a host can tell the
 * process it started from anything else that answers on that port.
 */
export function establishBuild(options) {
    const start = options.start !== undefined
        ? options.start !== null && START_TOKEN.test(options.start)
            ? options.start
            : null
        : startTokenOf(options.env ?? process.env);
    return {
        version: options.version,
        commit: options.commit !== undefined ? options.commit : options.dir ? commitOf(options.dir) : null,
        started: (options.now ?? new Date()).toISOString(),
        protocol: PACKAGE_VERSION,
        ...(start ? { start } : {}),
    };
}
