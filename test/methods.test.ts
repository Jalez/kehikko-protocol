import { describe, expect, test } from 'bun:test'
import {
  CAPABILITIES,
  EPIC_SLUG,
  LIMITS,
  METHODS,
  METHOD_NAMES,
  MESSAGE,
  NAVIGATION_OUTCOMES,
  PROTOCOL,
  epicSpine,
  epicsListResult,
  gotoSchema,
  methodParams,
  methodResults,
  navigationResult,
  responseSchema,
  resultSchemaFor,
} from '../src/index.js'

/* --------------------------------------------------------------------- *
 * Asking the host to move
 *
 * These are aimed at the two ways this can go wrong in a way nobody
 * notices: a caller that cannot tell "no" from "broken", and a module
 * that gets somewhere it did not name.
 * --------------------------------------------------------------------- */

describe('view.goto — a module asking, not telling', () => {
  test('it is a method, so it travels the channel that already has a no in it', () => {
    expect(METHOD_NAMES).toContain('view.goto')
    expect(METHODS['view.goto']).toBe('view:navigate')
    expect(Object.hasOwn(CAPABILITIES, 'view:navigate')).toBe(true)
  })

  test('an epic alone is a request; here, unlike in a goto, it names somewhere', () => {
    expect(methodParams['view.goto'].safeParse({ epic: 'modes-are-modules' }).success).toBe(true)
    expect(methodParams['view.goto'].safeParse({ ref: 'gh#41' }).success).toBe(true)
    expect(methodParams['view.goto'].safeParse({ step: 3 }).success).toBe(true)
    expect(methodParams['view.goto'].safeParse({ epic: 'modes-are-modules', step: 3, ref: 'gh#41' }).success).toBe(true)
  })

  test('and the mirror of that: a goto naming only an epic is still refused', () => {
    expect(gotoSchema.safeParse({ type: MESSAGE.GOTO, id: 'g1', epic: 'modes-are-modules' }).success).toBe(false)
  })

  test('a call that names nothing asks for nothing', () => {
    expect(methodParams['view.goto'].safeParse({}).success).toBe(false)
    expect(methodParams['view.goto'].safeParse({ epic: undefined }).success).toBe(false)
  })

  test('every string is bounded, and a ref too long is refused rather than clipped', () => {
    const long = methodParams['view.goto'].safeParse({ ref: 'x'.repeat(LIMITS.GOTO_REF + 1) })
    expect(long.success).toBe(false)
    expect(methodParams['view.goto'].safeParse({ ref: 'x'.repeat(LIMITS.GOTO_REF) }).success).toBe(true)
    /* A clipped ref is a different ref, so nothing may come back shorter than
       it went in. This is the assertion that fails if somebody swaps the max
       for a transform. */
    const kept = methodParams['view.goto'].parse({ ref: 'g'.repeat(LIMITS.GOTO_REF) })
    expect((kept as { ref: string }).ref.length).toBe(LIMITS.GOTO_REF)
  })

  test('an epic that is not an epic name never reaches the host', () => {
    expect(methodParams['view.goto'].safeParse({ epic: '../modules' }).success).toBe(false)
    expect(methodParams['view.goto'].safeParse({ epic: 'Modes' }).success).toBe(false)
    expect(methodParams['view.goto'].safeParse({ epic: 'a'.repeat(81) }).success).toBe(false)
  })

  test('a step is 1-based, whole, and small', () => {
    expect(methodParams['view.goto'].safeParse({ step: 0 }).success).toBe(false)
    expect(methodParams['view.goto'].safeParse({ step: 2.5 }).success).toBe(false)
    expect(methodParams['view.goto'].safeParse({ step: 1000 }).success).toBe(false)
    expect(methodParams['view.goto'].safeParse({ step: 999 }).success).toBe(true)
  })
})

describe('what came of it — three answers, because they send a person three places', () => {
  test('the three are distinct and closed', () => {
    expect([...NAVIGATION_OUTCOMES]).toEqual(['moved', 'declined', 'no-such-target'])
    for (const outcome of NAVIGATION_OUTCOMES) {
      expect(navigationResult.safeParse({ outcome }).success).toBe(true)
    }
    expect(navigationResult.safeParse({ outcome: 'ok' }).success).toBe(false)
    expect(navigationResult.safeParse({ outcome: 'not-allowed' }).success).toBe(false)
    expect(navigationResult.safeParse({}).success).toBe(false)
  })

  test('a decline is a successful call with a negative answer, never a failed call', () => {
    const declined = responseSchema.parse({
      type: MESSAGE.RESPONSE,
      id: 'q1',
      ok: true,
      data: navigationResult.parse({ outcome: 'declined', why: 'somebody is editing this step' }),
    })
    expect(declined.ok).toBe(true)
    /* The point of the test: a caller can read the refusal off a response
       that succeeded, and does not have to guess whether an ok:false meant
       "this host says no" or "this host is too old to have been asked". */
    if (declined.ok) {
      const answer = navigationResult.parse(declined.data)
      expect(answer.outcome).toBe('declined')
      expect(answer.why).toContain('editing')
    }
  })

  test('nothing there is its own answer, and not the same one as a decline', () => {
    const a = navigationResult.parse({ outcome: 'no-such-target', why: 'nothing in this epic names gh#41' })
    const b = navigationResult.parse({ outcome: 'declined' })
    expect(a.outcome).not.toBe(b.outcome)
  })

  test('where it landed is an epic slug or nothing, and defaults to nothing', () => {
    expect(navigationResult.parse({ outcome: 'moved' }).epic).toBe(null)
    expect(navigationResult.parse({ outcome: 'moved', epic: 'modes-are-modules' }).epic).toBe('modes-are-modules')
    expect(navigationResult.safeParse({ outcome: 'moved', epic: 'Not A Slug' }).success).toBe(false)
    expect(navigationResult.safeParse({ outcome: 'moved', epic: 'a'.repeat(81) }).success).toBe(false)
  })

  test('the sentence is a sentence and never a document', () => {
    expect(navigationResult.parse({ outcome: 'moved' }).why).toBe('')
    expect(navigationResult.safeParse({ outcome: 'moved', why: 'w'.repeat(LIMITS.REASON + 1) }).success).toBe(false)
  })
})

