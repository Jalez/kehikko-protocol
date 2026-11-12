import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import {
  CAPABILITIES,
  LIMITS,
  METHODS,
  PACKAGE_VERSION,
  PROTOCOL,
   SERVER_METHODS,
  WORK_QUEUE,
  manifestSchema,
  messageNotifySessionParams,
  methodParams,
  methodResults,
  SERVICES,
  SERVICE_NAMES,
  serviceDescriptor,
  servicesOf,
  servicesFindParams,
  servicesFindResult,
  providerOf,
  serverAskSchema,
  sinceOf,
  workQueueSchema,
  workQueueSaid,
  workRunLine,
} from '../src/index.js'

/**
 * 2.81.0: services — a provider/consumer contract (`services`, `services.find`), its first service
 * `work.queue`, and `messages.notifySession`, a notice to one session found by its own id.
 */

describe('the version', () => {
  test('is 2.81.0, PROTOCOL is still 2, and the entry declares its kind', () => {
    expect(PACKAGE_VERSION).toBe('2.87.0')
    expect(PROTOCOL).toBe(2)
    const log = readFileSync(join(resolve(dirname(new URL(import.meta.url).pathname), '..'), 'CHANGELOG.md'), 'utf8')
    expect(log).toMatch(/## 2\.81\.0 — \d{4}-\d{2}-\d{2}\n\nKind: feature\n/)
  })
})

const QUEUE = {
  name: 'Turns',
  run: { test: "'/x/bin/runner' run --kind verify -- {command}", typecheck: "'/x/bin/runner' run --kind typecheck -- {command}" },
  cli: '/x/bin/runner',
  tool: 'run_tool',
  marks: ['"$@"; c=$?'],
}
const BASE = { kind: 'kehikot.module', protocol: 2, id: 'kehikot.turns', name: 'Turns', version: '1.0.0', entry: '/app', modes: [{ id: 'turns', label: 'Turns', scope: 'machine' }], mcp: { url: '/mcp', transport: 'http' }, extensions: { emits: [], consumes: [] }, health: '/healthz', partless: 'machine work', declares: { protocol: '>=2 <3', uses: [] } }

describe('services in a manifest', () => {
  test('work.queue is the first service, with a schema', () => {
    expect(WORK_QUEUE).toBe('work.queue')
    expect(SERVICE_NAMES).toContain(WORK_QUEUE)
    expect(SERVICES[WORK_QUEUE].says).toBeTruthy()
    expect(workQueueSchema.parse(QUEUE).run.test).toContain('{command}')
  })
  test('a manifest carries its services, and a known one that does not parse drops the field, not the manifest', () => {
    const parsed = manifestSchema.parse({ ...BASE, services: { [WORK_QUEUE]: QUEUE, 'later.thing': { any: 1 } } }) as { services?: Record<string, unknown> }
    expect(servicesOf(parsed)).toEqual([WORK_QUEUE, 'later.thing'])
    expect(serviceDescriptor(WORK_QUEUE, parsed.services?.[WORK_QUEUE])?.name).toBe('Turns')
    expect((manifestSchema.parse({ ...BASE, services: { [WORK_QUEUE]: { run: {} } } }) as { services?: unknown }).services).toBeUndefined()
    expect((manifestSchema.parse({ ...BASE, services: { 'Bad Name': {} } }) as { services?: unknown }).services).toBeUndefined()
    expect(servicesOf(manifestSchema.parse(BASE) as never)).toEqual([])
  })
  test('a run line says where the command goes, and is one line', () => {
    expect(workQueueSchema.safeParse({ name: 'T', run: { test: 'runner run' } }).success).toBe(false)
    expect(workQueueSchema.safeParse({ name: 'T', run: { test: 'runner\n{command}' } }).success).toBe(false)
    expect(workQueueSchema.safeParse({ name: 'T', run: {} }).success).toBe(false)
    expect(workQueueSchema.safeParse({ run: { test: 'r {command}' } }).success).toBe(false)
    expect(workQueueSchema.safeParse({ name: 'T', run: { test: 'r {command}' } }).data?.marks).toEqual([])
  })
  test('the line and the sentence come from the descriptor only', () => {
    const queue = workQueueSchema.parse(QUEUE)
    expect(workRunLine(queue, 'test', 'vitest run')).toBe("'/x/bin/runner' run --kind verify -- vitest run")
    expect(workRunLine(queue, 'build', 'vite build')).toBeNull()
    expect(workQueueSaid(queue, 'test', 'vitest run')).toBe("Run it through Turns: `'/x/bin/runner' run --kind verify -- vitest run` from the same folder, or with the run_tool tool.")
    expect(workQueueSaid(queue, 'install', 'bun install')).toBeNull()
  })
})

describe('services.find', () => {
  test('under services:read, a server method naming no project', () => {
    expect(METHODS['services.find']).toBe('services:read')
    expect(CAPABILITIES['services:read']).toBeTruthy()
    expect(SERVER_METHODS).toContain('services.find')
    expect(sinceOf('method', 'services.find')).toBe('2.81.0')
    expect(methodParams['services.find'].parse({ service: WORK_QUEUE })).toEqual({ service: WORK_QUEUE })
    expect(servicesFindParams.safeParse({}).success).toBe(false)
    expect(methodResults['services.find']).toBe(servicesFindResult)
  })
  test('the first provider whose descriptor parses; none when nothing does', () => {
    const result = servicesFindResult.parse({ providers: [{ module: 'kehikot.bad', name: 'Bad', descriptor: { run: {} } }, { module: 'kehikot.turns', name: 'Turns', descriptor: QUEUE, placed: true }] })
    expect(providerOf(WORK_QUEUE, result.providers)?.module).toBe('kehikot.turns')
    expect(providerOf(WORK_QUEUE, result.providers)?.placed).toBe(true)
    expect(providerOf(WORK_QUEUE, [{ module: 'kehikot.bad', name: 'Bad', descriptor: null, placed: null }])).toBeNull()
    expect(providerOf(WORK_QUEUE, [])).toBeNull()
    expect(servicesFindResult.parse({ providers: [{ module: 'kehikot.a', name: 'A' }] }).providers[0]).toEqual({ module: 'kehikot.a', name: 'A', descriptor: null, placed: null })
  })
})

describe('messages.notifySession', () => {
  test('under sessions:observe, a server method naming no project', () => {
    expect(METHODS['messages.notifySession']).toBe('sessions:observe')
    expect(CAPABILITIES['sessions:observe']).toBeTruthy()
    expect(SERVER_METHODS).toContain('messages.notifySession')
    expect(sinceOf('method', 'messages.notifySession')).toBe('2.81.0')
    expect(sinceOf('capability', 'sessions:observe')).toBe('2.81.0')
    expect(LIMITS.OBSERVED_PER_HOUR).toBe(6)
  })
  test('a session id and a body; no token, no to, no choices', () => {
    const ok = messageNotifySessionParams.parse({ session: '69155e9d-1111-4222-8333-444455556666', body: 'vitest is running', kind: 'report' })
    expect(ok.session).toBe('69155e9d-1111-4222-8333-444455556666')
    expect(messageNotifySessionParams.safeParse({ session: 'short', body: 'x' }).success).toBe(false)
    expect(messageNotifySessionParams.safeParse({ session: 'a b c d e f g h', body: 'x' }).success).toBe(false)
    expect(messageNotifySessionParams.safeParse({ session: '69155e9d-1111', body: '  ' }).success).toBe(false)
    expect('to' in (messageNotifySessionParams.parse({ session: '69155e9d-1111', body: 'x', to: { project: true } } as never) as object)).toBe(false)
  })
  test('a server question for it names no project', () => {
    const pass = 'p'.repeat(40)
    expect(serverAskSchema.safeParse({ module: 'kehikot.watch', pass, method: 'messages.notifySession', params: { session: '69155e9d-1111', body: 'x' } }).success).toBe(true)
    expect(serverAskSchema.safeParse({ module: 'kehikot.watch', pass, method: 'services.find', params: { service: WORK_QUEUE } }).success).toBe(true)
  })
})
