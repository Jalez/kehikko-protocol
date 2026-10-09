import { z } from 'zod'
import { LIMITS } from './limits.js'
import { EPIC_SLUG } from './ids.js'
import { ref } from './fragments.js'
import { KEHIKOT_DIR, moduleFolder } from './project.js'

/**
 * A part's id: the same class of characters as an epic's slug (`EPIC_SLUG`). What a step's `part`
 * holds and what a host stores for the focus; never the heading, which is free to be reworded.
 */
export const PART_ID = new RegExp(EPIC_SLUG.source)

/**
 * The module whose folder a paper is kept in. `moduleDir(projectPath, PAPER_MODULE)` is where a
 * project's papers are, one folder per epic, named by its slug.
 */
export const PAPER_MODULE = 'kehikot.paper'

/** `.kehikot/paper` — between the project and the epic's slug, in every path of a paper's file. */
const PAPERS_AT = `${KEHIKOT_DIR}/${moduleFolder(PAPER_MODULE)}`

/**
 * One of a part's files in its stored form, or null: relative to the paper's folder, `/` only, no
 * empty, `.` or `..` segment, not absolute, no control character, NFC, at most `LIMITS.PART_FILE`
 * characters. Only outer space, a leading `./` and the normal form are tidied; `a/../b` is refused.
 */
export function partFile(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > LIMITS.PATH) return null
  let file = raw.trim().normalize('NFC')
  while (file.startsWith('./')) file = file.slice(2)
  if (!file || file.length > LIMITS.PART_FILE) return null
  if (file.startsWith('/') || /^[A-Za-z]:/.test(file)) return null
  if (/[\\\u0000-\u001f\u007f]/.test(file)) return null
  for (const segment of file.split('/')) {
    if (!segment || segment === '.' || segment === '..') return null
  }
  return file
}

/** Whether a string is ALREADY in `partFile`'s form, exactly. What the wire demands of each entry. */
export function isPartFile(value: unknown): value is string {
  return typeof value === 'string' && partFile(value) === value
}

/**
 * The paper-relative name of a file, or null when it is not a file of the paper. An absolute path is
 * read by finding `/.kehikot/paper/<epic>/` in it (backslashes read as slashes); a relative one is taken
 * as paper-relative already. Pass `context.epic`: without it any epic's paper matches. Case-sensitive.
 */
