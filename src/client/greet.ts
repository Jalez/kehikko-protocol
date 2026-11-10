import { ORIGINS_ELEMENT, originAmong } from '../page.js'

/**
 * Who may greet this page: the two rules `connect` and the page's error reporter (`errors.ts`) both
 * hold a greeting to. Apart from `connect.ts` so the reporter, which the mailbox installs, needs
 * nothing that imports the mailbox. Re-exported from `connect.ts`, where they were.
 */

/**
 * The origins this page was told it may be framed by: the island its server printed
 * (`ORIGINS_ELEMENT`, the list sent as `frame-ancestors`), or `null` for a document that carries
 * none — one this package's doors did not serve. Read on every greeting; it is one element.
 */
export function pageOrigins(): string[] | null {
  if (typeof document === 'undefined') return null
  const text = document.getElementById(ORIGINS_ELEMENT)?.textContent
  if (!text) return null
  try {
    const parsed: unknown = JSON.parse(text)
    return Array.isArray(parsed) ? parsed.filter((one): one is string => typeof one === 'string') : null
  } catch {
    return null
  }
}

/**
 * Whether a greeting may be answered: whether the window that sent it is one this page may be
 * framed by. `origins` is who that is; `null` is a page that was never told, which answers as it
 * always has. Otherwise a greeting counts from an origin on the list, from the page's own origin,
 * from the page's own window, and with no origin on it at all — an event the page's own script
 * made, since a message from another window always carries one. Pure.
 */
export function mayGreet(
  greeting: { origin?: string | null; source?: unknown },
  origins: readonly string[] | null,
  self: { window?: unknown; origin?: string | null } = {},
): boolean {
  if (origins === null) return true
  const from = greeting.origin ?? ''
  if (from === '') return true
  if (self.window != null && greeting.source === self.window) return true
  if (from !== 'null' && from === self.origin) return true
  return originAmong(from, origins)
}

