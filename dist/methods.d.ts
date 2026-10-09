import { z } from 'zod';
/**
 * The questions a module can ask, by name and by shape: capabilities, methods, each method's
 * params, and a few result schemas. No answering is here: no dispatch table, no handlers. A
 * response's content is `unknown` unless `methodResults` describes it.
 * Design notes: docs/methods.md.
 */
/**
 * The areas of a host's material these methods touch, each with the sentence a person reads. Names
 * for a kind of question, not permissions: nothing grants one, nothing checks one, and a module
 * that declares none and calls everything is treated exactly like one that declared honestly.
 */
export declare const CAPABILITIES: {
    readonly 'epics:read': "Read which epics exist, and their titles, ledes and projects.";
    readonly 'steps:read': "Read an epic's steps: their titles, bodies and the references they name.";
    readonly 'live:read': "Read what the last refresh found in the trackers for an epic.";
    readonly 'stage:report': "Say where work is — working, in review, or blocked — into the host's database.";
    readonly 'events:emit': "Send an extension payload: a notification, a report of its own calls.";
    /** Asks the host to MOVE; reads and writes nothing. See `view.goto`. */
    readonly 'view:navigate': "Ask the host to show a particular epic, step or reference. The host decides.";
    /**
     * Say which references the person has picked out. A SHARED write: the selection goes into the
     * context every framed module receives.
     */
    readonly 'selection:set': "Say which references the person has picked out. Every module on the canvas is told.";
    /**
     * Say where in a document the person is pointing. A SHARED write like `selection:set`: a passage
     * names a file on the host's machine, a place in it and a paragraph of what was there, put in
     * front of every other pane.
     */
    readonly 'passage:set': "Say where in a document the person is pointing, and quote it. Every module on the canvas is told.";
    /**
     * Ask for its own container's filters to be moved. Reaches this container's own narrowing and
     * nothing else: not another container's, not the canvas.
     */
    readonly 'filters:set': "Move this container’s own filters, so it can show you something you asked to see.";
    /**
     * Say what this container is showing. A SHARED write: it goes into the `containers` list in the
     * context every framed module receives, attributed to this container. It moves nobody; a consumer
     * decides for itself what to do with it.
     */
    readonly 'showing:set': string;
    /**
     * Ask the person to choose one of their projects, and be told which. The module cannot enumerate,
     * name a project it was not given, filter the menu or open the picker unseen: it receives ONE
     * answer to ONE question, in a dialog the host drew.
     */
    readonly 'projects:pick': "Ask you to choose one of your projects, and be told where it is. The host draws the picker.";
    /** Keep a little state of its own, and get it back next time. To the host it is a string it never reads. */
    readonly 'state:keep': "Keep a small amount of its own state between sessions. The host does not read it.";
    /**
     * Say why a reference closed: done, won't do, a duplicate, superseded. A write into the project,
     * read back by every module in `context.dispositions`. A verdict a person reaches: a module sets
     * it on a press, not on its own judgment.
     */
    readonly 'disposition:set': "Mark why a closed reference closed — done, won't do, duplicate or superseded — for every module to read.";
    /**
     * Read what the trackers last said about the project's refs, from the reading the host keeps for
     * everybody. See `tracker.get` and `tracker.ts`. Replaces `live:read`; the module gets rows and
     * never a credential.
     */
    readonly 'trackers:read': "Read what GitHub and GitLab last said about the project’s issues, merge requests and pull requests.";
    /**
     * Ask the host to read the trackers again. Apart from `trackers:read` because it spends the
     * person's rate limit, on behalf of every module on the canvas.
     */
    readonly 'trackers:refresh': "Ask the host to read GitHub and GitLab again, for every module on the canvas.";
    /**
     * Say that the material this module keeps changed. See `content.changed` and `content.ts`. Writes
     * nothing, but moves every other container on the canvas to re-read.
     */
    readonly 'content:report': "Tell every module on the canvas that the material this one keeps has changed, so they read it again.";
};
export type Capability = keyof typeof CAPABILITIES;
export declare const CAPABILITY_NAMES: Capability[];
/**
 * Every method, and the capability it belongs to. A plain object: never index it with a string out
 * of a frame (`constructor` answers with something inherited). Use `own()` from `./ids.js`, or a
 * `Map`.
 */
