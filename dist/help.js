import { z } from 'zod';
import { oneLine } from './notes.js';
/**
 * 2.52.0. How to use a module, in the module's own words, for a person: one line saying what it is
 * for and a few short sections of points. A host that has it offers "How to use" for the module and
 * draws it as headings and bullet lists.
 *
 * ```ts
 * help: {
 *   summary: 'Shows the checklist for the one thing you picked.',
 *   sections: [
 *     { title: 'What it shows', points: ['The checklist for the picked container’s subject.'] },
 *   ],
 * }
 * ```
 *
 * PLAIN TEXT ONLY. A host draws every string as text: never as markup, never as a link, never as
 * an address it opens, and never as instructions to an agent. Each string is one line (`helpOf`
 * flattens line breaks, control, bidi and zero-width characters to one space), bounded by
 * `HELP_LIMITS`. A `help` that does not parse — too long, too many, empty, the wrong shape — is
 * dropped whole, not fatal: the module runs and is offered without "How to use".
 *
 * Top-level like `reveal` and `agentSays`, so a host before 2.52.0 ignores it and runs the module;
 * NOT under `declares`, whose unknown keys an older host's `fitOf` reads as too new. Design notes:
 * docs/manifest.md ("How to use a module").
 */
/** How long and how many: text bounds count characters, list bounds count items. */
export const HELP_LIMITS = {
    /** The one line under the module's name: what it is for. */
    SUMMARY: 200,
    /** How many sections. */
    SECTIONS: 8,
    /** A section's heading. */
    TITLE: 60,
    /** How many points one section may have. */
    POINTS: 10,
    /** One point: a sentence or two. */
    POINT: 300,
};
const text = (max) => z.string().trim().min(1).max(max);
/** One section: a heading and its points, in the order they are read. */
export const helpSectionSchema = z.object({
    title: text(HELP_LIMITS.TITLE),
    points: z.array(text(HELP_LIMITS.POINT)).min(1).max(HELP_LIMITS.POINTS),
});
/** `help` in a manifest. Strict about bounds; a manifest's `help` that fails is dropped, not fatal. */
export const helpSchema = z.object({
    summary: text(HELP_LIMITS.SUMMARY),
    sections: z.array(helpSectionSchema).max(HELP_LIMITS.SECTIONS).default([]),
});
/**
 * A module's "How to use", ready to draw as text, or `null` when it says none (or one that does not
 * parse). Every string is one line of plain text (`oneLine`); a point, a section or a summary left
 * empty by that is dropped. Pure; what a host reads before it offers "How to use" at all.
 */
export function helpOf(manifest) {
    const parsed = helpSchema.safeParse(manifest?.help);
    if (!parsed.success)
        return null;
    const summary = oneLine(parsed.data.summary, HELP_LIMITS.SUMMARY);
    if (!summary)
        return null;
    const sections = [];
    for (const section of parsed.data.sections) {
        const title = oneLine(section.title, HELP_LIMITS.TITLE);
        const points = section.points.map((point) => oneLine(point, HELP_LIMITS.POINT)).filter(Boolean);
        if (title && points.length)
            sections.push({ title, points });
    }
    return { summary, sections };
}
/** Whether a module says how to use it: what a host asks before it offers "How to use". */
export function hasHelp(manifest) {
    return helpOf(manifest) !== null;
}
