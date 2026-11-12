import { describe, expect, test } from 'bun:test'

import { INBOX_GO_LABEL, actNeedsPress, inboxGoSchema, inboxItemSchema, inboxReadResult, serverAskSchema } from '../src/index.js'

const item = { module: 'kehikot.agent', id: 'offer:1', by: 'Agent', state: 'done', label: 'The failing test is in part 3', entered: 1 }

describe('2.87.0: an Inbox item that takes the person somewhere', () => {
  test('go is optional, and an item without it reads as before', () => {
    expect(inboxItemSchema.parse(item).go).toBeUndefined()
    expect(inboxItemSchema.parse({ ...item, go: {} }).go).toEqual({})
    expect(inboxItemSchema.parse({ ...item, go: { label: 'Show me' } }).go).toEqual({ label: 'Show me' })
  })
  test('a label over the limit is refused, not clipped', () => {
    expect(inboxGoSchema.safeParse({ label: 'x'.repeat(10_000) }).success).toBe(false)
  })
  test('the default words', () => {
    expect(INBOX_GO_LABEL).toBe('Take me there')
  })
  test('a read answer carries it through', () => {
    const read = inboxReadResult.parse({ rev: 1, items: [{ ...item, go: {} }] })
    expect(read.items[0]!.go).toEqual({})
  })
  test('taking it is inbox.open: still a person’s act on a fresh press, never a server’s', () => {
    expect(actNeedsPress('inbox.open', { module: item.module, id: item.id })).toBe(true)
    expect(serverAskSchema.safeParse({ method: 'inbox.open', params: { module: item.module, id: item.id } }).success).toBe(false)
  })
})
