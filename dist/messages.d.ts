import { z } from 'zod';
/**
 * Module → host. What a module currently offers to be narrowed by. The whole offer, every time: it
 * replaces, never merges, and an empty `groups` takes the control away. Sent whenever the answer
 * changes, including its words. Two groups cannot share an id.
 */
export declare const filtersSchema: z.ZodObject<{
    type: z.ZodLiteral<"kehikot.filters">;
    groups: z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        id: z.ZodEffects<z.ZodString, string, string>;
        label: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<["choice", "text", "toggles"]>>;
        options: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodEffects<z.ZodString, string, string>;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            label: string;
        }, {
            id: string;
            label: string;
        }>, "many">>;
        fallback: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strip", z.ZodTypeAny, {
        options: {
            id: string;
            label: string;
        }[];
        id: string;
        label: string;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }, {
        id: string;
        label: string;
        options?: {
            id: string;
            label: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }>, {
        options: {
            id: string;
            label: string;
        }[];
        id: string;
        label: string;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }, {
        id: string;
        label: string;
        options?: {
            id: string;
            label: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }>, {
        options: {
            id: string;
            label: string;
        }[];
        id: string;
        label: string;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }, {
        id: string;
        label: string;
        options?: {
            id: string;
            label: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }>, "many">, {
        options: {
            id: string;
            label: string;
        }[];
        id: string;
        label: string;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[], {
        id: string;
        label: string;
        options?: {
            id: string;
            label: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[]>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.filters";
    groups: {
        options: {
            id: string;
            label: string;
        }[];
        id: string;
        label: string;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[];
}, {
    type: "kehikot.filters";
    groups: {
        id: string;
        label: string;
        options?: {
            id: string;
            label: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[];
}>;
export type Filters = z.infer<typeof filtersSchema>;
/**
 * Module → host. What a module offers to clear, in its own words. The whole offer, every time; any
 * count rides in the label. Re-announced whenever what it shows changes, including immediately
 * after it has been asked to clear.
 */
export declare const clearableSchema: z.ZodObject<{
    type: z.ZodLiteral<"kehikot.clearable">;
    /** The words on the control, or `null` to take the control away. */
    label: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.clearable";
    label: string | null;
}, {
    type: "kehikot.clearable";
    label?: string | null | undefined;
}>;
export type Clearable = z.infer<typeof clearableSchema>;
/**
 * Host → module. The press, relayed: "clear what you are showing". Empty apart from `type` and
 * `protocol`: no list of what to delete, no filter choice, no correlation id, and no answer.
 */
export declare const clearSchema: z.ZodObject<{
    type: z.ZodLiteral<"kehikot.clear">;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.clear";
    protocol: number;
}, {
    type: "kehikot.clear";
    protocol: number;
}>;
export type Clear = z.infer<typeof clearSchema>;
/**
 * Module → host. What a module says about being refreshed. The whole state, every time, re-announced
 * whenever any of the three changes. `at` is an ISO 8601 instant with an offset, or null for "I
 * cannot say" (the host then draws no time). `busy` keeps the control and says a read is in flight.
 */
export declare const refreshableSchema: z.ZodObject<{
    type: z.ZodLiteral<"kehikot.refreshable">;
    /** Whether there is anything to read again right now. `false` withdraws the control. */
    can: z.ZodDefault<z.ZodBoolean>;
    /** When this module's material was last read, as the MODULE knows it. */
    at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /** Whether a read is in flight this second. */
    busy: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    at: string | null;
    type: "kehikot.refreshable";
    busy: boolean;
    can: boolean;
}, {
    type: "kehikot.refreshable";
    at?: string | null | undefined;
    busy?: boolean | undefined;
    can?: boolean | undefined;
}>;
export type Refreshable = z.infer<typeof refreshableSchema>;
/**
 * Host → module. The press, relayed: "read your material again". Carries no reason, no interval and
 * no correlation id; what comes back is a new `kehikot.refreshable` (`busy`, then a new `at`).
 */
export declare const refreshSchema: z.ZodObject<{
    type: z.ZodLiteral<"kehikot.refresh">;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.refresh";
    protocol: number;
}, {
    type: "kehikot.refresh";
    protocol: number;
}>;
export type Refresh = z.infer<typeof refreshSchema>;
/**
 * Module → host. Every header item this module has, whole, every time: it replaces, never merges,
 * and an empty `items` takes the module's menus away. Sent again whenever anything in it changes —
 * a switch moved, a run went busy — including right after a press. See `header.ts`.
 */
export declare const headerSchema: z.ZodObject<{
    type: z.ZodLiteral<"kehikot.header">;
    items: z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
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
        icon: z.ZodOptional<z.ZodString>;
        shortcut: z.ZodOptional<z.ZodString>;
        group: z.ZodOptional<z.ZodString>;
        agents: z.ZodDefault<z.ZodBoolean>;
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
        icon: z.ZodOptional<z.ZodString>;
        shortcut: z.ZodOptional<z.ZodString>;
        group: z.ZodOptional<z.ZodString>;
        agents: z.ZodDefault<z.ZodBoolean>;
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
}, "strip", z.ZodTypeAny, {
    type: "kehikot.header";
    items: ({
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
    })[];
}, {
    type: "kehikot.header";
    items: ({
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
    })[];
}>;
export type Header = z.infer<typeof headerSchema>;
/**
 * Host → module. One item was pressed. `value` is the option chosen for a switch or a go item, the
 * state wanted for a toggle (so a press delivered twice does not flip twice), and absent for a run.
 * `id` pairs it with its `pressed`. A host sends this only for an item in the module's last header,
 * after any arm of its own, and must time out: no `pressed` means the press was not taken.
 */
export declare const pressSchema: z.ZodObject<{
    type: z.ZodLiteral<"kehikot.press">;
    protocol: z.ZodNumber;
    id: z.ZodString;
    item: z.ZodString;
    value: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodBoolean]>>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.press";
    id: string;
    protocol: number;
    item: string;
    value?: string | boolean | undefined;
}, {
    type: "kehikot.press";
    id: string;
    protocol: number;
    item: string;
    value?: string | boolean | undefined;
}>;
export type Press = z.infer<typeof pressSchema>;
/**
 * Module → host. What became of one press: taken, or not and why. "Taken" is not "finished": a run
 * that takes a minute answers at once and says how it is going by declaring its header again.
 */
export declare const pressedSchema: z.ZodObject<{
    type: z.ZodLiteral<"kehikot.pressed">;
    id: z.ZodString;
    ok: z.ZodBoolean;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.pressed";
    id: string;
    why: string;
    ok: boolean;
}, {
    type: "kehikot.pressed";
    id: string;
    ok: boolean;
    why?: string | undefined;
}>;
export type Pressed = z.infer<typeof pressedSchema>;
/**
 * Host → module. Hello: the whole of what a module is given without asking, sent on every frame
 * load. `protocol` is what the two sides settled on when the manifest was read. `session` names
 * this conversation; it is not a credential and must never become one.
 */
export declare const helloSchema: z.ZodObject<{
    type: z.ZodLiteral<"kehikot.hello">;
    protocol: z.ZodNumber;
    session: z.ZodString;
    context: z.ZodObject<{
        epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        scope: z.ZodCatch<z.ZodOptional<z.ZodEnum<["machine", "project", "epic", "part", "kehikko"]>>>;
        project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        projectId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
        selection: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        passage: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
            path: z.ZodString;
            page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            quoted: z.ZodDefault<z.ZodString>;
            section: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                title: z.ZodString;
                from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            }, "strip", z.ZodTypeAny, {
                title: string;
                from: number | null;
                to: number | null;
            }, {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            }>, {
                title: string;
                from: number | null;
                to: number | null;
            }, {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            }>, {
                title: string;
                from: number | null;
                to: number | null;
            }, {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            }>>>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                title: string;
                from: number | null;
                to: number | null;
            } | null;
        }, {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        }>, {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                title: string;
                from: number | null;
                to: number | null;
            } | null;
        }, {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        }>, {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                title: string;
                from: number | null;
                to: number | null;
            } | null;
        }, {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        }>>>;
        location: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodObject<{
            intent: z.ZodCatch<z.ZodEnum<["show", "comment"]>>;
            by: z.ZodOptional<z.ZodString>;
            at: z.ZodOptional<z.ZodString>;
            change: z.ZodString;
            path: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
            line: z.ZodNumber;
            endLine: z.ZodOptional<z.ZodNumber>;
            side: z.ZodEnum<["new", "old"]>;
            commit: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            intent: "show" | "comment";
            line: number;
            change: string;
            side: "new" | "old";
            at?: string | undefined;
            by?: string | undefined;
            commit?: string | undefined;
            endLine?: number | undefined;
        }, {
            path: string;
            line: number;
            change: string;
            side: "new" | "old";
            at?: string | undefined;
            intent?: unknown;
            by?: string | undefined;
            commit?: string | undefined;
            endLine?: number | undefined;
        }>, {
            path: string;
            intent: "show" | "comment";
            line: number;
            change: string;
            side: "new" | "old";
            at?: string | undefined;
            by?: string | undefined;
            commit?: string | undefined;
            endLine?: number | undefined;
        }, {
            path: string;
            line: number;
            change: string;
            side: "new" | "old";
            at?: string | undefined;
            intent?: unknown;
            by?: string | undefined;
            commit?: string | undefined;
            endLine?: number | undefined;
        }>>>;
        address: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            url: z.ZodEffects<z.ZodString, string, string>;
            title: z.ZodOptional<z.ZodString>;
            intent: z.ZodCatch<z.ZodEnum<["show"]>>;
            by: z.ZodOptional<z.ZodString>;
            agent: z.ZodOptional<z.ZodLiteral<true>>;
            at: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            intent: "show";
            at?: string | undefined;
            title?: string | undefined;
            by?: string | undefined;
            agent?: true | undefined;
        }, {
            url: string;
            at?: string | undefined;
            title?: string | undefined;
            intent?: unknown;
            by?: string | undefined;
            agent?: true | undefined;
        }>>>;
        show: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            subject: z.ZodString;
            id: z.ZodString;
        } & {
            by: z.ZodOptional<z.ZodString>;
            at: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            subject: string;
            at?: string | undefined;
            by?: string | undefined;
        }, {
            id: string;
            subject: string;
            at?: string | undefined;
            by?: string | undefined;
        }>>>;
        pinned: z.ZodDefault<z.ZodBoolean>;
        prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            id: z.ZodNumber;
            name: z.ZodString;
            key: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: number;
            name: string;
            key?: string | undefined;
        }, {
            id: number;
            name: string;
            key?: string | undefined;
        }>>>;
        filters: z.ZodDefault<z.ZodEffects<z.ZodRecord<z.ZodEffects<z.ZodString, string, string>, z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">, string[], string[]>]>>, Record<string, string | string[]>, Record<string, string | string[]>>>;
        containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
            module: z.ZodString;
            selected: z.ZodDefault<z.ZodBoolean>;
            folded: z.ZodOptional<z.ZodBoolean>;
            showing: z.ZodDefault<z.ZodObject<{
                refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                documents: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                    path: z.ZodString;
                    page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    quoted: z.ZodDefault<z.ZodString>;
                    section: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                        title: z.ZodString;
                        from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                        to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    }, "strip", z.ZodTypeAny, {
                        title: string;
                        from: number | null;
                        to: number | null;
                    }, {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    }>, {
                        title: string;
                        from: number | null;
                        to: number | null;
                    }, {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    }>, {
                        title: string;
                        from: number | null;
                        to: number | null;
                    }, {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    }>>>;
                }, "strip", z.ZodTypeAny, {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        title: string;
                        from: number | null;
                        to: number | null;
                    } | null;
                }, {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }>, {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        title: string;
                        from: number | null;
                        to: number | null;
                    } | null;
                }, {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }>, {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        title: string;
                        from: number | null;
                        to: number | null;
                    } | null;
                }, {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }>, "many">>;
            }, "strip", z.ZodTypeAny, {
                refs: string[];
                documents: {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        title: string;
                        from: number | null;
                        to: number | null;
                    } | null;
                }[];
            }, {
                refs?: string[] | undefined;
                documents?: {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }[] | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            module: string;
            selected: boolean;
            showing: {
                refs: string[];
                documents: {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        title: string;
                        from: number | null;
                        to: number | null;
                    } | null;
                }[];
            };
            folded?: boolean | undefined;
        }, {
            module: string;
            selected?: boolean | undefined;
            folded?: boolean | undefined;
            showing?: {
                refs?: string[] | undefined;
                documents?: {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }[] | undefined;
            } | undefined;
        }>, "many">>;
        dispositions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            ref: z.ZodString;
            value: z.ZodEnum<["done", "wont-do", "duplicate", "superseded"]>;
            target: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            note: z.ZodDefault<z.ZodString>;
            by: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            at: string | null;
            by: string | null;
            ref: string;
            target: string | null;
            note: string;
        }, {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            by?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
        }>, "many">>;
        tracker: z.ZodDefault<z.ZodObject<{
            at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            refreshing: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            at: string | null;
            refreshing: boolean;
        }, {
            at?: string | null | undefined;
            refreshing?: boolean | undefined;
        }>>;
        content: z.ZodDefault<z.ZodArray<z.ZodObject<{
            source: z.ZodString;
            epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            at: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            at: string;
            epic: string | null;
            source: string;
        }, {
            at: string;
            source: string;
            epic?: string | null | undefined;
        }>, "many">>;
        parts: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            picked: z.ZodDefault<z.ZodBoolean>;
            files: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
            documents: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            refs: string[];
            heading: string;
            picked: boolean;
            files?: string[] | undefined;
            documents?: string[] | undefined;
        }, {
            id: string;
            refs?: string[] | undefined;
            files?: string[] | undefined;
            heading?: string | undefined;
            picked?: boolean | undefined;
            documents?: string[] | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        epic: string | null;
        parts: {
            id: string;
            refs: string[];
            heading: string;
            picked: boolean;
            files?: string[] | undefined;
            documents?: string[] | undefined;
        }[];
        kehikko: {
            id: number;
            name: string;
            key?: string | undefined;
        } | null;
        project: string | null;
        projectId: string | null;
        show: {
            id: string;
            subject: string;
            at?: string | undefined;
            by?: string | undefined;
        } | null;
        tracker: {
            at: string | null;
            refreshing: boolean;
        };
        projectPath: string | null;
        theme: "light" | "dark";
        selection: string[];
        passage: {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                title: string;
                from: number | null;
                to: number | null;
            } | null;
        } | null;
        location: {
            path: string;
            intent: "show" | "comment";
            line: number;
            change: string;
            side: "new" | "old";
            at?: string | undefined;
            by?: string | undefined;
            commit?: string | undefined;
            endLine?: number | undefined;
        } | null;
        address: {
            url: string;
            intent: "show";
            at?: string | undefined;
            title?: string | undefined;
            by?: string | undefined;
            agent?: true | undefined;
        } | null;
        pinned: boolean;
        prompt: string | null;
        filters: Record<string, string | string[]>;
        containers: {
            module: string;
            selected: boolean;
            showing: {
                refs: string[];
                documents: {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        title: string;
                        from: number | null;
                        to: number | null;
                    } | null;
                }[];
            };
            folded?: boolean | undefined;
        }[];
        dispositions: {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            at: string | null;
            by: string | null;
            ref: string;
            target: string | null;
            note: string;
        }[];
        content: {
            at: string;
            epic: string | null;
            source: string;
        }[];
        scope?: "epic" | "kehikko" | "project" | "part" | "machine" | undefined;
    }, {
        epic?: string | null | undefined;
        parts?: {
            id: string;
            refs?: string[] | undefined;
            files?: string[] | undefined;
            heading?: string | undefined;
            picked?: boolean | undefined;
            documents?: string[] | undefined;
        }[] | undefined;
        kehikko?: {
            id: number;
            name: string;
            key?: string | undefined;
        } | null | undefined;
        project?: string | null | undefined;
        projectId?: string | null | undefined;
        show?: {
            id: string;
            subject: string;
            at?: string | undefined;
            by?: string | undefined;
        } | null | undefined;
        tracker?: {
            at?: string | null | undefined;
            refreshing?: boolean | undefined;
        } | undefined;
        projectPath?: string | null | undefined;
        scope?: unknown;
        theme?: "light" | "dark" | undefined;
        selection?: string[] | undefined;
        passage?: {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        } | null | undefined;
        location?: {
            path: string;
            line: number;
            change: string;
            side: "new" | "old";
            at?: string | undefined;
            intent?: unknown;
            by?: string | undefined;
            commit?: string | undefined;
            endLine?: number | undefined;
        } | null | undefined;
        address?: {
            url: string;
            at?: string | undefined;
            title?: string | undefined;
            intent?: unknown;
            by?: string | undefined;
            agent?: true | undefined;
        } | null | undefined;
        pinned?: boolean | undefined;
        prompt?: string | null | undefined;
        filters?: Record<string, string | string[]> | undefined;
        containers?: {
            module: string;
            selected?: boolean | undefined;
            folded?: boolean | undefined;
            showing?: {
                refs?: string[] | undefined;
                documents?: {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }[] | undefined;
            } | undefined;
        }[] | undefined;
        dispositions?: {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            by?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
        }[] | undefined;
        content?: {
            at: string;
            source: string;
            epic?: string | null | undefined;
        }[] | undefined;
    }>;
    /**
     * Whatever this module last asked the host to keep for it (`state.set`), verbatim and opaque. This
     * module's alone, which is why it is not in the context. `null` when the host keeps nothing for it.
     */
    state: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /**
     * 1.4.0. The methods this host will answer for THIS module: spoken by the protocol, kept by the
     * host and granted by the manifest's `declares.uses`. Absent from a host before 1.4.0, which is
     * "unknown", not "none": ask and be refused, as before. An empty list is a host that answers
     * nothing for this module. Order carries no meaning; names are not checked against `METHODS`.
     */
    answers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /**
     * 1.4.0. Whether this host draws the module's declared header (`kehikot.header`) in its own menus.
     * Absent from a host before 1.4.0: unknown. `false` is a host that does not, so the module keeps
     * its own control. See docs/header.md.
     */
    header: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.hello";
    state: string | null;
    protocol: number;
    session: string;
    context: {
        epic: string | null;
        parts: {
            id: string;
            refs: string[];
            heading: string;
            picked: boolean;
            files?: string[] | undefined;
            documents?: string[] | undefined;
        }[];
        kehikko: {
            id: number;
            name: string;
            key?: string | undefined;
        } | null;
        project: string | null;
        projectId: string | null;
        show: {
            id: string;
            subject: string;
            at?: string | undefined;
            by?: string | undefined;
        } | null;
        tracker: {
            at: string | null;
            refreshing: boolean;
        };
        projectPath: string | null;
        theme: "light" | "dark";
        selection: string[];
        passage: {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                title: string;
                from: number | null;
                to: number | null;
            } | null;
        } | null;
        location: {
            path: string;
            intent: "show" | "comment";
            line: number;
            change: string;
            side: "new" | "old";
            at?: string | undefined;
            by?: string | undefined;
            commit?: string | undefined;
            endLine?: number | undefined;
        } | null;
        address: {
            url: string;
            intent: "show";
            at?: string | undefined;
            title?: string | undefined;
            by?: string | undefined;
            agent?: true | undefined;
        } | null;
        pinned: boolean;
        prompt: string | null;
        filters: Record<string, string | string[]>;
        containers: {
            module: string;
            selected: boolean;
            showing: {
                refs: string[];
                documents: {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        title: string;
                        from: number | null;
                        to: number | null;
                    } | null;
                }[];
            };
            folded?: boolean | undefined;
        }[];
        dispositions: {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            at: string | null;
            by: string | null;
            ref: string;
            target: string | null;
            note: string;
        }[];
        content: {
            at: string;
            epic: string | null;
            source: string;
        }[];
        scope?: "epic" | "kehikko" | "project" | "part" | "machine" | undefined;
    };
    answers?: string[] | undefined;
    header?: boolean | undefined;
}, {
    type: "kehikot.hello";
    protocol: number;
    session: string;
    context: {
        epic?: string | null | undefined;
        parts?: {
            id: string;
            refs?: string[] | undefined;
            files?: string[] | undefined;
            heading?: string | undefined;
            picked?: boolean | undefined;
            documents?: string[] | undefined;
        }[] | undefined;
        kehikko?: {
            id: number;
            name: string;
            key?: string | undefined;
        } | null | undefined;
        project?: string | null | undefined;
        projectId?: string | null | undefined;
        show?: {
            id: string;
            subject: string;
            at?: string | undefined;
            by?: string | undefined;
        } | null | undefined;
        tracker?: {
            at?: string | null | undefined;
            refreshing?: boolean | undefined;
        } | undefined;
        projectPath?: string | null | undefined;
        scope?: unknown;
        theme?: "light" | "dark" | undefined;
        selection?: string[] | undefined;
        passage?: {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        } | null | undefined;
        location?: {
            path: string;
            line: number;
            change: string;
            side: "new" | "old";
            at?: string | undefined;
            intent?: unknown;
            by?: string | undefined;
            commit?: string | undefined;
            endLine?: number | undefined;
        } | null | undefined;
        address?: {
            url: string;
            at?: string | undefined;
            title?: string | undefined;
            intent?: unknown;
            by?: string | undefined;
            agent?: true | undefined;
        } | null | undefined;
        pinned?: boolean | undefined;
        prompt?: string | null | undefined;
        filters?: Record<string, string | string[]> | undefined;
        containers?: {
            module: string;
            selected?: boolean | undefined;
            folded?: boolean | undefined;
            showing?: {
                refs?: string[] | undefined;
                documents?: {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }[] | undefined;
            } | undefined;
        }[] | undefined;
        dispositions?: {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            by?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
        }[] | undefined;
        content?: {
            at: string;
            source: string;
            epic?: string | null | undefined;
        }[] | undefined;
    };
    state?: string | null | undefined;
    answers?: string[] | undefined;
    header?: boolean | undefined;
}>;
/**
 * Host → module. Which epic is open now: the `contextSchema` fields flat, not wrapped in `context`.
 * Sent when the reader switches epics and when the module's own tab is shown. Only epic-scoped
 * modes are told; a `global` mode is not.
 */
