import { mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { isAbsolute } from 'node:path'

import {
  HOLDINGS_FILE,
  HOLDINGS_VERSION,
  holdingsIn,
  joinHoldings,
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
 * `LIMITS.HOLDINGS_BYTES`, or one that resolves outside the project, is skipped. Read with `own()`.
 */
export function readHoldings(projectPath: string | null | undefined): ProjectHoldings {
  const out: ProjectHoldings = {}
  const root = rootOf(projectPath)
  const dir = kehikotDir(projectPath)
  if (root === null || dir === null) return out

  let folders: string[]
  try {
    folders = readdirSync(dir).filter((name) => MODULE_FOLDER.test(name)).sort().slice(0, LIMITS.HOLDINGS_MODULES)
  } catch {
    return out
  }
  for (const folder of folders) {
    const file = `${dir}/${folder}/${HOLDINGS_FILE}.json`
    try {
      /* A folder or a file that is a link out of the project is another project's word; not followed. */
      if (!within(root, realpathSync(file))) continue
      if (statSync(file).size > LIMITS.HOLDINGS_BYTES) continue
      joinHoldings(out, holdingsIn(JSON.parse(readFileSync(file, 'utf8'))))
    } catch {
      /* No file here, or not JSON: this folder holds nothing. */
    }
  }
  return out
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
 * project-relative (`documentOf`). Atomic (a temporary file, renamed). Null when there is no project.
 * Throws for an id that is not one, and for a folder that resolves outside the project.
 */
export function writeHoldings(
  projectPath: string | null | undefined,
  moduleId: string,
  epic: string,
  holdings: Record<string, { documents?: readonly string[]; refs?: readonly string[] }>,
): HoldingsWritten | null {
  const file = moduleFile(projectPath, moduleId, HOLDINGS_FILE)
  const dir = moduleDir(projectPath, moduleId)
  if (typeof epic !== 'string' || !EPIC_SLUG.test(epic)) throw new Error(`"${epic}" is not an epic's slug, so there is nothing to file a part under.`)
  const root = rootOf(projectPath)
  if (file === null || dir === null || root === null) return null

  /* What is to be said, in the stored form. Nothing here has touched the disk yet. */
  const dropped: string[] = []
  const said: EpicHoldings = {}
  for (const [id, given] of Object.entries(holdings ?? {})) {
    if (!PART_ID.test(id)) throw new Error(`"${id}" is not a part's id. A part's id comes from context.parts, never from its name.`)
    const documents: string[] = []
    for (const one of given?.documents ?? []) {
      const document = documentOf(one, root) ?? documentOf(one, projectPath)
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

  mkdirSync(dir, { recursive: true })
  if (!within(root, realpathSync(dir))) {
    throw new Error(`${dir} resolves outside ${root}. A module's holdings are written inside the project they are about.`)
  }

  /* Read, change, write: synchronous from here to the rename, so no other write of this process falls between. */
  let before: string | null = null
  let whole: Record<string, unknown> = {}
  try {
    before = readFileSync(file, 'utf8')
    const parsed: unknown = JSON.parse(before)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object')
    whole = parsed as Record<string, unknown>
  } catch {
    /* A file that is there and cannot be read is kept beside the new one rather than written over. */
    if (before !== null) renameSync(file, `${file}.unreadable`)
    whole = {}
  }
  const kept = whole.epics && typeof whole.epics === 'object' && !Array.isArray(whole.epics) ? (whole.epics as Record<string, unknown>) : {}
  const epics: Record<string, unknown> = {}
  for (const [slug, value] of Object.entries(kept)) if (slug !== epic) epics[slug] = value
  if (Object.keys(said).length > 0) epics[epic] = said

  const after = `${JSON.stringify({ ...whole, version: typeof whole.version === 'number' ? whole.version : HOLDINGS_VERSION, epics }, null, 2)}\n`
  if (after === before) return { file, changed: false, dropped }

  const temporary = `${file}.${process.pid}.tmp`
  try {
    writeFileSync(temporary, after)
    renameSync(temporary, file)
  } catch (error) {
    rmSync(temporary, { force: true })
    throw error
  }
  return { file, changed: true, dropped }
}
