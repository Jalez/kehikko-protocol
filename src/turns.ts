import type { ActivityQuestion, InboxEvent } from './activity.js'
import { PLACE_TOKEN_ARG, PLACE_TOKEN_PROPERTY, messageChoicesSchema, type AgentSessionRef, type DeliveryState } from './agent-messages.js'
import { LIMITS } from './limits.js'
import { oneLine, type NotesSelf } from './notes.js'

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
export const TURN_KINDS = ['done', 'needs-decision', 'research-complete'] as const
export type TurnKind = (typeof TURN_KINDS)[number]

export const RESEARCH_COMPLETE_EVENT = 'research-complete'
export const DECISION_EVENT = 'needs-decision'
export const REFUSED_EVENT = 'action-refused'
export const STALLED_EVENT = 'stalled'

/**
 * The Inbox events an agent module declares for its turns (`events` in the manifest). `research-complete`
 * is the event modules declared since 2.31.0, unchanged; the three `attention` ones are new.
 */
export const TURN_EVENTS: readonly InboxEvent[] = [
  { id: RESEARCH_COMPLETE_EVENT, says: 'Research complete', state: 'done', sound: 'answer' },
  { id: DECISION_EVENT, says: 'Needs your decision', state: 'attention', sound: 'rising' },
  { id: REFUSED_EVENT, says: 'Action refused', state: 'attention', sound: 'bell' },
  { id: STALLED_EVENT, says: 'Stopped without finishing', state: 'attention', sound: 'twotone' },
]

/** What an agent declared: the kind, its words (the question, for `needs-decision`), and the question's choices. */
export interface TurnTold {
  kind: TurnKind
  label: string
  /** A decision's choices (the limits of a message's, 2.50.0); empty for none. The person may always answer in words too. */
  choices?: string[]
}

/** The choices a refused action is asked with: the person's answer is typed into the session as theirs. */
export const REFUSAL_CHOICES = ['Yes, allow it', 'No, do it another way'] as const

/** The name of the tool every agent module's door offers for it. */
export const TELL_FINISHED_TOOL = 'tell_finished'

/** The tool as a door lists it (`tools/list`). The same words on every agent module's door. */
export function tellFinishedTool(): {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  annotations: Record<string, unknown>
} {
  return {
    name: TELL_FINISHED_TOOL,
    description:
      'Say how this conversation’s turn ends, so its person sees it right in Kehikot’s Inbox. Call it once, as the last '
      + 'thing before you stop: event "done" when the work you were given is finished; event "needs-decision" with label '
      + 'set to the one question only the person can answer (e.g. "Force-push the rebased branch to origin?") and, when '
      + 'there are a few clear answers, choices (at most 6, short), and then stop: the person sees the question in the Inbox, '
      + 'answers it there with a choice or in words, and the answer is typed into this conversation as theirs. Never leave a '
      + 'question only in your own reply. Event "research-complete" with a label of a '
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
          description: 'For needs-decision, the question for the person (required). For research-complete, a few words saying what was researched (required). For done, optionally a few words saying what was finished.',
        },
        choices: {
          type: 'array',
          items: { type: 'string', maxLength: LIMITS.MESSAGE_CHOICE },
          maxItems: LIMITS.MESSAGE_CHOICES,
          description: 'For needs-decision only: the answers the person can press, each short and different. They can always answer in their own words instead.',
        },
        /* 2.99.0. The conversation's key, for one placed after it started (adopted), whose door carries none: as the message tools take it (`callToken`). */
        [PLACE_TOKEN_ARG]: PLACE_TOKEN_PROPERTY,
      },
      required: ['event'],
    },
    annotations: { title: 'Tell the person how the turn ends', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }
}

/**
 * The tool's arguments, read: `event` one of `TURN_KINDS`, `label` one line of at most
 * `LIMITS.ACTIVITY_LABEL` characters (`question` is taken for it too). A question is required for
 * `needs-decision`, a label for `research-complete`. `error` is a sentence for the agent.
 */
