import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  DONE_OUTPUT_SCHEMA,
  DONE_STATES,
  FOLD_OUTCOMES,
  MANIFEST_KIND,
  METHODS,
  PROTOCOL,
  SHOW_OUTCOMES,
  SHOW_OUTPUT_SCHEMA,
  WELL_KNOWN,
  containerSchema,
  doneAnswer,
  doneAnswerSchema,
  doorContext,
  doorToolSchema,
  foldResult,
  manifestSchema,
  methodParams,
  resultSchemaFor,
  showAnswerSchema,
  toolEffect,
  type DoorTool,
} from '../src/index.js'
import { doorOf, listTools, readNeighbour, readNeighbours } from '../src/serve/index.js'
import { checkDoor, checkDoorSources, checkModuleDoor, saidDoor } from '../src/check/door.js'

/**
 * What a module's MCP door agrees with every other's: the subjects a manifest declares, the two
 * context arguments, the two answers a caller acts on, what a tool says it does — and how one
 * module learns another's manifest and door. Slides and Learning are the worked cases
 * (docs/asking.md).
 */

const base = {
  kind: MANIFEST_KIND,
  protocol: PROTOCOL,
  id: 'kehikot.slides',
  name: 'Slides',
  entry: '/app',
  partless: 'A deck is one thing.',
  modes: [{ id: 'slides', label: 'Slides' }],
}
const withSubjects = (subjects: unknown) => ({ ...base, mcp: { url: '/mcp', subjects } })

describe('what a manifest says its door can be asked', () => {
  test('a door with no subjects is what every door was: the list is empty', () => {
    expect(manifestSchema.parse({ ...base, mcp: { url: '/mcp' } }).mcp).toEqual({ url: '/mcp', transport: 'http', about: '', subjects: [] })
    expect(manifestSchema.parse(base).mcp).toBeUndefined()
  })

  test('Slides shows a slide; Learning answers for a question', () => {
    const slides = manifestSchema.parse(withSubjects([{ kind: 'slide', about: 'One slide of a deck.', show: 'show_slide' }]))
    expect(slides.mcp?.subjects).toEqual([{ kind: 'slide', about: 'One slide of a deck.', show: 'show_slide' }])
    const learning = manifestSchema.parse(withSubjects([{ kind: 'question', done: 'quiz_state' }]))
    expect(learning.mcp?.subjects[0]).toEqual({ kind: 'question', about: '', done: 'quiz_state' })
    /* Flows lets go with the tool it shows with. */
    expect(manifestSchema.safeParse(withSubjects([{ kind: 'flow', show: 'show_flow', release: 'show_flow' }])).success).toBe(true)
  })

  test('refuses a subject nothing can be asked about, a let-go with nothing to show, and two of a kind', () => {
    const bad = (subjects: unknown) => expect(manifestSchema.safeParse(withSubjects(subjects)).success).toBe(false)
    bad([{ kind: 'slide' }])
    bad([{ kind: 'question', done: 'quiz_state', release: 'forget' }])
    bad([{ kind: 'slide', show: 'show_slide' }, { kind: 'slide', show: 'show_other' }])
    bad([{ kind: 'A Slide', show: 'show_slide' }])
    bad([{ kind: 'slide', show: 'show slide' }])
    bad(Array.from({ length: 9 }, (_, i) => ({ kind: `k${i}`, show: 'show' })))
  })
})

describe('the context arguments', () => {
  test('are project and epic, and the spelling from before is still read', () => {
    expect(doorContext({ project: '/work/thesis', epic: 'bridge' })).toEqual({ project: '/work/thesis', epic: 'bridge', deprecated: [] })
    expect(doorContext({ projectPath: '/work/thesis' })).toEqual({ project: '/work/thesis', epic: null, deprecated: ['projectPath'] })
    /* The one spelling wins, and then the old one was not what decided. */
    expect(doorContext({ project: '/now', projectPath: '/before' })).toEqual({ project: '/now', epic: null, deprecated: [] })
    expect(doorContext({ project: '  ', epic: 7 })).toEqual({ project: null, epic: null, deprecated: [] })
  })

  test('a door that called the epic something else names it', () => {
    expect(doorContext({ project: '/p', slug: 'bridge' }, { epic: ['slug'] })).toEqual({ project: '/p', epic: 'bridge', deprecated: ['slug'] })
    expect(doorContext({ projectPath: '/p' }, { epic: ['slug'] }).project).toBeNull()
  })

  test('nothing is read off a prototype', () => {
    expect(doorContext(Object.create({ project: '/inherited' }) as Record<string, unknown>).project).toBeNull()
  })
})

