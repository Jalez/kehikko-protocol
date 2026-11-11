import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'

import {
  CAPABILITIES,
  CAPABILITY_SINCE,
  METHODS,
  METHOD_SINCE,
  PACKAGE_VERSION,
  PROTOCOL,
  STALLED_EVENT,
  TILE_BADGES,
  TILE_BELOW,
  TILE_LEAVE_PX,
  TILE_LOOKS,
  expandResult,
  isTile,
  methodParams,
  resultSchemaFor,
  tileItemOf,
  tileRoom,
  tileStateOf,
  unreadWords,
  type TileItem,
} from '../src/index.js'
import { AgentTile, TILE_MARKS, useTileSize } from '../src/client/react.js'

/**
 * 2.58.0: an agent module drawn as a tile when its box is small, and `view.expand`, a container shown
 * large over the canvas for a while.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')
const to = { module: 'kehikot.claude', session: 'abc' }

describe('the version', () => {
  test('is 2.58.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.80.0')
    expect(PROTOCOL).toBe(2)
    const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')) as { version: string }
    expect(pkg.version).toBe('2.80.0')
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.58.0')
    expect(readFileSync(join(REPO, 'docs/client.md'), 'utf8')).toContain('## An agent module as a tile (2.58.0)')
    expect(readFileSync(join(REPO, 'docs/asking.md'), 'utf8')).toContain('## Showing the container large: `view.expand`')
  })
})

describe('view.expand', () => {
  test('is a method under view:expand, since 2.58.0', () => {
    expect(METHODS['view.expand']).toBe('view:expand')
    expect(CAPABILITIES['view:expand']).toContain('Nothing in your arrangement changes')
    expect(METHOD_SINCE['view.expand']).toBe('2.58.0')
    expect(CAPABILITY_SINCE['view:expand']).toBe('2.58.0')
  })

  test('expands by default, and takes false to put back', () => {
    const params = methodParams['view.expand']
    expect(params.parse({})).toEqual({ expand: true })
    expect(params.parse({ expand: false })).toEqual({ expand: false })
    expect(params.safeParse({ expand: 'yes' }).success).toBe(false)
  })

  test('is answered with an outcome', () => {
    expect(resultSchemaFor('view.expand')).toBe(expandResult)
    expect(expandResult.parse({ outcome: 'expanded' })).toEqual({ outcome: 'expanded', why: '' })
    expect(expandResult.safeParse({ outcome: 'moved' }).success).toBe(false)
  })
})

describe('isTile', () => {
  test('under either side of TILE_BELOW', () => {
    expect(TILE_BELOW).toEqual({ width: 220, height: 160 })
    expect(isTile({ width: 200, height: 600 })).toBe(true)
    expect(isTile({ width: 800, height: 150 })).toBe(true)
    expect(isTile({ width: 120, height: 120 })).toBe(true)
    expect(isTile({ width: 220, height: 160 })).toBe(false)
    expect(isTile({ width: 800, height: 600 })).toBe(false)
  })

  test('leaves the tile only TILE_LEAVE_PX past the line', () => {
    expect(isTile({ width: 225, height: 400 }, true)).toBe(true)
    expect(isTile({ width: 220 + TILE_LEAVE_PX, height: 160 + TILE_LEAVE_PX }, true)).toBe(false)
    expect(isTile({ width: 225, height: 400 }, false)).toBe(false)
  })

  test('a size of nothing keeps what was', () => {
    expect(isTile({ width: 0, height: 0 }, true)).toBe(true)
    expect(isTile({ width: 0, height: 300 }, false)).toBe(false)
    expect(isTile({ width: Number.NaN, height: 300 }, true)).toBe(true)
  })
})

describe('tileStateOf', () => {
  test('nothing reported is idle', () => {
    const state = tileStateOf(null, { name: 'Claude', title: 'Fix the login' })
    expect(state.look).toBe('idle')
    expect(state.badge).toBe('')
    expect(state.sentence).toBe('Claude — Fix the login. Idle.')
  })

  test('each state, and each kind of needing the person', () => {
    const look = (item: TileItem) => tileStateOf(item).look
    expect(look({ state: 'working' })).toBe('working')
    expect(look({ state: 'done' })).toBe('done')
    expect(look({ state: 'attention', question: { text: 'Which one?', to } })).toBe('question')
    expect(look({ state: 'attention', event: STALLED_EVENT })).toBe('stalled')
    expect(look({ state: 'attention', detail: 'waiting for a permission' })).toBe('attention')
  })

  test('a question is asked in the sentence, and carried for Answer', () => {
    const question = { text: 'Merge it now?', choices: ['Yes', 'No'], to }
    const state = tileStateOf({ state: 'attention', question, label: 'x' }, { name: 'Codex' })
    expect(state.question).toEqual(question)
    expect(state.badge).toBe('?')
    expect(state.sentence).toBe('Codex. Asks you: “Merge it now?”')
  })

  test('needing the person says why; never by colour alone', () => {
    expect(tileStateOf({ state: 'attention', detail: 'waiting for a permission' }).sentence).toBe('Needs you: waiting for a permission.')
    expect(tileStateOf({ state: 'attention', event: STALLED_EVENT, detail: 'stopped' }).sentence).toBe('Stopped without finishing.')
    for (const look of ['question', 'attention', 'stalled', 'done'] as const) expect(TILE_BADGES[look]).not.toBe('')
    expect(Object.keys(TILE_LOOKS).sort()).toEqual(Object.keys(TILE_BADGES).sort())
  })

  test('unread messages are said', () => {
    expect(unreadWords(0)).toBe('')
    expect(unreadWords(1)).toBe('1 unread message')
    expect(tileStateOf({ state: 'done' }, { unread: 3 }).sentence).toBe('Finished. 3 unread messages.')
  })
})

describe('tileItemOf', () => {
  test('the one that needs the person most, a question first', () => {
    const done: TileItem = { state: 'done' }
    const working: TileItem = { state: 'working' }
    const asks: TileItem = { state: 'attention', question: { text: 'Which?', to } }
    const needs: TileItem = { state: 'attention' }
    expect(tileItemOf([])).toBeNull()
    expect(tileItemOf([done, working])).toBe(working)
    expect(tileItemOf([done, needs, working, asks])).toBe(asks)
    expect(tileItemOf([needs, done])).toBe(needs)
  })
})

describe('tileRoom', () => {
  test('a small square has only the icon; a larger one the title, the actions, then Compact and Clear', () => {
    expect(tileRoom({ width: 60, height: 60 })).toEqual({ title: false, actions: false, commands: false, icon: 28 })
    expect(tileRoom({ width: 100, height: 100 })).toMatchObject({ title: true, actions: false, commands: false })
    expect(tileRoom({ width: 140, height: 140 })).toMatchObject({ title: true, actions: true, commands: false })
    expect(tileRoom({ width: 210, height: 200 })).toMatchObject({ title: true, actions: true, commands: true })
    expect(tileRoom({ width: 2000, height: 2000 }).icon).toBe(72)
  })
})

describe('AgentTile', () => {
  const mount = async (element: ReturnType<typeof createElement>) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    await act(async () => root.render(element))
    return {
      host,
      rerender: async (next: ReturnType<typeof createElement>) => act(async () => root.render(next)),
      unmount: () => act(() => root.unmount()),
    }
  }
  const click = async (element: Element | null) => {
    expect(element).not.toBeNull()
    await act(async () => (element as HTMLElement).click())
  }

  test('draws the mark, the look and the sentence; the whole tile expands', async () => {
    let expanded = 0
    const { host, unmount } = await mount(
      createElement(AgentTile, { name: 'Claude', icon: 'brand:claude', title: 'Fix the login', item: { state: 'working' }, size: { width: 200, height: 200 }, onExpand: () => expanded++ }),
    )
    const tile = host.querySelector('.kehikot-tile')!
    expect(tile.getAttribute('data-look')).toBe('working')
    expect(host.querySelector('svg.kt-mark path')?.getAttribute('d')).toBe(TILE_MARKS.claude!.path)
    const face = host.querySelector('button.kehikot-tile-face')!
    expect(face.getAttribute('title')).toBe('Claude — Fix the login. Working.')
    expect(face.getAttribute('aria-label')).toBe('Claude — Fix the login. Working. Expand.')
    expect(host.querySelector('.kehikot-tile-title')?.textContent).toBe('Fix the login')
    expect(document.getElementById('kehikot-tile-style')).not.toBeNull()
    await click(face)
    await click(host.querySelector('button[data-action=expand]'))
    expect(expanded).toBe(2)
    await unmount()
  })

  test('an icon it does not know is a terminal', async () => {
    const { host, unmount } = await mount(createElement(AgentTile, { name: 'X', icon: 'lucide:bot', size: { width: 200, height: 200 } }))
    expect(host.querySelector('svg.kt-mark')?.getAttribute('data-generic')).toBe('true')
    /* No onExpand: no button to press, nothing that says it expands. */
    expect(host.querySelector('button.kehikot-tile-face')).toBeNull()
    expect(host.querySelector('[data-action=expand]')).toBeNull()
    await unmount()
  })

  test('Answer opens the question in place: a choice is sent, Escape closes and gives the keyboard back', async () => {
    const sent: string[] = []
    const item: TileItem = { state: 'attention', question: { text: 'Merge it?', choices: ['Yes', 'No'], to } }
    const { host, unmount } = await mount(
      createElement(AgentTile, { name: 'Codex', icon: 'brand:openai', item, size: { width: 200, height: 200 }, onExpand: () => {}, onAnswer: (text: string) => void sent.push(text) }),
    )
    expect(host.querySelector('.kehikot-tile')?.getAttribute('data-needs')).toBe('true')
    expect(host.querySelector('.kehikot-tile-badge')?.textContent).toBe('?')
    const answer = host.querySelector<HTMLButtonElement>('button[data-action=answer]')!
    await click(answer)
    const panel = host.querySelector('[role=dialog]')!
    expect(panel.querySelector('p')?.textContent).toBe('Merge it?')
    expect(document.activeElement?.getAttribute('data-choice')).toBe('Yes')
    await click(panel.querySelector('button[data-choice=No]'))
    expect(sent).toEqual(['No'])
    expect(host.querySelector('[role=dialog]')).toBeNull()

    await click(host.querySelector('button[data-action=answer]'))
    const again = host.querySelector('[role=dialog]')!
    await act(async () => {
      again.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(host.querySelector('[role=dialog]')).toBeNull()
    await act(async () => new Promise((done) => setTimeout(done, 5)))
    expect(document.activeElement).toBe(host.querySelector('button[data-action=answer]'))
    await unmount()
  })

  test('a reply in words is sent; an answer that returns false keeps the panel', async () => {
    const sent: string[] = []
    let keep = true
    const item: TileItem = { state: 'attention', question: { text: 'Why?', to } }
    const { host, unmount } = await mount(
      createElement(AgentTile, { name: 'Vibe', item, size: { width: 200, height: 200 }, onAnswer: (text: string) => (sent.push(text), !keep) }),
    )
    await click(host.querySelector('button[data-action=answer]'))
    const input = host.querySelector('input')!
    expect(document.activeElement).toBe(input)
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, 'Because')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await click(host.querySelector('button[type=submit]'))
    expect(sent).toEqual(['Because'])
    expect(host.querySelector('[role=dialog]')).not.toBeNull()
    keep = false
    await click(host.querySelector('button[type=submit]'))
    expect(host.querySelector('[role=dialog]')).toBeNull()
    await unmount()
  })

  test('the actions come with room: none in a small square, Compact and Clear only when wide', async () => {
    const props = { name: 'Claude', item: { state: 'done' } as TileItem, onExpand: () => {}, onCompact: () => {}, onClear: () => {} }
    const { host, rerender, unmount } = await mount(createElement(AgentTile, { ...props, size: { width: 70, height: 70 } }))
    expect(host.querySelectorAll('.kehikot-tile-actions button').length).toBe(0)
    expect(host.querySelector('.kehikot-tile-title')).toBeNull()
    await rerender(createElement(AgentTile, { ...props, size: { width: 140, height: 140 } }))
    expect([...host.querySelectorAll('.kehikot-tile-actions button')].map((one) => one.getAttribute('data-action'))).toEqual(['expand'])
    await rerender(createElement(AgentTile, { ...props, size: { width: 210, height: 200 } }))
    expect([...host.querySelectorAll('.kehikot-tile-actions button')].map((one) => one.getAttribute('data-action'))).toEqual(['expand', 'compact', 'clear'])
    expect(host.querySelector('.kehikot-tile-badge')?.textContent).toBe('✓')
    await unmount()
  })

  test('an unread dot, said in the sentence', async () => {
    const { host, unmount } = await mount(createElement(AgentTile, { name: 'Claude', unread: 2, size: { width: 200, height: 200 } }))
    expect(host.querySelector('.kehikot-tile-unread')).not.toBeNull()
    expect(host.querySelector('.kehikot-tile-face')?.getAttribute('title')).toBe('Claude. Idle. 2 unread messages.')
    await unmount()
  })

  test('the working ring stands still under reduced motion', () => {
    const css = readFileSync(join(REPO, 'src/client/tile.ts'), 'utf8')
    expect(css).toContain('@media (prefers-reduced-motion:reduce){.kehikot-tile[data-look=working] svg.kt-ring circle.kt-arc{animation:none}}')
  })
})

describe('useTileSize', () => {
  test('a given size, with the margin to leave', async () => {
    const seen: boolean[] = []
    function Probe({ width, height }: { width: number; height: number }) {
      seen.push(useTileSize({ width, height }).tile)
      return null
    }
    const host = document.createElement('div')
    const root = createRoot(host)
    await act(async () => root.render(createElement(Probe, { width: 150, height: 150 })))
    await act(async () => root.render(createElement(Probe, { width: 900, height: 600 })))
    expect(seen.at(0)).toBe(true)
    expect(seen.at(-1)).toBe(false)
    await act(async () => root.unmount())
  })
})
