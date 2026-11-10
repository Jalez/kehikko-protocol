import { describe, expect, test } from 'bun:test'

import { PACKAGE_VERSION, PROTOCOL, trackerActivitySchema, trackerReviewerSchema, trackerRowSchema } from '../src/index.js'

/** 2.67.0: a reviewer says when they reviewed and last did anything, and their open threads; the latest activity says what it was. */

const row = {
  ref: '!7',
  tracker: 'gitlab',
  host: 'gitlab.example.org',
  repo: 'group/repo',
  number: 7,
  kind: 'change',
  state: 'open',
  title: 'A change',
  url: 'https://gitlab.example.org/group/repo/-/merge_requests/7',
  readAt: '2026-11-10T10:00:00Z',
}

describe('the version', () => {
  test('is 2.67.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.76.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('a reviewer', () => {
  test('without the new fields parses as before', () => {
    const r = trackerReviewerSchema.parse({ login: 'mona', state: 'requested' })
    expect(r).toEqual({ login: 'mona', state: 'requested' })
  })
  test('keeps reviewedAt, activeAt and openThreads', () => {
    const r = trackerReviewerSchema.parse({
      login: 'mona',
      state: 'changes',
      reviewedAt: '2026-11-10T08:00:00Z',
      activeAt: '2026-11-10T09:00:00Z',
      openThreads: 3,
    })
    expect(r.reviewedAt).toBe('2026-11-10T08:00:00Z')
    expect(r.activeAt).toBe('2026-11-10T09:00:00Z')
    expect(r.openThreads).toBe(3)
  })
  test('drops a field that does not parse, and keeps the reviewer', () => {
    const r = trackerReviewerSchema.parse({ login: 'mona', state: 'requested', reviewedAt: 'yesterday', activeAt: 5, openThreads: -1 })
    expect(r).toEqual({ login: 'mona', state: 'requested' })
  })
})

describe('the latest activity', () => {
  test('keeps commits, path, line and verdict', () => {
    expect(trackerActivitySchema.parse({ login: 'ali', at: '2026-11-10T09:00:00Z', kind: 'commit', commits: 2 }).commits).toBe(2)
    const c = trackerActivitySchema.parse({ login: 'mona', at: '2026-11-10T09:00:00Z', kind: 'comment', path: 'src/api.ts', line: 42 })
    expect([c.path, c.line]).toEqual(['src/api.ts', 42])
    expect(trackerActivitySchema.parse({ login: 'jo', at: '2026-11-10T09:00:00Z', kind: 'review', verdict: 'approved' }).verdict).toBe('approved')
  })
  test('drops a field that does not parse, and keeps the activity', () => {
    const a = trackerActivitySchema.parse({ login: 'jo', at: '2026-11-10T09:00:00Z', kind: 'review', verdict: 'lgtm', commits: 0, line: 0, path: '' })
    expect(a).toEqual({ login: 'jo', at: '2026-11-10T09:00:00Z', kind: 'review' })
  })
  test('rides on a row', () => {
    const r = trackerRowSchema.parse({
      ...row,
      reviewers: [{ login: 'mona', state: 'requested', activeAt: '2026-11-10T09:00:00Z' }],
      lastActivity: { login: 'mona', at: '2026-11-10T09:00:00Z', kind: 'comment', path: 'api.ts', line: 42 },
    })
    expect(r.reviewers?.[0]?.activeAt).toBe('2026-11-10T09:00:00Z')
    expect(r.lastActivity?.line).toBe(42)
  })
})
