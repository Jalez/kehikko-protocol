import {
  apply,
  decide,
  file as fileOne,
  measureAll,
  mintToken,
  openOf,
  proposalById,
  settledOf,
  shown,
  tokenFits,
  withProposal,
  type Decision,
  type Filing,
  type Proposal,
  type ProposalBook,
  type ShownProposal,
} from './core.js'

/**
 * A module's proposals, kept and answered: the one set of operations its MCP door
 * (`./door.ts`), its page's routes and its tests all go through (2.71.0). Pure
 * over what the module hands it — a keeper for the book, a reader and a writer
 * for its texts — so a test runs it on a map and the module runs it on files
 * (`kehikot-module-protocol/proposals/store`).
 */

/** Where the book is kept: per project. The file store is `fileKeeper` in `/proposals/store`. */
export interface ProposalKeeper {
  read(project: string): ProposalBook
  write(project: string, book: ProposalBook): void
}

export interface ProposalSite {
  keeper: ProposalKeeper
  /** The text named `file` in this project as it is NOW, or null when there is none. */
  text(project: string, file: string): string | null
  /** Write a text: what Accept does. Without it a proposal can be filed and declined but never accepted. */
  write?(project: string, file: string, text: string, proposal: Proposal): { ok: true } | { ok: false; why: string }
  /**
   * A proposal was answered or withdrawn: tell the filer where there is a way to, and the page. 2.75.0:
   * hand it to a `proposalDigester` (`./digest.ts`) to tell the filer once, when the person has answered
   * all of its proposals at that text (`digestNews`); `decisionNews` is the line for one decision.
   */
  onSettled?(project: string, proposal: Proposal): void
  /** The book changed: a page that subscribes is told. `file` names the text concerned where one call concerned one. */
  onChanged?(project: string, file?: string): void
  now?(): number
}

/** Every open proposal, measured against the texts as they are now (and the book moved on when that changed anything). */
export function openProposals(site: ProposalSite, project: string, file?: string): Proposal[] {
  const book = measured(site, project)
  return openOf(book, file)
}

/** What became of the settled ones, newest first. */
export function settledProposals(site: ProposalSite, project: string, file?: string): Proposal[] {
  return settledOf(site.keeper.read(project), file)
}

/** One proposal by id, measured, or null. */
export function proposalOf(site: ProposalSite, project: string, id: string): Proposal | null {
  return proposalById(measured(site, project), id)
}

/** The book with every open proposal measured; written back when any moved. */
export function measured(site: ProposalSite, project: string): ProposalBook {
  const book = site.keeper.read(project)
  const next = measureAll(book.proposals, (file) => site.text(project, file))
  const moved = next.some((one, i) => one !== book.proposals[i])
  if (!moved) return book
  const kept: ProposalBook = { version: 1, proposals: next }
  site.keeper.write(project, kept)
  site.onChanged?.(project)
  return kept
}

/**
 * File a proposal over a text as it is now. Hands back the proposal as the
 * filer sees it and, when the filing is an agent's, the token that lets it
 * withdraw the proposal later. The same filer proposing again over the same
 * quoted text of the same file REVISES its pending proposal rather than filing
 * a second one.
 */
