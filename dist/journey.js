import { z } from 'zod';
import { LIMITS } from './limits.js';
import { EPIC_SLUG, slugFrom } from './ids.js';
import { PART_ID, partFile } from './parts.js';
import { PLAN_ID, PLAN_GATE_KIND_NAMES, planIn } from './plan.js';
import { readTrackerRef } from './tracker.js';
/**
 * @deprecated 2.21.0, as where an epic's STEPS are. Steps are a holding any module publishes —
 * `steps.json`, `planSchema` in `plan.ts` — and a host answers `steps.list` from the union of every
 * publisher. Nothing new should read this file's shape; `planOfJourney` turns a record into a plan
 * for the move. Kept, and unchanged, until 3.0.
 *
 * An epic's steps and groups as a project keeps them, in the Journeys module's file a host reads.
 * Journeys owns the steps and the prose; a host owns the slug, the title, existence and, from 1.2.0,
 * the list of the epic's parts (`listedPartSchema` in `parts.ts`), which `groups` used to be read as.
 * Every object is `.passthrough()` and nothing is bounded; shapes only, no I/O.
 * Design notes: docs/parts.md.
 */
/**
 * The module that keeps the record, and the file it keeps it in:
 * `moduleFile(projectPath, JOURNEYS_MODULE, JOURNEYS_FILE)` is `<project>/.kehikot/journeys/journeys.json`.
 * @deprecated 1.2.0, as where an epic's PARTS are: a part names no module, and nothing about parts
 * should spell this id. 2.21.0, as where its STEPS are: a host reads every module's `steps.json`
 * (`readPlans`) and this file only as a fallback for a Journeys that has not published one yet.
 * Kept, and unchanged, until 3.0.
 */
export const JOURNEYS_MODULE = 'kehikot.journeys';
export const JOURNEYS_FILE = 'journeys';
const ref = z.string().min(1);
/**
 * One step. `part` is the id of the part the step was assigned to; a plain string, not a `PART_ID`,
 * so one mistyped `part` does not make the record unreadable. Read it with `stepPart`.
 */
export const journeyStepSchema = z
    .object({
    title: z.string().min(1),
    body: z.string().default(''),
    /** Issues and changes that deliver this step. */
    refs: z.array(ref).default([]),
    /** Free-text chips for work with no ticket. */
    notes: z.array(z.string()).default([]),
    /** The part this step was assigned to. Absent means the epic as a whole. */
    part: z.string().optional(),
})
    .passthrough();
/**
 * One group: a heading and the references under it; a host reads it as a part of the epic. `id` is
 * what a step's `part` and a stored focus name; optional, and derived from the heading when absent.
 * `id` and `files` are plain strings: a mistyped one costs that name, not the record.
 */
export const journeyGroupSchema = z
    .object({
    heading: z.string().default(''),
    refs: z.array(ref).default([]),
    id: z.string().optional(),
    /** The paper's files this part owns, relative to the paper's folder. Absent means none. */
    files: z.array(z.string()).optional(),
})
    .passthrough();
/**
 * Where an epic's steps are, when they are not in the record (a paper's sections, say). Such a record
 * carries `"steps": []`, which does not mean there are none; read it with `stepsOf`.
 */
export const stepsFromSchema = z
    .object({
    /** What does the projecting. `paper` is the only one there has been. */
    projector: z.string().min(1),
    /** Where the source is, as a person would go and look at it. */
    where: z.string().min(1),
    /** Said on screen, in the record's own words. */
    why: z.string().default(''),
})
    .passthrough();
/**
 * The record for one epic. `slug` is the epic's slug: the same name as the host's `epic`.
 * @deprecated 2.21.0: an epic's steps are a plan (`planSchema`), published by whichever module keeps them.
 */
