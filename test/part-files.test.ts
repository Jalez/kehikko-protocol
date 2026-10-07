import { describe, expect, test } from 'bun:test'

import {
  KEHIKOT_DIR,
  LIMITS,
  PAPER_MODULE,
  contextSchema,
  fileInFocus,
  focusCount,
  isPartFile,
  journeyGroupSchema,
  journeyRecordSchema,
  moduleDir,
  paperFileOf,
  partFile,
  partSchema,
  partsOf,
  partsOfFile,
  partsSchema,
  pickedFiles,
  refInFocus,
  type EpicPart,
} from '../src/index.js'

/**
 * The files of an epic's paper that a part owns (0.32.0).
 *
 * A part knew only references, so a module that shows a document could not
 * narrow to one. Now a group may name files, each RELATIVE TO THE PAPER'S
 * FOLDER — `<project>/.kehikot/paper/<epic>/` — and one function,
 * `paperFileOf`, turns the absolute path a module holds into that name.
 */

const PROJECT = '/Users/someone/Projects/roadmap'
const EPIC = 'the-roadmap-tracks-itself'
const at = (file: string, epic = EPIC) => `${moduleDir(PROJECT, PAPER_MODULE)}/${epic}/${file}`

const part = (id: string, files: string[], picked = false, refs: string[] = []): EpicPart =>
  partSchema.parse({ id, heading: id, refs, files, picked })
const seam = part('the-posting-seam', ['parts/posting-seam.tex', 'parts/tables/seam.tex'], false, ['gh#1'])
const tests = part('what-the-tests-check', ['parts/tests.tex'])
const page = partSchema.parse({ id: 'the-page', heading: 'the-page' })
const pick = (one: EpicPart): EpicPart => ({ ...one, picked: true })

describe('the form a part’s file is kept in', () => {
  test('a name relative to the paper’s folder, with forward slashes, is itself', () => {
    for (const file of ['main.tex', 'parts/posting-seam.tex', 'chapters/3_method/tables/results.tex', 'a b/ä.tex', '.hidden/x.tex', 'a..b.tex']) {
      expect(partFile(file)).toBe(file)
      expect(isPartFile(file)).toBe(true)
    }
  })

  test('only what cannot change the file is tidied: space around it, a leading ./, the normal form', () => {
    expect(partFile('  parts/a.tex \n')).toBe('parts/a.tex')
    expect(partFile('./parts/a.tex')).toBe('parts/a.tex')
    expect(partFile('././a.tex')).toBe('a.tex')
    expect(partFile('a\u0308.tex')).toBe('\u00e4.tex')
    /* Tidied is not the form: the wire wants it already done. */
    expect(isPartFile('./parts/a.tex')).toBe(false)
    expect(isPartFile(' a.tex')).toBe(false)
    expect(isPartFile('a\u0308.tex')).toBe(false)
  })

  test('nothing absolute, nothing that climbs, no backslash, nothing empty, nothing unprintable', () => {
    const refused = [
      '/etc/passwd',
      '/Users/someone/Projects/roadmap/.kehikot/paper/x/main.tex',
      'C:/papers/main.tex',
      'C:main.tex',
      'c:\\papers\\main.tex',
      '..',
      '../other-epic/main.tex',
      'parts/../../secrets.tex',
      'parts/..',
      'parts/./a.tex',
      '.',
      './',
      'parts\\a.tex',
      'parts//a.tex',
      'parts/',
      '',
      '   ',
      'a\u0000.tex',
      'a\nb.tex',
      'a\u007f.tex',
      `${'x'.repeat(LIMITS.PART_FILE)}.tex`,
      'y'.repeat(LIMITS.PATH + 1),
    ]
    for (const file of refused) {
      expect(partFile(file)).toBeNull()
      expect(isPartFile(file)).toBe(false)
    }
    for (const junk of [null, undefined, 7, {}, ['a.tex']]) {
      expect(partFile(junk)).toBeNull()
      expect(isPartFile(junk)).toBe(false)
    }
    expect(partFile('x'.repeat(LIMITS.PART_FILE))).toHaveLength(LIMITS.PART_FILE)
  })
})

