import { describe, expect, test } from 'bun:test'
import { Terminal } from '@xterm/headless'
import { SearchAddon } from '@xterm/addon-search'
import { readFileSync } from 'node:fs'

import { findSlot, xtermFind, xtermFindColours, type XtermSearch } from '../src/client/find-adapters.js'
import type { FindCount } from '../src/find.js'

/**
 * Find in a terminal (2.74.0), with the real search addon on a headless emulator. The headless one
 * has no renderer, so its decorations and selection are stood in for here: what is marked is what the
 * addon registered, and what is current is what it selected.
 */

function emulator() {
  const terminal = new Terminal({ cols: 40, rows: 4, scrollback: 200, allowProposedApi: true })
  const marks = new Set<{ background?: string }>()
  let selected: { x: number; y: number; length: number } | null = null
  const stand = terminal as unknown as Record<string, unknown>
  stand.registerDecoration = (options: { marker: unknown; backgroundColor?: string }) => {
    const mark = { marker: options.marker, background: options.backgroundColor, dispose: () => void marks.delete(mark), onRender: () => ({ dispose() {} }), onDispose: () => ({ dispose() {} }) }
    marks.add(mark)
    return mark
  }
  stand.select = (x: number, y: number, length: number) => void (selected = { x, y, length })
  stand.getSelectionPosition = () => (selected ? { start: { x: selected.x, y: selected.y }, end: { x: selected.x + selected.length, y: selected.y } } : undefined)
  stand.clearSelection = () => void (selected = null)
  stand.hasSelection = () => selected !== null
  const search = new SearchAddon()
  terminal.loadAddon(search as never)
  const write = (text: string) => new Promise<void>((done) => terminal.write(text, done))
  return { terminal: terminal as unknown as { clearSelection(): void }, search, marks, write, selected: () => selected }
}

const ask = (direction: 'first' | 'next' | 'prev' | 'close', more = {}) => ({ caseSensitive: false, wholeWord: false, direction, ...more })

