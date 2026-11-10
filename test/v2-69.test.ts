import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import {
  FIND_DIRECTIONS,
  HOST_MESSAGES,
  MESSAGE,
  MODULE_MESSAGES,
  PACKAGE_VERSION,
  PROTOCOL,
  findMatches,
  findOpenSchema,
  findResultSchema,
  findSaid,
  findSchema,
  helloSchema,
  hostMessageSchema,
  moduleMessageSchema,
  stepMatch,
} from '../src/index.js'
import { connect, type KeyEventLike, type KeyTarget } from '../src/client/connect.js'
import { FIND_HIGHLIGHT, FIND_HIGHLIGHT_CURRENT, FIND_MARK_ATTRIBUTE, pageFind } from '../src/client/find.js'
import type { MessageSource } from '../src/client/mailbox.js'

/**
 * 2.69.0: Find. The host draws one bar; the page searches what it shows (`kehikot.find`), says what
 * it came to (`kehikot.find.result`), and asks for the bar on ⌘F (`kehikot.find.open`). The client
 * does all of it by itself for a page whose text is in the DOM.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')

describe('the version', () => {
  test('is current, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.74.0')
    expect(PROTOCOL).toBe(2)
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.69.0')
  })
})

describe('the messages', () => {
  test('find is the host\'s; find.result and find.open are the module\'s', () => {
    expect(HOST_MESSAGES).toContain(MESSAGE.FIND)
    expect(MODULE_MESSAGES).toContain(MESSAGE.FIND_RESULT)
    expect(MODULE_MESSAGES).toContain(MESSAGE.FIND_OPEN)
  })

  test('a find carries an id, a query, two options and a direction', () => {
    expect([...FIND_DIRECTIONS]).toEqual(['first', 'next', 'prev', 'close'])
    const find = findSchema.parse({ type: MESSAGE.FIND, protocol: PROTOCOL, id: 'f1', query: 'kehikko', direction: 'first' })
    expect(find).toEqual({ type: MESSAGE.FIND, protocol: PROTOCOL, id: 'f1', query: 'kehikko', caseSensitive: false, wholeWord: false, direction: 'first' })
    expect(hostMessageSchema.safeParse(find).success).toBe(true)
    expect(findSchema.safeParse({ ...find, direction: 'sideways' }).success).toBe(false)
    expect(findSchema.safeParse({ ...find, query: 'x'.repeat(257) }).success).toBe(false)
    expect(findSchema.safeParse({ ...find, id: '' }).success).toBe(false)
  })

  test('a result is a count, or unsupported, never a current past the total', () => {
    const result = { type: MESSAGE.FIND_RESULT, id: 'f1', total: 17, current: 3 }
    expect(findResultSchema.parse(result)).toEqual({ ...result, unsupported: false })
    expect(moduleMessageSchema.safeParse(result).success).toBe(true)
    expect(findResultSchema.parse({ type: MESSAGE.FIND_RESULT, id: 'f1', total: 0, current: 0, unsupported: true }).unsupported).toBe(true)
    expect(findResultSchema.safeParse({ ...result, current: 18 }).success).toBe(false)
    expect(findResultSchema.safeParse({ ...result, total: -1 }).success).toBe(false)
    expect(findResultSchema.safeParse({ ...result, total: 1.5 }).success).toBe(false)
  })

  test('find.open may carry the selection and a step', () => {
    expect(findOpenSchema.parse({ type: MESSAGE.FIND_OPEN })).toEqual({ type: MESSAGE.FIND_OPEN })
    expect(findOpenSchema.parse({ type: MESSAGE.FIND_OPEN, query: 'word', step: 'prev' }).step).toBe('prev')
    expect(findOpenSchema.safeParse({ type: MESSAGE.FIND_OPEN, step: 'first' }).success).toBe(false)
    expect(moduleMessageSchema.safeParse({ type: MESSAGE.FIND_OPEN, step: 'next' }).success).toBe(true)
  })

  test('hello.find is optional, and a boolean', () => {
    const hello = { type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's', context: { epic: null, project: null, theme: 'light' } }
    expect(helloSchema.parse(hello).find).toBeUndefined()
    expect(helloSchema.parse({ ...hello, find: true }).find).toBe(true)
    expect(helloSchema.safeParse({ ...hello, find: 'yes' }).success).toBe(false)
  })
})

describe('findMatches', () => {
  test('finds every match, folding case unless asked not to', () => {
    expect(findMatches('Find the find in FIND', 'find')).toEqual([[0, 4], [9, 13], [17, 21]])
    expect(findMatches('Find the find in FIND', 'find', { caseSensitive: true })).toEqual([[9, 13]])
  })

  test('a whole word has no letter, digit or underscore beside it', () => {
    expect(findMatches('find finder refind find_x find.', 'find', { wholeWord: true })).toEqual([[0, 4], [26, 30]])
    expect(findMatches('ääfind find', 'find', { wholeWord: true })).toEqual([[7, 11]])
  })

  test('matches never overlap, and an empty query matches nothing', () => {
    expect(findMatches('aaaa', 'aa')).toEqual([[0, 2], [2, 4]])
    expect(findMatches('anything', '')).toEqual([])
    expect(findMatches('', 'x')).toEqual([])
  })
})

describe('stepMatch', () => {
  test('next and prev wrap; first takes the start; close is none', () => {
    expect(stepMatch(0, 3, 'next')).toBe(1)
    expect(stepMatch(2, 3, 'next')).toBe(0)
    expect(stepMatch(0, 3, 'prev')).toBe(2)
    expect(stepMatch(-1, 3, 'prev')).toBe(2)
    expect(stepMatch(-1, 3, 'first', 2)).toBe(2)
    expect(stepMatch(-1, 3, 'first', 9)).toBe(2)
    expect(stepMatch(1, 3, 'close')).toBe(-1)
    expect(stepMatch(0, 0, 'next')).toBe(-1)
  })
})

describe('findSaid', () => {
  test('says the count, no results, or nothing', () => {
    expect(findSaid({ total: 17, current: 3 }, 'x')).toBe('3 of 17')
    expect(findSaid({ total: 0, current: 0 }, 'x')).toBe('No results')
    expect(findSaid({ total: 4, current: 2 }, '')).toBe('')
    expect(findSaid({ total: 0, current: 0, unsupported: true }, 'x')).toBe('')
    expect(findSaid(null, 'x')).toBe('')
  })
})

/* ------------------------------------------------------------------------ */

