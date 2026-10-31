import { z } from 'zod';
import { type PressValue } from './header.js';
/**
 * The footer a module declares (2.38.0): one row at the bottom of its container, drawn by the host
 * in the same look as the header, instead of a status bar each module draws for itself. What a
 * footer says — a status line, a count, a meter — and what it offers — a run, a toggle, a switch, a
 * jump — are the module's; the host draws the latest list and reports a press, exactly as for the
 * header. Design notes: docs/footer.md.
 */
/** Where in the row an item stands: the left, the middle or the right group. */
export declare const FOOTER_ALIGNS: readonly ["start", "center", "end"];
export type FooterAlign = (typeof FOOTER_ALIGNS)[number];
/** How much a text or a meter asks to be noticed. A host never says it with colour alone. */
export declare const FOOTER_LEVELS: readonly ["normal", "warn", "critical"];
export type FooterLevel = (typeof FOOTER_LEVELS)[number];
/** The kinds of footer item: two that only say something, and the header's four that can be pressed. */
export declare const FOOTER_KINDS: readonly ["text", "meter", "switch", "toggle", "go", "run"];
export type FooterKind = (typeof FOOTER_KINDS)[number];
/** The kinds a person (or an agent, when the item says so) can press. */
export declare const FOOTER_PRESSABLE: readonly ["switch", "toggle", "go", "run"];
/**
 * One item of a module's footer. `text`: a status line or a count. `meter`: how full something is,
 * with how worried to be about it. `switch`, `toggle`, `go`, `run`: the header's kinds, the same
 * fields and the same press.
 */