describe('the one comparison: what a module holds, as the paper’s own name for it', () => {
  test('the folder is where the Paper module keeps a paper', () => {
    expect(PAPER_MODULE).toBe('kehikot.paper')
    expect(at('main.tex')).toBe(`${PROJECT}/${KEHIKOT_DIR}/paper/${EPIC}/main.tex`)
  })

  test('an absolute path under the epic’s paper folder is the name after it', () => {
    expect(paperFileOf(at('parts/posting-seam.tex'), EPIC)).toBe('parts/posting-seam.tex')
    expect(paperFileOf(at('main.tex'), EPIC)).toBe('main.tex')
  })

  test('the project is not measured: a resolved spelling of the same folder is the same file', () => {
    /* Paper publishes a realpath; a host sends what was typed. */
    expect(paperFileOf(`/private/tmp/p/.kehikot/paper/${EPIC}/parts/a.tex`, EPIC)).toBe('parts/a.tex')
    expect(paperFileOf(`/tmp/p/.kehikot/paper/${EPIC}/parts/a.tex`, EPIC)).toBe('parts/a.tex')
    expect(paperFileOf(`C:\\Users\\x\\p\\.kehikot\\paper\\${EPIC}\\parts\\a.tex`, EPIC)).toBe('parts/a.tex')
  })

  test('another epic’s paper, another module’s folder and a file outside any paper are not it', () => {
    expect(paperFileOf(at('parts/posting-seam.tex', 'another-epic'), EPIC)).toBeNull()
    expect(paperFileOf(`${PROJECT}/.kehikot/notes/${EPIC}/parts/a.tex`, EPIC)).toBeNull()
    expect(paperFileOf(`${PROJECT}/parts/posting-seam.tex`, EPIC)).toBeNull()
    expect(paperFileOf(`${PROJECT}/.kehikot/paper/${EPIC}`, EPIC)).toBeNull()
    expect(paperFileOf(`${PROJECT}/.kehikot/paper/${EPIC}/`, EPIC)).toBeNull()
    expect(paperFileOf(at('parts/../../x.tex'), EPIC)).toBeNull()
    expect(paperFileOf(at('main.tex'), 'Not A Slug')).toBeNull()
    expect(paperFileOf(at('main.tex'), '')).toBeNull()
    for (const junk of [null, undefined, 7, {}, '']) expect(paperFileOf(junk, EPIC)).toBeNull()
  })

  test('with no epic named, any epic’s paper folder is read — the caller’s word that it is the open one', () => {
    expect(paperFileOf(at('parts/a.tex', 'another-epic'))).toBe('parts/a.tex')
    expect(paperFileOf(at('parts/a.tex'), null)).toBe('parts/a.tex')
    expect(paperFileOf(`${PROJECT}/.kehikot/paper/Not A Slug/a.tex`)).toBeNull()
    expect(paperFileOf(`${PROJECT}/.kehikot/paper/main.tex`)).toBeNull()
    expect(paperFileOf(`${PROJECT}/main.tex`)).toBeNull()
  })

  test('a relative path is taken as the paper’s own name already, and held to the form', () => {
    expect(paperFileOf('parts/a.tex', EPIC)).toBe('parts/a.tex')
    expect(paperFileOf('./parts/a.tex')).toBe('parts/a.tex')
    expect(paperFileOf('parts\\a.tex')).toBe('parts/a.tex')
    expect(paperFileOf('../a.tex', EPIC)).toBeNull()
  })

  test('names are compared as written', () => {
    expect(paperFileOf(at('Parts/A.tex'), EPIC)).toBe('Parts/A.tex')
    expect(fileInFocus([pick(seam)], at('Parts/Posting-Seam.tex'), EPIC)).toBe(false)
  })
})

