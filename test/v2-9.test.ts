import { describe, expect, test } from 'bun:test'

import {
  CONTEXT_SCOPES,
  PACKAGE_VERSION,
  PROTOCOL,
  contextMessageSchema,
  contextSchema,
  helloSchema,
  manifestSchema,
  scopeOf,
  scopesOf,
  showsProject,
} from '../src/index.js'
import { hostFields } from '../src/client/host-store.js'

/** 2.9.0: a context says whether it is about one epic or the whole project; a manifest says which it can show. */

const manifest = {
  kind: 'kehikot.module',
  protocol: 2,
  id: 'kehikot.board',
  name: 'Board',
  entry: '/app',
  modes: [{ id: 'board', label: 'Board' }],
  reacts: ['parts'],
}

describe('the version', () => {
  test('is 2.18.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.25.0')
    expect(PROTOCOL).toBe(2)
  })
  test('the words are the contract’s', () => {
    expect([...CONTEXT_SCOPES]).toEqual(['epic', 'project'])
  })
})

describe('context.scope', () => {
  test('is absent from an older host, and reads as epic', () => {
    const context = contextSchema.parse({ epic: 'checkout' })
    expect('scope' in context).toBe(false)
    expect(scopeOf(context)).toBe('epic')
    expect(scopeOf(null)).toBe('epic')
    expect(scopeOf(undefined)).toBe('epic')
  })

  test('project: no epic, no parts, and not the same as no epic open', () => {
    const all = contextSchema.parse({ scope: 'project', epic: null, project: 'Shop', parts: [] })
    const none = contextSchema.parse({ epic: null, project: 'Shop' })
    expect(scopeOf(all)).toBe('project')
    expect(scopeOf(none)).toBe('epic')
    expect(all.epic).toBeNull()
    expect(all.parts).toEqual([])
  })

  test('a word it does not know is refused by the schema, and read as epic by scopeOf', () => {
    expect(contextSchema.safeParse({ scope: 'machine' }).success).toBe(false)
    expect(scopeOf({ scope: 'machine' })).toBe('epic')
  })

  test('travels in the greeting and in kehikot.context', () => {
    const hello = helloSchema.parse({
      type: 'kehikot.hello',
      protocol: 2,
      session: 's1',
      context: { scope: 'project' },
      state: null,
    })
    expect(hello.context.scope).toBe('project')
    const message = contextMessageSchema.parse({ type: 'kehikot.context', protocol: 2, scope: 'project' })
    expect(message.scope).toBe('project')
  })

  test('a page’s standing carries it, epic when the host does not say', () => {
    expect(hostFields(null).scope).toBe('epic')
    expect(hostFields(contextSchema.parse({ epic: 'checkout' })).scope).toBe('epic')
    expect(hostFields(contextSchema.parse({ scope: 'project' })).scope).toBe('project')
  })
})

describe('declares.scopes', () => {
  test('absent means one epic', () => {
    const m = manifestSchema.parse(manifest)
    expect(m.declares.scopes).toBeUndefined()
    expect(scopesOf(m)).toEqual(['epic'])
    expect(showsProject(m)).toBe(false)
    expect(scopesOf(null)).toEqual(['epic'])
  })

  test('a module that can show a whole project says so', () => {
    const m = manifestSchema.parse({ ...manifest, declares: { scopes: ['epic', 'project'] } })
    expect(m.declares.scopes).toEqual(['epic', 'project'])
    expect(scopesOf(m)).toEqual(['epic', 'project'])
    expect(showsProject(m)).toBe(true)
  })

  test('an empty list, a repeated scope or an unknown word is refused', () => {
    expect(manifestSchema.safeParse({ ...manifest, declares: { scopes: [] } }).success).toBe(false)
    expect(manifestSchema.safeParse({ ...manifest, declares: { scopes: ['epic', 'epic'] } }).success).toBe(false)
    expect(manifestSchema.safeParse({ ...manifest, declares: { scopes: ['machine'] } }).success).toBe(false)
  })

  test('the other declarations still default around it', () => {
    const m = manifestSchema.parse({ ...manifest, declares: { scopes: ['project', 'epic'] } })
    expect(m.declares.storage).toBe(false)
    expect(m.declares.uses).toEqual([])
    expect(showsProject(m)).toBe(true)
  })
})
