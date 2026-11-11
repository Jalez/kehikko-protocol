import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Bar, BarChart } from 'recharts'

import {
  GUARDS_HEAD,
  PACKAGE_VERSION,
  editDecision,
  editedPaths,
  guardDecision,
  guardLine,
  guardSays,
  guardSchema,
  guardsSchema,
  manifestSchema,
  pathMatches,
  pathPatternOk,
  placedGuardsSchema,
  plainPath,
  type PlacedGuard,
} from '../src/index.js'
import { checkoutOf } from '../src/serve/index.js'
import { ChartContainer, hideTip, resetTips, showTip, useTip, type ChartConfig } from '../src/client/ui/chart-index.js'

/**
 * 2.78.0: edit guards (a module placed on a kehikko refuses an agent's file edits under paths it names
 * or in a repository's main checkout) and shadcn's chart in `client/ui/chart`.
 */

const HOME = '/Users/person'

const worktreesGuard = {
  id: 'main-checkout',
  tool: 'edit',
  match: { checkouts: ['main'], paths: ['~/Library/Application Support/Kehikot/installed/**'] },
  action: 'deny',
  why: 'Work in a worktree: git worktree add ../<repo>-worktrees/<branch> -b <branch> origin/main',
} as const

const placed = (guard: unknown, module = 'kehikot.worktrees', name = 'Worktrees'): PlacedGuard[] => placedGuardsSchema.parse([{ module, name, guard }])

describe('an edit guard in a manifest', () => {
  test('parses with paths, checkouts and allowPaths', () => {
    const parsed = guardSchema.parse({ ...worktreesGuard, allowPaths: ['~/Projects/scratch/'] })
    expect(parsed.tool).toBe('edit')
    expect(parsed.match.checkouts).toEqual(['main'])
    expect(parsed.match.commands).toEqual([])
  })

  test('is refused without a path or checkout, as a rewrite, or with a bad pattern', () => {
    expect(guardSchema.safeParse({ ...worktreesGuard, match: {} }).success).toBe(false)
    expect(guardSchema.safeParse({ ...worktreesGuard, action: 'rewrite', rewrite: 'x {command}' }).success).toBe(false)
    expect(guardSchema.safeParse({ ...worktreesGuard, match: { paths: ['relative/**'] } }).success).toBe(false)
    expect(guardSchema.safeParse({ ...worktreesGuard, match: { paths: ['/a/../b'] } }).success).toBe(false)
    expect(guardSchema.safeParse({ ...worktreesGuard, match: { checkouts: ['linked'] } }).success).toBe(false)
  })

  test('a shell guard still needs a command or script', () => {
    expect(guardSchema.safeParse({ id: 'x', tool: 'shell', match: { paths: ['/a'] }, action: 'deny', why: 'no' }).success).toBe(false)
    expect(guardSchema.safeParse({ id: 'x', tool: 'shell', match: { scripts: ['register'] }, action: 'deny', why: 'no' }).success).toBe(true)
  })

  test('sits beside shell guards in a manifest; one that does not parse is dropped, the rest kept', () => {
    const kept = guardsSchema.parse([worktreesGuard, { id: 'bad', tool: 'edit', match: {}, action: 'deny', why: 'x' }, { id: 'register', tool: 'shell', match: { scripts: ['register'] }, action: 'deny', why: 'no' }])
    expect(kept.map((g) => g.id)).toEqual(['main-checkout', 'register'])
    const manifest = manifestSchema.parse({
      kind: 'kehikot.module',
      protocol: 2,
      id: 'kehikot.worktrees',
      name: 'Worktrees',
      entry: '/app',
      modes: [{ id: 'worktrees', label: 'Worktrees' }],
      partless: 'A worktree is a folder on this computer.',
      guards: [worktreesGuard],
    })
    expect(manifest.guards?.[0]?.tool).toBe('edit')
  })
})