describe('was it shown?', () => {
  test('three outcomes, and how many pages were pointed', () => {
    expect(SHOW_OUTCOMES).toEqual(['shown', 'unseen', 'declined'])
    expect(showAnswerSchema.parse({ outcome: 'shown', pages: 2, deck: 'intro', index: 6 })).toEqual({ outcome: 'shown', pages: 2, why: '', deck: 'intro', index: 6 })
    expect(showAnswerSchema.parse({ outcome: 'unseen' })).toEqual({ outcome: 'unseen', pages: 0, why: '' })
    expect(showAnswerSchema.safeParse({ outcome: 'seen', pages: 1 }).success).toBe(false)
    expect(showAnswerSchema.safeParse({ outcome: 'shown', pages: -1 }).success).toBe(false)
  })

  test('the outputSchema a tool lists says the same words', () => {
    expect(SHOW_OUTPUT_SCHEMA.properties.outcome.enum).toEqual([...SHOW_OUTCOMES])
    expect(Object.keys(SHOW_OUTPUT_SCHEMA.properties)).toEqual(Object.keys(showAnswerSchema.shape))
  })
})

describe('is it done?', () => {
  test('done only when there is something and all of it is', () => {
    expect(doneAnswer([])).toEqual({ done: false, items: [] })
    expect(doneAnswer([{ id: 'b13a66fc', state: 'done' }]).done).toBe(true)
    expect(doneAnswer([{ id: 'b13a66fc', state: 'done' }, { id: '5e0c1d2a', state: 'waiting' }]).done).toBe(false)
    expect(doneAnswer([{ id: 'deadbeef', state: 'unknown' }]).done).toBe(false)
  })

  test('a module’s own facts ride on each item, and a state is one of four', () => {
    const said = doneAnswer([{ id: 'b13a66fc', state: 'done' as const, right: false, attempts: 2, epic: 'bridge' }])
    expect(doneAnswerSchema.parse({ ...said, project: '/work/thesis' })).toEqual({ ...said, project: '/work/thesis' })
    expect(DONE_STATES).toEqual(['done', 'waiting', 'unavailable', 'unknown'])
    expect(doneAnswerSchema.safeParse({ done: true, items: [{ id: 'x', state: 'answered' }] }).success).toBe(false)
    expect(doneAnswerSchema.safeParse({ items: [] }).success).toBe(false)
  })

  test('the outputSchema a tool lists says the same words', () => {
    expect(DONE_OUTPUT_SCHEMA.properties.items.items.properties.state.enum).toEqual([...DONE_STATES])
    expect(Object.keys(DONE_OUTPUT_SCHEMA.properties)).toEqual(Object.keys(doneAnswerSchema.shape))
  })
})

describe('does a tool only read?', () => {
  test('read off MCP’s own annotations, where saying nothing is its own answer', () => {
    expect(toolEffect({})).toBe('unstated')
    expect(toolEffect({ annotations: {} })).toBe('unstated')
    expect(toolEffect({ annotations: { destructiveHint: false } })).toBe('unstated')
    expect(toolEffect({ annotations: { readOnlyHint: true } })).toBe('reads')
    expect(toolEffect({ annotations: { readOnlyHint: false, destructiveHint: false } })).toBe('writes')
    expect(toolEffect({ annotations: { readOnlyHint: false } })).toBe('destroys')
    expect(toolEffect({ annotations: { readOnlyHint: false, destructiveHint: true } })).toBe('destroys')
  })

  test('a listed tool keeps what this does not read', () => {
    const tool = doorToolSchema.parse({ name: 'show_slide', description: 'Turn the page.', annotations: { readOnlyHint: true, title: 'Show' } })
    expect(tool).toMatchObject({ description: 'Turn the page.', annotations: { title: 'Show' } })
  })
})

