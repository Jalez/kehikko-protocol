import { describe, expect, test } from 'bun:test'

import {
  COMMENT_KINDS,
  LIMITS,
  PACKAGE_VERSION,
  PROTOCOL,
  TRACKER_DETAIL_FIELD_SINCE,
  trackerCommentSchema,
  trackerDetailSchema,
  trackerReadingResult,
  trackerRowSchema,
} from '../src/index.js'

/**
 * 2.98.0: a ref's detail carries what a person reads an item for — its milestone, its newest
 * comments and how many there are in all, a change's checks one by one, and where a change from a
 * fork comes from. All optional, and dropped rather than fatal when they do not parse, so a module
 * built before them reads the rows whole and a module built on them reads an older host's rows.
 */

const at = '2026-11-13T10:00:00.000Z'

const change = {
  ref: '!12',
  tracker: 'gitlab',
  host: 'gitlab.example.org',
  repo: 'group/project',
  number: 12,
  kind: 'change',
  state: 'open',
  title: 'Read the item',
  url: 'https://gitlab.example.org/group/project/-/merge_requests/12',
  readAt: at,
}

describe('the version', () => {
  test('is 2.98.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.98.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe("a ref's detail", () => {
  test('carries the milestone, comments, count, checks and fork', () => {
    const detail = trackerDetailSchema.parse({
      body: 'What it does.',
      readAt: at,
      milestone: { title: 'v1', url: 'https://gitlab.example.org/group/project/-/milestones/1', dueOn: '2026-12-01' },
      comments: [
        { id: '1', login: 'ada', name: 'Ada', at, body: 'Looks right.' },
        { id: '2', kind: 'review', login: 'bob', at, body: 'Approved with one nit.', verdict: 'approved' },
        { id: '3', kind: 'line', login: 'cy', at, body: 'Why here?', path: 'src/a.ts' },
      ],
      commentCount: 7,
      checks: [
        { name: 'test', state: 'success', stage: 'test', url: 'https://gitlab.example.org/group/project/-/jobs/9', at },
        { name: 'lint', state: 'failed' },
      ],
      checksClipped: false,
      fork: { repo: 'someone/project', branch: 'fix-it' },
    })
    expect(detail.comments?.map((c) => c.kind)).toEqual(['comment', 'review', 'line'])
    expect(detail.commentCount).toBe(7)
    expect(detail.checks?.[1]).toEqual({ name: 'lint', state: 'failed' })
    expect(detail.fork?.branch).toBe('fix-it')
    expect(detail.milestone?.dueOn).toBe('2026-12-01')
  })

  test('from an older host has none of them, which says nothing about whether there are any', () => {
    const detail = trackerDetailSchema.parse({ body: '', readAt: at })
    for (const field of Object.keys(TRACKER_DETAIL_FIELD_SINCE)) expect(detail).not.toHaveProperty(field)
  })

  test('drops a field that does not parse and keeps the row', () => {
    const row = trackerRowSchema.parse({
      ...change,
      detail: {
        body: 'Still read.',
        readAt: at,
        comments: [{ id: '', at: 'yesterday' }],
        checks: [{ name: 'x', state: 'green' }],
        milestone: { title: '' },
        commentCount: -1,
        fork: { repo: '' },
      },
    })
    expect(row.detail?.body).toBe('Still read.')
    expect(row.detail?.comments).toBeUndefined()
    expect(row.detail?.checks).toBeUndefined()
    expect(row.detail?.milestone).toBeUndefined()
    expect(row.detail?.commentCount).toBeUndefined()
    expect(row.detail?.fork).toBeUndefined()
    expect(trackerReadingResult.parse({ rows: [row] }).rows).toHaveLength(1)
  })

  test('is bounded: comments, a comment, checks', () => {
    const many = Array.from({ length: LIMITS.TRACKER_COMMENTS + 1 }, (_, i) => ({ id: String(i), at, body: 'x' }))
    expect(trackerDetailSchema.parse({ readAt: at, comments: many }).comments).toBeUndefined()
    expect(trackerCommentSchema.safeParse({ id: '1', at, body: 'x'.repeat(LIMITS.TRACKER_COMMENT + 1) }).success).toBe(false)
    const checks = Array.from({ length: LIMITS.TRACKER_CHECKS + 1 }, (_, i) => ({ name: `c${i}`, state: 'success' }))
    expect(trackerDetailSchema.parse({ readAt: at, checks }).checks).toBeUndefined()
  })

  test('a comment is a comment unless it says otherwise, and its kinds are three', () => {
    expect(COMMENT_KINDS).toEqual(['comment', 'review', 'line'])
    expect(trackerCommentSchema.parse({ id: '1', at }).kind).toBe('comment')
  })

  test('every new field is dated 2.98.0', () => {
    expect(new Set(Object.values(TRACKER_DETAIL_FIELD_SINCE))).toEqual(new Set(['2.98.0']))
  })
})
