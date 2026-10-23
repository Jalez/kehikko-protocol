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
}>;
export type Showing = z.infer<typeof showingSchema>;
/**
 * One container on the kehikko: which module, whether it is picked out, and what it is showing.
 * Every container is listed, with `showing` empty for one that has said nothing. The host may fold
 * the current `passage` and `selection` into their setter's row. `module` is the module's id.
 */
export declare const containerSchema: z.ZodObject<{
    module: z.ZodString;
    /** Whether this container is picked out as a target on this kehikko. The host's own fact. */
    selected: z.ZodDefault<z.ZodBoolean>;
    /**
     * Whether this container is folded to its header. The host's own fact, changed by a person's
     * press, by `view.fold` and by an agent at the host's door. Absent from a host that does not say,
     * which a reader takes as not folded. Optional, not defaulted, so a host that builds this list by
     * hand is not made to say it.
     */
    folded: z.ZodOptional<z.ZodBoolean>;
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
}>;
export type CanvasContainer = z.infer<typeof containerSchema>;
/**
 * 2.9.0. How much of the project a context is about: `epic`, the one epic named in `epic` (or none
 * open), or `project`, every epic of the project at once — the host's "All epics". Two words,
 * closed: a module that meets another reads it as `epic`.
 */
export declare const CONTEXT_SCOPES: readonly ["epic", "project"];
export type ContextScope = (typeof CONTEXT_SCOPES)[number];
/**
 * What a module is told about where the reader is standing: the host's own knowledge of the open
 * epic and project. `epic` is null when none is open. Fields are null or empty rather than absent,
 * so a module can move into "none".
 */
export declare const contextSchema: z.ZodObject<{
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /**
     * 2.9.0. Whether this context is about one epic (`epic`) or the whole project (`project`, the
     * person chose "All epics"). Absent means `epic`: a host older than 2.9.0 never says it, and
     * `scopeOf` reads it that way. With `project`, `epic` is null and `parts` is empty — which is
     * NOT "no epic open": a module that declares `scopes: ['epic', 'project']` shows every epic of
     * the project, and one that does not is covered by the host with a sentence saying it works on
     * one epic at a time. Optional, not defaulted, so a parsed older context stays as it was sent.
     */
    scope: z.ZodOptional<z.ZodEnum<["epic", "project"]>>;
    /** What the project is called: the name a module puts on screen, not a path. */
    project: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /**
     * Where the project is: an absolute folder path on the host's machine, which this package cannot
     * check. Null when the host has no folder to point at: a module may name the project and must not
     * pretend to open it. A host should fill this and `project` in one place, from one project.
     */
    projectPath: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    /**
     * 2.1.0. Which project this is, for good: the id the host keeps in `<projectPath>/.kehikot/project.json`
     * (see `PROJECT_ID`), the same after the folder is renamed or moved. Null from a host older than
     * 2.1.0 or with no project. A module keys MACHINE-level state by it, falling back to `projectPath`
     * (`projectKey`); state kept inside the project needs neither. Sent with `project` and `projectPath`.
     */
    projectId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
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
    /**
     * 2.13.0. Where in a change's code somebody is pointing, and why (`show`, or `comment` to start a
     * review comment there); see `location.ts`. One per kehikko, set with `location.set` and relayed to
     * every container. The host clears it when the selection no longer has its change
     * (`locationStands`). Null when nobody is pointing, which is also what an older host sends.
     */
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
    /**
     * 2.16.0. The last web address handed to this kehikko to be shown, or null; see `address.ts`. Set
     * with `address.open` (or by the host for a person or an agent) and relayed to every container,
     * stamped with who asked and when. A module that shows pages (`REACTS_TO.address`) opens it when
     * its `at` is new (`addressIsNews`); everybody else may ignore it. Null from an older host.
     */
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
     * an event's `kehikko` to tell near from far. Anything written down per kehikko is written under
     * its `key`, not its `id`: see `kehikkoSchema`.
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
        module: z.ZodString;
        /** Whether this container is picked out as a target on this kehikko. The host's own fact. */
        selected: z.ZodDefault<z.ZodBoolean>;
        /**
         * Whether this container is folded to its header. The host's own fact, changed by a person's
         * press, by `view.fold` and by an agent at the host's door. Absent from a host that does not say,
         * which a reader takes as not folded. Optional, not defaulted, so a host that builds this list by
         * hand is not made to say it.
         */
        folded: z.ZodOptional<z.ZodBoolean>;
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
    /**
     * The parts of the open epic, and which the person has picked out; see `parts.ts`. `[]` when the
     * epic has none. No module sets the pick; the list belongs to the epic, not a kehikko, and a module
     * asks for an edit of it with `parts.set`. With parts picked a module shows what `anchorInFocus` admits.
     */
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
    scope?: "epic" | "project" | undefined;
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
    tracker?: {
        at?: string | null | undefined;
        refreshing?: boolean | undefined;
    } | undefined;
    projectPath?: string | null | undefined;
    scope?: "epic" | "project" | undefined;
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
export type ModuleContext = z.infer<typeof contextSchema>;
/**
 * 2.9.0. The scope a context is about, `epic` when it does not say (a host older than 2.9.0) or says
 * a word this package does not know. Takes anything with a `scope`, so a page can pass what it holds.
 */
export declare function scopeOf(context: {
    scope?: unknown;
} | null | undefined): ContextScope;
