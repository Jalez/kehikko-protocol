import { describe, expect, test } from 'bun:test'

import {
  HEADER_MENUS,
  HOST_MESSAGES,
  LIMITS,
  MESSAGE,
  MODULE_MESSAGES,
  PROTOCOL,
  headerItemSchema,
  headerSchema,
  hostMessageSchema,
  moduleMessageSchema,
  pressRefusal,
  pressSchema,
  pressedSchema,
  type HeaderItem,
} from '../src/index.js'
import { connect, hostStore, type MessageSource } from '../src/client/index.js'

/**
 * The header a module declares, the press a host relays and the answer to it: what the schemas
 * refuse, which menu a kind lands in, and that the client replays the list, judges a press against
 * what is declared now, and answers exactly once.
 */

/* Paper's header, as docs/header.md works it. */
const paper = [
  { kind: 'switch', id: 'pane', label: 'Pane', options: [{ id: 'source', label: 'Source' }, { id: 'pdf', label: 'PDF' }], value: 'source' },
  { kind: 'toggle', id: 'auto', label: 'Apply proposals automatically', checked: false },
  { kind: 'go', id: 'section', label: 'Sections', options: [{ id: 'intro', label: '1 Introduction' }], tool: 'show_section' },
  { kind: 'run', id: 'compile', label: 'Compile', shortcut: '⌘B', result: '1.2 s · p. 3/12', agents: true },
  { kind: 'run', id: 'commit', label: 'Commit', confirm: true, disabled: 'Nothing has changed since the last commit.' },
] as const

const items = (): HeaderItem[] => headerSchema.parse({ type: MESSAGE.HEADER, items: paper }).items

describe('kehikot.header', () => {
  test('is a module message, parsed with its defaults filled in', () => {
    expect(MODULE_MESSAGES).toContain(MESSAGE.HEADER)
    const parsed = moduleMessageSchema.parse({ type: MESSAGE.HEADER, items: paper })
    expect(parsed).toMatchObject({ type: 'kehikot.header' })
    const [pane, auto, , compile, commit] = items()
    expect(pane).toMatchObject({ agents: false })
    expect(auto).toMatchObject({ checked: false, agents: false })
    expect(compile).toMatchObject({ state: 'idle', disabled: null, confirm: false, agents: true })
    expect(commit).toMatchObject({ confirm: true, result: null })
  })

  test('an empty list is a real message: it takes the menus away', () => {
    expect(headerSchema.safeParse({ type: MESSAGE.HEADER, items: [] }).success).toBe(true)
  })

  test('the kind fixes the menu', () => {
    expect(HEADER_MENUS).toEqual({ switch: 'view', toggle: 'view', go: 'go', run: 'run' })
  })

  test('refuses what a host could not draw or a press could not name', () => {
    const bad = (item: unknown) => expect(headerItemSchema.safeParse(item).success).toBe(false)
    bad({ kind: 'switch', id: 'pane', label: 'Pane', options: [{ id: 'a', label: 'A' }], value: 'b' })
    bad({ kind: 'switch', id: 'pane', label: 'Pane', options: [], value: 'a' })
    bad({ kind: 'go', id: 'to', label: 'Go', options: [{ id: 'a', label: 'A' }, { id: 'a', label: 'Again' }] })
    bad({ kind: 'toggle', id: '__proto__', label: 'T', checked: true })
    bad({ kind: 'toggle', id: 't', label: 'x'.repeat(LIMITS.HEADER_LABEL + 1), checked: true })
    bad({ kind: 'toggle', id: 't', label: 'T' })
    bad({ kind: 'run', id: 'r', label: 'R', state: 'done' })
    bad({ kind: 'menu', id: 'm', label: 'M' })
    const twice = [paper[1], paper[1]]
    expect(headerSchema.safeParse({ type: MESSAGE.HEADER, items: twice }).success).toBe(false)
    const many = Array.from({ length: LIMITS.HEADER_ITEMS + 1 }, (_, i) => ({ kind: 'toggle', id: `t${i}`, label: 'T', checked: false }))
    expect(headerSchema.safeParse({ type: MESSAGE.HEADER, items: many }).success).toBe(false)
  })

  test('agents are opted in per item, never beside a tool that does the same, never on a run that is confirmed', () => {
    expect(headerItemSchema.parse({ kind: 'toggle', id: 't', label: 'T', checked: true }).agents).toBe(false)
    expect(headerItemSchema.safeParse({ kind: 'run', id: 'r', label: 'R', agents: true, tool: 'run_tests' }).success).toBe(false)
    expect(headerItemSchema.safeParse({ kind: 'run', id: 'r', label: 'R', agents: true, confirm: true }).success).toBe(false)
    expect(headerItemSchema.safeParse({ kind: 'run', id: 'r', label: 'R', tool: 'run_tests' }).success).toBe(true)
  })
})

