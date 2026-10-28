import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { isAbsolute } from 'node:path'

import { LIMITS } from '../limits.js'
import { MODULE_FOLDER, PROJECT_FILE, kehikotDir, moduleDir, moduleFile, within } from '../project.js'
import { RUNS_FILE, RUNS_VERSION, runResultSchema, runsIn, type PublishedRun, type RunResult } from '../runs.js'

/**
 * The file `runs.ts` describes, opened: anybody reads every publisher's (`readRuns`), a module writes
 * its own (`writeRuns`). Storage is only ever `<project>/.kehikot/<module>/runs.json`. No module is
 * named: every folder directly under `.kehikot/` is asked.
 */

function rootOf(projectPath: string | null | undefined): string | null {
  if (typeof projectPath !== 'string' || !projectPath.trim() || !isAbsolute(projectPath.trim())) return null
  try {
    return realpathSync(projectPath.trim())
  } catch {
    return null
  }
}

/**
 * Every run any module published for a project, each with `from`, the folder it came from, by folder
 * name order. Never throws and never writes; `[]` for no project. A file over `LIMITS.RUNS_BYTES`,
 * one that is not a regular file, or one that resolves outside the project, is skipped.
 */
export function readRuns(projectPath: string | null | undefined): PublishedRun[] {
  const root = rootOf(projectPath)
  const dir = kehikotDir(projectPath)
  if (root === null || dir === null) return []
  let folders: string[]
  try {
    folders = readdirSync(dir).filter((name) => MODULE_FOLDER.test(name) && name !== PROJECT_FILE).sort().slice(0, LIMITS.HOLDINGS_MODULES)
  } catch {
    return []
  }
  const out: PublishedRun[] = []
  for (const folder of folders) {
    const file = `${dir}/${folder}/${RUNS_FILE}.json`
    try {
      const real = realpathSync(file)
      if (!within(root, real)) continue
      const found = statSync(real)
      if (!found.isFile() || found.size > LIMITS.RUNS_BYTES) continue
      for (const run of runsIn(JSON.parse(readFileSync(real, 'utf8')))) out.push({ ...run, from: folder })
    } catch {
      /* No file here, or not JSON: this folder published no runs. */
    }
  }
  return out
}

/** What `writeRuns` did. */
export interface RunsWritten {
  file: string
  /** False when the file already said exactly this. */
  changed: boolean
  /** How many of the runs given were not runs (`runResultSchema`) and were left out. */
  dropped: number
}

/**
 * Publish ONE module's runs for a project, whole: the file says exactly these afterwards (the newest
 * `LIMITS.RUNS` of them, by `queuedAt`). Every other key in the file is kept. Atomic (a temporary file,
 * renamed). Null when there is no project. Throws for a `.kehikot` or module folder that resolves
 * outside the project. A file of that name that is not a readable JSON object is set aside as
 * `runs.json.unreadable`, never written through.
 */
export function writeRuns(projectPath: string | null | undefined, moduleId: string, runs: readonly RunResult[]): RunsWritten | null {
  const file = moduleFile(projectPath, moduleId, RUNS_FILE)
  const dir = moduleDir(projectPath, moduleId)
  const root = rootOf(projectPath)
  if (file === null || dir === null || root === null) return null

  let dropped = 0
  const said: RunResult[] = []
  const ids = new Set<string>()
  for (const one of runs) {
    const parsed = runResultSchema.safeParse(one)
    if (!parsed.success || ids.has(parsed.data.id)) {
      dropped++
      continue
    }
    ids.add(parsed.data.id)
    said.push(parsed.data)
  }
  said.sort((a, b) => a.queuedAt - b.queuedAt)
  const kept = said.slice(Math.max(0, said.length - LIMITS.RUNS))

  const outside = (at: string) => new Error(`${at} resolves outside ${root}. A module's runs are written inside the project they are about.`)
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

  let before: string | null = null
  let whole: Record<string, unknown> = {}
  const found = lstatSync(file, { throwIfNoEntry: false })
  if (found !== undefined) {
    try {
      if (!found.isFile()) throw new Error('not a file')
      before = readFileSync(file, 'utf8')
      const parsed: unknown = JSON.parse(before)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object')
      whole = parsed as Record<string, unknown>
    } catch {
      renameSync(file, `${file}.unreadable`)
      before = null
      whole = {}
    }
  }
  const after = `${JSON.stringify({ ...whole, version: typeof whole.version === 'number' ? whole.version : RUNS_VERSION, runs: kept }, null, 2)}\n`
  if (after === before) return { file, changed: false, dropped }
  const temporary = `${file}.${process.pid}.tmp`
  try {
    rmSync(temporary, { force: true })
    writeFileSync(temporary, after, { flag: 'wx' })
    renameSync(temporary, file)
  } catch (error) {
    rmSync(temporary, { force: true })
    throw error
  }
  return { file, changed: true, dropped }
}
