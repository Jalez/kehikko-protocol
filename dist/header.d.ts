import { z } from 'zod';
/** One thing a switch can be on, or a go item can jump to: an id and the words for it. */
export declare const headerOptionSchema: z.ZodObject<{
    id: z.ZodEffects<z.ZodString, string, string>;
    label: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    label: string;
}, {
    id: string;
    label: string;
}>;
export type HeaderOption = z.infer<typeof headerOptionSchema>;
/** The four kinds of item. The kind decides which menu an item is drawn in; see `HEADER_MENUS`. */
export declare const HEADER_KINDS: readonly ["switch", "toggle", "go", "run"];
export type HeaderKind = (typeof HEADER_KINDS)[number];
/**
 * Where a host puts a module when a run is pressed (1.4.0). `fullscreen`: the host makes this
 * module's frame fill the screen from its own click handler, then sends the press. See docs/header.md.
 */
export declare const RUN_SURFACES: readonly ["fullscreen"];
export type RunSurface = (typeof RUN_SURFACES)[number];
/**
 * The icon names a module may count on a host drawing (1.6.0). A CLOSED vocabulary as a contract (a
 * host maps each to its icon set), not a refusal: `icon` stays any short string, a host may know
 * more, and a name it does not know draws the label's first letters. See docs/header.md.
 */
export declare const HEADER_ICONS: readonly ["check", "x", "chevron-left", "chevron-right", "pencil", "play", "stop", "refresh", "undo", "external"];
export type HeaderIcon = (typeof HEADER_ICONS)[number];
/** A run is resting, in flight, or its last attempt failed. A host shows the last two on the menu's trigger. */
export declare const RUN_STATES: readonly ["idle", "busy", "failed"];
export type RunState = (typeof RUN_STATES)[number];
/**
 * One item of a module's header. `switch`: one of several views, with the one it is on. `toggle`:
 * on or off. `go`: a jump to one of several places, with nothing held afterwards. `run`: an act,
 * with whether it is in flight and what it last came to.
 */
