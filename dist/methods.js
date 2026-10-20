import { z } from 'zod';
import { LIMITS } from './limits.js';
import { EPIC_SLUG, MODULE_ID, PROJECT_ID } from './ids.js';
import { gotoRef, placeKehikko, placeParts, ref, stepNumber } from './fragments.js';
import { activityItemsSchema } from './activity.js';
/**
 * `passageSchema` and `filterChoiceSchema` come from `wire.ts` so that both directions share one
 * definition; `wire.ts` imports nothing from here.
 */
import { DISPOSITIONS, filterChoiceSchema, passageSchema } from './wire.js';
import { TRACKER_DETAILS, trackerColumnsResult, trackerReadingResult, trackerRefreshResult } from './tracker.js';
import { PART_ID, partListSchema } from './parts.js';
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
export const CAPABILITIES = {
    'epics:read': 'Read which epics exist, and their titles, ledes and projects.',
    'steps:read': "Read an epic's steps: their titles, bodies and the references they name.",
    'live:read': 'Read what the last refresh found in the trackers for an epic.',
    'stage:report': "Say where work is — working, in review, or blocked — into the host's database.",
    'events:emit': 'Send an extension payload: a notification, a report of its own calls.',
    /** Asks the host to MOVE; reads and writes nothing. See `view.goto`. */
    'view:navigate': 'Ask the host to show a particular epic, step or reference. The host decides.',
    /**
     * Asks the host to FOLD or UNFOLD containers; moves, resizes, removes and reorders nothing. See
     * `view.fold`. The host decides, shows it happening and says who asked.
     */
    'view:fold': 'Ask the host to fold containers to their headers or unfold them. The host decides, and you see it happen.',
    /**
     * Say which references the person has picked out. A SHARED write: the selection goes into the
     * context every framed module receives.
     */
    'selection:set': 'Say which references the person has picked out. Every module on the canvas is told.',
    /**
     * Say where in a document the person is pointing. A SHARED write like `selection:set`: a passage
     * names a file on the host's machine, a place in it and a paragraph of what was there, put in
     * front of every other pane.
     */
    'passage:set': 'Say where in a document the person is pointing, and quote it. Every module on the canvas is told.',
    /**
     * Ask for its own container's filters to be moved. Reaches this container's own narrowing and
     * nothing else: not another container's, not the canvas.
     */
    'filters:set': 'Move this container’s own filters, so it can show you something you asked to see.',
    /**
     * Say what this container is showing. A SHARED write: it goes into the `containers` list in the
     * context every framed module receives, attributed to this container. It moves nobody; a consumer
     * decides for itself what to do with it.
     */
    'showing:set': 'Say what this container is showing — which references, and which places in which documents — so a neighbour '
        + 'can narrow to it. Every module on the canvas is told.',
    /**
     * Ask the person to choose one of their projects, and be told which. The module cannot enumerate,
     * name a project it was not given, filter the menu or open the picker unseen: it receives ONE
     * answer to ONE question, in a dialog the host drew.
     */
    'projects:pick': 'Ask you to choose one of your projects, and be told where it is. The host draws the picker.',
    /** Keep a little state of its own, and get it back next time. To the host it is a string it never reads. */
    'state:keep': 'Keep a small amount of its own state between sessions. The host does not read it.',
    /**
     * Say why a reference closed: done, won't do, a duplicate, superseded. A write into the project,
     * read back by every module in `context.dispositions`. A verdict a person reaches: a module sets
     * it on a press, not on its own judgment.
     */
    'disposition:set': "Mark why a closed reference closed — done, won't do, duplicate or superseded — for every module to read.",
    /**
     * Read what the trackers last said about the project's refs, from the reading the host keeps for
     * everybody. See `tracker.get` and `tracker.ts`. Replaces `live:read`; the module gets rows and
     * never a credential.
     */
    'trackers:read': 'Read what GitHub and GitLab last said about the project’s issues, merge requests and pull requests.',
    /**
     * Ask the host to read the trackers again. Apart from `trackers:read` because it spends the
     * person's rate limit, on behalf of every module on the canvas.
     */
    'trackers:refresh': 'Ask the host to read GitHub and GitLab again, for every module on the canvas.',
    /**
     * Say that the material this module keeps changed. See `content.changed` and `content.ts`. Writes
     * nothing, but moves every other container on the canvas to re-read.
     */
    'content:report': 'Tell every module on the canvas that the material this one keeps has changed, so they read it again.',
    /**
     * Ask the host to edit the open project's list of an epic's parts: add one, rename one, move one,
     * remove one. See `parts.set`. A write into the epic, read back by every module in `context.parts`.
     * The host is the list's only writer and decides; a module offers the edit on a person's press.
     */
    'parts:set': 'Ask the host to add, rename, move or remove a part of an epic. The host decides, and every module is told.',
    /**
     * Say what this module's things are doing NOW: working, needing the person, finished. A write into
     * the host's marks, read back by nobody else as data; the host draws it. See `activity.set` and
     * `activity.ts`. 1.5.0.
     */
    'activity:report': 'Say which of the things you run are working, need your attention or have finished, so the host can mark them.',
};
export const CAPABILITY_NAMES = Object.keys(CAPABILITIES);
/**
 * Every method, and the capability it belongs to. A plain object: never index it with a string out
 * of a frame (`constructor` answers with something inherited). Use `own()` from `./ids.js`, or a
 * `Map`.
 */
