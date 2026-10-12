import { describe, expect, test } from 'bun:test'
import {
  LIMITS,
  PART_ID,
  anchorInFocus,
  contextSchema,
  documentOf,
  emptySaid,
  fileInFocus,
  focusSentence,
  isPartDocument,
  listedPartSchema,
  narrowToFocus,
  partDocument,
  partIdFor,
  partListSchema,
  partSchema,
  partsFor,
  partsOfFile,
  partsSchema,
  PARTS_BEFORE_1_2,
  pickedDocuments,
  pickedFiles,
  type Anchors,
  type EpicPart,
} from '../src/index.js'

/**
 * Parts as 1.2.0 leaves them: a part belongs to the epic and names no module, what it has is
 * `documents` (project-relative) and `refs`, and one rule says what a pick shows. Everything a 1.1.0
 * host or module does is asserted unchanged beside each addition.
 */

const PROJECT = '/home/a/proj'
const methods = '.kehikot/paper/thesis/chapters/3_methods.tex'

/** What a 1.2.0 host sends: `documents`, and `files` beside it for a module that still reads those. */
const now = (picked: string[] = []): EpicPart[] => [
  { id: 'methods', heading: 'Methods', refs: ['gh#12'], picked: picked.includes('methods'), documents: [methods, 'src/sim/run.ts'], files: ['chapters/3_methods.tex'] },
  { id: 'results', heading: 'Results', refs: [], picked: picked.includes('results'), documents: ['.kehikot/slides/thesis/results.md'] },
]
/** What a 1.1.0 host sends: `files` only. */
const before = (picked: string[] = []): EpicPart[] => [
  { id: 'methods', heading: 'Methods', refs: ['gh#12'], picked: picked.includes('methods'), files: ['chapters/3_methods.tex'] },
  { id: 'results', heading: 'Results', refs: [], picked: picked.includes('results') },
]

describe('a document: project-relative, and normalised in one place', () => {
  test('the stored form is partFile’s, with the project as its root', () => {
    expect(partDocument(methods)).toBe(methods)
    expect(partDocument('  ./src/a.ts ')).toBe('src/a.ts')
    for (const no of ['/abs/a.ts', 'C:/a.ts', 'a/../b.ts', 'a//b.ts', 'a\\b.ts', '', '.', 'a/\u0000.ts', 7, null]) {
      expect(partDocument(no)).toBeNull()
    }
    expect(isPartDocument('src/a.ts')).toBe(true)
    expect(isPartDocument('./src/a.ts')).toBe(false)
  })

  test('longer than a paper-relative name may be, by the folders in front of it', () => {
    const file = `chapters/${'a'.repeat(LIMITS.PART_FILE - 'chapters/'.length)}`
    expect(file).toHaveLength(LIMITS.PART_FILE)
    expect(partDocument(`.kehikot/paper/${'e'.repeat(LIMITS.EPIC_SLUG)}/${file}`)).not.toBeNull()
    expect(partDocument('a'.repeat(LIMITS.PART_DOCUMENT + 1))).toBeNull()
  })

  test('documentOf: a relative path is the project’s already', () => {
    expect(documentOf('src/a.ts')).toBe('src/a.ts')
    expect(documentOf('../a.ts')).toBeNull()
  })

  test('documentOf: an absolute path is read against the project', () => {
    expect(documentOf(`${PROJECT}/src/a.ts`, PROJECT)).toBe('src/a.ts')
    expect(documentOf(`${PROJECT}/src/a.ts`, `${PROJECT}/`)).toBe('src/a.ts')
    expect(documentOf(`${PROJECT}/${methods}`, PROJECT)).toBe(methods)
    expect(documentOf('C:\\proj\\src\\a.ts', 'C:\\proj')).toBe('src/a.ts')
    /* Not under the project, and not in anybody's `.kehikot/`: no document. */
    expect(documentOf('/elsewhere/src/a.ts', PROJECT)).toBeNull()
    expect(documentOf(`${PROJECT}-other/src/a.ts`, PROJECT)).toBeNull()
  })

  test('documentOf: without the project, or through a symlink, `.kehikot/` is found in the path', () => {
    expect(documentOf(`${PROJECT}/${methods}`)).toBe(methods)
    expect(documentOf(`/private/real/proj/${methods}`, PROJECT)).toBe(methods)
    /* The innermost one. */
    expect(documentOf('/a/.kehikot/x/b/.kehikot/notes/n.json')).toBe('.kehikot/notes/n.json')
    expect(documentOf('/home/a/proj/src/a.ts')).toBeNull()
  })
})

