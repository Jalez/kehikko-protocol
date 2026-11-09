import { afterEach, describe, expect, test } from 'bun:test'
import { StrictMode, act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { MESSAGE, PACKAGE_VERSION, PROTOCOL, contextSchema, methodParams } from '../src/index.js'
import { KEEP_AFTER_MS, hostStore, makeMailbox } from '../src/client/index.js'
import { useHost, useKept, type Host } from '../src/client/react.js'

/**
 * 2.51.0: kept state per CONTAINER. A host that keeps one string per module on each kehikko says it
 * as `context.kept`; the client takes it on the greeting and whenever the context names another
 * kehikko, and stamps each `state.set` with the kehikko it is for. `useKept` is one field of it.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')
const ID = 'kehikot.example'

describe('the version', () => {
  test('is 2.51.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.55.0')
    expect(PROTOCOL).toBe(2)
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.51.0')
  })
})

describe('the shapes', () => {
  test('context.kept is optional and nullable, and bounded', () => {
    expect(contextSchema.parse({}).kept).toBeUndefined()
    expect(contextSchema.parse({ kept: null }).kept).toBeNull()
    expect(contextSchema.parse({ kept: '{"view":"b"}' }).kept).toBe('{"view":"b"}')
    expect(contextSchema.safeParse({ kept: 'x'.repeat(5000) }).success).toBe(false)
  })

  test('state.set takes the kehikko it is for, optionally', () => {
    expect(methodParams['state.set'].parse({ state: 's' })).toEqual({ state: 's' })
    expect(methodParams['state.set'].parse({ state: 's', kehikko: 3 })).toEqual({ state: 's', kehikko: 3 })
    expect(methodParams['state.set'].safeParse({ state: 's', kehikko: 'x' }).success).toBe(false)
  })
})

function speaker() {
  const said: { type: string; method?: string; params?: Record<string, unknown> }[] = []
  return { postMessage: (message: unknown) => said.push(message as never), said }
}

function inbox(from: unknown) {
  const listeners = new Set<(ev: MessageEvent) => void>()
  const box = makeMailbox({ parent: null, addEventListener: (_type: 'message', fn: (ev: MessageEvent) => void) => void listeners.add(fn) })
  const post = (data: unknown) => {
    for (const fn of [...listeners]) fn({ data, origin: 'null', source: from } as MessageEvent)
  }
  return { box, post }
}

const on = (id: number, kept?: string | null) => ({
  epic: null,
  project: 'P',
  theme: 'light',
  kehikko: { id, name: `K${id}` },
  ...(kept === undefined ? {} : { kept }),
})
const hello = (context: Record<string, unknown>, state: string | null = null) => ({ type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's1', state, context })
const contextOf = (context: Record<string, unknown>) => ({ type: MESSAGE.CONTEXT, protocol: PROTOCOL, ...context })
const writes = (host: ReturnType<typeof speaker>) => host.said.filter((one) => one.type === MESSAGE.REQUEST && one.method === 'state.set').map((one) => one.params)
const wait = (ms: number) => new Promise((done) => setTimeout(done, ms))

describe('hostStore: kept per container', () => {
  test('the greeting\'s context.kept wins over hello.state; an older host\'s hello.state is still read', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const store = hostStore<{ view: string }>(ID, {}, { source: box, grace: 0, reloadWhenStale: false }).start()
    post(hello(on(1, '{"view":"one"}'), '{"view":"module-wide"}'))
    expect(store.get().kept).toEqual({ view: 'one' })
    store.stop()

    const old = inbox(host)
    const older = hostStore<{ view: string }>(ID, {}, { source: old.box, grace: 0, reloadWhenStale: false }).start()
    old.post(hello(on(1), '{"view":"module-wide"}'))
    expect(older.get().kept).toEqual({ view: 'module-wide' })
    /* An older host's context names no kept: moving kehikko keeps what the page has. */
    old.post(contextOf(on(2)))
    expect(older.get().kept).toEqual({ view: 'module-wide' })
    older.stop()
  })

  test('another kehikko brings its own; a context for the same kehikko never overwrites what the page holds', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const store = hostStore<{ view: string }>(ID, {}, { source: box, grace: 0, reloadWhenStale: false }).start()
    post(hello(on(1, '{"view":"one"}')))
    store.remember({ view: 'newer' })
    post(contextOf(on(1, '{"view":"one"}')))
    expect(store.get().kept).toEqual({ view: 'newer' })
    post(contextOf(on(2, '{"view":"two"}')))
    expect(store.get().kept).toEqual({ view: 'two' })
    post(contextOf(on(3, null)))
    expect(store.get().kept).toBeNull()
    store.stop()
  })

  test('each write names the kehikko it is for; one still waiting is sent for its own kehikko when the person moves', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const store = hostStore<{ view: string }>(ID, {}, { source: box, grace: 0, reloadWhenStale: false }).start()
    post(hello(on(1, null)))
    store.remember({ view: 'a' })
    expect(writes(host)).toEqual([{ state: '{"view":"a"}', kehikko: 1 }])
    store.remember({ view: 'b' }, 10_000)
    store.remember({ view: 'c' }, 10_000)
    expect(writes(host).length).toBe(1)
    post(contextOf(on(2, '{"view":"two"}')))
    expect(writes(host)).toEqual([
      { state: '{"view":"a"}', kehikko: 1 },
      { state: '{"view":"c"}', kehikko: 1 },
    ])
    store.remember({ view: 'd' }, 10_000)
    store.stop()
    expect(writes(host).at(-1)).toEqual({ state: '{"view":"d"}', kehikko: 2 })
  })

  test('a write waits `after` and the newest wins', async () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const store = hostStore<{ view: string }>(ID, {}, { source: box, grace: 0, reloadWhenStale: false }).start()
    post(hello(on(7, null)))
    store.remember({ view: 'a' }, 20)
    store.remember({ view: 'b' }, 20)
    expect(writes(host)).toEqual([])
    await wait(40)
    expect(writes(host)).toEqual([{ state: '{"view":"b"}', kehikko: 7 }])
    store.stop()
  })
})

