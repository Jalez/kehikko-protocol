import { z } from 'zod';
/**
 * The questions a module can ask, by name and by shape: capabilities, methods, each method's
 * params, and a few result schemas. No answering is here: no dispatch table, no handlers. A
 * response's content is `unknown` unless `methodResults` describes it.
 * Design notes: docs/methods.md.
 */
/**
 * The areas of a host's material these methods touch, each with the sentence a person reads. Names
 * for a kind of question. A module's manifest asks for them (`declares.uses`) and a host holds each
 * call to what was asked: a method is answered under its capability (`METHODS`) only when the
 * manifest listed it. The protocol grants nothing itself; the host's check is its own, and a host
 * before 1.4.0 may not make one. Since 1.4.0 the greeting says what will be answered (`hello.answers`).
 */
export declare const CAPABILITIES: {
    readonly 'epics:read': "Read which epics exist, and their titles, ledes and projects.";
    /**
     * Read an epic's steps (`steps.list`). From 2.21.0 the answer is the union of every module that
     * publishes a plan (`steps.json`), each step saying which module provides it, with the phases,
     * order and gates the plans say.
     */
    readonly 'steps:read': "Read an epic's steps: their titles, bodies, order and phases, what holds them, and the references they name.";
    readonly 'live:read': "Read what the last refresh found in the trackers for an epic.";
    readonly 'stage:report': "Say where work is — working, in review, or blocked — into the host's database.";
    readonly 'events:emit': "Send an extension payload: a notification, a report of its own calls.";
    /** Asks the host to MOVE; reads and writes nothing. See `view.goto`. */
    readonly 'view:navigate': "Ask the host to show a particular epic, step or reference. The host decides.";
    /**
     * Asks the host to FOLD or UNFOLD containers; moves, resizes, removes and reorders nothing. See
     * `view.fold`. The host decides, shows it happening and says who asked.
     */
    readonly 'view:fold': "Ask the host to fold containers to their headers or unfold them. The host decides, and you see it happen.";
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
     * 2.13.0. Say where in a change's code the person is pointing — a file, a line or lines, a side of
     * the diff — and whether they want to look there or comment there. A SHARED write like
     * `passage:set`: it goes into `context.location` on this kehikko.
     */
    readonly 'location:set': "Say where in a change’s code the person is pointing — a file and a line — or ask for a comment there. Every module on the canvas is told.";
    /**
     * 2.16.0. Hand a web address to the canvas, for whichever module shows pages to open. A SHARED write
     * like `location:set`: it goes into `context.address` on this kehikko. Names an address and nothing
     * else — not the Browser, not whether one is there. With no such module the host asks the person.
     */
    readonly 'address:open': "Hand a web address (https:, or this machine) to the canvas to be opened by a module that shows pages. Every module on the canvas is told; with none, you are asked.";
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
    /**
     * Ask the host to edit the open project's list of an epic's parts: add one, rename one, move one,
     * remove one. See `parts.set`. A write into the epic, read back by every module in `context.parts`.
     * The host is the list's only writer and decides; a module offers the edit on a person's press.
     */
    readonly 'parts:set': "Ask the host to add, rename, move or remove a part of an epic. The host decides, and every module is told.";
    /**
     * Say what this module's things are doing NOW: working, needing the person, finished. A write into
     * the host's marks, read back by nobody else as data; the host draws it. See `activity.set` and
     * `activity.ts`. 1.5.0.
     */
    readonly 'activity:report': "Say which of the things you run are working, need your attention or have finished, so the host can mark them.";
    /**
     * 2.20.0. Read the host's record of traffic: the calls Kehikot and every module made and received
     * on this computer, and the connections open on their processes. Addresses and reasons, never what
     * a call carried. See `traffic.read` and `traffic.ts`. For a module that shows traffic, and no other.
     */
    readonly 'traffic:read': "Read the record of the calls Kehikot and its modules make and receive on this computer — when, what kind, to where and why — never what they carried.";
    /**
     * 2.20.0. Add this module's own calls to the host's record, each with its reason. Writes into the
     * host's memory only; read back by a module holding `traffic:read`. See `traffic.note`.
     */
    readonly 'traffic:report': "Note the calls this module makes, each with its reason, in Kehikot’s record of traffic on this computer.";
    /**
     * 2.21.0. Read an epic's parts and what the modules hold for each (`parts.get`): the list every
     * framed page is handed in `context.parts`, asked for by name — what a module's SERVER reads, having
     * no frame to be handed it.
     */
    readonly 'parts:read': "Read an epic's parts and what the modules hold for each — the documents and references of every part.";
    /**
     * 2.21.0. Read why closed references closed (`dispositions.get`): the marks every framed page is
     * handed in `context.dispositions`, asked for by name, as a module's server must.
     */
    readonly 'dispositions:read': "Read why closed references closed — done, won't do, duplicate or superseded — as every module is shown it.";
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
    readonly 'view.fold': "view:fold";
    readonly 'selection.set': "selection:set";
    readonly 'passage.set': "passage:set";
    readonly 'location.set': "location:set";
    readonly 'address.open': "address:open";
    readonly 'filters.set': "filters:set";
    readonly 'showing.set': "showing:set";
    readonly 'projects.pick': "projects:pick";
    readonly 'state.set': "state:keep";
    readonly 'disposition.set': "disposition:set";
    readonly 'tracker.get': "trackers:read";
    readonly 'tracker.refresh': "trackers:refresh";
    /** The boards and their columns: part of the same reading, so under the same capability. (2.6.0) */
    readonly 'tracker.columns': "trackers:read";
    readonly 'content.changed': "content:report";
    readonly 'parts.set': "parts:set";
    readonly 'activity.set': "activity:report";
    /** The record of traffic, from `since` (2.20.0). */
    readonly 'traffic.read': "traffic:read";
    /** A module's own calls, noted with their reasons (2.20.0). */
    readonly 'traffic.note': "traffic:report";
    /** An epic's parts with what the modules hold, as `context.parts` carries them (2.21.0). */
    readonly 'parts.get': "parts:read";
    /** The open project's dispositions, as `context.dispositions` carries them (2.21.0). */
    readonly 'dispositions.get': "dispositions:read";
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
    readonly 'view.goto': z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        epic: z.ZodOptional<z.ZodString>;
        step: z.ZodOptional<z.ZodNumber>;
        /**
         * Bounded at `GOTO_REF` rather than `REF`, and REFUSED rather than clipped: a clipped ref is
         * a DIFFERENT ref.
         */
        ref: z.ZodOptional<z.ZodString>;
        /**
         * 1.4.0. Parts of the epic to pick out once there (`context.parts` ids). With an epic, so
         * that a host before 1.4.0, which strips what it does not know, still goes to the epic.
         */
        parts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** 1.4.0. The kehikko to be on first: its `key`. With an epic, for the same reason. */
        kehikko: z.ZodOptional<z.ZodString>;
        /**
         * 2.28.0. The project to stand in first: its id (`context.projectId`) or, without one, its
         * absolute folder (`context.projectPath`) — `projectKey`'s key. The host switches to it as the
         * person's own switch does, then goes to the epic, kehikko and parts IN it; one it does not hold
         * is `declined`. With an epic: a project alone names no place in it. Say `project` in
         * `declares.navigates`; a host before 2.28.0 strips it and would go to that epic where it is.
         */
        project: z.ZodOptional<z.ZodString>;
        /**
         * 2.28.0. One thing to be shown on the kehikko the move ends on (`showAskSchema`): relayed as
         * `context.show` to the containers there whose manifests say they show `subject`, after a
         * `moved`. Say `show` in `declares.navigates`.
         */
        show: z.ZodOptional<z.ZodObject<{
            subject: z.ZodString;
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            subject: string;
        }, {
            id: string;
            subject: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        epic?: string | undefined;
        parts?: string[] | undefined;
        kehikko?: string | undefined;
        project?: string | undefined;
        show?: {
            id: string;
            subject: string;
        } | undefined;
        ref?: string | undefined;
        step?: number | undefined;
    }, {
        epic?: string | undefined;
        parts?: string[] | undefined;
        kehikko?: string | undefined;
        project?: string | undefined;
        show?: {
            id: string;
            subject: string;
        } | undefined;
        ref?: string | undefined;
        step?: number | undefined;
    }>, {
        epic?: string | undefined;
        parts?: string[] | undefined;
        kehikko?: string | undefined;
        project?: string | undefined;
        show?: {
            id: string;
            subject: string;
        } | undefined;
        ref?: string | undefined;
        step?: number | undefined;
    }, {
        epic?: string | undefined;
        parts?: string[] | undefined;
        kehikko?: string | undefined;
        project?: string | undefined;
        show?: {
            id: string;
            subject: string;
        } | undefined;
        ref?: string | undefined;
        step?: number | undefined;
    }>, {
        epic?: string | undefined;
        parts?: string[] | undefined;
        kehikko?: string | undefined;
        project?: string | undefined;
        show?: {
            id: string;
            subject: string;
        } | undefined;
        ref?: string | undefined;
        step?: number | undefined;
    }, {
        epic?: string | undefined;
        parts?: string[] | undefined;
        kehikko?: string | undefined;
        project?: string | undefined;
        show?: {
            id: string;
            subject: string;
        } | undefined;
        ref?: string | undefined;
        step?: number | undefined;
    }>, {
        epic?: string | undefined;
        parts?: string[] | undefined;
        kehikko?: string | undefined;
        project?: string | undefined;
        show?: {
            id: string;
            subject: string;
        } | undefined;
        ref?: string | undefined;
        step?: number | undefined;
    }, {
        epic?: string | undefined;
        parts?: string[] | undefined;
        kehikko?: string | undefined;
        project?: string | undefined;
        show?: {
            id: string;
            subject: string;
        } | undefined;
        ref?: string | undefined;
        step?: number | undefined;
    }>;
    /**
     * Ask the host to fold containers to their headers, unfold them, or both; answered with
     * `foldResult`. Each list names module ids on this kehikko (`context.containers`); a call naming
     * none, or one id in both, is refused. A container already as asked is left alone. Folding only.
     */
    readonly 'view.fold': z.ZodEffects<z.ZodEffects<z.ZodObject<{
        fold: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        unfold: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        fold: string[];
        unfold: string[];
    }, {
        fold?: string[] | undefined;
        unfold?: string[] | undefined;
    }>, {
        fold: string[];
        unfold: string[];
    }, {
        fold?: string[] | undefined;
        unfold?: string[] | undefined;
    }>, {
        fold: string[];
        unfold: string[];
    }, {
        fold?: string[] | undefined;
        unfold?: string[] | undefined;
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
        }>>;
    }, "strip", z.ZodTypeAny, {
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
     * 2.13.0. Say where in a change's code the person is pointing; answered with `locationSetResult`. The
     * host relays it into `context.location` on this kehikko, stamped with who pointed and when.
     * `location` is required and nullable: `null` is a real call that clears it. `intent` says why:
     * `show` (absent means `show`) or `comment`. A host takes it only while `location.change` is in
     * `context.selection`: a module pointing into a change nobody picked calls `selection.set` first.
     */
    readonly 'location.set': z.ZodObject<{
        location: z.ZodNullable<z.ZodEffects<z.ZodObject<{
            change: z.ZodString;
            path: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
            line: z.ZodNumber;
            endLine: z.ZodOptional<z.ZodNumber>;
            side: z.ZodEnum<["new", "old"]>;
            commit: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            line: number;
            change: string;
            side: "new" | "old";
            commit?: string | undefined;
            endLine?: number | undefined;
        }, {
            path: string;
            line: number;
            change: string;
            side: "new" | "old";
            commit?: string | undefined;
            endLine?: number | undefined;
        }>, {
            path: string;
            line: number;
            change: string;
            side: "new" | "old";
            commit?: string | undefined;
            endLine?: number | undefined;
        }, {
            path: string;
            line: number;
            change: string;
            side: "new" | "old";
            commit?: string | undefined;
            endLine?: number | undefined;
        }>>;
        intent: z.ZodOptional<z.ZodEnum<["show", "comment"]>>;
    }, "strip", z.ZodTypeAny, {
        location: {
            path: string;
            line: number;
            change: string;
            side: "new" | "old";
            commit?: string | undefined;
            endLine?: number | undefined;
        } | null;
        intent?: "show" | "comment" | undefined;
    }, {
        location: {
            path: string;
            line: number;
            change: string;
            side: "new" | "old";
            commit?: string | undefined;
            endLine?: number | undefined;
        } | null;
        intent?: "show" | "comment" | undefined;
    }>;
    /**
     * 2.16.0. Hand a web address to the canvas; answered with `addressOpenResult`. `url` is held to
     * `addressRefusal` (https:, or http: to this machine; no credentials; at most `LIMITS.URL`), and
     * refused rather than repaired. `title` is what to call the page, when the sender knows. `intent`
     * is `show` (absent means `show`). The host stamps who asked and when into `context.address`, where
     * a module that shows pages (`REACTS_TO.address`) takes it. A tracker ref goes through
     * `selection.set`, not here.
     */
    readonly 'address.open': z.ZodObject<{
        url: z.ZodEffects<z.ZodString, string, string>;
        title: z.ZodOptional<z.ZodString>;
        intent: z.ZodOptional<z.ZodEnum<["show"]>>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        title?: string | undefined;
        intent?: "show" | undefined;
    }, {
        url: string;
        title?: string | undefined;
        intent?: "show" | undefined;
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
                title: string;
                from: number | null;
                to: number | null;
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
        stage: "working" | "blocked" | "in-review";
    }, {
        ref: string;
        stage: "working" | "blocked" | "in-review";
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
     * `parts: true` (2.19.0), with `epic`: the refs the epic's parts hold as well as the refs the epic
     * names — the list `context.parts` carries — in one answer. A host before 2.19.0 strips it and
     * answers the epic's own refs, so a module that needs the parts' refs from an older host still asks
     * for the ones the answer did not cover.
     */
    readonly 'tracker.get': z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        detail: z.ZodDefault<z.ZodEnum<["summary", "detail"]>>;
        parts: z.ZodOptional<z.ZodBoolean>;
        refs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        epic: z.ZodOptional<z.ZodString>;
        project: z.ZodOptional<z.ZodLiteral<true>>;
    }, "strip", z.ZodTypeAny, {
        detail: "detail" | "summary";
        epic?: string | undefined;
        parts?: boolean | undefined;
        refs?: string[] | undefined;
        project?: true | undefined;
    }, {
        epic?: string | undefined;
        parts?: boolean | undefined;
        detail?: "detail" | "summary" | undefined;
        refs?: string[] | undefined;
        project?: true | undefined;
    }>, {
        detail: "detail" | "summary";
        epic?: string | undefined;
        parts?: boolean | undefined;
        refs?: string[] | undefined;
        project?: true | undefined;
    }, {
        epic?: string | undefined;
        parts?: boolean | undefined;
        detail?: "detail" | "summary" | undefined;
        refs?: string[] | undefined;
        project?: true | undefined;
    }>, {
        detail: "detail" | "summary";
        epic?: string | undefined;
        parts?: boolean | undefined;
        refs?: string[] | undefined;
        project?: true | undefined;
    }, {
        epic?: string | undefined;
        parts?: boolean | undefined;
        detail?: "detail" | "summary" | undefined;
        refs?: string[] | undefined;
        project?: true | undefined;
    }>, {
        detail: "detail" | "summary";
        epic?: string | undefined;
        parts?: boolean | undefined;
        refs?: string[] | undefined;
        project?: true | undefined;
    }, {
        epic?: string | undefined;
        parts?: boolean | undefined;
        detail?: "detail" | "summary" | undefined;
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
     * The boards of the open project's sources and their columns, from the host's reading; answered at
     * once with `trackerColumnsResult`. Where each item stands is on its row (`column`). (2.6.0)
     */
    readonly 'tracker.columns': z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
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
    /**
     * Ask the host to make ONE edit to an epic's list of parts; answered with `partsSetResult`, which carries the
     * list as it then stands. Exactly one of `add`, `rename`, `move`, `remove`. `epic` is required: the edit is
     * written down, so it names what it is for. The HOST makes a new part's id (`partIdFor`), and no edit changes one.
     */
    readonly 'parts.set': z.ZodEffects<z.ZodEffects<z.ZodObject<{
        epic: z.ZodString;
        /** A new part, called `name`, placed by `after`. The answer's `id` is the id the host gave it. */
        add: z.ZodOptional<z.ZodObject<{
            name: z.ZodString;
            after: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            after?: string | null | undefined;
        }, {
            name: string;
            after?: string | null | undefined;
        }>>;
        /** Another name for the part `id`. Its id, its place and everything filed under it stay. */
        rename: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
        }, {
            id: string;
            name: string;
        }>>;
        /** The part `id`, placed by `after`. */
        move: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            after: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            after?: string | null | undefined;
        }, {
            id: string;
            after?: string | null | undefined;
        }>>;
        /** The part `id` leaves the list. What modules filed under it is theirs and is not touched. */
        remove: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
        }, {
            id: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        epic: string;
        add?: {
            name: string;
            after?: string | null | undefined;
        } | undefined;
        rename?: {
            id: string;
            name: string;
        } | undefined;
        move?: {
            id: string;
            after?: string | null | undefined;
        } | undefined;
        remove?: {
            id: string;
        } | undefined;
    }, {
        epic: string;
        add?: {
            name: string;
            after?: string | null | undefined;
        } | undefined;
        rename?: {
            id: string;
            name: string;
        } | undefined;
        move?: {
            id: string;
            after?: string | null | undefined;
        } | undefined;
        remove?: {
            id: string;
        } | undefined;
    }>, {
        epic: string;
        add?: {
            name: string;
            after?: string | null | undefined;
        } | undefined;
        rename?: {
            id: string;
            name: string;
        } | undefined;
        move?: {
            id: string;
            after?: string | null | undefined;
        } | undefined;
        remove?: {
            id: string;
        } | undefined;
    }, {
        epic: string;
        add?: {
            name: string;
            after?: string | null | undefined;
        } | undefined;
        rename?: {
            id: string;
            name: string;
        } | undefined;
        move?: {
            id: string;
            after?: string | null | undefined;
        } | undefined;
        remove?: {
            id: string;
        } | undefined;
    }>, {
        epic: string;
        add?: {
            name: string;
            after?: string | null | undefined;
        } | undefined;
        rename?: {
            id: string;
            name: string;
        } | undefined;
        move?: {
            id: string;
            after?: string | null | undefined;
        } | undefined;
        remove?: {
            id: string;
        } | undefined;
    }, {
        epic: string;
        add?: {
            name: string;
            after?: string | null | undefined;
        } | undefined;
        rename?: {
            id: string;
            name: string;
        } | undefined;
        move?: {
            id: string;
            after?: string | null | undefined;
        } | undefined;
        remove?: {
            id: string;
        } | undefined;
    }>;
    /**
     * 1.5.0. This module's COMPLETE list of activity items right now; answered with `activitySetResult`. Replaces,
     * never merges: an item absent from the list is gone, and `[]` is a real call that says nothing is going on.
     * Duplicate ids are refused. See `activity.ts`.
     */
    readonly 'activity.set': z.ZodObject<{
        items: z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodObject<{
            id: z.ZodString;
            state: z.ZodEnum<["working", "attention", "done"]>;
            label: z.ZodString;
            place: z.ZodOptional<z.ZodObject<{
                epic: z.ZodOptional<z.ZodString>;
                parts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                kehikko: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                epic?: string | undefined;
                parts?: string[] | undefined;
                kehikko?: string | undefined;
            }, {
                epic?: string | undefined;
                parts?: string[] | undefined;
                kehikko?: string | undefined;
            }>>;
            since: z.ZodOptional<z.ZodNumber>;
            detail: z.ZodOptional<z.ZodString>;
            priority: z.ZodOptional<z.ZodEnum<["urgent", "normal", "low"]>>;
            refs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            group: z.ZodOptional<z.ZodString>;
            project: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            projectId: z.ZodOptional<z.ZodString>;
            event: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            state: "working" | "attention" | "done";
            label: string;
            place?: {
                epic?: string | undefined;
                parts?: string[] | undefined;
                kehikko?: string | undefined;
            } | undefined;
            since?: number | undefined;
            detail?: string | undefined;
            priority?: "urgent" | "normal" | "low" | undefined;
            refs?: string[] | undefined;
            group?: string | undefined;
            project?: string | undefined;
            projectId?: string | undefined;
            event?: string | undefined;
        }, {
            id: string;
            state: "working" | "attention" | "done";
            label: string;
            place?: {
                epic?: string | undefined;
                parts?: string[] | undefined;
                kehikko?: string | undefined;
            } | undefined;
            since?: number | undefined;
            detail?: string | undefined;
            priority?: "urgent" | "normal" | "low" | undefined;
            refs?: string[] | undefined;
            group?: string | undefined;
            project?: string | undefined;
            projectId?: string | undefined;
            event?: string | undefined;
        }>, {
            id: string;
            state: "working" | "attention" | "done";
            label: string;
            place?: {
                epic?: string | undefined;
                parts?: string[] | undefined;
                kehikko?: string | undefined;
            } | undefined;
            since?: number | undefined;
            detail?: string | undefined;
            priority?: "urgent" | "normal" | "low" | undefined;
            refs?: string[] | undefined;
            group?: string | undefined;
            project?: string | undefined;
            projectId?: string | undefined;
            event?: string | undefined;
        }, {
            id: string;
            state: "working" | "attention" | "done";
            label: string;
            place?: {
                epic?: string | undefined;
                parts?: string[] | undefined;
                kehikko?: string | undefined;
            } | undefined;
            since?: number | undefined;
            detail?: string | undefined;
            priority?: "urgent" | "normal" | "low" | undefined;
            refs?: string[] | undefined;
            group?: string | undefined;
            project?: string | undefined;
            projectId?: string | undefined;
            event?: string | undefined;
        }>, "many">, {
            id: string;
            state: "working" | "attention" | "done";
            label: string;
            place?: {
                epic?: string | undefined;
                parts?: string[] | undefined;
                kehikko?: string | undefined;
            } | undefined;
            since?: number | undefined;
            detail?: string | undefined;
            priority?: "urgent" | "normal" | "low" | undefined;
            refs?: string[] | undefined;
            group?: string | undefined;
            project?: string | undefined;
            projectId?: string | undefined;
            event?: string | undefined;
        }[], {
            id: string;
            state: "working" | "attention" | "done";
            label: string;
            place?: {
                epic?: string | undefined;
                parts?: string[] | undefined;
                kehikko?: string | undefined;
            } | undefined;
            since?: number | undefined;
            detail?: string | undefined;
            priority?: "urgent" | "normal" | "low" | undefined;
            refs?: string[] | undefined;
            group?: string | undefined;
            project?: string | undefined;
            projectId?: string | undefined;
            event?: string | undefined;
        }[]>;
    }, "strip", z.ZodTypeAny, {
        items: {
            id: string;
            state: "working" | "attention" | "done";
            label: string;
            place?: {
                epic?: string | undefined;
                parts?: string[] | undefined;
                kehikko?: string | undefined;
            } | undefined;
            since?: number | undefined;
            detail?: string | undefined;
            priority?: "urgent" | "normal" | "low" | undefined;
            refs?: string[] | undefined;
            group?: string | undefined;
            project?: string | undefined;
            projectId?: string | undefined;
            event?: string | undefined;
        }[];
    }, {
        items: {
            id: string;
            state: "working" | "attention" | "done";
            label: string;
            place?: {
                epic?: string | undefined;
                parts?: string[] | undefined;
                kehikko?: string | undefined;
            } | undefined;
            since?: number | undefined;
            detail?: string | undefined;
            priority?: "urgent" | "normal" | "low" | undefined;
            refs?: string[] | undefined;
            group?: string | undefined;
            project?: string | undefined;
            projectId?: string | undefined;
            event?: string | undefined;
        }[];
    }>;
    readonly 'events.emit': z.ZodObject<{
        extension: z.ZodString;
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
    /**
     * 2.20.0. The rows of the host's record of traffic after `since` (a `seq`; 0 for all it keeps),
     * oldest first, at most `limit`. `sample: true` also asks the host to look at its processes'
     * connections, which it does only while such reads keep coming (`processes` in the answer).
     */
    readonly 'traffic.read': z.ZodObject<{
        since: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        sample: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        since: number;
        limit: number;
        sample: boolean;
    }, {
        since?: number | undefined;
        limit?: number | undefined;
        sample?: boolean | undefined;
    }>;
    /**
     * 2.20.0. Calls this module made, each with its reason, added to the host's record as its own
     * (`reported: 'module'`). Sanitize first (`trafficTarget`); the host sanitizes again.
     */
    readonly 'traffic.note': z.ZodObject<{
        calls: z.ZodArray<z.ZodObject<{
            at: z.ZodNumber;
            ms: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            reason: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            kind: z.ZodString;
            host: z.ZodString;
            path: z.ZodString;
            status: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
            ok: z.ZodDefault<z.ZodNullable<z.ZodBoolean>>;
            bytesIn: z.ZodOptional<z.ZodNumber>;
            bytesOut: z.ZodOptional<z.ZodNumber>;
            cache: z.ZodOptional<z.ZodEnum<["hit", "not-modified", "refused"]>>;
        }, "strip", z.ZodTypeAny, {
            path: string;
            at: number;
            status: number | null;
            host: string;
            kind: string;
            reason: string | null;
            ok: boolean | null;
            ms: number | null;
            bytesIn?: number | undefined;
            bytesOut?: number | undefined;
            cache?: "refused" | "hit" | "not-modified" | undefined;
        }, {
            path: string;
            at: number;
            host: string;
            kind: string;
            status?: number | null | undefined;
            reason?: string | null | undefined;
            ok?: boolean | null | undefined;
            ms?: number | null | undefined;
            bytesIn?: number | undefined;
            bytesOut?: number | undefined;
            cache?: "refused" | "hit" | "not-modified" | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        calls: {
            path: string;
            at: number;
            status: number | null;
            host: string;
            kind: string;
            reason: string | null;
            ok: boolean | null;
            ms: number | null;
            bytesIn?: number | undefined;
            bytesOut?: number | undefined;
            cache?: "refused" | "hit" | "not-modified" | undefined;
        }[];
    }, {
        calls: {
            path: string;
            at: number;
            host: string;
            kind: string;
            status?: number | null | undefined;
            reason?: string | null | undefined;
            ok?: boolean | null | undefined;
            ms?: number | null | undefined;
            bytesIn?: number | undefined;
            bytesOut?: number | undefined;
            cache?: "refused" | "hit" | "not-modified" | undefined;
        }[];
    }>;
    /**
     * 2.21.0. An epic's parts, each with what every module holds for it; answered with `partsGetResult`.
     * The same list `context.parts` carries, with `picked` false throughout: picking is a person's,
     * on one screen, and a server asking has none (a conversation's place says its picks).
     */
    readonly 'parts.get': z.ZodObject<{
        epic: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        epic: string;
    }, {
        epic: string;
    }>;
    /** 2.21.0. Every disposition in the project; answered with `dispositionsGetResult`, as `context.dispositions`. */
    readonly 'dispositions.get': z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
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
 * What became of a `view.fold`; all four are `ok: true`. `changed`: at least one container was folded or
 * unfolded. `unchanged`: every one was already as asked. `declined`: the host will not, right now.
 * `no-such-container`: an id is not on this kehikko, and nothing was changed.
 */
export declare const FOLD_OUTCOMES: readonly ["changed", "unchanged", "declined", "no-such-container"];
export type FoldOutcome = (typeof FOLD_OUTCOMES)[number];
/**
 * `folded` and `unfolded` are what THIS call changed, and nothing it left alone: handed back the
 * other way round (`{ fold: unfolded, unfold: folded }`) they put the canvas as it was. A caller
 * that puts things back leaves out any container whose `folded` in `context.containers` has moved
 * since, because a person moved it.
 */
export declare const foldResult: z.ZodObject<{
    outcome: z.ZodEnum<["changed", "unchanged", "declined", "no-such-container"]>;
    folded: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    unfolded: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    outcome: "changed" | "declined" | "unchanged" | "no-such-container";
    why: string;
    folded: string[];
    unfolded: string[];
}, {
    outcome: "changed" | "declined" | "unchanged" | "no-such-container";
    why?: string | undefined;
    folded?: string[] | undefined;
    unfolded?: string[] | undefined;
}>;
export type FoldResult = z.infer<typeof foldResult>;
/**
 * What became of a `parts.set`; all four are `ok: true`. `changed`: the list is different now. `unchanged`:
 * it already was as asked (the same name, the same place). `declined`: the host will not, and `why` says so
 * (no such epic, the list is full, not now). `no-such-part`: an `id` or an `after` names no part; nothing changed.
 */
export declare const PARTS_SET_OUTCOMES: readonly ["changed", "unchanged", "declined", "no-such-part"];
export type PartsSetOutcome = (typeof PARTS_SET_OUTCOMES)[number];
/**
 * `parts` is the epic's whole list after the call, in order, whatever the outcome (`[]` when the host
 * has no such epic to answer about). `id` is the part the call was about: for `add`, the id the host
 * made; null when nothing was. A refusal's sentence is `why`, for a person to read.
 */
export declare const partsSetResult: z.ZodObject<{
    outcome: z.ZodEnum<["changed", "unchanged", "declined", "no-such-part"]>;
    parts: z.ZodDefault<z.ZodEffects<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>, "many">, {
        id: string;
        name: string;
    }[], {
        id: string;
        name: string;
    }[]>>;
    id: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string | null;
    parts: {
        id: string;
        name: string;
    }[];
    outcome: "changed" | "declined" | "unchanged" | "no-such-part";
    why: string;
}, {
    outcome: "changed" | "declined" | "unchanged" | "no-such-part";
    id?: string | null | undefined;
    parts?: {
        id: string;
        name: string;
    }[] | undefined;
    why?: string | undefined;
}>;
export type PartsSetResult = z.infer<typeof partsSetResult>;
/**
 * What became of an `activity.set`; both are `ok: true`. `taken`: the host holds the list as sent. `declined`:
 * it will not, right now (`why` says so). `taken` is how many items it holds.
 */
export declare const ACTIVITY_SET_OUTCOMES: readonly ["taken", "declined"];
export type ActivitySetOutcome = (typeof ACTIVITY_SET_OUTCOMES)[number];
export declare const activitySetResult: z.ZodObject<{
    outcome: z.ZodEnum<["taken", "declined"]>;
    taken: z.ZodDefault<z.ZodNumber>;
    why: z.ZodDefault<z.ZodString>;
    /**
     * 1.8.0. `true`: this host files each item under the project its `project` names, and holds a list that
     * carries `project` as the module's complete list across every project (an item absent from it is gone
     * wherever it was). A module may then report every project's things from one page. Absent: it does not,
     * and every item is filed under the project open now.
     */
    projects: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    outcome: "declined" | "taken";
    why: string;
    taken: number;
    projects?: boolean | undefined;
}, {
    outcome: "declined" | "taken";
    why?: string | undefined;
    taken?: number | undefined;
    projects?: boolean | undefined;
}>;
export type ActivitySetResult = z.infer<typeof activitySetResult>;
/**
 * 2.13.0. What became of a `location.set`; all three are `ok: true`. `taken`: `context.location` is it now
 * (or, for `null`, is cleared). `not-selected`: its change is not in `context.selection`, so the host did
 * not keep it — pick the change with `selection.set` and point again. `declined`: the host will not, right now.
 */
export declare const LOCATION_SET_OUTCOMES: readonly ["taken", "not-selected", "declined"];
export type LocationSetOutcome = (typeof LOCATION_SET_OUTCOMES)[number];
export declare const locationSetResult: z.ZodObject<{
    outcome: z.ZodEnum<["taken", "not-selected", "declined"]>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    outcome: "declined" | "taken" | "not-selected";
    why: string;
}, {
    outcome: "declined" | "taken" | "not-selected";
    why?: string | undefined;
}>;
export type LocationSetResult = z.infer<typeof locationSetResult>;
/**
 * 2.16.0. What became of an `address.open`; all three are `ok: true`. `shown`: a module on this kehikko
 * that shows pages has it (`context.address` is it now). `offered`: none does, and the host put the
 * address in front of the person instead — to open it in their own browser, or to add a module that
 * shows pages — so the sender does nothing more. `declined`: the host will not, right now (`why`
 * says so); the sender may fall back to what it did before, on a person's press.
 */
export declare const ADDRESS_OPEN_OUTCOMES: readonly ["shown", "offered", "declined"];
export type AddressOpenOutcome = (typeof ADDRESS_OPEN_OUTCOMES)[number];
export declare const addressOpenResult: z.ZodObject<{
    outcome: z.ZodEnum<["shown", "offered", "declined"]>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    outcome: "declined" | "shown" | "offered";
    why: string;
}, {
    outcome: "declined" | "shown" | "offered";
    why?: string | undefined;
}>;
export type AddressOpenResult = z.infer<typeof addressOpenResult>;
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
/** 2.21.0. `parts.get`'s answer: the epic's parts in order, each with what the modules hold (`partsSchema`). */
export declare const partsGetResult: z.ZodObject<{
    parts: z.ZodArray<z.ZodObject<{
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
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    parts: {
        id: string;
        refs: string[];
        heading: string;
        picked: boolean;
        files?: string[] | undefined;
        documents?: string[] | undefined;
    }[];
}, {
    parts: {
        id: string;
        refs?: string[] | undefined;
        files?: string[] | undefined;
        heading?: string | undefined;
        picked?: boolean | undefined;
        documents?: string[] | undefined;
    }[];
}>;
export type PartsGetResult = z.infer<typeof partsGetResult>;
/** 2.21.0. `dispositions.get`'s answer: the project's marks, as `context.dispositions` carries them. */
export declare const dispositionsGetResult: z.ZodObject<{
    dispositions: z.ZodArray<z.ZodObject<{
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
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    dispositions: {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        at: string | null;
        by: string | null;
        ref: string;
        target: string | null;
        note: string;
    }[];
}, {
    dispositions: {
        value: "done" | "wont-do" | "duplicate" | "superseded";
        ref: string;
        at?: string | null | undefined;
        by?: string | null | undefined;
        target?: string | null | undefined;
        note?: string | undefined;
    }[];
}>;
export type DispositionsGetResult = z.infer<typeof dispositionsGetResult>;
/**
 * What became of a `projects.pick`; all three are `ok: true`. `picked`: `project` says which. `cancelled`: the
 * picker was closed without choosing. `declined`: the host would not ask, also its answer when it has no
 * projects. A module treats `cancelled` and `declined` alike; a host keeps its holdings out of `why`.
 */
export declare const PICK_OUTCOMES: readonly ["picked", "cancelled", "declined"];
export type PickOutcome = (typeof PICK_OUTCOMES)[number];
/**
 * One project, as a host hands it over: the same fields `context` uses for the open project.
 * `path` is absolute and resolved; `name` is what the host calls it and is never a path. `id` (2.1.0)
 * is its `PROJECT_ID`, as `context.projectId`; absent from an older host, and then the path is the key.
 */
export declare const pickedProject: z.ZodObject<{
    path: z.ZodString;
    name: z.ZodDefault<z.ZodString>;
    id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    path: string;
    id?: string | undefined;
}, {
    path: string;
    id?: string | undefined;
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
        id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        path: string;
        id?: string | undefined;
    }, {
        path: string;
        id?: string | undefined;
        name?: string | undefined;
    }>>>;
    why: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    project: {
        name: string;
        path: string;
        id?: string | undefined;
    } | null;
    outcome: "declined" | "picked" | "cancelled";
    why: string;
}, {
    outcome: "declined" | "picked" | "cancelled";
    project?: {
        path: string;
        id?: string | undefined;
        name?: string | undefined;
    } | null | undefined;
    why?: string | undefined;
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
