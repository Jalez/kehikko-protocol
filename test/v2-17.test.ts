import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { PACKAGE_VERSION, PROTOCOL, WELL_KNOWN } from '../src/index.js'
import { STAMP_FILE, buildModule, cleanTree, readStamp, readiness, writeStamp, type ViteLike } from '../src/ready/build.js'
import { fileIn, socketFence } from '../src/ready/run.js'

/* The machine's own fetch: the preload's DOM replaces the global one with a browser's, which refuses Bun's framing. */
const get = Bun.fetch

/** 2.17.0: a module served from its built page by `run`, built and stamped by `buildModule`. */

const git = (dir: string, ...args: string[]) =>
  execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()

/** A checkout with one commit, `dist/` and `index.html` ignored like a module's. */
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

/** A Vite that copies the entry into `dist/` and writes one hashed asset. */
const fakeVite = (seen: string[] = []): ViteLike => ({
  async build({ root, build }) {
    const out = join(root, build?.outDir ?? 'dist')
    mkdirSync(join(out, 'assets'), { recursive: true })
    const html = readFileSync(join(root, 'index.html'), 'utf8')
    seen.push(html)
    writeFileSync(join(out, 'index.html'), html.replace('/src/main.tsx', '/assets/main-abc123.js'))
    writeFileSync(join(out, 'assets', 'main-abc123.js'), 'console.log(1)\n')
    writeFileSync(join(out, 'favicon.svg'), '<svg/>')
  },
})

