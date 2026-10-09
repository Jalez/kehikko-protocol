import { afterEach, describe, expect, test } from 'bun:test'
import { StrictMode, act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { MESSAGE, PROTOCOL, THEME_KEY } from '../src/index.js'
import { makeMailbox, resetServerStanding, type HostEvents } from '../src/client/index.js'
import {
  COVER_STYLE_ID,
  COVER_WORDS,
  Cover,
  TRY_AGAIN,
  coverFor,
  hostFields,
  useHost,
  useServerStanding,
  type CoverState,
  type Host,
  type UseHostOptions,
} from '../src/client/react.js'
import { ask } from '../src/client/index.js'

const ID = 'kehikot.example'

function speaker() {
  const said: { type: string; method?: string; params?: unknown; id?: string }[] = []
  return { postMessage: (message: unknown) => said.push(message as never), said }
}

function inbox(from: unknown, greeting: Record<string, unknown> | null) {
  const listeners = new Set<(ev: MessageEvent) => void>()
  const box = makeMailbox({
    parent: null,
    addEventListener: (_type: 'message', fn: (ev: MessageEvent) => void) => void listeners.add(fn),
  })
  const post = (data: unknown) => {
    for (const fn of [...listeners]) fn({ data, origin: 'null', source: from } as MessageEvent)
  }
  if (greeting) post(greeting)
  return { box, post }
}

const hello = (context: Record<string, unknown>, state: string | null = null) => ({
  type: MESSAGE.HELLO,
  protocol: PROTOCOL,
  session: 's1',
  state,
  context,
})

let mounted: { root: Root; container: HTMLElement } | null = null
afterEach(async () => {
  const live = mounted
  mounted = null
  if (live) {
    await act(async () => live.root.unmount())
    live.container.remove()
  }
  document.documentElement.className = ''
  localStorage.removeItem(THEME_KEY)
  document.getElementById(COVER_STYLE_ID)?.remove()
  resetServerStanding()
})

async function mount(element: ReturnType<typeof createElement>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => root.render(createElement(StrictMode, null, element)))
  mounted = { root, container }
  return container
}

async function render<Kept = unknown>(events: HostEvents = {}, options: UseHostOptions<Kept> = {}) {
  let latest: Host<Kept> | null = null
  const seen: Host<Kept>[] = []
  function Probe() {
    latest = useHost<Kept>(ID, events, options)
    seen.push(latest)
    return null
  }
  await mount(createElement(Probe))
  return { read: () => latest as unknown as Host<Kept>, seen }
}

const CONTEXT = {
  epic: 'a-epic',
  project: 'Thesis',
  projectPath: '/work/thesis',
  theme: 'dark',
  selection: ['gh#41'],
  filters: { kind: ['open'] },
  parts: [{ id: 'm', heading: 'Methods', refs: [], picked: true, files: [] }],
}

describe('useHost: where', () => {
  test('a greeting that arrived before React is heard: hosted on the first settled render, never unhosted on the way', async () => {
    const host = speaker()
    const page = await render({}, { source: inbox(host, hello(CONTEXT)).box })
    expect(page.read().where).toBe('hosted')
    expect(page.seen.some((one) => one.where === 'unhosted')).toBe(false)
  })

  test('listening, and unhosted only once the grace has run out', async () => {
    const page = await render({}, { source: inbox(speaker(), null).box, grace: 30 })
    expect(page.read().where).toBe('listening')
    await act(async () => void (await new Promise((resolve) => setTimeout(resolve, 60))))
    expect(page.read().where).toBe('unhosted')
  })

  test('a greeting after the grace still makes it hosted', async () => {
    const host = speaker()
    const { box, post } = inbox(host, null)
    const page = await render({}, { source: box, grace: 10 })
    await act(async () => void (await new Promise((resolve) => setTimeout(resolve, 30))))
    expect(page.read().where).toBe('unhosted')
    await act(async () => post(hello(CONTEXT)))
    expect(page.read().where).toBe('hosted')
  })
})

