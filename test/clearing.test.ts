import { describe, expect, test } from 'bun:test'
import {
  HOST_MESSAGES,
  LIMITS,
  MESSAGE,
  MODULE_MESSAGES,
  clearSchema,
  clearableSchema,
  hostMessageSchema,
  moduleMessageSchema,
} from '../src/index.js'

/**
 * The two shapes a module and a host use to agree that something on screen can
 * be deleted, and that somebody asked for it to be.
 *
 * As with the filter schemas, the tests worth having are about what is REFUSED
 * and about what deliberately is not there. `label` is a string a stranger's
 * program wrote that a host puts on its own chrome; `clear` is the one message
 * in this protocol that destroys somebody's data, and every field it does not
 * have is a decision.
 */

describe('what a module offers to clear', () => {
  test('a label and nothing else', () => {
    const offer = clearableSchema.parse({ type: MESSAGE.CLEARABLE, label: 'clear 12 shown' })
    expect(offer.label).toBe('clear 12 shown')
  })

  /* The withdrawal, and it is a real message rather than an absence: there is
     nothing on screen to clear now, so the host takes the control away instead
     of leaving a button that deletes nothing. The counterpart of `filters`
     sending an empty `groups`. */
  test('null is how a module takes the control back', () => {
    expect(clearableSchema.parse({ type: MESSAGE.CLEARABLE, label: null }).label).toBeNull()
  })

  /* Defaulted rather than required, so a module that means "nothing to clear"
     cannot spell it wrong by omission. */
  test('and a missing label means the same as a null one', () => {
    expect(clearableSchema.parse({ type: MESSAGE.CLEARABLE }).label).toBeNull()
  })

  /*
   * The bound that matters. This label goes into a host's own header chrome,
   * where a `whitespace-nowrap` element carrying a variable string once put an
   * 1187-pixel min-content floor under a 220-pixel container. A host should
   * truncate anyway; this is what keeps the truncation from ever having a
   * document to do it to.
   */
  test('a label longer than the bound is refused', () => {
    const long = 'x'.repeat(LIMITS.CLEAR_LABEL + 1)
    expect(clearableSchema.safeParse({ type: MESSAGE.CLEARABLE, label: long }).success).toBe(false)
    const fits = 'x'.repeat(LIMITS.CLEAR_LABEL)
    expect(clearableSchema.safeParse({ type: MESSAGE.CLEARABLE, label: fits }).success).toBe(true)
  })

  /* An empty string is not a label. A control drawn with one would be a button
     with no name, which is the failure `Filters.tsx` has an essay about — a
     control nobody can name is pressed by accident or never at all. A module
     with nothing to say sends `null`, which means something. */
  test('an empty label is refused rather than treated as a withdrawal', () => {
    expect(clearableSchema.safeParse({ type: MESSAGE.CLEARABLE, label: '' }).success).toBe(false)
  })

  test('it is a module message and parses as one', () => {
    const parsed = moduleMessageSchema.parse({ type: MESSAGE.CLEARABLE, label: 'clear 3 shown' })
    expect(parsed.type).toBe(MESSAGE.CLEARABLE)
    expect(MODULE_MESSAGES).toContain(MESSAGE.CLEARABLE)
  })

  /* The direction is part of the shape. A host announcing that IT can be
     cleared is a host that is confused, and the union it would have to parse
     through is the place that says so. */
  test('and never as a host message', () => {
    expect(hostMessageSchema.safeParse({ type: MESSAGE.CLEARABLE, label: 'clear 3' }).success).toBe(false)
  })
})

describe('the press, relayed', () => {
  test('it carries the protocol and nothing else', () => {
    const parsed = clearSchema.parse({ type: MESSAGE.CLEAR, protocol: 2 })
    expect(parsed).toEqual({ type: MESSAGE.CLEAR, protocol: 2 })
  })

  /*
   * The three fields somebody will want to add, asserted absent, because each
   * would break the feature in a way that reads as a helpful improvement.
   *
   * A list of ids would mean the host knows what is on the page — it does not,
   * cannot, and must not. A copy of the filter choice would be a second answer
   * to a question `roadmap.context` already answers, disagreeing after any
   * race. A correlation id would imply an answer, and the only thing a host
   * could do with an answer is report a number it did not count about data it
   * cannot see.
   *
   * Zod strips unknown keys rather than refusing them, so this asserts on what
   * survives parsing rather than on the parse failing.
   */
  test('a sender that adds ids, a filter or a correlation gets none of them through', () => {
    const parsed = clearSchema.parse({
      type: MESSAGE.CLEAR,
      protocol: 2,
      ids: ['a', 'b'],
      filters: { kind: 'issue' },
      id: 'c1',
    })
    expect(parsed).toEqual({ type: MESSAGE.CLEAR, protocol: 2 })
  })

  test('it is a host message and parses as one', () => {
    const parsed = hostMessageSchema.parse({ type: MESSAGE.CLEAR, protocol: 2 })
    expect(parsed.type).toBe(MESSAGE.CLEAR)
    expect(HOST_MESSAGES).toContain(MESSAGE.CLEAR)
  })

  test('and never as a module message', () => {
    expect(moduleMessageSchema.safeParse({ type: MESSAGE.CLEAR, protocol: 2 }).success).toBe(false)
  })
})

/**
 * The offer and the filter offer are two messages, and this is the property
 * that decides it: withdrawing one has to leave the other standing.
 *
 * Folded into one message, a module with nothing to be narrowed by would send
 * `{ groups: [] }` — whole replacement being the entire point of that message —
 * and would silently withdraw its clear control at the same time. Nothing would
 * error and a button would simply be gone.
 */
describe('the two offers are independent', () => {
  test('the spellings cannot be confused for each other', () => {
    expect(MESSAGE.CLEARABLE).not.toBe(MESSAGE.FILTERS)
    expect(MESSAGE.CLEARABLE).not.toBe(MESSAGE.CLEAR)
  })

  test('withdrawing the filter offer says nothing about the clear offer', () => {
    const withdrawn = moduleMessageSchema.parse({ type: MESSAGE.FILTERS, groups: [] })
    expect(withdrawn).not.toHaveProperty('label')
    const offer = moduleMessageSchema.parse({ type: MESSAGE.CLEARABLE, label: 'clear 4 shown' })
    expect(offer).not.toHaveProperty('groups')
  })
})
