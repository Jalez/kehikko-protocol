import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { STOP_TIMEOUT_MS } from '../src/ready/run.js'

/** 2.18.1: `run` awaits an asynchronous `onStop` on a signal, for at most `stopTimeoutMs`, before it exits. */

const FIXTURE = join(import.meta.dirname, 'fixtures', 'ready', 'stopping.ts')
const get = Bun.fetch

function checkout(): string {
  const dir = mkdtempSync(join(tmpdir(), 'kehikot-stop-'))
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' })
  git('init', '-q')
  git('config', 'user.email', 'test@example.invalid')
  git('config', 'user.name', 'Test')
  writeFileSync(join(dir, 'source.ts'), 'export {}\n')
  git('add', '.')
  git('commit', '-q', '-m', 'one')
  return dir
}

async function freePort(): Promise<number> {
  return await new Promise((resolve) => {
    const probe = createServer()
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      probe.close(() => resolve(typeof address === 'object' && address ? address.port : 0))
    })
  })
}

/** Start the fixture, wait until it answers, send `signal`, and say how it ended. */
async function stopped(ms: number, cap: number, signal: 'SIGTERM' | 'SIGINT') {
  const dir = checkout()
  const marker = join(dir, 'stopped.txt')
  const port = await freePort()
  const child = Bun.spawn(['bun', FIXTURE, dir, String(port), String(ms), String(cap), marker], {
    env: { ...process.env, PORT: '', KEHIKOT_MODULES_DIR: join(dir, 'registry') },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  for (let i = 0; i < 200; i += 1) {
    const up = await get(`http://127.0.0.1:${port}/healthz`).then((r) => r.status === 200, () => false)
    if (up) break
    await Bun.sleep(25)
  }
  const at = performance.now()
  child.kill(signal)
  const code = await child.exited
  const took = performance.now() - at
  const stillAnswers = await get(`http://127.0.0.1:${port}/healthz`).then(() => true, () => false)
  return { code, took, finished: existsSync(marker) ? readFileSync(marker, 'utf8') : null, stillAnswers, stderr: await new Response(child.stderr as ReadableStream).text() }
}

describe('run: a signal waits for an asynchronous onStop', () => {
  test('the default cap is 2.5 s, inside a host\'s 3 s quit grace', () => {
    expect(STOP_TIMEOUT_MS).toBe(2500)
    expect(STOP_TIMEOUT_MS).toBeLessThan(3000)
  })

  test('SIGTERM: onStop finishes, once, before the process exits 0', async () => {
    const said = await stopped(400, 2500, 'SIGTERM')
    expect(said.finished).toBe('finished after 400 ms, called 1 time(s)')
    expect(said.code).toBe(0)
    expect(said.took).toBeGreaterThanOrEqual(380)
    expect(said.stillAnswers).toBe(false)
  })

  test('SIGINT too', async () => {
    const said = await stopped(300, 2500, 'SIGINT')
    expect(said.finished).toBe('finished after 300 ms, called 1 time(s)')
    expect(said.code).toBe(0)
  })

  test('an onStop slower than the cap is cut off at the cap, and says so', async () => {
    const said = await stopped(5000, 300, 'SIGTERM')
    expect(said.finished).toBeNull()
    expect(said.code).toBe(0)
    expect(said.took).toBeLessThan(2000)
    expect(said.stderr).toContain('onStop did not finish within 300 ms')
  })
})
