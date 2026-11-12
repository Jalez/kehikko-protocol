import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { AGENT_CLIS, PACKAGE_VERSION, PROTOCOL, CLI_TOOLS, guardSays, patchPaths, placedGuardsSchema, toolCallDecision, toolReading, type ToolFacts } from '../src/index.js'
import { checkToolCall } from '../src/serve/index.js'

/**
 * 2.80.0: one entry for every tool call of every agent CLI (`toolCallDecision`, `checkToolCall` in
 * `/serve`), applying every kind of guard through the protocol's own table of each CLI's tools.
 */

describe('the version', () => {
  test('is 2.80.0, PROTOCOL is still 2, and the entry declares its kind', () => {
    expect(PACKAGE_VERSION).toBe('2.87.0')
    expect(PROTOCOL).toBe(2)
    const log = readFileSync(join(resolve(dirname(new URL(import.meta.url).pathname), '..'), 'CHANGELOG.md'), 'utf8')
    expect(log).toMatch(/## 2\.80\.0 — \d{4}-\d{2}-\d{2}\n\nKind: feature\n/)
  })
})

const HOME = '/Users/p'
const MAIN = '/Users/p/Projects/app'
const LINKED = '/Users/p/Projects/app-worktrees/x'
const INSTALLED = '/Users/p/Library/Application Support/Kehikot/installed/kehikot.queue'

const guards = placedGuardsSchema.parse([
  {
    module: 'kehikot.worktrees',
    name: 'Worktrees',
    guard: { id: 'main-checkout', tool: 'edit', match: { checkouts: ['main'], paths: ['~/Library/Application Support/Kehikot/installed/**'] }, action: 'deny', why: 'Work in a worktree: git worktree add ../<repo>-worktrees/<branch> -b <branch> origin/main' },
  },
  { module: 'kehikot.worktrees', name: 'Worktrees', guard: { id: 'no-register', tool: 'shell', match: { commands: [], scripts: ['register'] }, action: 'deny', why: 'Modules run from main.' } },
  { module: 'kehikot.queue', name: 'Queue', guard: { id: 'heavy', tool: 'shell', match: { commands: ['bun test'] }, action: 'rewrite', rewrite: 'kehikot-queue run -- sh -c {command}', why: 'Heavy runs go through the queue.' } },
])
const shellOnly = guards.filter((one) => one.guard.tool === 'shell')

const facts: ToolFacts = { home: HOME, checkoutOf: (path) => (path.startsWith(`${MAIN}/`) ? 'main' : path.startsWith(`${LINKED}/`) ? 'linked' : null) }
const untouched: ToolFacts = { home: null, checkoutOf: () => { throw new Error('not asked') } }

/** For each CLI: a shell call running `command`, and an edit call on `file`, as its hook is given them. */
const calls = {
  claude: { shell: (command: string) => ({ tool: 'Bash', input: { command } }), edits: [(file: string) => ({ tool: 'Edit', input: { file_path: file, old_string: 'a', new_string: 'b' } }), (file: string) => ({ tool: 'Write', input: { file_path: file, content: '' } }), (file: string) => ({ tool: 'MultiEdit', input: { file_path: file, edits: [] } }), (file: string) => ({ tool: 'NotebookEdit', input: { notebook_path: file } })], field: 'command' },
  codex: { shell: (command: string) => ({ tool: 'Bash', input: { command } }), edits: [(file: string) => ({ tool: 'apply_patch', input: { command: `*** Begin Patch\n*** Update File: ${file}\n@@\n-a\n+b\n*** End Patch\n` } })], field: 'command' },
  vibe: { shell: (command: string) => ({ tool: 'file_system.bash', input: { command } }), edits: [(file: string) => ({ tool: 'file_system.write_file', input: { file_path: file, content: '' } }), (file: string) => ({ tool: 'file_system.edit', input: { file_path: file, old_string: 'a', new_string: 'b' } }), (file: string) => ({ tool: 'file_system.search_replace', input: { file_path: file, content: '' } })], field: 'command' },
  antigravity: { shell: (command: string) => ({ tool: 'run_command', input: { CommandLine: command, Cwd: MAIN } }), edits: [(file: string) => ({ tool: 'write_to_file', input: { TargetFile: file, CodeContent: '' } }), (file: string) => ({ tool: 'replace_file_content', input: { TargetFile: file } }), (file: string) => ({ tool: 'multi_replace_file_content', input: { TargetFile: file } })], field: 'CommandLine' },
  opencode: { shell: (command: string) => ({ tool: 'bash', input: { command } }), edits: [(file: string) => ({ tool: 'edit', input: { filePath: file } }), (file: string) => ({ tool: 'write', input: { path: file, content: '' } }), (file: string) => ({ tool: 'multiedit', input: { filePath: file, edits: [] } }), (file: string) => ({ tool: 'patch', input: { patchText: `*** Begin Patch\n*** Add File: ${file}\n+x\n*** End Patch` } })], field: 'command' },
} as const

describe('every CLI in the table', () => {
  test('the table covers exactly the agent CLIs, each with a shell tool and at least one edit tool', () => {
    expect(Object.keys(CLI_TOOLS).sort()).toEqual([...AGENT_CLIS].sort())
    for (const cli of AGENT_CLIS) {
      const kinds = Object.values(CLI_TOOLS[cli]).map((one) => one.kind)
      expect(kinds).toContain('shell')
      expect(kinds).toContain('edit')
    }
    expect(toolReading('claude', 'Read')).toBeNull()
    expect(toolReading('nobody', 'Bash')).toBeNull()
    expect(toolReading('claude', 'hasOwnProperty')).toBeNull()
  })

  for (const cli of AGENT_CLIS) {
    describe(cli, () => {
      const one = calls[cli]

      test('a shell guard denies and rewrites through the CLI’s own command field', () => {
        const denied = toolCallDecision(guards, { cli, ...one.shell('bun run register') }, facts)
        expect(denied).toMatchObject({ action: 'deny', guard: { id: 'no-register' } })
        const rewritten = toolCallDecision(guards, { cli, ...one.shell('bun test') }, facts)
        expect(rewritten).toMatchObject({ action: 'rewrite', field: one.field, command: "kehikot-queue run -- sh -c 'bun test'" })
        expect(toolCallDecision(guards, { cli, ...one.shell('ls') }, facts)).toEqual({ action: 'pass' })
      })

      test('an edit in a main checkout is refused with the guard’s message', () => {
        for (const edit of one.edits) {
          const decision = toolCallDecision(guards, { cli, ...edit(`${MAIN}/src/a.ts`) }, facts)
          expect(decision).toMatchObject({ action: 'deny', guard: { id: 'main-checkout' } })
          if (decision.action !== 'deny') throw new Error('not denied')
          expect(guardSays(decision)).toContain('git worktree add')
        }
      })

      test('an edit in a worktree, or elsewhere, is allowed', () => {
        for (const edit of one.edits) {
          expect(toolCallDecision(guards, { cli, ...edit(`${LINKED}/src/a.ts`) }, facts)).toEqual({ action: 'pass' })
          expect(toolCallDecision(guards, { cli, ...edit('/tmp/note.md') }, facts)).toEqual({ action: 'pass' })
        }
      })

      test('an edit under the installed copies is refused', () => {
        for (const edit of one.edits) expect(toolCallDecision(guards, { cli, ...edit(`${INSTALLED}/x.ts`) }, facts)).toMatchObject({ action: 'deny' })
      })

      test('with no edit guard placed, an edit passes and nothing on the computer is asked', () => {
        for (const edit of one.edits) {
          expect(toolCallDecision(shellOnly, { cli, ...edit(`${MAIN}/src/a.ts`) }, untouched)).toEqual({ action: 'pass' })
          expect(toolCallDecision([], { cli, ...edit(`${MAIN}/src/a.ts`) }, untouched)).toEqual({ action: 'pass' })
        }
      })

      test('KEHIKOT_DIRECT in the hook’s environment passes every kind', () => {
        const env = { KEHIKOT_DIRECT: '1' }
        expect(toolCallDecision(guards, { cli, ...one.shell('bun run register') }, { ...facts, env })).toEqual({ action: 'pass' })
        for (const edit of one.edits) expect(toolCallDecision(guards, { cli, ...edit(`${MAIN}/a.ts`) }, { ...facts, env })).toEqual({ action: 'pass' })
      })
    })
  }
})

describe('reading the call', () => {
  test('a relative path is read against cwd, and not looked into without one', () => {
    expect(toolCallDecision(guards, { cli: 'opencode', tool: 'edit', input: { filePath: 'src/a.ts' }, cwd: MAIN }, facts)).toMatchObject({ action: 'deny' })
    expect(toolCallDecision(guards, { cli: 'opencode', tool: 'edit', input: { filePath: 'src/a.ts' } }, facts)).toEqual({ action: 'pass' })
    expect(toolCallDecision(guards, { cli: 'codex', tool: 'apply_patch', input: { command: '*** Begin Patch\n*** Update File: ../app/a.ts\n*** End Patch' }, cwd: LINKED }, facts)).toEqual({ action: 'pass' })
  })

  test('a patch is refused when any file it touches is held, a move’s target included', () => {
    const text = `*** Begin Patch\n*** Add File: ${LINKED}/b.ts\n+x\n*** Update File: ${LINKED}/c.ts\n*** Move to: ${MAIN}/c.ts\n*** End Patch`
    expect(patchPaths(text)).toEqual([`${LINKED}/b.ts`, `${LINKED}/c.ts`, `${MAIN}/c.ts`])
    expect(toolCallDecision(guards, { cli: 'codex', tool: 'apply_patch', input: { command: text } }, facts)).toMatchObject({ action: 'deny' })
    expect(patchPaths('*** Delete File: a.ts  \r\n*** Delete File: a.ts')).toEqual(['a.ts'])
    expect(patchPaths(null)).toEqual([])
  })

  test('Vibe’s background start reads its own env, so KEHIKOT_DIRECT there passes', () => {
    expect(toolCallDecision(guards, { cli: 'vibe', tool: 'process.start', input: { command: 'bun run register', env: { KEHIKOT_DIRECT: '1' } } }, facts)).toEqual({ action: 'pass' })
    expect(toolCallDecision(guards, { cli: 'vibe', tool: 'process.start', input: { command: 'bun run register' } }, facts)).toMatchObject({ action: 'deny' })
  })

  test('an edit guard never touches a shell command, and an unknown tool or bad input passes', () => {
    expect(toolCallDecision(guards, { cli: 'claude', tool: 'Bash', input: { command: `echo x > ${MAIN}/a.ts` } }, facts)).toEqual({ action: 'pass' })
    expect(toolCallDecision(guards, { cli: 'claude', tool: 'Read', input: { file_path: `${MAIN}/a.ts` } }, facts)).toEqual({ action: 'pass' })
    expect(toolCallDecision(guards, { cli: 'claude', tool: 'Edit', input: null }, facts)).toEqual({ action: 'pass' })
    expect(toolCallDecision(guards, { cli: 'claude', tool: 'Edit', input: [`${MAIN}/a.ts`] }, facts)).toEqual({ action: 'pass' })
  })
})

describe('checkToolCall (/serve)', () => {
  test('tells the checkout from the disk: a main checkout refused, a linked worktree passes', () => {
    const root = mkdtempSync(join(tmpdir(), 'kehikot-v280-'))
    try {
      mkdirSync(join(root, 'app', '.git'), { recursive: true })
      mkdirSync(join(root, 'wt'), { recursive: true })
      writeFileSync(join(root, 'wt', '.git'), 'gitdir: ../app/.git/worktrees/wt\n')
      expect(checkToolCall({ cli: 'claude', tool: 'Write', input: { file_path: join(root, 'app', 'new', 'f.ts') } }, guards)).toMatchObject({ action: 'deny' })
      expect(checkToolCall({ cli: 'claude', tool: 'Write', input: { file_path: join(root, 'wt', 'f.ts') } }, guards)).toEqual({ action: 'pass' })
      expect(checkToolCall({ cli: 'opencode', tool: 'write', input: { path: 'f.ts' }, cwd: join(root, 'app') }, guards)).toMatchObject({ action: 'deny' })
      expect(checkToolCall({ cli: 'claude', tool: 'Write', input: { file_path: join(root, 'app', 'f.ts') } }, guards, { env: { KEHIKOT_DIRECT: '1' } })).toEqual({ action: 'pass' })
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
