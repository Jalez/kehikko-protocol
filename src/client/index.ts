/**
 * The module half of the wire, for a page that would rather not write it again: the browser code,
 * kept apart from the front door. A convenience, never a requirement. Import it from the page's
 * ENTRY, store the connection FIRST, then call `listen()`.
 * Design notes: docs/client.md.
 */

export { mailbox, makeMailbox, KEEP, type MessageSource } from './mailbox.js'

export {
  connect,
  HostRefused,
  ANSWER_WITHIN_MS,
  PERSON_ANSWERS_WITHIN_MS,
  GOTO_BACKSTOP_MS,
  NOBODY_TO_ASK,
  type AskOptions,
  type Connection,
  type ConnectOptions,
  type HostEvents,
  type Refusal,
} from './connect.js'

/* A page asking its own server: the ticket, one fetch helper, one stream helper, the theme. */
export {
  ask,
  answered,
  ticket,
  AskFailed,
  onServerStanding,
  serverStanding,
  resetServerStanding,
  reloadStalePage,
  reloadWhenStale,
  STALE_RELOAD_MS,
  PAGE_STALE,
  SERVER_DOWN,
  type AskFailure,
  type Asked,
  type AskOptions as AskServerOptions,
  type ServerStanding,
} from './ask.js'
export { follow, type Attachment, type FollowOptions } from './stream.js'
export { applyTheme, pageTheme, systemTheme } from './theme.js'
export { pageBuild } from './build.js'
