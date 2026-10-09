import { z } from 'zod'
import { LIMITS } from './limits.js'
import { EPIC_SLUG } from './ids.js'
import { ref } from './fragments.js'

/**
 * The extension formats modules agree on: named, versioned payload shapes such as
 * `kehikot.notifications@1`. The version is part of the name, and an `@1` payload's fields never change.
 * Design notes: docs/extensions.md.
 */

/**
 * An epic slug, since everything here is filed against one. Restated here because `events.emit`
 * carries its slug inside a payload, which the bridge's own slug check does not see.
 */
const epic = z.string().regex(EPIC_SLUG, 'an epic slug is lowercase letters, digits and dashes')

/** A reference like `gh#41`. The same bound wherever one appears. */
const refs = z.array(ref).max(LIMITS.REFS).default([])

/**
 * `kehikot.notifications@1` — a line on a notification panel: what happened, and on which work
 * (`refs`). There is no field for who sent it, and there must never be: the side doing the showing
 * states the by-line.
 */
export const notificationPayload = z.object({
  epic,
  message: z.string().min(1).max(LIMITS.MESSAGE),
  level: z.enum(['info', 'attention', 'done', 'blocked']).default('info'),
  refs,
  step: z.number().int().min(1).optional(),
})
export type NotificationPayload = z.infer<typeof notificationPayload>

/**
 * `kehikot.calls@1` — one call somebody made, whether or not the host made it: a module reporting
 * its own traffic. Reported, not intercepted; whether a row was reported or observed is stated by
 * the recorder and is not a field here.
 */
export const callPayload = z.object({
  /** What was called, as a person would name it: `api.github.com`, `tectonic`. */
  target: z.string().min(1).max(LIMITS.PROJECT),
  ok: z.boolean(),
  /** How long it took. Bounded at an hour, which is longer than anything worth charting. */
  ms: z.number().int().min(0).max(3_600_000),
  /** Optional, for a call that concerns particular work. */
  refs,
  /** Free, short, and only worth showing when the call failed. */
  why: z.string().max(LIMITS.SUMMARY).default(''),
})
export type CallPayload = z.infer<typeof callPayload>

export interface ExtensionFormat {
  /** One line saying what a module speaking this is doing. */
  about: string
  payload: z.ZodTypeAny
}

/**
 * The formats this version of the protocol describes. A plain object: look names up with `known()`
 * or `Object.hasOwn`, never `EXTENSIONS[name]`. A host may know formats that are not in here, but
 * must not accept a payload for a name it cannot check.
 */
export const EXTENSIONS: Record<string, ExtensionFormat> = {
  'kehikot.notifications@1': {
    about: 'Say what it did, and on which issues or changes — a line on a notification panel.',
    payload: notificationPayload,
  },
  'kehikot.calls@1': {
    about: 'Report the calls it makes to the outside, so an activity chart covers more than the host.',
    payload: callPayload,
  },
}

export const EXTENSION_NAMES = Object.keys(EXTENSIONS)

/**
 * A name this version of the protocol can check, which is the only kind worth accepting. Exact:
 * the name as `EXTENSIONS` spells it.
 */
export function known(extension: string): boolean {
  return Object.hasOwn(EXTENSIONS, extension)
}

/**
 * The schema for one extension, or `undefined` for a name this version does not know. A reading,
 * not a router: delivery, to whom and under whose name, belongs to whoever is delivering.
 */
export function schemaFor(extension: string): z.ZodTypeAny | undefined {
  return Object.hasOwn(EXTENSIONS, extension) ? EXTENSIONS[extension]?.payload : undefined
}
