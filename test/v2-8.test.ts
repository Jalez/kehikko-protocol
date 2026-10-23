import { describe, expect, test } from 'bun:test'

import {
  LAST_ACTIVITY_KINDS,
  LIMITS,
  PACKAGE_VERSION,
  PROTOCOL,
  trackerActivitySchema,
  trackerRowSchema,
  trackerStackSchema,
  type TrackerActivity,
} from '../src/index.js'

/** 2.8.0: a change's row names its branches and where it sits in a stack; any row says its latest activity. */

const row = {
  ref: 'gh#42',
  tracker: 'github',
  host: 'github.com',
  repo: 'owner/repo',
  number: 42,
  kind: 'change',
  state: 'open',
  title: 'A change on a change',
  url: 'https://github.com/owner/repo/pull/42',
  readAt: '2026-10-21T10:00:00Z',
}

describe('the version', () => {
  test('is 2.18.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.18.0')
    expect(PROTOCOL).toBe(2)
  })
  test('LIMITS.BRANCH is 255', () => expect(LIMITS.BRANCH).toBe(255))
  test('the words are the contract’s', () => {
    expect([...LAST_ACTIVITY_KINDS]).toEqual(['comment', 'review', 'commit', 'state'])
  })
})

describe('a row without them', () => {
  test('parses as before, every new field absent', () => {
    const r = trackerRowSchema.parse(row)
    expect(r.baseBranch).toBeUndefined()
    expect(r.headBranch).toBeUndefined()
    expect(r.stack).toBeUndefined()
    expect(r.lastActivity).toBeUndefined()
  })
})

describe('branches and a stack', () => {
  const stacked = {
    ...row,
    baseBranch: 'feat/one',
    headBranch: 'feat/two',
    stack: { below: 'gh#41', above: ['gh#43'] },
  }
  test('keeps every field', () => {
    const r = trackerRowSchema.parse(stacked)
    expect(r.baseBranch).toBe('feat/one')
    expect(r.headBranch).toBe('feat/two')
    expect(r.stack).toEqual({ below: 'gh#41', above: ['gh#43'] })
  })
  test('the bottom of a stack has only changes above', () => {
    expect(trackerStackSchema.parse({ above: ['gh#42'] })).toEqual({ above: ['gh#42'] })
  })
  test('the top of a stack has only a change below, and above defaults to none', () => {
    expect(trackerStackSchema.parse({ below: 'gh#41' })).toEqual({ below: 'gh#41', above: [] })
  })
  test('a link naming neither is refused', () => {
    expect(trackerStackSchema.safeParse({}).success).toBe(false)
    expect(trackerStackSchema.safeParse({ above: [] }).success).toBe(false)
  })
  test('a branch is not empty and not longer than BRANCH', () => {
    expect(trackerRowSchema.safeParse({ ...row, baseBranch: '' }).success).toBe(false)
    expect(trackerRowSchema.safeParse({ ...row, headBranch: 'b'.repeat(LIMITS.BRANCH + 1) }).success).toBe(false)
  })
})

describe('lastActivity', () => {
  const other: TrackerActivity = { login: 'mona', at: '2026-10-21T09:00:00Z', kind: 'review', mine: false }
  test('keeps every field', () => {
    expect(trackerRowSchema.parse({ ...row, lastActivity: other }).lastActivity).toEqual(other)
  })
  test('mine is absent when the host does not know who the person is', () => {
    const r = trackerActivitySchema.parse({ login: 'mona', at: '2026-10-21T09:00:00Z', kind: 'comment' })
    expect(r.mine).toBeUndefined()
  })
  test('refuses an unknown kind, an empty login or a time that is not an instant', () => {
    expect(trackerActivitySchema.safeParse({ ...other, kind: 'mention' }).success).toBe(false)
    expect(trackerActivitySchema.safeParse({ ...other, login: '' }).success).toBe(false)
    expect(trackerActivitySchema.safeParse({ ...other, at: 'yesterday' }).success).toBe(false)
  })
})
