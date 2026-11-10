import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  answerProposalTool,
  apply,
  bookOf,
  countSaid,
  decide,
  decideProposal,
  decisionNews,
  file,
  fileProposal,
  hashText,
  hunksOf,
  locate,
  measure,
  memoryKeeper,
  mintToken,
  openProposals,
  outcomeSaid,
  partOf,
  proposalLine,
  proposalTools,
  settledProposals,
  shown,
  tokenFits,
  withProposal,
  withdrawProposal,
  type Proposal,
  type ProposalSite,
} from '../src/proposals/index.js'
import { bookPath, fileKeeper, textFiles } from '../src/proposals/store.js'

/**
 * Proposals (2.71.0): a change an agent proposes to a text a module keeps, which
 * a person accepts — as proposed, edited, or in part — or declines with a reason
 * the agent reads. Pure over a text: filing quotes it, measuring detects that it
 * moved, applying refuses a hash that does not match. Lifted from Paper's
 * suggestions, where every rule here was learnt.
 */

const BASE = 'The quick brown fox\njumps over the lazy dog.\nThe end.\n'
const by = { kind: 'agent' as const, name: 'tester' }

function filed(text = BASE, find = 'lazy dog', replace = 'sleeping dog'): Proposal {
  const made = file(text, { file: 'a.md', scope: 'range', find, replace, why: 'Dogs sleep.', by })
  if (!made.ok) throw new Error(made.why)
  return made.proposal
}

describe('the diff', () => {
  test('a changed word in a long line is one hunk of that word', () => {
    const hunks = hunksOf('one two three four', 'one two THREE four')
    expect(hunks).toEqual([{ oldFrom: 8, oldTo: 13, newFrom: 8, newTo: 13, oldText: 'three', newText: 'THREE' }])
  })
  test('lines that differ in two places are two hunks, in order', () => {
    const hunks = hunksOf('a\nb\nc\nd\n', 'a\nB\nc\nD\n')
    expect(hunks.map((h) => [h.oldText, h.newText])).toEqual([
      ['b', 'B'],
      ['d', 'D'],
    ])
  })
  test('identical texts have no hunks', () => {
    expect(hunksOf('same', 'same')).toEqual([])
  })
  test('a partial take keeps only the chosen hunks', () => {
    expect(partOf('a\nb\nc\nd\n', 'a\nB\nc\nD\n', [1])).toBe('a\nb\nc\nD\n')
    expect(partOf('a\nb\nc\nd\n', 'a\nB\nc\nD\n', [])).toBe('a\nb\nc\nd\n')
  })
})

describe('filing', () => {
  test('quotes text that is there exactly once, and carries the hash of the whole text', () => {
    const p = filed()
    expect(p.status).toBe('pending')
    expect(p.baseHash).toBe(hashText(BASE))
    expect(p.find).toBe('lazy dog')
    expect(p.by).toEqual(by)
    expect(typeof p.createdAt).toBe('number')
    expect(p.id).toMatch(/^p-[0-9a-f]{12}$/)
  })
  test('refuses text that is not there, or there twice, or unchanged, or without a reason', () => {
    const at = (find: string, replace = 'x', why = 'why') => file(BASE, { file: 'a.md', scope: 'range', find, replace, why, by })
    expect(at('unicorn')).toMatchObject({ ok: false, why: expect.stringContaining('not in the file') })
    expect(at('The ')).toMatchObject({ ok: false, why: expect.stringContaining('more than once') })
    expect(at('lazy dog', 'lazy dog')).toMatchObject({ ok: false, why: expect.stringContaining('changes nothing') })
    expect(at('lazy dog', 'x', '  ')).toMatchObject({ ok: false, why: expect.stringContaining('say why') })
  })
  test('a whole-text proposal has to quote the text as it is', () => {
    expect(file(BASE, { file: 'a.md', scope: 'file', find: 'old', replace: 'new', why: 'w', by })).toMatchObject({ ok: false })
    const made = file(BASE, { file: 'a.md', scope: 'file', find: BASE, replace: 'Rewritten.\n', why: 'w', by })
    expect(made.ok).toBe(true)
  })
  test('locate says where, or why not', () => {
    expect(locate(BASE, 'fox')).toEqual({ ok: true, from: 16, to: 19 })
    expect(locate(BASE, 'The')).toEqual({ ok: false, reason: 'ambiguous' })
    expect(locate(BASE, 'cat')).toEqual({ ok: false, reason: 'gone' })
    expect(locate(BASE, '')).toEqual({ ok: false, reason: 'gone' })
  })
})

