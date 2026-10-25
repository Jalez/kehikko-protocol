import { z } from 'zod';
import { EPIC_SLUG, MODULE_ID } from './ids.js';
import { LIMITS } from './limits.js';
import { PART_ID } from './parts.js';
/**
 * An epic's plan (2.21.0): its steps, the phases they fall in, what each waits for and the gates that
 * hold it, as ANY module publishes them. `steps.json` in the module's own folder,
 * `{ version, module, epics: { <epic>: Plan } }`, the way `parts.json` publishes what a module holds
 * for parts. A host takes the union of every publisher and answers `steps.list` from it, each step
 * saying which module provides it. No module is named here. Shapes and pure readers only; the file
 * is opened behind `/serve` (`writePlan`, `readPlans`). Design notes: docs/plans.md.
 */
/** The file, in a module's own folder: `moduleFile(projectPath, moduleId, PLAN_FILE)` is `.kehikot/<module>/steps.json`. */
export const PLAN_FILE = 'steps';
/** The format's number, written as `version`. A reader opens a later one and reads what it knows. */
export const PLAN_VERSION = 1;
/**
 * The id of a step, a phase or a gate within one plan: `PART_ID`'s class (lowercase letters, digits
 * and dashes, at most 80), so a step that is one part's step can use the part's id. Unique within its
 * own list of one plan; two modules' plans may use the same id, and a reader keys by `(module, id)`.
 */
export const PLAN_ID = PART_ID;
/**
 * What kind of thing holds a step that is not another step, each with what it means.
 * `ref` is a tracker ref that is not one of this epic's steps — an issue here that is no step's, or a
 * ref another epic owns (`epic` says which); it is done when its row closes, or when marked done.
 */
export const PLAN_GATE_KINDS = {
    decision: 'Somebody has to decide.',
    access: 'Somebody outside the team has to grant something.',
    work: 'Work nobody has filed an issue for yet.',
    ref: 'An issue or change that is not one of these steps — here, or in another epic.',
};
export const PLAN_GATE_KIND_NAMES = Object.keys(PLAN_GATE_KINDS);
const planId = z.string().regex(PLAN_ID, 'an id is lowercase letters, digits and dashes');
const ref = z.string().trim().min(1).max(LIMITS.REF);
const refs = (most) => z.array(ref).max(most).default([]);
const title = z.string().trim().min(1).max(LIMITS.TITLE);
const unique = (list) => new Set(list.map((one) => one.id)).size === list.length;
/** One phase: a labelled section of the plan, in order, left to right. */
export const planPhaseSchema = z.object({ id: planId, title });
/**
 * One gate: what stands in a step's way that is not another step. Listed on every step it holds,
 * under the same `id` each time — the same gate — so a reader drawing gates once keys them by id.
 * A gate on a step that others are `under` holds those too.
 */
export const planGateSchema = z.object({
    id: planId,
    title,
    kind: z.enum(PLAN_GATE_KIND_NAMES),
    /** The tracker ref it is, for `ref`; for another kind, the ref that tracks it, when one does. */
    ref: ref.optional(),
    /** For a `ref` another epic owns: that epic's slug. */
    epic: z.string().regex(EPIC_SLUG).optional(),
    /** Who acts on it: a person or a role, in their words. */
    owner: z.string().trim().min(1).max(LIMITS.PLAN_OWNER).optional(),
    /** Refs that must land before it can be done ("the legal decision waits on !44"). */
    waitsOn: refs(LIMITS.PLAN_AFTER),
    /** Marked done by somebody. A `ref` gate is also done when its row closes, whatever this says. */
    done: z.boolean().default(false),
});
/**
 * One step: something that has to become true. `refs` deliver it (its issue and the changes that do
 * it); `related` are named beside it without delivering it (prior art, context). `under` is the step
 * it is a prerequisite of, absent for the plan's goal; `after` the steps that must be done before it
 * can start. Both name ids of this plan's steps; neither may make a step wait on itself.
 */
