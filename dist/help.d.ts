import { z } from 'zod';
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
export declare const HELP_LIMITS: {
    /** The one line under the module's name: what it is for. */
    readonly SUMMARY: 200;
    /** How many sections. */
    readonly SECTIONS: 8;
    /** A section's heading. */
    readonly TITLE: 60;
    /** How many points one section may have. */
    readonly POINTS: 10;
    /** One point: a sentence or two. */
    readonly POINT: 300;
};
/** One section: a heading and its points, in the order they are read. */
export declare const helpSectionSchema: z.ZodObject<{
    title: z.ZodString;
    points: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    title: string;
    points: string[];
}, {
    title: string;
    points: string[];
}>;
/** `help` in a manifest. Strict about bounds; a manifest's `help` that fails is dropped, not fatal. */
export declare const helpSchema: z.ZodObject<{
    summary: z.ZodString;
    sections: z.ZodDefault<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        points: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        title: string;
        points: string[];
    }, {
        title: string;
        points: string[];
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    sections: {
        title: string;
        points: string[];
    }[];
    summary: string;
}, {
    summary: string;
    sections?: {
        title: string;
        points: string[];
    }[] | undefined;
}>;
export type HelpSection = z.infer<typeof helpSectionSchema>;
export type Help = z.infer<typeof helpSchema>;
/**
 * A module's "How to use", ready to draw as text, or `null` when it says none (or one that does not
 * parse). Every string is one line of plain text (`oneLine`); a point, a section or a summary left
 * empty by that is dropped. Pure; what a host reads before it offers "How to use" at all.
 */
export declare function helpOf(manifest: {
    help?: unknown;
} | null | undefined): Help | null;
/** Whether a module says how to use it: what a host asks before it offers "How to use". */
export declare function hasHelp(manifest: {
    help?: unknown;
} | null | undefined): boolean;
