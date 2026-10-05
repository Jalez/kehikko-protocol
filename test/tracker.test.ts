import { describe, expect, test } from 'bun:test'
import {
  CAPABILITIES,
  LIMITS,
  METHODS,
  REACTS_TO,
  TRACKER_KINDS,
  TRACKER_STATES,
  contextSchema,
  methodParams,
  readTrackerRef,
  resultSchemaFor,
  spellTrackerRef,
  trackerReadingResult,
  trackerRefreshResult,
  trackerRowSchema,
  trackerSourceSchema,
  type TrackerRow,
} from '../src/index.js'
import { dispositionOf, facetsOf, type RefKind, type RefState, type Sighting } from '../src/facets.js'

/**
 * The shared tracker reading. The tests worth having are the ones that hold
 * the promise the whole thing is for — a row IS a sighting, so two modules
 * cannot map it two ways — and the ones about what a call may not ask.
 */

const row = (over: Partial<TrackerRow> = {}): TrackerRow =>
  trackerRowSchema.parse({
    ref: 'gh#41',
    tracker: 'github',
    host: 'github.com',
    repo: 'Jalez/kehikko',
    number: 41,
    kind: 'issue',
    state: 'closed',
    title: 'Read the trackers once',
    url: 'https://github.com/Jalez/kehikko/issues/41',
    stateReason: 'NOT_PLANNED',
    readAt: '2026-10-05T10:00:00.000Z',
    ...over,
  })

describe('a row is a sighting', () => {
  test('it goes straight into facetsOf and dispositionOf, with nothing mapped', () => {
    const one = row()
    /* The assignment is the test: if a field is renamed on either side this
       stops compiling, which is earlier than any module would notice. */
    const sighting: Sighting = one
    expect(facetsOf(sighting)).toEqual(['issue:closed', 'closed:wont-do'])
    expect(dispositionOf(one.ref, one, []).value).toBe('wont-do')
    expect(dispositionOf(one.ref, one, []).source).toBe('tracker')
  })

  test('a GitLab issue closed by a merged change is done, from closedByMerge', () => {
    const gl = row({ ref: '#12', tracker: 'gitlab', host: 'gitlab.com', repo: 'g/p', stateReason: undefined, closedByMerge: true })
    expect(facetsOf(gl)).toEqual(['issue:closed', 'closed:done'])
  })

  test('the kinds and states are the facets’ own words', () => {
    const kinds: readonly RefKind[] = TRACKER_KINDS
    const states: readonly RefState[] = TRACKER_STATES
    expect(kinds).toEqual(['issue', 'change'])
    expect(states).toEqual(['open', 'closed', 'merged'])
  })

  test('what a tracker does not record is absent, not guessed', () => {
    const { stateReason: _none, ...said } = row()
    const gl = trackerRowSchema.parse({ ...said, tracker: 'gitlab' })
    expect('stateReason' in gl).toBe(false)
    expect('pipeline' in gl).toBe(false)
    expect('detail' in gl).toBe(false)
    expect(gl.labels).toEqual([])
  })

  test('a title past its bound is refused here; a host clips text when it reads it', () => {
    expect(trackerRowSchema.safeParse({ ...row(), title: 'x'.repeat(LIMITS.TITLE + 1) }).success).toBe(false)
    expect(trackerRowSchema.safeParse({ ...row(), state: 'opened' }).success).toBe(false)
    expect(trackerRowSchema.safeParse({ ...row(), readAt: 'yesterday' }).success).toBe(false)
  })
})

