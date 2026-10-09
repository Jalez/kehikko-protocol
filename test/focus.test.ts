import { describe, expect, test } from 'bun:test'

import {
  FOCUS_WHERE,
  MANIFEST_KIND,
  PROTOCOL,
  anchorInFocus,
  fileInFocus,
  focusCount,
  focusSentence,
  manifestSchema,
  narrowToFocus,
  partInFocus,
  partsDeclaration,
  refInFocus,
  sameParts,
  type Anchors,
  type EpicPart,
} from '../src/index.js'

/**
 * One anchor, one rule (0.34.0): the rule delegates and never re-decides, the
 * count is `focusCount`'s, the sentence is one sentence, and a manifest says
 * which side of the requirement a module is on.
 */

const EPIC = 'thesis'
const PAPER = `/home/a/proj/.kehikot/paper/${EPIC}`

const part = (id: string, picked: boolean, over: Partial<EpicPart> = {}): EpicPart => ({
  id,
  heading: id === 'seam' ? 'The posting seam' : id === 'tests' ? 'What the tests check' : '',
  refs: [],
  picked,
  ...over,
})

const PARTS = (seam: boolean, tests: boolean): EpicPart[] => [
  part('seam', seam, { refs: ['gh#12'], files: ['chapters/seam.tex'] }),
  part('tests', tests, { refs: ['gh#30'], files: ['chapters/tests.tex'] }),
]

interface Item {
  id: string
  anchor: Anchors
}
const ITEMS: Item[] = [
  { id: 'abs-file', anchor: { file: `${PAPER}/chapters/seam.tex` } },
  { id: 'rel-file', anchor: { file: 'chapters/tests.tex' } },
  { id: 'main', anchor: { file: `${PAPER}/main.tex` } },
  { id: 'ref', anchor: { ref: 'gh#12' } },
  { id: 'step', anchor: { part: 'tests' } },
  { id: 'unassigned', anchor: { part: null } },
  { id: 'several', anchor: [{ file: 'main.tex' }, { ref: 'gh#30' }] },
  { id: 'none', anchor: null },
  { id: 'empty', anchor: [] },
]
const anchorOf = (item: Item) => item.anchor
const ids = (items: readonly Item[]) => items.map((item) => item.id)

describe('anchorInFocus', () => {
  test('nothing picked: everything is in front, anchored or not', () => {
    for (const item of ITEMS) expect(anchorInFocus(PARTS(false, false), item.anchor, EPIC)).toBe(true)
    expect(anchorInFocus([], null)).toBe(true)
  })

  test('each kind of anchor is asked of the function that owns the question', () => {
    const parts = PARTS(true, false)
    expect(anchorInFocus(parts, { file: `${PAPER}/chapters/seam.tex` }, EPIC)).toBe(fileInFocus(parts, `${PAPER}/chapters/seam.tex`, EPIC))
    expect(anchorInFocus(parts, { file: `${PAPER}/chapters/tests.tex` }, EPIC)).toBe(false)
    expect(anchorInFocus(parts, { ref: 'gh#12' })).toBe(refInFocus(parts, 'gh#12'))
    expect(anchorInFocus(parts, { ref: 'gh#30' })).toBe(false)
    expect(anchorInFocus(parts, { part: 'seam' })).toBe(partInFocus(parts, 'seam'))
    expect(anchorInFocus(parts, { part: 'tests' })).toBe(false)
  })

  test('a file of another epic’s paper is not this epic’s file', () => {
    expect(anchorInFocus(PARTS(true, false), { file: '/home/a/proj/.kehikot/paper/other/chapters/seam.tex' }, EPIC)).toBe(false)
  })

  test('with something picked, no anchor is outside — and so is main.tex, a file no part names', () => {
    const parts = PARTS(true, true)
    expect(anchorInFocus(parts, null, EPIC)).toBe(false)
    expect(anchorInFocus(parts, undefined, EPIC)).toBe(false)
    expect(anchorInFocus(parts, [], EPIC)).toBe(false)
    expect(anchorInFocus(parts, { part: null }, EPIC)).toBe(false)
    expect(anchorInFocus(parts, { file: `${PAPER}/main.tex` }, EPIC)).toBe(false)
  })

  test('several anchors: in front when any one is', () => {
    expect(anchorInFocus(PARTS(false, true), [{ file: 'main.tex' }, { ref: 'gh#30' }], EPIC)).toBe(true)
    expect(anchorInFocus(PARTS(true, false), [{ file: 'main.tex' }, { ref: 'gh#30' }], EPIC)).toBe(false)
  })
})

