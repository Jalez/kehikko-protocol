import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { EPIC_SLUG } from '../ids.js';
import { LIMITS } from '../limits.js';
import { PLAN_FILE, PLAN_VERSION, planIn, planSchema, plansIn } from '../plan.js';
import { MODULE_FOLDER, PROJECT_FILE, kehikotDir, moduleDir, moduleFile, moduleFolder, within } from '../project.js';
/**
 * The file `plan.ts` describes, opened (2.21.0): a module writes its own (`writePlan`), a host reads
 * every module's (`readPlans`). Synchronous, like `holdings.ts` beside it, so nothing runs between a
 * read and the write that follows. Storage is only ever `<project>/.kehikot/<module>/steps.json`.
 */
/** The project's root, resolved, or null for no project, a relative path or a folder that is not there. */
function rootOf(projectPath) {
    if (typeof projectPath !== 'string' || !projectPath.trim() || !isAbsolute(projectPath.trim()))
        return null;
    try {
        return realpathSync(projectPath.trim());
    }
    catch {
        return null;
    }
}
/**
 * Every module's published plans in a project, by folder name order: each folder directly under
 * `.kehikot/` is asked for a `steps.json`, and no module is named. Never throws and never writes;
 * `[]` for no project. A file over `LIMITS.HOLDINGS_BYTES`, one that is not a regular file, one that
 * resolves outside the project and one that is not JSON are skipped; inside a file, junk costs the
 * entry it is in (`plansIn`). A folder whose file holds no epic is still listed: it has published.
 */
export function readPlans(projectPath) {
    const root = rootOf(projectPath);
    const dir = kehikotDir(projectPath);
    if (root === null || dir === null)
        return [];
    let folders;
    try {
        folders = readdirSync(dir).filter((name) => MODULE_FOLDER.test(name) && name !== PROJECT_FILE).sort().slice(0, LIMITS.HOLDINGS_MODULES);
    }
    catch {
        return [];
    }
    const out = [];
    for (const folder of folders) {
        const file = `${dir}/${folder}/${PLAN_FILE}.json`;
        try {
            /* A link out of the project is another project's word; not followed. Only a regular file is opened. */
            const real = realpathSync(file);
            if (!within(root, real))
                continue;
            const found = statSync(real);
            if (!found.isFile() || found.size > LIMITS.HOLDINGS_BYTES)
                continue;
            const parsed = JSON.parse(readFileSync(real, 'utf8'));
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
                continue;
            const said = parsed.module;
            let module = null;
            try {
                if (typeof said === 'string' && moduleFolder(said) === folder)
                    module = said;
            }
            catch {
                /* Not a module id: the file names no module. */
            }
            out.push({ folder, module, epics: plansIn(parsed) });
        }
        catch {
            /* No file here, or not JSON: this folder publishes no plan. */
        }
    }
    return out;
}
/** Every published plan for one epic, by folder order: `readPlans` narrowed to the epic. */
export function readPlansFor(projectPath, epic) {
    if (typeof epic !== 'string' || !EPIC_SLUG.test(epic))
        return [];
    return readPlans(projectPath).flatMap(({ folder, module, epics }) => Object.hasOwn(epics, epic) ? [{ folder, module, plan: epics[epic] }] : []);
}
/**
 * Publish ONE module's plan for ONE epic: replaces what its `steps.json` said for that epic and leaves
 * every other epic, and every key this does not know, as it was. `null` takes the epic out (the module
 * no longer says anything about it); a plan with no steps says it has none. The plan is held to
 * `planSchema` and refused whole, with the issue, when it does not fit; an `under`, `after` or `phase`
 * naming nothing in the plan is dropped and reported. Atomic (a temporary file, renamed). Null when
 * there is no project. Throws for an epic that is not a slug, an id that is not a module's, and a
 * `.kehikot` or module folder that resolves outside the project. Whatever has the file's name and is
 * not a readable JSON object is set aside as `steps.json.unreadable` (one, the latest).
 */
export function writePlan(projectPath, moduleId, epic, plan) {
    const file = moduleFile(projectPath, moduleId, PLAN_FILE);
    const dir = moduleDir(projectPath, moduleId);
    if (typeof epic !== 'string' || !EPIC_SLUG.test(epic))
        throw new Error(`"${epic}" is not an epic's slug, so there is nothing to file a plan under.`);
    const root = rootOf(projectPath);
    if (file === null || dir === null || root === null)
        return null;
    /* What is to be said, in the stored form. Nothing here has touched the disk yet. */
    const dropped = [];
    let said = null;
    if (plan !== null) {
        const parsed = planSchema.safeParse(plan);
        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            throw new Error(`The plan for ${epic} does not fit the protocol's shape: ${issue?.path.join('.') || 'plan'} — ${issue?.message ?? 'malformed'}.`);
        }
        said = planIn(parsed.data);
        for (const given of parsed.data.steps) {
            const kept = said.steps.find((one) => one.id === given.id);
            if (given.under !== undefined && kept.under === undefined)
                dropped.push(`Step ${given.id}: under ${given.under}, which is not another step of this plan.`);
            for (const one of given.after)
                if (!kept.after.includes(one))
                    dropped.push(`Step ${given.id}: after ${one}, which is not another step of this plan.`);
            if (given.phase !== undefined && kept.phase === undefined)
                dropped.push(`Step ${given.id}: phase ${given.phase}, which is not one of this plan's phases.`);
        }
    }
    const outside = (at) => new Error(`${at} resolves outside ${root}. A module's plan is written inside the project it is about.`);
    const base = kehikotDir(projectPath);
    let above = null;
    try {
        above = realpathSync(base);
    }
    catch {
        /* Not there yet: made below, inside the project. */
    }
    if (above !== null && !within(root, above))
        throw outside(base);
    mkdirSync(dir, { recursive: true });
    if (!within(root, realpathSync(dir)))
        throw outside(dir);
    let before = null;
    let whole = {};
    const found = lstatSync(file, { throwIfNoEntry: false });
    if (found !== undefined) {
        try {
            if (!found.isFile())
                throw new Error('not a file');
            before = readFileSync(file, 'utf8');
            const parsed = JSON.parse(before);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
                throw new Error('not an object');
            whole = parsed;
        }
        catch {
            renameSync(file, `${file}.unreadable`);
            before = null;
            whole = {};
        }
    }
    const kept = whole.epics && typeof whole.epics === 'object' && !Array.isArray(whole.epics) ? whole.epics : {};
    /* In place where the epic was already said, so a write of the same plan is the same file. */
    const epics = {};
    for (const [slug, value] of Object.entries(kept)) {
        if (slug !== epic)
            epics[slug] = value;
        else if (said !== null)
            epics[slug] = said;
    }
    if (said !== null && !Object.hasOwn(epics, epic))
        epics[epic] = said;
    if (Object.keys(epics).length > LIMITS.HOLDINGS_EPICS) {
        throw new Error(`${moduleId} already publishes plans for ${LIMITS.HOLDINGS_EPICS} epics; take one out before adding another.`);
    }
    const after = `${JSON.stringify({ ...whole, version: typeof whole.version === 'number' ? whole.version : PLAN_VERSION, module: moduleId, epics }, null, 2)}\n`;
    if (after === before)
        return { file, changed: false, dropped };
    const temporary = `${file}.${process.pid}.tmp`;
    try {
        rmSync(temporary, { force: true });
        writeFileSync(temporary, after, { flag: 'wx' });
        renameSync(temporary, file);
    }
    catch (error) {
        rmSync(temporary, { force: true });
        throw error;
    }
    return { file, changed: true, dropped };
}
