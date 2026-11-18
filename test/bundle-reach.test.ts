import { afterEach, describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { BUNDLE_PLATFORMS, buildBundle, packageNameOf, readTarGz } from '../src/bundle/index.js'

/* 2.104.2. The server bundle follows what the server imports, never package.json's whole dependency closure. */

const scratch: string[] = []
afterEach(() => {
  for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true })
})

const put = (root: string, path: string, content: string) => {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), content)
}

/** A package with a native addon for every platform a bundle can name. */
const nativePackage = (root: string, name: string) => {
  put(root, `node_modules/${name}/package.json`, JSON.stringify({ name, version: '1.0.0', main: 'index.js' }))
  put(root, `node_modules/${name}/index.js`, `module.exports = { name: ${JSON.stringify(name)} }`)
  for (const platform of BUNDLE_PLATFORMS) put(root, `node_modules/${name}/prebuilds/${platform}/${name}.node`, 'binary')
}

/** A module whose page-only dependency has native code and no binary for any platform. */
function fixture(serve: string): string {
  const root = mkdtempSync(join(tmpdir(), 'kehikot-reach-'))
  scratch.push(root)
  put(root, 'package.json', JSON.stringify({ name: 'sample', version: '1.0.0', dependencies: { pagelib: '1.0.0', serverlib: '1.0.0', 'kehikot-module-protocol': '2.104.1', ...(serve.includes('nativelib') ? { nativelib: '1.0.0' } : {}) } }))
  put(root, '.gitignore', 'node_modules/\nbundle-out/\n')
  put(root, 'manifest.ts', `export const manifest = { kind: 'kehikot.module', id: 'kehikot.sample', name: 'Sample', version: '1.0.0' }\n`)
  put(root, 'serve.ts', serve)
  put(root, 'node_modules/kehikot-module-protocol/package.json', JSON.stringify({ name: 'kehikot-module-protocol', version: '2.104.1' }))
  put(root, 'node_modules/serverlib/package.json', JSON.stringify({ name: 'serverlib', version: '1.0.0', main: 'index.js' }))
  put(root, 'node_modules/serverlib/index.js', `module.exports = { hello: 'server' }`)
  /* The page's PDF reader: native, optional binaries that are not here, never imported by the server. */
  put(root, 'node_modules/pagelib/package.json', JSON.stringify({ name: 'pagelib', version: '1.0.0', main: 'index.js', optionalDependencies: { 'pagelib-canvas': '1.0.0' } }))
  put(root, 'node_modules/pagelib/index.js', `module.exports = {}`)
  put(root, 'node_modules/pagelib/binding.gyp', '{}')
  put(root, 'node_modules/pagelib-canvas/package.json', JSON.stringify({ name: 'pagelib-canvas', version: '1.0.0', main: 'index.js' }))
  put(root, 'node_modules/pagelib-canvas/index.js', `module.exports = {}`)
  put(root, 'node_modules/pagelib-canvas/build/Release/canvas.node', 'binary')
  if (serve.includes('nativelib')) nativePackage(root, 'nativelib')
  execFileSync('git', ['init', '-q'], { cwd: root })
  execFileSync('git', ['add', '-A'], { cwd: root })
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'init'], { cwd: root })
  return root
}

describe('the server bundle follows the server imports', () => {
  test('a page-only dependency with native code does not break or enter the bundle', async () => {
    const root = fixture(`import { hello } from 'serverlib'\nconsole.log(hello)\n`)
    const built = await buildBundle({ dir: root, out: join(root, 'bundle-out'), log: () => {} })
    if (!built.ok) throw new Error(built.why)
    expect(built.info.native).toEqual([])
    expect(built.info.platforms).toBeNull()
    expect(Object.keys(built.info.files).some((path) => path.startsWith('node_modules/'))).toBe(false)
  })

  test('a native dependency the server imports is still carried, with its binaries', async () => {
    const root = fixture(`import { hello } from 'serverlib'\nimport nativelib from 'nativelib'\nconsole.log(hello, nativelib)\n`)
    const built = await buildBundle({ dir: root, out: join(root, 'bundle-out'), log: () => {} })
    if (!built.ok) throw new Error(built.why)
    expect(built.info.native.map((n) => n.name)).toEqual(['nativelib'])
    expect(built.info.platforms).toEqual([...BUNDLE_PLATFORMS])
    const files = readTarGz(await Bun.file(built.archive).bytes()).map((file) => file.path)
    expect(files).toContain(`node_modules/nativelib/prebuilds/${BUNDLE_PLATFORMS[0]}/nativelib.node`)
    expect(files.some((path) => path.startsWith('node_modules/pagelib'))).toBe(false)
  })

  test('which package an import names', () => {
    expect(packageNameOf('pdfjs-dist/build/pdf.mjs')).toBe('pdfjs-dist')
    expect(packageNameOf('@scope/pkg/sub')).toBe('@scope/pkg')
    expect(packageNameOf('./local')).toBeNull()
    expect(packageNameOf('node:fs')).toBeNull()
    expect(packageNameOf('bun:sqlite')).toBeNull()
  })
})
