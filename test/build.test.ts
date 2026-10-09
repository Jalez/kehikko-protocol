import { afterEach, describe, expect, test } from 'bun:test'
import { EventEmitter } from 'node:events'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  BUILD_HEADER,
  MESSAGE,
  PACKAGE_VERSION,
  PROTOCOL,
  WELL_KNOWN,
  buildIsStale,
  buildStamp,
  compareBuilds,
  describeBuild,
  manifestSchema,
  readBuild,
  readySchema,
  sameCode,
  sameProcess,
  type Build,
} from '../src/index.js'
import { ask, connect, makeMailbox, pageBuild, reloadWhenStale, resetServerStanding, serverStanding } from '../src/client/index.js'
import { commitOf, doorsHandler, establishBuild, pageDocument } from '../src/serve/index.js'

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const A: Build = { version: '1.0.0', commit: 'a'.repeat(40), started: '2026-10-09T10:00:00.000Z', protocol: '0.35.0' }
const restarted: Build = { ...A, started: '2026-10-09T11:00:00.000Z' }
const updated: Build = { ...restarted, commit: 'b'.repeat(40) }

function island(build: Build | null) {
  document.getElementById('build')?.remove()
  if (!build) return
  const element = document.createElement('script')
  element.id = 'build'
  element.type = 'application/json'
  element.textContent = JSON.stringify(build)
  document.body.appendChild(element)
}
afterEach(() => {
  island(null)
  resetServerStanding()
})

describe('the package version', () => {
  test('is the one in package.json', () => {
    const pkg = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8')) as { version: string }
    expect(PACKAGE_VERSION).toBe(pkg.version)
  })
})

describe('comparing builds', () => {
  test('one process is the same build', () => {
    expect(compareBuilds(A, { ...A })).toBe('same')
    expect(sameProcess(A, { ...A })).toBe(true)
    expect(buildIsStale(A, { ...A })).toBe(false)
  })

  test('another process on the same code is restarted; on other code it is changed; both are stale', () => {
    expect(compareBuilds(A, restarted)).toBe('restarted')
    expect(sameCode(A, restarted)).toBe(true)
    expect(compareBuilds(A, updated)).toBe('changed')
    expect(compareBuilds(A, { ...restarted, version: '1.0.1' })).toBe('changed')
    expect(compareBuilds(A, { ...restarted, protocol: '0.36.0' })).toBe('changed')
    expect(buildIsStale(A, restarted)).toBe(true)
    expect(buildIsStale(A, updated)).toBe(true)
  })

  test('a side that did not say is unknown, and unknown is not stale', () => {
    expect(compareBuilds(null, A)).toBe('unknown')
    expect(compareBuilds(A, undefined)).toBe('unknown')
    expect(buildIsStale(null, A)).toBe(false)
  })

  test('the stamp is one header-safe token, equal exactly when the process is', () => {
    expect(buildStamp(A)).toBe('1.0.0+aaaaaaaaaaaa@2026-10-09T10:00:00.000Z')
    expect(buildStamp(A)).not.toBe(buildStamp(restarted))
    expect(buildStamp({ ...A, commit: null, version: 'ü 1' })).toBe('__1+nogit@2026-10-09T10:00:00.000Z')
    expect(describeBuild(A)).toBe('1.0.0 (aaaaaaa), protocol package 0.35.0, running since 2026-10-09T10:00:00.000Z')
  })

  test('reading one never throws', () => {
    expect(readBuild(A)).toEqual(A)
    expect(readBuild({ ...A, commit: 'not a commit' })).toBeNull()
    expect(readBuild('nonsense')).toBeNull()
    expect(readBuild({ version: '1', started: 'x', protocol: '0.35.0' })?.commit).toBeNull()
  })
})

describe('establishing a build', () => {
  test('says the version, this package’s version, a start stamp, and the checkout’s commit', () => {
    const build = establishBuild({ version: '2.0.0', dir: here, now: new Date('2026-10-09T10:00:00.000Z') })
    expect(build.version).toBe('2.0.0')
    expect(build.protocol).toBe(PACKAGE_VERSION)
    expect(build.started).toBe('2026-10-09T10:00:00.000Z')
    expect(build.commit).toMatch(/^[0-9a-f]{40}$/)
    expect(readBuild(build)).toEqual(build)
  })

  test('outside a git checkout the commit is null, and two starts are two processes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kehikot-build-'))
    try {
      expect(commitOf(dir)).toBeNull()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
    const first = establishBuild({ version: '1', commit: null })
    await new Promise((resolve) => setTimeout(resolve, 3))
    expect(compareBuilds(first, establishBuild({ version: '1', commit: null }))).toBe('restarted')
  })
})

