import { describe, expect, test } from 'bun:test'

import {
  RESTART_REASONS,
  RESUME_WINDOW_MS,
  cutOffByRestart,
  isResumeLine,
  keepsCutOffMark,
  restartOf,
  resumeLine,
} from '../src/index.js'
import { checkAgentFiles } from '../src/check/agent.js'
import { AGENT_DELIVERY } from '../src/services.js'

/* 2.110.0. Conversations a restart cut off, and how they are told to carry on. */

describe('the mark', () => {
  test('kept while a conversation the module holds is working, or waits on its own background work', () => {
    expect(keepsCutOffMark({ held: true, working: true })).toBe(true)
    expect(keepsCutOffMark({ held: true, working: false, waking: 2 })).toBe(true)
  })
  test('not for a finished, idle or waiting-for-the-person one, nor one the module does not hold', () => {
    expect(keepsCutOffMark({ held: true, working: false })).toBe(false)
    expect(keepsCutOffMark({ held: true, working: false, waking: 0 })).toBe(false)
    expect(keepsCutOffMark({ held: true, working: false, waking: null })).toBe(false)
    expect(keepsCutOffMark({ held: false, working: true, waking: 3 })).toBe(false)
  })
})

describe('cut off by the restart', () => {
  test('marked and not running', () => {
    expect(cutOffByRestart({ running: false, marked: true })).toBe(true)
    expect(cutOffByRestart({ running: true, marked: true })).toBe(false)
    expect(cutOffByRestart({ running: false, background: true, marked: true })).toBe(false)
  })
  test('a record from before the mark: grown within the window and its last turn not ended', () => {
    expect(cutOffByRestart({ running: false, marked: false, legacy: { grewAgoMs: 5 * 60_000, midTurn: true } })).toBe(true)
    expect(cutOffByRestart({ running: false, marked: false, legacy: { grewAgoMs: RESUME_WINDOW_MS + 1, midTurn: true } })).toBe(false)
    expect(cutOffByRestart({ running: false, marked: false, legacy: { grewAgoMs: 60_000, midTurn: false } })).toBe(false)
    expect(cutOffByRestart({ running: false, marked: false })).toBe(false)
  })
})

describe('why it restarted, and the sentence', () => {
  test('read from the environment the host passes; anything else is no reason', () => {
    expect(restartOf({ KEHIKOT_RESTART_REASON: 'app-update', KEHIKOT_RESTART_VERSION: '0.7.36' })).toEqual({ reason: 'app-update', version: '0.7.36' })
    expect(restartOf({ KEHIKOT_RESTART_REASON: 'app-restart' })).toEqual({ reason: 'app-restart', version: null })
    expect(restartOf({ KEHIKOT_RESTART_REASON: 'reboot', KEHIKOT_RESTART_VERSION: '1.0.0' })).toEqual({ reason: null, version: null })
    expect(restartOf({ KEHIKOT_RESTART_REASON: 'app-update', KEHIKOT_RESTART_VERSION: 'not a version; rm -rf' })).toEqual({ reason: 'app-update', version: null })
    expect(restartOf({})).toEqual({ reason: null, version: null })
  })
  test('each reason says why and to carry on; no reason says a restart and what may have been cut off', () => {
    expect(resumeLine({ reason: 'app-update', version: '0.7.36' })).toStartWith('Kehikot restarted to update to 0.7.36 while you were working. Carry on where you left off.')
    expect(resumeLine({ reason: 'module-update' })).toStartWith('Kehikot updated this module while you were working.')
    expect(resumeLine()).toBe('Kehikot restarted while you were working. Some background work may have been cut off: check your task notifications and resume anything unfinished.')
    for (const reason of RESTART_REASONS) expect(resumeLine({ reason })).toContain('subagents')
  })
  test('every sentence, with or without a version, is known as one; a person’s words are not', () => {
    for (const reason of [null, ...RESTART_REASONS]) {
      expect(isResumeLine(resumeLine({ reason }))).toBe(true)
      expect(isResumeLine(resumeLine({ reason, version: '2.0.1' }))).toBe(true)
    }
    expect(isResumeLine('Kehikot restarted while you were working. please continue')).toBe(false)
    expect(isResumeLine('carry on')).toBe(false)
  })
})

describe('the agent check holds an agent module to it', () => {
  const manifest = { id: 'kehikot.x', declares: { uses: ['agents:message'] }, services: { [AGENT_DELIVERY]: { name: 'X', program: 'X', deliver: '/api/deliver', adopt: 'Type /x-here in it.' } } }
  const clean = { path: 'uninstall.ts', text: "import { runUninstall } from 'kehikot-module-protocol/serve'\nrunUninstall(async () => [])" }
  const conformance = { path: 'test/agent.test.ts', text: "import { expectAgentConformance } from 'kehikot-module-protocol/testing'\nexpectAgentConformance({})" }
  const resumes = { path: 'resume.ts', text: 'keepsCutOffMark(now); if (cutOffByRestart(at)) wake(resumeLine(restartOf()))' }
  test('one that delivers and does not wake what a restart cut off fails, saying how', () => {
    const said = checkAgentFiles(manifest, [clean], [conformance])
    expect(said.failures).toHaveLength(1)
    expect(said.failures[0]).toContain('resumeLine')
    expect(checkAgentFiles(manifest, [clean, resumes], [conformance]).failures).toEqual([])
  })
  test('a module that only tells sessions something is asked nothing', () => {
    expect(checkAgentFiles({ id: 'kehikot.t', declares: { uses: ['agents:message'] } }, [], []).failures).toEqual([])
  })
})

describe('a work queue holds an app restart behind its runs', () => {
  test('the descriptor may say where; one without it is as before', async () => {
    const { workQueueSchema } = await import('../src/services.js')
    const base = { name: 'Queue', run: { test: 'q run -- {command}' } }
    expect(workQueueSchema.parse({ ...base, hold: '/api/hold' }).hold).toBe('/api/hold')
    expect(workQueueSchema.parse(base).hold).toBeUndefined()
    expect(workQueueSchema.safeParse({ ...base, hold: 'https://elsewhere/hold' }).success).toBe(false)
  })
  test('the hold, its answer, and the release are held to their shapes', async () => {
    const { workHoldParams, workHoldResult, restartReleaseParams, restartReleaseResult } = await import('../src/index.js')
    const token = 'abcdefghij0123456789'
    expect(workHoldParams.parse({ token, reason: 'app-update', label: 'Restart Kehikot to update to 0.7.36' }).reason).toBe('app-update')
    expect(workHoldParams.safeParse({ token: 'short', reason: 'app-update', label: 'x' }).success).toBe(false)
    expect(workHoldParams.safeParse({ token, reason: 'module-update', label: 'x' }).success).toBe(false)
    expect(workHoldResult.parse({ held: true, ahead: 2 })).toEqual({ held: true, ahead: 2, why: '' })
    expect(restartReleaseParams.parse({ token, go: false })).toEqual({ token, go: false })
    expect(restartReleaseResult.parse({ outcome: 'unknown' }).why).toBe('')
  })
  test('restart.release is a server method under app:restart', async () => {
    const { METHODS, SERVER_METHODS, CAPABILITIES } = await import('../src/index.js')
    expect(METHODS['restart.release']).toBe('app:restart')
    expect(SERVER_METHODS).toContain('restart.release')
    expect(CAPABILITIES['app:restart']).toContain('restart')
  })
})
