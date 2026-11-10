import { hunksOf, partOf, type Hunk } from './diff.js'

/**
 * A change somebody has PROPOSED to a text a module keeps — a markdown file, a
 * plain-text file, one document among several — which is a different thing from
 * a change that has been made (2.71.0).
 *
 * Pure, and shared by a module's server (which keeps and applies them), its
 * page (which draws and answers them) and its MCP door (where agents file them).
 * The file store is `kehikot-module-protocol/proposals/store`, the tools are in
 * `./door.ts`, the React parts are `kehikot-module-protocol/client/proposals`.
 * Design notes: docs/proposals.md.
 *
 * ## The model
 *
 * A proposal is about ONE text, named by `file` (whatever the module calls it:
 * a path, a deck slug, a part id). It quotes the base text it is about —
 * `find`, the whole text for `scope: 'file'` or a stretch that occurs exactly
 * once for `scope: 'range'` — and says what should stand there instead,
 * `replace`. It carries the hash of the whole base text as it was measured,
 * so that the text changing under it is detected rather than guessed around:
 * `measure` rebases a proposal whose quoted text is still there exactly once,
 * and marks the rest `stale` with the reason, and `apply` refuses a hash that
 * does not match. Nothing here ever writes a file; the module does, with the
 * text `apply` hands back.
 *
 * ## What happens to it
 *
 * `pending` → `accepted` (as proposed, edited by the person, or in part, by
 * hunk), `declined` (with an optional reason the agent is told), `withdrawn`
 * (by its filer, with the token it was handed) — or `stale`, which is pending
 * in a text that moved under it: it is shown, Accept is held back, Decline and
 * withdraw still work, and a `measure` that finds its words again returns it
 * to `pending`.
 */

export const PROPOSAL_STATUSES = ['pending', 'stale', 'accepted', 'declined', 'withdrawn'] as const
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number]

/** Why a pending proposal is held: its quoted text was partly rewritten, is now there more than once, or is gone. */
export const STALE_REASONS = ['changed', 'ambiguous', 'gone'] as const
export type StaleReason = (typeof STALE_REASONS)[number]

/** How an accepted proposal was taken: as proposed, with the person's edits, or only some of its hunks. */
export const ACCEPT_WAYS = ['as-proposed', 'edited', 'partial'] as const
export type AcceptWay = (typeof ACCEPT_WAYS)[number]

/** Who filed a proposal: an agent (a session, named or not), a module of its own accord, or a person. */
export interface ProposalAuthor {
  kind: 'agent' | 'module' | 'person'
  /** A name for them: the agent name given, a module id, a person's name. Text, bounded, never trusted for anything. */
  name: string
  /** The agent session it came from, when known: where a decision can be sent back to. */
  session?: string
}

export interface Proposal {
  /** The module's name for it, minted when filed. Referred to twice: to draw it, to answer it. */
  id: string
  /** Which text it is about, as the module names its texts. */
  file: string
  /** The whole text (`file`) or a stretch of it that occurs exactly once (`range`). */
  scope: 'file' | 'range'
  /** The base text it is about: the whole text, or the quoted stretch. What leaves. */
  find: string
  /** What goes there. Empty is a deletion, which is an ordinary proposal. */
  replace: string
  /** `hashText` of the whole base text as it was last measured. */
  baseHash: string
  /** One sentence from whoever proposed it, shown beside the change. */
  why: string
  by: ProposalAuthor
  createdAt: number
  status: ProposalStatus
  /** When the filer last revised it, and how many times. Absent: never. */
  revisedAt?: number
  revisions?: number
  /** With `status: 'stale'`: why, and the sentence for it. */
  stale?: { reason: StaleReason; said: string }
  /** With a settled status: who answered it (the person's name, or `'person'`) and when. */
  decidedBy?: string
  decidedAt?: number
  /** With `status: 'declined'`: what the person said, when they said anything. */
  declinedReason?: string
  /** With `status: 'accepted'`: how it was taken, and the text that was written where `find` stood (when not `replace`). */
  acceptedAs?: AcceptWay
  final?: string
  /**
   * The hash of the token the filer was handed, by which a later withdraw or revision proves it
   * is the same filer. Server-side only: `shown` strips it from everything a page or an agent reads.
   */
  tokenHash?: string
}

