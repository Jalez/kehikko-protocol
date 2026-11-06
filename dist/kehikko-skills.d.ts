import { z } from 'zod';
/**
 * 2.53.0. A kehikko's own skills: instructions the PERSON wrote for every agent session on one
 * kehikko, whichever module runs it and whichever epic it works on. A host keeps them (with the
 * kehikko, in its project) and hands them to a module that starts a session there, in its answer to
 * `POST /host/place` (`kehikkoSkills` in `placeDoorsSchema`); the module puts each where its agent
 * reads skills for that session, exactly as it loads a module's kehikko-bound skill (`skillsThatLoad`).
 *
 * A skill is a name (`SKILL_NAME`), a one-line description (what an agent decides to use it by) and a
 * body of markdown. Its SKILL.md is `kehikkoSkillText(name, description, body)`, which a host builds
 * and a module writes as it comes (after `skillTextIssue`). Text, never markup a host renders: a host
 * shows the body as the person typed it.
 *
 * Only the person writes one. A host takes a new, changed or removed skill from its own page and
 * nowhere else; an agent may read them, never write them (an agent putting instructions into its own
 * future sessions is what skills are kept from).
 * Design notes: docs/asking.md, "A kehikko's own skills (2.53.0)".
 */
/** The bounds on a kehikko's own skills. */
export declare const KEHIKKO_SKILL_LIMITS: {
    /** How many one kehikko may keep. */
    readonly MOST: 20;
    /** The description, in characters: one line. */
    readonly DESCRIPTION: 300;
    /** The body, in characters. The whole SKILL.md still fits in `LIMITS.SKILL_TEXT` bytes (`kehikkoSkillIssue`). */
    readonly BODY: 32000;
};
/** The description as it goes into the front matter and the notes: one line of plain text, bounded. */
export declare function kehikkoSkillDescription(text: unknown): string;
/**
 * A kehikko skill's SKILL.md: front matter with its `name` and `description` (the description as a
 * JSON string, which YAML reads as the same double-quoted scalar, so no character in it can end the
 * block or start another key), then the body. Line endings become `\n`; the body ends with one.
 */
export declare function kehikkoSkillText(name: string, description: string, body: string): string;
/**
 * What is wrong with a kehikko skill as a person wrote it, in one sentence they can read; `null` when
 * nothing is. The name is a skill name, the description one non-empty line, the body within its bound,
 * and the SKILL.md it makes passes `skillTextIssue` and fits in `LIMITS.SKILL_TEXT` bytes.
 */
export declare function kehikkoSkillIssue(skill: {
    name?: unknown;
    description?: unknown;
    body?: unknown;
}): string | null;
/**
 * One kehikko skill as a host hands it to a module (`kehikkoSkills` in `placeDoorsSchema`): its name,
 * its description (for the notes) and its whole SKILL.md (`text`), which the module writes as it is.
 * One whose text does not pass `skillTextIssue` for its name does not parse.
 */
export declare const kehikkoSkillSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    text: string;
    description: string;
}, {
    name: string;
    text: string;
    description: string;
}>, {
    name: string;
    text: string;
    description: string;
}, {
    name: string;
    text: string;
    description: string;
}>;
export type KehikkoSkill = z.infer<typeof kehikkoSkillSchema>;
/**
 * A kehikko's skills in an answer: at most `KEHIKKO_SKILL_LIMITS.MOST`, each name once. One that does
 * not parse is left out and the rest kept, so one bad skill never costs a session the others.
 */
export declare const kehikkoSkillsSchema: z.ZodEffects<z.ZodArray<z.ZodUnknown, "many">, {
    name: string;
    text: string;
    description: string;
}[], unknown[]>;
