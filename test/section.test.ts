import { describe, expect, test } from 'bun:test'
import { LIMITS, passageSchema, sectionSchema } from '../src/index.js'

/*
 * `passage.section` — "the reader is in this section", kept apart from
 * `from`/`to`, which keep meaning "this exact text is pointed at".
 */

describe('a passage naming a section', () => {
  test('a passage from before the field still parses, with no section', () => {
    const old = passageSchema.parse({ path: '/p/main.tex', page: 3 })
    expect(old.section).toBeNull()
    expect(old.from).toBeNull()
  })

  test('a section with its span, and no selection, is a reader in that section', () => {
    const p = passageSchema.parse({
      path: '/p/chapters/2.tex',
      page: 7,
      section: { title: 'Bridging the gap', from: 120, to: 4800 },
    })
    expect(p.section).toEqual({ title: 'Bridging the gap', from: 120, to: 4800 })
    expect(p.from).toBeNull()
  })

  test('a section named by its title alone is allowed — a link stored by title points back with it', () => {
    expect(passageSchema.parse({ path: '/p/2.tex', section: { title: 'Method' } }).section).toEqual({
      title: 'Method',
      from: null,
      to: null,
    })
  })

  test('a selection and a section can travel together', () => {
    const p = passageSchema.parse({
      path: '/p/2.tex',
      from: 300,
      to: 340,
      quoted: 'a sentence',
      section: { title: 'Method', from: 120, to: 4800 },
    })
    expect(p.from).toBe(300)
    expect(p.section?.title).toBe('Method')
  })
})

describe('what a section refuses', () => {
  test('an empty title', () => {
    expect(sectionSchema.safeParse({ title: '' }).success).toBe(false)
  })

  test('a title longer than a quote', () => {
    expect(sectionSchema.safeParse({ title: 'x'.repeat(LIMITS.QUOTE + 1) }).success).toBe(false)
  })

  test('half a span, or one that ends before it starts', () => {
    expect(sectionSchema.safeParse({ title: 'A', from: 10 }).success).toBe(false)
    expect(sectionSchema.safeParse({ title: 'A', from: 10, to: 10 }).success).toBe(false)
  })
})
