import { describe, expect, test } from 'bun:test'

import { LIMITS, MESSAGE, MODULE_MESSAGES, PROTOCOL, moduleMessageSchema, refusedSchema } from '../src/index.js'
import { connect, type MessageSource } from '../src/client/index.js'

/**
 * 2.93.0. A page that will not answer a window says so, instead of silence.
 *
 * A greeting from an origin the page was not told it may be framed by was dropped without a word
 * (`mayGreet`). From the host's side that is a page which loaded every script and then said
 * nothing — which a host could only call a broken module.
 */

const ID = 'kehikot.example'

function frame() {
  const listeners = new Set<(ev: MessageEvent) => void>()
  const source: MessageSource = {
    parent: {} as Window,
    addEventListener: (_type, fn) => {
      listeners.add(fn)
    },
    removeEventListener: (_type, fn) => {
      listeners.delete(fn)
    },
  }
  const deliver = (ev: { data: unknown; origin?: string; source?: unknown }) => {
    for (const fn of [...listeners]) fn(ev as unknown as MessageEvent)
  }
  return { source, deliver }
}

function windowAt() {
  const said: unknown[] = []
  const to: string[] = []
  return {
    postMessage: (message: unknown, targetOrigin: string) => {
      said.push(message)
      to.push(targetOrigin)
    },
    said,
    to,
  }
}

const hello = (from: unknown, origin: string) => ({
  data: { type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's1', context: { epic: null, project: null, theme: 'light' } },
  origin,
  source: from,
})

describe('a greeting from a window the page may not be framed by', () => {
  test('is told why — its origin and the allowed ones — to that window only, and nothing else', () => {
    const { source, deliver } = frame()
    const stranger = windowAt()
    const live = connect(ID, {}, { source, origins: ['http://127.0.0.1:4170'] })
    live.listen()
    deliver(hello(stranger, 'http://127.0.0.1:9999'))
    expect(stranger.said).toEqual([{ type: MESSAGE.REFUSED, origin: 'http://127.0.0.1:9999', allowed: ['http://127.0.0.1:4170'] }])
    expect(stranger.to).toEqual(['http://127.0.0.1:9999'])
    /* Not a ready: the refusal is the whole answer. */
    expect(stranger.said.some((one) => (one as { type: string }).type === MESSAGE.READY)).toBe(false)
    live.stop()
  })

  test('a window on the list is answered as before, and never told of a refusal', () => {
    const { source, deliver } = frame()
    const host = windowAt()
    const live = connect(ID, {}, { source, origins: ['http://127.0.0.1:4170'] })
    live.listen()
    deliver(hello(host, 'http://127.0.0.1:4170'))
    expect((host.said[0] as { type: string }).type).toBe(MESSAGE.READY)
    expect(host.said.some((one) => (one as { type: string }).type === MESSAGE.REFUSED)).toBe(false)
    live.stop()
  })
})

describe('the refusal on the wire', () => {
  test('is a module message, and a host reads it', () => {
    expect(MODULE_MESSAGES).toContain(MESSAGE.REFUSED)
    const read = moduleMessageSchema.safeParse({ type: MESSAGE.REFUSED, origin: 'http://127.0.0.1:9999', allowed: ['tauri://localhost'] })
    expect(read.success).toBe(true)
  })

  test('long text is cut and a long list is shortened, never refused', () => {
    const read = refusedSchema.parse({
      type: MESSAGE.REFUSED,
      origin: `http://${'a'.repeat(400)}`,
      allowed: Array.from({ length: 40 }, (_, i) => `http://127.0.0.1:${4000 + i}`),
    })
    expect(read.origin.length).toBe(LIMITS.REFUSED_ORIGIN)
    expect(read.allowed).toHaveLength(LIMITS.REFUSED_ALLOWED)
  })
})