function fakeWindow() {
  const listeners = new Set<(ev: MessageEvent) => void>()
  const sent: unknown[] = []
  const hostWindow = { postMessage: (message: unknown) => void sent.push(message) }
  const source: MessageSource = {
    parent: hostWindow as unknown as Window,
    addEventListener: (_type, fn) => void listeners.add(fn),
    removeEventListener: (_type, fn) => void listeners.delete(fn),
  }
  const deliver = (data: unknown) => {
    for (const fn of [...listeners]) fn({ data, origin: 'null', source: hostWindow } as unknown as MessageEvent)
  }
  return { source, deliver, sent }
}

function fakeKeys() {
  const on = new Set<(event: KeyEventLike) => void>()
  const target: KeyTarget = {
    addEventListener: (_type, fn) => void on.add(fn),
    removeEventListener: (_type, fn) => void on.delete(fn),
  }
  const press = (key: string, mods: Partial<KeyEventLike> = {}) => {
    let prevented = false
    const event: KeyEventLike = { key, ...mods, preventDefault: () => void (prevented = true) }
    for (const fn of [...on]) fn(event)
    return prevented
  }
  return { target, press, count: () => on.size }
}

const hello = (find?: boolean) => ({
  type: MESSAGE.HELLO,
  protocol: PROTOCOL,
  session: 's1',
  context: { epic: 'a-epic', project: null, theme: 'light' },
  ...(find === undefined ? {} : { find }),
})

const find = (id: string, query: string, direction: string, more: Record<string, unknown> = {}) => ({
  type: MESSAGE.FIND,
  protocol: PROTOCOL,
  id,
  query,
  direction,
  ...more,
})

