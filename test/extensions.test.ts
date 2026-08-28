import { describe, expect, test } from 'bun:test'
import {
  CAPABILITIES,
  EXTENSION_NAMES,
  METHODS,
  METHOD_NAMES,
  callPayload,
  known,
  methodParams,
  notificationPayload,
  schemaFor,
} from '../src/index.js'

describe('a format is named with its version, and that is the whole mechanism', () => {
  test('every registered name carries an @version', () => {
    expect(EXTENSION_NAMES.length).toBeGreaterThan(0)
    for (const name of EXTENSION_NAMES) expect(name).toMatch(/^[a-z0-9.]+@\d+$/)
  })

  test('the version is not optional: the unversioned name is a different name, and unknown', () => {
    expect(known('roadmap.notifications@1')).toBe(true)
    expect(known('roadmap.notifications')).toBe(false)
    expect(known('roadmap.notifications@2')).toBe(false)
    expect(schemaFor('roadmap.notifications')).toBeUndefined()
    expect(schemaFor('roadmap.notifications@1')).toBeDefined()
  })

  test('a name off the prototype is not a known extension', () => {
    expect(known('constructor')).toBe(false)
    expect(known('toString')).toBe(false)
    expect(schemaFor('constructor')).toBeUndefined()
  })
})

describe('roadmap.notifications@1', () => {
  test('the minimum is an epic and a message, and the level defaults', () => {
    const p = notificationPayload.parse({ epic: 'modes-are-modules', message: 'Built the paper.' })
    expect(p.level).toBe('info')
    expect(p.refs).toEqual([])
  })

  test('an epic slug is an epic slug, even arriving inside a payload rather than at the door', () => {
    expect(notificationPayload.safeParse({ epic: '../modules', message: 'x' }).success).toBe(false)
    expect(notificationPayload.safeParse({ epic: 'Modes', message: 'x' }).success).toBe(false)
    expect(notificationPayload.safeParse({ epic: 'a'.repeat(81), message: 'x' }).success).toBe(false)
  })

  test('a line on a panel is a line, not a document', () => {
    expect(notificationPayload.safeParse({ epic: 'x', message: 'y'.repeat(2001) }).success).toBe(false)
    expect(notificationPayload.safeParse({ epic: 'x', message: '' }).success).toBe(false)
  })

  test('refs are bounded in both length and number', () => {
    expect(notificationPayload.safeParse({ epic: 'x', message: 'y', refs: ['z'.repeat(65)] }).success).toBe(false)
    const many = Array.from({ length: 33 }, (_, i) => `gh#${i}`)
    expect(notificationPayload.safeParse({ epic: 'x', message: 'y', refs: many }).success).toBe(false)
  })

  test('a level nobody defined is refused rather than shown', () => {
    expect(notificationPayload.safeParse({ epic: 'x', message: 'y', level: 'urgent' }).success).toBe(false)
  })

  test('a sender cannot choose its own by-line, because there is no field for one', () => {
    const p = notificationPayload.parse({ epic: 'x', message: 'y', agent: 'the-owner', from: 'the-owner' })
    expect(p).not.toHaveProperty('agent')
    expect(p).not.toHaveProperty('from')
  })
})

describe('roadmap.calls@1', () => {
  test('what was called, whether it worked, and how long it took', () => {
    const p = callPayload.parse({ target: 'api.github.com', ok: false, ms: 12 })
    expect(p.why).toBe('')
    expect(p.refs).toEqual([])
  })

  test('a duration is a whole number of milliseconds and not a geological age', () => {
    expect(callPayload.safeParse({ target: 'x', ok: true, ms: -1 }).success).toBe(false)
    expect(callPayload.safeParse({ target: 'x', ok: true, ms: 1.5 }).success).toBe(false)
    expect(callPayload.safeParse({ target: 'x', ok: true, ms: 3_600_001 }).success).toBe(false)
  })

  test('a target is a name a person reads, so it is bounded like one', () => {
    expect(callPayload.safeParse({ target: 'x'.repeat(81), ok: true, ms: 0 }).success).toBe(false)
    expect(callPayload.safeParse({ target: '', ok: true, ms: 0 }).success).toBe(false)
  })

  test('a module cannot say which side of the chart it lands on', () => {
    const p = callPayload.parse({ target: 'x', ok: true, ms: 0, kind: 'crossing' })
    expect(p).not.toHaveProperty('kind')
  })
})

describe('methods', () => {
  test('every method belongs to a capability that exists', () => {
    for (const name of METHOD_NAMES) {
      const capability = METHODS[name]
      expect(Object.hasOwn(CAPABILITIES, capability)).toBe(true)
    }
  })

  test('every method has params, and the ones taking an epic hold it to the same shape', () => {
    for (const name of METHOD_NAMES) expect(methodParams[name]).toBeDefined()
    for (const name of ['epic.get', 'steps.list', 'live.get'] as const) {
      expect(methodParams[name].safeParse({ epic: '../modules' }).success).toBe(false)
      expect(methodParams[name].safeParse({ epic: 'modes-are-modules' }).success).toBe(true)
    }
  })

  test('a stage report is one of the three nothing else can see', () => {
    expect(methodParams['stage.report'].safeParse({ ref: 'gh#41', stage: 'working' }).success).toBe(true)
    expect(methodParams['stage.report'].safeParse({ ref: 'gh#41', stage: 'stalled' }).success).toBe(false)
    expect(methodParams['stage.report'].safeParse({ ref: 'gh#41', stage: 'in-prod' }).success).toBe(false)
  })

  test('a ref and a note are refused when too long, never quietly clipped', () => {
    const long = methodParams['stage.report'].safeParse({ ref: 'g'.repeat(65), stage: 'working' })
    expect(long.success).toBe(false)
    const note = methodParams['stage.report'].safeParse({ ref: 'gh#1', stage: 'working', note: 'n'.repeat(2001) })
    expect(note.success).toBe(false)
  })
})
