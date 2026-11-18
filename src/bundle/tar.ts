import { gunzipSync, gzipSync } from 'node:zlib'

/**
 * The one archive a bundle travels in (2.102.0): a gzipped ustar of regular files, and nothing a
 * reader cannot check before it writes a byte. Node or Bun; no `tar` program is run. Design notes:
 * docs/bundles.md.
 *
 * Written here and read here, so both sides agree on the subset: regular files and directories,
 * relative paths of plain segments, a mode of 0644 or 0755. A reader REFUSES everything else —
 * a symlink, a hard link, a device, an absolute path, a `..`, a dot segment that is not a name,
 * a name with a NUL or a backslash — instead of skipping it, because an archive that carries one
 * was not made by `kehikot-bundle` and is not one to unpack at all.
 */

/** One file in or out of an archive. `path` uses `/`, is relative, and names a file, never a directory. */
export interface TarFile {
  path: string
  data: Uint8Array
  /** Executable or not. Every other bit of a mode is dropped. */
  executable?: boolean
}

/** What a reader will take. Both caps count the UNPACKED bytes, so a small archive that inflates to a disk's worth is refused while inflating. */
export interface TarLimits {
  /** The most bytes the archive may unpack to. Default `BUNDLE_LIMITS.unpackedBytes`. */
  maxBytes?: number
  /** The most files it may hold. Default `BUNDLE_LIMITS.files`. */
  maxFiles?: number
}

/** The caps a bundle is held to, here and in a host: generous for a module, small for a disk. */
export const BUNDLE_LIMITS = {
  /** The archive as downloaded. */
  archiveBytes: 200 * 1024 * 1024,
  /** What it unpacks to. */
  unpackedBytes: 500 * 1024 * 1024,
  /** How many files. A bundle is tens to a few hundred; a `node_modules` is tens of thousands. */
  files: 20_000,
} as const

const BLOCK = 512
const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

/** Why an archive was refused: a sentence naming the entry. */
export class TarRefused extends Error {
  constructor(why: string) {
    super(why)
    this.name = 'TarRefused'
  }
}

/**
 * Whether `path` may be a file's place inside a target directory: relative, `/`-separated plain
 * segments, none of them empty, `.` or `..`, no NUL, no backslash, no colon-led drive. Pure, and
 * what both the writer and the reader ask.
 */
export function safeRelative(path: string): boolean {
  if (!path || path.length > 1024) return false
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) return false
  if (/[\0\\]/.test(path)) return false
  return path.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
}

function octal(value: number, width: number): string {
  return value.toString(8).padStart(width - 1, '0') + '\0'
}

function put(header: Uint8Array, at: number, width: number, text: string): void {
  const bytes = encoder.encode(text)
  if (bytes.length > width) throw new TarRefused(`"${text}" does not fit a tar header field of ${width} bytes.`)
  header.set(bytes, at)
}

/** ustar keeps a path in a 100-byte name and a 155-byte prefix, split at a `/`. */
function splitPath(path: string): { name: string; prefix: string } {
  if (encoder.encode(path).length <= 100) return { name: path, prefix: '' }
  for (let cut = path.lastIndexOf('/'); cut > 0; cut = path.lastIndexOf('/', cut - 1)) {
    const prefix = path.slice(0, cut)
    const name = path.slice(cut + 1)
    if (encoder.encode(name).length <= 100 && encoder.encode(prefix).length <= 155) return { name, prefix }
  }
  throw new TarRefused(`${path} is too long for a bundle's archive (a name of 100 bytes under a folder of 155).`)
}

function headerFor(path: string, size: number, executable: boolean): Uint8Array {
  const header = new Uint8Array(BLOCK)
  const { name, prefix } = splitPath(path)
  put(header, 0, 100, name)
  put(header, 100, 8, octal(executable ? 0o755 : 0o644, 8))
  put(header, 108, 8, octal(0, 8))
  put(header, 116, 8, octal(0, 8))
  put(header, 124, 12, octal(size, 12))
  /* No time: the same files make the same archive, and the same sha256. */
  put(header, 136, 12, octal(0, 12))
  header.fill(0x20, 148, 156)
  header[156] = 0x30 /* '0', a regular file */
  put(header, 257, 6, 'ustar\0')
  put(header, 263, 2, '00')
  put(header, 345, 155, prefix)
  let sum = 0
  for (const byte of header) sum += byte
  put(header, 148, 8, sum.toString(8).padStart(6, '0') + '\0 ')
  return header
}

/**
 * The archive of `files`, gzipped: sorted by path, no times, no owners, so the same files always
 * make the same bytes. Throws `TarRefused` on a path `safeRelative` refuses or one given twice.
 */
