import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  JOURNEYS_FILE,
  JOURNEYS_MODULE,
  journeyIn,
  journeyRecordSchema,
  journeySlugs,
  journeyStepSchema,
  journeysDocumentSchema,
  moduleFile,
  partInFocus,
  stepPart,
  stepsOf,
  type EpicPart,
} from '../src/index.js'
import { readJourney, readJourneys } from '../src/serve/index.js'

/**
 * An epic's steps and groups as a project keeps them: one shape, read by the
 * program that writes it and by a host that does not.
 *
 * What is held here: that a record written before parts existed reads as it
 * always did; that `part` and a group's `id` are carried; that NOTHING a
 * newer writer added is dropped on the way through; that a reader asked about
 * one epic is not refused over another; that an empty `steps` beside
 * `stepsFrom` is never reported as "none"; and that every way of there being
 * no file is null rather than a throw.
 */

/* A record the way the Journeys module has always written one: every field
   its own schema knows, including the ones this package does not model. */
const asWritten = {
  slug: 'the-posting-seam',
  title: 'The posting seam',
  lede: 'One place a comment is posted from.',
  umbrella: 'gh#1',
  written: '2026-09-01',
  project: 'Kehikot',
  callout: '',
  steps: [
    { title: 'Post through one function', body: 'So there is one.', refs: ['gh#2', 'gh#3'], notes: ['ingest already built'] },
    { title: 'Retire the second path', body: '', refs: [], notes: [] },
  ],
  exists: ['The tracker reading'],
  missing: '',
  order: [{ when: 'first', what: 'gh#2', why: '' }],
  open: ['Who retries?'],
  quizzes: [],
  vocabulary: [{ term: 'seam', means: 'where two things meet' }],
  blockedBy: { 'gh#3': ['gh#2'] },
  settledBy: {},
  containers: [],
  people: [],
  owners: {},
  groups: [{ heading: 'The agent seam', refs: ['gh#2'] }],
  watch: ['gh#9'],
}

const document = { version: 1, journeys: { 'the-posting-seam': asWritten } }

