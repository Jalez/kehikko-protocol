import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'

import { TICKET_HEADER, TICKET_REFUSED } from '../page.js'

/**
 * The write ticket: minted per process, printed into the page, checked on every write. Loopback
 * fences the machine, not the programs on it. See docs/module-plumbing.md.
 */

/** A new ticket. Call it once, at module scope, so it dies with the process. */
export function mintTicket(): string {
  return randomUUID()
}

/**
 * Whether the ticket a request carried is the one this process minted.
 * Constant-time: both sides are hashed first, so neither the length nor a
 * matching prefix of the real ticket shows in how long the answer took.
 */
export function sameTicket(carried: string | null | undefined, minted: string): boolean {
  if (typeof carried !== 'string' || !carried) return false
  const digest = (text: string) => createHash('sha256').update(text).digest()
  return timingSafeEqual(digest(carried), digest(minted))
}

/** The ticket out of a request's headers, which node hands over as a string, an array, or nothing. */
export function ticketOf(headers: Record<string, string | string[] | undefined>): string | null {
  const value = headers[TICKET_HEADER]
  if (typeof value === 'string') return value || null
  if (Array.isArray(value)) return value[0] || null
  return null
}

/** What a write without this process's ticket is told. */
export const TICKET_REFUSAL = 'That did not come from this app’s own page, or the page is older than the server answering it.'

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
export function refuseTicket(
  carried: string | null | undefined,
  minted: string,
  error: string = TICKET_REFUSAL,
): { status: 403; body: { ok: false; error: string; refused: typeof TICKET_REFUSED } } | null {
  if (sameTicket(carried, minted)) return null
  return { status: 403, body: { ok: false, error, refused: TICKET_REFUSED } }
}
