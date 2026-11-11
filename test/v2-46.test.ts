import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import {
  FOOTER_KINDS,
  FOOTER_KINDS_2_38,
  LIMITS,
  MESSAGE,
  PACKAGE_VERSION,
  PROTOCOL,
  footerDraws,
  footerItemSchema,
  footerItemsSchema,
  footerLayout,
  footerPressRefusal,
  footerSchema,
  helloSchema,
  hostMessageSchema,
  inputFooterItem,
  pressSchema,
  pressableFooterItem,
  sinceOf,
  type FooterItem,
} from '../src/index.js'
import { connect, hostStore, type MessageSource } from '../src/client/index.js'

/**
 * 2.46.0: a footer field (`kind: 'input'`), one line the person types into. Enter sends
 * `kehikot.press` with `place: 'footer'` and the typed `text`; `hello.footerKinds` says which footer
 * kinds a host draws, so a module never sends a field to a host that would refuse the whole row.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')
const dirs: string[] = []
let old: Record<string, any> | null = null
beforeAll(async () => {
  try {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'kehikot-v246-')))
    dirs.push(dir)
    execFileSync('sh', ['-c', `git -C "${REPO}" archive v2.45.0 | tar -x -C "${dir}"`], { stdio: 'ignore' })
    symlinkSync(join(REPO, 'node_modules'), join(dir, 'node_modules'))
    old = await import(join(dir, 'src/index.ts'))
  } catch {
    console.warn('v2.45.0 is not available here: its compatibility check is skipped')
  }
})
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

/* A page viewer's footer: back, the address, reload. */
const viewer = [
  { kind: 'run', id: 'back', label: 'Back', icon: 'arrow-left' },
  { kind: 'input', id: 'address', label: 'Address', value: 'https://example.com/', placeholder: 'Type an address', grow: true },
  { kind: 'run', id: 'reload', label: 'Reload', icon: 'refresh', align: 'end' },
] as const

const items = (): FooterItem[] => footerSchema.parse({ type: MESSAGE.FOOTER, items: viewer }).items

describe('the version', () => {
  test('is 2.46.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.78.0')
    expect(PROTOCOL).toBe(2)
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.46.0')
  })

  test('the wire pieces it adds say so', () => {
    expect(sinceOf('wire', 'footer.input')).toBe('2.46.0')
    expect(sinceOf('wire', 'press.text')).toBe('2.46.0')
    expect(sinceOf('wire', 'hello.footerKinds')).toBe('2.46.0')
  })
})

describe('the input kind', () => {
  test('is a footer kind, and not one of the 2.38.0 ones', () => {
    expect(FOOTER_KINDS).toContain('input')
    expect(FOOTER_KINDS_2_38 as readonly string[]).not.toContain('input')
    expect(FOOTER_KINDS.filter((kind) => kind !== 'input')).toEqual([...FOOTER_KINDS_2_38])
  })

  test('parses with its defaults filled in', () => {
    const field = footerItemSchema.parse({ kind: 'input', id: 'q', label: 'Search' })
    expect(field).toEqual({ kind: 'input', id: 'q', label: 'Search', value: '', grow: false, agents: false, align: 'start', optional: false })
    expect(inputFooterItem(field)).toBe(true)
    expect(pressableFooterItem(field)).toBe(false)
    const address = items()[1]!
    expect(address).toMatchObject({ kind: 'input', value: 'https://example.com/', placeholder: 'Type an address', grow: true })
  })

  test('needs a label, and keeps to its limits', () => {
    expect(footerItemSchema.safeParse({ kind: 'input', id: 'q' }).success).toBe(false)
    expect(footerItemSchema.safeParse({ kind: 'input', id: 'q', label: '' }).success).toBe(false)
    expect(footerItemSchema.safeParse({ kind: 'input', id: 'q', label: 'Q', value: 'x'.repeat(LIMITS.FOOTER_INPUT) }).success).toBe(true)
    expect(footerItemSchema.safeParse({ kind: 'input', id: 'q', label: 'Q', value: 'x'.repeat(LIMITS.FOOTER_INPUT + 1) }).success).toBe(false)
    expect(footerItemSchema.safeParse({ kind: 'input', id: 'q', label: 'Q', placeholder: '' }).success).toBe(false)
    expect(footerItemSchema.safeParse({ kind: 'input', id: 'q', label: 'Q', placeholder: 'x'.repeat(LIMITS.FOOTER_PLACEHOLDER + 1) }).success).toBe(false)
    expect(footerItemSchema.safeParse({ kind: 'input', id: '__proto__', label: 'Q' }).success).toBe(false)
    expect(footerItemSchema.safeParse({ kind: 'input', id: 'q', label: 'Q', grow: 'yes' }).success).toBe(false)
  })

  test('a value is text: markup in it is carried as written, for a host to draw as text', () => {
    const value = '<img src=x onerror=alert(1)>'
    expect(footerItemSchema.parse({ kind: 'input', id: 'q', label: 'Q', value }).value).toBe(value)
  })

  test('shares the footer\'s ids', () => {
    expect(footerItemsSchema.safeParse([...viewer, { kind: 'input', id: 'back', label: 'Again' }]).success).toBe(false)
  })
})

