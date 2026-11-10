import { createElement, useCallback, useEffect, useInsertionEffect, useMemo, useState } from 'react';
import { countSaid, outcomeSaid, proposalHunks } from '../proposals/core.js';
/**
 * The React half of proposals (2.71.0): a proposed change drawn inline as a
 * diff with the person's answers under it, the list of what is waiting, a walk
 * through them, and the footer line that says how many there are with Previous
 * and Next beside it. Theme-aware through the same tokens as `Cover`
 * (`--foreground`, `--muted-foreground`, `--border`, `--accent`, `--ring`, with
 * `.dark` on `<html>`), keyboard reachable throughout, and every string a
 * module or an agent wrote is rendered as text. Design notes: docs/proposals.md.
 */
export const PROPOSALS_STYLE_ID = 'kehikot-proposals-style';
export const PROPOSALS_CSS = `
.kehikot-proposal{box-sizing:border-box;margin:8px 0;border:1px solid var(--border,currentColor);border-left:3px solid var(--kehikot-proposal-edge,oklch(0.7 0.15 250));border-radius:6px;padding:8px 10px;font:400 13px/1.5 ui-sans-serif,system-ui,sans-serif;color:var(--foreground,inherit);background:var(--card,transparent)}
.kehikot-proposal[data-current=true]{outline:2px solid var(--ring,currentColor);outline-offset:1px}
.kehikot-proposal[data-status=stale]{border-left-color:var(--kehikot-proposal-stale,oklch(0.75 0.15 70))}
.kehikot-proposal[data-status=accepted]{border-left-color:var(--kehikot-proposal-ok,oklch(0.65 0.17 150))}
.kehikot-proposal[data-status=declined],.kehikot-proposal[data-status=withdrawn]{border-left-color:var(--muted-foreground,currentColor);opacity:.8}
.kehikot-proposal header{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;margin:0 0 6px}
.kehikot-proposal header b{font-weight:600}
.kehikot-proposal header span{color:var(--muted-foreground,inherit);font-size:.92em}
.kehikot-proposal p{margin:0 0 6px;overflow-wrap:anywhere}
.kehikot-proposal p[data-stale]{color:var(--kehikot-proposal-stale,oklch(0.6 0.15 70))}
.kehikot-proposal .kehikot-diff{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px}
.kehikot-proposal .kehikot-diff li{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;align-items:start}
.kehikot-proposal .kehikot-diff li[data-whole=true]{grid-template-columns:1fr}
.kehikot-proposal .kehikot-diff input{margin:4px 0 0}
.kehikot-proposal .kehikot-diff pre{margin:0;padding:4px 6px;border-radius:4px;white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}
.kehikot-proposal .kehikot-diff del{display:block;text-decoration:none;background:var(--kehikot-proposal-old,oklch(0.93 0.05 25));color:var(--kehikot-proposal-old-text,oklch(0.4 0.15 25))}
.kehikot-proposal .kehikot-diff ins{display:block;text-decoration:none;background:var(--kehikot-proposal-new,oklch(0.93 0.06 150));color:var(--kehikot-proposal-new-text,oklch(0.35 0.12 150))}
.dark .kehikot-proposal .kehikot-diff del{background:var(--kehikot-proposal-old,oklch(0.3 0.08 25));color:var(--kehikot-proposal-old-text,oklch(0.85 0.08 25))}
.dark .kehikot-proposal .kehikot-diff ins{background:var(--kehikot-proposal-new,oklch(0.3 0.08 150));color:var(--kehikot-proposal-new-text,oklch(0.85 0.08 150))}
.kehikot-proposal .kehikot-diff del:empty::before,.kehikot-proposal .kehikot-diff ins:empty::before{content:"(nothing)";opacity:.6;font-style:italic}
.kehikot-proposal .kehikot-diff li[data-skipped=true] ins{opacity:.45}
.kehikot-proposal textarea{box-sizing:border-box;width:100%;min-height:5em;margin:6px 0;padding:6px;border:1px solid var(--border,currentColor);border-radius:4px;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;color:inherit;background:var(--background,transparent)}
.kehikot-proposal input[type=text]{box-sizing:border-box;flex:1 1 12em;min-width:0;padding:3px 6px;border:1px solid var(--border,currentColor);border-radius:4px;font:inherit;color:inherit;background:var(--background,transparent)}
.kehikot-proposal .kehikot-acts{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px}
.kehikot-proposal button{font:inherit;color:var(--foreground,inherit);background:transparent;border:1px solid var(--border,currentColor);border-radius:6px;padding:3px 10px;cursor:pointer}
.kehikot-proposal button[data-primary=true]{border-color:var(--primary,currentColor);background:var(--primary,transparent);color:var(--primary-foreground,inherit)}
.kehikot-proposal button:hover{background:var(--accent,transparent)}
.kehikot-proposal button[data-primary=true]:hover{opacity:.9}
.kehikot-proposal button:disabled{opacity:.5;cursor:default}
.kehikot-proposal button:focus-visible,.kehikot-proposal input:focus-visible,.kehikot-proposal textarea:focus-visible{outline:2px solid var(--ring,currentColor);outline-offset:2px}
.kehikot-proposal .kehikot-said{color:var(--muted-foreground,inherit);font-size:.92em;margin:6px 0 0}
.kehikot-proposals{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px;font:400 13px/1.4 ui-sans-serif,system-ui,sans-serif}
.kehikot-proposals li button{display:flex;gap:8px;align-items:baseline;width:100%;text-align:left;font:inherit;color:var(--foreground,inherit);background:transparent;border:1px solid transparent;border-radius:6px;padding:4px 8px;cursor:pointer}
.kehikot-proposals li button:hover{background:var(--accent,transparent)}
.kehikot-proposals li button[aria-current=true]{border-color:var(--ring,currentColor)}
.kehikot-proposals li button:focus-visible{outline:2px solid var(--ring,currentColor);outline-offset:1px}
.kehikot-proposals li b{font-weight:600;white-space:nowrap}
.kehikot-proposals li span{color:var(--muted-foreground,inherit);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.kehikot-proposals li em{color:var(--muted-foreground,inherit);font-style:normal;font-size:.92em;white-space:nowrap;margin-left:auto}
`;
function style() {
    if (typeof document === 'undefined' || document.getElementById(PROPOSALS_STYLE_ID))
        return;
    const sheet = document.createElement('style');
    sheet.id = PROPOSALS_STYLE_ID;
    sheet.textContent = PROPOSALS_CSS;
    document.head.appendChild(sheet);
}
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
};
/**
 * One proposal, inline: who proposes what and why, the change as hunks (red
 * leaves, green arrives; with `allowPartial`, a checkbox per hunk), and the
 * answers. A settled proposal is drawn with its outcome and no buttons. A stale
 * one says why and offers Decline only.
 */
