import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { isAbsolute } from 'node:path'

import {
  HOLDINGS_FILE,
  HOLDINGS_VERSION,
  HOLDING_KINDS,
  holdingKinds,
  holdingsIn,
  joinHoldings,
  joinSpoken,
  spokenIn,
  type HoldingKind,
  type ProjectSpoken,
  partHoldings,
  type EpicHoldings,
  type PartHoldings,
  type ProjectHoldings,
} from '../holdings.js'
import { EPIC_SLUG } from '../ids.js'
import { LIMITS } from '../limits.js'
import { PART_ID, documentOf } from '../parts.js'
import { MODULE_FOLDER, kehikotDir, moduleDir, moduleFile, within } from '../project.js'

/**
 * The file `holdings.ts` describes, opened: a host reads every module's (`readHoldings`), a module
 * writes its own (`writeHoldings`). Both are synchronous, so nothing can run between a read and the
 * write that follows it. Storage is only ever `<project>/.kehikot/<module>/parts.json`.
 */

/** The project's root, resolved, or null for no project, a relative path or a folder that is not there. */
function rootOf(projectPath: string | null | undefined): string | null {
  if (typeof projectPath !== 'string' || !projectPath.trim() || !isAbsolute(projectPath.trim())) return null
  try {
    return realpathSync(projectPath.trim())
  } catch {
    return null
  }
}

/**
 * What every module in a project holds for its epics' parts, unioned per epic and part: every folder
 * directly under `.kehikot/` is asked for a `parts.json`, by name order, and no module is named. Never
 * throws and never writes; `{}` for no project. Junk costs the entry it is in; a file over
 * `LIMITS.HOLDINGS_BYTES`, one that is not a regular file, or one that resolves outside the project,
 * is skipped. Read with `own()`.
 */
export function readHoldings(projectPath: string | null | undefined): ProjectHoldings {
  const out: ProjectHoldings = {}
  eachHoldingsFile(projectPath, (parsed) => joinHoldings(out, holdingsIn(parsed)))
  return out
}

/**
 * Which kinds of holdings anybody has published for one epic (1.4.0): `documents` and `refs`, each
 * true when some module's `parts.json` says it spoke for that kind in this epic — also when what it
 * said was nothing (`published`, kept by `writeHoldings` even for an empty epic). False for both
 * means nobody has: a host may then fall back to whatever it did before parts. Same reading rules as
 * `readHoldings`; never throws.
 */
export function holdingsSpoken(
  projectPath: string | null | undefined,
  epic: string,
): Record<HoldingKind, boolean> {
  const all: ProjectSpoken = {}
  eachHoldingsFile(projectPath, (parsed) => joinSpoken(all, spokenIn(parsed)))
  const kinds = Object.hasOwn(all, epic) ? all[epic]! : []
  return { documents: kinds.includes('documents'), refs: kinds.includes('refs') }
}

/** Every module's `parts.json` under the project, parsed, by folder name; the rules `readHoldings` states. */
function eachHoldingsFile(projectPath: string | null | undefined, each: (parsed: unknown) => void): void {
  const root = rootOf(projectPath)
  const dir = kehikotDir(projectPath)
  if (root === null || dir === null) return

  let folders: string[]
  try {
    folders = readdirSync(dir).filter((name) => MODULE_FOLDER.test(name)).sort().slice(0, LIMITS.HOLDINGS_MODULES)
  } catch {
    return
  }
  for (const folder of folders) {
    const file = `${dir}/${folder}/${HOLDINGS_FILE}.json`
    try {
      /* A folder or a file that is a link out of the project is another project's word; not followed.
         What is opened is the resolved file, and only a regular one: a pipe of that name would never end. */
      const real = realpathSync(file)
      if (!within(root, real)) continue
      const found = statSync(real)
      if (!found.isFile() || found.size > LIMITS.HOLDINGS_BYTES) continue
      each(JSON.parse(readFileSync(real, 'utf8')))
    } catch {
      /* No file here, or not JSON: this folder holds nothing. */
    }
  }
}

/**
 * A document a module gave `writeHoldings`, project-relative, or null. Stricter than `documentOf`, which
 * reads any path with `/.kehikot/` in it: here an absolute path has to be under THIS project, as it was
 * given or as the disk resolves it, so another project's file of the same relative name is dropped.
 */
