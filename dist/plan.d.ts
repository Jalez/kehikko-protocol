import { z } from 'zod';
/**
 * An epic's plan (2.21.0): its steps, the phases they fall in, what each waits for and the gates that
 * hold it, as ANY module publishes them. `steps.json` in the module's own folder,
 * `{ version, module, epics: { <epic>: Plan } }`, the way `parts.json` publishes what a module holds
 * for parts. A host takes the union of every publisher and answers `steps.list` from it, each step
 * saying which module provides it. No module is named here. Shapes and pure readers only; the file
 * is opened behind `/serve` (`writePlan`, `readPlans`). Design notes: docs/plans.md.
 */
/** The file, in a module's own folder: `moduleFile(projectPath, moduleId, PLAN_FILE)` is `.kehikot/<module>/steps.json`. */
export declare const PLAN_FILE = "steps";
/** The format's number, written as `version`. A reader opens a later one and reads what it knows. */
export declare const PLAN_VERSION = 1;
/**
 * The id of a step, a phase or a gate within one plan: `PART_ID`'s class (lowercase letters, digits
 * and dashes, at most 80), so a step that is one part's step can use the part's id. Unique within its
 * own list of one plan; two modules' plans may use the same id, and a reader keys by `(module, id)`.
 */
export declare const PLAN_ID: RegExp;
/**
 * What kind of thing holds a step that is not another step, each with what it means.
 * `ref` is a tracker ref that is not one of this epic's steps — an issue here that is no step's, or a
 * ref another epic owns (`epic` says which); it is done when its row closes, or when marked done.
 */
export declare const PLAN_GATE_KINDS: {
    readonly decision: "Somebody has to decide.";
    readonly access: "Somebody outside the team has to grant something.";
    readonly work: "Work nobody has filed an issue for yet.";
    readonly ref: "An issue or change that is not one of these steps — here, or in another epic.";
};
export type PlanGateKind = keyof typeof PLAN_GATE_KINDS;
export declare const PLAN_GATE_KIND_NAMES: PlanGateKind[];
/** One phase: a labelled section of the plan, in order, left to right. */
export declare const planPhaseSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
}, {
    id: string;
    title: string;
}>;
export type PlanPhase = z.infer<typeof planPhaseSchema>;
/**
 * One gate: what stands in a step's way that is not another step. Listed on every step it holds,
 * under the same `id` each time — the same gate — so a reader drawing gates once keys them by id.
 * A gate on a step that others are `under` holds those too.
 */
export declare const planGateSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    kind: z.ZodEnum<["ref" | "decision" | "access" | "work", ...("ref" | "decision" | "access" | "work")[]]>;
    /** The tracker ref it is, for `ref`; for another kind, the ref that tracks it, when one does. */
    ref: z.ZodOptional<z.ZodString>;
    /** For a `ref` another epic owns: that epic's slug. */
    epic: z.ZodOptional<z.ZodString>;
    /** Who acts on it: a person or a role, in their words. */
    owner: z.ZodOptional<z.ZodString>;
    /** Refs that must land before it can be done ("the legal decision waits on !44"). */
    waitsOn: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** Marked done by somebody. A `ref` gate is also done when its row closes, whatever this says. */
    done: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    done: boolean;
    title: string;
    kind: "ref" | "decision" | "access" | "work";
    waitsOn: string[];
    epic?: string | undefined;
    ref?: string | undefined;
    owner?: string | undefined;
}, {
    id: string;
    title: string;
    kind: "ref" | "decision" | "access" | "work";
    epic?: string | undefined;
    done?: boolean | undefined;
    ref?: string | undefined;
    owner?: string | undefined;
    waitsOn?: string[] | undefined;
}>;
export type PlanGate = z.infer<typeof planGateSchema>;
/**
 * One step: something that has to become true. `refs` deliver it (its issue and the changes that do
 * it); `related` are named beside it without delivering it (prior art, context). `under` is the step
 * it is a prerequisite of, absent for the plan's goal; `after` the steps that must be done before it
 * can start. Both name ids of this plan's steps; neither may make a step wait on itself.
 */