export declare const contextMessageSchema: z.ZodObject<{
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    scope: z.ZodCatch<z.ZodOptional<z.ZodEnum<["machine", "project", "epic", "part", "kehikko"]>>>;
    project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    projectId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    selection: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    passage: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        path: z.ZodString;
        page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        quoted: z.ZodDefault<z.ZodString>;
        section: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
            title: z.ZodString;
            from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        }, "strip", z.ZodTypeAny, {
            title: string;
            from: number | null;
            to: number | null;
        }, {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        }>, {
            title: string;
            from: number | null;
            to: number | null;
        }, {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        }>, {
            title: string;
            from: number | null;
            to: number | null;
        }, {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        from: number | null;
        to: number | null;
        page: number | null;
        quoted: string;
        section: {
            title: string;
            from: number | null;
            to: number | null;
        } | null;
    }, {
        path: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
        page?: number | null | undefined;
        quoted?: string | undefined;
        section?: {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        } | null | undefined;
    }>, {
        path: string;
        from: number | null;
        to: number | null;
        page: number | null;
        quoted: string;
        section: {
            title: string;
            from: number | null;
            to: number | null;
        } | null;
    }, {
        path: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
        page?: number | null | undefined;
        quoted?: string | undefined;
        section?: {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        } | null | undefined;
    }>, {
        path: string;
        from: number | null;
        to: number | null;
        page: number | null;
        quoted: string;
        section: {
            title: string;
            from: number | null;
            to: number | null;
        } | null;
    }, {
        path: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
        page?: number | null | undefined;
        quoted?: string | undefined;
        section?: {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        } | null | undefined;
    }>>>;
    location: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodObject<{
        intent: z.ZodCatch<z.ZodEnum<["show", "comment"]>>;
        by: z.ZodOptional<z.ZodString>;
        at: z.ZodOptional<z.ZodString>;
        change: z.ZodString;
        path: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        line: z.ZodNumber;
        endLine: z.ZodOptional<z.ZodNumber>;
        side: z.ZodEnum<["new", "old"]>;
        commit: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        intent: "show" | "comment";
        line: number;
        change: string;
        side: "new" | "old";
        at?: string | undefined;
        by?: string | undefined;
        commit?: string | undefined;
        endLine?: number | undefined;
    }, {
        path: string;
        line: number;
        change: string;
        side: "new" | "old";
        at?: string | undefined;
        intent?: unknown;
        by?: string | undefined;
        commit?: string | undefined;
        endLine?: number | undefined;
    }>, {
        path: string;
        intent: "show" | "comment";
        line: number;
        change: string;
        side: "new" | "old";
        at?: string | undefined;
        by?: string | undefined;
        commit?: string | undefined;
        endLine?: number | undefined;
    }, {
        path: string;
        line: number;
        change: string;
        side: "new" | "old";
        at?: string | undefined;
        intent?: unknown;
        by?: string | undefined;
        commit?: string | undefined;
        endLine?: number | undefined;
    }>>>;
    address: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        url: z.ZodEffects<z.ZodString, string, string>;
        title: z.ZodOptional<z.ZodString>;
        intent: z.ZodCatch<z.ZodEnum<["show"]>>;
        by: z.ZodOptional<z.ZodString>;
        agent: z.ZodOptional<z.ZodLiteral<true>>;
        at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        intent: "show";
        at?: string | undefined;
        title?: string | undefined;
        by?: string | undefined;
        agent?: true | undefined;
    }, {
        url: string;
        at?: string | undefined;
        title?: string | undefined;
        intent?: unknown;
        by?: string | undefined;
        agent?: true | undefined;
    }>>>;
    show: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        subject: z.ZodString;
        id: z.ZodString;
    } & {
        by: z.ZodOptional<z.ZodString>;
        at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        subject: string;
        at?: string | undefined;
        by?: string | undefined;
    }, {
        id: string;
        subject: string;
        at?: string | undefined;
        by?: string | undefined;
    }>>>;
    pinned: z.ZodDefault<z.ZodBoolean>;
    prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        key: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
        key?: string | undefined;
    }, {
        id: number;
        name: string;
        key?: string | undefined;
    }>>>;
    filters: z.ZodDefault<z.ZodEffects<z.ZodRecord<z.ZodEffects<z.ZodString, string, string>, z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">, string[], string[]>]>>, Record<string, string | string[]>, Record<string, string | string[]>>>;
    containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
        module: z.ZodString;
        selected: z.ZodDefault<z.ZodBoolean>;
        folded: z.ZodOptional<z.ZodBoolean>;
        showing: z.ZodDefault<z.ZodObject<{
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            documents: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                path: z.ZodString;
                page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                quoted: z.ZodDefault<z.ZodString>;
                section: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                    title: z.ZodString;
                    from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                }, "strip", z.ZodTypeAny, {
                    title: string;
                    from: number | null;
                    to: number | null;
                }, {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                }>, {
                    title: string;
                    from: number | null;
                    to: number | null;
                }, {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                }>, {
                    title: string;
                    from: number | null;
                    to: number | null;
                }, {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                }>>>;
            }, "strip", z.ZodTypeAny, {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    title: string;
                    from: number | null;
                    to: number | null;
                } | null;
            }, {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }>, {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    title: string;
                    from: number | null;
                    to: number | null;
                } | null;
            }, {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }>, {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    title: string;
                    from: number | null;
                    to: number | null;
                } | null;
            }, {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            refs: string[];
            documents: {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    title: string;
                    from: number | null;
                    to: number | null;
                } | null;
            }[];
        }, {
            refs?: string[] | undefined;
            documents?: {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        module: string;
        selected: boolean;
        showing: {
            refs: string[];
            documents: {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    title: string;
                    from: number | null;
                    to: number | null;
                } | null;
            }[];
        };
        folded?: boolean | undefined;
    }, {
        module: string;
        selected?: boolean | undefined;
        folded?: boolean | undefined;
        showing?: {
            refs?: string[] | undefined;
            documents?: {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }[] | undefined;
        } | undefined;
    }>, "many">>;
    dispositions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        ref: z.ZodString;
        value: z.ZodEnum<["done", "wont-do", "duplicate", "superseded"]>;
        target: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        note: z.ZodDefault<z.ZodString>;
        by: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        at: string | null;
        by: string | null;
        ref: string;
        target: string | null;
        note: string;
    }, {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        at?: string | null | undefined;
        by?: string | null | undefined;
        target?: string | null | undefined;
        note?: string | undefined;
    }>, "many">>;
    tracker: z.ZodDefault<z.ZodObject<{
        at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        refreshing: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        at: string | null;
        refreshing: boolean;
    }, {
        at?: string | null | undefined;
        refreshing?: boolean | undefined;
    }>>;
    content: z.ZodDefault<z.ZodArray<z.ZodObject<{
        source: z.ZodString;
        epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        at: string;
        epic: string | null;
        source: string;
    }, {
        at: string;
        source: string;
        epic?: string | null | undefined;
    }>, "many">>;
    parts: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        heading: z.ZodDefault<z.ZodString>;
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        picked: z.ZodDefault<z.ZodBoolean>;
        files: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
        documents: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        refs: string[];
        heading: string;
        picked: boolean;
        files?: string[] | undefined;
        documents?: string[] | undefined;
    }, {
        id: string;
        refs?: string[] | undefined;
        files?: string[] | undefined;
        heading?: string | undefined;
        picked?: boolean | undefined;
        documents?: string[] | undefined;
    }>, "many">>;
} & {
    type: z.ZodLiteral<"kehikot.context">;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.context";
    epic: string | null;
    parts: {
        id: string;
        refs: string[];
        heading: string;
        picked: boolean;
        files?: string[] | undefined;
        documents?: string[] | undefined;
    }[];
    kehikko: {
        id: number;
        name: string;
        key?: string | undefined;
    } | null;
    project: string | null;
    projectId: string | null;
    show: {
        id: string;
        subject: string;
        at?: string | undefined;
        by?: string | undefined;
    } | null;
    protocol: number;
    tracker: {
        at: string | null;
        refreshing: boolean;
    };
    projectPath: string | null;
    theme: "light" | "dark";
    selection: string[];
    passage: {
        path: string;
        from: number | null;
        to: number | null;
        page: number | null;
        quoted: string;
        section: {
            title: string;
            from: number | null;
            to: number | null;
        } | null;
    } | null;
    location: {
        path: string;
        intent: "show" | "comment";
        line: number;
        change: string;
        side: "new" | "old";
        at?: string | undefined;
        by?: string | undefined;
        commit?: string | undefined;
        endLine?: number | undefined;
    } | null;
    address: {
        url: string;
        intent: "show";
        at?: string | undefined;
        title?: string | undefined;
        by?: string | undefined;
        agent?: true | undefined;
    } | null;
    pinned: boolean;
    prompt: string | null;
    filters: Record<string, string | string[]>;
    containers: {
        module: string;
        selected: boolean;
        showing: {
            refs: string[];
            documents: {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    title: string;
                    from: number | null;
                    to: number | null;
                } | null;
            }[];
        };
        folded?: boolean | undefined;
    }[];
    dispositions: {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        at: string | null;
        by: string | null;
        ref: string;
        target: string | null;
        note: string;
    }[];
    content: {
        at: string;
        epic: string | null;
        source: string;
    }[];
    scope?: "epic" | "kehikko" | "project" | "part" | "machine" | undefined;
}, {
    type: "kehikot.context";
    protocol: number;
    epic?: string | null | undefined;
    parts?: {
        id: string;
        refs?: string[] | undefined;
        files?: string[] | undefined;
        heading?: string | undefined;
        picked?: boolean | undefined;
        documents?: string[] | undefined;
    }[] | undefined;
    kehikko?: {
        id: number;
        name: string;
        key?: string | undefined;
    } | null | undefined;
    project?: string | null | undefined;
    projectId?: string | null | undefined;
    show?: {
        id: string;
        subject: string;
        at?: string | undefined;
        by?: string | undefined;
    } | null | undefined;
    tracker?: {
        at?: string | null | undefined;
        refreshing?: boolean | undefined;
    } | undefined;
    projectPath?: string | null | undefined;
    scope?: unknown;
    theme?: "light" | "dark" | undefined;
    selection?: string[] | undefined;
    passage?: {
        path: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
        page?: number | null | undefined;
        quoted?: string | undefined;
        section?: {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        } | null | undefined;
    } | null | undefined;
    location?: {
        path: string;
        line: number;
        change: string;
        side: "new" | "old";
        at?: string | undefined;
        intent?: unknown;
        by?: string | undefined;
        commit?: string | undefined;
        endLine?: number | undefined;
    } | null | undefined;
    address?: {
        url: string;
        at?: string | undefined;
        title?: string | undefined;
        intent?: unknown;
        by?: string | undefined;
        agent?: true | undefined;
    } | null | undefined;
    pinned?: boolean | undefined;
    prompt?: string | null | undefined;
    filters?: Record<string, string | string[]> | undefined;
    containers?: {
        module: string;
        selected?: boolean | undefined;
        folded?: boolean | undefined;
        showing?: {
            refs?: string[] | undefined;
            documents?: {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }[] | undefined;
        } | undefined;
    }[] | undefined;
    dispositions?: {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        at?: string | null | undefined;
        by?: string | null | undefined;
        target?: string | null | undefined;
        note?: string | undefined;
    }[] | undefined;
    content?: {
        at: string;
        source: string;
        epic?: string | null | undefined;
    }[] | undefined;
}>;
/**
 * Why a request was refused, a closed set: `unknown-module`, this host has no module by that name;
 * `unknown-method`, no such method, which an author should treat as fatal; `failed`, everything
 * else including a host's own refusals, and the only one worth retrying.
 */
