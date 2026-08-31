import { describe, expect, test } from 'bun:test'
import {
  LIMITS,
  MESSAGE,
  contextSchema,
  filterChoiceSchema,
  filterGroupSchema,
  filtersSchema,
  hostMessageSchema,
  moduleMessageSchema,
} from '../src/index.js'

/**
 * The shapes a module uses to hand a host a control it cannot draw itself.
 *
 * The tests worth having here are the ones about what the schema REFUSES, not
 * about what it accepts. Every field is a string somebody else's program chose,
 * and each refusal below stands in for a way the host could be made to draw
 * something it should not.
 */

const ignored = {
  id: 'ignored',
  label: 'ignored files',
  fallback: 'hide',
  options: [
    { id: 'hide', label: 'hide 3 ignored' },
    { id: 'show', label: 'show them' },
  ],
}

describe('an offer is a list of axes, each with a resting state', () => {
  test('the one-group case, which is six of the seven filters this was built for', () => {
    const offer = filtersSchema.parse({ type: MESSAGE.FILTERS, groups: [ignored] })
    expect(offer.groups).toHaveLength(1)
    expect(offer.groups[0]!.fallback).toBe('hide')
  })

  test('two independent axes at once, which is the seventh', () => {
    const offer = filtersSchema.parse({
      type: MESSAGE.FILTERS,
      groups: [
        {
          id: 'kind',
          label: 'kind',
          fallback: 'all',
          options: [
            { id: 'all', label: 'any kind' },
            { id: 'issue', label: 'issues' },
            { id: 'change', label: 'changes' },
          ],
        },
        {
          id: 'state',
          label: 'state',
          fallback: 'all',
          options: [
            { id: 'all', label: 'any state' },
            { id: 'opened', label: 'open' },
            { id: 'closed', label: 'closed' },
            { id: 'merged', label: 'merged' },
          ],
        },
      ],
    })
    expect(offer.groups.map((g) => g.id)).toEqual(['kind', 'state'])
  })

  /*
   * The notifications case, which is the one that already persisted its choice
   * in the module's own `localStorage`. It has to be expressible without a
   * special case, because the whole argument for this facility is that six
   * modules had each invented the same control in their own words.
   */
  test('and the three-way scope one, with no special case for it', () => {
    const offer = filtersSchema.parse({
      type: MESSAGE.FILTERS,
      groups: [
        {
          id: 'scope',
          label: 'which kehikko',
          fallback: 'all',
          options: [
            { id: 'all', label: 'everything' },
            { id: 'here', label: 'this kehikko' },
            { id: 'none', label: 'no kehikko' },
          ],
        },
      ],
    })
    expect(offer.groups[0]!.options).toHaveLength(3)
  })

  test('an empty offer is a real message: it withdraws the control', () => {
    expect(filtersSchema.parse({ type: MESSAGE.FILTERS, groups: [] }).groups).toEqual([])
  })

  test('a group with no options is not an axis and is refused', () => {
    expect(
      filterGroupSchema.safeParse({ id: 'x', label: 'x', fallback: 'a', options: [] }).success,
    ).toBe(false)
  })
})

