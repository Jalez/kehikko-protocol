import { describe, expect, test } from 'bun:test'
import {
  HOST_MESSAGES,
  MESSAGE,
  MODULE_MESSAGES,
  REFRESH_EVERY_MAX,
  REFRESH_EVERY_MIN,
  hostMessageSchema,
  moduleMessageSchema,
  refreshSchema,
  refreshableSchema,
} from '../src/index.js'

/**
 * The two shapes a module and a host use to agree that material can be read
 * again, and that somebody — or a clock — asked for it to be.
 *
 * As with clearing, the tests worth having are about what is REFUSED and about
 * what deliberately is not there. One field in this pair is unlike anything
 * else in the protocol: `at` is a fact a host would otherwise guess, and every
 * guess it could make is wrong in a case somebody cares about.
 */

describe('what a module says about being refreshed', () => {
  test('whether it can be, when it last was, and whether it is reading now', () => {
    const said = refreshableSchema.parse({
      type: MESSAGE.REFRESHABLE,
      can: true,
      at: '2026-09-01T10:49:48Z',
      busy: false,
    })
    expect(said.at).toBe('2026-09-01T10:49:48Z')
    expect(said.can).toBe(true)
    expect(said.busy).toBe(false)
  })

  /* The defaults are the shape of the ordinary announcement: a module that has
     something to read and has not read it yet says so with one field. */
  test('the smallest honest announcement is the type alone', () => {
    const said = refreshableSchema.parse({ type: MESSAGE.REFRESHABLE })
    expect(said).toEqual({ type: MESSAGE.REFRESHABLE, can: true, at: null, busy: false })
  })

  /*
   * `null` is a real answer and it is not the same as `can: false`.
   *
   * "I can be refreshed and I cannot tell you when I last was" is the state a
   * module is in before its first successful read, and a host draws the control
   * with no time beside it rather than inventing one.
   */
  test('null at is "I cannot say", and is not a withdrawal', () => {
    const said = refreshableSchema.parse({ type: MESSAGE.REFRESHABLE, at: null })
    expect(said.at).toBeNull()
    expect(said.can).toBe(true)
  })

  test('can:false is the withdrawal, the way a null clear label is', () => {
    expect(refreshableSchema.parse({ type: MESSAGE.REFRESHABLE, can: false }).can).toBe(false)
  })

  /*
   * An instant, with an offset, and nothing looser.
   *
   * A host is going to format this into a sentence a person reads beside a list
   * — "last read 20 minutes ago" — and it can only do that from a real instant.
   * A module's own idea of a date string, or a bare "10:49", would be printed
   * as whatever it is or silently mis-parsed into a time that is wrong by
   * hours, which is the exact failure the field exists to prevent.
   */
  test('a time that is not an instant is refused', () => {
    for (const bad of ['yesterday', '2026-09-01', '10:49', 'just now', '2026-09-01T10:49:48']) {
      expect(refreshableSchema.safeParse({ type: MESSAGE.REFRESHABLE, at: bad }).success).toBe(false)
    }
    for (const good of ['2026-09-01T10:49:48Z', '2026-09-01T10:49:48+03:00', '2026-09-01T10:49:48.123Z']) {
      expect(refreshableSchema.safeParse({ type: MESSAGE.REFRESHABLE, at: good }).success).toBe(true)
    }
  })

  /*
   * The fields somebody will want to add, asserted absent.
   *
   * An interval would be the module holding a setting that belongs to one
   * container and has to outlive the module's next reload — the exact thing
   * `filters` on the placement exists for. An error string would be a host
   * drawing somebody else's failure in chrome that has no room for a remedy,
   * when the module has a whole page to say it in. A count of what was read
   * would be the host reporting a number it did not count.
   *
   * Zod strips unknown keys, so this asserts on what survives.
   */
  test('an interval, an error and a count get none of them through', () => {
    const said = refreshableSchema.parse({
      type: MESSAGE.REFRESHABLE,
      every: 5,
      error: 'GitHub could not be reached',
      read: 146,
    })
    expect(said).toEqual({ type: MESSAGE.REFRESHABLE, can: true, at: null, busy: false })
  })

  test('it is a module message and never a host one', () => {
    expect(moduleMessageSchema.parse({ type: MESSAGE.REFRESHABLE }).type).toBe(MESSAGE.REFRESHABLE)
    expect(MODULE_MESSAGES).toContain(MESSAGE.REFRESHABLE)
    expect(hostMessageSchema.safeParse({ type: MESSAGE.REFRESHABLE }).success).toBe(false)
  })
})

