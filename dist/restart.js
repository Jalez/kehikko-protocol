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
export const RESTART_REASON_ENV = 'KEHIKOT_RESTART_REASON';
export const RESTART_VERSION_ENV = 'KEHIKOT_RESTART_VERSION';
/** Why the host started a module again: the app updated or restarted, or this module was updated or restarted. */
export const RESTART_REASONS = ['app-update', 'app-restart', 'module-update', 'module-restart'];
/** How long ago a transcript may have grown for a conversation recorded before the mark to count as cut off. */
export const RESUME_WINDOW_MS = 30 * 60_000;
const VERSION = /^\d{1,6}\.\d{1,6}\.\d{1,6}(?:[-+][0-9A-Za-z.-]{1,40})?$/;
/** Why this module was started, as the host said in its environment; nulls for anything it did not say or said wrongly. */
export function restartOf(env = globalThis.process?.env ?? {}) {
    const said = env[RESTART_REASON_ENV];
    const reason = RESTART_REASONS.includes(said ?? '') ? said : null;
    const version = env[RESTART_VERSION_ENV];
    return { reason, version: reason && version && VERSION.test(version) ? version : null };
}
/**
 * Whether a conversation keeps its mark now: its process is the module's (`held`; one the module
 * only views, or one running in the program's own background, runs on through a restart), and it is
 * working, or its turn ended with its own background work still running (`waking`: background tasks
 * and scheduled wakes the program counted).
 */
export function keepsCutOffMark(now) {
    if (!now.held)
        return false;
    return now.working || (typeof now.waking === 'number' && now.waking > 0);
}
/**
 * Whether a conversation was cut off by the restart, at the module's start: not running now, not one
 * the program runs in its own background, and marked — or, recorded before the mark, its transcript
 * grew within `RESUME_WINDOW_MS` and its last turn did not end. A conversation a person ended has no
 * mark (ending it clears it) and is never woken.
 */
export function cutOffByRestart(at) {
    if (at.running || at.background)
        return false;
    if (at.marked)
        return true;
    const legacy = at.legacy;
    return Boolean(legacy && legacy.midTurn && legacy.grewAgoMs >= 0 && legacy.grewAgoMs <= RESUME_WINDOW_MS);
}
const CARRY_ON = 'Carry on where you left off. Background tasks and subagents that were running were stopped: check your task notifications and start again what did not finish.';
/** The one sentence a cut-off conversation is woken with: why it stopped, when the host said, and to carry on. */
export function resumeLine(why = { reason: null }) {
    const to = why.version ? ` to ${why.version}` : '';
    switch (why.reason) {
        case 'app-update':
            return `Kehikot restarted to update${to} while you were working. ${CARRY_ON}`;
        case 'app-restart':
            return `Kehikot was restarted while you were working. ${CARRY_ON}`;
        case 'module-update':
            return `Kehikot updated this module${to} while you were working. ${CARRY_ON}`;
        case 'module-restart':
            return `Kehikot restarted this module while you were working. ${CARRY_ON}`;
        default:
            return 'Kehikot restarted while you were working. Some background work may have been cut off: check your task notifications and resume anything unfinished.';
    }
}
/** Whether a prompt is one of these sentences: what a module leaves out when it asks whether the person said something since. */
export function isResumeLine(text) {
    const said = text.trim();
    return [null, ...RESTART_REASONS].some((reason) => {
        const line = resumeLine({ reason });
        if (said === line)
            return true;
        /* With a version: the same sentence with " to <version>" after its verb. */
        const at = line.indexOf(' while you were working.');
        return reason !== null && said.endsWith(line.slice(at)) && said.startsWith(line.slice(0, at)) && / to \S+$/.test(said.slice(0, said.length - (line.length - at)));
    });
}
