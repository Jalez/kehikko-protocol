import { statSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { z } from 'zod';
import { DOOR_PROJECT_SAYS, PLACE_PARAM, PLACE_TOKEN, doorContext, placeResult } from '../door.js';
import { PROJECT_ID } from '../ids.js';
import { LIMITS } from '../limits.js';
import { frameOrigins } from './origins.js';
/**
 * Asking the host one question a module's SERVER has: is this folder a project a person added here?
 * A page tells its server a path, and the server has no other way to know the path is one the host
 * handed out. Loopback only, one path in and one answer out, and failing closed: no answer is "no".
 * Since 2.3.0 the answer also says the project's id, and where a project that USED to be at the
 * folder is now (`movedTo`). Since 2.21.1 a "yes" is kept for a while (`keepMs`) while the same folder
 * is at the path, so a page that polls does not ask the host on every request. Design notes:
 * docs/serving.md.
 */
/** The host's route, `GET /host/is-project?path=<absolute folder>`, answered to programs on this machine. */
export const IS_PROJECT_PATH = '/host/is-project';
/** An optional field a host may send: read when it is well formed, dropped (not fatal) when it is not. */
const optional = (schema) => schema.optional().catch(undefined);
/**
 * What the host answers: `{ ok: true, project: boolean }`, and since 2.3.0 optionally
 * - `id`: the project's id (`PROJECT_ID`) — of the project at the folder, or, with `movedTo`, of the
 *   project that was there;
 * - `movedTo`: the folder is not a project, but it is a path a project HAD, and that project is now at
 *   this absolute folder;
 * - `missing`: the folder is a project the host holds whose folder is not on disk now;
 * - `why`: a sentence for a person.
 * A 2.2 host sends none of them. A malformed optional field is dropped; anything without `ok: true`
 * and `project` is not an answer.
 */
export const isProjectResult = z.object({
    ok: z.literal(true),
    project: z.boolean(),
    id: optional(z.string().regex(PROJECT_ID)),
    movedTo: optional(z.string().min(1).max(4096).refine((path) => isAbsolute(path))),
    missing: optional(z.boolean()),
    why: optional(z.string().max(LIMITS.REASON)),
});
/** The origins a host may be asked on: `KEHIKOT_ORIGINS` and its fallbacks, kept to `http(s)` loopback. */
function hostOrigins(env) {
    const out = [];
    for (const origin of frameOrigins(env)) {
        try {
            const url = new URL(origin);
            if ((url.protocol === 'http:' || url.protocol === 'https:') && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
                out.push(url.origin);
        }
        catch {
            /* Not a URL: nobody to ask there. */
        }
    }
    return [...new Set(out)];
}
/** The URLs `hostProject` asks, in order, for one folder. Pure; exported for tests and for a module that wants to ask its own way. */
export function hostIsProjectUrls(folder, env = process.env) {
    return hostOrigins(env).map((origin) => `${origin}${IS_PROJECT_PATH}?path=${encodeURIComponent(folder)}`);
}
/** `why` when no origin gave an answer of the right shape. */
export const NO_HOST_ANSWERED = 'No Kehikot host answered.';
/** Kept answers and answers on their way, per `fetch` (a test's fake host is its own), by the URLs asked. */
let keptBy = new WeakMap();
let askingBy = new WeakMap();
function mapOf(by, asked) {
    let map = by.get(asked);
    if (!map)
        by.set(asked, (map = new Map()));
    return map;
}
/** The folder at `path` as the filesystem has it — device and inode — or null when no folder is there. */
function folderAt(path) {
    try {
        const stat = statSync(path);
        return stat.isDirectory() ? { dev: stat.dev, ino: stat.ino } : null;
    }
    catch {
        return null;
    }
}
/**
 * Forgets every kept answer (2.21.1): the next `hostProject` of each folder asks the host. For a
 * module that has heard, its own way, that a project was removed or moved.
 */
export function forgetHostProjects() {
    keptBy = new WeakMap();
    askingBy = new WeakMap();
}
/**
 * What the host says about `folder` (2.3.0). Asks each origin in `KEHIKOT_ORIGINS` (the same list
 * `frameOrigins` reads; non-loopback and `tauri:` entries are skipped) until one says `project:
 * true`. A `project: false` that names `movedTo` is kept over a bare one. Fails closed: a relative
 * path, no answer, a refusal, a slow host or a reply of another shape is `project: false`. Never throws.
 *
 * Since 2.21.1 a `project: true` is KEPT, for `keepMs` (`LIMITS.HOST_PROJECT_KEEP_MS`, 60 s), and
 * given again without asking — but only while the very folder the host vouched for is still at the
 * path (same device and inode). So a move is followed at once: the path is empty, or holds another
 * folder, and the host is asked, which says `movedTo`. An answer that puts the same project id
 * anywhere else, or says that id moved, drops what was kept for it. A "no" is never kept: a project
 * added a moment ago is a project at once. Asks that arrive together while one is on its way share
 * it. What is kept is a "yes" for a path the host might since have dropped (a project REMOVED,
 * folder left as it was), for at most `keepMs`; `forgetHostProjects()` drops everything.
 */
export async function hostProject(folder, options = {}) {
    if (typeof folder !== 'string' || !folder.trim() || !isAbsolute(folder.trim()))
        return { project: false, why: 'Not an absolute folder.' };
    const path = folder.trim();
    const asked = options.fetch ?? fetch;
    const urls = hostIsProjectUrls(path, options.env ?? process.env);
    const keepMs = options.keepMs ?? LIMITS.HOST_PROJECT_KEEP_MS;
    if (keepMs <= 0 || urls.length === 0)
        return askHost(path, urls, asked, options);
    const now = options.now ?? Date.now;
    const key = urls.join(' ');
    const kept = mapOf(keptBy, asked);
    const here = folderAt(path);
    const had = kept.get(key);
    if (had && here && had.dev === here.dev && had.ino === here.ino && now() - had.at < keepMs) {
        return { project: true, path, ...(had.id ? { id: had.id } : {}) };
    }
    kept.delete(key);
    const asking = mapOf(askingBy, asked);
    const already = asking.get(key);
    if (already)
        return already;
    const answer = askHost(path, urls, asked, options).then((said) => {
        const id = said.id;
        if (id)
            for (const [other, one] of kept)
                if (one.id === id && other !== key)
                    kept.delete(other);
        const after = folderAt(path);
        if (said.project && here && after && here.dev === after.dev && here.ino === after.ino) {
            kept.set(key, { ...(said.id ? { id: said.id } : {}), at: now(), dev: here.dev, ino: here.ino });
        }
        return said;
    });
    asking.set(key, answer);
    try {
        return await answer;
    }
    finally {
        if (asking.get(key) === answer)
            asking.delete(key);
    }
}
/** One round of asking the host, origin by origin: what `hostProject` did before 2.21.1, unchanged. */
async function askHost(path, urls, asked, options) {
    let no = null;
    for (const url of urls) {
        const control = new AbortController();
        const timer = setTimeout(() => control.abort(), options.timeoutMs ?? LIMITS.HOST_ASK_MS);
        try {
            const response = await asked(url, { signal: control.signal });
            if (!response.ok)
                continue;
            const read = isProjectResult.safeParse(await response.json());
            if (!read.success)
                continue;
            const said = read.data;
            if (said.project)
                return { project: true, path, ...(said.id ? { id: said.id } : {}) };
            if (no?.movedTo)
                continue;
            no = {
                project: false,
                ...(said.movedTo ? { movedTo: said.movedTo } : {}),
                ...(said.id ? { id: said.id } : {}),
                ...(said.missing !== undefined ? { missing: said.missing } : {}),
                ...(said.why ? { why: said.why } : {}),
            };
        }
        catch {
            /* This origin is not the host, or is not listening: the next one. */
        }
        finally {
            clearTimeout(timer);
        }
    }
    return no ?? { project: false, why: NO_HOST_ANSWERED };
}
/**
 * Whether the host holds `folder` as a project: `(await hostProject(folder)).project`. True only
 * when an origin says `project: true`; a former path (`movedTo`) is `false`. Never throws.
 */
export async function hostHasProject(folder, options = {}) {
    return (await hostProject(folder, options)).project;
}
/**
 * Resolves the project a door was handed (2.3.0): a tool call's arguments (read with `doorContext`,
 * so `projectPath` still counts) or the folder itself. Asks the host; when the folder is a path a
 * project had, follows `movedTo` ONCE — the new path must answer `project: true` with the same id —
 * and otherwise refuses in `DOOR_PROJECT_SAYS`'s words. Never throws. Server-side only, like
 * `hostProject`.
 */
export async function resolveDoorProject(input, options = {}) {
    const named = typeof input === 'string' ? (input.trim() ? input.trim() : null) : doorContext(input).project?.trim() || null;
    if (!named)
        return { ok: false, reason: 'unnamed', why: DOOR_PROJECT_SAYS.unnamed };
    const first = await hostProject(named, options);
    if (first.project)
        return { ok: true, path: first.path, ...(first.id ? { id: first.id } : {}) };
    if (!first.movedTo)
        return { ok: false, reason: 'not-project', why: DOOR_PROJECT_SAYS.notProject(named) };
    const refuse = { ok: false, reason: 'moved', why: DOOR_PROJECT_SAYS.moved(first.movedTo), movedTo: first.movedTo };
    if (!first.id || first.movedTo === named)
        return refuse;
    const then = await hostProject(first.movedTo, options);
    if (!then.project || then.id !== first.id)
        return refuse;
    return { ok: true, path: then.path, id: then.id, movedFrom: named };
}
/* ------------------------------------------------------------------------ *
 * Whose place is this conversation? (2.4.0)
 * ------------------------------------------------------------------------ */
/**
 * The host's route for a session's place: `GET /host/place?kehikot-place=<token>` answers
 * `placeResult` (2.4.0). Programs on this machine; a module's SERVER asks it, never its page.
 */
export const PLACE_PATH = '/host/place';
/**
 * The place token a door request carries, or null: the `kehikot-place` query parameter
 * (`PLACE_PARAM`), read from what a door has — the query (`DoorsOptions.answer` is handed it), a
 * whole URL, or a request with a `url`. A value that is not spelled like a token is null.
 */
export function placeTokenOf(input) {
    let query = null;
    if (input instanceof URLSearchParams)
        query = input;
    else {
        const raw = typeof input === 'string' ? input : input?.url;
        if (typeof raw === 'string') {
            try {
                query = new URL(raw, 'http://127.0.0.1').searchParams;
            }
            catch {
                query = null;
            }
        }
    }
    const token = query?.get(PLACE_PARAM) ?? null;
    return token !== null && PLACE_TOKEN.test(token) ? token : null;
}
/** The URLs `hostPlace` asks, in order. Pure; exported for tests. */
export function hostPlaceUrls(token, env = process.env) {
    return hostOrigins(env).map((origin) => `${origin}${PLACE_PATH}?${PLACE_PARAM}=${encodeURIComponent(token)}`);
}
/**
 * The place the host minted `token` for, or null — no such token, no host answering, or an answer of
 * another shape (2.4.0). Asks each origin of `KEHIKOT_ORIGINS` until one knows the token. Never throws.
 */
export async function hostPlace(token, options = {}) {
    if (typeof token !== 'string' || !PLACE_TOKEN.test(token))
        return null;
    const asked = options.fetch ?? fetch;
    for (const url of hostPlaceUrls(token, options.env ?? process.env)) {
        const control = new AbortController();
        const timer = setTimeout(() => control.abort(), options.timeoutMs ?? LIMITS.HOST_ASK_MS);
        try {
            const response = await asked(url, { signal: control.signal });
            if (!response.ok)
                continue;
            const read = placeResult.safeParse(await response.json());
            if (read.success && read.data.place && read.data.place.token === token)
                return read.data.place;
        }
        catch {
            /* Not this origin. */
        }
        finally {
            clearTimeout(timer);
        }
    }
    return null;
}
/**
 * The session's place for one door request (2.4.0): the token out of the request (`placeTokenOf`),
 * then `hostPlace`. Null when the call carried no token or the host does not know it — and the door
 * then answers exactly as it did before 2.4.0. Combine with `placeDefaults(args, place)` and say
 * `DOOR_PLACE_SAYS.used(from, place)` when anything was taken from it.
 */
export async function resolveDoorPlace(input, options = {}) {
    const token = placeTokenOf(input);
    return token ? hostPlace(token, options) : null;
}
