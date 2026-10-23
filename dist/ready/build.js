import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { commitOf } from '../serve/build.js';
import { pageDocument } from '../serve/page.js';
import { cleanTree, clearStamp, writeStamp } from './stamp.js';
export { STAMP_FILE, cleanTree, clearStamp, readStamp, readiness, writeStamp } from './stamp.js';
/** Whether git tracks `file` in `dir`. A tracked `index.html` is the module's own and is never overwritten. */
function tracked(dir, file) {
    try {
        execFileSync('git', ['-C', dir, 'ls-files', '--error-unmatch', file], { stdio: 'ignore', timeout: 5000 });
        return true;
    }
    catch {
        return false;
    }
}
/** The module's own Vite, from its folder: a build compiles with what the dev server runs. */
async function vitesOf(dir) {
    const bun = globalThis.Bun;
    const where = bun ? bun.resolveSync('vite', dir) : createRequire(join(dir, 'package.json')).resolve('vite');
    return (await import(pathToFileURL(where).href));
}
/**
 * Build the page into `dist/` and stamp it with the commit, or leave it unstamped and say why.
 *
 * The stamp is taken off first and written last, so a build that fails — or is killed — leaves a
 * `dist/` that `run` refuses and a `run.sh` falls back from. A checkout whose tracked files differ
 * from `HEAD` is built and NOT stamped: the commit would be a lie about what was compiled. A failed
 * Vite build throws, as Vite does.
 */
export async function buildModule(options) {
    const { dir } = options;
    const log = options.log ?? ((line) => console.log(line));
    const outDir = options.outDir ?? 'dist';
    const dist = join(dir, outDir);
    mkdirSync(dist, { recursive: true });
    clearStamp(dist);
    const entry = join(dir, 'index.html');
    const writes = options.page != null && !tracked(dir, 'index.html');
    if (options.page == null && !existsSync(entry)) {
        throw new Error(`${dir} has no index.html, and buildModule was given no page to write one from.`);
    }
    /* What is compiled is the tree as it is now; asked again after, so a checkout that moved during the build is not vouched for. */
    const before = { commit: commitOf(dir), clean: cleanTree(dir) };
    const vite = options.vite ?? (await vitesOf(dir));
    if (writes && options.page)
        writeFileSync(entry, pageDocument(options.page), 'utf8');
    try {
        /* The module's own `vite.config.ts` is read, so there is one answer to how it compiles. Its
           `serves()` and `doors()` are `apply: 'serve'` and do not run: a build claims no port. */
        await vite.build({ root: dir, mode: 'production', logLevel: options.logLevel, build: { outDir, emptyOutDir: true } });
    }
    finally {
        /* A leftover `index.html` would start being what a dev server answers at `/`, with no ticket. */
        if (writes)
            rmSync(entry, { force: true });
    }
    const commit = commitOf(dir);
    if (!commit) {
        const why = `${dir} is not a git checkout, so the build was not stamped and \`run\` will not serve it.`;
        log(why);
        return { dist, commit, stamped: false, why };
    }
    if (before.clean !== true || cleanTree(dir) !== true || before.commit !== commit) {
        const why = `${dir} has changes to tracked files, so the build is not ${commit.slice(0, 7)} and was not stamped; \`run\` will not serve it.`;
        log(why);
        return { dist, commit, stamped: false, why };
    }
    /* `emptyOutDir` removed the stamp with everything else; it is written now, after a build that succeeded. */
    const file = writeStamp(dist, commit);
    log(`built ${commit.slice(0, 7)} into ${dist} (stamp: ${file})`);
    return { dist, commit, stamped: true, why: null };
}
