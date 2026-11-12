import { describe, expect, test } from 'bun:test'

import {
  AGENT_SETUP,
  AGENT_SETUP_KEYS,
  SERVICE_NAMES,
  agentSetupChoice,
  agentSetupSchema,
  agentSetupSettings,
  agentSetupValues,
  servicesSchema,
  settingsDeclarationSchema,
  settingsValues,
} from '../src/index.js'

describe('agent.setup (2.91.0)', () => {
  test('a known service, its descriptor checked', () => {
    expect(SERVICE_NAMES).toContain(AGENT_SETUP)
    const ok = { name: 'Agent', program: 'Agent CLI', cli: 'agent' }
    expect(agentSetupSchema.safeParse(ok).success).toBe(true)
    expect(servicesSchema.safeParse({ [AGENT_SETUP]: ok }).success).toBe(true)
    for (const cli of ['Agent', 'two words', '../bin', '', 'a'.repeat(33)]) {
      expect(agentSetupSchema.safeParse({ ...ok, cli }).success).toBe(false)
    }
    expect(servicesSchema.safeParse({ [AGENT_SETUP]: { name: 'Agent' } }).success).toBe(false)
  })

  test('the four settings: machine, the person’s, off by default, worded for the program', () => {
    const fields = agentSetupSettings('Agent CLI')
    expect(settingsDeclarationSchema.safeParse(fields).success).toBe(true)
    expect(fields.map((one) => one.key)).toEqual([AGENT_SETUP_KEYS.tools, AGENT_SETUP_KEYS.toolsExcept, AGENT_SETUP_KEYS.skills, AGENT_SETUP_KEYS.skillsExcept])
    for (const field of fields) {
      expect(field.scope).toBe('machine')
      expect(field.personOnly).toBe(true)
    }
    expect(fields[0]!.label).toContain('Agent CLI')
    expect(fields[2]!.label).toContain('Agent CLI')
    expect(agentSetupChoice(settingsValues(fields, {}))).toEqual({ tools: { auto: false, except: [] }, skills: { auto: false, except: [] } })
  })

  test('the choice read leniently, and carried over by its values', () => {
    expect(agentSetupChoice(null)).toEqual({ tools: { auto: false, except: [] }, skills: { auto: false, except: [] } })
    expect(agentSetupChoice({ [AGENT_SETUP_KEYS.tools]: 'yes', [AGENT_SETUP_KEYS.toolsExcept]: 'kehikot.a' }).tools).toEqual({ auto: false, except: [] })
    const choice = { tools: { auto: true, except: ['kehikot.b', ' kehikot.a ', 'kehikot.b', ''] }, skills: { auto: false, except: ['kehikot.c'] } }
    const values = agentSetupValues(choice)
    expect(values).toEqual({
      [AGENT_SETUP_KEYS.tools]: true,
      [AGENT_SETUP_KEYS.toolsExcept]: ['kehikot.a', 'kehikot.b'],
      [AGENT_SETUP_KEYS.skills]: false,
      [AGENT_SETUP_KEYS.skillsExcept]: ['kehikot.c'],
    })
    expect(agentSetupChoice(values)).toEqual({ tools: { auto: true, except: ['kehikot.a', 'kehikot.b'] }, skills: { auto: false, except: ['kehikot.c'] } })
  })
})

describe('the adoption names the agents a page may offer (2.91.0)', () => {
  test('agents is optional, and read when given', async () => {
    const { inboxAdoptionResult } = await import('../src/index.js')
    const base = { outcome: 'ok', why: '', item: null, epics: [], suggested: null, conversations: [], agent: null, proposal: null }
    expect(inboxAdoptionResult.parse(base).taskAgents).toBeUndefined()
    expect(inboxAdoptionResult.parse({ ...base, taskAgents: [{ module: 'kehikot.a', name: 'A' }, { module: 'kehikot.b', name: 'B' }] }).taskAgents).toHaveLength(2)
    expect(inboxAdoptionResult.safeParse({ ...base, taskAgents: [{ module: '', name: 'A' }] }).success).toBe(false)
  })
})

describe('the adoption names agent modules to update (2.91.0)', () => {
  test('agentsToUpdate is optional, and read when given', async () => {
    const { inboxAdoptionResult } = await import('../src/index.js')
    const base = { outcome: 'ok', why: '', item: null, epics: [], suggested: null, conversations: [], agent: null, proposal: null }
    expect(inboxAdoptionResult.parse(base).agentsToUpdate).toBeUndefined()
    expect(inboxAdoptionResult.parse({ ...base, taskAgents: [], agentsToUpdate: [{ module: 'kehikot.a', name: 'A' }] }).agentsToUpdate).toEqual([{ module: 'kehikot.a', name: 'A' }])
  })
})