export const METHODS = {
    'epics.list': 'epics:read',
    'epic.get': 'epics:read',
    'steps.list': 'steps:read',
    'live.get': 'live:read',
    'stage.report': 'stage:report',
    'events.emit': 'events:emit',
    'view.goto': 'view:navigate',
    'view.fold': 'view:fold',
    'selection.set': 'selection:set',
    'passage.set': 'passage:set',
    'filters.set': 'filters:set',
    'showing.set': 'showing:set',
    'projects.pick': 'projects:pick',
    'state.set': 'state:keep',
    'disposition.set': 'disposition:set',
    'tracker.get': 'trackers:read',
    'tracker.refresh': 'trackers:refresh',
    /** The boards and their columns: part of the same reading, so under the same capability. (2.6.0) */
    'tracker.columns': 'trackers:read',
    'content.changed': 'content:report',
    'parts.set': 'parts:set',
    'activity.set': 'activity:report',
};
export const METHOD_NAMES = Object.keys(METHODS);
/**
 * An epic slug, as it arrives from somebody else's program. Checked for shape and length, not
 * membership, so it refuses the same way whether or not the epic exists. A host's own "no such
 * epic" must not list the ones that do.
 */
const epic = z.string().regex(EPIC_SLUG, 'an epic slug is lowercase letters, digits and dashes');
/**
 * The three stages a module may report: the three no tracker can see. Every other stage is read
 * from a tracker and is not a module's to write.
 */
export const REPORTED_STAGES = ['working', 'in-review', 'blocked'];
/**
 * Which refs a tracker call is about: exactly one of three. `refs`: these, by spelling, up to `TRACKER_ASK`;
 * asking makes the host read a ref it has not seen before. `epic`: every ref the epic names. `project: true`:
 * everything the host reads for the open project, including each listed source's recent issues and changes.
 */
