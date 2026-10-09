import { z } from 'zod'
import { MESSAGE, MESSAGE_PREFIXES, PROTOCOL, type MessageType } from './constants.js'
import { LIMITS } from './limits.js'
import { canonicalName, legacyName } from './dialect.js'
import { EPIC_SLUG, MODULE_ID } from './ids.js'
import { buildSchema } from './build.js'
import { contextSchema } from './context.js'
import { filterGroupSchema } from './filters.js'
import { gotoRef, kehikkoSchema, stepNumber } from './fragments.js'

/**
 * Everything the two sides say to each other: the schema of every `postMessage` between a host and
 * a framed, cross-origin module. Parse both directions: a module validates what the host sends too.
 * Design notes: docs/wire.md, and docs/filters.md for filters, clearing and refreshing.
 */

/**
 * A message type, read in either spelling (`kehikot.` or the older `roadmap.`) and handed back in
 * the current one. Sending in the old spelling is `toDialect`'s job; see `dialect.ts`.
 */
function messageType<T extends MessageType>(type: T) {
  return z.union([z.literal(type), z.literal(legacyName(type))]).transform((): T => type)
}

/** The id correlating a question with its answer, or a `goto` with its `went`. */
const correlation = z.string().min(1).max(LIMITS.CORRELATION)

/**
 * Module → host. What a module currently offers to be narrowed by. The whole offer, every time: it
 * replaces, never merges, and an empty `groups` takes the control away. Sent whenever the answer
 * changes, including its words. Two groups cannot share an id.
 */
export const filtersSchema = z.object({
  type: messageType(MESSAGE.FILTERS),
  groups: z
    .array(filterGroupSchema)
    .max(LIMITS.FILTER_GROUPS)
    .refine((groups) => new Set(groups.map((g) => g.id)).size === groups.length, {
      message: 'two groups cannot share an id',
    }),
})
export type Filters = z.infer<typeof filtersSchema>

/* ------------------------------------------------------------------------ *
 * Clearing: a module offering to delete what it is showing
 * ------------------------------------------------------------------------ */

/**
 * Module → host. What a module offers to clear, in its own words. The whole offer, every time; any
 * count rides in the label. Re-announced whenever what it shows changes, including immediately
 * after it has been asked to clear.
 */
export const clearableSchema = z.object({
  type: messageType(MESSAGE.CLEARABLE),
  /** The words on the control, or `null` to take the control away. */
  label: z.string().min(1).max(LIMITS.CLEAR_LABEL).nullable().default(null),
})
export type Clearable = z.infer<typeof clearableSchema>

/**
 * Host → module. The press, relayed: "clear what you are showing". Empty apart from `type` and
 * `protocol`: no list of what to delete, no filter choice, no correlation id, and no answer.
 */
export const clearSchema = z.object({
  type: messageType(MESSAGE.CLEAR),
  protocol: z.number().int().min(1),
})
export type Clear = z.infer<typeof clearSchema>

/* ------------------------------------------------------------------------ *
 * Refreshing: a module offering to read its material again
 * ------------------------------------------------------------------------ */

/**
 * Module → host. What a module says about being refreshed. The whole state, every time, re-announced
 * whenever any of the three changes. `at` is an ISO 8601 instant with an offset, or null for "I
 * cannot say" (the host then draws no time). `busy` keeps the control and says a read is in flight.
 */
export const refreshableSchema = z.object({
  type: messageType(MESSAGE.REFRESHABLE),
  /** Whether there is anything to read again right now. `false` withdraws the control. */
  can: z.boolean().default(true),
  /** When this module's material was last read, as the MODULE knows it. */
  at: z.string().datetime({ offset: true }).nullable().default(null),
  /** Whether a read is in flight this second. */
  busy: z.boolean().default(false),
})
export type Refreshable = z.infer<typeof refreshableSchema>

/**
 * Host → module. The press, relayed: "read your material again". Carries no reason, no interval and
 * no correlation id; what comes back is a new `kehikot.refreshable` (`busy`, then a new `at`).
 */
