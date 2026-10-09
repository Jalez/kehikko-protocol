import { z } from 'zod';
import { LIMITS } from './limits.js';
import { trackerSignalSchema } from './tracker.js';
import { contentSignalSchema } from './content.js';
import { EPIC_SLUG, MODULE_ID } from './ids.js';
import { partsSchema } from './parts.js';
import { passageSchema } from './passage.js';
import { filterChoiceSchema } from './filters.js';
import { kehikkoSchema, ref } from './fragments.js';
/* ------------------------------------------------------------------------ *
 * Dispositions: why a reference closed, in a person's words
 * ------------------------------------------------------------------------ */
/**
 * What a closed reference came to: the four answers people give for why it closed. Open to
 * extension: a module meeting a value it does not know treats the ref as closed for a reason it cannot name.
 */
export const DISPOSITIONS = ['done', 'wont-do', 'duplicate', 'superseded'];
/**
 * One person's verdict on one reference, as the host holds it. Marks only: what a tracker says is
 * derived by `deriveDisposition` in `facets.ts`, where a mark wins. `target` is the other ref for
 * `duplicate` (of it) and `superseded` (by it), else null; `by` (who) and `at` (ISO time) are the host's.
 */
export const dispositionSchema = z.object({
    ref,
    value: z.enum(DISPOSITIONS),
    target: ref.nullable().default(null),
    note: z.string().max(LIMITS.SUMMARY).default(''),
    by: z.string().max(LIMITS.NAME).nullable().default(null),
    at: z.string().max(LIMITS.NAME).nullable().default(null),
});
/* ------------------------------------------------------------------------ *
 * Containers: what is arranged on the kehikko, what each shows, which are aimed at
 * ------------------------------------------------------------------------ */
/**
 * What one container says it is showing. Module → host with `showing.set`, re-sent when the answer
 * changes, including to nothing. The host cannot check it and relays it unchanged, attributed to
 * the container that said it; a consumer treats it as that container's word.
 */
export const showingSchema = z.object({
    /** The references this container is showing. The same strings `selection` carries. */
    refs: z.array(ref).max(LIMITS.REFS).default([]),
    /** The places in documents it is showing, at whatever precision it has. `quoted` should be empty. */
    documents: z.array(passageSchema).max(LIMITS.SHOWING_DOCUMENTS).default([]),
});
/**
 * One container on the kehikko: which module, whether it is picked out, and what it is showing.
 * Every container is listed, with `showing` empty for one that has said nothing. The host may fold
 * the current `passage` and `selection` into their setter's row. `module` is the module's id.
 */
export const containerSchema = z.object({
    module: z.string().regex(MODULE_ID),
    /** Whether this container is picked out as a target on this kehikko. The host's own fact. */
    selected: z.boolean().default(false),
    /** What it says it is showing, or nothing. Never absent, for the reason `filters` is `{}` and not missing. */
    showing: showingSchema.default({}),
});
/**
 * What a module is told about where the reader is standing: the host's own knowledge of the open
 * epic and project. `epic` is null when none is open. Fields are null or empty rather than absent,
 * so a module can move into "none".
 */
export const contextSchema = z.object({
    epic: z.string().regex(EPIC_SLUG).nullable().default(null),
    /** What the project is called: the name a module puts on screen, not a path. */
    project: z.string().max(LIMITS.PROJECT).nullable().default(null),
    /**
     * Where the project is: an absolute folder path on the host's machine, which this package cannot
     * check. Null when the host has no folder to point at: a module may name the project and must not
     * pretend to open it. A host should fill this and `project` in one place, from one project.
     */
    projectPath: z.string().min(1).max(LIMITS.PATH).nullable().default(null),
    theme: z.enum(['light', 'dark']).default('light'),
    /**
     * The refs the person has picked out; `[]` when nothing is selected. A module asks the host to set
     * it with `selection.set` and the host tells everyone. Refs only: what kind each is does not travel.
     */
    selection: z.array(ref).max(LIMITS.REFS).default([]),
    /**
     * Where in a document the reader is pointing. Null when no document is open, which is also what
     * a host that has never heard of passages sends.
     */
    passage: passageSchema.nullable().default(null),
    /**
     * Whether this module has been pinned. `true` means it keeps what it was last told, and further
     * changes to this canvas do not reach it until this goes false. A context is still sent when the
     * pin changes, in both directions.
     */
    pinned: z.boolean().default(false),
    /**
     * What this canvas has been told to tell this module: one string the host composes from everything
     * aimed at it, for a module declaring `prompt` in its manifest. Null when there is no prompt for it.
     */
    prompt: z.string().max(LIMITS.PROMPT).nullable().default(null),
    /**
     * Which kehikko (canvas) this context is about. Null when the host has no canvases; compare with
     * an event's `kehikko` to tell near from far.
     */
    kehikko: kehikkoSchema.nullable().default(null),
    /**
     * Which of the filters this module offered are currently chosen for it, per container. `{}` when
     * nothing is narrowed. For an id it does not recognise a module uses its own default for that
     * group and says nothing: the first choice it receives may predate what it now offers.
     */
    filters: filterChoiceSchema.default({}),
    /**
     * Every container on this kehikko, broadcast whole to every frame; see `containerSchema`. `[]` when
     * the host says nothing about containers. When none is picked out, everything is in front of the person;
     * when some are, only the union of what those show, and a consumer lets the person turn that off.
     */
    containers: z.array(containerSchema).max(LIMITS.CONTAINERS).default([]),
    /**
     * Why the open project's closed references closed, where a person has said. Per project, not per
     * canvas; only people's marks travel (see `dispositionSchema`). `[]` when nobody has said anything.
     * A module declaring `reacts: ['dispositions']` moves when it changes.
     */
    dispositions: z.array(dispositionSchema).max(LIMITS.DISPOSITIONS).default([]),
    /**
     * When the open project's shared tracker reading last changed, and whether a read is in flight: the
     * signal, not the reading (rows stay behind `tracker.get`). Per project. A module declaring
     * `reacts: ['tracker']` re-asks `tracker.get` when `at` changes and draws busy while `refreshing`.
     */
    tracker: trackerSignalSchema.default({}),
    /**
     * What has changed in the material kept for the open project's epics: the last change per source
     * and epic. The signal, not the material. Per project; a module declaring `reacts: ['content']`
     * re-reads what it shows when the entries for it move.
     */
    content: contentSignalSchema.default([]),
    /**
     * The parts of the open epic, and which the person has picked out; see `parts.ts`. `[]` when
     * nothing is narrowed. No module sets it; it belongs to the epic, not a kehikko. With parts picked
     * a module shows what `refInFocus`, `partInFocus` and `fileInFocus` admit, and says it has narrowed.
     */
    parts: partsSchema.default([]),
});
