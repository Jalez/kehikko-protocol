import { describe, expect, test } from 'bun:test'

import {
  GUARD_ESCAPE_ENV,
  PACKAGE_VERSION,
  SESSION_FIELD_SINCE,
  commandsRun,
  fillTemplate,
  guardDecision,
  guardSays,
  guardSchema,
  guardsSchema,
  manifestSchema,
  patternMatches,
  placeDoorsSchema,
  scriptRun,
  shellCommands,
  shellQuote,
  subagentNotes,
  templateOk,
  type Guard,
  type PlacedGuard,
} from '../src/index.js'

/** 2.61.0: guards — the shell commands a placed module holds agent sessions to — and a subagent's notes. */

const queue: Guard = {
  id: 'heavy',
  tool: 'shell',
  match: { commands: ['tsc', 'vitest', 'bun test', 'playwright test'], scripts: ['test', 'typecheck'] },
  allow: ['tsc --version', 'bun test --help'],
  action: 'rewrite',
  rewrite: 'kehikot-queue run --kind verify -- sh -c {command}',
  why: 'Heavy runs go through the queue so sessions do not overload the machine.',
}
const placed = (guard: Guard, module = 'kehikot.queue', name = 'Test runs'): PlacedGuard => ({ module, name, guard })

describe('2.61.0', () => {
  test('the version', () => {
    expect(PACKAGE_VERSION).toBe('2.73.0')
    expect(SESSION_FIELD_SINCE.guards).toBe('2.61.0')
  })
})

describe('guardSchema', () => {
  test('a rewrite guard and a deny guard parse', () => {
    expect(guardSchema.safeParse(queue).success).toBe(true)
    expect(guardSchema.safeParse({ id: 'no-dev', tool: 'shell', match: { commands: ['vite'] }, action: 'deny', why: 'Ask Dev servers for a lease.' }).success).toBe(true)
  })
  test('a rewrite needs a template naming {command} once, on one line, no other braces', () => {
    const bad = ['run', 'run {command} {command}', 'run {cmd} {command}', 'run {command}\nrm -rf ~', 'a${x} {command}'.replace('$', '')]
    for (const rewrite of bad) expect(guardSchema.safeParse({ ...queue, rewrite }).success).toBe(false)
    expect(guardSchema.safeParse({ ...queue, rewrite: undefined }).success).toBe(false)
    expect(templateOk('q run -- sh -c {command}')).toBe(true)
  })
  test('a deny has no rewrite; a guard matches something; patterns have no shell syntax', () => {
    expect(guardSchema.safeParse({ ...queue, action: 'deny' }).success).toBe(false)
    expect(guardSchema.safeParse({ ...queue, match: { commands: [] } }).success).toBe(false)
    expect(guardSchema.safeParse({ ...queue, match: { commands: ['tsc; rm'] } }).success).toBe(false)
    expect(guardSchema.safeParse({ ...queue, match: { commands: ['tsc  --x'] } }).success).toBe(false)
    expect(guardSchema.safeParse({ ...queue, tool: 'browser' }).success).toBe(false)
  })
  test('guards in a manifest: bad ones dropped, duplicates dropped, rest kept', () => {
    expect(guardsSchema.parse([queue, { id: 'x' }, { ...queue, why: 'again' }, 'no'])).toEqual([queue])
    expect(guardsSchema.parse('nope')).toEqual([])
  })
  test('a manifest carries them; a bad list does not fail the manifest', () => {
    const manifest = {
      kind: 'kehikot.module',
      protocol: 2,
      id: 'kehikot.queue',
      name: 'Test runs',
      version: '1.0.0',
      entry: 'http://localhost:4300/',
      partless: 'Runs are not about parts.',
      modes: [{ id: 'main', label: 'Main' }],
      guards: [queue],
    }
    const parsed = manifestSchema.safeParse(manifest)
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.guards).toEqual([queue])
    const bad = manifestSchema.safeParse({ ...manifest, guards: 7 })
    expect(bad.success).toBe(parsed.success)
  })
  test('the host answer carries placed guards; bad ones are left out', () => {
    const answer = placeDoorsSchema.parse({ ok: true, token: 'a'.repeat(22), doors: [], guards: [placed(queue), { module: 'x', guard: queue }, placed({ ...queue, rewrite: 'bad' })] })
    expect(answer.guards).toEqual([placed(queue)])
    expect(placeDoorsSchema.parse({ ok: true, token: 'a'.repeat(22), doors: [] }).guards).toBeUndefined()
  })
})

