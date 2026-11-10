import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { act, createElement } from 'react'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import {
  HOLD_COVER_MS,
  LIMITS,
  MESSAGE,
  MODULE_MESSAGES,
  PACKAGE_VERSION,
  PROTOCOL,
  drawnSchema,
  moduleMessageSchema,
  readySchema,
  rowsAdvice,
  sinceOf,
} from '../src/index.js'
import {
  KEPT_VIEW_MARK,
  RELAY_POINTER,
  connect,
  headerValues,
  hostStore,
  makeMailbox,
  pointerShim,
  pointerShimScript,
  relayPointer,
  unwrapKept,
  wrapKept,
  type PointerEventLike,
  type PointerTarget,
  type ScrollBox,
} from '../src/client/index.js'
import { NO_ROOT, mountPage } from '../src/client/mount.js'
import { PAGE_FAILED } from '../src/client/react.js'
import { checkModuleRows, checkRowsStates, rowsStatesOf } from '../src/check/rows.js'
import { checkModuleNotes, checkNotes, snapshotOf, toolChanges } from '../src/check/notes.js'

/**
 * 2.70.0: what every container gets by default — its view kept, the host's cover held until the page
 * is drawn, errors reported from the mount, presses from nested frames, the rows advised — and the
 * two checks a module runs in CI (`kehikot-check-rows`, `kehikot-check-notes`).
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')
const ID = 'kehikot.example'
const wait = (ms: number) => new Promise((done) => setTimeout(done, ms))

describe('the version', () => {
  test('is 2.70.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.75.0')
    expect(PROTOCOL).toBe(2)
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.70.0')
    const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'))
    expect(pkg.version).toBe('2.75.0')
    expect(pkg.bin['kehikot-check-rows']).toBe('./bin/check-rows.ts')
    expect(pkg.bin['kehikot-check-notes']).toBe('./bin/check-notes.ts')
    expect(pkg.exports['./client/mount'].default).toBe('./dist/client/mount.js')
  })
})

/* ------------------------------------------------------------------------ *
 * A fake host
 * ------------------------------------------------------------------------ */

type Said = { type: string; method?: string; params?: Record<string, unknown>; hold?: boolean }

function speaker() {
  const said: Said[] = []
  return { postMessage: (message: unknown) => void said.push(message as Said), said }
}

function inbox(from: unknown) {
  const listeners = new Set<(ev: MessageEvent) => void>()
  const box = makeMailbox({ parent: null, addEventListener: (_type: 'message', fn: (ev: MessageEvent) => void) => void listeners.add(fn) })
  const post = (data: unknown) => {
    for (const fn of [...listeners]) fn({ data, origin: 'null', source: from } as MessageEvent)
  }
  return { box, post }
}

const on = (id: number, kept?: string | null) => ({ epic: null, project: 'P', theme: 'light', kehikko: { id, name: `K${id}` }, ...(kept === undefined ? {} : { kept }) })
const hello = (context: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({ type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's1', state: null, context, ...extra })
const writes = (host: ReturnType<typeof speaker>) => host.said.filter((one) => one.type === MESSAGE.REQUEST && one.method === 'state.set').map((one) => one.params)

/** A target that hands its listeners whatever a test fires. */
function emitter() {
  const listeners = new Map<string, Set<(event: PointerEventLike) => void>>()
  const target: PointerTarget & { fire: (type: string, event?: PointerEventLike) => void; count: () => number } = {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type)!.add(fn)
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn)
    },
    fire(type, event = {}) {
      for (const fn of [...(listeners.get(type) ?? [])]) fn(event)
    },
    count: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
  }
  return target
}

const items = (pane: string, wrap: boolean) => [
  { kind: 'switch' as const, id: 'pane', label: 'Pane', options: [{ id: 'edit', label: 'Edit' }, { id: 'preview', label: 'Preview' }], value: pane },
  { kind: 'toggle' as const, id: 'wrap', label: 'Wrap', checked: wrap },
  { kind: 'run' as const, id: 'new', label: 'New' },
]

