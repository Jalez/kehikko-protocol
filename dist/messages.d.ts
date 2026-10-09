import { z } from 'zod';
/**
 * Module → host. What a module currently offers to be narrowed by. The whole offer, every time: it
 * replaces, never merges, and an empty `groups` takes the control away. Sent whenever the answer
 * changes, including its words. Two groups cannot share an id.
 */
export declare const filtersSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.filters">, z.ZodLiteral<string>]>, "kehikot.filters", string>;
    groups: z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        id: z.ZodEffects<z.ZodString, string, string>;
        label: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<["choice", "text", "toggles"]>>;
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
    }>, "many">, {
        label: string;
        id: string;
        options: {
            label: string;
            id: string;
        }[];
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[], {
        label: string;
        id: string;
        options?: {
            label: string;
            id: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[]>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.filters";
    groups: {
        label: string;
        id: string;
        options: {
            label: string;
            id: string;
        }[];
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[];
}, {
    type: string;
    groups: {
        label: string;
        id: string;
        options?: {
            label: string;
            id: string;
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
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.clearable">, z.ZodLiteral<string>]>, "kehikot.clearable", string>;
    /** The words on the control, or `null` to take the control away. */
    label: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    label: string | null;
    type: "kehikot.clearable";
}, {
    type: string;
    label?: string | null | undefined;
}>;
export type Clearable = z.infer<typeof clearableSchema>;
/**
 * Host → module. The press, relayed: "clear what you are showing". Empty apart from `type` and
 * `protocol`: no list of what to delete, no filter choice, no correlation id, and no answer.
 */
export declare const clearSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.clear">, z.ZodLiteral<string>]>, "kehikot.clear", string>;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.clear";
    protocol: number;
}, {
    type: string;
    protocol: number;
}>;
export type Clear = z.infer<typeof clearSchema>;
/**
 * Module → host. What a module says about being refreshed. The whole state, every time, re-announced
 * whenever any of the three changes. `at` is an ISO 8601 instant with an offset, or null for "I
 * cannot say" (the host then draws no time). `busy` keeps the control and says a read is in flight.
 */
export declare const refreshableSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.refreshable">, z.ZodLiteral<string>]>, "kehikot.refreshable", string>;
    /** Whether there is anything to read again right now. `false` withdraws the control. */
    can: z.ZodDefault<z.ZodBoolean>;
    /** When this module's material was last read, as the MODULE knows it. */
    at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /** Whether a read is in flight this second. */
    busy: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    at: string | null;
    type: "kehikot.refreshable";
    can: boolean;
    busy: boolean;
}, {
    type: string;
    at?: string | null | undefined;
    can?: boolean | undefined;
    busy?: boolean | undefined;
}>;
export type Refreshable = z.infer<typeof refreshableSchema>;
/**
 * Host → module. The press, relayed: "read your material again". Carries no reason, no interval and
 * no correlation id; what comes back is a new `kehikot.refreshable` (`busy`, then a new `at`).
 */
export declare const refreshSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.refresh">, z.ZodLiteral<string>]>, "kehikot.refresh", string>;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.refresh";
    protocol: number;
}, {
    type: string;
    protocol: number;
}>;
export type Refresh = z.infer<typeof refreshSchema>;
/**
 * Host → module. Hello: the whole of what a module is given without asking, sent on every frame
 * load. `protocol` is what the two sides settled on when the manifest was read. `session` names
 * this conversation; it is not a credential and must never become one.
 */
export declare const helloSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.hello">, z.ZodLiteral<string>]>, "kehikot.hello", string>;
    protocol: z.ZodNumber;
    session: z.ZodString;
    context: z.ZodObject<{
        epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
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
                from: number | null;
                to: number | null;
                title: string;
            }, {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            }>, {
                from: number | null;
                to: number | null;
                title: string;
            }, {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            }>, {
                from: number | null;
                to: number | null;
                title: string;
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
                from: number | null;
                to: number | null;
                title: string;
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
                from: number | null;
                to: number | null;
                title: string;
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
                from: number | null;
                to: number | null;
                title: string;
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
        pinned: z.ZodDefault<z.ZodBoolean>;
        prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            id: z.ZodNumber;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: number;
            name: string;
        }, {
            id: number;
            name: string;
        }>>>;
        filters: z.ZodDefault<z.ZodEffects<z.ZodRecord<z.ZodEffects<z.ZodString, string, string>, z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">, string[], string[]>]>>, Record<string, string | string[]>, Record<string, string | string[]>>>;
        containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
            module: z.ZodEffects<z.ZodString, string, string>;
            selected: z.ZodDefault<z.ZodBoolean>;
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
                        from: number | null;
                        to: number | null;
                        title: string;
                    }, {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    }>, {
                        from: number | null;
                        to: number | null;
                        title: string;
                    }, {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    }>, {
                        from: number | null;
                        to: number | null;
                        title: string;
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
                        from: number | null;
                        to: number | null;
                        title: string;
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
                        from: number | null;
                        to: number | null;
                        title: string;
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
                        from: number | null;
                        to: number | null;
                        title: string;
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
                        from: number | null;
                        to: number | null;
                        title: string;
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
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }[];
            };
        }, {
            module: string;
            selected?: boolean | undefined;
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
            at: string | null;
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            target: string | null;
            note: string;
            by: string | null;
        }, {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
            by?: string | null | undefined;
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
            source: z.ZodEffects<z.ZodString, string, string>;
            epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            at: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            at: string;
            source: string;
            epic: string | null;
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
        }, "strip", z.ZodTypeAny, {
            id: string;
            heading: string;
            refs: string[];
            picked: boolean;
            files?: string[] | undefined;
        }, {
            id: string;
            files?: string[] | undefined;
            heading?: string | undefined;
            refs?: string[] | undefined;
            picked?: boolean | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
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
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }[];
            };
        }[];
        epic: string | null;
        tracker: {
            at: string | null;
            refreshing: boolean;
        };
        project: string | null;
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
                from: number | null;
                to: number | null;
                title: string;
            } | null;
        } | null;
        pinned: boolean;
        prompt: string | null;
        kehikko: {
            id: number;
            name: string;
        } | null;
        filters: Record<string, string | string[]>;
        dispositions: {
            at: string | null;
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            target: string | null;
            note: string;
            by: string | null;
        }[];
        content: {
            at: string;
            source: string;
            epic: string | null;
        }[];
        parts: {
            id: string;
            heading: string;
            refs: string[];
            picked: boolean;
            files?: string[] | undefined;
        }[];
    }, {
        containers?: {
            module: string;
            selected?: boolean | undefined;
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
        epic?: string | null | undefined;
        tracker?: {
            at?: string | null | undefined;
            refreshing?: boolean | undefined;
        } | undefined;
        project?: string | null | undefined;
        projectPath?: string | null | undefined;
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
        pinned?: boolean | undefined;
        prompt?: string | null | undefined;
        kehikko?: {
            id: number;
            name: string;
        } | null | undefined;
        filters?: Record<string, string | string[]> | undefined;
        dispositions?: {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
            by?: string | null | undefined;
        }[] | undefined;
        content?: {
            at: string;
            source: string;
            epic?: string | null | undefined;
        }[] | undefined;
        parts?: {
            id: string;
            files?: string[] | undefined;
            heading?: string | undefined;
            refs?: string[] | undefined;
            picked?: boolean | undefined;
        }[] | undefined;
    }>;
    /**
     * Whatever this module last asked the host to keep for it (`state.set`), verbatim and opaque. This
     * module's alone, which is why it is not in the context. `null` when the host keeps nothing for it.
     */
    state: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.hello";
    context: {
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
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }[];
            };
        }[];
        epic: string | null;
        tracker: {
            at: string | null;
            refreshing: boolean;
        };
        project: string | null;
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
                from: number | null;
                to: number | null;
                title: string;
            } | null;
        } | null;
        pinned: boolean;
        prompt: string | null;
        kehikko: {
            id: number;
            name: string;
        } | null;
        filters: Record<string, string | string[]>;
        dispositions: {
            at: string | null;
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            target: string | null;
            note: string;
            by: string | null;
        }[];
        content: {
            at: string;
            source: string;
            epic: string | null;
        }[];
        parts: {
            id: string;
            heading: string;
            refs: string[];
            picked: boolean;
            files?: string[] | undefined;
        }[];
    };
    state: string | null;
    protocol: number;
    session: string;
}, {
    type: string;
    context: {
        containers?: {
            module: string;
            selected?: boolean | undefined;
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
        epic?: string | null | undefined;
        tracker?: {
            at?: string | null | undefined;
            refreshing?: boolean | undefined;
        } | undefined;
        project?: string | null | undefined;
        projectPath?: string | null | undefined;
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
        pinned?: boolean | undefined;
        prompt?: string | null | undefined;
        kehikko?: {
            id: number;
            name: string;
        } | null | undefined;
        filters?: Record<string, string | string[]> | undefined;
        dispositions?: {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
            by?: string | null | undefined;
        }[] | undefined;
        content?: {
            at: string;
            source: string;
            epic?: string | null | undefined;
        }[] | undefined;
        parts?: {
            id: string;
            files?: string[] | undefined;
            heading?: string | undefined;
            refs?: string[] | undefined;
            picked?: boolean | undefined;
        }[] | undefined;
    };
    protocol: number;
    session: string;
    state?: string | null | undefined;
}>;
/**
 * Host → module. Which epic is open now: the `contextSchema` fields flat, not wrapped in `context`.
 * Sent when the reader switches epics and when the module's own tab is shown. Only epic-scoped
 * modes are told; a `global` mode is not.
 */
export declare const contextMessageSchema: z.ZodObject<{
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
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
            from: number | null;
            to: number | null;
            title: string;
        }, {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        }>, {
            from: number | null;
            to: number | null;
            title: string;
        }, {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        }>, {
            from: number | null;
            to: number | null;
            title: string;
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
            from: number | null;
            to: number | null;
            title: string;
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
            from: number | null;
            to: number | null;
            title: string;
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
            from: number | null;
            to: number | null;
            title: string;
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
    pinned: z.ZodDefault<z.ZodBoolean>;
    prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
    }, {
        id: number;
        name: string;
    }>>>;
    filters: z.ZodDefault<z.ZodEffects<z.ZodRecord<z.ZodEffects<z.ZodString, string, string>, z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">, string[], string[]>]>>, Record<string, string | string[]>, Record<string, string | string[]>>>;
    containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
        module: z.ZodEffects<z.ZodString, string, string>;
        selected: z.ZodDefault<z.ZodBoolean>;
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
                    from: number | null;
                    to: number | null;
                    title: string;
                }, {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                }>, {
                    from: number | null;
                    to: number | null;
                    title: string;
                }, {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                }>, {
                    from: number | null;
                    to: number | null;
                    title: string;
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
                    from: number | null;
                    to: number | null;
                    title: string;
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
                    from: number | null;
                    to: number | null;
                    title: string;
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
                    from: number | null;
                    to: number | null;
                    title: string;
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
                    from: number | null;
                    to: number | null;
                    title: string;
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
                    from: number | null;
                    to: number | null;
                    title: string;
                } | null;
            }[];
        };
    }, {
        module: string;
        selected?: boolean | undefined;
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
        at: string | null;
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        target: string | null;
        note: string;
        by: string | null;
    }, {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        at?: string | null | undefined;
        target?: string | null | undefined;
        note?: string | undefined;
        by?: string | null | undefined;
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
        source: z.ZodEffects<z.ZodString, string, string>;
        epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        at: string;
        source: string;
        epic: string | null;
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
    }, "strip", z.ZodTypeAny, {
        id: string;
        heading: string;
        refs: string[];
        picked: boolean;
        files?: string[] | undefined;
    }, {
        id: string;
        files?: string[] | undefined;
        heading?: string | undefined;
        refs?: string[] | undefined;
        picked?: boolean | undefined;
    }>, "many">>;
} & {
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.context">, z.ZodLiteral<string>]>, "kehikot.context", string>;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
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
                    from: number | null;
                    to: number | null;
                    title: string;
                } | null;
            }[];
        };
    }[];
    type: "kehikot.context";
    epic: string | null;
    tracker: {
        at: string | null;
        refreshing: boolean;
    };
    project: string | null;
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
            from: number | null;
            to: number | null;
            title: string;
        } | null;
    } | null;
    pinned: boolean;
    prompt: string | null;
    kehikko: {
        id: number;
        name: string;
    } | null;
    filters: Record<string, string | string[]>;
    dispositions: {
        at: string | null;
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        target: string | null;
        note: string;
        by: string | null;
    }[];
    content: {
        at: string;
        source: string;
        epic: string | null;
    }[];
    parts: {
        id: string;
        heading: string;
        refs: string[];
        picked: boolean;
        files?: string[] | undefined;
    }[];
    protocol: number;
}, {
    type: string;
    protocol: number;
    containers?: {
        module: string;
        selected?: boolean | undefined;
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
    epic?: string | null | undefined;
    tracker?: {
        at?: string | null | undefined;
        refreshing?: boolean | undefined;
    } | undefined;
    project?: string | null | undefined;
    projectPath?: string | null | undefined;
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
    pinned?: boolean | undefined;
    prompt?: string | null | undefined;
    kehikko?: {
        id: number;
        name: string;
    } | null | undefined;
    filters?: Record<string, string | string[]> | undefined;
    dispositions?: {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        at?: string | null | undefined;
        target?: string | null | undefined;
        note?: string | undefined;
        by?: string | null | undefined;
    }[] | undefined;
    content?: {
        at: string;
        source: string;
        epic?: string | null | undefined;
    }[] | undefined;
    parts?: {
        id: string;
        files?: string[] | undefined;
        heading?: string | undefined;
        refs?: string[] | undefined;
        picked?: boolean | undefined;
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
 * Host → module. The answer to exactly one request: data or a refusal, two shapes under one type.
 * A refusal always carries both `reason`, a word from `responseFailureReasons` for the program, and
 * `error`, a sentence for the person writing the module.
 */
export declare const responseSchema: z.ZodDiscriminatedUnion<"ok", [z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.response">, z.ZodLiteral<string>]>, "kehikot.response", string>;
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
    type: string;
    id: string;
    ok: true;
    data?: unknown;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.response">, z.ZodLiteral<string>]>, "kehikot.response", string>;
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
}, {
    type: string;
    id: string;
    reason: "failed" | "unknown-module" | "unknown-method";
    ok: false;
    error?: string | undefined;
}>]>;
/**
 * Host → module. Go to a reference. Names a `ref` or a 1-based `step`; an epic alone is refused,
 * and `epic` means "switch first". `id` is required and pairs it with its `went`; see `wentSchema`.
 * Mirrors the `view.goto` method, which does accept an epic alone.
 */
export declare const gotoSchema: z.ZodEffects<z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.goto">, z.ZodLiteral<string>]>, "kehikot.goto", string>;
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
    type: string;
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
    type: string;
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
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.event">, z.ZodLiteral<string>]>, "kehikot.event", string>;
    protocol: z.ZodNumber;
    /** The format, e.g. `kehikot.notifications@1`. Known to the host, or unsent. */
    extension: z.ZodEffects<z.ZodString, string, string>;
    /** Whatever that format says. Validated by the host before it left. */
    payload: z.ZodUnknown;
    /** The module that emitted it, named by the host from its own registry. */
    from: z.ZodEffects<z.ZodString, string, string>;
    /**
     * When the host accepted it, ISO 8601. A receiver ordering by arrival would
     * be ordering by its own scheduler instead.
     */
    at: z.ZodString;
    /** The kehikko it happened on, or null. Compare with `context.kehikko` to tell near from far. */
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
    }, {
        id: number;
        name: string;
    }>>>;
}, "strip", z.ZodTypeAny, {
    at: string;
    from: string;
    type: "kehikot.event";
    extension: string;
    kehikko: {
        id: number;
        name: string;
    } | null;
    protocol: number;
    payload?: unknown;
}, {
    at: string;
    from: string;
    type: string;
    extension: string;
    protocol: number;
    kehikko?: {
        id: number;
        name: string;
    } | null | undefined;
    payload?: unknown;
}>;
/**
 * Module → host. "I heard you." `id` is the module's own, so a host can confirm the frame holds the
 * program whose manifest it read; a mismatch is a fault to report, not how the host identifies it.
 * A host waits a bounded time, counted from the greeting, then says the module did not answer.
 */