export function readTellFinished(args: unknown): { ok: true; told: TurnTold } | { ok: false; error: string } {
  const given = args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {}
  const kind = typeof given.event === 'string' ? given.event : ''
  if (!(TURN_KINDS as readonly string[]).includes(kind)) return { ok: false, error: `event is one of: ${TURN_KINDS.join(', ')}.` }
  const words = typeof given.label === 'string' && given.label.trim() ? given.label : given.question
  /* A decision's question is shown in full, so it is kept to the item's question limit; anything else is a label. */
  const label = kind === DECISION_EVENT ? clipQuestion(words) : oneLine(words, LIMITS.ACTIVITY_LABEL)
  if (kind === DECISION_EVENT && !label) return { ok: false, error: 'label is the one question only the person can answer, e.g. "Force-push the rebased branch to origin?".' }
  if (kind === RESEARCH_COMPLETE_EVENT && !label) return { ok: false, error: 'label is a few words saying what was researched, e.g. "Protocol audit".' }
  if (given.choices !== undefined && kind !== DECISION_EVENT) return { ok: false, error: 'choices belong to a decision (event "needs-decision").' }
  if (given.choices === undefined || (Array.isArray(given.choices) && given.choices.length === 0)) return { ok: true, told: { kind: kind as TurnKind, label } }
  const choices = messageChoicesSchema.safeParse(given.choices)
  if (!choices.success) return { ok: false, error: `choices: ${choices.error.issues[0]?.message ?? 'malformed'} (at most ${LIMITS.MESSAGE_CHOICES}, each one line of at most ${LIMITS.MESSAGE_CHOICE} characters, all different).` }
  return { ok: true, told: { kind: kind as TurnKind, label, choices: choices.data } }
}

/** A question as an item keeps it: whitespace runs made one space, at most `LIMITS.ACTIVITY_QUESTION` characters. */
function clipQuestion(text: unknown): string {
  return oneLine(text, LIMITS.ACTIVITY_QUESTION)
}

/** What the agent is answered once it declared: when the person is told, and what. */
export function toldReply(told: TurnTold, reports: boolean): string {
  if (!reports) return 'Noted, but this conversation does not report when its turn ends, so the person is not told.'
  if (told.kind === DECISION_EVENT) return `Noted. When this turn ends the person is shown “${oneLine(told.label, LIMITS.ACTIVITY_LABEL)}” in the Inbox as a decision they need to make, and their answer is typed in here. Stop now and wait for it.`
  if (told.kind === RESEARCH_COMPLETE_EVENT) return 'Noted. The person is told “Research complete” when this turn ends.'
  return 'Noted. The person is told the work is finished when this turn ends.'
}

/** An action the CLI refused on its own account, in a few words each. */
export interface Refusal {
  /** The tool, as the person reads it: `Bash`, `queue_run (queue)`. */
  tool: string
  /** A short form of what it was to do: the command, the file. Empty when nothing short says it. */
  action: string
  /** Why, as the CLI said it: `[Irreversible Local Destruction]`. Empty when it said nothing. */
  reason: string
}

const TOOL_WORDS = 60
const ACTION_WORDS = 80
const REASON_WORDS = 80
/** The fields of a tool's input that say what it does, in the order they are looked for. */
const ACTION_KEYS = ['command', 'cmd', 'file_path', 'path', 'url', 'pattern', 'query', 'description', 'prompt'] as const

/** An MCP tool's name (`mcp__server__tool`) as `tool (server)`; any other as it is. */
function toolWords(name: string): string {
  const mcp = /^mcp__(.+?)__(.+)$/.exec(name)
  return oneLine(mcp ? `${mcp[2]} (${mcp[1]})` : name, TOOL_WORDS)
}

function actionWords(input: unknown): string {
  if (typeof input === 'string') return oneLine(input, ACTION_WORDS)
  if (!input || typeof input !== 'object' || Array.isArray(input)) return ''
  const given = input as Record<string, unknown>
  for (const key of ACTION_KEYS) {
    const value = given[key]
    if (typeof value === 'string' && value.trim()) return oneLine(value, ACTION_WORDS)
    if (Array.isArray(value) && value.length && value.every((one) => typeof one === 'string')) return oneLine(value.join(' '), ACTION_WORDS)
  }
  return ''
}