/* ------------------------------------------------------------------------ *
 * 1. The kept view
 * ------------------------------------------------------------------------ */

describe('the kept view: the envelope', () => {
  test('a string without the mark is the module\'s own, whole; an empty view writes the module\'s string as it was', () => {
    expect(unwrapKept('{"view":"a"}')).toEqual({ view: null, state: '{"view":"a"}' })
    expect(unwrapKept(null)).toEqual({ view: null, state: null })
    expect(wrapKept(null, '{"a":1}')).toBe('{"a":1}')
    expect(wrapKept({}, null)).toBeNull()
  })

  test('a view goes around the module\'s string and comes back out of it', () => {
    const kept = wrapKept({ scroll: 120, header: { pane: 'preview', wrap: true } }, '{"mine":1}')!
    expect(kept.startsWith(KEPT_VIEW_MARK)).toBe(true)
    expect(unwrapKept(kept)).toEqual({ view: { scroll: 120, header: { pane: 'preview', wrap: true } }, state: '{"mine":1}' })
    expect(unwrapKept(`${KEPT_VIEW_MARK}not json`)).toEqual({ view: null, state: null })
  })

  test('the module\'s own state wins over the view when both do not fit', () => {
    const own = 'x'.repeat(LIMITS.MODULE_STATE - 40)
    const kept = wrapKept({ scroll: 5, header: { a: 'one', b: 'two' } }, own)!
    expect(kept.length).toBeLessThanOrEqual(LIMITS.MODULE_STATE)
    expect(unwrapKept(kept).state === own || kept === own).toBe(true)
    expect(wrapKept({ scroll: 5 }, 'y'.repeat(LIMITS.MODULE_STATE))).toBe('y'.repeat(LIMITS.MODULE_STATE))
  })

  test('headerValues reads switches and toggles only', () => {
    expect(headerValues(items('edit', false))).toEqual({ pane: 'edit', wrap: false })
    expect(headerValues(items('edit', false), (id) => id !== 'wrap')).toEqual({ pane: 'edit' })
    expect(headerValues('nope')).toEqual({})
  })
})