export declare const planStepSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    /** The prose under the title. */
    body: z.ZodDefault<z.ZodString>;
    /** The refs that deliver this step. The first tracked one is its issue unless `issue` says. */
    refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** The ref that IS this step's issue, when the publisher says which. Also in `refs`. */
    issue: z.ZodOptional<z.ZodString>;
    /** Refs named beside the step that do not deliver it: prior art, related work. */
    related: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** The part of the epic this step belongs to (`context.parts` id). Absent: the epic as a whole. */
    part: z.ZodOptional<z.ZodString>;
    /** The step this one is a prerequisite of. Absent: directly under the plan's goal. */
    under: z.ZodOptional<z.ZodString>;
    /** The steps that must be done before this one can start. An `after` on a step holds those under it too. */
    after: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** The phase this step is in. Absent: the phase of the nearest step above it that names one (`phaseOf`). */
    phase: z.ZodOptional<z.ZodString>;
    /** What holds it that is not a step. */
    gates: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        kind: z.ZodEnum<["ref" | "decision" | "access" | "work", ...("ref" | "decision" | "access" | "work")[]]>;
        /** The tracker ref it is, for `ref`; for another kind, the ref that tracks it, when one does. */
        ref: z.ZodOptional<z.ZodString>;
        /** For a `ref` another epic owns: that epic's slug. */
        epic: z.ZodOptional<z.ZodString>;
        /** Who acts on it: a person or a role, in their words. */
        owner: z.ZodOptional<z.ZodString>;
        /** Refs that must land before it can be done ("the legal decision waits on !44"). */
        waitsOn: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Marked done by somebody. A `ref` gate is also done when its row closes, whatever this says. */
        done: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        done: boolean;
        title: string;
        kind: "ref" | "decision" | "access" | "work";
        waitsOn: string[];
        epic?: string | undefined;
        ref?: string | undefined;
        owner?: string | undefined;
    }, {
        id: string;
        title: string;
        kind: "ref" | "decision" | "access" | "work";
        epic?: string | undefined;
        done?: boolean | undefined;
        ref?: string | undefined;
        owner?: string | undefined;
        waitsOn?: string[] | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    refs: string[];
    title: string;
    body: string;
    related: string[];
    after: string[];
    gates: {
        id: string;
        done: boolean;
        title: string;
        kind: "ref" | "decision" | "access" | "work";
        waitsOn: string[];
        epic?: string | undefined;
        ref?: string | undefined;
        owner?: string | undefined;
    }[];
    issue?: string | undefined;
    part?: string | undefined;
    under?: string | undefined;
    phase?: string | undefined;
}, {
    id: string;
    title: string;
    refs?: string[] | undefined;
    body?: string | undefined;
    issue?: string | undefined;
    part?: string | undefined;
    related?: string[] | undefined;
    under?: string | undefined;
    after?: string[] | undefined;
    phase?: string | undefined;
    gates?: {
        id: string;
        title: string;
        kind: "ref" | "decision" | "access" | "work";
        epic?: string | undefined;
        done?: boolean | undefined;
        ref?: string | undefined;
        owner?: string | undefined;
        waitsOn?: string[] | undefined;
    }[] | undefined;
}>;
export type PlanStep = z.infer<typeof planStepSchema>;
export type PlanStepInput = z.input<typeof planStepSchema>;
/**
 * One module's plan for one epic: the phases in order and the steps in order. `goal` is what the
 * whole of it makes true, `measure` how anybody will know; both optional. A writer is held to this
 * (`writePlan`); a reader uses `planIn`, which drops what it cannot read instead of the whole plan.
 */
