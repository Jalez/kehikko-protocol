import { LIMITS } from '../limits.js';
import { SETTINGS_PASS, SETTINGS_PASS_PATH, SETTINGS_PATH, doorMethodParams, settingsPassResult, settingsSetRefusal, settingsValues, } from '../settings.js';
import { frameOrigins } from './origins.js';
import { sameTicket } from './ticket.js';
/**
 * A module's settings door (2.15.0): `settings.get` and `settings.set` at `SETTINGS_PATH`, answered
 * from the module's own store, and the question a module's server asks the host about a person's
 * pass. Node-only, like the rest of `/serve`. Design notes: docs/settings.md.
 */
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
/** The URLs `hostVouches` asks, in order. Pure; exported for tests. */
export function hostVouchUrls(pass, about, env = process.env) {
    const query = new URLSearchParams({ pass, module: about.module, key: about.key });
    if (about.project)
        query.set('project', about.project);
    return hostOrigins(env).map((origin) => `${origin}${SETTINGS_PASS_PATH}?${query.toString()}`);
}
/**
 * Whether the host minted `pass` for a person's change of `about.key` of `about.module` (in
 * `about.project`). Asks each origin of `KEHIKOT_ORIGINS` until one says `person: true`. Fails closed:
 * a malformed pass, no answer, a refusal, a slow host or a reply of another shape is `false`. Never throws.
 */
export async function hostVouches(pass, about, options = {}) {
    if (typeof pass !== 'string' || !SETTINGS_PASS.test(pass))
        return false;
    const asked = options.fetch ?? fetch;
    for (const url of hostVouchUrls(pass, about, options.env ?? process.env)) {
        const control = new AbortController();
        const timer = setTimeout(() => control.abort(), options.timeoutMs ?? LIMITS.HOST_ASK_MS);
        try {
            const response = await asked(url, { signal: control.signal });
            if (!response.ok)
                continue;
            const read = settingsPassResult.safeParse(await response.json());
            if (read.success && read.data.person)
                return true;
        }
        catch {
            /* Not this origin. */
        }
        finally {
            clearTimeout(timer);
        }
    }
    return false;
}
const json = (status, body) => ({ status, body });
/**
 * The `answer` for `SETTINGS_PATH`, or `null` for any other path, to call first from a module's own
 * `answer`:
 *
 *     const settings = settingsDoor({ module: ID, fields: SETTINGS, read, write, ticket: TICKET })
 *     // inside answer(method, path, query, body, ticket):
 *     const said = await settings(method, path, query, body, ticket)
 *     if (said) return said
 *
 * `GET` answers `settingsGetResult`. `POST` checks the change with `settingsSetRefusal` — the person is
 * a call carrying the page's ticket, or `by: 'person'` with a pass the host vouches for — then calls
 * `write`, and answers `settingsSetResult` with the values as they then stand. A refusal is 200 with
 * `outcome: 'refused'`; a call that is not one (no key, a malformed pass) is 400.
 */
export function settingsDoor(options) {
    const vouch = options.vouch ?? ((pass, about) => hostVouches(pass, about));
    const valuesOf = async (project) => {
        const read = await options.read(project);
        return {
            values: settingsValues(options.fields, read.values),
            ...(read.file ? { file: read.file } : {}),
            ...(read.problem ? { problem: read.problem.slice(0, LIMITS.REASON) } : {}),
        };
    };
    return async (method, path, query, body, ticket) => {
        if (path !== SETTINGS_PATH)
            return null;
        if (method === 'GET') {
            const asked = doorMethodParams['settings.get'].safeParse({ project: query.get('project') ?? undefined });
            if (!asked.success)
                return json(400, { ok: false, error: asked.error.issues[0]?.message ?? 'not a settings.get' });
            return json(200, { ok: true, ...(await valuesOf(asked.data.project ?? null)) });
        }
        if (method !== 'POST')
            return json(405, { ok: false, error: `${SETTINGS_PATH} answers GET and POST.` });
        const asked = doorMethodParams['settings.set'].safeParse(body ?? {});
        if (!asked.success)
            return json(400, { ok: false, error: asked.error.issues[0]?.message ?? 'not a settings.set' });
        const change = asked.data;
        const project = change.project ?? null;
        const ticketed = options.ticket !== undefined && sameTicket(ticket, options.ticket);
        const person = ticketed ||
            (change.by === 'person' && change.pass !== undefined && (await vouch(change.pass, { module: options.module, key: change.key, ...(change.project ? { project: change.project } : {}) })));
        const refused = settingsSetRefusal(options.fields, { key: change.key, value: change.value, project: change.project }, person);
        const answer = (result) => json(200, { ok: true, ...result });
        if (refused)
            return answer({ outcome: 'refused', why: refused.slice(0, LIMITS.REASON) });
        const notWritten = await options.write(project, change.key, change.value);
        if (notWritten)
            return answer({ outcome: 'refused', why: notWritten.slice(0, LIMITS.REASON) });
        return answer({ outcome: 'saved', why: '', values: (await valuesOf(project)).values });
    };
}
