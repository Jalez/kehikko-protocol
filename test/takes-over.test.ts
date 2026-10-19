import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { takesOver } from '../src/serve/index.js'

/**
 * A copy of a module started from a folder other than the one its registration names must not
 * take the registration over. Real folders, a scratch registry given through `where`.
 */

const ID = 'kehikot.example'

function scratch(): { where: string; here: string; there: string } {
  const root = mkdtempSync(join(tmpdir(), 'kehikot-takes-over-'))
  const where = join(root, 'registry')
  const here = join(root, 'here')
  const there = join(root, 'there')
  for (const dir of [where, here, there]) mkdirSync(dir)
  return { where, here, there }
}

function register(where: string, dir: string): void {
  writeFileSync(join(where, `${ID}.json`), JSON.stringify({ url: 'http://127.0.0.1:7960', dir }))
}

describe('takesOver', () => {
  test('nothing registered: ok', () => {
    const { where, here } = scratch()
    expect(takesOver(ID, here, where)).toEqual({ ok: true })
  })

  test('registered to this same folder, also through a link to it: ok', () => {
    const { where, here } = scratch()
    register(where, here)
    expect(takesOver(ID, here, where)).toEqual({ ok: true })
    const link = join(where, '..', 'link')
    symlinkSync(here, link)
    expect(takesOver(ID, link, where)).toEqual({ ok: true })
  })

  test('registered to another folder that exists: refused, with what holds it', () => {
    const { where, here, there } = scratch()
    register(where, there)
    const result = takesOver(ID, here, where)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.held.dir).toBe(there)
  })

  test('registered to a folder that no longer exists: ok', () => {
    const { where, here, there } = scratch()
    register(where, there)
    rmSync(there, { recursive: true })
    expect(takesOver(ID, here, where)).toEqual({ ok: true })
  })
})
