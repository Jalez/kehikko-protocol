import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { LIMITS, own, partsSchema } from '../src/index.js'
import { holdingsIn, joinHoldings } from '../src/holdings.js'
import { readHoldings, writeHoldings } from '../src/serve/index.js'

/**
 * What each module holds for an epic's parts, published in `<project>/.kehikot/<module>/parts.json`:
 * a module writes its own file and a host reads every module's, by sweeping the folders. Nothing in
 * the reading or the writing knows a module's name; the modules here are made up for that reason.
 */

const made: string[] = []
const project = (): string => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'kehikot-holdings-')))
  made.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const fileOf = (root: string, folder: string) => join(root, '.kehikot', folder, 'parts.json')
const put = (root: string, folder: string, content: unknown) => {
  mkdirSync(join(root, '.kehikot', folder), { recursive: true })
  writeFileSync(fileOf(root, folder), typeof content === 'string' ? content : JSON.stringify(content))
}
const read = (root: string, folder: string) => JSON.parse(readFileSync(fileOf(root, folder), 'utf8'))

describe('writeHoldings: one module, one epic', () => {
  test('writes the documented shape, under the module’s own folder and nowhere else', () => {
    const root = project()
    const said = writeHoldings(root, 'kehikot.chapters', 'thesis', {
      methods: { documents: ['.kehikot/chapters/thesis/3_methods.tex'], refs: [] },
    })
    expect(said).toEqual({ file: fileOf(root, 'chapters'), changed: true, dropped: [] })
    expect(read(root, 'chapters')).toEqual({
      version: 1,
      epics: { thesis: { methods: { documents: ['.kehikot/chapters/thesis/3_methods.tex'], refs: [] } } },
    })
    expect(readdirSync(root)).toEqual(['.kehikot'])
    expect(readdirSync(join(root, '.kehikot'))).toEqual(['chapters'])
    /* Atomic: nothing is left beside it. */
    expect(readdirSync(join(root, '.kehikot', 'chapters'))).toEqual(['parts.json'])
  })

  test('a document may be given absolute, and is stored project-relative', () => {
    const root = project()
    const said = writeHoldings(root, 'kehikot.chapters', 'thesis', {
      methods: { documents: [`${root}/src/sim/run.ts`, './notes.md', '/somewhere/else.txt', '../out.txt'] },
    })
    expect(read(root, 'chapters').epics.thesis.methods.documents).toEqual(['src/sim/run.ts', 'notes.md'])
    expect(said?.dropped).toEqual(['/somewhere/else.txt', '../out.txt'])
  })

  test('refs and documents once each; a part with nothing held is not listed', () => {
    const root = project()
    writeHoldings(root, 'kehikot.steps', 'thesis', {
      methods: { refs: ['gh#1', ' gh#1 ', 'gh#2', ''] },
      results: { refs: [], documents: [] },
    })
    expect(read(root, 'steps').epics.thesis).toEqual({ methods: { documents: [], refs: ['gh#1', 'gh#2'] } })
  })

  test('replaces this epic whole, and leaves every other epic and every unknown key as it was', () => {
    const root = project()
    put(root, 'chapters', {
      version: 1,
      written: 'by something newer',
      epics: {
        other: { intro: { documents: ['a.tex'], refs: [], extra: true } },
        thesis: { old: { documents: ['old.tex'], refs: [] } },
      },
    })
    writeHoldings(root, 'kehikot.chapters', 'thesis', { methods: { documents: ['m.tex'] } })
    expect(read(root, 'chapters')).toEqual({
      version: 1,
      written: 'by something newer',
      epics: {
        other: { intro: { documents: ['a.tex'], refs: [], extra: true } },
        thesis: { methods: { documents: ['m.tex'], refs: [] } },
      },
    })
  })

  test('`{}` takes the epic out, and only that epic', () => {
    const root = project()
    writeHoldings(root, 'kehikot.chapters', 'thesis', { methods: { documents: ['m.tex'] } })
    writeHoldings(root, 'kehikot.chapters', 'other', { intro: { documents: ['i.tex'] } })
    writeHoldings(root, 'kehikot.chapters', 'thesis', {})
    expect(read(root, 'chapters').epics).toEqual({ other: { intro: { documents: ['i.tex'], refs: [] } } })
  })

  test('saying the same thing again writes nothing', () => {
    const root = project()
    const holdings = { methods: { documents: ['m.tex'], refs: ['gh#1'] } }
    expect(writeHoldings(root, 'kehikot.chapters', 'thesis', holdings)?.changed).toBe(true)
    expect(writeHoldings(root, 'kehikot.chapters', 'thesis', holdings)?.changed).toBe(false)
  })

  test('a later version’s number is kept, not written back down', () => {
    const root = project()
    put(root, 'chapters', { version: 3, epics: {} })
    writeHoldings(root, 'kehikot.chapters', 'thesis', { methods: { documents: ['m.tex'] } })
    expect(read(root, 'chapters').version).toBe(3)
  })

  test('a file that cannot be read is kept beside the new one, not written over', () => {
    const root = project()
    put(root, 'chapters', '{ not json')
    writeHoldings(root, 'kehikot.chapters', 'thesis', { methods: { documents: ['m.tex'] } })
    expect(read(root, 'chapters').epics.thesis.methods.documents).toEqual(['m.tex'])
    expect(readFileSync(`${fileOf(root, 'chapters')}.unreadable`, 'utf8')).toBe('{ not json')
  })

  test('no project is no write; an id that is not one is refused loudly', () => {
    expect(writeHoldings(null, 'kehikot.chapters', 'thesis', {})).toBeNull()
    expect(writeHoldings('relative/path', 'kehikot.chapters', 'thesis', {})).toBeNull()
    const root = project()
    expect(() => writeHoldings(root, 'Not An Id', 'thesis', {})).toThrow('is not a module id')
    expect(() => writeHoldings(root, 'kehikot.chapters', '../up', {})).toThrow("is not an epic's slug")
    expect(() => writeHoldings(root, 'kehikot.chapters', 'thesis', { 'Not A Part': {} })).toThrow("is not a part's id")
    expect(existsSync(join(root, '.kehikot'))).toBe(false)
  })

  test('a module folder that is a link out of the project is not written through', () => {
    const root = project()
    const elsewhere = project()
    mkdirSync(join(root, '.kehikot'))
    symlinkSync(elsewhere, join(root, '.kehikot', 'chapters'))
    expect(() => writeHoldings(root, 'kehikot.chapters', 'thesis', { methods: { documents: ['m.tex'] } })).toThrow('resolves outside')
    expect(readdirSync(elsewhere)).toEqual([])
  })

  test('bounded: the first documents and refs of a part are the ones kept', () => {
    const root = project()
    writeHoldings(root, 'kehikot.chapters', 'thesis', {
      methods: {
        documents: Array.from({ length: LIMITS.PART_DOCUMENTS + 9 }, (_, i) => `d/${i}.tex`),
        refs: Array.from({ length: LIMITS.PART_REFS + 9 }, (_, i) => `gh#${i}`),
      },
    })
    const held = read(root, 'chapters').epics.thesis.methods
    expect(held.documents).toHaveLength(LIMITS.PART_DOCUMENTS)
    expect(held.refs).toHaveLength(LIMITS.PART_REFS)
    expect(held.documents[0]).toBe('d/0.tex')
  })
})

