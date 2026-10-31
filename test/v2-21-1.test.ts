import { mkdirSync, mkdtempSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { LIMITS, PACKAGE_VERSION } from '../src/index.js'
import { forgetHostProjects, hostHasProject, hostProject, resolveDoorProject } from '../src/serve/index.js'

/**
 * 2.21.1: a module's server keeps the host's "yes, a project" for a folder, so a page that polls its
 * server does not put the same question to the host on every request — and a move is still followed.
 */

const env = { KEHIKOT_ORIGINS: 'http://127.0.0.1:4170' }
const ID = 'proj-1234abcd'
const OTHER = 'proj-9999zzzz'

/** A host answering from a table that the test changes as it goes, counting what it was asked. */
function host(table: Record<string, unknown>) {
  const asked: string[] = []
  const fetch = (async (url: string) => {
    const path = new URL(url).searchParams.get('path') ?? ''
    asked.push(path)
    return new Response(JSON.stringify(table[path] ?? { ok: true, project: false }), { status: 200 })
  }) as never as typeof globalThis.fetch
  return { fetch, asked, table }
}

let root = ''
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'kehikot-keep-'))
  forgetHostProjects()
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

/** A real folder: what is kept is tied to the folder on disk. */
function folder(name: string): string {
  const path = join(root, name)
  mkdirSync(path)
  return path
}

describe('the version', () => {
  test('is 2.21.1', () => expect(PACKAGE_VERSION).toBe('2.41.0'))
  test('a yes is kept for a minute by default', () => expect(LIMITS.HOST_PROJECT_KEEP_MS).toBe(60_000))
})

describe('a yes is kept', () => {
  test('asked once for many asks of the same folder', async () => {
    const p = folder('p')
    const h = host({ [p]: { ok: true, project: true, id: ID } })
    for (let i = 0; i < 10; i++) expect(await hostProject(p, { env, fetch: h.fetch })).toEqual({ project: true, path: p, id: ID })
    expect(await hostHasProject(p, { env, fetch: h.fetch })).toBe(true)
    expect(await resolveDoorProject({ project: p }, { env, fetch: h.fetch })).toEqual({ ok: true, path: p, id: ID })
    expect(h.asked).toEqual([p])
  })

  test('asks that arrive together share one ask', async () => {
    const p = folder('p')
    const h = host({ [p]: { ok: true, project: true, id: ID } })
    const all = await Promise.all([1, 2, 3, 4].map(() => hostProject(p, { env, fetch: h.fetch })))
    expect(all.every((one) => one.project)).toBe(true)
    expect(h.asked).toEqual([p])
  })

  test('until keepMs has passed', async () => {
    const p = folder('p')
    const h = host({ [p]: { ok: true, project: true, id: ID } })
    let clock = 1_000
    const now = () => clock
    await hostProject(p, { env, fetch: h.fetch, now })
    clock += LIMITS.HOST_PROJECT_KEEP_MS - 1
    await hostProject(p, { env, fetch: h.fetch, now })
    expect(h.asked.length).toBe(1)
    clock += 1
    await hostProject(p, { env, fetch: h.fetch, now })
    expect(h.asked.length).toBe(2)
  })

  test('a project removed from the host is a no once the minute is up', async () => {
    const p = folder('p')
    const h = host({ [p]: { ok: true, project: true, id: ID } })
    let clock = 0
    const now = () => clock
    expect(await hostHasProject(p, { env, fetch: h.fetch, now })).toBe(true)
    delete h.table[p]
    clock += LIMITS.HOST_PROJECT_KEEP_MS
    expect(await hostHasProject(p, { env, fetch: h.fetch, now })).toBe(false)
  })

  test('keepMs: 0 asks every time', async () => {
    const p = folder('p')
    const h = host({ [p]: { ok: true, project: true, id: ID } })
    await hostProject(p, { env, fetch: h.fetch, keepMs: 0 })
    await hostProject(p, { env, fetch: h.fetch, keepMs: 0 })
    expect(h.asked.length).toBe(2)
  })

  test('forgetHostProjects drops what was kept', async () => {
    const p = folder('p')
    const h = host({ [p]: { ok: true, project: true, id: ID } })
    await hostProject(p, { env, fetch: h.fetch })
    forgetHostProjects()
    await hostProject(p, { env, fetch: h.fetch })
    expect(h.asked.length).toBe(2)
  })

  test('each host is its own: another fetch, or other origins, ask again', async () => {
    const p = folder('p')
    const a = host({ [p]: { ok: true, project: true, id: ID } })
    const b = host({ [p]: { ok: true, project: true, id: ID } })
    await hostProject(p, { env, fetch: a.fetch })
    await hostProject(p, { env, fetch: b.fetch })
    await hostProject(p, { env: { KEHIKOT_ORIGINS: 'http://127.0.0.1:4181' }, fetch: a.fetch })
    expect(a.asked.length).toBe(2)
    expect(b.asked.length).toBe(1)
  })
})

