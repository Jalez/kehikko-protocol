import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { partsDeclaration } from '../manifest.js'

/**
 * `bun run check:parts <module dir>…`: does a module do what its manifest says about an epic's parts?
 * Fails only on the manifest (`partsDeclaration`: neither, both, or unloadable). Everything read out of
 * the sources is advice, never a failure: whether a focus helper is imported, and, from 1.2.0, what of
 * the contract in docs/parts.md can be seen in text (`contractNotes`). Node-only, read-only, behind no
 * entry point in `exports`.
 */

/** The functions that are the rule. Importing any one of them from this package is using it. */
export const FOCUS_HELPERS = [
  'useFocus',
  'narrowToFocus',
  'anchorInFocus',
  'fileInFocus',
  'refInFocus',
  'partInFocus',
] as const

const IMPORT = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]kehikot-module-protocol(?:\/client\/react)?['"]/g

/** Which of `names` one source file imports from the protocol, by the name they are exported under. */
function importsOf(text: string, names: readonly string[]): string[] {
  const found = new Set<string>()
  for (const match of text.matchAll(IMPORT)) {
    for (const piece of (match[1] ?? '').split(',')) {
      const name = piece.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]?.trim()
      if (name && names.includes(name)) found.add(name)
    }
  }
  return [...found]
}

/** The focus helpers one source file imports from the protocol, by the name they are exported under. */
export function focusImports(text: string): string[] {
  return importsOf(text, FOCUS_HELPERS)
}

/** The two that narrow a LIST by the one rule. A module that follows parts goes through one of them. */
const NARROWERS = ['useFocus', 'narrowToFocus'] as const

/** What 1.2.0 deprecated for parts: the standing count line, and the names of two modules. */
export const DEPRECATED_FOR_PARTS = ['focusSentence', 'FOCUS_WHERE', 'paperFileOf', 'PAPER_MODULE', 'pickedFiles', 'JOURNEYS_MODULE', 'partsOf'] as const

/**
 * Reasons `partless` is no longer for. A module is partless when it has no item that could carry an
 * anchor, or when it is not about one epic at all; not because somebody chose, because narrowing would
 * hide a selection (`keep` holds it), or because a part's files are "the paper's" (they are documents).
 */
