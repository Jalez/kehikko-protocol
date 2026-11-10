import { type Proposal, type ProposalAuthor } from './core.js';
/**
 * The follow-up digest (2.75.0): an agent that proposed changes to a text hears what became of them
 * ONCE, when the person has finished answering them, instead of one message per decision. When the
 * last open proposal from one filer at one text is settled, and nothing more is decided for a quiet
 * while (`DIGEST_QUIET_MS`), the filer is sent one summary (`digestNews`):
 *
 *     Your 5 proposed changes to main.tex were answered: 3 accepted (1 with edits), 2 declined: "too long"; "off topic".
 *
 * Pure words plus a small scheduler (`proposalDigester`) a module wires to `ProposalSite.onSettled`
 * and sends with `messages.notify` (or however it reaches the filer's session). Design notes:
 * docs/proposals.md.
 */
/** How long after the last decision the digest waits for more, in ms: a burst of reviewing is one message. */
export declare const DIGEST_QUIET_MS = 30000;
/** How many decline reasons a digest quotes; more are counted. */
export declare const DIGEST_REASONS_MOST = 5;
/** One filer: its session when known, else its kind and name. The same filer at the same text is one digest. */
export declare const filerKey: (by: ProposalAuthor) => string;
/**
 * The one summary for a filer's settled proposals at one text, or `''` when none was answered by the
 * person (withdrawn ones are the filer's own act and are not reported back). `file` is the text's name
 * as the module says it (`shortPath` from the protocol keeps a long one short).
 */
export declare function digestNews(settled: readonly Proposal[], file: string): string;
/** One digest ready to send: whom it is for, about which text, the proposals it covers, and the words. */
export interface ProposalDigest {
    project: string;
    file: string;
    by: ProposalAuthor;
    proposals: Proposal[];
    text: string;
}
export interface ProposalDigesterOptions {
    /** Send one digest (or, with `each`, one decision's line): `messages.notify` to the filer's session, typically. */
    send(digest: ProposalDigest): void | Promise<void>;
    /**
     * The open (pending or stale) proposals at a text now — `openProposals(site, project, file)`. A digest
     * waits while any of them is the same filer's.
     */
    open(project: string, file: string): readonly Proposal[];
    /** Default `DIGEST_QUIET_MS`. */
    quietMs?: number;
    /** Also send each decision on its own (`decisionNews`) as it is made. Off by default: the digest says them. */
    each?: boolean;
    /** Timers, injected by the tests. */
    setTimer?: (run: () => void, ms: number) => unknown;
    clearTimer?: (timer: unknown) => void;
}
export interface ProposalDigester {
    /** Wire to `ProposalSite.onSettled`: a proposal was answered or withdrawn. */
    settled(project: string, proposal: Proposal): void;
    /** Send every digest whose filer has nothing open now, without waiting (a module shutting down). */
    flush(): Promise<void>;
    /** How many digests are waiting. */
    waiting(): number;
    stop(): void;
}
/**
 * The scheduler: collects each filer's settled proposals per text, and when the filer has nothing open
 * there any more and `quietMs` passed since the last decision, sends ONE digest (`digestNews`). A new
 * decision in the meantime starts the quiet again; a new proposal filed meanwhile holds the digest until
 * that one is settled too. Proposals by the person themselves are never reported back.
 *
 *     const digester = proposalDigester({
 *       open: (project, file) => openProposals(site, project, file),
 *       send: ({ by, text }) => notifyFiler(by.session, text), // messages.notify with the filer's token
 *     })
 *     const site: ProposalSite = { ..., onSettled: (project, proposal) => digester.settled(project, proposal) }
 */
export declare function proposalDigester(options: ProposalDigesterOptions): ProposalDigester;
