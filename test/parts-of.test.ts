import { describe, expect, test } from 'bun:test'

import {
  EPIC_SLUG,
  LIMITS,
  PART_ID,
  journeyRecordSchema,
  partIdsOf,
  partsOf,
  partsSchema,
  slugFrom,
  stepPart,
  type JourneyPart,
} from '../src/index.js'

/**
 * The parts of an epic, derived from its record — in one place.
 *
 * This derivation was a host's. It moved here so that the module that edits
 * steps and the host that composes `context.parts` cannot come out with two
 * ids for one heading, and it moved WITHOUT CHANGING AN ID: the ids it makes
 * are already written into steps and stored as focuses.
 *
 * So the first three blocks below are the host's own tests, carried over with
 * their fixtures and their expected values untouched — they are the
 * specification, and an edit to an expected id in them is an edit to somebody's
 * file. What is new is at the bottom: `partIdsOf`, which keeps the groups'
 * positions, and the reading of a parsed record.
 */

/* The shape of the one real epic that has groups: headings and refs, no ids,
   and steps that name refs and say nothing about a part. */
const asOnDisk = {
  slug: 'the-roadmap-tracks-itself',
  title: 'The roadmap can be trusted about its own state',
  steps: [
    { title: 'The one path that writes in public has a gate on it', body: '', refs: ['gh#1'], notes: [] },
    { title: 'The claim ledger is safe to be wrong about', body: '', refs: ['gh#3'], notes: [] },
    { title: 'A filter that cannot match says so', body: '', refs: ['gh#9'], notes: [] },
  ],
  groups: [
    { heading: 'The posting seam', refs: ['gh#1', 'gh#3', 'gh#2'] },
    { heading: 'The agent seam', refs: ['gh#4', 'gh#5'] },
    { heading: 'What the page shows', refs: ['gh#8', 'gh#9'] },
  ],
}

describe('the slug a line of prose makes', () => {
  test('lowercase, dashes for runs of anything else, trimmed at the ends', () => {
    expect(slugFrom('The page is components')).toBe('the-page-is-components')
    expect(slugFrom('  Modes — are   modules!  ')).toBe('modes-are-modules')
    expect(slugFrom('v2.0: the "portable" kehikko')).toBe('v2-0-the-portable-kehikko')
  })

  test('accents fold to their letters; what has no letter at all makes nothing', () => {
    expect(slugFrom('Ääkköset ja ümlaut')).toBe('aakkoset-ja-umlaut')
    expect(slugFrom('!!!')).toBe('')
    expect(slugFrom('')).toBe('')
  })

  test('cut at eighty, and not left ending in a dash', () => {
    const long = slugFrom(`${'word '.repeat(30)}`)
    expect(long.length).toBeLessThanOrEqual(80)
    expect(long.endsWith('-')).toBe(false)
    expect(EPIC_SLUG.test(long)).toBe(true)
    expect(PART_ID.test(long)).toBe(true)
  })
})