/* ------------------------------------------------------------------------ *
 * The check
 * ------------------------------------------------------------------------ */

const slidesManifest = manifestSchema.parse(withSubjects([{ kind: 'slide', show: 'show_slide' }]))
const learningManifest = manifestSchema.parse({ ...withSubjects([{ kind: 'question', done: 'quiz_state' }]), id: 'kehikot.learning' })
const project = { project: { type: 'string' } }
const tool = (name: string, over: Partial<DoorTool> = {}): DoorTool => ({ name, inputSchema: { type: 'object', properties: project }, ...over })

describe('check:door, against what a running door lists', () => {
  test('a door that says everything passes with nothing to add', () => {
    const tools = [
      tool('read_deck', { annotations: { readOnlyHint: true } }),
      tool('edit_slide', { annotations: { readOnlyHint: false, destructiveHint: false } }),
      tool('show_slide', { annotations: { readOnlyHint: true }, outputSchema: SHOW_OUTPUT_SCHEMA }),
    ]
    expect(checkDoor(slidesManifest, tools)).toEqual({ module: 'kehikot.slides', read: 'running', failures: [], notes: [] })
  })

  test('a declared tool has to exist, be read-only and say the shared answer', () => {
    expect(checkDoor(slidesManifest, []).failures).toEqual([
      'The manifest says show_slide is the tool that shows a slide, and the door lists no tool by that name.',
    ])
    const bare = checkDoor(slidesManifest, [tool('show_slide')])
    expect(bare.failures).toHaveLength(2)
    expect(bare.failures[0]).toContain('readOnlyHint: true')
    expect(bare.failures[1]).toContain('its outputSchema has no outcome or pages')
    const quiz = checkDoor(learningManifest, [tool('quiz_state', { annotations: { readOnlyHint: true }, outputSchema: { type: 'object', properties: { questions: {} } } })])
    expect(quiz.failures).toEqual([
      'quiz_state answers for a question, and its outputSchema has no done or items. Answer with DONE_OUTPUT_SCHEMA in structuredContent, so a caller reads a state and not a sentence.',
    ])
  })

  test('a tool that states nothing, and one that takes projectPath, are named — as notes', () => {
    const check = checkDoor(manifestSchema.parse({ ...base, mcp: { url: '/mcp' } }), [
      tool('notes', { inputSchema: { type: 'object', properties: { projectPath: {} } } }),
      tool('add_note', { annotations: { readOnlyHint: false, destructiveHint: false } }),
    ])
    expect(check.failures).toEqual([])
    expect(check.notes).toEqual([
      '1 of 2 tools state nothing about whether they only read: notes. A caller has to treat each as one that may delete.',
      'notes takes `projectPath`. The context argument is spelled `project`; see doorContext().',
    ])
    expect(saidDoor(check)).toStartWith('ok    kehikot.slides — its running door was asked\n      note: ')
  })

  test('a module with no door has nothing to check', () => {
    expect(checkDoor(manifestSchema.parse(base), [])).toEqual({ module: 'kehikot.slides', read: 'none', failures: [], notes: [] })
    expect(saidDoor(checkDoorSources(manifestSchema.parse(base), []))).toBe('ok    kehikot.slides — no MCP door')
  })
})

describe('check:door, from the files alone', () => {
  test('can only hint: nothing mentions readOnlyHint, a tool seems to take projectPath', () => {
    const check = checkDoorSources(slidesManifest, [
      { path: 'doors.ts', text: "inputSchema: { type: 'object', properties: { projectPath: { type: 'string' } } }" },
      { path: 'src/api.ts', text: 'const projectPath: { a: 1 } = x' },
    ])
    expect(check.read).toBe('files')
    expect(check.failures).toEqual([])
    expect(check.notes).toHaveLength(2)
    expect(check.notes[0]).toContain('no source file mentions readOnlyHint')
    expect(check.notes[1]).toStartWith('doors.ts: a tool seems to take `projectPath`')
  })

  test('says nothing about a door that states its tools and spells the project `project`', () => {
    const text = "{ name: 'read_deck', inputSchema: { properties: { project: { type: 'string' } } }, annotations: { readOnlyHint: true } }"
    expect(checkDoorSources(slidesManifest, [{ path: 'doors.ts', text }]).notes).toEqual([])
  })

  test('a directory with no manifest fails', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'kehikot-door-'))
    expect((await checkModuleDoor(empty)).failures[0]).toContain('no manifest.ts exporting a module manifest was found')
  })
})