describe('reading a shell command', () => {
  test('splits on operators, keeps quoted text whole', () => {
    expect(shellCommands(`cd /x && bun test "a b" ; echo 'c;d' | tee out`).map((c) => c.words)).toEqual([['cd', '/x'], ['bun', 'test', 'a b'], ['echo', 'c;d'], ['tee', 'out']])
  })
  test('assignments in front are the env', () => {
    expect(shellCommands('FOO=1 BAR="x y" tsc -p .')).toEqual([{ words: ['tsc', '-p', '.'], env: { FOO: '1', BAR: 'x y' } }])
  })
  test('redirections and their targets are dropped; 2>&1 does not split', () => {
    expect(shellCommands('tsc --noEmit > out.log 2>&1 && echo ok').map((c) => c.words)).toEqual([['tsc', '--noEmit'], ['echo', 'ok']])
  })
  test('comments, escapes, substitutions and backgrounds', () => {
    expect(shellCommands('echo hi # tsc').map((c) => c.words)).toEqual([['echo', 'hi']])
    expect(shellCommands('echo a\\ b').map((c) => c.words)).toEqual([['echo', 'a b']])
    expect(shellCommands('echo $(tsc) `vitest` & bun test').map((c) => c.words[0])).toEqual(['echo', 'tsc', 'vitest', 'bun'])
  })
  test('wrappers are looked through, sh -c is looked into', () => {
    const run = (line: string) => commandsRun(line).map((c) => c.words.join(' '))
    expect(run('npx tsc -b')).toContain('tsc -b')
    expect(run('bunx --bun vitest run')).toContain('vitest run')
    expect(run('env -i FOO=1 time nice -n 5 timeout 60 ./node_modules/.bin/tsc')).toContain('./node_modules/.bin/tsc')
    expect(run('pnpm exec playwright test')).toContain('playwright test')
    expect(run(`bash -lc 'cd x && bun test'`)).toContain('bun test')
  })
  test('scripts', () => {
    expect(scriptRun(['bun', 'run', 'test'])).toBe('test')
    expect(scriptRun(['bun', '--cwd', 'x', 'run', '--silent', 'typecheck'])).toBe('typecheck')
    expect(scriptRun(['npm', 'test'])).toBe('test')
    expect(scriptRun(['npm', 't'])).toBe('test')
    expect(scriptRun(['npm', 'run-script', 'lint'])).toBe('lint')
    expect(scriptRun(['pnpm', 'test'])).toBe('test')
    expect(scriptRun(['yarn', 'typecheck'])).toBe('typecheck')
    expect(scriptRun(['bun', 'dev'])).toBe('dev')
    expect(scriptRun(['bun', 'test'])).toBeNull()
    expect(scriptRun(['bun', 'install'])).toBeNull()
    expect(scriptRun(['npm', 'install'])).toBeNull()
    expect(scriptRun(['git', 'run', 'test'])).toBeNull()
  })
  test('patterns', () => {
    expect(patternMatches('tsc', ['/a/b/tsc', '-p'])).toBe(true)
    expect(patternMatches('bun test', ['bun', 'test', 'x'])).toBe(true)
    expect(patternMatches('bun test', ['bun', 'run', 'test'])).toBe(false)
    expect(patternMatches('bun * x', ['bun', 'y', 'x'])).toBe(true)
    expect(patternMatches('tsc', ['tscx'])).toBe(false)
  })
})

