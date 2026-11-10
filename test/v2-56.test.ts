import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import {
  PACKAGE_VERSION,
  REMIND_TURN_SETTING,
  TURN_REMINDER,
  TURN_REMINDER_DELAY_MS,
  TURN_REMINDER_OWN_MS,
  remindsTurnEnd,
  settingsDeclarationSchema,
  shouldRemind,
  turnReminder,
  type ReminderCase,
} from '../src/index.js'

/**
 * 2.56.0: the reminder a module types into its own idle session after a turn ended without saying
 * how, when its CLI cannot send a stopping turn back. One fixed line, at most once a turn, never
 * twice without the person's prompt between, never over the person.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')

const due = (over: Partial<ReminderCase> = {}): ReminderCase => ({
  on: true,
  wake: true,
  own: true,
  stalled: true,
  state: 'idle',
  endedForMs: TURN_REMINDER_DELAY_MS,
  personSince: false,
  remindedThisTurn: false,
  afterReminder: false,
  ...over,
})

describe('the version', () => {
  test('is 2.56.0, and the docs say it', () => {
    expect(PACKAGE_VERSION).toBe('2.63.0')
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.56.0')
    expect(readFileSync(join(REPO, 'docs/activity.md'), 'utf8')).toContain('shouldRemind')
  })
})

describe('the words and the setting', () => {
  test('one fixed line naming every way to end a turn', () => {
    expect(TURN_REMINDER).toBe(
      "[Kehikot] Your turn ended without saying how. If the work is done, call tell_finished with done; if you need the person, call tell_finished with needs-decision and the question; if you're waiting on something, set up a wake. Then stop.",
    )
    expect(TURN_REMINDER).not.toContain('\n')
  })
  test('a setting every agent module declares: on by default, the person’s', () => {
    expect(settingsDeclarationSchema.safeParse([REMIND_TURN_SETTING]).success).toBe(true)
    expect(REMIND_TURN_SETTING.label).toBe('Remind the agent to say how its turn ended')
    expect(REMIND_TURN_SETTING.default).toBe(true)
    expect(REMIND_TURN_SETTING.personOnly).toBe(true)
    expect(remindsTurnEnd(undefined)).toBe(true)
    expect(remindsTurnEnd({})).toBe(true)
    expect(remindsTurnEnd({ remindTurnEnd: true })).toBe(true)
    expect(remindsTurnEnd({ remindTurnEnd: false })).toBe(false)
  })
})

describe('shouldRemind', () => {
  test('an idle session, its turn stalled a while ago, nobody since: remind', () => {
    expect(shouldRemind(due()).remind).toBe(true)
  })
  test('never with the setting off, typing off, or a session running elsewhere', () => {
    expect(shouldRemind(due({ on: false })).remind).toBe(false)
    expect(shouldRemind(due({ wake: false })).remind).toBe(false)
    expect(shouldRemind(due({ own: false })).remind).toBe(false)
  })
  test('never after a turn that said how it ended, or set up a wake', () => {
    expect(shouldRemind(due({ stalled: false })).remind).toBe(false)
  })
  test('at most once a turn, and never twice in a row without the person’s prompt', () => {
    expect(shouldRemind(due({ remindedThisTurn: true })).remind).toBe(false)
    expect(shouldRemind(due({ afterReminder: true })).remind).toBe(false)
  })
  test('never once the person typed or sent anything, or is typing', () => {
    expect(shouldRemind(due({ personSince: true })).remind).toBe(false)
    expect(shouldRemind(due({ state: 'typing' })).remind).toBe(false)
  })
  test('never while a question is on screen, a turn runs, or the state is not known', () => {
    for (const state of ['asks', 'busy', 'asleep', 'unknown'] as const) expect(shouldRemind(due({ state })).remind).toBe(false)
  })
  test('waits the delay so the person’s quick follow-up wins', () => {
    expect(TURN_REMINDER_DELAY_MS).toBe(20_000)
    expect(shouldRemind(due({ endedForMs: TURN_REMINDER_DELAY_MS - 1 })).remind).toBe(false)
    expect(shouldRemind(due({ endedForMs: 500, delayMs: 100 })).remind).toBe(true)
  })
  test('says why in words', () => {
    expect(shouldRemind(due({ state: 'asks' })).why).toContain('answer')
    expect(shouldRemind(due()).why).toContain('idle')
  })
})

describe('turnReminder: what a module keeps per session', () => {
  const NOW = { on: true, wake: true, own: true, state: 'idle' as const }
  test('reminds once after a stall, not again for the same turn', () => {
    const r = turnReminder()
    r.ended(1_000, true)
    expect(r.decide(1_000 + TURN_REMINDER_DELAY_MS - 1, NOW).remind).toBe(false)
    expect(r.decide(1_000 + TURN_REMINDER_DELAY_MS, NOW).remind).toBe(true)
    r.reminded(30_000)
    expect(r.decide(40_000, NOW).remind).toBe(false)
  })
  test('the turn the reminder started stalls again: not twice in a row; after the person prompts, again', () => {
    const r = turnReminder()
    r.ended(0, true)
    r.reminded(20_000)
    r.prompt(20_500)
    r.ended(30_000, true)
    expect(r.decide(60_000, NOW).remind).toBe(false)
    r.prompt(70_000)
    r.ended(80_000, true)
    expect(r.decide(100_000, NOW).remind).toBe(true)
  })
  test('a prompt long after the reminder was typed is the person’s', () => {
    const r = turnReminder()
    r.ended(0, true)
    r.reminded(20_000)
    r.prompt(20_000 + TURN_REMINDER_OWN_MS + 1)
    r.ended(50_000, true)
    expect(r.decide(70_000, NOW).remind).toBe(true)
  })
  test('the person typing or sending since the end: never', () => {
    const r = turnReminder()
    r.ended(0, true)
    r.person(5_000)
    expect(r.decide(60_000, NOW).remind).toBe(false)
    const s = turnReminder()
    s.person(0)
    s.ended(1, true)
    expect(s.decide(60_000, NOW).remind).toBe(true)
  })
  test('a declared end, or a turn begun since: never', () => {
    const r = turnReminder()
    r.ended(0, false)
    expect(r.decide(60_000, NOW).remind).toBe(false)
    r.ended(0, true)
    r.typed(10_000)
    r.prompt(10_100)
    expect(r.decide(60_000, NOW).remind).toBe(false)
  })
  test('a message typed by the module and its prompt does not count as the person’s', () => {
    const r = turnReminder()
    r.ended(0, true)
    r.reminded(20_000)
    r.prompt(20_100)
    r.ended(25_000, true)
    r.typed(26_000)
    r.prompt(26_100)
    r.ended(30_000, true)
    expect(r.decide(60_000, NOW).remind).toBe(false)
  })
})
