import { describe, expect, test } from 'bun:test'

import {
  BRAND_MODULE_ICONS,
  HEADER_ICONS,
  LUCIDE_MODULE_ICONS,
  MODULE_ICONS,
  MODULE_ICON_SETS,
  PACKAGE_VERSION,
  PROTOCOL,
  isModuleIcon,
  manifestSchema,
  moduleIconParts,
} from '../src/index.js'

/** 2.14.0: a module names the icon it is known by, as a key a host draws (`MODULE_ICONS`). */

const minimal = {
  kind: 'kehikot.module',
  protocol: 2,
  id: 'kehikot.paper',
  name: 'Paper',
  entry: '/app',
  modes: [{ id: 'paper', label: 'Paper' }],
  partless: 'It reads one paper.',
}

describe('the version', () => {
  test('is 2.18.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.23.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('MODULE_ICONS', () => {
  test('is every Lucide name as lucide:<name>, then every brand as brand:<slug>, each once', () => {
    expect(MODULE_ICONS.length).toBe(LUCIDE_MODULE_ICONS.length + BRAND_MODULE_ICONS.length)
    expect(new Set(MODULE_ICONS).size).toBe(MODULE_ICONS.length)
    expect(MODULE_ICONS).toContain('lucide:bot')
    expect(MODULE_ICONS).toContain('brand:latex')
    expect(MODULE_ICON_SETS).toEqual(['lucide', 'brand'])
  })
  test('every key is a set, a colon and a lowercase name: nothing that could be a path or a URL', () => {
    for (const key of MODULE_ICONS) expect(key).toMatch(/^(lucide|brand):[a-z0-9]+(-[a-z0-9]+)*$/)
  })
  test('is apart from HEADER_ICONS, and carries no sparkles: that is not any module', () => {
    for (const key of MODULE_ICONS) expect(HEADER_ICONS as readonly string[]).not.toContain(key)
    expect(MODULE_ICONS.some((key) => key.includes('sparkles'))).toBe(false)
  })
})

describe('2.14.1', () => {
  test('message-square-check, which Lucide does not have, is message-square-code', () => {
    expect(isModuleIcon('lucide:message-square-check')).toBe(false)
    expect(isModuleIcon('lucide:message-square-code')).toBe(true)
  })
})

describe('isModuleIcon', () => {
  test('is a key of the set and nothing else', () => {
    expect(isModuleIcon('lucide:route')).toBe(true)
    expect(isModuleIcon('brand:claude')).toBe(true)
    for (const not of ['route', 'lucide:', 'brand:nope', 'https://x.test/icon.svg', '/icon.svg', 'lucide:../x', 'LUCIDE:ROUTE', 42, null, undefined]) {
      expect(isModuleIcon(not)).toBe(false)
    }
  })
})

describe('moduleIconParts', () => {
  test('splits a key into its set and name', () => {
    expect(moduleIconParts('brand:googlechrome')).toEqual({ set: 'brand', name: 'googlechrome' })
    expect(moduleIconParts('lucide:square-terminal')).toEqual({ set: 'lucide', name: 'square-terminal' })
  })
})

describe('manifest.icon', () => {
  test('absent stays absent: a manifest from before 2.14.0 parses as it did', () => {
    expect(manifestSchema.parse(minimal).icon).toBeUndefined()
  })
  test('a key parses and is carried as written', () => {
    expect(manifestSchema.parse({ ...minimal, icon: 'brand:latex' }).icon).toBe('brand:latex')
  })
  test('an older image URL still parses, and is not a key: a host draws its own icon for it', () => {
    const m = manifestSchema.parse({ ...minimal, icon: '/icon.svg' })
    expect(m.icon).toBe('/icon.svg')
    expect(isModuleIcon(m.icon)).toBe(false)
  })
})
