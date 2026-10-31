import { describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { LIMITS, PACKAGE_VERSION, PROTOCOL, RUN_RESULT_STATES, latestRuns, runEnded, runResultSchema, runsIn, type RunResult } from '../src/index.js'
import { readRuns, writeRuns, RUNS_FILE } from '../src/serve/index.js'

/** 2.27.0: run results any module publishes for the refs they are for, read by any module. */

const run = (over: Partial<RunResult> = {}): RunResult => ({
  id: 'r1',
  label: 'bun test',
  kind: 'push',
  refs: ['!3907'],
  epic: 'queue',
  state: 'passed',
  queuedAt: 1000,
  startedAt: 1100,
  finishedAt: 1200,
  exit: 0,
  ...over,
})

describe('the version', () => {
  test('2.27.0, protocol 2', () => {
    expect(PACKAGE_VERSION).toBe('2.39.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('runResultSchema', () => {
  test('takes a whole run', () => expect(runResultSchema.parse(run())).toEqual(run()))
  test('fills what a queued run has not got yet', () => {
    const parsed = runResultSchema.parse({ id: 'a', label: 'x', kind: 'verify', state: 'queued', queuedAt: 5 })
    expect(parsed).toEqual({ id: 'a', label: 'x', kind: 'verify', refs: [], epic: null, state: 'queued', queuedAt: 5, startedAt: null, finishedAt: null, exit: null })
  })
  test('a kind it does not know reads as other', () => expect(runResultSchema.parse(run({ kind: 'nightly' as never })).kind).toBe('other'))
  test('refuses a state it does not know, an empty label, a long one', () => {
    expect(runResultSchema.safeParse(run({ state: 'flaky' as never })).success).toBe(false)
    expect(runResultSchema.safeParse(run({ label: '' })).success).toBe(false)
    expect(runResultSchema.safeParse(run({ label: 'x'.repeat(LIMITS.RUN_LABEL + 1) })).success).toBe(false)
    expect(runResultSchema.safeParse(run({ refs: Array.from({ length: LIMITS.RUN_REFS + 1 }, (_, i) => `#${i}`) })).success).toBe(false)
  })
  test('the states, and which have ended', () => {
    expect([...RUN_RESULT_STATES]).toEqual(['queued', 'running', 'passed', 'failed', 'cancelled'])
    expect(RUN_RESULT_STATES.filter(runEnded)).toEqual(['passed', 'failed', 'cancelled'])
  })
})

describe('runsIn', () => {
  test('junk costs only its entry; an id once', () => {
    expect(runsIn({ version: 1, runs: [run(), { id: 'bad' }, run({ label: 'again' }), run({ id: 'r2' })] }).map((one) => one.id)).toEqual(['r1', 'r2'])
  })
  test('nothing for what is not a runs document', () => {
    for (const junk of [null, [], 'x', { runs: 'no' }, {}]) expect(runsIn(junk)).toEqual([])
  })
  test('at most LIMITS.RUNS', () => {
    const many = Array.from({ length: LIMITS.RUNS + 5 }, (_, i) => run({ id: `r${i}` }))
    expect(runsIn({ runs: many })).toHaveLength(LIMITS.RUNS)
  })
})

describe('latestRuns', () => {
  test('the newest of each label on one ref; a later failure replaces a pass', () => {
    const runs = [
      run({ id: 'a', label: 'unit', queuedAt: 1, state: 'passed' }),
      run({ id: 'b', label: 'unit', queuedAt: 2, state: 'failed', exit: 1 }),
      run({ id: 'c', label: 'e2e', queuedAt: 1, state: 'running' }),
      run({ id: 'd', label: 'unit', queuedAt: 3, refs: ['gh#1'], state: 'passed' }),
    ]
    expect(latestRuns(runs, '!3907').map((one) => [one.label, one.state])).toEqual([
      ['e2e', 'running'],
      ['unit', 'failed'],
    ])
    expect(latestRuns(runs, 'gh#1').map((one) => one.id)).toEqual(['d'])
    expect(latestRuns(runs, '!1')).toEqual([])
  })
})

describe('readRuns and writeRuns', () => {
  const project = () => mkdtempSync(join(tmpdir(), 'runs-'))

  test('a module writes its own; a reader reads every folder, each run with from', () => {
    const root = project()
    try {
      const written = writeRuns(root, 'kehikot.somerunner', [run(), run({ id: 'r2', queuedAt: 500 })])
      expect(written?.changed).toBe(true)
      expect(writeRuns(root, 'kehikot.somerunner', [run(), run({ id: 'r2', queuedAt: 500 })])?.changed).toBe(false)
      writeRuns(root, 'kehikot.other', [run({ id: 'x', label: 'lint' })])
      const read = readRuns(root)
      expect(read.map((one) => [one.from, one.id])).toEqual([
        ['other', 'x'],
        ['somerunner', 'r2'],
        ['somerunner', 'r1'],
      ])
      const file = JSON.parse(readFileSync(join(root, '.kehikot', 'somerunner', `${RUNS_FILE}.json`), 'utf8'))
      expect(file.version).toBe(1)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('the newest LIMITS.RUNS are kept; a malformed run is dropped and counted', () => {
    const root = project()
    try {
      const many = Array.from({ length: LIMITS.RUNS + 3 }, (_, i) => run({ id: `r${i}`, queuedAt: i }))
      const out = writeRuns(root, 'kehikot.somerunner', [...many, { id: '' } as unknown as RunResult])
      expect(out?.dropped).toBe(1)
      const read = readRuns(root)
      expect(read).toHaveLength(LIMITS.RUNS)
      expect(read[0]!.id).toBe('r3')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  test('an unreadable file is set aside, not written through; a link out of the project is not read', () => {
    const root = project()
    const elsewhere = project()
    try {
      mkdirSync(join(root, '.kehikot', 'somerunner'), { recursive: true })
      writeFileSync(join(root, '.kehikot', 'somerunner', 'runs.json'), 'not json')
      writeRuns(root, 'kehikot.somerunner', [run()])
      expect(existsSync(join(root, '.kehikot', 'somerunner', 'runs.json.unreadable'))).toBe(true)
      writeFileSync(join(elsewhere, 'runs.json'), JSON.stringify({ runs: [run({ id: 'stranger' })] }))
      mkdirSync(join(root, '.kehikot', 'linked'), { recursive: true })
      symlinkSync(join(elsewhere, 'runs.json'), join(root, '.kehikot', 'linked', 'runs.json'))
      expect(readRuns(root).map((one) => one.id)).toEqual(['r1'])
    } finally {
      rmSync(root, { recursive: true, force: true })
      rmSync(elsewhere, { recursive: true, force: true })
    }
  })

  test('no project: nothing read, nothing written', () => {
    expect(readRuns(null)).toEqual([])
    expect(readRuns('relative')).toEqual([])
    expect(writeRuns(null, 'kehikot.somerunner', [run()])).toBeNull()
  })
})
