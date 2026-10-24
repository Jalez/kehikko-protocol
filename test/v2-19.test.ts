import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import {
  CONTRIBUTION_RELATIONS,
  LIMITS,
  LINK_RELATIONS,
  PACKAGE_VERSION,
  PROTOCOL,
  RELATION_MIRRORS,
  mirrorRelation,
  trackerReadingResult,
  trackerRowSchema,
  type ContributionRelation,
  type LinkRelation,
} from '../src/index.js'
import { facetsOf } from '../src/facets.js'

/** 2.19.0: a row's `contributions`, the changes that are part of an issue's work without closing it. Also parsed by the 2.18.1 build from the tag. */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')
let dir = ''
let old: Record<string, any> | null = null
beforeAll(async () => {
  try {
    dir = realpathSync(mkdtempSync(join(tmpdir(), 'kehikot-v219-')))
    execFileSync('sh', ['-c', `git -C "${REPO}" archive v2.18.1 | tar -x -C "${dir}"`], { stdio: 'ignore' })
    symlinkSync(join(REPO, 'node_modules'), join(dir, 'node_modules'))
    old = await import(join(dir, 'src/index.ts'))
  } catch {
    console.warn('v2.18.1 is not available here: the 2.18.1 compatibility checks are skipped')
  }
})
afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
})

const issue = {
  ref: 'gh#3400',
  tracker: 'github',
  host: 'github.com',
  repo: 'Jalez/kollekti',
  number: 3400,
  kind: 'issue',
  state: 'open',
  title: 'Promote what landed',
  url: 'https://github.com/Jalez/kollekti/issues/3400',
  readAt: '2026-10-24T10:00:00Z',
}
const change = { ...issue, ref: 'gh#3459', number: 3459, kind: 'change', state: 'merged', url: 'https://github.com/Jalez/kollekti/pull/3459' }

describe('the version', () => {
  test('is 2.19.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.19.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('the relations', () => {
  test('contributions are their own pair, beside the links', () => {
    expect([...CONTRIBUTION_RELATIONS]).toEqual(['contributes-to', 'contributed-by'])
    expect([...LINK_RELATIONS]).toEqual(['closes', 'closed-by'])
  })
  test('every relation has a mirror, and the mirror of the mirror is itself', () => {
    const all: Array<LinkRelation | ContributionRelation> = [...LINK_RELATIONS, ...CONTRIBUTION_RELATIONS]
    expect(Object.keys(RELATION_MIRRORS).sort()).toEqual([...all].sort())
    for (const one of all) expect(mirrorRelation(mirrorRelation(one))).toBe(one)
    expect(mirrorRelation('closes')).toBe('closed-by')
    expect(mirrorRelation('contributes-to')).toBe('contributed-by')
    expect(mirrorRelation('contributed-by')).toBe('contributes-to')
  })
  test('a mirror stays within its kind: a contribution never mirrors into a link', () => {
    for (const one of CONTRIBUTION_RELATIONS) expect(CONTRIBUTION_RELATIONS).toContain(mirrorRelation(one))
    for (const one of LINK_RELATIONS) expect(LINK_RELATIONS).toContain(mirrorRelation(one))
  })
})

describe('trackerRowSchema.contributions', () => {
  test('an issue carries contributed-by, a change contributes-to', () => {
    const a = trackerRowSchema.parse({ ...issue, contributions: [{ ref: 'gh#3459', relation: 'contributed-by' }] })
    expect(a.contributions).toEqual([{ ref: 'gh#3459', relation: 'contributed-by' }])
    const b = trackerRowSchema.parse({ ...change, contributions: [{ ref: 'gh:Jalez/kollekti#3400', relation: 'contributes-to' }] })
    expect(b.contributions).toEqual([{ ref: 'gh:Jalez/kollekti#3400', relation: 'contributes-to' }])
  })
  test('absent stays absent and empty stays empty: not read is not none', () => {
    expect('contributions' in trackerRowSchema.parse(issue)).toBe(false)
    expect(trackerRowSchema.parse({ ...issue, contributions: [] }).contributions).toEqual([])
  })
  test('refused: a link relation, an unknown word, a bad ref, more than TRACKER_LINKS', () => {
    for (const relation of ['closes', 'closed-by', 'mentions', 'part-of', '']) {
      expect(trackerRowSchema.safeParse({ ...issue, contributions: [{ ref: 'gh#1', relation }] }).success).toBe(false)
    }
    expect(trackerRowSchema.safeParse({ ...issue, contributions: [{ ref: 'not a ref at all', relation: 'contributed-by' }] }).success).toBe(false)
    const many = Array.from({ length: LIMITS.TRACKER_LINKS + 1 }, (_, i) => ({ ref: `gh#${i + 1}`, relation: 'contributed-by' }))
    expect(trackerRowSchema.safeParse({ ...issue, contributions: many }).success).toBe(false)
  })
  test('a contribution in links is refused, which is why it is a field of its own', () => {
    expect(trackerRowSchema.safeParse({ ...issue, links: [{ ref: 'gh#3459', relation: 'contributed-by' }] }).success).toBe(false)
  })
  test('the facets do not move', () => {
    expect(facetsOf(trackerRowSchema.parse({ ...issue, contributions: [{ ref: 'gh#3459', relation: 'contributed-by' }] }))).toEqual(
      facetsOf(trackerRowSchema.parse(issue)),
    )
  })
})

describe('a 2.18.1 module reads a 2.19.0 reading', () => {
  test('the row parses, contributions stripped, links kept', () => {
    if (!old) return
    const row = { ...issue, links: [{ ref: 'gh#3500', relation: 'closed-by' }], contributions: [{ ref: 'gh#3459', relation: 'contributed-by' }] }
    const parsed = old.trackerRowSchema.parse(row)
    expect('contributions' in parsed).toBe(false)
    expect(parsed.links).toEqual([{ ref: 'gh#3500', relation: 'closed-by' }])
    const reading = trackerReadingResult.parse({ rows: [row], missing: [], sources: [], at: null })
    expect(old.trackerReadingResult.safeParse(reading).success).toBe(true)
  })
  test('where a third link relation would have cost it the whole reading', () => {
    if (!old) return
    const reading = { rows: [{ ...issue, links: [{ ref: 'gh#3459', relation: 'contributed-by' }] }], missing: [], sources: [], at: null }
    expect(old.trackerReadingResult.safeParse(reading).success).toBe(false)
  })
})
