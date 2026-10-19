import { isAbsolute } from 'node:path';
import { z } from 'zod';
import { DOOR_PROJECT_SAYS, doorContext } from '../door.js';
import { PROJECT_ID } from '../ids.js';
import { LIMITS } from '../limits.js';
import { frameOrigins } from './origins.js';
/**
 * Asking the host one question a module's SERVER has: is this folder a project a person added here?
 * A page tells its server a path, and the server has no other way to know the path is one the host
 * handed out. Loopback only, one path in and one answer out, and failing closed: no answer is "no".
 * Since 2.3.0 the answer also says the project's id, and where a project that USED to be at the
 * folder is now (`movedTo`). Design notes: docs/serving.md.
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
/**
 * What the host says about `folder` (2.3.0). Asks each origin in `KEHIKOT_ORIGINS` (the same list
 * `frameOrigins` reads; non-loopback and `tauri:` entries are skipped) until one says `project:
 * true`. A `project: false` that names `movedTo` is kept over a bare one. Fails closed: a relative
 * path, no answer, a refusal, a slow host or a reply of another shape is `project: false`. Never throws.
 */
export async function hostProject(folder, options = {}) {
    if (typeof folder !== 'string' || !folder.trim() || !isAbsolute(folder.trim()))
        return { project: false, why: 'Not an absolute folder.' };
    const path = folder.trim();
    const asked = options.fetch ?? fetch;
    let no = null;
    for (const url of hostIsProjectUrls(path, options.env ?? process.env)) {
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