export declare const METHODS: {
    readonly 'epics.list': "epics:read";
    readonly 'epic.get': "epics:read";
    readonly 'steps.list': "steps:read";
    readonly 'live.get': "live:read";
    readonly 'stage.report': "stage:report";
    readonly 'events.emit': "events:emit";
    readonly 'view.goto': "view:navigate";
    readonly 'selection.set': "selection:set";
    readonly 'passage.set': "passage:set";
    readonly 'filters.set': "filters:set";
    readonly 'showing.set': "showing:set";
    readonly 'projects.pick': "projects:pick";
    readonly 'state.set': "state:keep";
    readonly 'disposition.set': "disposition:set";
    readonly 'tracker.get': "trackers:read";
    readonly 'tracker.refresh': "trackers:refresh";
    readonly 'content.changed': "content:report";
};
export type Method = keyof typeof METHODS;
export declare const METHOD_NAMES: Method[];
/**
 * The three stages a module may report: the three no tracker can see. Every other stage is read
 * from a tracker and is not a module's to write.
 */
export declare const REPORTED_STAGES: readonly ["working", "in-review", "blocked"];
export type ReportedStage = (typeof REPORTED_STAGES)[number];
export declare const methodParams: {
    readonly 'epics.list': z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    readonly 'epic.get': z.ZodObject<{
        epic: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        epic: string;
    }, {
        epic: string;
    }>;
    readonly 'steps.list': z.ZodObject<{
        epic: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        epic: string;
    }, {
        epic: string;
    }>;
    /**
     * The old door to tracker state: the epic's refs in four bags. A host answers it as a view over
     * the same shared reading `tracker.get` serves. New code asks `tracker.get`.
     */
    readonly 'live.get': z.ZodObject<{
        epic: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        epic: string;
    }, {
        epic: string;
    }>;
    /**
     * Ask the host to show something; answered with `navigationResult`. The same triple
     * `kehikot.goto` carries. Unlike `gotoSchema`, an epic alone is allowed; a call that names none
     * of epic, step or ref is refused.
     */
    readonly 'view.goto': z.ZodEffects<z.ZodObject<{
        epic: z.ZodOptional<z.ZodString>;
        step: z.ZodOptional<z.ZodNumber>;
        /**
         * Bounded at `GOTO_REF` rather than `REF`, and REFUSED rather than clipped: a clipped ref is
         * a DIFFERENT ref.
         */
        ref: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        epic?: string | undefined;
        ref?: string | undefined;
        step?: number | undefined;
    }, {
        epic?: string | undefined;
        ref?: string | undefined;
        step?: number | undefined;
    }>, {
        epic?: string | undefined;
        ref?: string | undefined;
        step?: number | undefined;
    }, {
        epic?: string | undefined;
        ref?: string | undefined;
        step?: number | undefined;
    }>;
    /**
     * Say which references the person has picked out. Refs only, never their kinds: the host relays
     * this into the context every module receives, and a module that needs the kind asks `live.get`.
     * An empty list is a real call and clears the selection.
     */
    readonly 'selection.set': z.ZodObject<{
        refs: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        refs: string[];
    }, {
        refs: string[];
    }>;
    /**
     * Say where in a document the person is pointing; the host relays it into the context every
     * framed module receives. `passage` is required and nullable: `null` is a real call that clears
     * it. The shape is `passageSchema` from `wire.ts`, shared with the context.
     */
    readonly 'passage.set': z.ZodObject<{
        passage: z.ZodNullable<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
        }>>;
    }, "strip", z.ZodTypeAny, {
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
    }, {
        passage: {
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
        } | null;
    }>;
    /**
     * Ask the host to put this container's filters somewhere. A request: the host may refuse for any reason. A
     * whole choice replacing what is there, in the shape of `context.filters`; `{}` puts every group back to its
     * fallback. The host drops groups the module is not offering, and the result is what it settled on.
     */
    readonly 'filters.set': z.ZodObject<{
        filters: z.ZodEffects<z.ZodRecord<z.ZodEffects<z.ZodString, string, string>, z.ZodUnion<[z.ZodString, z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">, string[], string[]>]>>, Record<string, string | string[]>, Record<string, string | string[]>>;
    }, "strip", z.ZodTypeAny, {
        filters: Record<string, string | string[]>;
    }, {
        filters: Record<string, string | string[]>;
    }>;
    /**
     * Say what this container is showing; the host holds it against this module's container and
     * relays it in `context.containers`. Both lists are required every time, with no default: whole
     * replacement, never a merge. `{ refs: [], documents: [] }` is the real call for showing nothing.
     */
    readonly 'showing.set': z.ZodObject<{
        refs: z.ZodArray<z.ZodString, "many">;
        documents: z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
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
        }>, "many">;
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
        refs: string[];
        documents: {
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
        }[];
    }>;
    /**
     * Ask the person to choose one of their projects; answered with `projectPickResult`. Takes nothing: the call
     * is `{}` and the host composes the dialog. The answer waits on a person, so pass a deadline with `within`
     * (see `PERSON_ANSWERS_WITHIN_MS`) instead of the default `ANSWER_WITHIN_MS`.
     */
    readonly 'projects.pick': z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
    /**
     * Keep a small amount of this module's own state: an OPAQUE string the host does not parse and
     * checks only for length. Per module, not per pane. It comes back in the greeting, before the
     * module's first render.
     */
    readonly 'state.set': z.ZodObject<{
        state: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        state: string;
    }, {
        state: string;
    }>;
    readonly 'stage.report': z.ZodObject<{
        ref: z.ZodString;
        stage: z.ZodEnum<["working", "in-review", "blocked"]>;
        /**
         * A line a person reads beside the report. REFUSED rather than clipped when it is too long:
         * what is stored is what was sent.
         */
        note: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        ref: string;
        note: string;
        stage: "blocked" | "working" | "in-review";
    }, {
        ref: string;
        stage: "blocked" | "working" | "in-review";
        note?: string | undefined;
    }>;
    /**
     * Mark one reference, or take a mark back with `value: null`. `target` is the other ref for
     * `duplicate` and `superseded`, and refused for `done` and `wont-do`. `by` and `at` are not here:
     * who pressed and when are the host's own facts.
     */
    readonly 'disposition.set': z.ZodEffects<z.ZodObject<{
        ref: z.ZodString;
        value: z.ZodNullable<z.ZodEnum<["done", "wont-do", "duplicate", "superseded"]>>;
        target: z.ZodOptional<z.ZodString>;
        note: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value: "done" | "wont-do" | "duplicate" | "superseded" | null;
        ref: string;
        note: string;
        target?: string | undefined;
    }, {
        value: "done" | "wont-do" | "duplicate" | "superseded" | null;
        ref: string;
        target?: string | undefined;
        note?: string | undefined;
    }>, {
        value: "done" | "wont-do" | "duplicate" | "superseded" | null;
        ref: string;
        note: string;
        target?: string | undefined;
    }, {
        value: "done" | "wont-do" | "duplicate" | "superseded" | null;
        ref: string;
        target?: string | undefined;
        note?: string | undefined;
    }>;
    /**
     * What the trackers last said, from the host's shared reading; answered at once with
     * `trackerReadingResult` (see `tracker.ts`), where a ref not read yet comes back in `missing`.
     * `detail: 'detail'` costs a call per ref at the tracker, so it is only accepted with `refs`.
     */
    readonly 'tracker.get': z.ZodEffects<z.ZodEffects<z.ZodObject<{
        detail: z.ZodDefault<z.ZodEnum<["summary", "detail"]>>;
        refs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        epic: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodLiteral<true>>;
    }, "strip", z.ZodTypeAny, {
        detail: "summary" | "detail";
        epic?: string | undefined;
        refs?: string[] | undefined;
        project?: true | undefined;
    }, {
        epic?: string | undefined;
        detail?: "summary" | "detail" | undefined;
        refs?: string[] | undefined;
        project?: true | undefined;
    }>, {
        detail: "summary" | "detail";
        epic?: string | undefined;
        refs?: string[] | undefined;
        project?: true | undefined;
    }, {
        epic?: string | undefined;
        detail?: "summary" | "detail" | undefined;
        refs?: string[] | undefined;
        project?: true | undefined;
    }>, {
        detail: "summary" | "detail";
        epic?: string | undefined;
        refs?: string[] | undefined;
        project?: true | undefined;
    }, {
        epic?: string | undefined;
        detail?: "summary" | "detail" | undefined;
        refs?: string[] | undefined;
        project?: true | undefined;
    }>;
    /**
     * Read the trackers again, for these refs or this epic or the whole project, and answer when the read lands.
     * Every module on the canvas is told through `context.tracker`. See `trackerRefreshResult`. A host joins a
     * refresh to one already running rather than starting a second.
     */
    readonly 'tracker.refresh': z.ZodEffects<z.ZodObject<{
        refs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        epic: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodLiteral<true>>;
    }, "strip", z.ZodTypeAny, {
        epic?: string | undefined;
        refs?: string[] | undefined;
        project?: true | undefined;
    }, {
        epic?: string | undefined;
        refs?: string[] | undefined;
        project?: true | undefined;
    }>, {
        epic?: string | undefined;
        refs?: string[] | undefined;
        project?: true | undefined;
    }, {
        epic?: string | undefined;
        refs?: string[] | undefined;
        project?: true | undefined;
    }>;
    /**
     * This module's own material changed, for this epic or, with no epic, for no one epic in particular. The host
     * tells every container in the project through `context.content`, the caller's included. Whose material and
     * `at` are the host's facts, not params. Report AFTER the write has landed.
     */
    readonly 'content.changed': z.ZodObject<{
        epic: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        epic?: string | undefined;
    }, {
        epic?: string | undefined;
    }>;
    readonly 'events.emit': z.ZodObject<{
        extension: z.ZodEffects<z.ZodString, string, string>;
        /**
         * Unknown here, and checked against the named extension's own schema by whoever routes it; see
         * `./extensions.js`. So this method can carry an extension this version of the package has
         * never heard of.
         */
        payload: z.ZodUnknown;
    }, "strip", z.ZodTypeAny, {
        extension: string;
        payload?: unknown;
    }, {
        extension: string;
        payload?: unknown;
    }>;
};
/** The params one method takes, as a caller must construct them. */
export type MethodParams<M extends Method> = z.input<(typeof methodParams)[M]>;
/**
 * What became of a `view.goto`; all three are `ok: true`. `moved`: the reader is now looking at it. `declined`:
 * the host will not, right now. `no-such-target`: no such epic, step or ref. `navigationResult.epic` is where
 * the reader ended up, null when the host did not move or moved within the open epic.
 */
