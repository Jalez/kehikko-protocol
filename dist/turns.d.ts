import type { InboxEvent } from './activity.js';
import { type NotesSelf } from './notes.js';
/**
 * 2.55.0. How an agent session's turn ended, in ONE rule for every module that runs agent sessions,
 * so a Claude conversation and a Codex one that stop the same way say the same thing in the Inbox.
 * Pure: the module hears the turn end by its own means (a CLI's `Stop` hook, its own event) and
 * reports the item. Design notes: docs/activity.md, "How an agent's turn ended (2.55.0)".
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
export declare const TURN_KINDS: readonly ["done", "needs-decision", "research-complete"];
export type TurnKind = (typeof TURN_KINDS)[number];
export declare const RESEARCH_COMPLETE_EVENT = "research-complete";
export declare const DECISION_EVENT = "needs-decision";
export declare const REFUSED_EVENT = "action-refused";
export declare const STALLED_EVENT = "stalled";
/**
 * The Inbox events an agent module declares for its turns (`events` in the manifest). `research-complete`
 * is the event modules declared since 2.31.0, unchanged; the three `attention` ones are new.
 */
export declare const TURN_EVENTS: readonly InboxEvent[];
/** What an agent declared: the kind, and its words (the question, for `needs-decision`). */
export interface TurnTold {
    kind: TurnKind;
    label: string;
}
/** The name of the tool every agent module's door offers for it. */
export declare const TELL_FINISHED_TOOL = "tell_finished";
/** The tool as a door lists it (`tools/list`). The same words on every agent module's door. */
export declare function tellFinishedTool(): {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    annotations: Record<string, unknown>;
};
/**
 * The tool's arguments, read: `event` one of `TURN_KINDS`, `label` one line of at most
 * `LIMITS.ACTIVITY_LABEL` characters (`question` is taken for it too). A question is required for
 * `needs-decision`, a label for `research-complete`. `error` is a sentence for the agent.
 */
export declare function readTellFinished(args: unknown): {
    ok: true;
    told: TurnTold;
} | {
    ok: false;
    error: string;
};
/** What the agent is answered once it declared: when the person is told, and what. */
export declare function toldReply(told: TurnTold, reports: boolean): string;
/** An action the CLI refused on its own account, in a few words each. */
export interface Refusal {
    /** The tool, as the person reads it: `Bash`, `queue_run (queue)`. */
    tool: string;
    /** A short form of what it was to do: the command, the file. Empty when nothing short says it. */
    action: string;
    /** Why, as the CLI said it: `[Irreversible Local Destruction]`. Empty when it said nothing. */
    reason: string;
}
/**
 * A refusal from what a CLI hands its hook: `tool_name`, `tool_input` and `reason`, the fields of
 * Claude Code's `PermissionDenied` (and any CLI that spells them the same). Null without a tool name.
 * Only a few words of each are kept; nothing else of the payload.
 */
export declare function refusalOf(payload: unknown): Refusal | null;
/**
 * The specific ask a refusal is to the person: the label says what to allow (`Allow Bash: git push
 * --force origin main?`), the detail why it was refused and what granting it means. `folder` is the
 * folder the session works in, named by its last segment.
 */
export declare function refusalWords(refusal: Refusal, folder?: string | null): {
    label: string;
    detail: string;
};
/** What a turn's end is to the person: the item's state, its event, its words. */
export interface TurnEnd {
    state: 'done' | 'attention';
    /** One of `TURN_EVENTS`, or null for a plain item of its state. */
    event: string | null;
    /** The item's label when the turn gives one (the question, the research); null for the session's own. */
    label: string | null;
    detail: string;
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
export declare function turnEnd(input: {
    told: TurnTold | null;
    waking: number | null;
    refused?: Refusal | null;
    folder?: string | null;
}): TurnEnd;
/**
 * What a module's `Stop` hook may answer, once, when a turn would end as a stall and the person asked
 * for it (a module setting, off by default): the reason the agent reads before it goes on. Never
 * when the CLI says the turn is already going on because of a stop hook (`stop_hook_active`).
 */
export declare function stopBlockReason(self: NotesSelf): string;
