import { describe, expect, test } from 'bun:test'
import {
  contextSchema,
  dispositionSchema,
  filterChoiceSchema,
  filterGroupSchema,
  methodParams,
  REACTS_TO,
} from '../src/index.js'
import {
  countFacets,
  deriveDisposition,
  dispositionOf,
  facetsOf,
  hiddenIn,
  offer,
  sift,
  type Sighting,
} from '../src/facets.js'

const closedIssue: Sighting = { kind: 'issue', state: 'closed' }
const closedChange: Sighting = { kind: 'change', state: 'closed' }
const mergedChange: Sighting = { kind: 'change', state: 'merged' }

describe('a toggles group holds a set', () => {
  test('one group can hide closed changes and keep closed issues', () => {
    const group = filterGroupSchema.parse(offer())
    expect(group.kind).toBe('toggles')
    const choice = filterChoiceSchema.parse({ hide: ['change:closed'] })
    const rows = [closedIssue, closedChange, mergedChange]
    const { kept, hidden } = sift(rows, hiddenIn(choice), (r) => facetsOf(r))
    expect(kept).toEqual([closedIssue, mergedChange])
    expect(hidden).toBe(1)
  })

  test('a toggles group has options and no fallback', () => {
    expect(() => filterGroupSchema.parse({ id: 'hide', label: 'hide', kind: 'toggles', options: [] })).toThrow()
    expect(() =>
      filterGroupSchema.parse({ id: 'hide', label: 'hide', kind: 'toggles', options: [{ id: 'a', label: 'a' }], fallback: 'a' }),
    ).toThrow()
  })

  test('a list choice refuses a repeated or reserved id', () => {
    expect(() => filterChoiceSchema.parse({ hide: ['a', 'a'] })).toThrow()
    expect(() => filterChoiceSchema.parse({ hide: ['__proto__'] })).toThrow()
  })

  test('a string under a toggles group is the resting state', () => {
    expect(hiddenIn({ hide: 'change:closed' })).toEqual([])
    expect(hiddenIn({ hide: ['change:closed', 'nonsense'] })).toEqual(['change:closed'])
  })

  test('counts ride in labels, and a zero-count facet that is on stays offered', () => {
    const rows = [closedIssue, closedIssue, closedChange]
    const group = offer({ counts: countFacets(rows, (r) => facetsOf(r)), hidden: ['change:merged'] })
    const labels = group.options.map((o) => o.label)
    expect(labels).toContain('closed issues (2)')
    expect(labels).toContain('merged MRs/PRs (0)')
    expect(group.options.some((o) => o.id === 'issue:open')).toBe(false)
  })
})

describe('why a reference closed', () => {
  test('the tracker reason is derived, and a merged change is done', () => {
    expect(deriveDisposition({ ...closedIssue, stateReason: 'NOT_PLANNED' })).toBe('wont-do')
    expect(deriveDisposition({ ...closedIssue, stateReason: 'completed' })).toBe('done')
    expect(deriveDisposition({ ...closedIssue, closedByMerge: true })).toBe('done')
    expect(deriveDisposition(mergedChange)).toBe('done')
    expect(deriveDisposition(closedIssue)).toBeNull()
  })

  test("a person's mark wins over the tracker, and says it is theirs", () => {
    const marks = [dispositionSchema.parse({ ref: '#7', value: 'wont-do' })]
    const shown = dispositionOf('#7', { ...closedIssue, stateReason: 'COMPLETED' }, marks)
    expect(shown).toMatchObject({ value: 'wont-do', source: 'person' })
    expect(dispositionOf('#8', { ...closedIssue, stateReason: 'COMPLETED' }, marks)).toMatchObject({
      value: 'done',
      source: 'tracker',
    })
    expect(dispositionOf('#9', closedIssue, marks)).toMatchObject({ value: 'unknown', source: null })
    expect(facetsOf(closedIssue, shown)).toEqual(['issue:closed', 'closed:wont-do'])
  })

  test('the context carries marks, empty by default', () => {
    expect(contextSchema.parse({}).dispositions).toEqual([])
    expect(REACTS_TO.dispositions).toBeTruthy()
  })

  test('only a duplicate or superseded mark names another ref', () => {
    const set = methodParams['disposition.set']
    expect(set.parse({ ref: '#1', value: 'duplicate', target: '#2' }).target).toBe('#2')
    expect(() => set.parse({ ref: '#1', value: 'done', target: '#2' })).toThrow()
    expect(set.parse({ ref: '#1', value: null }).value).toBeNull()
  })
})