export declare const footerItemSchema: z.ZodEffects<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
    /** The group the item stands in. Items keep declaration order within their group. */
    align: z.ZodDefault<z.ZodEnum<["start", "center", "end"]>>;
    /**
     * The first to go when the row is narrow (see `footerLayout`): under `FOOTER_ICONS_BELOW` an optional
     * text or meter is not drawn, and an optional pressable item moves into the row's "⋯" menu.
     */
    optional: z.ZodDefault<z.ZodBoolean>;
    /** More than the row has room for, as a sentence shown on hover and focus. Text, never markup. */
    tooltip: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"text">;
    id: z.ZodEffects<z.ZodString, string, string>;
    /** The words: a status line or a count. One line; a host cuts it with an ellipsis and shows it whole on hover. */
    text: z.ZodString;
    level: z.ZodDefault<z.ZodEnum<["normal", "warn", "critical"]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    kind: "text";
    text: string;
    level: "normal" | "warn" | "critical";
    align: "start" | "center" | "end";
    optional: boolean;
    tooltip?: string | undefined;
}, {
    id: string;
    kind: "text";
    text: string;
    level?: "normal" | "warn" | "critical" | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
}>, z.ZodObject<{
    /** The group the item stands in. Items keep declaration order within their group. */
    align: z.ZodDefault<z.ZodEnum<["start", "center", "end"]>>;
    /**
     * The first to go when the row is narrow (see `footerLayout`): under `FOOTER_ICONS_BELOW` an optional
     * text or meter is not drawn, and an optional pressable item moves into the row's "⋯" menu.
     */
    optional: z.ZodDefault<z.ZodBoolean>;
    /** More than the row has room for, as a sentence shown on hover and focus. Text, never markup. */
    tooltip: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"meter">;
    id: z.ZodEffects<z.ZodString, string, string>;
    /** What is being measured: `Context`, `Usage`. Also the meter's accessible name. */
    label: z.ZodString;
    /** How full, from 0 to 1. A module that thinks in percent divides by 100. */
    value: z.ZodNumber;
    level: z.ZodDefault<z.ZodEnum<["normal", "warn", "critical"]>>;
    /** What to show for the value instead of the rounded percentage: `41k / 200k`. */
    text: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    value: number;
    id: string;
    label: string;
    kind: "meter";
    level: "normal" | "warn" | "critical";
    align: "start" | "center" | "end";
    optional: boolean;
    text?: string | undefined;
    tooltip?: string | undefined;
}, {
    value: number;
    id: string;
    label: string;
    kind: "meter";
    text?: string | undefined;
    level?: "normal" | "warn" | "critical" | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
}>, z.ZodObject<{
    options: z.ZodArray<z.ZodObject<{
        id: z.ZodEffects<z.ZodString, string, string>;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        label: string;
    }, {
        id: string;
        label: string;
    }>, "many">;
    value: z.ZodEffects<z.ZodString, string, string>;
    id: z.ZodEffects<z.ZodString, string, string>;
    label: z.ZodString;
    icon: z.ZodOptional<z.ZodString>;
    shortcut: z.ZodOptional<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
    agents: z.ZodDefault<z.ZodBoolean>;
    tool: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"switch">;
} & {
    /** The group the item stands in. Items keep declaration order within their group. */
    align: z.ZodDefault<z.ZodEnum<["start", "center", "end"]>>;
    /**
     * The first to go when the row is narrow (see `footerLayout`): under `FOOTER_ICONS_BELOW` an optional
     * text or meter is not drawn, and an optional pressable item moves into the row's "⋯" menu.
     */
    optional: z.ZodDefault<z.ZodBoolean>;
    /** More than the row has room for, as a sentence shown on hover and focus. Text, never markup. */
    tooltip: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    value: string;
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "switch";
    agents: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
}, {
    value: string;
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "switch";
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
}>, z.ZodObject<{
    checked: z.ZodBoolean;
    id: z.ZodEffects<z.ZodString, string, string>;
    label: z.ZodString;
    icon: z.ZodOptional<z.ZodString>;
    shortcut: z.ZodOptional<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
    agents: z.ZodDefault<z.ZodBoolean>;
    tool: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"toggle">;
} & {
    /** The group the item stands in. Items keep declaration order within their group. */
    align: z.ZodDefault<z.ZodEnum<["start", "center", "end"]>>;
    /**
     * The first to go when the row is narrow (see `footerLayout`): under `FOOTER_ICONS_BELOW` an optional
     * text or meter is not drawn, and an optional pressable item moves into the row's "⋯" menu.
     */
    optional: z.ZodDefault<z.ZodBoolean>;
    /** More than the row has room for, as a sentence shown on hover and focus. Text, never markup. */
    tooltip: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    label: string;
    kind: "toggle";
    agents: boolean;
    checked: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
}, {
    id: string;
    label: string;
    kind: "toggle";
    checked: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
}>, z.ZodObject<{
    options: z.ZodArray<z.ZodObject<{
        id: z.ZodEffects<z.ZodString, string, string>;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        label: string;
    }, {
        id: string;
        label: string;
    }>, "many">;
    id: z.ZodEffects<z.ZodString, string, string>;
    label: z.ZodString;
    icon: z.ZodOptional<z.ZodString>;
    shortcut: z.ZodOptional<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
    agents: z.ZodDefault<z.ZodBoolean>;
    tool: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"go">;
} & {
    /** The group the item stands in. Items keep declaration order within their group. */
    align: z.ZodDefault<z.ZodEnum<["start", "center", "end"]>>;
    /**
     * The first to go when the row is narrow (see `footerLayout`): under `FOOTER_ICONS_BELOW` an optional
     * text or meter is not drawn, and an optional pressable item moves into the row's "⋯" menu.
     */
    optional: z.ZodDefault<z.ZodBoolean>;
    /** More than the row has room for, as a sentence shown on hover and focus. Text, never markup. */
    tooltip: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "go";
    agents: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
}, {
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "go";
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
}>, z.ZodObject<Omit<{
    state: z.ZodDefault<z.ZodEnum<["idle", "busy", "failed"]>>;
    result: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    disabled: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    confirm: z.ZodDefault<z.ZodBoolean>;
    surface: z.ZodOptional<z.ZodEnum<["fullscreen"]>>;
    pinned: z.ZodOptional<z.ZodBoolean>;
    id: z.ZodEffects<z.ZodString, string, string>;
    label: z.ZodString;
    icon: z.ZodOptional<z.ZodString>;
    shortcut: z.ZodOptional<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
    agents: z.ZodDefault<z.ZodBoolean>;
    tool: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"run">;
}, "pinned" | "surface"> & {
    /** The group the item stands in. Items keep declaration order within their group. */
    align: z.ZodDefault<z.ZodEnum<["start", "center", "end"]>>;
    /**
     * The first to go when the row is narrow (see `footerLayout`): under `FOOTER_ICONS_BELOW` an optional
     * text or meter is not drawn, and an optional pressable item moves into the row's "⋯" menu.
     */
    optional: z.ZodDefault<z.ZodBoolean>;
    /** More than the row has room for, as a sentence shown on hover and focus. Text, never markup. */
    tooltip: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    state: "failed" | "idle" | "busy";
    label: string;
    kind: "run";
    agents: boolean;
    result: string | null;
    disabled: string | null;
    confirm: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
}, {
    id: string;
    label: string;
    kind: "run";
    state?: "failed" | "idle" | "busy" | undefined;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    result?: string | null | undefined;
    disabled?: string | null | undefined;
    confirm?: boolean | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
}>]>, {
    id: string;
    kind: "text";
    text: string;
    level: "normal" | "warn" | "critical";
    align: "start" | "center" | "end";
    optional: boolean;
    tooltip?: string | undefined;
} | {
    value: number;
    id: string;
    label: string;
    kind: "meter";
    level: "normal" | "warn" | "critical";
    align: "start" | "center" | "end";
    optional: boolean;
    text?: string | undefined;
    tooltip?: string | undefined;
} | {
    value: string;
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "switch";
    agents: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
} | {
    id: string;
    label: string;
    kind: "toggle";
    agents: boolean;
    checked: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
} | {
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "go";
    agents: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
} | {
    id: string;
    state: "failed" | "idle" | "busy";
    label: string;
    kind: "run";
    agents: boolean;
    result: string | null;
    disabled: string | null;
    confirm: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
}, {
    id: string;
    kind: "text";
    text: string;
    level?: "normal" | "warn" | "critical" | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
} | {
    value: number;
    id: string;
    label: string;
    kind: "meter";
    text?: string | undefined;
    level?: "normal" | "warn" | "critical" | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
} | {
    value: string;
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "switch";
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
} | {
    id: string;
    label: string;
    kind: "toggle";
    checked: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
} | {
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "go";
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
} | {
    id: string;
    label: string;
    kind: "run";
    state?: "failed" | "idle" | "busy" | undefined;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    result?: string | null | undefined;
    disabled?: string | null | undefined;
    confirm?: boolean | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
}>;
export type FooterItem = z.infer<typeof footerItemSchema>;
/** An item as a module writes it, before defaults are filled in. */
export type FooterItemInput = z.input<typeof footerItemSchema>;
/** A footer item that can be pressed: one of the header's kinds. */
export type PressableFooterItem = Extract<FooterItem, {
    kind: (typeof FOOTER_PRESSABLE)[number];
}>;
/** A module's whole footer: every item, in order within its group. Ids are unique within the footer. */
export declare const footerItemsSchema: z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
    /** The group the item stands in. Items keep declaration order within their group. */
    align: z.ZodDefault<z.ZodEnum<["start", "center", "end"]>>;
    /**
     * The first to go when the row is narrow (see `footerLayout`): under `FOOTER_ICONS_BELOW` an optional
     * text or meter is not drawn, and an optional pressable item moves into the row's "⋯" menu.
     */
    optional: z.ZodDefault<z.ZodBoolean>;
    /** More than the row has room for, as a sentence shown on hover and focus. Text, never markup. */
    tooltip: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"text">;
    id: z.ZodEffects<z.ZodString, string, string>;
    /** The words: a status line or a count. One line; a host cuts it with an ellipsis and shows it whole on hover. */
    text: z.ZodString;
    level: z.ZodDefault<z.ZodEnum<["normal", "warn", "critical"]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    kind: "text";
    text: string;
    level: "normal" | "warn" | "critical";
    align: "start" | "center" | "end";
    optional: boolean;
    tooltip?: string | undefined;
}, {
    id: string;
    kind: "text";
    text: string;
    level?: "normal" | "warn" | "critical" | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
}>, z.ZodObject<{
    /** The group the item stands in. Items keep declaration order within their group. */
    align: z.ZodDefault<z.ZodEnum<["start", "center", "end"]>>;
    /**
     * The first to go when the row is narrow (see `footerLayout`): under `FOOTER_ICONS_BELOW` an optional
     * text or meter is not drawn, and an optional pressable item moves into the row's "⋯" menu.
     */
    optional: z.ZodDefault<z.ZodBoolean>;
    /** More than the row has room for, as a sentence shown on hover and focus. Text, never markup. */
    tooltip: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"meter">;
    id: z.ZodEffects<z.ZodString, string, string>;
    /** What is being measured: `Context`, `Usage`. Also the meter's accessible name. */
    label: z.ZodString;
    /** How full, from 0 to 1. A module that thinks in percent divides by 100. */
    value: z.ZodNumber;
    level: z.ZodDefault<z.ZodEnum<["normal", "warn", "critical"]>>;
    /** What to show for the value instead of the rounded percentage: `41k / 200k`. */
    text: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    value: number;
    id: string;
    label: string;
    kind: "meter";
    level: "normal" | "warn" | "critical";
    align: "start" | "center" | "end";
    optional: boolean;
    text?: string | undefined;
    tooltip?: string | undefined;
}, {
    value: number;
    id: string;
    label: string;
    kind: "meter";
    text?: string | undefined;
    level?: "normal" | "warn" | "critical" | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
}>, z.ZodObject<{
    options: z.ZodArray<z.ZodObject<{
        id: z.ZodEffects<z.ZodString, string, string>;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        label: string;
    }, {
        id: string;
        label: string;
    }>, "many">;
    value: z.ZodEffects<z.ZodString, string, string>;
    id: z.ZodEffects<z.ZodString, string, string>;
    label: z.ZodString;
    icon: z.ZodOptional<z.ZodString>;
    shortcut: z.ZodOptional<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
    agents: z.ZodDefault<z.ZodBoolean>;
    tool: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"switch">;
} & {
    /** The group the item stands in. Items keep declaration order within their group. */
    align: z.ZodDefault<z.ZodEnum<["start", "center", "end"]>>;
    /**
     * The first to go when the row is narrow (see `footerLayout`): under `FOOTER_ICONS_BELOW` an optional
     * text or meter is not drawn, and an optional pressable item moves into the row's "⋯" menu.
     */
    optional: z.ZodDefault<z.ZodBoolean>;
    /** More than the row has room for, as a sentence shown on hover and focus. Text, never markup. */
    tooltip: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    value: string;
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "switch";
    agents: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
}, {
    value: string;
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "switch";
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
}>, z.ZodObject<{
    checked: z.ZodBoolean;
    id: z.ZodEffects<z.ZodString, string, string>;
    label: z.ZodString;
    icon: z.ZodOptional<z.ZodString>;
    shortcut: z.ZodOptional<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
    agents: z.ZodDefault<z.ZodBoolean>;
    tool: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"toggle">;
} & {
    /** The group the item stands in. Items keep declaration order within their group. */
    align: z.ZodDefault<z.ZodEnum<["start", "center", "end"]>>;
    /**
     * The first to go when the row is narrow (see `footerLayout`): under `FOOTER_ICONS_BELOW` an optional
     * text or meter is not drawn, and an optional pressable item moves into the row's "⋯" menu.
     */
    optional: z.ZodDefault<z.ZodBoolean>;
    /** More than the row has room for, as a sentence shown on hover and focus. Text, never markup. */
    tooltip: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    label: string;
    kind: "toggle";
    agents: boolean;
    checked: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
}, {
    id: string;
    label: string;
    kind: "toggle";
    checked: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
}>, z.ZodObject<{
    options: z.ZodArray<z.ZodObject<{
        id: z.ZodEffects<z.ZodString, string, string>;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        label: string;
    }, {
        id: string;
        label: string;
    }>, "many">;
    id: z.ZodEffects<z.ZodString, string, string>;
    label: z.ZodString;
    icon: z.ZodOptional<z.ZodString>;
    shortcut: z.ZodOptional<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
    agents: z.ZodDefault<z.ZodBoolean>;
    tool: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"go">;
} & {
    /** The group the item stands in. Items keep declaration order within their group. */
    align: z.ZodDefault<z.ZodEnum<["start", "center", "end"]>>;
    /**
     * The first to go when the row is narrow (see `footerLayout`): under `FOOTER_ICONS_BELOW` an optional
     * text or meter is not drawn, and an optional pressable item moves into the row's "⋯" menu.
     */
    optional: z.ZodDefault<z.ZodBoolean>;
    /** More than the row has room for, as a sentence shown on hover and focus. Text, never markup. */
    tooltip: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "go";
    agents: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
}, {
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "go";
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
}>, z.ZodObject<Omit<{
    state: z.ZodDefault<z.ZodEnum<["idle", "busy", "failed"]>>;
    result: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    disabled: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    confirm: z.ZodDefault<z.ZodBoolean>;
    surface: z.ZodOptional<z.ZodEnum<["fullscreen"]>>;
    pinned: z.ZodOptional<z.ZodBoolean>;
    id: z.ZodEffects<z.ZodString, string, string>;
    label: z.ZodString;
    icon: z.ZodOptional<z.ZodString>;
    shortcut: z.ZodOptional<z.ZodString>;
    group: z.ZodOptional<z.ZodString>;
    agents: z.ZodDefault<z.ZodBoolean>;
    tool: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"run">;
}, "pinned" | "surface"> & {
    /** The group the item stands in. Items keep declaration order within their group. */
    align: z.ZodDefault<z.ZodEnum<["start", "center", "end"]>>;
    /**
     * The first to go when the row is narrow (see `footerLayout`): under `FOOTER_ICONS_BELOW` an optional
     * text or meter is not drawn, and an optional pressable item moves into the row's "⋯" menu.
     */
    optional: z.ZodDefault<z.ZodBoolean>;
    /** More than the row has room for, as a sentence shown on hover and focus. Text, never markup. */
    tooltip: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    state: "failed" | "idle" | "busy";
    label: string;
    kind: "run";
    agents: boolean;
    result: string | null;
    disabled: string | null;
    confirm: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
}, {
    id: string;
    label: string;
    kind: "run";
    state?: "failed" | "idle" | "busy" | undefined;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    result?: string | null | undefined;
    disabled?: string | null | undefined;
    confirm?: boolean | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
}>]>, {
    id: string;
    kind: "text";
    text: string;
    level: "normal" | "warn" | "critical";
    align: "start" | "center" | "end";
    optional: boolean;
    tooltip?: string | undefined;
} | {
    value: number;
    id: string;
    label: string;
    kind: "meter";
    level: "normal" | "warn" | "critical";
    align: "start" | "center" | "end";
    optional: boolean;
    text?: string | undefined;
    tooltip?: string | undefined;
} | {
    value: string;
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "switch";
    agents: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
} | {
    id: string;
    label: string;
    kind: "toggle";
    agents: boolean;
    checked: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
} | {
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "go";
    agents: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
} | {
    id: string;
    state: "failed" | "idle" | "busy";
    label: string;
    kind: "run";
    agents: boolean;
    result: string | null;
    disabled: string | null;
    confirm: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
}, {
    id: string;
    kind: "text";
    text: string;
    level?: "normal" | "warn" | "critical" | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
} | {
    value: number;
    id: string;
    label: string;
    kind: "meter";
    text?: string | undefined;
    level?: "normal" | "warn" | "critical" | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
} | {
    value: string;
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "switch";
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
} | {
    id: string;
    label: string;
    kind: "toggle";
    checked: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
} | {
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "go";
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
} | {
    id: string;
    label: string;
    kind: "run";
    state?: "failed" | "idle" | "busy" | undefined;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    result?: string | null | undefined;
    disabled?: string | null | undefined;
    confirm?: boolean | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
}>, "many">, ({
    id: string;
    kind: "text";
    text: string;
    level: "normal" | "warn" | "critical";
    align: "start" | "center" | "end";
    optional: boolean;
    tooltip?: string | undefined;
} | {
    value: number;
    id: string;
    label: string;
    kind: "meter";
    level: "normal" | "warn" | "critical";
    align: "start" | "center" | "end";
    optional: boolean;
    text?: string | undefined;
    tooltip?: string | undefined;
} | {
    value: string;
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "switch";
    agents: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
} | {
    id: string;
    label: string;
    kind: "toggle";
    agents: boolean;
    checked: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
} | {
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "go";
    agents: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
} | {
    id: string;
    state: "failed" | "idle" | "busy";
    label: string;
    kind: "run";
    agents: boolean;
    result: string | null;
    disabled: string | null;
    confirm: boolean;
    align: "start" | "center" | "end";
    optional: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    tooltip?: string | undefined;
})[], ({
    id: string;
    kind: "text";
    text: string;
    level?: "normal" | "warn" | "critical" | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
} | {
    value: number;
    id: string;
    label: string;
    kind: "meter";
    text?: string | undefined;
    level?: "normal" | "warn" | "critical" | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
} | {
    value: string;
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "switch";
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
} | {
    id: string;
    label: string;
    kind: "toggle";
    checked: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
} | {
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "go";
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
} | {
    id: string;
    label: string;
    kind: "run";
    state?: "failed" | "idle" | "busy" | undefined;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    result?: string | null | undefined;
    disabled?: string | null | undefined;
    confirm?: boolean | undefined;
    align?: "start" | "center" | "end" | undefined;
    optional?: boolean | undefined;
    tooltip?: string | undefined;
})[]>;
/** Whether a footer item can be pressed. */
export declare function pressableFooterItem(item: FooterItem): item is PressableFooterItem;
/**
 * Why a press on a footer item cannot be taken, or `null` when it can: `pressRefusal`'s rule over the
 * footer's pressable items, and a sentence for a text or a meter, which only say something.
 */