export function fileProposal(
  site: ProposalSite,
  project: string,
  filing: Omit<Filing, 'tokenHash' | 'id' | 'now'>,
): { ok: true; proposal: ShownProposal; token: string | null; revised: boolean } | { ok: false; why: string } {
  const text = site.text(project, filing.file)
  if (text === null) return { ok: false, why: `There is no text called ${JSON.stringify(filing.file)} in this project to propose a change to.` }
  const now = site.now?.() ?? Date.now()
  const book = measured(site, project)
  /* The same filer over the same words: its pending proposal is revised, under the token it already holds. */
  const own = openOf(book, filing.file).find(
    (one) => one.by.kind === filing.by.kind && one.by.name === filing.by.name && one.scope === filing.scope && one.find === filing.find,
  )
  const minted = filing.by.kind === 'agent' && !own?.tokenHash ? mintToken() : null
  const tokenHash = own?.tokenHash ?? minted?.hash
  const made = fileOne(text, { ...filing, now: own?.createdAt ?? now, id: own?.id, ...(tokenHash ? { tokenHash } : {}) })
  if (!made.ok) return made
  const proposal: Proposal = own ? { ...made.proposal, revisedAt: now, revisions: (own.revisions ?? 0) + 1 } : made.proposal
  site.keeper.write(project, withProposal(book, proposal))
  site.onChanged?.(project, filing.file)
  return { ok: true, proposal: shown(proposal), token: minted?.token ?? null, revised: own !== undefined }
}

/**
 * The person's answer. Accept applies the text through `site.write` (refused in
 * words when the text moved, and nothing is written); decline keeps the reason.
 * The settled proposal is told to `onSettled`.
 */
export function decideProposal(
  site: ProposalSite,
  project: string,
  id: string,
  decision: Exclude<Decision, { kind: 'withdraw' }>,
): { ok: true; proposal: ShownProposal; stale: false } | { ok: false; why: string; stale: boolean } {
  const book = measured(site, project)
  const one = proposalById(book, id)
  if (!one) return { ok: false, why: 'There is no proposal by that id here.', stale: false }
  const now = site.now?.() ?? Date.now()
  const settled = decide(one, { ...decision, now: decision.now ?? now })
  if (!settled.ok) return { ok: false, why: settled.why, stale: one.status === 'stale' }
  if (decision.kind === 'accept') {
    if (!site.write) return { ok: false, why: 'This module does not apply proposals; nothing was written.', stale: false }
    const text = site.text(project, one.file)
    const applied = apply(text ?? '', text === null ? { ...one, status: 'stale', stale: { reason: 'gone', said: `${one.file} is no longer there.` } } : one, settled.proposal.final)
    if (!applied.ok) return { ok: false, why: applied.why, stale: applied.stale }
    const written = site.write(project, one.file, applied.text, settled.proposal)
    if (!written.ok) return { ok: false, why: written.why, stale: false }
  }
  site.keeper.write(project, withProposal(site.keeper.read(project), settled.proposal))
  site.onSettled?.(project, settled.proposal)
  site.onChanged?.(project, one.file)
  return { ok: true, proposal: shown(settled.proposal), stale: false }
}

/** The filer takes it back, proving itself with the token it was handed. */
export function withdrawProposal(site: ProposalSite, project: string, id: string, token: string): { ok: true; proposal: ShownProposal } | { ok: false; why: string } {
  const book = measured(site, project)
  const one = proposalById(book, id)
  if (!one) return { ok: false, why: 'There is no proposal by that id in this project. list_proposals shows what there is.' }
  if (one.status !== 'pending' && one.status !== 'stale') return { ok: false, why: `That proposal was already ${one.status}, so it can no longer be withdrawn.` }
  if (!tokenFits(one, token)) return { ok: false, why: 'That proposal is not yours to withdraw: the token does not match the one propose_change returned for it.' }
  const settled = decide(one, { kind: 'withdraw', now: site.now?.() ?? Date.now() })
  if (!settled.ok) return settled
  site.keeper.write(project, withProposal(book, settled.proposal))
  site.onSettled?.(project, settled.proposal)
  site.onChanged?.(project, one.file)
  return { ok: true, proposal: shown(settled.proposal) }
}

/** A keeper over a map, for tests and for a module that keeps its book elsewhere. */
export function memoryKeeper(): ProposalKeeper & { books: Map<string, ProposalBook> } {
  const books = new Map<string, ProposalBook>()
  return {
    books,
    read: (project) => books.get(project) ?? { version: 1, proposals: [] },
    write: (project, book) => void books.set(project, book),
  }
}