const NOT_A_REASON: readonly [RegExp, string][] = [
  [/\b(?:chose|chosen|decided|prefers?)\b[^.]*\bnot\b/i, 'a choice is not a reason under one rule'],
  [/\bwould hide\b|\bhides? (?:their|its|the) (?:own )?selection\b/i, 'what a person selected is passed as `keep` and is never hidden'],
  [/\bof the paper\b|\bpaper(?:'|’)s files\b/i, 'from 1.2.0 a part\u2019s documents are project-relative, so any file can be in one'],
]

/**
 * What of the contract can be seen in a module's files, as notes for a person: a module that follows
 * parts and narrows through neither `useFocus().narrow` nor `narrowToFocus`, passes no `keep`, or still
 * imports what 1.2.0 deprecated; a `partless` whose reason the contract no longer accepts. Text only,
 * so each is a hint and none is a verdict. Pure.
 */
export function contractNotes(
  manifest: { id?: string; reacts?: readonly string[]; partless?: string },
  sources: readonly { path: string; text: string }[],
): string[] {
  const who = manifest.id || 'This module'
  const notes: string[] = []
  const follows = (manifest.reacts ?? []).includes('parts')
  const why = manifest.partless?.trim() ?? ''

  if (!follows) {
    for (const [pattern, because] of NOT_A_REASON) {
      if (!pattern.test(why)) continue
      notes.push(
        `${who} is partless because "${why}" — ${because}. partless is for a module with no item that could carry an `
          + 'anchor, or one that is not about one epic at all. If its items have a ref, a file or a part, it follows the parts.',
      )
      break
    }
    return notes
  }

  const helpers = sources.flatMap((source) => focusImports(source.text))
  if (helpers.length === 0) return notes

  const narrows = sources.some((source) => /\.narrow\s*(?:<[^>]*>)?\s*\(|\bnarrowToFocus\s*(?:<[^>]*>)?\s*\(/.test(source.text))
  if (!helpers.some((name) => (NARROWERS as readonly string[]).includes(name)) || !narrows) {
    notes.push(
      `${who} follows the parts with ${[...new Set(helpers)].join(', ')} and this scan found no call of useFocus().narrow or `
        + 'narrowToFocus. If it narrows a list, it does so by a rule of its own, which is the second rule the contract exists to '
        + 'prevent: give each item its anchors in one anchorOf(item) and narrow the list through the protocol. A module that '
        + 'follows the pick and has no list to narrow can leave this.',
    )
  } else if (!sources.some((source) => /\bkeep\b\s*[:,}]/.test(source.text))) {
    notes.push(
      `${who} narrows and this scan found no keep passed. What a person is in the middle of — an editor with unsaved words, `
        + 'the item they selected or opened — is passed as keep and stays drawn under any pick.',
    )
  }

  const old = sources.flatMap((source) => {
    const names = importsOf(source.text, DEPRECATED_FOR_PARTS)
    return names.length ? [`${source.path}: ${names.join(', ')}`] : []
  })
  if (old.length) {
    notes.push(
      `${who} imports what 1.2.0 deprecated for parts (${old.join('; ')}). No standing line about the pick is drawn `
        + '(emptySaid, only in a view the pick left empty), and a part names no module (documents, a { file } anchor).',
    )
  }
  return notes
}

export interface PartsCheck {
  /** The module's id, or the directory when no manifest was read. */
  module: string
  /** `follows` (reacts to parts), `partless` (says why not), or `undeclared`. */
  declares: 'follows' | 'partless' | 'undeclared'
  /** Where a focus helper is imported, as `file: names`. */
  uses: string[]
  /** Why the module fails: what its manifest says about parts, and nothing else. Empty is a pass. */
  failures: string[]
  /** What a person might want to look at. Never a failure. */
  notes: string[]
}

/** The check itself, over a manifest and the module's sources. Pure. */
export function checkParts(
  manifest: { id?: string; reacts?: readonly string[]; partless?: string },
  sources: readonly { path: string; text: string }[],
): PartsCheck {
  const failures = partsDeclaration(manifest)
  const follows = (manifest.reacts ?? []).includes('parts')
  const uses = sources.flatMap((source) => {
    const names = focusImports(source.text)
    return names.length ? [`${source.path}: ${names.join(', ')}`] : []
  })
  const notes: string[] = []
  if (follows && failures.length === 0 && uses.length === 0) {
    notes.push(
      `${manifest.id || 'This module'} says it reacts to parts, and this scan found no named import of a focus helper `
        + `from kehikot-module-protocol (${FOCUS_HELPERS.join(', ')}). A hint, not a verdict: the scan reads import `
        + 'text only and misses `import * as`, a wrapper’s re-export and a dynamic import. If the module narrows by a '
        + 'rule of its own, use the protocol’s.',
    )
  }
  if (failures.length === 0) notes.push(...contractNotes(manifest, sources))
  return {
    module: manifest.id || 'This module',
    declares: follows ? 'follows' : manifest.partless?.trim() ? 'partless' : 'undeclared',
    uses,
    failures,
    notes,
  }
}

const SKIP = new Set(['node_modules', 'dist', 'build', 'coverage', 'test', 'tests', 'dev', 'public', 'template'])

/** A module's own source files: not its dependencies, its build, its tests or its dev scripts. */
export function sourcesOf(dir: string): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = []
  const walk = (at: string) => {
    for (const entry of readdirSync(at, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue
      const full = join(at, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name) && !/\.(?:test|spec)\./.test(entry.name)) {
        out.push({ path: relative(dir, full), text: readFileSync(full, 'utf8') })
      }
    }
  }
  walk(dir)
  return out
}

/** The manifest a module directory exports from `manifest.ts` (or `.js`), under whatever name. Null when there is none. */
export async function manifestOf(dir: string): Promise<{ id?: string; reacts?: readonly string[]; partless?: string } | null> {
  for (const name of ['manifest.ts', 'manifest.js', 'manifest.mjs']) {
    const file = join(dir, name)
    if (!existsSync(file)) continue
    const exported = (await import(pathToFileURL(file).href)) as Record<string, unknown>
    for (const value of Object.values(exported)) {
      if (typeof value !== 'object' || value === null) continue
      const one = value as { kind?: unknown; id?: unknown }
      if (typeof one.kind === 'string' && typeof one.id === 'string') return value
    }
  }
  return null
}

/** One module directory, read and checked. */
export async function checkModule(dir: string): Promise<PartsCheck> {
  const at = resolve(dir)
  let manifest: Awaited<ReturnType<typeof manifestOf>>
  try {
    manifest = await manifestOf(at)
  } catch (error) {
    return { module: at, declares: 'undeclared', uses: [], notes: [], failures: [`${at}: its manifest could not be loaded (${error instanceof Error ? error.message : String(error)}).`] }
  }
  if (!manifest) {
    return { module: at, declares: 'undeclared', uses: [], notes: [], failures: [`${at}: no manifest.ts exporting a module manifest was found.`] }
  }
  return checkParts(manifest, sourcesOf(at))
}

/** What the command prints for one module. */
export function said(check: PartsCheck): string {
  const head =
    check.failures.length > 0
      ? `FAIL  ${check.module}`
      : check.declares === 'partless'
        ? `ok    ${check.module} — partless, and says why`
        : `ok    ${check.module} — follows the picked parts`
  return [
    head,
    ...check.uses.map((use) => `        ${use}`),
    ...check.failures.map((failure) => `      ! ${failure}`),
    ...check.notes.map((note) => `      note: ${note}`),
  ].join('\n')
}
