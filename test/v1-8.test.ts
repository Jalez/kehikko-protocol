import { describe, expect, test } from 'bun:test'

import { LIMITS, MESSAGE, PACKAGE_VERSION, PROTOCOL, activityItemsSchema, activitySetResult } from '../src/index.js'
import { connect, type MessageSource } from '../src/client/index.js'

/** 1.8.0: an activity item may say which project it belongs to, for a host that files by it. */

const item = (id: string, more: Record<string, unknown> = {}) => ({ id, state: 'attention', label: id, ...more })
const A = '/work/thesis'
const B = '/work/portal'

describe('an activity item’s project', () => {
  test('version and limit', () => {
    expect(PACKAGE_VERSION).toBe('2.35.0')
    expect(LIMITS.ACTIVITY_PROJECT).toBe(1024)
  })
  test('optional, an absolute folder, and carried', () => {
    const [a, b] = activityItemsSchema.parse([item('a'), item('b', { project: A })]) as any[]
    expect(a.project).toBeUndefined()
    expect(b.project).toBe(A)
    expect(activityItemsSchema.safeParse([item('a', { project: 'relative/path' })]).success).toBe(false)
    expect(activityItemsSchema.safeParse([item('a', { project: '' })]).success).toBe(false)
    expect(activityItemsSchema.safeParse([item('a', { project: `/${'x'.repeat(1024)}` })]).success).toBe(false)
  })
  test('a host says it files by project in its answer; saying nothing is not saying yes', () => {
    expect(activitySetResult.parse({ outcome: 'taken', taken: 1, projects: true })).toEqual({ outcome: 'taken', taken: 1, why: '', projects: true })
    expect(activitySetResult.parse({ outcome: 'taken', taken: 1 }).projects).toBeUndefined()
  })
})

describe('the client helper, across projects', () => {
  function rig(projectPath: string | null = A) {
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
      deliver({ type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's', context: { epic: null, project: null, projectPath, theme: 'light' } })
    const sets = () => said.filter((m) => m.type === MESSAGE.REQUEST && m.method === 'activity.set')
    const answer = (n: number, data: Record<string, unknown>) => deliver({ type: MESSAGE.RESPONSE, id: sets()[n].id, ok: true, data })
    return { live, greet, sets, answer, deliver }
  }
  const flush = () => new Promise((done) => setTimeout(done, 0))

  test('a host that has not said it files by project is sent the open project’s items only, untagged', async () => {
    const r = rig(A)
    r.greet()
    r.live.activity([item('a', { project: A }), item('b', { project: B }), item('c')] as any)
    expect(r.sets()[0].params).toEqual({ items: [item('a'), item('c')] })
    r.answer(0, { outcome: 'taken', taken: 2 })
    await flush()
    expect(r.sets()).toHaveLength(1)
  })

  test('one that says so is then sent the whole list, tagged', async () => {
    const r = rig(A)
    r.greet()
    r.live.activity([item('a', { project: A }), item('b', { project: B })] as any)
    r.answer(0, { outcome: 'taken', taken: 1, projects: true })
    await flush()
    expect(r.sets()).toHaveLength(2)
    expect(r.sets()[1].params).toEqual({ items: [item('a', { project: A }), item('b', { project: B })] })
  })

  test('another project opened at an older host: that project’s share is sent', async () => {
    const r = rig(A)
    r.greet()
    r.live.activity([item('a', { project: A }), item('b', { project: B })] as any)
    r.answer(0, { outcome: 'taken', taken: 1 })
    await flush()
    r.deliver({ type: MESSAGE.CONTEXT, protocol: PROTOCOL, epic: null, project: null, projectPath: B, theme: 'light' })
    expect(r.sets().at(-1).params).toEqual({ items: [item('b')] })
  })

  test('a module that tags nothing is sent exactly what it said', () => {
    const r = rig(A)
    r.greet()
    r.live.activity([item('a'), item('b')] as any)
    expect(r.sets()[0].params).toEqual({ items: [item('a'), item('b')] })
  })
})
