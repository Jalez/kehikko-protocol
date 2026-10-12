import { z } from 'zod'
import { LIMITS } from './limits.js'
import { EPIC_SLUG, slugFrom } from './ids.js'
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
 * @deprecated 1.2.0. A part names no module. A part's files are its `documents`, project-relative,
 * whichever module keeps them; nothing new should spell this id. Kept, and unchanged, for `files`.
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
  return relativeName(raw, LIMITS.PART_FILE)
}

/** The form `partFile` and `partDocument` share, under one bound each. */
function relativeName(raw: unknown, longest: number): string | null {
  if (typeof raw !== 'string' || raw.length > LIMITS.PATH) return null
  let file = raw.trim().normalize('NFC')
  while (file.startsWith('./')) file = file.slice(2)
  if (!file || file.length > longest) return null
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
 * @deprecated 1.2.0. It reads one module's folder out of a path. Compare a file with a part through
 * `fileInFocus` or a `{ file }` anchor, which read `documents` (`documentOf`). Kept, and unchanged.
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

/**
 * One of a part's documents in its stored form, or null: a path relative to the PROJECT, `/` only, no
 * empty, `.` or `..` segment, not absolute, no control character, NFC, at most `LIMITS.PART_DOCUMENT`
 * characters. `partFile`'s form with the project as its root; `a/../b` is refused, not resolved.
 */
export function partDocument(raw: unknown): string | null {
  return relativeName(raw, LIMITS.PART_DOCUMENT)
}

/** Whether a string is ALREADY in `partDocument`'s form, exactly. What the wire demands of each entry. */
export function isPartDocument(value: unknown): value is string {
  return typeof value === 'string' && partDocument(value) === value
}

/**
 * The project-relative name of a file a caller is holding, or null: THE normalisation, and the only
 * place a path is turned into what `documents` lists. A relative path is taken as project-relative
 * already. An absolute one is read against `projectPath` (`context.projectPath`) when it is under it;
 * otherwise from the last `/.kehikot/` in it, so a path a module resolved through a symlink is still
 * read. An absolute path that is neither is null. Backslashes read as slashes; case-sensitive.
 */
export function documentOf(path: unknown, projectPath?: string | null): string | null {
  if (typeof path !== 'string' || path.length > LIMITS.PATH) return null
  const spelled = path.trim().replace(/\\/g, '/')
  if (!spelled.startsWith('/') && !/^[A-Za-z]:\//.test(spelled)) return partDocument(spelled)

  if (typeof projectPath === 'string' && projectPath.trim()) {
    const root = projectPath.trim().replace(/\\/g, '/').replace(/\/+$/, '')
    if (root && spelled.startsWith(`${root}/`)) return partDocument(spelled.slice(root.length + 1))
  }
  const at = spelled.lastIndexOf(`/${KEHIKOT_DIR}/`)
  return at < 0 ? null : partDocument(spelled.slice(at + 1))
}

/**
 * Every name a held file can be compared under: `paper` for a part's deprecated `files` (as
 * `paperFileOf` reads it, and a project-relative name under the paper's folder read the same way),
 * `document` for its `documents`.
 */
function namesOf(file: string, epic?: string | null, projectPath?: string | null): { paper: string[]; document: string | null } {
  const paper: string[] = []
  const first = paperFileOf(file, epic)
  if (first !== null) paper.push(first)
  const document = documentOf(file, projectPath)
  /* A project-relative name is a paper file too when it is under the paper's folder: an older host
     sends only `files`, and a module anchored by document must still narrow there. */
  if (document !== null) {
    const under = paperFileOf(`/${document}`, epic)
    if (under !== null && !paper.includes(under)) paper.push(under)
  }
  return { paper, document }
}

/** Whether a part holds a file, under any of the names `namesOf` found for it. */
function holds(part: EpicPart, names: { paper: string[]; document: string | null }): boolean {
  if (names.document !== null && (part.documents ?? []).includes(names.document)) return true
  const files = part.files ?? []
  return names.paper.some((name) => files.includes(name))
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
   * @deprecated 1.2.0. Read `documents`. A host goes on filling this for modules that read it.
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
  /**
   * The documents this part has, whichever modules keep them: each a path relative to the PROJECT, in
   * `partDocument`'s form exactly; any other entry is refused. The host's union of what every module
   * published for the part. Optional and not defaulted, like `files`: read it as `part.documents ?? []`.
   */
  documents: z
    .array(
      z
        .string()
        .min(1)
        .max(LIMITS.PART_DOCUMENT)
        .refine(isPartDocument, 'a part\'s document is a path relative to the project: forward slashes, no "..", not absolute'),
    )
    .max(LIMITS.PART_DOCUMENTS)
    .optional(),
})
export type EpicPart = z.infer<typeof partSchema>

/**
 * `context.parts`, as a schema of its own so a host can check the list before composing a context.
 * Two parts sharing an id is not refused; the functions below read the first.
 */
export const partsSchema = z.array(partSchema).max(LIMITS.PARTS)

/**
 * One part as the epic keeps it: an id and a name, and its place is its place in the list. `id` is made
 * once and never changes; `name` is what a person calls it and is free to. What a host stores in the
 * epic's own file and answers `parts.set` with; `context.parts` carries the same part with `picked` and
 * what the modules hold for it (and calls the name `heading`).
 */
export const listedPartSchema = z.object({
  id: z.string().regex(PART_ID),
  name: z.string().trim().min(1).max(LIMITS.TITLE),
})
export type ListedPart = z.infer<typeof listedPartSchema>

/** An epic's whole list of parts, in order: at most `LIMITS.PARTS`, and no id twice. */
export const partListSchema = z
  .array(listedPartSchema)
  .max(LIMITS.PARTS)
  .refine((parts) => new Set(parts.map((part) => part.id)).size === parts.length, { message: 'two parts cannot share an id' })

/**
 * The id a new part is given, from its name: `slugFrom(name)`, or `part` when the name has nothing
 * usable in it, told apart from the ids already `taken` by `-2`, `-3`. Made once, when the part is
 * added; a rename does not call this. The one derivation, so a host's picker and its MCP door agree.
 */
export function partIdFor(name: unknown, taken: Iterable<string>): string {
  const used = new Set(taken)
  const wanted = (typeof name === 'string' ? slugFrom(name.trim().slice(0, LIMITS.TITLE)) : '') || 'part'
  let id = wanted
  for (let n = 2; used.has(id); n += 1) id = `${wanted.slice(0, 76)}-${n}`
  return id
}

/**
 * How many parts a module built with this package before 1.2.0 can be sent. Its own schema refuses a
 * context that lists more, and a refused context is a module with no greeting at all.
 */
export const PARTS_BEFORE_1_2 = 32

/**
 * The parts a host sends ONE module, given the package version that module was built with (its
 * manifest's `build.protocol`): the whole list from 1.2.0 on, and at most `PARTS_BEFORE_1_2` for an
 * older or unknown build, in the epic's order, every picked part first to be kept. An older module on
 * a long epic then still narrows to what is picked; it cannot list the parts it was not sent.
 */
export function partsFor(parts: readonly EpicPart[], builtWith: string | null | undefined): EpicPart[] {
  const version = /^(\d+)\.(\d+)\./.exec(typeof builtWith === 'string' ? builtWith : '')
  const takesAll = version !== null && (Number(version[1]) > 1 || (Number(version[1]) === 1 && Number(version[2]) >= 2))
  const most = takesAll ? LIMITS.PARTS : PARTS_BEFORE_1_2
  if (parts.length <= most) return [...parts]
  const picked = parts.filter((part) => part.picked).slice(0, most)
  let room = most - picked.length
  return parts.filter((part) => {
    if (part.picked) return picked.includes(part)
    if (room <= 0) return false
    room -= 1
    return true
  })
}

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

/**
 * The parts that have a file, in the epic's order. Usually one; `[]` for a file no part names. `file`,
 * `epic` and `projectPath` are read as `fileInFocus` reads them.
 */
export function partsOfFile(
  parts: readonly EpicPart[],
  file: string,
  epic?: string | null,
  projectPath?: string | null,
): EpicPart[] {
  const names = namesOf(file, epic, projectPath)
  return parts.filter((part) => holds(part, names))
}

/**
 * The documents the picked parts have, once each, in the parts' order, project-relative. `[]` when
 * nothing is picked, which is not "show no documents": ask `isFocused` first.
 */
export function pickedDocuments(parts: readonly EpicPart[]): string[] {
  const out: string[] = []
  for (const part of pickedParts(parts)) {
    for (const document of part.documents ?? []) if (!out.includes(document)) out.push(document)
  }
  return out
}

/**
 * The files the picked parts own, once each, in the parts' order. `[]` when nothing is picked, which
 * is not "show no files": ask `isFocused` first. `[]` while focused means the picked parts own no file.
 * @deprecated 1.2.0. Paper-relative names, from `files`. Use `pickedDocuments`.
 */
export function pickedFiles(parts: readonly EpicPart[]): string[] {
  const out: string[] = []
  for (const part of pickedParts(parts)) {
    for (const file of part.files ?? []) if (!out.includes(file)) out.push(file)
  }
  return out
}

/**
 * Whether a file is in front of the person: true when nothing is picked, otherwise exactly when a
 * picked part has it. `file` is an absolute path (a `passage.path`) or a project-relative name, read by
 * `documentOf` against the parts' `documents`; `projectPath` is `context.projectPath`, needed for an
 * absolute path outside `.kehikot/`. A host that sends only `files` is answered as before 1.2.0: `epic`
 * is `context.epic`, and a paper-relative name still matches `files`. A file no part names is outside.
 */
export function fileInFocus(
  parts: readonly EpicPart[],
  file: string,
  epic?: string | null,
  projectPath?: string | null,
): boolean {
  const picked = pickedParts(parts)
  if (picked.length === 0) return true
  const names = namesOf(file, epic, projectPath)
  return picked.some((part) => holds(part, names))
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
 * What ties one item of a module's data to a part, told apart by its one key: `{ file }` (a document,
 * absolute or project-relative; `fileInFocus`), `{ ref }` (`refInFocus`), `{ part }` (a part's id,
 * `partInFocus`; null is "assigned to none"), or `{ whole: true }` (1.2.0): the item is about the epic
 * itself or its whole paper, so it belongs to EVERY part and is in front under any pick. `whole` is for
 * an item that is really about all of it; an item about nothing in particular answers no anchor.
 */
export type Anchor = { file: string } | { ref: string } | { part: string | null } | { whole: true }

/**
 * What an item may answer: one anchor, several (a slide that cites three
 * files is in front when ANY of them is), or none. None — null, undefined or
 * an empty list — belongs to the epic as a whole.
 */
export type Anchors = Anchor | readonly Anchor[] | null | undefined

/**
 * Whether an anchored thing is in front of the person. THE rule: true when nothing is picked, otherwise
 * exactly when any one of its anchors is in a picked part; `{ whole: true }` is in every part. No
 * anchor is outside the focus. `epic` and `projectPath` are the context's, for a `{ file }` anchor.
 */
export function anchorInFocus(
  parts: readonly EpicPart[],
  anchor: Anchors,
  epic?: string | null,
  projectPath?: string | null,
): boolean {
  if (!isFocused(parts)) return true
  if (!anchor) return false
  const anchors: readonly Anchor[] = Array.isArray(anchor) ? anchor : [anchor as Anchor]
  return anchors.some((one) => {
    if (!one || typeof one !== 'object') return false
    if ('whole' in one) return one.whole === true
    if ('file' in one) return fileInFocus(parts, one.file, epic, projectPath)
    if ('ref' in one) return refInFocus(parts, one.ref)
    return 'part' in one && partInFocus(parts, one.part)
  })
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
 * A list narrowed to the picked parts: the items in front, and how many are not. `options.epic` and
 * `options.projectPath` are the context's, for a `{ file }` anchor; pass them. An item `options.keep`
 * answers true for is drawn though outside, still counted in `outside`, and counted in `kept`.
 */
export function narrowToFocus<T>(
  parts: readonly EpicPart[],
  items: readonly T[],
  anchorOf: (item: T) => Anchors,
  options: { epic?: string | null; projectPath?: string | null; keep?: (item: T) => boolean } = {},
): Narrowed<T> {
  const { epic, projectPath, keep } = options
  if (!isFocused(parts)) return { shown: [...items], outside: 0, kept: 0 }
  const inFocus = (item: T) => anchorInFocus(parts, anchorOf(item), epic, projectPath)
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
 * The one sentence a module shows INSIDE a view the pick left empty: `No note is in the picked part.`,
 * `No note is in the picked parts.` for several. `''` when nothing is picked. `noun` names one item, in
 * the singular. Drawn where the items would have been and only when none is drawn; while anything is
 * shown, a module says nothing about the pick.
 */
export function emptySaid(parts: readonly EpicPart[], noun = 'item'): string {
  const picked = pickedParts(parts).length
  if (picked === 0) return ''
  return `No ${noun.trim() || 'item'} is in the picked ${picked === 1 ? 'part' : 'parts'}.`
}

/**
 * The sentence a module says while parts are picked: `3 questions outside the picked part (Heading).`
 * `''` when nothing is picked; `0 … outside` is said. `noun` names one item; give `[one, many]`
 * where adding an `s` is wrong. With `total` — how many items the count was taken over — it reads
 * `2 of 3 questions are outside the picked part (Heading).`
 * @deprecated 1.2.0. No module draws a standing line about the pick. Use `emptySaid`, in a view the
 * pick left empty, and say nothing otherwise. Kept, and unchanged.
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
 * @deprecated 1.2.0. It went with the standing count line (`focusSentence`). Kept, and unchanged.
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
