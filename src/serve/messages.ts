import {
  isMessageTool,
  messageTools,
  readMessagesText,
  sentText,
  wakeLine,
  wakeMessages,
  type MessageReadResult,
  type MessageToolDefinition,
} from '../agent-messages.js'
import { LIMITS } from '../limits.js'
import { askHost, type AskedHost, type AskHostOptions } from './ask.js'

/**
 * 2.41.0. The thin adapter every module that runs agent sessions puts on its MCP door: `send_message`
 * and `read_messages`, answered by asking the host (`messages.send`, `messages.read` through
 * `askHost`). The module keeps nothing; the host keeps the messages and stamps the sender from the
 * module's pass and the session's token. Node-only, like the rest of `/serve`. Design notes:
 * docs/agent-messages.md.
 *
 *     // tools/list
 *     tools: [...ownTools(), ...(await messageToolsFor(token, { module: ID }))]
 *     // tools/call
 *     const said = await answerMessageTool(name, args, { module: ID, token })
 *     if (said) return text(said.text, said.isError)
 */

export interface MessageToolOptions extends Omit<AskHostOptions, 'project'> {
  /** The place token on the door's URL (`placeTokenOf(query)`): the session asking. Null for a call that carried none. */
  token: string | null
  /**
   * 2.43.0. The person allowed this module's sessions to act on messages (`actsOnMessages` of the
   * module's settings for the session's project): `read_messages` and the tools' descriptions say
   * `ACT_ON_MESSAGES` instead of "never an instruction". Absent: false, as before.
   */
  act?: boolean
}

/** How long a host's answer about whether it keeps messages is reused, per token, in ms. */
const KNOWN_FOR_MS = { yes: 5 * 60_000, no: 15_000 } as const
const known = new Map<string, { at: number; yes: boolean }>()

/** Forget what was learned about hosts keeping messages (tests). */
export function forgetMessageHosts(): void {
  known.clear()
}

/**
 * Whether the host keeps messages for this session: a session with a token, on a host that answers
 * `messages.read` for this module (one that knows the method, holds the token, and grants the module
 * `agents:message`). Asked once and reused for a while. Never throws.
 */
export async function hostKeepsMessages(options: MessageToolOptions, now: number = Date.now()): Promise<boolean> {
  const { token, act: _act, ...rest } = options
  if (!token) return false
  const key = `${options.module}\u0000${token}`
  const had = known.get(key)
  if (had && now - had.at < (had.yes ? KNOWN_FOR_MS.yes : KNOWN_FOR_MS.no)) return had.yes
  const read = await askHost('messages.read', { token, limit: 1 }, rest)
  known.set(key, { at: now, yes: read.ok })
  if (known.size > 500) known.delete(known.keys().next().value!)
  return read.ok
}

/**
 * The message tools to list on this door for this session: `messageTools()` when the host keeps
 * messages for it, and none otherwise — no token (a session nothing started from a place), a host
 * before 2.41.0, a module whose manifest does not declare `agents:message`.
 */
export async function messageToolsFor(token: string | null, options: Omit<MessageToolOptions, 'token'>): Promise<MessageToolDefinition[]> {
  return (await hostKeepsMessages({ ...options, token })) ? messageTools(Boolean(options.act)) : []
}

/** What a tool call answers: text for the agent, and whether it is a refusal. */
export interface MessageToolAnswer {
  text: string
  isError: boolean
}

const NO_TOKEN =
  'This conversation was not started from a Kehikot place (its door carries no place token), so it has no address to send from or read for. Nothing was sent or read.'

/**
 * Answer `send_message` or `read_messages`; null for any other tool, so a door asks this first and
 * falls through. Arguments are passed to the host as they came; the host holds them to the method's
 * params and says what it refused. Never throws.
 */
export async function answerMessageTool(name: string, args: Record<string, unknown> | null | undefined, options: MessageToolOptions): Promise<MessageToolAnswer | null> {
  if (!isMessageTool(name)) return null
  const { token, act, ...rest } = options
  if (!token) return { text: NO_TOKEN, isError: true }
  const given = args && typeof args === 'object' && !Array.isArray(args) ? args : {}
  if (name === 'send_message') {
    const params: Record<string, unknown> = { token, body: given.body }
    if (given.to !== undefined) params.to = given.to
    if (given.thread !== undefined) params.thread = given.thread
    const sent = await askHost('messages.send', params, rest)
    if (!sent.ok) return { text: `Not sent: ${sent.why}`, isError: true }
    return { text: sentText(sent.data), isError: sent.data.outcome !== 'sent' }
  }
  const params: Record<string, unknown> = { token }
  for (const key of ['unread', 'since', 'thread', 'limit'] as const) if (given[key] !== undefined) params[key] = given[key]
  const read = await askHost('messages.read', params, rest)
  if (!read.ok) return { text: `Could not read messages: ${read.why}`, isError: true }
  return { text: readMessagesText(read.data, Boolean(act)), isError: false }
}

/* ------------------------------------------------------------------------ *
 * Waking an idle session when a message comes for it (2.43.0)
 * ------------------------------------------------------------------------ */