/**
 * A refusal from what a CLI hands its hook: `tool_name`, `tool_input` and `reason`, the fields of
 * Claude Code's `PermissionDenied` (and any CLI that spells them the same). Null without a tool name.
 * Only a few words of each are kept; nothing else of the payload.
 */
export function refusalOf(payload: unknown): Refusal | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const given = payload as Record<string, unknown>
  const tool = typeof given.tool_name === 'string' ? toolWords(given.tool_name) : ''
  if (!tool) return null
  return { tool, action: actionWords(given.tool_input), reason: oneLine(given.reason, REASON_WORDS) }
}

/**
 * The specific ask a refusal is to the person: the label says what to allow (`Allow Bash: git push
 * --force origin main?`), the detail why it was refused and what granting it means. `folder` is the
 * folder the session works in, named by its last segment.
 */
export function refusalWords(refusal: Refusal, folder: string | null = null): { label: string; detail: string } {
  const label = oneLine(`Allow ${refusal.tool}${refusal.action ? `: ${refusal.action}` : ''}?`, LIMITS.ACTIVITY_LABEL)
  const where = folder ? oneLine(folder.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? '', 60) : ''
  const detail = oneLine(
    `Refused by the permission check${refusal.reason ? ` ${refusal.reason}` : ''}. Granting it lets the session run this${where ? ` in ${where}` : ''}: answer in the session.`,
    LIMITS.ACTIVITY_DETAIL,
  )
  return { label, detail }
}

/** What a turn's end is to the person: the item's state, its event, its words. */
export interface TurnEnd {
  state: 'done' | 'attention'
  /** One of `TURN_EVENTS`, or null for a plain item of its state. */
  event: string | null
  /** The item's label when the turn gives one (the question's first line, the research); null for the session's own. */
  label: string | null
  detail: string
  /** The question the person can answer from the Inbox (a decision, a refusal): its whole text and choices. Null for none. */
  asks: { text: string; choices: string[] } | null
}

/**
 * 2.55.0. A turn's end as the item's `question` (`activityQuestionSchema`): what it asks, addressed to
 * the session the module runs (`to`). Undefined when it asks nothing.
 */
