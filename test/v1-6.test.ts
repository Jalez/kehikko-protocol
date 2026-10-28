import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { HEADER_ICONS, LIMITS, PACKAGE_VERSION, headerItemsSchema, pinnedRuns, pressRefusal } from '../src/index.js'

/** 1.6.0: `pinned` on a run. Also parsed by the 1.5.0 build from the tag (skipped loudly if absent). */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')
let dir = ''
let old: Record<string, any> | null = null
beforeAll(async () => {
  try {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'kehikot-v16-')))
    execFileSync('sh', ['-c', `git -C "${REPO}" archive v1.5.0 | tar -x -C "${dir}"`], { stdio: 'ignore' })
    symlinkSync(join(REPO, 'node_modules'), join(dir, 'node_modules'))
    old = await import(join(dir, 'src/index.ts'))
  } catch {
    console.warn('v1.5.0 is not available here: the 1.5.0 compatibility checks are skipped')
  }
})
afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
})

const run = (id: string, more: Record<string, unknown> = {}) => ({ kind: 'run', id, label: id, ...more })

describe('pinned runs', () => {
  test('version', () => expect(PACKAGE_VERSION).toBe('2.30.0'))
  test('optional, boolean, only drawn on runs', () => {
    const parsed = headerItemsSchema.parse([run('a'), run('b', { pinned: true, icon: 'check' })]) as any[]
    expect(parsed[0].pinned).toBeUndefined()
    expect(parsed[1].pinned).toBe(true)
    expect(headerItemsSchema.safeParse([run('a', { pinned: 'yes' })]).success).toBe(false)
  })
  test('on another kind it is stripped, not refused', () => {
    const parsed = headerItemsSchema.parse([{ kind: 'toggle', id: 't', label: 'T', checked: true, pinned: true }]) as any[]
    expect(parsed[0].pinned).toBeUndefined()
  })
  test('pinnedRuns: declaration order, at most PINNED_MAX, unpinned stay out', () => {
    expect(LIMITS.PINNED_MAX).toBe(4)
    const ids = ['a', 'b', 'c', 'd', 'e', 'f']
    const items = headerItemsSchema.parse(ids.map((id) => run(id, id === 'b' ? {} : { pinned: true })))
    expect(pinnedRuns(items).map((item) => item.id)).toEqual(['a', 'c', 'd', 'e'])
  })
  test('declaring more than PINNED_MAX is not refused', () => {
    expect(headerItemsSchema.safeParse(['a', 'b', 'c', 'd', 'e'].map((id) => run(id, { pinned: true }))).success).toBe(true)
  })
  test('pressing is unchanged: disabled and busy still refuse, agents and confirm still conflict', () => {
    const items = headerItemsSchema.parse([run('a', { pinned: true, disabled: 'No edit is open' }), run('b', { pinned: true, state: 'busy' })])
    expect(pressRefusal(items, { item: 'a' })).toBe('No edit is open')
    expect(pressRefusal(items, { item: 'b' })).toContain('already running')
    expect(headerItemsSchema.safeParse([run('c', { pinned: true, agents: true, confirm: true })]).success).toBe(false)
  })
  test('the icon vocabulary is names within the icon limit', () => {
    for (const name of HEADER_ICONS) expect(name.length).toBeLessThanOrEqual(LIMITS.HEADER_ICON)
    expect(HEADER_ICONS).toContain('check')
    expect(headerItemsSchema.safeParse([run('a', { icon: 'something-else' })]).success).toBe(true)
  })
  test('[against 1.5.0] an old reader parses the header and strips pinned', () => {
    if (old === null) return
    const parsed = old.headerItemsSchema.parse([run('a', { pinned: true, icon: 'check' })]) as any[]
    expect(parsed[0].pinned).toBeUndefined()
    expect(parsed[0].icon).toBe('check')
    expect(parsed[0].kind).toBe('run')
    expect(old.pressRefusal(parsed, { item: 'a' })).toBeNull()
  })
})