export declare const readySchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.ready">, z.ZodLiteral<string>]>, "kehikot.ready", string>;
    id: z.ZodEffects<z.ZodString, string, string>;
    protocol: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.ready";
    id: string;
    protocol: number;
}, {
    type: string;
    id: string;
    protocol?: number | undefined;
}>;
/** One question, with an id the answer will carry back. */
export declare const requestSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.request">, z.ZodLiteral<string>]>, "kehikot.request", string>;
    id: z.ZodString;
    /**
     * Bounded but not held to the list of known methods. A host may refuse one it does not have, with
     * `unknown-method`.
     */
    method: z.ZodString;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.request";
    id: string;
    method: string;
    params: Record<string, unknown>;
}, {
    type: string;
    id: string;
    method: string;
    params?: Record<string, unknown> | undefined;
}>;
/**
 * Module → host. How tall the module would like to be. No id and no answer: the host clamps it
 * (`clampHeight`) and may ignore it entirely.
 */
export declare const resizeSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.resize">, z.ZodLiteral<string>]>, "kehikot.resize", string>;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.resize";
    height: number;
}, {
    type: string;
    height: number;
}>;
/**
 * Module → host. "I went", or "there is nothing here by that name": one per `goto`, carrying its
 * `id`, sent only once the walk has settled. `found` is what the host acts on; `why` is for the
 * person. A host must time out, and a timeout means `found: false`: fall back to the link.
 */
