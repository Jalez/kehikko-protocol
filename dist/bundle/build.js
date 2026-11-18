import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { commitOf } from '../serve/build.js';
import { cleanTree, readStamp } from '../ready/stamp.js';
import { BUNDLE_FILE, BUNDLE_FORMAT, BUNDLE_FORMAT_VERSION, BUNDLE_PLATFORMS, BUNDLE_RUN, bundleArchiveName, checksumLine, sha256, } from './format.js';
import { writeTarGz } from './tar.js';
import { UNINSTALL_SCRIPT } from '../uninstall.js';
/** The first protocol whose `run` serves a bundle's page (it reads the commit from `bundle.json`). */
export const BUNDLES_SINCE = '2.102.0';
/**
 * The oldest Bun that bundles a module correctly (2.108.1). Bun 1.4.0's `Bun.build` silently drops
 * code it should keep: bundling this package's own `index.js` leaves 17 KB with `export { agentSetupSettings }`
 * and no definition, and the bundle crashes at start. 1.4.1 (bisected: 1.4.1 to 1.4.4 all give the whole 465 KB) is the floor.
 */
export const BUNDLE_MIN_BUN = '1.4.1';
/** Why this Bun may not build a bundle, or null when it may. A version that does not read as one is let through (a canary names none). */
export function bunTooOld(version, floor = BUNDLE_MIN_BUN) {
    const numbers = version?.match(/^\d+\.\d+\.\d+/)?.[0];
    if (!version || !numbers || atLeast(numbers, floor))
        return null;
    return `Bun ${version} is too old to bundle modules safely (it silently drops exports, and the bundle then crashes at start); use ${floor} or newer, e.g. the one in Kehikot.app via BUN_BE_BUN=1.`;
}
/** Whether version `a` is `b` or later, both `major.minor.patch`. */
function atLeast(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    if (pa.length !== 3 || pa.some(Number.isNaN))
        return false;
    for (let i = 0; i < 3; i++)
        if (pa[i] !== pb[i])
            return pa[i] > pb[i];
    return true;
}
/** Folders and files a developer uses and a running module never reads. */
const LEFT_OUT_FOLDERS = ['test/', 'tests/', '__tests__/', 'dev/', 'src/', '.github/', '.claude/', '.vscode/', 'node_modules/', 'dist/', 'bundle-out/', 'e2e/', 'fixtures/', 'coverage/'];
const LEFT_OUT_FILES = [
    'bun.lock',
    'bun.lockb',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'bunfig.toml',
    'build.ts',
    'register.ts',
    'run.sh',
    'components.json',
    'index.html',
    '.gitignore',
    '.gitattributes',
    '.npmrc',
    'CLAUDE.md',
    'AGENTS.md',
    BUNDLE_FILE,
];
const LEFT_OUT_PATTERN = /(^|\/)(vite|vitest|tailwind|postcss|eslint|prettier)\.config\.[cm]?[jt]s$|(^|\/)tsconfig[^/]*\.json$|\.(test|spec)\.[cm]?[jt]sx?$|(^|\/)\.DS_Store$/;
const CODE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
/** Whether a tracked path is part of the running module, by the defaults and the module's own `exclude`/`include`. */
export function keptByDefault(path, config = {}) {
    const matches = (rule) => (rule.endsWith('/') ? path.startsWith(rule) : path === rule);
    if (config.include?.some(matches))
        return true;
    if (config.exclude?.some(matches))
        return false;
    if (LEFT_OUT_FOLDERS.some(matches))
        return false;
    if (!path.includes('/') && LEFT_OUT_FILES.includes(path))
        return false;
    return !LEFT_OUT_PATTERN.test(path);
}
/** package.json's `kehikot.bundle`, or `{}`. */
export function bundleConfigOf(pkg) {
    const said = pkg?.kehikot?.bundle;
    return said && typeof said === 'object' && !Array.isArray(said) ? said : {};
}
/** The protocol version a package.json pins (`#vX.Y.Z` or a range), or null. */
export function pinnedProtocol(pkg) {
    const said = pkg.dependencies?.['kehikot-module-protocol'] ?? pkg.devDependencies?.['kehikot-module-protocol'] ?? '';
    const found = said.match(/(\d+\.\d+\.\d+)(?!.*\d+\.\d+\.\d+)/);
    return found ? found[1] : null;
}
function readJson(file) {
    try {
        return JSON.parse(readFileSync(file, 'utf8'));
    }
    catch {
        return null;
    }
}
function trackedFiles(dir) {
    const out = execFileSync('git', ['-C', dir, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    return out.split('\0').filter(Boolean);
}
/** The folder a package is installed in, looked up from `from` the way Node does. */
function packageDir(name, from, root) {
    for (let at = from;; at = dirname(at)) {
        const where = join(at, 'node_modules', name);
        if (existsSync(join(where, 'package.json')))
            return where;
        if (at === root || dirname(at) === at)
            return null;
    }
}
/** Every file under `dir`, relative, links not followed, nested `node_modules` included. */
function walk(dir, skip, prefix = '') {
    const found = [];
    for (const name of readdirSync(join(dir, prefix)).sort()) {
        const rel = prefix ? `${prefix}/${name}` : name;
        const stat = lstatSync(join(dir, rel));
        if (stat.isSymbolicLink())
            continue;
        if (stat.isDirectory()) {
            if (!skip(rel, true))
                found.push(...walk(dir, skip, rel));
        }
        else if (stat.isFile() && !skip(rel, false))
            found.push(rel);
    }
    return found;
}
/** Whether a package ships native code: a `.node` file, or a `binding.gyp` to build one. */
function isNative(dir) {
    if (existsSync(join(dir, 'binding.gyp')))
        return true;
    return walk(dir, (rel, isDir) => isDir && basename(rel) === 'node_modules').some((rel) => rel.endsWith('.node'));
}
/** The platforms a native package has a binary for: its `prebuilds/<platform>/` and, for this machine, a `build/Release/` it compiled. */
function platformsOf(dir) {
    const found = new Set();
    const prebuilds = join(dir, 'prebuilds');
    if (existsSync(prebuilds)) {
        for (const name of readdirSync(prebuilds)) {
            if (BUNDLE_PLATFORMS.includes(name) && readdirSync(join(prebuilds, name)).some((file) => file.endsWith('.node')))
                found.add(name);
        }
    }
    const here = `${process.platform}-${process.arch}`;
    if (BUNDLE_PLATFORMS.includes(here) && existsSync(join(dir, 'build', 'Release')) && readdirSync(join(dir, 'build', 'Release')).some((file) => file.endsWith('.node'))) {
        found.add(here);
    }
    return found;
}
const PACKAGE_LEFT_OUT_FOLDERS = new Set(['src', 'deps', 'third_party', 'scripts', 'test', 'tests', '__tests__', 'typings', 'docs', 'doc', 'example', 'examples', 'benchmark', 'benchmarks', '.github', 'obj.target', '.deps']);
const PACKAGE_LEFT_OUT_FILE = /\.(test|spec)\.[cm]?js$|\.(md|markdown|d\.ts|d\.mts|d\.cts|map|gyp|gypi|cc|cpp|cxx|c|h|hh|hpp|o|a|mk|tsbuildinfo)$|(^|\/)(Makefile|binding\.gyp|\.npmignore|\.eslintrc[^/]*|tsconfig[^/]*\.json|CHANGELOG[^/]*)$/i;
/** The files of a carried package that a running module needs: no sources, docs or other platforms' binaries. */
function packageFiles(dir, platforms) {
    return walk(dir, (rel, isDir) => {
        const parts = rel.split('/');
        const name = parts[parts.length - 1];
        if (isDir) {
            if (PACKAGE_LEFT_OUT_FOLDERS.has(name) && !rel.includes('node_modules/'))
                return true;
            if (parts.length === 2 && parts[0] === 'prebuilds' && platforms && !platforms.has(name))
                return true;
            if (parts[0] === 'build' && parts.length === 2 && name !== 'Release')
                return true;
            return false;
        }
        return PACKAGE_LEFT_OUT_FILE.test(rel);
    });
}
/** A package and every package it depends on, as installed for `dir`: name → folder. */
function closure(names, from, root, into = new Map()) {
    for (const name of names) {
        if (into.has(name))
            continue;
        const where = packageDir(name, from, root);
        if (!where)
            continue;
        into.set(name, where);
        const pkg = readJson(join(where, 'package.json'));
        closure([...Object.keys(pkg?.dependencies ?? {}), ...Object.keys(pkg?.optionalDependencies ?? {})], where, root, into);
    }
    return into;
}
/** The specifiers a script imports or requires, roughly: enough to tell "imports nothing" from "imports something". */
function importsOf(source) {
    const found = [];
    const patterns = [/\bimport\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g, /\bexport\s+[^'"]*?\s+from\s+['"]([^'"]+)['"]/g, /\b(?:require|import)\s*\(\s*['"]([^'"]+)['"]\s*\)/g];
    for (const pattern of patterns)
        for (const match of source.matchAll(pattern))
            found.push(match[1]);
    return found;
}
/** A source without its comments and its import, export-from and require lines: what is left spells a file only to use it by path. */
export function spokenOf(source) {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1')
        .replace(/\bimport\s+(?:[^'"]*?\s+from\s+)?['"][^'"]+['"]/g, '')
        .replace(/\bexport\s+[^'"]*?\s+from\s+['"][^'"]+['"]/g, '')
        .replace(/\b(?:require|import)\s*\(\s*['"][^'"]+['"]\s*\)/g, '');
}
const builtin = (specifier) => specifier.startsWith('node:') || specifier.startsWith('bun:') || specifier === 'bun';
/**
 * The plugin that keeps `import.meta.dirname` (and its kin) meaning the folder a file sat in, once
 * it is part of an entry written at `entryDir`. Files of packages are not touched: a package that
 * reads its own files is carried (`external`).
 */
function hereKeeper(moduleDir, entryDir, loaded) {
    return {
        name: 'kehikot-bundle-here',
        setup(build) {
            build.onLoad({ filter: CODE }, async (args) => {
                const path = args.path;
                if (!path.startsWith(moduleDir + sep) || path.includes(`${sep}node_modules${sep}`))
                    return undefined;
                loaded.add(relative(moduleDir, path).split(sep).join('/'));
                const ext = extname(path).slice(1);
                const loader = ext === 'mts' || ext === 'cts' ? 'ts' : ext === 'mjs' || ext === 'cjs' ? 'js' : ext;
                const contents = readFileSync(path, 'utf8');
                const from = relative(entryDir, dirname(path)).split(sep).join('/');
                if (!from || !/import\.meta\.(dirname|dir|url|path|filename)\b/.test(contents))
                    return { contents, loader };
                const file = `${from}/${basename(path)}`;
                const rewritten = contents.replace(/import\.meta\.(dirname|dir|url|path|filename)\b/g, (_all, what) => {
                    if (what === 'url')
                        return `new URL(${JSON.stringify(file)}, import.meta.url).href`;
                    if (what === 'path' || what === 'filename')
                        return `(import.meta.dirname + ${JSON.stringify(`/${file}`)})`;
                    return `(import.meta.dirname + ${JSON.stringify(`/${from}`)})`;
                });
                return { contents: rewritten, loader };
            });
        },
    };
}
/** The package a bare import names (`@scope/name` or `name`, without a sub-path), or null for a relative, absolute or runtime import. */
export function packageNameOf(specifier) {
    if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('#') || builtin(specifier))
        return null;
    const parts = specifier.split('/');
    if (specifier.startsWith('@'))
        return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
    return parts[0] || null;
}
/**
 * What a bundle of the server finds by following its imports (bun build's own graph, not package.json):
 * the packages that have to be carried as files instead of inlined, with where each is installed.
 * A package only the page imports, or one nothing imports, is never reached, so a native optional it
 * pulls in never makes a bundle fail or grow.
 */
class Reach {
    moduleDir;
    declared;
    carried = new Map();
    nativeAt = new Map();
    constructor(moduleDir, declared) {
        this.moduleDir = moduleDir;
        this.declared = declared;
    }
    /** Whether an import is left external (and so carried): a package the module declared, or one with native code. */
    external(specifier, importer) {
        const name = packageNameOf(specifier);
        if (!name || name === 'kehikot-module-protocol')
            return false;
        const from = importer && importer !== '' ? dirname(importer) : this.moduleDir;
        const where = packageDir(name, from, this.moduleDir) ?? packageDir(name, this.moduleDir, this.moduleDir);
        if (!where)
            return false;
        let native = this.nativeAt.get(where);
        if (native === undefined) {
            native = isNative(where);
            this.nativeAt.set(where, native);
        }
        if (!this.declared.includes(name) && !native)
            return false;
        this.carried.set(name, where);
        return true;
    }
}
/** Bundle one script with every dependency but the declared and native ones inlined; its text, and which of the module's own files it took in. */
async function bundleOne(moduleDir, entry, reach) {
    const bun = globalThis.Bun;
    if (!bun)
        return { ok: false, why: 'kehikot-bundle runs under Bun: it bundles with Bun.build.' };
    const loaded = new Set();
    const out = join(tmpdir(), `kehikot-bundle-${process.pid}-${Math.random().toString(36).slice(2)}`);
    const source = join(moduleDir, entry);
    const reachKeeper = {
        name: 'kehikot-bundle-reach',
        setup(build) {
            build.onResolve({ filter: /^[^./]/ }, (args) => (reach.external(args.path, args.importer) ? { path: args.path, external: true } : undefined));
        },
    };
    try {
        const built = await bun.build({
            entrypoints: [source],
            outdir: out,
            target: 'bun',
            format: 'esm',
            naming: '[name].[ext]',
            plugins: [reachKeeper, hereKeeper(moduleDir, dirname(source), loaded)],
        });
        if (!built.success)
            return { ok: false, why: `${entry} did not bundle: ${built.logs.map((log) => log.message ?? String(log)).join('; ')}` };
        const main = built.outputs.find((output) => output.kind === 'entry-point');
        if (!main)
            return { ok: false, why: `${entry} bundled to nothing.` };
        if (built.outputs.some((output) => output.kind !== 'entry-point' && output.path.endsWith('.js'))) {
            return { ok: false, why: `${entry} bundled to more than one script (a dynamic import of a file); a bundle starts from one file per script.` };
        }
        const extra = built.outputs.filter((output) => output.kind !== 'entry-point');
        if (extra.length) {
            return { ok: false, why: `${entry} bundled with files of its own (${extra.map((one) => basename(one.path)).join(', ')}): an asset imported from a script. Read it from a path instead.` };
        }
        return { ok: true, text: readFileSync(main.path, 'utf8'), loaded };
    }
    catch (error) {
        return { ok: false, why: `${entry} did not bundle: ${error.message}` };
    }
    finally {
        rmSync(out, { recursive: true, force: true });
    }
}
/** The manifest the module exports from `file`: the object with a kind, an id, a name and a version. */
async function manifestOf(dir, file) {
    const loaded = (await import(pathToFileURL(join(dir, file)).href));
    for (const value of Object.values(loaded)) {
        const v = value;
        if (v && typeof v === 'object' && typeof v.kind === 'string' && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.version === 'string') {
            return { id: v.id, version: v.version };
        }
    }
    return null;
}
/** The `run.sh` a bundle carries: no install, no build, no git — the entry, with the Bun the host puts first on PATH. */
export function bundleRunScript(info) {
    return [
        '#!/bin/sh',
        `# ${info.id} ${info.version}, a ready-built bundle of ${info.commit.slice(0, 7)} (kehikot-bundle).`,
        '# Nothing to install and nothing to build: the server is one script and the page is built.',
        '# A host starts this with its own Bun first on PATH.',
        'cd "$(dirname "$0")" || exit 1',
        `exec bun ${info.entry}`,
        '',
    ].join('\n');
}
/**
 * Build the bundle of the module in `options.dir`: `<id>-<version>.tar.gz` and its `.sha256` in
 * `out`. Never throws for a module that cannot be bundled: the answer says why (and `skipped` when
 * the module said `kehikot.bundle.enabled: false`).
 */
export async function buildBundle(options) {
    const dir = options.dir;
    const log = options.log ?? ((line) => console.log(line));
    const entry = options.entry ?? 'serve.ts';
    const pkg = readJson(join(dir, 'package.json'));
    if (!pkg)
        return { ok: false, why: `${dir} has no readable package.json.` };
    const config = bundleConfigOf(pkg);
    if (config.enabled === false)
        return { ok: false, skipped: true, why: `The module keeps the git path: ${config.why ?? 'its package.json says kehikot.bundle.enabled: false.'}` };
    if (!existsSync(join(dir, entry)))
        return { ok: false, why: `${dir} has no ${entry} to start a bundle from.` };
    const tooOldBun = bunTooOld(globalThis.Bun?.version);
    if (tooOldBun)
        return { ok: false, why: tooOldBun };
    /* The bundled server runs on the protocol it pins: one older than bundles cannot say which commit it is without git. */
    const installed = String(readJson(join(dir, 'node_modules', 'kehikot-module-protocol', 'package.json'))?.version ?? '');
    if (!atLeast(installed, BUNDLES_SINCE)) {
        return { ok: false, skipped: true, why: `The module runs on protocol ${installed || '(not installed)'}; a bundle needs ${BUNDLES_SINCE} or later, so it keeps the git path. Pin kehikot-module-protocol to v${BUNDLES_SINCE} or later to publish bundles.` };
    }
    const manifest = await manifestOf(dir, options.manifest ?? 'manifest.ts').catch((error) => {
        log(`the manifest could not be read: ${error.message}`);
        return null;
    });
    if (!manifest)
        return { ok: false, why: `No manifest is exported from ${options.manifest ?? 'manifest.ts'}.` };
    if (manifest.version !== pkg.version)
        return { ok: false, why: `The manifest says ${manifest.version} and package.json ${String(pkg.version)}.` };
    const commit = commitOf(dir);
    if (!commit)
        return { ok: false, why: `${dir} is not a git checkout, so a bundle could not say which commit it is.` };
    if (!options.allowChanges && cleanTree(dir) !== true)
        return { ok: false, why: `${dir} has changes to tracked files; a bundle is built from a clean checkout of the commit it names.` };
    const hasPage = existsSync(join(dir, 'dist', 'index.html'));
    if (hasPage && readStamp(join(dir, 'dist')) !== commit) {
        return { ok: false, why: `dist/ is not a stamped build of ${commit.slice(0, 7)}. Run \`bun run build\` on a clean checkout first.` };
    }
    if (!hasPage && pkg.scripts && pkg.scripts.build) {
        return { ok: false, why: 'The module has a build script and no dist/index.html. Run `bun run build` first.' };
    }
    /* The packages the module declared must be installed; the native ones are found by following the imports below. */
    for (const name of config.external ?? []) {
        if (!packageDir(name, dir, dir))
            return { ok: false, why: `kehikot.bundle.external names ${name}, which is not installed as a dependency.` };
    }
    const reach = new Reach(dir, config.external ?? []);
    const tracked = trackedFiles(dir);
    const kept = tracked.filter((path) => keptByDefault(path, config) && existsSync(join(dir, path)) && statSync(join(dir, path)).isFile());
    const files = [];
    const add = (path, data, executable = false) => files.push({ path, data: typeof data === 'string' ? new TextEncoder().encode(data) : data, executable });
    /* The server first: what it takes in is not copied, unless something runs that file by path. */
    const server = await bundleOne(dir, entry, reach);
    if (!server.ok)
        return server;
    const keptCode = kept.filter((path) => CODE.test(path) && path !== entry);
    /* What each file says outside its imports and comments: where a file name spelled in a string means "run by path". */
    const texts = new Map();
    for (const path of kept) {
        if (/\.(md|markdown|txt)$/i.test(path))
            continue;
        const data = readFileSync(join(dir, path));
        if (data.length > 2 * 1024 * 1024 || data.includes(0))
            continue;
        texts.set(path, CODE.test(path) ? spokenOf(data.toString('utf8')) : data.toString('utf8'));
    }
    const spelled = (path) => {
        const name = basename(path).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const quoted = new RegExp(`['"\`]([^'"\`\n]*/)?${name}['"\`]`);
        for (const [other, text] of texts)
            if (other !== path && quoted.test(text))
                return true;
        return false;
    };
    const entries = new Set([...(config.entries ?? [])]);
    for (const path of keptCode) {
        if (entries.has(path))
            continue;
        /* 2.108.0: the clean-up a host runs on Uninstall is run by path, whatever else imports it. */
        if (path === UNINSTALL_SCRIPT) {
            entries.add(path);
            continue;
        }
        if (server.loaded.has(path)) {
            if (spelled(path))
                entries.add(path);
            continue;
        }
        /* Not part of the server: a script run on its own. Copied as it is when it imports nothing but the runtime's own. */
        const specifiers = importsOf(texts.get(path) ?? '');
        if (specifiers.every(builtin))
            continue;
        entries.add(path);
    }
    for (const path of entries) {
        if (!existsSync(join(dir, path)))
            return { ok: false, why: `kehikot.bundle.entries names ${path}, which is not in the module.` };
    }
    add(entry, server.text);
    for (const path of [...entries].sort()) {
        const one = await bundleOne(dir, path, reach);
        if (!one.ok)
            return one;
        add(path, one.text, (statSync(join(dir, path)).mode & 0o111) !== 0);
        log(`bundled ${path}`);
    }
    /* What the server and the scripts actually import: declared packages (always carried, they may be run by path) and the native ones they reach. */
    for (const name of config.external ?? [])
        reach.carried.set(name, packageDir(name, dir, dir));
    const native = [];
    for (const [name, where] of [...reach.carried].sort(([a], [b]) => (a < b ? -1 : 1))) {
        const declared = config.external?.includes(name) === true;
        const version = String(readJson(join(where, 'package.json'))?.version ?? '0.0.0');
        native.push({ name, version, why: declared ? 'declared' : 'native' });
    }
    let platforms = null;
    for (const one of native.filter((n) => n.why === 'native')) {
        const has = platformsOf(reach.carried.get(one.name));
        platforms = (platforms ?? [...BUNDLE_PLATFORMS]).filter((platform) => has.has(platform));
    }
    if (platforms && platforms.length === 0) {
        return { ok: false, why: `${native.map((n) => n.name).join(', ')} ${native.length === 1 ? 'has' : 'have'} no prebuilt binary for one platform they all share, so no bundle could run anywhere.` };
    }
    log(`bundled ${entry} (${server.loaded.size} files of the module inlined${native.length ? `; carried: ${native.map((n) => n.name).join(', ')}` : ''})`);
    for (const path of kept) {
        if (path === entry || entries.has(path))
            continue;
        if (CODE.test(path) && server.loaded.has(path))
            continue;
        add(path, readFileSync(join(dir, path)), (statSync(join(dir, path)).mode & 0o111) !== 0);
    }
    if (hasPage) {
        for (const rel of walk(join(dir, 'dist'), (path, isDir) => !isDir && basename(path) === '.DS_Store'))
            add(`dist/${rel}`, readFileSync(join(dir, 'dist', rel)));
    }
    for (const n of native) {
        const where = reach.carried.get(n.name);
        const carried = closure([n.name], dirname(where), dir);
        for (const [name, from] of carried) {
            if (files.some((file) => file.path.startsWith(`node_modules/${name}/`)))
                continue;
            const only = n.why === 'native' && platforms ? new Set(platforms) : null;
            for (const rel of packageFiles(from, only)) {
                add(`node_modules/${name}/${rel}`, readFileSync(join(from, rel)), (statSync(join(from, rel)).mode & 0o111) !== 0);
            }
        }
    }
    const version = String(pkg.version);
    const builtAt = (options.now ?? new Date()).toISOString();
    const base = {
        format: BUNDLE_FORMAT,
        formatVersion: BUNDLE_FORMAT_VERSION,
        id: manifest.id,
        version,
        protocol: pinnedProtocol(pkg),
        commit,
        entry,
        builtAt,
        bun: globalThis.Bun?.version ?? null,
        platforms,
        native,
    };
    add(BUNDLE_RUN, bundleRunScript(base), true);
    const described = {};
    for (const file of [...files].sort((a, b) => (a.path < b.path ? -1 : 1))) {
        described[file.path] = { sha256: sha256(file.data), size: file.data.length, ...(file.executable ? { executable: true } : {}) };
    }
    const info = { ...base, files: described };
    add(BUNDLE_FILE, `${JSON.stringify(info, null, 2)}\n`);
    const archive = writeTarGz(files);
    const out = options.out ?? join(dir, 'bundle-out');
    mkdirSync(out, { recursive: true });
    const name = bundleArchiveName(info.id, version);
    const archivePath = join(out, name);
    writeFileSync(archivePath, archive);
    const checksum = `${archivePath}.sha256`;
    writeFileSync(checksum, checksumLine(archive, name));
    const bytes = files.reduce((sum, file) => sum + file.data.length, 0);
    log(`${name}: ${files.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB unpacked, ${(archive.length / 1024 / 1024).toFixed(1)} MB packed${platforms ? `, for ${platforms.join(' and ')}` : ''}`);
    return { ok: true, archive: archivePath, checksum, sha256: sha256(archive), info, bytes, files: files.length };
}
