import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { MESSAGE, MODULE_MESSAGES, PACKAGE_VERSION, POINTER_PHASES, PROTOCOL, helloSchema, moduleMessageSchema, pointerSchema } from '../src/index.js'
import { connect, type PointerTarget } from '../src/client/connect.js'
import type { MessageSource } from '../src/client/mailbox.js'

/**
 * 2.49.0: `kehikot.pointer`, the person's presses inside a page, told to a host that asked
 * (`hello.pointer`). A press inside a framed page moves no focus when the page already has it, so a
 * host cannot see a click (or a held press) inside a container without the page saying so.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')

describe('the version', () => {
  test('is current, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.57.0')
    expect(PROTOCOL).toBe(2)
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.49.0')
  })
})

describe('kehikot.pointer', () => {
  test('is a module message with a phase and the page\'s time', () => {
    expect(MODULE_MESSAGES).toContain(MESSAGE.POINTER)
    expect([...POINTER_PHASES]).toEqual(['down', 'up', 'cancel'])
    for (const phase of POINTER_PHASES) {
      const message = { type: MESSAGE.POINTER, phase, at: 1234.5 }
      expect(pointerSchema.parse(message)).toEqual(message)
      expect(moduleMessageSchema.safeParse(message).success).toBe(true)
    }
  })

  test('refuses another phase, a negative or missing time', () => {
    for (const bad of [{ phase: 'move', at: 1 }, { phase: 'down', at: -1 }, { phase: 'down' }, { phase: 'down', at: Number.NaN }]) {
      expect(pointerSchema.safeParse({ type: MESSAGE.POINTER, ...bad }).success).toBe(false)
    }
  })

  test('hello.pointer is optional, and a boolean', () => {
    const hello = { type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's', context: { epic: null, project: null, theme: 'light' } }
    expect(helloSchema.parse(hello).pointer).toBeUndefined()
    expect(helloSchema.parse({ ...hello, pointer: true }).pointer).toBe(true)
    expect(helloSchema.safeParse({ ...hello, pointer: 'yes' }).success).toBe(false)
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

function fakeTarget() {
  const on = new Map<string, Set<(event: { button?: number; isPrimary?: boolean }) => void>>()
  const target: PointerTarget = {
    addEventListener: (type, fn) => void (on.get(type) ?? on.set(type, new Set()).get(type)!).add(fn),
    removeEventListener: (type, fn) => void on.get(type)?.delete(fn),
  }
  const fire = (type: string, event: { button?: number; isPrimary?: boolean } = { button: 0, isPrimary: true }) => {
    for (const fn of [...(on.get(type) ?? [])]) fn(event)
  }
  const count = () => [...on.values()].reduce((n, set) => n + set.size, 0)
  return { target, fire, count }
}

const hello = (pointer?: boolean) => ({
  type: MESSAGE.HELLO,
  protocol: PROTOCOL,
  session: 's1',
  context: { epic: 'a-epic', project: null, theme: 'light' },
  ...(pointer === undefined ? {} : { pointer }),
})

describe('the client', () => {
  function connected() {
    const { source, deliver } = fakeWindow()
    const { target, fire, count } = fakeTarget()
    const sent: { type: string; phase?: string; at?: number }[] = []
    const host = { postMessage: (message: { type: string }) => void sent.push(message) }
    const connection = connect('kehikot.example', {}, { source, pointerTarget: target }).listen()
    const pointers = () => sent.filter((one) => one.type === MESSAGE.POINTER)
    return { deliver, fire, count, host, connection, pointers }
  }

  test('says nothing to a host that did not ask, and does not listen', () => {
    const { deliver, fire, count, host, pointers } = connected()
    deliver(hello(), host)
    fire('pointerdown')
    expect(pointers()).toEqual([])
    expect(count()).toBe(0)
  })

  test('tells a host that asked: down and up of the primary button, with the page\'s time; not a right click', () => {
    const { deliver, fire, host, pointers } = connected()
    deliver(hello(true), host)
    fire('pointerdown')
    fire('pointerdown', { button: 2, isPrimary: true })
    fire('pointerup')
    fire('pointercancel')
    expect(pointers().map((one) => one.phase)).toEqual(['down', 'up', 'cancel'])
    const [down, up] = pointers()
    expect(typeof down!.at).toBe('number')
    expect(up!.at!).toBeGreaterThanOrEqual(down!.at!)
    for (const one of pointers()) expect(pointerSchema.safeParse(one).success).toBe(true)
  })

  test('listens once across greetings, stops when a greeting no longer asks, and on stop', () => {
    const { deliver, count, host, connection } = connected()
    deliver(hello(true), host)
    deliver(hello(true), host)
    expect(count()).toBe(7)
    deliver(hello(false), host)
    expect(count()).toBe(0)
    deliver(hello(true), host)
    expect(count()).toBe(7)
    connection.stop()
    expect(count()).toBe(0)
  })

  test('pointerTarget: false sends none even to a host that asked', () => {
    const { source, deliver } = fakeWindow()
    const sent: { type: string }[] = []
    const host = { postMessage: (message: { type: string }) => void sent.push(message) }
    connect('kehikot.example', {}, { source, pointerTarget: false }).listen()
    deliver(hello(true), host)
    expect(sent.some((one) => one.type === MESSAGE.POINTER)).toBe(false)
  })
})
