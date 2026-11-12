import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import {
  CAPABILITY_SINCE,
  CHECKLIST_HOLDER,
  CUE_TARGETS,
  METHODS,
  METHOD_SINCE,
  MODULE_FOLDERS,
  PACKAGE_VERSION,
  PAGE_VIEWER,
  SERVER_METHODS,
  SERVICE_NAMES,
  checklistJson,
  checklistJsonIn,
  checklistListsJson,
  foldersOwned,
  holderTakesJson,
  meetsNeed,
  methodParams,
  needSaid,
  needsProject,
  resultSchemaFor,
  serviceDescriptor,
  skillNeedsSchema,
} from '../src/index.js'
import { needsOf } from '../src/fit.js'

/** 2.85.0: page.viewer, cue.targets, module.folders, a structured checklist answer, a skill need by service, sessions.placeOf. */

describe('the version', () => {
  test('is 2.85.0 and the entry declares its kind', () => {
    expect(PACKAGE_VERSION).toBe('2.88.0')
    const log = readFileSync(join(resolve(dirname(new URL(import.meta.url).pathname), '..'), 'CHANGELOG.md'), 'utf8')
    expect(log).toMatch(/## 2\.85\.0 — \d{4}-\d{2}-\d{2}\n\nKind: feature\n/)
  })
})

describe('the three services', () => {
  test('are known, and their descriptors parse', () => {
    for (const name of [PAGE_VIEWER, CUE_TARGETS, MODULE_FOLDERS]) expect(SERVICE_NAMES).toContain(name)
    expect(serviceDescriptor(PAGE_VIEWER, { name: 'Pages', tool: 'go_to' })).not.toBeNull()
    expect(serviceDescriptor(PAGE_VIEWER, { name: 'Pages' })).toBeNull()
    const cues = serviceDescriptor(CUE_TARGETS, { name: 'Drawings', cues: [{ tool: 'show_one', says: 'Opens a drawing at a stage.', args: { id: 'the drawing', stage: 'a stage number' }, reader: 'list_them', stop: true }] })
    expect(cues?.cues[0]?.args.stage).toBe('a stage number')
    expect(serviceDescriptor(CUE_TARGETS, { name: 'Drawings', cues: [] })).toBeNull()
    expect(serviceDescriptor(CUE_TARGETS, { name: 'Drawings', cues: [{ tool: 'x y', says: 'z' }] })).toBeNull()
    expect(serviceDescriptor(CUE_TARGETS, { name: 'Drawings', cues: [{ tool: 'x', says: 'z', args: { 'Bad Arg': 'q' } }] })).toBeNull()
  })

  test('a folder is one name directly under .kehikot/', () => {
    expect(serviceDescriptor(MODULE_FOLDERS, { name: 'Jots', folders: [{ folder: 'jots', says: 'Notes on files.' }] })?.folders[0]?.derived).toBe(false)
    for (const folder of ['a/b', '..', '.', '/abs', 'Upper', '']) expect(serviceDescriptor(MODULE_FOLDERS, { name: 'Jots', folders: [{ folder, says: 'x' }] })).toBeNull()
  })

  test('foldersOwned maps each folder to its first owner, skipping what does not parse', () => {
    const owned = foldersOwned([
      { module: 'kehikot.a', name: 'A', descriptor: { name: 'Ayy', folders: [{ folder: 'one', says: 'First.' }, { folder: 'cache', says: 'Rebuilt.', derived: true }] }, placed: null },
      { module: 'kehikot.b', name: 'B', descriptor: { name: 'Bee', folders: [{ folder: 'one', says: 'Second.' }] }, placed: null },
      { module: 'kehikot.c', name: 'C', descriptor: { nope: true }, placed: null },
    ])
    expect(owned.get('one')).toEqual({ module: 'kehikot.a', name: 'Ayy', says: 'First.', derived: false })
    expect(owned.get('cache')?.derived).toBe(true)
    expect(owned.size).toBe(2)
  })
})

describe('checklist.holder in JSON', () => {
  const tools = { list: 'a', create: 'b', add: 'c', hold: 'd', check: 'e' }
  test('formats is optional, and says whether list answers JSON', () => {
    const plain = serviceDescriptor(CHECKLIST_HOLDER, { name: 'Lists', tools })!
    expect(holderTakesJson(plain)).toBe(false)
    expect(holderTakesJson(serviceDescriptor(CHECKLIST_HOLDER, { name: 'Lists', tools, formats: ['json'] })!)).toBe(true)
    expect(serviceDescriptor(CHECKLIST_HOLDER, { name: 'Lists', tools, formats: ['xml'] })).toBeNull()
  })

  test('the two answers read with their shapes, and anything else is null', () => {
    const one = checklistJsonIn(checklistJson, JSON.stringify({ id: 'a1', name: 'PRs', held: ['gh#1'], items: [{ id: 'i1', text: 'Tests', state: 'passed', byPerson: true, by: 'me' }, { id: 'i2', text: 'Docs', state: null }] }))
    expect(one?.items[1]?.state).toBeNull()
    expect(one?.items[0]?.byPerson).toBe(true)
    expect(checklistJsonIn(checklistListsJson, JSON.stringify({ lists: [{ id: 'a1', name: 'PRs', held: [] }] }))?.lists).toHaveLength(1)
    expect(checklistJsonIn(checklistJson, '"PRs" (a1)\n1. [x] i1 — Tests')).toBeNull()
  })
})

describe('a skill that needs a service', () => {
  const manifest = { id: 'kehikot.drafts', services: { 'review.drafts': {} } }
  test('is met by a manifest that provides it', () => {
    expect(skillNeedsSchema.safeParse([{ service: 'review.drafts' }]).success).toBe(true)
    expect(meetsNeed({ service: 'review.drafts' }, manifest)).toBe(true)
    expect(meetsNeed({ service: 'review.drafts' }, { id: 'kehikot.other' })).toBe(false)
    expect(meetsNeed({ service: 'toString' }, manifest)).toBe(false)
    expect(needSaid({ service: 'review.drafts' })).toStartWith('a module that keeps')
    expect(needSaid({ service: 'some.thing' })).toBe('a module that provides some.thing')
  })

  test('a manifest with one needs a 2.85.0 host', () => {
    const needs = needsOf({ id: 'kehikot.x', declares: { skills: [{ name: 's', summary: '', version: '1', needs: [{ service: 'review.drafts' }] }] } })
    expect(needs.version).toBe('2.85.0')
    expect(needs.pieces.map((one) => one.piece)).toContain('skills.needs.service')
  })
})

describe('sessions.placeOf', () => {
  test('is a server method about one project, under sessions:place', () => {
    expect(METHODS['sessions.placeOf']).toBe('sessions:place')
    expect(SERVER_METHODS).toContain('sessions.placeOf')
    expect(needsProject('sessions.placeOf')).toBe(true)
    expect(METHOD_SINCE['sessions.placeOf']).toBe('2.85.0')
    expect(CAPABILITY_SINCE['sessions:place']).toBe('2.85.0')
    expect(methodParams['sessions.placeOf'].safeParse({ session: 'abc-123' }).success).toBe(true)
    expect(methodParams['sessions.placeOf'].safeParse({}).success).toBe(false)
    const result = resultSchemaFor('sessions.placeOf')!
    expect(result.safeParse({ place: { epic: 'auth', parts: ['p1'], kehikko: 'wide' } }).success).toBe(true)
    expect(result.safeParse({ place: null }).success).toBe(true)
    expect(result.safeParse({ place: { epic: 'Bad Slug', parts: [], kehikko: null } }).success).toBe(false)
  })
})
