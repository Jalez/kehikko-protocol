import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import {
  INTRO_LIMITS,
  INTRO_MOTIONS,
  INTRO_TONES,
  INTRO_VIEW,
  PACKAGE_VERSION,
  PROTOCOL,
  hasIntro,
  introOf,
  introSchema,
  introSeconds,
  manifestSchema,
} from '../src/index.js'

/**
 * 2.57.0: `intro`, a module's own short introduction as slides a host shows in its introduction
 * dialog. Plain text, bounded, pictures as shapes the host draws; dropped whole when it does not
 * parse, a bad picture dropped on its own.
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

const art = {
  label: 'a list filling in',
  shapes: [
    { kind: 'pane', x: 40, y: 16, w: 240, h: 118 },
    { kind: 'rows', x: 56, y: 40, widths: [160, 120], gap: 16, motion: 'rise', delay: 0.3 },
    { kind: 'dot', x: 48, y: 42, r: 3, tone: 'ok', motion: 'pulse' },
    { kind: 'box', x: 200, y: 110, w: 60, h: 16, round: 8, tone: 'strong' },
    { kind: 'line', x: 10, y: 10, x2: 300, y2: 10, dashed: true },
    { kind: 'text', x: 160, y: 140, text: 'Run', middle: true, mono: true, size: 9 },
    { kind: 'pointer', x: 230, y: 118, motion: 'pop', delay: 1 },
  ],
}

const good = {
  slides: [
    { title: 'One list', body: 'Everything that still needs doing.', art },
    { title: 'Tick it', body: 'Press a line to tick it.' },
  ],
}

describe('the version', () => {
  test('is 2.57.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.88.0')
    expect(PROTOCOL).toBe(2)
    const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')) as { version: string }
    expect(pkg.version).toBe('2.88.0')
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.57.0')
    expect(readFileSync(join(REPO, 'docs/manifest.md'), 'utf8')).toContain("### A module's introduction (2.57.0)")
  })
})

describe('intro in a manifest', () => {
  test('is optional: a manifest without it parses and has none', () => {
    const parsed = manifestSchema.parse(manifest())
    expect(parsed.intro).toBeUndefined()
    expect(introOf(parsed)).toBeNull()
    expect(hasIntro(parsed)).toBe(false)
  })

  test('is carried when it parses, every shape kind included', () => {
    const parsed = manifestSchema.parse(manifest({ intro: good }))
    expect(parsed.intro).toEqual(good as never)
    expect(introOf(parsed)).toEqual(good as never)
    expect(hasIntro(parsed)).toBe(true)
  })

  test('one that does not parse is dropped whole, and the manifest still parses', () => {
    for (const bad of [
      { slides: [] },
      { slides: Array.from({ length: INTRO_LIMITS.SLIDES + 1 }, () => ({ title: 't', body: 'b' })) },
      { slides: [{ title: 'x'.repeat(INTRO_LIMITS.TITLE + 1), body: 'b' }] },
      { slides: [{ title: 't', body: 'x'.repeat(INTRO_LIMITS.BODY + 1) }] },
      { slides: [{ title: '   ', body: 'b' }] },
      { slides: [{ title: 't' }] },
      'slides',
      true,
    ]) {
      const parsed = manifestSchema.parse(manifest({ intro: bad }))
      expect(parsed.intro).toBeUndefined()
      expect(introOf({ intro: bad })).toBeNull()
    }
  })

  test('a picture that does not parse is dropped on its own; the slide keeps its words', () => {
    for (const badArt of [
      { label: 'x', shapes: [] },
      { label: 'x', shapes: [{ kind: 'svg', markup: '<script/>' }] },
      { label: 'x', shapes: [{ kind: 'pane', x: 0, y: 0, w: 10, h: 10, html: '<b>no</b>' }] },
      { label: 'x', shapes: [{ kind: 'pane', x: 0, y: 0, w: 10, h: 10, tone: '#ff0000' }] },
      { label: 'x', shapes: [{ kind: 'pane', x: 0, y: 0, w: 10, h: 10, motion: 'explode' }] },
      { label: 'x', shapes: [{ kind: 'pane', x: 0, y: INTRO_VIEW.height + 1, w: 10, h: 10 }] },
      { label: 'x', shapes: [{ kind: 'dot', x: 1, y: 1, r: 2, delay: INTRO_LIMITS.DELAY + 1 }] },
      { label: 'x', shapes: [{ kind: 'text', x: 1, y: 1, text: 'x'.repeat(INTRO_LIMITS.TEXT + 1) }] },
      { label: 'x', shapes: Array.from({ length: INTRO_LIMITS.SHAPES + 1 }, () => ({ kind: 'dot', x: 1, y: 1, r: 1 })) },
      { shapes: [{ kind: 'dot', x: 1, y: 1, r: 1 }] },
    ]) {
      const read = introOf({ intro: { slides: [{ title: 'T', body: 'B', art: badArt }] } })
      expect(read).toEqual({ slides: [{ title: 'T', body: 'B' }] })
    }
  })

  test('every string comes out as one line of plain text', () => {
    const read = introOf({
      intro: {
        slides: [
          {
            title: 'One\nlist‮',
            body: 'Line one\r\nline two​',
            art: { label: 'a\nb', shapes: [{ kind: 'text', x: 1, y: 1, text: 'Go\tnow' }] },
          },
        ],
      },
    })!
    const slide = read.slides[0]!
    for (const said of [slide.title, slide.body, slide.art!.label, (slide.art!.shapes[0] as { text: string }).text]) {
      expect(said).not.toMatch(/[\n\r\t‮​]/)
    }
    expect(slide.title).toBe('One list')
  })

  test('a slide left empty by flattening is dropped; none left is no intro', () => {
    expect(introOf({ intro: { slides: [{ title: '​', body: 'b' }, { title: 'T', body: 'B' }] } })).toEqual({
      slides: [{ title: 'T', body: 'B' }],
    })
    expect(introOf({ intro: { slides: [{ title: '​', body: 'b' }] } })).toBeNull()
  })

  test('the sets are what the docs say', () => {
    expect(INTRO_VIEW).toEqual({ width: 320, height: 150 })
    expect([...INTRO_TONES]).toEqual(['card', 'muted', 'faint', 'text', 'strong', 'ok', 'busy', 'warn', 'danger'])
    expect(Object.keys(INTRO_MOTIONS)).toEqual(['pop', 'rise', 'draw', 'drop', 'pulse', 'blink', 'ping', 'narrow', 'chip', 'fill', 'spin'])
    expect(introSchema.safeParse(good).success).toBe(true)
  })

  test('introSeconds says about how long, in fives, at least five', () => {
    expect(introSeconds({ slides: [{ title: 'a', body: 'b' }] })).toBe(5)
    const five = { slides: Array.from({ length: 5 }, () => ({ title: 'A short title', body: 'A sentence of about ten words that says what this does.' })) }
    expect(introSeconds(five)).toBe(25)
  })
})

describe('intro.json, read without running the module', () => {
  test('is named once and read like the manifest field', async () => {
    const { INTRO_FILE, INTRO_FILE_BYTES, introFromFile } = await import('../src/index.js')
    expect(INTRO_FILE).toBe('intro.json')
    expect(introFromFile(JSON.stringify(good))).toEqual(good as never)
    expect(introFromFile(null)).toBeNull()
    expect(introFromFile('')).toBeNull()
    expect(introFromFile('{not json')).toBeNull()
    expect(introFromFile(JSON.stringify({ slides: [] }))).toBeNull()
    expect(introFromFile(' '.repeat(INTRO_FILE_BYTES + 1))).toBeNull()
  })
})
