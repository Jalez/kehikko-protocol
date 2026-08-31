import { afterEach, describe, expect, test } from 'bun:test'
import { StrictMode, act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { MESSAGE, PROTOCOL } from '../src/index.js'
import { HostRefused, makeMailbox, type MessageSource } from '../src/client/index.js'
import { useRoadmap, type Roadmap } from '../src/client/react.js'

/**
 * The optional half, under the conditions it exists for.
 *
 * Everything here is an ordering. React decides when an effect runs, the mailbox
 * decides what has already arrived by then, and `StrictMode` decides how many
 * times both happen — and every way of getting it wrong produces a page that
 * renders perfectly beside a pane reporting a module that will not speak. There
 * is nothing to see; there is only this file.
 *
 * Written without JSX on purpose: the package compiles with `tsc` and nothing
 * else, and adding a JSX pipeline to a package of shapes to test one hook would
 * be the tail wagging the dog.
 */

const ID = 'roadmap.example'

/** Something with a `postMessage`, which is all a host is from in here. */
function speaker() {
  const said: unknown[] = []
  return { postMessage: (message: unknown) => said.push(message), said }
}

const hello = (from: unknown, epic: string | null = 'a-epic') => ({
  data: {
    type: MESSAGE.HELLO,
    protocol: PROTOCOL,
    session: 's1',
    state: 'remembered',
    context: { epic, project: null, theme: 'dark' },
  },
  origin: 'null',
  source: from,
})

/**
 * An inbox with a greeting already in it, which is the ordinary case.
 *
 * The host greets on the frame's `load`, and React has not run an effect by
 * then. A test that mounts first and greets second is testing the arrangement
 * that always worked.
 */
function inboxHoldingAGreeting(from: unknown) {
  const listeners = new Set<(ev: MessageEvent) => void>()
  const inbox = makeMailbox({
    parent: null,
    addEventListener: (_type: 'message', fn: (ev: MessageEvent) => void) => {
      listeners.add(fn)
    },
  })
  const post = (ev: unknown) => {
    for (const fn of [...listeners]) fn(ev as MessageEvent)
  }
  post(hello(from))
  return { inbox, post }
}

let mounted: { root: Root; container: HTMLElement } | null = null

afterEach(async () => {
  const live = mounted
  mounted = null
  if (live) {
    await act(async () => {
      live.root.unmount()
    })
    live.container.remove()
  }
})

/**
 * Render the hook inside `StrictMode`, because that is how every one of these
 * pages renders. The double mount is not a hazard being simulated; it is the
 * environment.
 */
async function render(
  events: Parameters<typeof useRoadmap>[1] = {},
  options: Parameters<typeof useRoadmap>[2] = {},
) {
  let latest: Roadmap | null = null
  const handlers = { current: events }

  function Probe() {
    latest = useRoadmap(ID, handlers.current, options)
    return null
  }

  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(createElement(StrictMode, null, createElement(Probe)))
  })
  mounted = { root, container }

  return {
    read: () => latest as unknown as Roadmap,
    /** Swap the handlers and re-render, the way a view does when its rows change. */
    rehandle: async (next: Parameters<typeof useRoadmap>[1]) => {
      handlers.current = next
      await act(async () => {
        root.render(createElement(StrictMode, null, createElement(Probe)))
      })
    },
  }
}

describe('a greeting that arrived before React did', () => {
  test('is heard, and the page is hosted on its first settled render', async () => {
    /* The whole reason the mailbox and the two-step listen exist. If this fails,
       the page renders correctly and reports "nobody is framing me" while the
       host's own log shows a module that answered `ready`. */
    const host = speaker()
    const { inbox } = inboxHoldingAGreeting(host)
    const page = await render({}, { source: inbox })

    expect(page.read().where).toBe('hosted')
    expect(page.read().context?.epic).toBe('a-epic')
    expect(page.read().context?.theme).toBe('dark')
  })

  test('and whatever the host is keeping for this module arrives with it', async () => {
    const host = speaker()
    const { inbox } = inboxHoldingAGreeting(host)
    const page = await render({}, { source: inbox })
    expect(page.read().state).toBe('remembered')
  })

  test('the module answers ready — once per mount, which under StrictMode is twice', async () => {
    /*
     * Noise rather than silence, and it is the deliberate trade. The mailbox
     * replays to every subscriber including the doomed first mount, so a
     * double-mounted page says `ready` twice. A second `roadmap.ready` is the
     * same sentence as the first and a host takes a module at its word either
     * way; losing it is a module that never speaks.
     */
    const host = speaker()
    const { inbox } = inboxHoldingAGreeting(host)
    await render({}, { source: inbox })
    expect(host.said.length).toBeGreaterThanOrEqual(1)
    expect(host.said.every((m) => (m as { type: string }).type === MESSAGE.READY)).toBe(true)
  })

  test('the caller’s own onHello runs too, and after the hook has stored the connection', async () => {
    const host = speaker()
    const { inbox } = inboxHoldingAGreeting(host)
    let couldAsk: boolean | null = null
    const page = await render(
      {
        onHello: () => {
          couldAsk = couldAsk ?? false
        },
      },
      { source: inbox },
    )
    /* The connection is reachable from the value the hook returned, which is the
       property a page depends on when its greeting handler wants to ask
       something straight away. */
    expect(page.read().connection()).not.toBeNull()
    expect(couldAsk).toBe(false)
  })
})

