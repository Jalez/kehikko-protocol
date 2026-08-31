import { describe, expect, test } from 'bun:test'

import { MESSAGE, PROTOCOL } from '../src/index.js'
import { HostRefused, connect, makeMailbox, type Connection, type MessageSource } from '../src/client/index.js'

/**
 * The wire, against a host that is not a host, a host that lies, a host that is
 * not there, and a host that greeted before anybody was listening.
 *
 * These are the tests that would be skipped and shouldn't be. The happy path
 * across a frame is four lines of code and it works the first time; what breaks
 * in the field is the second sender, the answer to a question nobody asked, the
 * message that arrives before the greeting, and the roadmap that says nothing at
 * all — and every one of those is silent when it goes wrong, which is exactly
 * the class of failure a test can see and a person cannot.
 *
 * Every case below was a case in a module's own suite first. They are here now
 * because the code they cover is here now, and because twelve copies of a test
 * is twelve chances for one of them to be quietly deleted by somebody who did
 * not know what it was for.
 */

const ID = 'roadmap.example'

/** A window we can post at, standing in for the frame a module runs in. */
function fakeWindow() {
  const listeners = new Set<(ev: MessageEvent) => void>()
  const source: MessageSource = {
    parent: {} as Window,
    addEventListener: (_type, fn) => {
      listeners.add(fn)
    },
    removeEventListener: (_type, fn) => {
      listeners.delete(fn)
    },
  }
  const deliver = (ev: { data: unknown; origin?: string; source?: unknown }) => {
    for (const fn of [...listeners]) fn(ev as unknown as MessageEvent)
  }
  return { source, deliver, listening: () => listeners.size }
}

/** Something with a `postMessage`, which is all a host is from in here. */
function speaker() {
  const said: unknown[] = []
  const to: string[] = []
  return {
    postMessage: (message: unknown, targetOrigin: string) => {
      said.push(message)
      to.push(targetOrigin)
    },
    said,
    to,
  }
}

const hello = (
  from: unknown,
  context: Record<string, unknown> = { epic: 'a-epic', project: null, theme: 'light' },
  extra: Record<string, unknown> = {},
) => ({
  data: { type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's1', context, ...extra },
  origin: 'null',
  source: from,
})

/** Build a connection the way a page is supposed to: store it, then listen. */
function attach(events: Parameters<typeof connect>[1] = {}, options: Parameters<typeof connect>[2] = {}) {
  const live = connect(ID, events, options)
  live.listen()
  return live
}

describe('the greeting', () => {
  test('is answered with ready, to the window that sent it', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    attach({}, { source })
    deliver(hello(host))
    expect(host.said).toEqual([{ type: MESSAGE.READY, id: ID, protocol: PROTOCOL }])
  })

  test('is answered on EVERY hello, not only the first', () => {
    /*
     * A frame that reloaded has forgotten the conversation, and it cannot tell
     * its own reload from a host greeting twice — so it must not try. A module
     * that answered once goes silent after any reload of its own frame, and what
     * the host reports is "loaded its page and did not answer the greeting",
     * which sends whoever reads it looking in entirely the wrong place.
     */
    const { source, deliver } = fakeWindow()
    const host = speaker()
    attach({}, { source })
    deliver(hello(host))
    deliver(hello(host))
    deliver(hello(host))
    expect(host.said).toHaveLength(3)
    expect(host.said.every((m) => (m as { type: string }).type === MESSAGE.READY)).toBe(true)
  })

  test('the newest greeting wins, and the window it came from becomes the one we answer', () => {
    const { source, deliver } = fakeWindow()
    const first = speaker()
    const second = speaker()
    const heard: (string | null)[] = []
    attach({ onContext: (context) => heard.push(context.epic) }, { source })
    deliver(hello(first))
    deliver(hello(second))
    deliver({
      data: { type: MESSAGE.CONTEXT, protocol: PROTOCOL, epic: 'from-the-new-one', project: null, theme: 'light' },
      source: second,
    })
    expect(heard).toEqual(['from-the-new-one'])
  })

  test('hands over the context that rode along with it, and whatever the host is keeping', () => {
    const { source, deliver } = fakeWindow()
    let seen: string | null = 'not called'
    let kept: string | null = 'not called'
    attach(
      {
        onHello: (context, state) => {
          seen = context.epic
          kept = state
        },
      },
      { source },
    )
    deliver(hello(speaker(), { epic: 'a-epic', project: null, theme: 'light' }, { state: 'remembered' }))
    expect(seen).toBe('a-epic')
    expect(kept).toBe('remembered')
  })

  test('a message that is not a greeting, before any greeting, is nothing', () => {
    const { source, deliver } = fakeWindow()
    let switched = false
    attach({ onContext: () => (switched = true) }, { source })
    deliver({
      data: { type: MESSAGE.CONTEXT, protocol: PROTOCOL, epic: 'x', project: null, theme: 'light' },
      source: speaker(),
    })
    expect(switched).toBe(false)
  })

  test('answers at a real origin where there is one, and at anything where there is not', () => {
    const { source, deliver } = fakeWindow()
    const sandboxed = speaker()
    attach({}, { source })
    deliver(hello(sandboxed))
    expect(sandboxed.to).toEqual(['*'])

    const { source: source2, deliver: deliver2 } = fakeWindow()
    const real = speaker()
    attach({}, { source: source2 })
    deliver2({ ...hello(real), origin: 'https://roadmap.example' })
    expect(real.to).toEqual(['https://roadmap.example'])
  })
})

