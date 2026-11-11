import { describe, expect, test } from 'bun:test'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'

import {
  HOST_MESSAGES,
  LIMITS,
  MESSAGE,
  MODULE_MESSAGES,
  PACKAGE_VERSION,
  PAGE_ERRORS_MAX,
  hostMessageSchema,
  moduleMessageSchema,
  pageErrorSchema,
} from '../src/index.js'
import { connect, describeError, makeMailbox, makePageErrors, pageErrors, trimStack, type ErrorTarget } from '../src/client/index.js'
import { PAGE_FAILED, ReportErrors } from '../src/client/react.js'
import { errorsScript, pageDocument } from '../src/serve/index.js'
import { PAGE_ERRORS_GLOBAL } from '../src/page.js'

/**
 * 2.59.0: a page that fails says so. Every uncaught error and unhandled rejection on a module's page
 * goes to the host as `kehikot.page.error` — buffered until a greeting, and sent by the page
 * document's own script when the module's scripts never ran.
 */

/** A window to throw on: listeners by type, a parent that records what it is told. */
function fakeWindow() {
  const listeners = new Map<string, ((ev: unknown) => void)[]>()
  const told: { message: unknown; origin: string }[] = []
  const parent = { postMessage: (message: unknown, origin: string) => told.push({ message, origin }) } as unknown as Window
  const target = {
    parent,
    addEventListener(type: string, fn: (ev: unknown) => void) {
      listeners.set(type, [...(listeners.get(type) ?? []), fn])
    },
    removeEventListener() {},
  }
  const fire = (type: string, ev: unknown) => {
    for (const fn of listeners.get(type) ?? []) fn(ev)
  }
  return { target, parent, told, fire }
}

const hello = (source: unknown, origin = 'http://127.0.0.1:4170') => ({
  data: { type: MESSAGE.HELLO, protocol: 2, session: 's', context: { epic: null }, state: null },
  origin,
  source,
})

describe('the version', () => {
  test('is 2.59.0', () => {
    expect(PACKAGE_VERSION).toBe('2.81.0')
  })
})

describe('kehikot.page.error on the wire', () => {
  test('is a module message, and only that', () => {
    expect(MESSAGE.PAGE_ERROR).toBe('kehikot.page.error')
    expect(MODULE_MESSAGES as readonly string[]).toContain(MESSAGE.PAGE_ERROR)
    expect(HOST_MESSAGES as readonly string[]).not.toContain(MESSAGE.PAGE_ERROR)
    const sent = { type: MESSAGE.PAGE_ERROR, message: 'TypeError: x is undefined', where: 'error', stack: 'at a.ts:1' }
    expect(moduleMessageSchema.parse(sent)).toEqual(sent)
    expect(hostMessageSchema.safeParse(sent).success).toBe(false)
  })

  test('cuts long text rather than refusing it, and needs a message', () => {
    const long = pageErrorSchema.parse({ type: MESSAGE.PAGE_ERROR, message: 'm'.repeat(5000), stack: 's'.repeat(9000), where: 'w'.repeat(99) })
    expect(long.message.length).toBe(LIMITS.PAGE_ERROR_MESSAGE)
    expect(long.stack.length).toBe(LIMITS.PAGE_ERROR_STACK)
    expect(long.where.length).toBe(LIMITS.PAGE_ERROR_WHERE)
    expect(pageErrorSchema.parse({ type: MESSAGE.PAGE_ERROR, message: 'x' })).toEqual({ type: MESSAGE.PAGE_ERROR, message: 'x', where: 'error', stack: '' })
    expect(pageErrorSchema.safeParse({ type: MESSAGE.PAGE_ERROR, message: '' }).success).toBe(false)
  })
})

describe('describeError and trimStack', () => {
  test('an error is its name and message, with its stack', () => {
    const error = new TypeError('cannot read x')
    const said = describeError(error)
    expect(said.message).toBe('TypeError: cannot read x')
    expect(said.stack).toContain('cannot read x')
  })

  test('anything else is readable, and nothing is a fallback', () => {
    expect(describeError('plain').message).toBe('plain')
    expect(describeError({ code: 7 }).message).toBe('{"code":7}')
    expect(describeError(undefined, 'nothing').message).toBe('nothing')
  })

  test('a stack keeps its first lines', () => {
    const stack = Array.from({ length: 40 }, (_, i) => `at line ${i}`).join('\n')
    expect(trimStack(stack).split('\n')).toHaveLength(12)
  })
})