describe('a group may name the files it owns', () => {
  const record = {
    slug: EPIC,
    title: 'A paper in parts',
    steps: [{ title: 'A step', refs: ['gh#7'], part: 'the-posting-seam', files: ['steps/never.tex'] }],
    groups: [
      { heading: 'The posting seam', refs: ['gh#1'], files: ['parts/posting-seam.tex', './parts/tables/seam.tex'] },
      { heading: 'What the tests check', refs: [] },
      { heading: 'The page', files: [] },
    ],
  }

  test('the record takes them, optionally, and keeps a group without any as it was', () => {
    const parsed = journeyRecordSchema.parse(record)
    expect(parsed.groups[0]?.files).toEqual(['parts/posting-seam.tex', './parts/tables/seam.tex'])
    expect(parsed.groups[1]).toEqual({ heading: 'What the tests check', refs: [] })
    expect('files' in parsed.groups[1]!).toBe(false)
    expect(journeyGroupSchema.parse({ heading: 'x' })).toEqual({ heading: 'x', refs: [] })
    /* Plain strings: a mistyped name does not make the record unreadable. */
    expect(journeyGroupSchema.safeParse({ heading: 'x', files: ['../y', '/abs'] }).success).toBe(true)
  })

  test('partsOf carries them in the form, and says nothing for a group with none', () => {
    const parts = partsOf(record)
    expect(parts[0]).toEqual({
      id: 'the-posting-seam',
      heading: 'The posting seam',
      refs: ['gh#1', 'gh#7'],
      steps: 1,
      files: ['parts/posting-seam.tex', 'parts/tables/seam.tex'],
    })
    /* A step names no file; nothing is folded in from one. */
    expect(parts[1]).toEqual({ id: 'what-the-tests-check', heading: 'What the tests check', refs: [], steps: 0 })
    expect('files' in parts[1]!).toBe(false)
    expect('files' in parts[2]!).toBe(false)
    expect(partsOf(journeyRecordSchema.parse(record))).toEqual(parts)
  })

  test('junk costs the entry: wrong form dropped, repeats once, bounded', () => {
    const [one] = partsOf({
      groups: [
        {
          heading: 'Kept',
          files: ['a.tex', null, 42, '', '/abs/a.tex', '../up.tex', 'b\\c.tex', ' a.tex ', './a.tex', 'x'.repeat(500), 'd/e.tex'],
        },
      ],
    })
    expect(one?.files).toEqual(['a.tex', 'd/e.tex'])
    expect(partsOf({ groups: [{ heading: 'Not a list', files: 'a.tex' }] })[0]).toEqual({
      id: 'not-a-list',
      heading: 'Not a list',
      refs: [],
      steps: 0,
    })
    const wide = { groups: [{ heading: 'Wide', files: Array.from({ length: LIMITS.PART_FILES + 9 }, (_, i) => `p/${i}.tex`) }] }
    expect(partsOf(wide)[0]?.files).toHaveLength(LIMITS.PART_FILES)
    /* And what leaves is what the wire's own schema takes. */
    const onWire = partsOf(wide).map(({ steps: _steps, ...part }) => ({ ...part, picked: false }))
    expect(partsSchema.parse(onWire)[0]?.files).toHaveLength(LIMITS.PART_FILES)
    /* A module on an older version strips what it has not heard of, and is as correct as it was. */
    const older = partSchema.omit({ files: true })
    expect(older.parse(onWire[0])).toEqual({ id: 'wide', heading: 'Wide', refs: [], picked: false })
  })
})

describe('on the wire', () => {
  test('a part from a host that has never heard of files owns none', () => {
    const old = partSchema.parse({ id: 'the-posting-seam', heading: 'The posting seam', refs: ['gh#1'], picked: true })
    /* Exactly the shape it always was: no key appears for a fact nobody sent. */
    expect(old).toEqual({ id: 'the-posting-seam', heading: 'The posting seam', refs: ['gh#1'], picked: true })
    expect(old.files ?? []).toEqual([])
    expect(pickedFiles([old])).toEqual([])
    expect(fileInFocus([old], 'parts/a.tex', EPIC)).toBe(false)
    const context = contextSchema.parse({ epic: EPIC, parts: [{ id: 'a' }, { id: 'b', files: ['parts/b.tex'] }, { id: 'c', files: [] }] })
    expect(context.parts.map((one) => one.files)).toEqual([undefined, ['parts/b.tex'], []])
  })

  test('the list is bounded, and every entry is in the form or the part is refused', () => {
    const ok = Array.from({ length: LIMITS.PART_FILES }, (_, i) => `p/${i}.tex`)
    expect(partSchema.safeParse({ id: 'a', files: ok }).success).toBe(true)
    expect(partSchema.safeParse({ id: 'a', files: [...ok, 'one-more.tex'] }).success).toBe(false)
    expect(partSchema.safeParse({ id: 'a', files: ['x'.repeat(LIMITS.PART_FILE)] }).success).toBe(true)
    for (const bad of ['', '/abs.tex', '../a.tex', 'a/../b.tex', 'a\\b.tex', './a.tex', ' a.tex', 'C:/a.tex', 'x'.repeat(LIMITS.PART_FILE + 1)]) {
      expect(partSchema.safeParse({ id: 'a', files: [bad] }).success).toBe(false)
    }
    expect(partSchema.safeParse({ id: 'a', files: 'a.tex' }).success).toBe(false)
  })
})

