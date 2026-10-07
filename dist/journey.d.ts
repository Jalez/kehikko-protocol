import { z } from 'zod';
/**
 * An epic's steps and groups, as a project keeps them — and whose they are.
 *
 * ## The decision this file records
 *
 * Every epic used to exist twice in a project. A host kept a file per epic,
 * `.kehikot/kehikko/epics/<slug>.json`, and answered `epics.list`, `epic.get`,
 * `steps.list`, `context.parts` and the tracker scope out of it. The Journeys
 * module kept `.kehikot/journeys/journeys.json`, and that is where a step was
 * actually edited. Nothing kept the two in step, and in one real project they
 * had already come apart: nine steps in the host's copy and twelve in
 * Journeys'. A module that re-asked the host after Journeys changed a step was
 * answered out of the stale one, correctly, with nothing to indicate it.
 *
 * So the owner decided, and this is the decision rather than a reading of it:
 *
 * - **Journeys owns the steps, the groups (which a host reads as an epic's
 *   parts) and the prose around them.**
 * - **A host owns the epic's slug, its title, and whether it exists.**
 * - A host reads the steps and the groups from Journeys' file on disk, and
 *   falls back to what it holds itself when the project has no record under
 *   that slug — which includes a project where Journeys was never installed.
 *
 * ## Why the shape is here, and not in either of them
 *
 * A host reading another program's file is a host parsing a private format,
 * and the day that program reorganised its file the host would go on reading
 * the old shape, find nothing, and fall back to its own copy without a word.
 * That is the failure above with one more step in it. The alternative to a
 * private format is a shared one, and this package is where the two programs
 * already agree on things: so the shape of the record is written here, once,
 * and both the writer and the reader import it.
 *
 * `ids.ts` used to say this package "deliberately says nothing" about a
 * journey — "not its name, not its shape, not its bounds" — and for the wire
 * that is still exactly true: no message names a journey, and `context` still
 * names an epic and a project and nothing a module told the host. What changed
 * is narrower. One module's record of an epic's steps is now something a host
 * reads off the disk, and two programs reading one file have to spell it the
 * same way.
 *
 * ## What is modelled, and what is only carried
 *
 * Only what a host has to read to answer the questions it already answers:
 * the slug, the title, the lede and the project a list is drawn from; the
 * steps; the groups; where the steps come from when they are not here; and
 * the three lists a host counts for an epic's size. Everything else Journeys
 * keeps in a record — the callout, what blocks what, the quizzes that are the
 * Learning module's — is Journeys' own, and this package has no opinion about
 * it.
 *
 * **But nothing is dropped.** Every object below is `.passthrough()`: a field
 * this version has never heard of comes out of a parse exactly as it went in.
 * That is not politeness. A writer newer than this reader will add fields, and
 * a reader that stripped them would hand a host an `epic.get` with part of
 * somebody's document missing — and a WRITER that parsed with a stripping
 * schema before saving would delete them from the file. `part` and a group's
 * `id` are the standing example: a store that parsed a step as `{ title,
 * body, refs, notes }` and wrote the result back would unassign every step in
 * the project on the first save.
 *
 * ## Nothing here is bounded, and that is deliberate
 *
 * Everything else in this package bounds every string, because everything
 * else in this package crosses a wire from a stranger. This is a document a
 * person wrote, in their own repository, and a reader that refused a record
 * because one step's title ran past a number would be a host declining to
 * show somebody their own work. The bounds bite where something is put ON the
 * wire — `partsSchema`, `LIMITS.PART_REFS` — and on the writer's own door.
 *
 * ## Still shapes, and still no I/O
 *
 * Nothing in this file opens anything. `journeyIn` is handed a parsed
 * document. The few lines that read the file are behind `/serve`, with the
 * rest of what touches the machine; see `serve/journeys.ts`.
 */
/**
 * The module that keeps the record, and the file it keeps it in.
 *
 * Spelled here because a reader has to name both, and a host that spelled
 * `'kehikot.journeys'` itself would be the second place it was written.
 * `moduleFile(projectPath, JOURNEYS_MODULE, JOURNEYS_FILE)` is the path:
 * `<project>/.kehikot/journeys/journeys.json`.
 */
