import { z } from 'zod';
/**
 * One value a module can be narrowed to: an id and a word, nothing else. The host does not know
 * what an option means; it draws a menu and reports a press. Any count rides in the label, and a
 * module re-announces its offer whenever the words change.
 */
export declare const filterOptionSchema: z.ZodObject<{
    id: z.ZodEffects<z.ZodString, string, string>;
    label: z.ZodString;
}, "strip", z.ZodTypeAny, {
    label: string;
    id: string;
}, {
    label: string;
    id: string;
}>;
export type FilterOption = z.infer<typeof filterOptionSchema>;
/**
 * One axis a module can be narrowed along, and the options on it. Option ids are unique within a
 * group. A `choice` group needs at least one option and a `fallback` naming one of them; a `text`
 * group has neither options nor fallback; a `toggles` group needs an option and has no fallback.
 */
export declare const filterGroupSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    id: z.ZodEffects<z.ZodString, string, string>;
    /** What this axis is called: `ignored`, `kind`, `scope`, `search`. A person reads it. */
    label: z.ZodString;
    /**
     * Whether this axis is chosen from (`choice`), typed into (`text`) or a set of switches (`toggles`).
     * Absent means `choice`. What comes back under this group's id is an option id, the text typed, or
     * the list of option ids switched on. A host that does not know a kind draws nothing and sends `{}`.
     */
    kind: z.ZodOptional<z.ZodEnum<["choice", "text", "toggles"]>>;
    /**
     * What can be chosen. Empty for a `text` group, at least one for a choice. May be left out; always
     * an array once parsed.
     */
    options: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodEffects<z.ZodString, string, string>;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        label: string;
        id: string;
    }, {
        label: string;
        id: string;
    }>, "many">>;
    /**
     * Which option this group is on when nobody has chosen, and what a host returns to when a stored
     * choice is no longer offered. One of `options`; required for a choice group, refused for `text`
     * and `toggles`.
     */
    fallback: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    label: string;
    id: string;
    options: {
        label: string;
        id: string;
    }[];
    kind?: "choice" | "text" | "toggles" | undefined;
    fallback?: string | undefined;
}, {
    label: string;
    id: string;
    options?: {
        label: string;
        id: string;
    }[] | undefined;
    kind?: "choice" | "text" | "toggles" | undefined;
    fallback?: string | undefined;
}>, {
    label: string;
    id: string;
    options: {
        label: string;
        id: string;
    }[];
    kind?: "choice" | "text" | "toggles" | undefined;
    fallback?: string | undefined;
}, {
    label: string;
    id: string;
    options?: {
        label: string;
        id: string;
    }[] | undefined;
    kind?: "choice" | "text" | "toggles" | undefined;
    fallback?: string | undefined;
}>, {
    label: string;
    id: string;
    options: {
        label: string;
        id: string;
    }[];
    kind?: "choice" | "text" | "toggles" | undefined;
    fallback?: string | undefined;
}, {
    label: string;
    id: string;
    options?: {
        label: string;
        id: string;
    }[] | undefined;
    kind?: "choice" | "text" | "toggles" | undefined;
    fallback?: string | undefined;
}>;
export type FilterGroup = z.infer<typeof filterGroupSchema>;
/**
 * What each group is set to: group id → an option id, what somebody typed, or (`toggles` only) the
 * list of option ids that are on. Travels host → module in `kehikot.context`, at most `FILTER_GROUPS`
 * entries. A host drops what is not offered now; a module still falls back on an id it does not know.
 */
export declare const filterChoiceSchema: z.ZodEffects<z.ZodRecord<z.ZodEffects<z.ZodString, string, string>, z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">, string[], string[]>]>>, Record<string, string | string[]>, Record<string, string | string[]>>;
export type FilterChoice = z.infer<typeof filterChoiceSchema>;
