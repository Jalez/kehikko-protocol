import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import {
  CAPABILITIES,
  CAPABILITY_SINCE,
  METHODS,
  METHOD_SINCE,
  PACKAGE_VERSION,
  PIECE_SAID,
  SETTINGS_OPEN_OUTCOMES,
  methodParams,
  resultSchemaFor,
  serverAskSchema,
  settingsOpenResult,
} from '../src/index.js'

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')

describe('2.90.0: a page opens its own settings at one setting', () => {
  test('the version', () => {
    expect(PACKAGE_VERSION).toBe('2.98.0')
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.90.0')
    expect(readFileSync(join(REPO, 'docs/asking.md'), 'utf8')).toContain('## Opening its settings at one setting: `settings.open`')
  })

  test('is a method under settings:open, since 2.90.0', () => {
    expect(METHODS['settings.open']).toBe('settings:open')
    expect(CAPABILITIES['settings:open']).toContain('Nothing is changed')
    expect(METHOD_SINCE['settings.open']).toBe('2.90.0')
    expect(CAPABILITY_SINCE['settings:open']).toBe('2.90.0')
    expect(PIECE_SAID.capabilities['settings:open']).toBeTruthy()
  })

  test('takes a setting key, or nothing', () => {
    const params = methodParams['settings.open']
    expect(params.parse({})).toEqual({})
    expect(params.parse({ key: 'load_above' })).toEqual({ key: 'load_above' })
    expect(params.safeParse({ key: 'Load' }).success).toBe(false)
    expect(params.safeParse({ key: 'x'.repeat(200) }).success).toBe(false)
    expect(params.safeParse({ key: 3 }).success).toBe(false)
  })

  test('is answered with an outcome', () => {
    expect(SETTINGS_OPEN_OUTCOMES).toEqual(['opened', 'declined'])
    expect(resultSchemaFor('settings.open')).toBe(settingsOpenResult)
    expect(settingsOpenResult.parse({ outcome: 'opened' })).toEqual({ outcome: 'opened', why: '' })
    expect(settingsOpenResult.safeParse({ outcome: 'changed' }).success).toBe(false)
  })

  test('is a page method, never a server one', () => {
    expect(serverAskSchema.safeParse({ method: 'settings.open', params: {} }).success).toBe(false)
  })
})