export declare const responseFailureReasons: readonly ["unknown-module", "unknown-method", "failed"];
export type ResponseFailureReason = (typeof responseFailureReasons)[number];
/**
 * Why a host declined a call rather than failing it (2.22.0), said beside `reason` on a refusal as
 * `declined`. One word: `host-too-old`, the method is newer than this host, which answers
 * `reason: 'unknown-method'` with it. A reader before 2.22.0 strips the field and sees
 * `unknown-method`, as before. Read it with `hostTooOld` (`fit.ts`).
 */
export declare const DECLINED_REASONS: readonly ["host-too-old"];
export type DeclinedReason = (typeof DECLINED_REASONS)[number];
/**
 * The two fields a refusal may carry for a call the host is too old for (2.22.0): `declined`, and
 * `since`, the version that has the method when the host can say (it usually cannot: the module's
 * own `SINCE` knows). Optional, and dropped rather than fatal when out of shape.
 */
export declare const declinedFields: {
    declined: z.ZodCatch<z.ZodOptional<z.ZodEnum<["host-too-old"]>>>;
    since: z.ZodCatch<z.ZodOptional<z.ZodString>>;
};
/**
 * Host → module. The answer to exactly one request: data or a refusal, two shapes under one type.
 * A refusal always carries both `reason`, a word from `responseFailureReasons` for the program, and
 * `error`, a sentence for the person writing the module.
 */