const trackerScope = {
    refs: z.array(ref).min(1).max(LIMITS.TRACKER_ASK).optional(),
    epic: epic.optional(),
    project: z.literal(true).optional(),
};
/** A part's name as somebody typed it: trimmed, not empty, at most `LIMITS.TITLE`. Refused, not clipped, when longer. */
const partName = z.string().trim().min(1).max(LIMITS.TITLE);
const partId = z.string().regex(PART_ID, 'a part id is lowercase letters, digits and dashes');
/** Where a part goes: right after this part, or first with `null`. Absent means last. */
const after = partId.nullable().optional();
const oneScope = (scope) => [scope.refs, scope.epic, scope.project].filter((one) => one !== undefined).length === 1;
const ONE_SCOPE = 'name exactly one of refs, epic or project';
export const methodParams = {
    'epics.list': z.object({}),
    'epic.get': z.object({ epic }),
    'steps.list': z.object({ epic }),
    /**
     * The old door to tracker state: the epic's refs in four bags. A host answers it as a view over
     * the same shared reading `tracker.get` serves. New code asks `tracker.get`.
     */
    'live.get': z.object({ epic }),
    /**
     * Ask the host to show something; answered with `navigationResult`. The same triple
     * `kehikot.goto` carries. Unlike `gotoSchema`, an epic alone is allowed; a call that names none
     * of epic, step or ref is refused.
     */
    'view.goto': z
        .object({
        epic: epic.optional(),
        step: stepNumber.optional(),
        /**
         * Bounded at `GOTO_REF` rather than `REF`, and REFUSED rather than clipped: a clipped ref is
         * a DIFFERENT ref.
         */
        ref: gotoRef.optional(),
        /**
         * 1.4.0. Parts of the epic to pick out once there (`context.parts` ids). With an epic, so
         * that a host before 1.4.0, which strips what it does not know, still goes to the epic.
         */
        parts: placeParts.optional(),
        /** 1.4.0. The kehikko to be on first: its `key`. With an epic, for the same reason. */
        kehikko: placeKehikko.optional(),
    })
        .refine((g) => g.epic !== undefined || g.step !== undefined || g.ref !== undefined, {
        message: 'view.goto has to name an epic, a step or a ref; a call that names nothing asks for nothing',
    })
        .refine((g) => (g.parts === undefined && g.kehikko === undefined) || g.epic !== undefined, {
        message: 'view.goto: `parts` and `kehikko` go with the `epic` they are in',
    }),
    /**
     * Ask the host to fold containers to their headers, unfold them, or both; answered with
     * `foldResult`. Each list names module ids on this kehikko (`context.containers`); a call naming
     * none, or one id in both, is refused. A container already as asked is left alone. Folding only.
     */
    'view.fold': z
        .object({
        fold: z.array(z.string().regex(MODULE_ID)).max(LIMITS.CONTAINERS).default([]),
        unfold: z.array(z.string().regex(MODULE_ID)).max(LIMITS.CONTAINERS).default([]),
    })
        .refine((f) => f.fold.length + f.unfold.length > 0, {
        message: 'view.fold has to name a container to fold or to unfold; a call that names none asks for nothing',
    })
        .refine((f) => !f.fold.some((id) => f.unfold.includes(id)), {
        message: 'a container cannot be in both fold and unfold',
    }),
    /**
     * Say which references the person has picked out. Refs only, never their kinds: the host relays
     * this into the context every module receives, and a module that needs the kind asks `live.get`.
     * An empty list is a real call and clears the selection.
     */
    'selection.set': z.object({
        refs: z.array(ref).max(LIMITS.REFS),
    }),
    /**
     * Say where in a document the person is pointing; the host relays it into the context every
     * framed module receives. `passage` is required and nullable: `null` is a real call that clears
     * it. The shape is `passageSchema` from `wire.ts`, shared with the context.
     */
    'passage.set': z.object({
        passage: passageSchema.nullable(),
    }),
    /**
     * Ask the host to put this container's filters somewhere. A request: the host may refuse for any reason. A
     * whole choice replacing what is there, in the shape of `context.filters`; `{}` puts every group back to its
     * fallback. The host drops groups the module is not offering, and the result is what it settled on.
     */
    'filters.set': z.object({
        filters: filterChoiceSchema,
    }),
    /**
     * Say what this container is showing; the host holds it against this module's container and
     * relays it in `context.containers`. Both lists are required every time, with no default: whole
     * replacement, never a merge. `{ refs: [], documents: [] }` is the real call for showing nothing.
     */
    'showing.set': z.object({
        refs: z.array(ref).max(LIMITS.REFS),
        documents: z.array(passageSchema).max(LIMITS.SHOWING_DOCUMENTS),
    }),
    /**
     * Ask the person to choose one of their projects; answered with `projectPickResult`. Takes nothing: the call
     * is `{}` and the host composes the dialog. The answer waits on a person, so pass a deadline with `within`
     * (see `PERSON_ANSWERS_WITHIN_MS`) instead of the default `ANSWER_WITHIN_MS`.
     */
    'projects.pick': z.object({}),
    /**
     * Keep a small amount of this module's own state: an OPAQUE string the host does not parse and
     * checks only for length. Per module, not per pane. It comes back in the greeting, before the
     * module's first render.
     */
    'state.set': z.object({
        state: z.string().max(LIMITS.MODULE_STATE),
    }),
    'stage.report': z.object({
        ref,
        stage: z.enum(REPORTED_STAGES),
        /**
         * A line a person reads beside the report. REFUSED rather than clipped when it is too long:
         * what is stored is what was sent.
         */
        note: z.string().max(LIMITS.MESSAGE).default(''),
    }),
    /**
     * Mark one reference, or take a mark back with `value: null`. `target` is the other ref for
     * `duplicate` and `superseded`, and refused for `done` and `wont-do`. `by` and `at` are not here:
     * who pressed and when are the host's own facts.
     */
    'disposition.set': z
        .object({
        ref,
        value: z.enum(DISPOSITIONS).nullable(),
        target: ref.optional(),
        note: z.string().max(LIMITS.SUMMARY).default(''),
    })
        .refine((p) => p.target === undefined || p.value === 'duplicate' || p.value === 'superseded', {
        message: 'only a duplicate or a superseded mark names another ref',
    }),
    /**
     * What the trackers last said, from the host's shared reading; answered at once with
     * `trackerReadingResult` (see `tracker.ts`), where a ref not read yet comes back in `missing`.
     * `detail: 'detail'` costs a call per ref at the tracker, so it is only accepted with `refs`.
     */
    'tracker.get': z
        .object({ ...trackerScope, detail: z.enum(TRACKER_DETAILS).default('summary') })
        .refine(oneScope, { message: ONE_SCOPE })
        .refine((p) => p.detail === 'summary' || p.refs !== undefined, {
        message: 'detail is read a ref at a time, so ask for it by refs',
    }),
    /**
     * Read the trackers again, for these refs or this epic or the whole project, and answer when the read lands.
     * Every module on the canvas is told through `context.tracker`. See `trackerRefreshResult`. A host joins a
     * refresh to one already running rather than starting a second.
     */
    'tracker.refresh': z.object(trackerScope).refine(oneScope, { message: ONE_SCOPE }),
    /**
     * The boards of the open project's sources and their columns, from the host's reading; answered at
     * once with `trackerColumnsResult`. Where each item stands is on its row (`column`). (2.6.0)
     */
    'tracker.columns': z.object({}),
    /**
     * This module's own material changed, for this epic or, with no epic, for no one epic in particular. The host
     * tells every container in the project through `context.content`, the caller's included. Whose material and
     * `at` are the host's facts, not params. Report AFTER the write has landed.
     */
    'content.changed': z.object({ epic: epic.optional() }),
    /**
     * Ask the host to make ONE edit to an epic's list of parts; answered with `partsSetResult`, which carries the
     * list as it then stands. Exactly one of `add`, `rename`, `move`, `remove`. `epic` is required: the edit is
     * written down, so it names what it is for. The HOST makes a new part's id (`partIdFor`), and no edit changes one.
     */
    'parts.set': z
        .object({
        epic,
        /** A new part, called `name`, placed by `after`. The answer's `id` is the id the host gave it. */
        add: z.object({ name: partName, after }).optional(),
        /** Another name for the part `id`. Its id, its place and everything filed under it stay. */
        rename: z.object({ id: partId, name: partName }).optional(),
        /** The part `id`, placed by `after`. */
        move: z.object({ id: partId, after }).optional(),
        /** The part `id` leaves the list. What modules filed under it is theirs and is not touched. */
        remove: z.object({ id: partId }).optional(),
    })
        .refine((p) => [p.add, p.rename, p.move, p.remove].filter((one) => one !== undefined).length === 1, {
        message: 'parts.set makes one edit: name exactly one of add, rename, move or remove',
    })
        .refine((p) => p.move === undefined || p.move.after !== p.move.id, {
        message: 'a part cannot be moved to after itself',
    }),
    /**
     * 1.5.0. This module's COMPLETE list of activity items right now; answered with `activitySetResult`. Replaces,
     * never merges: an item absent from the list is gone, and `[]` is a real call that says nothing is going on.
     * Duplicate ids are refused. See `activity.ts`.
     */
    'activity.set': z.object({ items: activityItemsSchema }),
    'events.emit': z.object({
        extension: z.string().min(1).max(LIMITS.EXTENSION),
        /**
         * Unknown here, and checked against the named extension's own schema by whoever routes it; see
         * `./extensions.js`. So this method can carry an extension this version of the package has
         * never heard of.
         */
        payload: z.unknown(),
    }),
};
/* ------------------------------------------------------------------------ *
 * The answers that are outcomes rather than material
 * ------------------------------------------------------------------------ */