/** A proposal as a page or an agent sees it: the same, without the filer's secret. */
export type ShownProposal = Omit<Proposal, 'tokenHash'>

/* ------------------------------------------------------------------------ *
 * Bounds
 * ------------------------------------------------------------------------ */

/** The most text one proposal carries on either side. Longer is edited directly, not proposed. */
export const PROPOSAL_MOST = { text: 200_000, why: 400, name: 60, reason: 400, file: 512, id: 80, token: 200, settled: 60 } as const

/* ------------------------------------------------------------------------ *
 * Hashing and ids, the same in a page and in a server
 * ------------------------------------------------------------------------ */

/** A 53-bit string hash (cyrb53), in hex: names things, secures nothing, and runs in a page as well as in a server. */
export function fingerprint(text: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed
  let h2 = 0x41c6ce57 ^ seed
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ code, 2654435761)
    h2 = Math.imul(h2 ^ code, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0')
}

/**
 * The hash a proposal carries of its base text: two independent fingerprints, so that a text
 * changing under a proposal is seen (what it is for) without a server-only hash function. It
 * detects change; it is not a proof of content and nothing here treats it as one.
 */
export function hashText(text: string): string {
  return `${fingerprint(text, 0)}${fingerprint(text, 0x5bd1e995)}`
}

/** Random bytes, as a browser and a server both have them. */
function randomHex(bytes: number): string {
  const out = new Uint8Array(bytes)
  crypto.getRandomValues(out)
  return Array.from(out, (one) => one.toString(16).padStart(2, '0')).join('')
}

/** A proposal's id: `p-` and twelve hex characters, minted when it is filed. */
export function mintProposalId(): string {
  return `p-${randomHex(6)}`
}

/** A secret the filer holds, and the hash that is all a store keeps of it. The token is shown once, in the filing answer. */
export function mintToken(): { token: string; hash: string } {
  const token = randomHex(18)
  return { token, hash: hashToken(token) }
}

export function hashToken(token: string): string {
  return hashText(`token\0${token}`)
}

/** Whether a token is the one a proposal was filed under. A proposal without a filer's hash is nobody's to withdraw. */
export function tokenFits(proposal: Pick<Proposal, 'tokenHash'>, token: string): boolean {
  if (!proposal.tokenHash || typeof token !== 'string' || !token) return false
  return hashToken(token) === proposal.tokenHash
}

/** The same proposal without the filer's secret. */
export function shown<P extends Pick<Proposal, 'tokenHash'>>(proposal: P): Omit<P, 'tokenHash'> {
  const { tokenHash: _hidden, ...rest } = proposal
  return rest
}

/* ------------------------------------------------------------------------ *
 * Finding the quoted text
 * ------------------------------------------------------------------------ */

/** Where `find` stands in `text`, when it stands there exactly once; otherwise why not. */
export function locate(text: string, find: string): { ok: true; from: number; to: number } | { ok: false; reason: 'ambiguous' | 'gone' } {
  if (!find) return { ok: false, reason: 'gone' }
  const first = text.indexOf(find)
  if (first === -1) return { ok: false, reason: 'gone' }
  if (text.indexOf(find, first + 1) !== -1) return { ok: false, reason: 'ambiguous' }
  return { ok: true, from: first, to: first + find.length }
}

/** The shortest stretch of a quote worth pointing at: shorter than this matches by accident. */
const MIN_ANCHOR = 12

