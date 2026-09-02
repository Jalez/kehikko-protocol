import { describe, expect, test } from 'bun:test'
import {
  CAPABILITIES,
  LIMITS,
  METHODS,
  REACTS_TO,
  containerSchema,
  contextSchema,
  methodParams,
  showingSchema,
} from '../src/index.js'

/**
 * `context.containers`, `showing.set`, and the word a manifest ticks for them.
 *
 * The sentence this exists for is the user's: "multiple things in kehikko that
 * can have a checklist ... we should be able to show both items checklists.
 * And if user selects x number of the modules then we should only show those
 * modules checklist." Two facts — what each container shows, which are picked
 * out — and these tests are what the shapes of both promise.
 */

const file = { path: '/Users/x/thesis/chapters/3_methods.tex', page: null, from: null, to: null, quoted: '' }

describe('what a container says it is showing', () => {
  test('refs and places, and nothing is required on the way out', () => {
    const nothing = showingSchema.parse({})
    expect(nothing).toEqual({ refs: [], documents: [] })
    const some = showingSchema.parse({ refs: ['gh#105'], documents: [file] })
    expect(some.refs).toEqual(['gh#105'])
    expect(some.documents[0]?.path).toBe(file.path)
  })

  test('a place is a passage, held to the passage rules', () => {
    /* One definition, read by both sides. A half-range is a malformed answer
       here for the same reason it is one in `passage`. */
    const half = { ...file, from: 10 }
    expect(showingSchema.safeParse({ documents: [half] }).success).toBe(false)
    const backwards = { ...file, from: 40, to: 10 }
    expect(showingSchema.safeParse({ documents: [backwards] }).success).toBe(false)
  })

  test('both lists are bounded, at the numbers the essays name', () => {
    const refs = Array.from({ length: LIMITS.REFS + 1 }, (_, i) => `gh#${i}`)
    expect(showingSchema.safeParse({ refs }).success).toBe(false)
    const documents = Array.from({ length: LIMITS.SHOWING_DOCUMENTS + 1 }, () => file)
    expect(showingSchema.safeParse({ documents }).success).toBe(false)
    expect(LIMITS.SHOWING_DOCUMENTS).toBe(16)
  })
})

describe('one container on the kehikko', () => {
  test('names a module, says whether it is picked out, and says what it shows', () => {
    const row = containerSchema.parse({ module: 'roadmap.paper', selected: true, showing: { documents: [file] } })
    expect(row.selected).toBe(true)
    expect(row.showing.documents).toHaveLength(1)
    expect(row.showing.refs).toEqual([])
  })

  test('a container that has said nothing is still a row, with showing empty rather than absent', () => {
    /* "Journeys is picked out and has said nothing about what it shows" is a
       sentence a consumer has to be able to print, and it cannot print it about
       a row that is not there. */
    const quiet = containerSchema.parse({ module: 'roadmap.journeys' })
    expect(quiet.selected).toBe(false)
    expect(quiet.showing).toEqual({ refs: [], documents: [] })
  })

  test('the module id is held to the same shape it is held to everywhere', () => {
    expect(containerSchema.safeParse({ module: 'Not A Module' }).success).toBe(false)
  })
})

describe('the context carries every container, and defaults to none', () => {
  test('a module reading an older host finds an empty list, which is the true answer there', () => {
    const told = contextSchema.parse({})
    expect(told.containers).toEqual([])
  })

  test('the list is the host\'s, in the host\'s order, and bounded', () => {
    const told = contextSchema.parse({
      containers: [
        { module: 'roadmap.paper', selected: true, showing: { documents: [file] } },
        { module: 'roadmap.checklist' },
      ],
    })
    expect(told.containers.map((c) => c.module)).toEqual(['roadmap.paper', 'roadmap.checklist'])
    const many = Array.from({ length: LIMITS.CONTAINERS + 1 }, (_, i) => ({ module: `roadmap.m${i}` }))
    expect(contextSchema.safeParse({ containers: many }).success).toBe(false)
  })

  test('an older schema would strip it, so an older module is the module it was', () => {
    /* The compatibility story in one assertion: a `z.object` strips what it
       does not name, so a module holding the previous copy of this package
       never sees the field. Modelled with the schema minus the field. */
    const older = contextSchema.omit({ containers: true })
    const parsed = older.parse({ containers: [{ module: 'roadmap.paper' }] }) as Record<string, unknown>
    expect(parsed).not.toHaveProperty('containers')
  })
})

describe('showing.set — a container describing itself', () => {
  test('it is a method under a shared capability, and the sentence says every module is told', () => {
    expect(METHODS['showing.set']).toBe('showing:set')
    expect(CAPABILITIES['showing:set']).toContain('Every module on the canvas is told')
  })

  test('both lists are required on the way in, so a withdrawn half cannot be mistaken for an unchanged one', () => {
    const schema = methodParams['showing.set']
    expect(schema.safeParse({ refs: [], documents: [] }).success).toBe(true)
    expect(schema.safeParse({ refs: ['gh#1'] }).success).toBe(false)
    expect(schema.safeParse({ documents: [file] }).success).toBe(false)
    expect(schema.safeParse({}).success).toBe(false)
  })

  test('it is held to the wire\'s own bounds, so nothing accepted here is dropped on the way out', () => {
    const schema = methodParams['showing.set']
    const refs = Array.from({ length: LIMITS.REFS + 1 }, (_, i) => `gh#${i}`)
    expect(schema.safeParse({ refs, documents: [] }).success).toBe(false)
    expect(schema.safeParse({ refs: [], documents: [{ ...file, from: 3 }] }).success).toBe(false)
  })
})

describe('the word a manifest ticks for it', () => {
  test('containers is a reaction, paired by a registry with showing:set', () => {
    expect(REACTS_TO).toHaveProperty('containers')
    expect(REACTS_TO.containers).toContain('picked out')
  })
})
