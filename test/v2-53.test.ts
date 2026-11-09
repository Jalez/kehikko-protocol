import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import {
  KEHIKKO_SKILLS_HEAD,
  KEHIKKO_SKILLS_TOOL,
  KEHIKKO_SKILL_LIMITS,
  LIMITS,
  NOT_LOADED,
  NOTES_VERSION,
  PACKAGE_VERSION,
  PROTOCOL,
  SESSION_FIELD_SINCE,
  kehikkoSkillIssue,
  kehikkoSkillMark,
  kehikkoSkillText,
  placeDoorsSchema,
  sessionNotes,
  skillTextIssue,
  type NotesInput,
} from '../src/index.js'

/**
 * 2.53.0: a kehikko's own skills. The person writes them; the host hands each one's SKILL.md in its
 * answer to `POST /host/place`; every agent session on the kehikko loads them, and the notes say them.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')
const TOKEN = 'abcdefghijklmnopqrstuv'

const skill = (name: string, description = `When ${name} applies.`, body = `Do the ${name} thing.`) => ({
  name,
  description,
  text: kehikkoSkillText(name, description, body),
})

const input = (extra: Partial<NotesInput> = {}): NotesInput => ({
  place: { project: '/p/thesis', epic: 'methods', parts: [], kehikko: { key: 'writing', name: 'Writing' } },
  modules: [],
  self: { module: 'kehikot.claude', name: 'Claude', door: 'kehikko-claude' },
  hostDoor: 'kehikko',
  ...extra,
})

describe('the version', () => {
  test('is 2.53.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.54.0')
    expect(PROTOCOL).toBe(2)
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.53.0')
    expect(readFileSync(join(REPO, 'docs/asking.md'), 'utf8')).toContain("**A kehikko's own skills (2.53.0).**")
    expect(SESSION_FIELD_SINCE.kehikkoSkills).toBe('2.53.0')
    expect(NOTES_VERSION).toBeGreaterThanOrEqual(7)
  })
})

describe('a kehikko skill as the person writes it', () => {
  test('makes a SKILL.md with its name and description in the front matter', () => {
    const text = kehikkoSkillText('review-checklist', 'When reviewing: check the list.', 'Line one\r\nLine two\n\n\n')
    expect(text).toBe('---\nname: review-checklist\ndescription: "When reviewing: check the list."\n---\n\nLine one\nLine two\n')
    expect(skillTextIssue(text, 'review-checklist')).toBeNull()
  })

  test('a description cannot break out of the front matter', () => {
    const text = kehikkoSkillText('a', 'one\n---\nname: other', 'x')
    expect(text.split('\n')[2]).toBe('description: "one --- name: other"')
    expect(skillTextIssue(text, 'a')).toBeNull()
  })

  test('is refused with one sentence for each thing wrong', () => {
    expect(kehikkoSkillIssue({ name: 'ok-name', description: 'Use it.', body: 'Do.' })).toBeNull()
    expect(kehikkoSkillIssue({ name: '', description: 'x', body: 'x' })).toContain('needs a name')
    expect(kehikkoSkillIssue({ name: 'Bad Name', description: 'x', body: 'x' })).toContain('lowercase')
    expect(kehikkoSkillIssue({ name: 'a'.repeat(LIMITS.SKILL_NAME + 1), description: 'x', body: 'x' })).toContain(`${LIMITS.SKILL_NAME} characters`)
    expect(kehikkoSkillIssue({ name: 'a', description: '  ', body: 'x' })).toContain('description')
    expect(kehikkoSkillIssue({ name: 'a', description: 'x'.repeat(KEHIKKO_SKILL_LIMITS.DESCRIPTION + 1), body: 'x' })).toContain('at most')
    expect(kehikkoSkillIssue({ name: 'a', description: 'x', body: '   ' })).toContain('some text')
    expect(kehikkoSkillIssue({ name: 'a', description: 'x', body: 'x'.repeat(KEHIKKO_SKILL_LIMITS.BODY + 1) })).toContain('at most')
    expect(kehikkoSkillIssue({ name: 'a', description: 'x', body: 'a\u0000b' })).toContain('NUL')
  })
})

describe('kehikkoSkills in the place answer', () => {
  const answer = (kehikkoSkills: unknown) => placeDoorsSchema.parse({ ok: true, token: TOKEN, doors: [], kehikkoSkills })

  test('absent from an older host', () => {
    expect(placeDoorsSchema.parse({ ok: true, token: TOKEN, doors: [] }).kehikkoSkills).toBeUndefined()
  })

  test('keeps the good ones and leaves out one that does not parse or repeats a name', () => {
    const got = answer([skill('one'), { name: 'two', description: 'x', text: 'no front matter' }, skill('one', 'again'), skill('three')])
    expect(got.kehikkoSkills?.map((one) => one.name)).toEqual(['one', 'three'])
  })

  test('a list that is not a list, or too long, is dropped, not fatal', () => {
    expect(answer('nope').kehikkoSkills).toBeUndefined()
    expect(answer(Array.from({ length: KEHIKKO_SKILL_LIMITS.MOST + 1 }, (_, i) => skill(`s${i}`))).kehikkoSkills).toBeUndefined()
  })
})

describe('the notes', () => {
  test('a start lists the kehikko’s skills with their descriptions', () => {
    const { text, told } = sessionNotes(input({ kehikkoSkills: [skill('review-checklist', 'When reviewing a PR.')] }), 'start', null)
    expect(text).toContain(KEHIKKO_SKILLS_HEAD)
    expect(text).toContain('- review-checklist — "When reviewing a PR."')
    expect(told.kehikkoSkills).toEqual({ 'review-checklist': kehikkoSkillMark(skill('review-checklist', 'When reviewing a PR.').text) })
  })

  test('says nothing about them when the host did not say, or there are none', () => {
    expect(sessionNotes(input(), 'start', null).text).not.toContain(KEHIKKO_SKILLS_HEAD)
    expect(sessionNotes(input({ kehikkoSkills: [] }), 'start', null).text).not.toContain(KEHIKKO_SKILLS_HEAD)
  })

  test('a skill the session does not hold is said apart, with the tool to read it', () => {
    const { text } = sessionNotes(input({ kehikkoSkills: [skill('a'), skill('b')], holds: ['a'] }), 'start', null)
    expect(text).toContain(`${NOT_LOADED} as a skill: b`)
    expect(text).toContain(KEHIKKO_SKILLS_TOOL)
  })

  test('a module that loads no skills has every one said as to be read, whatever holds says', () => {
    const { text } = sessionNotes(input({ kehikkoSkills: [skill('a'), skill('b')], holds: ['a', 'b'], loadsKehikkoSkills: false }), 'start', null)
    expect(text).toContain(`${NOT_LOADED} as skills: a, b`)
  })

  test('a prompt says one added, changed or removed, and nothing when none was', () => {
    const first = sessionNotes(input({ kehikkoSkills: [skill('a'), skill('b')] }), 'start', null)
    expect(sessionNotes(input({ kehikkoSkills: [skill('a'), skill('b')] }), 'prompt', first.told).text).toBeNull()
    const next = sessionNotes(input({ kehikkoSkills: [skill('a', 'When a.', 'New text.'), skill('c')], holds: ['a', 'b'] }), 'prompt', first.told)
    expect(next.kind).toBe('change')
    expect(next.text).toContain('The person added skills to this kehikko')
    expect(next.text).toContain('- c — "When c applies."')
    expect(next.text).toContain(`${NOT_LOADED} as a skill: c`)
    expect(next.text).toContain('The person changed this skill of this kehikko: a.')
    expect(next.text).toContain('The person removed this skill from this kehikko: b')
    expect(sessionNotes(input({ kehikkoSkills: [skill('a', 'When a.', 'New text.'), skill('c')] }), 'prompt', next.told).text).toBeNull()
  })

  test('a record from before 2.53.0 gets the full notes once', () => {
    const told = { ...sessionNotes(input(), 'start', null).told, version: 6 }
    const got = sessionNotes(input({ kehikkoSkills: [skill('a')] }), 'prompt', told)
    expect(got.text).toContain(KEHIKKO_SKILLS_HEAD)
  })
})