describe('paths', () => {
  test('pathPatternOk', () => {
    expect(pathPatternOk('~/Library/Application Support/Kehikot/installed/**')).toBe(true)
    expect(pathPatternOk('/tmp/*.log')).toBe(true)
    expect(pathPatternOk('tmp')).toBe(false)
    expect(pathPatternOk('/a/./b')).toBe(false)
    expect(pathPatternOk('/a/{b,c}')).toBe(false)
  })

  test('plainPath steps up and drops repeats', () => {
    expect(plainPath('/a//b/./c/../d/')).toBe('/a/b/d')
    expect(plainPath('a/b')).toBeNull()
  })

  test('pathMatches: ~ is home, ** is any depth, * one name, a trailing / everything under', () => {
    const installed = '~/Library/Application Support/Kehikot/installed/**'
    expect(pathMatches(installed, `${HOME}/Library/Application Support/Kehikot/installed/kehikot.queue/doors.ts`, HOME)).toBe(true)
    expect(pathMatches(installed, `${HOME}/Library/Application Support/Kehikot/installed`, HOME)).toBe(true)
    expect(pathMatches(installed, `${HOME}/Library/Application Support/Kehikot/modules/x.json`, HOME)).toBe(false)
    expect(pathMatches(installed, `${HOME}/Library/Application Support/Kehikot/installed/../modules/x.json`, HOME)).toBe(false)
    expect(pathMatches(installed, '/elsewhere/Library/Application Support/Kehikot/installed/a', null)).toBe(false)
    expect(pathMatches('/tmp/*.log', '/tmp/a.log', HOME)).toBe(true)
    expect(pathMatches('/tmp/*.log', '/tmp/x/a.log', HOME)).toBe(false)
    expect(pathMatches('/srv/', '/srv/a/b', HOME)).toBe(true)
    expect(pathMatches('/srv/a.b', '/srv/aXb', HOME)).toBe(false)
  })
})

describe('editDecision, the rule for edits', () => {
  const guards = placed(worktreesGuard)

  test('a file in a main checkout is refused, in a linked worktree passes', () => {
    const denied = editDecision(guards, '/Users/person/Projects/app/src/a.ts', { home: HOME, checkout: 'main' })
    expect(denied.action).toBe('deny')
    expect(editDecision(guards, '/Users/person/Projects/app-worktrees/x/src/a.ts', { home: HOME, checkout: 'linked' })).toEqual({ action: 'pass' })
    expect(editDecision(guards, '/tmp/notes.md', { home: HOME, checkout: null })).toEqual({ action: 'pass' })
  })

  test('a path the guard names is refused whatever its checkout', () => {
    const decided = editDecision(guards, `${HOME}/Library/Application Support/Kehikot/installed/kehikot.queue/a.ts`, { home: HOME, checkout: 'linked' })
    expect(decided.action).toBe('deny')
  })

  test('allowPaths lets a file past', () => {
    const allowing = placed({ ...worktreesGuard, allowPaths: ['~/Projects/app/.kehikot/**'] })
    expect(editDecision(allowing, `${HOME}/Projects/app/.kehikot/notes/a.md`, { home: HOME, checkout: 'main' })).toEqual({ action: 'pass' })
  })

  test('the escape, a relative path and shell guards pass', () => {
    expect(editDecision(guards, '/x/a.ts', { checkout: 'main', env: { KEHIKOT_DIRECT: '1' } })).toEqual({ action: 'pass' })
    expect(editDecision(guards, 'src/a.ts', { checkout: 'main' })).toEqual({ action: 'pass' })
    const shell = placed({ id: 'register', tool: 'shell', match: { scripts: ['register'] }, action: 'deny', why: 'no' })
    expect(editDecision(shell, '/x/a.ts', { checkout: 'main' })).toEqual({ action: 'pass' })
  })

  test('an edit guard never decides a shell command', () => {
    expect(guardDecision(guards, 'echo hi > /x/a.ts')).toEqual({ action: 'pass' })
    expect(guardDecision(guards, 'echo hi', { tool: 'edit' })).toEqual({ action: 'pass' })
  })

  test('the words: refused, why quoted, the escape said for a session', () => {
    const denied = editDecision(guards, '/x/a.ts', { checkout: 'main' })
    if (denied.action === 'pass') throw new Error('expected a deny')
    const said = guardSays(denied)
    expect(said).toContain('Refused by Worktrees (a module on this kehikko), guard main-checkout')
    expect(said).toContain('git worktree add')
    expect(said).toContain('KEHIKOT_DIRECT=1')
  })

  test('editedPaths reads Claude Code’s edit tools', () => {
    expect(editedPaths('Edit', { file_path: '/a.ts', old_string: 'x' })).toEqual(['/a.ts'])
    expect(editedPaths('NotebookEdit', { notebook_path: '/n.ipynb' })).toEqual(['/n.ipynb'])
    expect(editedPaths('Bash', { command: 'ls' })).toEqual([])
    expect(editedPaths('Write', null)).toEqual([])
  })

  test('a subagent is told an edit guard in its words', () => {
    expect(GUARDS_HEAD).toContain('file edits')
    const line = guardLine({ module: 'kehikot.worktrees', name: 'Worktrees', guard: guardSchema.parse(worktreesGuard) })
    expect(line).toContain('edits in a main checkout')
    expect(line).toContain('edits under ~/Library/Application Support/Kehikot/installed/**')
  })
})