/** Whether a word's worth of the start or the end of `find` is still in `text`: partly rewritten, not gone. */
function partlyThere(text: string, find: string): boolean {
  const least = Math.max(MIN_ANCHOR, Math.ceil(find.length / 5))
  if (find.length < least) return false
  const head = find.slice(0, least)
  const tail = find.slice(-least)
  return text.includes(head) || text.includes(tail)
}

/* ------------------------------------------------------------------------ *
 * Filing, measuring, applying
 * ------------------------------------------------------------------------ */

export interface Filing {
  file: string
  /** The whole text, for a proposal about all of it. */
  scope: 'file' | 'range'
  find: string
  replace: string
  why: string
  by: ProposalAuthor
  tokenHash?: string
  now?: number
  id?: string
}

/**
 * A proposal over `text` as it is now, or why it cannot be filed, in a sentence
 * for the filer. The quoted text has to be in the text exactly once (`range`), or
 * be the text (`file`); a proposal that would change nothing is refused too.
 */
export function file(text: string, filing: Filing): { ok: true; proposal: Proposal } | { ok: false; why: string } {
  const { find, replace } = filing
  if (find.length > PROPOSAL_MOST.text || replace.length > PROPOSAL_MOST.text) {
    return { ok: false, why: `That text is longer than ${PROPOSAL_MOST.text.toLocaleString('en')} characters, which is as much as one proposal carries. Propose it in parts.` }
  }
  if (find.includes('\0') || replace.includes('\0')) return { ok: false, why: 'That text holds a NUL byte, which a text file does not.' }
  if (!filing.why.trim()) return { ok: false, why: 'A proposal has to say why, in a sentence. The person sees it beside the change.' }
  if (filing.scope === 'file') {
    if (find !== text) return { ok: false, why: 'A proposal about the whole text has to quote the text as it is now; read it again and propose over that.' }
  } else {
    const at = locate(text, find)
    if (!at.ok) {
      return {
        ok: false,
        why:
          at.reason === 'gone'
            ? 'The text to replace is not in the file as it is now. Quote it exactly as a read shows it, line breaks included.'
            : 'The text to replace appears more than once. Quote more of it, so it is in the file exactly once.',
      }
    }
  }
  if (find === replace) return { ok: false, why: 'That changes nothing: the replacement is the text that is there.' }
  const now = filing.now ?? Date.now()
  const proposal: Proposal = {
    id: filing.id ?? mintProposalId(),
    file: filing.file,
    scope: filing.scope,
    find,
    replace,
    baseHash: hashText(text),
    why: filing.why.trim().slice(0, PROPOSAL_MOST.why),
    by: filing.by,
    createdAt: now,
    status: 'pending',
    ...(filing.tokenHash ? { tokenHash: filing.tokenHash } : {}),
  }
  return { ok: true, proposal }
}

/** The sentence a stale proposal carries. */
export function staleSaid(reason: StaleReason, file: string): string {
  return reason === 'changed'
    ? `${file} changed and part of the text this was about was rewritten.`
    : reason === 'ambiguous'
      ? `${file} changed and the text this was about is now in it more than once.`
      : `${file} changed and the text this was about is no longer there.`
}

/**
 * A pending (or stale) proposal measured against the text as it is NOW. The same
 * proposal when the hash still matches; rebased onto the new hash when its
 * quoted text is still there exactly once; otherwise `stale`, with why. A stale
 * proposal whose words are back is pending again. A settled proposal is returned
 * as it is. `text` null — the file is gone or unreadable — is `stale: gone`.
 */
