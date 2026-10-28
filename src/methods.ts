import { z } from 'zod'
import { LIMITS } from './limits.js'
import { EPIC_SLUG, MODULE_ID, PROJECT_ID } from './ids.js'
import { gotoRef, placeKehikko, placeParts, ref, stepNumber } from './fragments.js'
import { activityItemsSchema } from './activity.js'
/**
 * `passageSchema` and `filterChoiceSchema` come from `wire.ts` so that both directions share one
 * definition; `wire.ts` imports nothing from here.
 */
import { ADDRESS_INTENTS, DISPOSITIONS, LOCATION_INTENTS, codeLocationSchema, filterChoiceSchema, passageSchema, webAddress } from './wire.js'
import { TRACKER_DETAILS, trackerColumnsResult, trackerReadingResult, trackerRefreshResult } from './tracker.js'
import { PART_ID, partListSchema, partsSchema } from './parts.js'
import { dispositionSchema } from './context.js'
import { stepsListResult } from './plan.js'
import { gotoProject, showAskSchema } from './show.js'
import { trafficNoteResult, trafficNoteSchema, trafficReadResult } from './traffic.js'

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
  /**
   * Read an epic's steps (`steps.list`). From 2.21.0 the answer is the union of every module that
   * publishes a plan (`steps.json`), each step saying which module provides it, with the phases,
   * order and gates the plans say.
   */
  'steps:read': "Read an epic's steps: their titles, bodies, order and phases, what holds them, and the references they name.",
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
   * 2.13.0. Say where in a change's code the person is pointing — a file, a line or lines, a side of
   * the diff — and whether they want to look there or comment there. A SHARED write like
   * `passage:set`: it goes into `context.location` on this kehikko.
   */
  'location:set':
    'Say where in a change’s code the person is pointing — a file and a line — or ask for a comment there. Every module on the canvas is told.',
  /**
   * 2.16.0. Hand a web address to the canvas, for whichever module shows pages to open. A SHARED write
   * like `location:set`: it goes into `context.address` on this kehikko. Names an address and nothing
   * else — not the Browser, not whether one is there. With no such module the host asks the person.
   */
  'address:open':
    'Hand a web address (https:, or this machine) to the canvas to be opened by a module that shows pages. Every module on the canvas is told; with none, you are asked.',
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
  'showing:set':
    'Say what this container is showing — which references, and which places in which documents — so a neighbour '
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
  'activity:report':
    'Say which of the things you run are working, need your attention or have finished, so the host can mark them.',
  /**
   * 2.20.0. Read the host's record of traffic: the calls Kehikot and every module made and received
   * on this computer, and the connections open on their processes. Addresses and reasons, never what
   * a call carried. See `traffic.read` and `traffic.ts`. For a module that shows traffic, and no other.
   */
  'traffic:read':
    'Read the record of the calls Kehikot and its modules make and receive on this computer — when, what kind, to where and why — never what they carried.',
  /**
   * 2.20.0. Add this module's own calls to the host's record, each with its reason. Writes into the
   * host's memory only; read back by a module holding `traffic:read`. See `traffic.note`.
   */
  'traffic:report': 'Note the calls this module makes, each with its reason, in Kehikot’s record of traffic on this computer.',
  /**
   * 2.21.0. Read an epic's parts and what the modules hold for each (`parts.get`): the list every
   * framed page is handed in `context.parts`, asked for by name — what a module's SERVER reads, having
   * no frame to be handed it.
   */
  'parts:read': "Read an epic's parts and what the modules hold for each — the documents and references of every part.",
  /**
   * 2.21.0. Read why closed references closed (`dispositions.get`): the marks every framed page is
   * handed in `context.dispositions`, asked for by name, as a module's server must.
   */
  'dispositions:read': "Read why closed references closed — done, won't do, duplicate or superseded — as every module is shown it.",
} as const

export type Capability = keyof typeof CAPABILITIES
export const CAPABILITY_NAMES = Object.keys(CAPABILITIES) as Capability[]

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
  'location.set': 'location:set',
  'address.open': 'address:open',
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
  /** The record of traffic, from `since` (2.20.0). */
  'traffic.read': 'traffic:read',
  /** A module's own calls, noted with their reasons (2.20.0). */
  'traffic.note': 'traffic:report',
  /** An epic's parts with what the modules hold, as `context.parts` carries them (2.21.0). */
  'parts.get': 'parts:read',
  /** The open project's dispositions, as `context.dispositions` carries them (2.21.0). */
  'dispositions.get': 'dispositions:read',
} as const satisfies Record<string, Capability>

export type Method = keyof typeof METHODS
export const METHOD_NAMES = Object.keys(METHODS) as Method[]