export const journeyRecordSchema = z
    .object({
    slug: z.string().regex(EPIC_SLUG),
    title: z.string().min(1),
    /** The one-line answer to "what is this about". */
    lede: z.string().default(''),
    /** The product this belongs to, as a person would name it. */
    project: z.string().optional(),
    /** The tracking issue that stands for the whole of it. */
    umbrella: z.string().optional(),
    steps: z.array(journeyStepSchema).default([]),
    /** See `stepsFromSchema`. Absent means the steps here are the steps. */
    stepsFrom: stepsFromSchema.optional(),
    groups: z.array(journeyGroupSchema).default([]),
    /** "What already exists". Counted, with `steps` and `open`, for an epic's size. */
    exists: z.array(z.string()).default([]),
    /** "Still open". */
    open: z.array(z.string()).default([]),
})
    .passthrough();
/**
 * The whole file: every record in one project, keyed by slug. What a writer checks before it saves;
 * a reader uses `journeyIn` instead. A document with a later `version` is opened, not refused.
 */
export const journeysDocumentSchema = z
    .object({
    version: z.number().int().min(1).default(1),
    journeys: z.record(z.string(), journeyRecordSchema).default({}),
})
    .passthrough();
/**
 * The record for one epic out of a parsed document, or null; never throws. Null for a non-document, a
 * slug that is not a slug, no own record under it, a record that will not parse, or one whose `slug`
 * differs from its key. Only that one record is parsed, so another epic's bad record costs nothing here.
 */
export function journeyIn(document, slug) {
    if (typeof slug !== 'string' || !EPIC_SLUG.test(slug))
        return null;
    if (!document || typeof document !== 'object' || Array.isArray(document))
        return null;
    const journeys = document.journeys;
    if (!journeys || typeof journeys !== 'object' || Array.isArray(journeys))
        return null;
    if (!Object.hasOwn(journeys, slug))
        return null;
    const parsed = journeyRecordSchema.safeParse(journeys[slug]);
    if (!parsed.success || parsed.data.slug !== slug)
        return null;
    return parsed.data;
}
/** Every slug a parsed document has a readable record under, sorted. */
export function journeySlugs(document) {
    if (!document || typeof document !== 'object' || Array.isArray(document))
        return [];
    const journeys = document.journeys;
    if (!journeys || typeof journeys !== 'object' || Array.isArray(journeys))
        return [];
    return Object.keys(journeys)
        .filter((slug) => journeyIn(document, slug) !== null)
        .sort();
}
export function stepsOf(record) {
    if (record.steps.length)
        return { kind: 'stored', steps: record.steps, alsoProjected: record.stepsFrom ?? null };
    if (record.stepsFrom)
        return { kind: 'elsewhere', from: record.stepsFrom };
    return { kind: 'none' };
}
/**
 * The part a step says it is in, or null: anything that is not a `PART_ID` is no assignment. Whether
 * the epic still has that part is `partInFocus`'s question.
 */
export function stepPart(step) {
    if (!step || typeof step !== 'object')
        return null;
    const part = step.part;
    return typeof part === 'string' && PART_ID.test(part) ? part : null;
}
/** Files out of whatever a group holds under `files`: each in `partFile`'s form, once each, bounded. */
function filesIn(raw) {
    if (!Array.isArray(raw))
        return [];
    const out = [];
    for (const one of raw) {
        const file = partFile(one);
        if (file === null || out.includes(file))
            continue;
        out.push(file);
        if (out.length >= LIMITS.PART_FILES)
            break;
    }
    return out;
}
/** Refs out of whatever a file holds under `refs`: short non-empty strings, once each. */
function refsIn(raw) {
    if (!Array.isArray(raw))
        return [];
    const out = [];
    for (const one of raw) {
        if (typeof one !== 'string')
            continue;
        const ref = one.trim();
        if (!ref || ref.length > LIMITS.REF || out.includes(ref))
            continue;
        out.push(ref);
    }
    return out;
}
/**
 * The id of each group's part, by position: `ids[i]` is for `groups[i]`, null where the entry is not an
 * object or is past `LIMITS.PARTS`; `[]` for a non-array. A written `id` in `PART_ID`'s class is used,
 * else `slugFrom(heading)`, else `part-<n>` (position from one); duplicates get `-2`, `-3` in order.
 * @deprecated 1.2.0, with `partsOf`: for adopting a record's `groups` once. A new part's id is `partIdFor`'s.
 */