describe('whether a file is in front of the person', () => {
  test('nothing picked: every file is, whatever it is', () => {
    const parts = [seam, tests, page]
    expect(fileInFocus(parts, at('parts/posting-seam.tex'), EPIC)).toBe(true)
    expect(fileInFocus(parts, at('main.tex'), EPIC)).toBe(true)
    expect(fileInFocus(parts, '/somewhere/else.tex', EPIC)).toBe(true)
    expect(fileInFocus([], at('main.tex'), EPIC)).toBe(true)
    expect(pickedFiles(parts)).toEqual([])
  })

  test('picked: exactly the picked parts’ files, by absolute path or by the paper’s own name', () => {
    const parts = [pick(seam), tests, page]
    expect(fileInFocus(parts, at('parts/posting-seam.tex'), EPIC)).toBe(true)
    expect(fileInFocus(parts, 'parts/tables/seam.tex', EPIC)).toBe(true)
    expect(fileInFocus(parts, at('parts/tests.tex'), EPIC)).toBe(false)
    expect(pickedFiles(parts)).toEqual(['parts/posting-seam.tex', 'parts/tables/seam.tex'])
  })

  test('a file in no part is outside every focus — main.tex, and anything not this paper’s', () => {
    const parts = [pick(seam), tests]
    expect(fileInFocus(parts, at('main.tex'), EPIC)).toBe(false)
    expect(fileInFocus(parts, at('parts/unowned.tex'), EPIC)).toBe(false)
    expect(fileInFocus(parts, at('parts/posting-seam.tex', 'another-epic'), EPIC)).toBe(false)
    expect(fileInFocus(parts, `${PROJECT}/README.md`, EPIC)).toBe(false)
    expect(fileInFocus(parts, '../parts/posting-seam.tex', EPIC)).toBe(false)
  })

  test('several picked parts are a union, and a picked part with no file narrows to nothing', () => {
    const both = [pick(seam), pick(tests), page]
    expect(fileInFocus(both, at('parts/tests.tex'), EPIC)).toBe(true)
    expect(pickedFiles(both)).toEqual(['parts/posting-seam.tex', 'parts/tables/seam.tex', 'parts/tests.tex'])
    const none = [seam, pick(page)]
    expect(pickedFiles(none)).toEqual([])
    expect(fileInFocus(none, at('parts/posting-seam.tex'), EPIC)).toBe(false)
    expect(partsOfFile(none, 'parts/posting-seam.tex').map((one) => one.id)).toEqual(['the-posting-seam'])
    expect(refInFocus([pick(seam)], 'gh#1')).toBe(true)
    /* One file owned twice is listed once. */
    expect(pickedFiles([pick(seam), pick(part('again', ['parts/posting-seam.tex']))])).toEqual([
      'parts/posting-seam.tex',
      'parts/tables/seam.tex',
    ])
  })

  test('which parts own a file', () => {
    const parts = [seam, tests, part('again', ['parts/tests.tex'])]
    expect(partsOfFile(parts, at('parts/tests.tex'), EPIC).map((one) => one.id)).toEqual(['what-the-tests-check', 'again'])
    expect(partsOfFile(parts, at('main.tex'), EPIC)).toEqual([])
    expect(partsOfFile(parts, '/abs/elsewhere.tex', EPIC)).toEqual([])
  })

  test('“N files outside the picked parts” is focusCount over the paper’s files', () => {
    const files = ['main.tex', 'parts/posting-seam.tex', 'parts/tables/seam.tex', 'parts/tests.tex', 'appendix.tex']
    const count = (parts: EpicPart[]) => focusCount(parts, files, (file) => fileInFocus(parts, file, EPIC))
    expect(count([seam, tests])).toEqual({ shown: 5, outside: 0 })
    expect(count([pick(seam), tests])).toEqual({ shown: 2, outside: 3 })
    expect(count([pick(seam), pick(tests)])).toEqual({ shown: 3, outside: 2 })
    expect(count([seam, pick(page)])).toEqual({ shown: 0, outside: 5 })
  })
})
