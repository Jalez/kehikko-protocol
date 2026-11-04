import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { MESSAGE, PACKAGE_VERSION, PROTOCOL } from '../src/index.js'
import { POINTER_SLOP_PX, connect, type PointerEventLike, type PointerTarget } from '../src/client/connect.js'
import type { MessageSource } from '../src/client/mailbox.js'

/**
 * 2.50.1: a press held still is not ended by the browser taking it (`pointercancel` on a mouse press
 * that has not moved, which WebKit fires for a press held on text), and a press that moves past
 * `POINTER_SLOP_PX` is a drag, told as `cancel` at once.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')

describe('the version', () => {
  test('is current, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.51.0')
    expect(PROTOCOL).toBe(2)
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.50.1')
  })
})

function connected() {
  const listeners = new Set<(ev: MessageEvent) => void>()
  const source: MessageSource = {
    parent: {} as Window,
    addEventListener: (_type, fn) => void listeners.add(fn),
    removeEventListener: (_type, fn) => void listeners.delete(fn),
  }
  const on = new Map<string, Set<(event: PointerEventLike) => void>>()
  const target: PointerTarget = {
    addEventListener: (type, fn) => void (on.get(type) ?? on.set(type, new Set()).get(type)!).add(fn),
    removeEventListener: (type, fn) => void on.get(type)?.delete(fn),
  }
  const fire = (type: string, event: PointerEventLike = {}) => {
    for (const fn of [...(on.get(type) ?? [])]) fn({ button: 0, isPrimary: true, ...event })
  }
  const sent: { type: string; phase?: string }[] = []
  const host = { postMessage: (message: { type: string }) => void sent.push(message) }
  connect('kehikot.example', {}, { source, pointerTarget: target }).listen()
  const hello = { type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's1', context: { epic: null, project: null, theme: 'light' }, pointer: true }
  for (const fn of [...listeners]) fn({ data: hello, origin: 'null', source: host } as unknown as MessageEvent)
  const phases = () => sent.filter((one) => one.type === MESSAGE.POINTER).map((one) => one.phase)
  return { fire, phases }
}

describe('a mouse press held still', () => {
  test('is not ended by the browser cancelling it; the button coming up ends it', () => {
    for (const ending of ['pointerup', 'mouseup', 'dragend']) {
      const { fire, phases } = connected()
      fire('pointerdown', { clientX: 10, clientY: 10, pointerType: 'mouse' })
      fire('pointermove', { clientX: 12, clientY: 13 })
      fire('pointercancel', { pointerType: 'mouse' })
      expect(phases()).toEqual(['down'])
      fire(ending)
      expect(phases()).toEqual(['down', 'up'])
      /* Only once: the mouse event after a pointerup says nothing more. */
      fire('mouseup')
      fire('dragend')
      expect(phases()).toEqual(['down', 'up'])
    }
  })

  test('a press that moves past the slop is a drag, told as cancel at once, and its release says nothing', () => {
    const { fire, phases } = connected()
    fire('pointerdown', { clientX: 0, clientY: 0, pointerType: 'mouse' })
    fire('pointermove', { clientX: POINTER_SLOP_PX, clientY: 0 })
    expect(phases()).toEqual(['down'])
    fire('pointermove', { clientX: POINTER_SLOP_PX + 1, clientY: 0 })
    fire('pointermove', { clientX: 40, clientY: 0 })
    expect(phases()).toEqual(['down', 'cancel'])
    fire('pointerup')
    expect(phases()).toEqual(['down', 'cancel', 'up'])
  })

  test('a touch cancelled is the browser scrolling: a cancel, as before', () => {
    const { fire, phases } = connected()
    fire('pointerdown', { clientX: 0, clientY: 0, pointerType: 'touch' })
    fire('pointercancel', { pointerType: 'touch' })
    expect(phases()).toEqual(['down', 'cancel'])
  })

  test('a move with no press, or from another pointer, says nothing', () => {
    const { fire, phases } = connected()
    fire('pointermove', { clientX: 100, clientY: 100 })
    fire('pointerdown', { clientX: 0, clientY: 0 })
    fire('pointermove', { clientX: 100, clientY: 100, isPrimary: false })
    expect(phases()).toEqual(['down'])
  })
})
