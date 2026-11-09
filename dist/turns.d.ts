import type { ActivityQuestion, InboxEvent } from './activity.js';
import { type AgentSessionRef, type DeliveryState } from './agent-messages.js';
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
/** What an agent declared: the kind, its words (the question, for `needs-decision`), and the question's choices. */
export interface TurnTold {
    kind: TurnKind;
    label: string;
    /** A decision's choices (the limits of a message's, 2.50.0); empty for none. The person may always answer in words too. */
    choices?: string[];
}
/** The choices a refused action is asked with: the person's answer is typed into the session as theirs. */
export declare const REFUSAL_CHOICES: readonly ["Yes, allow it", "No, do it another way"];
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
    /** The item's label when the turn gives one (the question's first line, the research); null for the session's own. */
    label: string | null;
    detail: string;
    /** The question the person can answer from the Inbox (a decision, a refusal): its whole text and choices. Null for none. */
    asks: {
        text: string;
        choices: string[];
    } | null;
}
/**
 * 2.55.0. A turn's end as the item's `question` (`activityQuestionSchema`): what it asks, addressed to
 * the session the module runs (`to`). Undefined when it asks nothing.
 */
export declare function turnQuestion(end: TurnEnd, to: AgentSessionRef): ActivityQuestion | undefined;
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
 * 2.55.0. A refused action as the item it is, whenever it is said (at once, or at the turn's end):
 * `attention`, `action-refused`, the ask as its label and as a question with `REFUSAL_CHOICES`.
 */
export declare function refusalEnd(refused: Refusal, folder?: string | null): TurnEnd;
/**
 * What a module's `Stop` hook may answer, once, when a turn would end as a stall and the person asked
 * for it (`REMIND_TURN_SETTING`, on by default since 2.56.0): the reason the agent reads before it goes on. Never
 * when the CLI says the turn is already going on because of a stop hook (`stop_hook_active`).
 */
export declare function stopBlockReason(self: NotesSelf): string;
/**
 * 2.56.0. The ONE line a module types into its own idle session after a turn ended as a stall, when
 * its CLI has no way to send a stopping turn back (`stopBlockReason` is for one that has). Fixed
 * words, the module's own; nothing of the session's or anyone's is put in it.
 */
export declare const TURN_REMINDER: string;
/** 2.56.0. How long after a stalled turn ends the reminder waits, in ms, so the person's quick follow-up wins. */
export declare const TURN_REMINDER_DELAY_MS = 20000;
/** 2.56.0. A prompt this soon after the module typed into the session, in ms, is the module's own (its reminder, a message), not the person's. */
export declare const TURN_REMINDER_OWN_MS = 15000;
/**
 * 2.56.0. The module setting for it, the same in every agent module: a boolean, ON by default, the
 * person's (`personOnly`). A module whose CLI can send a stopping turn back once uses it for that
 * (`stopBlockReason`); any other types `TURN_REMINDER`. Spread it into `declares.settings`; read it
 * with `remindsTurnEnd(values)`.
 */
export declare const REMIND_TURN_SETTING: {
    readonly key: "remindTurnEnd";
    readonly label: "Remind the agent to say how its turn ended";
    readonly description: "A session started here that stops without saying it finished, asking you a decision or setting up a wake is reminded once: before it stops where its program allows, else typed in when it is idle a moment. Never after you typed or sent anything, into a question for you, or twice without your prompt between. Off: the Inbox says “Stopped without finishing”.";
    readonly type: "boolean";
    readonly default: true;
    readonly personOnly: true;
};
/** 2.56.0. Whether a module's settings values let it remind: on unless the person turned it off. */
export declare const remindsTurnEnd: (values: Record<string, unknown> | null | undefined) => boolean;
/** 2.56.0. Everything `shouldRemind` decides from, for one session at one moment. */
export interface ReminderCase {
    /** The person's setting (`remindsTurnEnd`). */
    on: boolean;
    /** The module's setting for typing into its sessions (`wakesOnMessages`): off, nothing is typed. */
    wake: boolean;
    /** It runs in a terminal THIS module started and owns. */
    own: boolean;
    /** Its last turn ended as a stall (`turnEnd`'s `STALLED_EVENT`), and no turn began since. */
    stalled: boolean;
    /** Where it stands now. Only `idle` is typed into. */
    state: DeliveryState;
    /** How long ago that turn ended, in ms. */
    endedForMs: number;
    /** The person typed or sent anything into it since the turn ended. */
    personSince: boolean;
    /** It was already reminded for this turn's end. */
    remindedThisTurn: boolean;
    /** That turn followed a reminder, with no prompt of the person's between. */
    afterReminder: boolean;
    /** Default `TURN_REMINDER_DELAY_MS`. */
    delayMs?: number;
}
/**
 * 2.56.0. Whether to type `TURN_REMINDER` into a session now (pure). In order: never with the
 * setting or typing off, into a session running elsewhere, after a turn that did not stall, twice
 * for one turn or twice in a row without a prompt of the person's between, once the person typed or
 * sent anything, before the delay, or into anything but an idle prompt (a question on screen, text
 * not sent, a turn running).
 */
export declare function shouldRemind(c: ReminderCase): {
    remind: boolean;
    why: string;
};
/** 2.56.0. What a module keeps per session for `shouldRemind` (`turnReminder`). */
export interface TurnReminder {
    /** A turn ended; `stalled` when `turnEnd` said `STALLED_EVENT`. */
    ended(at: number, stalled: boolean): void;
    /** A prompt was submitted (its CLI's prompt hook). The person's, unless the module typed into it within `TURN_REMINDER_OWN_MS`. */
    prompt(at: number): void;
    /** The person typed into the session, or sent it something from the page. */
    person(at: number): void;
    /** The module typed something else into it (a message): the prompt that follows is not the person's. */
    typed(at: number): void;
    /** The reminder was typed. */
    reminded(at: number): void;
    /** The case for `shouldRemind`, given what only the module knows now. */
    decide(now: number, given: Pick<ReminderCase, 'on' | 'wake' | 'own' | 'state'> & {
        delayMs?: number;
    }): {
        remind: boolean;
        why: string;
    };
}
/**
 * 2.56.0. The memory `shouldRemind` needs for one session, pure (no timers, no clock of its own):
 * the module tells it what happened, as it hears it, and asks on its own tick.
 */
export declare function turnReminder(): TurnReminder;