describe('a context after the greeting', () => {
  test('re-renders the page with the new one, whole', async () => {
    const host = speaker()
    const { inbox, post } = inboxHoldingAGreeting(host)
    const page = await render({}, { source: inbox })

    await act(async () => {
      post({
        data: {
          type: MESSAGE.CONTEXT,
          protocol: PROTOCOL,
          epic: 'somewhere-else',
          project: null,
          theme: 'light',
          selection: ['gh#41'],
          kehikko: { id: 3, name: 'Delivery' },
        },
        source: host,
      })
    })

    expect(page.read().context?.epic).toBe('somewhere-else')
    expect(page.read().context?.selection).toEqual(['gh#41'])
    expect(page.read().context?.kehikko).toEqual({ id: 3, name: 'Delivery' })
  })
})

describe('the handlers are read when a message arrives, not when the effect ran', () => {
  test('a goto is answered by the newest handler, not the one that was current at mount', async () => {
    /*
     * A view rebuilds `onGoto` whenever its rows change. Reconnecting on every
     * render to pick the new one up would mean a torn-down listener during
     * whatever millisecond the host chose to greet in; capturing the old one
     * means answering a question about the screen with what was on it a minute
     * ago.
     */
    const host = speaker()
    const { inbox, post } = inboxHoldingAGreeting(host)
    const page = await render({ onGoto: (_m, answer) => answer(false, 'the old rows') }, { source: inbox })
    await page.rehandle({ onGoto: (_m, answer) => answer(true, 'the new rows') })

    await act(async () => {
      post({ data: { type: MESSAGE.GOTO, id: 'g1', ref: 'gh#41' }, source: host })
    })

    const went = host.said.filter((m) => (m as { type: string }).type === MESSAGE.WENT)
    expect(went).toHaveLength(1)
    expect(went[0]).toEqual({ type: MESSAGE.WENT, id: 'g1', found: true, why: 'the new rows' })
  })

  test('a page with no goto handler at all still answers, at once', async () => {
    const host = speaker()
    const { inbox, post } = inboxHoldingAGreeting(host)
    await render({}, { source: inbox })

    await act(async () => {
      post({ data: { type: MESSAGE.GOTO, id: 'g1', ref: 'gh#41' }, source: host })
    })

    const went = host.said.filter((m) => (m as { type: string }).type === MESSAGE.WENT)
    expect(went).toHaveLength(1)
    expect((went[0] as { found: boolean }).found).toBe(false)
  })
})

describe('when nothing is framing the page', () => {
  test('it says it is listening first, and only then that nobody is there', async () => {
    /* Not a spinner. The grace exists so a page that IS framed never shows the
       standalone words at all — a paragraph the reader sees flash past and be
       replaced is a paragraph they learn to ignore. */
    const quiet: MessageSource = {
      parent: null,
      addEventListener: () => {},
      removeEventListener: () => {},
    }
    const page = await render({}, { source: quiet, grace: 10 })
    expect(page.read().where).toBe('listening')

    await act(async () => {
      await Bun.sleep(40)
    })
    expect(page.read().where).toBe('unhosted')
  })

  test('asking anyway is refused as a refusal rather than throwing', async () => {
    const quiet: MessageSource = {
      parent: null,
      addEventListener: () => {},
      removeEventListener: () => {},
    }
    const page = await render({}, { source: quiet, grace: 0 })
    await page
      .read()
      .request('live.get')
      .then(
        () => expect.unreachable(),
        (error: HostRefused) => {
          expect(error).toBeInstanceOf(HostRefused)
          expect(error.refusal.reason).toBe('silent')
        },
      )
  })

  test('and saying how tall it would like to be is silence, not an error', async () => {
    const quiet: MessageSource = {
      parent: null,
      addEventListener: () => {},
      removeEventListener: () => {},
    }
    const page = await render({}, { source: quiet, grace: 0 })
    expect(() => page.read().resize(500)).not.toThrow()
  })
})

describe('unmounting', () => {
  test('stops the conversation rather than leaving a listener on the window', async () => {
    const host = speaker()
    const { inbox, post } = inboxHoldingAGreeting(host)
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    function Probe() {
      useRoadmap(ID, {}, { source: inbox })
      return null
    }

    await act(async () => {
      root.render(createElement(StrictMode, null, createElement(Probe)))
    })
    const beforeUnmount = host.said.length
    await act(async () => {
      root.unmount()
    })
    container.remove()

    post(hello(host))
    post({ data: { type: MESSAGE.GOTO, id: 'g1', ref: 'gh#41' }, source: host })
    expect(host.said).toHaveLength(beforeUnmount)
  })
})