describe('guardDecision', () => {
  const guards = [placed(queue)]
  test('rewrites a matching command, the whole original quoted', () => {
    const d = guardDecision(guards, 'cd /p && bun test')
    expect(d).toMatchObject({ action: 'rewrite', module: 'kehikot.queue', command: `kehikot-queue run --kind verify -- sh -c 'cd /p && bun test'` })
  })
  test('matches scripts and wrapped programs', () => {
    for (const line of ['bun run test', 'npm test', 'npx tsc --noEmit', 'bunx vitest', 'yarn typecheck', 'npx playwright test', `sh -c "tsc"`]) {
      expect(guardDecision(guards, line).action).toBe('rewrite')
    }
  })
  test('passes what it is not about', () => {
    for (const line of ['git status', 'ls -la', 'echo tsc', 'bun install', 'cat vitest.config.ts', 'grep -r "bun test" .', 'bun run lint', 'playwright --version', '']) {
      expect(guardDecision(guards, line).action).toBe('pass')
    }
  })
  test('the allowlist lets a command past', () => {
    expect(guardDecision(guards, 'tsc --version').action).toBe('pass')
    expect(guardDecision(guards, 'bun test --help').action).toBe('pass')
    expect(guardDecision(guards, 'tsc --version && tsc').action).toBe('rewrite')
  })
  test('the escape: an assignment in the command or the environment', () => {
    expect(guardDecision(guards, `${GUARD_ESCAPE_ENV}=1 bun test`).action).toBe('pass')
    expect(guardDecision(guards, `cd x && ${GUARD_ESCAPE_ENV}=1 tsc`).action).toBe('pass')
    expect(guardDecision(guards, `env ${GUARD_ESCAPE_ENV}=yes tsc`).action).toBe('pass')
    expect(guardDecision(guards, 'tsc', { env: { [GUARD_ESCAPE_ENV]: '1' } }).action).toBe('pass')
    expect(guardDecision(guards, `${GUARD_ESCAPE_ENV}=0 tsc`).action).toBe('rewrite')
    expect(guardDecision(guards, `${GUARD_ESCAPE_ENV}= tsc`).action).toBe('rewrite')
  })
  test('quoting cannot break out of the template', () => {
    const line = `bun test '; rm -rf ~; echo '`
    const d = guardDecision(guards, line)
    if (d.action !== 'rewrite') throw new Error('expected a rewrite')
    expect(d.command).toBe(`kehikot-queue run --kind verify -- sh -c ${shellQuote(line)}`)
    /* Read back, the rewritten line is the queue with the original as ONE word. */
    const [cmd] = shellCommands(d.command)
    expect(shellCommands(d.command)).toHaveLength(1)
    expect(cmd!.words.at(-1)).toBe(line)
    expect(fillTemplate('q $(x) {command}', 'a')).toBe(`q $(x) 'a'`)
    expect(fillTemplate('q {command}', `$'\\'' "$HOME"`)).toBe(`q '$'\\''\\'\\'''\\'' "$HOME"'`)
  })
  test('the rewritten command is not rewritten again', () => {
    const d = guardDecision(guards, 'tsc')
    if (d.action !== 'rewrite') throw new Error('expected a rewrite')
    expect(guardDecision(guards, d.command).action).toBe('pass')
  })
  test('a deny wins over a rewrite, and says why with the escape', () => {
    const deny = placed({ id: 'no-dev', tool: 'shell', match: { commands: ['vite', 'bun test'] }, action: 'deny', why: 'Ask Dev servers for a lease.' }, 'kehikot.dev', 'Dev servers')
    const d = guardDecision([placed(queue), deny], 'bun test')
    expect(d).toMatchObject({ action: 'deny', module: 'kehikot.dev', why: 'Ask Dev servers for a lease.' })
    if (d.action === 'pass') throw new Error('expected a deny')
    const said = guardSays(d)
    expect(said).toContain('Dev servers')
    expect(said).toContain('"Ask Dev servers for a lease."')
    expect(said).toContain(`${GUARD_ESCAPE_ENV}=1`)
  })
  test('no guards, or another tool: pass', () => {
    expect(guardDecision([], 'tsc').action).toBe('pass')
    expect(guardDecision(guards, 'x'.repeat(70_000) + ' tsc').action).toBe('pass')
  })
  test('a rewrite note names the command run', () => {
    const d = guardDecision(guards, 'tsc')
    if (d.action === 'pass') throw new Error('expected a rewrite')
    expect(guardSays(d)).toContain(`sh -c 'tsc'`)
  })
})

describe('subagentNotes', () => {
  const self = { module: 'kehikot.claude', name: 'Claude', door: 'kehikko-claude' }
  const place = { project: '/p/thesis', epic: 'methods', parts: [], kehikko: { key: 'writing', name: 'Writing' } }
  const modules = [
    { module: 'kehikot.queue', name: 'Test runs', summary: '', says: 'Queue heavy test runs here.', door: 'queue', skills: [] },
    { module: 'kehikot.claude', name: 'Claude', summary: '', door: 'kehikko-claude', skills: [] },
  ]
  test('says the place, what each module says to agents, and the guards', () => {
    const text = subagentNotes({ place, modules, self }, [placed(queue)])!
    expect(text).toContain('you are a subagent')
    expect(text).toContain('"Queue heavy test runs here."')
    expect(text).toContain('- Test runs: tsc, vitest, bun test, playwright test, script test, script typecheck')
    expect(text).not.toContain('End every turn')
    expect(text.split('\n').filter((l) => l.startsWith('- Claude'))).toHaveLength(0)
  })
  test('no place: nothing; no kehikko: no modules', () => {
    expect(subagentNotes({ place: null, modules, self })).toBeNull()
    expect(subagentNotes({ place: { ...place, kehikko: null }, modules, self })).not.toContain('Test runs')
  })
})
