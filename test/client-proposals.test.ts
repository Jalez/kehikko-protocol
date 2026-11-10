import { afterEach, describe, expect, test } from 'bun:test'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { file, type ShownProposal } from '../src/proposals/index.js'
import { PROPOSAL_FOOT, PROPOSAL_WORDS, ProposalList, ProposalView, proposalsFooter, proposalsFooterPress, stepWalk, useProposalWalk } from '../src/client/proposals.js'
import { footerItemsSchema } from '../src/index.js'

/**
 * The React half of proposals (2.71.0): the inline view draws the diff and the
 * answers, the reason typed on Decline reaches the module, a partial accept
 * names its hunks, an edit is what is written; the footer says the count with
 * Previous and Next beside it; the walk steps through what is open.
 */

let root: Root | null = null
let host: HTMLElement | null = null
afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
})

function mount(element: ReturnType<typeof createElement>): HTMLElement {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root!.render(element))
  return host
}

const BASE = 'a\nb\nc\nd\n'
function proposal(find = 'b\nc\nd', replace = 'B\nc\nD', extra: Partial<ShownProposal> = {}): ShownProposal {
  const made = file(BASE, { file: 'notes.md', scope: 'range', find, replace, why: 'Capitals.', by: { kind: 'agent', name: 'claude' } })
  if (!made.ok) throw new Error(made.why)
  return { ...made.proposal, ...extra }
}

const click = (button: Element | null | undefined) => act(() => (button as HTMLButtonElement).click())
const buttons = (node: HTMLElement) => [...node.querySelectorAll('button')]
const byText = (node: HTMLElement, text: string) => buttons(node).find((b) => b.textContent === text)

describe('ProposalView', () => {
  test('draws who, why, and the change as red and green hunks, as text', () => {
    const p = proposal('b\nc\nd', '<b>B</b>\nc\nD')
    const node = mount(createElement(ProposalView, { proposal: p }))
    expect(node.querySelector('header b')?.textContent).toBe('notes.md')
    expect(node.querySelector('header span')?.textContent).toBe('proposed by claude')
    expect(node.querySelector('p')?.textContent).toBe('Capitals.')
    const dels = [...node.querySelectorAll('del')].map((d) => d.textContent)
    const inss = [...node.querySelectorAll('ins')].map((d) => d.textContent)
    expect(dels).toEqual(['b', 'd'])
    expect(inss).toEqual(['<b>B</b>', 'D'])
    expect(node.querySelector('ins b')).toBeNull()
    expect(node.querySelector('button')).toBeNull()
  })

  test('Accept as proposed, and Accept chosen after a hunk is unticked', () => {
    const taken: unknown[] = []
    const node = mount(createElement(ProposalView, { proposal: proposal(), onAccept: (take) => void taken.push(take) }))
    expect(byText(node, PROPOSAL_WORDS.accept)).toBeDefined()
    click(byText(node, PROPOSAL_WORDS.accept))
    expect(taken).toEqual([{}])
    const boxes = [...node.querySelectorAll<HTMLInputElement>('input[type=checkbox]')]
    expect(boxes).toHaveLength(2)
    expect(boxes[1]?.getAttribute('aria-label')).toBe('Take change 2')
    act(() => boxes[1]!.click())
    expect(byText(node, PROPOSAL_WORDS.acceptChosen)).toBeDefined()
    click(byText(node, PROPOSAL_WORDS.acceptChosen))
    expect(taken[1]).toEqual({ hunks: [0] })
    act(() => boxes[0]!.click())
    expect((byText(node, PROPOSAL_WORDS.acceptChosen) as HTMLButtonElement).disabled).toBe(true)
  })

  test('Decline, and Decline with reason sends what was typed (Enter too)', () => {
    const reasons: string[] = []
    const node = mount(createElement(ProposalView, { proposal: proposal(), onDecline: (why) => void reasons.push(why) }))
    click(byText(node, PROPOSAL_WORDS.decline))
    expect(reasons).toEqual([''])
    click(byText(node, PROPOSAL_WORDS.declineWithReason))
    const input = node.querySelector<HTMLInputElement>('input[type=text]')!
    expect(input.getAttribute('aria-label')).toBe(PROPOSAL_WORDS.reasonLabel)
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, '  Too loud. ')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    click(byText(node, PROPOSAL_WORDS.decline))
    expect(reasons[1]).toBe('Too loud.')
  })

  test('Edit, then accept hands over the edited text; unchanged is as proposed', () => {
    const taken: unknown[] = []
    const node = mount(createElement(ProposalView, { proposal: proposal(), onAccept: (take) => void taken.push(take) }))
    click(byText(node, PROPOSAL_WORDS.edit))
    const area = node.querySelector<HTMLTextAreaElement>('textarea')!
    expect(area.value).toBe('B\nc\nD')
    click(byText(node, PROPOSAL_WORDS.acceptEdited))
    expect(taken[0]).toEqual({})
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
      setter.call(node.querySelector('textarea')!, 'B\nC\nD')
      node.querySelector('textarea')!.dispatchEvent(new Event('input', { bubbles: true }))
    })
    click(byText(node, PROPOSAL_WORDS.acceptEdited))
    expect(taken[1]).toEqual({ final: 'B\nC\nD' })
    click(byText(node, PROPOSAL_WORDS.cancel))
    expect(byText(node, PROPOSAL_WORDS.accept)).toBeDefined()
  })

  test('a stale proposal says why and offers Decline only; a settled one its outcome and no buttons', () => {
    const held = proposal('b\nc\nd', 'x', { status: 'stale', stale: { reason: 'gone', said: 'notes.md changed and the text this was about is no longer there.' } })
    const node = mount(createElement(ProposalView, { proposal: held, onAccept: () => {}, onDecline: () => {} }))
    expect(node.querySelector('p[data-stale]')?.textContent).toContain('no longer there')
    expect(byText(node, PROPOSAL_WORDS.accept)).toBeUndefined()
    expect(byText(node, PROPOSAL_WORDS.decline)).toBeDefined()
    act(() => root!.unmount())
    const done = proposal('b\nc\nd', 'x', { status: 'declined', declinedReason: 'No.', decidedBy: 'J', decidedAt: 1 })
    const settled = mount(createElement(ProposalView, { proposal: done, onAccept: () => {}, onDecline: () => {} }))
    expect(settled.querySelector('[data-outcome]')?.textContent).toBe('declined: No.')
    expect(settled.querySelector('button')).toBeNull()
    expect(settled.querySelector('section')?.getAttribute('data-status')).toBe('declined')
  })

  test('a whole-text proposal is one block, no checkboxes', () => {
    const made = file(BASE, { file: 'notes.md', scope: 'file', find: BASE, replace: 'new\n', why: 'w', by: { kind: 'agent', name: 'c' } })
    if (!made.ok) throw new Error(made.why)
    const node = mount(createElement(ProposalView, { proposal: made.proposal, onAccept: () => {} }))
    expect(node.querySelectorAll('input[type=checkbox]')).toHaveLength(0)
    expect(node.querySelector('del')?.textContent).toBe(BASE)
    expect(node.querySelector('ins')?.textContent).toBe('new\n')
  })
})

