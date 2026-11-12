import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  BUILD_HEADER,
  PACKAGE_VERSION,
  PROTOCOL,
  START_HEADER,
  START_TOKEN,
  START_TOKEN_ENV,
  WELL_KNOWN,
  buildSchema,
  manifestSchema,
  readBuild,
  startTokenOf,
  startVerdict,
  type Manifest,
} from '../src/index.js'
import { STAMP_FILE } from '../src/ready/build.js'
import { doorsFetch, doorsHandler, establishBuild, personEnv } from '../src/serve/index.js'

/** 2.60.0: the start token a host hands a module it starts, and the module saying it back. */

const TOKEN = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
const OTHER = 'ffffffffffffffffffffffffffffffff'

const MANIFEST: Manifest = manifestSchema.parse({
  kind: 'kehikot.module',
  protocol: 2,
  id: 'kehikot.example',
  name: 'Example',
  version: '1.0.0',
  entry: '/app',
  modes: [{ id: 'main', label: 'Main' }],
  partless: 'An example with nothing in it that belongs to a part.',
})

describe('the version', () => {
  test('is 2.60.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.89.0')
    expect(PROTOCOL).toBe(2)
    expect(START_TOKEN_ENV).toBe('KEHIKOT_START_TOKEN')
    expect(START_HEADER).toBe('x-kehikot-start')
  })
})

describe('the token', () => {
  test('a UUID or base64url, 16 to 128 characters', () => {
    expect(START_TOKEN.test(crypto.randomUUID())).toBe(true)
    expect(START_TOKEN.test(TOKEN)).toBe(true)
    expect(START_TOKEN.test('short')).toBe(false)
    expect(START_TOKEN.test('has space in it, sixteen+')).toBe(false)
    expect(START_TOKEN.test('x'.repeat(129))).toBe(false)
  })

  test('read from the environment, or null', () => {
    expect(startTokenOf({ KEHIKOT_START_TOKEN: TOKEN })).toBe(TOKEN)
    expect(startTokenOf({ KEHIKOT_START_TOKEN: ` ${TOKEN}\n` })).toBe(TOKEN)
    expect(startTokenOf({ KEHIKOT_START_TOKEN: 'nope' })).toBeNull()
    expect(startTokenOf({})).toBeNull()
  })

  test('startVerdict: same, other, or unsaid when either side has none', () => {
    expect(startVerdict(TOKEN, TOKEN)).toBe('same')
    expect(startVerdict(TOKEN, OTHER)).toBe('other')
    expect(startVerdict(TOKEN, null)).toBe('unsaid')
    expect(startVerdict(null, TOKEN)).toBe('unsaid')
    expect(startVerdict(TOKEN, 'malformed')).toBe('unsaid')
    expect(startVerdict(undefined, undefined)).toBe('unsaid')
  })
})

describe('personEnv', () => {
  test('drops the token: what the person starts from a module is not the module', () => {
    const env = personEnv({ KEHIKOT_START_TOKEN: TOKEN, HOME: '/home/x', PATH: '/usr/bin' }, { execPath: '/usr/bin/bun' })
    expect(env.KEHIKOT_START_TOKEN).toBeUndefined()
    expect(env.HOME).toBe('/home/x')
  })
})

describe('establishBuild', () => {
  test('carries the token from the environment it is handed', () => {
    const build = establishBuild({ version: '1.0.0', commit: null, env: { KEHIKOT_START_TOKEN: TOKEN } })
    expect(build.start).toBe(TOKEN)
  })

  test('none, or a malformed one, is no token: the build is what it was before', () => {
    const none = establishBuild({ version: '1.0.0', commit: null, env: {} })
    expect('start' in none).toBe(false)
    const bad = establishBuild({ version: '1.0.0', commit: null, env: { KEHIKOT_START_TOKEN: 'x' } })
    expect('start' in bad).toBe(false)
  })

  test('start in the options wins; null is none', () => {
    expect(establishBuild({ version: '1', commit: null, start: OTHER, env: { KEHIKOT_START_TOKEN: TOKEN } }).start).toBe(OTHER)
    expect(establishBuild({ version: '1', commit: null, start: null, env: { KEHIKOT_START_TOKEN: TOKEN } }).start).toBeUndefined()
  })

  test('a build with a token reads back; a malformed token reads as absent, never a failed build', () => {
    const build = establishBuild({ version: '1.0.0', commit: null, start: TOKEN })
    expect(readBuild(build)?.start).toBe(TOKEN)
    const malformed = readBuild({ ...build, start: 'no' })
    expect(malformed).not.toBeNull()
    expect(malformed?.start).toBeUndefined()
    /* A build from before 2.60.0. */
    expect(buildSchema.safeParse({ version: '1', commit: null, started: 'now', protocol: '2.0.0' }).success).toBe(true)
  })
})