describe('xtermFind', () => {
  test('takes the real SearchAddon as it is (structural types)', () => {
    const search: XtermSearch = new SearchAddon()
    expect(typeof search.findNext).toBe('function')
  })

  test('marks every match in the screen and the scrollback, and counts them', async () => {
    const t = emulator()
    /* Twelve lines in a four-row screen: most of them are scrollback. */
    await t.write(Array.from({ length: 12 }, (_, i) => `line ${i} ${i % 3 === 0 ? 'needle' : 'hay'}`).join('\r\n'))
    const find = xtermFind(t.search, t.terminal)
    expect(find('needle', ask('first'))).toEqual({ total: 4, current: 1 })
    /* Four matches, and one more mark for the current one. */
    expect(t.marks.size).toBe(5)
    expect([...t.marks].filter((m) => m.background === xtermFindColours('light').activeMatchBackground)).toHaveLength(1)
    expect(t.selected()).toMatchObject({ y: 0, length: 6 })
  })

  test('the marks follow the theme, or the page\'s own colours', async () => {
    const t = emulator()
    await t.write('needle')
    xtermFind(t.search, t.terminal, { theme: () => 'dark' })('needle', ask('first'))
    expect([...t.marks].some((m) => m.background === xtermFindColours('dark').activeMatchBackground)).toBe(true)
    const own = emulator()
    await own.write('needle')
    const decorations = { activeMatchBackground: '#123456', matchOverviewRuler: '#000000', activeMatchColorOverviewRuler: '#000000' }
    xtermFind(own.search, own.terminal, { decorations: () => decorations })('needle', ask('first'))
    expect([...own.marks].some((m) => m.background === '#123456')).toBe(true)
  })

  test('next and previous move the current match, and wrap', async () => {
    const t = emulator()
    await t.write('a needle\r\nb needle\r\nc needle')
    const find = xtermFind(t.search, t.terminal)
    expect(find('needle', ask('first'))).toEqual({ total: 3, current: 1 })
    expect(find('needle', ask('next'))).toEqual({ total: 3, current: 2 })
    expect(t.selected()?.y).toBe(1)
    expect(find('needle', ask('next'))).toEqual({ total: 3, current: 3 })
    expect(find('needle', ask('next'))).toEqual({ total: 3, current: 1 })
    expect(find('needle', ask('prev'))).toEqual({ total: 3, current: 3 })
    expect(t.selected()?.y).toBe(2)
  })

  test('case and whole words narrow it; nothing found is none of none', async () => {
    const t = emulator()
    await t.write('Needle needles needle end')
    const find = xtermFind(t.search, t.terminal)
    expect(find('needle', ask('first'))).toEqual({ total: 3, current: 1 })
    expect(find('needle', ask('first', { caseSensitive: true }))).toEqual({ total: 2, current: 1 })
    expect(find('haystack', ask('first'))).toEqual({ total: 0, current: 0 })
    const w = emulator()
    await w.write('the needles only')
    const words = xtermFind(w.search, w.terminal)
    expect(words('needle', ask('first', { wholeWord: true }))).toEqual({ total: 0, current: 0 })
    expect(words('needles', ask('first', { wholeWord: true }))).toEqual({ total: 1, current: 1 })
  })

  test('close clears every mark and the selection, and answers nothing; an empty query clears too', async () => {
    const t = emulator()
    await t.write('needle needle')
    const find = xtermFind(t.search, t.terminal)
    find('needle', ask('first'))
    expect(t.marks.size).toBeGreaterThan(0)
    expect(find('', ask('close'))).toBeUndefined()
    expect(t.marks.size).toBe(0)
    expect(t.selected()).toBeNull()
    find('needle', ask('first'))
    expect(find('', ask('first'))).toEqual({ total: 0, current: 0 })
    expect(t.marks.size).toBe(0)
  })

  test('a count that changes by itself is said; one it asked for is returned, not said twice; dispose stops it', () => {
    const said: FindCount[] = []
    let hear: (e: { resultIndex: number; resultCount: number }) => void = () => {}
    let disposed = false
    const search: XtermSearch = {
      findNext: () => {
        hear({ resultIndex: 0, resultCount: 2 })
        return true
      },
      findPrevious: () => true,
      clearDecorations: () => {},
      onDidChangeResults: (listener) => {
        hear = listener
        return { dispose: () => void (disposed = true) }
      },
    }
    const find = xtermFind(search, { clearSelection() {} }, { onCount: (count) => said.push(count) })
    expect(find('x', ask('first'))).toEqual({ total: 2, current: 1 })
    expect(said).toEqual([])
    hear({ resultIndex: 0, resultCount: 3 })
    expect(said).toEqual([{ total: 3, current: 1 }])
    find.dispose()
    expect(disposed).toBe(true)
  })

  test('new output under an open search is counted again and said', async () => {
    const t = emulator()
    await t.write('needle\r\n')
    const said: FindCount[] = []
    const find = xtermFind(t.search, t.terminal, { onCount: (count) => said.push(count) })
    expect(find('needle', ask('first'))).toEqual({ total: 1, current: 1 })
    await t.write('more needle\r\n')
    await new Promise((settle) => setTimeout(settle, 300))
    expect(said.at(-1)).toEqual({ total: 2, current: 1 })
  })
})

describe('findSlot', () => {
  test('empty: unsupported, and a close is nothing', () => {
    const slot = findSlot()
    expect(slot.onFind('x', ask('first'))).toBe('unsupported')
    expect(slot.onFind('', ask('close'))).toBeUndefined()
  })
  test('answers through whatever is in it now, with a steady onFind', () => {
    const slot = findSlot()
    const onFind = slot.onFind
    slot.current = (query) => ({ total: query.length, current: 1 })
    expect(onFind('abc', ask('next'))).toEqual({ total: 3, current: 1 })
    slot.current = null
    expect(onFind('abc', ask('next'))).toBe('unsupported')
  })
})

describe('the subpath', () => {
  test('client/find is find-adapters', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    expect(pkg.exports['./client/find']).toEqual({ types: './dist/client/find-adapters.d.ts', default: './dist/client/find-adapters.js' })
  })
})
