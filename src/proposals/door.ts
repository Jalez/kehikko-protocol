import { DOOR_ARGUMENTS } from '../door.js'
import { PROPOSAL_MOST, countSaid, outcomeSaid, proposalLine, shown } from './core.js'
import { fileProposal, openProposals, proposalOf, settledProposals, withdrawProposal, type ProposalSite } from './site.js'

/**
 * The four tools a module mounts on its MCP door so agents can propose changes
 * to its texts and learn what became of them (2.71.0): `propose_change`,
 * `list_proposals`, `read_proposal`, `withdraw_proposal`. The definitions are
 * `proposalTools(options)`, the calls `answerProposalTool(site, options, name,
 * args)`; a module lists the first and routes `tools/call` to the second, and
 * keeps whatever other tools it has. Nothing here accepts a proposal: that is
 * the person's, at the module's page.
 */

export const PROPOSAL_TOOL_NAMES = ['propose_change', 'list_proposals', 'read_proposal', 'withdraw_proposal'] as const
export type ProposalToolName = (typeof PROPOSAL_TOOL_NAMES)[number]

export const isProposalTool = (name: unknown): name is ProposalToolName => typeof name === 'string' && (PROPOSAL_TOOL_NAMES as readonly string[]).includes(name)

/** An MCP tool definition, as `tools/list` lists one. */
export interface ProposalToolDefinition {
  name: ProposalToolName
  description: string
  inputSchema: Record<string, unknown>
  annotations: { title: string; readOnlyHint: boolean; destructiveHint: boolean; idempotentHint: boolean; openWorldHint: boolean }
}

export interface ProposalDoorOptions {
  /** What the module's texts are, in the descriptions: `a deck`, `a screenplay`, `the quiz of an epic`. */
  what: string
  /** The argument that names a text: its name (`deck`, `part`, `file`; default `file`) and what it holds. */
  file?: { name?: string; description: string }
  /** The module's name, said where a decision is pushed back. */
  module?: string
  /** What an agent is called when it gives no name. Default `an agent`. */
  anonymous?: string
  /**
   * The project a call names, as the module resolves it (`resolveDoorProject` in `/serve`, or its own
   * way): the folder to work on, or the sentence for why not. Default: the argument as given, trimmed.
   */
  project?(args: Record<string, unknown>): Promise<{ ok: true; path: string } | { ok: false; why: string }> | { ok: true; path: string } | { ok: false; why: string }
}

const PROJECT_ARG = {
  type: 'string',
  description: 'The absolute directory of the project — the folder the kehikko is standing in.',
}