export function ProposalView({ proposal, onAccept, onDecline, allowEdit = true, allowPartial = true, busy = false, current = false, said = null, bare = false, children }) {
    useInsertionEffect(style, []);
    const hunks = useMemo(() => proposalHunks(proposal), [proposal.find, proposal.replace]);
    const [mode, setMode] = useState('answer');
    const [reason, setReason] = useState('');
    const [draft, setDraft] = useState(proposal.replace);
    const [skipped, setSkipped] = useState(() => new Set());
    useEffect(() => {
        setMode('answer');
        setReason('');
        setDraft(proposal.replace);
        setSkipped(new Set());
    }, [proposal.id, proposal.revisedAt]);
    const open = proposal.status === 'pending';
    const stale = proposal.status === 'stale';
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
    const head = bare
        ? null
        : createElement('header', null, createElement('b', null, proposal.file), createElement('span', null, PROPOSAL_WORDS.proposedBy(proposal.by.name)), proposal.revisions ? createElement('span', null, PROPOSAL_WORDS.revised(proposal.revisions)) : null, !open && !stale ? createElement('span', { 'data-outcome': proposal.status }, outcomeSaid(proposal)) : null);
    const why = bare ? null : createElement('p', null, proposal.why);
    const held = stale && proposal.stale ? createElement('p', { 'data-stale': '', role: 'status' }, proposal.stale.said) : null;
    const diff = mode === 'edit'
        ? createElement('label', null, createElement('span', { className: 'kehikot-said' }, PROPOSAL_WORDS.editLabel), createElement('textarea', { value: draft, onChange: (event) => setDraft(event.target.value), disabled: busy, 'aria-label': PROPOSAL_WORDS.editLabel }))
        : createElement('ul', { className: 'kehikot-diff', 'aria-label': whole ? PROPOSAL_WORDS.whole : 'The change' }, ...(whole
            ? [createElement('li', { key: 'whole', 'data-whole': 'true' }, createElement('pre', null, createElement('del', null, proposal.find), createElement('ins', null, proposal.replace)))]
            : (hunks.length ? hunks : [{ oldFrom: 0, oldTo: 0, newFrom: 0, newTo: 0, oldText: proposal.find, newText: proposal.replace }]).map((one, i) => createElement('li', { key: i, 'data-skipped': skipped.has(i) ? 'true' : 'false', ...(partial ? {} : { 'data-whole': 'true' }) }, partial && open
                ? createElement('input', { type: 'checkbox', checked: !skipped.has(i), onChange: () => toggle(i), disabled: busy, 'aria-label': PROPOSAL_WORDS.hunkLabel(i + 1) })
                : null, createElement('pre', null, createElement('del', null, one.oldText), createElement('ins', null, one.newText))))));
    const acts = [];
    if (open && onAccept) {
        const label = mode === 'edit' ? PROPOSAL_WORDS.acceptEdited : partial && chosen.length !== hunks.length ? PROPOSAL_WORDS.acceptChosen : PROPOSAL_WORDS.accept;
        acts.push(createElement('button', { key: 'accept', type: 'button', 'data-primary': 'true', onClick: accept, disabled: busy || (partial && chosen.length === 0) }, label));
    }
    if ((open || stale) && onDecline) {
        if (mode === 'reason') {
            acts.push(createElement('input', {
                key: 'reason',
                type: 'text',
                value: reason,
                placeholder: PROPOSAL_WORDS.reasonPlaceholder,
                'aria-label': PROPOSAL_WORDS.reasonLabel,
                autoFocus: true,
                disabled: busy,
                onChange: (event) => setReason(event.target.value),
                onKeyDown: (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        decline();
                    }
                },
            }), createElement('button', { key: 'decline', type: 'button', onClick: decline, disabled: busy }, PROPOSAL_WORDS.decline));
        }
        else {
            acts.push(createElement('button', { key: 'decline', type: 'button', onClick: decline, disabled: busy }, PROPOSAL_WORDS.decline));
            acts.push(createElement('button', { key: 'reason', type: 'button', onClick: () => setMode('reason'), disabled: busy }, PROPOSAL_WORDS.declineWithReason));
        }
    }
    if (open && onAccept && allowEdit && mode !== 'edit' && mode !== 'reason') {
        acts.push(createElement('button', { key: 'edit', type: 'button', onClick: () => setMode('edit'), disabled: busy }, PROPOSAL_WORDS.edit));
    }
    if (mode !== 'answer') {
        acts.push(createElement('button', { key: 'cancel', type: 'button', onClick: () => setMode('answer'), disabled: busy }, PROPOSAL_WORDS.cancel));
    }
    return createElement('section', { className: 'kehikot-proposal', 'data-proposal': proposal.id, 'data-status': proposal.status, 'data-current': current ? 'true' : 'false', 'aria-label': `Proposal on ${proposal.file}`, tabIndex: -1 }, head, why, held, diff, acts.length ? createElement('div', { className: 'kehikot-acts', role: 'group', 'aria-label': 'Answer' }, ...acts) : null, said ? createElement('p', { className: 'kehikot-said', role: 'status' }, said) : null, children);
}
/** What is waiting, one line each: the file, the reason, the state; the current one marked. */
export function ProposalList({ proposals, current = null, onPick, empty = countSaid(0) }) {
    useInsertionEffect(style, []);
    if (!proposals.length)
        return createElement('p', { className: 'kehikot-said', role: 'status' }, empty ?? '');
    return createElement('ul', { className: 'kehikot-proposals', 'aria-label': countSaid(proposals.length) }, ...proposals.map((one) => createElement('li', { key: one.id }, createElement('button', { type: 'button', onClick: () => onPick?.(one.id), 'aria-current': one.id === current ? 'true' : undefined, 'data-status': one.status }, createElement('b', null, one.file), createElement('span', null, one.why), createElement('em', null, one.status === 'pending' ? one.by.name : outcomeSaid(one))))));
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
