import { afterEach, describe, expect, test } from 'bun:test'

import {
  CAPABILITIES,
  LIMITS,
  MESSAGE,
  METHODS,
  PACKAGE_VERSION,
  PROTOCOL,
  REACTS_TO,
  codeLocationSchema,
  contextSchema,
  locationLabel,
  locationSetResult,
  locationStands,
  methodParams,
  repoPath,
  resultSchemaFor,
  samePlace,
  sharedLocationSchema,
  type CodeLocation,
} from '../src/index.js'
import { hostFields, hostStore, makeMailbox } from '../src/client/index.js'

/** 2.13.0: a place in a change's code, shared on a kehikko (`context.location`, `location.set`). */

const here: CodeLocation = { change: 'gl!123', path: 'src/app.ts', line: 42, side: 'new', commit: 'abc1234' }

describe('the version', () => {
  test('is 2.18.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.29.0')
    expect(PROTOCOL).toBe(2)
  })
  test('LIMITS.CODE_LINE is ten million', () => expect(LIMITS.CODE_LINE).toBe(10_000_000))
})

describe('codeLocationSchema', () => {
  test('a line, a range, either side, with or without a commit', () => {
    expect(codeLocationSchema.parse(here)).toEqual(here)
    expect(codeLocationSchema.parse({ ...here, endLine: 48 }).endLine).toBe(48)
    expect(codeLocationSchema.parse({ ...here, endLine: 42 }).endLine).toBe(42)
    const old = { change: 'gh#41', path: 'README.md', line: 1, side: 'old' as const }
    expect(codeLocationSchema.parse(old)).toEqual(old)
  })
  test('a range that ends before it starts is refused', () => {
    expect(codeLocationSchema.safeParse({ ...here, endLine: 41 }).success).toBe(false)
  })
  test('lines count from one, as integers, up to CODE_LINE', () => {
    for (const line of [0, -1, 1.5, LIMITS.CODE_LINE + 1]) {
      expect(codeLocationSchema.safeParse({ ...here, line }).success).toBe(false)
    }
    expect(codeLocationSchema.safeParse({ ...here, line: LIMITS.CODE_LINE }).success).toBe(true)
  })
  test('side is new or old; change is a ref; commit is lowercase hex, 7 to 64', () => {
    expect(codeLocationSchema.safeParse({ ...here, side: 'both' }).success).toBe(false)
    expect(codeLocationSchema.safeParse({ ...here, change: '' }).success).toBe(false)
    expect(codeLocationSchema.safeParse({ ...here, change: 'x'.repeat(LIMITS.REF + 1) }).success).toBe(false)
    for (const commit of ['abc123', 'ABC1234', 'zzzzzzz', 'a'.repeat(65)]) {
      expect(codeLocationSchema.safeParse({ ...here, commit }).success).toBe(false)
    }
    expect(codeLocationSchema.safeParse({ ...here, commit: 'a'.repeat(40) }).success).toBe(true)
  })
  test('every field but endLine and commit is required', () => {
    for (const key of ['change', 'path', 'line', 'side'] as const) {
      const { [key]: _, ...without } = here
      expect(codeLocationSchema.safeParse(without).success).toBe(false)
    }
  })
})

describe('repoPath', () => {
  test('takes a path as git spells it', () => {
    for (const ok of ['a', 'src/app.ts', '.github/workflows/ci.yml', 'dir/..hidden', 'with space/x.ts']) {
      expect(repoPath.safeParse(ok).success).toBe(true)
    }
  })
  test('refuses what could climb out of a checkout, or is not one path', () => {
    for (const bad of ['', '/etc/passwd', '../x', 'a/../b', './a', 'a/./b', 'a//b', 'a/', 'a\\b', 'a\0b', '..']) {
      expect(repoPath.safeParse(bad).success).toBe(false)
    }
  })
  test('is bounded by LIMITS.PATH', () => {
    expect(repoPath.safeParse('a'.repeat(LIMITS.PATH)).success).toBe(true)
    expect(repoPath.safeParse('a'.repeat(LIMITS.PATH + 1)).success).toBe(false)
  })
})

describe('context.location', () => {
  test('null by default: what an older host sends', () => {
    expect(contextSchema.parse({}).location).toBeNull()
  })
  test('carries the place, the intent, and the host’s by and at', () => {
    const location = { ...here, intent: 'comment', by: 'kehikot.diff', at: '2026-10-22T10:00:00.000Z' }
    expect(contextSchema.parse({ location }).location).toEqual(location as never)
  })
  test('intent absent, or a word this version does not know, reads show', () => {
    expect(sharedLocationSchema.parse(here).intent).toBe('show')
    expect(sharedLocationSchema.parse({ ...here, intent: 'annotate' }).intent).toBe('show')
  })
  test('the place rules hold in the context too', () => {
    expect(contextSchema.safeParse({ location: { ...here, endLine: 1 } }).success).toBe(false)
    expect(contextSchema.safeParse({ location: { ...here, path: '../x' } }).success).toBe(false)
    expect(contextSchema.safeParse({ location: { ...here, by: 'Not An Id' } }).success).toBe(false)
  })
})

