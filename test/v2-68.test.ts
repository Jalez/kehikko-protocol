import { describe, expect, test } from 'bun:test'

import { LIMITS, PACKAGE_VERSION, PROTOCOL, headerItemSchema, headerOptionSchema, optionSections } from '../src/index.js'

describe('the version', () => {
  test('is 2.68.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.80.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('an option’s group and detail (2.68.0)', () => {
  test('an option may name a group and carry a detail line', () => {
    const item = headerItemSchema.parse({
      kind: 'switch',
      id: 'conversation',
      label: 'Conversation: Fix login bug',
      value: 'a',
      options: [
        { id: 'a', label: 'Fix login bug', group: 'This kehikko’s conversation', detail: 'needs you · 5 min ago' },
        { id: 'b', label: 'Draft the results', group: 'Other conversations here', detail: 'idle · 2 h ago' },
        { id: 'new', label: 'New conversation' },
      ],
    })
    expect(item.kind === 'switch' && item.options[0]).toEqual({ id: 'a', label: 'Fix login bug', group: 'This kehikko’s conversation', detail: 'needs you · 5 min ago' })
  })

  test('both are optional, and an option without them parses as before', () => {
    expect(headerOptionSchema.parse({ id: 'a', label: 'A' })).toEqual({ id: 'a', label: 'A' })
  })

  test('both have limits, and neither may be empty', () => {
    expect(headerOptionSchema.safeParse({ id: 'a', label: 'A', group: 'g'.repeat(LIMITS.HEADER_OPTION_GROUP + 1) }).success).toBe(false)
    expect(headerOptionSchema.safeParse({ id: 'a', label: 'A', detail: 'd'.repeat(LIMITS.HEADER_OPTION_DETAIL + 1) }).success).toBe(false)
    expect(headerOptionSchema.safeParse({ id: 'a', label: 'A', group: '' }).success).toBe(false)
    expect(headerOptionSchema.safeParse({ id: 'a', label: 'A', detail: '' }).success).toBe(false)
    expect(headerOptionSchema.safeParse({ id: 'a', label: 'A', group: 'g'.repeat(LIMITS.HEADER_OPTION_GROUP), detail: 'd'.repeat(LIMITS.HEADER_OPTION_DETAIL) }).success).toBe(true)
  })

  test('a host before 2.68.0 reads the label alone: the old option shape strips both', async () => {
    const { z } = await import('zod')
    const old = z.object({ id: z.string(), label: z.string() })
    expect(old.parse({ id: 'a', label: 'A', group: 'G', detail: 'D' })).toEqual({ id: 'a', label: 'A' })
  })

  test('optionSections: runs of neighbouring options under one heading, in the order given', () => {
    const options = [
      { id: 'a', group: 'Own' },
      { id: 'b', group: 'Others' },
      { id: 'c', group: 'Others' },
      { id: 'new' },
      { id: 'drop' },
    ]
    expect(optionSections(options)).toEqual([
      { group: 'Own', options: [options[0]!] },
      { group: 'Others', options: [options[1]!, options[2]!] },
      { group: null, options: [options[3]!, options[4]!] },
    ])
  })

  test('optionSections: no groups is one run with no heading; a group named twice apart is two runs', () => {
    expect(optionSections([{ id: 'a' }, { id: 'b' }])).toEqual([{ group: null, options: [{ id: 'a' }, { id: 'b' }] }])
    expect(optionSections([{ id: 'a', group: 'G' }, { id: 'b' }, { id: 'c', group: 'G' }]).map((s) => s.group)).toEqual(['G', null, 'G'])
    expect(optionSections([])).toEqual([])
  })
})