describe('readHoldings: every module folder, and no module by name', () => {
  test('unions what several modules hold for one part, once each, by folder order', () => {
    const root = project()
    writeHoldings(root, 'kehikot.steps', 'thesis', { methods: { refs: ['gh#1', 'gh#2'] } })
    writeHoldings(root, 'kehikot.chapters', 'thesis', { methods: { documents: ['.kehikot/chapters/thesis/3.tex'], refs: ['gh#2'] }, results: { documents: ['r.tex'] } })
    writeHoldings(root, 'com.example.figures', 'thesis', { methods: { documents: ['figures/setup.svg'] } })
    expect(readHoldings(root)).toEqual({
      thesis: {
        methods: { documents: ['.kehikot/chapters/thesis/3.tex', 'figures/setup.svg'], refs: ['gh#2', 'gh#1'] },
        results: { documents: ['r.tex'], refs: [] },
      },
    })
  })

  test('epics are kept apart, and read with own()', () => {
    const root = project()
    writeHoldings(root, 'kehikot.steps', 'thesis', { methods: { refs: ['gh#1'] } })
    writeHoldings(root, 'kehikot.steps', 'constructor', { constructor: { refs: ['gh#9'] } })
    const holdings = readHoldings(root)
    expect(own(own(holdings, 'thesis') ?? {}, 'methods')?.refs).toEqual(['gh#1'])
    expect(own(own(holdings, 'constructor') ?? {}, 'constructor')?.refs).toEqual(['gh#9'])
    expect(own(holdings, 'toString')).toBeUndefined()
    expect(own(own(holdings, 'thesis') ?? {}, 'toString')).toBeUndefined()
  })

  test('nothing to read is `{}`: no project, a relative path, no folder, no file', () => {
    expect(readHoldings(null)).toEqual({})
    expect(readHoldings('')).toEqual({})
    expect(readHoldings('relative/path')).toEqual({})
    const root = project()
    expect(readHoldings(root)).toEqual({})
    mkdirSync(join(root, '.kehikot', 'chapters'), { recursive: true })
    expect(readHoldings(root)).toEqual({})
    expect(readHoldings(join(root, 'no-such-folder'))).toEqual({})
  })

  test('junk costs the entry it is in, never the reading', () => {
    const root = project()
    put(root, 'broken', '{ not json')
    put(root, 'array', [1, 2])
    put(root, 'odd', {
      version: 9,
      epics: {
        'Not A Slug': { methods: { documents: ['a.tex'] } },
        thesis: {
          'Not A Part': { documents: ['a.tex'] },
          methods: { documents: ['ok.tex', '/abs.tex', '../up.tex', 7, 'ok.tex'], refs: ['gh#1', '', 5, 'x'.repeat(LIMITS.REF + 1)] },
          results: 'nothing',
          empty: { documents: [], refs: [] },
        },
        other: 'nothing',
      },
    })
    writeFileSync(join(root, '.kehikot', 'a-file-not-a-folder'), 'x')
    put(root, 'good', { version: 1, epics: { thesis: { methods: { documents: ['good.tex'] } } } })
    expect(readHoldings(root)).toEqual({ thesis: { methods: { documents: ['good.tex', 'ok.tex'], refs: ['gh#1'] } } })
  })

  test('a folder that links out of the project is not followed', () => {
    const root = project()
    const elsewhere = project()
    writeHoldings(elsewhere, 'kehikot.chapters', 'thesis', { methods: { documents: ['theirs.tex'] } })
    mkdirSync(join(root, '.kehikot'))
    symlinkSync(join(elsewhere, '.kehikot', 'chapters'), join(root, '.kehikot', 'chapters'))
    expect(readHoldings(root)).toEqual({})
  })

  test('bounded: a part’s union stops at the limits, and a file too large is skipped whole', () => {
    const root = project()
    for (const folder of ['a-one', 'b-two']) {
      put(root, folder, {
        epics: { thesis: { methods: { documents: Array.from({ length: LIMITS.PART_DOCUMENTS }, (_, i) => `${folder}/${i}.tex`) } } },
      })
    }
    const methods = readHoldings(root).thesis!.methods!
    expect(methods.documents).toHaveLength(LIMITS.PART_DOCUMENTS)
    expect(methods.documents.every((document) => document.startsWith('a-one/'))).toBe(true)

    put(root, 'huge', `{"epics":{"thesis":{"results":{"documents":["huge.tex"]}}},"pad":"${'x'.repeat(LIMITS.HOLDINGS_BYTES)}"}`)
    expect(own(readHoldings(root).thesis!, 'results')).toBeUndefined()
  })

  test('at most LIMITS.PARTS parts an epic, across every module', () => {
    const many = (prefix: string) => ({ epics: { thesis: Object.fromEntries(Array.from({ length: LIMITS.PARTS }, (_, i) => [`${prefix}-${i}`, { refs: ['gh#1'] }])) } })
    const joined = joinHoldings(holdingsIn(many('a')), holdingsIn(many('b')))
    expect(Object.keys(joined.thesis!)).toHaveLength(LIMITS.PARTS)
  })

  test('what it answers goes straight into a context', () => {
    const root = project()
    writeHoldings(root, 'kehikot.chapters', 'thesis', { methods: { documents: [`${root}/.kehikot/chapters/thesis/3.tex`], refs: ['gh#1'] } })
    const held = own(own(readHoldings(root), 'thesis') ?? {}, 'methods')!
    const parts = partsSchema.parse([{ id: 'methods', heading: 'Methods', refs: held.refs, documents: held.documents }])
    expect(parts[0]).toEqual({ id: 'methods', heading: 'Methods', picked: false, refs: ['gh#1'], documents: ['.kehikot/chapters/thesis/3.tex'] })
  })
})
