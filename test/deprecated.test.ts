import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'

import { deprecated, forgetDeprecations } from '../src/deprecated.ts'
import { frameOrigins } from '../src/serve/origins.ts'
import { registryDir } from '../src/serve/registry.ts'
import { connect } from '../src/client/connect.ts'
import { makeMailbox } from '../src/client/mailbox.ts'
import pkg from '../package.json'

/**
 * What 0.37 says about what the next breaking release removes: once, in development, and never
 * under a test runner — a consumer's suite must read exactly as it did on 0.36.
 */
describe('deprecated', () => {
  const mode = process.env.NODE_ENV
  let warned: ReturnType<typeof spyOn>

  beforeEach(() => {
    forgetDeprecations()
    warned = spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    warned.mockRestore()
    if (mode === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = mode
  })

  test('says nothing under a test runner, which is how every consumer suite runs', () => {
    process.env.NODE_ENV = 'test'
    deprecated('a thing', 'Use the other thing.')
    expect(registryDir({ ROADMAP_MODULES_DIR: '/old' })).toBe('/old')
    expect(warned).not.toHaveBeenCalled()
  })

  test('says nothing in production', () => {
    process.env.NODE_ENV = 'production'
    deprecated('a thing', 'Use the other thing.')
    expect(warned).not.toHaveBeenCalled()
  })

  test('in development it is said once, with what to use instead', () => {
    process.env.NODE_ENV = 'development'
    deprecated('a thing', 'Use the other thing.')
    deprecated('a thing', 'Use the other thing.')
    expect(warned).toHaveBeenCalledTimes(1)
    expect(String(warned.mock.calls[0]?.[0])).toContain('a thing is deprecated and is removed in the next breaking release. Use the other thing.')
  })

  test('ROADMAP_MODULES_DIR still decides, and is named only when it is the one that decided', () => {
    process.env.NODE_ENV = 'development'
    expect(registryDir({ KEHIKOT_MODULES_DIR: '/new', ROADMAP_MODULES_DIR: '/old' })).toBe('/new')
    expect(warned).not.toHaveBeenCalled()
    expect(registryDir({ ROADMAP_MODULES_DIR: '/old' })).toBe('/old')
    expect(registryDir({ ROADMAP_MODULES_DIR: '/old' })).toBe('/old')
    expect(warned).toHaveBeenCalledTimes(1)
    expect(String(warned.mock.calls[0]?.[0])).toContain('KEHIKOT_MODULES_DIR')
  })

  test('ROADMAP_ORIGIN still decides, and is named only when it is the one that decided', () => {
    process.env.NODE_ENV = 'development'
    expect(frameOrigins({ KEHIKOT_ORIGINS: 'http://a', ROADMAP_ORIGIN: 'http://old' })).toEqual(['http://a'])
    expect(frameOrigins({ KEHIKOT_ORIGIN: 'http://b', ROADMAP_ORIGIN: 'http://old' })).toEqual(['http://b'])
    expect(warned).not.toHaveBeenCalled()
    expect(frameOrigins({ ROADMAP_ORIGIN: 'http://old' })).toEqual(['http://old'])
    expect(warned).toHaveBeenCalledTimes(1)
  })

  test('a greeting in the pre-rename dialect is still answered in it, and said once', () => {
    process.env.NODE_ENV = 'development'
    const listeners: ((ev: MessageEvent) => void)[] = []
    const posted: unknown[] = []
    const host = { postMessage: (message: unknown) => posted.push(message) } as unknown as Window
    const source = makeMailbox({ addEventListener: (_type, fn) => listeners.push(fn), parent: null })
    const live = connect('kehikot.example', {}, { source })
    live.listen()
    const greet = (type: string) => {
      for (const fn of listeners) fn({ data: { type, protocol: 2, session: 's1', context: { epic: 'a-epic', project: null, theme: 'light' } }, source: host, origin: 'null' } as unknown as MessageEvent)
    }
    greet('kehikot.hello')
    expect(warned).not.toHaveBeenCalled()
    greet('roadmap.hello')
    greet('roadmap.hello')
    live.stop()
    expect((posted.at(-1) as { type: string }).type).toBe('roadmap.ready')
    expect(warned).toHaveBeenCalledTimes(1)
  })
})

describe('the bins', () => {
  test('are offered under the package’s own spelling beside the old one, which the next breaking release drops', () => {
    expect(pkg.bin['kehikot-create']).toBe(pkg.bin['kehikko-create'])
    expect(pkg.bin['kehikot-check-parts']).toBe(pkg.bin['kehikko-check-parts'])
  })
})
