import { describe, expect, test } from 'bun:test'

import {
  LIMITS,
  PACKAGE_VERSION,
  PROTOCOL,
  avatarUrlSchema,
  isHttpsUrl,
  trackerPersonSchema,
  trackerRowSchema,
  type TrackerPerson,
} from '../src/index.js'

/** 2.10.0: a row says who the people it names by login are — a display name and an https: avatar. */

const row = {
  ref: 'gh#42',
  tracker: 'github',
  host: 'github.com',
  repo: 'owner/repo',
  number: 42,
  kind: 'change',
  state: 'open',
  title: 'A change with faces',
  url: 'https://github.com/owner/repo/pull/42',
  readAt: '2026-10-21T10:00:00Z',
  reviewers: [{ login: 'mona', state: 'requested' }],
  assigneeLogins: ['hubot'],
}

const mona: TrackerPerson = { name: 'Mona Lisa', avatarUrl: 'https://avatars.githubusercontent.com/u/1?s=48&v=4' }

describe('the version', () => {
  test('is 2.13.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.13.0')
    expect(PROTOCOL).toBe(2)
  })
  test('LIMITS.ROW_PEOPLE is 64', () => expect(LIMITS.ROW_PEOPLE).toBe(64))
})

describe('a row without people', () => {
  test('parses as before, people absent', () => {
    expect(trackerRowSchema.parse(row).people).toBeUndefined()
  })
})

describe('people', () => {
  test('keeps every entry, keyed by login', () => {
    const people = { mona, hubot: { avatarUrl: 'https://avatars.githubusercontent.com/in/2?s=48' } }
    expect(trackerRowSchema.parse({ ...row, people }).people).toEqual(people)
  })
  test('an entry with only a name is kept', () => {
    expect(trackerPersonSchema.parse({ name: 'Hubot' })).toEqual({ name: 'Hubot' })
  })
  test('an entry saying neither is refused', () => {
    expect(trackerPersonSchema.safeParse({}).success).toBe(false)
  })
  test('an empty login is refused as a key', () => {
    expect(trackerRowSchema.safeParse({ ...row, people: { '': mona } }).success).toBe(false)
  })
  test('more than ROW_PEOPLE entries are refused; ROW_PEOPLE are kept', () => {
    const many = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`p${i}`, { name: `P ${i}` }]))
    expect(trackerRowSchema.safeParse({ ...row, people: many(LIMITS.ROW_PEOPLE) }).success).toBe(true)
    expect(trackerRowSchema.safeParse({ ...row, people: many(LIMITS.ROW_PEOPLE + 1) }).success).toBe(false)
  })
})

describe('an avatar URL', () => {
  test('is https: and absolute', () => {
    expect(avatarUrlSchema.safeParse('https://gitlab.example.org/uploads/-/system/user/avatar/7/a.png').success).toBe(true)
    expect(isHttpsUrl('https://secure.gravatar.com/avatar/abc?s=48')).toBe(true)
  })
  test('refuses http:, data:, javascript:, a relative path and nonsense', () => {
    for (const bad of [
      'http://avatars.githubusercontent.com/u/1',
      'data:image/png;base64,AAAA',
      'javascript:alert(1)',
      '/uploads/-/system/user/avatar/7/a.png',
      '//secure.gravatar.com/avatar/abc',
      'not a url',
    ]) {
      expect(avatarUrlSchema.safeParse(bad).success).toBe(false)
      expect(trackerPersonSchema.safeParse({ avatarUrl: bad }).success).toBe(false)
    }
  })
  test('refuses one longer than LIMITS.URL', () => {
    expect(avatarUrlSchema.safeParse(`https://a.example/${'x'.repeat(LIMITS.URL)}`).success).toBe(false)
  })
})
