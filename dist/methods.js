import { z } from 'zod';
import { LIMITS } from './limits.js';
import { canonicalName } from './dialect.js';
import { EPIC_SLUG } from './ids.js';
import { gotoRef, ref, stepNumber } from './fragments.js';
/**
 * `passageSchema` and `filterChoiceSchema` come from `wire.ts` so that both directions share one
 * definition; `wire.ts` imports nothing from here.
 */
import { DISPOSITIONS, filterChoiceSchema, passageSchema } from './wire.js';
import { TRACKER_DETAILS, trackerReadingResult, trackerRefreshResult } from './tracker.js';
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
export const CAPABILITIES = {
    'epics:read': 'Read which epics exist, and their titles, ledes and projects.',
    'steps:read': "Read an epic's steps: their titles, bodies and the references they name.",
    'live:read': 'Read what the last refresh found in the trackers for an epic.',
    'stage:report': "Say where work is — working, in review, or blocked — into the host's database.",
    'events:emit': 'Send an extension payload: a notification, a report of its own calls.',
    /** Asks the host to MOVE; reads and writes nothing. See `view.goto`. */
    'view:navigate': 'Ask the host to show a particular epic, step or reference. The host decides.',
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
    'selection.set': 'selection:set',
    'passage.set': 'passage:set',
    'filters.set': 'filters:set',
    'showing.set': 'showing:set',
    'projects.pick': 'projects:pick',
    'state.set': 'state:keep',
    'disposition.set': 'disposition:set',
    'tracker.get': 'trackers:read',
    'tracker.refresh': 'trackers:refresh',
    'content.changed': 'content:report',
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
    })
        .refine((g) => g.epic !== undefined || g.step !== undefined || g.ref !== undefined, {
        message: 'view.goto has to name an epic, a step or a ref; a call that names nothing asks for nothing',
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
     * This module's own material changed, for this epic or, with no epic, for no one epic in particular. The host
     * tells every container in the project through `context.content`, the caller's included. Whose material and
     * `at` are the host's facts, not params. Report AFTER the write has landed.
     */
    'content.changed': z.object({ epic: epic.optional() }),
    'events.emit': z.object({
        /* Canonical once parsed, whichever spelling the module used. See `dialect.ts`. */
        extension: z.string().min(1).max(LIMITS.EXTENSION).transform(canonicalName),
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
 * One project, as a host hands it over: the same two fields `context` uses for the open project.
 * `path` is absolute and resolved; `name` is what the host calls it and is never a path.
 */
export const pickedProject = z.object({
    path: z.string().min(1).max(LIMITS.PATH),
    name: z.string().max(LIMITS.PROJECT).default(''),
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
    'projects.pick': projectPickResult,
    /**
     * The tracker reading is specified though it is a host's material, and the
     * exception is the reason it exists: two modules showing one ref have to read
     * the same fields to agree about it. See `tracker.ts`.
     */
    'tracker.get': trackerReadingResult,
    'tracker.refresh': trackerRefreshResult,
};
/** The schema for one method's answer, or nothing — which means unspecified. */
export function resultSchemaFor(method) {
    return Object.hasOwn(methodResults, method) ? methodResults[method] : undefined;
}