export function writeTarGz(files: readonly TarFile[]): Uint8Array {
  const sorted = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  const parts: Uint8Array[] = []
  let last: string | null = null
  for (const file of sorted) {
    if (!safeRelative(file.path)) throw new TarRefused(`"${file.path}" is not a path a bundle may hold.`)
    if (file.path === last) throw new TarRefused(`${file.path} is in the bundle twice.`)
    last = file.path
    parts.push(headerFor(file.path, file.data.length, file.executable === true))
    parts.push(file.data)
    const pad = (BLOCK - (file.data.length % BLOCK)) % BLOCK
    if (pad) parts.push(new Uint8Array(pad))
  }
  parts.push(new Uint8Array(BLOCK * 2))
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const tar = new Uint8Array(total)
  let at = 0
  for (const part of parts) {
    tar.set(part, at)
    at += part.length
  }
  return new Uint8Array(gzipSync(tar, { level: 9 }))
}

function text(block: Uint8Array, at: number, width: number): string {
  const field = block.subarray(at, at + width)
  const end = field.indexOf(0)
  try {
    return decoder.decode(end === -1 ? field : field.subarray(0, end))
  } catch {
    throw new TarRefused('An entry of the archive has a name that is not UTF-8.')
  }
}

function number(block: Uint8Array, at: number, width: number): number {
  const said = text(block, at, width).trim()
  if (!/^[0-7]*$/.test(said)) throw new TarRefused('An entry of the archive has a size or mode that is not a number.')
  return said ? parseInt(said, 8) : 0
}

/**
 * The files of a gzipped tar, checked before anything is returned: every entry a regular file
 * (or a directory, which is dropped: a file's folders are made for it) at a path `safeRelative`
 * takes, no path twice, a checksum that adds up, and the whole within `limits`. Anything else
 * throws `TarRefused` naming the entry. Nothing is written anywhere.
 */
export function readTarGz(archive: Uint8Array, limits: TarLimits = {}): TarFile[] {
  const maxBytes = limits.maxBytes ?? BUNDLE_LIMITS.unpackedBytes
  const maxFiles = limits.maxFiles ?? BUNDLE_LIMITS.files
  let tar: Uint8Array
  try {
    /* The tar itself is capped while it inflates: headers and padding on top of the files. */
    tar = new Uint8Array(gunzipSync(archive, { maxOutputLength: maxBytes + (maxFiles + 2) * BLOCK * 2 }))
  } catch (error) {
    throw new TarRefused(`The archive could not be unpacked: ${(error as Error).message}`)
  }
  const files: TarFile[] = []
  const seen = new Set<string>()
  let bytes = 0
  let at = 0
  while (at + BLOCK <= tar.length) {
    const block = tar.subarray(at, at + BLOCK)
    if (block.every((byte) => byte === 0)) break
    let sum = 0
    for (let i = 0; i < BLOCK; i++) sum += i >= 148 && i < 156 ? 0x20 : block[i]!
    if (sum !== number(block, 148, 8)) throw new TarRefused('An entry of the archive has a checksum that does not add up.')
    const prefix = text(block, 345, 155)
    const name = text(block, 0, 100)
    const path = prefix ? `${prefix}/${name}` : name
    const type = String.fromCharCode(block[156] ?? 0)
    const size = number(block, 124, 12)
    const mode = number(block, 100, 8)
    at += BLOCK
    if (type === '5') {
      const folder = path.replace(/\/+$/, '')
      if (!safeRelative(folder)) throw new TarRefused(`"${path}" is not a folder a bundle may hold.`)
      if (size !== 0) throw new TarRefused(`The folder ${path} says it has content.`)
      continue
    }
    if (type !== '0' && type !== '\0') {
      const what = type === '2' ? 'a symbolic link' : type === '1' ? 'a hard link' : `an entry of type "${type}"`
      throw new TarRefused(`${path} is ${what}. A bundle holds regular files only.`)
    }
    if (!safeRelative(path)) throw new TarRefused(`"${path}" is not a path a bundle may hold: it would land outside the folder it is unpacked into.`)
    if (seen.has(path)) throw new TarRefused(`${path} is in the archive twice.`)
    seen.add(path)
    if (files.length + 1 > maxFiles) throw new TarRefused(`The archive holds more than ${maxFiles} files.`)
    bytes += size
    if (bytes > maxBytes) throw new TarRefused(`The archive unpacks to more than ${Math.round(maxBytes / 1024 / 1024)} MB.`)
    if (at + size > tar.length) throw new TarRefused(`${path} is cut short.`)
    files.push({ path, data: tar.slice(at, at + size), executable: (mode & 0o111) !== 0 })
    at += size + ((BLOCK - (size % BLOCK)) % BLOCK)
  }
  return files
}