export function measure(proposal: Proposal, text: string | null): Proposal {
  if (proposal.status !== 'pending' && proposal.status !== 'stale') return proposal
  const held = (reason: StaleReason): Proposal => ({
    ...proposal,
    status: 'stale',
    stale: { reason, said: staleSaid(reason, proposal.file) },
    ...(text === null ? {} : { baseHash: hashText(text) }),
  })
  if (text === null) return held('gone')
  const hash = hashText(text)
  if (hash === proposal.baseHash && proposal.status === 'pending') return proposal
  const fresh = (): Proposal => {
    const { stale: _was, ...rest } = proposal
    return { ...rest, status: 'pending', baseHash: hash }
  }
  if (proposal.scope === 'file') return text === proposal.find ? fresh() : held('changed')
  const at = locate(text, proposal.find)
  if (at.ok) return fresh()
  if (at.reason === 'ambiguous') return held('ambiguous')
  return held(partlyThere(text, proposal.find) ? 'changed' : 'gone')
}

/** Every proposal measured, in order. Settled ones pass through. */
export function measureAll(proposals: readonly Proposal[], read: (file: string) => string | null): Proposal[] {
  const texts = new Map<string, string | null>()
  return proposals.map((one) => {
    if (one.status !== 'pending' && one.status !== 'stale') return one
    if (!texts.has(one.file)) texts.set(one.file, read(one.file))
    return measure(one, texts.get(one.file) ?? null)
  })
}

/**
 * The text with the proposal applied: `final` (the person's wording, or a
 * partial take) where given, else `replace`, in place of `find`. Refused, with
 * the reason, when the text is not the one the proposal was measured on, or the
 * quoted text is not there exactly once. Pure: the caller writes it.
 */
export function apply(
  text: string,
  proposal: Proposal,
  final?: string,
): { ok: true; text: string; from: number; to: number; written: string } | { ok: false; why: string; stale: boolean } {
  if (proposal.status !== 'pending') {
    return {
      ok: false,
      stale: proposal.status === 'stale',
      why: proposal.status === 'stale' ? `${proposal.stale?.said ?? 'The text changed under it.'} Applying it would be a guess.` : `That proposal was already ${proposal.status}.`,
    }
  }
  if (hashText(text) !== proposal.baseHash) {
    return { ok: false, stale: true, why: 'The text changed since this proposal was measured; read it again and measure the proposal before applying it.' }
  }
  const written = final ?? proposal.replace
  if (written.length > PROPOSAL_MOST.text || written.includes('\0')) return { ok: false, stale: false, why: 'That text cannot be written: too long, or it holds a NUL byte.' }
  if (proposal.scope === 'file') return { ok: true, text: written, from: 0, to: text.length, written }
  const at = locate(text, proposal.find)
  if (!at.ok) return { ok: false, stale: true, why: staleSaid(at.reason, proposal.file) }
  return { ok: true, text: text.slice(0, at.from) + written + text.slice(at.to), from: at.from, to: at.to, written }
}

/* ------------------------------------------------------------------------ *
 * Deciding
 * ------------------------------------------------------------------------ */

export type Decision =
  | { kind: 'accept'; by?: string; now?: number; final?: string; hunks?: readonly number[] }
  | { kind: 'decline'; by?: string; now?: number; reason?: string }
  | { kind: 'withdraw'; now?: number }

/**
 * The proposal with a decision on it. Accept takes `final` (the person's own
 * wording) or `hunks` (the indexes of the hunks to take, a partial accept) or
 * neither (as proposed). Decline keeps the reason, trimmed and bounded. A
 * proposal that is not pending is refused, except that a stale one can still be
 * declined or withdrawn. Pure: the module applies the text (`apply`, with the
 * returned `final`) and writes it.
 */