describe('the kept view: hostStore', () => {
  test('header switches and toggles are kept for the container, beside the page\'s own state, which the page sees alone', async () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const store = hostStore<{ mine: number }>(ID, { onPress: () => {} }, { source: box, grace: 0, reloadWhenStale: false, keepView: { scroll: false } }).start()
    post(hello(on(1, '{"mine":1}')))
    expect(store.get().kept).toEqual({ mine: 1 })
    store.header(items('preview', true))
    await wait(400)
    const [write] = writes(host)
    expect(write?.kehikko).toBe(1)
    const opened = unwrapKept(write?.state as string)
    expect(opened).toEqual({ view: { header: { pane: 'preview', wrap: true } }, state: '{"mine":1}' })
    /* The page's own write keeps the view around it. */
    store.remember({ mine: 2 })
    expect(unwrapKept(writes(host).at(-1)?.state as string)).toEqual({ view: { header: { pane: 'preview', wrap: true } }, state: '{"mine":2}' })
    expect(store.get().kept).toEqual({ mine: 2 })
    store.stop()
  })

  test('on the next greeting, a switch or toggle the header is not on is pressed back, through onPress', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const presses: unknown[] = []
    const kept = wrapKept({ header: { pane: 'preview', wrap: true } }, '{"mine":1}')
    let seenState: string | null | undefined
    let seenKept: unknown
    const store = hostStore(ID, {
      onPress: (press) => void presses.push(press),
      onHello: (context, state) => {
        seenState = state
        seenKept = context.kept
      },
    }, { source: box, grace: 0, reloadWhenStale: false, keepView: { scroll: false } }).start()
    store.header(items('edit', true))
    post(hello(on(1, kept)))
    expect(presses).toEqual([{ item: 'pane', value: 'preview' }])
    expect(seenState).toBeNull()
    expect(seenKept).toBe('{"mine":1}')
    expect(store.get().context?.kept).toBe('{"mine":1}')
    store.stop()
  })

  test('a header declared after the greeting is given back too, once', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const presses: unknown[] = []
    const store = hostStore(ID, { onPress: (press) => void presses.push(press) }, { source: box, grace: 0, reloadWhenStale: false, keepView: { scroll: false } }).start()
    post(hello(on(1, wrapKept({ header: { wrap: true } }, null))))
    store.header(items('edit', false))
    store.header(items('edit', false))
    expect(presses).toEqual([{ item: 'wrap', value: true }])
    store.stop()
  })

  test('except, and keepView: false, keep nothing of those', async () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const presses: unknown[] = []
    const store = hostStore(ID, { onPress: (press) => void presses.push(press) }, { source: box, grace: 0, reloadWhenStale: false, keepView: { scroll: false, except: ['wrap'] } }).start()
    post(hello(on(1, wrapKept({ header: { wrap: true, pane: 'edit' } }, null))))
    store.header(items('edit', false))
    expect(presses).toEqual([])
    store.stop()

    const other = speaker()
    const second = inbox(other)
    const off = hostStore(ID, { onPress: (press) => void presses.push(press) }, { source: second.box, grace: 0, reloadWhenStale: false, keepView: false }).start()
    second.post(hello(on(1, wrapKept({ header: { pane: 'preview' } }, '{"mine":1}'))))
    off.header(items('edit', false))
    await wait(400)
    expect(presses).toEqual([])
    expect(writes(other)).toEqual([])
    /* The page still sees its own string, never the envelope. */
    expect(off.get().kept).toEqual({ mine: 1 })
    off.remember({ mine: 3 })
    expect(writes(other)).toEqual([{ state: '{"mine":3}', kehikko: 1 }])
    off.stop()
  })

  test('nothing is written to a host that does not keep state for this module', async () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const store = hostStore(ID, {}, { source: box, grace: 0, reloadWhenStale: false, keepView: { scroll: false } }).start()
    post(hello(on(1, null), { answers: ['activity.set'] }))
    store.header(items('preview', true))
    await wait(400)
    expect(writes(host)).toEqual([])
    store.stop()
  })

  test('the scroll position is kept after the person stops, and given back on the next greeting', async () => {
    const host = speaker()
    const { box: mail, post } = inbox(host)
    const events = emitter()
    const box: ScrollBox = { scrollTop: 0, scrollHeight: 2000, clientHeight: 500 }
    const store = hostStore(ID, {}, { source: mail, grace: 0, reloadWhenStale: false, keepView: { scroll: () => box, header: false, events } }).start()
    post(hello(on(1, null)))
    box.scrollTop = 640
    events.fire('scroll')
    await wait(800)
    expect(unwrapKept(writes(host).at(-1)?.state as string).view).toEqual({ scroll: 640 })
    store.stop()
    expect(events.count()).toBe(0)

    const again = speaker()
    const next = inbox(again)
    const fresh: ScrollBox = { scrollTop: 0, scrollHeight: 2000, clientHeight: 500 }
    const restored = hostStore(ID, {}, { source: next.box, grace: 0, reloadWhenStale: false, keepView: { scroll: () => fresh, header: false, events: emitter() } }).start()
    next.post(hello(on(1, wrapKept({ scroll: 640 }, null))))
    expect(fresh.scrollTop).toBe(640)
    restored.stop()
  })

  test('a page still drawing is scrolled when it can be, and the person\'s own wheel stops it', async () => {
    const host = speaker()
    const { box: mail, post } = inbox(host)
    const events = emitter()
    /* A box that cannot scroll past what it has drawn. */
    let drawn = 300
    const box = {
      get scrollHeight() {
        return drawn
      },
      clientHeight: 200,
      top: 0,
      get scrollTop() {
        return this.top
      },
      set scrollTop(value: number) {
        this.top = Math.min(value, Math.max(0, drawn - 200))
      },
    }
    const store = hostStore(ID, {}, { source: mail, grace: 0, reloadWhenStale: false, keepView: { scroll: () => box, header: false, events } }).start()
    post(hello(on(1, wrapKept({ scroll: 900 }, null))))
    expect(box.scrollTop).toBe(100)
    drawn = 2000
    await wait(250)
    expect(box.scrollTop).toBe(900)
    store.stop()

    const later = inbox(speaker())
    drawn = 300
    box.top = 0
    const other = hostStore(ID, {}, { source: later.box, grace: 0, reloadWhenStale: false, keepView: { scroll: () => box, header: false, events } }).start()
    later.post(hello(on(1, wrapKept({ scroll: 900 }, null))))
    events.fire('wheel')
    drawn = 2000
    await wait(250)
    expect(box.scrollTop).toBe(100)
    other.stop()
  })
})

