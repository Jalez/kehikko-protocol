import { describe, expect, test } from 'bun:test'

import { KEEP, makeMailbox } from '../src/client/index.js'

/**
 * The inbox, without a browser.
 *
 * Everything this file asserts is a thing that has actually gone wrong in a
 * framed page and that no amount of looking at the page will show you: a
 * greeting posted before anybody listened, a backlog that grew without bound, a
 * `StrictMode` remount handed a backlog the greeting was never written into.
 * The whole reason `makeMailbox` takes its window as an argument is so these can
 * be tests rather than an afternoon.
 */

/** A window we can post at, standing in for the frame a module runs in. */
function fakeWindow() {
  const listeners = new Set<(ev: MessageEvent) => void>()
  const target = {
    parent: { postMessage: () => {} } as unknown as Window,
    addEventListener: (_type: 'message', fn: (ev: MessageEvent) => void) => {
      listeners.add(fn)
    },
  }
  const post = (data: unknown) => {
    for (const fn of [...listeners]) fn({ data } as MessageEvent)
  }
  return { target, post, installed: () => listeners.size }
}

describe('listening starts on construction, not on subscription', () => {
  test('the listener is on the window before anybody has asked for anything', () => {
    const { target, installed } = fakeWindow()
    expect(installed()).toBe(0)
    makeMailbox(target)
    /* The whole point. In a page this line runs while the bundle is being
       evaluated, which is before React has rendered and long before an effect
       — and the host greets on `load`, which is in between. */
    expect(installed()).toBe(1)
  })

  test('what arrived before anybody listened is handed over on subscribe', () => {
    const { target, post } = fakeWindow()
    const inbox = makeMailbox(target)
    post({ type: 'roadmap.hello' })
    post({ type: 'roadmap.context' })

    const heard: unknown[] = []
    inbox.addEventListener('message', (ev) => heard.push(ev.data))
    expect(heard).toEqual([{ type: 'roadmap.hello' }, { type: 'roadmap.context' }])
  })

  test('the replay happens inside addEventListener, not after it', () => {
    /* Load-bearing, and the reason `connect` has two steps. A replay deferred to
       a microtask would make the ordering bug in `connect` invisible to every
       test and present in every page, because a task boundary is precisely what
       a `useEffect` has already crossed. */
    const { target, post } = fakeWindow()
    const inbox = makeMailbox(target)
    post({ type: 'roadmap.hello' })

    let duringTheCall = false
    let returned = false
    inbox.addEventListener('message', () => {
      duringTheCall = !returned
    })
    returned = true
    expect(duringTheCall).toBe(true)
  })
})

describe('recorded always, not only while unheard', () => {
  test('a subscriber that comes, goes and comes back hears the greeting again', () => {
    /* The `StrictMode` shape, and the trade written down: the alternative —
       buffering only while nobody is subscribed — loses a greeting that landed
       between the doomed mount's subscribe and its unmount, and losing it is
       silence where repeating it is noise. */
    const { target, post } = fakeWindow()
    const inbox = makeMailbox(target)

    const first: unknown[] = []
    const one = (ev: MessageEvent) => first.push(ev.data)
    inbox.addEventListener('message', one)
    post({ type: 'roadmap.hello' })
    inbox.removeEventListener('message', one)

    const second: unknown[] = []
    inbox.addEventListener('message', (ev) => second.push(ev.data))

    expect(first).toEqual([{ type: 'roadmap.hello' }])
    expect(second).toEqual([{ type: 'roadmap.hello' }])
  })

  test('every live subscriber hears every message, including a doomed one', () => {
    const { target, post } = fakeWindow()
    const inbox = makeMailbox(target)
    const a: unknown[] = []
    const b: unknown[] = []
    inbox.addEventListener('message', (ev) => a.push(ev.data))
    inbox.addEventListener('message', (ev) => b.push(ev.data))
    post({ type: 'roadmap.context' })
    expect(a).toHaveLength(1)
    expect(b).toHaveLength(1)
  })

  test('a listener that has been removed hears nothing more', () => {
    const { target, post } = fakeWindow()
    const inbox = makeMailbox(target)
    const heard: unknown[] = []
    const fn = (ev: MessageEvent) => heard.push(ev.data)
    inbox.addEventListener('message', fn)
    inbox.removeEventListener('message', fn)
    post({ type: 'roadmap.context' })
    expect(heard).toEqual([])
  })
})

describe('the backlog is bounded', () => {
  test('a host talking at a page that never mounts cannot grow it without limit', () => {
    const { target, post } = fakeWindow()
    const inbox = makeMailbox(target)
    for (let n = 0; n < KEEP * 3; n += 1) post({ type: 'roadmap.context', n })

    const heard: { n: number }[] = []
    inbox.addEventListener('message', (ev) => heard.push(ev.data as { n: number }))
    expect(heard).toHaveLength(KEEP)
    /* Oldest go first, because the newest are the ones still worth acting on. */
    expect(heard[0]?.n).toBe(KEEP * 3 - KEEP)
    expect(heard[KEEP - 1]?.n).toBe(KEEP * 3 - 1)
  })
})

describe('forgetting, which is for a test suite and nothing else', () => {
  test('clears what would otherwise leak from one case into the next', () => {
    const { target, post } = fakeWindow()
    const inbox = makeMailbox(target)
    post({ type: 'roadmap.hello' })
    inbox.forget?.()

    const heard: unknown[] = []
    inbox.addEventListener('message', (ev) => heard.push(ev.data))
    expect(heard).toEqual([])
  })
})

describe('outside a browser', () => {
  test('an inbox with no window is an inbox nothing posts to, rather than a crash', () => {
    /* The server half of a module imports the same package. It must not have to
       care that this file mentions `window`. */
    const inbox = makeMailbox(undefined)
    const heard: unknown[] = []
    inbox.addEventListener('message', (ev) => heard.push(ev.data))
    expect(heard).toEqual([])
    expect(inbox.parent).toBeNull()
  })
})