describe('useHost: the flattened context', () => {
  test('every field a screen reads is on the value, and the whole context still is', async () => {
    const page = await render({}, { source: inbox(speaker(), hello(CONTEXT)).box })
    const host = page.read()
    expect(host.project).toBe('Thesis')
    expect(host.projectPath).toBe('/work/thesis')
    expect(host.epic).toBe('a-epic')
    expect(host.selection).toEqual(['gh#41'])
    expect(host.parts[0]?.heading).toBe('Methods')
    expect(host.chosen).toEqual({ kind: ['open'] })
    expect(host.passage).toBeNull()
    expect(host.containers).toEqual([])
    expect(host.context?.epic).toBe('a-epic')
  })

  test('an empty string is no project, and nothing is null rather than undefined before the greeting', () => {
    expect(hostFields({ project: '', projectPath: '', epic: '' } as never)).toMatchObject({ project: null, projectPath: null, epic: null })
    const none = hostFields(null)
    expect(none.projectPath).toBeNull()
    expect(none.parts).toEqual([])
    /* The same empty array every time, so an effect depending on it does not re-run. */
    expect(hostFields(null).parts).toBe(none.parts)
  })

  test('a later context replaces it', async () => {
    const { box, post } = inbox(speaker(), hello(CONTEXT))
    const page = await render({}, { source: box })
    await act(async () => post({ type: MESSAGE.CONTEXT, protocol: PROTOCOL, ...CONTEXT, epic: 'b-epic', theme: 'light' }))
    expect(page.read().epic).toBe('b-epic')
    expect(page.read().theme).toBe('light')
  })
})

