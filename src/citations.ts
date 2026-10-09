/**
 * Citations: the `[^1]: <project-relative path> | "<exact words>"` source line, the `[^1]` marker,
 * and the rule for finding the words again. Only whitespace runs are forgiven in a match (not case,
 * punctuation or markup). Functions take the file's TEXT (`null`: unreadable); nothing here opens a file.
 * Design notes: docs/citations.md.
 */

/** One passage a text rests on: a file of the project, and its exact words there. */
export interface CitedSource {
  /** What the text's `[^label]` names. */
  label: string
  /** Relative to the project root. */
  path: string
  /** The passage's words as they are in the file; whitespace is not significant. */
  quote: string
}

/**
 * What looking for a source's words in its file came to. `holds`: found exactly once. `ambiguous`: more
 * than once, the range is the first. `adrift`: not in the file. `unreadable`: no file, or outside the project.
 */
export const CITE_STATUSES = ['holds', 'ambiguous', 'adrift', 'unreadable'] as const
export type CiteStatus = (typeof CITE_STATUSES)[number]

/** Where a quote was found: UTF-8 byte offsets (what a passage carries) and 1-based lines. */
export interface CitedRange {
  from: number
  to: number
  line: number
  endLine: number
}

/**
 * A source as it was found on one read: what a server answers a page with, and
 * what a page draws. The range is looked for again every time and never
 * stored.
 */
export interface CitationView extends CitedSource {
  status: CiteStatus
  /** Null unless the words were found. */
  at: CitedRange | null
  /** How many times the words occur in the file. */
  count: number
}

const LABEL = '[A-Za-z0-9_-]{1,20}'
const SOURCE_LINE = new RegExp(`^\\[\\^(${LABEL})\\]:[ \\t]*([^|]+?)[ \\t]*\\|[ \\t]*"(.*)"[ \\t]*$`)

/**
 * A citation marker in a text: `[^label]`, not followed by `:` (which would be
 * a source line). Global, for `matchAll` and `replace`; do not `exec` or
 * `test` it, which would leave its `lastIndex` behind for the next caller.
 */
export const CITE_MARKER = new RegExp(`\\[\\^(${LABEL})\\](?!:)`, 'g')

/**
 * One `[^label]: path | "quote"` line, or null when it is not one. The path
 * ends at the first bar and the quote at the last quote mark, so a quote may
 * hold `|` and `"`.
 */
export function parseSource(line: string): CitedSource | null {
  const match = SOURCE_LINE.exec(line)
  if (!match) return null
  const quote = (match[3] ?? '').trim()
  return quote ? { label: match[1]!, path: match[2]!.trim(), quote } : null
}

export function serialiseSource(source: CitedSource): string {
  return `[^${source.label}]: ${source.path} | "${source.quote}"`
}

/**
 * Why a source cannot be written as a source line, or null when it can. The path must be relative,
 * inside the project and hold no `|`; the quote is one line. Checks the strings only, not the file.
 */
export function uncitable(source: Pick<CitedSource, 'path' | 'quote'>): string | null {
  if (!source.path || /[|\n]/.test(source.path)) return `the source path "${source.path.slice(0, 80)}" is empty or has | or a line break in it.`
  if (source.path.startsWith('/') || /^[A-Za-z]:/.test(source.path) || source.path.split('/').includes('..')) {
    return `the source path "${source.path.slice(0, 80)}" is not relative to the project and inside it.`
  }
  if (!source.quote.trim()) return 'a source needs the exact words it cites.'
  if (/\n/.test(source.quote)) return 'a source quote is one line; whitespace in it is not significant, so join its lines with spaces.'
  return null
}

/** Where markers are looked for. */
export interface MarkerScan {
  /**
   * Leave Markdown code alone — fenced blocks and inline spans — so a `[^1]`
   * written inside code is shown as code and not read as a citation. For text
   * that is rendered as Markdown; off by default, for text that is not.
   */
  skipCode?: boolean
}

/** `text` with `each` applied to everything that is not fenced or inline code. */
function outsideCode(text: string, each: (prose: string) => string): string {
  return text
    .split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/)
    .map((part, i) => (i % 2 === 1 ? part : each(part)))
    .join('')
}

/** The labels a text's markers name, in order, each once. */
export function markersIn(text: string, scan: MarkerScan = {}): string[] {
  const found: string[] = []
  const look = (prose: string) => {
    for (const match of prose.matchAll(CITE_MARKER)) if (!found.includes(match[1]!)) found.push(match[1]!)
    return prose
  }
  if (scan.skipCode) outsideCode(text, look)
  else look(text)
  return found
}

/** A text with each marker replaced by what `as` makes of its label. */
export function replaceMarkers(text: string, as: (label: string) => string, scan: MarkerScan = {}): string {
  const swap = (prose: string) => prose.replace(CITE_MARKER, (_, label: string) => as(label))
  return scan.skipCode ? outsideCode(text, swap) : swap(text)
}

/** A quote's words as they are compared: one space between runs, no ends. */
export function normaliseQuote(quote: string): string {
  return quote.replace(/\s+/g, ' ').trim()
}

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const encoder = new TextEncoder()
const bytes = (text: string) => encoder.encode(text).length

function lineOf(text: string, at: number): number {
  let line = 1
  for (let i = text.indexOf('\n'); i !== -1 && i < at; i = text.indexOf('\n', i + 1)) line++
  return line
}

/** Where `quote` is in `file`, and how many times. The range is the first. */
export function findQuote(file: string, quote: string): { count: number; at: CitedRange | null } {
  const words = normaliseQuote(quote).split(' ').filter(Boolean)
  if (!words.length) return { count: 0, at: null }
  const pattern = new RegExp(words.map(escape).join('\\s+'), 'g')
  let count = 0
  let at: CitedRange | null = null
  for (const match of file.matchAll(pattern)) {
    count++
    if (at) continue
    const start = match.index
    const end = start + match[0].length
    at = { from: bytes(file.slice(0, start)), to: bytes(file.slice(0, end)), line: lineOf(file, start), endLine: lineOf(file, end - 1) }
  }
  return { count, at }
}

/** A source, looked for in its file's text (null: the file could not be read). */
export function resolveSource(source: CitedSource, file: string | null): CitationView {
  if (file === null) return { ...source, status: 'unreadable', at: null, count: 0 }
  const { count, at } = findQuote(file, source.quote)
  return { ...source, status: count === 0 ? 'adrift' : count === 1 ? 'holds' : 'ambiguous', at, count }
}

/** "lines 31–33" or "line 31". */
export function linesOf(at: Pick<CitedRange, 'line' | 'endLine'>): string {
  return at.line === at.endLine ? `line ${at.line}` : `lines ${at.line}–${at.endLine}`
}
