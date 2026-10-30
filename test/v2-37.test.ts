import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { NOTES_VERSION, UPDATED_HEAD, sessionNotes, startNotes, type NotesInput, type NotesTold, type SessionModule } from '../src/index.js'

/**
 * 2.37.0: `NOTES_VERSION`. A session told by an older wording gets the full new notes once, at its next prompt.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')
const queue: SessionModule = { module: 'kehikot.queue', name: 'Test runs', summary: 'A queue.', says: 'Queue heavy runs.', door: 'queue', skills: [] }
const input = (over: Partial<NotesInput> = {}): NotesInput => ({
  place: { project: '/work/thesis', epic: 'methods', parts: [], kehikko: { key: 'writing', name: 'Writing' } },
  modules: [queue],
  absent: [],
  hostDoor: 'kehikko',
  self: { module: 'kehikot.claude', name: 'Claude', door: 'kehikko-claude' },
  ...over,
})

describe('NOTES_VERSION', () => {
  test('is 2 now, and every record sessionNotes returns carries it', () => {
    expect(NOTES_VERSION).toBe(2)
    expect(sessionNotes(input(), 'start', null).told.version).toBe(NOTES_VERSION)
    const told = sessionNotes(input(), 'start', null).told
    expect(sessionNotes(input({ modules: [] }), 'prompt', told).told.version).toBe(NOTES_VERSION)
  })

  test('an old record (no version) gets the full notes once at the next prompt, framed, then only changes', () => {
    const fresh = sessionNotes(input(), 'start', null).told
    const { version: _gone, ...old } = fresh
    const first = sessionNotes(input(), 'prompt', old as NotesTold)
    expect(first.kind).toBe('start')
    expect(first.text).toBe(`${UPDATED_HEAD}\n${startNotes(input())}`)
    expect(UPDATED_HEAD).toBe('Kehikot: what this conversation is told was updated:')
    expect(first.told.version).toBe(NOTES_VERSION)
    expect(sessionNotes(input(), 'prompt', first.told).text).toBeNull()
    const changed = sessionNotes(input({ modules: [] }), 'prompt', first.told)
    expect(changed.kind).toBe('change')
  })

  test('an older numbered version is told once too; the current one and a newer one are not', () => {
    const told = sessionNotes(input(), 'start', null).told
    expect(sessionNotes(input(), 'prompt', { ...told, version: 1 }).text).toStartWith(UPDATED_HEAD)
    expect(sessionNotes(input(), 'prompt', { ...told, version: NOTES_VERSION }).text).toBeNull()
    expect(sessionNotes(input(), 'prompt', { ...told, version: NOTES_VERSION + 1 }).text).toBeNull()
  })

  test('a start says the plain notes, never the update frame', () => {
    const { version: _gone, ...old } = sessionNotes(input(), 'start', null).told
    expect(sessionNotes(input(), 'start', old as NotesTold).text).toBe(startNotes(input()))
  })

  test('a moved place says the moved notes, not the update frame', () => {
    const { version: _gone, ...old } = sessionNotes(input(), 'start', null).told
    const moved = input({ place: { project: '/work/thesis', epic: 'results', parts: [], kehikko: { key: 'writing', name: 'Writing' } } })
    expect(sessionNotes(moved, 'prompt', old as NotesTold).text).toContain('has been moved')
  })

  test('a record from before parses as it is: JSON without the field is accepted, not an error', () => {
    const stored = JSON.parse('{"key":null,"modules":["kehikot.queue"],"names":{"kehikot.queue":"Test runs"}}') as NotesTold
    const out = sessionNotes(input({ place: null }), 'prompt', stored)
    expect(out.text).toStartWith(UPDATED_HEAD)
  })

  test('the docs say to bump it', () => {
    expect(readFileSync(join(REPO, 'docs/asking.md'), 'utf8')).toContain('bump `NOTES_VERSION`')
  })
})