describe('tracker.get and tracker.refresh', () => {
  test('two methods, two capabilities: reading and spending a rate limit are different sentences', () => {
    expect(METHODS['tracker.get']).toBe('trackers:read')
    expect(METHODS['tracker.refresh']).toBe('trackers:refresh')
    expect(Object.hasOwn(CAPABILITIES, 'trackers:read')).toBe(true)
    expect(Object.hasOwn(CAPABILITIES, 'trackers:refresh')).toBe(true)
  })

  test('exactly one scope: refs, an epic, or the project', () => {
    const get = methodParams['tracker.get']
    expect(get.safeParse({ refs: ['gh#41', '!7'] }).success).toBe(true)
    expect(get.safeParse({ epic: 'modes-are-modules' }).success).toBe(true)
    expect(get.safeParse({ project: true }).success).toBe(true)
    expect(get.safeParse({}).success).toBe(false)
    expect(get.safeParse({ refs: ['gh#41'], project: true }).success).toBe(false)
    expect(get.safeParse({ project: false }).success).toBe(false)
    expect(get.safeParse({ refs: [] }).success).toBe(false)
    expect(methodParams['tracker.refresh'].safeParse({ epic: 'x', refs: ['gh#1'] }).success).toBe(false)
    expect(methodParams['tracker.refresh'].safeParse({ project: true }).success).toBe(true)
  })

  test('summary by default; detail only for refs named one by one', () => {
    const get = methodParams['tracker.get']
    expect(get.parse({ refs: ['gh#41'] }).detail).toBe('summary')
    expect(get.safeParse({ refs: ['gh#41'], detail: 'detail' }).success).toBe(true)
    expect(get.safeParse({ project: true, detail: 'detail' }).success).toBe(false)
    expect(get.safeParse({ refs: ['gh#41'], detail: 'everything' }).success).toBe(false)
  })

  test('refs are bounded in count and in length, and refused rather than clipped', () => {
    const get = methodParams['tracker.get']
    const many = Array.from({ length: LIMITS.TRACKER_ASK + 1 }, (_, i) => `gh#${i + 1}`)
    expect(get.safeParse({ refs: many }).success).toBe(false)
    expect(get.safeParse({ refs: ['x'.repeat(LIMITS.REF + 1)] }).success).toBe(false)
  })

  test('the answers are specified: the shared reading is the one place agreement needs a shape', () => {
    expect(resultSchemaFor('tracker.get')).toBe(trackerReadingResult)
    expect(resultSchemaFor('tracker.refresh')).toBe(trackerRefreshResult)
    const empty = trackerReadingResult.parse({})
    expect(empty).toEqual({ at: null, refreshing: false, sources: [], rows: [], missing: [] })
    expect(trackerRefreshResult.safeParse({ outcome: 'read' }).success).toBe(true)
    expect(trackerRefreshResult.safeParse({ outcome: 'done' }).success).toBe(false)
  })

  test('a source says when it was read and why it was not', () => {
    const failed = trackerSourceSchema.parse({
      tracker: 'gitlab',
      host: 'gitlab.example.org',
      repo: 'group/project',
      error: 'gitlab.example.org could not be reached.',
    })
    expect(failed.at).toBeNull()
    expect(failed.default).toBe(false)
    expect(trackerSourceSchema.safeParse({ ...failed, tracker: 'jira' }).success).toBe(false)
  })
})

describe('the signal in the context', () => {
  test('a context from a host that has never heard of readings says nothing was read', () => {
    expect(contextSchema.parse({}).tracker).toEqual({ at: null, refreshing: false })
  })

  test('it is a time and a flag, never the rows', () => {
    const told = contextSchema.parse({ tracker: { at: '2026-10-05T10:00:00Z', refreshing: true, rows: [] } })
    expect(told.tracker).toEqual({ at: '2026-10-05T10:00:00Z', refreshing: true })
  })

  test('a module can say it reacts to it', () => {
    expect(Object.hasOwn(REACTS_TO, 'tracker')).toBe(true)
  })
})

describe('ref spellings', () => {
  test('the spellings Kehikot already writes', () => {
    expect(readTrackerRef('gh#41')).toEqual({ tracker: 'github', repo: null, kind: null, number: 41 })
    expect(readTrackerRef('gh:Jalez/kehikko#7')).toEqual({ tracker: 'github', repo: 'Jalez/kehikko', kind: null, number: 7 })
    expect(readTrackerRef('#2274')).toEqual({ tracker: 'gitlab', repo: null, kind: 'issue', number: 2274 })
    expect(readTrackerRef('gl#12')).toEqual({ tracker: 'gitlab', repo: null, kind: 'issue', number: 12 })
    expect(readTrackerRef('!1848')).toEqual({ tracker: 'gitlab', repo: null, kind: 'change', number: 1848 })
    expect(readTrackerRef('gl:group/sub/project!3')).toEqual({ tracker: 'gitlab', repo: 'group/sub/project', kind: 'change', number: 3 })
  })

  test('anything else is not a tracker ref', () => {
    for (const no of ['gh#0', 'gh#', 'gh#41 ', 'gh:repo#1', 'GH#1', '#-1', 'constructor', 'gh:../x#1x', '']) {
      expect(readTrackerRef(no)).toBeNull()
    }
  })

  test('a found ref is spelled short in the default source and qualified elsewhere, and reads back', () => {
    const cases = [
      { tracker: 'github', repo: 'Jalez/kehikko', kind: 'change', number: 5, isDefault: true },
      { tracker: 'github', repo: 'Jalez/other', kind: 'issue', number: 9, isDefault: false },
      { tracker: 'gitlab', repo: 'g/p', kind: 'issue', number: 12, isDefault: true },
      { tracker: 'gitlab', repo: 'g/p', kind: 'change', number: 7, isDefault: false },
    ] as const
    expect(cases.map(spellTrackerRef)).toEqual(['gh#5', 'gh:Jalez/other#9', '#12', 'gl:g/p!7'])
    for (const one of cases) {
      const back = readTrackerRef(spellTrackerRef(one))!
      expect(back.tracker).toBe(one.tracker)
      expect(back.number).toBe(one.number)
      expect(back.repo).toBe(one.isDefault ? null : one.repo)
    }
  })
})
