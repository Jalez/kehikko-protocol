import { type Hunk } from './diff.js';
/**
 * A change somebody has PROPOSED to a text a module keeps — a markdown file, a
 * plain-text file, one document among several — which is a different thing from
 * a change that has been made (2.71.0).
 *
 * Pure, and shared by a module's server (which keeps and applies them), its
 * page (which draws and answers them) and its MCP door (where agents file them).
 * The file store is `kehikot-module-protocol/proposals/store`, the tools are in
 * `./door.ts`, the React parts are `kehikot-module-protocol/client/proposals`.
 * Design notes: docs/proposals.md.
 *
 * ## The model
 *
 * A proposal is about ONE text, named by `file` (whatever the module calls it:
 * a path, a deck slug, a part id). It quotes the base text it is about —
 * `find`, the whole text for `scope: 'file'` or a stretch that occurs exactly
 * once for `scope: 'range'` — and says what should stand there instead,
 * `replace`. It carries the hash of the whole base text as it was measured,
 * so that the text changing under it is detected rather than guessed around:
 * `measure` rebases a proposal whose quoted text is still there exactly once,
 * and marks the rest `stale` with the reason, and `apply` refuses a hash that
 * does not match. Nothing here ever writes a file; the module does, with the
 * text `apply` hands back.
 *
 * ## What happens to it
 *
 * `pending` → `accepted` (as proposed, edited by the person, or in part, by
 * hunk), `declined` (with an optional reason the agent is told), `withdrawn`
 * (by its filer, with the token it was handed) — or `stale`, which is pending
 * in a text that moved under it: it is shown, Accept is held back, Decline and
 * withdraw still work, and a `measure` that finds its words again returns it
 * to `pending`.
 */
export declare const PROPOSAL_STATUSES: readonly ["pending", "stale", "accepted", "declined", "withdrawn"];
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
/** Why a pending proposal is held: its quoted text was partly rewritten, is now there more than once, or is gone. */
export declare const STALE_REASONS: readonly ["changed", "ambiguous", "gone"];
export type StaleReason = (typeof STALE_REASONS)[number];
/** How an accepted proposal was taken: as proposed, with the person's edits, or only some of its hunks. */
export declare const ACCEPT_WAYS: readonly ["as-proposed", "edited", "partial"];
export type AcceptWay = (typeof ACCEPT_WAYS)[number];
/** Who filed a proposal: an agent (a session, named or not), a module of its own accord, or a person. */
export interface ProposalAuthor {
    kind: 'agent' | 'module' | 'person';
    /** A name for them: the agent name given, a module id, a person's name. Text, bounded, never trusted for anything. */
    name: string;
    /** The agent session it came from, when known: where a decision can be sent back to. */
    session?: string;
}
export interface Proposal {
    /** The module's name for it, minted when filed. Referred to twice: to draw it, to answer it. */
    id: string;
    /** Which text it is about, as the module names its texts. */
    file: string;
    /** The whole text (`file`) or a stretch of it that occurs exactly once (`range`). */
    scope: 'file' | 'range';
    /** The base text it is about: the whole text, or the quoted stretch. What leaves. */
    find: string;
    /** What goes there. Empty is a deletion, which is an ordinary proposal. */
    replace: string;
    /** `hashText` of the whole base text as it was last measured. */
    baseHash: string;
    /** One sentence from whoever proposed it, shown beside the change. */
    why: string;
    by: ProposalAuthor;
    createdAt: number;
    status: ProposalStatus;
    /** When the filer last revised it, and how many times. Absent: never. */
    revisedAt?: number;
    revisions?: number;
    /** With `status: 'stale'`: why, and the sentence for it. */
    stale?: {
        reason: StaleReason;
        said: string;
    };
    /** With a settled status: who answered it (the person's name, or `'person'`) and when. */
    decidedBy?: string;
    decidedAt?: number;
    /** With `status: 'declined'`: what the person said, when they said anything. */
    declinedReason?: string;
    /** With `status: 'accepted'`: how it was taken, and the text that was written where `find` stood (when not `replace`). */
    acceptedAs?: AcceptWay;
    final?: string;
    /**
     * The hash of the token the filer was handed, by which a later withdraw or revision proves it
     * is the same filer. Server-side only: `shown` strips it from everything a page or an agent reads.
     */
    tokenHash?: string;
}
/** A proposal as a page or an agent sees it: the same, without the filer's secret. */
export type ShownProposal = Omit<Proposal, 'tokenHash'>;
/** The most text one proposal carries on either side. Longer is edited directly, not proposed. */
export declare const PROPOSAL_MOST: {
    readonly text: 200000;
    readonly why: 400;
    readonly name: 60;
    readonly reason: 400;
    readonly file: 512;
    readonly id: 80;
    readonly token: 200;
    readonly settled: 60;
};
/** A 53-bit string hash (cyrb53), in hex: names things, secures nothing, and runs in a page as well as in a server. */
export declare function fingerprint(text: string, seed?: number): string;
/**
 * The hash a proposal carries of its base text: two independent fingerprints, so that a text
 * changing under a proposal is seen (what it is for) without a server-only hash function. It
 * detects change; it is not a proof of content and nothing here treats it as one.
 */