function documentUnder(one: unknown, root: string, projectPath: string | null | undefined): string | null {
  if (typeof one !== 'string') return null
  const spelled = one.trim().replace(/\\/g, '/')
  if (!spelled.startsWith('/') && !/^[A-Za-z]:\//.test(spelled)) return documentOf(spelled)
  for (const base of [root, typeof projectPath === 'string' ? projectPath.trim() : '']) {
    const under = base.replace(/\\/g, '/').replace(/\/+$/, '')
    if (under && spelled.startsWith(`${under}/`)) return documentOf(spelled, under)
  }
  try {
    const real = realpathSync(one.trim())
    return within(root, real) && real !== root ? documentOf(real, root) : null
  } catch {
    return null
  }
}

/** What `writeHoldings` did. */
export interface HoldingsWritten {
  /** The module's `parts.json`. */
  file: string
  /** Whether the file was written. False when it already said exactly this. */
  changed: boolean
  /** What was given and could not be said: a document that is not under the project, a ref that is not one. As given. */
  dropped: string[]
}

/**
 * Publish what ONE module holds for ONE epic's parts: `holdings[<part id>] = { documents, refs }`,
 * replacing whatever the module's `parts.json` said for that epic and leaving every other epic, and
 * every key this does not know, as it was. `{}` takes the epic out. A document may be absolute or
 * project-relative; an absolute one must be under this project. Atomic (a temporary file, renamed).
 * Null when there is no project. Throws for an id that is not one, and for a `.kehikot` or a module
 * folder that resolves outside the project. Whatever has the file's name and is not a readable JSON
 * object is set aside as `parts.json.unreadable` (one, the latest), never read through or written over.
 */
export function writeHoldings(
  projectPath: string | null | undefined,
  moduleId: string,
  epic: string,
  holdings: Record<string, { documents?: readonly string[]; refs?: readonly string[] }>,
  options: { published?: readonly HoldingKind[] } = {},
): HoldingsWritten | null {
  const file = moduleFile(projectPath, moduleId, HOLDINGS_FILE)
  const dir = moduleDir(projectPath, moduleId)
  if (typeof epic !== 'string' || !EPIC_SLUG.test(epic)) throw new Error(`"${epic}" is not an epic's slug, so there is nothing to file a part under.`)
  const root = rootOf(projectPath)
  if (file === null || dir === null || root === null) return null

  /* What is to be said, in the stored form. Nothing here has touched the disk yet. */
  const dropped: string[] = []
  const said: EpicHoldings = {}
  /* The kinds this call speaks for (1.4.0): what `options.published` names, else each kind some part
     was given a list for — an empty list included — else both, for a call that gives no parts. */
  const given = Object.values(holdings ?? {})
  const derived: HoldingKind[] = HOLDING_KINDS.filter((kind) => given.some((one) => Array.isArray(one?.[kind])))
  const spoke: HoldingKind[] = options.published
    ? holdingKinds([...options.published])
    : derived.length > 0
      ? derived
      : [...HOLDING_KINDS]
  for (const [id, given] of Object.entries(holdings ?? {})) {
    if (!PART_ID.test(id)) throw new Error(`"${id}" is not a part's id. A part's id comes from context.parts, never from its name.`)
    const documents: string[] = []
    for (const one of given?.documents ?? []) {
      const document = documentUnder(one, root, projectPath)
      if (document === null) dropped.push(String(one))
      else documents.push(document)
    }
    const refs: string[] = []
    for (const one of given?.refs ?? []) {
      const ref = typeof one === 'string' ? one.trim() : ''
      if (ref && ref.length <= LIMITS.REF) refs.push(ref)
      else dropped.push(String(one))
    }
    /* Once each and bounded: past `PART_DOCUMENTS` or `PART_REFS` the first of them are kept. */
    const held: PartHoldings | null = partHoldings({ documents, refs })
    if (held !== null) said[id] = held
  }

  const outside = (at: string) => new Error(`${at} resolves outside ${root}. A module's holdings are written inside the project they are about.`)
  /* `.kehikot` first, where it is already there: a link out of the project is refused before a folder is made through it. */
  const base = kehikotDir(projectPath)!
  let above: string | null = null
  try {
    above = realpathSync(base)
  } catch {
    /* Not there yet: made below, inside the project. */
  }
  if (above !== null && !within(root, above)) throw outside(base)
  mkdirSync(dir, { recursive: true })
  if (!within(root, realpathSync(dir))) throw outside(dir)

  /* Read, change, write: synchronous from here to the rename, so no other write of this process falls between. */
  let before: string | null = null
  let whole: Record<string, unknown> = {}
  /* `lstat`, not `stat`: a link is never read through, so no file outside the folder can end up copied into this one. */
  const found = lstatSync(file, { throwIfNoEntry: false })
  if (found !== undefined) {
    try {
      if (!found.isFile()) throw new Error('not a file')
      before = readFileSync(file, 'utf8')
      const parsed: unknown = JSON.parse(before)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object')
      whole = parsed as Record<string, unknown>
    } catch {
      /* Whatever is there and cannot be read — not JSON, not an object, not a file, not permitted — is kept
         beside the new one rather than written over. One name, so at most one is ever kept: the latest. */
      renameSync(file, `${file}.unreadable`)
      before = null
      whole = {}
    }
  }
  const kept = whole.epics && typeof whole.epics === 'object' && !Array.isArray(whole.epics) ? (whole.epics as Record<string, unknown>) : {}
  const epics: Record<string, unknown> = {}
  for (const [slug, value] of Object.entries(kept)) if (slug !== epic) epics[slug] = value
  if (Object.keys(said).length > 0) epics[epic] = said

  /* Who has spoken, beside `epics` and not inside it, so that no part id can collide with it and a
     reader before 1.4.0 passes over it. Kept, per epic, as the union of what this module said. */
  const was = whole.published && typeof whole.published === 'object' && !Array.isArray(whole.published) ? (whole.published as Record<string, unknown>) : {}
  const published: Record<string, unknown> = { ...was }
  published[epic] = HOLDING_KINDS.filter((kind) => spoke.includes(kind) || holdingKinds(was[epic]).includes(kind))
  for (const slug of Object.keys(published)) {
    if (Object.keys(published).length <= LIMITS.HOLDINGS_EPICS) break
    if (slug !== epic) delete published[slug]
  }

  const after = `${JSON.stringify({ ...whole, version: typeof whole.version === 'number' ? whole.version : HOLDINGS_VERSION, epics, published }, null, 2)}\n`
  if (after === before) return { file, changed: false, dropped }

  const temporary = `${file}.${process.pid}.tmp`
  try {
    /* A new file and nothing else: whatever already has the name, a link included, is removed and not written through. */
    rmSync(temporary, { force: true })
    writeFileSync(temporary, after, { flag: 'wx' })
    renameSync(temporary, file)
  } catch (error) {
    rmSync(temporary, { force: true })
    throw error
  }
  return { file, changed: true, dropped }
}