/**
 * What became of a `view.goto`; all three are `ok: true`. `moved`: the reader is now looking at it. `declined`:
 * the host will not, right now. `no-such-target`: no such epic, step or ref. `navigationResult.epic` is where
 * the reader ended up, null when the host did not move or moved within the open epic.
 */
export const NAVIGATION_OUTCOMES = ['moved', 'declined', 'no-such-target'];
export const navigationResult = z.object({
    outcome: z.enum(NAVIGATION_OUTCOMES),
    epic: z.string().regex(EPIC_SLUG).nullable().default(null),
    why: z.string().max(LIMITS.REASON).default(''),
});
/**
 * What became of a `view.fold`; all four are `ok: true`. `changed`: at least one container was folded or
 * unfolded. `unchanged`: every one was already as asked. `declined`: the host will not, right now.
 * `no-such-container`: an id is not on this kehikko, and nothing was changed.
 */
export const FOLD_OUTCOMES = ['changed', 'unchanged', 'declined', 'no-such-container'];
/**
 * `folded` and `unfolded` are what THIS call changed, and nothing it left alone: handed back the
 * other way round (`{ fold: unfolded, unfold: folded }`) they put the canvas as it was. A caller
 * that puts things back leaves out any container whose `folded` in `context.containers` has moved
 * since, because a person moved it.
 */