describe('the refusals, which are what stop a host drawing nonsense', () => {
  /*
   * A fallback naming nothing would turn the recovery path — "this option is
   * gone, go back to the resting one" — into a second broken state, which is
   * worse than the state it was recovering from.
   */
  test('a fallback has to name one of the group’s own options', () => {
    expect(
      filterGroupSchema.safeParse({ ...ignored, fallback: 'somewhere-else' }).success,
    ).toBe(false)
  })

  test('two options in one group cannot share an id', () => {
    expect(
      filterGroupSchema.safeParse({
        ...ignored,
        options: [
          { id: 'hide', label: 'one' },
          { id: 'hide', label: 'another' },
        ],
      }).success,
    ).toBe(false)
  })

  test('two groups cannot share an id either', () => {
    expect(
      filtersSchema.safeParse({ type: MESSAGE.FILTERS, groups: [ignored, ignored] }).success,
    ).toBe(false)
  })

  /*
   * The bound that keeps a stranger's document out of the host's own chrome. A
   * label is truncated where it is drawn as well — this is what keeps the
   * truncation from ever having a document to do it to.
   */
  test('a label longer than the bound is refused, not clipped', () => {
    const long = 'x'.repeat(LIMITS.FILTER_LABEL + 1)
    expect(filterGroupSchema.safeParse({ ...ignored, label: long }).success).toBe(false)
    expect(
      filterGroupSchema.safeParse({
        ...ignored,
        options: [{ id: 'hide', label: long }],
        fallback: 'hide',
      }).success,
    ).toBe(false)
  })

  test('more axes than a header button’s menu should hold are refused', () => {
    const many = Array.from({ length: LIMITS.FILTER_GROUPS + 1 }, (_, n) => ({
      ...ignored,
      id: `g${n}`,
    }))
    expect(filtersSchema.safeParse({ type: MESSAGE.FILTERS, groups: many }).success).toBe(false)
  })

  test('more options than a menu should hold are refused', () => {
    const options = Array.from({ length: LIMITS.FILTER_OPTIONS + 1 }, (_, n) => ({
      id: `o${n}`,
      label: `o${n}`,
    }))
    expect(
      filterGroupSchema.safeParse({ ...ignored, options, fallback: 'o0' }).success,
    ).toBe(false)
  })

  /*
   * A choice is stored and read back as a record, and a record is a plain
   * object. These three do not behave like keys — see the essay on `filterId`
   * in `wire.ts` — and a host that stored one and read it back would get an
   * answer it never wrote.
   */
  test('the three ids that are not really keys are refused on both halves', () => {
    for (const bad of ['__proto__', 'constructor', 'prototype']) {
      expect(filterGroupSchema.safeParse({ ...ignored, id: bad }).success).toBe(false)
      expect(filterChoiceSchema.safeParse({ [bad]: 'hide' }).success).toBe(false)
      expect(filterChoiceSchema.safeParse({ ignored: bad }).success).toBe(false)
    }
  })

  test('a choice cannot carry more groups than an offer could have had', () => {
    const wide: Record<string, string> = {}
    for (let n = 0; n <= LIMITS.FILTER_GROUPS; n += 1) wide[`g${n}`] = 'x'
    expect(filterChoiceSchema.safeParse(wide).success).toBe(false)
  })
})

describe('the choice travels as context, so a module has it before it draws', () => {
  test('nothing chosen is an empty record rather than an absence', () => {
    expect(contextSchema.parse({}).filters).toEqual({})
  })

  test('it rides in the greeting', () => {
    const hello = hostMessageSchema.parse({
      type: MESSAGE.HELLO,
      protocol: 2,
      session: 'abc',
      context: { filters: { ignored: 'show' } },
    })
    expect(hello.type).toBe(MESSAGE.HELLO)
    if (hello.type === MESSAGE.HELLO) expect(hello.context.filters).toEqual({ ignored: 'show' })
  })

  test('and in every context after it', () => {
    const message = hostMessageSchema.parse({
      type: MESSAGE.CONTEXT,
      protocol: 2,
      filters: { ignored: 'show' },
    })
    expect(message.type).toBe(MESSAGE.CONTEXT)
    if (message.type === MESSAGE.CONTEXT) expect(message.filters.ignored).toBe('show')
  })
})

describe('the offer is a module message, alongside ready, request, resize and went', () => {
  test('it parses out of the module union', () => {
    const message = moduleMessageSchema.parse({ type: MESSAGE.FILTERS, groups: [ignored] })
    expect(message.type).toBe(MESSAGE.FILTERS)
  })

  /*
   * It is not a host message, and the asymmetry is the design: the offer comes
   * from the module and the choice goes back as context. A host posting one at
   * a module would be a host telling a module what it can be narrowed by.
   */
  test('and not out of the host union', () => {
    expect(hostMessageSchema.safeParse({ type: MESSAGE.FILTERS, groups: [ignored] }).success).toBe(
      false,
    )
  })
})