describe('a part is one of the epic’s groups', () => {
  test('an epic as it is on disk today has parts, with ids nobody had to write', () => {
    expect(partsOf(asOnDisk)).toEqual([
      { id: 'the-posting-seam', heading: 'The posting seam', refs: ['gh#1', 'gh#3', 'gh#2'], steps: 0 },
      { id: 'the-agent-seam', heading: 'The agent seam', refs: ['gh#4', 'gh#5'], steps: 0 },
      { id: 'what-the-page-shows', heading: 'What the page shows', refs: ['gh#8', 'gh#9'], steps: 0 },
    ])
  })

  test('an epic with no groups has none, and so does anything that is not an epic', () => {
    for (const none of [{ slug: 'x', groups: [] }, { slug: 'x' }, { groups: 'nope' }, null, 'text', 7, []]) {
      expect(partsOf(none)).toEqual([])
    }
  })

  test('an id written beside the heading wins, so the heading can be reworded', () => {
    const before = partsOf({ groups: [{ id: 'posting', heading: 'The posting seam', refs: ['gh#1'] }] })
    const after = partsOf({ groups: [{ id: 'posting', heading: 'Everything that posts', refs: ['gh#1'] }] })
    expect(before[0]?.id).toBe('posting')
    expect(after[0]).toEqual({ id: 'posting', heading: 'Everything that posts', refs: ['gh#1'], steps: 0 })
    /* An id that is not one is not trusted; the heading's is used. */
    expect(partsOf({ groups: [{ id: '../etc', heading: 'A part' }] })[0]?.id).toBe('a-part')
  })

  test('two groups with one name are told apart rather than one of them vanishing', () => {
    const parts = partsOf({
      groups: [{ heading: 'Tests' }, { heading: 'tests!' }, { heading: 'TESTS' }, { heading: '!!!' }, { refs: ['gh#1'] }],
    })
    expect(parts.map((part) => part.id)).toEqual(['tests', 'tests-2', 'tests-3', 'part-4', 'part-5'])
    /* The heading is prose and is kept as written; one with no heading at all
       still has something to be called. */
    expect(parts[3]?.heading).toBe('!!!')
    expect(parts[4]?.heading).toBe('part-5')
  })

  test('junk in the file costs that entry and nothing else', () => {
    const parts = partsOf({
      groups: [null, 'a string', { heading: 'Kept', refs: ['gh#1', '', '  ', 42, 'gh#1', 'x'.repeat(500), ' gh#2 '] }, 17],
    })
    expect(parts).toEqual([{ id: 'kept', heading: 'Kept', refs: ['gh#1', 'gh#2'], steps: 0 }])
  })

  test('both lists are bounded, at the protocol’s numbers', () => {
    const many = { groups: Array.from({ length: LIMITS.PARTS + 5 }, (_, i) => ({ heading: `Part ${i}` })) }
    expect(partsOf(many)).toHaveLength(LIMITS.PARTS)
    const wide = { groups: [{ heading: 'Wide', refs: Array.from({ length: LIMITS.PART_REFS + 9 }, (_, i) => `gh#${i}`) }] }
    expect(partsOf(wide)[0]?.refs).toHaveLength(LIMITS.PART_REFS)
    /* And what leaves is what the wire's own schema takes. */
    const onWire = (parts: JourneyPart[]) => parts.map(({ id, heading, refs }) => ({ id, heading, refs, picked: false }))
    expect(partsSchema.safeParse(onWire(partsOf(many))).success).toBe(true)
    expect(partsSchema.safeParse(onWire(partsOf(wide))).success).toBe(true)
  })
})

describe('a step says which part it is in', () => {
  test('a step with no part is in none, whatever refs it names', () => {
    /* gh#9 is listed under "What the page shows" and a step names gh#9. That
       does not put the step there: the count stays zero. */
    expect(partsOf(asOnDisk).map((part) => part.steps)).toEqual([0, 0, 0])
    expect(stepPart(asOnDisk.steps[0])).toBeNull()
  })

  test('an assigned step is counted, and brings its refs into the part', () => {
    const epic = {
      ...asOnDisk,
      steps: [
        { title: 'a', refs: ['gh#1'], part: 'the-posting-seam' },
        { title: 'b', refs: ['gh#77', 'gh#4'], part: 'the-agent-seam' },
        { title: 'c', refs: ['gh#78'] },
      ],
    }
    const parts = partsOf(epic)
    expect(parts.map((part) => part.steps)).toEqual([1, 1, 0])
    /* Folded in once: gh#1 and gh#4 were already listed. */
    expect(parts[0]?.refs).toEqual(['gh#1', 'gh#3', 'gh#2'])
    expect(parts[1]?.refs).toEqual(['gh#4', 'gh#5', 'gh#77'])
    /* The unassigned step's ref is in no part. */
    expect(parts.some((part) => part.refs.includes('gh#78'))).toBe(false)
  })

  test('a part that is not there is not an assignment', () => {
    const parts = partsOf({ ...asOnDisk, steps: [{ title: 'a', refs: ['gh#50'], part: 'a-part-that-was-deleted' }] })
    expect(parts.map((part) => part.steps)).toEqual([0, 0, 0])
    expect(parts.some((part) => part.refs.includes('gh#50'))).toBe(false)
  })

  test('the folded refs are bounded with the listed ones, listed first', () => {
    const listed = Array.from({ length: LIMITS.PART_REFS - 1 }, (_, i) => `gh#${i}`)
    const parts = partsOf({
      groups: [{ heading: 'Wide', refs: listed }],
      steps: [{ title: 'a', refs: ['gh#9001', 'gh#9002'], part: 'wide' }],
    })
    expect(parts[0]?.refs).toEqual([...listed, 'gh#9001'])
    expect(parts[0]?.steps).toBe(1)
  })
})