export declare const NAVIGATION_OUTCOMES: readonly ["moved", "declined", "no-such-target"];
export type NavigationOutcome = (typeof NAVIGATION_OUTCOMES)[number];
export declare const navigationResult: z.ZodObject<{
    outcome: z.ZodEnum<["moved", "declined", "no-such-target"]>;
    epic: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    epic: string | null;
    outcome: "declined" | "moved" | "no-such-target";
    why: string;
}, {
    outcome: "declined" | "moved" | "no-such-target";
    epic?: string | null | undefined;
    why?: string | undefined;
}>;
export type NavigationResult = z.infer<typeof navigationResult>;
/**
 * The least an `epics.list` can answer with. `slug` is required: it is the argument to every other
 * call. `title` and `project` are optional and bounded. Every other field passes through untouched.
 * There is no bound on how many epics come back.
 */
export declare const epicSpine: z.ZodObject<{
    slug: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    slug: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    slug: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.ZodTypeAny, "passthrough">>;
export type EpicSpine = z.infer<typeof epicSpine>;
export declare const epicsListResult: z.ZodObject<{
    epics: z.ZodArray<z.ZodObject<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    epics: z.ZodArray<z.ZodObject<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    epics: z.ZodArray<z.ZodObject<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        slug: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.ZodTypeAny, "passthrough">>, "many">;
}, z.ZodTypeAny, "passthrough">>;
export type EpicsListResult = z.infer<typeof epicsListResult>;
/**
 * What became of a `projects.pick`; all three are `ok: true`. `picked`: `project` says which. `cancelled`: the
 * picker was closed without choosing. `declined`: the host would not ask, also its answer when it has no
 * projects. A module treats `cancelled` and `declined` alike; a host keeps its holdings out of `why`.
 */
export declare const PICK_OUTCOMES: readonly ["picked", "cancelled", "declined"];
export type PickOutcome = (typeof PICK_OUTCOMES)[number];
/**
 * One project, as a host hands it over: the same two fields `context` uses for the open project.
 * `path` is absolute and resolved; `name` is what the host calls it and is never a path.
 */
export declare const pickedProject: z.ZodObject<{
    path: z.ZodString;
    name: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    name: string;
}, {
    path: string;
    name?: string | undefined;
}>;
export type PickedProject = z.infer<typeof pickedProject>;
export declare const projectPickResult: z.ZodObject<{
    outcome: z.ZodEnum<["picked", "cancelled", "declined"]>;
    /**
     * Null unless `outcome` is `picked`, and a module should check the outcome
     * rather than the field. A host that filled this in beside `cancelled` would
     * be answering a question nobody was allowed to ask.
     */
    project: z.ZodDefault<z.ZodNullable<z.ZodObject<{
        path: z.ZodString;
        name: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        name: string;
    }, {
        path: string;
        name?: string | undefined;
    }>>>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    outcome: "declined" | "picked" | "cancelled";
    why: string;
    project: {
        path: string;
        name: string;
    } | null;
}, {
    outcome: "declined" | "picked" | "cancelled";
    why?: string | undefined;
    project?: {
        path: string;
        name?: string | undefined;
    } | null | undefined;
}>;
export type ProjectPickResult = z.infer<typeof projectPickResult>;
/**
 * The answers this package describes, by method. Partial: absence means UNSPECIFIED, not empty, so
 * never treat a missing schema as "expects nothing". A plain object: look up with
 * `resultSchemaFor`, never by indexing with a method name from a stranger's program.
 */
export declare const methodResults: Partial<Record<Method, z.ZodTypeAny>>;
/** The schema for one method's answer, or nothing — which means unspecified. */
export declare function resultSchemaFor(method: string): z.ZodTypeAny | undefined;
//# sourceMappingURL=methods.d.ts.map