/* ------------------------------------------------------------------------ *
 * Another module, read from the registry and asked where it answers
 * ------------------------------------------------------------------------ */

function registry(entries: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), 'kehikot-neighbours-'))
  for (const [name, value] of Object.entries(entries)) writeFileSync(join(dir, name), JSON.stringify(value))
  return dir
}

/** A fetch that serves one module: its manifest at the well-known path, its tools at /mcp. */
function serving(manifest: unknown, tools: unknown[] = []): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))
    if (url.pathname === WELL_KNOWN) return new Response(JSON.stringify(manifest), { status: 200 })
    if (url.pathname === '/mcp' && init?.method === 'POST') {
      const asked = JSON.parse(String(init.body)) as { id: number; method: string }
      if (asked.method === 'tools/list') return new Response(JSON.stringify({ jsonrpc: '2.0', id: asked.id, result: { tools } }))
    }
    return new Response('no', { status: 404 })
  }) as typeof fetch
}

describe('reading another module', () => {
  const slides = { ...withSubjects([{ kind: 'slide', show: 'show_slide' }]), reacts: ['passage'] }

  test('its name, what it reacts to, what it can be asked, and where its door is', async () => {
    const where = registry({ 'kehikot.slides.json': { url: 'http://127.0.0.1:9510', dir: '/x' } })
    const read = await readNeighbour('kehikot.slides', { registry: where, fetch: serving(slides) })
    if (!read.found) throw new Error(read.sentence)
    expect(read.origin).toBe('http://127.0.0.1:9510')
    expect(read.door).toBe('http://127.0.0.1:9510/mcp')
    expect(read.manifest.name).toBe('Slides')
    expect(read.manifest.reacts).toEqual(['passage'])
    expect(read.manifest.mcp?.subjects.map((subject) => subject.kind)).toEqual(['slide'])
  })

  test('says which of three things is wrong, in a sentence, and never throws', async () => {
    const where = registry({
      'kehikot.slides.json': { url: 'http://127.0.0.1:9510' },
      'kehikot.notes.json': { url: 'http://127.0.0.1:9511' },
      'kehikot.broken.json': { url: 'not a url' },
    })
    const options = { registry: where, fetch: serving(slides) }
    expect(await readNeighbour('kehikot.flows', options)).toEqual({ found: false, id: 'kehikot.flows', why: 'unregistered', sentence: 'kehikot.flows is not registered on this computer.' })
    expect(await readNeighbour('../etc/passwd', options)).toMatchObject({ found: false, why: 'unregistered' })
    expect(await readNeighbour('kehikot.broken', options)).toMatchObject({ found: false, why: 'unregistered' })
    /* Something else answers where Notes is registered: the registration is a hint, the answer is the fact. */
    expect(await readNeighbour('kehikot.notes', options)).toEqual({ found: false, id: 'kehikot.notes', why: 'unreadable', sentence: 'http://127.0.0.1:9511 is kehikot.slides, not kehikot.notes.' })
    const down = (() => Promise.reject(new Error('refused'))) as unknown as typeof fetch
    expect(await readNeighbour('kehikot.slides', { registry: where, fetch: down })).toMatchObject({ found: false, why: 'silent' })
    expect(await readNeighbour('kehikot.slides', { registry: where, fetch: serving({ hello: 'world' }) })).toMatchObject({ found: false, why: 'unreadable' })
  })

  test('every registered module, in id order, leaving out the one asking', async () => {
    const where = registry({
      'kehikot.slides.json': { url: 'http://127.0.0.1:9510' },
      'roadmap.slides.json': { url: 'http://127.0.0.1:9510' },
      'kehikot.learning.json': { url: 'http://127.0.0.1:9512' },
      'kehikot.screenplay.json': { url: 'http://127.0.0.1:9513' },
      'notes.txt': 'not a registration',
    })
    const all = await readNeighbours({ registry: where, fetch: serving(slides), except: 'kehikot.screenplay' })
    expect(all.map((one) => [one.id, one.found])).toEqual([['kehikot.learning', false], ['kehikot.slides', true]])
    expect(await readNeighbours({ registry: join(where, 'nowhere') })).toEqual([])
  })

  test('a door is only one over HTTP on the module’s own origin', () => {
    const origin = 'http://127.0.0.1:9510'
    expect(doorOf({ mcp: { url: '/mcp', transport: 'http', about: '', subjects: [] } }, origin)).toBe('http://127.0.0.1:9510/mcp')
    expect(doorOf({ mcp: { url: 'http://evil.example/mcp', transport: 'http', about: '', subjects: [] } }, origin)).toBeNull()
    expect(doorOf({ mcp: { url: 'bin/mcp', transport: 'stdio', about: '', subjects: [] } }, origin)).toBeNull()
    expect(doorOf({ mcp: undefined }, origin)).toBeNull()
  })

  test('the tools a door lists, or null when it lists none', async () => {
    const tools = [{ name: 'show_slide', annotations: { readOnlyHint: true }, outputSchema: SHOW_OUTPUT_SCHEMA }]
    const listed = await listTools('http://127.0.0.1:9510/mcp', { fetch: serving(slides, tools) })
    expect(listed?.map((one) => [one.name, toolEffect(one)])).toEqual([['show_slide', 'reads']])
    expect(await listTools('http://127.0.0.1:9510/elsewhere', { fetch: serving(slides, tools) })).toBeNull()
  })

  test('check:door --running holds the running door to the running manifest', async () => {
    const where = registry({ 'kehikot.slides.json': { url: 'http://127.0.0.1:9510' } })
    const dir = mkdtempSync(join(tmpdir(), 'kehikot-door-module-'))
    writeFileSync(join(dir, 'manifest.ts'), `export const MANIFEST = ${JSON.stringify(slides)}\n`)
    const files = await checkModuleDoor(dir)
    expect(files.read).toBe('files')
    const bare = await checkModuleDoor(dir, { running: true, registry: where, fetch: serving(slides, [{ name: 'show_slide' }]) })
    expect(bare.read).toBe('running')
    expect(bare.failures).toHaveLength(2)
    const stopped = await checkModuleDoor(dir, { running: true, registry: join(where, 'nowhere') })
    expect(stopped.failures).toEqual(['--running: kehikot.slides is not registered on this computer. Start the module and run this again.'])
  })
})

