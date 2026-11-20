import { describe, expect, test } from 'bun:test'

import { TRACKER_COMMENT_FIELD_SINCE, trackerCommentSchema } from '../src/index.js'

/* 2.109.0. A tracker comment says when an automated account wrote it. */

describe('bot on a tracker comment', () => {
  const comment = { id: '1', at: '2026-11-20T08:00:00.000Z', body: 'Quality Gate passed' }
  test('true or false as the tracker said, absent when it said nothing', () => {
    expect(trackerCommentSchema.parse({ ...comment, bot: true }).bot).toBe(true)
    expect(trackerCommentSchema.parse({ ...comment, bot: false }).bot).toBe(false)
    expect(trackerCommentSchema.parse(comment).bot).toBeUndefined()
  })
  test('a value that is not a boolean is dropped, not fatal', () => {
    expect(trackerCommentSchema.parse({ ...comment, bot: 'yes' }).bot).toBeUndefined()
  })
  test('is listed as added in 2.109.0', () => {
    expect(TRACKER_COMMENT_FIELD_SINCE).toEqual({ bot: '2.109.0' })
  })
})