/* ------------------------------------------------------------------------ *
 * 2. The cover, held until the page is drawn
 * ------------------------------------------------------------------------ */

describe('the cover held until ready()', () => {
  test('the shapes: ready.hold and kehikot.drawn', () => {
    expect(readySchema.parse({ type: MESSAGE.READY, id: ID, hold: true }).hold).toBe(true)
    expect(readySchema.parse({ type: MESSAGE.READY, id: ID }).hold).toBeUndefined()
    expect(MODULE_MESSAGES).toContain(MESSAGE.DRAWN)
    expect(drawnSchema.parse({ type: MESSAGE.DRAWN })).toEqual({ type: MESSAGE.DRAWN })
    expect(moduleMessageSchema.safeParse({ type: MESSAGE.DRAWN }).success).toBe(true)
    expect(sinceOf('wire', 'ready.hold')).toBe('2.70.0')
    expect(sinceOf('wire', 'kehikot.drawn')).toBe('2.70.0')
    expect(HOLD_COVER_MS).toBeGreaterThan(0)
  })

  test('ready goes with hold: true, and ready() lifts it once', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const conn = connect(ID, {}, { source: box, pointerTarget: false, findKeys: false })
    conn.listen()
    post(hello(on(1)))
    expect(host.said[0]).toMatchObject({ type: MESSAGE.READY, hold: true })
    conn.ready()
    conn.ready()
    expect(host.said.filter((one) => one.type === MESSAGE.DRAWN)).toHaveLength(1)
    /* A greeting after it: the page is drawn already. */
    post(hello(on(1)))
    expect(host.said.filter((one) => one.type === MESSAGE.READY).at(-1)?.hold).toBeUndefined()
    conn.stop()
  })

  test('the wait passes by itself, and every greeting starts it again', async () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const conn = connect(ID, {}, { source: box, pointerTarget: false, findKeys: false, holdCover: 30 })
    conn.listen()
    post(hello(on(1)))
    await wait(60)
    expect(host.said.filter((one) => one.type === MESSAGE.DRAWN)).toHaveLength(1)
    post(hello(on(1)))
    expect(host.said.filter((one) => one.type === MESSAGE.READY).at(-1)?.hold).toBe(true)
    await wait(60)
    expect(host.said.filter((one) => one.type === MESSAGE.DRAWN)).toHaveLength(2)
    conn.stop()
  })

  test('holdCover: false is ready at once, as before', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const conn = connect(ID, {}, { source: box, pointerTarget: false, findKeys: false, holdCover: false })
    conn.listen()
    post(hello(on(1)))
    expect(host.said[0]).toEqual({ type: MESSAGE.READY, id: ID, protocol: PROTOCOL })
    conn.ready()
    expect(host.said.some((one) => one.type === MESSAGE.DRAWN)).toBe(false)
    conn.stop()
  })

  test('hostStore says ready through the connection', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const store = hostStore(ID, {}, { source: box, grace: 0, reloadWhenStale: false, pointerTarget: false, findKeys: false }).start()
    post(hello(on(1)))
    store.ready()
    expect(host.said.some((one) => one.type === MESSAGE.DRAWN)).toBe(true)
    store.stop()
  })
})

/* ------------------------------------------------------------------------ *
 * 3. mountPage
 * ------------------------------------------------------------------------ */