describe('the greeting that arrived before anybody was listening', () => {
  /**
   * The replayed-greeting race, which two modules found independently and each
   * spent an afternoon on.
   *
   * The mailbox replays synchronously inside `addEventListener`. With a one-step
   * `connect` that subscribes on the way out, `onHello` fires DURING the call —
   * before `held.current = connect(...)` has run — so a handler that reaches for
   * the connection finds nothing there and quietly does nothing. The host sees a
   * module that answered `ready`; the module's own screen says nobody ever
   * greeted it.
   */
  function inboxHoldingAGreeting(host: { postMessage: (m: unknown, o: string) => void }) {
    const listeners = new Set<(ev: MessageEvent) => void>()
    const window_ = {
      parent: null,
      addEventListener: (_type: 'message', fn: (ev: MessageEvent) => void) => {
        listeners.add(fn)
      },
    }
    const inbox = makeMailbox(window_)
    for (const fn of [...listeners]) fn(hello(host) as unknown as MessageEvent)
    return inbox
  }

  test('the caller has the connection stored by the time onHello fires', () => {
    const host = speaker()
    const inbox = inboxHoldingAGreeting(host)

    const held: { live: Connection | null } = { live: null }
    let hadItWhenGreeted: boolean | null = null

    const live = connect(ID, { onHello: () => (hadItWhenGreeted = held.live !== null) }, { source: inbox })
    held.live = live
    live.listen()

    expect(hadItWhenGreeted).toBe(true)
  })

  test('and a naive one-step connect does not — which is why there are two steps', () => {
    /*
     * The control. Without it this file could drift into asserting a property no
     * implementation could fail, and the split would look like ceremony to the
     * next person to read it. This is the same page, written the way every one
     * of the twelve modules wrote it, failing.
     */
    const host = speaker()
    const inbox = inboxHoldingAGreeting(host)

    const naiveConnect = (onHello: () => void) => {
      const connection = { itIsMe: true }
      inbox.addEventListener('message', () => onHello())
      return connection
    }

    const held: { live: unknown } = { live: null }
    let hadItWhenGreeted: boolean | null = null
    held.live = naiveConnect(() => (hadItWhenGreeted = held.live !== null))

    expect(hadItWhenGreeted).toBe(false)
  })

  test('nothing is heard before listen, so the caller decides when replay may fire', () => {
    const host = speaker()
    const inbox = inboxHoldingAGreeting(host)
    let greeted = false
    const live = connect(ID, { onHello: () => (greeted = true) }, { source: inbox })
    expect(greeted).toBe(false)
    expect(live.greeted()).toBe(false)
    live.listen()
    expect(greeted).toBe(true)
  })

  test('listening twice is listening once', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const live = connect(ID, {}, { source })
    live.listen()
    live.listen()
    deliver(hello(host))
    expect(host.said).toHaveLength(1)
  })
})