export function partIdsOf(groups) {
    if (!Array.isArray(groups))
        return [];
    const ids = [];
    const taken = new Set();
    groups.forEach((group, index) => {
        if (taken.size >= LIMITS.PARTS || !group || typeof group !== 'object') {
            ids.push(null);
            return;
        }
        const { id: written, heading: said } = group;
        const heading = typeof said === 'string' ? said.trim().slice(0, LIMITS.TITLE) : '';
        const wanted = typeof written === 'string' && PART_ID.test(written) ? written : slugFrom(heading) || `part-${index + 1}`;
        let id = wanted;
        for (let n = 2; taken.has(id); n += 1)
            id = `${wanted.slice(0, 76)}-${n}`;
        taken.add(id);
        ids.push(id);
    });
    return ids;
}
/**
 * Every part an epic has, in the record's order; takes anything, never throws, `[]` for a non-record.
 * A step is in a part only because its `part` names it; its refs are folded in after the listed ones.
 * Bounded by `LIMITS.PARTS`, `PART_REFS`, `PART_FILES`, `TITLE`, `REF`; an empty heading becomes the id.
 * @deprecated 1.2.0. An epic's parts are the list in the epic's own file, and what each holds is read
 * with `readHoldings`. Kept, and unchanged: it is how a host adopts the list of an epic that has none yet.
 */
export function partsOf(record) {
    if (!record || typeof record !== 'object')
        return [];
    const { groups, steps } = record;
    if (!Array.isArray(groups))
        return [];
    const parts = [];
    partIdsOf(groups).forEach((id, index) => {
        if (id === null)
            return;
        const { heading: said, refs, files } = groups[index];
        const heading = typeof said === 'string' ? said.trim().slice(0, LIMITS.TITLE) : '';
        const part = { id, heading: heading || id, refs: refsIn(refs), steps: 0 };
        const owned = filesIn(files);
        if (owned.length)
            part.files = owned;
        parts.push(part);
    });
    /* The steps that say which part they are in bring their refs with them. */
    if (Array.isArray(steps)) {
        const byId = new Map(parts.map((part) => [part.id, part]));
        for (const step of steps) {
            const assigned = stepPart(step);
            const part = assigned === null ? undefined : byId.get(assigned);
            if (!part)
                continue;
            part.steps += 1;
            for (const ref of refsIn(step.refs)) {
                if (!part.refs.includes(ref))
                    part.refs.push(ref);
            }
        }
    }
    for (const part of parts)
        part.refs = part.refs.slice(0, LIMITS.PART_REFS);
    return parts;
}
/* ------------------------------------------------------------------------ *
 * The move to plans (2.21.0)
 * ------------------------------------------------------------------------ */