describe('measuring against the text as it is now', () => {
  test('the same text is the same proposal', () => {
    const p = filed()
    expect(measure(p, BASE)).toBe(p)
  })
  test('a change elsewhere rebases it onto the new hash, still pending', () => {
    const p = filed()
    const moved = `Preface.\n${BASE}`
    const again = measure(p, moved)
    expect(again.status).toBe('pending')
    expect(again.baseHash).toBe(hashText(moved))
    expect(apply(moved, again).ok).toBe(true)
  })
  test('the quoted text rewritten in part is stale: changed', () => {
    const p = filed(BASE, 'jumps over the lazy dog.', 'leaps over the lazy dog.')
    const again = measure(p, BASE.replace('lazy dog', 'tired dog'))
    expect(again.status).toBe('stale')
    expect(again.stale?.reason).toBe('changed')
    expect(again.stale?.said).toContain('a.md changed')
  })
  test('the quoted text now there twice is stale: ambiguous; gone is gone', () => {
    const p = filed()
    expect(measure(p, `${BASE}lazy dog\n`).stale?.reason).toBe('ambiguous')
    expect(measure(p, 'Nothing of it.\n').stale?.reason).toBe('gone')
    expect(measure(p, null).stale?.reason).toBe('gone')
  })
  test('a stale proposal whose words are back is pending again', () => {
    const p = filed()
    const held = measure(p, 'Nothing.')
    expect(held.status).toBe('stale')
    const back = measure(held, BASE)
    expect(back.status).toBe('pending')
    expect(back.stale).toBeUndefined()
  })
  test('a settled proposal is left alone', () => {
    const p = { ...filed(), status: 'accepted' as const }
    expect(measure(p, 'whatever')).toBe(p)
  })
})

describe('applying', () => {
  test('writes the replacement where the quote stood, and says the range', () => {
    const p = filed()
    const done = apply(BASE, p)
    expect(done).toMatchObject({ ok: true, from: 35, to: 43, written: 'sleeping dog' })
    if (done.ok) expect(done.text).toBe(BASE.replace('lazy dog', 'sleeping dog'))
  })
  test('refuses a text that is not the one measured, as stale, and never guesses', () => {
    const p = filed()
    const done = apply(`${BASE}more`, p)
    expect(done).toMatchObject({ ok: false, stale: true })
  })
  test("takes the person's wording instead of the proposal's", () => {
    const p = filed()
    const done = apply(BASE, p, 'dozing dog')
    if (!done.ok) throw new Error(done.why)
    expect(done.text).toContain('dozing dog')
  })
  test('a whole-text proposal replaces everything', () => {
    const made = file(BASE, { file: 'a.md', scope: 'file', find: BASE, replace: 'New.\n', why: 'w', by })
    if (!made.ok) throw new Error(made.why)
    expect(apply(BASE, made.proposal)).toMatchObject({ ok: true, text: 'New.\n', from: 0, to: BASE.length })
  })
})