describe('binding to the window, not the origin', () => {
  test('a second window saying the same words is ignored', () => {
    /* The failure this prevents is not dramatic and that is the point: a page
       framed by one roadmap, receiving context from another, would draw the
       wrong epic under the right title and say nothing about it. */
    const { source, deliver } = fakeWindow()
    const real = speaker()
    const impostor = speaker()
    const heard: (string | null)[] = []
    attach({ onContext: (context) => heard.push(context.epic) }, { source })
    deliver(hello(real))
    deliver({
      data: { type: MESSAGE.CONTEXT, protocol: PROTOCOL, epic: 'somebody-elses', project: null, theme: 'light' },
      source: impostor,
    })
    deliver({
      data: { type: MESSAGE.CONTEXT, protocol: PROTOCOL, epic: 'the-real-one', project: null, theme: 'light' },
      source: real,
    })
    expect(heard).toEqual(['the-real-one'])
  })

  test('rubbish on the wire is dropped rather than parsed', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    attach({}, { source })
    for (const data of [null, 'hello', { type: 'webpack/hot' }, { type: 'roadmap.hello' }, 7]) {
      deliver({ data, source: host })
    }
    /* The fourth one starts `roadmap.` and is still not a greeting: no protocol,
       no session, no context. A module that answered it would have bound itself
       to whatever posted it. */
    expect(host.said).toEqual([])
  })

  test('a greeting with no source falls back to the frame’s own parent', () => {
    const { source, deliver } = fakeWindow()
    const parent = speaker()
    const withParent: MessageSource = { ...source, parent: parent as unknown as Window }
    attach({}, { source: withParent })
    deliver({ data: hello(undefined).data, origin: 'null' })
    expect(parent.said).toHaveLength(1)
  })
})

describe('the context is spread, never enumerated', () => {
  const rich = {
    type: MESSAGE.CONTEXT,
    protocol: PROTOCOL,
    epic: 'a-epic',
    project: 'roadmap',
    projectPath: '/tmp/roadmap',
    theme: 'light',
    selection: ['gh#41'],
    prompt: 'find the thing',
    pinned: true,
    kehikko: { id: 3, name: 'Delivery' },
  }

  test('every field the protocol has grown arrives, without this file naming one of them', () => {
    /*
     * The bug that was found and fixed five times, in five modules, with the
     * same one-liner. A module rebuilding the context field by field silently
     * drops every field the protocol later adds — no error, no warning, just
     * that module's settled belief that the host said nothing about it. `prompt`
     * and `pinned` were both missing within a day of being added; `kehikko` —
     * which says which canvas a pane is standing on — was missing the moment the
     * protocol grew it.
     *
     * The fields below are the ones that were actually lost. They arrive here
     * because `connect` removes the two envelope keys and keeps the rest, and
     * for no other reason: there is no list in `connect.ts` that has to be
     * extended when the protocol grows, which is the whole point. If a future
     * edit reintroduces one, this fails.
     */
    const { source, deliver } = fakeWindow()
    const host = speaker()
    let got: Record<string, unknown> | null = null
    attach({ onContext: (context) => (got = context as unknown as Record<string, unknown>) }, { source })
    deliver(hello(host))
    deliver({ data: rich, source: host })

    const context = (got ?? {}) as Record<string, unknown>
    expect(context.selection).toEqual(['gh#41'])
    expect(context.prompt).toBe('find the thing')
    expect(context.pinned).toBe(true)
    expect(context.kehikko).toEqual({ id: 3, name: 'Delivery' })
    expect(context.projectPath).toBe('/tmp/roadmap')
  })

  test('and the way the modules used to do it drops three of them', () => {
    /*
     * The control, so this file cannot drift into asserting a property no
     * implementation could fail. This is the handler as five modules wrote it,
     * against the same message, losing exactly what they lost in the field.
     */
    const asTheModulesWroteIt = (message: Record<string, unknown>) => ({
      epic: message.epic,
      project: message.project,
      projectPath: message.projectPath,
      theme: message.theme,
      selection: message.selection,
    })
    const rebuilt = asTheModulesWroteIt(rich) as Record<string, unknown>
    expect(rebuilt.prompt).toBeUndefined()
    expect(rebuilt.pinned).toBeUndefined()
    expect(rebuilt.kehikko).toBeUndefined()
  })

  test('the envelope, which a ModuleContext does not have, is what is removed', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    let got: Record<string, unknown> | null = null
    attach({ onContext: (context) => (got = context as unknown as Record<string, unknown>) }, { source })
    deliver(hello(host))
    deliver({ data: rich, source: host })
    expect(Object.keys(got ?? {})).not.toContain('type')
    expect(Object.keys(got ?? {})).not.toContain('protocol')
  })
})

