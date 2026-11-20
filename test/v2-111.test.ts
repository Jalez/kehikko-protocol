import { describe, expect, test } from 'bun:test'

import { TRACKER_ACTIVITY_FIELD_SINCE, trackerActivitySchema } from '../src/index.js'

/* 2.111.0. A tracker row's latest activity says when an automated account did it. */

describe('bot on a tracker activity', () => {
  const activity = { login: 'sonarcloud', at: '2026-11-20T08:00:00.000Z', kind: 'comment' as const }
  test('true or false as the tracker said, absent when it said nothing', () => {
    expect(trackerActivitySchema.parse({ ...activity, bot: true }).bot).toBe(true)
    expect(trackerActivitySchema.parse({ ...activity, bot: false }).bot).toBe(false)
    const without = trackerActivitySchema.parse(activity)
    expect(without.bot).toBeUndefined()
    expect(without.login).toBe('sonarcloud')
  })
  test('a value that is not a boolean is dropped, not fatal', () => {
    expect(trackerActivitySchema.parse({ ...activity, bot: 'yes' }).bot).toBeUndefined()
    expect(trackerActivitySchema.parse({ ...activity, bot: 1 }).bot).toBeUndefined()
  })
  test('is listed as added in 2.111.0', () => {
    expect(TRACKER_ACTIVITY_FIELD_SINCE).toEqual({ bot: '2.111.0' })
  })
})
