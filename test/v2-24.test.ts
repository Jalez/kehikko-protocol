import { describe, expect, test } from 'bun:test'

import {
  PACKAGE_VERSION,
  PROTOCOL,
  resultSchemaFor,
  trafficAccountSchema,
  trafficAllowanceSchema,
  trafficLimitsSchema,
  trafficReadResult,
} from '../src/index.js'

/**
 * 2.24.0: each forge's budgets, separately, on `traffic.read` (`limits`): the person's signed-in
 * GitHub account with Kehikot's share of it, the anonymous budget, and a GitLab account.
 */

const base = { calls: [], newest: 0, oldest: 0, kept: 5000, started: 1 }
const anonymous = { name: 'GitHub API without an account', used: 3, limit: 30, left: 27, resets: 2, note: '' }
const core = { limit: 5000, used: 188, remaining: 4812, resets: 1_793_012_281_000, share: { limit: 1000, used: 312 }, floor: 500 }

describe('the version', () => {
  test('is 2.24.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.37.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('limits on traffic.read', () => {
  test('carries the account, its share and floor, and the anonymous budget apart', () => {
    const read = trafficReadResult.parse({
      ...base,
      budgets: [anonymous],
      limits: {
        github: {
          account: { login: 'Jalez', core, graphql: { ...core, used: 40, remaining: 4960, share: { limit: 1000, used: 25 } }, at: 9 },
          anonymous,
        },
      },
    })
    expect(read.limits?.github?.account?.login).toBe('Jalez')
    expect(read.limits?.github?.account?.core).toEqual(core)
    expect(read.limits?.github?.account?.graphql?.share).toEqual({ limit: 1000, used: 25 })
    expect(read.limits?.github?.account?.paused).toBe(false)
    expect(read.limits?.github?.account?.why).toBe('')
    expect(read.limits?.github?.anonymous).toEqual(anonymous)
    expect(read.limits?.gitlab).toBeUndefined()
    /* The old field is still there for an older reader. */
    expect(read.budgets).toEqual([anonymous])
    expect(resultSchemaFor('traffic.read')).toBe(trafficReadResult)
  })

  test('a paused account says why and until when', () => {
    const account = trafficAccountSchema.parse({ login: 'Jalez', core, paused: true, why: 'held: Kehikot’s share of your GitHub limit is used until 11:00', until: 5 })
    expect(account).toMatchObject({ paused: true, until: 5, graphql: null, at: null })
    expect(account.why).toContain('held')
  })

  test('an account knows only what it was told: everything else is null', () => {
    expect(trafficAccountSchema.parse({})).toEqual({ login: null, core: null, graphql: null, paused: false, why: '', until: null, at: null })
    expect(trafficAllowanceSchema.parse({ limit: 5000, used: 0, remaining: 5000, resets: null })).toEqual({ limit: 5000, used: 0, remaining: 5000, resets: null, share: null, floor: null })
  })

  test('a GitLab account, and a signed-out GitHub with only its anonymous budget', () => {
    const limits = trafficLimitsSchema.parse({ github: { account: null, anonymous }, gitlab: { account: { login: 'me', core: { limit: 2000, used: 1, remaining: 1999, resets: null } } } })
    expect(limits.github?.account).toBeNull()
    expect(limits.gitlab?.account?.core?.share).toBeNull()
    expect(limits.gitlab?.account?.graphql).toBeNull()
  })

  test('is optional: an older host’s answer parses without it', () => {
    const read = trafficReadResult.parse({ ...base, budgets: [anonymous] })
    expect(read.limits).toBeUndefined()
    expect(read).toEqual({ ...base, gap: false, budgets: [anonymous], processes: null })
  })

  test('one that does not parse is dropped, not fatal', () => {
    const read = trafficReadResult.safeParse({ ...base, limits: { github: { account: { core: { limit: -1 } } } } })
    expect(read.success).toBe(true)
    expect(read.success && read.data.limits).toBeUndefined()
    expect(trafficAllowanceSchema.safeParse({ limit: 1, used: 1, remaining: -1, resets: null }).success).toBe(false)
  })
})
