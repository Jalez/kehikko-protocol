import { describe, expect, test } from 'bun:test'

import {
  DECISION_EVENT,
  LIMITS,
  NOTES_VERSION,
  PACKAGE_VERSION,
  REFUSED_EVENT,
  STALLED_EVENT,
  TURN_EVENTS,
  TURN_KINDS,
  finishLine,
  INBOX_VIA,
  REFUSAL_CHOICES,
  activityItemSchema,
  agentMessageSchema,
  typedFrame,
  messageLine,
  turnQuestion,
  inboxEventsSchema,
  readTellFinished,
  refusalOf,
  refusalWords,
  sessionNotes,
  stopBlockReason,
  tellFinishedTool,
  toldReply,
  turnEnd,
} from '../src/index.js'

/**
 * 2.55.0: how an agent session's turn ended. The agent declares done, needs-decision or research;
 * a turn that declares nothing and set up nothing to wake it is a stall; a refused action is an ask.
 */

const SELF = { module: 'kehikot.claude', name: 'Claude', door: 'kehikko-claude' }

describe('2.55.0', () => {
  test('is the package version, and the notes are told again', () => {
    expect(PACKAGE_VERSION).toBe('2.88.0')
    expect(NOTES_VERSION).toBeGreaterThanOrEqual(8)
  })

  test('the turn events are valid manifest events, research-complete unchanged', () => {
    expect(inboxEventsSchema.safeParse(TURN_EVENTS).success).toBe(true)
    expect(TURN_EVENTS.find((one) => one.id === 'research-complete')).toEqual({ id: 'research-complete', says: 'Research complete', state: 'done', sound: 'answer' })
    for (const id of [DECISION_EVENT, REFUSED_EVENT, STALLED_EVENT]) expect(TURN_EVENTS.find((one) => one.id === id)?.state).toBe('attention')
  })

  test('the tool lists every kind and needs only the event', () => {
    const tool = tellFinishedTool()
    expect(tool.name).toBe('tell_finished')
    expect((tool.inputSchema.properties as { event: { enum: string[] } }).event.enum).toEqual([...TURN_KINDS])
    expect(tool.inputSchema.required).toEqual(['event'])
  })

  test('reading the arguments', () => {
    expect(readTellFinished({ event: 'done' })).toEqual({ ok: true, told: { kind: 'done', label: '' } })
    expect(readTellFinished({ event: 'needs-decision', label: '  Force-push\nthe branch? ' })).toEqual({ ok: true, told: { kind: 'needs-decision', label: 'Force-push the branch?' } })
    expect(readTellFinished({ event: 'needs-decision', question: 'Merge it?' })).toEqual({ ok: true, told: { kind: 'needs-decision', label: 'Merge it?' } })
    expect(readTellFinished({ event: 'needs-decision' }).ok).toBe(false)
    expect(readTellFinished({ event: 'research-complete' }).ok).toBe(false)
    expect(readTellFinished({ event: 'finished' }).ok).toBe(false)
    expect(readTellFinished(null).ok).toBe(false)
    const long = readTellFinished({ event: 'needs-decision', label: 'x'.repeat(5000) })
    expect(long.ok && long.told.label.length).toBe(LIMITS.ACTIVITY_QUESTION)
    expect(readTellFinished({ event: 'needs-decision', label: 'Which?', choices: ['A', 'B'] })).toEqual({ ok: true, told: { kind: 'needs-decision', label: 'Which?', choices: ['A', 'B'] } })
    expect(readTellFinished({ event: 'needs-decision', label: 'Which?', choices: [] })).toEqual({ ok: true, told: { kind: 'needs-decision', label: 'Which?' } })
    expect(readTellFinished({ event: 'needs-decision', label: 'Which?', choices: ['A', 'A'] }).ok).toBe(false)
    expect(readTellFinished({ event: 'needs-decision', label: 'Which?', choices: ['1', '2', '3', '4', '5', '6', '7'] }).ok).toBe(false)
    expect(readTellFinished({ event: 'done', choices: ['A'] }).ok).toBe(false)
  })

  test('the reply says when the person is told', () => {
    expect(toldReply({ kind: 'needs-decision', label: 'Merge it?' }, true)).toContain('“Merge it?”')
    expect(toldReply({ kind: 'done', label: '' }, false)).toContain('does not report')
  })

  test('a refusal from a PermissionDenied payload, and its ask', () => {
    const refused = refusalOf({ tool_name: 'Bash', tool_input: { command: 'git push --force origin main', description: 'Push' }, reason: '[Irreversible Remote Change]', session_id: 'x' })
    expect(refused).toEqual({ tool: 'Bash', action: 'git push --force origin main', reason: '[Irreversible Remote Change]' })
    const words = refusalWords(refused!, '/Users/me/work/repo-worktrees/fix/')
    expect(words.label).toBe('Allow Bash: git push --force origin main?')
    expect(words.detail).toContain('[Irreversible Remote Change]')
    expect(words.detail).toContain('in fix')
    expect(refusalOf({ tool_name: 'mcp__queue__queue_run', tool_input: { command: ['git', 'push', '-f'] } })).toEqual({ tool: 'queue_run (queue)', action: 'git push -f', reason: '' })
    expect(refusalOf({ tool_input: {} })).toBeNull()
    expect(refusalOf('Bash')).toBeNull()
    const huge = refusalWords({ tool: 'T', action: 'a'.repeat(300), reason: 'r'.repeat(300) })
    expect(huge.label.length).toBeLessThanOrEqual(LIMITS.ACTIVITY_LABEL)
    expect(huge.detail.length).toBeLessThanOrEqual(LIMITS.ACTIVITY_DETAIL)
  })

  describe('THE RULE', () => {
    test('a decision is attention with the question', () => {
      const end = turnEnd({ told: { kind: 'needs-decision', label: 'Merge it?', choices: ['Yes', 'No'] }, waking: 3 })
      expect(end).toEqual({ state: 'attention', event: 'needs-decision', label: 'Merge it?', detail: 'asks you to decide: answer here or in the session', asks: { text: 'Merge it?', choices: ['Yes', 'No'] } })
      const to = { module: 'kehikot.claude', session: 'abc' }
      expect(turnQuestion(end, to)).toEqual({ text: 'Merge it?', choices: ['Yes', 'No'], to })
      expect(activityItemSchema.safeParse({ id: 'abc', state: 'attention', label: 'Merge it?', question: turnQuestion(end, to) }).data?.question).toEqual({ text: 'Merge it?', choices: ['Yes', 'No'], to })
      expect(turnQuestion(turnEnd({ told: { kind: 'needs-decision', label: 'Free?' }, waking: 0 }), to)).toEqual({ text: 'Free?', to })
      expect(turnQuestion(turnEnd({ told: null, waking: 0 }), to)).toBeUndefined()
    })
    test('done and research are done', () => {
      expect(turnEnd({ told: { kind: 'done', label: '' }, waking: 0 })).toEqual({ state: 'done', event: null, label: null, detail: 'finished', asks: null })
      expect(turnEnd({ told: { kind: 'research-complete', label: 'Audit' }, waking: 1 })).toEqual({ state: 'done', event: 'research-complete', label: 'Audit', detail: 'research complete; 1 background task still running', asks: null })
    })
    test('a refusal with nothing declared is the ask', () => {
      const end = turnEnd({ told: null, waking: 0, refused: { tool: 'Bash', action: 'rm -rf x', reason: '' } })
      expect(end.state).toBe('attention')
      expect(end.event).toBe('action-refused')
      expect(end.label).toBe('Allow Bash: rm -rf x?')
      expect(end.asks).toEqual({ text: 'Allow Bash: rm -rf x?', choices: [...REFUSAL_CHOICES] })
    })
    test('something set up to wake it is paused, not stalled', () => {
      expect(turnEnd({ told: null, waking: 2 })).toEqual({ state: 'done', event: null, label: null, detail: 'turn ended; 2 background tasks still running', asks: null })
    })
    test('anything else is a stall, unknown waking included', () => {
      for (const waking of [0, null, -1, Number.NaN]) expect(turnEnd({ told: null, waking })).toEqual({ state: 'attention', event: 'stalled', label: null, detail: 'stopped without finishing or asking', asks: null })
    })
  })

  test('the notes tell the contract, and the stop reason names the door', () => {
    expect(finishLine(SELF)).toContain('tell_finished({ event: "needs-decision", label, choices })')
    expect(finishLine(SELF)).toContain('Inbox')
    expect(finishLine(SELF)).toContain('(kehikko-claude)')
    const said = sessionNotes({ self: SELF, modules: [], place: { project: '/p', epic: null, parts: [], kehikko: null } }, 'start', null)
    expect(said.text).toContain(finishLine(SELF))
    expect(stopBlockReason(SELF)).toContain('kehikko-claude')
  })

  describe('a question answered from the Inbox', () => {
    const to = { module: 'kehikot.claude', session: 'abc' }
    test('an item carries one; a bad one is dropped and the item kept', () => {
      const item = (question: unknown) => activityItemSchema.parse({ id: 'abc', state: 'attention', label: 'x', question })
      expect(item({ text: 'Q?', to }).question).toEqual({ text: 'Q?', to })
      expect(item({ text: 'Q?', choices: ['A', 'B'], to, replyTo: 4 }).question).toEqual({ text: 'Q?', choices: ['A', 'B'], to, replyTo: 4 })
      expect(item({ text: 'Q?', choices: ['A', 'A'], to }).question).toBeUndefined()
      expect(item({ text: 'x'.repeat(LIMITS.ACTIVITY_QUESTION + 1), to }).question).toBeUndefined()
      expect(item({ text: 'Q?' }).question).toBeUndefined()
    })
    test('the answer is the person’s message via Inbox, answering the question', () => {
      const message = agentMessageSchema.parse({
        id: 15,
        at: '2026-11-09T10:00:00Z',
        from: { module: 'kehikko', name: INBOX_VIA, session: null, place: { epic: null, parts: [], kehikko: null }, person: true },
        to: { session: to },
        thread: null,
        body: 'Yes',
        answers: 'Force-push the [rebased] branch?',
      })
      expect(typedFrame(message)).toBe('⟦Your person via Inbox · #15 · answering “Force-push the rebased branch?”⟧')
      expect(messageLine(message)).toContain('answering "Force-push the [rebased] branch?"')
      expect(agentMessageSchema.parse({ ...message, answers: undefined }).answers).toBeNull()
    })
  })
})