export declare const JOURNEYS_MODULE = "kehikot.journeys";
export declare const JOURNEYS_FILE = "journeys";
/**
 * One step.
 *
 * `part` is the id of the part the step was ASSIGNED to, and it is optional —
 * see `parts.ts` for why a step says which part it is in rather than having
 * it worked out from its refs. It is a plain string here and not a `PART_ID`,
 * on purpose: one hand-edited step with a stray capital in its `part` must
 * not make the whole record unreadable. `stepPart` is how it is read, and
 * anything that is not an id is no assignment.
 */
export declare const journeyStepSchema: z.ZodObject<{
    title: z.ZodString;
    body: z.ZodDefault<z.ZodString>;
    /** Issues and changes that deliver this step. */
    refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Free-text chips for work with no ticket. */
    notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** The part this step was assigned to. Absent means the epic as a whole. */
    part: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    title: z.ZodString;
    body: z.ZodDefault<z.ZodString>;
    /** Issues and changes that deliver this step. */
    refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Free-text chips for work with no ticket. */
    notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** The part this step was assigned to. Absent means the epic as a whole. */
    part: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    title: z.ZodString;
    body: z.ZodDefault<z.ZodString>;
    /** Issues and changes that deliver this step. */
    refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Free-text chips for work with no ticket. */
    notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** The part this step was assigned to. Absent means the epic as a whole. */
    part: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export type JourneyStep = z.infer<typeof journeyStepSchema>;
/**
 * One group: a heading and the references under it. A host reads it as a PART
 * of the epic.
 *
 * `id` is what a step's `part` and a stored focus name, so that the heading is
 * free to be reworded. Optional, because every group written before parts has
 * none and a host derives one from the heading; see `parts.ts`. A plain string
 * for the reason `part` is one.
 *
 * `files` is the files of the epic's paper this part owns, each named RELATIVE
 * TO THE PAPER'S FOLDER, `<project>/.kehikot/paper/<slug>/`, with forward
 * slashes and its extension: `parts/posting-seam.tex`. See `partFile` in
 * `parts.ts` for the form and for why it is that one. Optional and not
 * defaulted, so a writer that parses a record and saves it does not write an
 * empty list onto every group that never had one. Plain strings here, for the
 * reason `id` is one: a name somebody mistyped costs that name, in `partsOf`,
 * and not the record.
 */
export declare const journeyGroupSchema: z.ZodObject<{
    heading: z.ZodDefault<z.ZodString>;
    refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    id: z.ZodOptional<z.ZodString>;
    /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
    files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    heading: z.ZodDefault<z.ZodString>;
    refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    id: z.ZodOptional<z.ZodString>;
    /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
    files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    heading: z.ZodDefault<z.ZodString>;
    refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    id: z.ZodOptional<z.ZodString>;
    /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
    files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, z.ZodTypeAny, "passthrough">>;
export type JourneyGroup = z.infer<typeof journeyGroupSchema>;
/**
 * Where an epic's steps are, when they are not in the record.
 *
 * Some epics are written as a paper, and their steps are the paper's sections,
 * projected out of LaTeX by a program that can read it. The record for one of
 * those carries `"steps": []`, and that array does not mean there are none.
 * See `stepsOf`, which is the only honest way to read it.
 */
export declare const stepsFromSchema: z.ZodObject<{
    /** What does the projecting. `paper` is the only one there has been. */
    projector: z.ZodString;
    /** Where the source is, as a person would go and look at it. */
    where: z.ZodString;
    /** Said on screen, in the record's own words. */
    why: z.ZodDefault<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    /** What does the projecting. `paper` is the only one there has been. */
    projector: z.ZodString;
    /** Where the source is, as a person would go and look at it. */
    where: z.ZodString;
    /** Said on screen, in the record's own words. */
    why: z.ZodDefault<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    /** What does the projecting. `paper` is the only one there has been. */
    projector: z.ZodString;
    /** Where the source is, as a person would go and look at it. */
    where: z.ZodString;
    /** Said on screen, in the record's own words. */
    why: z.ZodDefault<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export type StepsFrom = z.infer<typeof stepsFromSchema>;
/**
 * The record for one epic.
 *
 * `slug` is the epic's slug and nothing else: the host's `epic` and this
 * `slug` are one name for one thing, which is why it is `EPIC_SLUG` and not a
 * pattern of this file's own.
 */
export declare const journeyRecordSchema: z.ZodObject<{
    slug: z.ZodString;
    title: z.ZodString;
    /** The one-line answer to "what is this about". */
    lede: z.ZodDefault<z.ZodString>;
    /** The product this belongs to, as a person would name it. */
    project: z.ZodOptional<z.ZodString>;
    /** The tracking issue that stands for the whole of it. */
    umbrella: z.ZodOptional<z.ZodString>;
    steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        body: z.ZodDefault<z.ZodString>;
        /** Issues and changes that deliver this step. */
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Free-text chips for work with no ticket. */
        notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The part this step was assigned to. Absent means the epic as a whole. */
        part: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        title: z.ZodString;
        body: z.ZodDefault<z.ZodString>;
        /** Issues and changes that deliver this step. */
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Free-text chips for work with no ticket. */
        notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The part this step was assigned to. Absent means the epic as a whole. */
        part: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        title: z.ZodString;
        body: z.ZodDefault<z.ZodString>;
        /** Issues and changes that deliver this step. */
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Free-text chips for work with no ticket. */
        notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The part this step was assigned to. Absent means the epic as a whole. */
        part: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    /** See `stepsFromSchema`. Absent means the steps here are the steps. */
    stepsFrom: z.ZodOptional<z.ZodObject<{
        /** What does the projecting. `paper` is the only one there has been. */
        projector: z.ZodString;
        /** Where the source is, as a person would go and look at it. */
        where: z.ZodString;
        /** Said on screen, in the record's own words. */
        why: z.ZodDefault<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** What does the projecting. `paper` is the only one there has been. */
        projector: z.ZodString;
        /** Where the source is, as a person would go and look at it. */
        where: z.ZodString;
        /** Said on screen, in the record's own words. */
        why: z.ZodDefault<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** What does the projecting. `paper` is the only one there has been. */
        projector: z.ZodString;
        /** Where the source is, as a person would go and look at it. */
        where: z.ZodString;
        /** Said on screen, in the record's own words. */
        why: z.ZodDefault<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>>;
    groups: z.ZodDefault<z.ZodArray<z.ZodObject<{
        heading: z.ZodDefault<z.ZodString>;
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        id: z.ZodOptional<z.ZodString>;
        /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
        files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        heading: z.ZodDefault<z.ZodString>;
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        id: z.ZodOptional<z.ZodString>;
        /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
        files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        heading: z.ZodDefault<z.ZodString>;
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        id: z.ZodOptional<z.ZodString>;
        /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
        files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    /** "What already exists". Counted, with `steps` and `open`, for an epic's size. */
    exists: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** "Still open". */
    open: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    slug: z.ZodString;
    title: z.ZodString;
    /** The one-line answer to "what is this about". */
    lede: z.ZodDefault<z.ZodString>;
    /** The product this belongs to, as a person would name it. */
    project: z.ZodOptional<z.ZodString>;
    /** The tracking issue that stands for the whole of it. */
    umbrella: z.ZodOptional<z.ZodString>;
    steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        body: z.ZodDefault<z.ZodString>;
        /** Issues and changes that deliver this step. */
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Free-text chips for work with no ticket. */
        notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The part this step was assigned to. Absent means the epic as a whole. */
        part: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        title: z.ZodString;
        body: z.ZodDefault<z.ZodString>;
        /** Issues and changes that deliver this step. */
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Free-text chips for work with no ticket. */
        notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The part this step was assigned to. Absent means the epic as a whole. */
        part: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        title: z.ZodString;
        body: z.ZodDefault<z.ZodString>;
        /** Issues and changes that deliver this step. */
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Free-text chips for work with no ticket. */
        notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The part this step was assigned to. Absent means the epic as a whole. */
        part: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    /** See `stepsFromSchema`. Absent means the steps here are the steps. */
    stepsFrom: z.ZodOptional<z.ZodObject<{
        /** What does the projecting. `paper` is the only one there has been. */
        projector: z.ZodString;
        /** Where the source is, as a person would go and look at it. */
        where: z.ZodString;
        /** Said on screen, in the record's own words. */
        why: z.ZodDefault<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** What does the projecting. `paper` is the only one there has been. */
        projector: z.ZodString;
        /** Where the source is, as a person would go and look at it. */
        where: z.ZodString;
        /** Said on screen, in the record's own words. */
        why: z.ZodDefault<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** What does the projecting. `paper` is the only one there has been. */
        projector: z.ZodString;
        /** Where the source is, as a person would go and look at it. */
        where: z.ZodString;
        /** Said on screen, in the record's own words. */
        why: z.ZodDefault<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>>;
    groups: z.ZodDefault<z.ZodArray<z.ZodObject<{
        heading: z.ZodDefault<z.ZodString>;
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        id: z.ZodOptional<z.ZodString>;
        /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
        files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        heading: z.ZodDefault<z.ZodString>;
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        id: z.ZodOptional<z.ZodString>;
        /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
        files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        heading: z.ZodDefault<z.ZodString>;
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        id: z.ZodOptional<z.ZodString>;
        /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
        files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    /** "What already exists". Counted, with `steps` and `open`, for an epic's size. */
    exists: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** "Still open". */
    open: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    slug: z.ZodString;
    title: z.ZodString;
    /** The one-line answer to "what is this about". */
    lede: z.ZodDefault<z.ZodString>;
    /** The product this belongs to, as a person would name it. */
    project: z.ZodOptional<z.ZodString>;
    /** The tracking issue that stands for the whole of it. */
    umbrella: z.ZodOptional<z.ZodString>;
    steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        body: z.ZodDefault<z.ZodString>;
        /** Issues and changes that deliver this step. */
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Free-text chips for work with no ticket. */
        notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The part this step was assigned to. Absent means the epic as a whole. */
        part: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        title: z.ZodString;
        body: z.ZodDefault<z.ZodString>;
        /** Issues and changes that deliver this step. */
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Free-text chips for work with no ticket. */
        notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The part this step was assigned to. Absent means the epic as a whole. */
        part: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        title: z.ZodString;
        body: z.ZodDefault<z.ZodString>;
        /** Issues and changes that deliver this step. */
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Free-text chips for work with no ticket. */
        notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The part this step was assigned to. Absent means the epic as a whole. */
        part: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    /** See `stepsFromSchema`. Absent means the steps here are the steps. */
    stepsFrom: z.ZodOptional<z.ZodObject<{
        /** What does the projecting. `paper` is the only one there has been. */
        projector: z.ZodString;
        /** Where the source is, as a person would go and look at it. */
        where: z.ZodString;
        /** Said on screen, in the record's own words. */
        why: z.ZodDefault<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        /** What does the projecting. `paper` is the only one there has been. */
        projector: z.ZodString;
        /** Where the source is, as a person would go and look at it. */
        where: z.ZodString;
        /** Said on screen, in the record's own words. */
        why: z.ZodDefault<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        /** What does the projecting. `paper` is the only one there has been. */
        projector: z.ZodString;
        /** Where the source is, as a person would go and look at it. */
        where: z.ZodString;
        /** Said on screen, in the record's own words. */
        why: z.ZodDefault<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>>;
    groups: z.ZodDefault<z.ZodArray<z.ZodObject<{
        heading: z.ZodDefault<z.ZodString>;
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        id: z.ZodOptional<z.ZodString>;
        /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
        files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        heading: z.ZodDefault<z.ZodString>;
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        id: z.ZodOptional<z.ZodString>;
        /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
        files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        heading: z.ZodDefault<z.ZodString>;
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        id: z.ZodOptional<z.ZodString>;
        /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
        files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>, "many">>;
    /** "What already exists". Counted, with `steps` and `open`, for an epic's size. */
    exists: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** "Still open". */
    open: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, z.ZodTypeAny, "passthrough">>;
export type JourneyRecord = z.infer<typeof journeyRecordSchema>;
/**
 * The whole file: every record in one project, keyed by slug.
 *
 * This is what a WRITER checks before it saves. A reader does not use it —
 * see `journeyIn` — because a reader asked about one epic must not be refused
 * over a different one.
 *
 * `version` is read loosely: a document from a later version is opened rather
 * than refused, because every field this version knows is still where it was
 * and refusing would leave somebody unable to read their own work with the
 * older program they happen to be running.
 */
export declare const journeysDocumentSchema: z.ZodObject<{
    version: z.ZodDefault<z.ZodNumber>;
    journeys: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        slug: z.ZodString;
        title: z.ZodString;
        /** The one-line answer to "what is this about". */
        lede: z.ZodDefault<z.ZodString>;
        /** The product this belongs to, as a person would name it. */
        project: z.ZodOptional<z.ZodString>;
        /** The tracking issue that stands for the whole of it. */
        umbrella: z.ZodOptional<z.ZodString>;
        steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** See `stepsFromSchema`. Absent means the steps here are the steps. */
        stepsFrom: z.ZodOptional<z.ZodObject<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>>;
        groups: z.ZodDefault<z.ZodArray<z.ZodObject<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** "What already exists". Counted, with `steps` and `open`, for an epic's size. */
        exists: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** "Still open". */
        open: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        slug: z.ZodString;
        title: z.ZodString;
        /** The one-line answer to "what is this about". */
        lede: z.ZodDefault<z.ZodString>;
        /** The product this belongs to, as a person would name it. */
        project: z.ZodOptional<z.ZodString>;
        /** The tracking issue that stands for the whole of it. */
        umbrella: z.ZodOptional<z.ZodString>;
        steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** See `stepsFromSchema`. Absent means the steps here are the steps. */
        stepsFrom: z.ZodOptional<z.ZodObject<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>>;
        groups: z.ZodDefault<z.ZodArray<z.ZodObject<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** "What already exists". Counted, with `steps` and `open`, for an epic's size. */
        exists: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** "Still open". */
        open: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        slug: z.ZodString;
        title: z.ZodString;
        /** The one-line answer to "what is this about". */
        lede: z.ZodDefault<z.ZodString>;
        /** The product this belongs to, as a person would name it. */
        project: z.ZodOptional<z.ZodString>;
        /** The tracking issue that stands for the whole of it. */
        umbrella: z.ZodOptional<z.ZodString>;
        steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** See `stepsFromSchema`. Absent means the steps here are the steps. */
        stepsFrom: z.ZodOptional<z.ZodObject<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>>;
        groups: z.ZodDefault<z.ZodArray<z.ZodObject<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** "What already exists". Counted, with `steps` and `open`, for an epic's size. */
        exists: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** "Still open". */
        open: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    version: z.ZodDefault<z.ZodNumber>;
    journeys: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        slug: z.ZodString;
        title: z.ZodString;
        /** The one-line answer to "what is this about". */
        lede: z.ZodDefault<z.ZodString>;
        /** The product this belongs to, as a person would name it. */
        project: z.ZodOptional<z.ZodString>;
        /** The tracking issue that stands for the whole of it. */
        umbrella: z.ZodOptional<z.ZodString>;
        steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** See `stepsFromSchema`. Absent means the steps here are the steps. */
        stepsFrom: z.ZodOptional<z.ZodObject<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>>;
        groups: z.ZodDefault<z.ZodArray<z.ZodObject<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** "What already exists". Counted, with `steps` and `open`, for an epic's size. */
        exists: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** "Still open". */
        open: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        slug: z.ZodString;
        title: z.ZodString;
        /** The one-line answer to "what is this about". */
        lede: z.ZodDefault<z.ZodString>;
        /** The product this belongs to, as a person would name it. */
        project: z.ZodOptional<z.ZodString>;
        /** The tracking issue that stands for the whole of it. */
        umbrella: z.ZodOptional<z.ZodString>;
        steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** See `stepsFromSchema`. Absent means the steps here are the steps. */
        stepsFrom: z.ZodOptional<z.ZodObject<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>>;
        groups: z.ZodDefault<z.ZodArray<z.ZodObject<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** "What already exists". Counted, with `steps` and `open`, for an epic's size. */
        exists: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** "Still open". */
        open: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        slug: z.ZodString;
        title: z.ZodString;
        /** The one-line answer to "what is this about". */
        lede: z.ZodDefault<z.ZodString>;
        /** The product this belongs to, as a person would name it. */
        project: z.ZodOptional<z.ZodString>;
        /** The tracking issue that stands for the whole of it. */
        umbrella: z.ZodOptional<z.ZodString>;
        steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** See `stepsFromSchema`. Absent means the steps here are the steps. */
        stepsFrom: z.ZodOptional<z.ZodObject<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>>;
        groups: z.ZodDefault<z.ZodArray<z.ZodObject<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** "What already exists". Counted, with `steps` and `open`, for an epic's size. */
        exists: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** "Still open". */
        open: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    version: z.ZodDefault<z.ZodNumber>;
    journeys: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        slug: z.ZodString;
        title: z.ZodString;
        /** The one-line answer to "what is this about". */
        lede: z.ZodDefault<z.ZodString>;
        /** The product this belongs to, as a person would name it. */
        project: z.ZodOptional<z.ZodString>;
        /** The tracking issue that stands for the whole of it. */
        umbrella: z.ZodOptional<z.ZodString>;
        steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** See `stepsFromSchema`. Absent means the steps here are the steps. */
        stepsFrom: z.ZodOptional<z.ZodObject<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>>;
        groups: z.ZodDefault<z.ZodArray<z.ZodObject<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** "What already exists". Counted, with `steps` and `open`, for an epic's size. */
        exists: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** "Still open". */
        open: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        slug: z.ZodString;
        title: z.ZodString;
        /** The one-line answer to "what is this about". */
        lede: z.ZodDefault<z.ZodString>;
        /** The product this belongs to, as a person would name it. */
        project: z.ZodOptional<z.ZodString>;
        /** The tracking issue that stands for the whole of it. */
        umbrella: z.ZodOptional<z.ZodString>;
        steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** See `stepsFromSchema`. Absent means the steps here are the steps. */
        stepsFrom: z.ZodOptional<z.ZodObject<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>>;
        groups: z.ZodDefault<z.ZodArray<z.ZodObject<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** "What already exists". Counted, with `steps` and `open`, for an epic's size. */
        exists: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** "Still open". */
        open: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        slug: z.ZodString;
        title: z.ZodString;
        /** The one-line answer to "what is this about". */
        lede: z.ZodDefault<z.ZodString>;
        /** The product this belongs to, as a person would name it. */
        project: z.ZodOptional<z.ZodString>;
        /** The tracking issue that stands for the whole of it. */
        umbrella: z.ZodOptional<z.ZodString>;
        steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            title: z.ZodString;
            body: z.ZodDefault<z.ZodString>;
            /** Issues and changes that deliver this step. */
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Free-text chips for work with no ticket. */
            notes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** The part this step was assigned to. Absent means the epic as a whole. */
            part: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** See `stepsFromSchema`. Absent means the steps here are the steps. */
        stepsFrom: z.ZodOptional<z.ZodObject<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            /** What does the projecting. `paper` is the only one there has been. */
            projector: z.ZodString;
            /** Where the source is, as a person would go and look at it. */
            where: z.ZodString;
            /** Said on screen, in the record's own words. */
            why: z.ZodDefault<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>>;
        groups: z.ZodDefault<z.ZodArray<z.ZodObject<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            heading: z.ZodDefault<z.ZodString>;
            refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            id: z.ZodOptional<z.ZodString>;
            /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
            files: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, z.ZodTypeAny, "passthrough">>, "many">>;
        /** "What already exists". Counted, with `steps` and `open`, for an epic's size. */
        exists: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** "Still open". */
        open: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>>>;
}, z.ZodTypeAny, "passthrough">>;
export type JourneysDocument = z.infer<typeof journeysDocumentSchema>;
/**
 * The record for one epic out of a parsed document, or null.
 *
 * ## Null is "nothing here to read", and it never throws
 *
 * Null for a document that is not one — `null`, a string, an array, an object
 * with no `journeys` — for a slug that is not a slug, for a slug the document
 * has no record under, and for a record that will not parse. A caller that
 * gets null falls back to whatever it holds itself, and that is the same
 * action in every one of those cases, which is why they are one answer.
 *
 * ## One record at a time
 *
 * The document is not parsed whole. A reader asked about `the-posting-seam`
 * looks at that one record, so a different epic with a step somebody left
 * without a title costs that epic its record and no other. The module that
 * owns the file may well refuse all of it and say so on its own page — it is
 * about to write the file back, and must not write over what it could not
 * read. A reader writes nothing and has no such reason.
 *
 * ## It asks the object, never its prototype
 *
 * `journeys` is keyed by a string somebody chose, and the pattern is no
 * protection: `constructor` is eleven lowercase letters and matches
 * `EPIC_SLUG`. So the lookup is `Object.hasOwn` and nothing else; see the
 * essay on `MODULE_ID`.
 *
 * ## The key is the name
 *
 * A record filed under one slug and calling itself another is not handed over
 * under either. Two names for one record is exactly the disagreement this file
 * exists to end, and guessing which was meant would bring it back.
 */
export declare function journeyIn(document: unknown, slug: string): JourneyRecord | null;
/** Every slug a parsed document has a readable record under, sorted. */
export declare function journeySlugs(document: unknown): string[];
/**
 * What a record can honestly say about its steps.
 *
 * Three answers and not two, and the middle one is why this is a function
 * rather than `record.steps`:
 *
 * - `stored` — the steps are here, and they are the steps. `alsoProjected` is
 *   set when something else projects a different set from a paper beside
 *   them; the stored ones are still real and still the answer.
 * - `elsewhere` — there ARE steps, kept somewhere this record's reader cannot
 *   see. **Never "none".** A host that answered `steps.list` with `[]` here
 *   would be reporting an epic with twenty sections as having no steps, which
 *   is a bug a host in this workspace has already had once.
 * - `none` — nobody has written any. Genuinely none.
 *
 * An empty array cannot tell the last two apart, and they send a reader to
 * opposite places. So: read `stepsOf(record)`, never `record.steps`, wherever
 * the answer is going to be shown or counted.
 */
export type JourneySteps = {
    kind: 'stored';
    steps: JourneyStep[];
    alsoProjected: StepsFrom | null;
} | {
    kind: 'elsewhere';
    from: StepsFrom;
} | {
    kind: 'none';
};
export declare function stepsOf(record: Pick<JourneyRecord, 'steps' | 'stepsFrom'>): JourneySteps;
/**
 * The part a step says it is in, or null.
 *
 * Read off whatever is there, because a step is somebody's JSON: anything
 * that is not a `PART_ID` is no assignment, and the step belongs to the epic
 * as a whole. Whether the id names a part the epic still HAS is a second
 * question, and `partInFocus` answers it.
 */
export declare function stepPart(step: unknown): string | null;
/**
 * One part of an epic, as it is read off the epic's record.
 *
 * `EpicPart` in `parts.ts` is what goes on the wire, and carries `picked`,
 * which is a fact about a person and not about a record. This is the reading
 * underneath it: the same `id`, `heading` and `refs`, and a count of the steps
 * that say they are in the part, which a picker draws and the wire has no use
 * for.
 */
export interface JourneyPart {
    id: string;
    heading: string;
    /** The refs listed under the heading, and the refs of the steps assigned here. */
    refs: string[];
    /** How many steps say they are in this part. */
    steps: number;
    /**
     * The files of the epic's paper this part owns, in `partFile`'s form.
     *
     * ABSENT when the group names none — not `[]`. Every reading made before a
     * part could own a file is `{ id, heading, refs, steps }` exactly, and it
     * stays exactly that for a record that says nothing about files. Read it as
     * `part.files ?? []`; that is what goes on the wire.
     */
    files?: string[];
}
/**
 * The id of the part each group is, in the groups' own positions.
 *
 * One entry per entry of `groups`, so `ids[i]` is the id of `groups[i]` —
 * and `null` where that entry is not a part at all: something that is not an
 * object, or a group past `LIMITS.PARTS`. `[]` for anything that is not an
 * array.
 *
 * ## Where an id comes from
 *
 * A group that carries an `id` in `PART_ID`'s class is called that. One that
 * does not — every group written before parts existed — is called
 * `slugFrom(heading)`, so every record already on disk has ids without
 * anybody editing it, stable for as long as the heading is.
 *
 * Two groups that come out with one id are told apart by a suffix — `-2`,
 * `-3` — in the record's order, and a heading with nothing usable in it
 * becomes `part-<n>`, where `n` is the group's position counted from one.
 * Both are better than dropping a group: a part that vanished from a picker
 * is exactly the silent hiding parts exist to avoid.
 *
 * ## Why the positions are kept
 *
 * `partsOf` wants the parts and has no use for the gaps. The program that
 * edits the record does: the day it assigns a step to a part whose group has
 * no `id` written, it writes the derived id onto THAT group, so the heading
 * is free to be reworded from then on — and it has to know which group that
 * is. An id written that way is the one this function would have derived, so
 * writing it changes nothing any reader sees.
 *
 * ## One derivation, and it does not move
 *
 * A host derives these to compose `context.parts`; the Journeys module derives
 * them to check a step's `part` and to draw which part a step is in. Those
 * must be one function or they will one day be two answers, and the ids it has
 * produced are already in files and in stored focuses. See `slugFrom`.
 */
export declare function partIdsOf(groups: unknown): (string | null)[];
/**
 * Every part an epic has, in the record's order.
 *
 * ## A part is a group, read
 *
 * A record has always had `groups: [{ heading, refs }]`. A part is not a new
 * idea beside that — it IS a group, with an id (`partIdsOf`), one level deep.
 *
 * ## A step says which part it is in
 *
 * `steps[].part` is the id of a part. A step is in a part because it says so
 * and for no other reason — not because it names a ref the part lists. A step
 * with no `part`, or one naming a part the record does not have, belongs to
 * the epic as a whole and is counted nowhere here.
 *
 * What an assignment does is fold the step's refs into its part's `refs`, once
 * each, after the ones listed under the heading. That is one fact projected
 * into a second place by one function, and it is what lets a module that knows
 * only references narrow correctly without learning what a step is.
 *
 * ## It takes anything, and nothing here throws
 *
 * `unknown`, and not `JourneyRecord`, although a parsed record is what it is
 * for. A host falls back to a file of its own when a project has no record,
 * and that file is whatever somebody left in it: the same derivation has to
 * read both, or the fallback would be a second derivation. So junk costs the
 * entry it is in and nothing else — a group that is not an object is skipped,
 * a ref that is not a short string is dropped — and `[]` is the answer for a
 * record with no `groups` and for anything that is not a record at all.
 *
 * ## Bounded, because this is what goes on the wire
 *
 * At `LIMITS.PARTS` parts and `LIMITS.PART_REFS` refs each, a heading at
 * `LIMITS.TITLE` and a ref at `LIMITS.REF`: the list goes out in a context
 * broadcast to every frame. What is past a bound is not in the answer; the
 * record is where the whole of it is. A part with no heading is called by its
 * id, so that there is always something to draw.
 *
 * ## The files a part owns
 *
 * A group may carry `files`, the files of the epic's paper that are this
 * part's. They come out under `files` in `partFile`'s form — relative to the
 * paper's folder, forward slashes, once each, at most `LIMITS.PART_FILES` —
 * and a name that is not in that form (an absolute path, a `..`, a backslash)
 * is dropped like any other junk. Unlike refs, NOTHING is folded in from the
 * steps: a step names no file. The key is absent when a group names none; see
 * `JourneyPart`.
 */
export declare function partsOf(record: unknown): JourneyPart[];
//# sourceMappingURL=journey.d.ts.map