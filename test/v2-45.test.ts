import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { HOST_MESSAGES, MESSAGE, PACKAGE_VERSION, PROTOCOL, hostMessageSchema, visibleSchema } from '../src/index.js'
import { connect } from '../src/client/index.js'
import { hostStore } from '../src/client/host-store.js'
import type { MessageSource } from '../src/client/mailbox.js'

/**
 * 2.45.0: `kehikot.visible`, whether the host has a module's page on screen. A host keeps the pages
 * of kehikot the person left alive and hidden with CSS, which fires no `visibilitychange` inside the
 * frame; this message is how a page knows nobody is looking at it, and when the person is back.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')

describe('the version', () => {
  test('is 2.45.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.81.0')
    expect(PROTOCOL).toBe(2)
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.45.0')
  })
})

describe('kehikot.visible', () => {
  test('is a host message carrying a boolean', () => {
    expect(HOST_MESSAGES).toContain(MESSAGE.VISIBLE)
    for (const visible of [true, false]) {
      const message = { type: MESSAGE.VISIBLE, protocol: PROTOCOL, visible }
      expect(visibleSchema.parse(message)).toEqual(message)
      expect(hostMessageSchema.safeParse(message).success).toBe(true)
    }
  })

  test('refuses a missing or non-boolean visible', () => {
    for (const bad of [{}, { visible: 'yes' }, { visible: 1 }, { visible: null }]) {
      expect(visibleSchema.safeParse({ type: MESSAGE.VISIBLE, protocol: PROTOCOL, ...bad }).success).toBe(false)
    }
  })
})

function fakeWindow() {
  const listeners = new Set<(ev: MessageEvent) => void>()
  const source: MessageSource = {
    parent: {} as Window,
    addEventListener: (_type, fn) => void listeners.add(fn),
    removeEventListener: (_type, fn) => void listeners.delete(fn),
  }
  const deliver = (data: unknown, from: unknown) => {
    for (const fn of [...listeners]) fn({ data, origin: 'null', source: from } as unknown as MessageEvent)
  }
  return { source, deliver }
}
const host = { postMessage: () => {} }
const hello = { type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's1', context: { epic: 'a-epic', project: null, theme: 'light' } }
const visible = (on: boolean) => ({ type: MESSAGE.VISIBLE, protocol: PROTOCOL, visible: on })

describe('the client', () => {
  test('connect hands it to onVisible, from the window that greeted only', () => {
    const { source, deliver } = fakeWindow()
    const heard: boolean[] = []
    connect('kehikot.example', { onVisible: (on) => heard.push(on) }, { source }).listen()
    deliver(hello, host)
    deliver(visible(false), { postMessage: () => {} })
    deliver(visible(false), host)
    deliver(visible(true), host)
    expect(heard).toEqual([false, true])
  })

  test('at a page with no handler is silence, not an error', () => {
    const { source, deliver } = fakeWindow()
    connect('kehikot.example', {}, { source }).listen()
    deliver(hello, host)
    expect(() => deliver(visible(false), host)).not.toThrow()
  })

  test('hostStore keeps it as visible: true until a host says otherwise, and through a greeting', () => {
    const { source, deliver } = fakeWindow()
    const heard: boolean[] = []
    const store = hostStore('kehikot.example', { onVisible: (on) => heard.push(on) }, { source, applyTheme: false, reloadWhenStale: false })
    store.start()
    expect(store.get().visible).toBe(true)
    deliver(hello, host)
    expect(store.get().visible).toBe(true)
    deliver(visible(false), host)
    expect(store.get().visible).toBe(false)
    /* A new greeting does not pretend the page is shown: the host tells it again after it. */
    deliver(hello, host)
    expect(store.get().visible).toBe(false)
    deliver(visible(true), host)
    expect(store.get().visible).toBe(true)
    expect(heard).toEqual([false, true])
    store.stop()
  })
})
