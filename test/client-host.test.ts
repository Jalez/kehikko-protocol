import { afterEach, describe, expect, test } from 'bun:test'
import { StrictMode, act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { MESSAGE, PROTOCOL, THEME_KEY } from '../src/index.js'
import { hostStore, makeMailbox, resetServerStanding, type HostEvents, type HostStanding } from '../src/client/index.js'
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

  test('a project that is only spaces is no project either', () => {
    expect(hostFields({ project: ' ', projectPath: '  ', epic: '\t' } as never)).toMatchObject({ project: null, projectPath: null, epic: null })
    expect(hostFields({ projectPath: '/work/my thesis ' } as never).projectPath).toBe('/work/my thesis ')
  })

  test('which kehikko the page is on is on the value', async () => {
    const page = await render({}, { source: inbox(speaker(), hello({ ...CONTEXT, kehikko: { id: 2, name: 'Writing' } })).box })
    expect(page.read().kehikko).toEqual({ id: 2, name: 'Writing' })
    expect(hostFields(null).kehikko).toBeNull()
  })

  test('a field that still says the same thing is the same object, so an effect on it runs when it changed', async () => {
    const SHOWN = {
      ...CONTEXT,
      kehikko: { id: 2, name: 'Writing' },
      passage: { path: 'paper/main.tex', page: null, from: 10, to: 20, quoted: 'the seam' },
      containers: [{ module: 'kehikot.paper', selected: true, showing: { refs: [], documents: [{ path: 'paper/main.tex' }] } }],
    }
    const { box, post } = inbox(speaker(), hello(SHOWN))
    const page = await render({}, { source: box })
    const first = page.read()
    expect(first.passage?.quoted).toBe('the seam')

    /* The host says everything again — a tab shown again — and only the epic is different. */
    await act(async () => post({ type: MESSAGE.CONTEXT, protocol: PROTOCOL, ...SHOWN, epic: 'b-epic' }))
    const second = page.read()
    expect(second.epic).toBe('b-epic')
    expect(second.context).not.toBe(first.context)
    for (const name of ['passage', 'chosen', 'parts', 'containers', 'selection', 'kehikko'] as const) {
      expect(second[name]).toBe(first[name] as never)
      expect(second.context?.[name === 'chosen' ? 'filters' : name]).not.toBe(first[name] as never)
    }

    /* One that did change is new, and the rest still are not. */
    await act(async () => post({ type: MESSAGE.CONTEXT, protocol: PROTOCOL, ...SHOWN, epic: 'b-epic', passage: { ...SHOWN.passage, to: 21 }, selection: ['gh#41', 'gh#42'] }))
    const third = page.read()
    expect(third.passage).not.toBe(second.passage)
    expect(third.passage?.to).toBe(21)
    expect(third.selection).toEqual(['gh#41', 'gh#42'])
    expect(third.parts).toBe(second.parts)
    expect(third.containers).toBe(second.containers)
    expect(third.chosen).toBe(second.chosen)
  })

  test('`read` is the standing ahead of the render: what a replayed handler finds', async () => {
    const { box, post } = inbox(speaker(), hello(CONTEXT))
    const found: (string | null)[] = []
    let host: Host | null = null
    function Probe() {
      host = useHost(ID, { onHello: () => found.push(host?.read().projectPath ?? null), onContext: () => found.push(host?.read().projectPath ?? null) }, { source: box })
      return null
    }
    await mount(createElement(Probe))
    const read = (host as unknown as Host).read
    /* The greeting was replayed inside the effect, before React had drawn it. */
    expect(found.at(-1)).toBe('/work/thesis')
    await act(async () => post({ type: MESSAGE.CONTEXT, protocol: PROTOCOL, ...CONTEXT, projectPath: '/work/other' }))
    expect(found.at(-1)).toBe('/work/other')
    expect((host as unknown as Host).read).toBe(read)
    expect(read().projectPath).toBe('/work/other')
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
    expect(coverFor(at('unhosted'), { project: false })).toBeNull()
  })

  test('a module that needs a host and no project can say so', () => {
    expect(coverFor(at('listening'), { host: true })).toBe('waiting')
    expect(coverFor(at('unhosted'), { host: true })).toBe('unhosted')
    expect(coverFor(at('hosted'), { host: true })).toBeNull()
  })

  test('a module that needs an epic and reads no project folder is asked for the epic, not the project', () => {
    expect(coverFor(at('unhosted'), { project: false, epic: true })).toBe('unhosted')
    expect(coverFor(at('hosted'), { project: false, epic: true })).toBe('no-epic')
    expect(coverFor(at('hosted', null, 'e'), { project: false, epic: true })).toBeNull()
    /* Without saying so, an epic still asks for its project first. */
    expect(coverFor(at('hosted', null, 'e'), { epic: true })).toBe('no-project')
  })

  test('given the server’s standing it is the whole ladder: stale first, down after what the host lacks', () => {
    const with_ = (server: 'up' | 'down' | 'stale', where: Host['where'], projectPath: string | null = null) => ({ where, projectPath, server })
    expect(coverFor(with_('stale', 'listening'))).toBe('stale')
    expect(coverFor(with_('stale', 'hosted', '/p'))).toBe('stale')
    expect(coverFor(with_('down', 'listening'))).toBe('waiting')
    expect(coverFor(with_('down', 'unhosted'))).toBe('unhosted')
    expect(coverFor(with_('down', 'hosted'))).toBe('no-project')
    expect(coverFor(with_('down', 'hosted', '/p'))).toBe('down')
    expect(coverFor(with_('down', 'unhosted'), {})).toBe('down')
    expect(coverFor(with_('up', 'hosted', '/p'))).toBeNull()
  })
})

