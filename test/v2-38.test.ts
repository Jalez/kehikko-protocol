import { describe, expect, test } from 'bun:test'

import {
  FOOTER_ICONS_BELOW,
  FOOTER_MERGE_BELOW,
  HOST_MESSAGES,
  LIMITS,
  MESSAGE,
  MODULE_MESSAGES,
  PACKAGE_VERSION,
  PROTOCOL,
  SINCE,
  WIRE_SINCE,
  footerItemSchema,
  footerLayout,
  footerModeFor,
  footerPressRefusal,
  footerSchema,
  helloSchema,
  headerItemSchema,
  meterSaid,
  moduleMessageSchema,
  pressSchema,
  sinceOf,
  type FooterItem,
} from '../src/index.js'
import { connect, hostStore, type MessageSource } from '../src/client/index.js'

/**
 * 2.38.0: the footer a module declares (`kehikot.footer`): status text, meters and the header's kinds,
 * drawn by the host as one row at the bottom of the container; presses come back as `kehikot.press`
 * with `place: 'footer'`; the greeting says whether the host draws it (`hello.footer`).
 */

/* An agent module's footer, as docs/footer.md works it. */
const agent = [
  { kind: 'text', id: 'model', text: 'Opus · high' },
  { kind: 'meter', id: 'context', label: 'Context', value: 0.62, text: '124k / 200k', level: 'warn', tooltip: '124,000 of 200,000 tokens used.' },
  { kind: 'meter', id: 'usage', label: 'Usage', value: 0.3, align: 'center', optional: true },
  { kind: 'run', id: 'compact', label: 'Compact', icon: 'refresh', align: 'end', agents: true },
  { kind: 'run', id: 'clear', label: 'Clear', icon: 'x', align: 'end', confirm: true },
] as const

const items = (): FooterItem[] => footerSchema.parse({ type: MESSAGE.FOOTER, items: agent }).items

describe('the version', () => {
  test('is 2.38.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.42.0')
    expect(PROTOCOL).toBe(2)
  })

  test('the wire pieces it adds say so', () => {
    expect(SINCE.wire).toBe(WIRE_SINCE)
    expect(sinceOf('wire', 'kehikot.footer')).toBe('2.38.0')
    expect(sinceOf('wire', 'hello.footer')).toBe('2.38.0')
    expect(sinceOf('wire', 'press.place')).toBe('2.38.0')
    expect(sinceOf('wire', 'constructor')).toBeNull()
  })
})

