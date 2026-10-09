import { describe, expect, test } from 'bun:test'
import {
  CAPABILITIES,
  CONTENT_HOST,
  LIMITS,
  METHODS,
  REACTS_TO,
  contentSignalSchema,
  contentStamp,
  contextSchema,
  methodParams,
  type ContentChange,
} from '../src/index.js'

const at = (n: number) => `2026-10-06T10:00:0${n}Z`
const change = (source: string, epic: string | null, n: number): ContentChange => ({ source, epic, at: at(n) })

describe('content.changed', () => {
  test('it is a method under its own capability', () => {
    expect(METHODS['content.changed']).toBe('content:report')
    expect(Object.hasOwn(CAPABILITIES, 'content:report')).toBe(true)
  })

  test('it names an epic or none, and never whose material it is', () => {
    const params = methodParams['content.changed']
    expect(params.safeParse({}).success).toBe(true)
    expect(params.safeParse({ epic: 'modes-are-modules' }).success).toBe(true)
    expect(params.safeParse({ epic: 'Not A Slug' }).success).toBe(false)
    /* The source is the caller, which the host knows; one sent is dropped. */
    expect(params.parse({ epic: 'x', source: 'host' })).toEqual({ epic: 'x' })
  })
})

describe('the signal in the context', () => {
  test('a context from a host that has never heard of content changes says nothing changed', () => {
    expect(contextSchema.parse({}).content).toEqual([])
  })

  test('it says whose, which epic and when, and nothing of the material', () => {
    const told = contextSchema.parse({
      content: [{ source: 'kehikot.journeys', epic: 'x', at: at(1), steps: [] }, { source: CONTENT_HOST, at: at(2) }],
    })
    expect(told.content).toEqual([
      { source: 'kehikot.journeys', epic: 'x', at: at(1) },
      { source: 'host', epic: null, at: at(2) },
    ])
  })

  test('a module id is carried as it was said: there is one spelling, and nothing is respelled', () => {
    expect(contentSignalSchema.parse([{ source: 'kehikot.journeys', at: at(1) }])[0]!.source).toBe('kehikot.journeys')
    expect(contentSignalSchema.parse([{ source: 'roadmap.journeys', at: at(1) }])[0]!.source).toBe('roadmap.journeys')
  })

  test('it is bounded', () => {
    const many = Array.from({ length: LIMITS.CONTENT + 1 }, (_, i) => ({ source: 'host', epic: `e-${i}`, at: at(1) }))
    expect(contentSignalSchema.safeParse(many).success).toBe(false)
    expect(contentSignalSchema.safeParse(many.slice(1)).success).toBe(true)
  })

  test('a module can say it reacts to it', () => {
    expect(Object.hasOwn(REACTS_TO, 'content')).toBe(true)
  })
})

describe('contentStamp', () => {
  const about = { sources: [CONTENT_HOST, 'kehikot.journeys'], epic: 'x' }

  test('nothing changed, nothing to compare', () => {
    expect(contentStamp([], about)).toBe('')
    expect(contentStamp(undefined, about)).toBe('')
  })

  test('it moves when a source it names changes for its epic', () => {
    const before = contentStamp([change('host', 'x', 1)], about)
    expect(contentStamp([change('host', 'x', 2)], about)).not.toBe(before)
    expect(contentStamp([change('host', 'x', 1), change('kehikot.journeys', 'x', 2)], about)).not.toBe(before)
  })

  test('it stays for another epic and for somebody else’s material', () => {
    const before = contentStamp([change('host', 'x', 1)], about)
    expect(contentStamp([change('host', 'x', 1), change('host', 'y', 2)], about)).toBe(before)
    expect(contentStamp([change('host', 'x', 1), change('kehikot.notes', 'x', 2)], about)).toBe(before)
  })

  test('a change the host could not pin to an epic counts for any', () => {
    const before = contentStamp([], about)
    expect(contentStamp([change('kehikot.journeys', null, 1)], about)).not.toBe(before)
  })

  test('a container showing every epic hears every epic', () => {
    const all = { sources: [CONTENT_HOST], epic: null }
    expect(contentStamp([change('host', 'y', 1)], all)).not.toBe(contentStamp([], all))
  })

  test('the order a host lists changes in is not a change', () => {
    const one = change('host', 'x', 1)
    const two = change('kehikot.journeys', 'x', 2)
    expect(contentStamp([one, two], about)).toBe(contentStamp([two, one], about))
  })
})