/**
 * An epic slug, as it arrives from somebody else's program. Checked for shape and length, not
 * membership, so it refuses the same way whether or not the epic exists. A host's own "no such
 * epic" must not list the ones that do.
 */
const epic = z.string().regex(EPIC_SLUG, 'an epic slug is lowercase letters, digits and dashes')

/**
 * The three stages a module may report: the three no tracker can see. Every other stage is read
 * from a tracker and is not a module's to write.
 */
export const REPORTED_STAGES = ['working', 'in-review', 'blocked'] as const
export type ReportedStage = (typeof REPORTED_STAGES)[number]


/**
 * Which refs a tracker call is about: exactly one of three. `refs`: these, by spelling, up to `TRACKER_ASK`;
 * asking makes the host read a ref it has not seen before. `epic`: every ref the epic names. `project: true`:
 * everything the host reads for the open project, including each listed source's recent issues and changes.
 */
const trackerScope = {
  refs: z.array(ref).min(1).max(LIMITS.TRACKER_ASK).optional(),
  epic: epic.optional(),
  project: z.literal(true).optional(),
}
/** A part's name as somebody typed it: trimmed, not empty, at most `LIMITS.TITLE`. Refused, not clipped, when longer. */
const partName = z.string().trim().min(1).max(LIMITS.TITLE)
const partId = z.string().regex(PART_ID, 'a part id is lowercase letters, digits and dashes')
/** Where a part goes: right after this part, or first with `null`. Absent means last. */
const after = partId.nullable().optional()

const oneScope = (scope: { refs?: unknown; epic?: unknown; project?: unknown }) =>
  [scope.refs, scope.epic, scope.project].filter((one) => one !== undefined).length === 1
