import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'

import { BUNDLE_FILE, bundleInfoOf, runsHere, platformHere, sha256, type BundleInfo } from './format.js'
import { BUNDLE_LIMITS, readTarGz, TarRefused, type TarFile, type TarLimits } from './tar.js'

/**
 * A bundle checked and unpacked (2.102.0). Node or Bun. Design notes: docs/bundles.md.
 *
 * Everything is checked BEFORE a byte is written: the archive's sha256 against the one published
 * beside it, every entry's path and type (`readTarGz`), `bundle.json`'s shape, that it is the module
 * and version that was asked for, that it runs on this platform, and that the archive holds exactly
 * the files `bundle.json` lists, each with its sha256 and size. Then it is written into a folder that
 * did not exist, and nowhere else.
 */

export interface UnpackExpect {
  /** The sha256 the release published beside the archive. Required: an archive nobody vouched for is not unpacked. */
  sha256: string
  /** The module it must be. */
  id?: string
  /** The version it must be. */
  version?: string
  /** This machine, as `platformHere` says it. */
  platform?: string
}

export type Unpacked = { ok: true; info: BundleInfo; dir: string; files: number; bytes: number } | { ok: false; why: string }

/**
 * Check `archive` and, only when every check passes, write it into `target`, which must not exist
 * yet (its parent is made). On a refusal nothing is left at `target`. Never throws for a bad
 * archive: the answer says why, in a sentence.
 */
export function unpackBundle(archive: Uint8Array, target: string, expect: UnpackExpect, limits: TarLimits & { archiveBytes?: number } = {}): Unpacked {
  const checked = checkBundle(archive, expect, limits)
  if (!checked.ok) return checked
  if (existsSync(target)) return { ok: false, why: `${target} already exists; a bundle is unpacked into a new folder only.` }
  try {
    mkdirSync(target, { recursive: true })
    const root = realpathSync(target)
    let bytes = 0
    for (const file of checked.files) {
      const where = join(root, ...file.path.split('/'))
      /* `safeRelative` already refused every way out; this is the same question asked of the real path. */
      if (!where.startsWith(root + sep)) throw new TarRefused(`${file.path} would land outside ${target}.`)
      const folder = dirname(where)
      mkdirSync(folder, { recursive: true })
      /* A folder made above is a real folder: nothing in the archive could have made a link to follow. */
      if (relative(root, realpathSync(folder)).split(sep).includes('..')) throw new TarRefused(`${file.path} would land outside ${target}.`)
      writeFileSync(where, file.data, { flag: 'wx' })
      chmodSync(where, file.executable ? 0o755 : 0o644)
      bytes += file.data.length
    }
    return { ok: true, info: checked.info, dir: root, files: checked.files.length, bytes }
  } catch (error) {
    rmSync(target, { recursive: true, force: true })
    return { ok: false, why: (error as Error).message }
  }
}

