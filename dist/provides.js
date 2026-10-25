import { z } from 'zod';
import { LIMITS } from './limits.js';
/**
 * What a module PUBLISHES for other modules and the host to read (2.21.0): the words of
 * `declares.provides`, each with what it means. A module says what it provides so that what needs it
 * — a skill's `{ provides }` need, a reader following "any steps provider" — can find it without
 * naming it. Free strings on the wire like `reacts`: a host carries a word it does not know and
 * matches it as written. Design notes: docs/manifest.md, "What a module provides".
 */
export const PROVIDES = {
    /** Its `steps.json` (`writePlan`): an epic's steps, phases and gates. Read through `steps.list`. */
    steps: "Publishes an epic's steps — what has to become true, in what order, and what holds each — for every module to read.",
    /** Documents in its `parts.json` (`writeHoldings`): files a part of an epic has. */
    documents: "Publishes documents for the parts of an epic — the files each part has — in its parts.json.",
    /** Refs in its `parts.json`: the issues and changes a part of an epic holds. */
    refs: "Publishes references for the parts of an epic — the issues and changes each part holds — in its parts.json.",
};
export const PROVIDED_NAMES = Object.keys(PROVIDES);
/** One word of `declares.provides`, and the value of a skill's `{ provides }` need. */
export const providedWord = z.string().trim().min(1).max(LIMITS.PROVIDES_WORD);
/** `declares.provides`: words, each once, at most `LIMITS.PROVIDES`. */
export const providesSchema = z
    .array(providedWord)
    .max(LIMITS.PROVIDES)
    .refine((words) => new Set(words).size === words.length, { message: 'a module says it provides each thing once' });
/**
 * Whether a module declares that it runs agent sessions and loads skills into them (2.21.0): the
 * module a host routes kehikko-bound skills to. `declares.agentSessions.loadsSkills`.
 */
export const agentSessionsSchema = z.object({
    /** It starts conversations with an agent, and loads into each the skills that can work on its kehikko. */
    loadsSkills: z.boolean().default(false),
});
/** What a module says it provides: `declares.provides` as written, `[]` when it says nothing. */
export function providesOf(manifest) {
    return manifest?.declares?.provides ?? [];
}
/** Whether a module says it loads skills into the agent sessions it runs (`declares.agentSessions.loadsSkills`). */
export function loadsSkills(manifest) {
    return manifest?.declares?.agentSessions?.loadsSkills === true;
}