const ONE_SCOPE = 'name exactly one of refs, epic or project'

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
      /**
       * 2.28.0. The project to stand in first: its id (`context.projectId`) or, without one, its
       * absolute folder (`context.projectPath`) — `projectKey`'s key. The host switches to it as the
       * person's own switch does, then goes to the epic, kehikko and parts IN it; one it does not hold
       * is `declined`. With an epic: a project alone names no place in it. Say `project` in
       * `declares.navigates`; a host before 2.28.0 strips it and would go to that epic where it is.
       */
      project: gotoProject.optional(),
      /**
       * 2.28.0. One thing to be shown on the kehikko the move ends on (`showAskSchema`): relayed as
       * `context.show` to the containers there whose manifests say they show `subject`, after a
       * `moved`. Say `show` in `declares.navigates`.
       */
      show: showAskSchema.optional(),
    })
    .refine((g) => g.epic !== undefined || g.step !== undefined || g.ref !== undefined, {
      message: 'view.goto has to name an epic, a step or a ref; a call that names nothing asks for nothing',
    })
    .refine((g) => (g.parts === undefined && g.kehikko === undefined) || g.epic !== undefined, {
      message: 'view.goto: `parts` and `kehikko` go with the `epic` they are in',
    })
    .refine((g) => g.project === undefined || g.epic !== undefined, {
      message: 'view.goto: `project` goes with the `epic` to go to in it',
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
   * 2.13.0. Say where in a change's code the person is pointing; answered with `locationSetResult`. The
   * host relays it into `context.location` on this kehikko, stamped with who pointed and when.
   * `location` is required and nullable: `null` is a real call that clears it. `intent` says why:
   * `show` (absent means `show`) or `comment`. A host takes it only while `location.change` is in
   * `context.selection`: a module pointing into a change nobody picked calls `selection.set` first.
   */
  'location.set': z.object({
    location: codeLocationSchema.nullable(),
    intent: z.enum(LOCATION_INTENTS).optional(),
  }),

  /**
   * 2.16.0. Hand a web address to the canvas; answered with `addressOpenResult`. `url` is held to
   * `addressRefusal` (https:, or http: to this machine; no credentials; at most `LIMITS.URL`), and
   * refused rather than repaired. `title` is what to call the page, when the sender knows. `intent`
   * is `show` (absent means `show`). The host stamps who asked and when into `context.address`, where
   * a module that shows pages (`REACTS_TO.address`) takes it. A tracker ref goes through
   * `selection.set`, not here.
   */
  'address.open': z.object({
    url: webAddress,
    title: z.string().trim().min(1).max(LIMITS.TITLE).optional(),
    intent: z.enum(ADDRESS_INTENTS).optional(),
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
   * `parts: true` (2.19.0), with `epic`: the refs the epic's parts hold as well as the refs the epic
   * names — the list `context.parts` carries — in one answer. A host before 2.19.0 strips it and
   * answers the epic's own refs, so a module that needs the parts' refs from an older host still asks
   * for the ones the answer did not cover.
   */
  'tracker.get': z
    .object({ ...trackerScope, detail: z.enum(TRACKER_DETAILS).default('summary'), parts: z.boolean().optional() })
    .refine(oneScope, { message: ONE_SCOPE })
    .refine((p) => p.detail === 'summary' || p.refs !== undefined, {
      message: 'detail is read a ref at a time, so ask for it by refs',
    })
    .refine((p) => p.parts !== true || p.epic !== undefined, {
      message: "parts are an epic's, so ask for them with epic",
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
  /**
   * 2.20.0. The rows of the host's record of traffic after `since` (a `seq`; 0 for all it keeps),
   * oldest first, at most `limit`. `sample: true` also asks the host to look at its processes'
   * connections, which it does only while such reads keep coming (`processes` in the answer).
   */
  'traffic.read': z.object({
    since: z.number().int().min(0).default(0),
    limit: z.number().int().min(1).max(LIMITS.TRAFFIC_KEPT).default(1000),
    sample: z.boolean().default(false),
  }),
  /**
   * 2.20.0. Calls this module made, each with its reason, added to the host's record as its own
   * (`reported: 'module'`). Sanitize first (`trafficTarget`); the host sanitizes again.
   */
  'traffic.note': z.object({ calls: z.array(trafficNoteSchema).min(1).max(LIMITS.TRAFFIC_NOTE) }),
  /**
   * 2.21.0. An epic's parts, each with what every module holds for it; answered with `partsGetResult`.
   * The same list `context.parts` carries, with `picked` false throughout: picking is a person's,
   * on one screen, and a server asking has none (a conversation's place says its picks).
   */
  'parts.get': z.object({ epic }),
  /** 2.21.0. Every disposition in the project; answered with `dispositionsGetResult`, as `context.dispositions`. */
  'dispositions.get': z.object({}),
} as const satisfies Record<Method, z.ZodTypeAny>

/** The params one method takes, as a caller must construct them. */
export type MethodParams<M extends Method> = z.input<(typeof methodParams)[M]>

/* ------------------------------------------------------------------------ *
 * The answers that are outcomes rather than material
 * ------------------------------------------------------------------------ */

/**
 * What became of a `view.goto`; all three are `ok: true`. `moved`: the reader is now looking at it. `declined`:
 * the host will not, right now. `no-such-target`: no such epic, step or ref. `navigationResult.epic` is where
 * the reader ended up, null when the host did not move or moved within the open epic.
 */
export const NAVIGATION_OUTCOMES = ['moved', 'declined', 'no-such-target'] as const
export type NavigationOutcome = (typeof NAVIGATION_OUTCOMES)[number]

export const navigationResult = z.object({
  outcome: z.enum(NAVIGATION_OUTCOMES),
  epic: z.string().regex(EPIC_SLUG).nullable().default(null),
  why: z.string().max(LIMITS.REASON).default(''),
})
export type NavigationResult = z.infer<typeof navigationResult>

/**
 * What became of a `view.fold`; all four are `ok: true`. `changed`: at least one container was folded or
 * unfolded. `unchanged`: every one was already as asked. `declined`: the host will not, right now.
 * `no-such-container`: an id is not on this kehikko, and nothing was changed.
 */
export const FOLD_OUTCOMES = ['changed', 'unchanged', 'declined', 'no-such-container'] as const
export type FoldOutcome = (typeof FOLD_OUTCOMES)[number]

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
})
export type FoldResult = z.infer<typeof foldResult>

/**
 * What became of a `parts.set`; all four are `ok: true`. `changed`: the list is different now. `unchanged`:
 * it already was as asked (the same name, the same place). `declined`: the host will not, and `why` says so
 * (no such epic, the list is full, not now). `no-such-part`: an `id` or an `after` names no part; nothing changed.
 */
export const PARTS_SET_OUTCOMES = ['changed', 'unchanged', 'declined', 'no-such-part'] as const
export type PartsSetOutcome = (typeof PARTS_SET_OUTCOMES)[number]

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
})
export type PartsSetResult = z.infer<typeof partsSetResult>

/**
 * What became of an `activity.set`; both are `ok: true`. `taken`: the host holds the list as sent. `declined`:
 * it will not, right now (`why` says so). `taken` is how many items it holds.
 */
export const ACTIVITY_SET_OUTCOMES = ['taken', 'declined'] as const
export type ActivitySetOutcome = (typeof ACTIVITY_SET_OUTCOMES)[number]

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
})
export type ActivitySetResult = z.infer<typeof activitySetResult>

/**
 * 2.13.0. What became of a `location.set`; all three are `ok: true`. `taken`: `context.location` is it now
 * (or, for `null`, is cleared). `not-selected`: its change is not in `context.selection`, so the host did
 * not keep it — pick the change with `selection.set` and point again. `declined`: the host will not, right now.
 */