export function decide(proposal: Proposal, decision: Decision): { ok: true; proposal: Proposal } | { ok: false; why: string } {
  const open = proposal.status === 'pending' || (proposal.status === 'stale' && decision.kind !== 'accept')
  if (!open) {
    return {
      ok: false,
      why:
        proposal.status === 'stale'
          ? `${proposal.stale?.said ?? 'The text changed under it.'} It can be declined, or withdrawn by its filer, but not accepted.`
          : `That proposal was already ${proposal.status}.`,
    }
  }
  const now = decision.now ?? Date.now()
  const by = ('by' in decision && decision.by?.trim() ? decision.by.trim() : 'person').slice(0, PROPOSAL_MOST.settled)
  const { stale: _held, ...rest } = proposal
  if (decision.kind === 'withdraw') return { ok: true, proposal: { ...rest, status: 'withdrawn', decidedBy: 'filer', decidedAt: now } }
  if (decision.kind === 'decline') {
    const reason = decision.reason?.replace(/\s+/g, ' ').trim().slice(0, PROPOSAL_MOST.reason) ?? ''
    return { ok: true, proposal: { ...rest, status: 'declined', decidedBy: by, decidedAt: now, ...(reason ? { declinedReason: reason } : {}) } }
  }
  let final: string | undefined
  let acceptedAs: AcceptWay = 'as-proposed'
  if (decision.hunks) {
    final = partOf(proposal.find, proposal.replace, decision.hunks)
    acceptedAs = final === proposal.replace ? 'as-proposed' : 'partial'
  }
  if (typeof decision.final === 'string' && decision.final !== proposal.replace) {
    if (decision.final.length > PROPOSAL_MOST.text || decision.final.includes('\0')) return { ok: false, why: 'That text cannot be written: too long, or it holds a NUL byte.' }
    final = decision.final
    acceptedAs = 'edited'
  }
  if (final === proposal.find) return { ok: false, why: 'That takes none of the change: decline it instead.' }
  return {
    ok: true,
    proposal: { ...rest, status: 'accepted', decidedBy: by, decidedAt: now, acceptedAs, ...(final !== undefined && final !== proposal.replace ? { final } : {}) },
  }
}

/** The hunks a proposal is drawn as: what leaves in red, what arrives in green. */
export function proposalHunks(proposal: Pick<Proposal, 'find' | 'replace'>): Hunk[] {
  return hunksOf(proposal.find, proposal.replace)
}

/* ------------------------------------------------------------------------ *
 * The book: every proposal a module keeps for one project
 * ------------------------------------------------------------------------ */

/** The one file's shape: a version, and the proposals, oldest first. */
export interface ProposalBook {
  version: 1
  proposals: Proposal[]
}

/** How many settled proposals a book keeps, newest kept: the agent's "what became of mine". */
export const BOOK_KEEPS_SETTLED = 60

export const emptyBook = (): ProposalBook => ({ version: 1, proposals: [] })

/** A book as read from a file: anything that is not a list of proposals is an empty book. */
export function bookOf(value: unknown): ProposalBook {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { proposals?: unknown }).proposals)) return emptyBook()
  const list = ((value as { proposals: unknown[] }).proposals).filter(isProposal)
  return { version: 1, proposals: list }
}

function isProposal(value: unknown): value is Proposal {
  if (!value || typeof value !== 'object') return false
  const p = value as Partial<Proposal>
  return (
    typeof p.id === 'string'
    && typeof p.file === 'string'
    && (p.scope === 'file' || p.scope === 'range')
    && typeof p.find === 'string'
    && typeof p.replace === 'string'
    && typeof p.baseHash === 'string'
    && typeof p.why === 'string'
    && !!p.by
    && typeof p.by === 'object'
    && typeof p.by.name === 'string'
    && typeof p.createdAt === 'number'
    && (PROPOSAL_STATUSES as readonly string[]).includes(p.status as string)
  )
}

/** The book with one proposal put in (by id: replaced where it is, else appended), settled ones beyond the bound forgotten. */
export function withProposal(book: ProposalBook, proposal: Proposal): ProposalBook {
  const had = book.proposals.some((one) => one.id === proposal.id)
  const list = had ? book.proposals.map((one) => (one.id === proposal.id ? proposal : one)) : [...book.proposals, proposal]
  return { version: 1, proposals: trimSettled(list) }
}