describe('mountPage', () => {
  let roots: { unmount(): void }[] = []
  afterEach(async () => {
    for (const root of roots) await act(async () => root.unmount())
    roots = []
  })

  test('mounts the page inside ReportErrors: a render that throws is drawn as text', async () => {
    const error = spyOn(console, 'error').mockImplementation(() => {})
    const element = document.createElement('div')
    element.id = 'mount-here'
    document.body.appendChild(element)
    function Broken(): never {
      throw new Error('the page broke')
    }
    await act(async () => {
      const root = mountPage('mount-here', createElement(Broken))
      if (root) roots.push(root)
    })
    expect(element.querySelector('[data-testid="page-failed"]')?.textContent).toContain(PAGE_FAILED)
    expect(element.textContent).toContain('the page broke')
    error.mockRestore()
    element.remove()
  })

  test('mounts a page that works, and says so when there is nowhere to mount', async () => {
    const element = document.createElement('div')
    document.body.appendChild(element)
    await act(async () => {
      const root = mountPage(element, createElement('p', null, 'hello'), { strict: false, reportErrors: false })
      if (root) roots.push(root)
    })
    expect(element.textContent).toBe('hello')
    element.remove()
    expect(mountPage('nowhere-at-all', createElement('p'))).toBeNull()
    expect(NO_ROOT).toContain('mount')
  })
})

/* ------------------------------------------------------------------------ *
 * 4. Presses from nested frames
 * ------------------------------------------------------------------------ */

describe('long press from nested frames', () => {
  const pointers = (host: ReturnType<typeof speaker>) => host.said.filter((one) => one.type === MESSAGE.POINTER).map((one) => (one as unknown as { phase: string }).phase)

  test('a same-origin frame is listened on, only while the host asked, and again after it loads', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const conn = connect(ID, {}, { source: box, pointerTarget: false, findKeys: false, holdCover: false })
    conn.listen()
    const inner = Object.assign(emitter(), { document: {} })
    const loads = new Set<() => void>()
    const frame = {
      contentWindow: inner as unknown,
      addEventListener: (_type: 'load', fn: () => void) => void loads.add(fn),
      removeEventListener: (_type: 'load', fn: () => void) => void loads.delete(fn),
    }
    const stop = relayPointer(conn, frame)
    inner.fire('pointerdown', { button: 0 })
    expect(pointers(host)).toEqual([])
    post(hello(on(1), { pointer: true }))
    inner.fire('pointerdown', { button: 0, clientX: 1, clientY: 1 })
    inner.fire('pointerup', {})
    expect(pointers(host)).toEqual(['down', 'up'])
    /* A new document in the frame: the new window is listened on, the old one no longer. */
    const next = Object.assign(emitter(), { document: {} })
    frame.contentWindow = next
    for (const fn of loads) fn()
    inner.fire('pointerdown', { button: 0 })
    next.fire('pointerdown', { button: 0 })
    expect(pointers(host)).toEqual(['down', 'up', 'down'])
    stop()
    expect(next.count()).toBe(0)
    expect(loads.size).toBe(0)
    conn.stop()
  })

  test('a frame on another origin is not reached; with its origin, the shim\'s messages are taken from it alone', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const conn = connect(ID, {}, { source: box, pointerTarget: false, findKeys: false, holdCover: false })
    conn.listen()
    post(hello(on(1), { pointer: true }))
    const viewer = {}
    const sealed = { get document(): never { throw new Error('cross-origin') }, addEventListener() {}, removeEventListener() {} }
    const frame = { contentWindow: sealed as unknown, addEventListener() {}, removeEventListener() {} }
    relayPointer(conn, frame)()

    const messages = new Set<(event: MessageEvent) => void>()
    const page = { addEventListener: (_t: 'message', fn: (event: MessageEvent) => void) => void messages.add(fn), removeEventListener: (_t: 'message', fn: (event: MessageEvent) => void) => void messages.delete(fn) }
    const shimmed = { contentWindow: viewer as unknown, addEventListener() {}, removeEventListener() {} }
    const stop = relayPointer(conn, shimmed, { origin: 'http://viewer.test', messages: page })
    const say = (data: unknown, origin = 'http://viewer.test', source: unknown = viewer) => {
      for (const fn of [...messages]) fn({ data, origin, source } as MessageEvent)
    }
    say({ type: RELAY_POINTER, event: 'pointerdown', button: 0, clientX: 3, clientY: 3 })
    say({ type: RELAY_POINTER, event: 'pointerup' }, 'http://elsewhere.test')
    say({ type: RELAY_POINTER, event: 'pointerup' }, 'http://viewer.test', {})
    say({ type: RELAY_POINTER, event: 'click' })
    say({ type: RELAY_POINTER, event: 'pointerup' })
    expect(pointers(host)).toEqual(['down', 'up'])
    stop()
    expect(messages.size).toBe(0)
    conn.stop()
  })

  test('the shim posts each press to the page, to the origin it is told', () => {
    const target = emitter()
    const posted: { message: unknown; origin: string }[] = []
    const parent = { postMessage: (message: unknown, origin: string) => void posted.push({ message, origin }) }
    const stop = pointerShim({ origin: 'http://page.test', target, parent })
    target.fire('pointerdown', { type: 'pointerdown', button: 0, clientX: 5, clientY: 6, isPrimary: true, pointerType: 'mouse' } as PointerEventLike)
    expect(posted).toEqual([{ message: { type: RELAY_POINTER, event: 'pointerdown', button: 0, isPrimary: true, clientX: 5, clientY: 6, pointerType: 'mouse' }, origin: 'http://page.test' }])
    stop()
    expect(target.count()).toBe(0)
    expect(pointerShimScript('http://page.test')).toContain('"http://page.test"')
    expect(pointerShimScript('x')).toContain(RELAY_POINTER)
  })

  test('hostStore keeps a nested window it was given before it started', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const store = hostStore(ID, {}, { source: box, grace: 0, reloadWhenStale: false, pointerTarget: false, findKeys: false, holdCover: false })
    const inner = emitter()
    const stop = store.pointerFrom(inner)
    store.start()
    post(hello(on(1), { pointer: true }))
    inner.fire('pointerdown', { button: 0 })
    expect(pointers(host)).toEqual(['down'])
    stop()
    expect(inner.count()).toBe(0)
    store.stop()
  })
})