export const planStepSchema = z.object({
    id: planId,
    title,
    /** The prose under the title. */
    body: z.string().max(LIMITS.PLAN_BODY).default(''),
    /** The refs that deliver this step. The first tracked one is its issue unless `issue` says. */
    refs: refs(LIMITS.PLAN_STEP_REFS),
    /** The ref that IS this step's issue, when the publisher says which. Also in `refs`. */
    issue: ref.optional(),
    /** Refs named beside the step that do not deliver it: prior art, related work. */
    related: refs(LIMITS.PLAN_STEP_REFS),
    /** The part of the epic this step belongs to (`context.parts` id). Absent: the epic as a whole. */
    part: z.string().regex(PART_ID).optional(),
    /** The step this one is a prerequisite of. Absent: directly under the plan's goal. */
    under: planId.optional(),
    /** The steps that must be done before this one can start. An `after` on a step holds those under it too. */
    after: z.array(planId).max(LIMITS.PLAN_AFTER).default([]),
    /** The phase this step is in. Absent: the phase of the nearest step above it that names one (`phaseOf`). */
    phase: planId.optional(),
    /** What holds it that is not a step. */
    gates: z.array(planGateSchema).max(LIMITS.PLAN_GATES).default([]),
});
/**
 * One module's plan for one epic: the phases in order and the steps in order. `goal` is what the
 * whole of it makes true, `measure` how anybody will know; both optional. A writer is held to this
 * (`writePlan`); a reader uses `planIn`, which drops what it cannot read instead of the whole plan.
 */
export const planSchema = z
    .object({
    goal: z.string().trim().min(1).max(LIMITS.TITLE).optional(),
    measure: z.string().trim().min(1).max(LIMITS.TITLE).optional(),
    phases: z.array(planPhaseSchema).max(LIMITS.PLAN_PHASES).default([]),
    steps: z.array(planStepSchema).max(LIMITS.PLAN_STEPS).default([]),
})
    .refine((plan) => unique(plan.steps), { message: 'two steps of one plan cannot share an id', path: ['steps'] })
    .refine((plan) => unique(plan.phases), { message: 'two phases of one plan cannot share an id', path: ['phases'] });
/**
 * A plan out of anything, or null for a non-object; never throws. Read part by part, so one bad step,
 * phase or gate costs that entry: a step with no usable id or title is left out, an id met twice is
 * the first, and an `under`, `after` or `phase` that names nothing in this plan — or the step itself —
 * is dropped. Bounded as `planSchema` is.
 */
export function planIn(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const { goal, measure, phases, steps } = raw;
    const phaseList = [];
    for (const one of Array.isArray(phases) ? phases : []) {
        if (phaseList.length >= LIMITS.PLAN_PHASES)
            break;
        const parsed = planPhaseSchema.safeParse(one);
        if (parsed.success && !phaseList.some((had) => had.id === parsed.data.id))
            phaseList.push(parsed.data);
    }
    const stepList = [];
    for (const one of Array.isArray(steps) ? steps : []) {
        if (stepList.length >= LIMITS.PLAN_STEPS)
            break;
        const parsed = planStepSchema.safeParse(lenientStep(one));
        if (parsed.success && !stepList.some((had) => had.id === parsed.data.id))
            stepList.push(parsed.data);
    }
    const stepIds = new Set(stepList.map((step) => step.id));
    const phaseIds = new Set(phaseList.map((phase) => phase.id));
    for (const step of stepList) {
        if (step.under !== undefined && (step.under === step.id || !stepIds.has(step.under)))
            delete step.under;
        step.after = [...new Set(step.after.filter((id) => id !== step.id && stepIds.has(id)))];
        if (step.phase !== undefined && !phaseIds.has(step.phase))
            delete step.phase;
    }
    const plan = { phases: phaseList, steps: stepList };
    const said = (value) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, LIMITS.TITLE) : undefined);
    if (said(goal))
        plan.goal = said(goal);
    if (said(measure))
        plan.measure = said(measure);
    return plan;
}
/** A step as written, with its lists read one entry at a time: a bad gate or ref costs that entry, not the step. */
function lenientStep(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return raw;
    const step = { ...raw };
    const kept = (value, one, most) => Array.isArray(value) ? value.flatMap((entry) => { const parsed = one.safeParse(entry); return parsed.success ? [parsed.data] : []; }).slice(0, most) : undefined;
    for (const [key, one, most] of [
        ['refs', ref, LIMITS.PLAN_STEP_REFS],
        ['related', ref, LIMITS.PLAN_STEP_REFS],
        ['after', planId, LIMITS.PLAN_AFTER],
        ['gates', planGateSchema, LIMITS.PLAN_GATES],
    ]) {
        const list = kept(step[key], one, most);
        if (list === undefined)
            delete step[key];
        else
            step[key] = key === 'gates' ? list : [...new Set(list)];
    }
    for (const key of ['issue', 'part', 'under', 'phase']) {
        if (step[key] !== undefined && !(key === 'issue' ? ref : key === 'part' ? z.string().regex(PART_ID) : planId).safeParse(step[key]).success)
            delete step[key];
    }
    if (typeof step.body === 'string' && step.body.length > LIMITS.PLAN_BODY)
        step.body = step.body.slice(0, LIMITS.PLAN_BODY);
    else if (step.body !== undefined && typeof step.body !== 'string')
        delete step.body;
    return step;
}
/**
 * Every epic's plan out of one module's parsed `steps.json`, or `{}`: never throws. An epic key that
 * is not an `EPIC_SLUG` is left out; an epic whose plan is present, even with no steps, is kept —
 * the module has said this epic has none. At most `LIMITS.HOLDINGS_EPICS` epics are read.
 */
