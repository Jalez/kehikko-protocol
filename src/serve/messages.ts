import {
  isMessageTool,
  messageTools,
  readMessagesText,
  sentText,
  type MessageToolDefinition,
} from '../agent-messages.js'
import { askHost, type AskHostOptions } from './ask.js'

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
  const { token, ...rest } = options
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
  return (await hostKeepsMessages({ ...options, token })) ? messageTools() : []
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
  const { token, ...rest } = options
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
  return { text: readMessagesText(read.data), isError: false }
}