/* ------------------------------------------------------------------------ *
 * useKept, and the same module on two kehikot surviving a restart
 * ------------------------------------------------------------------------ */

let mounted: { root: Root; container: HTMLElement } | null = null
afterEach(async () => {
  const live = mounted
  mounted = null
  if (live) {
    await act(async () => live.root.unmount())
    live.container.remove()
  }
})

async function page(source: ReturnType<typeof makeMailbox>) {
  let latest: { host: Host; view: string; sort: string; setView: (v: string) => void; setSort: (v: string) => void } | null = null
  function Probe() {
    const host = useHost(ID, {}, { source, grace: 0, reloadWhenStale: false })
    const [view, setView] = useKept(host, 'view', 'list', (value) => value === 'list' || value === 'board')
    const [sort, setSort] = useKept(host, 'sort', 'name')
    latest = { host, view, sort, setView, setSort }
    return null
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => root.render(createElement(StrictMode, null, createElement(Probe))))
  mounted = { root, container }
  return () => latest!
}

/** A host's per-container store, as a host keeps it: kehikko id → the string. */
function keeper() {
  const kept = new Map<number, string>()
  const take = (host: ReturnType<typeof speaker>) => {
    for (const params of writes(host)) kept.set(params!.kehikko as number, params!.state as string)
    host.said.length = 0
  }
  return { kept, take }
}

describe('useKept', () => {
  test('a field reads its default, a kept value of the wrong kind is the default, and a set keeps the other fields', async () => {
    const host = speaker()
    const { box, post } = inbox(host)
    post(hello(on(1, '{"view":"nonsense","sort":"date","other":1}')))
    const now = await page(box)
    expect(now().view).toBe('list')
    expect(now().sort).toBe('date')
    await act(async () => now().setView('board'))
    expect(now().view).toBe('board')
    expect(writes(host)).toEqual([])
    await act(async () => void (await wait(KEEP_AFTER_MS + 50)))
    expect(writes(host)).toEqual([{ state: JSON.stringify({ view: 'board', sort: 'date', other: 1 }), kehikko: 1 }])
  })

  test('the same module on two kehikot keeps two views, and both are back after a restart', async () => {
    const store = keeper()

    /* The app's first run: the person sets a view on kehikko 1, moves to kehikko 2, sets another. */
    const host = speaker()
    const first = inbox(host)
    first.post(hello(on(1, null)))
    const now = await page(first.box)
    await act(async () => {
      now().setView('board')
      now().setSort('date')
    })
    await act(async () => first.post(contextOf(on(2, null))))
    expect(now().view).toBe('list')
    await act(async () => now().setSort('size'))
    await act(async () => void (await wait(KEEP_AFTER_MS + 50)))
    store.take(host)
    expect(JSON.parse(store.kept.get(1)!)).toEqual({ view: 'board', sort: 'date' })
    expect(JSON.parse(store.kept.get(2)!)).toEqual({ sort: 'size' })
    /* Back to kehikko 1 within the same run: its view, from what the host holds. */
    await act(async () => first.post(contextOf(on(1, store.kept.get(1)!))))
    expect([now().view, now().sort]).toEqual(['board', 'date'])
    await act(async () => mounted!.root.unmount())
    mounted = null

    /* A restart, greeted on kehikko 2, then moved to kehikko 1: each container's own view. */
    const again = inbox(speaker())
    again.post(hello(on(2, store.kept.get(2)!)))
    const later = await page(again.box)
    expect([later().view, later().sort]).toEqual(['list', 'size'])
    await act(async () => again.post(contextOf(on(1, store.kept.get(1)!))))
    expect([later().view, later().sort]).toEqual(['board', 'date'])
  })
})
