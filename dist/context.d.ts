import { z } from 'zod';
/**
 * What a closed reference came to: the four answers people give for why it closed. Open to
 * extension: a module meeting a value it does not know treats the ref as closed for a reason it cannot name.
 */
export declare const DISPOSITIONS: readonly ["done", "wont-do", "duplicate", "superseded"];
export type DispositionValue = (typeof DISPOSITIONS)[number];
/**
 * One person's verdict on one reference, as the host holds it. Marks only: what a tracker says is
 * derived by `deriveDisposition` in `facets.ts`, where a mark wins. `target` is the other ref for
 * `duplicate` (of it) and `superseded` (by it), else null; `by` (who) and `at` (ISO time) are the host's.
 */
export declare const dispositionSchema: z.ZodObject<{
    ref: z.ZodString;
    value: z.ZodEnum<["done", "wont-do", "duplicate", "superseded"]>;
    target: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    note: z.ZodDefault<z.ZodString>;
    by: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    at: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    value: "done" | "wont-do" | "duplicate" | "superseded";
    at: string | null;
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
}>;
export type Disposition = z.infer<typeof dispositionSchema>;
/**
 * What one container says it is showing. Module → host with `showing.set`, re-sent when the answer
 * changes, including to nothing. The host cannot check it and relays it unchanged, attributed to
 * the container that said it; a consumer treats it as that container's word.
 */
export declare const showingSchema: z.ZodObject<{
    /** The references this container is showing. The same strings `selection` carries. */
    refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** The places in documents it is showing, at whatever precision it has. `quoted` should be empty. */
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
}>;
export type Showing = z.infer<typeof showingSchema>;
/**
 * One container on the kehikko: which module, whether it is picked out, and what it is showing.
 * Every container is listed, with `showing` empty for one that has said nothing. The host may fold
 * the current `passage` and `selection` into their setter's row. `module` is the module's id.
 */
export declare const containerSchema: z.ZodObject<{
    module: z.ZodEffects<z.ZodString, string, string>;
    /** Whether this container is picked out as a target on this kehikko. The host's own fact. */
    selected: z.ZodDefault<z.ZodBoolean>;
    /** What it says it is showing, or nothing. Never absent, for the reason `filters` is `{}` and not missing. */
    showing: z.ZodDefault<z.ZodObject<{
        /** The references this container is showing. The same strings `selection` carries. */
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The places in documents it is showing, at whatever precision it has. `quoted` should be empty. */
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
}>;
export type CanvasContainer = z.infer<typeof containerSchema>;
/**
 * What a module is told about where the reader is standing: the host's own knowledge of the open
 * epic and project. `epic` is null when none is open. Fields are null or empty rather than absent,
 * so a module can move into "none".
 */
export declare const contextSchema: z.ZodObject<{
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /** What the project is called: the name a module puts on screen, not a path. */
    project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /**
     * Where the project is: an absolute folder path on the host's machine, which this package cannot
     * check. Null when the host has no folder to point at: a module may name the project and must not
     * pretend to open it. A host should fill this and `project` in one place, from one project.
     */
    projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    theme: z.ZodDefault<z.ZodEnum<["light", "dark"]>>;
    /**
     * The refs the person has picked out; `[]` when nothing is selected. A module asks the host to set
     * it with `selection.set` and the host tells everyone. Refs only: what kind each is does not travel.
     */
    selection: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /**
     * Where in a document the reader is pointing. Null when no document is open, which is also what
     * a host that has never heard of passages sends.
     */
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
    /**
     * Whether this module has been pinned. `true` means it keeps what it was last told, and further
     * changes to this canvas do not reach it until this goes false. A context is still sent when the
     * pin changes, in both directions.
     */
    pinned: z.ZodDefault<z.ZodBoolean>;
    /**
     * What this canvas has been told to tell this module: one string the host composes from everything
     * aimed at it, for a module declaring `prompt` in its manifest. Null when there is no prompt for it.
     */
    prompt: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /**
     * Which kehikko (canvas) this context is about. Null when the host has no canvases; compare with
     * an event's `kehikko` to tell near from far.
     */
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
    /**
     * Which of the filters this module offered are currently chosen for it, per container. `{}` when
     * nothing is narrowed. For an id it does not recognise a module uses its own default for that
     * group and says nothing: the first choice it receives may predate what it now offers.
     */
    filters: z.ZodDefault<z.ZodEffects<z.ZodRecord<z.ZodEffects<z.ZodString, string, string>, z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">, string[], string[]>]>>, Record<string, string | string[]>, Record<string, string | string[]>>>;
    /**
     * Every container on this kehikko, broadcast whole to every frame; see `containerSchema`. `[]` when
     * the host says nothing about containers. When none is picked out, everything is in front of the person;
     * when some are, only the union of what those show, and a consumer lets the person turn that off.
     */
    containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
        module: z.ZodEffects<z.ZodString, string, string>;
        /** Whether this container is picked out as a target on this kehikko. The host's own fact. */
        selected: z.ZodDefault<z.ZodBoolean>;
        /** What it says it is showing, or nothing. Never absent, for the reason `filters` is `{}` and not missing. */
        showing: z.ZodDefault<z.ZodObject<{
            /** The references this container is showing. The same strings `selection` carries. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The places in documents it is showing, at whatever precision it has. `quoted` should be empty. */
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
    /**
     * Why the open project's closed references closed, where a person has said. Per project, not per
     * canvas; only people's marks travel (see `dispositionSchema`). `[]` when nobody has said anything.
     * A module declaring `reacts: ['dispositions']` moves when it changes.
     */
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
    /**
     * When the open project's shared tracker reading last changed, and whether a read is in flight: the
     * signal, not the reading (rows stay behind `tracker.get`). Per project. A module declaring
     * `reacts: ['tracker']` re-asks `tracker.get` when `at` changes and draws busy while `refreshing`.
     */
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
    /**
     * What has changed in the material kept for the open project's epics: the last change per source
     * and epic. The signal, not the material. Per project; a module declaring `reacts: ['content']`
     * re-reads what it shows when the entries for it move.
     */
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
    /**
     * The parts of the open epic, and which the person has picked out; see `parts.ts`. `[]` when
     * nothing is narrowed. No module sets it; it belongs to the epic, not a kehikko. With parts picked
     * a module shows what `refInFocus`, `partInFocus` and `fileInFocus` admit, and says it has narrowed.
     */
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
        value: "done" | "wont-do" | "duplicate" | "superseded";
        at: string | null;
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
export type ModuleContext = z.infer<typeof contextSchema>;
