import { describe, expect, test } from 'bun:test'

import {
  CITE_MARKER,
  CITE_STATUSES,
  findQuote,
  linesOf,
  markersIn,
  normaliseQuote,
  parseSource,
  replaceMarkers,
  resolveSource,
  serialiseSource,
  uncitable,
  type CitationView,
  type CitedSource,
} from '../src/index.js'

/**
 * Citations (0.33.0): the source line two modules write, and the one rule for
 * finding its words again.
 *
 * These were Slides' tests (`deck/cite.ts`, `deck/format.ts`) and Learning's
 * copy of them. They are here because the functions are: a slide and a quiz
 * question cite a paper in one syntax and get one of the same four answers, and
 * two copies of the rule is two rules the first time one is edited.
 */

describe('a source line', () => {
  test('is a label, a path and the quoted words', () => {
    expect(parseSource('[^1]: chapters/4.tex | "The mean rating was highest."')).toEqual({
      label: '1',
      path: 'chapters/4.tex',
      quote: 'The mean rating was highest.',
    })
  })

  test('a quote may hold | and " — the path ends at the first bar, the quote at the last quote mark', () => {
    expect(parseSource('[^a]: ch.tex | "a | b "c" d"')).toEqual({ label: 'a', path: 'ch.tex', quote: 'a | b "c" d' })
  })

  test('space around the bar, the path and the end of the line is not part of anything', () => {
    expect(parseSource('[^n_1-x]:   a dir/ch.tex   |   " padded "   ')).toEqual({ label: 'n_1-x', path: 'a dir/ch.tex', quote: 'padded' })
  })

  test('what is not one is null: no bar, no quote marks, an empty quote, a label too long, a marker', () => {
    expect(parseSource('see chapter four')).toBeNull()
    expect(parseSource('[^1]: ch.tex "words"')).toBeNull()
    expect(parseSource('[^1]: ch.tex | words')).toBeNull()
    expect(parseSource('[^1]: ch.tex | "  "')).toBeNull()
    expect(parseSource(`[^${'x'.repeat(21)}]: ch.tex | "words"`)).toBeNull()
    expect(parseSource('[^1]')).toBeNull()
    expect(parseSource(' [^1]: ch.tex | "words"')).toBeNull()
  })

  test('is written the way it is read', () => {
    const source: CitedSource = { label: '2', path: 'chapters/4.tex', quote: 'a | b "c" d' }
    expect(serialiseSource(source)).toBe('[^2]: chapters/4.tex | "a | b "c" d"')
    expect(parseSource(serialiseSource(source))).toEqual(source)
  })
})

describe('a source that cannot be written as a line', () => {
  const quote = 'words'
  test('a path that is empty, has a bar or a line break', () => {
    expect(uncitable({ path: '', quote })).toContain('empty')
    expect(uncitable({ path: 'a|b.tex', quote })).toContain('|')
    expect(uncitable({ path: 'a\nb.tex', quote })).toContain('line break')
  })

  test('a path that is not relative to the project and inside it', () => {
    for (const path of ['/etc/passwd', 'C:/x.tex', '../a.tex', 'a/../../b.tex']) expect(uncitable({ path, quote })).toContain('inside it')
    expect(uncitable({ path: 'a..b/c.tex', quote })).toBeNull()
  })

  test('a quote that is empty, or more than one line', () => {
    expect(uncitable({ path: 'a.tex', quote: '  ' })).toContain('exact words')
    expect(uncitable({ path: 'a.tex', quote: 'one\ntwo' })).toContain('one line')
  })

  test('and null for one that can', () => {
    expect(uncitable({ path: 'chapters/4.tex', quote: 'The mean rating was highest.' })).toBeNull()
  })
})

describe('markers', () => {
  test('are the labels a text names, in order, each once', () => {
    expect(markersIn('a[^1] b[^two] c[^1][^3]')).toEqual(['1', 'two', '3'])
    expect(markersIn('nothing here')).toEqual([])
  })

  test('a source line is not a marker', () => {
    expect(markersIn('[^1]: ch.tex | "words"')).toEqual([])
    expect(markersIn('x[^1]\n[^1]: ch.tex | "words"')).toEqual(['1'])
  })

  test('code is read like any other text, unless asked to be skipped', () => {
    const text = 'a[^1] `b[^2]` c[^3][^1]\n```\nd[^4]\n```'
    expect(markersIn(text)).toEqual(['1', '2', '3', '4'])
    expect(markersIn(text, { skipCode: true })).toEqual(['1', '3'])
    /* A fence nobody closed is code to the end. */
    expect(markersIn('a[^1]\n```\nb[^2]', { skipCode: true })).toEqual(['1'])
  })

  test('can be replaced, leaving code alone when asked', () => {
    expect(replaceMarkers('a[^1] `b[^2]`', (label) => `<${label}>`)).toBe('a<1> `b<2>`')
    expect(replaceMarkers('a[^1] `b[^2]`', (label) => `<${label}>`, { skipCode: true })).toBe('a<1> `b[^2]`')
    expect(replaceMarkers('a[^1] b[^2]', () => '')).toBe('a b')
  })

  test('the pattern is global, and the functions leave it where they found it', () => {
    expect(CITE_MARKER.global).toBe(true)
    markersIn('a[^1] b[^2]')
    replaceMarkers('a[^1]', () => '')
    expect(CITE_MARKER.lastIndex).toBe(0)
    expect('Which half? [^1]'.replace(CITE_MARKER, '').trim()).toBe('Which half?')
  })
})

