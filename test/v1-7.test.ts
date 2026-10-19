import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { ACTIVITY_PRIORITIES, LIMITS, PACKAGE_VERSION, activityItemsSchema } from '../src/index.js'

/** 1.7.0: `priority`, `refs`, `group` on an activity item. Also parsed by the 1.6.0 build from the tag. */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')
let dir = ''
let old: Record<string, any> | null = null
beforeAll(async () => {
  try {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'kehikot-v17-')))
    execFileSync('sh', ['-c', `git -C "${REPO}" archive v1.6.0 | tar -x -C "${dir}"`], { stdio: 'ignore' })
    symlinkSync(join(REPO, 'node_modules'), join(dir, 'node_modules'))
    old = await import(join(dir, 'src/index.ts'))
  } catch {
    console.warn('v1.6.0 is not available here: the 1.6.0 compatibility checks are skipped')
  }
})
afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
})

const item = (id: string, more: Record<string, unknown> = {}) => ({ id, state: 'attention', label: id, ...more })

describe('activity priority, refs, group', () => {
  test('version and limits', () => {
    expect(PACKAGE_VERSION).toBe('2.3.0')
    expect(LIMITS.ACTIVITY_REFS).toBe(16)
    expect(LIMITS.ACTIVITY_GROUP).toBe(64)
    expect([...ACTIVITY_PRIORITIES]).toEqual(['urgent', 'normal', 'low'])
  })
  test('all optional and carried', () => {
    const [a, b] = activityItemsSchema.parse([item('a'), item('b', { priority: 'urgent', refs: ['gh#12', '!7'], group: 'tests' })]) as any[]
    expect(a.priority).toBeUndefined()
    expect(a.refs).toBeUndefined()
    expect(a.group).toBeUndefined()
    expect(b).toMatchObject({ priority: 'urgent', refs: ['gh#12', '!7'], group: 'tests' })
  })
  test('bounds refuse', () => {
    expect(activityItemsSchema.safeParse([item('a', { priority: 'high' })]).success).toBe(false)
    expect(activityItemsSchema.safeParse([item('a', { refs: Array(17).fill('gh#1') })]).success).toBe(false)
    expect(activityItemsSchema.safeParse([item('a', { refs: [''] })]).success).toBe(false)
    expect(activityItemsSchema.safeParse([item('a', { group: 'x'.repeat(65) })]).success).toBe(false)
    expect(activityItemsSchema.safeParse([item('a', { group: 'x'.repeat(64) })]).success).toBe(true)
  })
  test('a 1.6.0 list parses unchanged', () => {
    const list = [item('a', { place: { epic: 'e' }, since: 5, detail: 'd' }), item('b', { state: 'done' })]
    expect(activityItemsSchema.parse(list)).toEqual(list)
  })
  test('[against 1.6.0] an old reader strips the new fields, not refuses', () => {
    if (old === null) return
    const parsed = old.activityItemsSchema.parse([item('a', { priority: 'urgent', refs: ['gh#1'], group: 'g', detail: 'd' })]) as any[]
    expect(parsed[0].priority).toBeUndefined()
    expect(parsed[0].refs).toBeUndefined()
    expect(parsed[0].group).toBeUndefined()
    expect(parsed[0].detail).toBe('d')
  })
})
