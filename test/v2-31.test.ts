import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import {
  ACTIVITY_FIELD_SINCE,
  DECLARATION_SINCE,
  EVENT_ID,
  LIMITS,
  MANIFEST_KIND,
  PACKAGE_VERSION,
  PROTOCOL,
  SINCE,
  activityItemSchema,
  activityItemsSchema,
  declaredEvent,
  fitOf,
  inboxEventsSchema,
  manifestSchema,
  pieceSaid,
  sinceOf,
} from '../src/index.js'

/**
 * 2.31.0: named Inbox events. A manifest declares `events`, an activity item names one with
 * `event`, and a host counts it only when it is declared for the item's state (`declaredEvent`).
 * Also parsed by the 2.30.0 build from the tag, which strips both.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')
let dir = ''
let old: Record<string, any> | null = null
beforeAll(async () => {
  try {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'kehikot-v231-')))
    execFileSync('sh', ['-c', `git -C "${REPO}" archive v2.30.0 | tar -x -C "${dir}"`], { stdio: 'ignore' })
    symlinkSync(join(REPO, 'node_modules'), join(dir, 'node_modules'))
    old = await import(join(dir, 'src/index.ts'))
  } catch {
    console.warn('v2.30.0 is not available here: the 2.30.0 compatibility checks are skipped')
  }
})
afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
})

const research = { id: 'research-complete', says: 'Research complete', state: 'done' as const }

const manifest = (over: Record<string, unknown> = {}) => ({
  kind: MANIFEST_KIND,
  protocol: PROTOCOL,
  id: 'kehikot.claude',
  name: 'Claude',
  version: '1.9.0',
  entry: '/app',
  modes: [{ id: 'sessions', label: 'Sessions' }],
  partless: 'Sessions are the person’s.',
  ...over,
})

const item = (more: Record<string, unknown> = {}) => ({ id: 's1', state: 'done', label: 'Protocol audit', ...more })

describe('the version', () => {
  test('is 2.31.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.31.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('events', () => {
  test('a list of events is carried', () => {
    const parsed = manifestSchema.parse(manifest({ events: [research] }))
    expect(parsed.events).toEqual([research])
  })

  test('absent is absent, never defaulted', () => {
    expect(manifestSchema.parse(manifest()).events).toBeUndefined()
  })

  test('refused shapes, each on its own', () => {
    expect(inboxEventsSchema.safeParse([research]).success).toBe(true)
    for (const bad of [
      [{ ...research, id: 'Research' }],
      [{ ...research, id: 'research--complete' }],
      [{ ...research, id: '-research' }],
      [{ ...research, id: 'r'.repeat(LIMITS.EVENT_ID + 1) }],
      [{ ...research, says: '  ' }],
      [{ ...research, says: 's'.repeat(LIMITS.EVENT_SAYS + 1) }],
      [{ ...research, state: 'finished' }],
      [research, research],
      Array.from({ length: LIMITS.EVENTS + 1 }, (_, i) => ({ ...research, id: `e${i}` })),
    ]) {
      expect(inboxEventsSchema.safeParse(bad).success).toBe(false)
    }
  })

  test('a list that does not parse is dropped, and the manifest is not refused', () => {
    const parsed = manifestSchema.parse(manifest({ events: [research, research] }))
    expect(parsed.events).toBeUndefined()
  })

  test('is not held to a newer host', () => {
    expect(Object.keys(DECLARATION_SINCE)).not.toContain('events')
    const parsed = manifestSchema.parse(manifest({ events: [research] }))
    expect(fitOf(parsed, { version: '2.30.0' }).fit).toBe('fits')
  })
})

describe('event on an activity item', () => {
  test('carried', () => {
    expect(activityItemSchema.parse(item({ event: 'research-complete' })).event).toBe('research-complete')
    expect(activityItemSchema.parse(item()).event).toBeUndefined()
  })

  test('a bad shape refuses the list', () => {
    expect(activityItemsSchema.safeParse([item({ event: 'Research Complete' })]).success).toBe(false)
    expect(activityItemsSchema.safeParse([item({ event: '' })]).success).toBe(false)
    expect(EVENT_ID.test('research-complete')).toBe(true)
  })
})

describe('declaredEvent, the one rule', () => {
  test('a declared event for the item’s state', () => {
    expect(declaredEvent([research], { state: 'done', event: 'research-complete' })).toEqual(research)
  })

  test('an undeclared event is ignored', () => {
    expect(declaredEvent([research], { state: 'done', event: 'build-green' })).toBeNull()
    expect(declaredEvent(undefined, { state: 'done', event: 'research-complete' })).toBeNull()
    expect(declaredEvent([], { state: 'done', event: 'research-complete' })).toBeNull()
  })

  test('an event declared for another state is ignored', () => {
    expect(declaredEvent([research], { state: 'attention', event: 'research-complete' })).toBeNull()
  })

  test('no event is no event', () => {
    expect(declaredEvent([research], { state: 'done' })).toBeNull()
  })
})

describe('ACTIVITY_FIELD_SINCE', () => {
  test('says when each optional item field came', () => {
    expect(SINCE.activityFields).toBe(ACTIVITY_FIELD_SINCE)
    expect(sinceOf('activityField', 'event')).toBe('2.31.0')
    expect(sinceOf('activityField', 'priority')).toBe('1.7.0')
    expect(sinceOf('activityField', 'constructor')).toBeNull()
    expect(pieceSaid('activityField', 'event')).toBe('event')
  })
})

describe('a 2.30.0 host', () => {
  test('strips event and still takes the list', () => {
    if (!old) return
    const parsed = old.activityItemsSchema.parse([item({ event: 'research-complete' })])
    expect(parsed[0].event).toBeUndefined()
    expect(parsed[0].state).toBe('done')
  })

  test('reads a manifest that declares events, without them, and runs it', () => {
    if (!old) return
    expect(old.fitOf(manifest({ events: [research] }), { version: '2.30.0' }).fit).toBe('fits')
    const parsed = old.manifestSchema.parse(manifest({ events: [research] }))
    expect(parsed.events).toBeUndefined()
    expect(parsed.id).toBe('kehikot.claude')
  })
})
