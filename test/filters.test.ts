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
   * object. These three do not behave like KEYS — see the essay on `filterId`
   * in `wire.ts` — and a host that stored one and read it back would get an
   * answer it never wrote.
   *
   * The key half is the whole of that defence, and none of it moved when the
   * value half was widened for typed text. A value is compared against an offer
   * and drawn; it indexes nothing.
   */
  test('the three ids that are not really keys are refused as ids and as keys', () => {
    for (const bad of ['__proto__', 'constructor', 'prototype']) {
      expect(filterGroupSchema.safeParse({ ...ignored, id: bad }).success).toBe(false)
      expect(filterChoiceSchema.safeParse({ [bad]: 'hide' }).success).toBe(false)
    }
  })

  test('and are accepted as VALUES, because somebody may have typed one', () => {
    /* The deliberate half of the same change. A `text` group's value is what
       was typed, and `__proto__` is an ordinary thing to search a codebase for.
       Refusing it would be a search box that silently stops working on one
       word, which is a stranger failure than any it prevents. */
    for (const typed of ['__proto__', 'constructor', 'prototype']) {
      expect(filterChoiceSchema.safeParse({ search: typed }).success).toBe(true)
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

/**
 * The second kind of group, which this schema refused twice before it had one.
 *
 * The refusal was about a text box in the header STRIP and the control is a
 * MENU — `LIMITS.FILTER_TEXT` carries the argument. What the tests are for is
 * the seam between the two kinds, because a module that confuses them produces
 * a control nobody can operate rather than an error anybody can see.
 */
describe('a group can be typed into rather than chosen from', () => {
  const search = { id: 'search', label: 'search', kind: 'text' as const }

  test('no options and no fallback, which is what "the resting state is empty" means', () => {
    const group = filterGroupSchema.parse(search)
    expect(group.kind).toBe('text')
    expect(group.options).toEqual([])
    expect(group.fallback).toBeUndefined()
  })

  test('a text group carrying either of them is refused, because it would draw wrong', () => {
    /* Options nothing renders, or a fallback no press can put the input back
       to. Both are a module meaning `choice` and saying `text`. */
    expect(filterGroupSchema.safeParse({ ...search, options: [{ id: 'a', label: 'a' }] }).success).toBe(false)
    expect(filterGroupSchema.safeParse({ ...search, fallback: 'a' }).success).toBe(false)
  })

  test('a group with no kind is still a choice group, and still needs both', () => {
    /* The compatibility that makes `kind` optional rather than defaulted: every
       module written before this field existed sends a group without it and
       meant a list of options. */
    expect(filterGroupSchema.parse(ignored).kind).toBeUndefined()
    expect(filterGroupSchema.safeParse({ id: 'k', label: 'k' }).success).toBe(false)
    expect(filterGroupSchema.safeParse({ id: 'k', label: 'k', options: [], fallback: 'x' }).success).toBe(false)
  })

  test('what somebody typed travels back in the same record as the pressed options', () => {
    const chosen = filterChoiceSchema.parse({ ignored: 'show', search: 'rbac jaakko' })
    expect(chosen.search).toBe('rbac jaakko')
  })

  test('and is bounded, so that nobody stores a document in a container’s settings', () => {
    expect(filterChoiceSchema.safeParse({ search: 'x'.repeat(LIMITS.FILTER_TEXT) }).success).toBe(true)
    expect(filterChoiceSchema.safeParse({ search: 'x'.repeat(LIMITS.FILTER_TEXT + 1) }).success).toBe(false)
    /* An empty string is not a value: "nothing typed" is the group being absent
       from the record, which is how every other group says it is at rest. */
    expect(filterChoiceSchema.safeParse({ search: '' }).success).toBe(false)
  })
})
