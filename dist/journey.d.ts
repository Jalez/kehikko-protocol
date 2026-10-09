import { z } from 'zod';
/**
 * An epic's steps and groups as a project keeps them, in the Journeys module's file a host reads.
 * Journeys owns the steps, the groups and the prose; a host owns the slug, the title and existence.
 * Every object is `.passthrough()` and nothing is bounded; shapes only, no I/O.
 * Design notes: docs/parts.md.
 */
/**
 * The module that keeps the record, and the file it keeps it in:
 * `moduleFile(projectPath, JOURNEYS_MODULE, JOURNEYS_FILE)` is `<project>/.kehikot/journeys/journeys.json`.
 */
export declare const JOURNEYS_MODULE = "kehikot.journeys";
export declare const JOURNEYS_FILE = "journeys";
/**
 * One step. `part` is the id of the part the step was assigned to; a plain string, not a `PART_ID`,
 * so one mistyped `part` does not make the record unreadable. Read it with `stepPart`.
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
 * One group: a heading and the references under it; a host reads it as a part of the epic. `id` is
 * what a step's `part` and a stored focus name; optional, and derived from the heading when absent.
 * `id` and `files` are plain strings: a mistyped one costs that name, not the record.
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
 * Where an epic's steps are, when they are not in the record (a paper's sections, say). Such a record
 * carries `"steps": []`, which does not mean there are none; read it with `stepsOf`.
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
/** The record for one epic. `slug` is the epic's slug: the same name as the host's `epic`. */
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
 * The whole file: every record in one project, keyed by slug. What a writer checks before it saves;
 * a reader uses `journeyIn` instead. A document with a later `version` is opened, not refused.
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
 * The record for one epic out of a parsed document, or null; never throws. Null for a non-document, a
 * slug that is not a slug, no own record under it, a record that will not parse, or one whose `slug`
 * differs from its key. Only that one record is parsed, so another epic's bad record costs nothing here.
 */
export declare function journeyIn(document: unknown, slug: string): JourneyRecord | null;
/** Every slug a parsed document has a readable record under, sorted. */
export declare function journeySlugs(document: unknown): string[];
/**
 * What a record says about its steps: `stored` (they are here; `alsoProjected` set when a paper also
 * projects some), `elsewhere` (there are steps this reader cannot see; never "none"), or `none`.
 * Read `stepsOf(record)`, never `record.steps`, wherever the answer is shown or counted.
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
 * The part a step says it is in, or null: anything that is not a `PART_ID` is no assignment. Whether
 * the epic still has that part is `partInFocus`'s question.
 */
export declare function stepPart(step: unknown): string | null;
/**
 * One part of an epic, as read off the epic's record: `EpicPart`'s `id`, `heading` and `refs` without
 * `picked`, plus a count of the steps that say they are in the part.
 */
export interface JourneyPart {
    id: string;
    heading: string;
    /** The refs listed under the heading, and the refs of the steps assigned here. */
    refs: string[];
    /** How many steps say they are in this part. */
    steps: number;
    /**
     * The files of the epic's paper this part owns, in `partFile`'s form. Absent, not `[]`, when the
     * group names none; read it as `part.files ?? []`.
     */
    files?: string[];
}
/**
 * The id of each group's part, by position: `ids[i]` is for `groups[i]`, null where the entry is not an
 * object or is past `LIMITS.PARTS`; `[]` for a non-array. A written `id` in `PART_ID`'s class is used,
 * else `slugFrom(heading)`, else `part-<n>` (position from one); duplicates get `-2`, `-3` in order.
 */
export declare function partIdsOf(groups: unknown): (string | null)[];
/**
 * Every part an epic has, in the record's order; takes anything, never throws, `[]` for a non-record.
 * A step is in a part only because its `part` names it; its refs are folded in after the listed ones.
 * Bounded by `LIMITS.PARTS`, `PART_REFS`, `PART_FILES`, `TITLE`, `REF`; an empty heading becomes the id.
 */
export declare function partsOf(record: unknown): JourneyPart[];
//# sourceMappingURL=journey.d.ts.map