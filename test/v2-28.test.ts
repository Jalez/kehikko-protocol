import { describe, expect, test } from 'bun:test'

import {
  DECLARATION_SINCE,
  LIMITS,
  MANIFEST_KIND,
  NAVIGATES_NAMES,
  PACKAGE_VERSION,
  PROTOCOL,
  SHOW_SUBJECTS,
  canShow,
  contextSchema,
  fitOf,
  gotoProjectIsId,
  manifestSchema,
  methodParams,
  navigatesOf,
  needsOf,
  sharedShowSchema,
  showIsNews,
  showsOf,
} from '../src/index.js'

/** 2.28.0: `view.goto` into another project, and one thing to be shown there. */

const manifest = (over: Record<string, unknown> = {}) => ({
  kind: MANIFEST_KIND,
  protocol: PROTOCOL,
  id: 'kehikot.queue',
  name: 'Test runs',
  version: '0.3.0',
  entry: '/app',
  modes: [{ id: 'queue', label: 'Test runs', scope: 'global' }],
  partless: 'Runs are this computer’s.',
  ...over,
})

const goto = methodParams['view.goto']

describe('the version', () => {
  test('2.28.0, protocol 2', () => {
    expect(PACKAGE_VERSION).toBe('2.34.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('view.goto { project }', () => {
  test('takes a project id or a folder beside an epic, kehikko and parts', () => {
    expect(goto.safeParse({ project: 'p-1234567', epic: 'queue' }).success).toBe(true)
    expect(goto.safeParse({ project: '/Users/me/thesis', epic: 'queue', kehikko: 'k-dev', parts: ['seam'] }).success).toBe(true)
  })
  test('goes with an epic: a project alone names no place in it', () => {
    const alone = goto.safeParse({ project: 'p-1234567' })
    expect(alone.success).toBe(false)
    const withRef = goto.safeParse({ project: 'p-1234567', ref: 'gh#41' })
    expect(withRef.success).toBe(false)
    expect(withRef.error?.issues[0]?.message).toBe('view.goto: `project` goes with the `epic` to go to in it')
  })
  test('refuses an empty project and one past PATH', () => {
    expect(goto.safeParse({ project: '', epic: 'queue' }).success).toBe(false)
    expect(goto.safeParse({ project: '  ', epic: 'queue' }).success).toBe(false)
    expect(goto.safeParse({ project: `/${'a'.repeat(LIMITS.PATH)}`, epic: 'queue' }).success).toBe(false)
  })
  test('an id is told from a folder', () => {
    expect(gotoProjectIsId('p-1234567')).toBe(true)
    expect(gotoProjectIsId('/Users/me/thesis')).toBe(false)
  })
  test('a call without it is what it was', () => {
    expect(goto.parse({ epic: 'queue', kehikko: 'k-dev' })).toEqual({ epic: 'queue', kehikko: 'k-dev' })
  })
})

describe('view.goto { show }', () => {
  test('takes a subject and an id', () => {
    const parsed = goto.parse({ epic: 'queue', show: { subject: 'agent-session', id: '0b6c-41' } })
    expect(parsed.show).toEqual({ subject: 'agent-session', id: '0b6c-41' })
  })
  test('refuses a subject that is not a word, an empty id and one past SHOW_ID', () => {
    expect(goto.safeParse({ epic: 'q', show: { subject: 'Agent Session', id: 'a' } }).success).toBe(false)
    expect(goto.safeParse({ epic: 'q', show: { subject: 'agent-session', id: '' } }).success).toBe(false)
    expect(goto.safeParse({ epic: 'q', show: { subject: 'agent-session', id: 'x'.repeat(LIMITS.SHOW_ID + 1) } }).success).toBe(false)
  })
  test('the subjects this version knows', () => expect(Object.keys(SHOW_SUBJECTS)).toEqual(['agent-session']))
})

describe('context.show', () => {
  test('null by default, and from an older host', () => {
    expect(contextSchema.parse({}).show).toBeNull()
  })
  test('carries the ask, who asked and when', () => {
    const show = { subject: 'agent-session', id: 's1', by: 'kehikot.queue', at: '2026-10-28T10:00:00.000Z' }
    expect(contextSchema.parse({ show }).show).toEqual(show)
    expect(sharedShowSchema.safeParse({ ...show, by: 'Not An Id' }).success).toBe(false)
  })
  test('is news when its at is new, or, without one, when it names something else', () => {
    const show = { subject: 'agent-session', id: 's1', at: 'a' }
    expect(showIsNews(null, null)).toBe(false)
    expect(showIsNews(show, null)).toBe(true)
    expect(showIsNews(show, { at: 'a' })).toBe(false)
    expect(showIsNews({ ...show, at: 'b' }, { at: 'a', subject: 'agent-session', id: 's1' })).toBe(true)
    expect(showIsNews({ subject: 'agent-session', id: 's1' }, { subject: 'agent-session', id: 's1' })).toBe(false)
    expect(showIsNews({ subject: 'agent-session', id: 's2' }, { subject: 'agent-session', id: 's1' })).toBe(true)
  })
})

describe('shows, in a manifest', () => {
  test('says what a module can be asked to show', () => {
    const parsed = manifestSchema.parse(manifest({ shows: ['agent-session'] }))
    expect(showsOf(parsed)).toEqual(['agent-session'])
    expect(canShow(parsed, 'agent-session')).toBe(true)
    expect(canShow(parsed, 'slide')).toBe(false)
  })
  test('absent says nothing, and a list that does not parse is dropped, not fatal', () => {
    expect(showsOf(manifestSchema.parse(manifest()))).toEqual([])
    const parsed = manifestSchema.parse(manifest({ shows: ['agent-session', 'agent-session'] }))
    expect(parsed.shows).toBeUndefined()
  })
  test('is what a module says about itself: an older host runs it, and fit asks nothing for it', () => {
    const said = manifest({ shows: ['agent-session'], build: { protocol: '2.28.0' } })
    expect(needsOf(said).pieces).toEqual([])
    expect(fitOf(said, { version: '2.27.0' }).fit).toBe('fits')
  })
})

describe('declares.navigates', () => {
  test('says what a module’s view.goto carries', () => {
    const parsed = manifestSchema.parse(manifest({ declares: { uses: ['view:navigate'], navigates: ['project', 'show'] } }))
    expect(navigatesOf(parsed)).toEqual(['project', 'show'])
    expect(NAVIGATES_NAMES).toEqual(['project', 'show'])
    expect(navigatesOf(manifestSchema.parse(manifest()))).toEqual([])
  })
  test('arrived in 2.28.0, so a module that says it needs a 2.28 host', () => {
    expect(DECLARATION_SINCE['declares.navigates']).toBe('2.28.0')
    const said = manifest({ declares: { uses: ['view:navigate'], navigates: ['project'] } })
    expect(needsOf(said).version).toBe('2.28.0')
    const fit = fitOf(said, { version: '2.27.0' })
    expect(fit.fit).toBe('host-too-old')
    if (fit.fit === 'host-too-old') {
      expect(fit.since).toBe('2.28.0')
      expect(fit.missing.map((piece) => piece.piece)).toEqual(['declares.navigates'])
    }
    expect(fitOf(said, { version: '2.28.0' }).fit).toBe('fits')
  })
  test('an empty list asks nothing', () => {
    expect(needsOf(manifest({ declares: { navigates: [] } })).version).toBe('0.25.0')
  })
})
