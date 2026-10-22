import { describe, expect, test } from 'bun:test'

import {
  LIMITS,
  METHODS,
  PACKAGE_VERSION,
  PROTOCOL,
  methodParams,
  resultSchemaFor,
  trackerColumnSchema,
  trackerColumnsResult,
  trackerRowSchema,
  type TrackerColumn,
} from '../src/index.js'

/** 2.6.0: a tracker row says where the item stands on the project's own board, and `tracker.columns` lists the boards. */

const row = {
  ref: 'gh#41',
  tracker: 'github',
  host: 'github.com',
  repo: 'owner/repo',
  number: 41,
  kind: 'issue',
  state: 'open',
  title: 'A thing',
  url: 'https://github.com/owner/repo/issues/41',
  readAt: '2026-10-21T10:00:00Z',
}

const doing: TrackerColumn = { name: 'In progress', board: 'Roadmap', boardUrl: 'https://github.com/users/owner/projects/3' }
const triage: TrackerColumn = { name: 'Triage', board: 'Bugs' }

describe('the version', () => {
  test('is 2.12.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.12.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('row.column', () => {
  test('is optional, and a row without it parses as before', () => {
    const r = trackerRowSchema.parse(row)
    expect(r.column).toBeUndefined()
    expect(r.columns).toBeUndefined()
  })
  test('carries name, board and an optional boardUrl', () => {
    expect(trackerRowSchema.parse({ ...row, column: doing }).column).toEqual(doing)
    expect(trackerColumnSchema.parse(triage)).toEqual(triage)
  })
  test('an item on several boards lists them all in columns, column first', () => {
    const r = trackerRowSchema.parse({ ...row, column: doing, columns: [doing, triage] })
    expect(r.columns?.[0]).toEqual(r.column!)
  })
  test('refuses an empty column or board name', () => {
    expect(trackerColumnSchema.safeParse({ name: '', board: 'Roadmap' }).success).toBe(false)
    expect(trackerColumnSchema.safeParse({ name: 'Done', board: '' }).success).toBe(false)
  })
  test('holds at most TRACKER_BOARDS columns', () => {
    const many = Array.from({ length: LIMITS.TRACKER_BOARDS + 1 }, (_, i) => ({ name: 'Todo', board: `B${i}` }))
    expect(trackerRowSchema.safeParse({ ...row, column: many[0], columns: many }).success).toBe(false)
  })
})

describe('tracker.columns', () => {
  test('is filed under trackers:read and takes no params', () => {
    expect(METHODS['tracker.columns']).toBe('trackers:read')
    expect(methodParams['tracker.columns'].safeParse({}).success).toBe(true)
  })
  test('answers the boards and their columns', () => {
    expect(resultSchemaFor('tracker.columns')).toBe(trackerColumnsResult)
    const answer = trackerColumnsResult.parse({
      boards: [{ board: 'Roadmap', boardUrl: doing.boardUrl, columns: ['Todo', 'In progress', 'Done'] }],
    })
    expect(answer.boards[0]!.columns).toEqual(['Todo', 'In progress', 'Done'])
    expect(trackerColumnsResult.parse({}).boards).toEqual([])
  })
})
