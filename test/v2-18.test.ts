import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { PACKAGE_VERSION, PROTOCOL } from '../src/index.js'
import { buildModule, type ViteLike } from '../src/ready/build.js'
import { NOT_HERE, corsOrigin, hostFence } from '../src/ready/run.js'
import { beforeDoors, beforeHandler } from '../src/serve/index.js'

/* The machine's own fetch: the preload's DOM replaces the global one with a browser's, which refuses Bun's framing. */
const get = Bun.fetch

/** 2.18.0: a door of a module's own asked before the protocol's (`before`), and `run`'s `cors` and Host fence. */

describe('the version', () => {
  test('is 2.19.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.40.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('hostFence', () => {
  test('the loopback names, with or without a port', () => {
    for (const host of ['127.0.0.1', '127.0.0.1:7830', 'localhost:7830', 'LOCALHOST', 'atlas.localhost:7830', '[::1]:7830']) {
      expect(hostFence(host)).toBe(true)
    }
  })
  test('any other name, none at all, and nonsense', () => {
    for (const host of [null, '', 'evil.example', 'evil.example:7830', '127.0.0.1.evil.example', 'localhost.evil.example', '10.0.0.2:7830', 'a b']) {
      expect(hostFence(host)).toBe(false)
    }
  })
  test('a name the module adds', () => {
    expect(hostFence('box.lan:7830', ['box.lan'])).toBe(true)
    expect(hostFence('other.lan:7830', ['box.lan'])).toBe(false)
  })
})

describe('corsOrigin', () => {
  const allowed = new Set(['null', 'http://127.0.0.1:4181'])
  test('echoes an origin it answers, and nothing else', () => {
    expect(corsOrigin('null', allowed)).toBe('null')
    expect(corsOrigin('http://127.0.0.1:4181', allowed)).toBe('http://127.0.0.1:4181')
    expect(corsOrigin('https://evil.example', allowed)).toBeNull()
    expect(corsOrigin(null, allowed)).toBeNull()
    expect(corsOrigin('null', null)).toBeNull()
  })
})

describe('beforeDoors', () => {
  test('is a dev-server plugin that runs setup, then mounts the handler', () => {
    const used: unknown[] = []
    let set = 0
    const plugin = beforeDoors(() => undefined, { name: 'own', setup: () => (set += 1) })
    expect(plugin.apply).toBe('serve')
    expect(plugin.name).toBe('own')
    plugin.configureServer({ middlewares: { use: (handler) => used.push(handler) } })
    expect(set).toBe(1)
    expect(used).toHaveLength(1)
    expect(typeof beforeHandler(() => undefined)).toBe('function')
  })
})

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

/** A child process, until it prints `READY <json or port>`. */
async function ready(command: string[], env: Record<string, string> = {}): Promise<{ line: string; child: ReturnType<typeof Bun.spawn> }> {
  const child = Bun.spawn(command, { env: { ...process.env, PORT: '', ...env }, stdout: 'pipe', stderr: 'pipe' })
  const reader = (child.stdout as ReadableStream<Uint8Array>).getReader()
  const text = new TextDecoder()
  let held = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) throw new Error(`ended before it was ready: ${held}${await new Response(child.stderr as ReadableStream).text()}`)
    held += text.decode(value, { stream: true })
    const line = held.split('\n').find((one) => one.startsWith('READY '))
    if (line) {
      void (async () => {
        while (!(await reader.read()).done) {
          /* Drain, so the child never blocks on a full pipe. */
        }
      })()
      return { line: line.slice(6), child }
    }
  }
}

const git = (dir: string, ...args: string[]) =>
  execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()