export declare function hashText(text: string): string;
/** A proposal's id: `p-` and twelve hex characters, minted when it is filed. */
export declare function mintProposalId(): string;
/** A secret the filer holds, and the hash that is all a store keeps of it. The token is shown once, in the filing answer. */
export declare function mintToken(): {
    token: string;
    hash: string;
};
export declare function hashToken(token: string): string;
/** Whether a token is the one a proposal was filed under. A proposal without a filer's hash is nobody's to withdraw. */
export declare function tokenFits(proposal: Pick<Proposal, 'tokenHash'>, token: string): boolean;
/** The same proposal without the filer's secret. */
export declare function shown<P extends Pick<Proposal, 'tokenHash'>>(proposal: P): Omit<P, 'tokenHash'>;
/** Where `find` stands in `text`, when it stands there exactly once; otherwise why not. */
export declare function locate(text: string, find: string): {
    ok: true;
    from: number;
    to: number;
} | {
    ok: false;
    reason: 'ambiguous' | 'gone';
};
export interface Filing {
    file: string;
    /** The whole text, for a proposal about all of it. */
    scope: 'file' | 'range';
    find: string;
    replace: string;
    why: string;
    by: ProposalAuthor;
    tokenHash?: string;
    now?: number;
    id?: string;
}
/**
 * A proposal over `text` as it is now, or why it cannot be filed, in a sentence
 * for the filer. The quoted text has to be in the text exactly once (`range`), or
 * be the text (`file`); a proposal that would change nothing is refused too.
 */
export declare function file(text: string, filing: Filing): {
    ok: true;
    proposal: Proposal;
} | {
    ok: false;
    why: string;
};
/** The sentence a stale proposal carries. */
export declare function staleSaid(reason: StaleReason, file: string): string;
/**
 * A pending (or stale) proposal measured against the text as it is NOW. The same
 * proposal when the hash still matches; rebased onto the new hash when its
 * quoted text is still there exactly once; otherwise `stale`, with why. A stale
 * proposal whose words are back is pending again. A settled proposal is returned
 * as it is. `text` null — the file is gone or unreadable — is `stale: gone`.
 */
export declare function measure(proposal: Proposal, text: string | null): Proposal;
/** Every proposal measured, in order. Settled ones pass through. */
export declare function measureAll(proposals: readonly Proposal[], read: (file: string) => string | null): Proposal[];
/**
 * The text with the proposal applied: `final` (the person's wording, or a
 * partial take) where given, else `replace`, in place of `find`. Refused, with
 * the reason, when the text is not the one the proposal was measured on, or the
 * quoted text is not there exactly once. Pure: the caller writes it.
 */
export declare function apply(text: string, proposal: Proposal, final?: string): {
    ok: true;
    text: string;
    from: number;
    to: number;
    written: string;
} | {
    ok: false;
    why: string;
    stale: boolean;
};
export type Decision = {
    kind: 'accept';
    by?: string;
    now?: number;
    final?: string;
    hunks?: readonly number[];
} | {
    kind: 'decline';
    by?: string;
    now?: number;
    reason?: string;
} | {
    kind: 'withdraw';
    now?: number;
};
/**
 * The proposal with a decision on it. Accept takes `final` (the person's own
 * wording) or `hunks` (the indexes of the hunks to take, a partial accept) or
 * neither (as proposed). Decline keeps the reason, trimmed and bounded. A
 * proposal that is not pending is refused, except that a stale one can still be
 * declined or withdrawn. Pure: the module applies the text (`apply`, with the
 * returned `final`) and writes it.
 */
export declare function decide(proposal: Proposal, decision: Decision): {
    ok: true;
    proposal: Proposal;
} | {
    ok: false;
    why: string;
};
/** The hunks a proposal is drawn as: what leaves in red, what arrives in green. */
export declare function proposalHunks(proposal: Pick<Proposal, 'find' | 'replace'>): Hunk[];
/** The one file's shape: a version, and the proposals, oldest first. */
export interface ProposalBook {
    version: 1;
    proposals: Proposal[];
}
/** How many settled proposals a book keeps, newest kept: the agent's "what became of mine". */
export declare const BOOK_KEEPS_SETTLED = 60;
export declare const emptyBook: () => ProposalBook;
/** A book as read from a file: anything that is not a list of proposals is an empty book. */
export declare function bookOf(value: unknown): ProposalBook;
/** The book with one proposal put in (by id: replaced where it is, else appended), settled ones beyond the bound forgotten. */
export declare function withProposal(book: ProposalBook, proposal: Proposal): ProposalBook;
/** The open proposals (pending and stale), oldest first; of one file when named. */
export declare function openOf(book: ProposalBook, file?: string): Proposal[];
/** The settled proposals, newest first. */
export declare function settledOf(book: ProposalBook, file?: string): Proposal[];
export declare function proposalById(book: ProposalBook, id: string): Proposal | null;
/** What became of a settled proposal, in a few words: `accepted`, `accepted with edits`, `declined: <reason>`. */
export declare function outcomeSaid(proposal: Pick<Proposal, 'status' | 'acceptedAs' | 'declinedReason' | 'stale'>): string;
/**
 * The line to tell the filer when a proposal is answered — what a module pushes
 * to the agent's session where it has a way to (its messages, its activity):
 * `Declined: <reason>` is the one agents most need to read before proposing again.
 */
export declare function decisionNews(proposal: Proposal): string;
/** One line of `list_proposals`: id, file, the change as old -> new (clipped), the reason, and the state. */
export declare function proposalLine(proposal: ShownProposal, most?: number): string;
/** How many open proposals there are, as a footer or a list head says it. */
export declare function countSaid(open: number): string;
