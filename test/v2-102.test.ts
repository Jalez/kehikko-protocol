import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

import { PACKAGE_VERSION } from '../src/index.js'
import { commitOf } from '../src/serve/build.js'
import {
  BUNDLE_FILE,
  BUNDLE_RUN,
  bundleInfoOf,
  bundleRunScript,
  checkBundle,
  checksumLine,
  checksumOf,
  keptByDefault,
  pinnedProtocol,
  readTarGz,
  runsHere,
  safeRelative,
  sha256,
  smokeBundle,
  spokenOf,
  unpackBundle,
  verifyUnpacked,
  writeTarGz,
  type BundleInfo,
  type TarFile,
} from '../src/bundle/index.js'

const scratch: string[] = []
const fresh = () => {
  const dir = mkdtempSync(join(tmpdir(), 'kehikot-bundle-test-'))
  scratch.push(dir)
  return dir
}
afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const text = (value: string) => new TextEncoder().encode(value)

/** A tiny module that answers its manifest and a page on PORT, as a bundle's serve.ts would. */
const SERVE = `
const port = Number(process.env.PORT)
const manifest = { kind: 'kehikot.module', id: 'kehikot.sample', name: 'Sample', version: '1.2.3' }
Bun.serve({ port, hostname: '127.0.0.1', fetch(request) {
  const url = new URL(request.url)
  if (url.pathname === '/.well-known/kehikot-module.json') return Response.json(manifest)
  if (url.pathname === '/') return new Response('<!doctype html><html><script type="module" src="/assets/a.js"></script></html>', { headers: { 'content-type': 'text/html' } })
  if (url.pathname === '/assets/a.js') return new Response('1', { headers: { 'content-type': 'text/javascript' } })
  return new Response('no', { status: 404 })
} })
`

/** A whole, valid bundle's files: what `kehikot-bundle build` would write for a module with a page. */
function sampleFiles(overrides: Partial<BundleInfo> = {}, serve = SERVE): TarFile[] {
  const base = { id: 'kehikot.sample', version: '1.2.3', commit: 'a'.repeat(40), entry: 'serve.ts' }
  const files: TarFile[] = [
    { path: 'serve.ts', data: text(serve) },
    { path: 'dist/index.html', data: text('<!doctype html>') },
    { path: 'notes/1.2.3.md', data: text('Kind: fix\n- a fix') },
    { path: BUNDLE_RUN, data: text(bundleRunScript(base)), executable: true },
  ]
  const info: BundleInfo = {
    format: 'kehikot.bundle',
    formatVersion: 1,
    ...base,
    protocol: '2.102.0',
    builtAt: '2026-11-18T00:00:00.000Z',
    bun: '1.4.0',
    platforms: null,
    native: [],
    files: Object.fromEntries(files.map((file) => [file.path, { sha256: sha256(file.data), size: file.data.length, ...(file.executable ? { executable: true } : {}) }])),
    ...overrides,
  }
  return [...files, { path: BUNDLE_FILE, data: text(JSON.stringify(info)) }]
}

/** A tar entry written by hand, so an archive can carry what `writeTarGz` never writes. */
function rawEntry(name: string, type: string, data = new Uint8Array(0), linkname = ''): Uint8Array {
  const header = new Uint8Array(512)
  const put = (at: number, value: string) => header.set(text(value), at)
  put(0, name)
  put(100, '0000644\0')
  put(108, '0000000\0')
  put(116, '0000000\0')
  put(124, data.length.toString(8).padStart(11, '0') + '\0')
  put(136, '00000000000\0')
  header.fill(0x20, 148, 156)
  put(156, type)
  put(157, linkname)
  put(257, 'ustar\0')
  put(263, '00')
  let sum = 0
  for (const byte of header) sum += byte
  put(148, sum.toString(8).padStart(6, '0') + '\0 ')
  const pad = new Uint8Array((512 - (data.length % 512)) % 512)
  return new Uint8Array([...header, ...data, ...pad])
}
const rawArchive = (...entries: Uint8Array[]) => new Uint8Array(gzipSync(new Uint8Array([...entries.flatMap((e) => [...e]), ...new Uint8Array(1024)])))