export declare const headerItemSchema: z.ZodEffects<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
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
    /** Which option the module is on now. One of `options`. */
    value: z.ZodEffects<z.ZodString, string, string>;
    id: z.ZodEffects<z.ZodString, string, string>;
    label: z.ZodString;
    /** An icon by name (`file-text`). A host draws the ones it has; an unknown name draws none. */
    icon: z.ZodOptional<z.ZodString>;
    /** A hint shown beside the label (`⌘B`). The host binds no key from it: the module's page does. */
    shortcut: z.ZodOptional<z.ZodString>;
    /** A heading inside the item's menu. Items naming the same group are drawn together under it. */
    group: z.ZodOptional<z.ZodString>;
    /**
     * Whether an agent may press this through the host. False unless said: a module opts each item
     * in. Refused together with `tool`, and on a run that has `confirm`.
     */
    agents: z.ZodDefault<z.ZodBoolean>;
    /**
     * The tool at this module's own MCP door that does what this item does. An agent is sent there
     * instead of pressing: the host refuses the press and names the tool, so there is one way for a
     * program to do each thing. Refused together with `agents`.
     */
    tool: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"switch">;
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
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
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
}>, z.ZodObject<{
    checked: z.ZodBoolean;
    id: z.ZodEffects<z.ZodString, string, string>;
    label: z.ZodString;
    /** An icon by name (`file-text`). A host draws the ones it has; an unknown name draws none. */
    icon: z.ZodOptional<z.ZodString>;
    /** A hint shown beside the label (`⌘B`). The host binds no key from it: the module's page does. */
    shortcut: z.ZodOptional<z.ZodString>;
    /** A heading inside the item's menu. Items naming the same group are drawn together under it. */
    group: z.ZodOptional<z.ZodString>;
    /**
     * Whether an agent may press this through the host. False unless said: a module opts each item
     * in. Refused together with `tool`, and on a run that has `confirm`.
     */
    agents: z.ZodDefault<z.ZodBoolean>;
    /**
     * The tool at this module's own MCP door that does what this item does. An agent is sent there
     * instead of pressing: the host refuses the press and names the tool, so there is one way for a
     * program to do each thing. Refused together with `agents`.
     */
    tool: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"toggle">;
}, "strip", z.ZodTypeAny, {
    id: string;
    label: string;
    kind: "toggle";
    agents: boolean;
    checked: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
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
    /** An icon by name (`file-text`). A host draws the ones it has; an unknown name draws none. */
    icon: z.ZodOptional<z.ZodString>;
    /** A hint shown beside the label (`⌘B`). The host binds no key from it: the module's page does. */
    shortcut: z.ZodOptional<z.ZodString>;
    /** A heading inside the item's menu. Items naming the same group are drawn together under it. */
    group: z.ZodOptional<z.ZodString>;
    /**
     * Whether an agent may press this through the host. False unless said: a module opts each item
     * in. Refused together with `tool`, and on a run that has `confirm`.
     */
    agents: z.ZodDefault<z.ZodBoolean>;
    /**
     * The tool at this module's own MCP door that does what this item does. An agent is sent there
     * instead of pressing: the host refuses the press and names the tool, so there is one way for a
     * program to do each thing. Refused together with `agents`.
     */
    tool: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"go">;
}, "strip", z.ZodTypeAny, {
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "go";
    agents: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
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
}>, z.ZodObject<{
    state: z.ZodDefault<z.ZodEnum<["idle", "busy", "failed"]>>;
    /** What the last run came to, in a word or three, or null. Shown beside the label. */
    result: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /** Why it cannot be run right now, as a sentence, or null when it can. A host draws it flat and says why. */
    disabled: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /** Whether a press arms it and a second press runs it. The arm is the host's; the module adds none. */
    confirm: z.ZodDefault<z.ZodBoolean>;
    /**
     * 1.4.0. Where the press lands. A relayed press carries no user activation, so a module cannot
     * ask for full screen from `onPress`; the host can, from the person's click. Absent: the press
     * is only relayed. A host that does not know the field strips it and relays the press.
     */
    surface: z.ZodOptional<z.ZodEnum<["fullscreen"]>>;
    /**
     * 1.6.0. Draw this run as an icon button in the container header, left of the menus, as well
     * as in the Run menu. Only drawing changes: an agent presses by id as before. At most
     * `LIMITS.PINNED_MAX` are drawn (declaration order, see `pinnedRuns`). A host that does not
     * know the field strips it and keeps the item in the menu.
     */
    pinned: z.ZodOptional<z.ZodBoolean>;
    id: z.ZodEffects<z.ZodString, string, string>;
    label: z.ZodString;
    /** An icon by name (`file-text`). A host draws the ones it has; an unknown name draws none. */
    icon: z.ZodOptional<z.ZodString>;
    /** A hint shown beside the label (`⌘B`). The host binds no key from it: the module's page does. */
    shortcut: z.ZodOptional<z.ZodString>;
    /** A heading inside the item's menu. Items naming the same group are drawn together under it. */
    group: z.ZodOptional<z.ZodString>;
    /**
     * Whether an agent may press this through the host. False unless said: a module opts each item
     * in. Refused together with `tool`, and on a run that has `confirm`.
     */
    agents: z.ZodDefault<z.ZodBoolean>;
    /**
     * The tool at this module's own MCP door that does what this item does. An agent is sent there
     * instead of pressing: the host refuses the press and names the tool, so there is one way for a
     * program to do each thing. Refused together with `agents`.
     */
    tool: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"run">;
}, "strip", z.ZodTypeAny, {
    id: string;
    state: "failed" | "idle" | "busy";
    label: string;
    kind: "run";
    agents: boolean;
    result: string | null;
    disabled: string | null;
    confirm: boolean;
    group?: string | undefined;
    pinned?: boolean | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    surface?: "fullscreen" | undefined;
}, {
    id: string;
    label: string;
    kind: "run";
    state?: "failed" | "idle" | "busy" | undefined;
    group?: string | undefined;
    pinned?: boolean | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    result?: string | null | undefined;
    disabled?: string | null | undefined;
    confirm?: boolean | undefined;
    surface?: "fullscreen" | undefined;
}>]>, {
    value: string;
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "switch";
    agents: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
} | {
    id: string;
    label: string;
    kind: "toggle";
    agents: boolean;
    checked: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
} | {
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "go";
    agents: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
} | {
    id: string;
    state: "failed" | "idle" | "busy";
    label: string;
    kind: "run";
    agents: boolean;
    result: string | null;
    disabled: string | null;
    confirm: boolean;
    group?: string | undefined;
    pinned?: boolean | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    surface?: "fullscreen" | undefined;
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
} | {
    id: string;
    label: string;
    kind: "run";
    state?: "failed" | "idle" | "busy" | undefined;
    group?: string | undefined;
    pinned?: boolean | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    result?: string | null | undefined;
    disabled?: string | null | undefined;
    confirm?: boolean | undefined;
    surface?: "fullscreen" | undefined;
}>;
export type HeaderItem = z.infer<typeof headerItemSchema>;
/** An item as a module writes it, before defaults are filled in. */
export type HeaderItemInput = z.input<typeof headerItemSchema>;
/** A module's whole header: every item, in the order the module wants them within each menu. Ids are unique. */
export declare const headerItemsSchema: z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
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
    /** Which option the module is on now. One of `options`. */
    value: z.ZodEffects<z.ZodString, string, string>;
    id: z.ZodEffects<z.ZodString, string, string>;
    label: z.ZodString;
    /** An icon by name (`file-text`). A host draws the ones it has; an unknown name draws none. */
    icon: z.ZodOptional<z.ZodString>;
    /** A hint shown beside the label (`⌘B`). The host binds no key from it: the module's page does. */
    shortcut: z.ZodOptional<z.ZodString>;
    /** A heading inside the item's menu. Items naming the same group are drawn together under it. */
    group: z.ZodOptional<z.ZodString>;
    /**
     * Whether an agent may press this through the host. False unless said: a module opts each item
     * in. Refused together with `tool`, and on a run that has `confirm`.
     */
    agents: z.ZodDefault<z.ZodBoolean>;
    /**
     * The tool at this module's own MCP door that does what this item does. An agent is sent there
     * instead of pressing: the host refuses the press and names the tool, so there is one way for a
     * program to do each thing. Refused together with `agents`.
     */
    tool: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"switch">;
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
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
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
}>, z.ZodObject<{
    checked: z.ZodBoolean;
    id: z.ZodEffects<z.ZodString, string, string>;
    label: z.ZodString;
    /** An icon by name (`file-text`). A host draws the ones it has; an unknown name draws none. */
    icon: z.ZodOptional<z.ZodString>;
    /** A hint shown beside the label (`⌘B`). The host binds no key from it: the module's page does. */
    shortcut: z.ZodOptional<z.ZodString>;
    /** A heading inside the item's menu. Items naming the same group are drawn together under it. */
    group: z.ZodOptional<z.ZodString>;
    /**
     * Whether an agent may press this through the host. False unless said: a module opts each item
     * in. Refused together with `tool`, and on a run that has `confirm`.
     */
    agents: z.ZodDefault<z.ZodBoolean>;
    /**
     * The tool at this module's own MCP door that does what this item does. An agent is sent there
     * instead of pressing: the host refuses the press and names the tool, so there is one way for a
     * program to do each thing. Refused together with `agents`.
     */
    tool: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"toggle">;
}, "strip", z.ZodTypeAny, {
    id: string;
    label: string;
    kind: "toggle";
    agents: boolean;
    checked: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
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
    /** An icon by name (`file-text`). A host draws the ones it has; an unknown name draws none. */
    icon: z.ZodOptional<z.ZodString>;
    /** A hint shown beside the label (`⌘B`). The host binds no key from it: the module's page does. */
    shortcut: z.ZodOptional<z.ZodString>;
    /** A heading inside the item's menu. Items naming the same group are drawn together under it. */
    group: z.ZodOptional<z.ZodString>;
    /**
     * Whether an agent may press this through the host. False unless said: a module opts each item
     * in. Refused together with `tool`, and on a run that has `confirm`.
     */
    agents: z.ZodDefault<z.ZodBoolean>;
    /**
     * The tool at this module's own MCP door that does what this item does. An agent is sent there
     * instead of pressing: the host refuses the press and names the tool, so there is one way for a
     * program to do each thing. Refused together with `agents`.
     */
    tool: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"go">;
}, "strip", z.ZodTypeAny, {
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "go";
    agents: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
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
}>, z.ZodObject<{
    state: z.ZodDefault<z.ZodEnum<["idle", "busy", "failed"]>>;
    /** What the last run came to, in a word or three, or null. Shown beside the label. */
    result: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /** Why it cannot be run right now, as a sentence, or null when it can. A host draws it flat and says why. */
    disabled: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /** Whether a press arms it and a second press runs it. The arm is the host's; the module adds none. */
    confirm: z.ZodDefault<z.ZodBoolean>;
    /**
     * 1.4.0. Where the press lands. A relayed press carries no user activation, so a module cannot
     * ask for full screen from `onPress`; the host can, from the person's click. Absent: the press
     * is only relayed. A host that does not know the field strips it and relays the press.
     */
    surface: z.ZodOptional<z.ZodEnum<["fullscreen"]>>;
    /**
     * 1.6.0. Draw this run as an icon button in the container header, left of the menus, as well
     * as in the Run menu. Only drawing changes: an agent presses by id as before. At most
     * `LIMITS.PINNED_MAX` are drawn (declaration order, see `pinnedRuns`). A host that does not
     * know the field strips it and keeps the item in the menu.
     */
    pinned: z.ZodOptional<z.ZodBoolean>;
    id: z.ZodEffects<z.ZodString, string, string>;
    label: z.ZodString;
    /** An icon by name (`file-text`). A host draws the ones it has; an unknown name draws none. */
    icon: z.ZodOptional<z.ZodString>;
    /** A hint shown beside the label (`⌘B`). The host binds no key from it: the module's page does. */
    shortcut: z.ZodOptional<z.ZodString>;
    /** A heading inside the item's menu. Items naming the same group are drawn together under it. */
    group: z.ZodOptional<z.ZodString>;
    /**
     * Whether an agent may press this through the host. False unless said: a module opts each item
     * in. Refused together with `tool`, and on a run that has `confirm`.
     */
    agents: z.ZodDefault<z.ZodBoolean>;
    /**
     * The tool at this module's own MCP door that does what this item does. An agent is sent there
     * instead of pressing: the host refuses the press and names the tool, so there is one way for a
     * program to do each thing. Refused together with `agents`.
     */
    tool: z.ZodOptional<z.ZodString>;
    kind: z.ZodLiteral<"run">;
}, "strip", z.ZodTypeAny, {
    id: string;
    state: "failed" | "idle" | "busy";
    label: string;
    kind: "run";
    agents: boolean;
    result: string | null;
    disabled: string | null;
    confirm: boolean;
    group?: string | undefined;
    pinned?: boolean | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    surface?: "fullscreen" | undefined;
}, {
    id: string;
    label: string;
    kind: "run";
    state?: "failed" | "idle" | "busy" | undefined;
    group?: string | undefined;
    pinned?: boolean | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    result?: string | null | undefined;
    disabled?: string | null | undefined;
    confirm?: boolean | undefined;
    surface?: "fullscreen" | undefined;
}>]>, {
    value: string;
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "switch";
    agents: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
} | {
    id: string;
    label: string;
    kind: "toggle";
    agents: boolean;
    checked: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
} | {
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "go";
    agents: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
} | {
    id: string;
    state: "failed" | "idle" | "busy";
    label: string;
    kind: "run";
    agents: boolean;
    result: string | null;
    disabled: string | null;
    confirm: boolean;
    group?: string | undefined;
    pinned?: boolean | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    surface?: "fullscreen" | undefined;
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
} | {
    id: string;
    label: string;
    kind: "run";
    state?: "failed" | "idle" | "busy" | undefined;
    group?: string | undefined;
    pinned?: boolean | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    result?: string | null | undefined;
    disabled?: string | null | undefined;
    confirm?: boolean | undefined;
    surface?: "fullscreen" | undefined;
}>, "many">, ({
    value: string;
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "switch";
    agents: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
} | {
    id: string;
    label: string;
    kind: "toggle";
    agents: boolean;
    checked: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
} | {
    options: {
        id: string;
        label: string;
    }[];
    id: string;
    label: string;
    kind: "go";
    agents: boolean;
    group?: string | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
} | {
    id: string;
    state: "failed" | "idle" | "busy";
    label: string;
    kind: "run";
    agents: boolean;
    result: string | null;
    disabled: string | null;
    confirm: boolean;
    group?: string | undefined;
    pinned?: boolean | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    tool?: string | undefined;
    surface?: "fullscreen" | undefined;
})[], ({
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
} | {
    id: string;
    label: string;
    kind: "run";
    state?: "failed" | "idle" | "busy" | undefined;
    group?: string | undefined;
    pinned?: boolean | undefined;
    icon?: string | undefined;
    shortcut?: string | undefined;
    agents?: boolean | undefined;
    tool?: string | undefined;
    result?: string | null | undefined;
    disabled?: string | null | undefined;
    confirm?: boolean | undefined;
    surface?: "fullscreen" | undefined;
})[]>;
/**
 * The runs a host draws as header buttons (1.6.0): those with `pinned: true`, in declaration order,
 * the first `LIMITS.PINNED_MAX` of them. The others stay in the Run menu only.
 */
export declare function pinnedRuns(items: readonly HeaderItem[]): HeaderItem[];
/**
 * Which menu each kind is drawn in. Fixed, so a module cannot scatter its items: switches and
 * toggles are View, jumps are Go, runs are Run. `frame` is the host's own menu and holds no item.
 */
export declare const HEADER_MENUS: {
    readonly switch: "view";
    readonly toggle: "view";
    readonly go: "go";
    readonly run: "run";
};
export type HeaderMenu = (typeof HEADER_MENUS)[HeaderKind];
/** The module menus, in the order a host draws them. */
export declare const HEADER_MENU_NAMES: readonly ["view", "go", "run"];
/** What a press carries beside the item: the option chosen (switch, go), the state wanted (toggle), or nothing (run). */
export declare const pressValueSchema: z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodBoolean]>;
export type PressValue = z.infer<typeof pressValueSchema>;
/**
 * Why a press cannot be taken, as a sentence that names what exists, or `null` when it can. Pure,
 * and the same rule on both sides: a host asks it before sending (for an agent's press above all),
 * and `connect` asks it again on arrival, because the header may have been declared anew in between.
 */
export declare function pressRefusal(items: readonly HeaderItem[], press: {
    item: string;
    value?: PressValue;
}): string | null;