describe('narrowToFocus', () => {
  test('nothing picked: every item, in order, nothing outside', () => {
    const out = narrowToFocus(PARTS(false, false), ITEMS, anchorOf, { epic: EPIC })
    expect(out.shown).toEqual(ITEMS)
    expect(out).toMatchObject({ outside: 0, kept: 0 })
  })

  test('the items in a picked part, and the count of the rest — focusCount’s numbers', () => {
    const parts = PARTS(true, false)
    const out = narrowToFocus(parts, ITEMS, anchorOf, { epic: EPIC })
    expect(ids(out.shown)).toEqual(['abs-file', 'ref'])
    expect(out.outside).toBe(7)
    expect(focusCount(parts, ITEMS, (item) => anchorInFocus(parts, item.anchor, EPIC))).toEqual({ shown: 2, outside: 7 })
  })

  test('two parts picked', () => {
    const out = narrowToFocus(PARTS(true, true), ITEMS, anchorOf, { epic: EPIC })
    expect(ids(out.shown)).toEqual(['abs-file', 'rel-file', 'ref', 'step', 'several'])
    expect(out.outside).toBe(4)
  })

  test('what the person is in the middle of is drawn, in its place, and still counted outside', () => {
    const out = narrowToFocus(PARTS(true, false), ITEMS, anchorOf, { epic: EPIC, keep: (item) => item.id === 'main' })
    expect(ids(out.shown)).toEqual(['abs-file', 'main', 'ref'])
    expect(out).toMatchObject({ outside: 7, kept: 1 })
  })

  test('the options are optional: with no epic a paper-relative file still compares', () => {
    const out = narrowToFocus(PARTS(false, true), ITEMS, anchorOf)
    expect(ids(out.shown)).toContain('rel-file')
    expect(out.kept).toBe(0)
  })

  test('keeping something that is in the focus anyway keeps nothing', () => {
    expect(narrowToFocus(PARTS(true, false), ITEMS, anchorOf, { epic: EPIC, keep: (item) => item.id === 'ref' }).kept).toBe(0)
  })
})

describe('focusSentence', () => {
  test('nothing picked: nothing to say', () => {
    expect(focusSentence(PARTS(false, false), 0, 'note')).toBe('')
    expect(focusSentence([], 3, 'note')).toBe('')
  })

  test('one part, by its heading; singular and plural', () => {
    expect(focusSentence(PARTS(true, false), 3, 'question')).toBe('3 questions outside the picked part (The posting seam).')
    expect(focusSentence(PARTS(true, false), 1, 'question')).toBe('1 question outside the picked part (The posting seam).')
  })

  test('zero is still said', () => {
    expect(focusSentence(PARTS(false, true), 0, 'note')).toBe('0 notes outside the picked part (What the tests check).')
  })

  test('several parts, in the epic’s order; a part with no heading goes by its id', () => {
    expect(focusSentence(PARTS(true, true), 2, 'slide')).toBe(
      '2 slides outside the 2 picked parts (The posting seam, What the tests check).',
    )
    expect(focusSentence([part('plain', true)], 1)).toBe('1 item outside the picked part (plain).')
  })

  test('a noun whose plural is not an s', () => {
    expect(focusSentence(PARTS(true, false), 2, ['entry', 'entries'])).toBe('2 entries outside the picked part (The posting seam).')
  })

  test('with a total: how many of how many, the noun counted by the total and the verb by the outside', () => {
    const seam = PARTS(true, false)
    expect(focusSentence(seam, 2, 'question', { total: 3 })).toBe('2 of 3 questions are outside the picked part (The posting seam).')
    expect(focusSentence(seam, 1, 'question', { total: 3 })).toBe('1 of 3 questions is outside the picked part (The posting seam).')
    expect(focusSentence(seam, 1, 'question', { total: 1 })).toBe('1 of 1 question is outside the picked part (The posting seam).')
    expect(focusSentence(seam, 0, 'question', { total: 1 })).toBe('0 of 1 question are outside the picked part (The posting seam).')
    expect(focusSentence(seam, 0, ['entry', 'entries'], { total: 0 })).toBe('0 of 0 entries are outside the picked part (The posting seam).')
    /* A qualifier is the caller's, and rides in the noun. */
    expect(focusSentence(PARTS(true, true), 2, ['reference shown here', 'references shown here'], { total: 3 })).toBe(
      '2 of 3 references shown here are outside the 2 picked parts (The posting seam, What the tests check).',
    )
    expect(focusSentence(PARTS(false, false), 2, 'question', { total: 3 })).toBe('')
  })

  test('without one, or with an empty options object, it is the sentence it was', () => {
    expect(focusSentence(PARTS(true, false), 3, 'question', {})).toBe(focusSentence(PARTS(true, false), 3, 'question'))
  })

  test('and where the control is', () => {
    expect(FOCUS_WHERE).toContain('host’s bar')
  })
})

