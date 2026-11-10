import { type ReactElement, type ReactNode } from 'react';
import type { FooterItemInput } from '../footer.js';
import { type ShownProposal } from '../proposals/core.js';
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
    readonly change: "The change";
    readonly answer: "Answer";
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
    className?: string;
    children?: ReactNode;
}
/**
 * One proposal, inline: who proposes what and why, the change as hunks (red
 * leaves, green arrives; with `allowPartial`, a checkbox per hunk), and the
 * answers. A settled proposal is drawn with its outcome and no buttons. A stale
 * one says why and offers Decline only. The diff folds (Collapsible) once a
 * proposal is settled, so a list of outcomes stays short.
 */
export declare function ProposalView({ proposal, onAccept, onDecline, allowEdit, allowPartial, busy, current, said, bare, className, children }: ProposalViewProps): ReactElement;
export interface ProposalListProps {
    proposals: readonly ShownProposal[];
    current?: string | null;
    onPick?: (id: string) => void;
    /** With nothing to list: the sentence, or nothing. Default `No proposed changes`. */
    empty?: string | null;
    /** The list's height when it scrolls (a ScrollArea); default: as tall as its lines. */
    className?: string;
}
/** What is waiting, one line each: the file, the reason, the state; the current one marked; separators between. */
export declare function ProposalList({ proposals, current, onPick, empty, className }: ProposalListProps): ReactElement;
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