describe('useHost: the theme', () => {
  test('the host’s theme goes on <html>, both ways, and is remembered for the next load', async () => {
    const { box, post } = inbox(speaker(), hello(CONTEXT))
    const page = await render({}, { source: box })
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
    expect(page.read().theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    await act(async () => post({ type: MESSAGE.CONTEXT, protocol: PROTOCOL, ...CONTEXT, theme: 'light' }))
    expect(document.documentElement.className).toBe('light')
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
  })

  test('before the greeting it is what the document already decided', async () => {
    document.documentElement.classList.add('dark')
    const page = await render({}, { source: inbox(speaker(), null).box, grace: 0 })
    expect(page.read().theme).toBe('dark')
    expect(document.documentElement.className).toBe('dark')
  })

  test('unhosted with nothing decided, the page takes the system’s; `applyTheme: false` leaves <html> alone', async () => {
    await render({}, { source: inbox(speaker(), null).box, grace: 10 })
    await act(async () => void (await new Promise((resolve) => setTimeout(resolve, 30))))
    expect(['light', 'dark']).toContain(document.documentElement.className)
    document.documentElement.className = ''
    await act(async () => mounted?.root.unmount())
    mounted?.container.remove()
    mounted = null
    await render({}, { source: inbox(speaker(), hello(CONTEXT)).box, applyTheme: false })
    expect(document.documentElement.className).toBe('')
  })
})

describe('useHost: kept state', () => {
  type Kept = 'project' | 'kehikot'
  const codec = {
    read: (state: string | null): Kept | null => (state === 'project' || state === 'kehikot' ? state : null),
    write: (kept: Kept) => kept,
  }

  test('what the host kept arrives through the codec, with the first hosted render', async () => {
    const page = await render<Kept>({}, { source: inbox(speaker(), hello(CONTEXT, 'kehikot')).box, kept: codec })
    expect(page.read().kept).toBe('kehikot')
    expect(page.seen.find((one) => one.where === 'hosted')?.kept).toBe('kehikot')
  })

  test('a string the codec does not recognise is null, not a guess', async () => {
    const page = await render<Kept>({}, { source: inbox(speaker(), hello(CONTEXT, 'something-older')).box, kept: codec })
    expect(page.read().kept).toBeNull()
  })

  test('JSON by default', async () => {
    const page = await render<{ tab: string }>({}, { source: inbox(speaker(), hello(CONTEXT, '{"tab":"b"}')).box })
    expect(page.read().kept).toEqual({ tab: 'b' })
  })

  test('remember holds the value and asks the host to keep it, once, in the codec’s spelling', async () => {
    const host = speaker()
    const page = await render<Kept>({}, { source: inbox(host, hello(CONTEXT, 'kehikot')).box, kept: codec })
    const before = page.read().remember
    await act(async () => page.read().remember('project'))
    expect(page.read().kept).toBe('project')
    const asked = host.said.filter((one) => one.type === MESSAGE.REQUEST)
    expect(asked.length).toBe(1)
    expect(asked[0]?.method).toBe('state.set')
    expect(asked[0]?.params).toEqual({ state: 'project' })
    expect(page.read().remember).toBe(before)
  })

  test('remember with nobody framing the page holds the value and asks nobody', async () => {
    const host = speaker()
    const page = await render<Kept>({}, { source: inbox(host, null).box, kept: codec, grace: 0 })
    await act(async () => page.read().remember('project'))
    expect(page.read().kept).toBe('project')
    expect(host.said.length).toBe(0)
  })
})

describe('useHost: asking and being asked', () => {
  test('request is stable across renders and refuses before a greeting', async () => {
    const { box, post } = inbox(speaker(), null)
    const page = await render({}, { source: box, grace: 0 })
    const first = page.read().request
    await expect(first('epics.list')).rejects.toThrow()
    await act(async () => post(hello(CONTEXT)))
    expect(page.read().request).toBe(first)
  })

  test('onGoto reaches the newest handler; with none the host is told there is nothing to walk to', async () => {
    const host = speaker()
    const { box, post } = inbox(host, hello(CONTEXT))
    const heard: unknown[] = []
    await render({ onGoto: (message, answer) => (heard.push(message), answer(true)) }, { source: box })
    await act(async () => post({ type: MESSAGE.GOTO, protocol: PROTOCOL, id: 'g1', ref: 'gh#41' }))
    expect(heard.length).toBeGreaterThanOrEqual(1)
  })

  test('onClear and onRefresh reach the page', async () => {
    const { box, post } = inbox(speaker(), hello(CONTEXT))
    const heard: string[] = []
    await render({ onClear: () => heard.push('clear'), onRefresh: () => heard.push('refresh') }, { source: box })
    await act(async () => {
      post({ type: MESSAGE.CLEAR, protocol: PROTOCOL })
      post({ type: MESSAGE.REFRESH, protocol: PROTOCOL })
    })
    expect(heard).toEqual(['clear', 'refresh'])
  })

  test('point says which passage, and says nothing to nobody', async () => {
    const host = speaker()
    const page = await render({}, { source: inbox(host, hello(CONTEXT)).box })
    await act(async () => page.read().point(null))
    const asked = host.said.filter((one) => one.type === MESSAGE.REQUEST)
    expect(asked[0]?.method).toBe('passage.set')
    expect(asked[0]?.params).toEqual({ passage: null })
  })
})

describe('coverFor', () => {
  const at = (where: Host['where'], projectPath: string | null = null, epic: string | null = null) => ({ where, projectPath, epic })

  test('a page that has not been greeted is waiting — never "no project"', () => {
    expect(coverFor(at('listening'))).toBe('waiting')
    expect(coverFor(at('listening'), { project: true, epic: true })).toBe('waiting')
    expect(coverFor(at('listening'), {})).toBe('waiting')
  })

  test('then unhosted, no project, no epic, in that order, and null when the module can draw', () => {
    expect(coverFor(at('unhosted'))).toBe('unhosted')
    expect(coverFor(at('hosted'))).toBe('no-project')
    expect(coverFor(at('hosted', '/p'))).toBeNull()
    expect(coverFor(at('hosted', '/p'), { project: true, epic: true })).toBe('no-epic')
    expect(coverFor(at('hosted', null), { epic: true })).toBe('no-project')
    expect(coverFor(at('hosted', '/p', 'e'), { project: true, epic: true })).toBeNull()
  })

  test('a module that needs nothing is only ever waiting', () => {
    expect(coverFor(at('unhosted'), {})).toBeNull()
    expect(coverFor(at('hosted'), {})).toBeNull()
  })
})

describe('the cover', () => {
  const STATES: CoverState[] = ['waiting', 'unhosted', 'no-project', 'no-epic', 'loading', 'down', 'stale']

  test('every state is one sentence under the mark, and says which state it is', async () => {
    for (const state of STATES) {
      const container = await mount(createElement(Cover, { state, name: 'History' }))
      const cover = container.querySelector('.kehikot-cover')
      expect(cover?.getAttribute('data-cover')).toBe(state)
      expect(cover?.getAttribute('role')).toBe('status')
      expect(cover?.querySelectorAll('svg').length).toBe(1)
      expect(cover?.querySelectorAll('p').length).toBe(1)
      expect(cover?.querySelector('p')?.textContent).toBe(COVER_WORDS[state]('History'))
      await act(async () => mounted?.root.unmount())
      container.remove()
      mounted = null
    }
  })

  test('the sentences are single sentences, and name the module where they name anything', () => {
    for (const state of STATES) {
      const words = COVER_WORDS[state]('History')
      expect(words.length).toBeLessThan(80)
      expect(words.split(/[.!?]\s/).length).toBe(1)
    }
    expect(COVER_WORDS.down('History')).toBe('History’s own server is not answering.')
    expect(COVER_WORDS.down()).toBe('This app’s own server is not answering.')
    expect(COVER_WORDS.down('Slides')).toBe('Slides’ own server is not answering.')
    expect(COVER_WORDS.unhosted('History')).toContain('open History in Kehikot')
  })

  test('only what is on its way breathes', async () => {
    const container = await mount(
      createElement('div', null, ...STATES.map((state) => createElement(Cover, { key: state, state }))),
    )
    const working = [...container.querySelectorAll('[data-working="true"]')].map((one) => one.getAttribute('data-cover'))
    expect(working).toEqual(['waiting', 'loading', 'stale'])
  })

  test('its stylesheet is added once, themed, and small enough to read', async () => {
    await mount(createElement('div', null, createElement(Cover, { state: 'waiting' }), createElement(Cover, { state: 'loading' })))
    const sheets = document.querySelectorAll(`#${COVER_STYLE_ID}`)
    expect(sheets.length).toBe(1)
    const css = sheets[0]?.textContent ?? ''
    expect(css).toContain('.dark .kehikot-cover')
    expect(css).toContain('var(--muted-foreground')
    expect(css).toContain('prefers-reduced-motion')
    expect(css.length).toBeLessThan(2000)
  })

  test('down offers Try again, which re-asks; no other state has a button', async () => {
    let asked = 0
    const container = await mount(
      createElement(
        'div',
        null,
        createElement(Cover, { state: 'down', onRetry: () => void asked++, detail: 'connection refused' }),
        createElement(Cover, { state: 'loading', onRetry: () => void asked++ }),
      ),
    )
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBe(1)
    expect(buttons[0]?.textContent).toBe(TRY_AGAIN)
    await act(async () => (buttons[0] as HTMLButtonElement).click())
    expect(asked).toBe(1)
    expect(container.querySelector('[data-detail]')?.textContent).toBe('connection refused')
  })

  test('a module’s own sentence replaces the shared one', async () => {
    const container = await mount(createElement(Cover, { state: 'loading' }, 'Reading the history…'))
    expect(container.querySelector('p')?.textContent).toBe('Reading the history…')
  })

  test('stale reloads the page, once, a moment after it is drawn', async () => {
    const real = location.reload
    let reloads = 0
    Object.defineProperty(location, 'reload', { configurable: true, value: () => void reloads++ })
    sessionStorage.removeItem('kehikot.reloaded')
    try {
      await mount(createElement(Cover, { state: 'stale' }))
      await act(async () => void (await new Promise((resolve) => setTimeout(resolve, 1000))))
      expect(reloads).toBe(1)
      /* A second stale page within moments does not reload again: that would be a loop. */
      await act(async () => mounted?.root.unmount())
      mounted?.container.remove()
      mounted = null
      await mount(createElement(Cover, { state: 'stale' }))
      await act(async () => void (await new Promise((resolve) => setTimeout(resolve, 1000))))
      expect(reloads).toBe(1)
    } finally {
      Object.defineProperty(location, 'reload', { configurable: true, value: real })
      sessionStorage.removeItem('kehikot.reloaded')
    }
  })
})

describe('useServerStanding', () => {
  test('follows what ask() learned: down when nothing answers, up when it answers again', async () => {
    let latest = ''
    function Probe() {
      latest = useServerStanding()
      return null
    }
    await mount(createElement(Probe))
    expect(latest).toBe('up')
    const down = (async () => {
      throw new TypeError('Load failed')
    }) as unknown as typeof fetch
    await act(async () => void (await ask('/api/x', { fetch: down })))
    expect(latest).toBe('down')
    const up = (async () => new Response('{}', { status: 200 })) as unknown as typeof fetch
    await act(async () => void (await ask('/api/x', { fetch: up })))
    expect(latest).toBe('up')
  })
})
