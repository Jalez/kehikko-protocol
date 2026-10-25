import { z } from 'zod';
import { MODULE_ID } from './ids.js';
import { LIMITS } from './limits.js';
/**
 * Agent skills a module offers (2.5.0): instructions an agent session loads, one SKILL.md each. A
 * module lists them in `declares.skills` and serves each one's text at `skillPath(name)` on its own
 * origin, front matter first. The host shows the person that text and installs it only when they
 * press Install; nothing here installs, fetches or decides anything. Which agent reads them is the
 * host's and the person's business: a host installs one for a coding agent, and a module that runs
 * agent sessions (`declares.agentSessions.loadsSkills`, 2.21.0) loads the kehikko-bound ones.
 * Design notes: docs/manifest.md, "declares.skills".
 */
/**
 * A skill's name: kebab-case, a lowercase letter first, then lowercase letters and digits in
 * dash-separated runs (`review-pr`, `thesis-2`). No dot, slash or space, so it is a folder name a
 * host can put under an agent's skills folder (`~/.claude/skills/`, say) and never a path. At most `LIMITS.SKILL_NAME` characters.
 */
export const SKILL_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
/** Where a module serves its skills, under its own origin. `skillPath(name)` is the path of one. */
export const SKILLS_PATH = '/kehikot/skills/';
/** The path a module serves one skill's text on: `/kehikot/skills/<name>.md`. Refuses a name that is not one. */
export function skillPath(name) {
    if (!isSkillName(name))
        throw new Error(`not a skill name: ${JSON.stringify(String(name).slice(0, LIMITS.SKILL_NAME + 1))}`);
    return `${SKILLS_PATH}${name}.md`;
}
/** Is this a skill's name, spelled and bounded as `SKILL_NAME` and `LIMITS.SKILL_NAME` say? */
export function isSkillName(name) {
    return typeof name === 'string' && name.length <= LIMITS.SKILL_NAME && SKILL_NAME.test(name);
}
export const skillNameSchema = z
    .string()
    .max(LIMITS.SKILL_NAME)
    .regex(SKILL_NAME, 'a skill name is kebab-case: a lowercase letter, then lowercase letters, digits and single dashes');
/**
 * The ways a skill can need something beside its own module (2.21.0), each with what a host checks
 * against the manifests on the kehikko. A need is a module id (2.12.0) or an object with ONE of these
 * keys; a key this version does not know is carried and never met (`missingNeeds` lists it).
 */
export const NEED_KINDS = {
    /** `{ provides: 'steps' }`: some module on the kehikko says it provides this (`declares.provides`). */
    provides: 'a module that provides it (declares.provides)',
    /** `{ subject: 'review-draft' }`: some module's door can show or answer for this kind (`mcp.subjects`). */
    subject: 'a module whose door has this subject (mcp.subjects)',
    /** `{ reacts: 'address' }`: some module reacts to this part of the context (`reacts`). */
    reacts: 'a module that reacts to it (reacts)',
    /** `{ uses: 'trackers:read' }`: some module asks for this capability (`declares.uses`). */
    uses: 'a module that asks for it (declares.uses)',
};
/** A need's one key and word, or null for a module id. A key this version does not know is returned as is. */
export function needParts(need) {
    if (typeof need === 'string')
        return null;
    const [kind, word] = Object.entries(need)[0] ?? ['', ''];
    return { kind, word: String(word) };
}
const needObject = z
    .record(z.string().min(1).max(LIMITS.CAPABILITY), z.string().trim().min(1).max(LIMITS.CAPABILITY))
    .refine((need) => Object.keys(need).length === 1, { message: 'a need names one thing: provides, subject, reacts or uses' });
/** One need, as a manifest writes it. */
export const skillNeedSchema = z.union([z.string().regex(MODULE_ID, 'a module id'), needObject]);
/** The same need spelled the same way, for telling two apart. */
export const needKey = (need) => {
    const parts = needParts(need);
    return parts === null ? `id ${need}` : `${parts.kind} ${parts.word}`;
};
/**
 * What a skill needs beside its own module (2.12.0): each a module id or, from 2.21.0, what a module
 * provides, says or asks for (`NEED_KINDS`). Each once, at most `LIMITS.SKILL_NEEDS`. The declaring
 * module is implied and need not be listed.
 */
export const skillNeedsSchema = z
    .array(skillNeedSchema)
    .max(LIMITS.SKILL_NEEDS)
    .refine((needs) => new Set(needs.map(needKey)).size === needs.length, { message: 'a skill needs each thing once' });
/** One skill a module offers: its name, a line about it for the person choosing, and its version. */
export const moduleSkillSchema = z.object({
    name: skillNameSchema,
    summary: z.string().max(LIMITS.SUMMARY),
    /** The module's own version of this skill. Shown and compared for equality; never parsed. */
    version: z.string().min(1).max(LIMITS.SKILL_VERSION),
    /**
     * What must be on the same kehikko for this skill to make sense (2.12.0): other modules by id, or
     * (2.21.0) what some module there provides, says or asks for. A skill that lists any is
     * "kehikko-bound": it belongs in a conversation on a kehikko that has the declaring module and
     * meets every one of these, and never in the person's agent for every project. Absent or empty:
     * the skill works wherever the declaring module is installed.
     */
    needs: skillNeedsSchema.optional(),
});
/** Is this skill kehikko-bound (2.12.0): does it need any module beside its own? */
export function isKehikkoBound(skill) {
    return (skill.needs?.length ?? 0) > 0;
}
/**
 * Whether one module meets one need: it IS the module an id need names, or its manifest says what a
 * capability need asks for. A need of a kind this version does not know is met by nobody.
 */
