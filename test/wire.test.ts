import { describe, expect, test } from 'bun:test'
import {
  MAX_HEIGHT,
  MESSAGE,
  LIMITS,
  MIN_HEIGHT,
  clampHeight,
  contextSchema,
  gotoSchema,
  hostMessageSchema,
  looksLikeWireMessage,
  moduleMessageSchema,
  responseSchema,
  wentSchema,
} from '../src/index.js'

describe('a response is one thing or the other', () => {
  test('success carries data and nothing about failure', () => {
    const ok = responseSchema.parse({ type: MESSAGE.RESPONSE, id: 'q1', ok: true, data: { slug: 'x' } })
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.data).toEqual({ slug: 'x' })
  })

  test('a refusal carries both a word to branch on and a sentence to read', () => {
    const no = responseSchema.parse({
      type: MESSAGE.RESPONSE,
      id: 'q1',
      ok: false,
      reason: 'unknown-method',
      error: 'this roadmap has no method "epics.gett"',
    })
    expect(no.ok).toBe(false)
    if (!no.ok) {
      expect(no.reason).toBe('unknown-method')
      expect(no.error).toContain('epics.gett')
    }
  })

  test('a refusal without a word to branch on is not a refusal', () => {
    const bad = responseSchema.safeParse({ type: MESSAGE.RESPONSE, id: 'q1', ok: false, error: 'no' })
    expect(bad.success).toBe(false)
  })

  test('the permission refusal is gone, and naming it does not bring it back', () => {
    const gone = responseSchema.safeParse({
      type: MESSAGE.RESPONSE,
      id: 'q1',
      ok: false,
      reason: 'not-allowed',
      error: 'x',
    })
    expect(gone.success).toBe(false)
  })

  test('a refusal is a sentence and never a document', () => {
    const huge = responseSchema.safeParse({
      type: MESSAGE.RESPONSE,
      id: 'q1',
      ok: false,
      reason: 'failed',
      error: 'x'.repeat(5000),
    })
    expect(huge.success).toBe(false)
  })
})

describe('goto, and the answer that makes it worth sending', () => {
  test('a ref or a step, at the bounds the receiving end already imposes', () => {
    expect(gotoSchema.safeParse({ type: MESSAGE.GOTO, id: 'g1', ref: 'gh#41' }).success).toBe(true)
    expect(gotoSchema.safeParse({ type: MESSAGE.GOTO, id: 'g1', step: 3 }).success).toBe(true)
    expect(gotoSchema.safeParse({ type: MESSAGE.GOTO, id: 'g1', step: 3, epic: 'modes-are-modules' }).success).toBe(true)

    expect(gotoSchema.safeParse({ type: MESSAGE.GOTO, id: 'g1', ref: 'x'.repeat(201) }).success).toBe(false)
    expect(gotoSchema.safeParse({ type: MESSAGE.GOTO, id: 'g1', step: 0 }).success).toBe(false)
    expect(gotoSchema.safeParse({ type: MESSAGE.GOTO, id: 'g1', step: 1000 }).success).toBe(false)
    expect(gotoSchema.safeParse({ type: MESSAGE.GOTO, id: 'g1', step: 2.5 }).success).toBe(false)
    expect(gotoSchema.safeParse({ type: MESSAGE.GOTO, id: 'g1', ref: 'gh#41', epic: 'Not A Slug' }).success).toBe(false)
  })

  test('a goto that names nowhere to go is refused', () => {
    expect(gotoSchema.safeParse({ type: MESSAGE.GOTO, id: 'g1', epic: 'modes-are-modules' }).success).toBe(false)
  })

  test('a goto without an id could never be answered, so it is not a goto', () => {
    expect(gotoSchema.safeParse({ type: MESSAGE.GOTO, ref: 'gh#41' }).success).toBe(false)
  })

  test('the answer says whether it was found, which is what the index falls back on', () => {
    const found = wentSchema.parse({ type: MESSAGE.WENT, id: 'g1', found: true })
    expect(found.found).toBe(true)
    expect(found.why).toBe('')

    const not = wentSchema.parse({
      type: MESSAGE.WENT,
      id: 'g1',
      found: false,
      why: 'Nothing in this epic names gh#41.',
    })
    expect(not.found).toBe(false)
    expect(not.why).toContain('gh#41')

    expect(wentSchema.safeParse({ type: MESSAGE.WENT, id: 'g1' }).success).toBe(false)
  })
})

