import { z } from 'zod';
import type { ProvidingManifest } from './provides.js';
/**
 * Agent skills a module offers (2.5.0): instructions an agent session loads, one SKILL.md each. A
 * module lists them in `declares.skills` and serves each one's text at `skillPath(name)` on its own
 * origin, front matter first. The host shows the person that text and installs it only when they
 * press Install; nothing here installs, fetches or decides anything. Which agent reads them is the
 * host's and the person's business: a host installs one for a coding agent, and a module that runs
 * agent sessions (`declares.agentSessions.loadsSkills`, 2.21.0) loads the kehikko-bound ones. A
 * module that installs skills for its own agent (`installsSkills`, 2.23.0) declares skills written for
 * that agent, which a host never installs for another.
 * Design notes: docs/manifest.md, "declares.skills".
 */
/**
 * A skill's name: kebab-case, a lowercase letter first, then lowercase letters and digits in
 * dash-separated runs (`review-pr`, `thesis-2`). No dot, slash or space, so it is a folder name a
 * host can put under an agent's skills folder (`~/.claude/skills/`, say) and never a path. At most `LIMITS.SKILL_NAME` characters.
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
 * The ways a skill can need something beside its own module (2.21.0), each with what a host checks
 * against the manifests on the kehikko. A need is a module id (2.12.0) or an object with ONE of these
 * keys; a key this version does not know is carried and never met (`missingNeeds` lists it).
 */
export declare const NEED_KINDS: {
    /** `{ provides: 'steps' }`: some module on the kehikko says it provides this (`declares.provides`). */
    readonly provides: "a module that provides it (declares.provides)";
    /** `{ subject: 'review-draft' }`: some module's door can show or answer for this kind (`mcp.subjects`). */
    readonly subject: "a module whose door has this subject (mcp.subjects)";
    /** `{ reacts: 'address' }`: some module reacts to this part of the context (`reacts`). */
    readonly reacts: "a module that reacts to it (reacts)";
    /** `{ uses: 'trackers:read' }`: some module asks for this capability (`declares.uses`). */
    readonly uses: "a module that asks for it (declares.uses)";
};
export type NeedKind = keyof typeof NEED_KINDS;
/** A need by what a module provides, says, or asks for, rather than by its id: one key, one word. */
export type CapabilityNeed = {
    provides: string;
} | {
    subject: string;
} | {
    reacts: string;
} | {
    uses: string;
};
/** One thing a skill needs: a module id, or a `CapabilityNeed`. */
export type SkillNeed = string | CapabilityNeed;
/** A need's one key and word, or null for a module id. A key this version does not know is returned as is. */
export declare function needParts(need: SkillNeed): {
    kind: string;
    word: string;
} | null;
/** One need, as a manifest writes it. */
export declare const skillNeedSchema: z.ZodType<SkillNeed>;
/** The same need spelled the same way, for telling two apart. */
export declare const needKey: (need: SkillNeed) => string;
/**
 * What a skill needs beside its own module (2.12.0): each a module id or, from 2.21.0, what a module
 * provides, says or asks for (`NEED_KINDS`). Each once, at most `LIMITS.SKILL_NEEDS`. The declaring
 * module is implied and need not be listed.
 */
export declare const skillNeedsSchema: z.ZodEffects<z.ZodArray<z.ZodType<SkillNeed, z.ZodTypeDef, SkillNeed>, "many">, SkillNeed[], SkillNeed[]>;
/** One skill a module offers: its name, a line about it for the person choosing, and its version. */
export declare const moduleSkillSchema: z.ZodObject<{
    name: z.ZodString;
    summary: z.ZodString;
    /** The module's own version of this skill. Shown and compared for equality; never parsed. */
    version: z.ZodString;
    /**
     * What must be on the same kehikko for this skill to make sense (2.12.0): other modules by id, or
     * (2.21.0) what some module there provides, says or asks for. A skill that lists any is
     * "kehikko-bound": it belongs in a conversation on a kehikko that has the declaring module and
     * meets every one of these, and never in the person's agent for every project. Absent or empty:
     * the skill works wherever the declaring module is installed.
     */
    needs: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodType<SkillNeed, z.ZodTypeDef, SkillNeed>, "many">, SkillNeed[], SkillNeed[]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    version: string;
    summary: string;
    needs?: SkillNeed[] | undefined;
}, {
    name: string;
    version: string;
    summary: string;
    needs?: SkillNeed[] | undefined;
}>;
export type ModuleSkill = z.infer<typeof moduleSkillSchema>;
/** Is this skill kehikko-bound (2.12.0): does it need any module beside its own? */
export declare function isKehikkoBound(skill: Pick<ModuleSkill, 'needs'>): boolean;
/**
 * Whether one module meets one need: it IS the module an id need names, or its manifest says what a
 * capability need asks for. A need of a kind this version does not know is met by nobody.
 */
export declare function meetsNeed(need: SkillNeed, module: string | ProvidingManifest): boolean;
/**
 * Which of a skill's needs nothing among `present` meets (2.12.0), in the skill's order; empty when
 * it can work there. `present` is what is on one kehikko: from 2.21.0 its modules' manifests (as
 * parsed, or any object with the fields `ProvidingManifest` names), or — as before — just their ids,
 * which meet only id needs. Compares ids as written: a host passes canonical ids on both sides.
 * Decides nothing about the declaring module itself.
 */
export declare function missingNeeds(skill: Pick<ModuleSkill, 'needs'>, present: Iterable<string | ProvidingManifest>): SkillNeed[];
/**
 * One need in words a person reads (2.21.0): a module id as `nameOf` names it (the id's last part,
 * capitalised, by default), a capability need as what kind of module would meet it.
 */
export declare function needSaid(need: SkillNeed, nameOf?: (id: string) => string): string;
/** The module ids a skill's needs name directly, in order: what 2.12.0's `needs` was. */
export declare function neededIds(skill: Pick<ModuleSkill, 'needs'>): string[];
/** The list in `declares.skills`: at most `LIMITS.SKILLS`, no two with one name. */
export declare const moduleSkillsSchema: z.ZodEffects<z.ZodArray<z.ZodObject<{
    name: z.ZodString;
    summary: z.ZodString;
    /** The module's own version of this skill. Shown and compared for equality; never parsed. */
    version: z.ZodString;
    /**
     * What must be on the same kehikko for this skill to make sense (2.12.0): other modules by id, or
     * (2.21.0) what some module there provides, says or asks for. A skill that lists any is
     * "kehikko-bound": it belongs in a conversation on a kehikko that has the declaring module and
     * meets every one of these, and never in the person's agent for every project. Absent or empty:
     * the skill works wherever the declaring module is installed.
     */
    needs: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodType<SkillNeed, z.ZodTypeDef, SkillNeed>, "many">, SkillNeed[], SkillNeed[]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    version: string;
    summary: string;
    needs?: SkillNeed[] | undefined;
}, {
    name: string;
    version: string;
    summary: string;
    needs?: SkillNeed[] | undefined;
}>, "many">, {
    name: string;
    version: string;
    summary: string;
    needs?: SkillNeed[] | undefined;
}[], {
    name: string;
    version: string;
    summary: string;
    needs?: SkillNeed[] | undefined;
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