describe('deciding', () => {
  test('accept as proposed', () => {
    const p = filed()
    const done = decide(p, { kind: 'accept', by: 'Jaakko', now: 5 })
    expect(done).toMatchObject({ ok: true, proposal: { status: 'accepted', decidedBy: 'Jaakko', decidedAt: 5, acceptedAs: 'as-proposed' } })
    if (done.ok) expect(done.proposal.final).toBeUndefined()
  })
  test('accept edited keeps what was written', () => {
    const done = decide(filed(), { kind: 'accept', final: 'dozing dog' })
    expect(done).toMatchObject({ ok: true, proposal: { status: 'accepted', acceptedAs: 'edited', final: 'dozing dog', decidedBy: 'person' } })
  })
  test('accept in part takes the chosen hunks only', () => {
    const p = filed('a\nb\nc\nd\n', 'b\nc\nd', 'B\nc\nD')
    const done = decide(p, { kind: 'accept', hunks: [0] })
    expect(done).toMatchObject({ ok: true, proposal: { acceptedAs: 'partial', final: 'B\nc\nd' } })
    expect(decide(p, { kind: 'accept', hunks: [] })).toMatchObject({ ok: false, why: expect.stringContaining('none of the change') })
    expect(decide(p, { kind: 'accept', hunks: [0, 1] })).toMatchObject({ ok: true, proposal: { acceptedAs: 'as-proposed' } })
  })
  test('decline keeps the reason, trimmed to one line and bounded', () => {
    const done = decide(filed(), { kind: 'decline', reason: '  Too  informal\nfor a thesis. ', by: 'J' })
    expect(done).toMatchObject({ ok: true, proposal: { status: 'declined', declinedReason: 'Too informal for a thesis.', decidedBy: 'J' } })
    const none = decide(filed(), { kind: 'decline' })
    if (none.ok) expect(none.proposal.declinedReason).toBeUndefined()
  })
  test('a stale proposal can be declined or withdrawn, never accepted', () => {
    const held = measure(filed(), 'Nothing.')
    expect(decide(held, { kind: 'accept' })).toMatchObject({ ok: false, why: expect.stringContaining('not accepted') })
    expect(decide(held, { kind: 'decline', reason: 'r' })).toMatchObject({ ok: true, proposal: { status: 'declined' } })
    expect(decide(held, { kind: 'withdraw' })).toMatchObject({ ok: true, proposal: { status: 'withdrawn', decidedBy: 'filer' } })
  })
  test('a settled proposal is settled', () => {
    const once = decide(filed(), { kind: 'decline' })
    if (!once.ok) throw new Error(once.why)
    expect(decide(once.proposal, { kind: 'accept' })).toMatchObject({ ok: false, why: 'That proposal was already declined.' })
  })
  test('the sentences', () => {
    const d = decide(filed(), { kind: 'decline', reason: 'No.' })
    if (!d.ok) throw new Error(d.why)
    expect(outcomeSaid(d.proposal)).toBe('declined: No.')
    expect(decisionNews(d.proposal)).toMatch(/^Declined: No\. — your proposal on a\.md \(p-/)
    const a = decide(filed(), { kind: 'accept', final: 'x' })
    if (!a.ok) throw new Error(a.why)
    expect(outcomeSaid(a.proposal)).toBe('accepted with the person’s edits')
    expect(decisionNews(a.proposal)).toMatch(/^Accepted with edits/)
    expect(countSaid(0)).toBe('No proposed changes')
    expect(countSaid(1)).toBe('1 proposed change')
    expect(countSaid(4)).toBe('4 proposed changes')
    expect(proposalLine(shown(d.proposal))).toMatch(/^p-[0-9a-f]+\ta\.md\tlazy dog -> sleeping dog\tDogs sleep\.\t\(state: declined: No\., by: tester\)$/)
  })
})

describe('tokens and the book', () => {
  test('a token proves the filer; only its hash is kept; shown strips it', () => {
    const { token, hash } = mintToken()
    const p = { ...filed(), tokenHash: hash }
    expect(tokenFits(p, token)).toBe(true)
    expect(tokenFits(p, 'nope')).toBe(false)
    expect(tokenFits(filed(), token)).toBe(false)
    expect('tokenHash' in shown(p)).toBe(false)
  })
  test('a book keeps every proposal once, and only the newest settled ones beyond the bound', () => {
    let book = bookOf({ version: 1, proposals: [{ nonsense: true }] })
    expect(book.proposals).toEqual([])
    const p = filed()
    book = withProposal(book, p)
    book = withProposal(book, { ...p, why: 'again' })
    expect(book.proposals).toHaveLength(1)
    expect(book.proposals[0]?.why).toBe('again')
    for (let i = 0; i < 70; i++) book = withProposal(book, { ...filed(), id: `p-${i}`, status: 'declined' })
    expect(book.proposals.filter((one) => one.status === 'declined')).toHaveLength(60)
    expect(book.proposals.some((one) => one.id === p.id)).toBe(true)
  })
})

/* ------------------------------------------------------------------ the site */

function site(texts: Record<string, string>, extra: Partial<ProposalSite> = {}): ProposalSite & { texts: Record<string, string>; settled: Proposal[] } {
  const keeper = memoryKeeper()
  const settled: Proposal[] = []
  return {
    texts,
    settled,
    keeper,
    text: (_project, name) => texts[name] ?? null,
    write: (_project, name, text) => {
      texts[name] = text
      return { ok: true }
    },
    onSettled: (_project, one) => void settled.push(one),
    ...extra,
  }
}

describe('a module’s site', () => {
  test('files, lists measured, decides and writes, and says which text changed', () => {
    const changed: (string | undefined)[] = []
    const s = site({ 'a.md': BASE }, { onChanged: (_project, file) => void changed.push(file) })
    const made = fileProposal(s, '/p', { file: 'a.md', scope: 'range', find: 'lazy dog', replace: 'sleeping dog', why: 'Dogs sleep.', by })
    if (!made.ok) throw new Error(made.why)
    expect(made.token).toMatch(/^[0-9a-f]{36}$/)
    expect(made.revised).toBe(false)
    expect(openProposals(s, '/p')).toHaveLength(1)
    const done = decideProposal(s, '/p', made.proposal.id, { kind: 'accept', by: 'J' })
    expect(done.ok).toBe(true)
    expect(s.texts['a.md']).toContain('sleeping dog')
    expect(openProposals(s, '/p')).toHaveLength(0)
    expect(settledProposals(s, '/p')[0]?.status).toBe('accepted')
    expect(s.settled).toHaveLength(1)
    expect(changed).toEqual(['a.md', 'a.md'])
  })
  test('the text moving under a proposal is seen on the next read, and accept refuses a stale one with nothing written', () => {
    const s = site({ 'a.md': BASE })
    const made = fileProposal(s, '/p', { file: 'a.md', scope: 'range', find: 'lazy dog', replace: 'sleeping dog', why: 'w', by })
    if (!made.ok) throw new Error(made.why)
    s.texts['a.md'] = 'Rewritten entirely.'
    expect(openProposals(s, '/p')[0]?.status).toBe('stale')
    const done = decideProposal(s, '/p', made.proposal.id, { kind: 'accept' })
    expect(done).toMatchObject({ ok: false, stale: true })
    expect(s.texts['a.md']).toBe('Rewritten entirely.')
    const declined = decideProposal(s, '/p', made.proposal.id, { kind: 'decline', reason: 'Moved on.' })
    expect(declined).toMatchObject({ ok: true, proposal: { status: 'declined', declinedReason: 'Moved on.' } })
  })
  test('the same filer over the same words revises its own proposal under the same token', () => {
    const s = site({ 'a.md': BASE })
    const first = fileProposal(s, '/p', { file: 'a.md', scope: 'range', find: 'lazy dog', replace: 'sleeping dog', why: 'w', by })
    const second = fileProposal(s, '/p', { file: 'a.md', scope: 'range', find: 'lazy dog', replace: 'old dog', why: 'w2', by })
    if (!first.ok || !second.ok) throw new Error('filed')
    expect(second.revised).toBe(true)
    expect(second.token).toBeNull()
    expect(second.proposal.id).toBe(first.proposal.id)
    expect(second.proposal.revisions).toBe(1)
    expect(openProposals(s, '/p')).toHaveLength(1)
    expect(withdrawProposal(s, '/p', first.proposal.id, first.token!)).toMatchObject({ ok: true, proposal: { status: 'withdrawn' } })
    expect(openProposals(s, '/p')).toHaveLength(0)
  })
  test('withdraw needs the token, and a pending proposal', () => {
    const s = site({ 'a.md': BASE })
    const made = fileProposal(s, '/p', { file: 'a.md', scope: 'range', find: 'lazy dog', replace: 'x', why: 'w', by })
    if (!made.ok) throw new Error(made.why)
    expect(withdrawProposal(s, '/p', made.proposal.id, 'wrong')).toMatchObject({ ok: false, why: expect.stringContaining('not yours') })
    expect(withdrawProposal(s, '/p', 'p-nope', 'x')).toMatchObject({ ok: false, why: expect.stringContaining('no proposal') })
    decideProposal(s, '/p', made.proposal.id, { kind: 'decline' })
    expect(withdrawProposal(s, '/p', made.proposal.id, made.token!)).toMatchObject({ ok: false, why: expect.stringContaining('already declined') })
  })
  test('a site without a writer cannot accept', () => {
    const s = site({ 'a.md': BASE }, { write: undefined })
    const made = fileProposal(s, '/p', { file: 'a.md', scope: 'range', find: 'lazy dog', replace: 'x', why: 'w', by })
    if (!made.ok) throw new Error(made.why)
    expect(decideProposal(s, '/p', made.proposal.id, { kind: 'accept' })).toMatchObject({ ok: false, why: expect.stringContaining('does not apply') })
  })
  test('a text that is not there cannot be proposed on', () => {
    const s = site({})
    expect(fileProposal(s, '/p', { file: 'b.md', scope: 'range', find: 'a', replace: 'b', why: 'w', by })).toMatchObject({ ok: false, why: expect.stringContaining('no text called "b.md"') })
  })
})

/* ------------------------------------------------------------------ the door */

describe('the four tools', () => {
  const options = { what: 'a deck', file: { name: 'deck', description: 'The deck’s slug.' } }
  test('are listed with the module’s words, and say to read declined reasons first', () => {
    const tools = proposalTools(options)
    expect(tools.map((t) => t.name)).toEqual(['propose_change', 'list_proposals', 'read_proposal', 'withdraw_proposal'])
    const propose = tools[0]!
    expect(propose.description).toContain('a deck')
    expect(propose.description).toContain('DECLINED')
    expect((propose.inputSchema as { required: string[] }).required).toEqual(['project', 'deck', 'find', 'replace', 'why'])
    expect(tools[1]!.annotations.readOnlyHint).toBe(true)
    expect(tools[1]!.description).toContain('WITH THE REASON')
    expect(tools[3]!.annotations.readOnlyHint).toBe(false)
  })
  test('a name that is not one of them is null', async () => {
    expect(await answerProposalTool(site({}), options, 'read_deck', {})).toBeNull()
  })
  test('propose, list, read, withdraw', async () => {
    const s = site({ intro: BASE })
    const filedText = await answerProposalTool(s, options, 'propose_change', { project: '/p', deck: 'intro', find: 'lazy dog', replace: 'sleeping dog', why: 'Dogs sleep.', agent: 'claude-1' })
    expect(filedText).toMatch(/^Filed as p-[0-9a-f]+\./)
    const id = /Filed as (p-[0-9a-f]+)/.exec(filedText!)![1]!
    const token = /Token: ([0-9a-f]+)/.exec(filedText!)![1]!
    expect(filedText).toContain('read it before proposing')

    const list = await answerProposalTool(s, options, 'list_proposals', { project: '/p' })
    expect(list).toContain('1 proposed change.')
    expect(list).toContain(`${id}\tintro\tlazy dog -> sleeping dog\tDogs sleep.\t(state: pending, by: claude-1)`)

    const read = await answerProposalTool(s, options, 'read_proposal', { project: '/p', id })
    expect(read).toContain(`${id} on intro — pending`)
    expect(read).toContain('--- replaces ---\nlazy dog\n--- with ---\nsleeping dog')

    decideProposal(s, '/p', id, { kind: 'decline', reason: 'The dog is not asleep.' })
    const after = await answerProposalTool(s, options, 'list_proposals', { project: '/p', deck: 'intro' })
    expect(after).toContain('No proposed changes on intro.')
    expect(after).toContain('What became of recent ones')
    expect(after).toContain('state: declined: The dog is not asleep.')
    expect(await answerProposalTool(s, options, 'read_proposal', { project: '/p', id })).toContain('Declined reason: The dog is not asleep.')
    expect(await answerProposalTool(s, options, 'withdraw_proposal', { project: '/p', id, token })).toContain('already declined')
  })
  test('proposing again over the same words revises; withdrawing takes it back', async () => {
    const s = site({ intro: BASE })
    const first = await answerProposalTool(s, options, 'propose_change', { project: '/p', deck: 'intro', find: 'lazy dog', replace: 'a', why: 'w' })
    const id = /Filed as (p-[0-9a-f]+)/.exec(first!)![1]!
    const token = /Token: ([0-9a-f]+)/.exec(first!)![1]!
    const second = await answerProposalTool(s, options, 'propose_change', { project: '/p', deck: 'intro', find: 'lazy dog', replace: 'b', why: 'w' })
    expect(second).toContain(`Revised ${id} (revision 1)`)
    expect(second).toContain('still works')
    expect(await answerProposalTool(s, options, 'withdraw_proposal', { project: '/p', id, token })).toBe(`Withdrew ${id}. It is no longer shown to the person.`)
  })
  test('refusals are sentences: no project, no deck, bad quote', async () => {
    const s = site({ intro: BASE })
    expect(await answerProposalTool(s, options, 'propose_change', { deck: 'intro', find: 'a', replace: 'b', why: 'w' })).toBe('Name the project: `project` is its absolute folder.')
    expect(await answerProposalTool(s, options, 'propose_change', { project: '/p', find: 'a', replace: 'b', why: 'w' })).toContain('Name which a deck')
    expect(await answerProposalTool(s, options, 'propose_change', { project: '/p', deck: 'intro', find: 'unicorn', replace: 'b', why: 'w' })).toContain('not in the file')
    expect(await answerProposalTool(s, options, 'read_proposal', { project: '/p', id: 'p-none' })).toContain('no proposal by that id')
  })
  test('the module resolves the project its own way', async () => {
    const s = site({ intro: BASE })
    const resolved = { ...options, project: async () => ({ ok: false as const, why: 'That folder was moved to /q; use that path.' }) }
    expect(await answerProposalTool(s, resolved, 'list_proposals', { project: '/p' })).toBe('That folder was moved to /q; use that path.')
  })
})

/* ----------------------------------------------------------------- the store */

describe('the file store', () => {
  let project = ''
  beforeEach(() => {
    project = mkdtempSync(join(tmpdir(), 'kehikot-proposals-'))
  })
  afterEach(() => rmSync(project, { recursive: true, force: true }))

  test('the book is in the module’s folder of the project, under proposals/, and goes when empty', () => {
    expect(bookPath('/p', 'kehikot.slides')).toBe('/p/.kehikot/slides/proposals/all.json')
    expect(bookPath('/p', 'kehikot.slides', 'thesis')).toBe('/p/.kehikot/slides/proposals/thesis.json')
    expect(bookPath(null, 'kehikot.slides')).toBeNull()
    expect(() => bookPath('/p', 'kehikot.slides', '../x')).toThrow()
    const keeper = fileKeeper('kehikot.slides')
    expect(keeper.read(project)).toEqual({ version: 1, proposals: [] })
    const p = filed()
    keeper.write(project, withProposal(keeper.read(project), p))
    const path = join(project, '.kehikot/slides/proposals/all.json')
    expect(existsSync(path)).toBe(true)
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({ version: 1, proposals: [p] })
    expect(keeper.read(project).proposals[0]?.id).toBe(p.id)
    keeper.write(project, { version: 1, proposals: [] })
    expect(existsSync(path)).toBe(false)
  })
  test('a book per name', () => {
    const keeper = fileKeeper('kehikot.learning', { name: () => 'thesis' })
    keeper.write(project, withProposal(keeper.read(project), filed()))
    expect(existsSync(join(project, '.kehikot/learning/proposals/thesis.json'))).toBe(true)
  })
  test('a broken file is an empty book', () => {
    const path = join(project, '.kehikot/slides/proposals/all.json')
    mkdirSync(join(project, '.kehikot/slides/proposals'), { recursive: true })
    writeFileSync(path, '{not json')
    expect(fileKeeper('kehikot.slides').read(project)).toEqual({ version: 1, proposals: [] })
  })
  test('texts under a folder: read, written atomically, confined to it', () => {
    const dir = join(project, '.kehikot/slides')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'intro.md'), '# Intro\n')
    const files = textFiles({ dir: () => dir, name: (slug) => (/^[a-z0-9-]+$/.test(slug) ? `${slug}.md` : null) })
    expect(files.text(project, 'intro')).toBe('# Intro\n')
    expect(files.text(project, 'none')).toBeNull()
    expect(files.text(project, '../secret')).toBeNull()
    expect(files.write(project, 'intro', '# Changed\n')).toEqual({ ok: true })
    expect(readFileSync(join(dir, 'intro.md'), 'utf8')).toBe('# Changed\n')
    expect(files.write(project, '../out', 'x')).toMatchObject({ ok: false })
    const plain = textFiles({ dir: () => dir })
    expect(plain.text(project, '../../etc')).toBeNull()
    expect(plain.pathOf(project, 'a/../../x')).toBeNull()
  })
  test('a whole site over files', () => {
    const dir = join(project, '.kehikot/slides')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'intro.md'), BASE)
    const files = textFiles({ dir: () => dir, name: (slug) => `${slug}.md` })
    const s: ProposalSite = { keeper: fileKeeper('kehikot.slides'), text: files.text, write: files.write }
    const made = fileProposal(s, project, { file: 'intro', scope: 'range', find: 'lazy dog', replace: 'sleeping dog', why: 'w', by })
    if (!made.ok) throw new Error(made.why)
    expect(decideProposal(s, project, made.proposal.id, { kind: 'accept', hunks: [0] })).toMatchObject({ ok: true })
    expect(readFileSync(join(dir, 'intro.md'), 'utf8')).toContain('sleeping dog')
    expect(settledProposals(s, project)[0]).toMatchObject({ status: 'accepted', acceptedAs: 'as-proposed' })
  })
})