/* ------------------------------------------------------------------------ *
 * 5. Rows advice
 * ------------------------------------------------------------------------ */

describe('rowsAdvice, the rest of the rule', () => {
  test('a count in a header label is the footer\'s', () => {
    expect(rowsAdvice([{ kind: 'run', id: 'inbox', label: 'Inbox (3)' }], [])).toHaveLength(1)
    expect(rowsAdvice([{ kind: 'run', id: 'open', label: '12 open' }], [])).toHaveLength(1)
    expect(rowsAdvice([{ kind: 'run', id: 'x', label: 'Open 2nd pane' }], [])).toEqual([])
  })

  test('a Go item that is not a jump is pointed out', () => {
    const one = rowsAdvice([{ kind: 'go', id: 'go', label: 'Go', options: [{ id: 'a', label: 'Top' }] }], [])
    expect(one[0]).toContain('one place')
    const acts = rowsAdvice([{ kind: 'go', id: 'go', label: 'Go', options: [{ id: 'a', label: 'Intro' }, { id: 'b', label: 'New section' }] }], [])
    expect(acts[0]).toContain('"New section"')
    expect(rowsAdvice([{ kind: 'go', id: 'go', label: 'Sections', options: [{ id: 'a', label: 'Intro' }, { id: 'b', label: 'Methods' }] }], [])).toEqual([])
  })

  test('an action in both rows is pointed out, by id or by kind and label', () => {
    expect(rowsAdvice([{ kind: 'run', id: 'retry', label: 'Retry' }], [{ kind: 'text', id: 'err', text: 'Failed' }, { kind: 'run', id: 'retry', label: 'Retry', actsOn: 'err' }])[0]).toContain('both')
    expect(rowsAdvice([{ kind: 'run', id: 'a', label: 'Compact' }], [{ kind: 'meter', id: 'c', label: 'C', value: 0.1 }, { kind: 'run', id: 'b', label: 'Compact', actsOn: 'c' }])).toHaveLength(1)
  })

  test('state and no footer declared is pointed out; a footer withdrawn on purpose, or a host that draws none, is not', () => {
    const header = [{ kind: 'run', id: 'build', label: 'Build', result: '3 warnings' }]
    expect(rowsAdvice(header, null)[0]).toContain('declares no footer')
    expect(rowsAdvice(header, [])).toEqual([])
    expect(rowsAdvice(header, null, { footer: false })).toEqual([])
    expect(rowsAdvice([{ kind: 'toggle', id: 'w', label: 'Wrap', checked: false }], undefined, { state: true })).toHaveLength(1)
    expect(rowsAdvice([{ kind: 'toggle', id: 'w', label: 'Wrap', checked: false }], undefined)).toEqual([])
  })

  test('the client says "no footer" once, a moment after the last declaration, to a host that draws one', async () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const host = speaker()
      const { box, post } = inbox(host)
      const conn = connect(ID, {}, { source: box, pointerTarget: false, findKeys: false, holdCover: false })
      conn.listen()
      post(hello(on(1), { header: true, footer: true }))
      conn.header([{ kind: 'run', id: 'build', label: 'Build', result: '3 warnings' }])
      expect(warn.mock.calls.length).toBe(0)
      await wait(1700)
      expect(warn.mock.calls.length).toBe(1)
      expect(String(warn.mock.calls[0]![0])).toContain('declares no footer')
      conn.stop()

      const quiet = connect(ID, {}, { source: inbox(speaker()).box, rowsAdvice: false, pointerTarget: false, findKeys: false })
      quiet.header([{ kind: 'meter' as never, id: 'm', label: 'M' } as never])
      expect(warn.mock.calls.length).toBe(1)
      quiet.stop()
    } finally {
      warn.mockRestore()
    }
  })
})

