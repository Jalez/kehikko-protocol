import { LIMITS } from './limits.js';
import { oneLine } from './notes.js';
/**
 * 2.54.0. How an agent session's turn ended, in ONE rule for every module that runs agent sessions,
 * so a Claude conversation and a Codex one that stop the same way say the same thing in the Inbox.
 * Pure: the module hears the turn end by its own means (a CLI's `Stop` hook, its own event) and
 * reports the item. Design notes: docs/activity.md, "How an agent's turn ended (2.54.0)".
 *
 * A turn ends in one of three ways the agent declares with `tell_finished` on the module's door:
 *
 * - `done`: the work it was given is finished. A `done` item.
 * - `needs-decision`, with a one-line question: only the person can answer it. An `attention` item
 *   that shows the question, with its own sound, until the person answers in the session.
 * - `research-complete` (2.31.0's event), with a few words: research finished. A `done` item.
 *
 * A turn that ends with none of them, and with nothing set up to bring the session back (a
 * background task, a scheduled wake-up), is a stall: `attention`, "Stopped without finishing". An
 * action the CLI refused on its own account (an auto-mode permission classifier) is `attention` too,
 * with the specific ask (`refusalWords`). The events are declared in the manifest like any other
 * (`TURN_EVENTS`); a host before 2.31.0 ignores `event`, and the item is an ordinary item of its state.
 */
/** What an agent may declare with `tell_finished`. */
export const TURN_KINDS = ['done', 'needs-decision', 'research-complete'];
export const RESEARCH_COMPLETE_EVENT = 'research-complete';
export const DECISION_EVENT = 'needs-decision';
export const REFUSED_EVENT = 'action-refused';
export const STALLED_EVENT = 'stalled';
/**
 * The Inbox events an agent module declares for its turns (`events` in the manifest). `research-complete`
 * is the event modules declared since 2.31.0, unchanged; the three `attention` ones are new.
 */
export const TURN_EVENTS = [
    { id: RESEARCH_COMPLETE_EVENT, says: 'Research complete', state: 'done', sound: 'answer' },
    { id: DECISION_EVENT, says: 'Needs your decision', state: 'attention', sound: 'rising' },
    { id: REFUSED_EVENT, says: 'Action refused', state: 'attention', sound: 'bell' },
    { id: STALLED_EVENT, says: 'Stopped without finishing', state: 'attention', sound: 'twotone' },
];
/** The name of the tool every agent module's door offers for it. */
export const TELL_FINISHED_TOOL = 'tell_finished';
/** The tool as a door lists it (`tools/list`). The same words on every agent module's door. */
export function tellFinishedTool() {
    return {
        name: TELL_FINISHED_TOOL,
        description: 'Say how this conversation’s turn ends, so its person sees it right in Kehikot’s Inbox. Call it once, as the last '
            + 'thing before you stop: event "done" when the work you were given is finished; event "needs-decision" with label '
            + 'set to the one question only the person can answer (one line, e.g. "Force-push the rebased branch to origin?"), '
            + 'and then stop — the person is shown that question until they answer; event "research-complete" with a label of a '
            + 'few words when you or a subagent finished researching ("Protocol audit"). Never end a turn only saying you are '
            + 'waiting: set up what will wake you (a background command, a queued run) or ask with needs-decision. A turn that '
            + 'ends without this, and with nothing running that will bring it back, shows the person “Stopped without '
            + 'finishing”. Only this conversation’s own item is changed; nothing is started or typed.',
        inputSchema: {
            type: 'object',
            properties: {
                event: { type: 'string', enum: [...TURN_KINDS], description: 'How the turn ends: "done", "needs-decision" or "research-complete".' },
                label: {
                    type: 'string',
                    maxLength: LIMITS.ACTIVITY_LABEL,
                    description: 'For needs-decision, the one-line question for the person (required). For research-complete, a few words saying what was researched (required). For done, optionally a few words saying what was finished.',
                },
            },
            required: ['event'],
        },
        annotations: { title: 'Tell the person how the turn ends', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    };
}
/**
 * The tool's arguments, read: `event` one of `TURN_KINDS`, `label` one line of at most
 * `LIMITS.ACTIVITY_LABEL` characters (`question` is taken for it too). A question is required for
 * `needs-decision`, a label for `research-complete`. `error` is a sentence for the agent.
 */
export function readTellFinished(args) {
    const given = args && typeof args === 'object' && !Array.isArray(args) ? args : {};
    const kind = typeof given.event === 'string' ? given.event : '';
    if (!TURN_KINDS.includes(kind))
        return { ok: false, error: `event is one of: ${TURN_KINDS.join(', ')}.` };
    const label = oneLine(typeof given.label === 'string' && given.label.trim() ? given.label : given.question, LIMITS.ACTIVITY_LABEL);
    if (kind === DECISION_EVENT && !label)
        return { ok: false, error: 'label is the one question only the person can answer, in one line, e.g. "Force-push the rebased branch to origin?".' };
    if (kind === RESEARCH_COMPLETE_EVENT && !label)
        return { ok: false, error: 'label is a few words saying what was researched, e.g. "Protocol audit".' };
    return { ok: true, told: { kind: kind, label } };
}
/** What the agent is answered once it declared: when the person is told, and what. */
export function toldReply(told, reports) {
    if (!reports)
        return 'Noted, but this conversation does not report when its turn ends, so the person is not told.';
    if (told.kind === DECISION_EVENT)
        return `Noted. When this turn ends the person is shown “${told.label}” as a decision they need to make. Stop now and wait for their answer.`;
    if (told.kind === RESEARCH_COMPLETE_EVENT)
        return 'Noted. The person is told “Research complete” when this turn ends.';
    return 'Noted. The person is told the work is finished when this turn ends.';
}
const TOOL_WORDS = 60;
const ACTION_WORDS = 80;
const REASON_WORDS = 80;
/** The fields of a tool's input that say what it does, in the order they are looked for. */
const ACTION_KEYS = ['command', 'cmd', 'file_path', 'path', 'url', 'pattern', 'query', 'description', 'prompt'];
/** An MCP tool's name (`mcp__server__tool`) as `tool (server)`; any other as it is. */
function toolWords(name) {
    const mcp = /^mcp__(.+?)__(.+)$/.exec(name);
    return oneLine(mcp ? `${mcp[2]} (${mcp[1]})` : name, TOOL_WORDS);
}
function actionWords(input) {
    if (typeof input === 'string')
        return oneLine(input, ACTION_WORDS);
    if (!input || typeof input !== 'object' || Array.isArray(input))
        return '';
    const given = input;
    for (const key of ACTION_KEYS) {
        const value = given[key];
        if (typeof value === 'string' && value.trim())
            return oneLine(value, ACTION_WORDS);
        if (Array.isArray(value) && value.length && value.every((one) => typeof one === 'string'))
            return oneLine(value.join(' '), ACTION_WORDS);
    }
    return '';
}
/**
 * A refusal from what a CLI hands its hook: `tool_name`, `tool_input` and `reason`, the fields of
 * Claude Code's `PermissionDenied` (and any CLI that spells them the same). Null without a tool name.
 * Only a few words of each are kept; nothing else of the payload.
 */
export function refusalOf(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload))
        return null;
    const given = payload;
    const tool = typeof given.tool_name === 'string' ? toolWords(given.tool_name) : '';
    if (!tool)
        return null;
    return { tool, action: actionWords(given.tool_input), reason: oneLine(given.reason, REASON_WORDS) };
}
/**
 * The specific ask a refusal is to the person: the label says what to allow (`Allow Bash: git push
 * --force origin main?`), the detail why it was refused and what granting it means. `folder` is the
 * folder the session works in, named by its last segment.
 */
