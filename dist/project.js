/**
 * Where a module's data for one project lives, `<projectPath>/.kehikot/<module>/<file>.json`, and
 * how a project's `.gitignore` says not to commit it. Strings and pure functions only: no I/O, and
 * paths are joined POSIX-style with `/`.
 * Design notes: docs/project-data.md.
 */
import { MESSAGE_PREFIXES } from './constants.js';
import { MODULE_ID } from './ids.js';
/**
 * The folder in a project that holds the app's data, spelled once; this is the only place it is
 * spelled. `kehikot` (the app), not `kehikko` (one canvas inside it).
 */
export const KEHIKOT_DIR = '.kehikot';
/**
 * What a module may call a file inside its own folder: lowercase, digits and dashes, no dot and no
 * slash, so no accepted spelling can leave the folder. A file name is a constant in the module that
 * owns it, never a string that arrived over the wire.
 */
export const DATA_FILE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;
/**
 * What a module's folder inside `.kehikot/` may be called, once derived. Checked by `moduleFolder()`
 * as a rule of its own rather than inherited from `MODULE_ID`; first and last characters must be a
 * letter or a digit, so neither `.` nor `..` passes.
 */
export const MODULE_FOLDER = /^[a-z0-9][a-z0-9.-]{0,62}[a-z0-9]$/;
/** Join POSIX-style, tolerating a trailing slash on the left. */
function joined(left, right) {
    return `${left.replace(/\/+$/, '')}/${right}`;
}
/**
 * A module's folder name, from its id: `kehikot.checklist` and the pre-rename `roadmap.checklist`
 * both become `checklist`; an id with neither prefix is used whole. Throws, rather than falling
 * back, when the id is not a `MODULE_ID` or the derived name is not a `MODULE_FOLDER`.
 */
export function moduleFolder(moduleId) {
    if (typeof moduleId !== 'string' || !MODULE_ID.test(moduleId)) {
        throw new Error(`"${moduleId}" is not a module id, so there is no folder name to derive from it. A folder under `
            + `${KEHIKOT_DIR}/ is named after the module that owns it, and a name derived from an id is a path built `
            + 'from data — it is checked rather than trusted.');
    }
    const prefix = MESSAGE_PREFIXES.find((p) => moduleId.startsWith(p));
    const name = prefix ? moduleId.slice(prefix.length) : moduleId;
    if (!MODULE_FOLDER.test(name)) {
        throw new Error(`"${moduleId}" gives the folder name "${name}", which is not one this package will join onto somebody's `
            + 'project root.');
    }
    return name;
}
/**
 * The `.kehikot` folder itself for a project, or `null` when there is no project (`null`,
 * `undefined` or a blank path). A caller must never turn that `null` into a guess such as its own
 * directory or the working directory.
 */
export function kehikotDir(projectPath) {
    if (typeof projectPath !== 'string')
        return null;
    const path = projectPath.trim();
    if (!path)
        return null;
    return joined(path, KEHIKOT_DIR);
}
/**
 * One module's own folder inside it, or `null` when there is no project. The directory a module
 * creates, confines itself to, and is the only owner of. Throws when `moduleId` is not a legal id.
 */
export function moduleDir(projectPath, moduleId) {
    const folder = moduleFolder(moduleId);
    const dir = kehikotDir(projectPath);
    return dir === null ? null : joined(dir, folder);
}
/**
 * One file this module keeps for this project (`<name>.json` in its folder), or `null` when there
 * is no project. Throws, rather than returning null, when `name` is not a `DATA_FILE` or `moduleId`
 * is not a legal id.
 */
export function moduleFile(projectPath, moduleId, name) {
    if (!DATA_FILE.test(name)) {
        throw new Error(`"${name}" is not a name a module may give one of its files. A file under ${KEHIKOT_DIR}/<module>/ is spelled `
            + 'with lowercase letters, digits and dashes, and is a constant in the module that owns it — never a string '
            + 'that arrived from anywhere.');
    }
    const dir = moduleDir(projectPath, moduleId);
    return dir === null ? null : joined(dir, `${name}.json`);
}
/**
 * Is `child` at or beneath `parent`? String comparison only: it knows nothing about symlinks,
 * uncollapsed `..` or whether either path exists. A caller confining a write must `realpath` both
 * sides first and compare the results.
 */