export const foldResult = z.object({
    outcome: z.enum(FOLD_OUTCOMES),
    folded: z.array(z.string().regex(MODULE_ID)).max(LIMITS.CONTAINERS).default([]),
    unfolded: z.array(z.string().regex(MODULE_ID)).max(LIMITS.CONTAINERS).default([]),
    why: z.string().max(LIMITS.REASON).default(''),
});
/**
 * What became of a `parts.set`; all four are `ok: true`. `changed`: the list is different now. `unchanged`:
 * it already was as asked (the same name, the same place). `declined`: the host will not, and `why` says so
 * (no such epic, the list is full, not now). `no-such-part`: an `id` or an `after` names no part; nothing changed.
 */
export const PARTS_SET_OUTCOMES = ['changed', 'unchanged', 'declined', 'no-such-part'];
/**
 * `parts` is the epic's whole list after the call, in order, whatever the outcome (`[]` when the host
 * has no such epic to answer about). `id` is the part the call was about: for `add`, the id the host
 * made; null when nothing was. A refusal's sentence is `why`, for a person to read.
 */
export const partsSetResult = z.object({
    outcome: z.enum(PARTS_SET_OUTCOMES),
    parts: partListSchema.default([]),
    id: z.string().regex(PART_ID).nullable().default(null),
    why: z.string().max(LIMITS.REASON).default(''),
});
/**
 * What became of an `activity.set`; both are `ok: true`. `taken`: the host holds the list as sent. `declined`:
 * it will not, right now (`why` says so). `taken` is how many items it holds.
 */