const textOf = (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
const stringsOf = (value) => Array.isArray(value) ? [...new Set(value.map(textOf).filter((one) => one !== undefined))] : [];
/** A gate kind of the record's, as a plan says it: an issue or a ref another epic owns is a `ref`; an unknown kind is work. */
function gateKindOf(kind) {
    if (kind === 'issue' || kind === 'ref-elsewhere')
        return 'ref';
    return typeof kind === 'string' && PLAN_GATE_KIND_NAMES.includes(kind) ? kind : 'work';
}
/** What a ref is to a step, from its `roles`: anything but `prior-art` and `related` delivers it. */
function deliversStep(step, ref) {
    const roles = step.roles;
    if (!roles || typeof roles !== 'object' || Array.isArray(roles) || !Object.hasOwn(roles, ref))
        return true;
    const role = roles[ref];
    return role !== 'prior-art' && role !== 'related';
}
/**
 * A Journeys record as a plan (2.21.0), for the move from this file to `steps.json`: what a host reads
 * as the fallback for a Journeys that has not published yet, and what Journeys can publish with
 * `writePlan`. Takes anything and never throws; null for a non-record and for one whose steps are kept
 * elsewhere (`stepsFrom`), which is not "none".
 *
 * - A step's id is its part's (`stepPart`), else `step-<position>`, told apart with `-2`, `-3`.
 * - `refs` are the refs that deliver it (its `roles` do not call them prior art or related), and
 *   `related` the rest; `issue` is kept when it is a ref.
 * - `under`, `after` and `phase` are kept where they name a step or phase of the record.
 * - Its gates are the record's gates its `blockedBy` names, and those that hold a ref delivering it
 *   (the record's own `blockedBy`, ref → gate ids). `issue` and `ref-elsewhere` gates are `ref` gates;
 *   `state: 'done'` is `done`.
 * - The record's `phases`, `goal` and `measure` come across as they are.
 * @deprecated 2.21.0, with this file: for the migration only, and removed in 3.0.
 */
export function planOfJourney(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record))
        return null;
    const r = record;
    const steps = Array.isArray(r.steps) ? r.steps.filter((one) => !!one && typeof one === 'object' && !Array.isArray(one)) : [];
    if (!steps.length && r.stepsFrom && typeof r.stepsFrom === 'object' && stepsFromSchema.safeParse(r.stepsFrom).success)
        return null;
    /* The record's gates, read loosely: one with no id or title is not a gate. */
    const gates = new Map();
    for (const one of Array.isArray(r.gates) ? r.gates : []) {
        if (!one || typeof one !== 'object')
            continue;
        const id = textOf(one.id);
        if (id && PLAN_ID.test(id) && textOf(one.title) && !gates.has(id))
            gates.set(id, one);
    }
    const heldRefs = r.blockedBy && typeof r.blockedBy === 'object' && !Array.isArray(r.blockedBy) ? r.blockedBy : {};
    /* Ids first, so `under` and `after` can be read against them. */
    const taken = new Set();
    const ids = steps.map((step, i) => {
        const wanted = stepPart(step) ?? `step-${i + 1}`;
        let id = wanted;
        for (let n = 2; taken.has(id); n += 1)
            id = `${wanted.slice(0, 76)}-${n}`;
        taken.add(id);
        return id;
    });
    const byPart = new Map();
    steps.forEach((step, i) => {
        const part = stepPart(step);
        if (part && !byPart.has(part))
            byPart.set(part, ids[i]);
    });
    const idOf = (value) => {
        const said = textOf(value);
        return said === undefined ? undefined : (byPart.get(said) ?? (taken.has(said) ? said : undefined));
    };
    const plan = planIn({
        goal: textOf(r.goal),
        measure: textOf(r.measure),
        phases: Array.isArray(r.phases) ? r.phases : [],
        steps: steps.map((step, i) => {
            const all = stringsOf(step.refs);
            const delivering = all.filter((one) => deliversStep(step, one));
            const holding = [
                ...stringsOf(step.blockedBy),
                ...delivering.flatMap((one) => (Object.hasOwn(heldRefs, one) ? stringsOf(heldRefs[one]) : [])),
            ].filter((id, at, list) => list.indexOf(id) === at && gates.has(id) && readTrackerRef(id) === null);
            return {
                id: ids[i],
                title: textOf(step.title) ?? ids[i],
                body: typeof step.body === 'string' ? step.body : '',
                refs: delivering,
                related: all.filter((one) => !delivering.includes(one)),
                ...(textOf(step.issue) ? { issue: textOf(step.issue) } : {}),
                ...(stepPart(step) ? { part: stepPart(step) } : {}),
                ...(idOf(step.under) ? { under: idOf(step.under) } : {}),
                after: stringsOf(step.after).map(idOf).filter((one) => one !== undefined),
                ...(textOf(step.phase) ? { phase: textOf(step.phase) } : {}),
                gates: holding.map((id) => {
                    const gate = gates.get(id);
                    return {
                        id,
                        title: textOf(gate.title),
                        kind: gateKindOf(gate.kind),
                        ...(textOf(gate.ref) ? { ref: textOf(gate.ref) } : {}),
                        ...(textOf(gate.epic) ? { epic: textOf(gate.epic) } : {}),
                        ...(textOf(gate.owner) ? { owner: textOf(gate.owner) } : {}),
                        waitsOn: stringsOf(gate.waitsOn),
                        done: gate.state === 'done',
                    };
                }),
            };
        }),
    });
    return plan;
}