const results = (sent: unknown[]) => sent.filter((m) => (m as { type: string }).type === MESSAGE.FIND_RESULT)
const opens = (sent: unknown[]) => sent.filter((m) => (m as { type: string }).type === MESSAGE.FIND_OPEN)

describe('connect: the keys', () => {
  test('⌘F asks for the bar only from a host that draws one', () => {
    const w = fakeWindow()
    const keys = fakeKeys()
    const c = connect('kehikot.x', {}, { source: w.source, findKeys: keys.target, mac: true, pointerTarget: false, findIn: false }).listen()
    w.deliver(hello())
    expect(keys.count()).toBe(0)
    w.deliver(hello(true))
    expect(keys.count()).toBe(1)
    expect(keys.press('f', { metaKey: true })).toBe(true)
    expect(opens(w.sent)).toEqual([{ type: MESSAGE.FIND_OPEN }])
    c.stop()
    expect(keys.count()).toBe(0)
  })

  test('⌘G and ⇧⌘G step; Ctrl+F is the key off a Mac; other keys are left alone', () => {
    const w = fakeWindow()
    const keys = fakeKeys()
    connect('kehikot.x', {}, { source: w.source, findKeys: keys.target, mac: true, pointerTarget: false, findIn: false }).listen()
    w.deliver(hello(true))
    keys.press('g', { metaKey: true })
    keys.press('G', { metaKey: true, shiftKey: true })
    expect(keys.press('f', { ctrlKey: true })).toBe(false)
    expect(keys.press('f', { metaKey: true, altKey: true })).toBe(false)
    expect(keys.press('k', { metaKey: true })).toBe(false)
    expect(opens(w.sent)).toEqual([{ type: MESSAGE.FIND_OPEN, step: 'next' }, { type: MESSAGE.FIND_OPEN, step: 'prev' }])

    const v = fakeWindow()
    const other = fakeKeys()
    connect('kehikot.x', {}, { source: v.source, findKeys: other.target, mac: false, pointerTarget: false, findIn: false }).listen()
    v.deliver(hello(true))
    expect(other.press('f', { metaKey: true })).toBe(false)
    expect(other.press('f', { ctrlKey: true })).toBe(true)
    expect(opens(v.sent)).toHaveLength(1)
  })

  test('a key the page already took is left to it, and findKeys: false hears none', () => {
    const w = fakeWindow()
    const keys = fakeKeys()
    connect('kehikot.x', {}, { source: w.source, findKeys: keys.target, mac: true, pointerTarget: false, findIn: false }).listen()
    w.deliver(hello(true))
    expect(keys.press('f', { metaKey: true, defaultPrevented: true })).toBe(false)
    expect(opens(w.sent)).toHaveLength(0)

    const v = fakeWindow()
    connect('kehikot.x', {}, { source: v.source, findKeys: false, mac: true, pointerTarget: false, findIn: false }).listen()
    v.deliver(hello(true))
    expect(opens(v.sent)).toHaveLength(0)
  })
})

