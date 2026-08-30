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
  passageSchema,
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

/* --------------------------------------------------------------------- *
 * A passage: where the reader is pointing, at whatever precision
 *
 * The ladder is the whole point of the shape, so it is the whole point of
 * these: three states, each distinguishable from the other two by reading
 * one field, and nothing in between that parses.
 * --------------------------------------------------------------------- */

describe('a passage says where somebody is pointing, and how precisely', () => {
  test('no document open is null, and that is the default a module finds', () => {
    expect(contextSchema.parse({}).passage).toBe(null)
    expect(contextSchema.parse({ passage: null }).passage).toBe(null)
  })

  test('a page open with nothing selected is a passage with no range', () => {
    const context = contextSchema.parse({
      passage: { path: '/w/paper/chapters/bridge.tex', page: 7 },
    })
    expect(context.passage?.path).toBe('/w/paper/chapters/bridge.tex')
    expect(context.passage?.page).toBe(7)
    expect(context.passage?.from).toBe(null)
    expect(context.passage?.to).toBe(null)
    expect(context.passage?.quoted).toBe('')
  })

  test('a selection is the same field with two more numbers in it', () => {
    const context = contextSchema.parse({
      passage: { path: 'chapters/bridge.tex', page: 7, from: 4120, to: 4180, quoted: 'a passage' },
    })
    expect(context.passage?.from).toBe(4120)
    expect(context.passage?.to).toBe(4180)
    expect(context.passage?.quoted).toBe('a passage')
  })

  test('a reader that does not paginate still says which document is open', () => {
    expect(passageSchema.parse({ path: 'notes.md' }).page).toBe(null)
  })

  test('half a range is refused, because the missing end would have to be invented', () => {
    expect(passageSchema.safeParse({ path: 'a.tex', from: 10 }).success).toBe(false)
    expect(passageSchema.safeParse({ path: 'a.tex', to: 10 }).success).toBe(false)
  })

  test('a range that ends where it starts, or before, names nothing', () => {
    expect(passageSchema.safeParse({ path: 'a.tex', from: 10, to: 10 }).success).toBe(false)
    expect(passageSchema.safeParse({ path: 'a.tex', from: 10, to: 9 }).success).toBe(false)
    expect(passageSchema.safeParse({ path: 'a.tex', from: 10, to: 11 }).success).toBe(true)
  })

  test('a document with no name is not a document', () => {
    expect(passageSchema.safeParse({ path: '' }).success).toBe(false)
    expect(passageSchema.safeParse({}).success).toBe(false)
  })

  test('pages count from one, and offsets from zero', () => {
    expect(passageSchema.safeParse({ path: 'a.tex', page: 0 }).success).toBe(false)
    expect(passageSchema.safeParse({ path: 'a.tex', page: 1.5 }).success).toBe(false)
    expect(passageSchema.safeParse({ path: 'a.tex', from: 0, to: 1 }).success).toBe(true)
    expect(passageSchema.safeParse({ path: 'a.tex', from: -1, to: 1 }).success).toBe(false)
  })

  test('a quote is refused rather than clipped, so nobody quotes what was not said', () => {
    const long = 'x'.repeat(LIMITS.QUOTE + 1)
    expect(passageSchema.safeParse({ path: 'a.tex', from: 0, to: 1, quoted: long }).success).toBe(false)
    const fits = 'x'.repeat(LIMITS.QUOTE)
    expect(passageSchema.parse({ path: 'a.tex', from: 0, to: 1, quoted: fits }).quoted).toHaveLength(LIMITS.QUOTE)
  })

  test('a context message carries it like every other field', () => {
    const message = hostMessageSchema.parse({
      type: MESSAGE.CONTEXT,
      protocol: 2,
      epic: 'modes-are-modules',
      passage: { path: 'chapters/wire.tex', page: 3 },
    })
    expect(message.type).toBe(MESSAGE.CONTEXT)
    if (message.type === MESSAGE.CONTEXT) expect(message.passage?.page).toBe(3)
  })

  test('and it arrives in the greeting, so a module has it before its first render', () => {
    const hello = hostMessageSchema.parse({
      type: MESSAGE.HELLO,
      protocol: 2,
      session: 'abc',
      context: { passage: { path: 'chapters/wire.tex', from: 12, to: 40, quoted: 'so' } },
    })
    expect(hello.type).toBe(MESSAGE.HELLO)
    if (hello.type === MESSAGE.HELLO) expect(hello.context.passage?.quoted).toBe('so')
  })
})