describe('a question and its answer', () => {
  test('the answer is matched to the question by its id', async () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const live = attach({}, { source })
    deliver(hello(host))
    const answer = live.request('live.get', { epic: 'a-epic' })
    const asked = host.said[1] as { id: string; method: string; params: unknown }
    expect(asked.method).toBe('live.get')
    expect(asked.params).toEqual({ epic: 'a-epic' })
    deliver({ data: { type: MESSAGE.RESPONSE, id: asked.id, ok: true, data: { generated: 'now' } }, source: host })
    expect(await answer).toEqual({ generated: 'now' })
  })

  test('an answer to a question nobody asked changes nothing', async () => {
    /* Dropped quietly, because it is the ordinary case rather than an anomaly: a
       question that timed out and was answered a second later, a question the
       caller abandoned, a duplicate. A module that threw here is a module a slow
       host can crash. */
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const live = attach({}, { source })
    deliver(hello(host))
    const answer = live.request('live.get', { epic: 'a-epic' })
    const asked = host.said[1] as { id: string }
    deliver({ data: { type: MESSAGE.RESPONSE, id: 'some-other-id', ok: true, data: 'wrong' }, source: host })
    deliver({ data: { type: MESSAGE.RESPONSE, id: asked.id, ok: true, data: 'right' }, source: host })
    expect(await answer).toBe('right')
  })

  test('a refusal arrives as a refusal: a word and a sentence, never a bare string', async () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const live = attach({}, { source })
    deliver(hello(host))
    const answer = live.request('live.get', { epic: 'a-epic' })
    const asked = host.said[1] as { id: string }
    deliver({
      data: {
        type: MESSAGE.RESPONSE,
        id: asked.id,
        ok: false,
        reason: 'unknown-method',
        error: 'this roadmap does not answer live.get',
      },
      source: host,
    })
    await expect(answer).rejects.toBeInstanceOf(HostRefused)
    await answer.catch((error: HostRefused) => {
      expect(error.refusal.reason).toBe('unknown-method')
      expect(error.refusal.error).toBe('this roadmap does not answer live.get')
    })
  })

  test('asking before anybody has greeted us is refused at once, not queued', async () => {
    const { source } = fakeWindow()
    const live = attach({}, { source })
    await live.request('live.get', {}).then(
      () => expect.unreachable(),
      (error: HostRefused) => {
        expect(error).toBeInstanceOf(HostRefused)
        expect(error.refusal.reason).toBe('silent')
      },
    )
  })

  test('a question nobody answers becomes a refusal rather than a page that waits forever', async () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const live = attach({}, { source, answerWithin: 5 })
    deliver(hello(host))
    await live.request('live.get', {}).then(
      () => expect.unreachable(),
      (error: HostRefused) => expect(error.refusal.reason).toBe('silent'),
    )
  })

  test('stopping refuses what is still waiting rather than leaving it hanging', async () => {
    const { source, deliver, listening } = fakeWindow()
    const host = speaker()
    const live = attach({}, { source })
    deliver(hello(host))
    const answer = live.request('live.get', { epic: 'a-epic' })
    live.stop()
    await answer.then(
      () => expect.unreachable(),
      (error: HostRefused) => expect(error.refusal.reason).toBe('silent'),
    )
    expect(listening()).toBe(0)
  })
})