export const ACTIVITY_SET_OUTCOMES = ['taken', 'declined'];
export const activitySetResult = z.object({
    outcome: z.enum(ACTIVITY_SET_OUTCOMES),
    taken: z.number().int().min(0).max(LIMITS.ACTIVITY_ITEMS).default(0),
    why: z.string().max(LIMITS.REASON).default(''),
    /**
     * 1.8.0. `true`: this host files each item under the project its `project` names, and holds a list that
     * carries `project` as the module's complete list across every project (an item absent from it is gone
     * wherever it was). A module may then report every project's things from one page. Absent: it does not,
     * and every item is filed under the project open now.
     */
    projects: z.boolean().optional(),
});
/**
 * The least an `epics.list` can answer with. `slug` is required: it is the argument to every other
 * call. `title` and `project` are optional and bounded. Every other field passes through untouched.
 * There is no bound on how many epics come back.
 */
export const epicSpine = z
    .object({
    slug: z.string().regex(EPIC_SLUG),
    title: z.string().max(LIMITS.TITLE).optional(),
    project: z.string().max(LIMITS.PROJECT).nullable().optional(),
})
    .passthrough();
export const epicsListResult = z.object({ epics: z.array(epicSpine) }).passthrough();
/**
 * What became of a `projects.pick`; all three are `ok: true`. `picked`: `project` says which. `cancelled`: the
 * picker was closed without choosing. `declined`: the host would not ask, also its answer when it has no
 * projects. A module treats `cancelled` and `declined` alike; a host keeps its holdings out of `why`.
 */
export const PICK_OUTCOMES = ['picked', 'cancelled', 'declined'];
/**
 * One project, as a host hands it over: the same fields `context` uses for the open project.
 * `path` is absolute and resolved; `name` is what the host calls it and is never a path. `id` (2.1.0)
 * is its `PROJECT_ID`, as `context.projectId`; absent from an older host, and then the path is the key.
 */
export const pickedProject = z.object({
    path: z.string().min(1).max(LIMITS.PATH),
    name: z.string().max(LIMITS.PROJECT).default(''),
    id: z.string().regex(PROJECT_ID).optional(),
});
export const projectPickResult = z.object({
    outcome: z.enum(PICK_OUTCOMES),
    /**
     * Null unless `outcome` is `picked`, and a module should check the outcome
     * rather than the field. A host that filled this in beside `cancelled` would
     * be answering a question nobody was allowed to ask.
     */
    project: pickedProject.nullable().default(null),
    why: z.string().max(LIMITS.REASON).default(''),
});
/**
 * The answers this package describes, by method. Partial: absence means UNSPECIFIED, not empty, so
 * never treat a missing schema as "expects nothing". A plain object: look up with
 * `resultSchemaFor`, never by indexing with a method name from a stranger's program.
 */
export const methodResults = {
    'epics.list': epicsListResult,
    'view.goto': navigationResult,
    'view.fold': foldResult,
    'projects.pick': projectPickResult,
    /**
     * The tracker reading is specified though it is a host's material, and the
     * exception is the reason it exists: two modules showing one ref have to read
     * the same fields to agree about it. See `tracker.ts`.
     */
    'tracker.get': trackerReadingResult,
    'tracker.refresh': trackerRefreshResult,
    'tracker.columns': trackerColumnsResult,
    'parts.set': partsSetResult,
    'activity.set': activitySetResult,
};
/** The schema for one method's answer, or nothing — which means unspecified. */
export function resultSchemaFor(method) {
    return Object.hasOwn(methodResults, method) ? methodResults[method] : undefined;
}