export declare const wentSchema: z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.went">, z.ZodLiteral<string>]>, "kehikot.went", string>;
    id: z.ZodString;
    found: z.ZodBoolean;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.went";
    id: string;
    why: string;
    found: boolean;
}, {
    type: string;
    id: string;
    found: boolean;
    why?: string | undefined;
}>;
/**
 * Every message a host sends. A plain union, not a `discriminatedUnion`, because `responseSchema`
 * is itself a union on a different key and cannot be an option of one.
 */
export declare const hostMessageSchema: z.ZodUnion<[z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.hello">, z.ZodLiteral<string>]>, "kehikot.hello", string>;
    protocol: z.ZodNumber;
    session: z.ZodString;
    context: z.ZodObject<{
        epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
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
                from: number | null;
                to: number | null;
                title: string;
            }, {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            }>, {
                from: number | null;
                to: number | null;
                title: string;
            }, {
                title: string;
                from?: number | null | undefined;
                to?: number | null | undefined;
            }>, {
                from: number | null;
                to: number | null;
                title: string;
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
                from: number | null;
                to: number | null;
                title: string;
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
                from: number | null;
                to: number | null;
                title: string;
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
                from: number | null;
                to: number | null;
                title: string;
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
        pinned: z.ZodDefault<z.ZodBoolean>;
        prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            id: z.ZodNumber;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: number;
            name: string;
        }, {
            id: number;
            name: string;
        }>>>;
        filters: z.ZodDefault<z.ZodEffects<z.ZodRecord<z.ZodEffects<z.ZodString, string, string>, z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">, string[], string[]>]>>, Record<string, string | string[]>, Record<string, string | string[]>>>;
        containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
            module: z.ZodEffects<z.ZodString, string, string>;
            selected: z.ZodDefault<z.ZodBoolean>;
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
                        from: number | null;
                        to: number | null;
                        title: string;
                    }, {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    }>, {
                        from: number | null;
                        to: number | null;
                        title: string;
                    }, {
                        title: string;
                        from?: number | null | undefined;
                        to?: number | null | undefined;
                    }>, {
                        from: number | null;
                        to: number | null;
                        title: string;
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
                        from: number | null;
                        to: number | null;
                        title: string;
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
                        from: number | null;
                        to: number | null;
                        title: string;
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
                        from: number | null;
                        to: number | null;
                        title: string;
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
                        from: number | null;
                        to: number | null;
                        title: string;
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
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }[];
            };
        }, {
            module: string;
            selected?: boolean | undefined;
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
            at: string | null;
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            target: string | null;
            note: string;
            by: string | null;
        }, {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
            by?: string | null | undefined;
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
            source: z.ZodEffects<z.ZodString, string, string>;
            epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            at: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            at: string;
            source: string;
            epic: string | null;
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
        }, "strip", z.ZodTypeAny, {
            id: string;
            heading: string;
            refs: string[];
            picked: boolean;
            files?: string[] | undefined;
        }, {
            id: string;
            files?: string[] | undefined;
            heading?: string | undefined;
            refs?: string[] | undefined;
            picked?: boolean | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
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
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }[];
            };
        }[];
        epic: string | null;
        tracker: {
            at: string | null;
            refreshing: boolean;
        };
        project: string | null;
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
                from: number | null;
                to: number | null;
                title: string;
            } | null;
        } | null;
        pinned: boolean;
        prompt: string | null;
        kehikko: {
            id: number;
            name: string;
        } | null;
        filters: Record<string, string | string[]>;
        dispositions: {
            at: string | null;
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            target: string | null;
            note: string;
            by: string | null;
        }[];
        content: {
            at: string;
            source: string;
            epic: string | null;
        }[];
        parts: {
            id: string;
            heading: string;
            refs: string[];
            picked: boolean;
            files?: string[] | undefined;
        }[];
    }, {
        containers?: {
            module: string;
            selected?: boolean | undefined;
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
        epic?: string | null | undefined;
        tracker?: {
            at?: string | null | undefined;
            refreshing?: boolean | undefined;
        } | undefined;
        project?: string | null | undefined;
        projectPath?: string | null | undefined;
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
        pinned?: boolean | undefined;
        prompt?: string | null | undefined;
        kehikko?: {
            id: number;
            name: string;
        } | null | undefined;
        filters?: Record<string, string | string[]> | undefined;
        dispositions?: {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
            by?: string | null | undefined;
        }[] | undefined;
        content?: {
            at: string;
            source: string;
            epic?: string | null | undefined;
        }[] | undefined;
        parts?: {
            id: string;
            files?: string[] | undefined;
            heading?: string | undefined;
            refs?: string[] | undefined;
            picked?: boolean | undefined;
        }[] | undefined;
    }>;
    /**
     * Whatever this module last asked the host to keep for it (`state.set`), verbatim and opaque. This
     * module's alone, which is why it is not in the context. `null` when the host keeps nothing for it.
     */
    state: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.hello";
    context: {
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
                        from: number | null;
                        to: number | null;
                        title: string;
                    } | null;
                }[];
            };
        }[];
        epic: string | null;
        tracker: {
            at: string | null;
            refreshing: boolean;
        };
        project: string | null;
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
                from: number | null;
                to: number | null;
                title: string;
            } | null;
        } | null;
        pinned: boolean;
        prompt: string | null;
        kehikko: {
            id: number;
            name: string;
        } | null;
        filters: Record<string, string | string[]>;
        dispositions: {
            at: string | null;
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            target: string | null;
            note: string;
            by: string | null;
        }[];
        content: {
            at: string;
            source: string;
            epic: string | null;
        }[];
        parts: {
            id: string;
            heading: string;
            refs: string[];
            picked: boolean;
            files?: string[] | undefined;
        }[];
    };
    state: string | null;
    protocol: number;
    session: string;
}, {
    type: string;
    context: {
        containers?: {
            module: string;
            selected?: boolean | undefined;
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
        epic?: string | null | undefined;
        tracker?: {
            at?: string | null | undefined;
            refreshing?: boolean | undefined;
        } | undefined;
        project?: string | null | undefined;
        projectPath?: string | null | undefined;
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
        pinned?: boolean | undefined;
        prompt?: string | null | undefined;
        kehikko?: {
            id: number;
            name: string;
        } | null | undefined;
        filters?: Record<string, string | string[]> | undefined;
        dispositions?: {
            value: "done" | "wont-do" | "duplicate" | "superseded";
            ref: string;
            at?: string | null | undefined;
            target?: string | null | undefined;
            note?: string | undefined;
            by?: string | null | undefined;
        }[] | undefined;
        content?: {
            at: string;
            source: string;
            epic?: string | null | undefined;
        }[] | undefined;
        parts?: {
            id: string;
            files?: string[] | undefined;
            heading?: string | undefined;
            refs?: string[] | undefined;
            picked?: boolean | undefined;
        }[] | undefined;
    };
    protocol: number;
    session: string;
    state?: string | null | undefined;
}>, z.ZodObject<{
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
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
            from: number | null;
            to: number | null;
            title: string;
        }, {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        }>, {
            from: number | null;
            to: number | null;
            title: string;
        }, {
            title: string;
            from?: number | null | undefined;
            to?: number | null | undefined;
        }>, {
            from: number | null;
            to: number | null;
            title: string;
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
            from: number | null;
            to: number | null;
            title: string;
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
            from: number | null;
            to: number | null;
            title: string;
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
            from: number | null;
            to: number | null;
            title: string;
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
    pinned: z.ZodDefault<z.ZodBoolean>;
    prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
    }, {
        id: number;
        name: string;
    }>>>;
    filters: z.ZodDefault<z.ZodEffects<z.ZodRecord<z.ZodEffects<z.ZodString, string, string>, z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">, string[], string[]>]>>, Record<string, string | string[]>, Record<string, string | string[]>>>;
    containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
        module: z.ZodEffects<z.ZodString, string, string>;
        selected: z.ZodDefault<z.ZodBoolean>;
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
                    from: number | null;
                    to: number | null;
                    title: string;
                }, {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                }>, {
                    from: number | null;
                    to: number | null;
                    title: string;
                }, {
                    title: string;
                    from?: number | null | undefined;
                    to?: number | null | undefined;
                }>, {
                    from: number | null;
                    to: number | null;
                    title: string;
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
                    from: number | null;
                    to: number | null;
                    title: string;
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
                    from: number | null;
                    to: number | null;
                    title: string;
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
                    from: number | null;
                    to: number | null;
                    title: string;
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
                    from: number | null;
                    to: number | null;
                    title: string;
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
                    from: number | null;
                    to: number | null;
                    title: string;
                } | null;
            }[];
        };
    }, {
        module: string;
        selected?: boolean | undefined;
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
        at: string | null;
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        target: string | null;
        note: string;
        by: string | null;
    }, {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        at?: string | null | undefined;
        target?: string | null | undefined;
        note?: string | undefined;
        by?: string | null | undefined;
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
        source: z.ZodEffects<z.ZodString, string, string>;
        epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        at: string;
        source: string;
        epic: string | null;
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
    }, "strip", z.ZodTypeAny, {
        id: string;
        heading: string;
        refs: string[];
        picked: boolean;
        files?: string[] | undefined;
    }, {
        id: string;
        files?: string[] | undefined;
        heading?: string | undefined;
        refs?: string[] | undefined;
        picked?: boolean | undefined;
    }>, "many">>;
} & {
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.context">, z.ZodLiteral<string>]>, "kehikot.context", string>;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
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
                    from: number | null;
                    to: number | null;
                    title: string;
                } | null;
            }[];
        };
    }[];
    type: "kehikot.context";
    epic: string | null;
    tracker: {
        at: string | null;
        refreshing: boolean;
    };
    project: string | null;
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
            from: number | null;
            to: number | null;
            title: string;
        } | null;
    } | null;
    pinned: boolean;
    prompt: string | null;
    kehikko: {
        id: number;
        name: string;
    } | null;
    filters: Record<string, string | string[]>;
    dispositions: {
        at: string | null;
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        target: string | null;
        note: string;
        by: string | null;
    }[];
    content: {
        at: string;
        source: string;
        epic: string | null;
    }[];
    parts: {
        id: string;
        heading: string;
        refs: string[];
        picked: boolean;
        files?: string[] | undefined;
    }[];
    protocol: number;
}, {
    type: string;
    protocol: number;
    containers?: {
        module: string;
        selected?: boolean | undefined;
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
    epic?: string | null | undefined;
    tracker?: {
        at?: string | null | undefined;
        refreshing?: boolean | undefined;
    } | undefined;
    project?: string | null | undefined;
    projectPath?: string | null | undefined;
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
    pinned?: boolean | undefined;
    prompt?: string | null | undefined;
    kehikko?: {
        id: number;
        name: string;
    } | null | undefined;
    filters?: Record<string, string | string[]> | undefined;
    dispositions?: {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        at?: string | null | undefined;
        target?: string | null | undefined;
        note?: string | undefined;
        by?: string | null | undefined;
    }[] | undefined;
    content?: {
        at: string;
        source: string;
        epic?: string | null | undefined;
    }[] | undefined;
    parts?: {
        id: string;
        files?: string[] | undefined;
        heading?: string | undefined;
        refs?: string[] | undefined;
        picked?: boolean | undefined;
    }[] | undefined;
}>, z.ZodDiscriminatedUnion<"ok", [z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.response">, z.ZodLiteral<string>]>, "kehikot.response", string>;
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
    type: string;
    id: string;
    ok: true;
    data?: unknown;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.response">, z.ZodLiteral<string>]>, "kehikot.response", string>;
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
}, {
    type: string;
    id: string;
    reason: "failed" | "unknown-module" | "unknown-method";
    ok: false;
    error?: string | undefined;
}>]>, z.ZodEffects<z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.goto">, z.ZodLiteral<string>]>, "kehikot.goto", string>;
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
    type: string;
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
    type: string;
    id: string;
    epic?: string | undefined;
    ref?: string | undefined;
    step?: number | undefined;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.event">, z.ZodLiteral<string>]>, "kehikot.event", string>;
    protocol: z.ZodNumber;
    /** The format, e.g. `kehikot.notifications@1`. Known to the host, or unsent. */
    extension: z.ZodEffects<z.ZodString, string, string>;
    /** Whatever that format says. Validated by the host before it left. */
    payload: z.ZodUnknown;
    /** The module that emitted it, named by the host from its own registry. */
    from: z.ZodEffects<z.ZodString, string, string>;
    /**
     * When the host accepted it, ISO 8601. A receiver ordering by arrival would
     * be ordering by its own scheduler instead.
     */
    at: z.ZodString;
    /** The kehikko it happened on, or null. Compare with `context.kehikko` to tell near from far. */
    kehikko: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        id: z.ZodNumber;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        name: string;
    }, {
        id: number;
        name: string;
    }>>>;
}, "strip", z.ZodTypeAny, {
    at: string;
    from: string;
    type: "kehikot.event";
    extension: string;
    kehikko: {
        id: number;
        name: string;
    } | null;
    protocol: number;
    payload?: unknown;
}, {
    at: string;
    from: string;
    type: string;
    extension: string;
    protocol: number;
    kehikko?: {
        id: number;
        name: string;
    } | null | undefined;
    payload?: unknown;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.clear">, z.ZodLiteral<string>]>, "kehikot.clear", string>;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.clear";
    protocol: number;
}, {
    type: string;
    protocol: number;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.refresh">, z.ZodLiteral<string>]>, "kehikot.refresh", string>;
    protocol: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.refresh";
    protocol: number;
}, {
    type: string;
    protocol: number;
}>]>;
export type HostMessage = z.infer<typeof hostMessageSchema>;
export declare const moduleMessageSchema: z.ZodUnion<[z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.ready">, z.ZodLiteral<string>]>, "kehikot.ready", string>;
    id: z.ZodEffects<z.ZodString, string, string>;
    protocol: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.ready";
    id: string;
    protocol: number;
}, {
    type: string;
    id: string;
    protocol?: number | undefined;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.request">, z.ZodLiteral<string>]>, "kehikot.request", string>;
    id: z.ZodString;
    /**
     * Bounded but not held to the list of known methods. A host may refuse one it does not have, with
     * `unknown-method`.
     */
    method: z.ZodString;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.request";
    id: string;
    method: string;
    params: Record<string, unknown>;
}, {
    type: string;
    id: string;
    method: string;
    params?: Record<string, unknown> | undefined;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.resize">, z.ZodLiteral<string>]>, "kehikot.resize", string>;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.resize";
    height: number;
}, {
    type: string;
    height: number;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.went">, z.ZodLiteral<string>]>, "kehikot.went", string>;
    id: z.ZodString;
    found: z.ZodBoolean;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.went";
    id: string;
    why: string;
    found: boolean;
}, {
    type: string;
    id: string;
    found: boolean;
    why?: string | undefined;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.filters">, z.ZodLiteral<string>]>, "kehikot.filters", string>;
    groups: z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        id: z.ZodEffects<z.ZodString, string, string>;
        label: z.ZodString;
        kind: z.ZodOptional<z.ZodEnum<["choice", "text", "toggles"]>>;
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
    }>, "many">, {
        label: string;
        id: string;
        options: {
            label: string;
            id: string;
        }[];
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[], {
        label: string;
        id: string;
        options?: {
            label: string;
            id: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[]>;
}, "strip", z.ZodTypeAny, {
    type: "kehikot.filters";
    groups: {
        label: string;
        id: string;
        options: {
            label: string;
            id: string;
        }[];
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[];
}, {
    type: string;
    groups: {
        label: string;
        id: string;
        options?: {
            label: string;
            id: string;
        }[] | undefined;
        kind?: "choice" | "text" | "toggles" | undefined;
        fallback?: string | undefined;
    }[];
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.clearable">, z.ZodLiteral<string>]>, "kehikot.clearable", string>;
    /** The words on the control, or `null` to take the control away. */
    label: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    label: string | null;
    type: "kehikot.clearable";
}, {
    type: string;
    label?: string | null | undefined;
}>, z.ZodObject<{
    type: z.ZodEffects<z.ZodUnion<[z.ZodLiteral<"kehikot.refreshable">, z.ZodLiteral<string>]>, "kehikot.refreshable", string>;
    /** Whether there is anything to read again right now. `false` withdraws the control. */
    can: z.ZodDefault<z.ZodBoolean>;
    /** When this module's material was last read, as the MODULE knows it. */
    at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /** Whether a read is in flight this second. */
    busy: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    at: string | null;
    type: "kehikot.refreshable";
    can: boolean;
    busy: boolean;
}, {
    type: string;
    at?: string | null | undefined;
    can?: boolean | undefined;
    busy?: boolean | undefined;
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
 * `type` starts `kehikot.` or the older `roadmap.`. Says nothing about validity or the sender.
 */
export declare function looksLikeWireMessage(value: unknown): value is {
    type: string;
};