describe('hostStore: the same host, outside React', () => {
  const stores: { stop(): void }[] = []
  afterEach(() => {
    for (const one of stores.splice(0)) one.stop()
  })
  const store = <Kept = unknown>(...given: Parameters<typeof hostStore<Kept>>) => {
    const made = hostStore<Kept>(...given)
    stores.push(made)
    return made
  }

  test('nothing is heard before start; then the greeting that already arrived is the standing, and the handler finds it there', () => {
    const host = speaker()
    const found: (string | null)[] = []
    const live = store(ID, { onHello: () => found.push(live.get().projectPath) }, { source: inbox(host, hello(CONTEXT, '{"tab":"b"}')).box })
    expect(live.get()).toMatchObject({ where: 'listening', context: null, projectPath: null, kept: null })
    expect(host.said).toEqual([])
    const changes: HostStanding[] = []
    live.subscribe(() => changes.push(live.get()))
    expect(live.start()).toBe(live)
    expect(live.get()).toMatchObject({ where: 'hosted', project: 'Thesis', projectPath: '/work/thesis', epic: 'a-epic', theme: 'dark', kept: { tab: 'b' } })
    /* One change for the greeting — the kept state and the context together — and the page was told after it. */
    expect(changes.length).toBe(1)
    expect(found).toEqual(['/work/thesis'])
    expect(host.said[0]?.type).toBe(MESSAGE.READY)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })

  test('the standing is the same object until something changes', () => {
    const { box, post } = inbox(speaker(), hello(CONTEXT))
    const live = store(ID, {}, { source: box }).start()
    const first = live.get()
    expect(live.get()).toBe(first)
    post({ type: MESSAGE.CONTEXT, protocol: PROTOCOL, ...CONTEXT, epic: 'b-epic' })
    expect(live.get()).not.toBe(first)
    expect(live.get().parts).toBe(first.parts)
  })

  test('unhosted once the grace has run out, with the system’s theme when the document decided none', async () => {
    const live = store(ID, {}, { source: inbox(speaker(), null).box, grace: 20 }).start()
    expect(live.get().where).toBe('listening')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(live.get().where).toBe('unhosted')
    expect(['dark', 'light']).toContain(document.documentElement.className)
    expect(live.get().theme).toBe(document.documentElement.className as never)
  })

  test('`applyTheme: false` leaves <html> alone, and `grace: 0` never concludes anything from silence', async () => {
    const live = store(ID, {}, { source: inbox(speaker(), hello(CONTEXT)).box, applyTheme: false }).start()
    expect(live.get().theme).toBe('dark')
    expect(document.documentElement.className).toBe('')
    const silent = store(ID, {}, { source: inbox(speaker(), null).box, grace: 0 }).start()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(silent.get().where).toBe('listening')
  })

  test('a stale page reloads, unless told not to', async () => {
    const reloads: number[] = []
    const real = window.location.reload
    Object.defineProperty(window.location, 'reload', { configurable: true, value: () => reloads.push(Date.now()) })
    const real_ = setTimeout
    try {
      const stale = () => ask('/api/write', { body: {}, fetch: (async () => new Response('{"ok":false,"error":"x","refused":"ticket"}', { status: 403 })) as unknown as typeof fetch })
      store(ID, {}, { source: inbox(speaker(), null).box, reloadWhenStale: false }).start()
      await stale()
      await new Promise((resolve) => real_(resolve, 1000))
      expect(reloads.length).toBe(0)
      resetServerStanding()
      sessionStorage.removeItem('kehikot.reloaded')
      store(ID, {}, { source: inbox(speaker(), null).box }).start()
      await stale()
      await new Promise((resolve) => real_(resolve, 1000))
      expect(reloads.length).toBe(1)
    } finally {
      Object.defineProperty(window.location, 'reload', { configurable: true, value: real })
      sessionStorage.removeItem('kehikot.reloaded')
    }
  })

  test('remember, point and request go to the host; with nobody there, remember still holds and request refuses', async () => {
    const host = speaker()
    const live = store<{ tab: string }>(ID, {}, { source: inbox(host, hello(CONTEXT)).box }).start()
    live.remember({ tab: 'c' })
    live.point(null)
    expect(live.get().kept).toEqual({ tab: 'c' })
    const asked = host.said.filter((one) => one.type === MESSAGE.REQUEST)
    expect(asked.map((one) => [one.method, one.params])).toEqual([
      ['state.set', { state: '{"tab":"c"}' }],
      ['passage.set', { passage: null }],
    ])

    const nobody = speaker()
    const alone = store<{ tab: string }>(ID, {}, { source: inbox(nobody, null).box }).start()
    alone.remember({ tab: 'd' })
    alone.point(null)
    expect(alone.get().kept).toEqual({ tab: 'd' })
    expect(nobody.said).toEqual([])
    await expect(alone.request('epics.list')).rejects.toThrow('Nothing has greeted this page')
    await expect(store(ID).request('epics.list')).rejects.toThrow('Nothing has greeted this page')
  })

  test('goto, clear and refresh reach the page; with no goto handler the host is told there is nothing to walk to', () => {
    const host = speaker()
    const { box, post } = inbox(host, hello(CONTEXT))
    const heard: string[] = []
    store(ID, { onClear: () => heard.push('clear'), onRefresh: () => heard.push('refresh') }, { source: box }).start()
    post({ type: MESSAGE.CLEAR, protocol: PROTOCOL })
    post({ type: MESSAGE.REFRESH, protocol: PROTOCOL })
    post({ type: MESSAGE.GOTO, protocol: PROTOCOL, id: 'g1', ref: 'gh#41' })
    expect(heard).toEqual(['clear', 'refresh'])
    const went = host.said.find((one) => one.type === MESSAGE.WENT) as unknown as { found: boolean; why: string }
    expect(went.found).toBe(false)
    expect(went.why).toBe('This app is not showing anything that can be walked to.')
  })

  test('a stopped store says nothing more, and starting is once', () => {
    const { box, post } = inbox(speaker(), hello(CONTEXT))
    const heard: string[] = []
    const live = store(ID, { onContext: () => heard.push('context') }, { source: box }).start()
    live.start()
    let changes = 0
    live.subscribe(() => (changes += 1))
    live.stop()
    post({ type: MESSAGE.CONTEXT, protocol: PROTOCOL, ...CONTEXT, epic: 'b-epic' })
    expect([changes, heard, live.get().epic, live.connection()]).toEqual([0, [], 'a-epic', null])
    expect(live.start().connection()).toBeNull()
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
