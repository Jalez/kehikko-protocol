import { type ReactElement, type ReactNode } from 'react';
import type { FooterItemInput } from '../footer.js';
import { type ShownProposal } from '../proposals/core.js';
/**
 * The React half of proposals (2.71.0): a proposed change drawn inline as a
 * diff with the person's answers under it, the list of what is waiting, a walk
 * through them, and the footer line that says how many there are with Previous
 * and Next beside it. Theme-aware through the same tokens as `Cover`
 * (`--foreground`, `--muted-foreground`, `--border`, `--accent`, `--ring`, with
 * `.dark` on `<html>`), keyboard reachable throughout, and every string a
 * module or an agent wrote is rendered as text. Design notes: docs/proposals.md.
 */
export declare const PROPOSALS_STYLE_ID = "kehikot-proposals-style";
export declare const PROPOSALS_CSS = "\n.kehikot-proposal{box-sizing:border-box;margin:8px 0;border:1px solid var(--border,currentColor);border-left:3px solid var(--kehikot-proposal-edge,oklch(0.7 0.15 250));border-radius:6px;padding:8px 10px;font:400 13px/1.5 ui-sans-serif,system-ui,sans-serif;color:var(--foreground,inherit);background:var(--card,transparent)}\n.kehikot-proposal[data-current=true]{outline:2px solid var(--ring,currentColor);outline-offset:1px}\n.kehikot-proposal[data-status=stale]{border-left-color:var(--kehikot-proposal-stale,oklch(0.75 0.15 70))}\n.kehikot-proposal[data-status=accepted]{border-left-color:var(--kehikot-proposal-ok,oklch(0.65 0.17 150))}\n.kehikot-proposal[data-status=declined],.kehikot-proposal[data-status=withdrawn]{border-left-color:var(--muted-foreground,currentColor);opacity:.8}\n.kehikot-proposal header{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;margin:0 0 6px}\n.kehikot-proposal header b{font-weight:600}\n.kehikot-proposal header span{color:var(--muted-foreground,inherit);font-size:.92em}\n.kehikot-proposal p{margin:0 0 6px;overflow-wrap:anywhere}\n.kehikot-proposal p[data-stale]{color:var(--kehikot-proposal-stale,oklch(0.6 0.15 70))}\n.kehikot-proposal .kehikot-diff{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px}\n.kehikot-proposal .kehikot-diff li{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;align-items:start}\n.kehikot-proposal .kehikot-diff li[data-whole=true]{grid-template-columns:1fr}\n.kehikot-proposal .kehikot-diff input{margin:4px 0 0}\n.kehikot-proposal .kehikot-diff pre{margin:0;padding:4px 6px;border-radius:4px;white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}\n.kehikot-proposal .kehikot-diff del{display:block;text-decoration:none;background:var(--kehikot-proposal-old,oklch(0.93 0.05 25));color:var(--kehikot-proposal-old-text,oklch(0.4 0.15 25))}\n.kehikot-proposal .kehikot-diff ins{display:block;text-decoration:none;background:var(--kehikot-proposal-new,oklch(0.93 0.06 150));color:var(--kehikot-proposal-new-text,oklch(0.35 0.12 150))}\n.dark .kehikot-proposal .kehikot-diff del{background:var(--kehikot-proposal-old,oklch(0.3 0.08 25));color:var(--kehikot-proposal-old-text,oklch(0.85 0.08 25))}\n.dark .kehikot-proposal .kehikot-diff ins{background:var(--kehikot-proposal-new,oklch(0.3 0.08 150));color:var(--kehikot-proposal-new-text,oklch(0.85 0.08 150))}\n.kehikot-proposal .kehikot-diff del:empty::before,.kehikot-proposal .kehikot-diff ins:empty::before{content:\"(nothing)\";opacity:.6;font-style:italic}\n.kehikot-proposal .kehikot-diff li[data-skipped=true] ins{opacity:.45}\n.kehikot-proposal textarea{box-sizing:border-box;width:100%;min-height:5em;margin:6px 0;padding:6px;border:1px solid var(--border,currentColor);border-radius:4px;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;color:inherit;background:var(--background,transparent)}\n.kehikot-proposal input[type=text]{box-sizing:border-box;flex:1 1 12em;min-width:0;padding:3px 6px;border:1px solid var(--border,currentColor);border-radius:4px;font:inherit;color:inherit;background:var(--background,transparent)}\n.kehikot-proposal .kehikot-acts{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px}\n.kehikot-proposal button{font:inherit;color:var(--foreground,inherit);background:transparent;border:1px solid var(--border,currentColor);border-radius:6px;padding:3px 10px;cursor:pointer}\n.kehikot-proposal button[data-primary=true]{border-color:var(--primary,currentColor);background:var(--primary,transparent);color:var(--primary-foreground,inherit)}\n.kehikot-proposal button:hover{background:var(--accent,transparent)}\n.kehikot-proposal button[data-primary=true]:hover{opacity:.9}\n.kehikot-proposal button:disabled{opacity:.5;cursor:default}\n.kehikot-proposal button:focus-visible,.kehikot-proposal input:focus-visible,.kehikot-proposal textarea:focus-visible{outline:2px solid var(--ring,currentColor);outline-offset:2px}\n.kehikot-proposal .kehikot-said{color:var(--muted-foreground,inherit);font-size:.92em;margin:6px 0 0}\n.kehikot-proposals{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px;font:400 13px/1.4 ui-sans-serif,system-ui,sans-serif}\n.kehikot-proposals li button{display:flex;gap:8px;align-items:baseline;width:100%;text-align:left;font:inherit;color:var(--foreground,inherit);background:transparent;border:1px solid transparent;border-radius:6px;padding:4px 8px;cursor:pointer}\n.kehikot-proposals li button:hover{background:var(--accent,transparent)}\n.kehikot-proposals li button[aria-current=true]{border-color:var(--ring,currentColor)}\n.kehikot-proposals li button:focus-visible{outline:2px solid var(--ring,currentColor);outline-offset:1px}\n.kehikot-proposals li b{font-weight:600;white-space:nowrap}\n.kehikot-proposals li span{color:var(--muted-foreground,inherit);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}\n.kehikot-proposals li em{color:var(--muted-foreground,inherit);font-style:normal;font-size:.92em;white-space:nowrap;margin-left:auto}\n";
/** The words on the buttons and labels, in one place, for a module that mirrors them in a header or a tooltip. */
export declare const PROPOSAL_WORDS: {
    readonly accept: "Accept";
    readonly acceptChosen: "Accept chosen";
    readonly acceptEdited: "Accept as edited";
    readonly decline: "Decline";
    readonly declineWithReason: "Decline with reason";
    readonly edit: "Edit, then accept";
    readonly cancel: "Cancel";
    readonly reasonLabel: "Why (the agent reads this)";
    readonly reasonPlaceholder: "Why not — the agent reads this before proposing again";
    readonly editLabel: "The text to write instead";
    readonly hunkLabel: (n: number) => string;
    readonly proposedBy: (name: string) => string;
    readonly revised: (n: number) => string;
    readonly whole: "The whole text is rewritten.";
};
export interface ProposalViewProps {
    proposal: ShownProposal;
    /** Accept: as proposed (`{}`), with the person's own text (`final`), or only the chosen hunks (`hunks`, indexes). */
    onAccept?: (take: {
        final?: string;
        hunks?: number[];
    }) => void | Promise<unknown>;
    /** Decline, with the reason the person typed, or none. */
    onDecline?: (reason: string) => void | Promise<unknown>;
    /** Offer "Edit, then accept". Default true. */
    allowEdit?: boolean;
    /** Offer a checkbox per hunk, so part of the change can be taken. Default true. */
    allowPartial?: boolean;
    /** While an answer is in flight: the buttons wait. */
    busy?: boolean;
    /** Drawn with the walk's ring around it. */
    current?: boolean;
    /** A sentence under the buttons: what the last press came to. */
    said?: string | null;
    /** Draw the diff only: no header line, no reason. */
    bare?: boolean;
    children?: ReactNode;
}
/**
 * One proposal, inline: who proposes what and why, the change as hunks (red
 * leaves, green arrives; with `allowPartial`, a checkbox per hunk), and the
 * answers. A settled proposal is drawn with its outcome and no buttons. A stale
 * one says why and offers Decline only.
 */
