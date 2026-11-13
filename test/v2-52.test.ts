import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { HELP_LIMITS, PACKAGE_VERSION, PROTOCOL, hasHelp, helpOf, helpSchema, manifestSchema } from '../src/index.js'

/**
 * 2.52.0: `help`, how to use a module in its own words, for a person. Plain text, bounded, dropped
 * whole when it does not parse; a host offers "How to use" only when `helpOf` reads one.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')

const manifest = (extra: Record<string, unknown> = {}) => ({
  kind: 'kehikot.module',
  protocol: PROTOCOL,
  id: 'kehikot.example',
  name: 'Example',
  version: '1.0.0',
  entry: 'http://localhost:4300/',
  partless: 'Nothing to narrow.',
  modes: [{ id: 'main', label: 'Main' }],
  ...extra,
})

const good = {
  summary: 'Shows one list.',
  sections: [{ title: 'What it shows', points: ['The list for the picked thing.', 'Nothing else.'] }],
}

describe('the version', () => {
  test('is 2.52.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.94.0')
    expect(PROTOCOL).toBe(2)
    const changelog = readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')
    expect(changelog).toContain('## 2.52.0')
    expect(readFileSync(join(REPO, 'docs/manifest.md'), 'utf8')).toContain('### How to use a module (2.52.0)')
  })
})

describe('help in a manifest', () => {
  test('is optional: a manifest without it parses and says none', () => {
    const parsed = manifestSchema.parse(manifest())
    expect(parsed.help).toBeUndefined()
    expect(helpOf(parsed)).toBeNull()
    expect(hasHelp(parsed)).toBe(false)
  })

  test('is carried when it parses', () => {
    const parsed = manifestSchema.parse(manifest({ help: good }))
    expect(parsed.help).toEqual(good)
    expect(helpOf(parsed)).toEqual(good)
    expect(hasHelp(parsed)).toBe(true)
  })

  test('sections default to none; a summary alone is help', () => {
    expect(helpOf({ help: { summary: 'Just this.' } })).toEqual({ summary: 'Just this.', sections: [] })
  })

  test('one that does not parse is dropped whole, and the manifest still parses', () => {
    const bad = [
      'text',
      { sections: good.sections },
      { summary: '' },
      { summary: 'x'.repeat(HELP_LIMITS.SUMMARY + 1) },
      { summary: 's', sections: [{ title: 't', points: [] }] },
      { summary: 's', sections: [{ title: 'x'.repeat(HELP_LIMITS.TITLE + 1), points: ['p'] }] },
      { summary: 's', sections: [{ title: 't', points: ['x'.repeat(HELP_LIMITS.POINT + 1)] }] },
      { summary: 's', sections: [{ title: 't', points: Array(HELP_LIMITS.POINTS + 1).fill('p') }] },
      { summary: 's', sections: Array(HELP_LIMITS.SECTIONS + 1).fill({ title: 't', points: ['p'] }) },
      { summary: 's', sections: [{ title: 't', points: [{ html: '<b>no</b>' }] }] },
    ]
    for (const help of bad) {
      const parsed = manifestSchema.parse(manifest({ help }))
      expect(parsed.help).toBeUndefined()
      expect(helpOf({ help })).toBeNull()
    }
  })

  test('the limits hold together under the manifest size', () => {
    const most = HELP_LIMITS.SUMMARY + HELP_LIMITS.SECTIONS * (HELP_LIMITS.TITLE + HELP_LIMITS.POINTS * HELP_LIMITS.POINT)
    expect(most).toBeLessThan(64 * 1024)
    expect(helpSchema.safeParse({
      summary: 'x'.repeat(HELP_LIMITS.SUMMARY),
      sections: Array(HELP_LIMITS.SECTIONS).fill({ title: 't'.repeat(HELP_LIMITS.TITLE), points: Array(HELP_LIMITS.POINTS).fill('p'.repeat(HELP_LIMITS.POINT)) }),
    }).success).toBe(true)
  })
})

describe('helpOf reads it as plain text', () => {
  test('every string is one line: breaks, control, bidi and zero-width characters become one space', () => {
    const help = helpOf({
      help: {
        summary: 'One\nline‮ here',
        sections: [{ title: 'A\ttitle', points: ['first\r\nsecond', 'zero​width'] }],
      },
    })
    expect(help).toEqual({ summary: 'One line here', sections: [{ title: 'A title', points: ['first second', 'zero width'] }] })
  })

  test('markup stays text: nothing is stripped or interpreted', () => {
    const help = helpOf({ help: { summary: '<a href="x">link</a>', sections: [{ title: '**t**', points: ['[x](http://y)'] }] } })
    expect(help?.summary).toBe('<a href="x">link</a>')
    expect(help?.sections[0]?.points[0]).toBe('[x](http://y)')
  })

  test('a point left empty by flattening is dropped, and a section with no points with it', () => {
    const help = helpOf({ help: { summary: 's', sections: [{ title: 't', points: ['​'] }, { title: 'u', points: ['p', '‎'] }] } })
    expect(help).toEqual({ summary: 's', sections: [{ title: 'u', points: ['p'] }] })
    expect(helpOf({ help: { summary: '​' } })).toBeNull()
  })

  test('null and undefined manifests say none', () => {
    expect(helpOf(null)).toBeNull()
    expect(helpOf(undefined)).toBeNull()
  })
})
