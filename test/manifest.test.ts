import { describe, expect, test } from 'bun:test'
import { LIMITS, MODULE_ID, manifestSchema, own, speaks } from '../src/index.js'

/**
 * What is tested here is what would actually break somebody.
 *
 * Not that zod parses an object — that is zod's test suite. What matters is:
 * the bounds refuse the thing they were put there for, the id rule refuses what
 * it is meant to and (loudly) accepts what it cannot refuse, and the defaults
 * mean a minimal manifest is a legal one.
 */

const minimal = {
  kind: 'roadmap.module',
  protocol: 1,
  id: 'roadmap.checklist',
  name: 'Checklist',
  entry: '/app',
  modes: [{ id: 'checklist', label: 'Checklist' }],
}

describe('a manifest at its smallest', () => {
  test('parses, and the defaults fill in the rest', () => {
    const m = manifestSchema.parse(minimal)
    expect(m.version).toBe('0')
    expect(m.summary).toBe('')
    expect(m.modes[0]?.scope).toBe('epic')
    expect(m.declares.protocol).toBe('>=2')
    expect(m.declares.uses).toEqual([])
    expect(m.declares.storage).toBe(false)
    expect(m.extensions).toEqual({ emits: [], consumes: [] })
  })

  test('a manifest without the word is not a manifest', () => {
    expect(manifestSchema.safeParse({ ...minimal, kind: 'something.else' }).success).toBe(false)
    const { kind: _kind, ...without } = minimal
    expect(manifestSchema.safeParse(without).success).toBe(false)
  })

  test('a module has to bring at least one mode, and at most eight', () => {
    expect(manifestSchema.safeParse({ ...minimal, modes: [] }).success).toBe(false)
    const nine = Array.from({ length: 9 }, (_, i) => ({ id: `m${i}`, label: 'x' }))
    expect(manifestSchema.safeParse({ ...minimal, modes: nine }).success).toBe(false)
  })
})

describe('the bounds refuse what they were put there for', () => {
  /* Each of these is a field that reached a host's own screen unbounded in the
     implementation this package was distilled from. The test is that a
     stranger's paragraph does not parse. */
  const tooLong = 'x'.repeat(9000)

  test.each([
    ['name', { name: tooLong }],
    ['summary', { summary: tooLong }],
    ['version', { version: tooLong }],
    ['entry', { entry: `/${tooLong}` }],
    ['icon', { icon: `/${tooLong}` }],
    ['health', { health: `/${tooLong}` }],
    ['declares.protocol', { declares: { protocol: tooLong } }],
    ['mode label', { modes: [{ id: 'a', label: tooLong }] }],
    ['mcp.about', { mcp: { url: '/mcp', about: tooLong } }],
    ['mcp.url', { mcp: { url: `/${tooLong}` } }],
  ])('%s is refused when it is a document', (_field, patch) => {
    expect(manifestSchema.safeParse({ ...minimal, ...patch }).success).toBe(false)
  })

  test('a URL is allowed to be long, up to the length browsers stopped honouring', () => {
    const atTheLimit = `/${'a'.repeat(LIMITS.URL - 1)}`
    expect(manifestSchema.safeParse({ ...minimal, entry: atTheLimit }).success).toBe(true)
    expect(manifestSchema.safeParse({ ...minimal, entry: `${atTheLimit}a` }).success).toBe(false)
  })

  test('the lists are bounded too, not just the strings in them', () => {
    const many = Array.from({ length: 17 }, (_, i) => `roadmap.thing@${i}`)
    expect(manifestSchema.safeParse({ ...minimal, extensions: { emits: many } }).success).toBe(false)
    const uses = Array.from({ length: 33 }, (_, i) => `thing${i}:read`)
    expect(manifestSchema.safeParse({ ...minimal, declares: { uses } }).success).toBe(false)
  })
})

describe('ids', () => {
  test.each([
    'Roadmap.Checklist',
    'roadmap checklist',
    'roadmap/checklist',
    '-roadmap',
    'roadmap-',
    'a',
    /* Two characters is not one either: the pattern is a first, a last, and at
       least one in between, so three is the floor. Worth a case rather than a
       comment, because "a short id" is the kind of thing somebody loosens. */
    'ab',
    `${'a'.repeat(65)}`,
    'roadmap.checklist!',
  ])('%p is not an id', (bad) => {
    expect(manifestSchema.safeParse({ ...minimal, id: bad }).success).toBe(false)
  })

  test.each(['roadmap.checklist', 'abc', 'a.b-c.d', 'org.example.thing'])('%p is an id', (good) => {
    expect(MODULE_ID.test(good)).toBe(true)
  })

  /**
   * The hazard, asserted rather than fixed.
   *
   * If somebody ever narrows `MODULE_ID` to close this, this test fails and
   * they read the essay attached to it — which is the point. The rule is not
   * "forbid these spellings"; a list of forbidden spellings is a list of the
   * ways somebody has already thought of. The rule is that every lookup keyed
   * by a module's string asks the object rather than everything it inherits.
   */
  test('a module may legally call itself `constructor`, so hosts must never index blindly', () => {
    expect(MODULE_ID.test('constructor')).toBe(true)
    expect(MODULE_ID.test('prototype')).toBe(true)
    expect(manifestSchema.safeParse({ ...minimal, id: 'constructor' }).success).toBe(true)

    const table: Record<string, string> = { 'roadmap.checklist': 'here' }
    /* The bug, reproduced: truthy, and not a string. */
    expect(table['constructor']).toBeTruthy()
    expect(typeof table['constructor']).not.toBe('string')
    /* And the lookup that does not have it. */
    expect(own(table, 'constructor')).toBeUndefined()
    expect(own(table, 'roadmap.checklist')).toBe('here')
  })
})

describe('speaks', () => {
  test('reads the ranges anybody actually writes', () => {
    expect(speaks('>=1 <2', 1)).toBe(true)
    expect(speaks('>=1 <2', 2)).toBe(false)
    expect(speaks('1', 1)).toBe(true)
    expect(speaks('=1', 2)).toBe(false)
    expect(speaks('>=2', 1)).toBe(false)
    expect(speaks('<=3 >1', 2)).toBe(true)
  })

  test('an unreadable claim names nothing, never everything', () => {
    expect(speaks('', 1)).toBe(false)
    expect(speaks('   ', 1)).toBe(false)
    expect(speaks('^1.0.0', 1)).toBe(false)
    expect(speaks('~1', 1)).toBe(false)
    expect(speaks('>=1 || <3', 1)).toBe(false)
    expect(speaks('latest', 1)).toBe(false)
  })
})