export function within(parent, child) {
    const root = parent.replace(/\/+$/, '');
    if (!root)
        return false;
    return child === root || child.startsWith(`${root}/`);
}
/**
 * What a project's `.gitignore` is given, once, when that folder is first made: a comment saying
 * what the folder is, and the rule `.kehikot/`, which ignores the whole folder anywhere in the tree.
 */
export const KEHIKOT_IGNORE = `# Modules on a kehikot host keep this project's data here — checklists, notes,
# journeys, questions — as plain JSON, one folder per module, so it sits beside
# the work instead of inside somebody else's app. It is ignored because it is
# one person's working material and not the project's. Remove these lines to
# share it with everyone who clones this repository.
${KEHIKOT_DIR}/
`;
/**
 * Does this `.gitignore` already ignore the folder? Generous on purpose: `.kehikot`, `.kehikot/`,
 * `/.kehikot/`, `**\/.kehikot/` and a commented-out `#.kehikot` all count. Not a gitignore engine;
 * the answer is only for deciding not to append.
 */
export function ignoresKehikot(gitignore) {
    return gitignore.split(/\r?\n/).some((line) => {
        const rule = line
            .trim()
            .replace(/^#+\s*/, '')
            .replace(/^!/, '')
            .replace(/\/+$/, '');
        if (!rule)
            return false;
        return rule === KEHIKOT_DIR || rule.endsWith(`/${KEHIKOT_DIR}`);
    });
}
/**
 * The text a `.gitignore` should have after this convention is added to it; the same text back,
 * unchanged, when it already ignores the folder. Append-only: a blank line if needed, then
 * `KEHIKOT_IGNORE`. Run it once, when the folder is first created, not on every write.
 */
export function withKehikotIgnored(gitignore) {
    if (ignoresKehikot(gitignore))
        return gitignore;
    if (!gitignore.trim())
        return KEHIKOT_IGNORE;
    const ends = gitignore.endsWith('\n') ? gitignore : `${gitignore}\n`;
    return `${ends}\n${KEHIKOT_IGNORE}`;
}
/**
 * The text a `.gitignore` should have after this convention is taken out of it. Removes every
 * uncommented rule ignoring the folder, the comment lines directly above it and a stranded blank
 * line; leaves a commented-out `#.kehikot/` and a negation (`!.kehikot/…`) alone. Idempotent.
 */
export function withoutKehikotIgnored(gitignore) {
    const lines = gitignore.split('\n');
    const drop = new Set();
    for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i].trim();
        /* The rule itself, uncommented and un-negated: unlike `ignoresKehikot`, a commented-out
           rule is not one here. */
        if (line.startsWith('#') || line.startsWith('!'))
            continue;
        /* `.kehikot/`, `.kehikot` and `.kehikot/*` are one rule spelled three ways. */
        const rule = line.replace(/\/\*$/, '').replace(/\/+$/, '');
        if (!rule || (rule !== KEHIKOT_DIR && !rule.endsWith(`/${KEHIKOT_DIR}`)))
            continue;
        drop.add(i);
        /* The comment that introduces it, however many lines it runs to. */
        let top = i;
        for (let above = i - 1; above >= 0 && lines[above].trim().startsWith('#'); above -= 1) {
            drop.add(above);
            top = above;
        }
        /* And the blank line above that, but only one: the separator `withKehikotIgnored` adds, so
           that adding the rule and removing it again gives back the same file. */
        if (top > 0 && lines[top - 1].trim() === '')
            drop.add(top - 1);
    }
    if (drop.size === 0)
        return gitignore;
    /* Drop a blank only where the removal left two blanks together or one at the very top, so
       existing spacing is kept. */
    const kept = lines.filter((_, i) => !drop.has(i));
    const tidied = [];
    for (const line of kept) {
        const blank = line.trim() === '';
        const last = tidied[tidied.length - 1];
        if (blank && (tidied.length === 0 || last?.trim() === ''))
            continue;
        tidied.push(line);
    }
    /* A file that is now nothing but whitespace is empty, not a stack of blank
       lines: this function is the only thing that ever emptied it. */
    if (tidied.every((line) => line.trim() === ''))
        return '';
    const out = tidied.join('\n');
    return out.endsWith('\n') ? out : `${out}\n`;
}
//# sourceMappingURL=project.js.map