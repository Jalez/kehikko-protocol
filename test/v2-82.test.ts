import { afterEach, describe, expect, test } from 'bun:test'

import {
  BACKGROUND_ATTR,
  BACKGROUND_CSS,
  BACKGROUND_KEY,
  BACKGROUND_STYLE_ID,
  MESSAGE,
  PAGE_MARK,
  PROTOCOL,
  backgroundOf,
  contextSchema,
} from '../src/index.js'
import { applyBackground, applyTheme, connect, hostStore, makeMailbox, pageBackground, type MessageSource } from '../src/client/index.js'
import { pageDocument, themeScript } from '../src/serve/index.js'

/**
 * 2.82.0. The container's background: the host says `card` or `none` in the context, and the client
 * puts it on `<html>` so a page with the container's background off is transparent.
 */

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

const host = { postMessage: () => {} }
const hello = (context: Record<string, unknown>) => ({
  data: { type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's1', context },
  origin: 'null',
  source: host,
})
const contextOf = (context: Record<string, unknown>) => ({ data: { type: MESSAGE.CONTEXT, protocol: PROTOCOL, ...context }, source: host })

const html = () => document.documentElement

afterEach(() => {
  html().removeAttribute(BACKGROUND_ATTR)
  html().style.colorScheme = ''
  html().className = ''
  document.getElementById(BACKGROUND_STYLE_ID)?.remove()
  localStorage.removeItem(BACKGROUND_KEY)
})

describe('the context says it', () => {
  test('`appearance.background` is `card` or `none`; absent from an older host', () => {
    expect(contextSchema.parse({ appearance: { background: 'none' } }).appearance).toEqual({ background: 'none' })
    expect(contextSchema.parse({}).appearance).toBeUndefined()
  })

  test('a word this package does not know reads as `card`, and a broken one as absent', () => {
    expect(contextSchema.parse({ appearance: { background: 'glass' } }).appearance).toEqual({ background: 'card' })
    expect(contextSchema.parse({ appearance: 'none' }).appearance).toBeUndefined()
  })

  test('`backgroundOf` is `card` unless the host said `none`', () => {
    expect(backgroundOf({ appearance: { background: 'none' } })).toBe('none')
    expect(backgroundOf({ appearance: { background: 'card' } })).toBe('card')
    expect(backgroundOf({})).toBe('card')
    expect(backgroundOf(null)).toBe('card')
  })
})

describe('applyBackground', () => {
  test('puts the attribute on <html>, adds the style once, and says the color-scheme', () => {
    applyBackground('none', { theme: 'dark' })
    applyBackground('none', { theme: 'dark' })
    expect(html().getAttribute(BACKGROUND_ATTR)).toBe('none')
    expect(document.querySelectorAll(`#${BACKGROUND_STYLE_ID}`)).toHaveLength(1)
    expect(document.getElementById(BACKGROUND_STYLE_ID)?.textContent).toBe(BACKGROUND_CSS)
    expect(html().style.colorScheme).toBe('dark')
    expect(pageBackground()).toBe('none')
    applyBackground('card')
    expect(pageBackground()).toBe('card')
  })

  test('remembers it only when asked', () => {
    applyBackground('none')
    expect(localStorage.getItem(BACKGROUND_KEY)).toBeNull()
    applyBackground('none', { remember: true })
    expect(localStorage.getItem(BACKGROUND_KEY)).toBe('none')
  })

  test('the style makes html, body, #root and the marked element transparent, and only under `none`', () => {
    for (const at of ['body', '#root', `[${PAGE_MARK}]`]) expect(BACKGROUND_CSS).toContain(`html[${BACKGROUND_ATTR}="none"] ${at}`)
    expect(BACKGROUND_CSS).toContain(`html[${BACKGROUND_ATTR}="none"],`)
    expect(BACKGROUND_CSS).toContain('background:transparent!important')
    expect(BACKGROUND_CSS).not.toContain('"card"')
  })

  test('a transparent page really is: the marked element computes no background', () => {
    /* A fresh element per reading: happy-dom keeps an element's computed style once read. */
    const marked = () => {
      const page = document.createElement('div')
      page.setAttribute(PAGE_MARK, '')
      page.style.backgroundColor = 'rgb(255, 0, 0)'
      document.body.appendChild(page)
      const colour = getComputedStyle(page).backgroundColor
      page.remove()
      return colour
    }
    applyBackground('card')
    expect(marked()).toBe('rgb(255, 0, 0)')
    applyBackground('none')
    expect(marked()).not.toBe('rgb(255, 0, 0)')
  })

  test('applyTheme says the color-scheme too', () => {
    applyTheme('light')
    expect(html().style.colorScheme).toBe('light')
  })
})