export declare const planSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    goal: z.ZodOptional<z.ZodString>;
    measure: z.ZodOptional<z.ZodString>;
    phases: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
    }, {
        id: string;
        title: string;
    }>, "many">>;
    steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        /** The prose under the title. */
        body: z.ZodDefault<z.ZodString>;
        /** The refs that deliver this step. The first tracked one is its issue unless `issue` says. */
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The ref that IS this step's issue, when the publisher says which. Also in `refs`. */
        issue: z.ZodOptional<z.ZodString>;
        /** Refs named beside the step that do not deliver it: prior art, related work. */
        related: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The part of the epic this step belongs to (`context.parts` id). Absent: the epic as a whole. */
        part: z.ZodOptional<z.ZodString>;
        /** The step this one is a prerequisite of. Absent: directly under the plan's goal. */
        under: z.ZodOptional<z.ZodString>;
        /** The steps that must be done before this one can start. An `after` on a step holds those under it too. */
        after: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The phase this step is in. Absent: the phase of the nearest step above it that names one (`phaseOf`). */
        phase: z.ZodOptional<z.ZodString>;
        /** What holds it that is not a step. */
        gates: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            kind: z.ZodEnum<["ref" | "decision" | "access" | "work", ...("ref" | "decision" | "access" | "work")[]]>;
            /** The tracker ref it is, for `ref`; for another kind, the ref that tracks it, when one does. */
            ref: z.ZodOptional<z.ZodString>;
            /** For a `ref` another epic owns: that epic's slug. */
            epic: z.ZodOptional<z.ZodString>;
            /** Who acts on it: a person or a role, in their words. */
            owner: z.ZodOptional<z.ZodString>;
            /** Refs that must land before it can be done ("the legal decision waits on !44"). */
            waitsOn: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Marked done by somebody. A `ref` gate is also done when its row closes, whatever this says. */
            done: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            done: boolean;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            waitsOn: string[];
            epic?: string | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
        }, {
            id: string;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            epic?: string | undefined;
            done?: boolean | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
            waitsOn?: string[] | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        refs: string[];
        title: string;
        body: string;
        related: string[];
        after: string[];
        gates: {
            id: string;
            done: boolean;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            waitsOn: string[];
            epic?: string | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
        }[];
        issue?: string | undefined;
        part?: string | undefined;
        under?: string | undefined;
        phase?: string | undefined;
    }, {
        id: string;
        title: string;
        refs?: string[] | undefined;
        body?: string | undefined;
        issue?: string | undefined;
        part?: string | undefined;
        related?: string[] | undefined;
        under?: string | undefined;
        after?: string[] | undefined;
        phase?: string | undefined;
        gates?: {
            id: string;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            epic?: string | undefined;
            done?: boolean | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
            waitsOn?: string[] | undefined;
        }[] | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    steps: {
        id: string;
        refs: string[];
        title: string;
        body: string;
        related: string[];
        after: string[];
        gates: {
            id: string;
            done: boolean;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            waitsOn: string[];
            epic?: string | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
        }[];
        issue?: string | undefined;
        part?: string | undefined;
        under?: string | undefined;
        phase?: string | undefined;
    }[];
    phases: {
        id: string;
        title: string;
    }[];
    goal?: string | undefined;
    measure?: string | undefined;
}, {
    steps?: {
        id: string;
        title: string;
        refs?: string[] | undefined;
        body?: string | undefined;
        issue?: string | undefined;
        part?: string | undefined;
        related?: string[] | undefined;
        under?: string | undefined;
        after?: string[] | undefined;
        phase?: string | undefined;
        gates?: {
            id: string;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            epic?: string | undefined;
            done?: boolean | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
            waitsOn?: string[] | undefined;
        }[] | undefined;
    }[] | undefined;
    goal?: string | undefined;
    measure?: string | undefined;
    phases?: {
        id: string;
        title: string;
    }[] | undefined;
}>, {
    steps: {
        id: string;
        refs: string[];
        title: string;
        body: string;
        related: string[];
        after: string[];
        gates: {
            id: string;
            done: boolean;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            waitsOn: string[];
            epic?: string | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
        }[];
        issue?: string | undefined;
        part?: string | undefined;
        under?: string | undefined;
        phase?: string | undefined;
    }[];
    phases: {
        id: string;
        title: string;
    }[];
    goal?: string | undefined;
    measure?: string | undefined;
}, {
    steps?: {
        id: string;
        title: string;
        refs?: string[] | undefined;
        body?: string | undefined;
        issue?: string | undefined;
        part?: string | undefined;
        related?: string[] | undefined;
        under?: string | undefined;
        after?: string[] | undefined;
        phase?: string | undefined;
        gates?: {
            id: string;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            epic?: string | undefined;
            done?: boolean | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
            waitsOn?: string[] | undefined;
        }[] | undefined;
    }[] | undefined;
    goal?: string | undefined;
    measure?: string | undefined;
    phases?: {
        id: string;
        title: string;
    }[] | undefined;
}>, {
    steps: {
        id: string;
        refs: string[];
        title: string;
        body: string;
        related: string[];
        after: string[];
        gates: {
            id: string;
            done: boolean;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            waitsOn: string[];
            epic?: string | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
        }[];
        issue?: string | undefined;
        part?: string | undefined;
        under?: string | undefined;
        phase?: string | undefined;
    }[];
    phases: {
        id: string;
        title: string;
    }[];
    goal?: string | undefined;
    measure?: string | undefined;
}, {
    steps?: {
        id: string;
        title: string;
        refs?: string[] | undefined;
        body?: string | undefined;
        issue?: string | undefined;
        part?: string | undefined;
        related?: string[] | undefined;
        under?: string | undefined;
        after?: string[] | undefined;
        phase?: string | undefined;
        gates?: {
            id: string;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            epic?: string | undefined;
            done?: boolean | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
            waitsOn?: string[] | undefined;
        }[] | undefined;
    }[] | undefined;
    goal?: string | undefined;
    measure?: string | undefined;
    phases?: {
        id: string;
        title: string;
    }[] | undefined;
}>;
export type Plan = z.infer<typeof planSchema>;
export type PlanInput = z.input<typeof planSchema>;
/**
 * A plan out of anything, or null for a non-object; never throws. Read part by part, so one bad step,
 * phase or gate costs that entry: a step with no usable id or title is left out, an id met twice is
 * the first, and an `under`, `after` or `phase` that names nothing in this plan — or the step itself —
 * is dropped. Bounded as `planSchema` is.
 */
