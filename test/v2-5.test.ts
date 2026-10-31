import { describe, expect, test } from 'bun:test'

import {
  LIMITS,
  PACKAGE_VERSION,
  PROTOCOL,
  SKILLS_PATH,
  isSkillName,
  manifestSchema,
  moduleSkillSchema,
  skillPath,
  skillTextBytes,
  skillTextIssue,
  type ModuleSkill,
} from '../src/index.js'

/** 2.5.0: a module can offer Claude Code skills, listed in `declares.skills`, served at `skillPath(name)`. */

const minimal = {
  kind: 'kehikot.module',
  protocol: 2,
  id: 'kehikot.claude',
  name: 'Claude',
  entry: '/app',
  modes: [{ id: 'claude', label: 'Claude' }],
  partless: 'It runs sessions, which belong to no part.',
}

const skill: ModuleSkill = { name: 'kehikot-place', summary: 'Answer from the place a session was started.', version: '1.0.0' }

const text = (name = skill.name, body = 'Do the thing.') => `---\nname: ${name}\ndescription: A skill.\n---\n\n${body}\n`

describe('the version', () => {
  test('is 2.18.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.43.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('declares.skills', () => {
  test('is optional, and an older manifest is unaffected', () => {
    const m = manifestSchema.parse(minimal)
    expect(m.declares.skills).toBeUndefined()
  })
  test('carries name, summary and version', () => {
    const m = manifestSchema.parse({ ...minimal, declares: { skills: [skill] } })
    expect(m.declares.skills).toEqual([skill])
    expect(m.declares.uses).toEqual([])
  })
  test('holds at most 16, with no two sharing a name', () => {
    expect(LIMITS.SKILLS).toBe(16)
    const many = Array.from({ length: 16 }, (_, i) => ({ ...skill, name: `s-${i}` }))
    expect(manifestSchema.safeParse({ ...minimal, declares: { skills: many } }).success).toBe(true)
    expect(manifestSchema.safeParse({ ...minimal, declares: { skills: [...many, { ...skill, name: 's-16' }] } }).success).toBe(false)
    expect(manifestSchema.safeParse({ ...minimal, declares: { skills: [skill, skill] } }).success).toBe(false)
  })
  test('a name is kebab-case and at most 40 characters', () => {
    for (const name of ['a', 'review-pr', 'thesis-2', 'a'.repeat(40)]) {
      expect(moduleSkillSchema.safeParse({ ...skill, name }).success).toBe(true)
    }
    for (const name of ['', 'A', 'Review', '-a', 'a-', 'a--b', '2a', 'a_b', 'a.b', 'a/b', '../a', 'a b', 'a'.repeat(41)]) {
      expect(moduleSkillSchema.safeParse({ ...skill, name }).success).toBe(false)
    }
  })
  test('a summary is at most 200 characters and a version 1 to 64', () => {
    expect(moduleSkillSchema.safeParse({ ...skill, summary: 'x'.repeat(200) }).success).toBe(true)
    expect(moduleSkillSchema.safeParse({ ...skill, summary: 'x'.repeat(201) }).success).toBe(false)
    expect(moduleSkillSchema.safeParse({ ...skill, version: 'v'.repeat(64) }).success).toBe(true)
    expect(moduleSkillSchema.safeParse({ ...skill, version: 'v'.repeat(65) }).success).toBe(false)
    expect(moduleSkillSchema.safeParse({ ...skill, version: '' }).success).toBe(false)
  })
})

describe('skillPath', () => {
  test('is /kehikot/skills/<name>.md', () => {
    expect(SKILLS_PATH).toBe('/kehikot/skills/')
    expect(skillPath('review-pr')).toBe('/kehikot/skills/review-pr.md')
  })
  test('refuses what is not a name', () => {
    expect(() => skillPath('../etc')).toThrow()
    expect(() => skillPath('a'.repeat(41))).toThrow()
    expect(isSkillName('review-pr')).toBe(true)
    expect(isSkillName(7)).toBe(false)
  })
})

describe('skillTextIssue', () => {
  test('a SKILL.md with front matter is fine', () => {
    expect(skillTextIssue(text(), skill.name)).toBeNull()
    expect(skillTextIssue(`---\ndescription: no name\n---\nbody`, skill.name)).toBeNull()
    expect(skillTextIssue(`---\nname: "${skill.name}"\n---\n`, skill.name)).toBeNull()
  })
  test('refuses no front matter, an unclosed one, another name, NUL or not text', () => {
    expect(skillTextIssue('# Just markdown', skill.name)).toMatch(/front matter/)
    expect(skillTextIssue('---\nname: x\n', skill.name)).toMatch(/not closed/)
    expect(skillTextIssue(text('other'), skill.name)).toMatch(/names it "other"/)
    expect(skillTextIssue(text(skill.name, 'a\u0000b'), skill.name)).toMatch(/NUL/)
    expect(skillTextIssue(42, skill.name)).toMatch(/not text/)
  })
  test('counts the 64 KB cap in bytes of UTF-8', () => {
    expect(LIMITS.SKILL_TEXT).toBe(64 * 1024)
    const head = text(skill.name, '')
    const fill = LIMITS.SKILL_TEXT - skillTextBytes(head)
    expect(skillTextIssue(head + 'x'.repeat(fill), skill.name)).toBeNull()
    expect(skillTextIssue(head + 'x'.repeat(fill + 1), skill.name)).toMatch(/64 KB/)
    expect(skillTextBytes('ä')).toBe(2)
  })
})
