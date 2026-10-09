/**
 * The two spellings of one protocol, `kehikot.` (canonical) and the pre-rename `roadmap.`. Both are
 * read everywhere; the old one is written only to a party known to need it. Translate at the edge:
 * `toDialect` when a message is posted, `canonical*` when one is parsed.
 * Design notes: docs/protocol-number.md.
 *
 * Deprecated as a whole in 0.37: the next breaking release speaks `kehikot.` only. What stays is
 * `canonicalModuleId`, for an id that was written to disk before the rename.
 */

import { LEGACY_MANIFEST_KIND, LEGACY_MESSAGE_PREFIX, MESSAGE_PREFIX } from './constants.js'

/** The prefix every name carries now. */
const PREFIX = MESSAGE_PREFIX

/** The prefix names carried before the rename. Read, and written only to a party that needs it. */
const LEGACY_PREFIX = LEGACY_MESSAGE_PREFIX

/**
 * Which spelling one side speaks. `kehikot` is this package; `roadmap` is every copy of it from
 * before the rename, which an unchanged module or an older host still speaks.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect.
 */
export type Dialect = 'kehikot' | 'roadmap'

/** @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. */
export const DIALECTS = ['kehikot', 'roadmap'] as const

/**
 * The canonical spelling of a dotted name: a message type, a module id, an
 * extension name. `roadmap.x` becomes `kehikot.x`; anything else is returned
 * unchanged, including a name in somebody else's namespace.
 *
 * @deprecated Use `canonicalModuleId`, which is this for a module id and is what stays.
 */
export function canonicalName(name: string): string {
  return name.startsWith(LEGACY_PREFIX) ? PREFIX + name.slice(LEGACY_PREFIX.length) : name
}

/**
 * The pre-rename spelling of a dotted name. `kehikot.x` becomes `roadmap.x`; anything else is unchanged.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. Nothing replaces it.
 */
export function legacyName(name: string): string {
  return name.startsWith(PREFIX) ? LEGACY_PREFIX + name.slice(PREFIX.length) : name
}

/**
 * A name spelled for one dialect.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. Nothing replaces it.
 */
export function nameIn(name: string, dialect: Dialect): string {
  return dialect === 'roadmap' ? legacyName(name) : canonicalName(name)
}

/**
 * A module's one id, whichever spelling it arrived in. `roadmap.journeys` and `kehikot.journeys`
 * are the same module, and a host keys everything it keeps about a module by this.
 *
 * Not deprecated: it stays, for a module id read from disk (a project's `.kehikot/` files, a
 * registration's file name) that was written before the rename.
 */
export const canonicalModuleId = canonicalName

/**
 * A module id as an unchanged, pre-rename module or host spells it.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. Nothing replaces it.
 */
export const legacyModuleId = legacyName

/**
 * An extension name, e.g. `roadmap.notifications@1`, in its canonical spelling.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. Compare an extension name as it is written.
 */
export const canonicalExtension = canonicalName

/**
 * Which dialect a message type is in, or `null` when it is in neither.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. Nothing replaces it.
 */
export function dialectOfType(type: unknown): Dialect | null {
  if (typeof type !== 'string') return null
  if (type.startsWith(PREFIX)) return 'kehikot'
  if (type.startsWith(LEGACY_PREFIX)) return 'roadmap'
  return null
}

/**
 * Which dialect a manifest's `kind` says its module speaks. Anything unrecognised is the current one.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. Nothing replaces it.
 */
export function dialectOfKind(kind: unknown): Dialect {
  return kind === LEGACY_MANIFEST_KIND ? 'roadmap' : 'kehikot'
}

type Loose = Record<string, unknown>

function isObject(value: unknown): value is Loose {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/* A list of containers with each `module` respelled. Anything that is not a
   list of objects is handed back untouched: this is a translation, not a
   validation, and the receiver's schema is what refuses a bad shape. */
function containersIn(value: unknown, dialect: Dialect): unknown {
  if (!Array.isArray(value)) return value
  return value.map((container) =>
    isObject(container) && typeof container.module === 'string'
      ? { ...container, module: nameIn(container.module, dialect) }
      : container,
  )
}

function contextIn(value: unknown, dialect: Dialect): unknown {
  if (!isObject(value) || !('containers' in value)) return value
  return { ...value, containers: containersIn(value.containers, dialect) }
}

/**
 * One message, respelled for a receiver that speaks `dialect`; applied by a sender at the moment it
 * posts. Respells the `type`, module ids (`ready.id`, `event.from`, `context.containers[].module`)
 * and extension names (`event.extension`, `params.extension` on `events.emit`). Pure: it copies.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. Post a message as it is built.
 */
export function toDialect<T>(message: T, dialect: Dialect): T {
  if (!isObject(message) || typeof message.type !== 'string') return message
  const type = nameIn(message.type, dialect)
  const out: Loose = { ...message, type }
  const bare = canonicalName(message.type).slice(PREFIX.length)

  if (bare === 'ready' && typeof out.id === 'string') out.id = nameIn(out.id, dialect)
  if (bare === 'event') {
    if (typeof out.from === 'string') out.from = nameIn(out.from, dialect)
    if (typeof out.extension === 'string') out.extension = nameIn(out.extension, dialect)
  }
  if (bare === 'hello' && 'context' in out) out.context = contextIn(out.context, dialect)
  if (bare === 'context' && 'containers' in out) out.containers = containersIn(out.containers, dialect)
  if (bare === 'request' && out.method === 'events.emit' && isObject(out.params) && typeof out.params.extension === 'string') {
    out.params = { ...out.params, extension: nameIn(out.params.extension, dialect) }
  }
  return out as T
}

/**
 * One message as received, respelled into the canonical dialect. The schemas do this too; see rule 1.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. Nothing replaces it.
 */
export function canonicalMessage<T>(message: T): T {
  return toDialect(message, 'kehikot')
}
