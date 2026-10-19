import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

import { checkModule, checkParts, contractNotes, focusImports, said, sourcesOf } from '../src/check/parts.js'

/**
 * `bun run check:parts`, against small module directories in
 * `fixtures/parts/`: one that follows the parts, one that only says so, one
 * that says nothing, one that says why it has nothing to narrow. Only what the
 * manifest says can fail a module; the import scan is a note.
 */

const at = (name: string) => join(import.meta.dir, 'fixtures', 'parts', name)

describe('which focus helpers a file imports', () => {
  test('from the package and from its React entry, over several lines, renamed, typed', () => {
    expect(focusImports("import {\n  type EpicPart,\n  useFocus as f,\n} from 'kehikot-module-protocol/client/react'")).toEqual(['useFocus'])
    expect(focusImports('import { fileInFocus, refInFocus } from "kehikot-module-protocol"')).toEqual(['fileInFocus', 'refInFocus'])
  })

  test('not from somewhere else, and not a helper that is not the rule', () => {
    expect(focusImports("import { fileInFocus } from './mine.ts'")).toEqual([])
    expect(focusImports("import { pickedParts, isFocused } from 'kehikot-module-protocol'")).toEqual([])
    expect(focusImports("import { useKehikot } from 'kehikot-module-protocol/client'")).toEqual([])
    expect(focusImports("import { useFocus } from 'some-other-package'")).toEqual([])
  })
})

describe('one module directory', () => {
  test('says parts and uses the rule: passes, and says where', async () => {
    const check = await checkModule(at('follows'))
    expect(check).toEqual({ module: 'kehikot.follows', declares: 'follows', uses: ['src/app.tsx: useFocus'], failures: [], notes: [] })
    expect(said(check)).toBe('ok    kehikot.follows — follows the picked parts\n        src/app.tsx: useFocus')
  })

  test('says parts and shows no import of a helper: passes, with a note — tests and dependencies are not its sources', async () => {
    expect(sourcesOf(at('claims')).map((source) => source.path)).toEqual(['manifest.ts', 'src/app.ts'])
    const check = await checkModule(at('claims'))
    expect(check).toMatchObject({ declares: 'follows', failures: [], uses: [] })
    expect(check.notes).toHaveLength(1)
    expect(check.notes[0]).toContain('found no named import of a focus helper')
    expect(check.notes[0]).toContain('A hint, not a verdict')
    expect(said(check)).toStartWith('ok    kehikot.claims — follows the picked parts\n      note: ')
  })

  test('the scan is only a scan: a namespace import gets the note, and still passes', () => {
    const check = checkParts({ id: 'kehikot.x', reacts: ['parts'] }, [{ path: 'a.ts', text: "import * as protocol from 'kehikot-module-protocol'" }])
    expect(check.failures).toEqual([])
    expect(check.notes).toHaveLength(1)
  })

  test('the functions the rule delegates to still count as using it, and a narrowing built on them is hinted at (1.2.0), never failed', () => {
    const check = checkParts({ id: 'kehikot.paper', reacts: ['parts'] }, [{ path: 'src/focus.ts', text: "import { fileInFocus, focusCount } from 'kehikot-module-protocol'" }])
    expect(check).toMatchObject({ failures: [], uses: ['src/focus.ts: fileInFocus'] })
    expect(check.notes).toHaveLength(1)
    expect(check.notes[0]).toContain('found no call of useFocus().narrow or narrowToFocus')
  })

  test('says neither: fails, though it uses a helper', async () => {
    const check = await checkModule(at('undeclared'))
    expect(check.declares).toBe('undeclared')
    expect(check.failures[0]).toContain('does not say how it relates to the parts')
  })

  test('says why it has nothing to narrow: passes', async () => {
    const check = await checkModule(at('partless'))
    expect(check).toMatchObject({ declares: 'partless', failures: [] })
    expect(said(check)).toBe('ok    kehikot.partless — partless, and says why')
  })

  test('says both: fails — and a failing module gets no note on top', async () => {
    const check = await checkModule(at('both'))
    expect(check.failures[0]).toContain('one or the other')
    expect(check.notes).toEqual([])
  })

  test('no manifest: fails, and says so', async () => {
    expect((await checkModule(at('empty'))).failures[0]).toContain('no manifest.ts')
  })

  test('the check is pure over a manifest and sources', () => {
    expect(checkParts({ id: 'kehikot.x', reacts: ['parts'] }, [{ path: 'a.ts', text: "import { narrowToFocus } from 'kehikot-module-protocol'" }]).failures).toEqual([])
  })
})

