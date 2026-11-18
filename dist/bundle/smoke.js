import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WELL_KNOWN } from '../constants.js';
import { BUNDLE_RUN, checksumOf } from './format.js';
import { readBundleInfo, unpackBundle } from './unpack.js';
async function freePort() {
    return new Promise((done, fail) => {
        const server = createServer();
        server.once('error', fail);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = typeof address === 'object' && address ? address.port : 0;
            server.close(() => done(port));
        });
    });
}
/** One GET over loopback, with node:http: the answer a host would get, whatever a test environment did to `fetch`. */
function get(url, headers = {}, timeoutMs = 1000) {
    return new Promise((done, fail) => {
        const asked = httpRequest(url, { method: 'GET', headers, timeout: timeoutMs }, (response) => {
            let body = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => (body += chunk));
            response.on('end', () => done({ status: response.statusCode ?? 0, type: String(response.headers['content-type'] ?? ''), body }));
            response.on('error', fail);
        });
        asked.on('timeout', () => asked.destroy(new Error('timed out')));
        asked.on('error', fail);
        asked.end();
    });
}
export async function smokeBundle(options) {
    const log = options.log ?? ((line) => console.log(line));
    const scratch = mkdtempSync(join(tmpdir(), 'kehikot-smoke-'));
    let child = null;
    let output = '';
    try {
        let dir = options.dir;
        if (!dir) {
            if (!options.archive)
                return { ok: false, why: 'Give a bundle folder or an archive to start.' };
            const sha = options.sha256 ?? checksumOf(readFileSync(`${options.archive}.sha256`, 'utf8'));
            if (!sha)
                return { ok: false, why: `${options.archive}.sha256 says no sha256.` };
            const unpacked = unpackBundle(new Uint8Array(readFileSync(options.archive)), join(scratch, 'bundle'), { sha256: sha });
            if (!unpacked.ok)
                return unpacked;
            dir = unpacked.dir;
        }
        const info = readBundleInfo(dir);
        if (!info)
            return { ok: false, why: `${dir} has no readable bundle.json.` };
        const home = join(scratch, 'home');
        mkdirSync(home, { recursive: true });
        const port = await freePort();
        const bunDir = options.bun ? join(options.bun, '..') : /bun(\.exe)?$/.test(process.execPath) ? join(process.execPath, '..') : null;
        const env = {
            PATH: [bunDir, process.env.PATH ?? ''].filter(Boolean).join(':'),
            HOME: home,
            TMPDIR: join(scratch, 'tmp'),
            PORT: String(port),
            KEHIKOT_MODULES_DIR: join(scratch, 'modules'),
            KEHIKOT_FRAME_DB: join(scratch, 'frame.sqlite'),
            KEHIKOT_VERSIONS_DIR: join(scratch, 'versions'),
            KEHIKOT_INSTALLS_DIR: join(scratch, 'installed'),
            KEHIKOT_LOGS_DIR: join(scratch, 'logs'),
            KEHIKOT_OFFICIAL_LIST: 'off',
            CLAUDE_CONFIG_DIR: join(home, '.claude'),
            XDG_CONFIG_HOME: join(home, '.config'),
            XDG_DATA_HOME: join(home, '.local', 'share'),
        };
        mkdirSync(env.TMPDIR, { recursive: true });
        const started = Date.now();
        child = spawn(join(dir, BUNDLE_RUN), [], { cwd: dir, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
        child.stdout?.on('data', (chunk) => (output += chunk.toString()));
        child.stderr?.on('data', (chunk) => (output += chunk.toString()));
        let exited = null;
        child.on('exit', (code) => (exited = code ?? -1));
        const origin = `http://127.0.0.1:${port}`;
        const until = started + (options.withinMs ?? 30_000);
        let manifest = null;
        while (Date.now() < until && exited === null) {
            try {
                const response = await get(`${origin}${WELL_KNOWN}`);
                if (response.status === 200) {
                    manifest = JSON.parse(response.body);
                    break;
                }
            }
            catch {
                /* not up yet */
            }
            await new Promise((wake) => setTimeout(wake, 200));
        }
        const manifestMs = Date.now() - started;
        if (!manifest) {
            const how = exited !== null ? `exited (${exited}) before it answered` : `did not answer its manifest within ${Math.round((options.withinMs ?? 30_000) / 1000)} s`;
            return { ok: false, why: `The bundle of ${info.id} ${info.version} ${how}.`, output };
        }
        if (manifest.id !== info.id)
            return { ok: false, why: `The bundle answers as ${String(manifest.id)}, not ${info.id}.`, output };
        if (manifest.version !== info.version)
            return { ok: false, why: `The bundle answers version ${String(manifest.version)}, not ${info.version}.`, output };
        log(`${info.id} ${info.version} answered its manifest in ${manifestMs} ms`);
        let page = false;
        if (Object.hasOwn(info.files, 'dist/index.html')) {
            const response = await get(`${origin}/`, { accept: 'text/html', 'sec-fetch-dest': 'iframe' }, 5000);
            const body = response.body;
            if (response.status !== 200 || !/<html|<!doctype/i.test(body)) {
                return { ok: false, why: `The bundle answers its manifest and not its page: ${response.status} ${body.slice(0, 300)}`, output };
            }
            const script = body.match(/<script[^>]+src="([^"]+)"/)?.[1];
            if (script && !/^https?:/.test(script)) {
                const asset = await get(new URL(script, `${origin}/`).href, {}, 5000);
                if (asset.status !== 200)
                    return { ok: false, why: `The page's script ${script} answers ${asset.status}.`, output };
            }
            page = true;
            log(`${info.id} ${info.version} served its page`);
        }
        return { ok: true, info, manifestMs, page };
    }
    finally {
        if (child?.pid) {
            try {
                process.kill(-child.pid, 'SIGTERM');
            }
            catch {
                /* gone */
            }
            const pid = child.pid;
            await new Promise((wake) => setTimeout(wake, 300));
            try {
                process.kill(-pid, 'SIGKILL');
            }
            catch {
                /* gone */
            }
        }
        rmSync(scratch, { recursive: true, force: true });
    }
}