describe('2.102.0', () => {
  test('is the package version', () => {
    expect(PACKAGE_VERSION).toBe('2.104.2')
  })

  describe('the archive', () => {
    test('round-trips files, executable bits and long paths, and is the same bytes every time', () => {
      const long = `${'a'.repeat(120)}/${'b'.repeat(90)}.js`
      const files: TarFile[] = [
        { path: 'run.sh', data: text('#!/bin/sh'), executable: true },
        { path: 'dist/assets/x.js', data: text('x'.repeat(1000)) },
        { path: long, data: text('long') },
      ]
      const once = writeTarGz(files)
      expect(sha256(writeTarGz([...files].reverse()))).toBe(sha256(once))
      const back = readTarGz(once)
      expect(back.map((file) => file.path)).toEqual(['dist/assets/x.js', 'run.sh', long].sort())
      expect(back.find((file) => file.path === 'run.sh')?.executable).toBe(true)
      expect(back.find((file) => file.path === 'dist/assets/x.js')?.executable).toBe(false)
      expect(new TextDecoder().decode(back.find((file) => file.path === long)!.data)).toBe('long')
    })

    test('a path that would leave the folder is not a path', () => {
      for (const bad of ['../x', 'a/../../x', '/etc/passwd', 'a//b', './a', 'a/./b', 'C:/x', 'a\\..\\b', 'a\0b', '']) expect(safeRelative(bad)).toBe(false)
      for (const good of ['a', 'a/b.c', 'dist/assets/index-1.js', '..a', 'a..']) expect(safeRelative(good)).toBe(true)
      expect(() => writeTarGz([{ path: '../escape', data: text('x') }])).toThrow()
    })

    test('a reader refuses an escape, a link, a device and a duplicate before returning anything', () => {
      expect(() => readTarGz(rawArchive(rawEntry('../escape.txt', '0', text('x'))))).toThrow(/outside/)
      expect(() => readTarGz(rawArchive(rawEntry('/abs.txt', '0', text('x'))))).toThrow(/outside/)
      expect(() => readTarGz(rawArchive(rawEntry('link', '2', new Uint8Array(0), '/etc/passwd')))).toThrow(/symbolic link/)
      expect(() => readTarGz(rawArchive(rawEntry('hard', '1', new Uint8Array(0), 'run.sh')))).toThrow(/hard link/)
      expect(() => readTarGz(rawArchive(rawEntry('dev', '3')))).toThrow(/regular files only/)
      expect(() => readTarGz(rawArchive(rawEntry('a', '0', text('1')), rawEntry('a', '0', text('2'))))).toThrow(/twice/)
    })

    test('a reader holds an archive to its caps while it inflates', () => {
      const big = writeTarGz([{ path: 'zeros', data: new Uint8Array(4 * 1024 * 1024) }])
      expect(big.length).toBeLessThan(64 * 1024)
      expect(() => readTarGz(big, { maxBytes: 1024 * 1024 })).toThrow()
      const many = writeTarGz(Array.from({ length: 20 }, (_, i) => ({ path: `f${i}`, data: text('x') })))
      expect(() => readTarGz(many, { maxFiles: 10 })).toThrow(/more than 10 files/)
    })
  })

  describe('bundle.json', () => {
    test('reads back a whole description and refuses a broken one', () => {
      const info = JSON.parse(new TextDecoder().decode(sampleFiles().find((file) => file.path === BUNDLE_FILE)!.data))
      expect(bundleInfoOf(info).ok).toBe(true)
      expect(bundleInfoOf({ ...info, format: 'other' }).ok).toBe(false)
      expect(bundleInfoOf({ ...info, formatVersion: 2 }).ok).toBe(false)
      expect(bundleInfoOf({ ...info, id: '../x' }).ok).toBe(false)
      expect(bundleInfoOf({ ...info, entry: '../serve.ts' }).ok).toBe(false)
      expect(bundleInfoOf({ ...info, platforms: ['windows-arm'] }).ok).toBe(false)
      expect(bundleInfoOf({ ...info, files: { ...info.files, [BUNDLE_RUN]: { ...info.files[BUNDLE_RUN], executable: false } } }).ok).toBe(false)
    })

    test('a bundle with native code runs only where it has a binary', () => {
      expect(runsHere({ platforms: null }, 'linux-x64')).toBe(true)
      expect(runsHere({ platforms: ['darwin-arm64', 'darwin-x64'] }, 'darwin-arm64')).toBe(true)
      expect(runsHere({ platforms: ['darwin-arm64'] }, 'darwin-x64')).toBe(false)
    })

    test('the checksum file is shasum\'s', () => {
      const archive = writeTarGz(sampleFiles())
      const line = checksumLine(archive, 'kehikot.sample-1.2.3.tar.gz')
      expect(line).toBe(`${sha256(archive)}  kehikot.sample-1.2.3.tar.gz\n`)
      expect(checksumOf(line)).toBe(sha256(archive))
      expect(checksumOf('nonsense')).toBeNull()
    })
  })

  describe('checking and unpacking', () => {
    const expectOf = (archive: Uint8Array) => ({ sha256: sha256(archive), id: 'kehikot.sample', version: '1.2.3', platform: 'darwin-arm64' })

    test('a whole bundle unpacks into a new folder, executable bits and all', () => {
      const archive = writeTarGz(sampleFiles())
      const target = join(fresh(), 'kehikot.sample')
      const unpacked = unpackBundle(archive, target, expectOf(archive))
      expect(unpacked.ok).toBe(true)
      expect(readFileSync(join(target, 'serve.ts'), 'utf8')).toBe(SERVE)
      expect(verifyUnpacked(target).ok).toBe(true)
      writeFileSync(join(target, 'serve.ts'), 'changed')
      expect(verifyUnpacked(target).ok).toBe(false)
    })

    test('nothing is unpacked unless the published sha256 matches', () => {
      const archive = writeTarGz(sampleFiles())
      const target = join(fresh(), 'x')
      const no = unpackBundle(archive, target, { ...expectOf(archive), sha256: 'b'.repeat(64) })
      expect(no.ok).toBe(false)
      expect(!no.ok && no.why).toMatch(/sha256/)
      expect(existsSync(target)).toBe(false)
      expect(unpackBundle(archive, target, { ...expectOf(archive), sha256: '' }).ok).toBe(false)
    })

    test('it must be the module, version and platform asked for', () => {
      const archive = writeTarGz(sampleFiles())
      expect(checkBundle(archive, { ...expectOf(archive), id: 'kehikot.other' }).ok).toBe(false)
      expect(checkBundle(archive, { ...expectOf(archive), version: '1.2.4' }).ok).toBe(false)
      const native = writeTarGz(sampleFiles({ platforms: ['darwin-x64'] }))
      expect(checkBundle(native, { ...expectOf(native), platform: 'darwin-arm64' }).ok).toBe(false)
      expect(checkBundle(native, { ...expectOf(native), platform: 'darwin-x64' }).ok).toBe(true)
    })

    test('the archive must hold exactly the files bundle.json lists, each as described', () => {
      const extra = writeTarGz([...sampleFiles(), { path: 'planted.sh', data: text('rm -rf ~') }])
      expect(checkBundle(extra, expectOf(extra)).ok).toBe(false)
      const swapped = writeTarGz(sampleFiles().map((file) => (file.path === 'serve.ts' ? { ...file, data: text('evil()') } : file)))
      expect(checkBundle(swapped, expectOf(swapped)).ok).toBe(false)
      const missing = writeTarGz(sampleFiles().filter((file) => file.path !== 'notes/1.2.3.md'))
      expect(checkBundle(missing, expectOf(missing)).ok).toBe(false)
      const none = writeTarGz(sampleFiles().filter((file) => file.path !== BUNDLE_FILE))
      expect(checkBundle(none, expectOf(none)).ok).toBe(false)
    })

    test('an archive with a link or an escape is refused, and nothing is written outside', () => {
      const root = fresh()
      const target = join(root, 'in')
      const archive = rawArchive(rawEntry('../outside.txt', '0', text('x')))
      expect(unpackBundle(archive, target, { sha256: sha256(archive) }).ok).toBe(false)
      expect(existsSync(join(root, 'outside.txt'))).toBe(false)
      expect(existsSync(target)).toBe(false)
      const link = rawArchive(rawEntry('dist', '2', new Uint8Array(0), '/tmp'), rawEntry('dist/x', '0', text('x')))
      expect(unpackBundle(link, target, { sha256: sha256(link) }).ok).toBe(false)
      expect(existsSync(target)).toBe(false)
    })

    test('a target that already exists is never written into', () => {
      const archive = writeTarGz(sampleFiles())
      const target = fresh()
      symlinkSync('/tmp', join(target, 'dist'))
      expect(unpackBundle(archive, target, expectOf(archive)).ok).toBe(false)
    })
  })

  test('a bundle says its commit without git, and a checkout still asks git', () => {
    const dir = fresh()
    expect(commitOf(dir)).toBeNull()
    writeFileSync(join(dir, BUNDLE_FILE), JSON.stringify({ format: 'kehikot.bundle', commit: 'c'.repeat(40) }))
    expect(commitOf(dir)).toBe('c'.repeat(40))
    writeFileSync(join(dir, BUNDLE_FILE), JSON.stringify({ format: 'something else', commit: 'c'.repeat(40) }))
    expect(commitOf(dir)).toBeNull()
  })

  describe('building', () => {
    test('what a running module never reads is left out', () => {
      for (const out of ['test/a.test.ts', 'src/App.tsx', 'dev/rows.ts', 'bun.lock', 'vite.config.ts', 'tsconfig.json', 'run.sh', 'register.ts', 'build.ts', 'store.test.ts', '.github/workflows/ci.yml', 'CLAUDE.md']) {
        expect(keptByDefault(out)).toBe(false)
      }
      for (const kept of ['serve.ts', 'doors.ts', 'notes/1.0.0.md', 'plugin/skills/x/SKILL.md', 'bin/cli.ts', 'hook.sh', 'package.json', 'intro.json']) expect(keptByDefault(kept)).toBe(true)
      expect(keptByDefault('src/server-data.json', { include: ['src/server-data.json'] })).toBe(true)
      expect(keptByDefault('docs/big.pdf', { exclude: ['docs/'] })).toBe(false)
    })

    test('the pinned protocol is read from the dependency', () => {
      expect(pinnedProtocol({ dependencies: { 'kehikot-module-protocol': 'git+https://github.com/Jalez/kehikko-protocol.git#v2.102.0' } })).toBe('2.102.0')
      expect(pinnedProtocol({ dependencies: {} })).toBeNull()
    })

    test('a file name spelled in an import or a comment is not a run by path; one in a string is', () => {
      const said = spokenOf(`import { a } from './hook.ts'\n// see hook.ts\n/* 'hook.ts' */\nexport { b } from "./x.ts"\nconst cli = join(dir, 'bin', 'cli.ts')`)
      expect(said).not.toContain('hook.ts')
      expect(said).not.toContain('x.ts')
      expect(said).toContain("'cli.ts'")
    })

    test('run.sh starts the entry with the Bun on PATH and nothing else', () => {
      const script = bundleRunScript({ id: 'kehikot.sample', version: '1.2.3', commit: 'a'.repeat(40), entry: 'serve.ts' })
      expect(script.startsWith('#!/bin/sh\n')).toBe(true)
      expect(script).toContain('exec bun serve.ts')
      expect(script.split('\n').filter((line) => !line.startsWith('#')).join('\n')).not.toMatch(/install|build|git /)
    })
  })

  describe('the smoke run', () => {
    test('a bundle that starts answers its manifest and its page', async () => {
      const dir = fresh()
      const archive = join(dir, 'kehikot.sample-1.2.3.tar.gz')
      const bytes = writeTarGz(sampleFiles())
      writeFileSync(archive, bytes)
      writeFileSync(`${archive}.sha256`, checksumLine(bytes, 'kehikot.sample-1.2.3.tar.gz'))
      const smoked = await smokeBundle({ archive, log: () => {} })
      expect(smoked.ok).toBe(true)
      expect(smoked.ok && smoked.page).toBe(true)
    }, 20_000)

    test('a bundle that does not start fails, with its output', async () => {
      const dir = fresh()
      const archive = join(dir, 'kehikot.sample-1.2.3.tar.gz')
      const bytes = writeTarGz(sampleFiles({}, 'console.error("cannot find module x"); process.exit(1)'))
      writeFileSync(archive, bytes)
      writeFileSync(`${archive}.sha256`, checksumLine(bytes, 'kehikot.sample-1.2.3.tar.gz'))
      const smoked = await smokeBundle({ archive, log: () => {} })
      expect(smoked.ok).toBe(false)
      expect(!smoked.ok && smoked.why).toMatch(/exited/)
      expect(!smoked.ok && smoked.output).toContain('cannot find module x')
    }, 20_000)

    test('a bundle that answers as another module fails', async () => {
      const dir = fresh()
      mkdirSync(join(dir, 'b'))
      const archive = join(dir, 'kehikot.sample-1.2.3.tar.gz')
      const bytes = writeTarGz(sampleFiles({}, SERVE.replace("version: '1.2.3'", "version: '9.9.9'")))
      writeFileSync(archive, bytes)
      writeFileSync(`${archive}.sha256`, checksumLine(bytes, 'kehikot.sample-1.2.3.tar.gz'))
      const smoked = await smokeBundle({ archive, log: () => {} })
      expect(!smoked.ok && smoked.why).toMatch(/9\.9\.9/)
    }, 20_000)
  })
})