describe('kehikot-check-rows', () => {
  test('states are read whole or as a list, and each piece of advice names its state', () => {
    expect(rowsStatesOf({ header: [], footer: [] })).toEqual([{ name: 'state 1', header: [], footer: [], state: false }])
    const states = rowsStatesOf([{ name: 'busy', header: [{ kind: 'run', id: 'x', label: 'Inbox (3)' }], footer: [] }, 'nonsense'])
    const check = checkRowsStates(states, 'kehikot.rows.json')
    expect(check.failures).toHaveLength(1)
    expect(check.failures[0]).toStartWith('busy: ')
    expect(checkRowsStates([], null).failures).toEqual([])
  })

  test('reads kehikot.rows.json, or a module exporting rows, and the bin exits 1 on advice', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rows-'))
    expect((await checkModuleRows(dir)).read).toBeNull()
    writeFileSync(join(dir, 'kehikot.rows.json'), JSON.stringify({ header: [{ kind: 'meter', id: 'm', label: 'Usage', value: 0.5 }], footer: [] }))
    expect((await checkModuleRows(dir)).failures).toHaveLength(1)
    writeFileSync(join(dir, 'rows.ts'), "export const rows = () => [{ name: 'list', header: [{ kind: 'toggle', id: 'w', label: 'Wrap', checked: false }], footer: [{ kind: 'text', id: 't', text: '3 items' }] }]\n")
    expect((await checkModuleRows(dir, { file: 'rows.ts' })).failures).toEqual([])
    const failed = spawnSync('bun', [join(REPO, 'bin/check-rows.ts'), dir], { encoding: 'utf8' })
    expect(failed.status).toBe(1)
    expect(failed.stdout).toContain('FAIL')
    expect(spawnSync('bun', [join(REPO, 'bin/check-rows.ts'), '--warn', dir], { encoding: 'utf8' }).status).toBe(0)
    expect(spawnSync('bun', [join(REPO, 'bin/check-rows.ts'), '--file', 'rows.ts', dir], { encoding: 'utf8' }).status).toBe(0)
  })
})

/* ------------------------------------------------------------------------ *
 * 6. kehikot-check-notes
 * ------------------------------------------------------------------------ */

