import { describe, expect, test } from 'bun:test'

import {
  PACKAGE_VERSION,
  PROTOCOL,
  WORK_ITEM_TYPES,
  trackerRowSchema,
  type TrackerRow,
  type WorkItemType,
} from '../src/index.js'
import { facetsOf } from '../src/facets.js'

/** 2.11.0: a GitLab row says when an issue is a task, an incident or another work item type. */

const issue = {
  ref: '#12',
  tracker: 'gitlab',
  host: 'gitlab.com',
  repo: 'group/project',
  number: 12,
  kind: 'issue',
  state: 'open',
  title: 'Write the migration',
  url: 'https://gitlab.com/group/project/-/work_items/12',
  readAt: '2026-10-22T10:00:00Z',
}

describe('the version', () => {
  test('is 2.14.1, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.14.1')
    expect(PROTOCOL).toBe(2)
  })
})

describe('WORK_ITEM_TYPES', () => {
  test("is GitLab's IssueType, lower-cased, without ISSUE", () => {
    expect([...WORK_ITEM_TYPES]).toEqual(['task', 'incident', 'test_case', 'requirement', 'objective', 'key_result', 'epic', 'ticket'])
    expect(WORK_ITEM_TYPES).not.toContain('issue' as WorkItemType)
  })
})

describe('trackerRowSchema.workItem', () => {
  test('a task row parses, and stays an issue', () => {
    const row: TrackerRow = trackerRowSchema.parse({ ...issue, workItem: 'task' })
    expect(row.workItem).toBe('task')
    expect(row.kind).toBe('issue')
  })
  test('every listed type parses', () => {
    for (const workItem of WORK_ITEM_TYPES) expect(trackerRowSchema.parse({ ...issue, workItem }).workItem).toBe(workItem)
  })
  test('absent stays absent: a row from before 2.11.0 parses as it did', () => {
    const row = trackerRowSchema.parse(issue)
    expect('workItem' in row).toBe(false)
  })
  test('refused: GitLab spellings, plain issue, null and unknown words', () => {
    for (const workItem of ['TASK', 'Task', 'issue', 'ISSUE', 'key result', 'custom', '', null]) {
      expect(trackerRowSchema.safeParse({ ...issue, workItem }).success).toBe(false)
    }
  })
  test('a task row is still a Sighting with the same facets as an issue', () => {
    const row = trackerRowSchema.parse({ ...issue, workItem: 'task' })
    expect(facetsOf(row)).toEqual(facetsOf(trackerRowSchema.parse(issue)))
  })
})
