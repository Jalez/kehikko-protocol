import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import {
  NOT_LOADED,
  NOTES_VERSION,
  PACKAGE_VERSION,
  PROTOCOL,
  moduleLine,
  sessionNotes,
  skillsThatLoad,
  type ModuleSkill,
  type NotesInput,
  type ProvidingManifest,
  type SessionModule,
} from '../src/index.js'

/**
 * 2.44.0: one rule for which skills load into an agent session on a kehikko, judged on manifests,
 * and notes that say apart the skills a session does not have.
 */

const REPO = resolve(dirname(import.meta.path), '..')

const skill = (name: string, needs?: ModuleSkill['needs']): ModuleSkill => ({ name, summary: '', version: '1', ...(needs ? { needs } : {}) })
const roadmap = skill('flow-roadmap', [{ provides: 'steps' }])
const understand = skill('flow-understand')
const review = skill('review-factory', ['kehikot.factory'])
const journeys: ProvidingManifest = { id: 'kehikot.journeys', declares: { provides: ['steps'] } }

describe('the version', () => {
  test('is 2.44.0, PROTOCOL is still 2, and the notes moved to 5', () => {
    expect(PACKAGE_VERSION).toBe('2.50.0')
    expect(PROTOCOL).toBe(2)
    expect(NOTES_VERSION).toBe(5)
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.44.0')
    expect(readFileSync(join(REPO, 'docs/manifest.md'), 'utf8')).toContain('skillsThatLoad')
  })
})

describe('skillsThatLoad', () => {
  test('a capability need is met by a manifest that says it', () => {
    const { load, left } = skillsThatLoad([understand, roadmap], [{ id: 'kehikot.flows' }, journeys])
    expect(load.map((one) => one.name)).toEqual(['flow-understand', 'flow-roadmap'])
    expect(left).toEqual([])
  })

  test('left out, with a reason a person reads, when no manifest meets it', () => {
    const { load, left } = skillsThatLoad([understand, roadmap], [{ id: 'kehikot.flows' }, { id: 'kehikot.journeys' }])
    expect(load.map((one) => one.name)).toEqual(['flow-understand'])
    expect(left).toHaveLength(1)
    expect(left[0]!.skill).toBe(roadmap)
    expect(left[0]!.missing).toEqual([{ provides: 'steps' }])
    expect(left[0]!.said).toBe('a module that keeps an epic’s steps')
    expect(left[0]!.said).not.toContain('[object Object]')
  })

  test('an id need is met by the module with that id, and named by nameOf when it is not', () => {
    expect(skillsThatLoad([review], [{ id: 'kehikot.factory' }]).load).toEqual([review])
    const { left } = skillsThatLoad([review], [journeys], (id) => (id === 'kehikot.factory' ? 'Factory' : id))
    expect(left[0]!.said).toBe('Factory')
  })

  test('a skill without needs always loads, even on an empty kehikko', () => {
    expect(skillsThatLoad([understand], []).load).toEqual([understand])
  })
})

describe('holds in the notes', () => {
  const flows: SessionModule = { module: 'kehikot.flows', name: 'Flows', summary: 'Staged diagrams.', door: 'flows', skills: ['flow-understand', 'flow-roadmap'] }

  test('without holds, every skill the host listed', () => {
    expect(moduleLine(flows)).toContain('Skills: flow-understand, flow-roadmap.')
    expect(moduleLine(flows)).not.toContain(NOT_LOADED)
  })

  test('with holds, the ones the session lacks are said apart', () => {
    const line = moduleLine(flows, null, ['flow-understand'])
    expect(line).toContain('Skills: flow-understand.')
    expect(line).toContain(`${NOT_LOADED}: flow-roadmap.`)
    expect(moduleLine(flows, null, [])).toBe(`- Flows (door flows) — "Staged diagrams.". ${NOT_LOADED}: flow-understand, flow-roadmap.`)
    expect(moduleLine(flows, null, ['flow-understand', 'flow-roadmap'])).not.toContain(NOT_LOADED)
  })

  test('sessionNotes passes holds to every module line', () => {
    const input: NotesInput = {
      place: { project: '/p', epic: 'e', parts: [], kehikko: { key: 'k' } },
      modules: [flows],
      self: { module: 'kehikot.claude', name: 'Claude', door: 'kehikko-claude' },
      holds: ['flow-understand'],
    }
    const start = sessionNotes(input, 'start', null).text!
    expect(start).toContain(`${NOT_LOADED}: flow-roadmap.`)
    const told = sessionNotes({ ...input, modules: [] }, 'start', null).told
    expect(sessionNotes(input, 'prompt', told).text).toContain(`${NOT_LOADED}: flow-roadmap.`)
  })
})
