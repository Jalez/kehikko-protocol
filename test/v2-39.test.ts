import { describe, expect, test } from 'bun:test'

import { BRAND_MODULE_ICONS, isModuleIcon, manifestSchema } from '../src/index.ts'

const minimal = {
  kind: 'kehikot.module',
  protocol: 2,
  id: 'kehikot.paper',
  name: 'Paper',
  entry: '/app',
  modes: [{ id: 'paper', label: 'Paper' }],
  partless: 'It reads one paper.',
}

/* 2.39.0: brand marks for the coding agents a module may front. */
describe('2.39.0 brand marks', () => {
  test('the new slugs are keys a manifest may name', () => {
    for (const slug of ['openai', 'googlegemini', 'opencode', 'mistralai']) {
      expect(BRAND_MODULE_ICONS).toContain(slug as never)
      expect(isModuleIcon(`brand:${slug}`)).toBe(true)
    }
  })

  test('an unknown brand still parses, to be drawn as the module’s initial', () => {
    expect(isModuleIcon('brand:nothing')).toBe(false)
    expect(manifestSchema.parse({ ...minimal, icon: 'brand:nothing' }).icon).toBe('brand:nothing')
  })
})