describe('goto is always answered, exactly once', () => {
  const gotoMessage = (ref: string) => ({ type: MESSAGE.GOTO, id: 'g1', ref })

  test('found, when the page says so', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    attach({ onGoto: (_message, answer) => answer(true, '') }, { source })
    deliver(hello(host))
    deliver({ data: gotoMessage('gh#41'), source: host })
    expect(host.said[1]).toEqual({ type: MESSAGE.WENT, id: 'g1', found: true, why: '' })
  })

  test('not found, with a sentence a person can read', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    attach({ onGoto: (message, answer) => answer(false, `nothing here names ${message.ref}`) }, { source })
    deliver(hello(host))
    deliver({ data: gotoMessage('gh#41'), source: host })
    expect(host.said[1]).toEqual({ type: MESSAGE.WENT, id: 'g1', found: false, why: 'nothing here names gh#41' })
  })

  test('a module with no handler at all still answers, at once', () => {
    /* Silence here is not "no". The protocol says `goto` is the one place a host
       WAITS on a module, so a module that never answers makes every reference
       pointing at it sit out the host's whole timeout before the reader gets
       their fallback link. */
    const { source, deliver } = fakeWindow()
    const host = speaker()
    attach({}, { source })
    deliver(hello(host))
    deliver({ data: gotoMessage('gh#41'), source: host })
    expect((host.said[1] as { type: string; found: boolean }).type).toBe(MESSAGE.WENT)
    expect((host.said[1] as { found: boolean }).found).toBe(false)
  })

  test('a listener that throws still answers, because the host is waiting', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    attach(
      {
        onGoto: () => {
          throw new Error('the view exploded')
        },
      },
      { source },
    )
    deliver(hello(host))
    deliver({ data: gotoMessage('gh#41'), source: host })
    expect((host.said[1] as { found: boolean }).found).toBe(false)
  })

  test('a listener that answers nothing is answered for, by the backstop', async () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    attach({ onGoto: () => {} }, { source, gotoBackstop: 5 })
    deliver(hello(host))
    deliver({ data: gotoMessage('gh#41'), source: host })
    expect(host.said).toHaveLength(1)
    await Bun.sleep(20)
    expect((host.said[1] as { found: boolean }).found).toBe(false)
  })

  test('a listener that answers late, but in time, is not pre-empted', async () => {
    /* The reason the backstop is a timer and not a line after the call: a view
       may quite reasonably want to answer once a scroll has settled. */
    const { source, deliver } = fakeWindow()
    const host = speaker()
    attach({ onGoto: (_m, answer) => setTimeout(() => answer(true, 'found it'), 5) }, { source, gotoBackstop: 60 })
    deliver(hello(host))
    deliver({ data: gotoMessage('gh#41'), source: host })
    await Bun.sleep(30)
    expect(host.said).toHaveLength(2)
    expect((host.said[1] as { found: boolean }).found).toBe(true)
  })

  test('answering twice says one thing', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    attach(
      {
        onGoto: (_message, answer) => {
          answer(true, '')
          answer(false, 'no, wait')
        },
      },
      { source },
    )
    deliver(hello(host))
    deliver({ data: gotoMessage('gh#41'), source: host })
    expect(host.said).toHaveLength(2)
    expect((host.said[1] as { found: boolean }).found).toBe(true)
  })

  test('and the backstop does not speak over an answer already given', async () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    attach({ onGoto: (_m, answer) => answer(true, '') }, { source, gotoBackstop: 5 })
    deliver(hello(host))
    deliver({ data: gotoMessage('gh#41'), source: host })
    await Bun.sleep(20)
    expect(host.said).toHaveLength(2)
  })
})