describe('context says what the host is in a position to know', () => {
  test('it names an epic, and an epic slug is what it holds it to', () => {
    expect(contextSchema.parse({ epic: 'modes-are-modules' }).epic).toBe('modes-are-modules')
    expect(contextSchema.safeParse({ epic: 'Not A Slug' }).success).toBe(false)
    expect(contextSchema.safeParse({ epic: 'a'.repeat(81) }).success).toBe(false)
  })

  test('"nothing is open" is a state, so the field is null rather than gone', () => {
    const empty = contextSchema.parse({})
    expect(empty.epic).toBe(null)
    expect(empty.project).toBe(null)
    expect(empty.projectPath).toBe(null)
    expect(empty.theme).toBe('light')
    expect(contextSchema.parse({ epic: null }).epic).toBe(null)
  })

  test('a project is named and a project is somewhere, and they are two fields', () => {
    const context = contextSchema.parse({
      epic: 'modes-are-modules',
      project: 'roadmap',
      projectPath: '/Users/somebody/Projects/roadmap',
    })
    expect(context.project).toBe('roadmap')
    expect(context.projectPath).toBe('/Users/somebody/Projects/roadmap')
  })

  test('a host that only knows the name still parses, because the path is nullable', () => {
    /* The whole reason this is an addition and not a shape change: a message
       written before `projectPath` existed is still a valid context, and what
       comes out says the host has no folder to point at — which is the truth
       about what that message conveyed. */
    const named = contextSchema.parse({ project: 'roadmap' })
    expect(named.project).toBe('roadmap')
    expect(named.projectPath).toBe(null)
  })

  test('a path is bounded, and an empty one is not a path', () => {
    expect(contextSchema.safeParse({ projectPath: '/' + 'a'.repeat(LIMITS.PATH) }).success).toBe(false)
    expect(contextSchema.safeParse({ projectPath: '' }).success).toBe(false)
    /* Null is a state a module has to be able to move INTO — a host that
       stopped having a filesystem under it, or a project a person cleared. */
    expect(contextSchema.parse({ projectPath: null }).projectPath).toBe(null)
  })

  test('a journey is somebody else\'s material, and naming one here does not make it context', () => {
    /* The rename with no alias, asserted: a host still sending the old field
       is not quietly understood. It parses — every other field defaults —
       but what comes out says no epic is open, which is the truth about
       what that message conveyed. */
    const legacy = contextSchema.parse({ slug: 'modes-are-modules', journey: 'modes-are-modules' })
    expect(legacy).not.toHaveProperty('slug')
    expect(legacy).not.toHaveProperty('journey')
    expect(legacy.epic).toBe(null)
  })
})

describe('who may say what', () => {
  test('the host says hello, context, response and goto', () => {
    expect(
      hostMessageSchema.safeParse({
        type: MESSAGE.HELLO,
        protocol: 1,
        session: 'abc',
        context: { epic: 'modes-are-modules', project: 'roadmap', theme: 'dark' },
      }).success,
    ).toBe(true)
    expect(hostMessageSchema.safeParse({ type: MESSAGE.CONTEXT, protocol: 1, epic: null }).success).toBe(true)
  })

  test('the module says ready, request, resize and went', () => {
    expect(moduleMessageSchema.safeParse({ type: MESSAGE.READY, id: 'roadmap.checklist' }).success).toBe(true)
    expect(
      moduleMessageSchema.safeParse({ type: MESSAGE.REQUEST, id: 'q1', method: 'live.get', params: { epic: 'x' } })
        .success,
    ).toBe(true)
    expect(moduleMessageSchema.safeParse({ type: MESSAGE.RESIZE, height: 640 }).success).toBe(true)
  })

  test('a module cannot say hello, and a host cannot say ready', () => {
    expect(moduleMessageSchema.safeParse({ type: MESSAGE.HELLO, protocol: 1, session: 'a', context: {} }).success).toBe(
      false,
    )
    expect(hostMessageSchema.safeParse({ type: MESSAGE.READY, id: 'roadmap.checklist' }).success).toBe(false)
  })

  test('the greeting carries no permissions, because there are none to carry', () => {
    const hello = hostMessageSchema.parse({
      type: MESSAGE.HELLO,
      protocol: 1,
      session: 'abc',
      context: {},
      scopes: ['live:read'],
    })
    expect(hello).not.toHaveProperty('scopes')
  })

  test('ready has to name a module id of the right shape', () => {
    expect(moduleMessageSchema.safeParse({ type: MESSAGE.READY, id: 'Not An Id' }).success).toBe(false)
  })
})

describe('the cheap first filter', () => {
  test('separates this protocol from everything else posted at a window', () => {
    expect(looksLikeWireMessage({ type: MESSAGE.READY })).toBe(true)
    expect(looksLikeWireMessage({ type: 'webpackHotUpdate' })).toBe(false)
    expect(looksLikeWireMessage('roadmap.hello')).toBe(false)
    expect(looksLikeWireMessage(null)).toBe(false)
    expect(looksLikeWireMessage(undefined)).toBe(false)
    expect(looksLikeWireMessage({ type: 42 })).toBe(false)
  })
})

describe('height', () => {
  test('a module can neither vanish nor push the page over the horizon', () => {
    expect(clampHeight(2)).toBe(MIN_HEIGHT)
    expect(clampHeight(-1000)).toBe(MIN_HEIGHT)
    expect(clampHeight(1e9)).toBe(MAX_HEIGHT)
    expect(clampHeight(640)).toBe(640)
  })

  test('nonsense is a height too, and it is the smallest one', () => {
    expect(clampHeight(Number.NaN)).toBe(MIN_HEIGHT)
    expect(clampHeight(Number.POSITIVE_INFINITY)).toBe(MIN_HEIGHT)
  })
})
