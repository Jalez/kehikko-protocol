import { type Plan, type PlanInput } from '../plan.js';
/** One module's `steps.json`, as `readPlans` found it. */
export interface PublishedPlans {
    /** The folder under `.kehikot/` it is in. */
    folder: string;
    /**
     * The module the file says wrote it, when that module's folder IS this folder (`moduleFolder`); null
     * when the file names none or another. A host maps the folder to a registered module when null.
     */
    module: string | null;
    /** Every epic it has a plan for, by slug. An epic present with no steps: the module says it has none. Read with `own()`. */
    epics: Record<string, Plan>;
}
/**
 * Every module's published plans in a project, by folder name order: each folder directly under
 * `.kehikot/` is asked for a `steps.json`, and no module is named. Never throws and never writes;
 * `[]` for no project. A file over `LIMITS.HOLDINGS_BYTES`, one that is not a regular file, one that
 * resolves outside the project and one that is not JSON are skipped; inside a file, junk costs the
 * entry it is in (`plansIn`). A folder whose file holds no epic is still listed: it has published.
 */
export declare function readPlans(projectPath: string | null | undefined): PublishedPlans[];
/** Every published plan for one epic, by folder order: `readPlans` narrowed to the epic. */
export declare function readPlansFor(projectPath: string | null | undefined, epic: string): {
    folder: string;
    module: string | null;
    plan: Plan;
}[];
/** What `writePlan` did. */
export interface PlanWritten {
    /** The module's `steps.json`. */
    file: string;
    /** Whether the file was written. False when it already said exactly this. */
    changed: boolean;
    /** What was given and could not be said, as sentences: an `under`, `after` or `phase` that names nothing in the plan. */
    dropped: string[];
}
/**
 * Publish ONE module's plan for ONE epic: replaces what its `steps.json` said for that epic and leaves
 * every other epic, and every key this does not know, as it was. `null` takes the epic out (the module
 * no longer says anything about it); a plan with no steps says it has none. The plan is held to
 * `planSchema` and refused whole, with the issue, when it does not fit; an `under`, `after` or `phase`
 * naming nothing in the plan is dropped and reported. Atomic (a temporary file, renamed). Null when
 * there is no project. Throws for an epic that is not a slug, an id that is not a module's, and a
 * `.kehikot` or module folder that resolves outside the project. Whatever has the file's name and is
 * not a readable JSON object is set aside as `steps.json.unreadable` (one, the latest).
 */
export declare function writePlan(projectPath: string | null | undefined, moduleId: string, epic: string, plan: PlanInput | null): PlanWritten | null;