export function plansIn(document) {
    const out = {};
    if (!document || typeof document !== 'object' || Array.isArray(document))
        return out;
    const epics = document.epics;
    if (!epics || typeof epics !== 'object' || Array.isArray(epics))
        return out;
    let count = 0;
    for (const [slug, value] of Object.entries(epics)) {
        if (count >= LIMITS.HOLDINGS_EPICS)
            break;
        if (!EPIC_SLUG.test(slug))
            continue;
        const plan = planIn(value);
        if (plan === null)
            continue;
        out[slug] = plan;
        count += 1;
    }
    return out;
}
/**
 * The phase a step is in: the one it names, else the phase of the nearest step above it (`under`)
 * that names one; undefined when none does. Guards against a loop of `under`.
 */
export function phaseOf(plan, stepId) {
    const byId = new Map(plan.steps.map((step) => [step.id, step]));
    const seen = new Set();
    for (let at = byId.get(stepId); at && !seen.has(at.id); at = at.under === undefined ? undefined : byId.get(at.under)) {
        if (at.phase !== undefined)
            return at.phase;
        seen.add(at.id);
    }
    return undefined;
}
/* ------------------------------------------------------------------------ *
 * The union a host answers `steps.list` with
 * ------------------------------------------------------------------------ */
const moduleId = z.string().regex(MODULE_ID);
/** A step as `steps.list` hands it over: the plan's step, and the module that provides it. */
export const providedStepSchema = planStepSchema.extend({ module: moduleId });
/** A phase as `steps.list` hands it over: the plan's phase, and the module whose plan it is in. */
export const providedPhaseSchema = planPhaseSchema.extend({ module: moduleId });
/**
 * One module whose plan is in the answer, with its plan's goal and measure. `fallback: true` when the
 * host read it from somewhere other than the module's `steps.json` — a module from before 2.21.0 that
 * has not published yet — so a reader knows the steps are a host's reading of an older file.
 */
export const stepsProviderSchema = z.object({
    module: moduleId,
    goal: z.string().max(LIMITS.TITLE).optional(),
    measure: z.string().max(LIMITS.TITLE).optional(),
    fallback: z.boolean().optional(),
});
/**
 * `steps.list`'s answer from a 2.21.0 host (`methodResults['steps.list']`): every provider's steps
 * and phases, provider by provider and each in its plan's order, and who the providers are. All three
 * lists are optional because an epic whose steps are kept somewhere no module publishes (`stepsFrom`,
 * a paper's sections) is answered with no `steps` at all: an empty list would say there are none.
 * Everything else passes through. Older hosts answered `{ steps }` with steps of their own shape.
 */
export const stepsListResult = z
    .object({
    steps: z.array(providedStepSchema).max(LIMITS.PLAN_STEPS * LIMITS.HOLDINGS_MODULES).optional(),
    phases: z.array(providedPhaseSchema).optional(),
    providers: z.array(stepsProviderSchema).max(LIMITS.HOLDINGS_MODULES).optional(),
})
    .passthrough();
/**
 * The union of several modules' plans for one epic, in the order given: each step and phase marked
 * with its module, every provider listed once (the first plan given for a module wins). What a host
 * answers `steps.list` with; pure, so two hosts make the same union of the same files.
 */
export function plansUnion(plans) {
    const out = { steps: [], phases: [], providers: [] };
    for (const { module, plan, fallback } of plans) {
        if (!MODULE_ID.test(module) || out.providers.some((one) => one.module === module))
            continue;
        out.providers.push({
            module,
            ...(plan.goal ? { goal: plan.goal } : {}),
            ...(plan.measure ? { measure: plan.measure } : {}),
            ...(fallback ? { fallback: true } : {}),
        });
        for (const phase of plan.phases)
            out.phases.push({ ...phase, module });
        for (const step of plan.steps)
            out.steps.push({ ...step, module });
    }
    return out;
}