describe('where a build is said', () => {
  const MANIFEST = manifestSchema.parse({
    kind: 'kehikot.module',
    protocol: 2,
    id: 'kehikot.example',
    name: 'Example',
    version: '1.0.0',
    entry: '/app',
    modes: [{ id: 'main', label: 'Main' }],
    partless: 'An example with nothing in it that belongs to a part.',
  })

  function get(path: string) {
    const handler = doorsHandler({
      manifest: MANIFEST,
      build: A,
      page: { title: 'Example', ticket: 't' },
      answer: (_method, at) =>
        at === '/healthz' ? { status: 200, body: { ok: true } } : at === '/api/x' ? { status: 200, body: { ok: true } } : null,
    })
    const request = Object.assign(new EventEmitter(), { method: 'GET', url: path, headers: {} })
    const sent = { headers: {} as Record<string, string>, text: '' }
    return new Promise<typeof sent>((done) => {
      handler(
        request as never,
        {
          statusCode: 0,
          setHeader: (name, value) => void (sent.headers[name] = value),
          write: () => {},
          end: (chunk) => {
            sent.text = String(chunk ?? '')
            done(sent)
          },
        },
        () => done(sent),
      )
      queueMicrotask(() => request.emit('end'))
    })
  }

  test('the manifest carries it, and a manifest schema from before it simply does not have the field', async () => {
    const served = JSON.parse((await get(WELL_KNOWN)).text) as Record<string, unknown>
    expect(served.build).toEqual(A)
    expect(manifestSchema.parse(served).build).toEqual(A)
    /* Malformed is absent, never a manifest that fails to parse. */
    expect(manifestSchema.parse({ ...served, build: { nonsense: true } }).build).toBeUndefined()
    expect(manifestSchema.parse({ ...served, build: undefined }).build).toBeUndefined()
  })

  test('the health check carries it, and every answer carries its stamp in a header', async () => {
    const health = await get('/healthz')
    expect((JSON.parse(health.text) as { build: Build }).build).toEqual(A)
    expect(health.headers[BUILD_HEADER]).toBe(buildStamp(A))
    const other = await get('/api/x')
    expect(other.headers[BUILD_HEADER]).toBe(buildStamp(A))
    expect((JSON.parse(other.text) as { build?: Build }).build).toBeUndefined()
  })

  test('the page has it printed beside the ticket, and the page reads it back', async () => {
    const html = (await get('/app')).text
    expect(html).toContain(`<script id="build" type="application/json">${JSON.stringify(A)}</script>`)
    expect(pageDocument({ title: 't' })).not.toContain('id="build"')
    expect(pageBuild()).toBeNull()
    island(A)
    expect(pageBuild()).toEqual(A)
  })

  test('the page repeats it in `ready`, and a ready without one — or with a malformed one — still parses', () => {
    island(A)
    const said: unknown[] = []
    const host = { postMessage: (message: unknown) => void said.push(message) }
    const listeners = new Set<(ev: MessageEvent) => void>()
    const box = makeMailbox({ parent: null, addEventListener: (_type: 'message', fn: (ev: MessageEvent) => void) => void listeners.add(fn) })
    const live = connect('kehikot.example', {}, { source: box }).listen()
    for (const fn of [...listeners]) {
      fn({
        data: { type: MESSAGE.HELLO, protocol: PROTOCOL, session: 's', state: null, context: { epic: null, project: null, theme: 'light' } },
        origin: 'null',
        source: host,
      } as unknown as MessageEvent)
    }
    live.stop()
    const ready = said[0] as { type: string; build?: Build }
    expect(ready.type).toBe(MESSAGE.READY)
    expect(ready.build).toEqual(A)
    expect(readySchema.parse(ready).build).toEqual(A)
    expect(readySchema.parse({ ...ready, build: 'nonsense' }).build).toBeUndefined()
    const { build: _build, ...without } = ready
    expect(readySchema.parse(without).build).toBeUndefined()
  })
})

describe('a page noticing its server is another build', () => {
  const answering = (build: Build) =>
    (async () => new Response('{"ok":true}', { status: 200, headers: { [BUILD_HEADER]: buildStamp(build) } })) as unknown as typeof fetch

  test('the same build is up; another is stale, and the read that noticed still answers', async () => {
    island(A)
    expect((await ask('/api/x', { fetch: answering(A) })).ok).toBe(true)
    expect(serverStanding()).toBe('up')
    const read = await ask('/api/x', { fetch: answering(restarted) })
    expect(read.ok).toBe(true)
    expect(serverStanding()).toBe('stale')
  })

  test('a page with no build printed, or a server that sends no header, is never stale this way', async () => {
    await ask('/api/x', { fetch: answering(restarted) })
    expect(serverStanding()).toBe('up')
    island(A)
    await ask('/api/x', { fetch: (async () => new Response('{}', { status: 200 })) as unknown as typeof fetch })
    expect(serverStanding()).toBe('up')
  })

  test('and then the page reloads by itself — once', async () => {
    const real = location.reload
    let reloads = 0
    Object.defineProperty(location, 'reload', { configurable: true, value: () => void reloads++ })
    sessionStorage.removeItem('kehikot.reloaded')
    island(A)
    const stop = reloadWhenStale(10)
    const again = reloadWhenStale(10)
    try {
      await ask('/api/x', { fetch: answering(updated) })
      await new Promise((resolve) => setTimeout(resolve, 40))
      expect(reloads).toBe(1)
    } finally {
      stop()
      again()
      Object.defineProperty(location, 'reload', { configurable: true, value: real })
      sessionStorage.removeItem('kehikot.reloaded')
    }
  })
})