/* ------------------------------------------------------------------------ *
 * Folding
 * ------------------------------------------------------------------------ */

describe('view.fold', () => {
  test('is a method with its own capability and a described answer', () => {
    expect(METHODS['view.fold']).toBe('view:fold')
    expect(resultSchemaFor('view.fold')).toBe(foldResult)
    expect(FOLD_OUTCOMES).toEqual(['changed', 'unchanged', 'declined', 'no-such-container'])
  })

  test('names containers to fold, to unfold, or both — never none, never one in both', () => {
    const params = methodParams['view.fold']
    expect(params.parse({ unfold: ['kehikot.learning'] })).toEqual({ fold: [], unfold: ['kehikot.learning'] })
    expect(params.safeParse({ fold: ['kehikot.notes'], unfold: ['kehikot.learning'] }).success).toBe(true)
    expect(params.safeParse({}).success).toBe(false)
    expect(params.safeParse({ fold: ['kehikot.notes'], unfold: ['kehikot.notes'] }).success).toBe(false)
    expect(params.safeParse({ fold: ['Not An Id'] }).success).toBe(false)
  })

  test('the answer lists what this call changed, which is what puts it back', () => {
    expect(foldResult.parse({ outcome: 'changed', unfolded: ['kehikot.learning'] })).toEqual({ outcome: 'changed', folded: [], unfolded: ['kehikot.learning'], why: '' })
    expect(foldResult.parse({ outcome: 'declined', why: 'The person is dragging a container.' }).folded).toEqual([])
  })

  test('a container says whether it is folded, and a host that does not say leaves it out', () => {
    expect(containerSchema.parse({ module: 'kehikot.learning' }).folded).toBeUndefined()
    expect(containerSchema.parse({ module: 'kehikot.learning', folded: true }).folded).toBe(true)
  })
})