describe('a field\'s press', () => {
  test('carries text, and is refused without it', () => {
    expect(footerPressRefusal(items(), { item: 'address', text: 'https://example.org/' })).toBeNull()
    expect(footerPressRefusal(items(), { item: 'address', text: '' })).toBeNull()
    expect(footerPressRefusal(items(), { item: 'address' })).toContain('field')
    expect(footerPressRefusal(items(), { item: 'address', text: 'x'.repeat(LIMITS.FOOTER_INPUT + 1) })).toContain(String(LIMITS.FOOTER_INPUT))
  })

  test('the other kinds are judged as before, and a missing id names the field too', () => {
    expect(footerPressRefusal(items(), { item: 'back' })).toBeNull()
    expect(footerPressRefusal(items(), { item: 'gone' })).toBe('There is no "gone" here now. What can be pressed: back, address, reload.')
  })

  test('press.text is on the wire, up to the limit', () => {
    const press = { type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p1', item: 'address', place: 'footer', text: 'https://example.org/' }
    expect(pressSchema.parse(press)).toEqual(press)
    expect(hostMessageSchema.safeParse(press).success).toBe(true)
    expect(pressSchema.safeParse({ ...press, text: 'x'.repeat(LIMITS.FOOTER_INPUT + 1) }).success).toBe(false)
    expect(pressSchema.safeParse({ ...press, text: 3 }).success).toBe(false)
  })
})

describe('fit', () => {
  test('a field stays in the row at every width, never in "⋯"', () => {
    for (const width of [null, 380, 280, 200, 120]) {
      const at = footerLayout(items(), width)
      expect([...at.start, ...at.center, ...at.end].map((one) => one.id)).toContain('address')
      expect(at.overflow.map((one) => one.id)).not.toContain('address')
    }
  })

  test('an optional field goes with the optional texts under the icons width', () => {
    const optional = footerSchema.parse({ type: MESSAGE.FOOTER, items: [{ kind: 'input', id: 'q', label: 'Q', optional: true }] }).items
    expect(footerLayout(optional, 380).start).toHaveLength(1)
    expect(footerLayout(optional, 280).start).toHaveLength(0)
    expect(footerLayout(optional, 200).overflow).toHaveLength(0)
  })
})

describe('hello.footerKinds and footerDraws', () => {
  test('the greeting carries the kinds', () => {
    const hello = { type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's', context: { epic: null, project: null }, footer: true, footerKinds: [...FOOTER_KINDS] }
    expect(helloSchema.parse(hello).footerKinds).toEqual([...FOOTER_KINDS])
    expect(helloSchema.parse({ ...hello, footerKinds: undefined }).footerKinds).toBeUndefined()
  })

  test('a field is drawn only by a host that names it', () => {
    expect(footerDraws({ footer: true, footerKinds: [...FOOTER_KINDS] }, 'input')).toBe(true)
    expect(footerDraws({ footer: true, footerKinds: null }, 'input')).toBe(false)
    expect(footerDraws({ footer: true }, 'input')).toBe(false)
    expect(footerDraws({ footer: true, footerKinds: null }, 'run')).toBe(true)
    expect(footerDraws({ footer: false, footerKinds: [...FOOTER_KINDS] }, 'input')).toBe(false)
    expect(footerDraws({ footer: null, footerKinds: null }, 'text')).toBe(false)
  })
})

/* ------------------------------------------------------------------------ */

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
  const hello = (kinds?: readonly string[]) =>
    deliver({ type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's', context: { epic: null, project: null }, header: true, footer: true, ...(kinds ? { footerKinds: kinds } : {}) })
  return { source, host, deliver, hello }
}