describe('what of the contract can be seen in files (1.2.0): hints, never failures', () => {
  const follows = { id: 'kehikot.x', reacts: ['parts'] }
  const react = "import { useFocus } from 'kehikot-module-protocol/client/react'\n"

  test('narrowing through useFocus().narrow with keep: nothing to say', () => {
    const text = `${react}const { shown, empty } = focus.narrow(notes, anchorOf, { noun: 'note', keep: (note) => note.id === open })`
    expect(contractNotes(follows, [{ path: 'a.tsx', text }])).toEqual([])
    const pure = "import { narrowToFocus } from 'kehikot-module-protocol'\nnarrowToFocus(parts, steps, anchorOf, { epic, keep })"
    expect(contractNotes(follows, [{ path: 'a.ts', text: pure }])).toEqual([])
  })

  test('the hook imported and never narrowed with: a home-made narrowing', () => {
    const text = `${react}const shown = notes.filter((note) => focus.inFocus({ file: note.path }))`
    const notes = contractNotes(follows, [{ path: 'a.tsx', text }])
    expect(notes).toHaveLength(1)
    expect(notes[0]).toContain('by a rule of its own')
  })

  test('narrowed, and nothing kept in hand', () => {
    const notes = contractNotes(follows, [{ path: 'a.tsx', text: `${react}focus.narrow(notes, anchorOf, { noun: 'note' })` }])
    expect(notes).toHaveLength(1)
    expect(notes[0]).toContain('found no keep passed')
  })

  test('what 1.2.0 deprecated for parts is named, with the file', () => {
    const text = `import { FOCUS_WHERE, paperFileOf } from 'kehikot-module-protocol'\n${react}focus.narrow(notes, anchorOf, { keep })`
    const notes = contractNotes(follows, [{ path: 'src/app.tsx', text }])
    expect(notes).toHaveLength(1)
    expect(notes[0]).toContain('src/app.tsx: FOCUS_WHERE, paperFileOf')
  })

  test('a module with no helper at all gets the older note and not these', () => {
    expect(contractNotes(follows, [{ path: 'a.ts', text: 'export const a = 1' }])).toEqual([])
  })

  test('partless, for a reason the contract no longer accepts', () => {
    const said = (partless: string) => contractNotes({ id: 'kehikot.x', reacts: [], partless }, [])
    expect(said('Sessions carry refs; the owner chose not to narrow them.')[0]).toContain('a choice is not a reason')
    expect(said('Runs are keyed by ref; narrowing would hide their own selection.')[0]).toContain('passed as `keep`')
    expect(said('Lists the repository’s files; a part owns files of the paper, not of the repository.')[0]).toContain('project-relative')
    expect(said('A terminal: nothing in it belongs to an epic.')).toEqual([])
    expect(said('A log across projects and epics; it sits above any one epic’s parts.')).toEqual([])
    expect(said('Shows one selected change, which is always in hand.')).toEqual([])
  })

  test('they are notes on a passing check', () => {
    const check = checkParts({ id: 'kehikot.x', reacts: [], partless: 'The owner chose not to narrow them.' }, [])
    expect(check).toMatchObject({ declares: 'partless', failures: [] })
    expect(check.notes).toHaveLength(1)
  })
})

test('the command exits 1 when any module fails, and prints a line per module', () => {
  const run = (...names: string[]) =>
    spawnSync('bun', ['run', join(import.meta.dir, '..', 'bin', 'check-parts.ts'), ...names.map(at)], { encoding: 'utf8' })
  const good = run('follows', 'partless')
  expect(good.status).toBe(0)
  expect(good.stdout).toContain('ok    kehikot.follows')
  const noted = run('claims')
  expect(noted.status).toBe(0)
  expect(noted.stdout).toContain('note: ')
  const bad = run('follows', 'undeclared')
  expect(bad.status).toBe(1)
  expect(bad.stdout).toContain('FAIL  kehikot.undeclared')
})
