import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { registerAt, registerNotice } from '../src/serve/index.js'

/* 2.107.0: `bun run register` in a module's folder says that Kehikot now runs that folder instead of the release. */

describe('the register notice', () => {
  const machine = mkdtempSync(join(tmpdir(), 'register-notice-'))
  const where = join(machine, 'modules')

  test('a folder of the person’s own is told what that means and how to go back', () => {
    const said = registerNotice({ id: 'kehikot.notes', dir: '/Users/someone/projects/kehikko-notes' }, where)
    expect(said).toContain('Kehikot now runs kehikot.notes from this folder (/Users/someone/projects/kehikko-notes) instead of from its release.')
    expect(said).toContain('turn Kehikko development off')
    expect(said).toContain('"Use the release"')
  })

  test('one of Kehikot’s own installed copies is told nothing', () => {
    expect(registerNotice({ id: 'kehikot.notes', dir: join(machine, 'installed', 'kehikot.notes') }, where)).toBeNull()
  })

  test('printed by `bun run register`, never by a start', () => {
    const saved = { modules: process.env.KEHIKOT_MODULES_DIR, event: process.env.npm_lifecycle_event }
    const lines: string[] = []
    const error = console.error
    console.error = (...args: unknown[]) => void lines.push(args.join(' '))
    try {
      process.env.KEHIKOT_MODULES_DIR = where
      process.env.npm_lifecycle_event = 'dev'
      registerAt({ id: 'kehikot.notes', origin: 'http://127.0.0.1:7820', dir: '/x/kehikko-notes' })
      expect(lines).toEqual([])
      process.env.npm_lifecycle_event = 'register'
      registerAt({ id: 'kehikot.notes', origin: 'http://127.0.0.1:7820', dir: '/x/kehikko-notes' })
      expect(lines.join('\n')).toContain('Kehikot now runs kehikot.notes from this folder (/x/kehikko-notes)')
      expect(JSON.parse(readFileSync(join(where, 'kehikot.notes.json'), 'utf8'))).toEqual({ url: 'http://127.0.0.1:7820', dir: '/x/kehikko-notes' })
    } finally {
      console.error = error
      if (saved.modules === undefined) delete process.env.KEHIKOT_MODULES_DIR
      else process.env.KEHIKOT_MODULES_DIR = saved.modules
      if (saved.event === undefined) delete process.env.npm_lifecycle_event
      else process.env.npm_lifecycle_event = saved.event
    }
  })
})