describe('kehikot-check-notes', () => {
  const tool = (name: string, description = 'Does it.', inputSchema: unknown = { type: 'object', properties: {} }) => ({ name, description, inputSchema })

  test('toolChanges names what changed for an agent, and nothing for keys in another order', () => {
    const before = snapshotOf([tool('a'), tool('b'), tool('c', 'x', { properties: { p: { type: 'string' } }, type: 'object' })])!
    const after = snapshotOf({ tools: [tool('a', 'Does more.'), tool('c', 'x', { type: 'object', properties: { p: { type: 'string' } } }), tool('d')] })!
    expect(toolChanges(before, after)).toEqual(["a's description changed", 'd is new', 'b is gone'])
    expect(toolChanges(before, before)).toEqual([])
    expect(snapshotOf('nope')).toBeNull()
  })

  test('the rule', () => {
    const before = [tool('a')].map((one) => ({ ...one }))
    const after = [tool('a', 'Changed.')]
    expect(checkNotes({ version: '1.1.0', tag: 'v1.0.0', before, after: before, notes: null }).failures).toEqual([])
    expect(checkNotes({ version: '1.1.0', tag: null, before: null, after, notes: null }).failures).toEqual([])
    expect(checkNotes({ version: '1.1.0', tag: 'v1.0.0', before: null, after, notes: null }).failures).toEqual([])
    expect(checkNotes({ version: '1.0.0', tag: 'v1.0.0', before, after, notes: null }).failures[0]).toContain('still 1.0.0')
    expect(checkNotes({ version: '1.1.0', tag: 'v1.0.0', before, after, notes: null }).failures[0]).toContain('no notes/1.1.0.md')
    expect(checkNotes({ version: '1.1.0', tag: 'v1.0.0', before, after, notes: '- **New.** Something.\n' }).failures[0]).toContain('For agents')
    expect(checkNotes({ version: '1.1.0', tag: 'v1.0.0', before, after, notes: '- **New.** Something.\n\nFor agents: `a` says more.\n' }).failures).toEqual([])
  })

  test('against a repository: the snapshot at the last tag, the notes of the version, and the bin', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'notes-'))
    const sh = (...args: string[]) => execFileSync('git', ['-C', dir, ...args], { stdio: 'ignore' })
    sh('init', '-q')
    sh('config', 'user.email', 't@example.com')
    sh('config', 'user.name', 'T')
    sh('config', 'commit.gpgsign', 'false')
    sh('config', 'tag.gpgsign', 'false')
    mkdirSync(join(dir, 'notes'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'm', version: '1.0.0' }))
    writeFileSync(join(dir, 'notes/tools.json'), JSON.stringify([tool('show_thing')]))
    sh('add', '.')
    sh('commit', '-q', '-m', 'one')
    sh('tag', 'v1.0.0')

    /* The door changes: from a list the module wrote, stored with --write. */
    const list = join(dir, 'tools-now.json')
    writeFileSync(list, JSON.stringify({ tools: [tool('show_thing', 'Shows a thing, and its parts.')] }))
    let check = await checkModuleNotes(dir, { tools: 'tools-now.json' })
    expect(check.failures.some((one) => one.includes('--write'))).toBe(true)
    check = await checkModuleNotes(dir, { tools: 'tools-now.json', write: true })
    expect(check.failures[0]).toContain('still 1.0.0')
    expect(snapshotOf(JSON.parse(readFileSync(join(dir, 'notes/tools.json'), 'utf8')))![0]!.description).toBe('Shows a thing, and its parts.')

    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'm', version: '1.1.0' }))
    writeFileSync(join(dir, 'notes/1.1.0.md'), '- **Parts.** A thing now shows its parts.\n')
    const bin = () => spawnSync('bun', [join(REPO, 'bin/check-notes.ts'), dir], { encoding: 'utf8' })
    expect(bin().status).toBe(1)
    writeFileSync(join(dir, 'notes/1.1.0.md'), '- **Parts.** A thing now shows its parts.\n\n## For agents\n\n- `show_thing` also returns the parts.\n')
    const passed = bin()
    expect(passed.status).toBe(0)
    expect(passed.stdout).toContain('says so to agents')
  })
})
