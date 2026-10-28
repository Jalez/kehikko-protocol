import { describe, expect, test } from 'bun:test'

import {
  LIMITS,
  PACKAGE_VERSION,
  PROTOCOL,
  TRAFFIC_CALLER_HOW,
  TRAFFIC_CALLER_KINDS,
  trafficCallSchema,
  trafficCallerSchema,
  trafficNoteSchema,
  trafficReadResult,
} from '../src/index.js'

/**
 * 2.25.0: every request the host receives names who sent it (`caller` on a row of traffic): a
 * module, an agent session, Kehikot itself, another program by its name and its parent's, another
 * computer, or a program that closed before it could be named — never just "unknown".
 */

const row = {
  seq: 1,
  at: 10,
  ms: 2,
  reason: null,
  kind: 'POST',
  host: '127.0.0.1:4171',
  path: '/mcp',
  status: 200,
  ok: true,
  by: 'kehikot.claude',
  via: 'process' as const,
  side: 'in' as const,
  reported: 'host' as const,
}

describe('the version', () => {
  test('is 2.25.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.27.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('caller on a row of traffic', () => {
  test('a session, with its place and its process, and how it was told', () => {
    const read = trafficCallSchema.parse({
      ...row,
      caller: { kind: 'session', name: 'Claude session on Wide · methods', how: 'token', place: 'Wide · methods', process: 'claude', parent: 'bun', pid: 4242 },
    })
    expect(read.caller).toEqual({ kind: 'session', name: 'Claude session on Wide · methods', how: 'token', place: 'Wide · methods', process: 'claude', parent: 'bun', pid: 4242 })
  })

  test('a program nobody registered is named, with by still empty', () => {
    const read = trafficCallSchema.parse({ ...row, by: '', caller: { kind: 'program', name: 'curl, from your terminal (zsh)', how: 'process', process: 'curl', parent: 'zsh' } })
    expect(read.by).toBe('')
    expect(read.caller?.name).toBe('curl, from your terminal (zsh)')
  })

  test('every kind and every how is a word a reader can switch on', () => {
    expect([...TRAFFIC_CALLER_KINDS]).toEqual(['host', 'module', 'session', 'program', 'remote', 'gone'])
    expect([...TRAFFIC_CALLER_HOW]).toEqual(['route', 'origin', 'token', 'process', 'address', 'closed'])
    for (const kind of TRAFFIC_CALLER_KINDS) for (const how of TRAFFIC_CALLER_HOW) expect(trafficCallerSchema.safeParse({ kind, name: 'x', how }).success).toBe(true)
  })

  test('bounded: a name, a process name and a place', () => {
    expect(trafficCallerSchema.safeParse({ kind: 'program', how: 'process', name: 'x'.repeat(LIMITS.TRAFFIC_CALLER + 1) }).success).toBe(false)
    expect(trafficCallerSchema.safeParse({ kind: 'program', how: 'process', name: 'x', process: 'p'.repeat(LIMITS.TRAFFIC_KIND + 1) }).success).toBe(false)
    expect(trafficCallerSchema.safeParse({ kind: 'program', how: 'process', name: ' ' }).success).toBe(false)
  })

  test('absent from an older host; dropped, not fatal, when it does not parse (a kind from a newer host)', () => {
    expect(trafficCallSchema.parse(row).caller).toBeUndefined()
    const read = trafficReadResult.parse({ calls: [{ ...row, caller: { kind: 'robot', name: 'x', how: 'process' } }], newest: 1, oldest: 1, kept: 5000, started: 1 })
    expect(read.calls).toHaveLength(1)
    expect(read.calls[0]!.caller).toBeUndefined()
  })

  test('a module cannot name itself: a note carries no caller', () => {
    const note = trafficNoteSchema.parse({ at: 1, kind: 'GET', host: 'x', path: '/', caller: { kind: 'host', name: 'Kehikot', how: 'origin' } } as never)
    expect('caller' in note).toBe(false)
  })
})
