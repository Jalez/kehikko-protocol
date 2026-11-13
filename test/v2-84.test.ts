import { describe, expect, test } from 'bun:test'
import { act, createElement, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import {
  HOLD_COVER_MS,
  LIMITS,
  LOADING_COVER_AFTER_MS,
  MESSAGE,
  MODULE_MESSAGES,
  PACKAGE_VERSION,
  PROTOCOL,
  loadingSchema,
  moduleMessageSchema,
  readySchema,
  sinceOf,
} from '../src/index.js'
import { connect, hostStore, makeMailbox } from '../src/client/index.js'
import { useDrawn, useHost } from '../src/client/react.js'

/**
 * 2.84.0: a page that redraws for a new context and waits on something says `kehikot.loading`, with
 * its own words, and `kehikot.drawn` when it is drawn; the host covers it only when the second did not
 * follow within `LOADING_COVER_AFTER_MS`. A page that redraws at once says nothing.
 */

const ID = 'kehikot.example'
const wait = (ms: number) => new Promise((done) => setTimeout(done, ms))

describe('the version', () => {
  test('is 2.84.0, PROTOCOL is still 2, and the entry declares its kind', () => {
    expect(PACKAGE_VERSION).toBe('2.96.0')
    expect(PROTOCOL).toBe(2)
    const log = readFileSync(join(resolve(dirname(new URL(import.meta.url).pathname), '..'), 'CHANGELOG.md'), 'utf8')
    expect(log).toMatch(/## 2\.84\.0 — \d{4}-\d{2}-\d{2}\n\nKind: feature\n/)
  })
})

type Said = { type: string; hold?: boolean; label?: string }

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

const on = (epic: string | null) => ({ epic, project: 'P', theme: 'light', kehikko: { id: 1, name: 'K1' } })
const hello = (epic: string | null = null) => ({ type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's1', state: null, context: on(epic) })
const context = (epic: string) => ({ type: MESSAGE.CONTEXT, protocol: PROTOCOL, ...on(epic) })
const of = (host: ReturnType<typeof speaker>, type: string) => host.said.filter((one) => one.type === type)

describe('the shapes', () => {
  test('kehikot.loading, ready.label and the two waits', () => {
    expect(MODULE_MESSAGES).toContain(MESSAGE.LOADING)
    expect(MESSAGE.LOADING).toBe('kehikot.loading')
    expect(loadingSchema.parse({ type: MESSAGE.LOADING })).toEqual({ type: MESSAGE.LOADING })
    expect(loadingSchema.parse({ type: MESSAGE.LOADING, label: ' Loading the journey… ' }).label).toBe('Loading the journey…')
    expect(moduleMessageSchema.safeParse({ type: MESSAGE.LOADING, label: 'Loading content…' }).success).toBe(true)
    /* Words out of shape are dropped, never the message. */
    expect(loadingSchema.parse({ type: MESSAGE.LOADING, label: 'x'.repeat(LIMITS.LOADING_LABEL + 1) }).label).toBeUndefined()
    expect(loadingSchema.parse({ type: MESSAGE.LOADING, label: 7 }).label).toBeUndefined()
    expect(readySchema.parse({ type: MESSAGE.READY, id: ID, hold: true, label: 'Loading notes…' }).label).toBe('Loading notes…')
    expect(readySchema.parse({ type: MESSAGE.READY, id: ID, hold: true, label: '' }).label).toBeUndefined()
    expect(sinceOf('wire', 'kehikot.loading')).toBe('2.84.0')
    expect(sinceOf('wire', 'ready.label')).toBe('2.84.0')
    expect(LOADING_COVER_AFTER_MS).toBe(150)
    expect(LOADING_COVER_AFTER_MS).toBeLessThan(HOLD_COVER_MS)
  })
})

describe('loading(), on the connection', () => {
  test('after a context: loading with the words, then drawn on ready()', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const conn = connect(ID, {}, { source: box, pointerTarget: false, findKeys: false })
    conn.listen()
    post(hello())
    conn.ready()
    post(context('auth'))
    conn.loading('Loading the journey…')
    expect(of(host, MESSAGE.LOADING)).toEqual([{ type: MESSAGE.LOADING, label: 'Loading the journey…' }])
    expect(of(host, MESSAGE.DRAWN)).toHaveLength(1)
    conn.ready()
    expect(of(host, MESSAGE.DRAWN)).toHaveLength(2)
    /* Said once: a second ready() for the same drawing says nothing. */
    conn.ready()
    expect(of(host, MESSAGE.DRAWN)).toHaveLength(2)
    conn.stop()
  })

  test('a page that redraws at once says nothing at all', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const conn = connect(ID, {}, { source: box, pointerTarget: false, findKeys: false })
    conn.listen()
    post(hello())
    conn.ready()
    const before = host.said.length
    post(context('auth'))
    post(context('billing'))
    expect(host.said.length).toBe(before)
    conn.stop()
  })

  test('without a context to draw, loading() is the page\'s own business and is not sent', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const conn = connect(ID, {}, { source: box, pointerTarget: false, findKeys: false })
    conn.listen()
    post(hello())
    conn.ready()
    conn.loading('Loading…')
    expect(of(host, MESSAGE.LOADING)).toHaveLength(0)
    /* A context the page already said it drew does not open the door either. */
    post(context('auth'))
    conn.ready()
    conn.loading('Loading…')
    expect(of(host, MESSAGE.LOADING)).toHaveLength(0)
    conn.stop()
  })

  test('the wait passes by itself: drawn is said after holdCover', async () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const conn = connect(ID, {}, { source: box, pointerTarget: false, findKeys: false, holdCover: 30 })
    conn.listen()
    post(hello())
    conn.ready()
    post(context('auth'))
    conn.loading()
    expect(of(host, MESSAGE.LOADING)).toEqual([{ type: MESSAGE.LOADING }])
    await wait(60)
    expect(of(host, MESSAGE.DRAWN)).toHaveLength(2)
    conn.stop()
  })

  test('before the greeting, the words go with the held ready; while held, only the words change', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const conn = connect(ID, {}, { source: box, pointerTarget: false, findKeys: false })
    conn.listen()
    conn.loading('Loading notes…')
    post(hello())
    expect(host.said[0]).toMatchObject({ type: MESSAGE.READY, hold: true, label: 'Loading notes…' })
    conn.loading('Loading the notes of auth…')
    expect(of(host, MESSAGE.LOADING)).toEqual([{ type: MESSAGE.LOADING, label: 'Loading the notes of auth…' }])
    conn.ready()
    expect(of(host, MESSAGE.DRAWN)).toHaveLength(1)
    conn.stop()
  })

  test('holdCover: false never sends it', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const conn = connect(ID, {}, { source: box, pointerTarget: false, findKeys: false, holdCover: false })
    conn.listen()
    post(hello())
    post(context('auth'))
    conn.loading('Loading…')
    expect(of(host, MESSAGE.LOADING)).toHaveLength(0)
    expect(host.said[0]).toEqual({ type: MESSAGE.READY, id: ID, protocol: PROTOCOL })
    conn.stop()
  })

  test('long words are cut to the limit on the way out', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const conn = connect(ID, {}, { source: box, pointerTarget: false, findKeys: false })
    conn.listen()
    post(hello())
    conn.ready()
    post(context('auth'))
    conn.loading('y'.repeat(200))
    expect(of(host, MESSAGE.LOADING)[0]?.label?.length).toBe(LIMITS.LOADING_LABEL)
    conn.stop()
  })

  test('hostStore says it through the connection', () => {
    const host = speaker()
    const { box, post } = inbox(host)
    const store = hostStore(ID, {}, { source: box, grace: 0, reloadWhenStale: false, pointerTarget: false, findKeys: false }).start()
    post(hello())
    store.ready()
    post(context('auth'))
    store.loading('Loading content…')
    expect(of(host, MESSAGE.LOADING)).toEqual([{ type: MESSAGE.LOADING, label: 'Loading content…' }])
    store.stop()
  })
})