describe('documents on a part', () => {
  test('optional and not defaulted: a part without them parses to exactly what it did', () => {
    expect(partSchema.parse({ id: 'a' })).toEqual({ id: 'a', heading: '', refs: [], picked: false })
    expect(partSchema.parse({ id: 'a', documents: [methods] }).documents).toEqual([methods])
  })

  test('an entry not in the form is refused, and the list is bounded', () => {
    for (const no of ['/abs.tex', '../a.tex', './a.tex', 'a\\b.tex', '']) {
      expect(partSchema.safeParse({ id: 'a', documents: [no] }).success).toBe(false)
    }
    const many = Array.from({ length: LIMITS.PART_DOCUMENTS + 1 }, (_, i) => `src/${i}.ts`)
    expect(partSchema.safeParse({ id: 'a', documents: many }).success).toBe(false)
    expect(partSchema.safeParse({ id: 'a', documents: many.slice(1) }).success).toBe(true)
  })

  test('a context of the most parts there may be, each full, still parses', () => {
    const parts = Array.from({ length: LIMITS.PARTS }, (_, i) => ({
      id: `part-${i}`,
      heading: 'h'.repeat(LIMITS.TITLE),
      refs: Array.from({ length: LIMITS.PART_REFS }, (_, n) => `gh#${n}`),
      files: Array.from({ length: LIMITS.PART_FILES }, (_, n) => `f/${n}.tex`),
      documents: Array.from({ length: LIMITS.PART_DOCUMENTS }, (_, n) => `d/${n}.tex`),
    }))
    expect(LIMITS.PARTS).toBe(128)
    expect(contextSchema.parse({ parts }).parts).toHaveLength(128)
    expect(contextSchema.safeParse({ parts: [...parts, { id: 'one-more' }] }).success).toBe(false)
  })

  test('pickedDocuments: the picked parts’ documents, once each, in order', () => {
    expect(pickedDocuments(now())).toEqual([])
    expect(pickedDocuments(now(['results', 'methods']))).toEqual([methods, 'src/sim/run.ts', '.kehikot/slides/thesis/results.md'])
    /* The deprecated reading is as it was. */
    expect(pickedFiles(now(['methods']))).toEqual(['chapters/3_methods.tex'])
  })
})

describe('a { file } anchor is compared against documents', () => {
  test('absolute, project-relative, and any module’s folder', () => {
    const parts = now(['methods'])
    expect(fileInFocus(parts, `${PROJECT}/${methods}`, 'thesis', PROJECT)).toBe(true)
    expect(fileInFocus(parts, methods, 'thesis')).toBe(true)
    expect(fileInFocus(parts, `${PROJECT}/src/sim/run.ts`, 'thesis', PROJECT)).toBe(true)
    expect(fileInFocus(parts, 'src/sim/run.ts')).toBe(true)
    expect(fileInFocus(parts, `${PROJECT}/.kehikot/slides/thesis/results.md`, 'thesis', PROJECT)).toBe(false)
    expect(fileInFocus(now(['results']), `${PROJECT}/.kehikot/slides/thesis/results.md`, 'thesis', PROJECT)).toBe(true)
    expect(fileInFocus(parts, `${PROJECT}/README.md`, 'thesis', PROJECT)).toBe(false)
  })

  test('a file outside `.kehikot/` needs the project to be read; without it, it is outside', () => {
    expect(fileInFocus(now(['methods']), `${PROJECT}/src/sim/run.ts`, 'thesis')).toBe(false)
  })

  test('nothing picked: everything, whatever it is', () => {
    expect(fileInFocus(now(), '/anywhere/at/all')).toBe(true)
  })

  test('a host that sends only `files` is answered exactly as before', () => {
    const parts = before(['methods'])
    expect(fileInFocus(parts, `${PROJECT}/.kehikot/paper/thesis/chapters/3_methods.tex`, 'thesis')).toBe(true)
    expect(fileInFocus(parts, 'chapters/3_methods.tex', 'thesis')).toBe(true)
    expect(fileInFocus(parts, `${PROJECT}/.kehikot/paper/other/chapters/3_methods.tex`, 'thesis')).toBe(false)
    expect(fileInFocus(parts, `${PROJECT}/.kehikot/paper/thesis/main.tex`, 'thesis')).toBe(false)
    expect(partsOfFile(parts, 'chapters/3_methods.tex', 'thesis').map((part) => part.id)).toEqual(['methods'])
  })

  test('a module anchored by document still narrows on a host that sends only `files`', () => {
    expect(fileInFocus(before(['methods']), methods, 'thesis')).toBe(true)
    expect(fileInFocus(before(['methods']), '.kehikot/paper/other/chapters/3_methods.tex', 'thesis')).toBe(false)
  })

  test('a module that holds paper-relative names still narrows on a host that sends both', () => {
    expect(fileInFocus(now(['methods']), 'chapters/3_methods.tex', 'thesis')).toBe(true)
  })

  test('partsOfFile reads the same names', () => {
    expect(partsOfFile(now(), `${PROJECT}/src/sim/run.ts`, 'thesis', PROJECT).map((part) => part.id)).toEqual(['methods'])
    expect(partsOfFile(now(), `${PROJECT}/README.md`, 'thesis', PROJECT)).toEqual([])
  })
})

