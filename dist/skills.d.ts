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
/**
 * The modules a skill needs beside its own (2.12.0): module ids, each once, at most
 * `LIMITS.SKILL_NEEDS`. The declaring module is implied and need not be listed.
 */
export declare const skillNeedsSchema: z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>;
/** One skill a module offers: its name, a line about it for the person choosing, and its version. */
export declare const moduleSkillSchema: z.ZodObject<{
    name: z.ZodString;
    summary: z.ZodString;
    /** The module's own version of this skill. Shown and compared for equality; never parsed. */
    version: z.ZodString;
    /**
     * The other modules that must be on the same kehikko for this skill to make sense (2.12.0).
     * A skill that lists any is "kehikko-bound": it belongs in a conversation on a kehikko that has
     * the declaring module and every one of these, and never in the person's Claude Code for every
     * project. Absent or empty: the skill works wherever the declaring module is installed.
     */
    needs: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    version: string;
    summary: string;
    needs?: string[] | undefined;
}, {
    name: string;
    version: string;
    summary: string;
    needs?: string[] | undefined;
}>;
export type ModuleSkill = z.infer<typeof moduleSkillSchema>;
/** Is this skill kehikko-bound (2.12.0): does it need any module beside its own? */
export declare function isKehikkoBound(skill: Pick<ModuleSkill, 'needs'>): boolean;
/**
 * Which of the modules a skill needs are not among `present` (2.12.0), in the skill's order; empty
 * when it can work there. `present` is the module ids on one kehikko. Compares ids as written: a
 * host passes canonical ids on both sides. Decides nothing about the declaring module itself.
 */
export declare function missingNeeds(skill: Pick<ModuleSkill, 'needs'>, present: Iterable<string>): string[];
/** The list in `declares.skills`: at most `LIMITS.SKILLS`, no two with one name. */
export declare const moduleSkillsSchema: z.ZodEffects<z.ZodArray<z.ZodObject<{
    name: z.ZodString;
    summary: z.ZodString;
    /** The module's own version of this skill. Shown and compared for equality; never parsed. */
    version: z.ZodString;
    /**
     * The other modules that must be on the same kehikko for this skill to make sense (2.12.0).
     * A skill that lists any is "kehikko-bound": it belongs in a conversation on a kehikko that has
     * the declaring module and every one of these, and never in the person's Claude Code for every
     * project. Absent or empty: the skill works wherever the declaring module is installed.
     */
    needs: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    version: string;
    summary: string;
    needs?: string[] | undefined;
}, {
    name: string;
    version: string;
    summary: string;
    needs?: string[] | undefined;
}>, "many">, {
    name: string;
    version: string;
    summary: string;
    needs?: string[] | undefined;
}[], {
    name: string;
    version: string;
    summary: string;
    needs?: string[] | undefined;
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