/** The tools, as `tools/list` lists them. */
export function proposalTools(options: ProposalDoorOptions): ProposalToolDefinition[] {
  const fileName = options.file?.name ?? 'file'
  const fileArg = { [fileName]: { type: 'string', description: options.file?.description ?? `Which ${options.what} it is about.` } }
  const what = options.what
  return [
    {
      name: 'propose_change',
      description:
        `Propose a change to ${what}, for the person to accept or decline. This does NOT write the text: it puts the change in `
        + 'front of them as a diff — what is there in red, what you propose in green, your reason beside it — and nothing is '
        + 'written until they accept. Quote the exact text to replace (`find`, as a read shows it, line breaks included), '
        + 'enough of it to be in the text exactly once, and give `replace`; or set `whole: true` and quote the whole text '
        + 'in `find` to propose a rewrite of all of it. Keep one proposal to one change a person can judge at a glance. '
        + 'Before proposing on a text, call list_proposals: a proposal that was DECLINED carries the person’s reason, and '
        + 'proposing the same thing again without reading it wastes their time. Proposing again over the same quoted text '
        + 'revises your pending proposal rather than filing a second one.',
      inputSchema: {
        type: 'object',
        properties: {
          [DOOR_ARGUMENTS.project]: PROJECT_ARG,
          ...fileArg,
          find: { type: 'string', maxLength: PROPOSAL_MOST.text, description: 'The exact text to replace. Must be in the text exactly once (or the whole text, with `whole`).' },
          replace: { type: 'string', maxLength: PROPOSAL_MOST.text, description: 'What goes there. Empty deletes it.' },
          why: { type: 'string', maxLength: PROPOSAL_MOST.why, description: 'One sentence the person sees beside the change, saying why.' },
          whole: { type: 'boolean', description: 'True to propose over the whole text: `find` is then all of it as it is now.' },
          agent: { type: 'string', maxLength: PROPOSAL_MOST.name, description: 'A name for you, the same on every call (an agent name, a session id), so the person sees who proposes and your later proposals revise your own.' },
        },
        required: [DOOR_ARGUMENTS.project, fileName, 'find', 'replace', 'why'],
      },
      annotations: { title: `Propose a change to ${what}`, readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    {
      name: 'list_proposals',
      description:
        `Every proposal on ${what} that the person has not answered yet, then what became of the recent ones: accepted (as `
        + 'proposed, with edits, or in part), declined — WITH THE REASON the person gave, which you read before proposing '
        + 'again on the same text — withdrawn, or out of date because the text changed under it. One line each: id, which '
        + 'text, the change as old -> new, the reason, and the state. Reads only.',
      inputSchema: {
        type: 'object',
        properties: {
          [DOOR_ARGUMENTS.project]: PROJECT_ARG,
          [fileName]: { type: 'string', description: `Only the proposals on this ${what}. Left out: all of them.` },
        },
        required: [DOOR_ARGUMENTS.project],
      },
      annotations: { title: 'List proposals and their outcomes', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    {
      name: 'read_proposal',
      description:
        'One proposal in full, by id: the text it replaces, the text proposed, who filed it and why, its state, and — once '
        + 'answered — who decided, when, the reason it was declined, or the text that was actually written when it was '
        + 'accepted with edits or in part. Reads only.',
      inputSchema: {
        type: 'object',
        properties: { [DOOR_ARGUMENTS.project]: PROJECT_ARG, id: { type: 'string', maxLength: PROPOSAL_MOST.id, description: 'The id propose_change returned, or list_proposals shows.' } },
        required: [DOOR_ARGUMENTS.project, 'id'],
      },
      annotations: { title: 'Read one proposal', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    {
      name: 'withdraw_proposal',
      description:
        'Take back a proposal you filed, while it is still pending. Needs the token propose_change returned for it. It '
        + 'leaves the person’s view and is listed as withdrawn. Refused, with the reason, if it was already answered or '
        + 'the token is not its own. This cannot accept anything.',
      inputSchema: {
        type: 'object',
        properties: {
          [DOOR_ARGUMENTS.project]: PROJECT_ARG,
          id: { type: 'string', maxLength: PROPOSAL_MOST.id, description: 'The id propose_change returned.' },
          token: { type: 'string', maxLength: PROPOSAL_MOST.token, description: 'The token propose_change returned for that id.' },
        },
        required: [DOOR_ARGUMENTS.project, 'id', 'token'],
      },
      annotations: { title: 'Withdraw a proposal', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
  ]
}

const str = (value: unknown, most: number): string => (typeof value === 'string' ? value.trim().slice(0, most) : '')

/**
 * Answer one of the four tools, as text for the agent; `null` for a name that is not one of them,
 * so a module asks here first and falls through to its own tools.
 */
export async function answerProposalTool(site: ProposalSite, options: ProposalDoorOptions, name: string, args: Record<string, unknown>): Promise<string | null> {
  if (!isProposalTool(name)) return null
  const fileName = options.file?.name ?? 'file'
  const named = options.project ? await options.project(args) : (() => {
    const path = str(args[DOOR_ARGUMENTS.project], 4096)
    return path ? { ok: true as const, path } : { ok: false as const, why: 'Name the project: `project` is its absolute folder.' }
  })()
  if (!named.ok) return named.why
  const project = named.path
  const anonymous = options.anonymous ?? 'an agent'

  if (name === 'propose_change') {
    const file = str(args[fileName], PROPOSAL_MOST.file)
    if (!file) return `Name which ${options.what} it is about (\`${fileName}\`).`
    /* Not trimmed: a quote about text ending in a space has to name that space or it names something else. */
    const find = typeof args.find === 'string' ? args.find : ''
    const replace = typeof args.replace === 'string' ? args.replace : ''
    const why = str(args.why, PROPOSAL_MOST.why)
    const agent = str(args.agent, PROPOSAL_MOST.name) || anonymous
    const filed = fileProposal(site, project, {
      file,
      scope: args.whole === true ? 'file' : 'range',
      find,
      replace,
      why,
      by: { kind: 'agent', name: agent },
    })
    if (!filed.ok) return filed.why
    const lines = [
      filed.revised
        ? `Revised ${filed.proposal.id} (revision ${filed.proposal.revisions}): you already had a pending proposal over those words, so it was replaced rather than doubled.`
        : `Filed as ${filed.proposal.id}. It is shown to the person as a diff, and nothing is written until they accept it. Nothing on this door can accept it for them.`,
      ...(filed.token ? [`Token: ${filed.token}`, 'Keep that token: withdraw_proposal needs it, it is shown nowhere else and cannot be recovered.'] : ['The token you were handed for it still works.']),
      'list_proposals says what became of it; a declined one carries the person’s reason — read it before proposing on that text again.',
    ]
    return lines.join('\n')
  }

  if (name === 'list_proposals') {
    const file = str(args[fileName], PROPOSAL_MOST.file) || undefined
    const open = openProposals(site, project, file).map(shown)
    const settled = settledProposals(site, project, file).slice(0, 15).map(shown)
    const head = file ? `${countSaid(open.length)} on ${file}.` : `${countSaid(open.length)}.`
    const lines = [head, ...open.map((one) => proposalLine(one))]
    if (settled.length) {
      lines.push('', 'What became of recent ones (newest first; a declined one carries the person’s reason):')
      lines.push(...settled.map((one) => proposalLine(one)))
    }
    return lines.join('\n')
  }

  if (name === 'read_proposal') {
    const id = str(args.id, PROPOSAL_MOST.id)
    const one = id ? proposalOf(site, project, id) : null
    if (!one) return 'There is no proposal by that id in this project. list_proposals shows what there is.'
    const p = shown(one)
    const when = (at: number | undefined) => (at ? new Date(at).toISOString() : '')
    const lines = [
      `${p.id} on ${p.file} — ${outcomeSaid(p)}`,
      `By: ${p.by.name}${p.by.session ? ` (session ${p.by.session})` : ''}, filed ${when(p.createdAt)}${p.revisedAt ? `, revised ${when(p.revisedAt)} (${p.revisions}x)` : ''}`,
      `Why: ${p.why}`,
      ...(p.decidedAt ? [`Decided by ${p.decidedBy ?? 'person'} at ${when(p.decidedAt)}.`] : []),
      ...(p.status === 'declined' ? [`Declined reason: ${p.declinedReason ?? '(none given)'}`] : []),
      ...(p.status === 'stale' && p.stale ? [`Out of date: ${p.stale.said}`] : []),
      '',
      p.scope === 'file' ? '--- the whole text it replaces ---' : '--- replaces ---',
      p.find,
      '--- with ---',
      p.replace,
      ...(p.final !== undefined ? ['--- what was actually written ---', p.final] : []),
    ]
    return lines.join('\n')
  }

  const id = str(args.id, PROPOSAL_MOST.id)
  const token = typeof args.token === 'string' ? args.token.trim().slice(0, PROPOSAL_MOST.token) : ''
  const done = withdrawProposal(site, project, id, token)
  if (!done.ok) return done.why
  return `Withdrew ${done.proposal.id}. It is no longer shown to the person.`
}
