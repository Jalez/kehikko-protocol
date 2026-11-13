import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import {
  CAPABILITIES,
  CAPABILITY_SINCE,
  METHODS,
  METHOD_SINCE,
  PACKAGE_VERSION,
  PROTOCOL,
  SERVER_METHODS,
  SERVER_METHOD_SINCE,
  methodParams,
  methodResults,
  needsOf,
  needsProject,
  projectsMineResult,
  serverAskSchema,
} from '../src/index.js'
import { KNOWN_PROJECTS_EVERY_MS, KNOWN_PROJECTS_RETRY_MS, askHost, watchKnownProjects, type AskedHost } from '../src/serve/index.js'

/**
 * 2.76.0: `projects.mine` — the person's projects in which the asking module keeps its folder — and
 * `watchKnownProjects`, which a module's server runs at start so that what it runs for a project is
 * picked up after a restart before anybody opens that project.
 */

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..')

type Mine = AskedHost<'projects.mine'>
const answered = (...paths: string[]): Mine => ({ ok: true, data: { projects: paths.map((path) => ({ path, name: path.split('/').at(-1) ?? '' })) } })

describe('the version', () => {
  test('is 2.77.0, PROTOCOL is still 2, and the docs say it', () => {
    expect(PACKAGE_VERSION).toBe('2.97.0')
    expect(PROTOCOL).toBe(2)
    expect(readFileSync(join(REPO, 'CHANGELOG.md'), 'utf8')).toContain('## 2.77.0')
    expect(readFileSync(join(REPO, 'docs/server-ask.md'), 'utf8')).toContain('watchKnownProjects')
    expect(readFileSync(join(REPO, 'docs/methods.md'), 'utf8')).toContain('projects.mine')
  })
})

describe('projects.mine', () => {
  test('a method and a server method under agents:message (2.77.0), since 2.76.0', () => {
    expect(METHODS['projects.mine']).toBe('agents:message')
    expect(Object.hasOwn(CAPABILITIES, 'projects:read')).toBe(false)
    expect(METHOD_SINCE['projects.mine']).toBe('2.76.0')
    expect(Object.hasOwn(CAPABILITY_SINCE, 'projects:read')).toBe(false)
    expect((SERVER_METHODS as readonly string[]).includes('projects.mine')).toBe(true)
    expect(SERVER_METHOD_SINCE['projects.mine']).toBe('2.76.0')
    expect(methodResults['projects.mine']).toBe(projectsMineResult)
  })
  test('asking it needs nothing a module that runs agent sessions does not already declare (2.77.0)', () => {
    expect(needsOf({ protocol: 2, declares: { uses: ['agents:message'] } }).version).toBe('2.41.0')
  })
  test('takes nothing and names no project', () => {
    expect(methodParams['projects.mine'].safeParse({}).success).toBe(true)
    expect(needsProject('projects.mine')).toBe(false)
    expect(serverAskSchema.safeParse({ module: 'kehikot.claude', pass: 'p'.repeat(32), method: 'projects.mine' }).success).toBe(true)
  })
  test('its answer is a bounded list of picked projects, empty by default', () => {
    expect(projectsMineResult.parse({}).projects).toEqual([])
    const read = projectsMineResult.parse({ projects: [{ path: '/a/one', name: 'one', id: 'abc-1234-xyz' }] })
    expect(read.projects[0]!.path).toBe('/a/one')
    expect(projectsMineResult.safeParse({ projects: Array.from({ length: 201 }, (_, i) => ({ path: `/p/${i}` })) }).success).toBe(false)
  })
  test('askHost posts it with no project and parses the answer', async () => {
    let body: Record<string, unknown> = {}
    const fetch = (async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body))
      return new Response(JSON.stringify({ ok: true, data: { projects: [{ path: '/a/one', name: 'one' }] } }))
    }) as unknown as typeof globalThis.fetch
    const read = await askHost('projects.mine', {}, { module: 'kehikot.claude', env: { KEHIKOT_ORIGINS: 'http://127.0.0.1:4170' }, fetch })
    expect(body.method).toBe('projects.mine')
    expect('project' in body).toBe(false)
    expect(read.ok && read.data.projects.map((p) => p.path)).toEqual(['/a/one'])
  })
})

describe('watchKnownProjects', () => {
  test('hands each project the host lists to know, once', async () => {
    const known: string[] = []
    let answer = answered('/a/one', '/a/two')
    const watch = watchKnownProjects({ module: 'kehikot.claude', know: (path) => void known.push(path), ask: async () => answer })
    expect(await watch.tick()).toEqual({ added: ['/a/one', '/a/two'], said: 'answered' })
    answer = answered('/a/one', '/a/two', '/a/three')
    expect(await watch.tick()).toEqual({ added: ['/a/three'], said: 'answered' })
    expect(known).toEqual(['/a/one', '/a/two', '/a/three'])
    expect(watch.known()).toEqual(['/a/one', '/a/two', '/a/three'])
  })
  test('a host too old, or a refused grant, is never; no host is not-now; neither knows anything', async () => {
    const known: string[] = []
    const tooOld = watchKnownProjects({
      module: 'kehikot.claude',
      know: (path) => void known.push(path),
      ask: async () => ({ ok: false, why: 'old', reason: 'unknown-method', declined: 'host-too-old', since: '2.76.0' }),
    })
    expect((await tooOld.tick()).said).toBe('never')
    const grant = watchKnownProjects({ module: 'kehikot.claude', know: (path) => void known.push(path), ask: async () => ({ ok: false, why: 'not declared', refused: 'grant' }) })
    expect((await grant.tick()).said).toBe('never')
    const none = watchKnownProjects({ module: 'kehikot.claude', know: (path) => void known.push(path), ask: async () => ({ ok: false, why: 'no host' }) })
    expect((await none.tick()).said).toBe('not-now')
    const throws = watchKnownProjects({ module: 'kehikot.claude', know: (path) => void known.push(path), ask: async () => Promise.reject(new Error('boom')) })
    expect((await throws.tick()).said).toBe('not-now')
    expect(known).toEqual([])
  })
  test('a know that throws does not stop the others', async () => {
    const known: string[] = []
    const watch = watchKnownProjects({
      module: 'kehikot.claude',
      know: (path) => {
        if (path === '/a/one') throw new Error('nope')
        known.push(path)
      },
      ask: async () => answered('/a/one', '/a/two'),
    })
    expect((await watch.tick()).added).toEqual(['/a/one', '/a/two'])
    expect(known).toEqual(['/a/two'])
  })
  test('start asks at once, retries while no host answers, and stops after never', async () => {
    const said: Mine[] = [{ ok: false, why: 'no host' }, answered('/a/one'), { ok: false, why: 'old', declined: 'host-too-old', since: '2.76.0' }]
    let asks = 0
    const known: string[] = []
    const watch = watchKnownProjects({ module: 'kehikot.claude', know: (path) => void known.push(path), retryMs: 5, everyMs: 5, ask: async () => said[Math.min(asks++, said.length - 1)]! })
    watch.start()
    await new Promise((done) => setTimeout(done, 80))
    watch.stop()
    expect(known).toEqual(['/a/one'])
    expect(asks).toBe(3)
  })
  test('the clocks: five minutes after an answer, fifteen seconds while none', () => {
    expect(KNOWN_PROJECTS_EVERY_MS).toBe(300_000)
    expect(KNOWN_PROJECTS_RETRY_MS).toBe(15_000)
  })
})
