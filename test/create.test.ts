import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  PLACEHOLDERS,
  choosePort,
  copyTemplate,
  create,
  fill,
  namesFor,
  parseArgs,
  placeholderValues,
  run,
  takenPorts,
  templateDir,
} from '../src/create/index.js'

const scratch = mkdtempSync(join(tmpdir(), 'kehikko-create-'))
afterAll(() => rmSync(scratch, { recursive: true, force: true }))

/* Every test that could touch the registry gets its own, never ~/.roadmap/modules. */
const before = process.env.ROADMAP_MODULES_DIR
let registry = ''
beforeEach(() => {
  registry = mkdtempSync(join(scratch, 'registry-'))
  process.env.ROADMAP_MODULES_DIR = registry
})
afterEach(() => {
  if (before === undefined) delete process.env.ROADMAP_MODULES_DIR
  else process.env.ROADMAP_MODULES_DIR = before
})

function registerFake(id: string, port: number, dir = ''): void {
  writeFileSync(join(registry, `${id}.json`), JSON.stringify({ url: `http://127.0.0.1:${port}`, dir }))
}

describe('a module name', () => {
  test('gives every name the module is known by', () => {
    expect(namesFor('slides')).toEqual({ id: 'roadmap.slides', name: 'Slides', folder: 'slides', pkg: 'kehikko-slides' })
    expect(namesFor('reading-list').name).toBe('Reading list')
  })

  test('refuses anything that would not make a clean id, package and folder', () => {
    for (const bad of ['', 'Slides', 'my.slides', '-x', 'x-', 'a--b', '9lives', 'with space', '../up', 'x'.repeat(70)]) {
      expect(() => namesFor(bad)).toThrow()
    }
  })
})

describe('placeholders', () => {
  const values = placeholderValues(namesFor('slides'), 7990)

  test('every one is replaced, everywhere, and nothing else is touched', () => {
    const text = 'id __MODULE_ID__ / __MODULE_ID__, __MODULE_NAME__ in __MODULE_FOLDER__ (__MODULE_PACKAGE__:__MODULE_PORT__) __TICKET__'
    expect(fill(text, values)).toBe('id roadmap.slides / roadmap.slides, Slides in slides (kehikko-slides:7990) __TICKET__')
  })

  test('the template uses no placeholder the command does not know', () => {
    const unknown = new Set<string>()
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const path = join(dir, entry)
        if (statSync(path).isDirectory()) walk(path)
        else for (const found of readFileSync(path, 'utf8').match(/__MODULE_[A-Z]+__/g) ?? []) unknown.add(found)
      }
    }
    walk(templateDir())
    for (const known of PLACEHOLDERS) unknown.delete(known)
    expect([...unknown]).toEqual([])
  })

  test('a copied template has none left, in contents or names, and a .gitignore', () => {
    const to = join(scratch, 'copied')
    const files = copyTemplate(templateDir(), to, values)
    expect(files).toContain('.gitignore')
    expect(files).not.toContain('gitignore')
    for (const file of files) {
      expect(file).not.toContain('__MODULE_')
      expect(readFileSync(join(to, file), 'utf8')).not.toContain('__MODULE_')
    }
    expect(readFileSync(join(to, 'manifest.ts'), 'utf8')).toContain('PREFERRED_PORT = 7990')
  })
})

describe('the port', () => {
  test('starts at the floor on an empty machine', () => {
    expect(choosePort([])).toBe(7960)
  })

  test('is the next free step of ten above the highest taken', () => {
    expect(choosePort([7820, 7940, 7980])).toBe(7990)
    expect(choosePort([7960])).toBe(7970)
    expect(choosePort([7861])).toBe(7960)
    expect(choosePort([7961, 7970])).toBe(7980)
    expect(choosePort([8003])).toBe(8010)
  })

  test('counts every registered url, and the preferred port of each registered checkout', () => {
    const checkout = join(scratch, 'checkout')
    mkdirSync(checkout, { recursive: true })
    writeFileSync(join(checkout, 'manifest.ts'), 'export const PREFERRED_PORT = 8040\n')
    registerFake('roadmap.notes', 7940)
    registerFake('roadmap.paper', 7981, checkout)
    writeFileSync(join(registry, 'not-json.txt'), 'x')
    writeFileSync(join(registry, 'roadmap.broken.json'), '{')
    expect([...takenPorts()].sort()).toEqual([7940, 7981, 8040])
    expect(choosePort(takenPorts())).toBe(8050)
  })
})

describe('the command line', () => {
  test('reads a name, a directory and --register', () => {
    expect(parseArgs(['slides'])).toEqual({ name: 'slides', register: false })
    expect(parseArgs(['slides', '--dir', '/tmp/x', '--register'])).toEqual({ name: 'slides', dir: '/tmp/x', register: true })
    expect(parseArgs(['--dir=/tmp/y', 'slides'])).toEqual({ name: 'slides', dir: '/tmp/y', register: false })
  })

  test('says what is wrong rather than guessing', () => {
    expect(typeof parseArgs([])).toBe('string')
    expect(typeof parseArgs(['a', 'b'])).toBe('string')
    expect(typeof parseArgs(['a', '--dir'])).toBe('string')
    expect(typeof parseArgs(['a', '--force'])).toBe('string')
  })
})

describe('create refuses', () => {
  test('a directory that already has something in it', () => {
    const dir = join(scratch, 'full')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'keep.txt'), 'mine')
    expect(() => create({ name: 'full', dir, git: false, install: false, test: false })).toThrow(/not empty/)
    expect(readdirSync(dir)).toEqual(['keep.txt'])
  })

  test('a name already registered', () => {
    registerFake('roadmap.taken', 7990, '/somewhere')
    expect(() => create({ name: 'taken', dir: join(scratch, 'taken'), git: false, install: false, test: false })).toThrow(
      /already registered/,
    )
  })

  test('and with --register writes only into the registry it was given', () => {
    const made = create({ name: 'quiet', dir: join(scratch, 'quiet'), register: true, git: false, install: false, test: false })
    expect(made.registered).toBe(join(registry, 'roadmap.quiet.json'))
    expect(JSON.parse(readFileSync(made.registered!, 'utf8'))).toEqual({ url: `http://127.0.0.1:${made.port}`, dir: made.dir })
    expect(statSync(join(made.dir, 'run.sh')).mode & 0o111).toBeTruthy()
  })
})

/*
 * The one that keeps the template honest: a module generated now, installed
 * against THIS checkout of the protocol (not GitHub), passes its own tests and
 * its typecheck. Slow, because it installs a real dependency tree.
 */
describe('a generated module', () => {
  test(
    'installs, passes its own tests, and typechecks',
    () => {
      const here = resolve(dirname(fileURLToPath(import.meta.url)), '..')
      const made = create({ name: 'generated', dir: join(scratch, 'kehikko-generated'), protocolSource: `file:${here}` })
      expect(existsSync(join(made.dir, '.git'))).toBe(true)
      expect(existsSync(join(made.dir, 'node_modules', 'roadmap-module-protocol', 'dist', 'index.js'))).toBe(true)
      run('bunx', ['tsc', '--noEmit'], made.dir)
    },
    { timeout: 300_000 },
  )
})
