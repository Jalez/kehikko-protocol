import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import {
  HOST_MESSAGES,
  LIMITS,
  MANIFEST_KIND,
  MESSAGE,
  NOT_COVERED,
  PACKAGE_VERSION,
  PROTOCOL,
  REVEAL_MODES,
  coveredSchema,
  hostMessageSchema,
  keepInView,
  manifestSchema,
  revealModeOf,
  revealModeSchema,
} from '../src/index.js'
import { connect, keepInView as fromClient } from '../src/client/index.js'
import { hostStore } from '../src/client/host-store.js'
import type { MessageSource } from '../src/client/mailbox.js'

/**
 * 2.42.0: how the host's revealed header and footer meet a module's page. `reveal: 'over'` keeps
 * the frame's size — a terminal is never refitted for a hover — and `kehikot.covered` says how much
 * of it the rows cover; `keepInView` is how far to move the content so the last line stays seen.
 * Parsed by the 2.41.0 build from its tag too, which ignores the field and runs the module.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')
const dirs: string[] = []
let old: Record<string, any> | null = null
beforeAll(async () => {
  try {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'kehikot-v242-')))
    dirs.push(dir)
    execFileSync('sh', ['-c', `git -C "${REPO}" archive v2.41.0 | tar -x -C "${dir}"`], { stdio: 'ignore' })
    symlinkSync(join(REPO, 'node_modules'), join(dir, 'node_modules'))
    old = await import(join(dir, 'src/index.ts'))
  } catch {
    console.warn('v2.41.0 is not available here: its compatibility check is skipped')
  }
})
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

const manifest = (over: Record<string, unknown> = {}) => ({
  kind: MANIFEST_KIND,
  protocol: PROTOCOL,
  id: 'kehikot.example',
  name: 'Example',
  version: '1.0.0',
  entry: '/app',
  modes: [{ id: 'main', label: 'Main' }],
  partless: 'Nothing in it belongs to a part.',
  ...over,
})

describe('the version', () => {
  test('is 2.42.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.43.0')
    expect(PROTOCOL).toBe(2)
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.42.0')
  })
})

describe('reveal in a manifest', () => {
  test('over is carried and read; push and nothing read as push', () => {
    expect(manifestSchema.parse(manifest({ reveal: 'over' })).reveal).toBe('over')
    expect(revealModeOf(manifestSchema.parse(manifest({ reveal: 'over' })))).toBe('over')
    expect(revealModeOf(manifestSchema.parse(manifest({ reveal: 'push' })))).toBe('push')
    const absent = manifestSchema.parse(manifest())
    expect(absent.reveal).toBeUndefined()
    expect(revealModeOf(absent)).toBe('push')
    expect(revealModeOf(null)).toBe('push')
    expect(Object.keys(REVEAL_MODES)).toEqual(['push', 'over'])
  })

  test('a word it does not know is dropped, not fatal', () => {
    for (const bad of ['overlay', 'Over', 3, ['over']]) {
      expect(revealModeSchema.safeParse(bad).success).toBe(false)
      const parsed = manifestSchema.parse(manifest({ reveal: bad }))
      expect(parsed.reveal).toBeUndefined()
      expect(parsed.id).toBe('kehikot.example')
    }
  })

  test('a host on 2.41.0 parses it and runs the module', () => {
    if (!old) return
    const parsed = old.manifestSchema.parse(manifest({ reveal: 'over' }))
    expect(parsed.id).toBe('kehikot.example')
    expect(parsed.reveal).toBeUndefined()
  })
})

describe('kehikot.covered', () => {
  test('is a host message with top and bottom in CSS pixels', () => {
    expect(HOST_MESSAGES).toContain(MESSAGE.COVERED)
    const message = { type: MESSAGE.COVERED, protocol: PROTOCOL, top: 32, bottom: 32 }
    expect(coveredSchema.parse(message)).toEqual(message)
    expect(hostMessageSchema.safeParse(message).success).toBe(true)
  })

  test('refuses negative, unbounded and missing sides', () => {
    for (const bad of [{ top: -1, bottom: 0 }, { top: 0, bottom: LIMITS.COVERED_PX + 1 }, { top: Number.POSITIVE_INFINITY, bottom: 0 }, { top: 0 }]) {
      expect(coveredSchema.safeParse({ type: MESSAGE.COVERED, protocol: PROTOCOL, ...bad }).success).toBe(false)
    }
  })
})

describe('keepInView', () => {
  const both = { top: 32, bottom: 32 }

  test('nothing covered never moves anything', () => {
    expect(keepInView(NOT_COVERED, 400, 400)).toBe(0)
    expect(keepInView(NOT_COVERED, 400, 10)).toBe(0)
  })

  test('a last line under the footer moves up onto its edge, and no further', () => {
    expect(keepInView(both, 400, 400)).toBe(-32)
    expect(keepInView(both, 400, 380)).toBe(-12)
    expect(keepInView({ top: 32, bottom: 0 }, 400, 400)).toBe(0)
  })

  test('a short screen moves down out from under the header, as far as the footer allows', () => {
    expect(keepInView(both, 400, 17)).toBe(32)
    expect(keepInView(both, 400, 350)).toBe(18)
    expect(keepInView(both, 400, 368)).toBe(0)
  })

  test('whole pixels, and nothing for a frame with no height', () => {
    expect(keepInView(both, 400, 380.4)).toBe(-12)
    expect(keepInView(both, 0, 10)).toBe(0)
    expect(fromClient).toBe(keepInView)
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

describe('the client', () => {
  test('connect hands it to onCovered, from the window that greeted only', () => {
    const { source, deliver } = fakeWindow()
    const heard: unknown[] = []
    connect('kehikot.example', { onCovered: (covered) => heard.push(covered) }, { source }).listen()
    deliver(hello, host)
    deliver({ type: MESSAGE.COVERED, protocol: PROTOCOL, top: 32, bottom: 0 }, { postMessage: () => {} })
    deliver({ type: MESSAGE.COVERED, protocol: PROTOCOL, top: 32, bottom: 32 }, host)
    expect(heard).toEqual([{ top: 32, bottom: 32 }])
  })

  test('hostStore keeps it as covered, and a new greeting starts again from nothing', () => {
    const { source, deliver } = fakeWindow()
    const store = hostStore('kehikot.example', {}, { source, applyTheme: false, reloadWhenStale: false })
    store.start()
    expect(store.get().covered).toEqual(NOT_COVERED)
    deliver(hello, host)
    deliver({ type: MESSAGE.COVERED, protocol: PROTOCOL, top: 32, bottom: 32 }, host)
    expect(store.get().covered).toEqual({ top: 32, bottom: 32 })
    deliver(hello, host)
    expect(store.get().covered).toEqual(NOT_COVERED)
    store.stop()
  })
})