describe('kehikot.footer', () => {
  test('is a module message, parsed with its defaults filled in', () => {
    expect(MODULE_MESSAGES).toContain(MESSAGE.FOOTER)
    expect(HOST_MESSAGES).not.toContain(MESSAGE.FOOTER)
    expect(moduleMessageSchema.parse({ type: MESSAGE.FOOTER, items: agent })).toMatchObject({ type: 'kehikot.footer' })
    const [model, context, usage, compact, clear] = items()
    expect(model).toMatchObject({ align: 'start', optional: false, level: 'normal' })
    expect(context).toMatchObject({ level: 'warn', value: 0.62 })
    expect(usage).toMatchObject({ align: 'center', optional: true })
    expect(compact).toMatchObject({ state: 'idle', agents: true, confirm: false })
    expect(clear).toMatchObject({ confirm: true, agents: false })
  })

  test('an empty list is a real message: it takes the footer away', () => {
    expect(footerSchema.safeParse({ type: MESSAGE.FOOTER, items: [] }).success).toBe(true)
  })

  test('takes the header kinds with their fields, and strips what only the header means', () => {
    const run = footerItemSchema.parse({ kind: 'run', id: 'r', label: 'R', pinned: true, surface: 'fullscreen' })
    expect(run).not.toHaveProperty('pinned')
    expect(run).not.toHaveProperty('surface')
    expect(footerItemSchema.parse({ kind: 'switch', id: 's', label: 'Scope', options: [{ id: 'a', label: 'A' }], value: 'a' }).kind).toBe('switch')
    expect(footerItemSchema.parse({ kind: 'toggle', id: 't', label: 'T', checked: true }).kind).toBe('toggle')
    expect(footerItemSchema.parse({ kind: 'go', id: 'g', label: 'G', options: [{ id: 'a', label: 'A' }] }).kind).toBe('go')
    /* A footer field on a header item is not a header field: the header strips it. */
    expect(headerItemSchema.parse({ kind: 'toggle', id: 't', label: 'T', checked: true, align: 'end' })).not.toHaveProperty('align')
  })

  test('refuses what a host could not draw or a press could not name', () => {
    const bad = (item: unknown) => expect(footerItemSchema.safeParse(item).success).toBe(false)
    bad({ kind: 'meter', id: 'm', label: 'M', value: 1.2 })
    bad({ kind: 'meter', id: 'm', label: 'M', value: -0.1 })
    bad({ kind: 'meter', id: 'm', label: 'M', value: 0.5, level: 'panic' })
    bad({ kind: 'meter', id: 'm', label: 'M', value: 0.5, text: 'x'.repeat(LIMITS.FOOTER_METER_TEXT + 1) })
    bad({ kind: 'text', id: 't', text: '' })
    bad({ kind: 'text', id: 't', text: 'x'.repeat(LIMITS.FOOTER_TEXT + 1) })
    bad({ kind: 'text', id: 't', text: 'ok', align: 'middle' })
    bad({ kind: 'text', id: '__proto__', text: 'ok' })
    bad({ kind: 'text', id: 't', text: 'ok', tooltip: 'x'.repeat(LIMITS.FOOTER_TOOLTIP + 1) })
    bad({ kind: 'switch', id: 's', label: 'S', options: [{ id: 'a', label: 'A' }], value: 'b' })
    bad({ kind: 'run', id: 'r', label: 'R', agents: true, confirm: true })
    bad({ kind: 'run', id: 'r', label: 'R', agents: true, tool: 'run_tests' })
    bad({ kind: 'banner', id: 'b', text: 'x' })
    const twice = [agent[0], agent[0]]
    expect(footerSchema.safeParse({ type: MESSAGE.FOOTER, items: twice }).success).toBe(false)
    const many = Array.from({ length: LIMITS.FOOTER_ITEMS + 1 }, (_, i) => ({ kind: 'text', id: `t${i}`, text: 'x' }))
    expect(footerSchema.safeParse({ type: MESSAGE.FOOTER, items: many }).success).toBe(false)
  })

  test('a meter says its own text, or its rounded percentage', () => {
    const [, context, usage] = items()
    expect(meterSaid(context as Extract<FooterItem, { kind: 'meter' }>)).toBe('124k / 200k')
    expect(meterSaid(usage as Extract<FooterItem, { kind: 'meter' }>)).toBe('30%')
  })
})

