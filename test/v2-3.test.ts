import { describe, expect, test } from 'bun:test'

import { DOOR_PROJECT_SAYS, PACKAGE_VERSION, PROTOCOL } from '../src/index.js'
import { NO_HOST_ANSWERED, hostHasProject, hostProject, isProjectResult, resolveDoorProject } from '../src/serve/index.js'

/** 2.3.0: the host says where a project that used to be at a folder is now, and a door follows it once. */

const env = { KEHIKOT_ORIGINS: 'http://127.0.0.1:4170' }
const ID = 'proj-1234abcd'
const OTHER = 'proj-9999zzzz'

/** A host that answers from a table of folder → body; anything not in it is an unrelated folder. */
function host(table: Record<string, unknown>): typeof fetch {
  return (async (url: string) => {
    const path = new URL(url).searchParams.get('path') ?? ''
    return new Response(JSON.stringify(table[path] ?? { ok: true, project: false }), { status: 200 })
  }) as never
}

describe('the version', () => {
  test('is 2.18.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.32.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('isProjectResult', () => {
  test('keeps id, movedTo, missing and why', () => {
    const read = isProjectResult.parse({ ok: true, project: false, id: ID, movedTo: '/new', missing: false, why: 'moved' })
    expect(read).toEqual({ ok: true, project: false, id: ID, movedTo: '/new', missing: false, why: 'moved' })
  })
  test('a 2.2 answer still reads', () => {
    expect(isProjectResult.parse({ ok: true, project: true })).toEqual({ ok: true, project: true })
  })
  test('a malformed optional field is dropped, not fatal', () => {
    const read = isProjectResult.parse({ ok: true, project: false, id: 'NOT AN ID', movedTo: 'relative', missing: 'yes' })
    expect(read).toEqual({ ok: true, project: false })
  })
  test('without ok and project it is not an answer', () => {
    expect(isProjectResult.safeParse({ project: true }).success).toBe(false)
    expect(isProjectResult.safeParse({ ok: true, movedTo: '/x' }).success).toBe(false)
  })
})

describe('hostProject', () => {
  test('a project: path and id', async () => {
    expect(await hostProject(' /p ', { env, fetch: host({ '/p': { ok: true, project: true, id: ID } }) })).toEqual({ project: true, path: '/p', id: ID })
  })
  test('a former path: movedTo and the id', async () => {
    expect(await hostProject('/old', { env, fetch: host({ '/old': { ok: true, project: false, movedTo: '/new', id: ID } }) })).toEqual({
      project: false,
      movedTo: '/new',
      id: ID,
    })
  })
  test('a missing project says so', async () => {
    expect(await hostProject('/gone', { env, fetch: host({ '/gone': { ok: true, project: false, missing: true, id: ID } }) })).toEqual({
      project: false,
      missing: true,
      id: ID,
    })
  })
  test('an unrelated folder is a bare no', async () => {
    expect(await hostProject('/x', { env, fetch: host({}) })).toEqual({ project: false })
  })
  test('no host: no, and says nobody answered', async () => {
    const down = (async () => {
      throw new Error('ECONNREFUSED')
    }) as never
    expect(await hostProject('/p', { env, fetch: down })).toEqual({ project: false, why: NO_HOST_ANSWERED })
    expect((await hostProject('relative', { env, fetch: host({}) })).project).toBe(false)
  })
  test('hostHasProject stays a boolean, and a former path is false', async () => {
    const fetch = host({ '/p': { ok: true, project: true, id: ID }, '/old': { ok: true, project: false, movedTo: '/p', id: ID } })
    expect(await hostHasProject('/p', { env, fetch })).toBe(true)
    expect(await hostHasProject('/old', { env, fetch })).toBe(false)
  })
})

describe('resolveDoorProject', () => {
  test('a project is itself', async () => {
    const fetch = host({ '/p': { ok: true, project: true, id: ID } })
    expect(await resolveDoorProject({ project: '/p' }, { env, fetch })).toEqual({ ok: true, path: '/p', id: ID })
    expect(await resolveDoorProject('/p', { env, fetch })).toEqual({ ok: true, path: '/p', id: ID })
    expect(await resolveDoorProject({ projectPath: '/p' }, { env, fetch })).toEqual({ ok: true, path: '/p', id: ID })
  })
  test('follows one move to the same project', async () => {
    const fetch = host({ '/old': { ok: true, project: false, movedTo: '/new', id: ID }, '/new': { ok: true, project: true, id: ID } })
    const got = await resolveDoorProject({ project: '/old' }, { env, fetch })
    expect(got).toEqual({ ok: true, path: '/new', id: ID, movedFrom: '/old' })
    expect(DOOR_PROJECT_SAYS.followed('/old', '/new')).toContain('/new')
  })
  test('refuses when the new path is another project', async () => {
    const fetch = host({ '/old': { ok: true, project: false, movedTo: '/new', id: ID }, '/new': { ok: true, project: true, id: OTHER } })
    expect(await resolveDoorProject('/old', { env, fetch })).toEqual({
      ok: false,
      reason: 'moved',
      why: 'That folder was moved to /new; use that path.',
      movedTo: '/new',
    })
  })
  test('refuses when the new path is not a project either, and follows only once', async () => {
    let asked = 0
    const chain = (async (url: string) => {
      asked += 1
      const path = new URL(url).searchParams.get('path')
      return new Response(JSON.stringify({ ok: true, project: false, movedTo: path === '/a' ? '/b' : '/c', id: ID }))
    }) as never
    const got = await resolveDoorProject('/a', { env, fetch: chain })
    expect(got).toMatchObject({ ok: false, reason: 'moved', movedTo: '/b' })
    expect(asked).toBe(2)
  })
  test('refuses a move without an id', async () => {
    const fetch = host({ '/old': { ok: true, project: false, movedTo: '/new' }, '/new': { ok: true, project: true, id: ID } })
    expect(await resolveDoorProject('/old', { env, fetch })).toMatchObject({ ok: false, reason: 'moved' })
  })
  test('an unrelated folder, and no host, are not projects', async () => {
    expect(await resolveDoorProject('/x', { env, fetch: host({}) })).toEqual({ ok: false, reason: 'not-project', why: '/x is not a project open in Kehikot.' })
    const down = (async () => {
      throw new Error('ECONNREFUSED')
    }) as never
    expect(await resolveDoorProject('/p', { env, fetch: down })).toEqual({ ok: false, reason: 'not-project', why: '/p is not a project open in Kehikot.' })
    expect(await resolveDoorProject('/p', { env: { KEHIKOT_ORIGINS: 'tauri://localhost' }, fetch: host({ '/p': { ok: true, project: true } }) })).toMatchObject({
      ok: false,
      reason: 'not-project',
    })
  })
  test('no project named', async () => {
    expect(await resolveDoorProject({}, { env, fetch: host({}) })).toEqual({ ok: false, reason: 'unnamed', why: DOOR_PROJECT_SAYS.unnamed })
    expect(await resolveDoorProject('  ', { env, fetch: host({}) })).toMatchObject({ ok: false, reason: 'unnamed' })
  })
})
