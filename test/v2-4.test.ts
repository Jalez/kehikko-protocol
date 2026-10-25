import { describe, expect, test } from 'bun:test'

import { DOOR_PLACE_SAYS, PACKAGE_VERSION, PLACE_PARAM, doorPlaceSchema, placeDefaults, type DoorPlace } from '../src/index.js'
import { PLACE_PATH, hostPlace, hostPlaceUrls, placeTokenOf, resolveDoorPlace } from '../src/serve/index.js'

/** 2.4.0: a session's place travels as a token on the door's URL, and a door defaults to it. */

const env = { KEHIKOT_ORIGINS: 'http://127.0.0.1:4170 tauri://localhost' }
const TOKEN = 'abcdefghijklmnopqrstuvwxyz012345'
const PLACE: DoorPlace = {
  token: TOKEN,
  projectId: 'proj-1234abcd',
  project: '/work/thesis',
  projectName: 'thesis',
  epic: 'methods',
  parts: ['data'],
  kehikko: { key: 'k1a2b3c4', name: 'main' },
  looking: { projectId: 'proj-1234abcd', project: '/work/thesis', epic: 'results', parts: [], kehikko: { key: 'k1a2b3c4', name: 'main' } },
}

function host(table: Record<string, unknown>): typeof fetch {
  return (async (url: string) => {
    const token = new URL(url).searchParams.get(PLACE_PARAM) ?? ''
    return new Response(JSON.stringify({ ok: true, place: table[token] ?? null }), { status: 200 })
  }) as never
}

describe('the version', () => {
  test('is 2.8.0', () => expect(PACKAGE_VERSION).toBe('2.21.0'))
})

describe('placeTokenOf', () => {
  test('reads the query, a URL or a request', () => {
    expect(placeTokenOf(new URLSearchParams({ [PLACE_PARAM]: TOKEN }))).toBe(TOKEN)
    expect(placeTokenOf(`/mcp?${PLACE_PARAM}=${TOKEN}`)).toBe(TOKEN)
    expect(placeTokenOf({ url: `http://127.0.0.1:4590/mcp?${PLACE_PARAM}=${TOKEN}` })).toBe(TOKEN)
  })
  test('nothing, or a value not spelled like a token, is null', () => {
    expect(placeTokenOf('/mcp')).toBeNull()
    expect(placeTokenOf(`/mcp?${PLACE_PARAM}=short`)).toBeNull()
    expect(placeTokenOf(`/mcp?${PLACE_PARAM}=${'x'.repeat(30)}%20`)).toBeNull()
    expect(placeTokenOf(null)).toBeNull()
  })
})

describe('hostPlace and resolveDoorPlace', () => {
  test('asks loopback origins only, at the place route', () => {
    expect(hostPlaceUrls(TOKEN, env)).toEqual([`http://127.0.0.1:4170${PLACE_PATH}?${PLACE_PARAM}=${TOKEN}`])
  })
  test('a known token is its place', async () => {
    expect(await hostPlace(TOKEN, { env, fetch: host({ [TOKEN]: PLACE }) })).toEqual(PLACE)
    expect(await resolveDoorPlace(`/mcp?${PLACE_PARAM}=${TOKEN}`, { env, fetch: host({ [TOKEN]: PLACE }) })).toEqual(PLACE)
  })
  test('an unknown token, no token, no host, or another shape is null', async () => {
    expect(await hostPlace(TOKEN, { env, fetch: host({}) })).toBeNull()
    expect(await resolveDoorPlace('/mcp', { env, fetch: host({ [TOKEN]: PLACE }) })).toBeNull()
    expect(await hostPlace(TOKEN, { env, fetch: (async () => { throw new Error('down') }) as never })).toBeNull()
    expect(await hostPlace(TOKEN, { env, fetch: host({ [TOKEN]: { ...PLACE, epic: 'NOT A SLUG' } }) })).toBeNull()
    /* A host that answers for another token is not believed. */
    expect(await hostPlace(TOKEN, { env, fetch: host({ [TOKEN]: { ...PLACE, token: 'z'.repeat(32) } }) })).toBeNull()
  })
  test('a place without looking still reads', () => {
    const { looking: _, ...bare } = PLACE
    expect(doorPlaceSchema.parse(bare)).toEqual(bare)
  })
})