describe('the doors say it', () => {
  const build = establishBuild({ version: '1.0.0', commit: null, start: TOKEN })
  const through = doorsFetch({
    manifest: MANIFEST,
    build,
    page: { title: 'Example' },
    answer: (method, path) => (path === '/healthz' ? { status: 200, body: { ok: true } } : path === '/api/x' ? { status: 200, body: { x: 1 } } : null),
    stream: (method, path) => (path === '/api/events' ? { close() {} } : null),
  })
  const own = { host: '127.0.0.1:7000' }

  test('the manifest carries it in build, and the header', async () => {
    const response = (await through(new Request(`http://127.0.0.1:7000${WELL_KNOWN}`, { headers: own })))!
    expect(response.headers.get(START_HEADER)).toBe(TOKEN)
    expect(response.headers.get(BUILD_HEADER)).toBeTruthy()
    const body = (await response.json()) as Manifest & { build: { start?: string } }
    expect(body.build.start).toBe(TOKEN)
  })

  test('an answer, the page and a stream carry the header', async () => {
    const answered = (await through(new Request('http://127.0.0.1:7000/api/x', { headers: own })))!
    expect(answered.headers.get(START_HEADER)).toBe(TOKEN)
    const page = (await through(new Request('http://127.0.0.1:7000/app', { headers: own })))!
    expect(page.headers.get(START_HEADER)).toBe(TOKEN)
    const control = new AbortController()
    const stream = (await through(new Request('http://127.0.0.1:7000/api/events', { headers: own, signal: control.signal })))!
    expect(stream.headers.get(START_HEADER)).toBe(TOKEN)
    control.abort()
  })

  test('the node form says it too', async () => {
    const handler = doorsHandler({ manifest: MANIFEST, build, answer: () => ({ status: 200, body: {} }), page: { title: 'Example' } })
    const headers: Record<string, string> = {}
    await new Promise<void>((done) => {
      handler(
        { url: '/api/x', method: 'GET', headers: own, on() {}, socket: undefined } as never,
        { setHeader: (name: string, value: string) => (headers[name.toLowerCase()] = value), end: () => done(), statusCode: 0 } as never,
        () => done(),
      )
    })
    expect(headers[START_HEADER]).toBe(TOKEN)
  })

  test('without a token, no header: what a module sent before', async () => {
    const plain = doorsFetch({ manifest: MANIFEST, build: establishBuild({ version: '1', commit: null, env: {} }), answer: () => ({ status: 200, body: {} }), page: { title: 'x' } })
    const response = (await plain(new Request('http://127.0.0.1:7000/api/x', { headers: own })))!
    expect(response.headers.get(START_HEADER)).toBeNull()
    expect(response.headers.get(BUILD_HEADER)).toBeTruthy()
  })
})

/* `run`, in a process of its own (the preload's DOM replaces `Response`), handed a token the way a host hands it. */
const git = (dir: string, ...args: string[]) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()

function builtCheckout(): string {
  const dir = mkdtempSync(join(tmpdir(), 'kehikot-start-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'test@example.invalid')
  git(dir, 'config', 'user.name', 'Test')
  writeFileSync(join(dir, '.gitignore'), 'dist\n')
  writeFileSync(join(dir, 'source.ts'), 'export {}\n')
  git(dir, 'add', '.')
  git(dir, 'commit', '-q', '-m', 'one')
  mkdirSync(join(dir, 'dist', 'assets'), { recursive: true })
  writeFileSync(join(dir, 'dist', 'index.html'), '<!doctype html><title>t</title>')
  writeFileSync(join(dir, 'dist', 'assets', 'a.js'), 'console.log(1)\n')
  writeFileSync(join(dir, 'dist', STAMP_FILE), `${git(dir, 'rev-parse', 'HEAD')}\n`)
  return dir
}

async function freePort(): Promise<number> {
  return await new Promise((resolve) => {
    const probe = createServer()
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      const port = typeof address === 'object' && address ? address.port : 0
      probe.close(() => resolve(port))
    })
  })
}

describe('run says it on every answer', () => {
  let child: ReturnType<typeof Bun.spawn> | null = null
  let origin = ''

  beforeAll(async () => {
    const dir = builtCheckout()
    child = Bun.spawn(['bun', join(import.meta.dirname, 'fixtures', 'ready', 'server.ts'), dir, String(await freePort())], {
      env: { ...process.env, PORT: '', KEHIKOT_START_TOKEN: TOKEN },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const reader = (child.stdout as ReadableStream<Uint8Array>).getReader()
    const text = new TextDecoder()
    let held = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) throw new Error(`the server ended before it was ready: ${held}`)
      held += text.decode(value, { stream: true })
      const ready = held.split('\n').find((line) => line.startsWith('READY '))
      if (ready) {
        origin = (JSON.parse(ready.slice(6)) as { origin: string }).origin
        break
      }
    }
  })
  afterAll(() => child?.kill())

  const get = (path: string, headers: Record<string, string> = {}) => Bun.fetch(`${origin}${path}`, { headers })

  test('the manifest, a file of dist/, the page and a 404', async () => {
    const manifest = await get(WELL_KNOWN)
    expect(manifest.headers.get(START_HEADER)).toBe(TOKEN)
    expect(((await manifest.json()) as { build: { start: string } }).build.start).toBe(TOKEN)
    expect((await get('/assets/a.js')).headers.get(START_HEADER)).toBe(TOKEN)
    expect((await get('/app')).headers.get(START_HEADER)).toBe(TOKEN)
    const missing = await get('/nothing-here')
    expect(missing.status).toBe(404)
    expect(missing.headers.get(START_HEADER)).toBe(TOKEN)
  })

  test("a module's own door's answer too", async () => {
    const response = await get('/api/own', { 'x-own-key': 'k' })
    expect(response.status).toBe(200)
    expect(response.headers.get(START_HEADER)).toBe(TOKEN)
  })
})
