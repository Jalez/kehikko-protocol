import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'

import { PACKAGE_VERSION, TILE_NOTE_MS, expandDeclined } from '../src/index.js'
import { AgentTile } from '../src/client/react.js'

/**
 * 2.63.0: an agent module's tile says why its Expand was not done. A host shows a container large
 * only on the person's own press and answers `declined` with a sentence when it saw none; the tile
 * used to drop that answer, so the press did nothing, silently.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')

describe('the version', () => {
  test('is 2.63.0', () => {
    expect(PACKAGE_VERSION).toBe('2.91.0')
    const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')) as { version: string }
    expect(pkg.version).toBe('2.91.0')
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.63.0')
    expect(readFileSync(join(REPO, 'docs/client.md'), 'utf8')).toContain('When the host declines (2.63.0)')
  })
})

describe('expandDeclined', () => {
  test('the why of a declined outcome, and nothing for anything else', () => {
    expect(expandDeclined({ outcome: 'declined', why: ' Press again. ' })).toBe('Press again.')
    expect(expandDeclined({ outcome: 'declined', why: '' })).toBe('The host did not show it large.')
    expect(expandDeclined({ outcome: 'declined' })).toBe('The host did not show it large.')
    expect(expandDeclined({ outcome: 'expanded', why: '' })).toBeNull()
    expect(expandDeclined({ outcome: 'unchanged', why: 'x' })).toBeNull()
    expect(expandDeclined(undefined)).toBeNull()
    expect(expandDeclined(3)).toBeNull()
    expect(TILE_NOTE_MS).toBeGreaterThan(1000)
  })
})

describe('AgentTile, when the host declines', () => {
  const mount = async (element: ReturnType<typeof createElement>) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    await act(async () => root.render(element))
    return { host, unmount: () => act(() => root.unmount()) }
  }
  const press = async (element: Element | null) => {
    expect(element).not.toBeNull()
    await act(async () => {
      ;(element as HTMLElement).click()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  test('a declined answer is said on the tile, as status, and goes on the next press', async () => {
    const answers = [{ outcome: 'declined', why: 'Press again.' }, { outcome: 'expanded', why: '' }]
    const { host, unmount } = await mount(
      createElement(AgentTile, { name: 'Codex', size: { width: 200, height: 200 }, onExpand: () => Promise.resolve(answers.shift()) }),
    )
    expect(host.querySelector('.kehikot-tile-note')).toBeNull()
    await press(host.querySelector('button.kehikot-tile-face'))
    const note = host.querySelector('.kehikot-tile-note')
    expect(note?.textContent).toBe('Press again.')
    expect(note?.getAttribute('role')).toBe('status')
    await press(host.querySelector('button[data-action=expand]'))
    expect(host.querySelector('.kehikot-tile-note')).toBeNull()
    await unmount()
  })

  test('an onExpand that returns nothing, or rejects, says nothing', async () => {
    const { host, unmount } = await mount(
      createElement(AgentTile, { name: 'Codex', size: { width: 200, height: 200 }, onExpand: () => Promise.reject(new Error('gone')) }),
    )
    await press(host.querySelector('button.kehikot-tile-face'))
    expect(host.querySelector('.kehikot-tile-note')).toBeNull()
    await unmount()
    const quiet = await mount(createElement(AgentTile, { name: 'Codex', size: { width: 200, height: 200 }, onExpand: () => {} }))
    await press(quiet.host.querySelector('button.kehikot-tile-face'))
    expect(quiet.host.querySelector('.kehikot-tile-note')).toBeNull()
    await quiet.unmount()
  })
})
