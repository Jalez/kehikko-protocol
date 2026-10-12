import { afterEach, expect, test } from 'bun:test'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { EpicPart } from '../src/index.js'
import { useFocus, type Focus } from '../src/client/react.js'

/**
 * The hook is the pure functions and one promise of its own: a context that
 * is re-sent with the same parts hands back the SAME value, so nothing that
 * depends on it is redrawn.
 */

const PAPER = '/home/a/proj/.kehikot/paper/thesis'
const parts = (picked: boolean): EpicPart[] => [
  { id: 'seam', heading: 'The posting seam', refs: ['gh#12'], picked, files: ['chapters/seam.tex'] },
  { id: 'tests', heading: '', refs: [], picked: false },
]
const NOTES = [
  { id: 'a', file: `${PAPER}/chapters/seam.tex` },
  { id: 'b', file: `${PAPER}/main.tex` },
  { id: 'c', file: `${PAPER}/chapters/tests.tex` },
]

let root: Root | null = null
let host: HTMLElement | null = null
afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
})

function mount(first: Parameters<typeof useFocus>[0]) {
  const seen: Focus[] = []
  function Probe({ context }: { context: Parameters<typeof useFocus>[0] }) {
    seen.push(useFocus(context))
    return null
  }
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const render = (context: Parameters<typeof useFocus>[0]) => act(() => root!.render(createElement(Probe, { context })))
  render(first)
  return { seen, render, last: () => seen.at(-1)! }
}

test('before the greeting, and from a host that sends no parts: the whole epic', () => {
  const { last, render } = mount(null)
  expect(last().focused).toBe(false)
  expect(last().inFocus(null)).toBe(true)
  const all = last().narrow(NOTES, (note) => ({ file: note.file }), { noun: 'note' })
  expect(all).toMatchObject({ shown: NOTES, outside: 0, sentence: '' })
  render({ epic: 'thesis' })
  expect(last().focused).toBe(false)
})

test('picked parts narrow, count and say', () => {
  const { last } = mount({ epic: 'thesis', parts: parts(true) })
  expect(last().focused).toBe(true)
  expect(last().inFocus({ ref: 'gh#12' })).toBe(true)
  expect(last().inFocus({ file: `${PAPER}/main.tex` })).toBe(false)
  const out = last().narrow(NOTES, (note) => ({ file: note.file }), { noun: 'note', keep: (note) => note.id === 'c' })
  expect(out.shown.map((note) => note.id)).toEqual(['a', 'c'])
  expect(out).toMatchObject({ outside: 2, kept: 1, sentence: '2 notes outside the picked part (The posting seam).' })
  const counted = last().narrow(NOTES, (note) => ({ file: note.file }), { noun: 'note', total: true })
  expect(counted.sentence).toBe(`2 of ${NOTES.length} notes are outside the picked part (The posting seam).`)
})

test('the epic is what a file is compared under', () => {
  const { last } = mount({ epic: 'another', parts: parts(true) })
  expect(last().inFocus({ file: `${PAPER}/chapters/seam.tex` })).toBe(false)
})

test('a re-sent context with the same parts is the same value; a tick is a new one', () => {
  const { seen, render, last } = mount({ epic: 'thesis', parts: parts(true) })
  const first = last()
  render({ epic: 'thesis', parts: parts(true) })
  expect(last()).toBe(first)
  expect(last().parts).toBe(first.parts)
  render({ epic: 'thesis', parts: parts(false) })
  expect(last()).not.toBe(first)
  expect(last().focused).toBe(false)
  expect(seen.length).toBe(3)
})

test('empty (1.2.0): the one sentence, only when the pick left nothing of a list that had something', () => {
  const { last, render } = mount({ epic: 'thesis', parts: parts(true) })
  const anchorOf = (note: (typeof NOTES)[number]) => ({ file: note.file })
  /* Something is shown: nothing is said about the pick. */
  expect(last().narrow(NOTES, anchorOf, { noun: 'note' }).empty).toBe('')
  /* The pick left nothing. */
  const none = last().narrow(NOTES.slice(1), anchorOf, { noun: 'note' })
  expect(none.shown).toEqual([])
  expect(none.empty).toBe('No note is in the picked part.')
  /* What is in hand is drawn, so the view is not empty. */
  expect(last().narrow(NOTES.slice(1), anchorOf, { noun: 'note', keep: (note) => note.id === 'b' }).empty).toBe('')
  /* A list with nothing in it is the module's own empty state, not the pick's. */
  expect(last().narrow([], anchorOf, { noun: 'note' }).empty).toBe('')
  /* The older [one, many] noun gives its singular. */
  expect(last().narrow(NOTES.slice(1), anchorOf, { noun: ['entry', 'entries'] }).empty).toBe('No entry is in the picked part.')
  render({ epic: 'thesis', parts: parts(false) })
  expect(last().narrow(NOTES.slice(1), anchorOf, { noun: 'note' }).empty).toBe('')
})

test('documents and the whole-epic anchor through the hook: the project is the context’s', () => {
  const project = '/home/a/proj'
  const listed: EpicPart[] = [
    { id: 'seam', heading: 'Seam', refs: [], picked: true, documents: ['src/seam.ts'] },
    { id: 'rest', heading: 'Rest', refs: [], picked: false, documents: ['src/rest.ts'] },
  ]
  const { last, render, seen } = mount({ epic: 'thesis', projectPath: project, parts: listed })
  expect(last().inFocus({ file: `${project}/src/seam.ts` })).toBe(true)
  expect(last().inFocus({ file: `${project}/src/rest.ts` })).toBe(false)
  expect(last().inFocus({ whole: true })).toBe(true)
  const rows = [{ file: `${project}/src/rest.ts`, whole: false }, { file: '', whole: true }]
  const narrowed = last().narrow(rows, (row) => (row.whole ? { whole: true } : { file: row.file }), { noun: 'file' })
  expect(narrowed.shown).toEqual([rows[1]!])
  /* The same context again is the same value; another project is not. */
  const held = last()
  render({ epic: 'thesis', projectPath: project, parts: listed.map((part) => ({ ...part })) })
  expect(seen.at(-1)).toBe(held)
  render({ epic: 'thesis', projectPath: '/home/a/other', parts: listed })
  expect(seen.at(-1)).not.toBe(held)
  expect(last().inFocus({ file: `${project}/src/seam.ts` })).toBe(false)
})