describe('the whole-epic anchor', () => {
  test('nothing picked: in front, like everything', () => {
    expect(anchorInFocus(now(), { whole: true })).toBe(true)
  })

  test('in front under any pick, alone or among other anchors', () => {
    for (const picked of [['methods'], ['results'], ['methods', 'results']]) {
      expect(anchorInFocus(now(picked), { whole: true })).toBe(true)
      expect(anchorInFocus(now(picked), [{ ref: 'gh#999' }, { whole: true }])).toBe(true)
    }
  })

  test('it is not the absence of an anchor: an item about nothing in particular is still outside', () => {
    const parts = now(['results'])
    for (const none of [null, undefined, [], { part: null }] as Anchors[]) expect(anchorInFocus(parts, none)).toBe(false)
  })

  test('narrowToFocus keeps a whole-epic item, and does not count it outside or as kept', () => {
    const lists = [
      { id: 'whole', anchor: { whole: true } as const },
      { id: 'pr', anchor: { ref: 'gh#12' } },
      { id: 'loose', anchor: null },
    ]
    const narrowed = narrowToFocus(now(['results']), lists, (list) => list.anchor)
    expect(narrowed.shown.map((list) => list.id)).toEqual(['whole'])
    expect(narrowed).toMatchObject({ outside: 2, kept: 0 })
  })

  test('something that only looks like one is no anchor', () => {
    const parts = now(['results'])
    expect(anchorInFocus(parts, { whole: false } as unknown as Anchors)).toBe(false)
    expect(anchorInFocus(parts, [null] as unknown as Anchors)).toBe(false)
    expect(anchorInFocus(parts, { something: 'else' } as unknown as Anchors)).toBe(false)
  })
})

describe('anchors of all four kinds, through the one rule', () => {
  const items: { id: string; anchors: Anchors }[] = [
    { id: 'by-part', anchors: { part: 'methods' } },
    { id: 'by-ref', anchors: { ref: 'gh#12' } },
    { id: 'by-file', anchors: { file: `${PROJECT}/src/sim/run.ts` } },
    { id: 'by-several', anchors: [{ file: 'nowhere.md' }, { part: 'results' }] },
    { id: 'by-whole', anchors: { whole: true } },
    { id: 'by-none', anchors: null },
  ]
  const shown = (picked: string[], keep?: string) =>
    narrowToFocus(now(picked), items, (item) => item.anchors, { epic: 'thesis', projectPath: PROJECT, keep: keep ? (item) => item.id === keep : undefined })
      .shown.map((item) => item.id)

  test('nothing picked → everything', () => {
    expect(shown([])).toEqual(items.map((item) => item.id))
  })

  test('picked → exactly the items with an anchor in a picked part', () => {
    expect(shown(['methods'])).toEqual(['by-part', 'by-ref', 'by-file', 'by-whole'])
    expect(shown(['results'])).toEqual(['by-several', 'by-whole'])
    expect(shown(['methods', 'results'])).toEqual(['by-part', 'by-ref', 'by-file', 'by-several', 'by-whole'])
  })

  test('what is in hand is kept, in its place', () => {
    expect(shown(['results'], 'by-none')).toEqual(['by-several', 'by-whole', 'by-none'])
  })
})

describe('emptySaid: the one sentence, and only in a view the pick left empty', () => {
  test('one part, several parts, nothing picked', () => {
    expect(emptySaid(now(['methods']), 'note')).toBe('No note is in the picked part.')
    expect(emptySaid(now(['methods', 'results']), 'note')).toBe('No note is in the picked parts.')
    expect(emptySaid(now(), 'note')).toBe('')
  })

  test('every module’s noun reads the same way', () => {
    for (const noun of ['step', 'note', 'question', 'slide', 'entry', 'checklist', 'reference', 'page', 'run', 'session', 'file']) {
      expect(emptySaid(now(['methods']), noun)).toBe(`No ${noun} is in the picked part.`)
    }
  })

  test('no noun is "item"', () => {
    expect(emptySaid(now(['methods']))).toBe('No item is in the picked part.')
    expect(emptySaid(now(['methods']), '  ')).toBe('No item is in the picked part.')
  })

  test('the deprecated count line still says what it said', () => {
    expect(focusSentence(now(['methods']), 3, 'question')).toBe('3 questions outside the picked part (Methods).')
  })
})

