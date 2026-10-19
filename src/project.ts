/**
 * Where a module's data for one project lives, `<projectPath>/.kehikot/<module>/<file>.json`, and
 * how a project's `.gitignore` says not to commit it. Plus the one file at the top of `.kehikot/`
 * (2.1.0): `project.json`, the project's permanent id, written only by the host. Strings, one
 * schema and pure functions only: no I/O, and paths are joined POSIX-style with `/`.
 * Design notes: docs/project-data.md.
 */

import { z } from 'zod'
import { MESSAGE_PREFIX } from './constants.js'
import { MODULE_ID, PROJECT_ID } from './ids.js'

/**
 * The folder in a project that holds the app's data, spelled once; this is the only place it is
 * spelled. `kehikot` (the app), not `kehikko` (one canvas inside it).
 */
export const KEHIKOT_DIR = '.kehikot'

/**
 * The one file at the top of `.kehikot/` (2.1.0), beside the module folders rather than in one: the
 * project's permanent id. Written ONLY by the host, once, and never rewritten; read by anyone.
 * Every other file a project keeps is a module's, under `.kehikot/<module>/`.
 */
export const PROJECT_FILE = 'project.json'

/**
 * What a module may call a file inside its own folder: lowercase, digits and dashes, no dot and no
 * slash, so no accepted spelling can leave the folder. A file name is a constant in the module that
 * owns it, never a string that arrived over the wire.
 */
export const DATA_FILE = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/

/**
 * What a module's folder inside `.kehikot/` may be called, once derived. Checked by `moduleFolder()`
 * as a rule of its own rather than inherited from `MODULE_ID`; first and last characters must be a
 * letter or a digit, so neither `.` nor `..` passes.
 */
export const MODULE_FOLDER = /^[a-z0-9][a-z0-9.-]{0,62}[a-z0-9]$/

/** Join POSIX-style, tolerating a trailing slash on the left. */
function joined(left: string, right: string): string {
  return `${left.replace(/\/+$/, '')}/${right}`
}

/**
 * A module's folder name, from its id: `kehikot.checklist` becomes `checklist`; an id without that
 * prefix is used whole. Throws, rather than falling
 * back, when the id is not a `MODULE_ID`, the derived name is not a `MODULE_FOLDER`, or (2.1.0) it
 * is `PROJECT_FILE`, the host's file.
 */
export function moduleFolder(moduleId: string): string {
  if (typeof moduleId !== 'string' || !MODULE_ID.test(moduleId)) {
    throw new Error(
      `"${moduleId}" is not a module id, so there is no folder name to derive from it. A folder under `
        + `${KEHIKOT_DIR}/ is named after the module that owns it, and a name derived from an id is a path built `
        + 'from data — it is checked rather than trusted.',
    )
  }
  const name = moduleId.startsWith(MESSAGE_PREFIX) ? moduleId.slice(MESSAGE_PREFIX.length) : moduleId
  if (!MODULE_FOLDER.test(name)) {
    throw new Error(
      `"${moduleId}" gives the folder name "${name}", which is not one this package will join onto somebody's `
        + 'project root.',
    )
  }
  /* 2.1.0: the one name at the top of the folder that is not a module's. */
  if (name === PROJECT_FILE) {
    throw new Error(
      `"${moduleId}" gives the folder name "${name}", which is the host's own file at the top of ${KEHIKOT_DIR}/ `
        + '(the project id), not a folder a module may have.',
    )
  }
  return name
}

/**
 * The `.kehikot` folder itself for a project, or `null` when there is no project (`null`,
 * `undefined` or a blank path). A caller must never turn that `null` into a guess such as its own
 * directory or the working directory.
 */
export function kehikotDir(projectPath: string | null | undefined): string | null {
  if (typeof projectPath !== 'string') return null
  const path = projectPath.trim()
  if (!path) return null
  return joined(path, KEHIKOT_DIR)
}

/**
 * One module's own folder inside it, or `null` when there is no project. The directory a module
 * creates, confines itself to, and is the only owner of. Throws when `moduleId` is not a legal id.
 */
export function moduleDir(projectPath: string | null | undefined, moduleId: string): string | null {
  const folder = moduleFolder(moduleId)
  const dir = kehikotDir(projectPath)
  return dir === null ? null : joined(dir, folder)
}

/**
 * One file this module keeps for this project (`<name>.json` in its folder), or `null` when there
 * is no project. Throws, rather than returning null, when `name` is not a `DATA_FILE` or `moduleId`
 * is not a legal id.
 */
export function moduleFile(projectPath: string | null | undefined, moduleId: string, name: string): string | null {
  if (!DATA_FILE.test(name)) {
    throw new Error(
      `"${name}" is not a name a module may give one of its files. A file under ${KEHIKOT_DIR}/<module>/ is spelled `
        + 'with lowercase letters, digits and dashes, and is a constant in the module that owns it — never a string '
        + 'that arrived from anywhere.',
    )
  }
  const dir = moduleDir(projectPath, moduleId)
  return dir === null ? null : joined(dir, `${name}.json`)
}

