import { describe, expect, test } from 'bun:test'
import {
  LIMITS,
  PART_ID,
  REACTS_TO,
  contextMessageSchema,
  contextSchema,
  focusCount,
  helloSchema,
  isFocused,
  partInFocus,
  partSchema,
  partsSchema,
  pickedParts,
  refInFocus,
  type EpicPart,
} from '../src/index.js'

/**
 * `context.parts`: the parts of the open epic, and which are picked out.
 *
 * The sentence this exists for is the user's: "group things under an epic and
 * focus the workspace on one or several parts of it, while still being able to
 * see all parts." Two facts — what the parts are, which are picked — and the
 * one promise that makes it safe to add: a module that never reads the field
 * is exactly as correct as it was.
 */

const seam: EpicPart = { id: 'the-posting-seam', heading: 'The posting seam', refs: ['gh#1', 'gh#3'], picked: false }
const tests: EpicPart = { id: 'what-the-tests-check', heading: 'What the tests check', refs: ['gh#14'], picked: false }
const page: EpicPart = { id: 'the-page', heading: 'The page', refs: [], picked: false }

const pick = (part: EpicPart): EpicPart => ({ ...part, picked: true })

describe('one part', () => {
  test('an id is all that is required; the rest rests', () => {
    expect(partSchema.parse({ id: 'the-posting-seam' })).toEqual({
      id: 'the-posting-seam',
      heading: '',
      refs: [],
      picked: false,
    })
  })

  test('the id is held to the class an epic slug is held to', () => {
    expect(PART_ID.test('the-posting-seam')).toBe(true)
    for (const id of ['The posting seam', '', '../x', 'a'.repeat(81), '__proto__']) {
      expect(partSchema.safeParse({ id }).success).toBe(false)
    }
  })

  test('the heading and the refs are bounded, at the numbers the essays name', () => {
    expect(partSchema.safeParse({ id: 'a', heading: 'x'.repeat(LIMITS.TITLE + 1) }).success).toBe(false)
    const refs = Array.from({ length: LIMITS.PART_REFS + 1 }, (_, i) => `gh#${i}`)
    expect(partSchema.safeParse({ id: 'a', refs }).success).toBe(false)
    expect(partSchema.safeParse({ id: 'a', refs: refs.slice(1) }).success).toBe(true)
    expect(LIMITS.PART_REFS).toBe(256)
    /* More than a selection may hold: a part is a chapter, not a gesture. */
    expect(LIMITS.PART_REFS).toBeGreaterThan(LIMITS.REFS)
  })

  test('the list is bounded too', () => {
    const many = Array.from({ length: LIMITS.PARTS + 1 }, (_, i) => ({ id: `part-${i}` }))
    expect(partsSchema.safeParse(many).success).toBe(false)
    expect(partsSchema.safeParse(many.slice(1)).success).toBe(true)
    expect(LIMITS.PARTS).toBe(32)
  })
})

describe('the context carries them', () => {
  test('a context that says nothing about parts has none, which is the whole epic', () => {
    /* What a host from before this field sends, and what an epic with no
       parts sends. Both must read as "nothing is narrowed". */
    const context = contextSchema.parse({})
    expect(context.parts).toEqual([])
    expect(isFocused(context.parts)).toBe(false)
  })

  test('every part is listed, picked or not, in the order given', () => {
    const context = contextSchema.parse({ epic: 'an-epic', parts: [seam, pick(tests), page] })
    expect(context.parts.map((part) => part.id)).toEqual(['the-posting-seam', 'what-the-tests-check', 'the-page'])
    expect(context.parts.map((part) => part.picked)).toEqual([false, true, false])
    /* The unpicked ones keep their refs: that is what "N outside" is counted from. */
    expect(context.parts[0]?.refs).toEqual(['gh#1', 'gh#3'])
  })

  test('both messages that carry a context carry it', () => {
    const hello = helloSchema.parse({
      type: 'kehikot.hello',
      protocol: 2,
      session: 's',
      context: { parts: [pick(seam)] },
    })
    expect(hello.context.parts[0]?.picked).toBe(true)
    const told = contextMessageSchema.parse({ type: 'kehikot.context', protocol: 2, parts: [pick(seam)] })
    expect(told.parts[0]?.id).toBe('the-posting-seam')
  })

  test('a module that ignores the field reads everything else exactly as before', () => {
    const before = contextSchema.parse({ epic: 'an-epic', selection: ['gh#1'] })
    const { parts: _parts, ...after } = contextSchema.parse({
      epic: 'an-epic',
      selection: ['gh#1'],
      parts: [pick(seam), tests],
    })
    const { parts: _none, ...rest } = before
    expect(after).toEqual(rest)
  })

  test('a manifest has a word for reacting to it', () => {
    expect(REACTS_TO).toHaveProperty('parts')
    expect(REACTS_TO.parts).toContain('picked out')
  })
})

describe('what is in front of the person', () => {
  test('nothing picked is the whole epic: every ref and every step is in focus', () => {
    const parts = [seam, tests]
    expect(pickedParts(parts)).toEqual([])
    expect(refInFocus(parts, 'gh#1')).toBe(true)
    expect(refInFocus(parts, 'gh#999')).toBe(true)
    expect(partInFocus(parts, 'the-posting-seam')).toBe(true)
    expect(partInFocus(parts, null)).toBe(true)
    expect(partInFocus(parts, undefined)).toBe(true)
  })

  test('a reference is in focus exactly when a picked part lists it', () => {
    const parts = [pick(seam), tests, pick(page)]
    expect(refInFocus(parts, 'gh#1')).toBe(true)
    expect(refInFocus(parts, 'gh#14')).toBe(false)
    /* Listed by no part at all: outside every focus, and counted. */
    expect(refInFocus(parts, 'gh#999')).toBe(false)
  })

  test('several picked parts are a union', () => {
    const parts = [pick(seam), pick(tests), page]
    expect(pickedParts(parts).map((part) => part.id)).toEqual(['the-posting-seam', 'what-the-tests-check'])
    expect(refInFocus(parts, 'gh#3')).toBe(true)
    expect(refInFocus(parts, 'gh#14')).toBe(true)
  })

  test('a step is in focus by the part it was assigned to, and never by its refs', () => {
    const parts = [pick(seam), tests]
    expect(partInFocus(parts, 'the-posting-seam')).toBe(true)
    expect(partInFocus(parts, 'what-the-tests-check')).toBe(false)
    /* No part: it belongs to the epic as a whole, so it is in no picked part. */
    expect(partInFocus(parts, undefined)).toBe(false)
    expect(partInFocus(parts, null)).toBe(false)
    /* A part the epic no longer has is an assignment to nothing. */
    expect(partInFocus(parts, 'a-part-that-was-deleted')).toBe(false)
  })

  test('the two numbers of the sentence', () => {
    const refs = ['gh#1', 'gh#3', 'gh#14', 'gh#999']
    const all = focusCount([seam, tests], refs, (ref) => refInFocus([seam, tests], ref))
    /* Outside is zero when nothing is picked — the cue to print nothing. */
    expect(all).toEqual({ shown: 4, outside: 0 })
    const parts = [pick(seam), tests]
    expect(focusCount(parts, refs, (ref) => refInFocus(parts, ref))).toEqual({ shown: 2, outside: 2 })
    /* A picked part that holds nothing still narrows: everything is outside. */
    const empty = [seam, pick(page)]
    expect(focusCount(empty, refs, (ref) => refInFocus(empty, ref))).toEqual({ shown: 0, outside: 4 })
  })
})
