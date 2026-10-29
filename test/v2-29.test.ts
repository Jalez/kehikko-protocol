import { describe, expect, test } from 'bun:test'

import {
  DECLARATION_SINCE,
  MODULE_SCOPES,
  PACKAGE_VERSION,
  PROTOCOL,
  SCOPE_MEANS,
  SCOPE_NAMES,
  activeScope,
  contextSchema,
  defaultScope,
  fitOf,
  manifestSchema,
  needsOf,
  readScope,
  scopeNeedsEpic,
  scopeOf,
  scopeSaysOf,
  scopesOf,
  showsProject,
  supportedScopes,
  supportsScope,
  toldScope,
} from '../src/index.js'
import { hostFields } from '../src/client/host-store.js'

/**
 * 2.29.0: a module's scope — what its content belongs to — as one of five words on each mode, the
 * first mode the default, `scopeSays` saying what it shows there, and `context.scope` telling the
 * container the one in use.
 */

const base = {
  kind: 'kehikot.module',
  protocol: 2,
  id: 'kehikot.example',
  name: 'Example',
  entry: '/',
  partless: 'An example.',
}

describe('the version', () => {
  test('is 2.29.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.33.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('the five scopes', () => {
  test('have the names a person is shown, and a meaning each', () => {
    expect([...MODULE_SCOPES]).toEqual(['machine', 'project', 'epic', 'part', 'kehikko'])
    expect(SCOPE_NAMES).toEqual({ machine: 'This computer', project: 'Project', epic: 'Epic', part: 'Part', kehikko: 'Kehikko' })
    for (const scope of MODULE_SCOPES) expect(SCOPE_MEANS[scope].length).toBeGreaterThan(5)
  })

  test('an absent, old or unknown word reads as epic', () => {
    expect(readScope(undefined)).toBe('epic')
    expect(readScope('global')).toBe('epic')
    expect(readScope('galaxy')).toBe('epic')
    expect(readScope(3)).toBe('epic')
    expect(readScope('machine')).toBe('machine')
  })

  test('only epic and part are about the open epic', () => {
    expect(MODULE_SCOPES.filter(scopeNeedsEpic)).toEqual(['epic', 'part'])
  })
})

describe('modes[].scope and scopeSays', () => {
  test('parse the five words and the line', () => {
    const parsed = manifestSchema.parse({
      ...base,
      modes: [{ id: 'runs', label: 'Test runs', scope: 'machine', scopeSays: '  every project’s test runs, whatever is open here ' }],
    })
    expect(parsed.modes[0]).toEqual({ id: 'runs', label: 'Test runs', scope: 'machine', scopeSays: 'every project’s test runs, whatever is open here' })
  })

  test('nothing breaks: absent, global and a later word read as epic, and no line is absent', () => {
    for (const scope of [undefined, 'global', 'universe']) {
      const parsed = manifestSchema.parse({ ...base, modes: [{ id: 'x', label: 'X', ...(scope ? { scope } : {}) }] })
      expect(parsed.modes[0]!.scope).toBe('epic')
      expect(parsed.modes[0]!.scopeSays).toBeUndefined()
    }
    expect(manifestSchema.parse({ ...base, modes: [{ id: 'x', label: 'X', scopeSays: '   ' }] }).modes[0]!.scopeSays).toBeUndefined()
  })

  test('modes is still required, so an older host still reads the manifest', () => {
    expect(manifestSchema.safeParse({ ...base, modes: [] }).success).toBe(false)
    expect(manifestSchema.safeParse(base).success).toBe(false)
  })
})

describe('supported scopes and the default', () => {
  const kanban = {
    modes: [
      { id: 'board', scope: 'epic', scopeSays: 'the open epic’s cards' },
      { id: 'all', scope: 'project', scopeSays: 'every epic’s cards, each labelled' },
    ],
  }

  test('are the modes’ scopes in order, the first the default', () => {
    expect(supportedScopes(kanban)).toEqual([
      { scope: 'epic', says: 'the open epic’s cards', mode: 'board' },
      { scope: 'project', says: 'every epic’s cards, each labelled', mode: 'all' },
    ])
    expect(defaultScope(kanban)).toBe('epic')
    expect(supportsScope(kanban, 'project')).toBe(true)
    expect(supportsScope(kanban, 'machine')).toBe(false)
    expect(scopeSaysOf(kanban, 'project')).toBe('every epic’s cards, each labelled')
    expect(scopeSaysOf(kanban, 'machine')).toBe('')
  })

  test('a scope is listed once, the first mode for it winning', () => {
    expect(supportedScopes({ modes: [{ id: 'a', scope: 'global' }, { id: 'b', scope: 'epic' }] })).toEqual([{ scope: 'epic', says: '', mode: 'a' }])
  })

  test('a module that says nothing works at epic', () => {
    expect(supportedScopes({})).toEqual([{ scope: 'epic', says: '', mode: '' }])
    expect(defaultScope(null)).toBe('epic')
  })

  test('the deprecated declares.scopes still adds project, after the modes', () => {
    const old = { modes: [{ id: 'journeys', scope: 'epic' }], declares: { scopes: ['epic', 'project'] as const } }
    expect(supportedScopes(old).map((one) => one.scope)).toEqual(['epic', 'project'])
    expect(showsProject(old)).toBe(true)
  })

  test('showsProject and scopesOf read a project mode the same as declares.scopes', () => {
    expect(showsProject(kanban)).toBe(true)
    expect(scopesOf(kanban)).toEqual(['epic', 'project'])
    expect(showsProject({ modes: [{ id: 'x', scope: 'machine' }] })).toBe(false)
    expect(scopesOf({ modes: [{ id: 'x', scope: 'epic' }] })).toEqual(['epic'])
  })

  test('the active scope is the person’s pick when the module supports it, else the default', () => {
    expect(activeScope(kanban, 'project')).toBe('project')
    expect(activeScope(kanban, 'machine')).toBe('epic')
    expect(activeScope(kanban, undefined)).toBe('epic')
    expect(activeScope({ modes: [{ id: 'm', scope: 'machine' }] }, 'epic')).toBe('machine')
  })

  test('on All epics an epic or part container is told project, anything else as it is', () => {
    expect(toldScope('epic', true)).toBe('project')
    expect(toldScope('part', true)).toBe('project')
    expect(toldScope('machine', true)).toBe('machine')
    expect(toldScope('kehikko', true)).toBe('kehikko')
    expect(toldScope('part', false)).toBe('part')
  })
})

describe('context.scope', () => {
  test('carries the five words, and an unknown one reads as absent', () => {
    expect(contextSchema.parse({ scope: 'machine' }).scope).toBe('machine')
    expect(contextSchema.parse({ scope: 'part' }).scope).toBe('part')
    expect(contextSchema.parse({ scope: 'universe' }).scope).toBeUndefined()
    expect(contextSchema.parse({}).scope).toBeUndefined()
  })

  test('scopeOf keeps its two words; the page’s standing has the working scope too', () => {
    expect(scopeOf({ scope: 'machine' })).toBe('epic')
    expect(scopeOf({ scope: 'project' })).toBe('project')
    const standing = hostFields(contextSchema.parse({ scope: 'kehikko' }))
    expect(standing.scope).toBe('epic')
    expect(standing.workingScope).toBe('kehikko')
    expect(hostFields(null).workingScope).toBe('epic')
  })
})

describe('fit', () => {
  test('a scope beyond one epic needs 2.29.0; epic, global and scopeSays need nothing', () => {
    expect(DECLARATION_SINCE['modes.scope']).toBe('2.29.0')
    const machine = { ...base, modes: [{ id: 'm', label: 'M', scope: 'machine' }] }
    expect(needsOf(machine).version).toBe('2.29.0')
    expect(fitOf(machine, { version: '2.27.0' }).fit).toBe('host-too-old')
    const epic = { ...base, modes: [{ id: 'e', label: 'E', scope: 'epic', scopeSays: 'the open epic' }, { id: 'g', label: 'G', scope: 'global' }] }
    expect(needsOf(epic).pieces.find((piece) => piece.piece === 'modes.scope')).toBeUndefined()
  })
})
