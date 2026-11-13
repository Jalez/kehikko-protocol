import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { createServer, type Server } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { PACKAGE_VERSION, PROTOCOL } from '../src/index.js'
import { STAMP_FILE } from '../src/ready/build.js'
import { ADDRESSES_A_PORT_IS_FREE_ON, MODULE_PORTS, free, inModulePorts, modulePort, readRegistration, registryDir, serves } from '../src/serve/index.js'
import { bindsItsOwnWay, checkModuleServing, checkServingSources } from '../src/check/serving.js'

/**
 * 2.97.0: a module's port is nobody else's. On macOS a wildcard bind (`[::]`, as a test server
 * asking for "any port" makes) and a `127.0.0.1` bind share one port number without a clash, and a
 * request to `127.0.0.1` reaches the more specific one: the module. With `PORT=0` a module took a
 * port from the system's temporary range, where such test servers are handed theirs.
 */

describe('the version', () => {
  test('is 2.97.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.100.0')
    expect(PROTOCOL).toBe(2)
  })
})

/** Hold a port on one address, as another program would. */
function hold(host: string, port = 0): Promise<{ port: number; server: Server } | null> {
  return new Promise((resolve) => {
    const server = createServer()
    server.once('error', () => resolve(null))
    server.listen({ port, host, ipv6Only: false }, () => {
      const address = server.address()
      resolve({ port: typeof address === 'object' && address ? address.port : 0, server })
    })
  })
}

const close = (server: Server) => new Promise<void>((resolve) => server.close(() => resolve()))

/** Whether this machine has an IPv6 loopback at all (CI containers may not). */
const ipv6 = await (async () => {
  const held = await hold('::1')
  if (held) await close(held.server)
  return held !== null
})()

/** The first port the system hands out for "any port". */
function temporaryRangeStarts(): number {
  if (process.platform === 'darwin') {
    try {
      return Number(execFileSync('sysctl', ['-n', 'net.inet.ip.portrange.first'], { encoding: 'utf8' }).trim())
    } catch {
      return 49152
    }
  }
  if (process.platform === 'linux') return 32768
  return 49152
}

describe('free asks every address a port can be held on', () => {
  test('the addresses', () => {
    expect(ADDRESSES_A_PORT_IS_FREE_ON).toEqual(['127.0.0.1', '::1', '0.0.0.0', '::'])
  })

  test.skipIf(!ipv6)('a port another program holds on [::] is not free, though 127.0.0.1 alone would say it is', async () => {
    const held = (await hold('::'))!
    try {
      /* What `free` asked before 2.97.0, and what the host's own probe asked: blind to it. Only
       * where a wildcard bind and a loopback bind may share a port (macOS, the BSDs): on Linux a
       * dual-stack `[::]` bind already blocks 127.0.0.1, so there the old probe was not blind. */
      if (process.platform === 'darwin') expect(await free(held.port, '127.0.0.1')).toBe(true)
      expect(await free(held.port)).toBe(false)
    } finally {
      await close(held.server)
    }
  })

  test('a port held on 0.0.0.0 or on 127.0.0.1 is not free', async () => {
    for (const host of ['0.0.0.0', '127.0.0.1']) {
      const held = (await hold(host))!
      try {
        expect(await free(held.port)).toBe(false)
      } finally {
        await close(held.server)
      }
    }
  })

  test('a port nothing holds is free', async () => {
    const held = (await hold('127.0.0.1'))!
    await close(held.server)
    expect(await free(held.port)).toBe(true)
  })
})

describe('MODULE_PORTS', () => {
  test("is below every system's temporary range and clear of the ports modules prefer", () => {
    expect(MODULE_PORTS.to).toBeLessThan(32768)
    expect(MODULE_PORTS.to).toBeLessThan(temporaryRangeStarts())
    expect(MODULE_PORTS.from).toBeGreaterThan(9999)
    expect(inModulePorts(MODULE_PORTS.from)).toBe(true)
    expect(inModulePorts(MODULE_PORTS.to + 1)).toBe(false)
    expect(inModulePorts(0)).toBe(false)
  })

  test('a server asking the system for any port, on [::] as a test server does, is never given one of them', async () => {
    const held: Server[] = []
    try {
      for (let i = 0; i < 40; i++) {
        const one = (await hold(ipv6 ? '::' : '0.0.0.0'))!
        held.push(one.server)
        expect(inModulePorts(one.port)).toBe(false)
      }
    } finally {
      await Promise.all(held.map(close))
    }
  })
})

