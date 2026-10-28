import { type PublishedRun, type RunResult } from '../runs.js';
/**
 * Every run any module published for a project, each with `from`, the folder it came from, by folder
 * name order. Never throws and never writes; `[]` for no project. A file over `LIMITS.RUNS_BYTES`,
 * one that is not a regular file, or one that resolves outside the project, is skipped.
 */
export declare function readRuns(projectPath: string | null | undefined): PublishedRun[];
/** What `writeRuns` did. */
export interface RunsWritten {
    file: string;
    /** False when the file already said exactly this. */
    changed: boolean;
    /** How many of the runs given were not runs (`runResultSchema`) and were left out. */
    dropped: number;
}
/**
 * Publish ONE module's runs for a project, whole: the file says exactly these afterwards (the newest
 * `LIMITS.RUNS` of them, by `queuedAt`). Every other key in the file is kept. Atomic (a temporary file,
 * renamed). Null when there is no project. Throws for a `.kehikot` or module folder that resolves
 * outside the project. A file of that name that is not a readable JSON object is set aside as
 * `runs.json.unreadable`, never written through.
 */
export declare function writeRuns(projectPath: string | null | undefined, moduleId: string, runs: readonly RunResult[]): RunsWritten | null;