describe('the record for one epic', () => {
  test('is read whole out of a document written before parts existed', () => {
    const record = journeyIn(document, 'the-posting-seam')
    expect(record).toEqual(asWritten)
  })

  test('carries a step’s part and a group’s id', () => {
    const withParts = {
      ...asWritten,
      steps: [{ ...asWritten.steps[0], part: 'the-agent-seam' }, asWritten.steps[1]],
      groups: [{ id: 'the-agent-seam', heading: 'The agent seam', refs: ['gh#2'] }],
    }
    const record = journeyIn({ version: 1, journeys: { 'the-posting-seam': withParts } }, 'the-posting-seam')
    expect(record?.steps[0]?.part).toBe('the-agent-seam')
    expect(record?.steps[1]?.part).toBeUndefined()
    expect(record?.groups[0]?.id).toBe('the-agent-seam')
  })

  /* The promise the whole shape rests on. A writer that parsed with a schema
     which stripped what it did not know would delete it from the file. */
  test('drops nothing a newer writer added, at any level', () => {
    const newer = {
      version: 7,
      addedToTheDocument: true,
      journeys: {
        'the-posting-seam': {
          ...asWritten,
          addedToTheRecord: { deep: [1, 2] },
          steps: [{ title: 'A step', addedToTheStep: 'kept' }],
          groups: [{ heading: 'A group', refs: [], addedToTheGroup: 3 }],
          stepsFrom: { projector: 'paper', where: 'paper/main.tex', addedToStepsFrom: 'kept' },
        },
      },
    }
    const record = journeyIn(newer, 'the-posting-seam')
    expect(record?.addedToTheRecord).toEqual({ deep: [1, 2] })
    expect(record?.steps[0]?.addedToTheStep).toBe('kept')
    expect(record?.groups[0]?.addedToTheGroup).toBe(3)
    expect(record?.stepsFrom?.addedToStepsFrom).toBe('kept')
    /* And what the Learning module keeps beside the steps comes through too. */
    expect(record?.vocabulary).toEqual(asWritten.vocabulary)

    const whole = journeysDocumentSchema.parse(newer)
    expect(whole.version).toBe(7)
    expect(whole.addedToTheDocument).toBe(true)
    expect(whole.journeys['the-posting-seam']?.addedToTheRecord).toEqual({ deep: [1, 2] })
  })

  test('fills in what a short record leaves out, and nothing else', () => {
    const record = journeyIn({ journeys: { short: { slug: 'short', title: 'Short' } } }, 'short')
    expect(record).toEqual({ slug: 'short', title: 'Short', lede: '', steps: [], groups: [], exists: [], open: [] })
    expect(journeyStepSchema.parse({ title: 'A step' })).toEqual({ title: 'A step', body: '', refs: [], notes: [] })
  })

  test('is null for an unknown slug, a slug that is not one, and a document that is not one', () => {
    expect(journeyIn(document, 'no-such-epic')).toBeNull()
    expect(journeyIn(document, '../../etc/passwd')).toBeNull()
    expect(journeyIn(document, '')).toBeNull()
    expect(journeyIn(document, 7 as unknown as string)).toBeNull()
    for (const not of [null, undefined, 'a string', 7, [], {}, { journeys: null }, { journeys: [] }, { journeys: 'x' }]) {
      expect(journeyIn(not, 'the-posting-seam')).toBeNull()
    }
  })

  /* `constructor` matches `EPIC_SLUG`. The lookup asks the object. */
  test('asks the document and never its prototype', () => {
    expect(journeyIn(document, 'constructor')).toBeNull()
    expect(journeyIn(document, 'valueof')).toBeNull()
    expect(journeyIn({ journeys: Object.create({ inherited: { slug: 'inherited', title: 'No' } }) }, 'inherited')).toBeNull()
  })

  test('is null for a record that will not parse, and still reads the one beside it', () => {
    const mixed = {
      version: 1,
      journeys: {
        'the-posting-seam': asWritten,
        broken: { slug: 'broken', title: 'Broken', steps: [{ body: 'a step nobody titled' }] },
        untitled: { slug: 'untitled' },
        'not-an-object': 'text',
      },
    }
    expect(journeyIn(mixed, 'broken')).toBeNull()
    expect(journeyIn(mixed, 'untitled')).toBeNull()
    expect(journeyIn(mixed, 'not-an-object')).toBeNull()
    expect(journeyIn(mixed, 'the-posting-seam')).toEqual(asWritten)
    expect(journeySlugs(mixed)).toEqual(['the-posting-seam'])
    /* The writer's schema is the strict one: it refuses the whole document. */
    expect(journeysDocumentSchema.safeParse(mixed).success).toBe(false)
  })

  test('is not handed over under a key it does not call itself', () => {
    expect(journeyIn({ journeys: { filed: { slug: 'named', title: 'Two names' } } }, 'filed')).toBeNull()
    expect(journeyIn({ journeys: { filed: { slug: 'named', title: 'Two names' } } }, 'named')).toBeNull()
  })

  /* One hand-edited `part` with a capital in it must not cost the record. */
  test('reads a record whose step names something that is not a part id', () => {
    const record = journeyIn(
      { journeys: { odd: { slug: 'odd', title: 'Odd', steps: [{ title: 'A', part: 'Not An Id' }], groups: [{ id: '../x' }] } } },
      'odd',
    )
    expect(record?.steps[0]?.part).toBe('Not An Id')
    expect(stepPart(record?.steps[0])).toBeNull()
    expect(record?.groups[0]).toEqual({ id: '../x', heading: '', refs: [] })
  })

  test('takes no bound from the wire: a long title is somebody’s title', () => {
    const long = 'x'.repeat(5000)
    expect(journeyRecordSchema.safeParse({ slug: 'long', title: long, steps: [{ title: long }] }).success).toBe(true)
  })
})

describe('the part a step says it is in', () => {
  test('is the id, or null for anything that is not one', () => {
    expect(stepPart({ title: 'a', part: 'the-agent-seam' })).toBe('the-agent-seam')
    for (const part of [undefined, null, '', 7, 'Has Spaces', '../etc', 'x'.repeat(81)]) {
      expect(stepPart({ title: 'a', part })).toBeNull()
    }
    expect(stepPart(null)).toBeNull()
    expect(stepPart('a step')).toBeNull()
  })

  test('is what `partInFocus` is asked about', () => {
    const parts: EpicPart[] = [
      { id: 'the-agent-seam', heading: 'The agent seam', refs: [], picked: true },
      { id: 'the-tests', heading: 'The tests', refs: [], picked: false },
    ]
    expect(partInFocus(parts, stepPart({ part: 'the-agent-seam' }))).toBe(true)
    expect(partInFocus(parts, stepPart({ part: 'the-tests' }))).toBe(false)
    expect(partInFocus(parts, stepPart({}))).toBe(false)
  })
})