describe('location.set', () => {
  test('a method under its own capability, with a sentence that says everyone is told', () => {
    expect(METHODS['location.set']).toBe('location:set')
    expect(CAPABILITIES['location:set']).toContain('Every module on the canvas is told')
    expect(Object.hasOwn(REACTS_TO, 'location')).toBe(true)
  })
  test('location is required and nullable; intent is optional and closed', () => {
    const params = methodParams['location.set']
    expect(params.safeParse({ location: here }).success).toBe(true)
    expect(params.safeParse({ location: null }).success).toBe(true)
    expect(params.safeParse({ location: here, intent: 'comment' }).success).toBe(true)
    expect(params.safeParse({ location: here, intent: 'show' }).success).toBe(true)
    expect(params.safeParse({}).success).toBe(false)
    expect(params.safeParse({ location: here, intent: 'annotate' }).success).toBe(false)
    expect(params.safeParse({ location: { ...here, endLine: 1 } }).success).toBe(false)
  })
  test('is answered with locationSetResult', () => {
    expect(resultSchemaFor('location.set')).toBe(locationSetResult)
    expect(locationSetResult.parse({ outcome: 'taken' })).toEqual({ outcome: 'taken', why: '' })
    expect(locationSetResult.safeParse({ outcome: 'not-selected', why: 'Pick the change first.' }).success).toBe(true)
    expect(locationSetResult.safeParse({ outcome: 'moved' }).success).toBe(false)
  })
})

describe('the helpers', () => {
  test('locationStands: while its change is selected', () => {
    expect(locationStands(here, ['gh#1', 'gl!123'])).toBe(true)
    expect(locationStands(here, ['gh#1'])).toBe(false)
    expect(locationStands(here, [])).toBe(false)
    expect(locationStands(null, ['gl!123'])).toBe(false)
  })
  test('samePlace: change, path, side and lines; not commit, intent or when', () => {
    expect(samePlace(here, { ...here, commit: 'def5678' })).toBe(true)
    expect(samePlace(here, { ...here, endLine: 42 })).toBe(true)
    expect(samePlace(here, { ...here, endLine: 43 })).toBe(false)
    expect(samePlace(here, { ...here, side: 'old' })).toBe(false)
    expect(samePlace(here, { ...here, path: 'src/b.ts' })).toBe(false)
    expect(samePlace(null, null)).toBe(true)
    expect(samePlace(here, null)).toBe(false)
  })
  test('locationLabel', () => {
    expect(locationLabel(here)).toBe('src/app.ts:42')
    expect(locationLabel({ ...here, endLine: 48 })).toBe('src/app.ts:42-48')
    expect(locationLabel({ ...here, endLine: 42 })).toBe('src/app.ts:42')
  })
})

describe('the client', () => {
  const stores: { stop(): void }[] = []
  afterEach(() => {
    for (const one of stores.splice(0)) one.stop()
  })

  function framed(context: Record<string, unknown>) {
    const said: { type: string; method?: string; params?: unknown; id?: string }[] = []
    const host = { postMessage: (message: unknown) => said.push(message as never) }
    const listeners = new Set<(ev: MessageEvent) => void>()
    const box = makeMailbox({ parent: null, addEventListener: (_t: 'message', fn: (ev: MessageEvent) => void) => void listeners.add(fn) })
    const post = (data: unknown) => {
      for (const fn of [...listeners]) fn({ data, origin: 'null', source: host } as MessageEvent)
    }
    post({ type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's1', state: null, context })
    const live = hostStore('kehikot.example', {}, { source: box })
    stores.push(live)
    live.start()
    return { live, said, post }
  }

  test('hostFields carries the location, and keeps it while it says the same thing', () => {
    const location = { ...here, intent: 'show' as const, at: 't1' }
    const first = hostFields(contextSchema.parse({ location }))
    expect(first.location).toEqual(location)
    const again = hostFields(contextSchema.parse({ location }), first)
    expect(again.location).toBe(first.location)
    const moved = hostFields(contextSchema.parse({ location: { ...location, at: 't2' } }), first)
    expect(moved.location).not.toBe(first.location)
    expect(hostFields(null).location).toBeNull()
  })

  test('locate asks location.set, and resolves with the host’s answer', async () => {
    const { live, said, post } = framed({ selection: ['gl!123'] })
    const answered = live.locate(here, 'comment')
    const asked = said.find((one) => one.method === 'location.set')
    expect(asked?.params).toEqual({ location: here, intent: 'comment' })
    post({ type: MESSAGE.RESPONSE, id: asked?.id, ok: true, data: { outcome: 'taken', why: '' } })
    expect(await answered).toEqual({ outcome: 'taken', why: '' })
  })

  test('locate without an intent sends none; a refusal resolves null', async () => {
    const { live, said, post } = framed({})
    const answered = live.locate(null)
    const asked = said.find((one) => one.method === 'location.set')
    expect(asked?.params).toEqual({ location: null })
    post({ type: MESSAGE.RESPONSE, id: asked?.id, ok: false, reason: 'failed', error: 'Not declared.' })
    expect(await answered).toBeNull()
  })

  test('locate with nobody framing the page resolves null and says nothing', async () => {
    const live = hostStore('kehikot.example', {}, { source: makeMailbox({ parent: null, addEventListener: () => {} }), grace: 0 })
    stores.push(live)
    live.start()
    expect(await live.locate(here)).toBeNull()
  })
})