describe('the ids, in the groups’ own positions', () => {
  test('one entry per group, and null where the entry is not a part', () => {
    expect(partIdsOf([null, 'a string', { heading: 'Kept' }, 17, { heading: 'kept' }, { heading: '' }])).toEqual([
      null,
      null,
      'kept',
      null,
      'kept-2',
      /* By position in the array, counted from one — junk entries included,
         which is what the host has always done. */
      'part-6',
    ])
  })

  test('they are the ids `partsOf` gives, in order, with the gaps taken out', () => {
    for (const record of [
      asOnDisk,
      { groups: [{ heading: 'Tests' }, null, { heading: 'tests!' }, { id: 'tests', heading: 'Third' }, { heading: '!!!' }] },
      { groups: Array.from({ length: LIMITS.PARTS + 5 }, (_, i) => ({ heading: `Part ${i}` })) },
    ]) {
      const ids = partIdsOf(record.groups)
      expect(ids).toHaveLength(record.groups.length)
      expect(ids.filter((id) => id !== null)).toEqual(partsOf(record).map((part) => part.id))
    }
  })

  test('a written id that collides with an earlier derived one is the one that is suffixed', () => {
    /* File order decides, written or not. Nothing reorders to favour the
       written one: the first group has been `tests` for as long as it has
       been read, and a later group claiming the name does not take it away. */
    expect(partIdsOf([{ heading: 'Tests' }, { id: 'tests', heading: 'Other' }])).toEqual(['tests', 'tests-2'])
  })

  test('a group past the bound has no id rather than one nobody will be sent', () => {
    const ids = partIdsOf(Array.from({ length: LIMITS.PARTS + 2 }, (_, i) => ({ heading: `Part ${i}` })))
    expect(ids.slice(LIMITS.PARTS)).toEqual([null, null])
    expect(ids.slice(0, LIMITS.PARTS).every((id) => typeof id === 'string' && PART_ID.test(id))).toBe(true)
  })

  test('a long heading that collides keeps its suffix inside the bound', () => {
    const heading = 'word '.repeat(30)
    const ids = partIdsOf([{ heading }, { heading }])
    expect(ids[1]).toBe(`${slugFrom(heading).slice(0, 76)}-2`)
    expect(PART_ID.test(ids[1]!)).toBe(true)
  })

  test('writing the derived id onto its group changes nothing anybody reads', () => {
    /* What the module that edits steps will do the first time a step is
       assigned to a part: put the id beside the heading, so the heading is
       free. The parts before and after are the same parts. */
    const ids = partIdsOf(asOnDisk.groups)
    const written = { ...asOnDisk, groups: asOnDisk.groups.map((group, i) => ({ ...group, id: ids[i] })) }
    expect(partsOf(written)).toEqual(partsOf(asOnDisk))
    const reworded = { ...written, groups: written.groups.map((group) => ({ ...group, heading: `${group.heading}, reworded` })) }
    expect(partsOf(reworded).map((part) => part.id)).toEqual(partsOf(asOnDisk).map((part) => part.id))
    expect(partIdsOf('nope')).toEqual([])
    expect(partIdsOf(undefined)).toEqual([])
  })
})

describe('and a parsed record reads the same as the file it was parsed from', () => {
  test('the schema’s defaults and passthrough do not move a part', () => {
    const raw = {
      ...asOnDisk,
      steps: [
        { title: 'a', refs: ['gh#1'], part: 'the-posting-seam', somethingNewer: true },
        { title: 'b', refs: ['gh#77'], part: 'Not An Id' },
      ],
      groups: [...asOnDisk.groups, { id: 'written', heading: 'A fourth', refs: [], colour: 'red' }],
    }
    expect(partsOf(journeyRecordSchema.parse(raw))).toEqual(partsOf(raw))
    expect(partsOf(raw).map((part) => [part.id, part.steps])).toEqual([
      ['the-posting-seam', 1],
      ['the-agent-seam', 0],
      ['what-the-page-shows', 0],
      ['written', 0],
    ])
  })
})