export const refreshSchema = z.object({
  type: messageType(MESSAGE.REFRESH),
  protocol: z.number().int().min(1),
})
export type Refresh = z.infer<typeof refreshSchema>

/* ------------------------------------------------------------------------ *
 * Host → module
 * ------------------------------------------------------------------------ */

/**
 * Host → module. Hello: the whole of what a module is given without asking, sent on every frame
 * load. `protocol` is what the two sides settled on when the manifest was read. `session` names
 * this conversation; it is not a credential and must never become one.
 */
export const helloSchema = z.object({
  type: messageType(MESSAGE.HELLO),
  protocol: z.number().int().min(1),
  session: z.string().min(1).max(LIMITS.SESSION),
  context: contextSchema,
  /**
   * Whatever this module last asked the host to keep for it (`state.set`), verbatim and opaque. This
   * module's alone, which is why it is not in the context. `null` when the host keeps nothing for it.
   */
  state: z.string().max(LIMITS.MODULE_STATE).nullable().default(null),
})

/**
 * Host → module. Which epic is open now: the `contextSchema` fields flat, not wrapped in `context`.
 * Sent when the reader switches epics and when the module's own tab is shown. Only epic-scoped
 * modes are told; a `global` mode is not.
 */
export const contextMessageSchema = contextSchema.extend({
  type: messageType(MESSAGE.CONTEXT),
  protocol: z.number().int().min(1),
})

/**
 * Why a request was refused, a closed set: `unknown-module`, this host has no module by that name;
 * `unknown-method`, no such method, which an author should treat as fatal; `failed`, everything
 * else including a host's own refusals, and the only one worth retrying.
 */
export const responseFailureReasons = ['unknown-module', 'unknown-method', 'failed'] as const
export type ResponseFailureReason = (typeof responseFailureReasons)[number]

/**
 * Host → module. The answer to exactly one request: data or a refusal, two shapes under one type.
 * A refusal always carries both `reason`, a word from `responseFailureReasons` for the program, and
 * `error`, a sentence for the person writing the module.
 */
export const responseSchema = z.discriminatedUnion('ok', [
  z.object({
    type: messageType(MESSAGE.RESPONSE),
    id: correlation,
    ok: z.literal(true),
    /**
     * Whatever the method answers with, and deliberately untyped. See the note
     * at the top of `methods.ts`: a client that asserted a shape here would be
     * asserting something no host promised.
     */
    data: z.unknown(),
  }),
  z.object({
    type: messageType(MESSAGE.RESPONSE),
    id: correlation,
    ok: z.literal(false),
    reason: z.enum(responseFailureReasons),
    /** The sentence for the person. Bounded because a refusal quotes the module's own text back at it. */
    error: z.string().max(LIMITS.REASON).default(''),
  }),
])

/**
 * Host → module. Go to a reference. Names a `ref` or a 1-based `step`; an epic alone is refused,
 * and `epic` means "switch first". `id` is required and pairs it with its `went`; see `wentSchema`.
 * Mirrors the `view.goto` method, which does accept an epic alone.
 */
export const gotoSchema = z
  .object({
    type: messageType(MESSAGE.GOTO),
    id: correlation,
    ref: gotoRef.optional(),
    step: stepNumber.optional(),
    epic: z.string().regex(EPIC_SLUG).optional(),
  })
  .refine((g) => g.ref !== undefined || g.step !== undefined, {
    message: 'a goto has to name a ref or a step; an epic alone only says which epic',
  })

/**
 * Host → module. An extension payload one module emitted, delivered to a module whose manifest
 * consumes that format. The host validated `extension` and `payload` and names `from` itself; the
 * contents are the sender's claim. Never answered, and lost if the receiver is still loading.
 */
export const eventSchema = z.object({
  type: messageType(MESSAGE.EVENT),
  protocol: z.number().int().min(1),
  /** The format, e.g. `kehikot.notifications@1`. Known to the host, or unsent. */
  extension: z.string().min(1).max(LIMITS.EXTENSION).transform(canonicalName),
  /** Whatever that format says. Validated by the host before it left. */
  payload: z.unknown(),
  /** The module that emitted it, named by the host from its own registry. */
  from: z.string().regex(MODULE_ID).transform(canonicalName),
  /**
   * When the host accepted it, ISO 8601. A receiver ordering by arrival would
   * be ordering by its own scheduler instead.
   */
  at: z.string().min(1).max(40),
  /** The kehikko it happened on, or null. Compare with `context.kehikko` to tell near from far. */
  kehikko: kehikkoSchema.nullable().default(null),
})

