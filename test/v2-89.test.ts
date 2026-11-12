import { describe, expect, test } from 'bun:test'

import {
  contextSchema,
  doorPlaceSchema,
  doorSpace,
  epicPartsOf,
  findSpace,
  inboxAdoptParams,
  messagePlaceSchema,
  methodParams,
  nodeAt,
  notificationPayload,
  placeSpaceDefaults,
  recordedPlaceResult,
  spaceAgrees,
  spaceFromEpicParts,
  spaceIdFor,
  spaceOf,
  spaceSaid,
  spaceSchema,
  spaceTreeSchema,
  spaceWithin,
  DOOR_PLACE_SAYS,
  LIMITS,
  type SpaceNode,
} from '../src/index.js'

const TREE: SpaceNode[] = [
  {
    id: 'auth',
    name: 'Auth',
    children: [
      { id: 'login', name: 'Login', children: [{ id: 'errors', name: 'Errors', children: [{ id: 'copy', name: 'Copy', children: [] }] }] },
      { id: 'signup', name: 'Sign-up', children: [] },
    ],
  },
  { id: 'billing', name: 'Billing', children: [{ id: 'login', name: 'Login', children: [] }] },
]

const space = (ids: string[], picked: string[] = []) => spaceOf(TREE, ids, picked)!

