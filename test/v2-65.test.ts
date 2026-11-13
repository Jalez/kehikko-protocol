import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { PACKAGE_VERSION, PROTOCOL } from '../src/index.js'
import { STAMP_FILE } from '../src/ready/build.js'
import { anyPort, inModulePorts, preferred, readRegistration, registryDir, serves } from '../src/serve/index.js'

/** 2.65.0: `PORT=0` is any free port. The module binds what the system gives and registers it. */

describe('the version', () => {
  test('is 2.66.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.98.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('anyPort', () => {
  test('PORT=0, and only that', () => {
    expect(anyPort({ PORT: '0' })).toBe(true)
    expect(anyPort({ PORT: ' 0 ' })).toBe(true)
    expect(anyPort({ PORT: '7920' })).toBe(false)
    expect(anyPort({})).toBe(false)
    /* What `preferred` always said of 0 is unchanged: not a port, so the preference. */
    expect(preferred(7920, { PORT: '0' })).toBe(7920)
  })

  test("the dev server's plugin asks Vite for a port of the band (2.97.0) and claims nothing", async () => {
    const before = process.env.PORT
    process.env.PORT = '0'
    try {
      const said = await serves({ id: 'kehikot.anyport', prefer: 1 }).config()
      /* 2.97.0: one of `MODULE_PORTS`, never 0 — see v2-97.test.ts. */
      expect(inModulePorts(said.server.port)).toBe(true)
      expect(said.server.host).toBe('127.0.0.1')
    } finally {
      if (before === undefined) delete process.env.PORT
      else process.env.PORT = before
    }
  })
})

const git = (dir: string, ...args: string[]) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()

function builtCheckout(): string {
  const dir = mkdtempSync(join(tmpdir(), 'kehikot-anyport-'))
  git(dir, 'init', '-q')
  git(dir, 'config', 'user.email', 'test@example.invalid')
  git(dir, 'config', 'user.name', 'Test')
  writeFileSync(join(dir, '.gitignore'), 'dist\n')
  writeFileSync(join(dir, 'source.ts'), 'export {}\n')
  git(dir, 'add', '.')
  git(dir, 'commit', '-q', '-m', 'one')
  mkdirSync(join(dir, 'dist'), { recursive: true })
  writeFileSync(join(dir, 'dist', 'index.html'), '<!doctype html><title>t</title>')
  writeFileSync(join(dir, 'dist', STAMP_FILE), `${git(dir, 'rev-parse', 'HEAD')}\n`)
  return dir
}

async function busyPort(): Promise<{ port: number; close: () => void }> {
  return await new Promise((resolve) => {
    const holder = createServer()
    holder.listen(0, '127.0.0.1', () => {
      const address = holder.address()
      resolve({ port: typeof address === 'object' && address ? address.port : 0, close: () => holder.close() })
    })
  })
}

describe('run with PORT=0', () => {
  let child: ReturnType<typeof Bun.spawn> | null = null
  let said: { origin: string; port: number } = { origin: '', port: 0 }
  let preferredPort: { port: number; close: () => void }
  /* Its own registry: other tests run the same fixture, and their registrations are theirs. */
  const registry = mkdtempSync(join(tmpdir(), 'kehikot-anyport-registry-'))

  beforeAll(async () => {
    /* The preferred port is held by something else: with PORT=0 nothing even looks at it. */
    preferredPort = await busyPort()
    child = Bun.spawn(['bun', join(import.meta.dirname, 'fixtures', 'ready', 'server.ts'), builtCheckout(), String(preferredPort.port)], {
      env: { ...process.env, PORT: '0', KEHIKOT_MODULES_DIR: registry },
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
        said = JSON.parse(ready.slice(6)) as { origin: string; port: number }
        break
      }
    }
  })
  afterAll(() => {
    child?.kill()
    preferredPort?.close()
  })

  test('binds a port the system gave, not the preferred one, and answers there', async () => {
    expect(said.port).toBeGreaterThan(0)
    expect(said.port).not.toBe(preferredPort.port)
    expect((await Bun.fetch(`${said.origin}/healthz`)).status).toBe(200)
  })

  test('registers the port it bound', () => {
    const registration = readRegistration(join(registryDir({ KEHIKOT_MODULES_DIR: registry }), 'kehikot.readyexample.json'))
    expect(registration?.url).toBe(said.origin)
  })
})