function trimSettled(list: readonly Proposal[]): Proposal[] {
  const settled = list.filter((one) => one.status !== 'pending' && one.status !== 'stale')
  if (settled.length <= BOOK_KEEPS_SETTLED) return [...list]
  const drop = new Set(settled.slice(0, settled.length - BOOK_KEEPS_SETTLED).map((one) => one.id))
  return list.filter((one) => !drop.has(one.id))
}

/** The open proposals (pending and stale), oldest first; of one file when named. */
export function openOf(book: ProposalBook, file?: string): Proposal[] {
  return book.proposals.filter((one) => (one.status === 'pending' || one.status === 'stale') && (file === undefined || one.file === file))
}

/** The settled proposals, newest first. */
export function settledOf(book: ProposalBook, file?: string): Proposal[] {
  return book.proposals.filter((one) => one.status !== 'pending' && one.status !== 'stale' && (file === undefined || one.file === file)).reverse()
}

export function proposalById(book: ProposalBook, id: string): Proposal | null {
  return book.proposals.find((one) => one.id === id) ?? null
}

/* ------------------------------------------------------------------------ *
 * The sentences
 * ------------------------------------------------------------------------ */

/** What became of a settled proposal, in a few words: `accepted`, `accepted with edits`, `declined: <reason>`. */
export function outcomeSaid(proposal: Pick<Proposal, 'status' | 'acceptedAs' | 'declinedReason' | 'stale'>): string {
  switch (proposal.status) {
    case 'accepted':
      return proposal.acceptedAs === 'edited' ? 'accepted with the person’s edits' : proposal.acceptedAs === 'partial' ? 'accepted in part' : 'accepted'
    case 'declined':
      return proposal.declinedReason ? `declined: ${proposal.declinedReason}` : 'declined, no reason given'
    case 'withdrawn':
      return 'withdrawn'
    case 'stale':
      return `out of date (${proposal.stale?.reason ?? 'changed'})`
    default:
      return 'pending'
  }
}

/**
 * The line to tell the filer when a proposal is answered — what a module pushes
 * to the agent's session where it has a way to (its messages, its activity):
 * `Declined: <reason>` is the one agents most need to read before proposing again.
 */
export function decisionNews(proposal: Proposal): string {
  const where = `${proposal.file} (${proposal.id})`
  if (proposal.status === 'declined') return proposal.declinedReason ? `Declined: ${proposal.declinedReason} — your proposal on ${where}.` : `Declined without a reason — your proposal on ${where}.`
  if (proposal.status === 'accepted') return `Accepted${proposal.acceptedAs === 'edited' ? ' with edits' : proposal.acceptedAs === 'partial' ? ' in part' : ''} — your proposal on ${where}.`
  if (proposal.status === 'withdrawn') return `Withdrawn — your proposal on ${where}.`
  return `${outcomeSaid(proposal)} — your proposal on ${where}.`
}

/** One line of `list_proposals`: id, file, the change as old -> new (clipped), the reason, and the state. */
export function proposalLine(proposal: ShownProposal, most = 120): string {
  const clip = (text: string) => {
    const one = text.replace(/\s+/g, ' ').trim()
    return one.length <= most ? one : `${one.slice(0, most - 1)}…`
  }
  const change = proposal.scope === 'file' ? '(the whole text)' : `${clip(proposal.find) || '(nothing)'} -> ${clip(proposal.replace) || '(nothing)'}`
  const extras = [
    `state: ${outcomeSaid(proposal)}`,
    `by: ${proposal.by.name}`,
    proposal.revisions ? `revised ${proposal.revisions}x` : '',
    proposal.status === 'accepted' && proposal.final !== undefined ? `written: ${clip(proposal.final) || '(nothing)'}` : '',
  ].filter(Boolean)
  return `${proposal.id}\t${proposal.file}\t${change}\t${proposal.why}\t(${extras.join(', ')})`
}

/** How many open proposals there are, as a footer or a list head says it. */
export function countSaid(open: number): string {
  return open === 0 ? 'No proposed changes' : open === 1 ? '1 proposed change' : `${open} proposed changes`
}