describe('the page reporter', () => {
  test('keeps what failed before a greeting, and says it to the window that greets', () => {
    const page = fakeWindow()
    const errors = makePageErrors(page.target as unknown as ErrorTarget, { origins: () => null, self: () => ({}) })
    page.fire('error', { error: new TypeError('boom'), message: 'Uncaught TypeError: boom' })
    page.fire('unhandledrejection', { reason: new Error('no settings') })
    expect(page.told).toHaveLength(0)

    errors.heard(hello(page.parent))
    expect(page.told.map((one) => one.message)).toEqual([
      expect.objectContaining({ type: MESSAGE.PAGE_ERROR, message: 'TypeError: boom', where: 'error' }),
      expect.objectContaining({ type: MESSAGE.PAGE_ERROR, message: 'Error: no settings', where: 'rejection' }),
    ])
    expect(page.told[0]?.origin).toBe('http://127.0.0.1:4170')
    for (const one of page.told) expect(moduleMessageSchema.safeParse(one.message).success).toBe(true)

    /* After the greeting, at once. */
    page.fire('error', { error: new Error('later') })
    expect(page.told).toHaveLength(3)
  })

  test('says each failure once, and at most PAGE_ERRORS_MAX of them', () => {
    const page = fakeWindow()
    const errors = makePageErrors(page.target as unknown as ErrorTarget, { origins: () => null, self: () => ({}) })
    errors.heard(hello(page.parent))
    for (let i = 0; i < 3; i += 1) page.fire('error', { error: new Error('same') })
    expect(page.told).toHaveLength(1)
    for (let i = 0; i < 20; i += 1) page.fire('error', { error: new Error(`different ${i}`) })
    expect(page.told).toHaveLength(PAGE_ERRORS_MAX)
  })

  test('a script error with no error object says the message and where', () => {
    const page = fakeWindow()
    const errors = makePageErrors(page.target as unknown as ErrorTarget, { origins: () => null, self: () => ({}) })
    page.fire('error', { error: null, message: 'Script error.', filename: 'http://x/app.js', lineno: 3, colno: 9 })
    expect(errors.caught()[0]?.message).toBe('Script error. (http://x/app.js:3:9)')
  })

  test('a greeting from an origin the page may not be framed by is told nothing', () => {
    const page = fakeWindow()
    const errors = makePageErrors(page.target as unknown as ErrorTarget, { origins: () => ['http://127.0.0.1:4170'], self: () => ({}) })
    page.fire('error', { error: new Error('boom') })
    errors.heard(hello(page.parent, 'https://elsewhere.example'))
    expect(page.told).toHaveLength(0)
    errors.heard(hello(page.parent))
    expect(page.told).toHaveLength(1)
  })

  test('takes over what the page document caught, and switches it off', () => {
    const page = fakeWindow()
    const early = { list: [{ type: MESSAGE.PAGE_ERROR, message: 'SyntaxError: no export named x', where: 'error', stack: '' }], off: false }
    ;(page.target as unknown as Record<string, unknown>)[PAGE_ERRORS_GLOBAL] = early
    const errors = makePageErrors(page.target as unknown as ErrorTarget, { origins: () => null, self: () => ({}) })
    expect(early.off).toBe(true)
    expect(errors.caught().map((one) => one.message)).toEqual(['SyntaxError: no export named x'])
  })

  test('a greeting handler that throws is said as `greeting`, after ready', () => {
    const page = fakeWindow()
    const source = makeMailbox(page.target as never)
    const before = pageErrors.caught().length
    const original = console.error
    console.error = () => {}
    try {
      connect('example.thing', {
        onHello: () => {
          throw new TypeError('settings is undefined')
        },
      }, { source, origins: [] as string[], pointerTarget: false }).listen()
      page.fire('message', hello(page.parent, ''))
    } finally {
      console.error = original
    }
    expect(page.told.map((one) => (one.message as { type: string }).type)).toContain(MESSAGE.READY)
    const said = pageErrors.caught().slice(before)
    expect(said).toEqual([expect.objectContaining({ message: 'TypeError: settings is undefined', where: 'greeting' })])
  })
})

describe('the page document says it failed when nothing else can', () => {
  test('pageDocument carries the blocking script ahead of the module', () => {
    const page = pageDocument({ title: 'T' })
    expect(page).toContain(errorsScript())
    expect(page.indexOf(errorsScript())).toBeLessThan(page.indexOf('type="module"'))
  })

  test('the script keeps errors and answers the parent’s greeting with them', () => {
    const page = fakeWindow()
    const w = { ...page.target } as Record<string, unknown>
    /* The script reads `window`; give it this one. */
    new Function('window', errorsScript())(w)
    const g = w[PAGE_ERRORS_GLOBAL] as { list: unknown[]; off: boolean }
    expect(g.list).toEqual([])

    page.fire('error', { error: new SyntaxError("The requested module './x.js' does not provide an export named 'y'"), message: 'x' })
    page.fire('error', { error: new SyntaxError("The requested module './x.js' does not provide an export named 'y'"), message: 'x' })
    page.fire('unhandledrejection', { reason: undefined })
    expect(g.list).toHaveLength(2)

    /* Not the parent: nothing. */
    page.fire('message', hello({ postMessage() {} }))
    expect(page.told).toHaveLength(0)
    page.fire('message', hello(page.parent))
    expect(page.told.map((one) => one.message)).toEqual([
      { type: MESSAGE.PAGE_ERROR, message: "SyntaxError: The requested module './x.js' does not provide an export named 'y'", where: 'error', stack: expect.any(String) },
      { type: MESSAGE.PAGE_ERROR, message: 'A promise was rejected with nothing.', where: 'rejection', stack: '' },
    ])
    for (const one of page.told) expect(moduleMessageSchema.safeParse(one.message).success).toBe(true)

    /* Switched off by the client: says nothing more. */
    g.off = true
    page.fire('error', { error: new Error('after') })
    expect(g.list).toHaveLength(2)
  })
})

describe('ReportErrors', () => {
  test('a render that throws is said as `render` and drawn as text', () => {
    function Broken(): never {
      throw new TypeError('session.title is undefined')
    }
    const before = pageErrors.caught().length
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const original = console.error
    console.error = () => {}
    try {
      act(() => root.render(createElement(ReportErrors, null, createElement(Broken))))
    } finally {
      console.error = original
    }
    expect(host.textContent).toContain(PAGE_FAILED)
    expect(host.textContent).toContain('TypeError: session.title is undefined')
    const said = pageErrors.caught().slice(before)
    expect(said).toEqual([expect.objectContaining({ message: 'TypeError: session.title is undefined', where: 'render' })])
    expect(said[0]?.stack).toContain('Broken')
    act(() => root.unmount())
    host.remove()
  })
})