describe('what is never kept', () => {
  test('a no: a project added a moment ago is a project at once', async () => {
    const p = folder('p')
    const h = host({})
    expect(await hostHasProject(p, { env, fetch: h.fetch })).toBe(false)
    h.table[p] = { ok: true, project: true, id: ID }
    expect(await hostHasProject(p, { env, fetch: h.fetch })).toBe(true)
  })

  test('no host answering', async () => {
    const p = folder('p')
    let calls = 0
    const down = (async () => {
      calls += 1
      throw new Error('ECONNREFUSED')
    }) as never as typeof fetch
    await hostProject(p, { env, fetch: down })
    await hostProject(p, { env, fetch: down })
    expect(calls).toBe(2)
  })

  test('a folder that is not on disk', async () => {
    const h = host({ '/nowhere/p': { ok: true, project: true, id: ID } })
    await hostProject('/nowhere/p', { env, fetch: h.fetch })
    await hostProject('/nowhere/p', { env, fetch: h.fetch })
    expect(h.asked.length).toBe(2)
  })
})

describe('a move is still followed', () => {
  test('at once: the folder left the path, so the host is asked and its movedTo followed', async () => {
    const old = folder('old')
    const moved = join(root, 'new')
    const h = host({ [old]: { ok: true, project: true, id: ID } })
    expect(await resolveDoorProject(old, { env, fetch: h.fetch })).toEqual({ ok: true, path: old, id: ID })

    renameSync(old, moved)
    h.table[old] = { ok: true, project: false, movedTo: moved, id: ID }
    h.table[moved] = { ok: true, project: true, id: ID }
    expect(await resolveDoorProject(old, { env, fetch: h.fetch })).toEqual({ ok: true, path: moved, id: ID, movedFrom: old })
    expect(h.asked).toEqual([old, old, moved])
  })

  test('another folder put at the old path is another folder, and is asked about', async () => {
    const old = folder('old')
    const h = host({ [old]: { ok: true, project: true, id: ID } })
    await hostProject(old, { env, fetch: h.fetch })
    renameSync(old, join(root, 'elsewhere'))
    mkdirSync(old)
    h.table[old] = { ok: true, project: true, id: OTHER }
    expect(await hostProject(old, { env, fetch: h.fetch })).toEqual({ project: true, path: old, id: OTHER })
  })

  test('the same id answered at another path drops what was kept at the first', async () => {
    const a = folder('a')
    const b = folder('b')
    const h = host({ [a]: { ok: true, project: true, id: ID }, [b]: { ok: true, project: true, id: ID } })
    await hostProject(a, { env, fetch: h.fetch })
    await hostProject(b, { env, fetch: h.fetch })
    h.table[a] = { ok: true, project: false }
    expect(await hostHasProject(a, { env, fetch: h.fetch })).toBe(false)
    expect(h.asked).toEqual([a, b, a])
  })

  test('a movedTo naming the id drops what was kept for it', async () => {
    const a = folder('a')
    const link = folder('link')
    const h = host({ [a]: { ok: true, project: true, id: ID }, [link]: { ok: true, project: false, movedTo: a, id: ID } })
    await hostProject(a, { env, fetch: h.fetch })
    await hostProject(link, { env, fetch: h.fetch })
    await hostProject(a, { env, fetch: h.fetch })
    expect(h.asked).toEqual([a, link, a])
  })
})