/** Every check `unpackBundle` makes, without writing anything: the files and what `bundle.json` says, or why not. */
export function checkBundle(
  archive: Uint8Array,
  expect: UnpackExpect,
  limits: TarLimits & { archiveBytes?: number } = {},
): { ok: true; info: BundleInfo; files: TarFile[] } | { ok: false; why: string } {
  const most = limits.archiveBytes ?? BUNDLE_LIMITS.archiveBytes
  if (archive.length > most) return { ok: false, why: `The bundle is ${Math.round(archive.length / 1024 / 1024)} MB, over the ${Math.round(most / 1024 / 1024)} MB a bundle may be.` }
  if (!/^[0-9a-f]{64}$/.test(expect.sha256)) return { ok: false, why: 'No sha256 was given for the bundle, so nothing vouches for it.' }
  const got = sha256(archive)
  if (got !== expect.sha256) return { ok: false, why: `The bundle's sha256 is ${got.slice(0, 12)}…, not the ${expect.sha256.slice(0, 12)}… its release published. It was not unpacked.` }
  let files: TarFile[]
  try {
    files = readTarGz(archive, limits)
  } catch (error) {
    return { ok: false, why: (error as Error).message }
  }
  const described = files.find((file) => file.path === BUNDLE_FILE)
  if (!described) return { ok: false, why: `The archive has no ${BUNDLE_FILE}, so it is not a bundle.` }
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder().decode(described.data))
  } catch {
    return { ok: false, why: `${BUNDLE_FILE} is not JSON.` }
  }
  const read = bundleInfoOf(parsed)
  if (!read.ok) return read
  const info = read.info
  if (expect.id !== undefined && info.id !== expect.id) return { ok: false, why: `The bundle is of ${info.id}, not ${expect.id}.` }
  if (expect.version !== undefined && info.version !== expect.version) return { ok: false, why: `The bundle is ${info.version}, not ${expect.version}.` }
  const here = expect.platform ?? platformHere()
  if (!runsHere(info, here)) return { ok: false, why: `The bundle has native code for ${info.platforms!.join(' and ')} only, not ${here}.` }
  const listed = new Set(Object.keys(info.files))
  for (const file of files) {
    if (file.path === BUNDLE_FILE) continue
    const said = info.files[file.path]
    if (!said || !Object.hasOwn(info.files, file.path)) return { ok: false, why: `${file.path} is in the archive and not in ${BUNDLE_FILE}.` }
    if (said.size !== file.data.length || said.sha256 !== sha256(file.data)) return { ok: false, why: `${file.path} is not the file ${BUNDLE_FILE} describes.` }
    if ((said.executable === true) !== (file.executable === true)) return { ok: false, why: `${file.path} is ${file.executable ? '' : 'not '}executable, and ${BUNDLE_FILE} says otherwise.` }
    listed.delete(file.path)
  }
  if (listed.size) return { ok: false, why: `${[...listed][0]} is in ${BUNDLE_FILE} and not in the archive.` }
  return { ok: true, info, files }
}

/**
 * `bundle.json` of an unpacked bundle in `dir`, or null when `dir` holds none (or one that does not
 * read). Checks the shape only, not the files: `verifyUnpacked` does that.
 */
export function readBundleInfo(dir: string): BundleInfo | null {
  try {
    const read = bundleInfoOf(JSON.parse(readFileSync(join(dir, BUNDLE_FILE), 'utf8')))
    return read.ok ? read.info : null
  } catch {
    return null
  }
}

/**
 * Whether the bundle unpacked in `dir` is still what its `bundle.json` lists: every file there with
 * its sha256, and nothing a link. What a host asks before it starts a bundle it unpacked earlier
 * would cost a read of every file; it is for a check a person asks for, and for tests.
 */
export function verifyUnpacked(dir: string): { ok: true; info: BundleInfo } | { ok: false; why: string } {
  const info = readBundleInfo(dir)
  if (!info) return { ok: false, why: `${dir} has no readable ${BUNDLE_FILE}.` }
  for (const [path, file] of Object.entries(info.files)) {
    const where = join(dir, ...path.split('/'))
    try {
      if (!lstatSync(where).isFile()) return { ok: false, why: `${path} is not a file.` }
      const data = readFileSync(where)
      if (data.length !== file.size || sha256(data) !== file.sha256) return { ok: false, why: `${path} has changed since it was unpacked.` }
    } catch {
      return { ok: false, why: `${path} is missing.` }
    }
  }
  return { ok: true, info }
}

/** How many files and bytes are under `dir`, links not followed: what a person is told a folder held. */
export function sizeOf(dir: string): { files: number; bytes: number } {
  let files = 0
  let bytes = 0
  const walk = (at: string) => {
    let names: string[]
    try {
      names = readdirSync(at)
    } catch {
      return
    }
    for (const name of names) {
      const where = join(at, name)
      let stat
      try {
        stat = lstatSync(where)
      } catch {
        continue
      }
      if (stat.isDirectory()) walk(where)
      else {
        files += 1
        bytes += stat.size
      }
    }
  }
  walk(dir)
  return { files, bytes }
}