describe('connect: a search', () => {
  test('onFind\'s count goes back with the find\'s id', async () => {
    const w = fakeWindow()
    const asked: unknown[] = []
    connect('kehikot.x', {
      onFind: (query, ask) => {
        asked.push([query, ask])
        return ask.direction === 'first' ? { total: 4, current: 1 } : Promise.resolve({ total: 4, current: 2 })
      },
    }, { source: w.source, findKeys: false, pointerTarget: false }).listen()
    w.deliver(hello(true))
    w.deliver(find('f1', 'word', 'first', { caseSensitive: true }))
    w.deliver(find('f2', 'word', 'next'))
    await Promise.resolve()
    expect(asked).toEqual([
      ['word', { caseSensitive: true, wholeWord: false, direction: 'first' }],
      ['word', { caseSensitive: false, wholeWord: false, direction: 'next' }],
    ])
    expect(results(w.sent)).toEqual([
      { type: MESSAGE.FIND_RESULT, id: 'f1', total: 4, current: 1 },
      { type: MESSAGE.FIND_RESULT, id: 'f2', total: 4, current: 2 },
    ])
  })

  test('unsupported, a throw, and no search at all all say unsupported', () => {
    const w = fakeWindow()
    connect('kehikot.x', { onFind: () => 'unsupported' }, { source: w.source, findKeys: false, pointerTarget: false }).listen()
    w.deliver(hello(true))
    w.deliver(find('f1', 'word', 'first'))
    const v = fakeWindow()
    connect('kehikot.x', { onFind: () => { throw new Error('no') } }, { source: v.source, findKeys: false, pointerTarget: false }).listen()
    v.deliver(hello(true))
    v.deliver(find('f1', 'word', 'first'))
    const u = fakeWindow()
    connect('kehikot.x', {}, { source: u.source, findKeys: false, pointerTarget: false, findIn: false }).listen()
    u.deliver(hello(true))
    u.deliver(find('f1', 'word', 'first'))
    for (const sent of [w.sent, v.sent, u.sent]) {
      expect(results(sent)).toEqual([{ type: MESSAGE.FIND_RESULT, id: 'f1', total: 0, current: 0, unsupported: true }])
    }
  })

  test('close tells onFind, answers nothing, and later findResult calls are dropped', () => {
    const w = fakeWindow()
    const directions: string[] = []
    const c = connect('kehikot.x', { onFind: (_q, ask) => void directions.push(ask.direction) }, { source: w.source, findKeys: false, pointerTarget: false }).listen()
    w.deliver(hello(true))
    w.deliver(find('f1', 'word', 'first'))
    c.findResult({ total: 9, current: 12 })
    w.deliver(find('f2', '', 'close'))
    c.findResult({ total: 1, current: 1 })
    expect(directions).toEqual(['first', 'close'])
    expect(results(w.sent)).toEqual([{ type: MESSAGE.FIND_RESULT, id: 'f1', total: 9, current: 9 }])
  })
})

/* ------------------------------------------------------------------------ */