describe('the epic’s own list: an id and a name', () => {
  test('a listed part', () => {
    expect(listedPartSchema.parse({ id: 'methods', name: '  Methods ' })).toEqual({ id: 'methods', name: 'Methods' })
    expect(listedPartSchema.safeParse({ id: 'Methods', name: 'Methods' }).success).toBe(false)
    expect(listedPartSchema.safeParse({ id: 'methods', name: ' ' }).success).toBe(false)
    expect(listedPartSchema.safeParse({ id: 'methods', name: 'n'.repeat(LIMITS.TITLE + 1) }).success).toBe(false)
  })

  test('the list is bounded and no id is in it twice', () => {
    const parts = Array.from({ length: LIMITS.PARTS + 1 }, (_, i) => ({ id: `p-${i}`, name: `P ${i}` }))
    expect(partListSchema.safeParse(parts).success).toBe(false)
    expect(partListSchema.safeParse(parts.slice(1)).success).toBe(true)
    expect(partListSchema.safeParse([parts[0], parts[0]]).success).toBe(false)
  })

  test('a new part’s id is made from its name, once, and told apart from the ones taken', () => {
    expect(partIdFor('What the page shows', [])).toBe('what-the-page-shows')
    expect(partIdFor('Methods', ['methods'])).toBe('methods-2')
    expect(partIdFor('Methods', new Set(['methods', 'methods-2']))).toBe('methods-3')
    expect(partIdFor('…', [])).toBe('part')
    /* Always a PART_ID, however long the name and however many are taken. */
    const long = 'a'.repeat(200)
    const taken = [partIdFor(long, [])]
    for (let i = 0; i < 1100; i += 1) taken.push(partIdFor(long, taken))
    expect(new Set(taken).size).toBe(taken.length)
    expect(taken.every((id) => /^[a-z0-9-]{1,80}$/.test(id))).toBe(true)
    expect(taken[1]).toBe(`${'a'.repeat(78)}-2`)
    expect(partIdFor('!!', ['part'])).toBe('part-2')
    expect(partIdFor(undefined, [])).toBe('part')
  })

  test('every id it makes is a PART_ID, at the longest too', () => {
    const long = 'x'.repeat(200)
    const first = partIdFor(long, [])
    const second = partIdFor(long, [first])
    for (const id of [first, second, partIdFor('Ääkköset & muut', [])]) expect(PART_ID.test(id)).toBe(true)
    expect(second).not.toBe(first)
  })
})

describe('128 parts, and a module built before there could be', () => {
  const long = (picked: number[] = []): EpicPart[] =>
    Array.from({ length: 100 }, (_, i) => ({ id: `step-${i}`, heading: `Step ${i}`, refs: [], picked: picked.includes(i) }))

  test('a module on 1.2.0 or later is sent the whole list', () => {
    for (const built of ['1.2.0', '1.2.1', '1.10.0', '2.0.0']) expect(partsFor(long([40]), built)).toHaveLength(100)
  })

  test('an older or unknown build is sent what its schema takes: every picked part, and the rest in order', () => {
    for (const built of ['1.1.0', '1.0.0', '0.36.0', '', 'main', null, undefined]) {
      const sent = partsFor(long([40, 99]), built)
      expect(sent).toHaveLength(PARTS_BEFORE_1_2)
      expect(sent.filter((part) => part.picked).map((part) => part.id)).toEqual(['step-40', 'step-99'])
      /* The epic's order, and the first thirty of the rest. */
      expect(sent.map((part) => part.id)).toEqual([...Array.from({ length: 30 }, (_, i) => `step-${i}`), 'step-40', 'step-99'])
    }
  })

  test('more picked than an older module can be sent: the first of them', () => {
    const sent = partsFor(long(Array.from({ length: 50 }, (_, i) => i * 2)), '1.1.0')
    expect(sent).toHaveLength(PARTS_BEFORE_1_2)
    expect(sent.every((part) => part.picked)).toBe(true)
    expect(sent[0]!.id).toBe('step-0')
  })

  test('a list that fits is sent as it is, to anybody', () => {
    const short = long([3]).slice(0, PARTS_BEFORE_1_2)
    expect(partsFor(short, '1.0.0')).toEqual(short)
    expect(partsFor([], null)).toEqual([])
  })

  test('the number is the one a 1.1.0 schema refused past', () => {
    expect(PARTS_BEFORE_1_2).toBe(32)
    expect(partsSchema.safeParse(long()).success).toBe(true)
  })
})
