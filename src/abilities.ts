import { z } from 'zod'

import { LIMITS } from './limits.js'

/**
 * 2.33.0. Two things a module says about itself that a host acts on without naming the module:
 * what it can open when the host points the canvas at it (`opens`), and what it holds that a
 * restart would end (`holds`). Top-level manifest fields, like `shows` and `events`, and not under
 * `declares`: a host before 2.33.0 reads an unknown `declares` key as a declaration from a newer
 * protocol (`fitOf`) and would not run the module, while it ignores an unknown top-level field.
 * Free words on the wire like `shows`: a host acts on the words it knows and ignores the rest.
 * Design notes: docs/manifest.md (`opens`, `holds`).
 */

/**
 * The things a module can open when the host points the canvas at one (`opens` in a manifest).
 *
 * `file`: a file of the project, by its path, when the host points the canvas at it
 * (`context.passage` with a `path`, `by` the host). A host that has a file to show a person — a
 * module's settings file, say — offers to open it with a module that says this, on the kehikko or
 * placed there for it, and otherwise shows the file itself.
 */
export const OPENS = {
  file: 'A file of the project, by its path, when the host points the canvas at it.',
} as const
export type Opens = keyof typeof OPENS

/**
 * What a module holds that a restart of it ends (`holds` in a manifest).
 *
 * `live-sessions`: shells or agent conversations running in the module's own process. A host does
 * not restart such a module on its own account — an automatic update waits for its sessions to end
 * — and a press that restarts it says that it ends them.
 */
export const HOLDS = {
  'live-sessions': 'Shells or agent sessions running in its own process, which a restart of the module ends.',
} as const
export type Holds = keyof typeof HOLDS

/** One word of `opens` or `holds`: a lowercase letter, then lowercase letters, digits and dashes. */
const word = z.string().regex(new RegExp(`^[a-z][a-z0-9-]{0,${LIMITS.TAG - 1}}$`), 'a lowercase word with dashes')

/** `opens` in a manifest: words, each once. */
export const opensSchema = z
  .array(word)
  .max(LIMITS.OPENS)
  .refine((words) => new Set(words).size === words.length, { message: 'a module says it opens each thing once' })

/** `holds` in a manifest: words, each once. */
export const holdsSchema = z
  .array(word)
  .max(LIMITS.HOLDS)
  .refine((words) => new Set(words).size === words.length, { message: 'a module says it holds each thing once' })

/** The least of a manifest the readers below look at. */
export interface AbleManifest {
  opens?: readonly string[] | null
  holds?: readonly string[] | null
}

/** What a module says it can open (`opens`), `[]` when it says nothing. */
export function opensOf(manifest: AbleManifest | null | undefined): readonly string[] {
  return Array.isArray(manifest?.opens) ? manifest.opens : []
}

/** Whether a module says it can open this kind of thing (`'file'`). */
export function canOpen(manifest: AbleManifest | null | undefined, what: Opens | (string & {})): boolean {
  return opensOf(manifest).includes(what)
}

/** What a module says it holds (`holds`), `[]` when it says nothing. */
export function holdsOf(manifest: AbleManifest | null | undefined): readonly string[] {
  return Array.isArray(manifest?.holds) ? manifest.holds : []
}

/** Whether a module says it holds live shells or agent sessions that a restart would end. */
export function holdsLiveSessions(manifest: AbleManifest | null | undefined): boolean {
  return holdsOf(manifest).includes('live-sessions')
}
