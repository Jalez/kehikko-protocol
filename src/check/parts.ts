import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { partsDeclaration } from '../manifest.js'

/**
 * `bun run check:parts <module dir>…`: does a module do what its manifest says
 * about the parts of an epic?
 *
 * The requirement is in `parts.ts`: every item of a module's data is anchored
 * to a part by a file, a ref or a part id, or the module says why it has none.
 * `partsDeclaration` reads the manifest's half of that. This reads the other
 * half, as far as a program can: a module that says `reacts: ['parts']` and
 * never imports one of the protocol's focus helpers is following the parts by
 * a rule of its own, or not at all, and either is what the requirement is
 * there to stop.
 *
 * Node-only and behind no entry point in `exports`, like `create/`: it is run
 * from a checkout or a module's `node_modules` (`bin/check-parts.ts`), never
 * imported by a page. Read-only.
 */

/** The functions that ARE the rule. Importing any one of them from this package is using it. */
export const FOCUS_HELPERS = [
  'useFocus',
  'narrowToFocus',
  'anchorInFocus',
  'fileInFocus',
  'refInFocus',
  'partInFocus',
] as const

const IMPORT = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"](?:kehikot|roadmap)-module-protocol(?:\/client\/react)?['"]/g

/** The focus helpers one source file imports from the protocol, by the name they are exported under. */
export function focusImports(text: string): string[] {
  const found = new Set<string>()
  for (const match of text.matchAll(IMPORT)) {
    for (const piece of (match[1] ?? '').split(',')) {
      const name = piece.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]?.trim()
      if (name && (FOCUS_HELPERS as readonly string[]).includes(name)) found.add(name)
    }
  }
  return [...found]
}

export interface PartsCheck {
  /** The module's id, or the directory when no manifest was read. */
  module: string
  /** `follows` (reacts to parts), `partless` (says why not), or `undeclared`. */
  declares: 'follows' | 'partless' | 'undeclared'
  /** Where a focus helper is imported, as `file: names`. */
  uses: string[]
  /** Why the module fails. Empty is a pass. */
  failures: string[]
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
  if (follows && uses.length === 0) {
    failures.push(
      `${manifest.id || 'This module'} says it reacts to parts, and no source file imports a focus helper from `
        + `kehikot-module-protocol (${FOCUS_HELPERS.join(', ')}). Narrow with the protocol’s rule, not a copy of it.`,
    )
  }
  return {
    module: manifest.id || 'This module',
    declares: follows ? 'follows' : manifest.partless?.trim() ? 'partless' : 'undeclared',
    uses,
    failures,
  }
}

const SKIP = new Set(['node_modules', 'dist', 'build', 'coverage', 'test', 'tests', 'dev', 'public', 'template'])

/** A module's own source files: not its dependencies, its build, its tests or its dev scripts. */
export function sourcesOf(dir: string): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = []
  const walk = (at: string) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
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
    return { module: at, declares: 'undeclared', uses: [], failures: [`${at}: its manifest could not be loaded (${error instanceof Error ? error.message : String(error)}).`] }
  }
  if (!manifest) {
    return { module: at, declares: 'undeclared', uses: [], failures: [`${at}: no manifest.ts exporting a module manifest was found.`] }
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
  return [head, ...check.uses.map((use) => `        ${use}`), ...check.failures.map((failure) => `      ! ${failure}`)].join('\n')
}