/* --------------------------------------------------------------------- *
 * The spine of epics.list
 * --------------------------------------------------------------------- */

describe('epics.list answers with things that have names', () => {
  test('a slug is required, because it is the argument to every other call', () => {
    expect(epicsListResult.safeParse({ epics: [{ title: 'Modes are modules' }] }).success).toBe(false)
    expect(epicsListResult.safeParse({ epics: [{ slug: 'modes-are-modules' }] }).success).toBe(true)
    expect(epicsListResult.safeParse({}).success).toBe(false)
  })

  test('and it is held to the same shape a slug is held to everywhere else', () => {
    expect(EPIC_SLUG.test('modes-are-modules')).toBe(true)
    expect(epicsListResult.safeParse({ epics: [{ slug: '../modules' }] }).success).toBe(false)
    expect(epicsListResult.safeParse({ epics: [{ slug: 'Modes' }] }).success).toBe(false)
  })

  test('the spine says what a field means, not what the set of fields is', () => {
    const out = epicsListResult.parse({
      epics: [{ slug: 'modes-are-modules', title: 'Modes are modules', lede: 'x', steps: 12, owner: 'nobody' }],
      total: 1,
    })
    const first = out.epics[0] as Record<string, unknown>
    expect(first.lede).toBe('x')
    expect(first.steps).toBe(12)
    expect((out as Record<string, unknown>).total).toBe(1)
  })

  test('a title is optional, and a host may not hand a framed page a document', () => {
    expect(epicSpine.safeParse({ slug: 'a-b' }).success).toBe(true)
    expect(epicSpine.safeParse({ slug: 'a-b', title: 't'.repeat(LIMITS.TITLE) }).success).toBe(true)
    expect(epicSpine.safeParse({ slug: 'a-b', title: 't'.repeat(LIMITS.TITLE + 1) }).success).toBe(false)
    expect(epicSpine.safeParse({ slug: 'a-b', project: 'p'.repeat(LIMITS.PROJECT + 1) }).success).toBe(false)
    expect(epicSpine.safeParse({ slug: 'a-b', project: null }).success).toBe(true)
  })

  test('an empty list is an answer, not a malformed one', () => {
    expect(epicsListResult.parse({ epics: [] }).epics).toEqual([])
  })
})

describe('which answers are described at all', () => {
  test('the outcomes are; the material is not, and missing means unspecified', () => {
    expect(resultSchemaFor('view.goto')).toBe(navigationResult)
    expect(resultSchemaFor('epics.list')).toBe(epicsListResult)
    for (const name of ['epic.get', 'steps.list', 'live.get', 'stage.report', 'events.emit'] as const) {
      expect(resultSchemaFor(name)).toBeUndefined()
    }
  })

  test('a method name is a stranger\'s string, so the lookup does not fall through a prototype', () => {
    expect(resultSchemaFor('constructor')).toBeUndefined()
    expect(resultSchemaFor('toString')).toBeUndefined()
    expect(resultSchemaFor('__proto__')).toBeUndefined()
    /* The plain-object hazard, demonstrated rather than described: this is
       what the helper exists to avoid, and the test fails if somebody
       reaches for a Map-free shortcut that indexes directly. */
    expect(typeof (methodResults as Record<string, unknown>).constructor).toBe('function')
  })

  test('every described answer belongs to a method that exists', () => {
    for (const name of Object.keys(methodResults)) {
      expect(Object.hasOwn(METHODS, name)).toBe(true)
    }
  })
})

/* --------------------------------------------------------------------- *
 * Epics are not journeys
 * --------------------------------------------------------------------- */

describe('the word that is not in this package', () => {
  test('the methods name epics, and no alias keeps the old spelling alive', () => {
    expect(Object.hasOwn(METHODS, 'epics.list')).toBe(true)
    expect(Object.hasOwn(METHODS, 'epic.get')).toBe(true)
    expect(Object.hasOwn(METHODS, 'journeys.list')).toBe(false)
    expect(Object.hasOwn(METHODS, 'journey.get')).toBe(false)
    expect(Object.hasOwn(CAPABILITIES, 'journeys:read')).toBe(false)
    expect(Object.hasOwn(CAPABILITIES, 'epics:read')).toBe(true)
  })

  test('a rename of an existing method and field is what the protocol number is for', () => {
    expect(PROTOCOL).toBe(2)
  })
})