export declare const responseSchema: z.ZodDiscriminatedUnion<"ok", [z.ZodObject<{
    type: z.ZodLiteral<"kehikot.response">;
    id: z.ZodString;
    ok: z.ZodLiteral<true>;
    /**
     * Whatever the method answers with, and deliberately untyped. See the note
     * at the top of `methods.ts`: a client that asserted a shape here would be
     * asserting something no host promised.
     */
    data: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.response";
    id: string;
    ok: true;
    data?: unknown;
}, {
    type: "kehikot.response";
    id: string;
    ok: true;
    data?: unknown;
}>, z.ZodObject<{
    declined: z.ZodCatch<z.ZodOptional<z.ZodEnum<["host-too-old"]>>>;
    since: z.ZodCatch<z.ZodOptional<z.ZodString>>;
    type: z.ZodLiteral<"kehikot.response">;
    id: z.ZodString;
    ok: z.ZodLiteral<false>;
    reason: z.ZodEnum<["unknown-module", "unknown-method", "failed"]>;
    /** The sentence for the person. Bounded because a refusal quotes the module's own text back at it. */
    error: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.response";
    id: string;
    error: string;
    reason: "failed" | "unknown-module" | "unknown-method";
    ok: false;
    since?: string | undefined;
    declined?: "host-too-old" | undefined;
}, {
    type: "kehikot.response";
    id: string;
    reason: "failed" | "unknown-module" | "unknown-method";
    ok: false;
    since?: unknown;
    error?: string | undefined;
    declined?: unknown;
}>]>;
/**
 * Host → module. Go to a reference. Names a `ref` or a 1-based `step`; an epic alone is refused,
 * and `epic` means "switch first". `id` is required and pairs it with its `went`; see `wentSchema`.
 * Mirrors the `view.goto` method, which does accept an epic alone.
 */
export declare const gotoSchema: z.ZodEffects<z.ZodObject<{
    type: z.ZodLiteral<"kehikot.goto">;
    id: z.ZodString;
    ref: z.ZodOptional<z.ZodString>;
    step: z.ZodOptional<z.ZodNumber>;
    epic: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.goto";
    id: string;
    epic?: string | undefined;
    ref?: string | undefined;
    step?: number | undefined;
}, {
    type: "kehikot.goto";
    id: string;
    epic?: string | undefined;
    ref?: string | undefined;
    step?: number | undefined;
}>, {
    type: "kehikot.goto";
    id: string;
    epic?: string | undefined;
    ref?: string | undefined;
    step?: number | undefined;
}, {
    type: "kehikot.goto";
    id: string;
    epic?: string | undefined;
    ref?: string | undefined;
    step?: number | undefined;
}>;
/**
 * Host → module. An extension payload one module emitted, delivered to a module whose manifest
 * consumes that format. The host validated `extension` and `payload` and names `from` itself; the
 * contents are the sender's claim. Never answered, and lost if the receiver is still loading.
 */
export declare const eventSchema: z.ZodObject<{
    type: z.ZodLiteral<"kehikot.event">;
    protocol: z.ZodNumber;
    /** The format, e.g. `kehikot.notifications@1`. Known to the host, or unsent. */
    extension: z.ZodString;
    /** Whatever that format says. Validated by the host before it left. */
    payload: z.ZodUnknown;
    /** The module that emitted it, named by the host from its own registry. */
    from: z.ZodString;
    /**
     * When the host accepted it, ISO 8601. A receiver ordering by arrival would
     * be ordering by its own scheduler instead.
     */
    at: z.ZodString;
    /**
     * The kehikko it happened on, or null. Compare with `context.kehikko` to tell near from far; a
     * receiver that KEEPS an event files it under the kehikko's `key` when there is one, not its `id`.
     */
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        key: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
        key?: string | undefined;
    }, {
        id: number;
        name: string;
        key?: string | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    at: string;
    type: "kehikot.event";
    kehikko: {
        id: number;
        name: string;
        key?: string | undefined;
    } | null;
    protocol: number;
    from: string;
    extension: string;
    payload?: unknown;
}, {
    at: string;
    type: "kehikot.event";
    protocol: number;
    from: string;
    extension: string;
    kehikko?: {
        id: number;
        name: string;
        key?: string | undefined;
    } | null | undefined;
    payload?: unknown;
}>;
/**
 * Module → host. "I heard you." `id` is the module's own, so a host can confirm the frame holds the
 * program whose manifest it read; a mismatch is a fault to report, not how the host identifies it.
 * A host waits a bounded time, counted from the greeting, then says the module did not answer.
 */