export const LOCATION_SET_OUTCOMES = ['taken', 'not-selected', 'declined'] as const
export type LocationSetOutcome = (typeof LOCATION_SET_OUTCOMES)[number]

export const locationSetResult = z.object({
  outcome: z.enum(LOCATION_SET_OUTCOMES),
  why: z.string().max(LIMITS.REASON).default(''),
})
export type LocationSetResult = z.infer<typeof locationSetResult>

/**
 * 2.16.0. What became of an `address.open`; all three are `ok: true`. `shown`: a module on this kehikko
 * that shows pages has it (`context.address` is it now). `offered`: none does, and the host put the
 * address in front of the person instead — to open it in their own browser, or to add a module that
 * shows pages — so the sender does nothing more. `declined`: the host will not, right now (`why`
 * says so); the sender may fall back to what it did before, on a person's press.
 */
export const ADDRESS_OPEN_OUTCOMES = ['shown', 'offered', 'declined'] as const
export type AddressOpenOutcome = (typeof ADDRESS_OPEN_OUTCOMES)[number]

export const addressOpenResult = z.object({
  outcome: z.enum(ADDRESS_OPEN_OUTCOMES),
  why: z.string().max(LIMITS.REASON).default(''),
})
export type AddressOpenResult = z.infer<typeof addressOpenResult>

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
  .passthrough()
export type EpicSpine = z.infer<typeof epicSpine>

export const epicsListResult = z.object({ epics: z.array(epicSpine) }).passthrough()
export type EpicsListResult = z.infer<typeof epicsListResult>

/** 2.21.0. `parts.get`'s answer: the epic's parts in order, each with what the modules hold (`partsSchema`). */
export const partsGetResult = z.object({ parts: partsSchema })
export type PartsGetResult = z.infer<typeof partsGetResult>

/** 2.21.0. `dispositions.get`'s answer: the project's marks, as `context.dispositions` carries them. */
export const dispositionsGetResult = z.object({ dispositions: z.array(dispositionSchema).max(LIMITS.DISPOSITIONS) })
export type DispositionsGetResult = z.infer<typeof dispositionsGetResult>

/**
 * What became of a `projects.pick`; all three are `ok: true`. `picked`: `project` says which. `cancelled`: the
 * picker was closed without choosing. `declined`: the host would not ask, also its answer when it has no
 * projects. A module treats `cancelled` and `declined` alike; a host keeps its holdings out of `why`.
 */
export const PICK_OUTCOMES = ['picked', 'cancelled', 'declined'] as const
export type PickOutcome = (typeof PICK_OUTCOMES)[number]

/**
 * One project, as a host hands it over: the same fields `context` uses for the open project.
 * `path` is absolute and resolved; `name` is what the host calls it and is never a path. `id` (2.1.0)
 * is its `PROJECT_ID`, as `context.projectId`; absent from an older host, and then the path is the key.
 */
export const pickedProject = z.object({
  path: z.string().min(1).max(LIMITS.PATH),
  name: z.string().max(LIMITS.PROJECT).default(''),
  id: z.string().regex(PROJECT_ID).optional(),
})
export type PickedProject = z.infer<typeof pickedProject>

export const projectPickResult = z.object({
  outcome: z.enum(PICK_OUTCOMES),
  /**
   * Null unless `outcome` is `picked`, and a module should check the outcome
   * rather than the field. A host that filled this in beside `cancelled` would
   * be answering a question nobody was allowed to ask.
   */
  project: pickedProject.nullable().default(null),
  why: z.string().max(LIMITS.REASON).default(''),
})
export type ProjectPickResult = z.infer<typeof projectPickResult>

/**
 * The answers this package describes, by method. Partial: absence means UNSPECIFIED, not empty, so
 * never treat a missing schema as "expects nothing". A plain object: look up with
 * `resultSchemaFor`, never by indexing with a method name from a stranger's program.
 */
export const methodResults: Partial<Record<Method, z.ZodTypeAny>> = {
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
  'location.set': locationSetResult,
  'address.open': addressOpenResult,
  'traffic.read': trafficReadResult,
  'traffic.note': trafficNoteResult,
  /** 2.21.0: the union of every module's plan (`plan.ts`). An older host's answer has no schema here. */
  'steps.list': stepsListResult,
  'parts.get': partsGetResult,
  'dispositions.get': dispositionsGetResult,
}

/** The schema for one method's answer, or nothing — which means unspecified. */
export function resultSchemaFor(method: string): z.ZodTypeAny | undefined {
  return Object.hasOwn(methodResults, method) ? methodResults[method as Method] : undefined
}