describe('connect applies it by default', () => {
  test('on the greeting and on every context after it', () => {
    const { source, deliver } = fakeWindow()
    connect(ID, {}, { source }).listen()
    deliver(hello({ theme: 'dark', appearance: { background: 'none' } }))
    expect(html().getAttribute(BACKGROUND_ATTR)).toBe('none')
    expect(html().style.colorScheme).toBe('dark')
    expect(localStorage.getItem(BACKGROUND_KEY)).toBe('none')
    deliver(contextOf({ theme: 'light', appearance: { background: 'card' } }))
    expect(html().getAttribute(BACKGROUND_ATTR)).toBe('card')
    expect(html().style.colorScheme).toBe('light')
  })

  test('a host that says nothing is a card', () => {
    const { source, deliver } = fakeWindow()
    connect(ID, {}, { source }).listen()
    deliver(hello({ theme: 'light' }))
    expect(html().getAttribute(BACKGROUND_ATTR)).toBe('card')
  })

  test('`appearance: false` leaves the page alone', () => {
    const { source, deliver } = fakeWindow()
    connect(ID, {}, { source, appearance: false }).listen()
    deliver(hello({ theme: 'dark', appearance: { background: 'none' } }))
    expect(html().hasAttribute(BACKGROUND_ATTR)).toBe(false)
  })

  test('through hostStore too; `applyTheme: false` leaves it alone unless `appearance` says otherwise', () => {
    const listeners = new Set<(ev: MessageEvent) => void>()
    const box = () => {
      listeners.clear()
      return makeMailbox({ parent: null, addEventListener: (_type: 'message', fn: (ev: MessageEvent) => void) => void listeners.add(fn) })
    }
    const post = (data: unknown) => {
      for (const fn of [...listeners]) fn({ data, origin: 'null', source: host } as MessageEvent)
    }
    const greeting = { type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's1', context: { theme: 'dark', appearance: { background: 'none' } } }

    let store = hostStore(ID, {}, { source: box(), grace: 0, reloadWhenStale: false }).start()
    post(greeting)
    expect(html().getAttribute(BACKGROUND_ATTR)).toBe('none')
    store.stop()
    html().removeAttribute(BACKGROUND_ATTR)

    store = hostStore(ID, {}, { source: box(), grace: 0, reloadWhenStale: false, applyTheme: false }).start()
    post(greeting)
    expect(html().hasAttribute(BACKGROUND_ATTR)).toBe(false)
    store.stop()

    store = hostStore(ID, {}, { source: box(), grace: 0, reloadWhenStale: false, applyTheme: false, appearance: true }).start()
    post(greeting)
    expect(html().getAttribute(BACKGROUND_ATTR)).toBe('none')
    store.stop()
  })
})

describe('the first paint', () => {
  const at = (url: string) => (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM.setURL(url)
  const framed = (run: () => void) => {
    const own = Object.getOwnPropertyDescriptor(window, 'parent')
    Object.defineProperty(window, 'parent', { configurable: true, value: {} })
    try {
      run()
    } finally {
      if (own) Object.defineProperty(window, 'parent', own)
      else delete (window as unknown as { parent?: unknown }).parent
    }
  }
  afterEach(() => at('about:blank'))
  const run = () => new Function(themeScript())()

  test('the page document carries the transparent style', () => {
    expect(pageDocument({ title: 'x' })).toContain(BACKGROUND_CSS)
  })

  test('a framed page paints what the host said last time', () => {
    localStorage.setItem(BACKGROUND_KEY, 'none')
    framed(run)
    expect(html().getAttribute(BACKGROUND_ATTR)).toBe('none')
    expect(['light', 'dark']).toContain(html().style.colorScheme)
  })

  test('a page nothing frames ignores the remembered background', () => {
    localStorage.setItem(BACKGROUND_KEY, 'none')
    run()
    expect(html().hasAttribute(BACKGROUND_ATTR)).toBe(false)
  })

  test('the address wins', () => {
    localStorage.setItem(BACKGROUND_KEY, 'card')
    at('http://127.0.0.1:9000/app?background=none')
    framed(run)
    expect(html().getAttribute(BACKGROUND_ATTR)).toBe('none')
  })
})
