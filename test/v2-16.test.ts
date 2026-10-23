import { afterEach, describe, expect, test } from 'bun:test'

import {
  ADDRESS_OPEN_OUTCOMES,
  CAPABILITIES,
  LIMITS,
  MESSAGE,
  METHODS,
  PACKAGE_VERSION,
  PROTOCOL,
  REACTS_TO,
  addressIsNews,
  addressLabel,
  addressOpenResult,
  addressRefusal,
  contextSchema,
  isWebAddress,
  methodParams,
  resultSchemaFor,
  sharedAddressSchema,
  webAddress,
} from '../src/index.js'
import { hostFields, hostStore, makeMailbox } from '../src/client/index.js'

/** 2.16.0: a web address handed to the canvas (`address.open`, `context.address`). */

describe('the version', () => {
  test('is 2.16.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.16.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('what an address may be', () => {
  test('https: anywhere, http: to this machine, kept as written', () => {
    for (const ok of [
      'https://example.com',
      'https://example.com/design?x=1#part',
      'https://gitlab.example.org:8443/group/repo/-/pipelines/12',
      'http://localhost:5173/',
      'http://127.0.0.1:8080/app',
      'http://[::1]:3000',
      'https://localhost',
    ]) {
      expect(addressRefusal(ok)).toBeNull()
      expect(isWebAddress(ok)).toBe(true)
      expect(webAddress.parse(ok)).toBe(ok)
    }
  })

  test('never javascript:, data:, file:, blob: or any other scheme', () => {
    for (const bad of [
      'javascript:alert(1)',
      'JAVASCRIPT:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      'blob:https://example.com/1',
      'ftp://example.com',
      'about:blank',
      'chrome://settings',
      'mailto:a@example.com',
      '//example.com/x',
      '/relative/path',
      'example.com',
    ]) {
      expect(addressRefusal(bad)).not.toBeNull()
      expect(webAddress.safeParse(bad).success).toBe(false)
    }
  })

  test('http: only to this machine', () => {
    for (const bad of ['http://example.com', 'http://localhost.evil.com', 'http://127.0.0.1.evil.com', 'http://10.0.0.1', 'http://[::2]']) {
      expect(addressRefusal(bad)).toContain('this machine')
    }
  })

  test('no user name or password in it', () => {
    for (const bad of ['https://user:secret@example.com/', 'https://user@example.com', 'http://a:b@localhost:3000', 'https://:pw@example.com']) {
      expect(addressRefusal(bad)).toContain('no user name or password')
    }
  })

  test('no whitespace or control character; at most LIMITS.URL', () => {
    for (const bad of [' https://example.com', 'https://example.com ', 'https://exa mple.com', 'https://example.com/\n', 'https://example.com/\t', 'https://example.com/\u0000', 'https://example.com/ ']) {
      expect(addressRefusal(bad)).not.toBeNull()
    }
    const long = `https://example.com/${'a'.repeat(LIMITS.URL)}`
    expect(addressRefusal(long)).toContain(String(LIMITS.URL))
    const edge = `https://example.com/${'a'.repeat(LIMITS.URL - 'https://example.com/'.length)}`
    expect(edge.length).toBe(LIMITS.URL)
    expect(addressRefusal(edge)).toBeNull()
  })

  test('not a string, or empty, is refused', () => {
    for (const bad of [undefined, null, 42, {}, '']) expect(addressRefusal(bad)).not.toBeNull()
  })
})

describe('address.open', () => {
  test('a method under its own capability, with a sentence that says everyone is told', () => {
    expect(METHODS['address.open']).toBe('address:open')
    expect(CAPABILITIES['address:open']).toContain('Every module on the canvas is told')
    expect(Object.hasOwn(REACTS_TO, 'address')).toBe(true)
  })

  test('url is required and held to the rules; title and intent are optional', () => {
    const params = methodParams['address.open']
    expect(params.safeParse({ url: 'https://example.com/design' }).success).toBe(true)
    expect(params.parse({ url: 'https://example.com', title: '  Design  ' }).title).toBe('Design')
    expect(params.safeParse({ url: 'https://example.com', intent: 'show' }).success).toBe(true)
    expect(params.safeParse({}).success).toBe(false)
    expect(params.safeParse({ url: 'javascript:alert(1)' }).success).toBe(false)
    expect(params.safeParse({ url: 'https://example.com', intent: 'download' }).success).toBe(false)
    expect(params.safeParse({ url: 'https://example.com', title: '' }).success).toBe(false)
    expect(params.safeParse({ url: 'https://example.com', title: 'x'.repeat(LIMITS.TITLE + 1) }).success).toBe(false)
  })

  test('is answered with addressOpenResult: shown, offered or declined', () => {
    expect(ADDRESS_OPEN_OUTCOMES).toEqual(['shown', 'offered', 'declined'])
    expect(resultSchemaFor('address.open')).toBe(addressOpenResult)
    expect(addressOpenResult.parse({ outcome: 'shown' })).toEqual({ outcome: 'shown', why: '' })
    expect(addressOpenResult.safeParse({ outcome: 'opened' }).success).toBe(false)
  })
})

describe('context.address', () => {
  const stamped = { url: 'https://example.com/design', title: 'Design', intent: 'show', by: 'kehikot.flows', at: '2026-10-23T10:00:00.000Z' }

  test('null by default: what an older host sends', () => {
    expect(contextSchema.parse({}).address).toBeNull()
  })
  test('carries the address, its title, and the host’s by and at', () => {
    expect(contextSchema.parse({ address: stamped }).address).toEqual(stamped as never)
    expect(sharedAddressSchema.parse({ url: 'https://example.com', agent: true, at: 't' }).agent).toBe(true)
  })
  test('intent absent, or a word this version does not know, reads show', () => {
    expect(sharedAddressSchema.parse({ url: 'https://example.com' }).intent).toBe('show')
    expect(sharedAddressSchema.parse({ url: 'https://example.com', intent: 'download' }).intent).toBe('show')
  })
  test('the address rules hold in the context too', () => {
    expect(contextSchema.safeParse({ address: { ...stamped, url: 'file:///etc/passwd' } }).success).toBe(false)
    expect(contextSchema.safeParse({ address: { ...stamped, by: 'Not An Id' } }).success).toBe(false)
  })
})

describe('the helpers', () => {
  test('addressIsNews: a new at is news, the same at is not', () => {
    const one = { url: 'https://example.com', at: 't1' }
    expect(addressIsNews(one, null)).toBe(true)
    expect(addressIsNews(one, { at: 't1' })).toBe(false)
    expect(addressIsNews({ ...one, at: 't2' }, { at: 't1' })).toBe(true)
    /* the same address, handed over again, is a second request */
    expect(addressIsNews({ url: one.url, at: 't3' }, { url: one.url, at: 't2' })).toBe(true)
    expect(addressIsNews(null, { at: 't1' })).toBe(false)
  })
  test('addressIsNews: without an at, the url moving is news', () => {
    expect(addressIsNews({ url: 'https://a.example' }, { url: 'https://a.example' })).toBe(false)
    expect(addressIsNews({ url: 'https://b.example' }, { url: 'https://a.example' })).toBe(true)
  })
  test('addressLabel: the title, else host and path', () => {
    expect(addressLabel({ url: 'https://example.com/design', title: 'Design' })).toBe('Design')
    expect(addressLabel({ url: 'https://example.com/design?x=1' })).toBe('example.com/design')
    expect(addressLabel({ url: 'http://localhost:5173/' })).toBe('localhost:5173')
  })
})

describe('the client', () => {
  const stores: { stop(): void }[] = []
  afterEach(() => {
    for (const one of stores.splice(0)) one.stop()
  })

  function framed(context: Record<string, unknown>, answers?: string[]) {
    const said: { type: string; method?: string; params?: unknown; id?: string }[] = []
    const host = { postMessage: (message: unknown) => said.push(message as never) }
    const listeners = new Set<(ev: MessageEvent) => void>()
    const box = makeMailbox({ parent: null, addEventListener: (_t: 'message', fn: (ev: MessageEvent) => void) => void listeners.add(fn) })
    const post = (data: unknown) => {
      for (const fn of [...listeners]) fn({ data, origin: 'null', source: host } as MessageEvent)
    }
    post({ type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's1', state: null, context, ...(answers ? { answers } : {}) })
    const live = hostStore('kehikot.example', {}, { source: box })
    stores.push(live)
    live.start()
    return { live, said, post }
  }

  test('hostFields carries the address, and keeps it while it says the same thing', () => {
    const address = { url: 'https://example.com', intent: 'show' as const, at: 't1' }
    const first = hostFields(contextSchema.parse({ address }))
    expect(first.address).toEqual(address)
    expect(hostFields(contextSchema.parse({ address }), first).address).toBe(first.address)
    expect(hostFields(contextSchema.parse({ address: { ...address, at: 't2' } }), first).address).not.toBe(first.address)
    expect(hostFields(null).address).toBeNull()
  })

  test('openAddress asks address.open, and resolves with the host’s answer', async () => {
    const { live, said, post } = framed({}, ['address.open'])
    const answered = live.openAddress('https://example.com/design', { title: 'Design' })
    const asked = said.find((one) => one.method === 'address.open')
    expect(asked?.params).toEqual({ url: 'https://example.com/design', title: 'Design' })
    post({ type: MESSAGE.RESPONSE, id: asked?.id, ok: true, data: { outcome: 'offered' } })
    expect(await answered).toEqual({ outcome: 'offered', why: '' })
  })

  test('a host that says it will not answer address.open is not asked', async () => {
    const { live, said } = framed({}, ['selection.set'])
    expect(await live.openAddress('https://example.com')).toBeNull()
    expect(said.some((one) => one.method === 'address.open')).toBe(false)
  })

  test('a refusal resolves null', async () => {
    const { live, said, post } = framed({})
    const answered = live.openAddress('https://example.com')
    const asked = said.find((one) => one.method === 'address.open')
    post({ type: MESSAGE.RESPONSE, id: asked?.id, ok: false, reason: 'failed', error: 'Not declared.' })
    expect(await answered).toBeNull()
  })

  test('with nobody framing the page it resolves null', async () => {
    const live = hostStore('kehikot.example', {}, { source: makeMailbox({ parent: null, addEventListener: () => {} }), grace: 0 })
    stores.push(live)
    live.start()
    expect(await live.openAddress('https://example.com')).toBeNull()
  })
})
