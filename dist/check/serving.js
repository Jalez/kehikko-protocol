import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { sourcesOf } from './parts.js';
/** Binding a socket, or probing a port by binding one. */
const BINDS = /\bBun\.serve\s*\(|\bserve\s*\(\s*\{[^}]*\bport\s*:|\.listen\s*\(\s*[^)\s]|\bcreateServer\s*\(/;
/** Where the port comes from the protocol. */
const SHARED = /\b(?:serves|run|claim|claimOrLeave|modulePort|anyPortOrLeave|free)\s*\(/;
const FROM_PROTOCOL = /from\s+['"]kehikot-module-protocol\/(?:serve|run)['"]/;
/** The Vite configs a module's dev server is built from. */
const VITE_CONFIGS = ['vite.config.ts', 'vite.config.mts', 'vite.config.js', 'vite.config.mjs'];
/** One file's verdict. Pure. */
export function bindsItsOwnWay(text) {
    const code = withoutComments(text);
    if (!BINDS.test(code))
        return false;
    return !(FROM_PROTOCOL.test(code) && SHARED.test(code));
}
/** The checks on what was read. Pure. */
export function checkServingSources(module, sources) {
    const failures = [];
    for (const { path, text } of sources) {
        const vite = VITE_CONFIGS.includes(path);
        if (vite && !/\bserves\s*\(/.test(withoutComments(text))) {
            failures.push(`${path}: the dev server does not use serves() from kehikot-module-protocol/serve, so it binds a port of its own choosing.`);
        }
        else if (!vite && bindsItsOwnWay(text)) {
            failures.push(`${path}: binds a server or probes a port without taking the port from kehikot-module-protocol (serves, run, claim, modulePort or free). `
                + 'Its own probe misses a port another program holds on [::], and a port the system hands out for "any port" can be given to another program too.');
        }
    }
    return { module, failures };
}
/** One module directory, read and checked. */
export function checkModuleServing(dir) {
    const at = resolve(dir);
    const sources = sourcesOf(at);
    for (const name of VITE_CONFIGS) {
        const file = join(at, name);
        if (existsSync(file) && !sources.some((source) => source.path === name))
            sources.push({ path: name, text: readFileSync(file, 'utf8') });
    }
    return checkServingSources(at, sources);
}
/** What a person is told. */
export function saidServing(check) {
    if (!check.failures.length)
        return `${check.module}: takes its port the shared way.`;
    return [`${check.module}: FAILS check:serving`, ...check.failures.map((failure) => `  - ${failure}`)].join('\n');
}
/** Comments out, so a sentence about `listen()` is not a call. */
function withoutComments(text) {
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}
