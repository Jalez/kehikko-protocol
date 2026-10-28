import { z } from 'zod';
import { EPIC_SLUG } from './ids.js';
import { LIMITS } from './limits.js';
import { ref } from './fragments.js';
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
export const RUNS_FILE = 'runs';
/** The format's number, written as `version`. A reader opens a later one and reads what it knows. */
export const RUNS_VERSION = 1;
/**
 * Where a run is. `queued`: asked for, waiting for room. `running`: started. `passed`: ended with
 * exit 0. `failed`: ended otherwise (a non-zero exit, a signal, or it could not start). `cancelled`:
 * stopped by its caller or the person before it ended; says nothing about the work.
 */
export const RUN_RESULT_STATES = ['queued', 'running', 'passed', 'failed', 'cancelled'];
/** A run that has ended. */
export const runEnded = (state) => state === 'passed' || state === 'failed' || state === 'cancelled';
/**
 * What a run is for, by its asker's word. `push`: a pre-push hook, somebody waiting. `verify`: a
 * fix being checked. `review`: a review round. `other`: anything else. A kind this version does not
 * know reads as `other`.
 */
export const RUN_RESULT_KINDS = ['push', 'verify', 'review', 'other'];
/** Milliseconds since the epoch. */
const instant = z.number().int().min(0);
/**
 * One run, as its publisher says it. `id` is the publisher's and unique within its file. `label` is
 * what the run is, in the asker's words ("pre-push monorepo", "bun test"): the same label on the same
 * ref is the same CHECK run again, and a reader takes the newest (`latestRuns`). `refs` are the work it
 * is for, spelled as the tracker reading spells them (`!3907`, `gh#12`); `[]` for none.
 */
export const runResultSchema = z.object({
    id: z.string().min(1).max(LIMITS.RUN_ID),
    label: z.string().min(1).max(LIMITS.RUN_LABEL),
    kind: z.enum(RUN_RESULT_KINDS).catch('other'),
    refs: z.array(ref).max(LIMITS.RUN_REFS).default([]),
    /** The epic the run was asked for from, or null. */
    epic: z.string().regex(EPIC_SLUG).nullable().catch(null).default(null),
    state: z.enum(RUN_RESULT_STATES),
    queuedAt: instant,
    startedAt: instant.nullable().default(null),
    finishedAt: instant.nullable().default(null),
    /** The exit code of an ended run, or null (still going, cancelled before it started, or ended by a signal). */
    exit: z.number().int().nullable().default(null),
});
/**
 * The runs in one `runs.json`, read off anything: each entry through `runResultSchema`, junk costing
 * only the entry it is in, an id once (the first), at most `LIMITS.RUNS`. `[]` for anything that is
 * not such a document.
 */
export function runsIn(document) {
    if (!document || typeof document !== 'object' || Array.isArray(document))
        return [];
    const raw = document.runs;
    if (!Array.isArray(raw))
        return [];
    const out = [];
    const ids = new Set();
    for (const entry of raw) {
        if (out.length >= LIMITS.RUNS)
            break;
        const parsed = runResultSchema.safeParse(entry);
        if (!parsed.success || ids.has(parsed.data.id))
            continue;
        ids.add(parsed.data.id);
        out.push(parsed.data);
    }
    return out;
}
/**
 * For one ref, the newest run of each label (by `queuedAt`, then by being later in the list): what a
 * reader shows as "this check, on this work, now". In label order. A run of a label that was newer
 * replaces the older one's state whatever that state was, so a pass followed by a failure reads failed.
 */
export function latestRuns(runs, forRef) {
    const newest = new Map();
    for (const run of runs) {
        if (!run.refs.includes(forRef))
            continue;
        const had = newest.get(run.label);
        if (!had || run.queuedAt >= had.queuedAt)
            newest.set(run.label, run);
    }
    return [...newest.values()].sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
}
