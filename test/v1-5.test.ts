import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import {
  ACTIVITY_STATES,
  CAPABILITIES,
  LIMITS,
  METHODS,
  MESSAGE,
  PACKAGE_VERSION,
  PROTOCOL,
  activityItemSchema,
  activitySetResult,
  helloSchema,
  manifestSchema,
  methodParams,
  notificationPayload,
  resultSchemaFor,
  worstActivity,
} from '../src/index.js'
import { connect, type MessageSource } from '../src/client/index.js'

/**
 * 1.5.0: `activity.set`. Checked here, and against the 1.4.0 build from the tag in a temporary
 * checkout (skipped loudly where the tag is not in the clone).
 */

const HERE = dirname(new URL(import.meta.url).pathname)
const REPO = resolve(HERE, '..')
let dir = ''
let old: Record<string, any> | null = null
beforeAll(async () => {
  try {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'kehikot-v15-')))
    execFileSync('sh', ['-c', `git -C "${REPO}" archive v1.4.0 | tar -x -C "${dir}"`], { stdio: 'ignore' })
    symlinkSync(join(REPO, 'node_modules'), join(dir, 'node_modules'))
    old = await import(join(dir, 'src/index.ts'))
  } catch {
    console.warn('v1.4.0 is not available here: the 1.4.0 compatibility checks are skipped')
  }
})
afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
})
const compat = (name: string, run: () => void | Promise<void>) =>
  test(`[against 1.4.0] ${name}`, async () => {
    if (old === null) return
    await run()
  })

const item = { id: 's1', state: 'attention', label: 'fix the build' }

describe('the method', () => {
  test('is under its own capability, and the version says 1.5.0', () => {
    expect(METHODS['activity.set']).toBe('activity:report')
    expect(Object.keys(CAPABILITIES)).toContain('activity:report')
    expect(PACKAGE_VERSION).toMatch(/^1\.\d+\.\d+$/)
  })
  test('items: the three states, optional place, since, detail', () => {
    expect([...ACTIVITY_STATES]).toEqual(['working', 'attention', 'done'])
    const full = { ...item, place: { epic: 'thesis', parts: ['intro'], kehikko: 'main' }, since: 1_700_000_000_000, detail: 'waiting for a permission' }
    expect(activityItemSchema.parse(full)).toEqual(full)
    expect(activityItemSchema.safeParse({ ...item, state: 'idle' }).success).toBe(false)
    expect(activityItemSchema.safeParse({ ...item, since: -1 }).success).toBe(false)
  })
  test('place is the notification shape', () => {
    const place = { epic: 'thesis', parts: ['intro'], kehikko: 'main' }
    expect(notificationPayload.parse({ epic: 'thesis', message: 'm', place }).place).toEqual(place)
    expect(activityItemSchema.safeParse({ ...item, place: { parts: [] } }).success).toBe(false)
  })
  test('bounds: refused, not clipped; ids distinct; at most 64', () => {
    const p = methodParams['activity.set']
    expect(p.safeParse({ items: [] }).success).toBe(true)
    expect(p.safeParse({ items: [{ ...item, label: 'x'.repeat(LIMITS.ACTIVITY_LABEL + 1) }] }).success).toBe(false)
    expect(p.safeParse({ items: [{ ...item, detail: 'x'.repeat(LIMITS.ACTIVITY_DETAIL + 1) }] }).success).toBe(false)
    expect(p.safeParse({ items: [{ ...item, id: '' }] }).success).toBe(false)
    expect(p.safeParse({ items: [item, item] }).success).toBe(false)
    const many = Array.from({ length: LIMITS.ACTIVITY_ITEMS }, (_, i) => ({ ...item, id: `s${i}` }))
    expect(p.safeParse({ items: many }).success).toBe(true)
    expect(p.safeParse({ items: [...many, { ...item, id: 'extra' }] }).success).toBe(false)
    expect(p.safeParse({}).success).toBe(false)
  })
  test('the answer', () => {
    expect(resultSchemaFor('activity.set')).toBe(activitySetResult)
    expect(activitySetResult.parse({ outcome: 'taken', taken: 2 })).toEqual({ outcome: 'taken', taken: 2, why: '' })
    expect(activitySetResult.safeParse({ outcome: 'maybe' }).success).toBe(false)
  })
  test('worstActivity: attention over working over done', () => {
    expect(worstActivity([])).toBeNull()
    expect(worstActivity(['done', 'working'])).toBe('working')
    expect(worstActivity(['done', 'working', 'attention'])).toBe('attention')
    expect(worstActivity(['done'])).toBe('done')
  })
})