export declare function ProposalView({ proposal, onAccept, onDecline, allowEdit, allowPartial, busy, current, said, bare, children }: ProposalViewProps): ReactElement;
export interface ProposalListProps {
    proposals: readonly ShownProposal[];
    current?: string | null;
    onPick?: (id: string) => void;
    /** With nothing to list: the sentence, or nothing. Default `No proposed changes`. */
    empty?: string | null;
}
/** What is waiting, one line each: the file, the reason, the state; the current one marked. */
export declare function ProposalList({ proposals, current, onPick, empty }: ProposalListProps): ReactElement;
/** The ids of the footer's items. */
export declare const PROPOSAL_FOOT: {
    readonly COUNT: "proposals";
    readonly PREV: "proposal-prev";
    readonly NEXT: "proposal-next";
};
export interface ProposalsFooterState {
    /** How many are open (pending or stale). */
    open: number;
    /** Which one is current, 1-based, or null when none is. */
    at?: number | null;
    /** Next just found no more. */
    noMore?: boolean;
}
/**
 * The footer items for proposals: the count (`3 proposed changes`, or `Proposal 2 of 3` while one is
 * current), with Previous and Next beside it acting on it. Nothing when none is open — a footer
 * says what is going on, and nothing is. Pure; a module spreads it into its own footer.
 */
export declare function proposalsFooter(state: ProposalsFooterState): FooterItemInput[];
/** Which of the footer's presses this is, or null for a press that is not one. */
export declare function proposalsFooterPress(item: string): 'prev' | 'next' | null;
/** The next position in a walk over `count` stops: wraps at neither end; `null` from the end is "no more". */
export declare function stepWalk(at: number | null, count: number, direction: 'prev' | 'next'): number | null;
/**
 * A walk through the open proposals: the current id, where it stands (`at`, 1-based), the footer
 * items for it, and `press` for a footer press. The current one stays current across re-reads and
 * clears when it is answered. `scrollTo` is called with the id of a stop the walk moved to.
 */
export declare function useProposalWalk(proposals: readonly ShownProposal[], options?: {
    scrollTo?: (id: string) => void;
}): {
    current: string | null;
    at: number | null;
    open: ShownProposal[];
    footer: FooterItemInput[];
    press: (item: string) => string | null;
    pick: (id: string | null) => void;
    noMore: boolean;
};