describe('what a record can say about its steps', () => {
  const from = { projector: 'paper', where: 'paper/main.tex', why: 'The sections are the steps.' }

  test('stored: the steps are here', () => {
    const said = stepsOf(journeyRecordSchema.parse(asWritten))
    expect(said.kind).toBe('stored')
    expect(said.kind === 'stored' && said.steps.map((s) => s.title)).toEqual([
      'Post through one function',
      'Retire the second path',
    ])
    expect(said.kind === 'stored' && said.alsoProjected).toBeNull()
  })

  test('none: nobody has written any', () => {
    expect(stepsOf(journeyRecordSchema.parse({ slug: 'new', title: 'New' }))).toEqual({ kind: 'none' })
  })

  /* The one that matters. An empty array here is "not here", never "none". */
  test('elsewhere: an empty `steps` beside `stepsFrom` is never none', () => {
    const record = journeyIn({ journeys: { paper: { slug: 'paper', title: 'A paper', steps: [], stepsFrom: from } } }, 'paper')
    expect(record?.steps).toEqual([])
    expect(stepsOf(record!)).toEqual({ kind: 'elsewhere', from })
  })

  test('stored, and also projected: the stored steps are still the answer', () => {
    const said = stepsOf(journeyRecordSchema.parse({ ...asWritten, stepsFrom: from }))
    expect(said.kind).toBe('stored')
    expect(said.kind === 'stored' && said.alsoProjected).toEqual(from)
  })
})

describe('reading the file', () => {
  function project(): string {
    return realpathSync(mkdtempSync(join(tmpdir(), 'kehikot-journeys-')))
  }
  function write(root: string, text: string): void {
    mkdirSync(join(root, '.kehikot', 'journeys'), { recursive: true })
    writeFileSync(join(root, '.kehikot', 'journeys', 'journeys.json'), text)
  }

  test('is the path every module is given for its own file', () => {
    expect(moduleFile('/p', JOURNEYS_MODULE, JOURNEYS_FILE)).toBe('/p/.kehikot/journeys/journeys.json')
  })

  test('answers the record a project keeps for an epic', () => {
    const root = project()
    write(root, JSON.stringify(document))
    expect(readJourney(root, 'the-posting-seam')).toEqual(asWritten)
    expect(readJourney(`${root}/`, 'the-posting-seam')).toEqual(asWritten)
    expect(readJourney(root, 'no-such-epic')).toBeNull()
    expect(journeySlugs(readJourneys(root))).toEqual(['the-posting-seam'])
  })

  test('is null, and does not throw, wherever there is nothing to read', () => {
    const root = project()
    /* No `.kehikot` at all: Journeys was never installed here. */
    expect(readJourneys(root)).toBeNull()
    expect(readJourney(root, 'the-posting-seam')).toBeNull()
    /* No project. */
    for (const none of [null, undefined, '', '   ']) expect(readJourneys(none)).toBeNull()
    /* Not on this machine, and not absolute. */
    expect(readJourneys(join(root, 'not-here'))).toBeNull()
    expect(readJourneys('relative/path')).toBeNull()
    /* A file that is not JSON, and JSON that is not a document. */
    write(root, '{ "version": 1, "journeys": {')
    expect(readJourneys(root)).toBeNull()
    expect(readJourney(root, 'the-posting-seam')).toBeNull()
    for (const not of ['[]', '"text"', 'null', '7', '']) {
      write(root, not)
      expect(readJourneys(root)).toBeNull()
    }
    /* A document with nothing in it is a document, and has no record. */
    write(root, '{}')
    expect(readJourneys(root)).toEqual({})
    expect(readJourney(root, 'the-posting-seam')).toBeNull()
  })

  /* One project's steps must not be answered under another's name. */
  test('does not follow a folder that points out of the project', () => {
    const elsewhere = project()
    write(elsewhere, JSON.stringify(document))
    expect(readJourney(elsewhere, 'the-posting-seam')).not.toBeNull()

    const root = project()
    mkdirSync(join(root, '.kehikot'))
    symlinkSync(join(elsewhere, '.kehikot', 'journeys'), join(root, '.kehikot', 'journeys'))
    expect(readJourneys(root)).toBeNull()

    const other = project()
    symlinkSync(join(elsewhere, '.kehikot'), join(other, '.kehikot'))
    expect(readJourneys(other)).toBeNull()
  })

  /* A project reached through a symlink is still that project. */
  test('reads a project that was itself named through a link', () => {
    const root = project()
    write(root, JSON.stringify(document))
    const link = join(project(), 'link')
    symlinkSync(root, link)
    expect(readJourney(link, 'the-posting-seam')).toEqual(asWritten)
  })
})
