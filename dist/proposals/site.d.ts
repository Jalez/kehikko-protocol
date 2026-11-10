import { type Decision, type Filing, type Proposal, type ProposalBook, type ShownProposal } from './core.js';
/**
 * A module's proposals, kept and answered: the one set of operations its MCP door
 * (`./door.ts`), its page's routes and its tests all go through (2.71.0). Pure
 * over what the module hands it — a keeper for the book, a reader and a writer
 * for its texts — so a test runs it on a map and the module runs it on files
 * (`kehikot-module-protocol/proposals/store`).
 */
/** Where the book is kept: per project. The file store is `fileKeeper` in `/proposals/store`. */
export interface ProposalKeeper {
    read(project: string): ProposalBook;
    write(project: string, book: ProposalBook): void;
}
export interface ProposalSite {
    keeper: ProposalKeeper;
    /** The text named `file` in this project as it is NOW, or null when there is none. */
    text(project: string, file: string): string | null;
    /** Write a text: what Accept does. Without it a proposal can be filed and declined but never accepted. */
    write?(project: string, file: string, text: string, proposal: Proposal): {
        ok: true;
    } | {
        ok: false;
        why: string;
    };
    /** A proposal was answered or withdrawn: tell the filer where there is a way to (`decisionNews`), and the page. */
    onSettled?(project: string, proposal: Proposal): void;
    /** The book changed in any way: a page that subscribes is told. */
    onChanged?(project: string): void;
    now?(): number;
}
/** Every open proposal, measured against the texts as they are now (and the book moved on when that changed anything). */
export declare function openProposals(site: ProposalSite, project: string, file?: string): Proposal[];
/** What became of the settled ones, newest first. */
export declare function settledProposals(site: ProposalSite, project: string, file?: string): Proposal[];
/** One proposal by id, measured, or null. */
export declare function proposalOf(site: ProposalSite, project: string, id: string): Proposal | null;
/** The book with every open proposal measured; written back when any moved. */
export declare function measured(site: ProposalSite, project: string): ProposalBook;
/**
 * File a proposal over a text as it is now. Hands back the proposal as the
 * filer sees it and, when the filing is an agent's, the token that lets it
 * withdraw the proposal later. The same filer proposing again over the same
 * quoted text of the same file REVISES its pending proposal rather than filing
 * a second one.
 */
export declare function fileProposal(site: ProposalSite, project: string, filing: Omit<Filing, 'tokenHash' | 'id' | 'now'>): {
    ok: true;
    proposal: ShownProposal;
    token: string | null;
    revised: boolean;
} | {
    ok: false;
    why: string;
};
/**
 * The person's answer. Accept applies the text through `site.write` (refused in
 * words when the text moved, and nothing is written); decline keeps the reason.
 * The settled proposal is told to `onSettled`.
 */
export declare function decideProposal(site: ProposalSite, project: string, id: string, decision: Exclude<Decision, {
    kind: 'withdraw';
}>): {
    ok: true;
    proposal: ShownProposal;
    stale: false;
} | {
    ok: false;
    why: string;
    stale: boolean;
};
/** The filer takes it back, proving itself with the token it was handed. */
export declare function withdrawProposal(site: ProposalSite, project: string, id: string, token: string): {
    ok: true;
    proposal: ShownProposal;
} | {
    ok: false;
    why: string;
};
/** A keeper over a map, for tests and for a module that keeps its book elsewhere. */
export declare function memoryKeeper(): ProposalKeeper & {
    books: Map<string, ProposalBook>;
};
