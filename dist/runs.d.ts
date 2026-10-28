import { z } from 'zod';
/**
 * Run results (2.27.0): what ANY module that runs things — a test suite, a typecheck, a build —
 * publishes about each run and the work it is for. `runs.json` in the publisher's own folder,
 * `{ version, runs: RunResult[] }`, the way `parts.json` and `steps.json` publish. A reader takes
 * every publisher's runs (`readRuns` behind `/serve`), each tagged with the folder it came from, so
 * a checklist can show "the tests pass" on a change without knowing which module ran them, and the
 * runner without knowing who reads. No module is named here. Shapes and pure readers only; the file
 * is opened behind `/serve` (`writeRuns`, `readRuns`). Design notes: docs/runs.md.
 */
/** The file, in a module's own folder: `moduleFile(projectPath, moduleId, RUNS_FILE)` is `.kehikot/<module>/runs.json`. */
export declare const RUNS_FILE = "runs";
/** The format's number, written as `version`. A reader opens a later one and reads what it knows. */
export declare const RUNS_VERSION = 1;
/**
 * Where a run is. `queued`: asked for, waiting for room. `running`: started. `passed`: ended with
 * exit 0. `failed`: ended otherwise (a non-zero exit, a signal, or it could not start). `cancelled`:
 * stopped by its caller or the person before it ended; says nothing about the work.
 */
export declare const RUN_RESULT_STATES: readonly ["queued", "running", "passed", "failed", "cancelled"];
export type RunResultState = (typeof RUN_RESULT_STATES)[number];
/** A run that has ended. */
export declare const runEnded: (state: RunResultState) => boolean;
/**
 * What a run is for, by its asker's word. `push`: a pre-push hook, somebody waiting. `verify`: a
 * fix being checked. `review`: a review round. `other`: anything else. A kind this version does not
 * know reads as `other`.
 */
export declare const RUN_RESULT_KINDS: readonly ["push", "verify", "review", "other"];
export type RunResultKind = (typeof RUN_RESULT_KINDS)[number];
/**
 * One run, as its publisher says it. `id` is the publisher's and unique within its file. `label` is
 * what the run is, in the asker's words ("pre-push monorepo", "bun test"): the same label on the same
 * ref is the same CHECK run again, and a reader takes the newest (`latestRuns`). `refs` are the work it
 * is for, spelled as the tracker reading spells them (`!3907`, `gh#12`); `[]` for none.
 */
export declare const runResultSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    kind: z.ZodCatch<z.ZodEnum<["push", "verify", "review", "other"]>>;
    refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** The epic the run was asked for from, or null. */
    epic: z.ZodDefault<z.ZodCatch<z.ZodNullable<z.ZodString>>>;
    state: z.ZodEnum<["queued", "running", "passed", "failed", "cancelled"]>;
    queuedAt: z.ZodNumber;
    startedAt: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    finishedAt: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
    /** The exit code of an ended run, or null (still going, cancelled before it started, or ended by a signal). */
    exit: z.ZodDefault<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    epic: string | null;
    state: "failed" | "running" | "cancelled" | "queued" | "passed";
    label: string;
    refs: string[];
    kind: "push" | "review" | "verify" | "other";
    queuedAt: number;
    startedAt: number | null;
    finishedAt: number | null;
    exit: number | null;
}, {
    id: string;
    state: "failed" | "running" | "cancelled" | "queued" | "passed";
    label: string;
    queuedAt: number;
    epic?: unknown;
    refs?: string[] | undefined;
    kind?: unknown;
    startedAt?: number | null | undefined;
    finishedAt?: number | null | undefined;
    exit?: number | null | undefined;
}>;
export type RunResult = z.infer<typeof runResultSchema>;
/** A run as a reader of every publisher has it: `from` is the folder under `.kehikot/` it was read from. */
export type PublishedRun = RunResult & {
    from: string;
};
/**
 * The runs in one `runs.json`, read off anything: each entry through `runResultSchema`, junk costing
 * only the entry it is in, an id once (the first), at most `LIMITS.RUNS`. `[]` for anything that is
 * not such a document.
 */
export declare function runsIn(document: unknown): RunResult[];
/**
 * For one ref, the newest run of each label (by `queuedAt`, then by being later in the list): what a
 * reader shows as "this check, on this work, now". In label order. A run of a label that was newer
 * replaces the older one's state whatever that state was, so a pass followed by a failure reads failed.
 */
export declare function latestRuns<T extends RunResult>(runs: readonly T[], forRef: string): T[];
