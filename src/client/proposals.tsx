import { Check, ChevronDown, ChevronRight, Pencil, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react'

import type { FooterItemInput } from '../footer.js'
import { countSaid, outcomeSaid, proposalHunks, type ShownProposal } from '../proposals/core.js'
import type { Hunk } from '../proposals/diff.js'
import { Badge } from './ui/badge.js'
import { Button } from './ui/button.js'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible.js'
import { ScrollArea } from './ui/scroll-area.js'
import { Separator } from './ui/separator.js'
import { Textarea } from './ui/textarea.js'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.js'
import { cn } from './ui/utils.js'

/**
 * The React half of proposals (2.71.0; shadcn from 2.72.0): a proposed change
 * drawn inline as a diff with the person's answers under it, the list of what
 * is waiting, a walk through them, and the footer line that says how many there
 * are with Previous and Next beside it. Built from the shadcn/ui components in
 * `./ui` — Button, Textarea, Tooltip, Badge, ScrollArea, Separator, Collapsible
 * — so a proposal looks like the rest of the module: the same class names, the
 * module's own theme tokens (`--primary`, `--border`, `--ring`, `.dark`), its
 * Tailwind build reading this package's `dist/client` as a source. Keyboard
 * reachable throughout; every string a module or an agent wrote is rendered as
 * text. Design notes: docs/proposals.md.
 */

/** The words on the buttons and labels, in one place, for a module that mirrors them in a header or a tooltip. */
export const PROPOSAL_WORDS = {
  accept: 'Accept',
  acceptChosen: 'Accept chosen',
  acceptEdited: 'Accept as edited',
  decline: 'Decline',
  declineWithReason: 'Decline with reason',
  edit: 'Edit, then accept',
  cancel: 'Cancel',
  reasonLabel: 'Why (the agent reads this)',
  reasonPlaceholder: 'Why not — the agent reads this before proposing again',
  editLabel: 'The text to write instead',
  hunkLabel: (n: number) => `Take change ${n}`,
  proposedBy: (name: string) => `proposed by ${name}`,
  revised: (n: number) => `revised ${n}×`,
  whole: 'The whole text is rewritten.',
  change: 'The change',
  answer: 'Answer',
} as const

/** The diff's two colours: what leaves and what arrives, in both themes. Overridable through `className` on the view. */
const OLD = 'block bg-red-500/15 text-red-800 dark:bg-red-500/20 dark:text-red-200 no-underline'
const NEW = 'block bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200 no-underline'

export interface ProposalViewProps {
  proposal: ShownProposal
  /** Accept: as proposed (`{}`), with the person's own text (`final`), or only the chosen hunks (`hunks`, indexes). */
  onAccept?: (take: { final?: string; hunks?: number[] }) => void | Promise<unknown>
  /** Decline, with the reason the person typed, or none. */
  onDecline?: (reason: string) => void | Promise<unknown>
  /** Offer "Edit, then accept". Default true. */
  allowEdit?: boolean
  /** Offer a checkbox per hunk, so part of the change can be taken. Default true. */
  allowPartial?: boolean
  /** While an answer is in flight: the buttons wait. */
  busy?: boolean
  /** Drawn with the walk's ring around it. */
  current?: boolean
  /** A sentence under the buttons: what the last press came to. */
  said?: string | null
  /** Draw the diff only: no header line, no reason. */
  bare?: boolean
  className?: string
  children?: ReactNode
}

const STATUS_BADGE: Record<ShownProposal['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'default',
  stale: 'destructive',
  accepted: 'secondary',
  declined: 'outline',
  withdrawn: 'outline',
}

/**
 * One proposal, inline: who proposes what and why, the change as hunks (red
 * leaves, green arrives; with `allowPartial`, a checkbox per hunk), and the
 * answers. A settled proposal is drawn with its outcome and no buttons. A stale
 * one says why and offers Decline only. The diff folds (Collapsible) once a
 * proposal is settled, so a list of outcomes stays short.
 */
export function ProposalView({ proposal, onAccept, onDecline, allowEdit = true, allowPartial = true, busy = false, current = false, said = null, bare = false, className, children }: ProposalViewProps): ReactElement {
  const hunks = useMemo(() => proposalHunks(proposal), [proposal.find, proposal.replace])
  const [mode, setMode] = useState<'answer' | 'reason' | 'edit'>('answer')
  const [reason, setReason] = useState('')
  const [draft, setDraft] = useState(proposal.replace)
  const [skipped, setSkipped] = useState<Set<number>>(() => new Set())
  const open = proposal.status === 'pending'
  const stale = proposal.status === 'stale'
  const settled = !open && !stale
  const [unfolded, setUnfolded] = useState(!settled)
  useEffect(() => {
    setMode('answer')
    setReason('')
    setDraft(proposal.replace)
    setSkipped(new Set())
  }, [proposal.id, proposal.revisedAt])

  const whole = proposal.scope === 'file'
  const chosen = useMemo(() => hunks.map((_, i) => i).filter((i) => !skipped.has(i)), [hunks, skipped])
  const partial = allowPartial && !whole && hunks.length > 1

  const accept = useCallback(() => {
    if (!onAccept) return
    if (mode === 'edit') return void onAccept(draft === proposal.replace ? {} : { final: draft })
    if (partial && chosen.length !== hunks.length) return void onAccept({ hunks: chosen })
    void onAccept({})
  }, [onAccept, mode, draft, proposal.replace, partial, chosen, hunks.length])
  const decline = useCallback(() => {
    if (!onDecline) return
    void onDecline(mode === 'reason' ? reason.trim() : '')
  }, [onDecline, mode, reason])
  const toggle = (i: number) =>
    setSkipped((now) => {
      const next = new Set(now)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  const shownHunks: Hunk[] = hunks.length ? hunks : [{ oldFrom: 0, oldTo: 0, newFrom: 0, newTo: 0, oldText: proposal.find, newText: proposal.replace }]
  const diff =
    mode === 'edit' ? (
      <label className="block">
        <span className="text-muted-foreground mb-1 block text-xs">{PROPOSAL_WORDS.editLabel}</span>
        <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} disabled={busy} aria-label={PROPOSAL_WORDS.editLabel} className="min-h-24 font-mono text-xs" />
      </label>
    ) : (
      <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label={whole ? PROPOSAL_WORDS.whole : PROPOSAL_WORDS.change}>
        {whole ? (
          <li data-whole="true">
            <pre className="m-0 whitespace-pre-wrap rounded-md px-1.5 py-1 font-mono text-xs leading-relaxed [overflow-wrap:anywhere]">
              <del className={OLD}>{proposal.find}</del>
              <ins className={NEW}>{proposal.replace}</ins>
            </pre>
          </li>
        ) : (
          shownHunks.map((one, i) => (
            <li key={i} data-skipped={skipped.has(i) ? 'true' : 'false'} className={cn('grid items-start gap-x-2', partial && open ? 'grid-cols-[auto_1fr]' : 'grid-cols-1')}>
              {partial && open ? (
                <input type="checkbox" className="accent-primary mt-1.5" checked={!skipped.has(i)} onChange={() => toggle(i)} disabled={busy} aria-label={PROPOSAL_WORDS.hunkLabel(i + 1)} />
              ) : null}
              <pre className={cn('m-0 whitespace-pre-wrap rounded-md px-1.5 py-1 font-mono text-xs leading-relaxed [overflow-wrap:anywhere]', skipped.has(i) && '[&_ins]:opacity-40')}>
                <del className={OLD}>{one.oldText || '(nothing)'}</del>
                <ins className={NEW}>{one.newText || '(nothing)'}</ins>
              </pre>
            </li>
          ))
        )}
      </ul>
    )

  const acts: ReactNode[] = []
  if (open && onAccept) {
    const label = mode === 'edit' ? PROPOSAL_WORDS.acceptEdited : partial && chosen.length !== hunks.length ? PROPOSAL_WORDS.acceptChosen : PROPOSAL_WORDS.accept
    acts.push(
      <Button key="accept" size="sm" onClick={accept} disabled={busy || (partial && chosen.length === 0)}>
        <Check aria-hidden="true" />
        {label}
      </Button>,
    )
  }
  if ((open || stale) && onDecline) {
    if (mode === 'reason') {
      acts.push(
        <input
          key="reason"
          type="text"
          value={reason}
          placeholder={PROPOSAL_WORDS.reasonPlaceholder}
          aria-label={PROPOSAL_WORDS.reasonLabel}
          autoFocus
          disabled={busy}
          onChange={(event) => setReason(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              decline()
            }
          }}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 min-w-0 flex-1 basis-48 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-[3px] disabled:opacity-50"
        />,
        <Button key="decline" size="sm" variant="outline" onClick={decline} disabled={busy}>
          <X aria-hidden="true" />
          {PROPOSAL_WORDS.decline}
        </Button>,
      )
    } else {
      acts.push(
        <Button key="decline" size="sm" variant="outline" onClick={decline} disabled={busy}>
          <X aria-hidden="true" />
          {PROPOSAL_WORDS.decline}
        </Button>,
        <Tooltip key="reason">
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" onClick={() => setMode('reason')} disabled={busy}>
              {PROPOSAL_WORDS.declineWithReason}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{PROPOSAL_WORDS.reasonPlaceholder}</TooltipContent>
        </Tooltip>,
      )
    }
  }
  if (open && onAccept && allowEdit && mode === 'answer') {
    acts.push(
      <Button key="edit" size="sm" variant="ghost" onClick={() => setMode('edit')} disabled={busy}>
        <Pencil aria-hidden="true" />
        {PROPOSAL_WORDS.edit}
      </Button>,
    )
  }
  if (mode !== 'answer') {
    acts.push(
      <Button key="cancel" size="sm" variant="ghost" onClick={() => setMode('answer')} disabled={busy}>
        {PROPOSAL_WORDS.cancel}
      </Button>,
    )
  }

  const body = (
    <>
      {stale && proposal.stale ? (
        <p data-stale="" role="status" className="text-destructive mb-1.5 text-xs">
          {proposal.stale.said}
        </p>
      ) : null}
      {diff}
      {acts.length ? (
        <div role="group" aria-label={PROPOSAL_WORDS.answer} className="mt-2 flex flex-wrap items-center gap-1.5">
          {acts}
        </div>
      ) : null}
      {said ? (
        <p role="status" className="text-muted-foreground mt-1.5 text-xs">
          {said}
        </p>
      ) : null}
      {children}
    </>
  )

  return (
    <section
      data-proposal={proposal.id}
      data-status={proposal.status}
      data-current={current ? 'true' : 'false'}
      aria-label={`Proposal on ${proposal.file}`}
      tabIndex={-1}
      className={cn('bg-card text-card-foreground my-2 rounded-md border px-2.5 py-2 text-sm outline-none', current && 'ring-ring ring-2 ring-offset-1', settled && 'opacity-80', className)}
    >
      {bare ? null : (
        <header className="mb-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <b className="font-semibold">{proposal.file}</b>
          <span className="text-muted-foreground text-xs">{PROPOSAL_WORDS.proposedBy(proposal.by.name)}</span>
          {proposal.revisions ? <span className="text-muted-foreground text-xs">{PROPOSAL_WORDS.revised(proposal.revisions)}</span> : null}
          {settled || stale ? (
            <Badge variant={STATUS_BADGE[proposal.status]} data-outcome={proposal.status} className="ml-auto">
              {outcomeSaid(proposal)}
            </Badge>
          ) : null}
        </header>
      )}
      {bare ? null : <p className="mb-1.5 [overflow-wrap:anywhere]">{proposal.why}</p>}
      {settled ? (
        <Collapsible open={unfolded} onOpenChange={setUnfolded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="mb-1 -ml-2 h-7 px-2 text-xs">
              {unfolded ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
              {PROPOSAL_WORDS.change}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>{body}</CollapsibleContent>
        </Collapsible>
      ) : (
        body
      )}
    </section>
  )
}

export interface ProposalListProps {
  proposals: readonly ShownProposal[]
  current?: string | null
  onPick?: (id: string) => void
  /** With nothing to list: the sentence, or nothing. Default `No proposed changes`. */
  empty?: string | null
  /** The list's height when it scrolls (a ScrollArea); default: as tall as its lines. */
  className?: string
}

/** What is waiting, one line each: the file, the reason, the state; the current one marked; separators between. */
export function ProposalList({ proposals, current = null, onPick, empty = countSaid(0), className }: ProposalListProps): ReactElement {
  if (!proposals.length) {
    return (
      <p role="status" className="text-muted-foreground text-xs">
        {empty ?? ''}
      </p>
    )
  }
  return (
    <ScrollArea className={className}>
      <ul className="m-0 flex list-none flex-col p-0 text-sm" aria-label={countSaid(proposals.length)}>
        {proposals.map((one, i) => (
          <li key={one.id}>
            {i ? <Separator /> : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPick?.(one.id)}
              aria-current={one.id === current ? 'true' : undefined}
              data-status={one.status}
              className={cn('h-auto w-full justify-start gap-2 whitespace-normal py-1.5 text-left', one.id === current && 'ring-ring ring-1')}
            >
              <b className="shrink-0 font-semibold">{one.file}</b>
              <span className="text-muted-foreground min-w-0 flex-1 truncate">{one.why}</span>
              <Badge variant={one.status === 'pending' ? 'secondary' : STATUS_BADGE[one.status]} className="ml-auto shrink-0">
                {one.status === 'pending' ? one.by.name : outcomeSaid(one)}
              </Badge>
            </Button>
          </li>
        ))}
      </ul>
    </ScrollArea>
  )
}

/* ------------------------------------------------------------------------ *
 * Walking them, and the footer
 * ------------------------------------------------------------------------ */

/** The ids of the footer's items. */
export const PROPOSAL_FOOT = { COUNT: 'proposals', PREV: 'proposal-prev', NEXT: 'proposal-next' } as const

export interface ProposalsFooterState {
  /** How many are open (pending or stale). */
  open: number
  /** Which one is current, 1-based, or null when none is. */
  at?: number | null
  /** Next just found no more. */
  noMore?: boolean
}

/**
 * The footer items for proposals: the count (`3 proposed changes`, or `Proposal 2 of 3` while one is
 * current), with Previous and Next beside it acting on it. Nothing when none is open — a footer
 * says what is going on, and nothing is. Pure; a module spreads it into its own footer.
 */
export function proposalsFooter(state: ProposalsFooterState): FooterItemInput[] {
  if (state.open <= 0) return []
  const text = state.at ? `Proposal ${state.at} of ${state.open}` : countSaid(state.open)
  return [
    { kind: 'run', id: PROPOSAL_FOOT.PREV, label: 'Previous proposal', icon: 'chevron-left', align: 'center', actsOn: PROPOSAL_FOOT.COUNT },
    { kind: 'text', id: PROPOSAL_FOOT.COUNT, text, align: 'center', tooltip: state.at ? `Proposal ${state.at} of ${state.open} waiting to be accepted or declined.` : 'Press Next proposal to go to the first one.' },
    { kind: 'run', id: PROPOSAL_FOOT.NEXT, label: 'Next proposal', icon: 'chevron-right', align: 'center', actsOn: PROPOSAL_FOOT.COUNT, ...(state.noMore ? { result: 'No more' } : {}) },
  ]
}

/** Which of the footer's presses this is, or null for a press that is not one. */
export function proposalsFooterPress(item: string): 'prev' | 'next' | null {
  return item === PROPOSAL_FOOT.PREV ? 'prev' : item === PROPOSAL_FOOT.NEXT ? 'next' : null
}

/** The next position in a walk over `count` stops: wraps at neither end; `null` from the end is "no more". */
export function stepWalk(at: number | null, count: number, direction: 'prev' | 'next'): number | null {
  if (count <= 0) return null
  if (at === null) return direction === 'next' ? 1 : count
  const next = direction === 'next' ? at + 1 : at - 1
  return next < 1 || next > count ? null : next
}

/**
 * A walk through the open proposals: the current id, where it stands (`at`, 1-based), the footer
 * items for it, and `press` for a footer press. The current one stays current across re-reads and
 * clears when it is answered. `scrollTo` is called with the id of a stop the walk moved to.
 */
export function useProposalWalk(proposals: readonly ShownProposal[], options: { scrollTo?: (id: string) => void } = {}): {
  current: string | null
  at: number | null
  open: ShownProposal[]
  footer: FooterItemInput[]
  press: (item: string) => string | null
  pick: (id: string | null) => void
  noMore: boolean
} {
  const open = useMemo(() => proposals.filter((one) => one.status === 'pending' || one.status === 'stale'), [proposals])
  const [current, setCurrent] = useState<string | null>(null)
  const [noMore, setNoMore] = useState(false)
  useEffect(() => {
    if (current && !open.some((one) => one.id === current)) setCurrent(null)
  }, [open, current])
  const at = current ? open.findIndex((one) => one.id === current) + 1 || null : null
  const scrollTo = options.scrollTo
  const pick = useCallback(
    (id: string | null) => {
      setCurrent(id)
      setNoMore(false)
      if (id && scrollTo) scrollTo(id)
      else if (id && typeof document !== 'undefined') {
        const node = document.querySelector<HTMLElement>(`[data-proposal="${CSS.escape(id)}"]`)
        node?.scrollIntoView({ block: 'center' })
        node?.focus({ preventScroll: true })
      }
    },
    [scrollTo],
  )
  const press = useCallback(
    (item: string): string | null => {
      const direction = proposalsFooterPress(item)
      if (!direction) return null
      const to = stepWalk(at, open.length, direction)
      if (to === null) {
        setNoMore(direction === 'next')
        return direction === 'next' ? 'No more proposals.' : 'This is the first proposal.'
      }
      pick(open[to - 1]!.id)
      return `Proposal ${to} of ${open.length}.`
    },
    [at, open, pick],
  )
  const footer = useMemo(() => proposalsFooter({ open: open.length, at, noMore }), [open.length, at, noMore])
  return { current, at, open, footer, press, pick, noMore }
}