export function turnQuestion(end: TurnEnd, to: AgentSessionRef): ActivityQuestion | undefined {
  if (!end.asks) return undefined
  return { text: end.asks.text, ...(end.asks.choices.length ? { choices: [...end.asks.choices] } : {}), to: { ...to } }
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
export function turnEnd(input: { told: TurnTold | null; waking: number | null; refused?: Refusal | null; folder?: string | null }): TurnEnd {
  const { told, refused } = input
  const waking = Number.isSafeInteger(input.waking) && (input.waking as number) > 0 ? (input.waking as number) : 0
  const still = waking ? `; ${waking} background task${waking === 1 ? '' : 's'} still running` : ''
  if (told?.kind === DECISION_EVENT) {
    return { state: 'attention', event: DECISION_EVENT, label: oneLine(told.label, LIMITS.ACTIVITY_LABEL), detail: 'asks you to decide: answer here or in the session', asks: { text: told.label, choices: [...(told.choices ?? [])] } }
  }
  if (told?.kind === RESEARCH_COMPLETE_EVENT) return { state: 'done', event: RESEARCH_COMPLETE_EVENT, label: told.label || null, detail: `research complete${still}`, asks: null }
  if (told?.kind === 'done') return { state: 'done', event: null, label: told.label || null, detail: `finished${still}`, asks: null }
  if (refused) return refusalEnd(refused, input.folder ?? null)
  if (waking) return { state: 'done', event: null, label: null, detail: `turn ended${still}`, asks: null }
  return { state: 'attention', event: STALLED_EVENT, label: null, detail: 'stopped without finishing or asking', asks: null }
}

/**
 * 2.55.0. A refused action as the item it is, whenever it is said (at once, or at the turn's end):
 * `attention`, `action-refused`, the ask as its label and as a question with `REFUSAL_CHOICES`.
 */
export function refusalEnd(refused: Refusal, folder: string | null = null): TurnEnd {
  const words = refusalWords(refused, folder)
  return { state: 'attention', event: REFUSED_EVENT, label: words.label, detail: words.detail, asks: { text: words.label, choices: [...REFUSAL_CHOICES] } }
}

/**
 * What a module's `Stop` hook may answer, once, when a turn would end as a stall and the person asked
 * for it (`REMIND_TURN_SETTING`, on by default since 2.56.0): the reason the agent reads before it goes on. Never
 * when the CLI says the turn is already going on because of a stop hook (`stop_hook_active`).
 */
export function stopBlockReason(self: NotesSelf): string {
  return (
    'Kehikot: this turn is ending without saying how. Before you stop, do one of these: call '
    + `tell_finished({ event: "done" }) on the ${self.name} module’s MCP server (${self.door}) if the work is finished; `
    + 'call it with event "needs-decision" and label set to the one question only the person can answer; or set up what '
    + 'will wake you (a background command, a queued run that notifies this session). Do not end on “waiting”.'
  )
}


/* ------------------------------------------------------------------------ *
 * The reminder after an undeclared turn end (2.56.0)
 * ------------------------------------------------------------------------ */

/**
 * 2.56.0. The ONE line a module types into its own idle session after a turn ended as a stall, when
 * its CLI has no way to send a stopping turn back (`stopBlockReason` is for one that has). Fixed
 * words, the module's own; nothing of the session's or anyone's is put in it.
 */
export const TURN_REMINDER =
  '[Kehikot] Your turn ended without saying how. If the work is done, call tell_finished with done; if you need the person, '
  + "call tell_finished with needs-decision and the question; if you're waiting on something, set up a wake. Then stop."

/** 2.56.0. How long after a stalled turn ends the reminder waits, in ms, so the person's quick follow-up wins. */
export const TURN_REMINDER_DELAY_MS = 20_000

/** 2.56.0. A prompt this soon after the module typed into the session, in ms, is the module's own (its reminder, a message), not the person's. */
export const TURN_REMINDER_OWN_MS = 15_000

/**
 * 2.56.0. The module setting for it, the same in every agent module: a boolean, ON by default, the
 * person's (`personOnly`). A module whose CLI can send a stopping turn back once uses it for that
 * (`stopBlockReason`); any other types `TURN_REMINDER`. Spread it into `declares.settings`; read it
 * with `remindsTurnEnd(values)`.
 */
export const REMIND_TURN_SETTING = {
  key: 'remindTurnEnd',
  label: 'Remind the agent to say how its turn ended',
  description:
    'A session started here that stops without saying it finished, asking you a decision or setting up a wake is reminded once: before it stops where its program allows, else typed in when it is idle a moment. Never after you typed or sent anything, into a question for you, or twice without your prompt between. Off: the Inbox says \u201cStopped without finishing\u201d.',
  type: 'boolean',
  default: true,
  personOnly: true,
} as const

/** 2.56.0. Whether a module's settings values let it remind: on unless the person turned it off. */
export const remindsTurnEnd = (values: Record<string, unknown> | null | undefined): boolean => values?.[REMIND_TURN_SETTING.key] !== false

/** 2.56.0. Everything `shouldRemind` decides from, for one session at one moment. */
export interface ReminderCase {
  /** The person's setting (`remindsTurnEnd`). */
  on: boolean
  /** The module's setting for typing into its sessions (`wakesOnMessages`): off, nothing is typed. */
  wake: boolean
  /** It runs in a terminal THIS module started and owns. */
  own: boolean
  /** Its last turn ended as a stall (`turnEnd`'s `STALLED_EVENT`), and no turn began since. */
  stalled: boolean
  /** Where it stands now. Only `idle` is typed into. */
  state: DeliveryState
  /** How long ago that turn ended, in ms. */
  endedForMs: number
  /** The person typed or sent anything into it since the turn ended. */
  personSince: boolean
  /** It was already reminded for this turn's end. */
  remindedThisTurn: boolean
  /** That turn followed a reminder, with no prompt of the person's between. */
  afterReminder: boolean
  /** Default `TURN_REMINDER_DELAY_MS`. */
  delayMs?: number
}

/**
 * 2.56.0. Whether to type `TURN_REMINDER` into a session now (pure). In order: never with the
 * setting or typing off, into a session running elsewhere, after a turn that did not stall, twice
 * for one turn or twice in a row without a prompt of the person's between, once the person typed or
 * sent anything, before the delay, or into anything but an idle prompt (a question on screen, text
 * not sent, a turn running).
 */
export function shouldRemind(c: ReminderCase): { remind: boolean; why: string } {
  const no = (why: string) => ({ remind: false, why })
  if (!c.on) return no('the person turned the reminder off')
  if (!c.wake) return no('the person turned typing into sessions off')
  if (!c.own) return no('it runs elsewhere')
  if (!c.stalled) return no('its turn did not end as a stall')
  if (c.remindedThisTurn) return no('it was already reminded for this turn')
  if (c.afterReminder) return no('it was reminded before this turn, and the person has not prompted since')
  if (c.personSince) return no('the person typed or sent something since the turn ended')
  if (c.endedForMs < (c.delayMs ?? TURN_REMINDER_DELAY_MS)) return no('the person may still follow up')
  if (c.state === 'asks') return no('it waits for the person\u2019s answer')
  if (c.state === 'typing') return no('the person has typed at its prompt and not sent it')
  if (c.state !== 'idle') return no(`it is ${c.state}`)
  return { remind: true, why: 'its turn ended without saying how, and it is idle at its prompt' }
}

/** 2.56.0. What a module keeps per session for `shouldRemind` (`turnReminder`). */
export interface TurnReminder {
  /** A turn ended; `stalled` when `turnEnd` said `STALLED_EVENT`. */
  ended(at: number, stalled: boolean): void
  /** A prompt was submitted (its CLI's prompt hook). The person's, unless the module typed into it within `TURN_REMINDER_OWN_MS`. */
  prompt(at: number): void
  /** The person typed into the session, or sent it something from the page. */
  person(at: number): void
  /** The module typed something else into it (a message): the prompt that follows is not the person's. */
  typed(at: number): void
  /** The reminder was typed. */
  reminded(at: number): void
  /** The case for `shouldRemind`, given what only the module knows now. */
  decide(now: number, given: Pick<ReminderCase, 'on' | 'wake' | 'own' | 'state'> & { delayMs?: number }): { remind: boolean; why: string }
}

/**
 * 2.56.0. The memory `shouldRemind` needs for one session, pure (no timers, no clock of its own):
 * the module tells it what happened, as it hears it, and asks on its own tick.
 */
export function turnReminder(): TurnReminder {
  let endedAt: number | null = null
  let stalled = false
  let remindedThisTurn = false
  let afterReminder = false
  let personAt = Number.NEGATIVE_INFINITY
  let typedAt = Number.NEGATIVE_INFINITY
  return {
    ended(at, wasStalled) {
      endedAt = at
      stalled = wasStalled
      remindedThisTurn = false
    },
    prompt(at) {
      endedAt = null
      stalled = false
      if (at - typedAt <= TURN_REMINDER_OWN_MS) {
        typedAt = Number.NEGATIVE_INFINITY
        return
      }
      personAt = at
      afterReminder = false
    },
    person(at) {
      personAt = at
    },
    typed(at) {
      typedAt = at
    },
    reminded(at) {
      remindedThisTurn = true
      afterReminder = true
      typedAt = at
    },
    decide(now, given) {
      return shouldRemind({
        ...given,
        stalled: endedAt !== null && stalled,
        endedForMs: endedAt === null ? 0 : now - endedAt,
        personSince: endedAt !== null && personAt >= endedAt,
        remindedThisTurn,
        afterReminder,
      })
    },
  }
}