describe('useDrawn', () => {
  test('a page whose "drawn" goes false for a new epic says loading, and drawn when it is back', async () => {
    const host = speaker()
    const { box, post } = inbox(host)
    let setDrawn: (drawn: boolean) => void = () => {}
    function Page() {
      const kehikot = useHost(ID, {}, { source: box, grace: 0, reloadWhenStale: false, pointerTarget: false, findKeys: false, keepView: false })
      const [drawn, set] = useState(false)
      setDrawn = set
      useDrawn(kehikot, drawn, 'Loading the journey…')
      return null
    }
    const element = document.createElement('div')
    const root = createRoot(element)
    await act(async () => root.render(createElement(Page)))
    await act(async () => post(hello()))
    /* The first greeting is held with the page's words. */
    expect(host.said.find((one) => one.type === MESSAGE.READY)).toMatchObject({ hold: true, label: 'Loading the journey…' })
    await act(async () => setDrawn(true))
    expect(of(host, MESSAGE.DRAWN)).toHaveLength(1)
    /* A new epic, and the page reads it. */
    await act(async () => post(context('auth')))
    await act(async () => setDrawn(false))
    expect(of(host, MESSAGE.LOADING)).toEqual([{ type: MESSAGE.LOADING, label: 'Loading the journey…' }])
    await act(async () => setDrawn(true))
    expect(of(host, MESSAGE.DRAWN)).toHaveLength(2)
    /* A context the page draws at once: nothing. */
    const before = host.said.length
    await act(async () => post(context('billing')))
    expect(host.said.length).toBe(before)
    await act(async () => root.unmount())
  })
})