describe('ProposalList', () => {
  test('one line each, the current marked, a pick reported; empty is a sentence', () => {
    const picked: string[] = []
    const a = proposal()
    const b = proposal('a', 'A', { id: 'p-b' })
    const node = mount(createElement(ProposalList, { proposals: [a, b], current: b.id, onPick: (id) => void picked.push(id) }))
    const items = buttons(node)
    expect(items).toHaveLength(2)
    expect(items[1]?.getAttribute('aria-current')).toBe('true')
    expect(items[0]?.textContent).toBe('notes.mdCapitals.claude')
    click(items[0])
    expect(picked).toEqual([a.id])
    act(() => root!.unmount())
    expect(mount(createElement(ProposalList, { proposals: [] })).textContent).toBe('No proposed changes')
  })
})

describe('the footer', () => {
  test('nothing when nothing is open; the count with Previous and Next beside it; the position while one is current', () => {
    expect(proposalsFooter({ open: 0 })).toEqual([])
    const items = proposalsFooter({ open: 3 })
    expect(items.map((one) => one.id)).toEqual([PROPOSAL_FOOT.PREV, PROPOSAL_FOOT.COUNT, PROPOSAL_FOOT.NEXT])
    expect(items[1]).toMatchObject({ kind: 'text', text: '3 proposed changes' })
    expect(items[0]).toMatchObject({ kind: 'run', actsOn: PROPOSAL_FOOT.COUNT, icon: 'chevron-left' })
    expect(footerItemsSchema.safeParse(items).success).toBe(true)
    expect(proposalsFooter({ open: 3, at: 2 })[1]).toMatchObject({ text: 'Proposal 2 of 3' })
    expect(proposalsFooter({ open: 1, at: 1, noMore: true })[2]).toMatchObject({ result: 'No more' })
    expect(proposalsFooterPress(PROPOSAL_FOOT.NEXT)).toBe('next')
    expect(proposalsFooterPress('other')).toBeNull()
  })
  test('the walk steps and stops at the ends', () => {
    expect(stepWalk(null, 3, 'next')).toBe(1)
    expect(stepWalk(null, 3, 'prev')).toBe(3)
    expect(stepWalk(3, 3, 'next')).toBeNull()
    expect(stepWalk(1, 3, 'prev')).toBeNull()
    expect(stepWalk(1, 0, 'next')).toBeNull()
  })
  test('useProposalWalk: Next picks the first, the current clears when answered, the footer follows', () => {
    const seen: ReturnType<typeof useProposalWalk>[] = []
    const scrolled: string[] = []
    function Probe({ list }: { list: ShownProposal[] }) {
      seen.push(useProposalWalk(list, { scrollTo: (id) => void scrolled.push(id) }))
      return null
    }
    const a = proposal('a', 'A', { id: 'p-a' })
    const b = proposal('b', 'B', { id: 'p-b' })
    const c = proposal('c', 'C', { id: 'p-c', status: 'accepted' })
    mount(createElement(Probe, { list: [a, b, c] }))
    expect(seen.at(-1)?.open.map((o) => o.id)).toEqual(['p-a', 'p-b'])
    expect(seen.at(-1)?.footer[1]).toMatchObject({ text: '2 proposed changes' })
    let said = ''
    act(() => void (said = seen.at(-1)!.press(PROPOSAL_FOOT.NEXT) ?? ''))
    expect(said).toBe('Proposal 1 of 2.')
    expect(seen.at(-1)?.current).toBe('p-a')
    expect(scrolled).toEqual(['p-a'])
    act(() => void seen.at(-1)!.press(PROPOSAL_FOOT.NEXT))
    expect(seen.at(-1)?.at).toBe(2)
    act(() => void (said = seen.at(-1)!.press(PROPOSAL_FOOT.NEXT) ?? ''))
    expect(said).toBe('No more proposals.')
    expect(seen.at(-1)?.footer[2]).toMatchObject({ result: 'No more' })
    expect(seen.at(-1)?.press('unrelated')).toBeNull()
    act(() => root!.render(createElement(Probe, { list: [a, { ...b, status: 'declined' }, c] })))
    expect(seen.at(-1)?.current).toBeNull()
    expect(seen.at(-1)?.footer[1]).toMatchObject({ text: '1 proposed change' })
  })
})