describe('the version', () => {
  test('is 2.18.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.18.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('the stamp', () => {
  test('reads the commit on the first line, and nothing else', () => {
    const dist = mkdtempSync(join(tmpdir(), 'kehikot-stamp-'))
    expect(readStamp(dist)).toBeNull()
    writeStamp(dist, 'abcdef1234567')
    expect(readStamp(dist)).toBe('abcdef1234567')
    expect(readFileSync(join(dist, STAMP_FILE), 'utf8').split('\n')[0]).toBe('abcdef1234567')
    writeFileSync(join(dist, STAMP_FILE), 'not a commit\n')
    expect(readStamp(dist)).toBeNull()
  })

  test('readiness says why a build may not be served', () => {
    const dir = checkout()
    const head = git(dir, 'rev-parse', 'HEAD')
    const dist = join(dir, 'dist')
    const none = readiness(dir)
    expect(none.ok).toBe(false)
    if (!none.ok) expect(none.why).toContain('bun run build')
    mkdirSync(dist)
    writeFileSync(join(dist, 'index.html'), '<html></html>')
    const unstamped = readiness(dir)
    expect(!unstamped.ok && unstamped.why).toContain('no stamp')
    writeStamp(dist, '1234567890abc')
    const stale = readiness(dir)
    expect(!stale.ok && stale.why).toContain(`is of 1234567, and this checkout is at ${head.slice(0, 7)}`)
    writeStamp(dist, head)
    expect(readiness(dir)).toEqual({ ok: true, commit: head })
    expect(readiness(dir, dist, null).ok).toBe(false)
  })
})

describe('buildModule', () => {
  test('writes the page for the build, takes it away, and stamps HEAD', async () => {
    const dir = checkout()
    const seen: string[] = []
    const built = await buildModule({ dir, page: { title: 'Example' }, vite: fakeVite(seen), log: () => {} })
    expect(built.stamped).toBe(true)
    expect(built.commit).toBe(git(dir, 'rev-parse', 'HEAD'))
    expect(readStamp(join(dir, 'dist'))).toBe(built.commit)
    expect(existsSync(join(dir, 'index.html'))).toBe(false)
    expect(seen[0]).toContain('<title>Example</title>')
    /* No ticket, no build, no origins: those are this process's, put in per request. */
    expect(seen[0]).not.toContain('id="ticket"')
  })

  test('a checkout with changes is built and not stamped', async () => {
    const dir = checkout()
    writeFileSync(join(dir, 'source.ts'), 'export const changed = 1\n')
    expect(cleanTree(dir)).toBe(false)
    const built = await buildModule({ dir, page: { title: 'Example' }, vite: fakeVite(), log: () => {} })
    expect(built.stamped).toBe(false)
    expect(built.why).toContain('changes to tracked files')
    expect(readStamp(join(dir, 'dist'))).toBeNull()
  })

  test('a failed build leaves no stamp, not the last one', async () => {
    const dir = checkout()
    await buildModule({ dir, page: { title: 'Example' }, vite: fakeVite(), log: () => {} })
    expect(readStamp(join(dir, 'dist'))).not.toBeNull()
    const failing: ViteLike = { build: async () => { throw new Error('vite said no') } }
    await expect(buildModule({ dir, page: { title: 'Example' }, vite: failing, log: () => {} })).rejects.toThrow('vite said no')
    expect(readStamp(join(dir, 'dist'))).toBeNull()
    expect(existsSync(join(dir, 'index.html'))).toBe(false)
  })

  test('a module with no index.html and no page is told so', async () => {
    const dir = checkout()
    await expect(buildModule({ dir, vite: fakeVite(), log: () => {} })).rejects.toThrow('no index.html')
  })
})

describe('socketFence', () => {
  const headers = (h: Record<string, string>) => new Headers(h)
  test('its own page on either loopback name', () => {
    expect(socketFence(headers({ origin: 'http://127.0.0.1:7920', host: '127.0.0.1:7920' }), 7920).ok).toBe(true)
    expect(socketFence(headers({ origin: 'http://localhost:7920', host: 'localhost:7920' }), 7920).ok).toBe(true)
  })
  test('no Origin, another origin, another port, a rebound name', () => {
    expect(socketFence(headers({ host: '127.0.0.1:7920' }), 7920).ok).toBe(false)
    expect(socketFence(headers({ origin: 'https://evil.example', host: '127.0.0.1:7920' }), 7920).ok).toBe(false)
    expect(socketFence(headers({ origin: 'http://127.0.0.1:7921', host: '127.0.0.1:7920' }), 7920).ok).toBe(false)
    expect(socketFence(headers({ origin: 'http://127.0.0.1:7920', host: 'evil.example:7920' }), 7920).ok).toBe(false)
  })
})

describe('fileIn', () => {
  const dist = mkdtempSync(join(tmpdir(), 'kehikot-dist-'))
  mkdirSync(join(dist, 'assets'))
  writeFileSync(join(dist, 'assets', 'a.js'), '1')
  writeFileSync(join(dist, STAMP_FILE), 'x')
  test('a file, and nothing else', () => {
    expect(fileIn(dist, '/assets/a.js')).toBe(join(dist, 'assets', 'a.js'))
    expect(fileIn(dist, '/assets')).toBeNull()
    expect(fileIn(dist, '/assets/')).toBeNull()
    expect(fileIn(dist, `/${STAMP_FILE}`)).toBeNull()
    expect(fileIn(dist, '/assets/../../etc/passwd')).toBeNull()
    expect(fileIn(dist, '/%2e%2e/%2e%2e/etc/passwd')).toBeNull()
    expect(fileIn(dist, '/assets/%00a.js')).toBeNull()
    expect(fileIn(dist, '/nothing.js')).toBeNull()
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

const FIXTURES = join(import.meta.dirname, 'fixtures', 'ready')

/** `run` in a child process, until it says it is ready. */
async function started(dir: string, spa = false): Promise<{ origin: string; port: number; child: ReturnType<typeof Bun.spawn>; lines: string[] }> {
  const child = Bun.spawn(['bun', join(FIXTURES, 'server.ts'), dir, String(await freePort()), spa ? 'spa' : ''], {
    env: { ...process.env, PORT: '' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const lines: string[] = []
  const reader = (child.stdout as ReadableStream<Uint8Array>).getReader()
  const text = new TextDecoder()
  let held = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) throw new Error(`the server ended before it was ready: ${lines.join('\n')}`)
    held += text.decode(value, { stream: true })
    const parts = held.split('\n')
    held = parts.pop() ?? ''
    lines.push(...parts)
    const ready = parts.find((line) => line.startsWith('READY '))
    if (ready) {
      const said = JSON.parse(ready.slice(6)) as { origin: string; port: number }
      /* Keep reading, so later lines (a refusal) are seen. */
      void (async () => {
        for (;;) {
          const next = await reader.read()
          if (next.done) return
          held += text.decode(next.value, { stream: true })
          const more = held.split('\n')
          held = more.pop() ?? ''
          lines.push(...more)
        }
      })()
      return { ...said, child, lines }
    }
  }
}

describe('run', () => {
  let dir = ''
  let server: Awaited<ReturnType<typeof started>>

  beforeAll(async () => {
    dir = checkout()
    await buildModule({ dir, page: { title: 'Ready' }, vite: fakeVite(), log: () => {} })
    server = await started(dir)
  })
  afterAll(() => server?.child.kill())

  test('the page, with this process ticket, build and origins put in', async () => {
    const response = await get(`${server.origin}/app`)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const html = await response.text()
    expect(html).toContain('<title>Ready</title>')
    expect(html).toContain('id="ticket"')
    expect(html).toContain('id="build"')
    expect(html).toContain('/assets/main-abc123.js')
  })

  test('the doors: the manifest and the health check', async () => {
    const manifestRead = await get(`${server.origin}${WELL_KNOWN}`)
    expect(((await manifestRead.json()) as { id: string }).id).toBe('kehikot.readyexample')
    expect((await get(`${server.origin}/healthz`)).status).toBe(200)
  })

  test('assets for good, other files revalidated, the stamp and directories not at all', async () => {
    const asset = await get(`${server.origin}/assets/main-abc123.js`)
    expect(asset.status).toBe(200)
    expect(asset.headers.get('cache-control')).toContain('immutable')
    const icon = await get(`${server.origin}/favicon.svg`)
    expect(icon.headers.get('cache-control')).toBe('no-cache')
    /* A page built with `base: './'` and opened at `/app/` asks for its assets under `/app/`. */
    const relative = await get(`${server.origin}/app/assets/main-abc123.js`)
    expect(relative.status).toBe(200)
    expect(relative.headers.get('cache-control')).toContain('immutable')
    expect((await get(`${server.origin}/app/${STAMP_FILE}`)).status).toBe(404)
    expect((await get(`${server.origin}/app/..%2f..%2f.git/HEAD`)).status).toBe(404)
    expect((await get(`${server.origin}/${STAMP_FILE}`)).status).toBe(404)
    expect((await get(`${server.origin}/assets/`)).status).toBe(404)
    expect((await get(`${server.origin}/assets/..%2f..%2f.git/HEAD`)).status).toBe(404)
    expect((await get(`${server.origin}/nowhere`, { headers: { accept: 'text/html' } })).status).toBe(404)
  })

  test('a socket from its own page, and none from anywhere else', async () => {
    const refused = await get(`${server.origin}/echo`, {
      headers: { upgrade: 'websocket', connection: 'upgrade', origin: 'https://evil.example', 'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==', 'sec-websocket-version': '13' },
    })
    expect(refused.status).toBe(403)
    const client = Bun.spawn(['bun', join(FIXTURES, 'socket.ts'), `ws://127.0.0.1:${server.port}/echo`, server.origin], { stdout: 'pipe' })
    expect((await new Response(client.stdout as ReadableStream).text()).trim()).toBe('1:a,2:b')
    const elsewhere = Bun.spawn(['bun', join(FIXTURES, 'socket.ts'), `ws://127.0.0.1:${server.port}/echo`, 'https://evil.example'], { stdout: 'pipe' })
    expect((await new Response(elsewhere.stdout as ReadableStream).text()).trim()).toBe('ERROR')
    expect(server.lines.some((line) => line.startsWith('REFUSED') && line.includes('evil.example'))).toBe(true)
  })

  test('a build replaced for another commit is refused, with a sentence, until a restart', async () => {
    writeStamp(join(dir, 'dist'), 'feedfacefeedface')
    const page = await get(`${server.origin}/app`)
    expect(page.status).toBe(503)
    expect(await page.text()).toContain('stale')
    expect((await get(`${server.origin}/assets/main-abc123.js`)).status).toBe(503)
    /* The doors still answer: the host can see the module is up and read what it says. */
    expect((await get(`${server.origin}/healthz`)).status).toBe(200)
  })

  test('a stale build at start is never served, and says so', async () => {
    const other = checkout()
    await buildModule({ dir: other, page: { title: 'Ready' }, vite: fakeVite(), log: () => {} })
    writeFileSync(join(other, 'source.ts'), 'export const next = 2\n')
    git(other, 'commit', '-q', '-am', 'two')
    const stale = await started(other)
    try {
      const page = await get(`${stale.origin}/app`)
      expect(page.status).toBe(503)
      expect(await page.text()).toContain('stale')
    } finally {
      stale.child.kill()
    }
  })

  test('spa: an address that is nothing gets the page, an asset does not', async () => {
    const routed = checkout()
    await buildModule({ dir: routed, page: { title: 'Ready' }, vite: fakeVite(), log: () => {} })
    const spa = await started(routed, true)
    try {
      expect((await get(`${spa.origin}/some/route`, { headers: { accept: 'text/html' } })).status).toBe(200)
      expect((await get(`${spa.origin}/some/route`)).status).toBe(404)
      expect((await get(`${spa.origin}/assets/missing.js`, { headers: { accept: 'text/html' } })).status).toBe(404)
    } finally {
      spa.child.kill()
    }
  })
})