/* ------------------------------------------------------------------------ *
 * Module → host
 * ------------------------------------------------------------------------ */

/**
 * Module → host. "I heard you." `id` is the module's own, so a host can confirm the frame holds the
 * program whose manifest it read; a mismatch is a fault to report, not how the host identifies it.
 * A host waits a bounded time, counted from the greeting, then says the module did not answer.
 */
export const readySchema = z.object({
  type: messageType(MESSAGE.READY),
  /* Canonical once parsed: an unchanged module still answers as `roadmap.x`. */
  id: z.string().regex(MODULE_ID).transform(canonicalName),
  protocol: z.number().int().min(1).default(PROTOCOL),
  /** The build that served this page, as printed into it. A host compares it with the server's now. */
  build: buildSchema.optional().catch(undefined),
})

/** One question, with an id the answer will carry back. */
export const requestSchema = z.object({
  type: messageType(MESSAGE.REQUEST),
  id: correlation,
  /**
   * Bounded but not held to the list of known methods. A host may refuse one it does not have, with
   * `unknown-method`.
   */
  method: z.string().min(1).max(LIMITS.METHOD),
  params: z.record(z.string(), z.unknown()).default({}),
})

/**
 * Module → host. How tall the module would like to be. No id and no answer: the host clamps it
 * (`clampHeight`) and may ignore it entirely.
 */
export const resizeSchema = z.object({
  type: messageType(MESSAGE.RESIZE),
  height: z.number().finite(),
})

/**
 * Module → host. "I went", or "there is nothing here by that name": one per `goto`, carrying its
 * `id`, sent only once the walk has settled. `found` is what the host acts on; `why` is for the
 * person. A host must time out, and a timeout means `found: false`: fall back to the link.
 */
export const wentSchema = z.object({
  type: messageType(MESSAGE.WENT),
  id: correlation,
  found: z.boolean(),
  why: z.string().max(LIMITS.REASON).default(''),
})

/* ------------------------------------------------------------------------ *
 * The two directions, each as one thing to parse
 * ------------------------------------------------------------------------ */

/**
 * Every message a host sends. A plain union, not a `discriminatedUnion`, because `responseSchema`
 * is itself a union on a different key and cannot be an option of one.
 */
export const hostMessageSchema = z.union([
  helloSchema,
  contextMessageSchema,
  responseSchema,
  gotoSchema,
  eventSchema,
  clearSchema,
  refreshSchema,
])
export type HostMessage = z.infer<typeof hostMessageSchema>

export const moduleMessageSchema = z.union([
  readySchema,
  requestSchema,
  resizeSchema,
  wentSchema,
  filtersSchema,
  clearableSchema,
  refreshableSchema,
])
export type ModuleMessage = z.infer<typeof moduleMessageSchema>

export type WireMessage = HostMessage | ModuleMessage

export type Hello = z.infer<typeof helloSchema>
export type ContextMessage = z.infer<typeof contextMessageSchema>
export type Response = z.infer<typeof responseSchema>
export type Goto = z.infer<typeof gotoSchema>
export type ModuleEvent = z.infer<typeof eventSchema>
export type Ready = z.infer<typeof readySchema>
export type Request = z.infer<typeof requestSchema>
export type Resize = z.infer<typeof resizeSchema>
export type Went = z.infer<typeof wentSchema>


/**
 * Is this worth parsing at all? The cheap first filter: true when the value is an object whose
 * `type` starts `kehikot.` or the older `roadmap.`. Says nothing about validity or the sender.
 */
export function looksLikeWireMessage(value: unknown): value is { type: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as { type: unknown }).type === 'string' &&
    MESSAGE_PREFIXES.some((prefix) => (value as { type: string }).type.startsWith(prefix))
  )
}