describe('checkoutOf', () => {
  let scratch = ''
  afterEach(() => {
    if (scratch) rmSync(scratch, { recursive: true, force: true })
    scratch = ''
  })

  test('main, linked or none, by the nearest .git; the file need not exist', () => {
    scratch = mkdtempSync(join(tmpdir(), 'checkout-'))
    mkdirSync(join(scratch, 'repo', '.git'), { recursive: true })
    mkdirSync(join(scratch, 'repo', 'src'), { recursive: true })
    mkdirSync(join(scratch, 'repo', '.claude', 'worktrees', 'x'), { recursive: true })
    writeFileSync(join(scratch, 'repo', '.claude', 'worktrees', 'x', '.git'), 'gitdir: ../../.git/worktrees/x\n')
    mkdirSync(join(scratch, 'plain'), { recursive: true })
    expect(checkoutOf(join(scratch, 'repo', 'src', 'new-file.ts'))).toBe('main')
    expect(checkoutOf(join(scratch, 'repo', 'src', 'deep', 'not', 'yet', 'a.ts'))).toBe('main')
    expect(checkoutOf(join(scratch, 'repo', '.claude', 'worktrees', 'x', 'a.ts'))).toBe('linked')
    expect(checkoutOf('src/a.ts', join(scratch, 'repo'))).toBe('main')
    expect(checkoutOf(join(scratch, 'plain', 'a.ts'))).toBeNull()
  })
})

describe('client/ui/chart', () => {
  let root: Root | null = null
  let host: HTMLElement | null = null
  afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = null
    resetTips()
  })

  test('ChartContainer sets each series’ colour as a CSS variable', () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    const config: ChartConfig = { bytes: { label: 'Size', color: 'var(--chart-1)' } }
    act(() => root!.render(createElement(ChartContainer, { config, id: 'disk' }, createElement(BarChart, { data: [{ name: 'a', bytes: 1 }] }, createElement(Bar, { dataKey: 'bytes' })))))
    expect(host.querySelector('[data-chart="chart-disk"]')).not.toBeNull()
    expect(host.querySelector('style')?.textContent).toContain('--color-bytes: var(--chart-1);')
  })

  test('one tooltip at a time, gone on Escape', () => {
    const seen: boolean[] = []
    let key: symbol | null = null
    function Probe() {
      const tip = useTip()
      key = tip.key
      seen.push(tip.mine)
      return null
    }
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    act(() => root!.render(createElement(Probe)))
    act(() => showTip(key!, host))
    expect(seen.at(-1)).toBe(true)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(seen.at(-1)).toBe(false)
    act(() => showTip(key!, host))
    act(() => hideTip())
    expect(seen.at(-1)).toBe(false)
  })
})

test('the package says 2.78.0', () => {
  expect(PACKAGE_VERSION).toBe('2.81.0')
})