describe('2.89.0: spaces', () => {
  test('a space parses, and its id is the last step of its path', () => {
    const one = spaceSchema.parse({ id: 'login', path: [{ id: 'auth', name: 'Auth' }, { id: 'login', name: 'Login' }] })
    expect(one.picked).toEqual([])
    expect(spaceSchema.safeParse({ id: 'auth', path: [{ id: 'auth', name: 'Auth' }, { id: 'login', name: 'Login' }] }).success).toBe(false)
  })

  test('the context carries a space, null by default, and an older context reads as before', () => {
    expect(contextSchema.parse({}).space).toBeNull()
    const ctx = contextSchema.parse({ epic: 'auth', space: space(['auth', 'login', 'errors']) })
    expect(ctx.space?.path.map((step) => step.id)).toEqual(['auth', 'login', 'errors'])
  })

  test('a tree refuses sibling ids twice, and too deep a tree', () => {
    expect(spaceTreeSchema.safeParse(TREE).success).toBe(true)
    expect(spaceTreeSchema.safeParse([{ id: 'a', name: 'A' }, { id: 'a', name: 'B' }]).success).toBe(false)
    let deep: SpaceNode = { id: 'x', name: 'x', children: [] }
    for (let n = 0; n < LIMITS.SPACE_DEPTH; n += 1) deep = { id: `x${n}`, name: '', children: [deep] }
    expect(spaceTreeSchema.safeParse([deep]).success).toBe(false)
  })

  test('spaceWithin: the space and everything below it, and nothing beside it', () => {
    const login = space(['auth', 'login'])
    expect(spaceWithin(login, ['auth', 'login'])).toBe(true)
    expect(spaceWithin(login, ['auth', 'login', 'errors', 'copy'])).toBe(true)
    expect(spaceWithin(login, ['auth'])).toBe(false)
    expect(spaceWithin(login, ['auth', 'signup'])).toBe(false)
    /* The same id under another top-level space is another space. */
    expect(spaceWithin(login, ['billing', 'login'])).toBe(false)
    expect(spaceWithin(null, ['billing'])).toBe(true)
    expect(spaceWithin([], [])).toBe(true)
  })

  test('spaceWithin with siblings picked: only those, and what is under them', () => {
    const both = space(['auth'], ['login', 'signup'])
    expect(both.picked).toEqual(['login', 'signup'])
    expect(spaceWithin(both, ['auth', 'login', 'errors'])).toBe(true)
    expect(spaceWithin(both, ['auth', 'signup'])).toBe(true)
    expect(spaceWithin(both, ['auth'])).toBe(false)
  })

  test('one picked child is standing in that child', () => {
    const one = space(['auth'], ['login'])
    expect(one.id).toBe('login')
    expect(one.picked).toEqual([])
  })

  test('the compatibility mapping to epic and parts', () => {
    expect(epicPartsOf(null)).toEqual({ epic: null, parts: [] })
    expect(epicPartsOf(space(['auth']))).toEqual({ epic: 'auth', parts: [] })
    expect(epicPartsOf(space(['auth'], ['login', 'signup']))).toEqual({ epic: 'auth', parts: ['login', 'signup'] })
    expect(epicPartsOf(space(['auth', 'login']))).toEqual({ epic: 'auth', parts: ['login'] })
    /* Deeper: the nearest depth-2 ancestor. */
    expect(epicPartsOf(space(['auth', 'login', 'errors', 'copy']))).toEqual({ epic: 'auth', parts: ['login'] })
    expect(epicPartsOf(space(['auth', 'login'], ['errors']))).toEqual({ epic: 'auth', parts: ['login'] })
  })

  test('and backwards, from what an older place says', () => {
    expect(spaceFromEpicParts(null)).toBeNull()
    expect(spaceFromEpicParts('auth')).toEqual({ ids: ['auth'], picked: [] })
    expect(spaceFromEpicParts('auth', ['login'])).toEqual({ ids: ['auth', 'login'], picked: [] })
    expect(spaceFromEpicParts('auth', ['login', 'signup'])).toEqual({ ids: ['auth'], picked: ['login', 'signup'] })
    expect(spaceAgrees(space(['auth', 'login', 'errors']), 'auth', ['login'])).toBe(true)
    expect(spaceAgrees(space(['auth', 'login', 'errors']), 'auth', [])).toBe(false)
  })

  test('words and ids', () => {
    expect(spaceSaid(space(['auth', 'login', 'errors']).path)).toBe('Auth › Login › Errors')
    expect(spaceIdFor('Login', TREE)).toBe('login-2')
    expect(spaceIdFor('!!!', TREE)).toBe('space')
    expect(nodeAt(TREE, ['auth', 'login'])?.children[0]?.id).toBe('errors')
  })

  test('a door argument: a path, a slashed path, or one id resolved against the tree', () => {
    expect(doorSpace({ space: ['auth', 'login'] })).toEqual({ ids: ['auth', 'login'] })
    expect(doorSpace({ space: 'auth/login/errors' })).toEqual({ ids: ['auth', 'login', 'errors'] })
    expect(doorSpace({ space: 'errors' })).toEqual({ id: 'errors' })
    expect(doorSpace({ space: 'Not An Id' })).toBeNull()
    expect(doorSpace({})).toBeNull()
    const found = findSpace(TREE, { id: 'errors' })
    expect(found.ok && found.path.map((step) => step.id)).toEqual(['auth', 'login', 'errors'])
    const twice = findSpace(TREE, { id: 'login' })
    expect(twice.ok).toBe(false)
    expect(!twice.ok && twice.why).toContain('auth/login')
    expect(findSpace(TREE, { ids: ['auth', 'nope'] }).ok).toBe(false)
  })

  test('places carry a space with the epic it is in', () => {
    expect(notificationPayload.safeParse({ epic: 'auth', message: 'x', place: { epic: 'auth', space: ['auth', 'login', 'errors'] } }).success).toBe(true)
    expect(notificationPayload.safeParse({ epic: 'auth', message: 'x', place: { epic: 'billing', space: ['auth', 'login'] } }).success).toBe(false)
    expect(methodParams['view.goto'].safeParse({ epic: 'auth', space: ['auth', 'login', 'errors'] }).success).toBe(true)
    expect(methodParams['view.goto'].safeParse({ step: 1, space: ['auth'] }).success).toBe(false)
    expect(messagePlaceSchema.safeParse({ epic: 'auth', space: ['auth', 'login'] }).success).toBe(true)
    expect(inboxAdoptParams.safeParse({ module: 'kehikot.x', id: 'i', epic: 'auth', parts: ['login'], space: ['auth', 'login', 'errors'] }).success).toBe(true)
    expect(inboxAdoptParams.safeParse({ module: 'kehikot.x', id: 'i', epic: 'auth', space: ['billing'] }).success).toBe(false)
    const recorded = recordedPlaceResult.parse({ ok: true, place: { conversation: 'c', epic: 'auth', parts: ['login'], kehikko: null, space: ['auth', 'login', 'errors'] } })
    expect(recorded.place?.space).toEqual(['auth', 'login', 'errors'])
    /* A record from an older module: no space. */
    expect(recordedPlaceResult.parse({ ok: true, place: { conversation: 'c', epic: 'auth', parts: [], kehikko: null } }).place?.space).toBeUndefined()
  })

  test('placeSpaceDefaults takes a space argument, and the session’s space', () => {
    const place = doorPlaceSchema.parse({
      token: 'a'.repeat(32),
      projectId: 'p-1234567890abcdef',
      project: '/work/x',
      epic: 'auth',
      parts: ['login'],
      kehikko: null,
      space: space(['auth', 'login', 'errors']).path,
    })
    const fromSession = placeSpaceDefaults({}, place)
    expect(fromSession.space).toEqual(['auth', 'login', 'errors'])
    expect(fromSession.parts).toEqual(['login'])
    const asked = placeSpaceDefaults({ space: 'billing/login' }, place)
    expect(asked.epic).toBe('billing')
    expect(asked.parts).toEqual(['login'])
    expect(asked.space).toEqual(['billing', 'login'])
    expect(placeSpaceDefaults({ space: 'errors' }, place).spaceId).toBe('errors')
    /* An older place: the space read from epic and parts. */
    const older = { ...place, space: undefined }
    expect(placeSpaceDefaults({}, older).space).toEqual(['auth', 'login'])
    expect(DOOR_PLACE_SAYS.belongs(place)).toContain('space Auth › Login › Errors (epic auth (parts login))')
    expect(DOOR_PLACE_SAYS.belongs(older)).toBe('This conversation belongs to /work/x (/work/x), epic auth (parts login).')
  })
})
