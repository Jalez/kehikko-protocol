import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import {
  CAPABILITIES,
  HOST_MESSAGES,
  MESSAGE,
  METHODS,
  PACKAGE_VERSION,
  PERSON_METHODS,
  PROTOCOL,
  SERVER_METHODS,
  actNeedsPress,
  hostMessageSchema,
  inboxActParams,
  inboxAnswerParams,
  inboxMessageSchema,
  inboxReadResult,
  methodParams,
  resultSchemaFor,
  serverAskSchema,
} from '../src/index.js'
import { METHOD_SINCE, CAPABILITY_SINCE, WIRE_SINCE } from '../src/since.js'
import { connect } from '../src/client/index.js'
import { hostStore } from '../src/client/host-store.js'
import type { MessageSource } from '../src/client/mailbox.js'

/**
 * 2.79.0: the person's Inbox, shown by a module's page. The record stays the host's; a page that
 * declares `inbox:person` reads it and acts for the person, and nothing else may.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')

describe('the version', () => {
  test('is 2.79.0 or later, PROTOCOL is still 2, and the entry declares its kind', () => {
    expect(PACKAGE_VERSION).toBe('2.88.0')
    expect(PROTOCOL).toBe(2)
    const log = readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')
    expect(log).toMatch(/## 2\.79\.0 — \d{4}-\d{2}-\d{2}\n\nKind: feature\n/)
  })
})

describe('the methods', () => {
  test('are every one under inbox:person, with params, an answer and a version', () => {
    expect(Object.keys(CAPABILITIES)).toContain('inbox:person')
    expect(CAPABILITY_SINCE['inbox:person']).toBe('2.79.0')
    for (const method of PERSON_METHODS) {
      expect(METHODS[method]).toBe('inbox:person')
      expect(methodParams[method]).toBeDefined()
      expect(resultSchemaFor(method)).toBeDefined()
      expect(['2.79.0', '2.88.0']).toContain(METHOD_SINCE[method])
    }
  })

  test('are never a server’s: none is a server method and the server ask refuses each', () => {
    for (const method of PERSON_METHODS) {
      expect((SERVER_METHODS as readonly string[]).includes(method)).toBe(false)
      const asked = serverAskSchema.safeParse({ module: 'kehikot.inbox', pass: 'a'.repeat(40), project: '/p', method, params: {} })
      expect(asked.success).toBe(false)
    }
  })

  test('every act but reading and seen needs the person’s press', () => {
    expect(actNeedsPress('inbox.read', {})).toBe(false)
    expect(actNeedsPress('inbox.log', {})).toBe(false)
    expect(actNeedsPress('inbox.act', { do: 'seen', keys: [] })).toBe(false)
    for (const act of ['dismiss', 'forget', 'seen-all']) expect(actNeedsPress('inbox.act', { do: act })).toBe(true)
    for (const method of ['inbox.answer', 'inbox.open', 'inbox.use']) expect(actNeedsPress(method, {})).toBe(true)
    expect(actNeedsPress('tracker.get', {})).toBe(false)
  })

  test('seen and dismiss name their items; forget and seen-all need not', () => {
    expect(inboxActParams.safeParse({ do: 'seen' }).success).toBe(false)
    expect(inboxActParams.safeParse({ do: 'dismiss' }).success).toBe(false)
    expect(inboxActParams.safeParse({ do: 'forget' }).success).toBe(true)
    expect(inboxActParams.parse({ do: 'seen-all' }).scope).toBe('everywhere')
    expect(inboxActParams.safeParse({ do: 'dismiss', keys: [{ module: 'kehikot.claude', id: 's1' }] }).success).toBe(true)
    expect(inboxActParams.safeParse({ do: 'hide', keys: [{ module: 'a', id: 'b' }] }).success).toBe(false)
  })

  test('an answer is a choice or the person’s words, not both and not neither', () => {
    const at = { module: 'kehikot.claude', id: 's1' }
    expect(inboxAnswerParams.safeParse({ ...at, choice: 'Yes' }).success).toBe(true)
    expect(inboxAnswerParams.safeParse({ ...at, answer: 'Go on' }).success).toBe(true)
    expect(inboxAnswerParams.safeParse(at).success).toBe(false)
    expect(inboxAnswerParams.safeParse({ ...at, choice: 'Yes', answer: 'Go on' }).success).toBe(false)
  })

  test('a read answer fills its defaults', () => {
    const read = inboxReadResult.parse({
      rev: 3,
      items: [{ module: 'kehikot.claude', id: 's1', by: 'Claude', state: 'attention', label: 'Waiting', entered: 1 }],
    })
    expect(read.items[0]).toMatchObject({ priority: 'normal', here: true, seen: false, mutable: false, where: '' })
    expect(read).toMatchObject({ next: null, elsewhere: [], earlier: 0, muted: [] })
  })
})

describe('kehikot.inbox', () => {
  test('is a host message: changed, or next with the item', () => {
    expect(HOST_MESSAGES).toContain(MESSAGE.INBOX)
    expect(WIRE_SINCE['kehikot.inbox']).toBe('2.79.0')
    for (const message of [
      { type: MESSAGE.INBOX, protocol: PROTOCOL, kind: 'changed', rev: 4 },
      { type: MESSAGE.INBOX, protocol: PROTOCOL, kind: 'next', rev: 4, next: { module: 'kehikot.claude', id: 's1' } },
      { type: MESSAGE.INBOX, protocol: PROTOCOL, kind: 'next', rev: 4, next: null },
    ]) {
      expect(inboxMessageSchema.safeParse(message).success).toBe(true)
      expect(hostMessageSchema.safeParse(message).success).toBe(true)
    }
    expect(inboxMessageSchema.safeParse({ type: MESSAGE.INBOX, protocol: PROTOCOL, kind: 'dismiss', rev: 1 }).success).toBe(false)
  })
})

function fakeWindow() {
  const listeners = new Set<(ev: MessageEvent) => void>()
  const source: MessageSource = {
    parent: {} as Window,
    addEventListener: (_type, fn) => void listeners.add(fn),
    removeEventListener: (_type, fn) => void listeners.delete(fn),
  }
  const deliver = (data: unknown, from: unknown) => {
    for (const fn of [...listeners]) fn({ data, origin: 'null', source: from } as unknown as MessageEvent)
  }
  return { source, deliver }
}
const host = { postMessage: () => {} }
const hello = { type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's1', context: { epic: 'a-epic', project: null, theme: 'light' } }

describe('the client', () => {
  test('connect hands it to onInbox, from the window that greeted only', () => {
    const { source, deliver } = fakeWindow()
    const heard: unknown[] = []
    connect('kehikot.example', { onInbox: (signal) => heard.push(signal) }, { source }).listen()
    deliver(hello, host)
    deliver({ type: MESSAGE.INBOX, protocol: PROTOCOL, kind: 'changed', rev: 1 }, { postMessage: () => {} })
    deliver({ type: MESSAGE.INBOX, protocol: PROTOCOL, kind: 'changed', rev: 2 }, host)
    deliver({ type: MESSAGE.INBOX, protocol: PROTOCOL, kind: 'next', rev: 2, next: { module: 'a', id: 'b' } }, host)
    expect(heard).toEqual([
      { kind: 'changed', rev: 2, next: null },
      { kind: 'next', rev: 2, next: { module: 'a', id: 'b' } },
    ])
  })

  test('hostStore passes it on', () => {
    const { source, deliver } = fakeWindow()
    const heard: string[] = []
    const store = hostStore('kehikot.example', { onInbox: (signal) => heard.push(signal.kind) }, { source, applyTheme: false, reloadWhenStale: false })
    store.start()
    deliver(hello, host)
    deliver({ type: MESSAGE.INBOX, protocol: PROTOCOL, kind: 'next', rev: 0, next: null }, host)
    expect(heard).toEqual(['next'])
    store.stop()
  })
})