describe('a press on the footer', () => {
  test('the press says where its item was declared; absent is the header', () => {
    expect(pressSchema.safeParse({ type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p1', item: 'compact', place: 'footer' }).success).toBe(true)
    expect(pressSchema.parse({ type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p1', item: 'compact' }).place).toBeUndefined()
    expect(pressSchema.safeParse({ type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p1', item: 'compact', place: 'side' }).success).toBe(false)
  })

  test('is judged against the footer, and a text or a meter cannot be pressed', () => {
    const footer = items()
    expect(footerPressRefusal(footer, { item: 'compact' })).toBeNull()
    expect(footerPressRefusal(footer, { item: 'model' })).toBe('"model" only says something; it cannot be pressed.')
    expect(footerPressRefusal(footer, { item: 'context' })).toContain('cannot be pressed')
    expect(footerPressRefusal(footer, { item: 'gone' })).toBe('There is no "gone" here now. What can be pressed: compact, clear.')
  })
})

describe('the greeting says whether the host draws it', () => {
  test('hello.footer is optional, and a boolean', () => {
    const hello = { type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's', context: { epic: null, project: null } }
    expect(helloSchema.safeParse(hello).success).toBe(true)
    expect(helloSchema.parse({ ...hello, footer: true }).footer).toBe(true)
    expect(helloSchema.safeParse({ ...hello, footer: 'yes' }).success).toBe(false)
  })
})

describe('fit: one row at every width', () => {
  test('the modes are the header’s: words, icons under 300, one ⋯ under 220', () => {
    expect(FOOTER_ICONS_BELOW).toBe(300)
    expect(FOOTER_MERGE_BELOW).toBe(220)
    expect(footerModeFor(null)).toBe('words')
    expect(footerModeFor(380)).toBe('words')
    expect(footerModeFor(280)).toBe('icons')
    expect(footerModeFor(200)).toBe('merged')
  })

  test('at 380 everything is drawn in its group, in words', () => {
    const at = footerLayout(items(), 380)
    expect(at.start.map((one) => one.id)).toEqual(['model', 'context'])
    expect(at.center.map((one) => one.id)).toEqual(['usage'])
    expect(at.end.map((one) => one.id)).toEqual(['compact', 'clear'])
    expect(at.overflow).toEqual([])
    expect(at.iconsOnly).toBe(false)
    expect(at.meterLabels).toBe(true)
  })

  test('at 280 optional items go, runs are icons and meters lose their label', () => {
    const at = footerLayout(items(), 280)
    expect(at.center).toEqual([])
    expect(at.end.map((one) => one.id)).toEqual(['compact', 'clear'])
    expect(at.iconsOnly).toBe(true)
    expect(at.meterLabels).toBe(false)
    const optionalRun = footerLayout([...items(), footerItemSchema.parse({ kind: 'run', id: 'more', label: 'More', optional: true })], 280)
    expect(optionalRun.overflow.map((one) => one.id)).toEqual(['more'])
  })

  test('at 200 every pressable item is in ⋯, only the first text stays, and the centre joins the left', () => {
    const extra = [...items(), footerItemSchema.parse({ kind: 'text', id: 'second', text: 'two', align: 'center' })]
    const at = footerLayout(extra, 200)
    expect(at.start.map((one) => one.id)).toEqual(['model', 'context'])
    expect(at.center).toEqual([])
    expect(at.end).toEqual([])
    expect(at.overflow.map((one) => one.id)).toEqual(['compact', 'clear'])
  })

  test('nothing pressable is ever lost', () => {
    for (const width of [null, 380, 280, 200, 120]) {
      const at = footerLayout(items(), width)
      const drawn = [...at.start, ...at.center, ...at.end, ...at.overflow].map((one) => one.id)
      for (const one of items()) if (one.kind === 'run') expect(drawn).toContain(one.id)
    }
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
  const hello = (footer?: boolean) =>
    deliver({ type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's', context: { epic: null, project: null }, header: true, ...(footer === undefined ? {} : { footer }) })
  return { source, host, deliver, hello }
}

describe('the client', () => {
  test('footer() sends the list, replays it after every greeting, and the greeting says whether the host draws it', () => {
    const { source, host, hello } = harness()
    let facts: unknown = null
    const conn = connect('kehikot.claude', { onHello: (_c, _s, f) => (facts = f) }, { source })
    conn.listen()
    hello(true)
    expect(facts).toMatchObject({ footer: true })
    conn.footer([...agent])
    expect(host.sent.at(-1)).toMatchObject({ type: MESSAGE.FOOTER })
    host.sent.length = 0
    hello()
    expect(facts).toMatchObject({ footer: null })
    expect(host.sent.some((m) => (m as { type: string }).type === MESSAGE.FOOTER)).toBe(true)
    conn.stop()
  })

  test('a footer press reaches onPress with place, judged against the footer and not the header', async () => {
    const { source, host, deliver, hello } = harness()
    const pressed: unknown[] = []
    const conn = connect('kehikot.claude', { onPress: (press) => void pressed.push(press) }, { source })
    conn.listen()
    hello(true)
    conn.header([{ kind: 'run', id: 'compact', label: 'Header compact', disabled: 'Not from here.' }])
    conn.footer([...agent])
    deliver({ type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p1', item: 'compact', place: 'footer' })
    await Promise.resolve()
    expect(pressed).toEqual([{ item: 'compact', place: 'footer' }])
    expect(host.sent.at(-1)).toMatchObject({ type: MESSAGE.PRESSED, id: 'p1', ok: true })
    /* The same id in the header is the header's item: there it is disabled. */
    deliver({ type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p2', item: 'compact' })
    expect(host.sent.at(-1)).toMatchObject({ type: MESSAGE.PRESSED, id: 'p2', ok: false, why: 'Not from here.' })
    deliver({ type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p3', item: 'context', place: 'footer' })
    expect(host.sent.at(-1)).toMatchObject({ type: MESSAGE.PRESSED, id: 'p3', ok: false })
    expect(pressed).toHaveLength(1)
    conn.stop()
  })

  test('hostStore says drawsFooter from the greeting', () => {
    const { source, hello } = harness()
    const store = hostStore("kehikot.claude", {}, { source, applyTheme: false, reloadWhenStale: false })
    store.start()
    expect(store.get().drawsFooter).toBeNull()
    hello(true)
    expect(store.get().drawsFooter).toBe(true)
    store.stop()
  })
})