describe('modulePort', () => {
  test('a port of the band that is free on every address', async () => {
    const port = await modulePort()
    expect(port).not.toBeNull()
    expect(inModulePorts(port!)).toBe(true)
    expect(await free(port!)).toBe(true)
  })

  test.skipIf(!ipv6)('passes over a port another program holds on [::]', async () => {
    const held = (await hold('::', MODULE_PORTS.from + 7))
    if (!held) return
    try {
      expect(await modulePort({ start: MODULE_PORTS.from + 7 })).toBe(MODULE_PORTS.from + 8)
    } finally {
      await close(held.server)
    }
  })

  test('passes over what `taken` names, wraps around the band, and says null when all of it is held', async () => {
    const all = async () => true
    expect(await modulePort({ start: MODULE_PORTS.to, taken: (port) => port === MODULE_PORTS.to, probe: all })).toBe(MODULE_PORTS.from)
    expect(await modulePort({ probe: async () => false })).toBeNull()
  })
})

describe('PORT=0', () => {
  test("the dev server's plugin asks Vite for a port of the band, never 0", async () => {
    const before = process.env.PORT
    process.env.PORT = '0'
    try {
      const said = await serves({ id: 'kehikot.anyport', prefer: 1 }).config()
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
  const dir = mkdtempSync(join(tmpdir(), 'kehikot-band-'))
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

describe('a built module run with PORT=0, as a host starts it', () => {
  let child: ReturnType<typeof Bun.spawn> | null = null
  let said: { origin: string; port: number } = { origin: '', port: 0 }
  const registry = mkdtempSync(join(tmpdir(), 'kehikot-band-registry-'))

  beforeAll(async () => {
    child = Bun.spawn(['bun', join(import.meta.dirname, 'fixtures', 'ready', 'server.ts'), builtCheckout(), '7999'], {
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
  })

  test('binds a port of the band, outside the range the system hands out, and registers it', () => {
    expect(inModulePorts(said.port)).toBe(true)
    expect(said.port).toBeLessThan(temporaryRangeStarts())
    expect(readRegistration(join(registryDir({ KEHIKOT_MODULES_DIR: registry }), 'kehikot.readyexample.json'))?.url).toBe(said.origin)
  })

  test('a probe of that port on every address says it is held, so nothing of ours hands it out again', async () => {
    expect(await free(said.port)).toBe(false)
  })
})

describe('check:serving', () => {
  test('a file that binds its own port fails; one that takes it from the protocol passes', () => {
    expect(bindsItsOwnWay("import { createServer } from 'node:net'\nserver.listen(port, '127.0.0.1')")).toBe(true)
    expect(bindsItsOwnWay('Bun.serve({ port: 0, hostname: "127.0.0.1", fetch })')).toBe(true)
    expect(bindsItsOwnWay("import { claim } from 'kehikot-module-protocol/serve'\nconst c = await claim({ id, prefer })\nBun.serve({ port: c.port, fetch })")).toBe(false)
    expect(bindsItsOwnWay("import { run } from 'kehikot-module-protocol/run'\nawait run({ id })")).toBe(false)
    /* A client's `listen()` with nothing to bind, and a sentence about `listen(port)`, are not binds. */
    expect(bindsItsOwnWay('connection.listen()')).toBe(false)
    expect(bindsItsOwnWay('/* we never call server.listen(port) here */\nexport {}')).toBe(false)
  })

  test('a Vite config without serves() fails; with it, passes', () => {
    expect(checkServingSources('m', [{ path: 'vite.config.ts', text: 'export default { server: { port: 5173 } }' }]).failures).toHaveLength(1)
    expect(checkServingSources('m', [{ path: 'vite.config.ts', text: 'plugins: [serves({ id, prefer })]' }]).failures).toEqual([])
  })

  test('the module template passes', () => {
    expect(checkModuleServing(join(import.meta.dirname, '..', 'template')).failures).toEqual([])
  })
})