export declare function planIn(raw: unknown): Plan | null;
/**
 * Every epic's plan out of one module's parsed `steps.json`, or `{}`: never throws. An epic key that
 * is not an `EPIC_SLUG` is left out; an epic whose plan is present, even with no steps, is kept —
 * the module has said this epic has none. At most `LIMITS.HOLDINGS_EPICS` epics are read.
 */
export declare function plansIn(document: unknown): Record<string, Plan>;
/**
 * The phase a step is in: the one it names, else the phase of the nearest step above it (`under`)
 * that names one; undefined when none does. Guards against a loop of `under`.
 */
export declare function phaseOf(plan: Pick<Plan, 'steps'>, stepId: string): string | undefined;
/** A step as `steps.list` hands it over: the plan's step, and the module that provides it. */
export declare const providedStepSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    /** The prose under the title. */
    body: z.ZodDefault<z.ZodString>;
    /** The refs that deliver this step. The first tracked one is its issue unless `issue` says. */
    refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** The ref that IS this step's issue, when the publisher says which. Also in `refs`. */
    issue: z.ZodOptional<z.ZodString>;
    /** Refs named beside the step that do not deliver it: prior art, related work. */
    related: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** The part of the epic this step belongs to (`context.parts` id). Absent: the epic as a whole. */
    part: z.ZodOptional<z.ZodString>;
    /** The step this one is a prerequisite of. Absent: directly under the plan's goal. */
    under: z.ZodOptional<z.ZodString>;
    /** The steps that must be done before this one can start. An `after` on a step holds those under it too. */
    after: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** The phase this step is in. Absent: the phase of the nearest step above it that names one (`phaseOf`). */
    phase: z.ZodOptional<z.ZodString>;
    /** What holds it that is not a step. */
    gates: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        kind: z.ZodEnum<["ref" | "decision" | "access" | "work", ...("ref" | "decision" | "access" | "work")[]]>;
        /** The tracker ref it is, for `ref`; for another kind, the ref that tracks it, when one does. */
        ref: z.ZodOptional<z.ZodString>;
        /** For a `ref` another epic owns: that epic's slug. */
        epic: z.ZodOptional<z.ZodString>;
        /** Who acts on it: a person or a role, in their words. */
        owner: z.ZodOptional<z.ZodString>;
        /** Refs that must land before it can be done ("the legal decision waits on !44"). */
        waitsOn: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** Marked done by somebody. A `ref` gate is also done when its row closes, whatever this says. */
        done: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        done: boolean;
        title: string;
        kind: "ref" | "decision" | "access" | "work";
        waitsOn: string[];
        epic?: string | undefined;
        ref?: string | undefined;
        owner?: string | undefined;
    }, {
        id: string;
        title: string;
        kind: "ref" | "decision" | "access" | "work";
        epic?: string | undefined;
        done?: boolean | undefined;
        ref?: string | undefined;
        owner?: string | undefined;
        waitsOn?: string[] | undefined;
    }>, "many">>;
} & {
    module: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    refs: string[];
    title: string;
    module: string;
    body: string;
    related: string[];
    after: string[];
    gates: {
        id: string;
        done: boolean;
        title: string;
        kind: "ref" | "decision" | "access" | "work";
        waitsOn: string[];
        epic?: string | undefined;
        ref?: string | undefined;
        owner?: string | undefined;
    }[];
    issue?: string | undefined;
    part?: string | undefined;
    under?: string | undefined;
    phase?: string | undefined;
}, {
    id: string;
    title: string;
    module: string;
    refs?: string[] | undefined;
    body?: string | undefined;
    issue?: string | undefined;
    part?: string | undefined;
    related?: string[] | undefined;
    under?: string | undefined;
    after?: string[] | undefined;
    phase?: string | undefined;
    gates?: {
        id: string;
        title: string;
        kind: "ref" | "decision" | "access" | "work";
        epic?: string | undefined;
        done?: boolean | undefined;
        ref?: string | undefined;
        owner?: string | undefined;
        waitsOn?: string[] | undefined;
    }[] | undefined;
}>;
export type ProvidedStep = z.infer<typeof providedStepSchema>;
/** A phase as `steps.list` hands it over: the plan's phase, and the module whose plan it is in. */
export declare const providedPhaseSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
} & {
    module: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    module: string;
}, {
    id: string;
    title: string;
    module: string;
}>;
export type ProvidedPhase = z.infer<typeof providedPhaseSchema>;
/**
 * One module whose plan is in the answer, with its plan's goal and measure. `fallback: true` when the
 * host read it from somewhere other than the module's `steps.json` — a module from before 2.21.0 that
 * has not published yet — so a reader knows the steps are a host's reading of an older file.
 */
