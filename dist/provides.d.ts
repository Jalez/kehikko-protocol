import { z } from 'zod';
/**
 * What a module PUBLISHES for other modules and the host to read (2.21.0): the words of
 * `declares.provides`, each with what it means. A module says what it provides so that what needs it
 * — a skill's `{ provides }` need, a reader following "any steps provider" — can find it without
 * naming it. Free strings on the wire like `reacts`: a host carries a word it does not know and
 * matches it as written. Design notes: docs/manifest.md, "What a module provides".
 */
export declare const PROVIDES: {
    /** Its `steps.json` (`writePlan`): an epic's steps, phases and gates. Read through `steps.list`. */
    readonly steps: "Publishes an epic's steps — what has to become true, in what order, and what holds each — for every module to read.";
    /** Documents in its `parts.json` (`writeHoldings`): files a part of an epic has. */
    readonly documents: "Publishes documents for the parts of an epic — the files each part has — in its parts.json.";
    /** Refs in its `parts.json`: the issues and changes a part of an epic holds. */
    readonly refs: "Publishes references for the parts of an epic — the issues and changes each part holds — in its parts.json.";
};
export type Provided = keyof typeof PROVIDES;
export declare const PROVIDED_NAMES: Provided[];
/** One word of `declares.provides`, and the value of a skill's `{ provides }` need. */
export declare const providedWord: z.ZodString;
/** `declares.provides`: words, each once, at most `LIMITS.PROVIDES`. */
export declare const providesSchema: z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>;
/**
 * Whether a module declares that it runs agent sessions and loads skills into them (2.21.0): the
 * module a host routes kehikko-bound skills to. `declares.agentSessions.loadsSkills`.
 */
export declare const agentSessionsSchema: z.ZodObject<{
    /** It starts conversations with an agent, and loads into each the skills that can work on its kehikko. */
    loadsSkills: z.ZodDefault<z.ZodBoolean>;
    /**
     * It installs skills itself, where the agent it runs reads them (2.23.0): its own declared skills,
     * which are written for that agent, the skills of the modules on a session's kehikko, and the ones
     * the host keeps for every conversation (`everywhere` in the answer to `POST /host/place`). A host
     * never installs this module's own declared skills into another agent's folder (Claude Code's
     * `~/.claude/skills`, say), and lists them in a session's `everywhere` only for this module.
     * Optional; absent or false means a host installs its declared skills as any module's.
     */
    installsSkills: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    loadsSkills: boolean;
    installsSkills?: boolean | undefined;
}, {
    loadsSkills?: boolean | undefined;
    installsSkills?: boolean | undefined;
}>;
export type AgentSessions = z.infer<typeof agentSessionsSchema>;
/** The least of a manifest these readers look at, so a host can pass a parsed one or an object being built. */
export interface ProvidingManifest {
    id: string;
    reacts?: readonly string[];
    declares?: {
        uses?: readonly string[];
        provides?: readonly string[];
        agentSessions?: {
            loadsSkills?: boolean;
            installsSkills?: boolean;
        } | null;
    } | null;
    mcp?: {
        subjects?: readonly {
            kind: string;
        }[];
    } | null;
}
/** What a module says it provides: `declares.provides` as written, `[]` when it says nothing. */
export declare function providesOf(manifest: Pick<ProvidingManifest, 'declares'> | null | undefined): readonly string[];
/** Whether a module says it loads skills into the agent sessions it runs (`declares.agentSessions.loadsSkills`). */
export declare function loadsSkills(manifest: Pick<ProvidingManifest, 'declares'> | null | undefined): boolean;
/**
 * Whether a module says it installs skills itself, where its agent reads them
 * (`declares.agentSessions.installsSkills`, 2.23.0): its own declared skills are for that agent, and a
 * host installs none of them into another agent's folder.
 */
export declare function installsSkills(manifest: Pick<ProvidingManifest, 'declares'> | null | undefined): boolean;