describe('kehikot.press and kehikot.pressed', () => {
  test('one in each direction, paired by id', () => {
    expect(HOST_MESSAGES).toContain(MESSAGE.PRESS)
    expect(MODULE_MESSAGES).toContain(MESSAGE.PRESSED)
    expect(hostMessageSchema.safeParse({ type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p1', item: 'pane', value: 'pdf' }).success).toBe(true)
    expect(pressSchema.safeParse({ type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p1', item: 'auto', value: true }).success).toBe(true)
    expect(pressSchema.safeParse({ type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p1', item: 'compile' }).success).toBe(true)
    expect(pressSchema.safeParse({ type: MESSAGE.PRESS, protocol: PROTOCOL, item: 'compile' }).success).toBe(false)
    expect(pressSchema.safeParse({ type: MESSAGE.PRESS, protocol: PROTOCOL, id: 'p1', item: 'pane', value: 3 }).success).toBe(false)
    expect(moduleMessageSchema.parse({ type: MESSAGE.PRESSED, id: 'p1', ok: true })).toMatchObject({ why: '' })
    expect(pressedSchema.safeParse({ type: MESSAGE.PRESSED, id: 'p1' }).success).toBe(false)
  })

  test('a press the header cannot take is refused in words that name what exists', () => {
    const header = items()
    expect(pressRefusal(header, { item: 'pane', value: 'pdf' })).toBeNull()
    expect(pressRefusal(header, { item: 'auto', value: true })).toBeNull()
    expect(pressRefusal(header, { item: 'compile' })).toBeNull()
    expect(pressRefusal(header, { item: 'section', value: 'intro' })).toBeNull()
    expect(pressRefusal(header, { item: 'present' })).toBe('There is no "present" here now. What can be pressed: pane, auto, section, compile, commit.')
    expect(pressRefusal([], { item: 'present' })).toContain('Nothing here can be pressed.')
    expect(pressRefusal(header, { item: 'pane', value: 'slides' })).toBe('"pane" takes one of: source, pdf.')
    expect(pressRefusal(header, { item: 'pane' })).toContain('takes one of')
    expect(pressRefusal(header, { item: 'auto' })).toContain('is a toggle')
    expect(pressRefusal(header, { item: 'commit' })).toBe('Nothing has changed since the last commit.')
    const running = headerSchema.parse({ type: MESSAGE.HEADER, items: [{ kind: 'run', id: 'compile', label: 'Compile', state: 'busy' }] }).items
    expect(pressRefusal(running, { item: 'compile' })).toBe('"compile" is already running.')
  })
})

describe('a message type the other side does not know', () => {
  test('is in neither list, which is how a receiver tells it from one it cannot read', () => {
    const known = [...HOST_MESSAGES, ...MODULE_MESSAGES] as readonly string[]
    expect(known).not.toContain('kehikot.something-later')
    /* Every type this version has is in exactly one of the two. */
    expect([...known].sort()).toEqual(Object.values(MESSAGE).sort())
    /* And the schemas refuse it, so the listing is what a receiver decides by. */
    expect(moduleMessageSchema.safeParse({ type: 'kehikot.something-later' }).success).toBe(false)
  })
})

/* ------------------------------------------------------------------------ *
 * The client
 * ------------------------------------------------------------------------ */

const ID = 'kehikot.example'

function fakeWindow() {
  const listeners = new Set<(ev: MessageEvent) => void>()
  const source: MessageSource = {
    parent: {} as Window,
    addEventListener: (_type, fn) => void listeners.add(fn),
    removeEventListener: (_type, fn) => void listeners.delete(fn),
  }
  const deliver = (ev: { data: unknown; origin?: string; source?: unknown }) => {
    for (const fn of [...listeners]) fn(ev as unknown as MessageEvent)
  }
  return { source, deliver }
}

function speaker() {
  const said: { type: string; [key: string]: unknown }[] = []
  return { postMessage: (message: unknown) => void said.push(message as { type: string }), said }
}

const hello = (from: unknown) => ({
  data: { type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's1', context: { epic: null, project: null, theme: 'light' } },
  origin: 'null',
  source: from,
})
const press = (from: unknown, id: string, item: string, value?: string | boolean) => ({
  data: { type: MESSAGE.PRESS, protocol: PROTOCOL, id, item, ...(value !== undefined ? { value } : {}) },
  origin: 'null',
  source: from,
})
const settled = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('connect: the header', () => {
  test('is sent when declared, and replayed after ready on every greeting — also when declared before any', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const live = connect(ID, {}, { source }).listen()
    live.header([...paper])
    expect(host.said).toEqual([])
    deliver(hello(host))
    expect(host.said.map((m) => m.type)).toEqual([MESSAGE.READY, MESSAGE.HEADER])
    live.header([])
    expect(host.said.at(-1)).toEqual({ type: MESSAGE.HEADER, items: [] })
    deliver(hello(host))
    expect(host.said.slice(-2)).toEqual([{ type: MESSAGE.READY, id: ID, protocol: PROTOCOL }, { type: MESSAGE.HEADER, items: [] }])
  })

  test('a page that never declares one sends none', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    connect(ID, {}, { source }).listen()
    deliver(hello(host))
    expect(host.said.map((m) => m.type)).toEqual([MESSAGE.READY])
  })

  test('a press reaches the listener and is answered once: taken, or not and why', async () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const heard: unknown[] = []
    const live = connect(
      ID,
      {
        onPress: (pressed) => {
          heard.push(pressed)
          if (pressed.item === 'compile') return 'The paper has no main file.'
          if (pressed.item === 'section') return Promise.resolve()
          if (pressed.item === 'auto') throw new Error('boom')
        },
      },
      { source },
    ).listen()
    live.header([...paper])
    deliver(hello(host))
    deliver(press(host, 'p1', 'pane', 'pdf'))
    deliver(press(host, 'p2', 'compile'))
    deliver(press(host, 'p3', 'section', 'intro'))
    deliver(press(host, 'p4', 'auto', true))
    await settled()
    expect(heard).toEqual([{ item: 'pane', value: 'pdf' }, { item: 'compile' }, { item: 'section', value: 'intro' }, { item: 'auto', value: true }])
    expect(host.said.filter((m) => m.type === MESSAGE.PRESSED)).toEqual([
      { type: MESSAGE.PRESSED, id: 'p1', ok: true, why: '' },
      { type: MESSAGE.PRESSED, id: 'p2', ok: false, why: 'The paper has no main file.' },
      { type: MESSAGE.PRESSED, id: 'p4', ok: false, why: 'This app failed while doing that.' },
      { type: MESSAGE.PRESSED, id: 'p3', ok: true, why: '' },
    ])
  })

  test('a press the header declared NOW cannot take never reaches the listener', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    let heard = 0
    const live = connect(ID, { onPress: () => void (heard += 1) }, { source }).listen()
    live.header([...paper])
    deliver(hello(host))
    live.header([paper[0]])
    deliver(press(host, 'p1', 'compile'))
    deliver(press(host, 'p2', 'pane', 'slides'))
    expect(heard).toBe(0)
    expect(host.said.filter((m) => m.type === MESSAGE.PRESSED)).toEqual([
      { type: MESSAGE.PRESSED, id: 'p1', ok: false, why: 'There is no "compile" here now. What can be pressed: pane.' },
      { type: MESSAGE.PRESSED, id: 'p2', ok: false, why: '"pane" takes one of: source, pdf.' },
    ])
  })

  test('no listener, and a listener that never says: both are answered "not taken"', async () => {
    const one = fakeWindow()
    const host = speaker()
    const silent = connect(ID, {}, { source: one.source }).listen()
    silent.header([...paper])
    one.deliver(hello(host))
    one.deliver(press(host, 'p1', 'pane', 'pdf'))
    expect(host.said.at(-1)).toMatchObject({ type: MESSAGE.PRESSED, id: 'p1', ok: false })

    const two = fakeWindow()
    const other = speaker()
    const slow = connect(ID, { onPress: () => new Promise<void>(() => {}) }, { source: two.source, pressBackstop: 5 }).listen()
    slow.header([...paper])
    two.deliver(hello(other))
    two.deliver(press(other, 'p2', 'pane', 'pdf'))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(other.said.filter((m) => m.type === MESSAGE.PRESSED)).toEqual([
      { type: MESSAGE.PRESSED, id: 'p2', ok: false, why: 'This app did not say whether it took that press.' },
    ])
  })

  test('a press from a window that did not greet is not heard', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const stranger = speaker()
    let heard = 0
    const live = connect(ID, { onPress: () => void (heard += 1) }, { source }).listen()
    live.header([...paper])
    deliver(hello(host))
    deliver(press(stranger, 'p1', 'pane', 'pdf'))
    expect(heard).toBe(0)
    expect(stranger.said).toEqual([])
  })
})

describe('hostStore: the header', () => {
  test('declares through the store and hands a press to the page’s handler', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const heard: unknown[] = []
    const store = hostStore(ID, { onPress: (pressed) => void heard.push(pressed) }, { source, grace: 0, applyTheme: false, reloadWhenStale: false }).start()
    store.header([...paper])
    deliver(hello(host))
    expect(host.said.map((m) => m.type)).toEqual([MESSAGE.READY, MESSAGE.HEADER])
    deliver(press(host, 'p1', 'auto', true))
    expect(heard).toEqual([{ item: 'auto', value: true }])
    expect(host.said.at(-1)).toEqual({ type: MESSAGE.PRESSED, id: 'p1', ok: true, why: '' })
    store.stop()
  })

  test('a store with no handler leaves the answer to the connection', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const store = hostStore(ID, {}, { source, grace: 0, applyTheme: false, reloadWhenStale: false }).start()
    store.header([...paper])
    deliver(hello(host))
    deliver(press(host, 'p1', 'auto', true))
    expect(host.said.at(-1)).toMatchObject({ type: MESSAGE.PRESSED, ok: false, why: 'This app declared that item and does not take presses.' })
    store.stop()
  })
})