export declare const stepsProviderSchema: z.ZodObject<{
    module: z.ZodString;
    goal: z.ZodOptional<z.ZodString>;
    measure: z.ZodOptional<z.ZodString>;
    fallback: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    module: string;
    fallback?: boolean | undefined;
    goal?: string | undefined;
    measure?: string | undefined;
}, {
    module: string;
    fallback?: boolean | undefined;
    goal?: string | undefined;
    measure?: string | undefined;
}>;
export type StepsProvider = z.infer<typeof stepsProviderSchema>;
/**
 * `steps.list`'s answer from a 2.21.0 host (`methodResults['steps.list']`): every provider's steps
 * and phases, provider by provider and each in its plan's order, and who the providers are. All three
 * lists are optional because an epic whose steps are kept somewhere no module publishes (`stepsFrom`,
 * a paper's sections) is answered with no `steps` at all: an empty list would say there are none.
 * Everything else passes through. Older hosts answered `{ steps }` with steps of their own shape.
 */
export declare const stepsListResult: z.ZodObject<{
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        /** The prose under the title. */
        body: z.ZodDefault<z.ZodString>;
        /** The refs that deliver this step. The first tracked one is its issue unless `issue` says. */
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The ref that IS this step's issue, when the publisher says which. Also in `refs`. */
        issue: z.ZodOptional<z.ZodString>;
        /** Refs named beside the step that do not deliver it: prior art, related work. */
        related: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The part of the epic this step belongs to (`context.parts` id). Absent: the epic as a whole. */
        part: z.ZodOptional<z.ZodString>;
        /** The step this one is a prerequisite of. Absent: directly under the plan's goal. */
        under: z.ZodOptional<z.ZodString>;
        /** The steps that must be done before this one can start. An `after` on a step holds those under it too. */
        after: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The phase this step is in. Absent: the phase of the nearest step above it that names one (`phaseOf`). */
        phase: z.ZodOptional<z.ZodString>;
        /** What holds it that is not a step. */
        gates: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            kind: z.ZodEnum<["ref" | "decision" | "access" | "work", ...("ref" | "decision" | "access" | "work")[]]>;
            /** The tracker ref it is, for `ref`; for another kind, the ref that tracks it, when one does. */
            ref: z.ZodOptional<z.ZodString>;
            /** For a `ref` another epic owns: that epic's slug. */
            epic: z.ZodOptional<z.ZodString>;
            /** Who acts on it: a person or a role, in their words. */
            owner: z.ZodOptional<z.ZodString>;
            /** Refs that must land before it can be done ("the legal decision waits on !44"). */
            waitsOn: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Marked done by somebody. A `ref` gate is also done when its row closes, whatever this says. */
            done: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            done: boolean;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            waitsOn: string[];
            epic?: string | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
        }, {
            id: string;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            epic?: string | undefined;
            done?: boolean | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
            waitsOn?: string[] | undefined;
        }>, "many">>;
    } & {
        module: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        refs: string[];
        title: string;
        module: string;
        body: string;
        related: string[];
        after: string[];
        gates: {
            id: string;
            done: boolean;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            waitsOn: string[];
            epic?: string | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
        }[];
        issue?: string | undefined;
        part?: string | undefined;
        under?: string | undefined;
        phase?: string | undefined;
    }, {
        id: string;
        title: string;
        module: string;
        refs?: string[] | undefined;
        body?: string | undefined;
        issue?: string | undefined;
        part?: string | undefined;
        related?: string[] | undefined;
        under?: string | undefined;
        after?: string[] | undefined;
        phase?: string | undefined;
        gates?: {
            id: string;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            epic?: string | undefined;
            done?: boolean | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
            waitsOn?: string[] | undefined;
        }[] | undefined;
    }>, "many">>;
    phases: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
    } & {
        module: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        module: string;
    }, {
        id: string;
        title: string;
        module: string;
    }>, "many">>;
    providers: z.ZodOptional<z.ZodArray<z.ZodObject<{
        module: z.ZodString;
        goal: z.ZodOptional<z.ZodString>;
        measure: z.ZodOptional<z.ZodString>;
        fallback: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        module: string;
        fallback?: boolean | undefined;
        goal?: string | undefined;
        measure?: string | undefined;
    }, {
        module: string;
        fallback?: boolean | undefined;
        goal?: string | undefined;
        measure?: string | undefined;
    }>, "many">>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        /** The prose under the title. */
        body: z.ZodDefault<z.ZodString>;
        /** The refs that deliver this step. The first tracked one is its issue unless `issue` says. */
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The ref that IS this step's issue, when the publisher says which. Also in `refs`. */
        issue: z.ZodOptional<z.ZodString>;
        /** Refs named beside the step that do not deliver it: prior art, related work. */
        related: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The part of the epic this step belongs to (`context.parts` id). Absent: the epic as a whole. */
        part: z.ZodOptional<z.ZodString>;
        /** The step this one is a prerequisite of. Absent: directly under the plan's goal. */
        under: z.ZodOptional<z.ZodString>;
        /** The steps that must be done before this one can start. An `after` on a step holds those under it too. */
        after: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The phase this step is in. Absent: the phase of the nearest step above it that names one (`phaseOf`). */
        phase: z.ZodOptional<z.ZodString>;
        /** What holds it that is not a step. */
        gates: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            kind: z.ZodEnum<["ref" | "decision" | "access" | "work", ...("ref" | "decision" | "access" | "work")[]]>;
            /** The tracker ref it is, for `ref`; for another kind, the ref that tracks it, when one does. */
            ref: z.ZodOptional<z.ZodString>;
            /** For a `ref` another epic owns: that epic's slug. */
            epic: z.ZodOptional<z.ZodString>;
            /** Who acts on it: a person or a role, in their words. */
            owner: z.ZodOptional<z.ZodString>;
            /** Refs that must land before it can be done ("the legal decision waits on !44"). */
            waitsOn: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Marked done by somebody. A `ref` gate is also done when its row closes, whatever this says. */
            done: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            done: boolean;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            waitsOn: string[];
            epic?: string | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
        }, {
            id: string;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            epic?: string | undefined;
            done?: boolean | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
            waitsOn?: string[] | undefined;
        }>, "many">>;
    } & {
        module: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        refs: string[];
        title: string;
        module: string;
        body: string;
        related: string[];
        after: string[];
        gates: {
            id: string;
            done: boolean;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            waitsOn: string[];
            epic?: string | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
        }[];
        issue?: string | undefined;
        part?: string | undefined;
        under?: string | undefined;
        phase?: string | undefined;
    }, {
        id: string;
        title: string;
        module: string;
        refs?: string[] | undefined;
        body?: string | undefined;
        issue?: string | undefined;
        part?: string | undefined;
        related?: string[] | undefined;
        under?: string | undefined;
        after?: string[] | undefined;
        phase?: string | undefined;
        gates?: {
            id: string;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            epic?: string | undefined;
            done?: boolean | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
            waitsOn?: string[] | undefined;
        }[] | undefined;
    }>, "many">>;
    phases: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
    } & {
        module: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        module: string;
    }, {
        id: string;
        title: string;
        module: string;
    }>, "many">>;
    providers: z.ZodOptional<z.ZodArray<z.ZodObject<{
        module: z.ZodString;
        goal: z.ZodOptional<z.ZodString>;
        measure: z.ZodOptional<z.ZodString>;
        fallback: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        module: string;
        fallback?: boolean | undefined;
        goal?: string | undefined;
        measure?: string | undefined;
    }, {
        module: string;
        fallback?: boolean | undefined;
        goal?: string | undefined;
        measure?: string | undefined;
    }>, "many">>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        /** The prose under the title. */
        body: z.ZodDefault<z.ZodString>;
        /** The refs that deliver this step. The first tracked one is its issue unless `issue` says. */
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The ref that IS this step's issue, when the publisher says which. Also in `refs`. */
        issue: z.ZodOptional<z.ZodString>;
        /** Refs named beside the step that do not deliver it: prior art, related work. */
        related: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The part of the epic this step belongs to (`context.parts` id). Absent: the epic as a whole. */
        part: z.ZodOptional<z.ZodString>;
        /** The step this one is a prerequisite of. Absent: directly under the plan's goal. */
        under: z.ZodOptional<z.ZodString>;
        /** The steps that must be done before this one can start. An `after` on a step holds those under it too. */
        after: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** The phase this step is in. Absent: the phase of the nearest step above it that names one (`phaseOf`). */
        phase: z.ZodOptional<z.ZodString>;
        /** What holds it that is not a step. */
        gates: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            kind: z.ZodEnum<["ref" | "decision" | "access" | "work", ...("ref" | "decision" | "access" | "work")[]]>;
            /** The tracker ref it is, for `ref`; for another kind, the ref that tracks it, when one does. */
            ref: z.ZodOptional<z.ZodString>;
            /** For a `ref` another epic owns: that epic's slug. */
            epic: z.ZodOptional<z.ZodString>;
            /** Who acts on it: a person or a role, in their words. */
            owner: z.ZodOptional<z.ZodString>;
            /** Refs that must land before it can be done ("the legal decision waits on !44"). */
            waitsOn: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** Marked done by somebody. A `ref` gate is also done when its row closes, whatever this says. */
            done: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            done: boolean;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            waitsOn: string[];
            epic?: string | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
        }, {
            id: string;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            epic?: string | undefined;
            done?: boolean | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
            waitsOn?: string[] | undefined;
        }>, "many">>;
    } & {
        module: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        refs: string[];
        title: string;
        module: string;
        body: string;
        related: string[];
        after: string[];
        gates: {
            id: string;
            done: boolean;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            waitsOn: string[];
            epic?: string | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
        }[];
        issue?: string | undefined;
        part?: string | undefined;
        under?: string | undefined;
        phase?: string | undefined;
    }, {
        id: string;
        title: string;
        module: string;
        refs?: string[] | undefined;
        body?: string | undefined;
        issue?: string | undefined;
        part?: string | undefined;
        related?: string[] | undefined;
        under?: string | undefined;
        after?: string[] | undefined;
        phase?: string | undefined;
        gates?: {
            id: string;
            title: string;
            kind: "ref" | "decision" | "access" | "work";
            epic?: string | undefined;
            done?: boolean | undefined;
            ref?: string | undefined;
            owner?: string | undefined;
            waitsOn?: string[] | undefined;
        }[] | undefined;
    }>, "many">>;
    phases: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
    } & {
        module: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        module: string;
    }, {
        id: string;
        title: string;
        module: string;
    }>, "many">>;
    providers: z.ZodOptional<z.ZodArray<z.ZodObject<{
        module: z.ZodString;
        goal: z.ZodOptional<z.ZodString>;
        measure: z.ZodOptional<z.ZodString>;
        fallback: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        module: string;
        fallback?: boolean | undefined;
        goal?: string | undefined;
        measure?: string | undefined;
    }, {
        module: string;
        fallback?: boolean | undefined;
        goal?: string | undefined;
        measure?: string | undefined;
    }>, "many">>;
}, z.ZodTypeAny, "passthrough">>;
export type StepsListResult = z.infer<typeof stepsListResult>;
/** One module's plan, as a host hands it to `plansUnion`. */
export interface ProvidedPlan {
    module: string;
    plan: Plan;
    fallback?: boolean;
}
/**
 * The union of several modules' plans for one epic, in the order given: each step and phase marked
 * with its module, every provider listed once (the first plan given for a module wins). What a host
 * answers `steps.list` with; pure, so two hosts make the same union of the same files.
 */
export declare function plansUnion(plans: readonly ProvidedPlan[]): Required<Pick<StepsListResult, 'steps' | 'phases' | 'providers'>>;
