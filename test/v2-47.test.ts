import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { Window } from 'happy-dom'

import {
  MESSAGE,
  PACKAGE_VERSION,
  PROTOCOL,
  footerItemSchema,
  footerItemsSchema,
  rowsAdvice,
  sinceOf,
} from '../src/index.js'
import { connect, type MessageSource } from '../src/client/index.js'

/**
 * 2.47.0: what goes in the header and what in the footer. `actsOn` on a pressable footer item says
 * which readout beside it it acts on; `rowsAdvice` points out the obvious misplacements, and never
 * refuses anything.
 */

describe('the version', () => {
  test('is 2.47.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.85.0')
    expect(PROTOCOL).toBe(2)
    expect(sinceOf('wire', 'footer.actsOn')).toBe('2.47.0')
  })
})

describe('actsOn', () => {
  test('a pressable footer item may name the readout it acts on', () => {
    const compact = footerItemSchema.parse({ kind: 'run', id: 'compact', label: 'Compact', actsOn: 'context' })
    expect(compact).toMatchObject({ actsOn: 'context' })
    const follow = footerItemSchema.parse({ kind: 'toggle', id: 'follow', label: 'Follow', checked: true, actsOn: 'stage' })
    expect(follow).toMatchObject({ actsOn: 'stage' })
  })

  test('a reserved id is refused, as any id is', () => {
    expect(footerItemSchema.safeParse({ kind: 'run', id: 'r', label: 'R', actsOn: '__proto__' }).success).toBe(false)
  })

  test('naming an id that is not there is not a refusal', () => {
    expect(footerItemsSchema.safeParse([{ kind: 'run', id: 'r', label: 'R', actsOn: 'nothing' }]).success).toBe(true)
  })
})

describe('rowsAdvice', () => {
  test('a header of settings and a footer of readouts is said nothing about', () => {
    const header = [
      { kind: 'switch', id: 'view', label: 'View', options: [{ id: 'a', label: 'List' }, { id: 'b', label: 'Board' }], value: 'a' },
      { kind: 'toggle', id: 'wrap', label: 'Wrap lines', checked: false },
      { kind: 'run', id: 'new', label: 'New session' },
    ]
    const footer = [
      { kind: 'text', id: 'model', text: 'Opus · high' },
      { kind: 'meter', id: 'context', label: 'Context', value: 0.4 },
      { kind: 'run', id: 'compact', label: 'Compact', actsOn: 'context' },
      { kind: 'toggle', id: 'follow', label: 'Follow', checked: true, actsOn: 'context' },
    ]
    expect(rowsAdvice(header, footer)).toEqual([])
  })

  test('a meter in the header belongs in the footer', () => {
    const [line] = rowsAdvice([{ kind: 'meter', id: 'usage', label: 'Usage', value: 0.2 }], [])
    expect(line).toContain('"usage"')
    expect(line).toContain('footer')
  })

  test('a header label that reads as a readout is pointed out', () => {
    for (const label of ['Context 41%', '3 / 12', 'Page 2 of 5']) {
      expect(rowsAdvice([{ kind: 'run', id: 'x', label }], [])).toHaveLength(1)
    }
    expect(rowsAdvice([{ kind: 'run', id: 'x', label: 'Open 2nd pane' }], [])).toEqual([])
  })

  test('a switch or a toggle in the footer without actsOn is pointed out', () => {
    const advice = rowsAdvice([], [
      { kind: 'toggle', id: 'wrap', label: 'Wrap', checked: false },
      { kind: 'switch', id: 'sort', label: 'Sort', options: [{ id: 'a', label: 'A' }], value: 'a' },
      { kind: 'run', id: 'retry', label: 'Retry' },
    ])
    expect(advice).toHaveLength(2)
    expect(advice[0]).toContain('header')
    expect(advice[1]).toContain('"sort"')
  })

  test('actsOn naming no readout is pointed out, whatever the kind', () => {
    const advice = rowsAdvice([], [
      { kind: 'run', id: 'compact', label: 'Compact', actsOn: 'context' },
      { kind: 'run', id: 'other', label: 'Other', actsOn: 'compact' },
    ])
    expect(advice).toHaveLength(2)
    expect(advice[0]).toContain('"context"')
  })

  test('anything that is not a list is nothing, and it never throws', () => {
    expect(rowsAdvice(null, undefined)).toEqual([])
    expect(rowsAdvice('x', { kind: 'meter' })).toEqual([])
    expect(rowsAdvice([null, 3, 'meter'], [null])).toEqual([])
  })
})

describe('the client says it once, on the console', () => {
  let warn: ReturnType<typeof spyOn> | null = null
  afterEach(() => warn?.mockRestore())

  test('each sentence once per page, and the lists are still sent', () => {
    warn = spyOn(console, 'warn').mockImplementation(() => {})
    const listeners = new Set<(ev: MessageEvent) => void>()
    const source: MessageSource = {
      addEventListener: (_type, fn) => listeners.add(fn as (ev: MessageEvent) => void),
      removeEventListener: (_type, fn) => listeners.delete(fn as (ev: MessageEvent) => void),
    }
    const host = new Window()
    const sent: unknown[] = []
    ;(host as unknown as { postMessage(m: unknown): void }).postMessage = (message: unknown) => void sent.push(message)
    const conn = connect('kehikot.example', {}, { source })
    conn.listen()
    for (const fn of listeners) {
      fn({ data: { type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's', context: { epic: null, project: null }, header: true, footer: true }, source: host, origin: 'http://localhost:4170' } as unknown as MessageEvent)
    }
    const footer = [{ kind: 'toggle' as const, id: 'wrap', label: 'Wrap', checked: false }]
    conn.footer(footer)
    conn.footer(footer)
    conn.header([{ kind: 'run', id: 'new', label: 'New' }])
    expect(warn.mock.calls.length).toBe(1)
    expect(String(warn.mock.calls[0]![0])).toContain('"wrap"')
    expect(sent.filter((m) => (m as { type?: string }).type === MESSAGE.FOOTER)).toHaveLength(2)
    conn.stop()
  })
})
