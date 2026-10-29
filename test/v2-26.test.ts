import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'

import {
  LIMITS,
  LINK_RELATIONS,
  PACKAGE_VERSION,
  PROTOCOL,
  SINCE,
  SINCE_FLOOR,
  TRACKER_FIELD_SINCE,
  pieceSaid,
  resultSchemaFor,
  sinceOf,
  trackerReadingResult,
  trackerRowSchema,
} from '../src/index.js'
import { deriveDisposition } from '../src/facets.js'

/**
 * 2.26.0: a change that delivers PART of an issue ("Part of #12") is tied to it in `contributes` and
 * `contributedBy`, never as `closes`, and never makes the issue closed or `closedByMerge`. Separate
 * fields rather than new link words, so that a module built before them reads the rows whole.
 */

const base = {
  tracker: 'gitlab' as const,
  host: 'gitlab.example.org',
  repo: 'group/project',
  title: 't',
  url: 'https://gitlab.example.org/x',
  readAt: '2026-10-26T10:00:00Z',
}
/** !3907 says "Part of #3912"; GitLab's closed_by for #3912 is empty. */
const partial = { ...base, ref: '!3907', number: 3907, kind: 'change' as const, state: 'merged' as const, contributes: ['#3912'] }
const issue = { ...base, ref: '#3912', number: 3912, kind: 'issue' as const, state: 'open' as const, contributedBy: ['!3907'] }

describe('the version', () => {
  test('is 2.26.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.32.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('contributes and contributedBy on a tracker row', () => {
  test('a change that is part of an issue, and the issue that has it', () => {
    const change = trackerRowSchema.parse(partial)
    expect(change.contributes).toEqual(['#3912'])
    expect(change.links).toEqual([])
    const read = trackerRowSchema.parse(issue)
    expect(read.contributedBy).toEqual(['!3907'])
    expect(read.links).toEqual([])
    expect(read.closedByMerge).toBeUndefined()
  })

  test('the link words are still the two, so an older schema reads every link a newer host sends', () => {
    expect([...LINK_RELATIONS]).toEqual(['closes', 'closed-by'])
  })

  test('absent from an older host', () => {
    const row = trackerRowSchema.parse({ ...base, ref: '!1', number: 1, kind: 'change', state: 'open' })
    expect(row.contributes).toBeUndefined()
    expect(row.contributedBy).toBeUndefined()
  })

  test('dropped, not fatal, when it does not parse', () => {
    const row = trackerRowSchema.parse({ ...partial, contributes: ['x'.repeat(LIMITS.REF + 1)] })
    expect(row.contributes).toBeUndefined()
    expect(row.ref).toBe('!3907')
    const many = trackerRowSchema.parse({ ...issue, contributedBy: Array.from({ length: LIMITS.TRACKER_LINKS + 1 }, (_, i) => `!${i + 1}`) })
    expect(many.contributedBy).toBeUndefined()
  })

  test('a contribution that merged leaves the issue open and not done', () => {
    const read = trackerRowSchema.parse(issue)
    expect(deriveDisposition(read)).toBeNull()
    expect(deriveDisposition({ ...read, state: 'closed' })).toBeNull()
  })

  test('tracker.get answers them', () => {
    const schema = resultSchemaFor('tracker.get')!
    const read = schema.parse({ rows: [partial, issue] }) as z.infer<typeof trackerReadingResult>
    expect(read.rows.map((r) => [r.ref, r.contributes, r.contributedBy])).toEqual([
      ['!3907', ['#3912'], undefined],
      ['#3912', undefined, ['!3907']],
    ])
  })
})

describe('an older module reading a newer host', () => {
  /** The row schema as it was in 2.25.0: no `contributes`, no `contributedBy`, the same strict link enum. */
  const olderRow = trackerRowSchema.omit({ contributes: true, contributedBy: true })
  const olderReading = trackerReadingResult.extend({ rows: z.array(olderRow) })

  test('reads every row whole and does not see the new fields', () => {
    const read = olderReading.parse({ rows: [partial, issue] })
    expect(read.rows.map((r) => r.ref)).toEqual(['!3907', '#3912'])
    expect('contributes' in read.rows[0]!).toBe(false)
    expect('contributedBy' in read.rows[1]!).toBe(false)
  })

  test('would have refused the whole answer for a third link word, which is why there is none', () => {
    const third = { ...partial, links: [{ ref: '#3912', relation: 'contributes' }] }
    expect(olderReading.safeParse({ rows: [third, issue] }).success).toBe(false)
  })
})

describe('TRACKER_FIELD_SINCE', () => {
  test('names only fields a row has, and every one the changelog says came after 2.5.0', () => {
    const fields = Object.keys(trackerRowSchema.shape)
    for (const field of Object.keys(TRACKER_FIELD_SINCE)) expect([field, fields.includes(field)]).toEqual([field, true])
  })

  test('every version is one the changelog has, and its section names the field', () => {
    const text = readFileSync(join(import.meta.dir, '..', 'CHANGELOG.md'), 'utf8')
    const sections = new Map<string, string>()
    for (const part of text.split(/^## /m).slice(1)) {
      const version = /^(\d+\.\d+\.\d+)/.exec(part)?.[1]
      if (version) sections.set(version, part)
    }
    for (const [field, version] of Object.entries(TRACKER_FIELD_SINCE)) {
      expect(version === SINCE_FLOOR).toBe(false)
      expect([field, (sections.get(version) ?? '').includes(field)]).toEqual([field, true])
    }
  })

  test('is read by name, in SINCE', () => {
    expect(SINCE.trackerFields).toBe(TRACKER_FIELD_SINCE)
    expect(sinceOf('trackerField', 'contributes')).toBe('2.26.0')
    expect(sinceOf('trackerField', 'contributedBy')).toBe('2.26.0')
    expect(sinceOf('trackerField', 'branches')).toBe('2.19.0')
    expect(sinceOf('trackerField', 'constructor')).toBeNull()
    expect(pieceSaid('trackerField', 'contributes')).toBe('contributes')
  })
})
