import { afterAll, describe, expect, test } from 'bun:test'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'

import { PACKAGE_VERSION, PROTOCOL } from '../src/index.js'
import { HOST_PATH_ENV, personEnv } from '../src/serve/index.js'

/**
 * 2.30.0: `personEnv`, the environment for what a module starts on the person's behalf — the host's
 * own `bun` taken back off `PATH`, and `BUN_BE_BUN` and `KEHIKOT_HOST_PATH` dropped.
 */

const root = mkdtempSync(join(tmpdir(), 'person-env-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))

function program(path: string) {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, '#!/bin/sh\n')
  chmodSync(path, 0o755)
  return path
}

/** A folder holding a `bun` (and maybe a `node`) linked to `to`. */
function shim(name: string, to: string, names: string[] = ['bun']) {
  const dir = join(root, name)
  mkdirSync(dir, { recursive: true })
  for (const each of names) symlinkSync(to, join(dir, each))
  return dir
}

const host = program(join(root, 'Kehikot.app', 'kehikko-host'))
const personBun = program(join(root, 'home', '.bun', 'bin', 'bun'))
const personBin = join(root, 'home', '.bun', 'bin')
const ownShim = shim('kehikot-bun-abc', host)
const bunNode = shim('bun-node-502-xyz', host, ['bun', 'node'])
const other = shim('elsewhere', host)
const path = (...dirs: string[]) => dirs.join(delimiter)

describe('the version', () => {
  test('is 2.30.0, and PROTOCOL is still 2', () => {
    expect(PACKAGE_VERSION).toBe('2.34.0')
    expect(PROTOCOL).toBe(2)
  })
})

describe('personEnv under a compiled host', () => {
  const env = {
    PATH: path(bunNode, ownShim, other, personBin, '/usr/bin'),
    [HOST_PATH_ENV]: ownShim,
    BUN_BE_BUN: '1',
    HOME: '/home/me',
    UNSET: undefined,
  }
  const got = personEnv(env, { execPath: host })

  test("takes the host's folders, Bun's node shim, and any folder whose bun is the host off PATH", () => {
    expect(got.PATH).toBe(path(personBin, '/usr/bin'))
  })

  test('drops BUN_BE_BUN and KEHIKOT_HOST_PATH, and keeps the rest', () => {
    expect(got.BUN_BE_BUN).toBeUndefined()
    expect(got[HOST_PATH_ENV]).toBeUndefined()
    expect(got.HOME).toBe('/home/me')
    expect('UNSET' in got).toBe(false)
  })

  test('leaves what it was given as it was', () => {
    expect(env.BUN_BE_BUN).toBe('1')
  })
})

describe('personEnv under plain Bun', () => {
  test("a named folder goes once, so the person's own copy of it further along stays", () => {
    const env = { PATH: path(personBin, '/usr/bin', personBin), [HOST_PATH_ENV]: personBin }
    expect(personEnv(env, { execPath: personBun }).PATH).toBe(path('/usr/bin', personBin))
  })

  test("Bun's own node shim goes; a folder that merely holds this bun stays", () => {
    const nodeShim = shim('bun-node-1-plain', personBun, ['bun', 'node'])
    const env = { PATH: path(nodeShim, personBin, '/usr/bin') }
    expect(personEnv(env, { execPath: personBun }).PATH).toBe(path(personBin, '/usr/bin'))
  })

  test('a shim folder pointing somewhere else stays', () => {
    const env = { PATH: path(bunNode, '/usr/bin') }
    expect(personEnv(env, { execPath: personBun }).PATH).toBe(path(bunNode, '/usr/bin'))
  })
})

describe('personEnv by default', () => {
  test('reads process.env and drops BUN_BE_BUN', () => {
    const before = process.env.BUN_BE_BUN
    process.env.BUN_BE_BUN = '1'
    try {
      const got = personEnv()
      expect(got.BUN_BE_BUN).toBeUndefined()
      expect(got.PATH).toBeDefined()
    } finally {
      if (before === undefined) Reflect.deleteProperty(process.env, 'BUN_BE_BUN')
      else process.env.BUN_BE_BUN = before
    }
  })
})
