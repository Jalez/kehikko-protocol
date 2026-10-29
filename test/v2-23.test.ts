import { describe, expect, test } from 'bun:test'

import {
  DECLARATION_SINCE,
  LIMITS,
  MANIFEST_KIND,
  PACKAGE_VERSION,
  PROTOCOL,
  agentSessionsSchema,
  everywhereSkillSchema,
  fitOf,
  installsSkills,
  loadsSkills,
  manifestSchema,
  needsOf,
  pieceSaid,
  placeDoorsSchema,
} from '../src/index.js'

/**
 * 2.23.0: an agent module that installs skills for its own agent (`installsSkills`), and the skills
 * a host keeps for every conversation, listed for it in the answer to `POST /host/place`
 * (`everywhere`).
 */

const manifest = (agentSessions: unknown) => ({
  kind: MANIFEST_KIND,
  protocol: PROTOCOL,
  id: 'kehikot.codex',
  name: 'Codex',
  version: '0.2.0',
  summary: 'A terminal holding the Codex session of this place.',
  entry: '/app',
  modes: [{ id: 'codex', label: 'Codex', scope: 'epic' }],
  reacts: ['parts'],
  declares: {
    protocol: `>=${PROTOCOL} <${PROTOCOL + 1}`,
    uses: [],
    skills: [{ name: 'kehikot-here', summary: 'Assign this conversation to the kehikko on screen.', version: 'abc123' }],
    agentSessions,
  },
})

describe('the version', () => {
  test('is 2.23.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.32.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('declares.agentSessions.installsSkills', () => {
  test('is read by installsSkills, and only true is true', () => {
    expect(installsSkills(manifestSchema.parse(manifest({ loadsSkills: true, installsSkills: true })))).toBe(true)
    expect(installsSkills(manifestSchema.parse(manifest({ loadsSkills: true, installsSkills: false })))).toBe(false)
    expect(installsSkills(manifestSchema.parse(manifest({ loadsSkills: true })))).toBe(false)
    expect(installsSkills(manifestSchema.parse(manifest(undefined)))).toBe(false)
    expect(installsSkills(null)).toBe(false)
  })

  test('is optional: a 2.21.0 declaration parses to what it said, with no key added', () => {
    expect(agentSessionsSchema.parse({ loadsSkills: true })).toEqual({ loadsSkills: true })
    expect(agentSessionsSchema.parse({ loadsSkills: true, installsSkills: true })).toEqual({ loadsSkills: true, installsSkills: true })
  })

  test('one that is not a boolean drops agentSessions, not the manifest', () => {
    const parsed = manifestSchema.parse(manifest({ loadsSkills: true, installsSkills: 'yes' }))
    expect(parsed.declares.agentSessions).toBeUndefined()
    expect(loadsSkills(parsed)).toBe(false)
  })

  test('says 2.23.0 to needsOf and fitOf: an older host would install the skills for Claude Code', () => {
    expect(DECLARATION_SINCE['agentSessions.installsSkills']).toBe('2.23.0')
    expect(pieceSaid('declaration', 'agentSessions.installsSkills')).toBe('skills it installs for its own agent')
    const raw = manifest({ loadsSkills: true, installsSkills: true })
    expect(needsOf(raw).version).toBe('2.23.0')
    expect(needsOf(raw, '2.22.0').pieces.map((one) => one.piece)).toEqual(['agentSessions.installsSkills'])
    expect(fitOf(raw, { version: '2.22.0' }).fit).toBe('host-too-old')
    expect(fitOf(raw, { version: '2.23.0' }).fit).toBe('fits')
    /* Without it, the same manifest needs no more than 2.21.0. */
    expect(needsOf(manifest({ loadsSkills: true })).version).toBe('2.21.0')
    expect(needsOf(manifest({ loadsSkills: true, installsSkills: false })).version).toBe('2.21.0')
  })
})

describe('everywhere, on the answer to POST /host/place', () => {
  const token = 'a'.repeat(32)
  const doors = [{ module: 'kehikko', name: 'kehikko', url: `http://127.0.0.1:4171/mcp?kehikot-place=${token}`, transport: 'http' }]
  const kept = { module: 'kehikko', name: 'kehikot-module', version: '0123456789ab', origin: 'http://127.0.0.1:4171' }

  test('is the skills kept for every conversation, each with the origin its text is at', () => {
    const said = placeDoorsSchema.parse({ ok: true, token, doors, everywhere: [kept, { ...kept, module: 'kehikot.journeys', name: 'journey', origin: 'http://127.0.0.1:8040' }] })
    expect(said.everywhere?.map((one) => `${one.module}/${one.name}`)).toEqual(['kehikko/kehikot-module', 'kehikot.journeys/journey'])
  })

  test('absent is absent (a host before 2.23.0), and empty is empty (it keeps none)', () => {
    expect(placeDoorsSchema.parse({ ok: true, token, doors }).everywhere).toBeUndefined()
    expect(placeDoorsSchema.parse({ ok: true, token, doors, everywhere: [] }).everywhere).toEqual([])
  })

  test('one that does not parse is dropped, and the doors are still read', () => {
    const said = placeDoorsSchema.parse({ ok: true, token, doors, everywhere: [{ ...kept, name: 'Not A Name' }] })
    expect(said.everywhere).toBeUndefined()
    expect(said.doors).toHaveLength(1)
    expect(placeDoorsSchema.parse({ ok: true, token, doors, everywhere: 'all' }).everywhere).toBeUndefined()
  })

  test('each entry is a skill name, a version and an origin', () => {
    expect(everywhereSkillSchema.safeParse(kept).success).toBe(true)
    expect(everywhereSkillSchema.safeParse({ ...kept, name: '../x' }).success).toBe(false)
    expect(everywhereSkillSchema.safeParse({ ...kept, origin: 'not a url' }).success).toBe(false)
    expect(everywhereSkillSchema.safeParse({ ...kept, version: '' }).success).toBe(false)
    expect(placeDoorsSchema.parse({ ok: true, token, doors, everywhere: Array.from({ length: LIMITS.EVERYWHERE_SKILLS + 1 }, () => kept) }).everywhere).toBeUndefined()
  })
})
