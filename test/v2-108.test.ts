import { afterEach, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { LIMITS, UNINSTALL_MARK, UNINSTALL_SCRIPT, readUninstallReport, uninstallLine } from '../src/index.js'
import { buildBundle, readTarGz } from '../src/bundle/index.js'
import { checkAgentFiles } from '../src/check/agent.js'
import { removeOwned, runUninstall } from '../src/serve/index.js'
import { AGENT_DELIVERY } from '../src/services.js'

/* 2.108.0. A module's own clean-up when a person uninstalls it: `uninstall.ts`, run by the host. */

const scratch: string[] = []
afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true })
})
const made = (prefix: string) => {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  scratch.push(dir)
  return dir
}

describe('the report a clean-up prints', () => {
  test('is one marked line, read back from among other output', () => {
    const line = uninstallLine({ removed: [{ what: 'Its hook', path: '/x/settings.json' }] })
    expect(line.startsWith(UNINSTALL_MARK)).toBe(true)
    const read = readUninstallReport(`installing…\n${line}\nbye\n`)
    expect(read).toEqual({ removed: [{ what: 'Its hook', path: '/x/settings.json' }], left: [] })
  })

  test('no marked line, or none that parses, is no report', () => {
    expect(readUninstallReport('nothing here')).toBeNull()
    expect(readUninstallReport(`${UNINSTALL_MARK}{not json`)).toBeNull()
    expect(readUninstallReport(`${UNINSTALL_MARK}{"removed":[{"what":""}]}`)).toBeNull()
  })

  test('long lists are cut, never refused', () => {
    const many = Array.from({ length: LIMITS.UNINSTALL_ITEMS + 5 }, (_, i) => ({ what: `item ${i}` }))
    expect(readUninstallReport(uninstallLine({ removed: many }))?.removed).toHaveLength(LIMITS.UNINSTALL_ITEMS)
  })
})

describe('runUninstall', () => {
  test('runs every step, keeps going past one that throws, and prints the line', async () => {
    const printed: string[] = []
    const report = await runUninstall(
      [
        () => ({ removed: [{ what: 'One' }] }),
        () => {
          throw new Error('the file was locked')
        },
        async () => ({ left: [{ what: 'Two', why: 'you changed it' }] }),
        () => undefined,
      ],
      (line) => printed.push(line),
    )
    expect(report.removed).toEqual([{ what: 'One' }])
    expect(report.left).toEqual([
      { what: 'Step 2 of the clean-up', why: 'the file was locked' },
      { what: 'Two', why: 'you changed it' },
    ])
    expect(printed).toHaveLength(1)
    expect(readUninstallReport(printed[0]!)).toEqual(report)
  })

  test('removeOwned removes a folder of its own, and its empty parent when asked; absent is nothing', () => {
    const root = made('kehikot-uninstall-')
    const parent = join(root, 'claude')
    mkdirSync(join(parent, 'sessions'), { recursive: true })
    writeFileSync(join(parent, 'sessions', 'a'), 'x')
    expect(removeOwned(join(parent, 'sessions'), 'Its sessions', { parentToo: parent })).toEqual({ removed: [{ what: 'Its sessions', path: join(parent, 'sessions') }] })
    expect(existsSync(parent)).toBe(false)
    expect(removeOwned(join(parent, 'sessions'), 'Its sessions')).toEqual({})
  })
})

describe('check:agent', () => {
  const manifest = {
    id: 'kehikot.sample',
    declares: { uses: ['agents:message'] },
    services: { [AGENT_DELIVERY]: { name: 'Sample', program: 'sample', deliver: '/api/deliver', adopt: '/api/adopt' } },
  }
  const conformance = { path: 'test/agent.test.ts', text: "import { expectAgentConformance } from 'kehikot-module-protocol/testing'\nawait expectAgentConformance({})" }

  test('fails an agent module with no uninstall.ts, or one that does not report through runUninstall', () => {
    const resumes = { path: 'resume.ts', text: 'keepsCutOffMark(now); cutOffByRestart(at); resumeLine(why)' }
    const none = checkAgentFiles(manifest, [resumes], [conformance]).failures
    expect(none).toHaveLength(1)
    expect(none[0]).toContain(UNINSTALL_SCRIPT)
    expect(checkAgentFiles(manifest, [{ path: 'uninstall.ts', text: 'console.log(1)' }, resumes], [conformance]).failures).toHaveLength(1)
    expect(checkAgentFiles(manifest, [{ path: 'uninstall.ts', text: 'await runUninstall([])' }, resumes], [conformance]).failures).toEqual([])
  })

  test('a module that does not message is not asked for one', () => {
    expect(checkAgentFiles({ id: 'x', declares: { uses: [] } }, [], []).failures).toEqual([])
  })
})

describe('a ready-built bundle', () => {
  const put = (root: string, path: string, content: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), content)
  }

  test('always carries uninstall.ts, bundled to run by path, even when the server imports it', async () => {
    const root = made('kehikot-uninstall-bundle-')
    put(root, 'package.json', JSON.stringify({ name: 'sample', version: '1.0.0', dependencies: { 'kehikot-module-protocol': '2.108.0', lib: '1.0.0' } }))
    put(root, '.gitignore', 'node_modules/\nbundle-out/\n')
    put(root, 'manifest.ts', `export const manifest = { kind: 'kehikot.module', id: 'kehikot.sample', name: 'Sample', version: '1.0.0' }\n`)
    put(root, 'node_modules/kehikot-module-protocol/package.json', JSON.stringify({ name: 'kehikot-module-protocol', version: '2.108.0' }))
    put(root, 'node_modules/lib/package.json', JSON.stringify({ name: 'lib', version: '1.0.0', main: 'index.js' }))
    put(root, 'node_modules/lib/index.js', `module.exports = { said: 'kehikot-uninstall {"removed":[],"left":[]}' }`)
    put(root, 'uninstall.ts', `import { said } from 'lib'\nexport const cleanUp = () => said\nif (import.meta.main) console.log(said)\n`)
    put(root, 'serve.ts', `import { cleanUp } from './uninstall.ts'\nconsole.log(typeof cleanUp)\n`)
    execFileSync('git', ['init', '-q'], { cwd: root })
    execFileSync('git', ['add', '-A'], { cwd: root })
    execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'init'], { cwd: root })
    const built = await buildBundle({ dir: root, out: join(root, 'bundle-out'), log: () => {} })
    if (!built.ok) throw new Error(built.why)
    const files = readTarGz(await Bun.file(built.archive).bytes())
    const script = files.find((file) => file.path === UNINSTALL_SCRIPT)
    expect(script).toBeDefined()
    const unpacked = made('kehikot-uninstall-run-')
    writeFileSync(join(unpacked, UNINSTALL_SCRIPT), script!.data)
    const out = execFileSync(process.execPath, [UNINSTALL_SCRIPT], { cwd: unpacked, encoding: 'utf8' })
    expect(readUninstallReport(out)).toEqual({ removed: [], left: [] })
  })
})