function checkout(): string {
  const dir = mkdtempSync(join(tmpdir(), 'kehikot-ready-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'test@example.invalid')
  git(dir, 'config', 'user.name', 'Test')
  writeFileSync(join(dir, '.gitignore'), 'dist\nindex.html\n')
  writeFileSync(join(dir, 'source.ts'), 'export {}\n')
  git(dir, 'add', '.')
  git(dir, 'commit', '-q', '-m', 'one')
  return dir
}

const fakeVite: ViteLike = {
  async build({ root, build }) {
    const out = join(root, build?.outDir ?? 'dist')
    mkdirSync(join(out, 'assets'), { recursive: true })
    writeFileSync(join(out, 'index.html'), readFileSync(join(root, 'index.html'), 'utf8').replace('/src/main.tsx', '/assets/main-abc123.js'))
    writeFileSync(join(out, 'assets', 'main-abc123.js'), 'console.log(1)\n')
  },
}

const FIXTURES = join(import.meta.dirname, 'fixtures')

/**
 * The same door, the same requests, on the three servers it can be mounted on: node's http with
 * `beforeHandler` run by node (as Vite runs), the same under Bun, and `run({ before })`. Each must
 * answer alike — that is the point of writing it once.
 */
const servers: { name: string; start: () => Promise<{ origin: string; child: ReturnType<typeof Bun.spawn> }> }[] = [
  {
    name: 'beforeHandler on node',
    start: async () => {
      const { line, child } = await ready(['node', join(FIXTURES, 'before', 'node-server.ts')])
      return { origin: `http://127.0.0.1:${line.trim()}`, child }
    },
  },
  {
    name: 'beforeHandler on Bun',
    start: async () => {
      const { line, child } = await ready(['bun', join(FIXTURES, 'before', 'node-server.ts')])
      return { origin: `http://127.0.0.1:${line.trim()}`, child }
    },
  },
  {
    name: 'run({ before })',
    start: async () => {
      const dir = checkout()
      await buildModule({ dir, page: { title: 'Ready' }, vite: fakeVite, log: () => {} })
      const { line, child } = await ready(['bun', join(FIXTURES, 'ready', 'server.ts'), dir, String(await freePort())])
      return { origin: (JSON.parse(line) as { origin: string }).origin, child }
    },
  },
]

for (const kind of servers) {
  describe(`before, through ${kind.name}`, () => {
    let origin = ''
    let child: ReturnType<typeof Bun.spawn> | null = null
    beforeAll(async () => {
      const started = await kind.start()
      origin = started.origin
      child = started.child
    })
    afterAll(() => child?.kill())

    test('answers what is its own, with the headers, the body, the asker and the ticket', async () => {
      const response = await get(`${origin}/api/own?x=1`, {
        method: 'POST',
        headers: { 'x-own-key': 'K', 'x-module-ticket': 'T1', 'content-type': 'text/plain' },
        body: 'hello',
      })
      expect(response.status).toBe(200)
      expect(response.headers.get('x-door')).toBe('own')
      const said = (await response.json()) as Record<string, unknown>
      expect(said).toMatchObject({ ok: true, method: 'POST', key: 'K', asker: 'program', ticket: 'T1', body: 'hello' })
      expect(said.host).toBe(new URL(origin).host)
    })

    test('reads the asker the way the doors do: a page elsewhere is not a program', async () => {
      const response = await get(`${origin}/api/own`, { method: 'POST', headers: { 'x-own-key': 'K', origin: 'https://evil.example' }, body: 'x' })
      expect(response.status).toBe(403)
      expect(((await response.json()) as { error: string }).error).toBe('programs only')
    })

    test('hands on what is not its own, with the body unread', async () => {
      const response = await get(`${origin}/not-a-door`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'left for vite' })
      if (kind.name.startsWith('run')) {
        /* `run` has no Vite behind it: the doors do not have the path, and nothing else does. */
        expect(response.status).toBe(404)
      } else {
        expect(await response.json()).toEqual({ vite: true, body: 'left for vite' })
      }
      expect((await get(`${origin}/healthz`)).status).toBe(200)
    })

    test('streams a body as it comes', async () => {
      const response = await get(`${origin}/api/own-stream`)
      expect(response.status).toBe(200)
      expect(await response.text()).toBe('one,two')
    })

    test('a door that throws is a 500, and the server goes on', async () => {
      expect((await get(`${origin}/api/throw`)).status).toBe(500)
      expect((await get(`${origin}/healthz`)).status).toBe(200)
    })
  })
}

describe('run: the Host fence and cors', () => {
  let plain = ''
  let crossed = ''
  const children: ReturnType<typeof Bun.spawn>[] = []

  beforeAll(async () => {
    const dir = checkout()
    await buildModule({ dir, page: { title: 'Ready' }, vite: fakeVite, log: () => {} })
    const one = await ready(['bun', join(FIXTURES, 'ready', 'server.ts'), dir, String(await freePort())])
    children.push(one.child)
    plain = (JSON.parse(one.line) as { origin: string }).origin
    const two = await ready(['bun', join(FIXTURES, 'ready', 'server.ts'), dir, String(await freePort()), '', 'cors'], {
      KEHIKOT_ORIGINS: 'http://127.0.0.1:4181',
    })
    children.push(two.child)
    crossed = (JSON.parse(two.line) as { origin: string }).origin
  })
  afterAll(() => children.forEach((child) => child.kill()))

  test('a request under another name is refused, whatever it asks for, before any door', async () => {
    for (const path of ['/app', '/healthz', '/assets/main-abc123.js', '/api/own']) {
      const response = await get(`${plain}${path}`, { headers: { host: 'evil.example', origin: 'http://evil.example', 'x-own-key': 'K' } })
      expect(response.status).toBe(403)
      expect(await response.text()).toBe(`${NOT_HERE}\n`)
    }
    expect((await get(`${plain}/healthz`, { headers: { host: `localhost:${new URL(plain).port}` } })).status).toBe(200)
  })

  test('without cors, a file carries no cross-origin header', async () => {
    const asset = await get(`${plain}/assets/main-abc123.js`, { headers: { origin: 'null' } })
    expect(asset.status).toBe(200)
    expect(asset.headers.get('access-control-allow-origin')).toBeNull()
    expect(asset.headers.get('vary')).toBeNull()
  })

  test('with cors, an opaque page, a frame origin and a named one may load a file; another origin may not', async () => {
    for (const origin of ['null', 'http://127.0.0.1:4181', 'http://127.0.0.1:9999']) {
      const asset = await get(`${crossed}/assets/main-abc123.js`, { headers: { origin } })
      expect(asset.status).toBe(200)
      expect(asset.headers.get('access-control-allow-origin')).toBe(origin)
      expect(asset.headers.get('vary')).toBe('Origin')
    }
    const foreign = await get(`${crossed}/assets/main-abc123.js`, { headers: { origin: 'https://evil.example' } })
    expect(foreign.headers.get('access-control-allow-origin')).toBeNull()
    expect(foreign.headers.get('vary')).toBe('Origin')
    /* A relative-base page's assets under /app/ too. */
    expect((await get(`${crossed}/app/assets/main-abc123.js`, { headers: { origin: 'null' } })).headers.get('access-control-allow-origin')).toBe('null')
  })

  test('with cors, a preflight for a file is answered; for a door or from elsewhere it is not', async () => {
    const preflight = (path: string, origin: string) =>
      get(`${crossed}${path}`, { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'GET', 'access-control-request-headers': 'x-a' } })
    const ok = await preflight('/assets/main-abc123.js', 'null')
    expect(ok.status).toBe(204)
    expect(ok.headers.get('access-control-allow-origin')).toBe('null')
    expect(ok.headers.get('access-control-allow-methods')).toBe('GET, HEAD')
    expect(ok.headers.get('access-control-allow-headers')).toBe('x-a')
    expect((await preflight('/assets/main-abc123.js', 'https://evil.example')).headers.get('access-control-allow-origin')).toBeNull()
    expect((await preflight('/healthz', 'null')).headers.get('access-control-allow-origin')).toBeNull()
  })

  test('with cors, the page and the doors keep their gate', async () => {
    const page = await get(`${crossed}/app`, { headers: { origin: 'null' } })
    expect(page.status).toBe(403)
    expect(page.headers.get('access-control-allow-origin')).toBeNull()
    const health = await get(`${crossed}/healthz`, { headers: { origin: 'http://127.0.0.1:4181' } })
    expect(health.status).toBe(403)
    expect(health.headers.get('access-control-allow-origin')).toBeNull()
    /* A browser opening it, and a program, as before. */
    expect((await get(`${crossed}/app`, { headers: { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate' } })).status).toBe(200)
    expect((await get(`${crossed}/healthz`)).status).toBe(200)
  })
})