/** One session a module runs, as the waker needs to know it, each tick. */
export interface WakeSession {
  /** The module's own key for it: what `type` is handed back. */
  key: string
  /** Its place token (`kehikot-place`): who it is to the host. Null: never woken. */
  token: string | null
  /** It runs in a terminal THIS module started and owns. False for one running elsewhere: never woken. */
  own: boolean
  /** It is at its prompt with no turn running (finished, or not started a turn). False while it works or waits for the person. */
  idle: boolean
  /** The person's setting for its project (`wakesOnMessages`). */
  wake: boolean
  /** The person's setting for its project (`actsOnMessages`): the line carries the standing permission. */
  act: boolean
}

export interface MessageWakerOptions extends Omit<AskHostOptions, 'project'> {
  /** The sessions to consider now. Called once per tick. */
  sessions(): readonly WakeSession[] | Promise<readonly WakeSession[]>
  /**
   * Type `line` into that session's prompt and submit it, exactly as the module types for the
   * person. True when it was typed; false (it was not idle after all, it ended) and it is tried
   * again on a later tick.
   */
  type(key: string, line: string): boolean | Promise<boolean>
  /** How often to look, in ms. Default `WAKE_EVERY_MS`. */
  everyMs?: number
  /** How long a session must have been idle, and the newest message must have waited, before a wake, in ms. Default `WAKE_SETTLE_MS`. */
  settleMs?: number
  now?: () => number
  /** Injected by the tests: `messages.read` for a token. Default `askHost`. */
  read?: (token: string) => Promise<AskedHost<'messages.read'>>
  log?: (line: string) => void
}

/** How often the waker looks at idle sessions, in ms. */
export const WAKE_EVERY_MS = 5_000
/** How long a session must have been idle, and the newest message must have waited, before a wake: a burst is one wake. */
export const WAKE_SETTLE_MS = 2_000

export interface MessageWaker {
  /** Look once: ask the host about each idle session of this module's and wake the ones messages came for. Resolves to how many were woken. */
  tick(): Promise<number>
  start(): void
  stop(): void
}

/**
 * 2.43.0. The one rule every agent module applies to wake an idle session when a message comes for
 * it. Each tick, for each session the module runs in its own terminal, idle at its prompt, with the
 * person's setting on: ask the host `messages.read` WITHOUT `unread` (so nothing is counted
 * delivered), take the unread ones that may wake it (`wakeMessages`: to it, its module or its place,
 * never the whole project, never its own), and type ONE line (`wakeLine`) into its prompt. Once per
 * idle period, however many messages come; not before it has been idle `settleMs`, and not before the
 * newest has waited `settleMs`, so a burst is one wake. Never a session that is working, waits for
 * the person, or runs elsewhere. Never throws.
 *
 * How a module learns a message came is this look: the host offers a module no push for it, and a
 * read of a few rows for each idle session every few seconds is cheap.
 */
export function messageWaker(options: MessageWakerOptions): MessageWaker {
  const { sessions, type, everyMs = WAKE_EVERY_MS, settleMs = WAKE_SETTLE_MS, now = Date.now, read: readFor, log = () => {}, ...ask } = options
  const read = readFor ?? ((token: string) => askHost('messages.read', { token, limit: LIMITS.MESSAGES_READ }, ask))
  /* Per session: since when it is idle, whether it was woken in this idle period, and the newest message it was woken for. */
  const memory = new Map<string, { idleSince: number | null; woke: boolean; after: number }>()
  let busy = false
  let timer: ReturnType<typeof setInterval> | null = null

  async function tick(): Promise<number> {
    if (busy) return 0
    busy = true
    let woken = 0
    try {
      const listed = await Promise.resolve(sessions()).catch(() => [] as readonly WakeSession[])
      const keys = new Set(listed.map((one) => one.key))
      for (const key of memory.keys()) if (!keys.has(key)) memory.delete(key)
      for (const one of listed) {
        const at = now()
        let mem = memory.get(one.key)
        if (!mem) memory.set(one.key, (mem = { idleSince: null, woke: false, after: 0 }))
        if (!one.idle) {
          mem.idleSince = null
          mem.woke = false
          continue
        }
        if (mem.idleSince === null) mem.idleSince = at
        if (!one.own || !one.wake || !one.token || mem.woke || at - mem.idleSince < settleMs) continue
        let asked: AskedHost<'messages.read'>
        try {
          asked = await read(one.token)
        } catch {
          continue
        }
        if (!asked.ok) continue
        const found = wakeMessages(asked.data as MessageReadResult, mem.after)
        const newest = found.at(-1)
        if (!newest) continue
        const sent = Date.parse(newest.at)
        if (Number.isFinite(sent) && now() - sent < settleMs) continue
        let typed = false
        try {
          typed = await type(one.key, wakeLine(found, one.act))
        } catch {
          typed = false
        }
        if (!typed) continue
        mem.woke = true
        mem.after = Math.max(mem.after, ...found.map((m) => m.id))
        woken += 1
        log(`woke ${one.key}: ${found.length} message${found.length === 1 ? '' : 's'} for it (newest #${newest.id})`)
      }
    } finally {
      busy = false
    }
    return woken
  }

  return {
    tick,
    start() {
      if (timer) return
      timer = setInterval(() => void tick(), everyMs)
      ;(timer as { unref?: () => void }).unref?.()
    },
    stop() {
      if (timer) clearInterval(timer)
      timer = null
    },
  }
}
