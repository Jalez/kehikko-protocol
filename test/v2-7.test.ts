import { describe, expect, test } from 'bun:test'

import {
  LIMITS,
  MY_ROLES,
  PACKAGE_VERSION,
  PROTOCOL,
  REVIEWER_STATES,
  trackerDiscussionsSchema,
  trackerReviewerSchema,
  trackerRowSchema,
  type MyRole,
  type TrackerReviewer,
} from '../src/index.js'

/** 2.7.0: a tracker row names its people by login, says the person's roles on it, its discussions and its last push. */

const row = {
  ref: 'gh#41',
  tracker: 'github',
  host: 'github.com',
  repo: 'owner/repo',
  number: 41,
  kind: 'change',
  state: 'open',
  title: 'A change',
  url: 'https://github.com/owner/repo/pull/41',
  readAt: '2026-10-21T10:00:00Z',
}

const asked: TrackerReviewer = { login: 'mona', name: 'Mona Lisa', state: 'requested' }
const done: TrackerReviewer = { login: 'hubot', state: 'approved' }

describe('the version', () => {
  test('is 2.13.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.13.0')
    expect(PROTOCOL).toBe(2)
  })
  test('LIMITS.REVIEWERS is 32', () => expect(LIMITS.REVIEWERS).toBe(32))
  test('the words are the contract’s', () => {
    expect([...REVIEWER_STATES]).toEqual(['requested', 'approved', 'changes', 'commented'])
    expect([...MY_ROLES]).toEqual(['reviewer-asked', 'reviewer-done', 'author', 'assignee'])
  })
})

describe('a row without people', () => {
  test('parses as before, every new field absent', () => {
    const r = trackerRowSchema.parse(row)
    expect(r.reviewers).toBeUndefined()
    expect(r.authorLogin).toBeUndefined()
    expect(r.assigneeLogins).toBeUndefined()
    expect(r.myRoles).toBeUndefined()
    expect(r.discussions).toBeUndefined()
    expect(r.lastPushAt).toBeUndefined()
  })
})

describe('a row with people', () => {
  const roles: MyRole[] = ['reviewer-asked', 'author']
  const full = {
    ...row,
    reviewers: [asked, done],
    authorLogin: 'octocat',
    assigneeLogins: ['octocat', 'mona'],
    myRoles: roles,
    discussions: { resolved: 3, unresolved: 1 },
    lastPushAt: '2026-10-21T09:12:00Z',
  }
  test('keeps every field', () => {
    const r = trackerRowSchema.parse(full)
    expect(r.reviewers).toEqual([asked, done])
    expect(r.authorLogin).toBe('octocat')
    expect(r.assigneeLogins).toEqual(['octocat', 'mona'])
    expect(r.myRoles).toEqual(roles)
    expect(r.discussions).toEqual({ resolved: 3, unresolved: 1 })
    expect(r.lastPushAt).toBe('2026-10-21T09:12:00Z')
  })
  test('authorLogin null is a fact', () => {
    expect(trackerRowSchema.parse({ ...row, authorLogin: null }).authorLogin).toBeNull()
  })
})

describe('reviewers', () => {
  test('refuses an unknown state or an empty login', () => {
    expect(trackerReviewerSchema.safeParse({ login: 'mona', state: 'dismissed' }).success).toBe(false)
    expect(trackerReviewerSchema.safeParse({ login: '', state: 'requested' }).success).toBe(false)
  })
  test('holds at most REVIEWERS', () => {
    const many = Array.from({ length: LIMITS.REVIEWERS + 1 }, (_, i) => ({ login: `p${i}`, state: 'requested' }))
    expect(trackerRowSchema.safeParse({ ...row, reviewers: many }).success).toBe(false)
    expect(trackerRowSchema.safeParse({ ...row, reviewers: many.slice(1) }).success).toBe(true)
  })
})

describe('myRoles', () => {
  test('refuses an unknown role', () => {
    expect(trackerRowSchema.safeParse({ ...row, myRoles: ['mentioned'] }).success).toBe(false)
  })
  test('refuses a repeated role', () => {
    expect(trackerRowSchema.safeParse({ ...row, myRoles: ['author', 'author'] }).success).toBe(false)
  })
  test('may be empty: I have no role on it', () => {
    expect(trackerRowSchema.parse({ ...row, myRoles: [] }).myRoles).toEqual([])
  })
})

describe('discussions and lastPushAt', () => {
  test('counts are whole and not negative', () => {
    expect(trackerDiscussionsSchema.safeParse({ resolved: -1, unresolved: 0 }).success).toBe(false)
    expect(trackerDiscussionsSchema.safeParse({ resolved: 1.5, unresolved: 0 }).success).toBe(false)
    expect(trackerDiscussionsSchema.parse({ resolved: 0, unresolved: 0 })).toEqual({ resolved: 0, unresolved: 0 })
  })
  test('lastPushAt is an ISO instant', () => {
    expect(trackerRowSchema.safeParse({ ...row, lastPushAt: 'yesterday' }).success).toBe(false)
  })
})