/**
 * Is `child` at or beneath `parent`? String comparison only: it knows nothing about symlinks,
 * uncollapsed `..` or whether either path exists. A caller confining a write must `realpath` both
 * sides first and compare the results.
 */
export function within(parent: string, child: string): boolean {
  const root = parent.replace(/\/+$/, '')
  if (!root) return false
  return child === root || child.startsWith(`${root}/`)
}

/**
 * `<projectPath>/.kehikot/project.json`, or `null` when there is no project (as `kehikotDir`). Its
 * contents are a `projectFileSchema`. A module reads the id from `context.projectId`, not from here.
 */
export function projectFile(projectPath: string | null | undefined): string | null {
  const dir = kehikotDir(projectPath)
  return dir === null ? null : joined(dir, PROJECT_FILE)
}

/**
 * What `project.json` holds. `id` is a `PROJECT_ID`, minted by the host the first time it meets the
 * project (a lowercase random UUID). `createdAt` is when, ISO 8601, or null. Never committed: a
 * clone, copy or git worktree carrying it would be the same project twice (`PROJECT_FILE_IGNORE`).
 */
export const projectFileSchema = z.object({
  id: z.string().regex(PROJECT_ID),
  createdAt: z.string().min(1).max(40).nullable().default(null),
})
export type ProjectFile = z.infer<typeof projectFileSchema>