export function paperFileOf(path: unknown, epic?: string | null): string | null {
  if (typeof path !== 'string' || path.length > LIMITS.PATH) return null
  const spelled = path.trim().replace(/\\/g, '/')
  if (!spelled.startsWith('/') && !/^[A-Za-z]:\//.test(spelled)) return partFile(spelled)

  if (typeof epic === 'string') {
    if (!EPIC_SLUG.test(epic)) return null
    const marker = `/${PAPERS_AT}/${epic}/`
    const at = spelled.indexOf(marker)
    return at < 0 ? null : partFile(spelled.slice(at + marker.length))
  }
  const marker = `/${PAPERS_AT}/`
  for (let at = spelled.indexOf(marker); at >= 0; at = spelled.indexOf(marker, at + 1)) {
    const rest = spelled.slice(at + marker.length)
    const slash = rest.indexOf('/')
    if (slash > 0 && EPIC_SLUG.test(rest.slice(0, slash))) return partFile(rest.slice(slash + 1))
  }
  return null
}

export const partSchema = z.object({
  id: z.string().regex(PART_ID),
  /** What a person calls it. Drawn as given; never compared. */
  heading: z.string().max(LIMITS.TITLE).default(''),
  /** The references the host says belong to this part. Never absent, for the reason `showing` never is. */
  refs: z.array(ref).max(LIMITS.PART_REFS).default([]),
  /** Whether a person has picked this part out. None picked means the whole epic. */
  picked: z.boolean().default(false),
  /**
   * The files of the epic's paper this part owns, each relative to the paper's folder and in
   * `partFile`'s form exactly; any other entry is refused. Optional and not defaulted: absent means
   * none, so read it as `part.files ?? []`.
   */
  files: z
    .array(
      z
        .string()
        .min(1)
        .max(LIMITS.PART_FILE)
        .refine(isPartFile, 'a part\'s file is a path relative to the paper\'s folder: forward slashes, no "..", not absolute'),
    )
    .max(LIMITS.PART_FILES)
    .optional(),
})
export type EpicPart = z.infer<typeof partSchema>

/**
 * `context.parts`, as a schema of its own so a host can check the list before composing a context.
 * Two parts sharing an id is not refused; the functions below read the first.
 */
export const partsSchema = z.array(partSchema).max(LIMITS.PARTS)

/** The parts a person has picked out. Empty when the whole epic is in front of them. */
export function pickedParts(parts: readonly EpicPart[]): EpicPart[] {
  return parts.filter((part) => part.picked)
}

/** Whether anything is narrowed at all. False is the resting state, and the only one an older host produces. */
export function isFocused(parts: readonly EpicPart[]): boolean {
  return parts.some((part) => part.picked)
}

/**
 * Whether a reference is in front of the person: true when nothing is picked, otherwise exactly when
 * a picked part lists it. A reference no part lists is outside every focus; count it, do not drop it.
 */
export function refInFocus(parts: readonly EpicPart[], ref: string): boolean {
  const picked = pickedParts(parts)
  if (picked.length === 0) return true
  return picked.some((part) => part.refs.includes(ref))
}

/**
 * Whether a thing assigned to a part (a step carrying `part`) is in front of the person: true when
 * nothing is picked, otherwise exactly when the part it names is picked. No part, or a part the epic
 * no longer has, is outside the focus and counted.
 */
export function partInFocus(parts: readonly EpicPart[], part: string | null | undefined): boolean {
  const picked = pickedParts(parts)
  if (picked.length === 0) return true
  return typeof part === 'string' && picked.some((one) => one.id === part)
}

/** The parts that own a file, in the epic's order. Usually one; `[]` for a file no part names. */
export function partsOfFile(parts: readonly EpicPart[], file: string, epic?: string | null): EpicPart[] {
  const named = paperFileOf(file, epic)
  if (named === null) return []
  return parts.filter((part) => (part.files ?? []).includes(named))
}

/**
 * The files the picked parts own, once each, in the parts' order. `[]` when nothing is picked, which
 * is not "show no files": ask `isFocused` first. `[]` while focused means the picked parts own no file.
 */
export function pickedFiles(parts: readonly EpicPart[]): string[] {
  const out: string[] = []
  for (const part of pickedParts(parts)) {
    for (const file of part.files ?? []) if (!out.includes(file)) out.push(file)
  }
  return out
}

/**
 * Whether a file of the epic's paper is in front of the person: true when nothing is picked, otherwise
 * exactly when a picked part owns it. `file` is an absolute `passage.path` or a paper-relative name and
 * `epic` is `context.epic`, as `paperFileOf` reads them. A file no part names is outside and counted.
 */
export function fileInFocus(parts: readonly EpicPart[], file: string, epic?: string | null): boolean {
  const picked = pickedParts(parts)
  if (picked.length === 0) return true
  const named = paperFileOf(file, epic)
  return named !== null && picked.some((part) => (part.files ?? []).includes(named))
}

/**
 * How many items are in front of the person (`shown`) and how many are outside the picked parts.
 * `inFocus` is `refInFocus`, `partInFocus` or `fileInFocus` per item; `outside` is 0 when nothing is picked.
 */
export function focusCount<T>(
  parts: readonly EpicPart[],
  items: readonly T[],
  inFocus: (item: T) => boolean,
): { shown: number; outside: number } {
  if (!isFocused(parts)) return { shown: items.length, outside: 0 }
  let shown = 0
  for (const item of items) if (inFocus(item)) shown += 1
  return { shown, outside: items.length - shown }
}

/**
 * Every item a module holds is anchored to a part by a file, a ref or a part id, or the module says
 * why it has none: `reacts: ['parts']` or `partless` in the manifest (`partsDeclaration` in `manifest.ts`).
 */

/**
 * What ties one item of a module's data to a part, told apart by its one key: `{ file }` (a paper file,
 * absolute or paper-relative; `fileInFocus`), `{ ref }` (`refInFocus`), or `{ part }` (a part's id,
 * `partInFocus`; null is "assigned to none").
 */
export type Anchor = { file: string } | { ref: string } | { part: string | null }

/**
 * What an item may answer: one anchor, several (a slide that cites three
 * files is in front when ANY of them is), or none. None — null, undefined or
 * an empty list — belongs to the epic as a whole.
 */
export type Anchors = Anchor | readonly Anchor[] | null | undefined

/**
 * Whether an anchored thing is in front of the person: true when nothing is picked, otherwise exactly
 * when any one of its anchors is in a picked part. No anchor is outside the focus and counted.
 * `epic` is `context.epic`, for a `{ file }` anchor; pass it.
 */
export function anchorInFocus(parts: readonly EpicPart[], anchor: Anchors, epic?: string | null): boolean {
  if (!isFocused(parts)) return true
  if (!anchor) return false
  const anchors: readonly Anchor[] = Array.isArray(anchor) ? anchor : [anchor as Anchor]
  return anchors.some((one) =>
    'file' in one
      ? fileInFocus(parts, one.file, epic)
      : 'ref' in one
        ? refInFocus(parts, one.ref)
        : partInFocus(parts, one.part),
  )
}

/** What a focus leaves of a list. */
export interface Narrowed<T> {
  /**
   * The items to draw, in the order they came. Every item when nothing is
   * picked — the same array's contents, untouched.
   */
  shown: T[]
  /** How many items are outside the picked parts. Zero when nothing is picked. `focusCount`'s number. */
  outside: number
  /** How many of `shown` are outside and drawn anyway, because `keep` said the person is in the middle of them. */
  kept: number
}

/**
 * A list narrowed to the picked parts: the items in front, and how many are not. `options.epic` is
 * `context.epic`, for a `{ file }` anchor; pass it. An item `options.keep` answers true for is drawn
 * though outside, still counted in `outside`, and counted in `kept`.
 */
export function narrowToFocus<T>(
  parts: readonly EpicPart[],
  items: readonly T[],
  anchorOf: (item: T) => Anchors,
  options: { epic?: string | null; keep?: (item: T) => boolean } = {},
): Narrowed<T> {
  const { epic, keep } = options
  if (!isFocused(parts)) return { shown: [...items], outside: 0, kept: 0 }
  const inFocus = (item: T) => anchorInFocus(parts, anchorOf(item), epic)
  const { outside } = focusCount(parts, items, inFocus)
  let kept = 0
  const shown = items.filter((item) => {
    if (inFocus(item)) return true
    if (!keep?.(item)) return false
    kept += 1
    return true
  })
  return { shown, outside, kept }
}

/**
 * The sentence a module says while parts are picked: `3 questions outside the picked part (Heading).`
 * `''` when nothing is picked; `0 … outside` is said. `noun` names one item; give `[one, many]`
 * where adding an `s` is wrong. With `total` — how many items the count was taken over — it reads
 * `2 of 3 questions are outside the picked part (Heading).`
 */
export function focusSentence(
  parts: readonly EpicPart[],
  outside: number,
  noun: string | readonly [one: string, many: string] = 'item',
  options: { total?: number } = {},
): string {
  const picked = pickedParts(parts)
  if (picked.length === 0) return ''
  const [one, many] = typeof noun === 'string' ? [noun, `${noun}s`] : noun
  const where = picked.length === 1 ? 'the picked part' : `the ${picked.length} picked parts`
  const names = picked.map((part) => part.heading || part.id).join(', ')
  const { total } = options
  const count =
    total === undefined
      ? `${outside} ${outside === 1 ? one : many}`
      : `${outside} of ${total} ${total === 1 ? one : many} ${outside === 1 ? 'is' : 'are'}`
  return `${count} outside ${where} (${names}).`
}

/**
 * Where the control is, for the sentence's tooltip or the line under an empty
 * pane: it is never on the module's own page.
 */
export const FOCUS_WHERE = 'Parts are picked in the host’s bar, beside the epic. Unpick them there to see the rest.'

/**
 * Two lists of parts, by value: what `context.parts` is compared with before
 * a page is redrawn for it. A host re-sends the context after every change
 * anywhere on the canvas, and the list is the same list on nearly all of them.
 */
export function sameParts(a: readonly EpicPart[], b: readonly EpicPart[]): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b)
}