describe('the press, relayed', () => {
  test('it carries the protocol and nothing else', () => {
    expect(refreshSchema.parse({ type: MESSAGE.REFRESH, protocol: 2 })).toEqual({
      type: MESSAGE.REFRESH,
      protocol: 2,
    })
  })

  /*
   * The one field that would break it, and it is the one that looks most
   * harmless: a flag saying this tick was automatic rather than pressed.
   *
   * A module told the difference would use it — taking a cache on the automatic
   * one and not on the deliberate one is the obvious first idea — which is a
   * module setting its own policy from a fact about somebody else's timer. What
   * a press should do is what a tick should do.
   */
  test('a sender that says which of the two causes it was gets it stripped', () => {
    const parsed = refreshSchema.parse({ type: MESSAGE.REFRESH, protocol: 2, automatic: true, id: 'c1' })
    expect(parsed).toEqual({ type: MESSAGE.REFRESH, protocol: 2 })
  })

  test('it is a host message and never a module one', () => {
    expect(hostMessageSchema.parse({ type: MESSAGE.REFRESH, protocol: 2 }).type).toBe(MESSAGE.REFRESH)
    expect(HOST_MESSAGES).toContain(MESSAGE.REFRESH)
    expect(moduleMessageSchema.safeParse({ type: MESSAGE.REFRESH, protocol: 2 }).success).toBe(false)
  })
})

/**
 * The interval is the host's, and these two numbers are what the two sides have
 * agreed a person may set it to.
 *
 * Stated here rather than in a host for the same reason the height bounds are:
 * a second host written against this protocol should not have to invent them,
 * and a module reading this package can see what may be done to it.
 */
describe('how often a container may be refreshed', () => {
  test('a minute at the fast end, a day at the slow one', () => {
    expect(REFRESH_EVERY_MIN).toBe(1)
    expect(REFRESH_EVERY_MAX).toBe(1440)
  })

  test('the refresh message carries no interval, because the module never runs the clock', () => {
    expect(refreshSchema.parse({ type: MESSAGE.REFRESH, protocol: 2 })).not.toHaveProperty('every')
  })
})

/**
 * Three offers now, and the property that keeps them three messages.
 *
 * Withdrawing one must leave the others standing. Folded together, a module
 * with nothing to be narrowed by would send an empty `groups` — whole
 * replacement being the point of that message — and would silently take its
 * refresh control away at the same time. Nothing would error and a button would
 * simply be gone.
 */
describe('the three offers are independent', () => {
  test('the spellings cannot be confused for each other', () => {
    expect(MESSAGE.REFRESHABLE).not.toBe(MESSAGE.REFRESH)
    expect(MESSAGE.REFRESHABLE).not.toBe(MESSAGE.CLEARABLE)
    expect(MESSAGE.REFRESHABLE).not.toBe(MESSAGE.FILTERS)
  })

  test('withdrawing one says nothing about the others', () => {
    expect(moduleMessageSchema.parse({ type: MESSAGE.FILTERS, groups: [] })).not.toHaveProperty('can')
    expect(moduleMessageSchema.parse({ type: MESSAGE.REFRESHABLE, can: false })).not.toHaveProperty('groups')
    expect(moduleMessageSchema.parse({ type: MESSAGE.REFRESHABLE, can: false })).not.toHaveProperty('label')
  })
})
