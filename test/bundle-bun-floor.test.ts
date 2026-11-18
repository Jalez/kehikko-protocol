import { describe, expect, test } from 'bun:test'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { BUNDLE_FORMAT, BUNDLE_FORMAT_VERSION, BUNDLE_MIN_BUN, BUNDLE_RUN, bunTooOld, smokeBundle } from '../src/bundle/index.js'

/* 2.108.1. A bundle built by Bun 1.4.0 lost an export and crashed at start; building under an older Bun is refused. */

describe('the Bun that builds a bundle', () => {
  test('1.4.0 is refused, with what to use instead', () => {
    const why = bunTooOld('1.4.0')
    expect(why).toContain('Bun 1.4.0 is too old to bundle modules safely')
    expect(why).toContain(`use ${BUNDLE_MIN_BUN} or newer`)
    expect(why).toContain('BUN_BE_BUN=1')
  })
  test('the floor and anything newer is let through', () => {
    for (const version of [BUNDLE_MIN_BUN, '1.4.4', '1.5.0', '2.0.0', '1.10.0', '1.4.4-canary.1']) expect(bunTooOld(version)).toBeNull()
  })
  test('older ones are all refused', () => {
    for (const version of ['1.3.9', '1.0.0', '0.8.1', '1.4.0-canary.3']) expect(bunTooOld(version)).not.toBeNull()
  })
})

describe('the smoke run', () => {
  test('fails a bundle that crashes at start, naming what it said', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kehikot-smoke-crash-'))
    try {
      writeFileSync(join(dir, 'bundle.json'), JSON.stringify({ format: BUNDLE_FORMAT, formatVersion: BUNDLE_FORMAT_VERSION, id: 'kehikot.crash', version: '1.0.0', protocol: null, commit: 'a'.repeat(40), entry: 'serve.ts', builtAt: new Date().toISOString(), bun: null, platforms: null, native: [], files: { 'serve.ts': { sha256: 'b'.repeat(64), size: 1 }, [BUNDLE_RUN]: { sha256: 'c'.repeat(64), size: 1, executable: true } } }))
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, BUNDLE_RUN), '#!/bin/sh\necho "SyntaxError: export agentSetupSettings is not defined" >&2\nexit 1\n')
      chmodSync(join(dir, BUNDLE_RUN), 0o755)
      const smoked = await smokeBundle({ dir, withinMs: 5000, log: () => {} })
      expect(smoked.ok).toBe(false)
      if (!smoked.ok) {
        expect(smoked.why).toContain('exited (1) before it answered')
        expect(smoked.output).toContain('agentSetupSettings')
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