export function meetsNeed(need, module) {
    const manifest = typeof module === 'string' ? { id: module } : module;
    const parts = needParts(need);
    if (parts === null)
        return manifest.id === need;
    switch (parts.kind) {
        case 'provides':
            return (manifest.declares?.provides ?? []).includes(parts.word);
        case 'subject':
            return (manifest.mcp?.subjects ?? []).some((one) => one.kind === parts.word);
        case 'reacts':
            return (manifest.reacts ?? []).includes(parts.word);
        case 'uses':
            return (manifest.declares?.uses ?? []).includes(parts.word);
        default:
            return false;
    }
}
/**
 * Which of a skill's needs nothing among `present` meets (2.12.0), in the skill's order; empty when
 * it can work there. `present` is what is on one kehikko: from 2.21.0 its modules' manifests (as
 * parsed, or any object with the fields `ProvidingManifest` names), or — as before — just their ids,
 * which meet only id needs. Compares ids as written: a host passes canonical ids on both sides.
 * Decides nothing about the declaring module itself.
 */
export function missingNeeds(skill, present) {
    const on = [...present];
    return (skill.needs ?? []).filter((need) => !on.some((one) => meetsNeed(need, one)));
}
/** What a capability need is in words, for a person: "a module that provides an epic's steps". */
const NEED_SAID = {
    provides: (word) => word === 'steps'
        ? 'a module that keeps an epic’s steps'
        : word === 'documents'
            ? 'a module that keeps documents for an epic’s parts'
            : word === 'refs'
                ? 'a module that keeps references for an epic’s parts'
                : `a module that provides ${word}`,
    subject: (word) => `a module that can show a ${word}`,
    reacts: (word) => (word === 'address' ? 'a module that shows pages' : `a module that follows ${word}`),
    uses: (word) => `a module that asks for ${word}`,
};
/**
 * One need in words a person reads (2.21.0): a module id as `nameOf` names it (the id's last part,
 * capitalised, by default), a capability need as what kind of module would meet it.
 */
export function needSaid(need, nameOf = defaultName) {
    const parts = needParts(need);
    if (parts === null)
        return nameOf(need);
    return Object.hasOwn(NEED_SAID, parts.kind) ? NEED_SAID[parts.kind](parts.word) : `something this host does not know (${parts.kind})`;
}
function defaultName(id) {
    const last = id.split('.').pop() || id;
    return last.charAt(0).toUpperCase() + last.slice(1);
}
/** The module ids a skill's needs name directly, in order: what 2.12.0's `needs` was. */
export function neededIds(skill) {
    return (skill.needs ?? []).filter((need) => typeof need === 'string');
}
/** The list in `declares.skills`: at most `LIMITS.SKILLS`, no two with one name. */
export const moduleSkillsSchema = z
    .array(moduleSkillSchema)
    .max(LIMITS.SKILLS)
    .refine((skills) => new Set(skills.map((s) => s.name)).size === skills.length, {
    message: 'two skills cannot share a name',
});
/** How many bytes a text takes as UTF-8, the unit `LIMITS.SKILL_TEXT` counts in. */
export function skillTextBytes(text) {
    return new TextEncoder().encode(text).length;
}
/**
 * What is wrong with a skill's text as a module served it, in one sentence a person can read;
 * `null` when nothing is. The text is a SKILL.md: it opens with a front matter block (`---` lines)
 * and fits in `LIMITS.SKILL_TEXT` bytes. A `name:` in the front matter, when there is one, is the
 * skill's own name. A reading, not a check of what the skill says: a host still shows the text.
 */
export function skillTextIssue(text, name) {
    if (typeof text !== 'string')
        return 'The skill’s text is not text.';
    if (skillTextBytes(text) > LIMITS.SKILL_TEXT)
        return `The skill’s text is larger than ${LIMITS.SKILL_TEXT / 1024} KB.`;
    if (text.includes('\u0000'))
        return 'The skill’s text holds a NUL character.';
    const lines = text.replace(/^﻿/, '').split(/\r?\n/);
    if (lines[0]?.trim() !== '---')
        return 'The skill’s text does not open with front matter (a line of ---).';
    const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
    if (end < 0)
        return 'The skill’s front matter is not closed with a line of ---.';
    for (const line of lines.slice(1, end)) {
        const m = /^name:\s*(.*?)\s*$/.exec(line);
        if (!m)
            continue;
        const said = m[1].replace(/^(['"])(.*)\1$/, '$2');
        if (said !== name)
            return `The skill’s front matter names it ${JSON.stringify(said.slice(0, LIMITS.SKILL_NAME + 1))}, not ${name}.`;
    }
    return null;
}
