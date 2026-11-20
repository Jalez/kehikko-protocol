/**
 * 2.110.0. Conversations a restart cut off, and how they are told to carry on.
 *
 * When Kehikot restarts (an app update, Restart, a crash) or a module is updated or restarted, an
 * agent module's conversations whose processes it holds go with it: a turn under way, and the
 * conversation's own background work (its subagents, background shells, scheduled wakes) running
 * inside that process. Nothing outside the conversation can carry that work on; the conversation
 * can, told once that it was cut off. So every agent module does the same three things:
 *
 * 1. **A mark while it could be cut off** (`keepsCutOffMark`): while a conversation whose process the
 *    module holds is working, or its turn ended with its own background work still running (it is
 *    waiting for that work to wake it). One small write when that starts and one when it ends: no
 *    clock, no polling.
 * 2. **One check at start** (`cutOffByRestart`): a conversation still marked and not running was cut
 *    off. Idle ones, ones waiting for the person, and ones that finished are never touched. A record
 *    from before the mark is judged by its transcript: grown in the last `RESUME_WINDOW_MS` and its
 *    last turn not ended.
 * 3. **Woken once, in the background, with one sentence** (`resumeLine`): why it stopped, when the
 *    host said (`restartOf`), and to carry on. The mark is cleared before it is woken, so it is woken
 *    once per interruption; the person's switch "Resume conversations cut off by a restart" turns it
 *    off per project.
 *
 * Why it restarted is the host's to say: it passes `KEHIKOT_RESTART_REASON` (and, for an update,
 * `KEHIKOT_RESTART_VERSION`) to the modules it starts after a restart it made. No reason (an older
 * host, a crash, the computer restarting) is said as a restart, with what may have been cut off.
 */
export declare const RESTART_REASON_ENV = "KEHIKOT_RESTART_REASON";
export declare const RESTART_VERSION_ENV = "KEHIKOT_RESTART_VERSION";
/** Why the host started a module again: the app updated or restarted, or this module was updated or restarted. */
export declare const RESTART_REASONS: readonly ["app-update", "app-restart", "module-update", "module-restart"];
export type RestartReason = (typeof RESTART_REASONS)[number];
/** How long ago a transcript may have grown for a conversation recorded before the mark to count as cut off. */
export declare const RESUME_WINDOW_MS: number;
/** Why this module was started, as the host said in its environment; nulls for anything it did not say or said wrongly. */
export declare function restartOf(env?: Record<string, string | undefined>): {
    reason: RestartReason | null;
    version: string | null;
};
/**
 * Whether a conversation keeps its mark now: its process is the module's (`held`; one the module
 * only views, or one running in the program's own background, runs on through a restart), and it is
 * working, or its turn ended with its own background work still running (`waking`: background tasks
 * and scheduled wakes the program counted).
 */
export declare function keepsCutOffMark(now: {
    held: boolean;
    working: boolean;
    waking?: number | null;
}): boolean;
/**
 * Whether a conversation was cut off by the restart, at the module's start: not running now, not one
 * the program runs in its own background, and marked — or, recorded before the mark, its transcript
 * grew within `RESUME_WINDOW_MS` and its last turn did not end. A conversation a person ended has no
 * mark (ending it clears it) and is never woken.
 */
export declare function cutOffByRestart(at: {
    running: boolean;
    background?: boolean;
    marked: boolean;
    /** Only for a record from before the mark: how long ago its transcript last grew, and whether its last turn was still under way. */
    legacy?: {
        grewAgoMs: number;
        midTurn: boolean;
    } | null;
}): boolean;
/** The one sentence a cut-off conversation is woken with: why it stopped, when the host said, and to carry on. */
export declare function resumeLine(why?: {
    reason: RestartReason | null;
    version?: string | null;
}): string;
/** Whether a prompt is one of these sentences: what a module leaves out when it asks whether the person said something since. */
export declare function isResumeLine(text: string): boolean;
