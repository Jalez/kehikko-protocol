import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Check, ChevronDown, ChevronRight, Pencil, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { countSaid, outcomeSaid, proposalHunks } from '../proposals/core.js';
import { Badge } from './ui/badge.js';
import { Button } from './ui/button.js';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible.js';
import { ScrollArea } from './ui/scroll-area.js';
import { Separator } from './ui/separator.js';
import { Textarea } from './ui/textarea.js';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.js';
import { cn } from './ui/utils.js';
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
    hunkLabel: (n) => `Take change ${n}`,
    proposedBy: (name) => `proposed by ${name}`,
    revised: (n) => `revised ${n}×`,
    whole: 'The whole text is rewritten.',
    change: 'The change',
    answer: 'Answer',
};
/** The diff's two colours: what leaves and what arrives, in both themes. Overridable through `className` on the view. */
const OLD = 'block bg-red-500/15 text-red-800 dark:bg-red-500/20 dark:text-red-200 no-underline';
const NEW = 'block bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200 no-underline';
const STATUS_BADGE = {
    pending: 'default',
    stale: 'destructive',
    accepted: 'secondary',
    declined: 'outline',
    withdrawn: 'outline',
};
/**
 * One proposal, inline: who proposes what and why, the change as hunks (red
 * leaves, green arrives; with `allowPartial`, a checkbox per hunk), and the
 * answers. A settled proposal is drawn with its outcome and no buttons. A stale
 * one says why and offers Decline only. The diff folds (Collapsible) once a
 * proposal is settled, so a list of outcomes stays short.
 */