export function refusalWords(refusal, folder = null) {
    const label = oneLine(`Allow ${refusal.tool}${refusal.action ? `: ${refusal.action}` : ''}?`, LIMITS.ACTIVITY_LABEL);
    const where = folder ? oneLine(folder.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? '', 60) : '';
    const detail = oneLine(`Refused by the permission check${refusal.reason ? ` ${refusal.reason}` : ''}. Granting it lets the session run this${where ? ` in ${where}` : ''}: answer in the session.`, LIMITS.ACTIVITY_DETAIL);
    return { label, detail };
}
/**
 * THE RULE for a turn that ended. In order:
 *
 * 1. Declared `needs-decision`: `attention`, the question.
 * 2. Declared `done` or `research-complete`: `done`.
 * 3. An action refused this turn and nothing declared: `attention`, the refusal's ask.
 * 4. Something set up to wake it (`waking` > 0: background tasks still running, scheduled wake-ups):
 *    `done`, saying so. It is paused, not stalled.
 * 5. Anything else: `attention`, "Stopped without finishing" — the agent stopped without finishing,
 *    asking, or setting up a wake.
 *
 * `waking` is null when the CLI does not say; that is read as nothing set up.
 */
export function turnEnd(input) {
    const { told, refused } = input;
    const waking = Number.isSafeInteger(input.waking) && input.waking > 0 ? input.waking : 0;
    const still = waking ? `; ${waking} background task${waking === 1 ? '' : 's'} still running` : '';
    if (told?.kind === DECISION_EVENT)
        return { state: 'attention', event: DECISION_EVENT, label: told.label, detail: 'asks you to decide: answer in the session' };
    if (told?.kind === RESEARCH_COMPLETE_EVENT)
        return { state: 'done', event: RESEARCH_COMPLETE_EVENT, label: told.label || null, detail: `research complete${still}` };
    if (told?.kind === 'done')
        return { state: 'done', event: null, label: told.label || null, detail: `finished${still}` };
    if (refused) {
        const words = refusalWords(refused, input.folder ?? null);
        return { state: 'attention', event: REFUSED_EVENT, label: words.label, detail: words.detail };
    }
    if (waking)
        return { state: 'done', event: null, label: null, detail: `turn ended${still}` };
    return { state: 'attention', event: STALLED_EVENT, label: null, detail: 'stopped without finishing or asking' };
}
/**
 * What a module's `Stop` hook may answer, once, when a turn would end as a stall and the person asked
 * for it (a module setting, off by default): the reason the agent reads before it goes on. Never
 * when the CLI says the turn is already going on because of a stop hook (`stop_hook_active`).
 */
export function stopBlockReason(self) {
    return ('Kehikot: this turn is ending without saying how. Before you stop, do one of these: call '
        + `tell_finished({ event: "done" }) on the ${self.name} module’s MCP server (${self.door}) if the work is finished; `
        + 'call it with event "needs-decision" and label set to the one question only the person can answer; or set up what '
        + 'will wake you (a background command, a queued run that notifies this session). Do not end on “waiting”.');
}