describe('placeDefaults: arguments, then the session, then nothing', () => {
  test('no arguments and a place: the session’s project, epic and parts', () => {
    expect(placeDefaults({}, PLACE)).toEqual({ project: '/work/thesis', epic: 'methods', parts: ['data'], from: 'session' })
  })
  test('another epic of the same project: that epic, no parts', () => {
    expect(placeDefaults({ epic: 'results' }, PLACE)).toEqual({ project: '/work/thesis', epic: 'results', parts: [], from: 'session' })
  })
  test('the agent names both: arguments', () => {
    expect(placeDefaults({ project: '/work/thesis', epic: 'methods' }, PLACE)).toEqual({ project: '/work/thesis', epic: 'methods', parts: ['data'], from: 'arguments' })
  })
  test('another project: the arguments alone', () => {
    expect(placeDefaults({ project: '/elsewhere' }, PLACE)).toEqual({ project: '/elsewhere', epic: null, parts: [], from: 'arguments' })
  })
  test('no place: as before 2.4.0', () => {
    expect(placeDefaults({}, null)).toEqual({ project: null, epic: null, parts: [], from: 'none' })
    expect(placeDefaults({ projectPath: '/p' }, null)).toEqual({ project: '/p', epic: null, parts: [], from: 'arguments' })
  })
})

describe('DOOR_PLACE_SAYS', () => {
  test('belongs names the project, epic, parts and kehikko', () => {
    expect(DOOR_PLACE_SAYS.belongs(PLACE)).toBe('This conversation belongs to thesis (/work/thesis), epic methods (parts data) on kehikko "main".')
  })
  test('looking says what the person is on when it differs', () => {
    expect(DOOR_PLACE_SAYS.looking(PLACE)).toBe(
      'The person is looking at something else now (epic results on kehikko "main"); this conversation\'s place has not changed.',
    )
    expect(DOOR_PLACE_SAYS.looking({ ...PLACE, looking: { ...PLACE.looking!, epic: 'methods', parts: ['data'] } })).toBe('The person is looking at this place now.')
    expect(DOOR_PLACE_SAYS.looking({ ...PLACE, looking: null })).toContain('No page of Kehikot is open')
  })
  test('used is said only when the session supplied something', () => {
    expect(DOOR_PLACE_SAYS.used('session', PLACE)).toContain('Taken from this conversation')
    expect(DOOR_PLACE_SAYS.used('arguments', PLACE)).toBe('')
  })
})

import { RECORDED_PLACE_PATH, placeDoorsSchema, placeIssueSchema, placeResult, recordedPlaceResult } from '../src/index.js'

describe('issuing, and the record behind a token', () => {
  test('a module issues a token for a conversation in a project, on a kehikko or none', () => {
    expect(placeIssueSchema.safeParse({ module: 'kehikot.claude', token: TOKEN, project: '/p', kehikko: null }).success).toBe(true)
    expect(placeIssueSchema.safeParse({ module: 'kehikot.claude', token: 'short', project: '/p', kehikko: null }).success).toBe(false)
  })
  test('the answer lists every door with the token on its URL', () => {
    const read = placeDoorsSchema.parse({ ok: true, token: TOKEN, doors: [{ module: 'kehikko', name: 'kehikko', url: `http://127.0.0.1:4180/mcp?${PLACE_PARAM}=${TOKEN}` }] })
    expect(read.doors[0]!.transport).toBe('http')
  })
  test('a module answers for its token from its record: the conversation and where it belongs now', () => {
    expect(RECORDED_PLACE_PATH).toBe('/api/kehikot/place')
    const read = recordedPlaceResult.parse({ ok: true, place: { conversation: 'abc', epic: 'methods', parts: [], kehikko: 'k1a2b3c4' } })
    expect(read.place?.conversation).toBe('abc')
    expect(recordedPlaceResult.parse({ ok: true, place: null }).place).toBeNull()
  })
  test('the host may say why a token it knows has no place', () => {
    expect(placeResult.parse({ ok: true, place: null, why: 'No record.' }).why).toBe('No record.')
  })
  test('fellBack is said whenever a door used the person’s view', () => {
    expect(DOOR_PLACE_SAYS.fellBack).toContain('not this conversation’s place')
  })
})
