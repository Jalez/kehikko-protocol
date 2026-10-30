import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import {
  DECLARATION_SINCE,
  EVENT_SOUNDS,
  HOLDS,
  LIMITS,
  MANIFEST_KIND,
  OPENS,
  PACKAGE_VERSION,
  PROTOCOL,
  canOpen,
  eventSoundOf,
  fitOf,
  holdsLiveSessions,
  holdsOf,
  holdsSchema,
  inboxEventSchema,
  manifestSchema,
  opensOf,
  opensSchema,
} from '../src/index.js'

/**
 * 2.33.0: what a module can open when the host points the canvas at it (`opens`), what a restart
 * of it ends (`holds`), and the built-in sound an Inbox event plays before the person chooses one
 * (`events[].sound`). All three are what a module says about itself, read by a host that names no
 * module. Also parsed by the 2.32.0 and 2.30.0 builds from their tags, which ignore all three and
 * run the module.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')
const dirs: string[] = []
const olds: Record<string, Record<string, any> | null> = { 'v2.32.0': null, 'v2.30.0': null }
beforeAll(async () => {
  for (const tag of Object.keys(olds)) {
    try {
      const dir = realpathSync(mkdtempSync(join(tmpdir(), `kehikot-v233-${tag}-`)))
      dirs.push(dir)
      execFileSync('sh', ['-c', `git -C "${REPO}" archive ${tag} | tar -x -C "${dir}"`], { stdio: 'ignore' })
      symlinkSync(join(REPO, 'node_modules'), join(dir, 'node_modules'))
      olds[tag] = await import(join(dir, 'src/index.ts'))
    } catch {
      console.warn(`${tag} is not available here: its compatibility checks are skipped`)
    }
  }
})
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
})

const research = { id: 'research-complete', says: 'Research complete', state: 'done' as const }

const manifest = (over: Record<string, unknown> = {}) => ({
  kind: MANIFEST_KIND,
  protocol: PROTOCOL,
  id: 'kehikot.example',
  name: 'Example',
  version: '1.0.0',
  entry: '/app',
  modes: [{ id: 'main', label: 'Main' }],
  partless: 'Nothing in it belongs to a part.',
  ...over,
})

describe('the version', () => {
  test('is 2.33.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.35.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('opens', () => {
  test('is carried, and read by opensOf and canOpen', () => {
    const parsed = manifestSchema.parse(manifest({ opens: ['file'] }))
    expect(parsed.opens).toEqual(['file'])
    expect(opensOf(parsed)).toEqual(['file'])
    expect(canOpen(parsed, 'file')).toBe(true)
    expect(canOpen(parsed, 'page')).toBe(false)
  })

  test('absent is absent, never defaulted, and reads as nothing', () => {
    const parsed = manifestSchema.parse(manifest())
    expect(parsed.opens).toBeUndefined()
    expect(opensOf(parsed)).toEqual([])
    expect(canOpen(parsed, 'file')).toBe(false)
    expect(canOpen(null, 'file')).toBe(false)
  })

  test('a word this version does not know is carried as written', () => {
    expect(manifestSchema.parse(manifest({ opens: ['file', 'notebook'] })).opens).toEqual(['file', 'notebook'])
    expect(Object.keys(OPENS)).toEqual(['file'])
  })

  test('refused shapes, each on its own; the manifest keeps everything else', () => {
    for (const bad of [['File'], ['file', 'file'], [''], ['a b'], Array.from({ length: LIMITS.OPENS + 1 }, (_, i) => `w${i}`), 'file']) {
      expect(opensSchema.safeParse(bad).success).toBe(false)
      const parsed = manifestSchema.parse(manifest({ opens: bad }))
      expect(parsed.opens).toBeUndefined()
      expect(parsed.id).toBe('kehikot.example')
    }
  })
})

describe('holds', () => {
  test('is carried, and read by holdsOf and holdsLiveSessions', () => {
    const parsed = manifestSchema.parse(manifest({ holds: ['live-sessions'] }))
    expect(parsed.holds).toEqual(['live-sessions'])
    expect(holdsOf(parsed)).toEqual(['live-sessions'])
    expect(holdsLiveSessions(parsed)).toBe(true)
    expect(Object.keys(HOLDS)).toEqual(['live-sessions'])
  })

  test('absent holds nothing', () => {
    const parsed = manifestSchema.parse(manifest())
    expect(parsed.holds).toBeUndefined()
    expect(holdsLiveSessions(parsed)).toBe(false)
    expect(holdsLiveSessions(undefined)).toBe(false)
    expect(holdsLiveSessions(manifestSchema.parse(manifest({ holds: ['cache'] })))).toBe(false)
  })

  test('refused shapes are dropped, not fatal', () => {
    for (const bad of [['Live'], ['live-sessions', 'live-sessions'], true, 'live-sessions']) {
      expect(holdsSchema.safeParse(bad).success).toBe(false)
      expect(manifestSchema.parse(manifest({ holds: bad })).holds).toBeUndefined()
    }
  })
})

describe('events[].sound', () => {
  test('is carried on the event', () => {
    const parsed = manifestSchema.parse(manifest({ events: [{ ...research, sound: 'answer' }] }))
    expect(parsed.events).toEqual([{ ...research, sound: 'answer' }])
  })

  test('absent is absent', () => {
    expect(manifestSchema.parse(manifest({ events: [research] })).events).toEqual([research])
  })

  test('a key this version does not list is carried; a bad one is dropped and the event kept', () => {
    expect(inboxEventSchema.parse({ ...research, sound: 'chimes2' }).sound).toBe('chimes2')
    for (const bad of ['Answer', 'an-swer', '', 'a'.repeat(LIMITS.SOUND_KEY + 1), 3]) {
      const parsed = manifestSchema.parse(manifest({ events: [{ ...research, sound: bad }] }))
      expect(parsed.events).toEqual([research])
    }
  })

  test('eventSoundOf: the key when the host has it, else null (the kind’s)', () => {
    const has = (key: string) => Object.hasOwn(EVENT_SOUNDS, key)
    expect(eventSoundOf({ sound: 'answer' }, has)).toBe('answer')
    expect(eventSoundOf({ sound: 'chimes2' }, has)).toBeNull()
    expect(eventSoundOf({}, has)).toBeNull()
    expect(eventSoundOf(null, has)).toBeNull()
  })

  test('EVENT_SOUNDS lists the built-in keys', () => {
    expect(Object.keys(EVENT_SOUNDS)).toEqual(['bell', 'marimba', 'pluck', 'twotone', 'rising', 'playful', 'answer'])
  })
})

describe('none of the three is held to a newer host', () => {
  test('not in DECLARATION_SINCE, and a manifest saying all three fits a 2.30.0 host', () => {
    for (const key of ['opens', 'holds', 'sound', 'events.sound']) expect(Object.keys(DECLARATION_SINCE)).not.toContain(key)
    const parsed = manifestSchema.parse(manifest({ opens: ['file'], holds: ['live-sessions'], events: [{ ...research, sound: 'answer' }] }))
    expect(fitOf(parsed, { version: '2.30.0' }).fit).toBe('fits')
    expect(fitOf(parsed, { version: '2.32.0' }).fit).toBe('fits')
  })
})

for (const tag of Object.keys(olds)) {
  describe(`a ${tag} host`, () => {
    test('reads a manifest that says opens, holds and an event sound, without them, and runs it', () => {
      const old = olds[tag]
      if (!old) return
      const raw = manifest({ opens: ['file'], holds: ['live-sessions'], events: [{ ...research, sound: 'answer' }] })
      const parsed = old.manifestSchema.parse(raw)
      expect(parsed.id).toBe('kehikot.example')
      expect(parsed.opens).toBeUndefined()
      expect(parsed.holds).toBeUndefined()
      /* 2.31.0 brought `events`: a 2.32.0 host strips only the sound, a 2.30.0 host the whole list. */
      expect(parsed.events).toEqual(tag === 'v2.30.0' ? undefined : [research])
      expect(old.fitOf(parsed, { version: tag.slice(1) }).fit).toBe('fits')
      expect(old.fitOf(raw, { version: tag.slice(1) }).fit).toBe('fits')
    })
  })
}