export declare const readySchema: z.ZodObject<{
    type: z.ZodLiteral<"kehikot.ready">;
    id: z.ZodString;
    protocol: z.ZodDefault<z.ZodNumber>;
    /** The build that served this page, as printed into it. A host compares it with the server's now. */
    build: z.ZodCatch<z.ZodOptional<z.ZodObject<{
        version: z.ZodString;
        commit: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        started: z.ZodString;
        protocol: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version: string;
        commit: string | null;
        started: string;
        protocol: string;
    }, {
        version: string;
        started: string;
        protocol: string;
        commit?: string | null | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.ready";
    id: string;
    protocol: number;
    build?: {
        version: string;
        commit: string | null;
        started: string;
        protocol: string;
    } | undefined;
}, {
    type: "kehikot.ready";
    id: string;
    build?: unknown;
    protocol?: number | undefined;
}>;
/** One question, with an id the answer will carry back. */
export declare const requestSchema: z.ZodObject<{
    type: z.ZodLiteral<"kehikot.request">;
    id: z.ZodString;
    /**
     * Bounded but not held to the list of known methods. A host may refuse one it does not have, with
     * `unknown-method`.
     */
    method: z.ZodString;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    params: Record<string, unknown>;
    type: "kehikot.request";
    id: string;
    method: string;
}, {
    type: "kehikot.request";
    id: string;
    method: string;
    params?: Record<string, unknown> | undefined;
}>;
/**
 * Module → host. How tall the module would like to be. No id and no answer: the host clamps it
 * (`clampHeight`) and may ignore it entirely.
 */
export declare const resizeSchema: z.ZodObject<{
    type: z.ZodLiteral<"kehikot.resize">;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.resize";
    height: number;
}, {
    type: "kehikot.resize";
    height: number;
}>;
/**
 * Module → host. "I went", or "there is nothing here by that name": one per `goto`, carrying its
 * `id`, sent only once the walk has settled. `found` is what the host acts on; `why` is for the
 * person. A host must time out, and a timeout means `found: false`: fall back to the link.
 */
export declare const wentSchema: z.ZodObject<{
    type: z.ZodLiteral<"kehikot.went">;
    id: z.ZodString;
    found: z.ZodBoolean;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.went";
    id: string;
    why: string;
    found: boolean;
}, {
    type: "kehikot.went";
    id: string;
    found: boolean;
    why?: string | undefined;
}>;
/**
 * Every message a host sends. A plain union, not a `discriminatedUnion`, because `responseSchema`
 * is itself a union on a different key and cannot be an option of one.
 */
export declare const hostMessageSchema: z.ZodUnion<[z.ZodObject<{
    type: z.ZodLiteral<"kehikot.hello">;
    protocol: z.ZodNumber;
    session: z.ZodString;
    context: z.ZodObject<{
        epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        scope: z.ZodCatch<z.ZodOptional<z.ZodEnum<["machine", "project", "epic", "part", "kehikko"]>>>;
        project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        projectId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
        selection: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        passage: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
            path: z.ZodString;
            page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            quoted: z.ZodDefault<z.ZodString>;
            section: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                title: z.ZodString;
                from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            }, "strip", z.ZodTypeAny, {
                title: string;
                from: number | null;
                to: number | null;
            }, {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            }>, {
                title: string;
                from: number | null;
                to: number | null;
            }, {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            }>, {
                title: string;
                from: number | null;
                to: number | null;
            }, {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            }>>>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                title: string;
                from: number | null;
                to: number | null;
            } | null;
        }, {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        }>, {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                title: string;
                from: number | null;
                to: number | null;
            } | null;
        }, {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        }>, {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                title: string;
                from: number | null;
                to: number | null;
            } | null;
        }, {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        }>>>;
        location: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodObject<{
            intent: z.ZodCatch<z.ZodEnum<["show", "comment"]>>;
            by: z.ZodOptional<z.ZodString>;
            at: z.ZodOptional<z.ZodString>;
            change: z.ZodString;
            path: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
            line: z.ZodNumber;
            endLine: z.ZodOptional<z.ZodNumber>;
            side: z.ZodEnum<["new", "old"]>;
            commit: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            intent: "show" | "comment";
            line: number;
            change: string;
            side: "new" | "old";
            at?: string | undefined;
            by?: string | undefined;
            commit?: string | undefined;
            endLine?: number | undefined;
        }, {
            path: string;
            line: number;
            change: string;
            side: "new" | "old";
            at?: string | undefined;
            intent?: unknown;
            by?: string | undefined;
            commit?: string | undefined;
            endLine?: number | undefined;
        }>, {
            path: string;
            intent: "show" | "comment";
            line: number;
            change: string;
            side: "new" | "old";
            at?: string | undefined;
            by?: string | undefined;
            commit?: string | undefined;
            endLine?: number | undefined;
        }, {
            path: string;
            line: number;
            change: string;
            side: "new" | "old";
            at?: string | undefined;
            intent?: unknown;
            by?: string | undefined;
            commit?: string | undefined;
            endLine?: number | undefined;
        }>>>;
        address: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            url: z.ZodEffects<z.ZodString, string, string>;
            title: z.ZodOptional<z.ZodString>;
            intent: z.ZodCatch<z.ZodEnum<["show"]>>;
            by: z.ZodOptional<z.ZodString>;
            agent: z.ZodOptional<z.ZodLiteral<true>>;
            at: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            intent: "show";
            at?: string | undefined;
            title?: string | undefined;
            by?: string | undefined;
            agent?: true | undefined;
        }, {
            url: string;
            at?: string | undefined;
            title?: string | undefined;
            intent?: unknown;
            by?: string | undefined;
            agent?: true | undefined;
        }>>>;
        show: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            subject: z.ZodString;
            id: z.ZodString;
        } & {
            by: z.ZodOptional<z.ZodString>;
            at: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            subject: string;
            at?: string | undefined;
            by?: string | undefined;
        }, {
            id: string;
            subject: string;
            at?: string | undefined;
            by?: string | undefined;
        }>>>;
        pinned: z.ZodDefault<z.ZodBoolean>;
        prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            id: z.ZodNumber;
            name: z.ZodString;
            key: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: number;
            name: string;
            key?: string | undefined;
        }, {
            id: number;
            name: string;
            key?: string | undefined;
        }>>>;
        filters: z.ZodDefault<z.ZodEffects<z.ZodRecord<z.ZodEffects<z.ZodString, string, string>, z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">, string[], string[]>]>>, Record<string, string | string[]>, Record<string, string | string[]>>>;
        containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
            module: z.ZodString;
            selected: z.ZodDefault<z.ZodBoolean>;
            folded: z.ZodOptional<z.ZodBoolean>;
            showing: z.ZodDefault<z.ZodObject<{
                refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                documents: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                    path: z.ZodString;
                    page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    quoted: z.ZodDefault<z.ZodString>;
                    section: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                        title: z.ZodString;
                        from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                        to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    }, "strip", z.ZodTypeAny, {
                        title: string;
                        from: number | null;
                        to: number | null;
                    }, {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    }>, {
                        title: string;
                        from: number | null;
                        to: number | null;
                    }, {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    }>, {
                        title: string;
                        from: number | null;
                        to: number | null;
                    }, {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    }>>>;
                }, "strip", z.ZodTypeAny, {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        title: string;
                        from: number | null;
                        to: number | null;
                    } | null;
                }, {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }>, {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        title: string;
                        from: number | null;
                        to: number | null;
                    } | null;
                }, {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }>, {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        title: string;
                        from: number | null;
                        to: number | null;
                    } | null;
                }, {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }>, "many">>;
            }, "strip", z.ZodTypeAny, {
                refs: string[];
                documents: {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        title: string;
                        from: number | null;
                        to: number | null;
                    } | null;
                }[];
            }, {
                refs?: string[] | undefined;
                documents?: {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }[] | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            module: string;
            selected: boolean;
            showing: {
                refs: string[];
                documents: {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        title: string;
                        from: number | null;
                        to: number | null;
                    } | null;
                }[];
            };
            folded?: boolean | undefined;
        }, {
            module: string;
            selected?: boolean | undefined;
            folded?: boolean | undefined;
            showing?: {
                refs?: string[] | undefined;
                documents?: {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }[] | undefined;
            } | undefined;
        }>, "many">>;
        dispositions: z.ZodDefault<z.ZodArray<z.ZodObject<{
            ref: z.ZodString;
            value: z.ZodEnum<["done", "wont-do", "duplicate", "superseded"]>;
            target: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            note: z.ZodDefault<z.ZodString>;
            by: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            at: string | null;
            by: string | null;
            ref: string;
            target: string | null;
            note: string;
        }, {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            by?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
        }>, "many">>;
        tracker: z.ZodDefault<z.ZodObject<{
            at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            refreshing: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            at: string | null;
            refreshing: boolean;
        }, {
            at?: string | null | undefined;
            refreshing?: boolean | undefined;
        }>>;
        content: z.ZodDefault<z.ZodArray<z.ZodObject<{
            source: z.ZodString;
            epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            at: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            at: string;
            epic: string | null;
            source: string;
        }, {
            at: string;
            source: string;
            epic?: string | null | undefined;
        }>, "many">>;
        parts: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            picked: z.ZodDefault<z.ZodBoolean>;
            files: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
            documents: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            refs: string[];
            heading: string;
            picked: boolean;
            files?: string[] | undefined;
            documents?: string[] | undefined;
        }, {
            id: string;
            refs?: string[] | undefined;
            files?: string[] | undefined;
            heading?: string | undefined;
            picked?: boolean | undefined;
            documents?: string[] | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        epic: string | null;
        parts: {
            id: string;
            refs: string[];
            heading: string;
            picked: boolean;
            files?: string[] | undefined;
            documents?: string[] | undefined;
        }[];
        kehikko: {
            id: number;
            name: string;
            key?: string | undefined;
        } | null;
        project: string | null;
        projectId: string | null;
        show: {
            id: string;
            subject: string;
            at?: string | undefined;
            by?: string | undefined;
        } | null;
        tracker: {
            at: string | null;
            refreshing: boolean;
        };
        projectPath: string | null;
        theme: "light" | "dark";
        selection: string[];
        passage: {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                title: string;
                from: number | null;
                to: number | null;
            } | null;
        } | null;
        location: {
            path: string;
            intent: "show" | "comment";
            line: number;
            change: string;
            side: "new" | "old";
            at?: string | undefined;
            by?: string | undefined;
            commit?: string | undefined;
            endLine?: number | undefined;
        } | null;
        address: {
            url: string;
            intent: "show";
            at?: string | undefined;
            title?: string | undefined;
            by?: string | undefined;
            agent?: true | undefined;
        } | null;
        pinned: boolean;
        prompt: string | null;
        filters: Record<string, string | string[]>;
        containers: {
            module: string;
            selected: boolean;
            showing: {
                refs: string[];
                documents: {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        title: string;
                        from: number | null;
                        to: number | null;
                    } | null;
                }[];
            };
            folded?: boolean | undefined;
        }[];
        dispositions: {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            at: string | null;
            by: string | null;
            ref: string;
            target: string | null;
            note: string;
        }[];
        content: {
            at: string;
            epic: string | null;
            source: string;
        }[];
        scope?: "epic" | "kehikko" | "project" | "part" | "machine" | undefined;
    }, {
        epic?: string | null | undefined;
        parts?: {
            id: string;
            refs?: string[] | undefined;
            files?: string[] | undefined;
            heading?: string | undefined;
            picked?: boolean | undefined;
            documents?: string[] | undefined;
        }[] | undefined;
        kehikko?: {
            id: number;
            name: string;
            key?: string | undefined;
        } | null | undefined;
        project?: string | null | undefined;
        projectId?: string | null | undefined;
        show?: {
            id: string;
            subject: string;
            at?: string | undefined;
            by?: string | undefined;
        } | null | undefined;
        tracker?: {
            at?: string | null | undefined;
            refreshing?: boolean | undefined;
        } | undefined;
        projectPath?: string | null | undefined;
        scope?: unknown;
        theme?: "light" | "dark" | undefined;
        selection?: string[] | undefined;
        passage?: {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        } | null | undefined;
        location?: {
            path: string;
            line: number;
            change: string;
            side: "new" | "old";
            at?: string | undefined;
            intent?: unknown;
            by?: string | undefined;
            commit?: string | undefined;
            endLine?: number | undefined;
        } | null | undefined;
        address?: {
            url: string;
            at?: string | undefined;
            title?: string | undefined;
            intent?: unknown;
            by?: string | undefined;
            agent?: true | undefined;
        } | null | undefined;
        pinned?: boolean | undefined;
        prompt?: string | null | undefined;
        filters?: Record<string, string | string[]> | undefined;
        containers?: {
            module: string;
            selected?: boolean | undefined;
            folded?: boolean | undefined;
            showing?: {
                refs?: string[] | undefined;
                documents?: {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }[] | undefined;
            } | undefined;
        }[] | undefined;
        dispositions?: {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            by?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
        }[] | undefined;
        content?: {
            at: string;
            source: string;
            epic?: string | null | undefined;
        }[] | undefined;
    }>;
    /**
     * Whatever this module last asked the host to keep for it (`state.set`), verbatim and opaque. This
     * module's alone, which is why it is not in the context. `null` when the host keeps nothing for it.
     */
    state: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /**
     * 1.4.0. The methods this host will answer for THIS module: spoken by the protocol, kept by the
     * host and granted by the manifest's `declares.uses`. Absent from a host before 1.4.0, which is
     * "unknown", not "none": ask and be refused, as before. An empty list is a host that answers
     * nothing for this module. Order carries no meaning; names are not checked against `METHODS`.
     */
    answers: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /**
     * 1.4.0. Whether this host draws the module's declared header (`kehikot.header`) in its own menus.
     * Absent from a host before 1.4.0: unknown. `false` is a host that does not, so the module keeps
     * its own control. See docs/header.md.
     */
    header: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.hello";
    state: string | null;
    protocol: number;
    session: string;
    context: {
        epic: string | null;
        parts: {
            id: string;
            refs: string[];
            heading: string;
            picked: boolean;
            files?: string[] | undefined;
            documents?: string[] | undefined;
        }[];
        kehikko: {
            id: number;
            name: string;
            key?: string | undefined;
        } | null;
        project: string | null;
        projectId: string | null;
        show: {
            id: string;
            subject: string;
            at?: string | undefined;
            by?: string | undefined;
        } | null;
        tracker: {
            at: string | null;
            refreshing: boolean;
        };
        projectPath: string | null;
        theme: "light" | "dark";
        selection: string[];
        passage: {
            path: string;
            from: number | null;
            to: number | null;
            page: number | null;
            quoted: string;
            section: {
                title: string;
                from: number | null;
                to: number | null;
            } | null;
        } | null;
        location: {
            path: string;
            intent: "show" | "comment";
            line: number;
            change: string;
            side: "new" | "old";
            at?: string | undefined;
            by?: string | undefined;
            commit?: string | undefined;
            endLine?: number | undefined;
        } | null;
        address: {
            url: string;
            intent: "show";
            at?: string | undefined;
            title?: string | undefined;
            by?: string | undefined;
            agent?: true | undefined;
        } | null;
        pinned: boolean;
        prompt: string | null;
        filters: Record<string, string | string[]>;
        containers: {
            module: string;
            selected: boolean;
            showing: {
                refs: string[];
                documents: {
                    path: string;
                    from: number | null;
                    to: number | null;
                    page: number | null;
                    quoted: string;
                    section: {
                        title: string;
                        from: number | null;
                        to: number | null;
                    } | null;
                }[];
            };
            folded?: boolean | undefined;
        }[];
        dispositions: {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            at: string | null;
            by: string | null;
            ref: string;
            target: string | null;
            note: string;
        }[];
        content: {
            at: string;
            epic: string | null;
            source: string;
        }[];
        scope?: "epic" | "kehikko" | "project" | "part" | "machine" | undefined;
    };
    answers?: string[] | undefined;
    header?: boolean | undefined;
}, {
    type: "kehikot.hello";
    protocol: number;
    session: string;
    context: {
        epic?: string | null | undefined;
        parts?: {
            id: string;
            refs?: string[] | undefined;
            files?: string[] | undefined;
            heading?: string | undefined;
            picked?: boolean | undefined;
            documents?: string[] | undefined;
        }[] | undefined;
        kehikko?: {
            id: number;
            name: string;
            key?: string | undefined;
        } | null | undefined;
        project?: string | null | undefined;
        projectId?: string | null | undefined;
        show?: {
            id: string;
            subject: string;
            at?: string | undefined;
            by?: string | undefined;
        } | null | undefined;
        tracker?: {
            at?: string | null | undefined;
            refreshing?: boolean | undefined;
        } | undefined;
        projectPath?: string | null | undefined;
        scope?: unknown;
        theme?: "light" | "dark" | undefined;
        selection?: string[] | undefined;
        passage?: {
            path: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
            page?: number | null | undefined;
            quoted?: string | undefined;
            section?: {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            } | null | undefined;
        } | null | undefined;
        location?: {
            path: string;
            line: number;
            change: string;
            side: "new" | "old";
            at?: string | undefined;
            intent?: unknown;
            by?: string | undefined;
            commit?: string | undefined;
            endLine?: number | undefined;
        } | null | undefined;
        address?: {
            url: string;
            at?: string | undefined;
            title?: string | undefined;
            intent?: unknown;
            by?: string | undefined;
            agent?: true | undefined;
        } | null | undefined;
        pinned?: boolean | undefined;
        prompt?: string | null | undefined;
        filters?: Record<string, string | string[]> | undefined;
        containers?: {
            module: string;
            selected?: boolean | undefined;
            folded?: boolean | undefined;
            showing?: {
                refs?: string[] | undefined;
                documents?: {
                    path: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                    page?: number | null | undefined;
                    quoted?: string | undefined;
                    section?: {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    } | null | undefined;
                }[] | undefined;
            } | undefined;
        }[] | undefined;
        dispositions?: {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            by?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
        }[] | undefined;
        content?: {
            at: string;
            source: string;
            epic?: string | null | undefined;
        }[] | undefined;
    };
    state?: string | null | undefined;
    answers?: string[] | undefined;
    header?: boolean | undefined;
}>, z.ZodObject<{
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    scope: z.ZodCatch<z.ZodOptional<z.ZodEnum<["machine", "project", "epic", "part", "kehikko"]>>>;
    project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    projectId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    selection: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    passage: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        path: z.ZodString;
        page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        quoted: z.ZodDefault<z.ZodString>;
        section: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
            title: z.ZodString;
            from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
        }, "strip", z.ZodTypeAny, {
            title: string;
            from: number | null;
            to: number | null;
        }, {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        }>, {
            title: string;
            from: number | null;
            to: number | null;
        }, {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        }>, {
            title: string;
            from: number | null;
            to: number | null;
        }, {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        from: number | null;
        to: number | null;
        page: number | null;
        quoted: string;
        section: {
            title: string;
            from: number | null;
            to: number | null;
        } | null;
    }, {
        path: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
        page?: number | null | undefined;
        quoted?: string | undefined;
        section?: {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        } | null | undefined;
    }>, {
        path: string;
        from: number | null;
        to: number | null;
        page: number | null;
        quoted: string;
        section: {
            title: string;
            from: number | null;
            to: number | null;
        } | null;
    }, {
        path: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
        page?: number | null | undefined;
        quoted?: string | undefined;
        section?: {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        } | null | undefined;
    }>, {
        path: string;
        from: number | null;
        to: number | null;
        page: number | null;
        quoted: string;
        section: {
            title: string;
            from: number | null;
            to: number | null;
        } | null;
    }, {
        path: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
        page?: number | null | undefined;
        quoted?: string | undefined;
        section?: {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        } | null | undefined;
    }>>>;
    location: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodObject<{
        intent: z.ZodCatch<z.ZodEnum<["show", "comment"]>>;
        by: z.ZodOptional<z.ZodString>;
        at: z.ZodOptional<z.ZodString>;
        change: z.ZodString;
        path: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        line: z.ZodNumber;
        endLine: z.ZodOptional<z.ZodNumber>;
        side: z.ZodEnum<["new", "old"]>;
        commit: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        intent: "show" | "comment";
        line: number;
        change: string;
        side: "new" | "old";
        at?: string | undefined;
        by?: string | undefined;
        commit?: string | undefined;
        endLine?: number | undefined;
    }, {
        path: string;
        line: number;
        change: string;
        side: "new" | "old";
        at?: string | undefined;
        intent?: unknown;
        by?: string | undefined;
        commit?: string | undefined;
        endLine?: number | undefined;
    }>, {
        path: string;
        intent: "show" | "comment";
        line: number;
        change: string;
        side: "new" | "old";
        at?: string | undefined;
        by?: string | undefined;
        commit?: string | undefined;
        endLine?: number | undefined;
    }, {
        path: string;
        line: number;
        change: string;
        side: "new" | "old";
        at?: string | undefined;
        intent?: unknown;
        by?: string | undefined;
        commit?: string | undefined;
        endLine?: number | undefined;
    }>>>;
    address: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        url: z.ZodEffects<z.ZodString, string, string>;
        title: z.ZodOptional<z.ZodString>;
        intent: z.ZodCatch<z.ZodEnum<["show"]>>;
        by: z.ZodOptional<z.ZodString>;
        agent: z.ZodOptional<z.ZodLiteral<true>>;
        at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        intent: "show";
        at?: string | undefined;
        title?: string | undefined;
        by?: string | undefined;
        agent?: true | undefined;
    }, {
        url: string;
        at?: string | undefined;
        title?: string | undefined;
        intent?: unknown;
        by?: string | undefined;
        agent?: true | undefined;
    }>>>;
    show: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        subject: z.ZodString;
        id: z.ZodString;
    } & {
        by: z.ZodOptional<z.ZodString>;
        at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        subject: string;
        at?: string | undefined;
        by?: string | undefined;
    }, {
        id: string;
        subject: string;
        at?: string | undefined;
        by?: string | undefined;
    }>>>;
    pinned: z.ZodDefault<z.ZodBoolean>;
    prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        key: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
        key?: string | undefined;
    }, {
        id: number;
        name: string;
        key?: string | undefined;
    }>>>;
    filters: z.ZodDefault<z.ZodEffects<z.ZodRecord<z.ZodEffects<z.ZodString, string, string>, z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">, string[], string[]>]>>, Record<string, string | string[]>, Record<string, string | string[]>>>;
    containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
        module: z.ZodString;
        selected: z.ZodDefault<z.ZodBoolean>;
        folded: z.ZodOptional<z.ZodBoolean>;
        showing: z.ZodDefault<z.ZodObject<{
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            documents: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                path: z.ZodString;
                page: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                quoted: z.ZodDefault<z.ZodString>;
                section: z.ZodDefault<z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
                    title: z.ZodString;
                    from: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                    to: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
                }, "strip", z.ZodTypeAny, {
                    title: string;
                    from: number | null;
                    to: number | null;
                }, {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                }>, {
                    title: string;
                    from: number | null;
                    to: number | null;
                }, {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                }>, {
                    title: string;
                    from: number | null;
                    to: number | null;
                }, {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                }>>>;
            }, "strip", z.ZodTypeAny, {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    title: string;
                    from: number | null;
                    to: number | null;
                } | null;
            }, {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }>, {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    title: string;
                    from: number | null;
                    to: number | null;
                } | null;
            }, {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }>, {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    title: string;
                    from: number | null;
                    to: number | null;
                } | null;
            }, {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            refs: string[];
            documents: {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    title: string;
                    from: number | null;
                    to: number | null;
                } | null;
            }[];
        }, {
            refs?: string[] | undefined;
            documents?: {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        module: string;
        selected: boolean;
        showing: {
            refs: string[];
            documents: {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    title: string;
                    from: number | null;
                    to: number | null;
                } | null;
            }[];
        };
        folded?: boolean | undefined;
    }, {
        module: string;
        selected?: boolean | undefined;
        folded?: boolean | undefined;
        showing?: {
            refs?: string[] | undefined;
            documents?: {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }[] | undefined;
        } | undefined;
    }>, "many">>;
    dispositions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        ref: z.ZodString;
        value: z.ZodEnum<["done", "wont-do", "duplicate", "superseded"]>;
        target: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        note: z.ZodDefault<z.ZodString>;
        by: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        at: string | null;
        by: string | null;
        ref: string;
        target: string | null;
        note: string;
    }, {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        at?: string | null | undefined;
        by?: string | null | undefined;
        target?: string | null | undefined;
        note?: string | undefined;
    }>, "many">>;
    tracker: z.ZodDefault<z.ZodObject<{
        at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        refreshing: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        at: string | null;
        refreshing: boolean;
    }, {
        at?: string | null | undefined;
        refreshing?: boolean | undefined;
    }>>;
    content: z.ZodDefault<z.ZodArray<z.ZodObject<{
        source: z.ZodString;
        epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        at: string;
        epic: string | null;
        source: string;
    }, {
        at: string;
        source: string;
        epic?: string | null | undefined;
    }>, "many">>;
    parts: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        heading: z.ZodDefault<z.ZodString>;
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        picked: z.ZodDefault<z.ZodBoolean>;
        files: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
        documents: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        refs: string[];
        heading: string;
        picked: boolean;
        files?: string[] | undefined;
        documents?: string[] | undefined;
    }, {
        id: string;
        refs?: string[] | undefined;
        files?: string[] | undefined;
        heading?: string | undefined;
        picked?: boolean | undefined;
        documents?: string[] | undefined;
    }>, "many">>;
} & {
    type: z.ZodLiteral<"kehikot.context">;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.context";
    epic: string | null;
    parts: {
        id: string;
        refs: string[];
        heading: string;
        picked: boolean;
        files?: string[] | undefined;
        documents?: string[] | undefined;
    }[];
    kehikko: {
        id: number;
        name: string;
        key?: string | undefined;
    } | null;
    project: string | null;
    projectId: string | null;
    show: {
        id: string;
        subject: string;
        at?: string | undefined;
        by?: string | undefined;
    } | null;
    protocol: number;
    tracker: {
        at: string | null;
        refreshing: boolean;
    };
    projectPath: string | null;
    theme: "light" | "dark";
    selection: string[];
    passage: {
        path: string;
        from: number | null;
        to: number | null;
        page: number | null;
        quoted: string;
        section: {
            title: string;
            from: number | null;
            to: number | null;
        } | null;
    } | null;
    location: {
        path: string;
        intent: "show" | "comment";
        line: number;
        change: string;
        side: "new" | "old";
        at?: string | undefined;
        by?: string | undefined;
        commit?: string | undefined;
        endLine?: number | undefined;
    } | null;
    address: {
        url: string;
        intent: "show";
        at?: string | undefined;
        title?: string | undefined;
        by?: string | undefined;
        agent?: true | undefined;
    } | null;
    pinned: boolean;
    prompt: string | null;
    filters: Record<string, string | string[]>;
    containers: {
        module: string;
        selected: boolean;
        showing: {
            refs: string[];
            documents: {
                path: string;
                from: number | null;
                to: number | null;
                page: number | null;
                quoted: string;
                section: {
                    title: string;
                    from: number | null;
                    to: number | null;
                } | null;
            }[];
        };
        folded?: boolean | undefined;
    }[];
    dispositions: {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        at: string | null;
        by: string | null;
        ref: string;
        target: string | null;
        note: string;
    }[];
    content: {
        at: string;
        epic: string | null;
        source: string;
    }[];
    scope?: "epic" | "kehikko" | "project" | "part" | "machine" | undefined;
}, {
    type: "kehikot.context";
    protocol: number;
    epic?: string | null | undefined;
    parts?: {
        id: string;
        refs?: string[] | undefined;
        files?: string[] | undefined;
        heading?: string | undefined;
        picked?: boolean | undefined;
        documents?: string[] | undefined;
    }[] | undefined;
    kehikko?: {
        id: number;
        name: string;
        key?: string | undefined;
    } | null | undefined;
    project?: string | null | undefined;
    projectId?: string | null | undefined;
    show?: {
        id: string;
        subject: string;
        at?: string | undefined;
        by?: string | undefined;
    } | null | undefined;
    tracker?: {
        at?: string | null | undefined;
        refreshing?: boolean | undefined;
    } | undefined;
    projectPath?: string | null | undefined;
    scope?: unknown;
    theme?: "light" | "dark" | undefined;
    selection?: string[] | undefined;
    passage?: {
        path: string;
        from?: number | null | undefined;
        to?: number | null | undefined;
        page?: number | null | undefined;
        quoted?: string | undefined;
        section?: {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        } | null | undefined;
    } | null | undefined;
    location?: {
        path: string;
        line: number;
        change: string;
        side: "new" | "old";
        at?: string | undefined;
        intent?: unknown;
        by?: string | undefined;
        commit?: string | undefined;
        endLine?: number | undefined;
    } | null | undefined;
    address?: {
        url: string;
        at?: string | undefined;
        title?: string | undefined;
        intent?: unknown;
        by?: string | undefined;
        agent?: true | undefined;
    } | null | undefined;
    pinned?: boolean | undefined;
    prompt?: string | null | undefined;
    filters?: Record<string, string | string[]> | undefined;
    containers?: {
        module: string;
        selected?: boolean | undefined;
        folded?: boolean | undefined;
        showing?: {
            refs?: string[] | undefined;
            documents?: {
                path: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
                page?: number | null | undefined;
                quoted?: string | undefined;
                section?: {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                } | null | undefined;
            }[] | undefined;
        } | undefined;
    }[] | undefined;
    dispositions?: {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        at?: string | null | undefined;
        by?: string | null | undefined;
        target?: string | null | undefined;
        note?: string | undefined;
    }[] | undefined;
    content?: {
        at: string;
        source: string;
        epic?: string | null | undefined;
    }[] | undefined;
}>, z.ZodDiscriminatedUnion<"ok", [z.ZodObject<{
    type: z.ZodLiteral<"kehikot.response">;
    id: z.ZodString;
    ok: z.ZodLiteral<true>;
    /**
     * Whatever the method answers with, and deliberately untyped. See the note
     * at the top of `methods.ts`: a client that asserted a shape here would be
     * asserting something no host promised.
     */
    data: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.response";
    id: string;
    ok: true;
    data?: unknown;
}, {
    type: "kehikot.response";
    id: string;
    ok: true;
    data?: unknown;
}>, z.ZodObject<{
    declined: z.ZodCatch<z.ZodOptional<z.ZodEnum<["host-too-old"]>>>;
    since: z.ZodCatch<z.ZodOptional<z.ZodString>>;
    type: z.ZodLiteral<"kehikot.response">;
    id: z.ZodString;
    ok: z.ZodLiteral<false>;
    reason: z.ZodEnum<["unknown-module", "unknown-method", "failed"]>;
    /** The sentence for the person. Bounded because a refusal quotes the module's own text back at it. */
    error: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.response";
    id: string;
    error: string;
    reason: "failed" | "unknown-module" | "unknown-method";
    ok: false;
    since?: string | undefined;
    declined?: "host-too-old" | undefined;
}, {
    type: "kehikot.response";
    id: string;
    reason: "failed" | "unknown-module" | "unknown-method";
    ok: false;
    since?: unknown;
    error?: string | undefined;
    declined?: unknown;
}>]>, z.ZodEffects<z.ZodObject<{
    type: z.ZodLiteral<"kehikot.goto">;
    id: z.ZodString;
    ref: z.ZodOptional<z.ZodString>;
    step: z.ZodOptional<z.ZodNumber>;
    epic: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.goto";
    id: string;
    epic?: string | undefined;
    ref?: string | undefined;
    step?: number | undefined;
}, {
    type: "kehikot.goto";
    id: string;
    epic?: string | undefined;
    ref?: string | undefined;
    step?: number | undefined;
}>, {
    type: "kehikot.goto";
    id: string;
    epic?: string | undefined;
    ref?: string | undefined;
    step?: number | undefined;
}, {
    type: "kehikot.goto";
    id: string;
    epic?: string | undefined;
    ref?: string | undefined;
    step?: number | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"kehikot.event">;
    protocol: z.ZodNumber;
    /** The format, e.g. `kehikot.notifications@1`. Known to the host, or unsent. */
    extension: z.ZodString;
    /** Whatever that format says. Validated by the host before it left. */
    payload: z.ZodUnknown;
    /** The module that emitted it, named by the host from its own registry. */
    from: z.ZodString;
    /**
     * When the host accepted it, ISO 8601. A receiver ordering by arrival would
     * be ordering by its own scheduler instead.
     */
    at: z.ZodString;
    /**
     * The kehikko it happened on, or null. Compare with `context.kehikko` to tell near from far; a
     * receiver that KEEPS an event files it under the kehikko's `key` when there is one, not its `id`.
     */
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
        key: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
        key?: string | undefined;
    }, {
        id: number;
        name: string;
        key?: string | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    at: string;
    type: "kehikot.event";
    kehikko: {
        id: number;
        name: string;
        key?: string | undefined;
    } | null;
    protocol: number;
    from: string;
    extension: string;
    payload?: unknown;
}, {
    at: string;
    type: "kehikot.event";
    protocol: number;
    from: string;
    extension: string;
    kehikko?: {
        id: number;
        name: string;
        key?: string | undefined;
    } | null | undefined;
    payload?: unknown;
}>, z.ZodObject<{
    type: z.ZodLiteral<"kehikot.clear">;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.clear";
    protocol: number;
}, {
    type: "kehikot.clear";
    protocol: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"kehikot.refresh">;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.refresh";
    protocol: number;
}, {
    type: "kehikot.refresh";
    protocol: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"kehikot.press">;
    protocol: z.ZodNumber;
    id: z.ZodString;
    item: z.ZodString;
    value: z.ZodOptional<z.ZodUnion<[z.ZodEffects<z.ZodString, string, string>, z.ZodBoolean]>>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.press";
    id: string;
    protocol: number;
    item: string;
    value?: string | boolean | undefined;
}, {
    type: "kehikot.press";
    id: string;
    protocol: number;
    item: string;
    value?: string | boolean | undefined;
}>]>;
export type HostMessage = z.infer<typeof hostMessageSchema>;
export declare const moduleMessageSchema: z.ZodUnion<[z.ZodObject<{
    type: z.ZodLiteral<"kehikot.ready">;
    id: z.ZodString;
    protocol: z.ZodDefault<z.ZodNumber>;
    /** The build that served this page, as printed into it. A host compares it with the server's now. */
    build: z.ZodCatch<z.ZodOptional<z.ZodObject<{
        version: z.ZodString;
        commit: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        started: z.ZodString;
        protocol: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version: string;
        commit: string | null;
        started: string;
        protocol: string;
    }, {
        version: string;
        started: string;
        protocol: string;
        commit?: string | null | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.ready";
    id: string;
    protocol: number;
    build?: {
        version: string;
        commit: string | null;
        started: string;
        protocol: string;
    } | undefined;
}, {
    type: "kehikot.ready";
    id: string;
    build?: unknown;
    protocol?: number | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"kehikot.request">;
    id: z.ZodString;
    /**
     * Bounded but not held to the list of known methods. A host may refuse one it does not have, with
     * `unknown-method`.
     */
    method: z.ZodString;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    params: Record<string, unknown>;
    type: "kehikot.request";
    id: string;
    method: string;
}, {
    type: "kehikot.request";
    id: string;
    method: string;
    params?: Record<string, unknown> | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"kehikot.resize">;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.resize";
    height: number;
}, {
    type: "kehikot.resize";
    height: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"kehikot.went">;
    id: z.ZodString;
    found: z.ZodBoolean;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.went";
    id: string;
    why: string;
    found: boolean;
}, {
    type: "kehikot.went";
    id: string;
    found: boolean;
    why?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"kehikot.filters">;
    groups: z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        id: z.ZodEffects<z.ZodString, string, string>;
        label: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<["choice", "text", "toggles"]>>;
        options: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodEffects<z.ZodString, string, string>;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            label: string;
        }, {
            id: string;
            label: string;
        }>, "many">>;
        fallback: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strip", z.ZodTypeAny, {
        options: {
            id: string;
            label: string;
        }[];
        id: string;
        label: string;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }, {
        id: string;
        label: string;
        options?: {
            id: string;
            label: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }>, {
        options: {
            id: string;
            label: string;
        }[];
        id: string;
        label: string;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }, {
        id: string;
        label: string;
        options?: {
            id: string;
            label: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }>, {
        options: {
            id: string;
            label: string;
        }[];
        id: string;
        label: string;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }, {
        id: string;
        label: string;
        options?: {
            id: string;
            label: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }>, "many">, {
        options: {
            id: string;
            label: string;
        }[];
        id: string;
        label: string;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[], {
        id: string;
        label: string;
        options?: {
            id: string;
            label: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[]>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.filters";
    groups: {
        options: {
            id: string;
            label: string;
        }[];
        id: string;
        label: string;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[];
}, {
    type: "kehikot.filters";
    groups: {
        id: string;
        label: string;
        options?: {
            id: string;
            label: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[];
}>, z.ZodObject<{
    type: z.ZodLiteral<"kehikot.clearable">;
    /** The words on the control, or `null` to take the control away. */
    label: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.clearable";
    label: string | null;
}, {
    type: "kehikot.clearable";
    label?: string | null | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"kehikot.refreshable">;
    /** Whether there is anything to read again right now. `false` withdraws the control. */
    can: z.ZodDefault<z.ZodBoolean>;
    /** When this module's material was last read, as the MODULE knows it. */
    at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /** Whether a read is in flight this second. */
    busy: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    at: string | null;
    type: "kehikot.refreshable";
    busy: boolean;
    can: boolean;
}, {
    type: "kehikot.refreshable";
    at?: string | null | undefined;
    busy?: boolean | undefined;
    can?: boolean | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"kehikot.header">;
    items: z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
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
        icon: z.ZodOptional<z.ZodString>;
        shortcut: z.ZodOptional<z.ZodString>;
        group: z.ZodOptional<z.ZodString>;
        agents: z.ZodDefault<z.ZodBoolean>;
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
        icon: z.ZodOptional<z.ZodString>;
        shortcut: z.ZodOptional<z.ZodString>;
        group: z.ZodOptional<z.ZodString>;
        agents: z.ZodDefault<z.ZodBoolean>;
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
}, "strip", z.ZodTypeAny, {
    type: "kehikot.header";
    items: ({
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
    })[];
}, {
    type: "kehikot.header";
    items: ({
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
    })[];
}>, z.ZodObject<{
    type: z.ZodLiteral<"kehikot.pressed">;
    id: z.ZodString;
    ok: z.ZodBoolean;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.pressed";
    id: string;
    why: string;
    ok: boolean;
}, {
    type: "kehikot.pressed";
    id: string;
    ok: boolean;
    why?: string | undefined;
}>]>;
export type ModuleMessage = z.infer<typeof moduleMessageSchema>;
export type WireMessage = HostMessage | ModuleMessage;
export type Hello = z.infer<typeof helloSchema>;
export type ContextMessage = z.infer<typeof contextMessageSchema>;
export type Response = z.infer<typeof responseSchema>;
export type Goto = z.infer<typeof gotoSchema>;
export type ModuleEvent = z.infer<typeof eventSchema>;
export type Ready = z.infer<typeof readySchema>;
export type Request = z.infer<typeof requestSchema>;
export type Resize = z.infer<typeof resizeSchema>;
export type Went = z.infer<typeof wentSchema>;
/**
 * Is this worth parsing at all? The cheap first filter: true when the value is an object whose
 * `type` starts `kehikot.`. Says nothing about validity or the sender.
 */
export declare function looksLikeWireMessage(value: unknown): value is {
    type: string;
};