test('sameParts compares by value', () => {
  const a = PARTS(true, false)
  expect(sameParts(a, a)).toBe(true)
  expect(sameParts(a, PARTS(true, false))).toBe(true)
  expect(sameParts(a, PARTS(true, true))).toBe(false)
  expect(sameParts([], [])).toBe(true)
})

describe('what a manifest says about parts', () => {
  const base = {
    kind: MANIFEST_KIND,
    protocol: PROTOCOL,
    id: 'kehikot.example',
    name: 'Example',
    version: '1.0.0',
    entry: '/app',
    modes: [{ id: 'example', label: 'Example', scope: 'epic' }],
  }

  test('a module that follows the parts carries no partless key at all', () => {
    const parsed = manifestSchema.parse({ ...base, reacts: ['parts'] })
    expect('partless' in parsed).toBe(false)
    expect(parsed.reacts).toEqual(['parts'])
  })

  test('partless is one bounded sentence', () => {
    expect(manifestSchema.parse({ ...base, partless: ' A terminal: nothing in it belongs to an epic. ' }).partless).toBe(
      'A terminal: nothing in it belongs to an epic.',
    )
    expect(manifestSchema.safeParse({ ...base, partless: '' }).success).toBe(false)
    expect(manifestSchema.safeParse({ ...base, partless: 'x'.repeat(201) }).success).toBe(false)
  })

  test('following the parts, or saying why not, is nothing to report', () => {
    expect(partsDeclaration(manifestSchema.parse({ ...base, reacts: ['passage', 'parts'] }))).toEqual([])
    expect(partsDeclaration(manifestSchema.parse({ ...base, partless: 'A terminal.' }))).toEqual([])
  })

  test('saying neither is refused, and the issue is the sentence saying what to add', () => {
    const neither = { ...base, reacts: ['passage'] }
    const said = partsDeclaration(neither)
    expect(said).toHaveLength(1)
    expect(said[0]).toContain('kehikot.example does not say how it relates to the parts')
    expect(said[0]).toContain("Add 'parts' to reacts")
    expect(said[0]).toContain('set partless to one sentence')

    const parsed = manifestSchema.safeParse(neither)
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues).toHaveLength(1)
    expect(parsed.error.issues[0]?.message).toBe(said[0]!)
    expect(parsed.error.issues[0]?.path).toEqual(['partless'])
    /* A manifest that says nothing at all about parts — every one written before 0.34.0 — is the same case. */
    expect(manifestSchema.safeParse(base).success).toBe(false)
  })

  test('saying both is refused too', () => {
    const both = { ...base, reacts: ['parts'], partless: 'Nothing.' }
    expect(partsDeclaration(both)[0]).toContain('one or the other')
    const parsed = manifestSchema.safeParse(both)
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues[0]?.message).toContain('one or the other')
  })

  test('a manifest that is wrong in another way is told about that, not about parts', () => {
    const parsed = manifestSchema.safeParse({ ...base, reacts: ['parts'], name: '' })
    expect(parsed.success).toBe(false)
    if (!parsed.success) expect(parsed.error.issues.map((issue) => issue.path[0])).toEqual(['name'])
  })

  test('it reads an unparsed manifest as well', () => {
    expect(partsDeclaration({})).toHaveLength(1)
    expect(partsDeclaration({ partless: '   ' })).toHaveLength(1)
  })
})