/** Read a `project.json` off anything, or null. Never throws: a malformed file is no id, and the host mints one. */
export function readProjectFile(value: unknown): ProjectFile | null {
  const parsed = projectFileSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

/**
 * What a module keys MACHINE-level state for a project by (2.1.0): the host's `projectId` when it sent
 * one, else the absolute `projectPath` (an older host sends no id), else `null` (no project). `by` says
 * which, so a module can move what it kept under the path to the id the first time it is given one.
 * Project-level state needs no key: it lives in the project folder and moves with it.
 */
export type ProjectKey = { by: 'id'; key: string } | { by: 'path'; key: string }

export function projectKey(
  context: { projectId?: string | null; projectPath?: string | null } | null | undefined,
): ProjectKey | null {
  const id = context?.projectId
  if (typeof id === 'string' && PROJECT_ID.test(id)) return { by: 'id', key: id }
  const path = context?.projectPath
  if (typeof path === 'string' && path.trim()) return { by: 'path', key: path.trim() }
  return null
}

/**
 * The lines that keep `project.json` out of git, ALWAYS, even when the rest of `.kehikot/` is shared:
 * a comment and `.kehikot/project.json`. Part of `KEHIKOT_IGNORE`; left behind by
 * `withoutKehikotIgnored`; added on its own by `withProjectFileIgnored`.
 */
export const PROJECT_FILE_IGNORE = `# The project's own id, which Kehikot keeps in ${KEHIKOT_DIR}/${PROJECT_FILE}. It is never
# committed, even when the rest of ${KEHIKOT_DIR}/ is shared: a clone, a copy or a git
# worktree carrying it would be taken for this same project. Keep this line.
${KEHIKOT_DIR}/${PROJECT_FILE}
`

/** The folder's own block: the comment and the rule `.kehikot/`. */
const FOLDER_IGNORE = `# Modules on a kehikot host keep this project's data here — checklists, notes,
# journeys, questions — as plain JSON, one folder per module, so it sits beside
# the work instead of inside somebody else's app. It is ignored because it is
# one person's working material and not the project's. Remove these lines to
# share it with everyone who clones this repository.
${KEHIKOT_DIR}/
`

/**
 * What a project's `.gitignore` is given, once, when that folder is first made: a comment saying
 * what the folder is and the rule `.kehikot/`, which ignores the whole folder anywhere in the tree;
 * then, after a blank line, `PROJECT_FILE_IGNORE` (2.1.0), which stays when the first block goes.
 */
export const KEHIKOT_IGNORE = `${FOLDER_IGNORE}\n${PROJECT_FILE_IGNORE}`

/**
 * Does this `.gitignore` already ignore the folder? Generous on purpose: `.kehikot`, `.kehikot/`,
 * `/.kehikot/`, `**\/.kehikot/` and a commented-out `#.kehikot` all count. Not a gitignore engine;
 * the answer is only for deciding not to append.
 */
export function ignoresKehikot(gitignore: string): boolean {
  return gitignore.split(/\r?\n/).some((line) => {
    const rule = line
      .trim()
      .replace(/^#+\s*/, '')
      .replace(/^!/, '')
      .replace(/\/+$/, '')
    if (!rule) return false
    return rule === KEHIKOT_DIR || rule.endsWith(`/${KEHIKOT_DIR}`)
  })
}

/**
 * Does this `.gitignore` keep `project.json` out of git (2.1.0)? Strict, unlike `ignoresKehikot`: a
 * commented-out rule does NOT count, because the file must be ignored whatever anybody decided about
 * the folder. An uncommented rule ignoring the folder (`.kehikot/`, `.kehikot/*`, …) or the file
 * itself counts; the last such line wins, so a later `!` negation reads as not ignored. Not a
 * gitignore engine: a false "no" costs one redundant line.
 */
export function ignoresProjectFile(gitignore: string): boolean {
  let ignored = false
  for (const line of gitignore.split(/\r?\n/)) {
    const text = line.trim()
    if (!text || text.startsWith('#')) continue
    const negated = text.startsWith('!')
    const rule = (negated ? text.slice(1) : text).replace(/\/\*$/, '').replace(/\/+$/, '')
    const folder = rule === KEHIKOT_DIR || rule.endsWith(`/${KEHIKOT_DIR}`)
    const file = `${KEHIKOT_DIR}/${PROJECT_FILE}`
    if (folder || rule === file || rule.endsWith(`/${file}`)) ignored = !negated
  }
  return ignored
}

/** Append a block: a blank line between it and what was there, none in an empty file. Never touches a byte. */
function appended(gitignore: string, block: string): string {
  if (!gitignore.trim()) return block
  const ends = gitignore.endsWith('\n') ? gitignore : `${gitignore}\n`
  return `${ends}\n${block}`
}

/**
 * The text a `.gitignore` should have so that `project.json` is never committed (2.1.0); the same
 * text back when it already is not (`ignoresProjectFile`). Append-only: `PROJECT_FILE_IGNORE`. A host
 * runs it whenever it writes `project.json` — unlike the folder's rule, this one is nobody's choice.
 */
export function withProjectFileIgnored(gitignore: string): string {
  return ignoresProjectFile(gitignore) ? gitignore : appended(gitignore, PROJECT_FILE_IGNORE)
}

/**
 * The text a `.gitignore` should have after this convention is added to it; the same text back,
 * unchanged, when it already ignores the folder and `project.json`. Append-only: `KEHIKOT_IGNORE`,
 * or only the part missing — the folder's block where the file already has its rule, or (2.1.0)
 * `PROJECT_FILE_IGNORE` under a commented-out `#.kehikot/`. Run it once, when the folder is first created.
 */
export function withKehikotIgnored(gitignore: string): string {
  if (ignoresKehikot(gitignore)) return withProjectFileIgnored(gitignore)
  return appended(gitignore, ignoresProjectFile(gitignore) ? FOLDER_IGNORE : KEHIKOT_IGNORE)
}

/**
 * The text a `.gitignore` should have after this convention is taken out of it. Removes every
 * uncommented rule ignoring the folder, the comment lines directly above it and a stranded blank
 * line; leaves a commented-out `#.kehikot/` and a negation (`!.kehikot/…`) alone. Idempotent. When
 * it removed anything, `project.json` stays ignored (2.1.0): its rule is kept, or added.
 */
export function withoutKehikotIgnored(gitignore: string): string {
  const lines = gitignore.split('\n')
  const drop = new Set<number>()

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!.trim()
    /* The rule itself, uncommented and un-negated: unlike `ignoresKehikot`, a commented-out
       rule is not one here. */
    if (line.startsWith('#') || line.startsWith('!')) continue
    /* `.kehikot/`, `.kehikot` and `.kehikot/*` are one rule spelled three ways. */
    const rule = line.replace(/\/\*$/, '').replace(/\/+$/, '')
    if (!rule || (rule !== KEHIKOT_DIR && !rule.endsWith(`/${KEHIKOT_DIR}`))) continue

    drop.add(i)
    /* The comment that introduces it, however many lines it runs to. */
    let top = i
    for (let above = i - 1; above >= 0 && lines[above]!.trim().startsWith('#'); above -= 1) {
      drop.add(above)
      top = above
    }
    /* And the blank line above that, but only one: the separator `withKehikotIgnored` adds, so
       that adding the rule and removing it again gives back the same file. */
    if (top > 0 && lines[top - 1]!.trim() === '') drop.add(top - 1)
  }

  if (drop.size === 0) return gitignore

  /* Drop a blank only where the removal left two blanks together or one at the very top, so
     existing spacing is kept. */
  const kept = lines.filter((_, i) => !drop.has(i))
  const tidied: string[] = []
  for (const line of kept) {
    const blank = line.trim() === ''
    const last = tidied[tidied.length - 1]
    if (blank && (tidied.length === 0 || last?.trim() === '')) continue
    tidied.push(line)
  }
  /* A file that is now nothing but whitespace is empty, not a stack of blank
     lines: this function is the only thing that ever emptied it. */
  if (tidied.every((line) => line.trim() === '')) return withProjectFileIgnored('')
  const out = tidied.join('\n')
  return withProjectFileIgnored(out.endsWith('\n') ? out : `${out}\n`)
}
