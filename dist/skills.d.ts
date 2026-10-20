import { z } from 'zod';
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
export declare const SKILL_NAME: RegExp;
/** Where a module serves its skills, under its own origin. `skillPath(name)` is the path of one. */
export declare const SKILLS_PATH = "/kehikot/skills/";
/** The path a module serves one skill's text on: `/kehikot/skills/<name>.md`. Refuses a name that is not one. */
export declare function skillPath(name: string): string;
/** Is this a skill's name, spelled and bounded as `SKILL_NAME` and `LIMITS.SKILL_NAME` say? */
export declare function isSkillName(name: unknown): name is string;
export declare const skillNameSchema: z.ZodString;
/** One skill a module offers: its name, a line about it for the person choosing, and its version. */
export declare const moduleSkillSchema: z.ZodObject<{
    name: z.ZodString;
    summary: z.ZodString;
    /** The module's own version of this skill. Shown and compared for equality; never parsed. */
    version: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    version: string;
    summary: string;
}, {
    name: string;
    version: string;
    summary: string;
}>;
export type ModuleSkill = z.infer<typeof moduleSkillSchema>;
/** The list in `declares.skills`: at most `LIMITS.SKILLS`, no two with one name. */
export declare const moduleSkillsSchema: z.ZodEffects<z.ZodArray<z.ZodObject<{
    name: z.ZodString;
    summary: z.ZodString;
    /** The module's own version of this skill. Shown and compared for equality; never parsed. */
    version: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    version: string;
    summary: string;
}, {
    name: string;
    version: string;
    summary: string;
}>, "many">, {
    name: string;
    version: string;
    summary: string;
}[], {
    name: string;
    version: string;
    summary: string;
}[]>;
/** How many bytes a text takes as UTF-8, the unit `LIMITS.SKILL_TEXT` counts in. */
export declare function skillTextBytes(text: string): number;
/**
 * What is wrong with a skill's text as a module served it, in one sentence a person can read;
 * `null` when nothing is. The text is a SKILL.md: it opens with a front matter block (`---` lines)
 * and fits in `LIMITS.SKILL_TEXT` bytes. A `name:` in the front matter, when there is one, is the
 * skill's own name. A reading, not a check of what the skill says: a host still shows the text.
 */
export declare function skillTextIssue(text: unknown, name: string): string | null;