export function ProposalView({ proposal, onAccept, onDecline, allowEdit = true, allowPartial = true, busy = false, current = false, said = null, bare = false, className, children }) {
    const hunks = useMemo(() => proposalHunks(proposal), [proposal.find, proposal.replace]);
    const [mode, setMode] = useState('answer');
    const [reason, setReason] = useState('');
    const [draft, setDraft] = useState(proposal.replace);
    const [skipped, setSkipped] = useState(() => new Set());
    const open = proposal.status === 'pending';
    const stale = proposal.status === 'stale';
    const settled = !open && !stale;
    const [unfolded, setUnfolded] = useState(!settled);
    useEffect(() => {
        setMode('answer');
        setReason('');
        setDraft(proposal.replace);
        setSkipped(new Set());
    }, [proposal.id, proposal.revisedAt]);
    const whole = proposal.scope === 'file';
    const chosen = useMemo(() => hunks.map((_, i) => i).filter((i) => !skipped.has(i)), [hunks, skipped]);
    const partial = allowPartial && !whole && hunks.length > 1;
    const accept = useCallback(() => {
        if (!onAccept)
            return;
        if (mode === 'edit')
            return void onAccept(draft === proposal.replace ? {} : { final: draft });
        if (partial && chosen.length !== hunks.length)
            return void onAccept({ hunks: chosen });
        void onAccept({});
    }, [onAccept, mode, draft, proposal.replace, partial, chosen, hunks.length]);
    const decline = useCallback(() => {
        if (!onDecline)
            return;
        void onDecline(mode === 'reason' ? reason.trim() : '');
    }, [onDecline, mode, reason]);
    const toggle = (i) => setSkipped((now) => {
        const next = new Set(now);
        if (next.has(i))
            next.delete(i);
        else
            next.add(i);
        return next;
    });
    const shownHunks = hunks.length ? hunks : [{ oldFrom: 0, oldTo: 0, newFrom: 0, newTo: 0, oldText: proposal.find, newText: proposal.replace }];
    const diff = mode === 'edit' ? (_jsxs("label", { className: "block", children: [_jsx("span", { className: "text-muted-foreground mb-1 block text-xs", children: PROPOSAL_WORDS.editLabel }), _jsx(Textarea, { value: draft, onChange: (event) => setDraft(event.target.value), disabled: busy, "aria-label": PROPOSAL_WORDS.editLabel, className: "min-h-24 font-mono text-xs" })] })) : (_jsx("ul", { className: "m-0 flex list-none flex-col gap-1 p-0", "aria-label": whole ? PROPOSAL_WORDS.whole : PROPOSAL_WORDS.change, children: whole ? (_jsx("li", { "data-whole": "true", children: _jsxs("pre", { className: "m-0 whitespace-pre-wrap rounded-md px-1.5 py-1 font-mono text-xs leading-relaxed [overflow-wrap:anywhere]", children: [_jsx("del", { className: OLD, children: proposal.find }), _jsx("ins", { className: NEW, children: proposal.replace })] }) })) : (shownHunks.map((one, i) => (_jsxs("li", { "data-skipped": skipped.has(i) ? 'true' : 'false', className: cn('grid items-start gap-x-2', partial && open ? 'grid-cols-[auto_1fr]' : 'grid-cols-1'), children: [partial && open ? (_jsx("input", { type: "checkbox", className: "accent-primary mt-1.5", checked: !skipped.has(i), onChange: () => toggle(i), disabled: busy, "aria-label": PROPOSAL_WORDS.hunkLabel(i + 1) })) : null, _jsxs("pre", { className: cn('m-0 whitespace-pre-wrap rounded-md px-1.5 py-1 font-mono text-xs leading-relaxed [overflow-wrap:anywhere]', skipped.has(i) && '[&_ins]:opacity-40'), children: [_jsx("del", { className: OLD, children: one.oldText || '(nothing)' }), _jsx("ins", { className: NEW, children: one.newText || '(nothing)' })] })] }, i)))) }));
    const acts = [];
    if (open && onAccept) {
        const label = mode === 'edit' ? PROPOSAL_WORDS.acceptEdited : partial && chosen.length !== hunks.length ? PROPOSAL_WORDS.acceptChosen : PROPOSAL_WORDS.accept;
        acts.push(_jsxs(Button, { size: "sm", onClick: accept, disabled: busy || (partial && chosen.length === 0), children: [_jsx(Check, { "aria-hidden": "true" }), label] }, "accept"));
    }
    if ((open || stale) && onDecline) {
        if (mode === 'reason') {
            acts.push(_jsx("input", { type: "text", value: reason, placeholder: PROPOSAL_WORDS.reasonPlaceholder, "aria-label": PROPOSAL_WORDS.reasonLabel, autoFocus: true, disabled: busy, onChange: (event) => setReason(event.target.value), onKeyDown: (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        decline();
                    }
                }, className: "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 min-w-0 flex-1 basis-48 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-[3px] disabled:opacity-50" }, "reason"), _jsxs(Button, { size: "sm", variant: "outline", onClick: decline, disabled: busy, children: [_jsx(X, { "aria-hidden": "true" }), PROPOSAL_WORDS.decline] }, "decline"));
        }
        else {
            acts.push(_jsxs(Button, { size: "sm", variant: "outline", onClick: decline, disabled: busy, children: [_jsx(X, { "aria-hidden": "true" }), PROPOSAL_WORDS.decline] }, "decline"), _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Button, { size: "sm", variant: "ghost", onClick: () => setMode('reason'), disabled: busy, children: PROPOSAL_WORDS.declineWithReason }) }), _jsx(TooltipContent, { children: PROPOSAL_WORDS.reasonPlaceholder })] }, "reason"));
        }
    }
    if (open && onAccept && allowEdit && mode === 'answer') {
        acts.push(_jsxs(Button, { size: "sm", variant: "ghost", onClick: () => setMode('edit'), disabled: busy, children: [_jsx(Pencil, { "aria-hidden": "true" }), PROPOSAL_WORDS.edit] }, "edit"));
    }
    if (mode !== 'answer') {
        acts.push(_jsx(Button, { size: "sm", variant: "ghost", onClick: () => setMode('answer'), disabled: busy, children: PROPOSAL_WORDS.cancel }, "cancel"));
    }
    const body = (_jsxs(_Fragment, { children: [stale && proposal.stale ? (_jsx("p", { "data-stale": "", role: "status", className: "text-destructive mb-1.5 text-xs", children: proposal.stale.said })) : null, diff, acts.length ? (_jsx("div", { role: "group", "aria-label": PROPOSAL_WORDS.answer, className: "mt-2 flex flex-wrap items-center gap-1.5", children: acts })) : null, said ? (_jsx("p", { role: "status", className: "text-muted-foreground mt-1.5 text-xs", children: said })) : null, children] }));
    return (_jsxs("section", { "data-proposal": proposal.id, "data-status": proposal.status, "data-current": current ? 'true' : 'false', "aria-label": `Proposal on ${proposal.file}`, tabIndex: -1, className: cn('bg-card text-card-foreground my-2 rounded-md border px-2.5 py-2 text-sm outline-none', current && 'ring-ring ring-2 ring-offset-1', settled && 'opacity-80', className), children: [bare ? null : (_jsxs("header", { className: "mb-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1", children: [_jsx("b", { className: "font-semibold", children: proposal.file }), _jsx("span", { className: "text-muted-foreground text-xs", children: PROPOSAL_WORDS.proposedBy(proposal.by.name) }), proposal.revisions ? _jsx("span", { className: "text-muted-foreground text-xs", children: PROPOSAL_WORDS.revised(proposal.revisions) }) : null, settled || stale ? (_jsx(Badge, { variant: STATUS_BADGE[proposal.status], "data-outcome": proposal.status, className: "ml-auto", children: outcomeSaid(proposal) })) : null] })), bare ? null : _jsx("p", { className: "mb-1.5 [overflow-wrap:anywhere]", children: proposal.why }), settled ? (_jsxs(Collapsible, { open: unfolded, onOpenChange: setUnfolded, children: [_jsx(CollapsibleTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", size: "sm", className: "mb-1 -ml-2 h-7 px-2 text-xs", children: [unfolded ? _jsx(ChevronDown, { "aria-hidden": "true" }) : _jsx(ChevronRight, { "aria-hidden": "true" }), PROPOSAL_WORDS.change] }) }), _jsx(CollapsibleContent, { children: body })] })) : (body)] }));
}
/** What is waiting, one line each: the file, the reason, the state; the current one marked; separators between. */
export function ProposalList({ proposals, current = null, onPick, empty = countSaid(0), className }) {
    if (!proposals.length) {
        return (_jsx("p", { role: "status", className: "text-muted-foreground text-xs", children: empty ?? '' }));
    }
    return (_jsx(ScrollArea, { className: className, children: _jsx("ul", { className: "m-0 flex list-none flex-col p-0 text-sm", "aria-label": countSaid(proposals.length), children: proposals.map((one, i) => (_jsxs("li", { children: [i ? _jsx(Separator, {}) : null, _jsxs(Button, { variant: "ghost", size: "sm", onClick: () => onPick?.(one.id), "aria-current": one.id === current ? 'true' : undefined, "data-status": one.status, className: cn('h-auto w-full justify-start gap-2 whitespace-normal py-1.5 text-left', one.id === current && 'ring-ring ring-1'), children: [_jsx("b", { className: "shrink-0 font-semibold", children: one.file }), _jsx("span", { className: "text-muted-foreground min-w-0 flex-1 truncate", children: one.why }), _jsx(Badge, { variant: one.status === 'pending' ? 'secondary' : STATUS_BADGE[one.status], className: "ml-auto shrink-0", children: one.status === 'pending' ? one.by.name : outcomeSaid(one) })] })] }, one.id))) }) }));
}
/* ------------------------------------------------------------------------ *
 * Walking them, and the footer
 * ------------------------------------------------------------------------ */
/** The ids of the footer's items. */
export const PROPOSAL_FOOT = { COUNT: 'proposals', PREV: 'proposal-prev', NEXT: 'proposal-next' };
/**
 * The footer items for proposals: the count (`3 proposed changes`, or `Proposal 2 of 3` while one is
 * current), with Previous and Next beside it acting on it. Nothing when none is open — a footer
 * says what is going on, and nothing is. Pure; a module spreads it into its own footer.
 */
export function proposalsFooter(state) {
    if (state.open <= 0)
        return [];
    const text = state.at ? `Proposal ${state.at} of ${state.open}` : countSaid(state.open);
    return [
        { kind: 'run', id: PROPOSAL_FOOT.PREV, label: 'Previous proposal', icon: 'chevron-left', align: 'center', actsOn: PROPOSAL_FOOT.COUNT },
        { kind: 'text', id: PROPOSAL_FOOT.COUNT, text, align: 'center', tooltip: state.at ? `Proposal ${state.at} of ${state.open} waiting to be accepted or declined.` : 'Press Next proposal to go to the first one.' },
        { kind: 'run', id: PROPOSAL_FOOT.NEXT, label: 'Next proposal', icon: 'chevron-right', align: 'center', actsOn: PROPOSAL_FOOT.COUNT, ...(state.noMore ? { result: 'No more' } : {}) },
    ];
}
/** Which of the footer's presses this is, or null for a press that is not one. */
export function proposalsFooterPress(item) {
    return item === PROPOSAL_FOOT.PREV ? 'prev' : item === PROPOSAL_FOOT.NEXT ? 'next' : null;
}
/** The next position in a walk over `count` stops: wraps at neither end; `null` from the end is "no more". */
export function stepWalk(at, count, direction) {
    if (count <= 0)
        return null;
    if (at === null)
        return direction === 'next' ? 1 : count;
    const next = direction === 'next' ? at + 1 : at - 1;
    return next < 1 || next > count ? null : next;
}
/**
 * A walk through the open proposals: the current id, where it stands (`at`, 1-based), the footer
 * items for it, and `press` for a footer press. The current one stays current across re-reads and
 * clears when it is answered. `scrollTo` is called with the id of a stop the walk moved to.
 */
export function useProposalWalk(proposals, options = {}) {
    const open = useMemo(() => proposals.filter((one) => one.status === 'pending' || one.status === 'stale'), [proposals]);
    const [current, setCurrent] = useState(null);
    const [noMore, setNoMore] = useState(false);
    useEffect(() => {
        if (current && !open.some((one) => one.id === current))
            setCurrent(null);
    }, [open, current]);
    const at = current ? open.findIndex((one) => one.id === current) + 1 || null : null;
    const scrollTo = options.scrollTo;
    const pick = useCallback((id) => {
        setCurrent(id);
        setNoMore(false);
        if (id && scrollTo)
            scrollTo(id);
        else if (id && typeof document !== 'undefined') {
            const node = document.querySelector(`[data-proposal="${CSS.escape(id)}"]`);
            node?.scrollIntoView({ block: 'center' });
            node?.focus({ preventScroll: true });
        }
    }, [scrollTo]);
    const press = useCallback((item) => {
        const direction = proposalsFooterPress(item);
        if (!direction)
            return null;
        const to = stepWalk(at, open.length, direction);
        if (to === null) {
            setNoMore(direction === 'next');
            return direction === 'next' ? 'No more proposals.' : 'This is the first proposal.';
        }
        pick(open[to - 1].id);
        return `Proposal ${to} of ${open.length}.`;
    }, [at, open, pick]);
    const footer = useMemo(() => proposalsFooter({ open: open.length, at, noMore }), [open.length, at, noMore]);
    return { current, at, open, footer, press, pick, noMore };
}