describe('a quote, as it is compared', () => {
  test('one space between runs of whitespace, and no ends', () => {
    expect(normaliseQuote('  The mean\n   rating\twas  highest ')).toBe('The mean rating was highest')
    expect(normaliseQuote(' \n ')).toBe('')
  })
})

const FILE = 'Intro.\n\nThe mean rating was highest after the\nvanilla-JavaScript module (3.51). It fell — after React.\nThe end. The end.\n'

describe('finding a quote', () => {
  test('across a line break, as UTF-8 byte offsets, with its lines', () => {
    const { count, at } = findQuote(FILE, 'The mean rating was highest after the vanilla-JavaScript module (3.51).')
    expect(count).toBe(1)
    expect(at).toEqual({ from: 8, to: 79, line: 3, endLine: 4 })
    expect(new TextDecoder().decode(new TextEncoder().encode(FILE).subarray(8, 79))).toBe(
      'The mean rating was highest after the\nvanilla-JavaScript module (3.51).',
    )
  })

  test('whitespace in the quote matches any whitespace in the file, and nothing else is forgiven', () => {
    expect(findQuote(FILE, 'highest   after\nthe\tvanilla-JavaScript').count).toBe(1)
    expect(findQuote(FILE, 'the mean rating').count).toBe(0)
    expect(findQuote(FILE, 'module 3.51').count).toBe(0)
    expect(findQuote(FILE, 'highestafter').count).toBe(0)
  })

  test('counts bytes, not characters, after a multi-byte character', () => {
    const at = findQuote(FILE, 'after React.').at!
    const before = FILE.slice(0, FILE.indexOf('after React.'))
    expect(at.from).toBe(new TextEncoder().encode(before).length)
    expect(at.from).toBe(FILE.indexOf('after React.') + 2)
    expect(at.to - at.from).toBe('after React.'.length)
  })

  test('more than once: counted, and the range is the first', () => {
    const { count, at } = findQuote(FILE, 'The end.')
    expect(count).toBe(2)
    expect(at).toMatchObject({ line: 5, endLine: 5 })
    expect(at!.from).toBe(new TextEncoder().encode(FILE.slice(0, FILE.indexOf('The end.'))).length)
  })

  test('regular-expression characters in a quote are words', () => {
    expect(findQuote('a (3.51) b', '(3.51)').count).toBe(1)
    expect(findQuote('a 3x51 b', '3.51').count).toBe(0)
    expect(findQuote('a [x]* $1 \\n b', '[x]* $1 \\n').count).toBe(1)
  })

  test('an empty quote is found nowhere', () => {
    expect(findQuote(FILE, '   ')).toEqual({ count: 0, at: null })
  })
})

describe('the four answers', () => {
  const source = (quote: string): CitedSource => ({ label: '1', path: 'a.tex', quote })

  test('holds, ambiguous, adrift, unreadable — and there is no fifth', () => {
    expect(resolveSource(source('It fell'), FILE)).toMatchObject({ status: 'holds', count: 1 })
    expect(resolveSource(source('The end.'), FILE)).toMatchObject({ status: 'ambiguous', count: 2 })
    expect(resolveSource(source('It rose'), FILE)).toEqual({ ...source('It rose'), status: 'adrift', at: null, count: 0 })
    expect(resolveSource(source('It fell'), null)).toEqual({ ...source('It fell'), status: 'unreadable', at: null, count: 0 })
    expect([...CITE_STATUSES]).toEqual(['holds', 'ambiguous', 'adrift', 'unreadable'])
  })

  test('the view carries the source it was asked about, as written', () => {
    const view: CitationView = resolveSource({ label: 'x', path: 'chapters/4.tex', quote: 'It  fell' }, FILE)
    expect(view).toEqual({ label: 'x', path: 'chapters/4.tex', quote: 'It  fell', status: 'holds', count: 1, at: view.at })
    expect(view.at).toMatchObject({ line: 4, endLine: 4 })
  })

  test('an ambiguous one still has a range: the first', () => {
    expect(resolveSource(source('The end.'), FILE).at).not.toBeNull()
  })
})

describe('the lines of a range', () => {
  test('one line, or the first and the last', () => {
    expect(linesOf({ line: 31, endLine: 31 })).toBe('line 31')
    expect(linesOf({ line: 31, endLine: 33 })).toBe('lines 31–33')
    expect(linesOf(findQuote(FILE, 'highest after the vanilla-JavaScript').at!)).toBe('lines 3–4')
  })
})
