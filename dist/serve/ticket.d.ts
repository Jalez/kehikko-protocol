import { TICKET_REFUSED } from '../page.js';
/**
 * The write ticket: minted per process, printed into the page, checked on every write. Loopback
 * fences the machine, not the programs on it. See docs/module-plumbing.md.
 */
/** A new ticket. Call it once, at module scope, so it dies with the process. */
export declare function mintTicket(): string;
/**
 * Whether the ticket a request carried is the one this process minted.
 * Constant-time: both sides are hashed first, so neither the length nor a
 * matching prefix of the real ticket shows in how long the answer took.
 */
export declare function sameTicket(carried: string | null | undefined, minted: string): boolean;
/** The ticket out of a request's headers, which node hands over as a string, an array, or nothing. */
export declare function ticketOf(headers: Record<string, string | string[] | undefined>): string | null;
/** What a write without this process's ticket is told. */
export declare const TICKET_REFUSAL = "That did not come from this app\u2019s own page, or the page is older than the server answering it.";
/**
 * The refusal for a write that did not carry this process's ticket, or `null`
 * when it did:
 *
 *     const no = refuseTicket(ticket, TICKET)
 *     if (no) return no
 *
 * The body is marked (`refused: 'ticket'`) so the page's `ask()` can tell a
 * page older than its server from any other refusal, and reload.
 */
export declare function refuseTicket(carried: string | null | undefined, minted: string, error?: string): {
    status: 403;
    body: {
        ok: false;
        error: string;
        refused: typeof TICKET_REFUSED;
    };
} | null;
