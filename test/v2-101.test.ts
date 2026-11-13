import { describe, expect, test } from 'bun:test'

import {
  LIMITS,
  METHODS,
  PACKAGE_VERSION,
  TRACKER_IMAGE_REFUSALS,
  TRACKER_IMAGE_TYPES,
  methodParams,
  resultSchemaFor,
  trackerDetailSchema,
  trackerImageResult,
} from '../src/index.js'

describe('2.101.0', () => {
  test('is the package version', () => {
    expect(PACKAGE_VERSION).toBe('2.101.0')
  })

  test('tracker.image is held to trackers:read and takes a ref and an address', () => {
    expect(METHODS['tracker.image']).toBe('trackers:read')
    expect(methodParams['tracker.image'].safeParse({ ref: 'gh#5', url: 'https://github.com/o/r/assets/1.png' }).success).toBe(true)
    expect(methodParams['tracker.image'].safeParse({ url: 'https://x.test/a.png' }).success).toBe(false)
    expect(methodParams['tracker.image'].safeParse({ ref: 'gh#5', url: 'not a url' }).success).toBe(false)
  })

  test('its answer is an image of an allowed type or a declined reason', () => {
    const schema = resultSchemaFor('tracker.image')!
    expect(schema).toBe(trackerImageResult)
    expect(schema.safeParse({ outcome: 'image', mime: 'image/png', base64: 'AAAA' }).success).toBe(true)
    expect(schema.safeParse({ outcome: 'image', mime: 'image/svg+xml', base64: 'AAAA' }).success).toBe(false)
    for (const why of TRACKER_IMAGE_REFUSALS) expect(schema.safeParse({ outcome: 'declined', why }).success).toBe(true)
    expect(schema.safeParse({ outcome: 'declined', why: 'nope' }).success).toBe(false)
    expect(TRACKER_IMAGE_TYPES).not.toContain('image/svg+xml' as never)
    expect(LIMITS.TRACKER_IMAGE_BYTES).toBe(10 * 1024 * 1024)
  })

  test('a change detail carries its approvals, dropped when they do not parse', () => {
    const base = { body: '', readAt: '2026-11-13T12:00:00.000Z' }
    expect(trackerDetailSchema.parse({ ...base, approvals: { given: 1, required: 2 } }).approvals).toEqual({ given: 1, required: 2 })
    expect(trackerDetailSchema.parse({ ...base, approvals: { given: -1, required: 0 } }).approvals).toBeUndefined()
    expect(trackerDetailSchema.parse(base).approvals).toBeUndefined()
  })
})
