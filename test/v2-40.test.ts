import { describe, expect, test } from 'bun:test'

import {
  LIMITS,
  MESSAGE,
  PACKAGE_VERSION,
  PROTOCOL,
  RUN_CARRIES,
  footerItemSchema,
  headerItemSchema,
  helloSchema,
  pressSchema,
  runOpenRefusal,
  sinceOf,
} from '../src/index.js'
import { connect, hostStore, type MessageSource } from '../src/client/index.js'

/**
 * 2.40.0: a run may ask the HOST to carry out a copy or an open itself, inside the person's click,
 * because a press relayed to the module's page has no user activation. The press still goes to the
 * module, saying what was carried (`carried`); the greeting says which acts a host carries (`carries`).
 */

describe('the version', () => {
  test('is 2.40.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.43.0')
    expect(PROTOCOL).toBe(2)
  })

  test('the wire pieces it adds say so', () => {
    for (const piece of ['run.copy', 'run.open', 'press.carried', 'hello.carries']) expect(sinceOf('wire', piece)).toBe('2.40.0')
    expect(RUN_CARRIES).toEqual(['copy', 'open'])
  })
})

describe('copy and open on a run', () => {
  test('a header run and a footer run take them', () => {
    const copy = { plain: 'a, b', html: '<a href="https://x.test/a">a</a>' }
    expect(headerItemSchema.parse({ kind: 'run', id: 'c', label: 'Copy', copy })).toMatchObject({ copy })
    expect(footerItemSchema.parse({ kind: 'run', id: 'o', label: 'Open', open: 'https://github.com/x/y/pull/1' })).toMatchObject({ open: 'https://github.com/x/y/pull/1' })
  })

  test('copy is capped, and plain is required', () => {
    const bad = (copy: unknown) => expect(headerItemSchema.safeParse({ kind: 'run', id: 'c', label: 'C', copy }).success).toBe(false)
    bad({ html: '<b>x</b>' })
    bad({ plain: '' })
    bad({ plain: 'x'.repeat(LIMITS.RUN_COPY_PLAIN + 1) })
    bad({ plain: 'x', html: 'x'.repeat(LIMITS.RUN_COPY_HTML + 1) })
    bad({ plain: 3 })
    expect(headerItemSchema.safeParse({ kind: 'run', id: 'c', label: 'C', copy: { plain: 'x'.repeat(LIMITS.RUN_COPY_PLAIN) } }).success).toBe(true)
  })

  test('open is https only, with a host, and no credentials', () => {
    expect(runOpenRefusal('https://example.com/a?b=1')).toBeNull()
    expect(runOpenRefusal('http://example.com/')).toBe('A run opens only https: addresses.')
    expect(runOpenRefusal('http://localhost:3000/')).toBe('A run opens only https: addresses.')
    expect(runOpenRefusal('javascript:alert(1)')).toBe('A run opens only https: addresses.')
    expect(runOpenRefusal('file:///etc/passwd')).toBe('A run opens only https: addresses.')
    expect(runOpenRefusal('https://user:pw@example.com/')).toContain('no user name or password')
    expect(runOpenRefusal('not a url')).toContain('not an address')
    expect(runOpenRefusal(`https://example.com/${'x'.repeat(LIMITS.URL)}`)).toContain('at most')
    expect(headerItemSchema.safeParse({ kind: 'run', id: 'o', label: 'O', open: 'http://example.com' }).success).toBe(false)
  })

  test('one act per run, a person’s click (never agents), and not beside full screen', () => {
    const bad = (item: Record<string, unknown>) => expect(headerItemSchema.safeParse({ kind: 'run', id: 'r', label: 'R', ...item }).success).toBe(false)
    bad({ copy: { plain: 'x' }, open: 'https://example.com' })
    bad({ copy: { plain: 'x' }, agents: true })
    bad({ open: 'https://example.com', agents: true })
    bad({ open: 'https://example.com', surface: 'fullscreen' })
    expect(footerItemSchema.safeParse({ kind: 'run', id: 'r', label: 'R', copy: { plain: 'x' }, agents: true }).success).toBe(false)
  })
})

describe('the press and the greeting', () => {
  test('a press may say what the host carried; the greeting which acts it carries', () => {
    expect(pressSchema.parse({ type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p', item: 'c', carried: 'copy' }).carried).toBe('copy')
    expect(pressSchema.safeParse({ type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p', item: 'c', carried: 'print' }).success).toBe(false)
    const hello = { type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's', context: { epic: null, project: null } }
    expect(helloSchema.parse({ ...hello, carries: ['copy', 'open'] }).carries).toEqual(['copy', 'open'])
    /* A name a later host knows is kept, not refused. */
    expect(helloSchema.parse({ ...hello, carries: ['copy', 'share'] }).carries).toEqual(['copy', 'share'])
    expect(helloSchema.parse(hello).carries).toBeUndefined()
  })
})

class Window {
  sent: unknown[] = []
  postMessage(message: unknown) {
    this.sent.push(message)
  }
}

function harness() {
  const listeners = new Set<(ev: MessageEvent) => void>()
  const source: MessageSource = {
    addEventListener: (_type, fn) => listeners.add(fn as (ev: MessageEvent) => void),
    removeEventListener: (_type, fn) => listeners.delete(fn as (ev: MessageEvent) => void),
  }
  const host = new Window()
  const deliver = (data: unknown) => {
    for (const fn of listeners) fn({ data, source: host, origin: 'http://localhost:4170' } as unknown as MessageEvent)
  }
  const hello = (carries?: string[]) =>
    deliver({ type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's', context: { epic: null, project: null }, footer: true, ...(carries ? { carries } : {}) })
  return { source, host, deliver, hello }
}

describe('the client', () => {
  test('onHello hears which acts the host carries; null from an older host', () => {
    const { source, hello } = harness()
    let facts: { carries?: readonly string[] | null } | undefined
    const conn = connect('kehikot.references', { onHello: (_c, _s, f) => (facts = f) }, { source })
    conn.listen()
    hello(['copy', 'open'])
    expect(facts?.carries).toEqual(['copy', 'open'])
    hello()
    expect(facts?.carries).toBeNull()
    conn.stop()
  })

  test('onPress hears what the host carried', async () => {
    const { source, deliver, hello } = harness()
    const pressed: unknown[] = []
    const conn = connect('kehikot.references', { onPress: (press) => void pressed.push(press) }, { source })
    conn.listen()
    hello(['copy'])
    conn.footer([{ kind: 'run', id: 'copy', label: 'Copy', copy: { plain: 'a' } }])
    deliver({ type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p1', item: 'copy', place: 'footer', carried: 'copy' })
    await Promise.resolve()
    expect(pressed).toEqual([{ item: 'copy', place: 'footer', carried: 'copy' }])
    conn.stop()
  })

  test('hostStore says hostCarries', () => {
    const { source, hello } = harness()
    const store = hostStore('kehikot.references', {}, { source, applyTheme: false, reloadWhenStale: false })
    store.start()
    expect(store.get().hostCarries).toBeNull()
    hello(['copy', 'open'])
    expect(store.get().hostCarries).toEqual(['copy', 'open'])
    store.stop()
  })
})