function page(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

const shown = (element: Element) => !element.closest('[data-hidden]')
const marked = (root: Element) => [...root.querySelectorAll(`mark[${FIND_MARK_ATTRIBUTE}]`)]
const currentText = (root: Element) => [...root.querySelectorAll(`mark[${FIND_MARK_ATTRIBUTE}][data-current]`)].map((m) => m.textContent).join('')

afterEach(() => {
  document.body.innerHTML = ''
})

describe('pageFind, marking with <mark>', () => {
  test('marks and counts the visible matches, across text nodes, and skips the hidden', () => {
    const root = page('<p>One kehikko, <b>kehi</b>kko two.</p><p data-hidden>kehikko</p><script>kehikko</script>')
    const search = pageFind(() => {}, { root, visible: shown, highlights: false })
    expect(search.run('kehikko', { caseSensitive: false, wholeWord: false }, 'first')).toEqual({ total: 2, current: 1 })
    expect(marked(root).map((m) => m.textContent)).toEqual(['kehikko', 'kehi', 'kko'])
    expect(currentText(root)).toBe('kehikko')
    search.close()
  })

  test('next and prev move the current match and wrap', () => {
    const root = page('<p>a x b x c x</p>')
    const search = pageFind(() => {}, { root, visible: shown, highlights: false })
    const opts = { caseSensitive: false, wholeWord: true }
    expect(search.run('x', opts, 'first')).toEqual({ total: 3, current: 1 })
    expect(search.run('x', opts, 'next')).toEqual({ total: 3, current: 2 })
    expect(search.run('x', opts, 'next')).toEqual({ total: 3, current: 3 })
    expect(search.run('x', opts, 'next')).toEqual({ total: 3, current: 1 })
    expect(search.run('x', opts, 'prev')).toEqual({ total: 3, current: 3 })
    expect(root.querySelectorAll('[data-current]')).toHaveLength(1)
    search.close()
  })

  test('close takes every mark away and leaves the text as it was', () => {
    const root = page('<p>One kehikko, <b>kehi</b>kko two.</p>')
    const before = root.innerHTML
    const search = pageFind(() => {}, { root, visible: shown, highlights: false })
    search.run('kehikko', { caseSensitive: false, wholeWord: false }, 'first')
    search.close()
    expect(marked(root)).toHaveLength(0)
    expect(root.innerHTML).toBe(before)
    expect(root.querySelector('p')!.childNodes).toHaveLength(3)
  })

  test('a change to the page is searched again, and the new count said', async () => {
    const root = page('<p>one match</p>')
    const said: unknown[] = []
    const search = pageFind((count) => said.push(count), { root, visible: shown, highlights: false, recountAfter: 5 })
    expect(search.run('match', { caseSensitive: false, wholeWord: false }, 'first')).toEqual({ total: 1, current: 1 })
    const more = document.createElement('p')
    more.textContent = 'another match'
    root.appendChild(more)
    await new Promise((r) => setTimeout(r, 40))
    expect(said).toEqual([{ total: 2, current: 1 }])
    expect(marked(root)).toHaveLength(2)
    search.close()
  })

  test('an empty query clears and counts nothing', () => {
    const root = page('<p>text</p>')
    const search = pageFind(() => {}, { root, visible: shown, highlights: false })
    search.run('text', { caseSensitive: false, wholeWord: false }, 'first')
    expect(search.run('', { caseSensitive: false, wholeWord: false }, 'first')).toEqual({ total: 0, current: 0 })
    expect(marked(root)).toHaveLength(0)
  })
})

describe('pageFind, marking with CSS.highlights', () => {
  test('registers ranges instead of changing the DOM, and deletes them on close', () => {
    const registry = new Map<string, { ranges: Range[] }>()
    const api = {
      registry: { set: (name: string, h: unknown) => void registry.set(name, h as { ranges: Range[] }), delete: (name: string) => void registry.delete(name) },
      Highlight: class {
        ranges: Range[]
        constructor(...ranges: Range[]) {
          this.ranges = ranges
        }
      },
    }
    const root = page('<p>One kehikko, <b>kehi</b>kko two.</p>')
    const before = root.innerHTML
    const search = pageFind(() => {}, { root, visible: shown, highlights: api })
    expect(search.run('KEHIKKO', { caseSensitive: false, wholeWord: false }, 'first')).toEqual({ total: 2, current: 1 })
    expect(root.innerHTML).toBe(before)
    expect(registry.get(FIND_HIGHLIGHT)!.ranges.map((r) => r.toString())).toEqual(['kehikko', 'kehikko'])
    expect(registry.get(FIND_HIGHLIGHT_CURRENT)!.ranges[0]!.toString()).toBe('kehikko')
    search.run('KEHIKKO', { caseSensitive: false, wholeWord: false }, 'next')
    expect(registry.get(FIND_HIGHLIGHT_CURRENT)!.ranges[0]!.startContainer.parentElement!.tagName).toBe('B')
    search.close()
    expect(registry.size).toBe(0)
  })
})

describe('connect searches the page by itself', () => {
  test('with no onFind, a find marks the page and says the count', () => {
    const root = page('<p>alpha beta alpha</p>')
    const w = fakeWindow()
    connect('kehikot.x', {}, { source: w.source, findKeys: false, pointerTarget: false, findIn: { root, visible: shown, highlights: false } }).listen()
    w.deliver(hello(true))
    w.deliver(find('f1', 'alpha', 'first'))
    w.deliver(find('f2', 'alpha', 'next'))
    expect(results(w.sent)).toEqual([
      { type: MESSAGE.FIND_RESULT, id: 'f1', total: 2, current: 1 },
      { type: MESSAGE.FIND_RESULT, id: 'f2', total: 2, current: 2 },
    ])
    w.deliver(find('f3', 'alpha', 'close'))
    expect(marked(root)).toHaveLength(0)
  })

  test('onFind answering default hands the search to the client', () => {
    const root = page('<p>alpha</p>')
    const w = fakeWindow()
    connect('kehikot.x', { onFind: () => 'default' }, { source: w.source, findKeys: false, pointerTarget: false, findIn: { root, visible: shown, highlights: false } }).listen()
    w.deliver(hello(true))
    w.deliver(find('f1', 'alpha', 'first'))
    expect(results(w.sent)).toEqual([{ type: MESSAGE.FIND_RESULT, id: 'f1', total: 1, current: 1 }])
  })
})
