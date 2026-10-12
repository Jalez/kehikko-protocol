import { describe, expect, test } from 'bun:test'
import {
  CAPABILITIES,
  LIMITS,
  METHODS,
  METHOD_NAMES,
  PARTS_SET_OUTCOMES,
  manifestSchema,
  methodParams,
  partsSetResult,
  requestSchema,
  resultSchemaFor,
} from '../src/index.js'

/**
 * `parts.set`: how a module (or the host's own page) asks for an edit of an epic's list of parts. The
 * host is the list's only writer; this is the request and its answer, and nothing here writes.
 */

const params = methodParams['parts.set']
const epic = 'thesis'

describe('the method', () => {
  test('is listed under its own capability, with a sentence a person reads', () => {
    expect(METHODS['parts.set']).toBe('parts:set')
    expect(METHOD_NAMES).toContain('parts.set')
    expect(CAPABILITIES['parts:set']).toContain('add, rename, move or remove a part')
    expect(resultSchemaFor('parts.set')).toBe(partsSetResult)
  })

  test('a manifest says it will ask, in `uses`', () => {
    const manifest = manifestSchema.parse({
      protocol: 2,
      kind: 'kehikot.module',
      id: 'kehikot.chapters',
      name: 'Chapters',
      version: '1.0.0',
      entry: '/',
      modes: [{ id: 'main', label: 'Chapters' }],
      reacts: ['parts'],
      declares: { uses: ['parts:set'] },
    })
    expect(manifest.declares.uses).toEqual(['parts:set'])
  })

  test('rides in a request like any other method', () => {
    expect(requestSchema.safeParse({ type: 'kehikot.request', id: 'r1', method: 'parts.set', params: { epic, add: { name: 'Methods' } } }).success).toBe(true)
  })
})

describe('the four edits', () => {
  test('add: a name, and where', () => {
    expect(params.parse({ epic, add: { name: '  Methods ' } })).toEqual({ epic, add: { name: 'Methods' } })
    expect(params.parse({ epic, add: { name: 'Methods', after: 'intro' } }).add).toEqual({ name: 'Methods', after: 'intro' })
    /* `null` is first; absent is last. */
    expect(params.parse({ epic, add: { name: 'Methods', after: null } }).add).toEqual({ name: 'Methods', after: null })
  })

  test('rename, move, remove: by id', () => {
    expect(params.safeParse({ epic, rename: { id: 'methods', name: 'How it was done' } }).success).toBe(true)
    expect(params.safeParse({ epic, move: { id: 'methods', after: 'results' } }).success).toBe(true)
    expect(params.safeParse({ epic, move: { id: 'methods', after: null } }).success).toBe(true)
    expect(params.safeParse({ epic, move: { id: 'methods' } }).success).toBe(true)
    expect(params.safeParse({ epic, remove: { id: 'methods' } }).success).toBe(true)
  })

  test('a module never names a new part’s id: the host makes it', () => {
    const parsed = params.parse({ epic, add: { name: 'Methods', id: 'my-own-id' } as { name: string } })
    expect(parsed.add).toEqual({ name: 'Methods' })
  })

  test('exactly one edit per call', () => {
    expect(params.safeParse({ epic }).success).toBe(false)
    expect(params.safeParse({ epic, add: { name: 'A' }, remove: { id: 'b' } }).success).toBe(false)
  })

  test('the epic is named: an edit that is written down says what it is for', () => {
    expect(params.safeParse({ add: { name: 'A' } }).success).toBe(false)
    expect(params.safeParse({ epic: 'Not A Slug', add: { name: 'A' } }).success).toBe(false)
  })

  test('refused, not clipped: a name too long, an empty one, an id that is not one, a part after itself', () => {
    expect(params.safeParse({ epic, add: { name: 'n'.repeat(LIMITS.TITLE + 1) } }).success).toBe(false)
    expect(params.safeParse({ epic, add: { name: '   ' } }).success).toBe(false)
    expect(params.safeParse({ epic, rename: { id: 'Methods', name: 'x' } }).success).toBe(false)
    expect(params.safeParse({ epic, add: { name: 'x', after: '../up' } }).success).toBe(false)
    expect(params.safeParse({ epic, move: { id: 'a', after: 'a' } }).success).toBe(false)
  })
})

describe('the answer', () => {
  test('carries the list as it then stands, and the part the call was about', () => {
    const said = partsSetResult.parse({
      outcome: 'changed',
      id: 'methods',
      parts: [{ id: 'intro', name: 'Introduction' }, { id: 'methods', name: 'Methods' }],
    })
    expect(said).toEqual({
      outcome: 'changed',
      id: 'methods',
      parts: [{ id: 'intro', name: 'Introduction' }, { id: 'methods', name: 'Methods' }],
      why: '',
    })
  })

  test('a refusal is an outcome and a sentence, not an error', () => {
    expect(PARTS_SET_OUTCOMES).toEqual(['changed', 'unchanged', 'declined', 'no-such-part'])
    const declined = partsSetResult.parse({ outcome: 'declined', why: `An epic has at most ${LIMITS.PARTS} parts.` })
    expect(declined).toEqual({ outcome: 'declined', parts: [], id: null, why: `An epic has at most ${LIMITS.PARTS} parts.` })
    expect(partsSetResult.safeParse({ outcome: 'renamed' }).success).toBe(false)
  })

  test('the list in it is held to the list’s own rules', () => {
    expect(partsSetResult.safeParse({ outcome: 'changed', parts: [{ id: 'a', name: 'A' }, { id: 'a', name: 'B' }] }).success).toBe(false)
  })
})