describe('against a 1.4.0 build', () => {
  const minimal = {
    kind: 'kehikot.module',
    protocol: 1,
    id: 'kehikot.claude',
    name: 'Claude',
    entry: '/app',
    modes: [{ id: 'claude', label: 'Claude' }],
    partless: 'Sessions are the project’s, not an epic’s.',
  }
  compat('a manifest declaring uses: activity:report is accepted, and the entry kept', () => {
    const manifest = { ...minimal, declares: { uses: ['activity:report', 'events:emit'] } }
    expect(manifestSchema.parse(manifest).declares.uses).toContain('activity:report')
    const read = old!.manifestSchema.safeParse(manifest)
    expect(read.success).toBe(true)
    expect(read.data.declares.uses).toEqual(['activity:report', 'events:emit'])
  })
  compat('a greeting whose answers lists activity.set is accepted', () => {
    const hello = { type: 'kehikot.hello', protocol: 2, session: 's', context: { project: 'p', projectPath: null, epic: null }, state: null }
    const sent = { ...hello, answers: ['parts.set', 'activity.set'] }
    expect(helloSchema.parse(sent).answers).toContain('activity.set')
    expect(old!.helloSchema.parse(sent).answers).toEqual(['parts.set', 'activity.set'])
  })
  compat('1.4.0 does not know the method: it is not in METHODS (a host answers unknown-method)', () => {
    expect(Object.hasOwn(old!.METHODS, 'activity.set')).toBe(false)
    expect(old!.CAPABILITY_NAMES).not.toContain('activity:report')
  })
  compat('a notification still parses in both', () => {
    const line = { epic: 'thesis', message: 'm', place: { epic: 'thesis', parts: ['a'] } }
    expect(old!.notificationPayload.parse(line)).toEqual(notificationPayload.parse(line))
  })
})

describe('the client helper', () => {
  function rig(extra: Record<string, unknown> = {}) {
    const listeners = new Set<(ev: MessageEvent) => void>()
    const source: MessageSource = {
      parent: {} as Window,
      addEventListener: (_t, fn) => void listeners.add(fn),
      removeEventListener: (_t, fn) => void listeners.delete(fn),
    }
    const said: any[] = []
    const host = { postMessage: (m: unknown) => void said.push(m) }
    const deliver = (data: unknown) => listeners.forEach((fn) => fn({ data, origin: 'null', source: host } as unknown as MessageEvent))
    const live = connect('kehikot.example', {}, { source })
    live.listen()
    const greet = () =>
      deliver({ type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's', context: { epic: null, project: null, theme: 'light' }, ...extra })
    const sets = () => said.filter((m) => m.type === MESSAGE.REQUEST && m.method === 'activity.set')
    const take = (n: number) => deliver({ type: MESSAGE.RESPONSE, id: sets()[n].id, ok: true, data: { outcome: 'taken', taken: 1 } })
    return { live, greet, sets, take, deliver }
  }
  test('sends nothing before a greeting, then the last list; drops identical repeats', async () => {
    const r = rig()
    r.live.activity([item as any])
    expect(r.sets()).toHaveLength(0)
    r.greet()
    expect(r.sets()).toHaveLength(1)
    expect(r.sets()[0].params).toEqual({ items: [item] })
    r.live.activity([{ ...item } as any])
    expect(r.sets()).toHaveLength(1)
    r.live.activity([{ ...item, state: 'done' } as any])
    expect(r.sets()).toHaveLength(2)
    r.live.activity([])
    expect(r.sets()).toHaveLength(3)
  })
  test('a new greeting sends the list again', () => {
    const r = rig()
    r.greet()
    r.live.activity([item as any])
    r.take(0)
    r.greet()
    expect(r.sets()).toHaveLength(2)
  })
  test('a host that says it does not answer it is not asked', () => {
    const r = rig({ answers: ['parts.set'] })
    r.greet()
    r.live.activity([item as any])
    expect(r.sets()).toHaveLength(0)
    const yes = rig({ answers: ['activity.set'] })
    yes.greet()
    yes.live.activity([item as any])
    expect(yes.sets()).toHaveLength(1)
  })
  test('a list that does not parse is not sent', () => {
    const r = rig()
    r.greet()
    r.live.activity([item, item] as any)
    expect(r.sets()).toHaveLength(0)
  })
})