describe('an event from another module', () => {
  test('is handed over whole, because the envelope is the message', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    let got: { extension: string; from: string; payload: unknown } | null = null
    attach({ onEvent: (event) => (got = event) }, { source })
    deliver(hello(host))
    deliver({
      data: {
        type: MESSAGE.EVENT,
        protocol: PROTOCOL,
        extension: 'roadmap.notifications@1',
        payload: { epic: 'a-epic', message: 'a tool ran' },
        from: 'roadmap.checklist',
        at: '2026-08-31T00:00:00.000Z',
      },
      source: host,
    })
    expect(got).not.toBeNull()
    expect((got as unknown as { extension: string }).extension).toBe('roadmap.notifications@1')
    expect((got as unknown as { from: string }).from).toBe('roadmap.checklist')
  })

  test('a module that never registered for one is unchanged by it arriving', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    attach({}, { source })
    deliver(hello(host))
    deliver({
      data: {
        type: MESSAGE.EVENT,
        protocol: PROTOCOL,
        extension: 'roadmap.notifications@1',
        payload: {},
        from: 'roadmap.checklist',
        at: '2026-08-31T00:00:00.000Z',
      },
      source: host,
    })
    expect(host.said).toHaveLength(1)
  })
})

describe('how tall it would like to be', () => {
  test('is clamped on our own side with the host’s own arithmetic', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const live = attach({}, { source })
    deliver(hello(host))
    live.resize(10)
    live.resize(999_999)
    expect(host.said.slice(1)).toEqual([
      { type: MESSAGE.RESIZE, height: 200 },
      { type: MESSAGE.RESIZE, height: 20_000 },
    ])
  })

  test('says nothing at all before there is anybody to say it to', () => {
    const { source } = fakeWindow()
    const live = attach({}, { source })
    live.resize(400)
    /* No throw, no queue. A module talking before it is greeted is a module
       shouting at a window that may not be a host. */
    expect(live.greeted()).toBe(false)
  })
})

describe('after stopping', () => {
  test('nothing further is heard, including a greeting', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const live = attach({}, { source })
    live.stop()
    deliver(hello(host))
    expect(host.said).toEqual([])
  })

  test('listening again is refused rather than resurrecting a dead connection', () => {
    const { source, deliver, listening } = fakeWindow()
    const host = speaker()
    const live = attach({}, { source })
    live.stop()
    live.listen()
    expect(listening()).toBe(0)
    deliver(hello(host))
    expect(host.said).toEqual([])
  })
})

describe('the offer of what this page can be narrowed by', () => {
  test('goes out as a module message, and is not answered', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const live = attach({}, { source })
    deliver(hello(host))
    live.filters([
      { id: 'ignored', label: 'ignored files', fallback: 'hide', options: [{ id: 'hide', label: 'hide 3 ignored' }] },
    ])
    expect(host.said).toHaveLength(2)
    expect((host.said[1] as { type: string }).type).toBe(MESSAGE.FILTERS)
  })

  /*
   * A page announces its offer from an effect after its first render, and the
   * greeting has almost always already arrived by then. The case that is not
   * fine is a frame that RELOADS: the host greets again, and a page whose offer
   * has not changed since has no reason to send anything — so without the
   * replay the host is left carrying an offer from a conversation that no
   * longer exists, or none at all. Neither errors; the control simply goes
   * missing on a page that looks entirely normal.
   */
  test('is replayed on every greeting, so a reload does not lose the control', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const live = attach({}, { source })
    deliver(hello(host))
    live.filters([
      { id: 'ignored', label: 'ignored files', fallback: 'hide', options: [{ id: 'hide', label: 'hide' }] },
    ])
    host.said.length = 0

    deliver(hello(host))
    expect(host.said.map((m) => (m as { type: string }).type)).toEqual([MESSAGE.READY, MESSAGE.FILTERS])
  })

  test('an offer made before the greeting is kept rather than lost', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    const live = attach({}, { source })
    /* Nothing has greeted us, so this cannot be sent anywhere. It must not
       simply evaporate: a page that announced early and never again would have
       a control that never appears. */
    live.filters([{ id: 'scope', label: 'scope', fallback: 'all', options: [{ id: 'all', label: 'all' }] }])
    expect(host.said).toHaveLength(0)

    deliver(hello(host))
    expect(host.said.map((m) => (m as { type: string }).type)).toEqual([MESSAGE.READY, MESSAGE.FILTERS])
  })

  test('a page that never offers anything sends nothing at all', () => {
    const { source, deliver } = fakeWindow()
    const host = speaker()
    attach({}, { source })
    deliver(hello(host))
    deliver(hello(host))
    expect(host.said.every((m) => (m as { type: string }).type === MESSAGE.READY)).toBe(true)
  })
})