export declare function footerPressRefusal(items: readonly FooterItem[], press: {
    item: string;
    value?: PressValue;
}): string | null;
/** The rounded percentage a meter shows when it gives no `text`: `62%`. */
export declare function meterSaid(item: Extract<FooterItem, {
    kind: 'meter';
}>): string;
/** Under this many pixels of footer, pressable items with an icon are the icon alone, meters lose their label and optional items go. The header's `ICONS_BELOW`. */
export declare const FOOTER_ICONS_BELOW = 300;
/** Under this many, every pressable item is in one "⋯" menu, and only the first text and the meters that are not optional stay. The header's `MERGE_BELOW`. */
export declare const FOOTER_MERGE_BELOW = 220;
/** How the footer is drawn at a width: everything in words, the narrow row, or one "⋯". */
export type FooterMode = 'words' | 'icons' | 'merged';
/** The mode for a footer this wide; `null` is "not measured yet", drawn as the widest. */
export declare function footerModeFor(width: number | null): FooterMode;
/** The row as it is drawn at one width. */
export interface FooterLayout {
    mode: FooterMode;
    /** What is drawn in each group, in declaration order. */
    start: FooterItem[];
    center: FooterItem[];
    end: FooterItem[];
    /** The pressable items drawn in one "⋯" menu at the row's end instead, in declaration order. Empty: no "⋯". */
    overflow: PressableFooterItem[];
    /** A pressable item that has an icon is drawn as the icon alone, its label its tooltip and accessible name. */
    iconsOnly: boolean;
    /** A meter's label is drawn beside its bar; false is the bar and the value, the label in its tooltip and name. */
    meterLabels: boolean;
}
/**
 * What a footer draws at a width, and the order it gives way in as the room runs out:
 *
 *  1. the gaps close, and every text is cut with an ellipsis, whole in its tooltip (at every width);
 *  2. under `FOOTER_ICONS_BELOW`, an `optional` text or meter goes, an `optional` pressable item
 *     moves into "⋯", a pressable item with an icon is the icon alone, and meters lose their label;
 *  3. under `FOOTER_MERGE_BELOW`, every pressable item is in "⋯", the centre group joins the left,
 *     only the first text is kept, and only the meters that are not optional.
 *
 * Nothing pressable is ever lost: an item not drawn in the row is in "⋯". Pure, the same rule for
 * every host; a host may be stricter (drop a group it cannot fit) but never wraps to a second row.
 */
export declare function footerLayout(items: readonly FooterItem[], width: number | null): FooterLayout;
