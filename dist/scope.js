import { z } from 'zod';
import { LIMITS } from './limits.js';
/**
 * 2.29.0. A module's SCOPE: what its content belongs to. Five words, each with the name a person is
 * shown and what it means. A module says which scopes it can work at, one mode per scope, the first
 * being its default (`modes` in the manifest); the person picks among those, per container, in the
 * host; the host tells the module the one in use as `context.scope`. A module that cannot work at a
 * scope does not list it, and nothing a host does makes it. Design notes: docs/manifest.md#scope-290.
 */
export const MODULE_SCOPES = ['machine', 'project', 'epic', 'part', 'kehikko'];
/** What a person is shown for each scope: a label, the same in every host. */
export const SCOPE_NAMES = {
    machine: 'This computer',
    project: 'Project',
    epic: 'Epic',
    part: 'Part',
    kehikko: 'Kehikko',
};
/** What each scope means, in one sentence, for a tooltip or a help page. */
export const SCOPE_MEANS = {
    machine: 'Shared across every project on this computer.',
    project: 'The whole project, whatever epic is open.',
    epic: 'The open epic.',
    part: 'Each part of the open epic.',
    kehikko: 'This kehikko: this arrangement of modules.',
};
/** The scope a module that does not say has, and the one an old or unknown word reads as. */
export const DEFAULT_SCOPE = 'epic';
/**
 * A scope word as a reader takes it: one of `MODULE_SCOPES`, or `epic` for anything else — absent,
 * the pre-2.29.0 `global` (which all its users meant as "not following the epic" and no host ever
 * acted on), or a word a later version adds.
 */
export function readScope(word) {
    return typeof word === 'string' && MODULE_SCOPES.includes(word) ? word : DEFAULT_SCOPE;
}
/** Whether a scope is about the open epic (`epic`, `part`): one a host cannot fill under "All epics". */
export function scopeNeedsEpic(scope) {
    return scope === 'epic' || scope === 'part';
}
/**
 * A mode's `scope` in a manifest. Typed as the five words (and `global`, the pre-2.29.0 word) for an
 * author, and read through `readScope`, so a manifest from an older module or a newer protocol still
 * parses: `global`, an unknown word and absence all read as `epic`.
 */
export const modeScopeSchema = z
    .enum(['machine', 'project', 'epic', 'part', 'kehikko', 'global'])
    .optional()
    .catch(undefined)
    .transform((word) => readScope(word));
/** A mode's `scopeSays`: what the module shows at that scope, in one line. Optional; trimmed; empty reads as absent. */
export const scopeSaysSchema = z
    .string()
    .trim()
    .max(LIMITS.SUMMARY)
    .optional()
    .catch(undefined)
    .transform((said) => (said ? said : undefined));
/**
 * Every scope a module can work at, default first: each mode's scope in the order written, once
 * (the first mode for a scope wins), then `project` when the deprecated `declares.scopes` lists it
 * and no mode does. Never empty: a module that says nothing works at `epic`. Takes a parsed manifest
 * or the raw object.
 */
export function supportedScopes(manifest) {
    const out = [];
    const seen = new Set();
    for (const mode of manifest?.modes ?? []) {
        const scope = readScope(mode?.scope);
        if (seen.has(scope))
            continue;
        seen.add(scope);
        const says = typeof mode?.scopeSays === 'string' ? mode.scopeSays.trim() : '';
        out.push({ scope, says, mode: typeof mode?.id === 'string' ? mode.id : '' });
    }
    if (!out.length)
        out.push({ scope: DEFAULT_SCOPE, says: '', mode: '' });
    if (!seen.has('project') && (manifest?.declares?.scopes ?? []).includes('project')) {
        out.push({ scope: 'project', says: '', mode: '' });
    }
    return out;
}
/** The scope a module works at unless the person picks another: its first mode's. */
export function defaultScope(manifest) {
    return supportedScopes(manifest)[0].scope;
}
/** Whether a module can work at a scope. */
export function supportsScope(manifest, scope) {
    return supportedScopes(manifest).some((one) => one.scope === scope);
}
/**
 * The scope a container works at: the person's pick when the module supports it, else the module's
 * default. A pick the module does not (or no longer) support is not an error; it reads as the default.
 */
export function activeScope(manifest, picked) {
    const word = typeof picked === 'string' ? picked : null;
    const supported = supportedScopes(manifest);
    return supported.find((one) => one.scope === word)?.scope ?? supported[0].scope;
}
/** What a module says it shows at a scope (`scopeSays`), or '' when it says nothing. */
export function scopeSaysOf(manifest, scope) {
    return supportedScopes(manifest).find((one) => one.scope === scope)?.says ?? '';
}
/**
 * The scope a host tells a container in `context.scope`, given the scope it works at and whether the
 * canvas is on "All epics". On "All epics" a container at `epic` or `part` is told `project` (and the
 * host covers it when its module cannot work at `project`); every other scope is told as it is,
 * because it is not about the open epic.
 */
export function toldScope(active, allEpics) {
    return allEpics && scopeNeedsEpic(active) ? 'project' : active;
}
