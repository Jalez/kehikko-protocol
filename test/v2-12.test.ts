import { describe, expect, test } from 'bun:test'

import {
  LIMITS,
  PACKAGE_VERSION,
  PROTOCOL,
  isKehikkoBound,
  manifestSchema,
  missingNeeds,
  moduleSkillSchema,
  skillNeedsSchema,
  type ModuleSkill,
} from '../src/index.js'

/** 2.12.0: a skill may say which other modules must be on its kehikko (`needs`): it is then kehikko-bound. */

const minimal = {
  kind: 'kehikot.module',
  protocol: 2,
  id: 'kehikot.factory',
  name: 'Factory',
  entry: '/app',
  modes: [{ id: 'factory', label: 'Factory' }],
  partless: 'It runs builds, which belong to no part.',
}

const unbound: ModuleSkill = { name: 'factory', summary: 'Drive the factory.', version: '1.0.0' }
const bound: ModuleSkill = { ...unbound, name: 'review-factory', needs: ['kehikot.review'] }

describe('the version', () => {
  test('is 2.18.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.18.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('moduleSkillSchema.needs', () => {
  test('absent stays absent: a skill from before 2.12.0 parses as it did', () => {
    const s = moduleSkillSchema.parse(unbound)
    expect('needs' in s).toBe(false)
  })
  test('a list of module ids parses, in a manifest too', () => {
    expect(moduleSkillSchema.parse(bound).needs).toEqual(['kehikot.review'])
    const m = manifestSchema.parse({ ...minimal, declares: { skills: [unbound, bound] } })
    expect(m.declares.skills?.[1]?.needs).toEqual(['kehikot.review'])
  })
  test('at most LIMITS.SKILL_NEEDS, each once, each a module id', () => {
    expect(LIMITS.SKILL_NEEDS).toBe(8)
    const many = Array.from({ length: 8 }, (_, i) => `kehikot.m${i}`)
    expect(skillNeedsSchema.safeParse(many).success).toBe(true)
    expect(skillNeedsSchema.safeParse([...many, 'kehikot.m8']).success).toBe(false)
    expect(skillNeedsSchema.safeParse(['kehikot.review', 'kehikot.review']).success).toBe(false)
    for (const id of ['Kehikot.Review', 'kehikot/review', '', 'a', null]) {
      expect(moduleSkillSchema.safeParse({ ...unbound, needs: [id] }).success).toBe(false)
    }
  })
})

describe('isKehikkoBound', () => {
  test('is whether the skill needs any module beside its own', () => {
    expect(isKehikkoBound(unbound)).toBe(false)
    expect(isKehikkoBound({ needs: [] })).toBe(false)
    expect(isKehikkoBound(bound)).toBe(true)
  })
})

describe('missingNeeds', () => {
  test('names what a kehikko lacks, in the skill’s order', () => {
    const skill = { needs: ['kehikot.review', 'kehikot.browser'] }
    expect(missingNeeds(skill, ['kehikot.factory'])).toEqual(['kehikot.review', 'kehikot.browser'])
    expect(missingNeeds(skill, new Set(['kehikot.browser', 'kehikot.factory']))).toEqual(['kehikot.review'])
    expect(missingNeeds(skill, ['kehikot.review', 'kehikot.browser'])).toEqual([])
  })
  test('an unbound skill misses nothing anywhere', () => {
    expect(missingNeeds(unbound, [])).toEqual([])
  })
})
