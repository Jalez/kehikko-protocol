import { describe, expect, test } from 'bun:test'

import { WORK_WANT_DEFAULTS, serviceDescriptor, wantsQueued, wholeSuite, workQueueSchema, workWant, type WorkQueue } from '../src/index.js'

const run = { test: 'q run -- {command}', typecheck: 'q run -- {command}', build: 'q run -- {command}', install: 'q run -- {command}' }
const queue = (extra: Partial<WorkQueue> = {}): WorkQueue => workQueueSchema.parse({ name: 'Q', run, ...extra })
const ruled = queue({
  wants: { test: { minCpu: 50, sustainedSeconds: 15, wholeSuiteOnly: true }, typecheck: { minCpu: 80, sustainedSeconds: 10 }, build: { minCpu: 80, sustainedSeconds: 10 } },
})

describe('wholeSuite', () => {
  test('a test command with no file arguments, or only folders, is the whole suite', () => {
    for (const line of ['bun test', 'vitest run', 'vitest', 'npx vitest run --reporter dot', 'jest', 'bun test test/', 'bun test ./test src/unit', 'npm test', 'bun run test', 'pnpm run test:unit', 'node /w/node_modules/vitest/vitest.mjs run', 'bun test --timeout 20000', 'bun test --config vitest.config.ts', 'bun test test'])
      expect([line, wholeSuite(line)]).toEqual([line, true])
  })
  test('files, name filters and a bare filter word make it targeted', () => {
    for (const line of ['bun test test/a.test.tsx test/b.test.tsx', 'vitest run src/x.spec.ts', 'bun test -t "parses"', 'jest --testNamePattern=foo', 'bun test auth', 'npx playwright test login.spec.ts', 'vitest run --changed'])
      expect([line, wholeSuite(line)]).toEqual([line, false])
  })
})

describe('workWant', () => {
  test('without wants, every kind it takes is wanted under the defaults; tests as whole suites only', () => {
    const plain = queue()
    expect(workWant(plain, 'test')).toEqual({ ...WORK_WANT_DEFAULTS })
    expect(workWant(plain, 'typecheck')).toEqual({ ...WORK_WANT_DEFAULTS, wholeSuiteOnly: false })
    expect(workWant(workQueueSchema.parse({ name: 'Q', run: { test: run.test } }), 'build')).toBeNull()
  })
  test('with wants, a kind left out is not wanted and a field left out takes its default', () => {
    expect(workWant(ruled, 'install')).toBeNull()
    expect(workWant(queue({ wants: { test: { minCpu: 30 } } }), 'test')).toEqual({ minCpu: 30, sustainedSeconds: 20, wholeSuiteOnly: true })
    expect(workWant(ruled, 'typecheck')).toEqual({ minCpu: 80, sustainedSeconds: 10, wholeSuiteOnly: false })
  })
  test('a rule out of range does not parse; the descriptor is dropped whole', () => {
    expect(serviceDescriptor('work.queue', { name: 'Q', run, wants: { test: { minCpu: -1 } } })).toBeNull()
    expect(serviceDescriptor('work.queue', { name: 'Q', run, wants: { test: { sustainedSeconds: 99999 } } })).toBeNull()
    expect(serviceDescriptor('work.queue', { name: 'Q', run, wants: { install: {} } })).not.toBeNull()
  })
})

describe('wantsQueued', () => {
  test('a targeted test run is not wanted, a whole suite at high CPU is', () => {
    expect(wantsQueued(ruled, { kind: 'test', command: 'bun test test/a.test.tsx test/b.test.tsx', cpu: 68, seconds: 60 })).toBe(false)
    expect(wantsQueued(ruled, { kind: 'test', command: 'bun test', cpu: 68, seconds: 20 })).toBe(true)
  })
  test('an install the provider leaves out is not wanted at any CPU', () => {
    expect(wantsQueued(ruled, { kind: 'install', command: 'bun install', cpu: 1, seconds: 300 })).toBe(false)
    expect(wantsQueued(ruled, { kind: 'install', command: 'bun install', cpu: 300, seconds: 300 })).toBe(false)
  })
  test('a sustained typecheck is wanted, a short spike or low CPU is not', () => {
    expect(wantsQueued(ruled, { kind: 'typecheck', command: 'tsc --noEmit', cpu: 145, seconds: 12 })).toBe(true)
    expect(wantsQueued(ruled, { kind: 'typecheck', command: 'tsc --noEmit', cpu: 145, seconds: 4 })).toBe(false)
    expect(wantsQueued(ruled, { kind: 'typecheck', command: 'tsc --noEmit', cpu: 40, seconds: 60 })).toBe(false)
  })
  test('the defaults hold for a provider that says no wants', () => {
    expect(wantsQueued(queue(), { kind: 'build', command: 'vite build', cpu: 90, seconds: 19 })).toBe(false)
    expect(wantsQueued(queue(), { kind: 'build', command: 'vite build', cpu: 90, seconds: 20 })).toBe(true)
  })
})
