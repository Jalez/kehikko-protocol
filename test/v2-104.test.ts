import { expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { APP_ENV_PREFIXES, clearAppEnvironment } from '../src/testing/index.ts'

test('drops every variable a running app leaks, and nothing else', () => {
  const env: Record<string, string | undefined> = {
    KEHIKOT_HOST: 'http://127.0.0.1:4170',
    KEHIKOT_ORIGINS: 'http://127.0.0.1:7820',
    KEHIKOT_SOMETHING_NEW: '1',
    KEHIKKO_PORT: '4170',
    PATH: '/usr/bin',
    HOME: '/home/x',
  }
  expect(clearAppEnvironment(env)).toEqual(['KEHIKKO_PORT', 'KEHIKOT_HOST', 'KEHIKOT_ORIGINS', 'KEHIKOT_SOMETHING_NEW'])
  expect(env).toEqual({ PATH: '/usr/bin', HOME: '/home/x' })
  expect(APP_ENV_PREFIXES).toContain('KEHIKOT_')
})

test('the preload leaves no KEHIKOT_HOST for a test to reach the running app with', () => {
  /* test/setup.ts imports the preload first; the registry variable it sets after is the only one left. */
  expect(process.env.KEHIKOT_HOST).toBeUndefined()
  expect(process.env.KEHIKOT_ORIGINS).toBeUndefined()
})

test('the module template preloads it, and the package exports it', () => {
  const root = join(import.meta.dir, '..')
  expect(readFileSync(join(root, 'template/test/setup.ts'), 'utf8')).toContain("kehikot-module-protocol/testing/setup")
  const exports = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).exports
  expect(exports['./testing/setup']).toBeDefined()
  expect(existsSync(join(root, 'src/testing/setup.ts'))).toBe(true)
})
