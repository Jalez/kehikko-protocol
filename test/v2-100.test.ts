import { describe, expect, test } from 'bun:test'

import { PACKAGE_VERSION, PROTOCOL, trackerLinkSchema, trackerRowSchema } from '../src/index.js'

/**
 * 2.101.0: a `closed-by` link says where the closing change stands, so an issue can say "closing in
 * !56" while that change is open. Optional, and dropped rather than fatal, so a module built before
 * it reads a newer host's rows whole.
 */

const at = '2026-11-13T10:00:00.000Z'

const issue = {
  ref: '#12',
  tracker: 'gitlab',
  host: 'gitlab.example.org',
  repo: 'group/project',
  number: 12,
  kind: 'issue',
  state: 'open',
  title: 'An issue',
  url: 'https://gitlab.example.org/group/project/-/issues/12',
  readAt: at,
}

describe('the version', () => {
  test('is 2.101.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.101.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('a closed-by link', () => {
  test('carries the closing change state and draft', () => {
    const link = trackerLinkSchema.parse({ ref: '!56', relation: 'closed-by', state: 'open', draft: true })
    expect(link).toEqual({ ref: '!56', relation: 'closed-by', state: 'open', draft: true })
  })

  test('a link without them still parses, as before', () => {
    expect(trackerLinkSchema.parse({ ref: '!56', relation: 'closed-by' })).toEqual({ ref: '!56', relation: 'closed-by' })
  })

  test('a state it does not know is dropped, not fatal', () => {
    const link = trackerLinkSchema.parse({ ref: '!56', relation: 'closed-by', state: 'someday', draft: 'yes' })
    expect(link.ref).toBe('!56')
    expect(link.state).toBeUndefined()
    expect(link.draft).toBeUndefined()
  })

  test('a row keeps them', () => {
    const row = trackerRowSchema.parse({ ...issue, links: [{ ref: '!56', relation: 'closed-by', state: 'open' }] })
    expect(row.links[0]?.state).toBe('open')
  })
})