describe('the client', () => {
  test('the greeting\'s kinds reach onHello, null from an older host', () => {
    const { source, hello } = harness()
    let facts: { footerKinds?: unknown } | null = null
    const conn = connect('kehikot.example', { onHello: (_c, _s, f) => (facts = f) }, { source })
    conn.listen()
    hello(FOOTER_KINDS)
    expect(facts!.footerKinds).toEqual([...FOOTER_KINDS])
    hello()
    expect(facts!.footerKinds).toBeNull()
    conn.stop()
  })

  test('a field\'s press reaches onPress with its text; one without text is refused before it', async () => {
    const { source, host, deliver, hello } = harness()
    const pressed: unknown[] = []
    const conn = connect('kehikot.example', { onPress: (press) => void pressed.push(press) }, { source })
    conn.listen()
    hello(FOOTER_KINDS)
    conn.footer([...viewer])
    deliver({ type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p1', item: 'address', place: 'footer', text: 'https://example.org/' })
    await Promise.resolve()
    expect(pressed).toEqual([{ item: 'address', place: 'footer', text: 'https://example.org/' }])
    expect(host.sent.at(-1)).toMatchObject({ type: MESSAGE.PRESSED, id: 'p1', ok: true })
    deliver({ type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p2', item: 'address', place: 'footer' })
    expect(host.sent.at(-1)).toMatchObject({ type: MESSAGE.PRESSED, id: 'p2', ok: false })
    /* Text means nothing on a header press, and is not handed on. */
    conn.header([{ kind: 'run', id: 'go', label: 'Go' }])
    deliver({ type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p3', item: 'go', text: 'ignored' })
    await Promise.resolve()
    expect(pressed.at(-1)).toEqual({ item: 'go' })
    conn.stop()
  })

  test('hostStore keeps footerKinds from the greeting', () => {
    const { source, hello } = harness()
    const store = hostStore('kehikot.example', {}, { source, applyTheme: false, reloadWhenStale: false })
    store.start()
    expect(store.get().footerKinds).toBeNull()
    hello(FOOTER_KINDS)
    expect(store.get().footerKinds).toEqual([...FOOTER_KINDS])
    expect(footerDraws({ footer: store.get().drawsFooter, footerKinds: store.get().footerKinds }, 'input')).toBe(true)
    hello()
    expect(store.get().footerKinds).toBeNull()
    store.stop()
  })
})

describe('an older build (v2.45.0)', () => {
  test('refuses a footer with a field, which is why a module asks footerDraws first', () => {
    if (!old) return
    expect(old.footerItemsSchema.safeParse(viewer).success).toBe(false)
    expect(old.footerItemsSchema.safeParse(viewer.filter((one) => one.kind !== 'input')).success).toBe(true)
  })

  test('strips press.text and hello.footerKinds without refusing the message', () => {
    if (!old) return
    const press = old.pressSchema.parse({ type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p1', item: 'x', place: 'footer', text: 'hi' })
    expect(press.text).toBeUndefined()
    const hello = old.helloSchema.parse({ type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's', context: { epic: null, project: null }, footer: true, footerKinds: ['input'] })
    expect(hello.footerKinds).toBeUndefined()
  })
})
