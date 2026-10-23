import { z } from 'zod'
import { LIMITS } from './limits.js'
import { MODULE_ID } from './ids.js'

/**
 * 2.16.0. A web address handed to the canvas: a page somebody wants shown that is not a tracker ref
 * — a design document, a deployed preview, a dashboard, a pipeline log. A module asks with
 * `address.open`; whichever module on the kehikko shows pages (`REACTS_TO.address`) opens it.
 * Design notes: docs/wire.md (`contextSchema.address`) and docs/methods.md (`address.open`).
 */

/**
 * Why an address was handed over. `show`: open it, now. Open to extension: a module meeting a word
 * it does not know reads `show`.
 */
export const ADDRESS_INTENTS = ['show'] as const
export type AddressIntent = (typeof ADDRESS_INTENTS)[number]

/**
 * The hosts an `http:` address may name: this machine, by name or by loopback number. Everything
 * else is `https:` or nothing. Compared against `URL.hostname`, which spells IPv6 in brackets.
 */
export const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'] as const

/**
 * Why a string is not an address a module may hand the canvas, as a sentence for whoever sent it, or
 * `null` when it is one. The rules, all refusals and none a repair: a repaired address is a
 * different claim.
 *
 * - at most `LIMITS.URL` characters, with no whitespace or control character anywhere;
 * - written as an absolute `https://` address, or `http://` to `localhost`, `127.0.0.1` or `[::1]`
 *   (`LOOPBACK_HOSTS`) — so never `javascript:`, `data:`, `file:`, `blob:` or anything else;
 * - no user name or password in it (`https://user:secret@host/`): an address travels to every
 *   module on the canvas, and a credential in it would too.
 */
export function addressRefusal(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return 'An address is a non-empty string.'
  if (value.length > LIMITS.URL) return `An address is at most ${LIMITS.URL} characters.`
  if (/[\u0000-\u0020\u007f-\u009f\u2028\u2029]/.test(value)) return 'An address has no spaces or control characters in it.'
  if (!/^https?:\/\//.test(value)) return 'An address is written https://… (or http:// to this machine).'
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return 'That is not an address a browser could open.'
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'An address is https: (or http: to this machine).'
  if (url.protocol === 'http:' && !(LOOPBACK_HOSTS as readonly string[]).includes(url.hostname)) {
    return 'An http: address names this machine (localhost, 127.0.0.1 or [::1]); anywhere else is https:.'
  }
  if (url.username !== '' || url.password !== '') return 'An address carries no user name or password.'
  if (url.hostname === '') return 'An address names a host.'
  return null
}

/** Whether a string is an address a module may hand the canvas (`addressRefusal` is `null`). */
export function isWebAddress(value: unknown): value is string {
  return addressRefusal(value) === null
}

/** A web address under the rules of `addressRefusal`, kept exactly as it was written. */
export const webAddress = z.string().superRefine((value, ctx) => {
  const why = addressRefusal(value)
  if (why !== null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: why })
})

/** What a person reads the page as, when the sender knows: trimmed, at most `LIMITS.TITLE`. */
const addressTitle = z.string().trim().min(1).max(LIMITS.TITLE)

/**
 * An address as the context carries it: the page, its title when the sender gave one, why
 * (`intent`), and — the host's own facts — which module asked (`by`), whether an agent asked through
 * the host's own door instead (`agent`), and when (`at`, ISO 8601, new on every hand-over). `at`
 * is what makes it news: the same address handed over twice is two requests to open it.
 */
export const sharedAddressSchema = z.object({
  url: webAddress,
  title: addressTitle.optional(),
  intent: z.enum(ADDRESS_INTENTS).catch('show'),
  by: z.string().regex(MODULE_ID).optional(),
  agent: z.literal(true).optional(),
  at: z.string().min(1).max(40).optional(),
})
export type SharedAddress = z.infer<typeof sharedAddressSchema>

/**
 * Whether a consumer has something to do: an address is here and its `at` is not the one it last
 * acted on. A consumer keeps the `at` it acted on, and acts on nothing it sent itself unless it
 * asked to. An address without an `at` (a host that does not stamp) is acted on when its url moves.
 */
export function addressIsNews(
  address: Pick<SharedAddress, 'url' | 'at'> | null | undefined,
  actedOn: { url?: string | null; at?: string | null } | null | undefined,
): boolean {
  if (!address) return false
  if (!actedOn) return true
  if (address.at !== undefined) return address.at !== actedOn.at
  return address.url !== actedOn.url
}

/** The title when there is one, else the address's host and path, for a person to read. */
export function addressLabel(address: Pick<SharedAddress, 'url' | 'title'>): string {
  if (address.title) return address.title
  try {
    const url = new URL(address.url)
    const path = url.pathname === '/' ? '' : url.pathname
    return `${url.host}${path}`
  } catch {
    return address.url
  }
}
