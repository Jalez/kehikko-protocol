import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import {
  LIMITS,
  METHODS,
  METHOD_SINCE,
  MODULE_MESSAGES_TYPED,
  MESSAGES_TYPED_READ_ONLY,
  PACKAGE_VERSION,
  PROTOCOL,
  SERVER_METHODS,
  SERVER_METHOD_SINCE,
  agentMessageSchema,
  isModuleMessage,
  isPersonMessage,
  methodParams,
  methodResults,
  messageNotifyParams,
  messageSendResult,
  serverAskSchema,
  shouldWake,
  typedFrame,
  typedMessages,
  type AgentMessage,
  type WakeReader,
} from '../src/index.js'

/**
 * 2.54.0: a module's notice to the session that asked it for something (`messages.notify`), from the
 * module's server, addressed by the asker's place token; delivered by typing like any message, and
 * told as the module's words, not another session's.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')
const TOKEN = 'd'.repeat(32)
const YOU: WakeReader = { module: 'kehikot.claude', session: 'me-1', place: { epic: 'methods', parts: [], kehikko: 'writing' } }

let ids = 400
const message = (over: Record<string, unknown> = {}): AgentMessage =>
  agentMessageSchema.parse({
    id: ++ids,
    at: '2026-11-09T12:00:00.000Z',
    from: { module: 'kehikot.codex', name: 'Codex', session: 'sess-1', place: { epic: 'methods', parts: [], kehikko: 'writing' } },
    to: { session: { module: 'kehikot.claude', session: 'me-1' } },
    thread: null,
    body: 'I am on server/auth.ts.',
    ...over,
  })
/** What a host stamps on a notice: the sending module, no session, the asking session's place, to that session. */
const notice = (over: Record<string, unknown> = {}): AgentMessage =>
  message({
    from: { module: 'kehikot.queue', name: 'Queue', session: null, place: { epic: 'methods', parts: [], kehikko: 'writing' } },
    body: 'Run "kehikko main" passed (exit 0) in 4m 12s.',
    kind: 'report',
    ...over,
  })

describe('the version', () => {
  test('is 2.54.0, PROTOCOL is still 2, and the docs say it', () => {
    expect(PACKAGE_VERSION).toBe('2.86.0')
    expect(PROTOCOL).toBe(2)
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.54.0')
    expect(readFileSync(join(REPO, 'docs/agent-messages.md'), 'utf8')).toContain('messages.notify')
    expect(readFileSync(join(REPO, 'docs/methods.md'), 'utf8')).toContain('messages.notify')
  })
})

describe('messages.notify: a module’s notice to the session that asked', () => {
  test('a server method under agents:message, answered like a send', () => {
    expect(METHODS['messages.notify']).toBe('agents:message')
    expect(METHOD_SINCE['messages.notify']).toBe('2.54.0')
    expect((SERVER_METHODS as readonly string[]).includes('messages.notify')).toBe(true)
    expect(SERVER_METHOD_SINCE['messages.notify']).toBe('2.54.0')
    expect(methodParams['messages.notify']).toBe(messageNotifyParams)
    expect(methodResults['messages.notify']).toBe(messageSendResult)
  })
  test('names a token, never a project: the project is the token’s', () => {
    const ask = serverAskSchema.safeParse({ module: 'kehikot.queue', pass: 'p'.repeat(32), method: 'messages.notify', params: { token: TOKEN, body: 'Done.' } })
    expect(ask.success).toBe(true)
  })
  test('the token and a body are required; the body is refused, not clipped, past the limit', () => {
    expect(messageNotifyParams.safeParse({ token: TOKEN, body: 'Run passed.' }).success).toBe(true)
    expect(messageNotifyParams.safeParse({ body: 'Run passed.' }).success).toBe(false)
    expect(messageNotifyParams.safeParse({ token: 'short', body: 'Run passed.' }).success).toBe(false)
    expect(messageNotifyParams.safeParse({ token: TOKEN, body: '   ' }).success).toBe(false)
    expect(messageNotifyParams.safeParse({ token: TOKEN, body: 'x'.repeat(LIMITS.MESSAGE_BODY + 1) }).success).toBe(false)
  })
  test('it tells, it does not ask: note or report only, and no addressing of its own', () => {
    expect(messageNotifyParams.safeParse({ token: TOKEN, body: 'Done.', kind: 'report' }).success).toBe(true)
    expect(messageNotifyParams.safeParse({ token: TOKEN, body: 'Done.', kind: 'question' }).success).toBe(false)
    const parsed = messageNotifyParams.parse({ token: TOKEN, body: 'Done.', to: { project: true }, once: true, choices: ['a'] })
    expect('to' in parsed || 'once' in parsed || 'choices' in parsed).toBe(false)
  })
  test('bounded per module and receiving session', () => {
    expect(LIMITS.NOTICES_PER_MINUTE).toBe(6)
    expect(LIMITS.NOTICES_PER_HOUR).toBe(60)
  })
})

describe('a notice, delivered', () => {
  test('a module’s own message: no session, not the person’s', () => {
    expect(isModuleMessage(notice())).toBe(true)
    expect(isModuleMessage(message())).toBe(false)
    expect(isPersonMessage(notice())).toBe(false)
    const person = message({ from: { module: 'kehikot.orchestrator', name: 'Orchestrator', session: null, place: { epic: null, parts: [], kehikko: null }, person: true } })
    expect(isModuleMessage(person)).toBe(false)
  })
  test('wakes the session it is addressed to, and no other', () => {
    expect(shouldWake(notice(), YOU)).toBe(true)
    expect(shouldWake(notice(), { ...YOU, session: 'other' })).toBe(false)
    expect(shouldWake(notice(), { ...YOU, module: 'kehikot.codex' })).toBe(false)
  })
  test('typed under the module’s name, and told as the module’s words', () => {
    const one = notice()
    /* 2.75.0: the compact marker; what a module's notice is is said once, in the notes. */
    expect(typedFrame(one)).toBe(`⟦Queue · report #${one.id} · epic methods, kehikko writing⟧`)
    expect(typedFrame(one, YOU)).toBe(`⟦Queue · report #${one.id}⟧`)
    const text = typedMessages([one], false, { you: YOU })
    expect(text).toBe(`⟦Queue · report #${one.id}⟧ Run "kehikko main" passed (exit 0) in 4m 12s.`)
    expect(text).not.toContain(MODULE_MESSAGES_TYPED)
    expect(text).not.toContain(MESSAGES_TYPED_READ_ONLY)
  })
  test('beside another session’s message, each is told for what it is', () => {
    const text = typedMessages([message(), notice()], false, { you: YOU })
    const [a, b] = text.split('\n')
    expect(a).toStartWith('⟦Codex session · #')
    expect(b).toStartWith('⟦Queue · report #')
  })
  test('a session’s message alone is told exactly as before', () => {
    const text = typedMessages([message()])
    expect(text).not.toContain(MODULE_MESSAGES_TYPED)
  })
})
