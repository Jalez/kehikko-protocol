import { z } from 'zod';
import { LIMITS } from './limits.js';
/**
 * Claude Code skills a module offers (2.5.0). A module lists them in `declares.skills` and serves
 * each one's text at `skillPath(name)` on its own origin: one SKILL.md, front matter first. The host
 * shows the person that text and installs it only when they press Install; nothing here installs,
 * fetches or decides anything. Design notes: docs/manifest.md, "declares.skills".
 */
/**
 * A skill's name: kebab-case, a lowercase letter first, then lowercase letters and digits in
 * dash-separated runs (`review-pr`, `thesis-2`). No dot, slash or space, so it is a folder name a
 * host can put under `~/.claude/skills/` and never a path. At most `LIMITS.SKILL_NAME` characters.
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
/** One skill a module offers: its name, a line about it for the person choosing, and its version. */
export const moduleSkillSchema = z.object({
    name: skillNameSchema,
    summary: z.string().max(LIMITS.SUMMARY),
    /** The module's own version of this skill. Shown and compared for equality; never parsed. */
    version: z.string().min(1).max(LIMITS.SKILL_VERSION),
});
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
