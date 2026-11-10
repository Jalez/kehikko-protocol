/**
 * Where two versions of a text differ, as the places a person reviews (2.71.0).
 *
 * Pure: no filesystem, no DOM, so it runs in a module's server and in its page
 * alike, and "what changed" is a test and not a paragraph. Offsets are UTF-16
 * units into the strings given.
 *
 * ## Blocks are lines, hunks are blocks tightened to words
 *
 * A paragraph of prose is often one line of a thousand characters, so a line is
 * the right unit to find WHERE two texts differ (cheap, and an anchor of equal
 * lines is a strong one) and the wrong unit to SHOW: a block is tightened by
 * the words both sides share at its front and its back, so one changed word in
 * a long line is one changed word on screen.
 *
 * This is the diff Paper reviews its `.tex` with, lifted here so every module
 * that shows a proposed change to a text file draws the same hunks.
 */

export interface Block {
  oldFrom: number
  oldTo: number
  newFrom: number
  newTo: number
}

/** A block with its texts: what leaves (`oldText`) and what arrives (`newText`). */
export interface Hunk extends Block {
  oldText: string
  newText: string
}

/** Above this many line pairs the table costs more than the nuance is worth: one block, between the shared front and back. */
const MAX_CELLS = 4_000_000

/**
 * Prose, in the units a reader compares it in: words, runs of whitespace, and
 * single characters for everything else. Punctuation is one token each rather
 * than glued to the word before it, so a comma that moved is a comma that
 * moved; whitespace is its own token so the join between two words survives.
 */
export function tokenize(text: string): string[] {
  const out: string[] = []
  let i = 0
  while (i < text.length) {
    const c = text[i]!
    if (/\s/.test(c)) {
      let j = i
      while (j < text.length && /\s/.test(text[j]!)) j++
      out.push(text.slice(i, j))
      i = j
      continue
    }
    if (/\w/.test(c)) {
      let j = i
      while (j < text.length && /\w/.test(text[j]!)) j++
      out.push(text.slice(i, j))
      i = j
      continue
    }
    out.push(c)
    i++
  }
  return out
}

function lines(text: string): { starts: number[]; keys: string[] } {
  const starts: number[] = []
  const keys: string[] = []
  let at = 0
  while (at < text.length) {
    const next = text.indexOf('\n', at)
    const end = next === -1 ? text.length : next + 1
    starts.push(at)
    keys.push(text.slice(at, end))
    at = end
  }
  starts.push(text.length)
  return { starts, keys }
}

/** The line-aligned stretches that differ, in order, as offsets into each text. */
export function diffBlocks(oldText: string, newText: string): Block[] {
  if (oldText === newText) return []
  const a = lines(oldText)
  const b = lines(newText)
  const n = a.keys.length
  const m = b.keys.length
  let front = 0
  while (front < n && front < m && a.keys[front] === b.keys[front]) front++
  let back = 0
  while (back < n - front && back < m - front && a.keys[n - 1 - back] === b.keys[m - 1 - back]) back++
  const an = n - front - back
  const bn = m - front - back
  const out: Block[] = []
  const push = (ai: number, aj: number, bi: number, bj: number) => {
    out.push({ oldFrom: a.starts[ai]!, oldTo: a.starts[aj]!, newFrom: b.starts[bi]!, newTo: b.starts[bj]! })
  }
  if (an === 0 || bn === 0 || an * bn > MAX_CELLS) {
    push(front, front + an, front, front + bn)
    return out
  }
  /* LCS over the lines between the shared front and back. */
  const cols = bn + 1
  const table = new Uint32Array((an + 1) * cols)
  for (let i = an - 1; i >= 0; i--) {
    for (let j = bn - 1; j >= 0; j--) {
      table[i * cols + j] =
        a.keys[front + i] === b.keys[front + j]
          ? table[(i + 1) * cols + j + 1]! + 1
          : Math.max(table[(i + 1) * cols + j]!, table[i * cols + j + 1]!)
    }
  }
  let i = 0
  let j = 0
  let openA = -1
  let openB = -1
  const close = () => {
    if (openA === -1) return
    push(front + openA, front + i, front + openB, front + j)
    openA = -1
    openB = -1
  }
  while (i < an || j < bn) {
    if (i < an && j < bn && a.keys[front + i] === b.keys[front + j]) {
      close()
      i++
      j++
    } else {
      if (openA === -1) {
        openA = i
        openB = j
      }
      if (j >= bn || (i < an && table[(i + 1) * cols + j]! >= table[i * cols + j + 1]!)) i++
      else j++
    }
  }
  close()
  return out
}

/** A block with the words both sides share at its front and back set aside. */
function tighten(oldText: string, newText: string, block: Block): Hunk {
  const a = oldText.slice(block.oldFrom, block.oldTo)
  const b = newText.slice(block.newFrom, block.newTo)
  const ta = tokenize(a)
  const tb = tokenize(b)
  let front = 0
  while (front < ta.length && front < tb.length && ta[front] === tb[front]) front++
  let back = 0
  while (back < ta.length - front && back < tb.length - front && ta[ta.length - 1 - back] === tb[tb.length - 1 - back]) back++
  const width = (tokens: string[], from: number, to: number) => tokens.slice(from, to).reduce((sum, one) => sum + one.length, 0)
  const lead = width(ta, 0, front)
  const tail = width(ta, ta.length - back, ta.length)
  const oldFrom = block.oldFrom + lead
  const oldTo = block.oldTo - tail
  const newFrom = block.newFrom + width(tb, 0, front)
  const newTo = block.newTo - width(tb, tb.length - back, tb.length)
  return { oldFrom, oldTo, newFrom, newTo, oldText: oldText.slice(oldFrom, oldTo), newText: newText.slice(newFrom, newTo) }
}

/** What differs between a base text and a proposed one, as hunks a person can read, in order. */
export function hunksOf(base: string, proposed: string): Hunk[] {
  return diffBlocks(base, proposed)
    .map((block) => tighten(base, proposed, block))
    .filter((one) => one.oldText !== one.newText)
}

/** `base` with the given hunks taken in: each `old` range replaced by its `new` text. The others stay as they were. */
export function takeHunks(base: string, hunks: readonly Hunk[]): string {
  let out = base
  for (const one of [...hunks].sort((x, y) => y.oldFrom - x.oldFrom)) out = out.slice(0, one.oldFrom) + one.newText + out.slice(one.oldTo)
  return out
}

/**
 * What a text looks like with only SOME of a proposal's hunks accepted: the
 * hunks of `base` → `proposed`, those at the given indexes taken in, the rest
 * left as the base has them. The partial accept of a proposal.
 */
export function partOf(base: string, proposed: string, chosen: readonly number[]): string {
  const all = hunksOf(base, proposed)
  const picked = new Set(chosen)
  return takeHunks(base, all.filter((_, i) => picked.has(i)))
}
