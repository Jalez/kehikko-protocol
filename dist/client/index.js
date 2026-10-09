/**
 * The module half of the wire, for a page that would rather not write it again: the browser code,
 * kept apart from the front door. A convenience, never a requirement. Import it from the page's
 * ENTRY, store the connection FIRST, then call `listen()`.
 * Design notes: docs/client.md.
 */
export { mailbox, makeMailbox, KEEP } from './mailbox.js';
export { connect, HostRefused, ANSWER_WITHIN_MS, PERSON_ANSWERS_WITHIN_MS, GOTO_BACKSTOP_MS, NOBODY_TO_ASK, } from './connect.js';
/* A page asking its own server: the ticket, one fetch helper, one stream helper, the theme. */
export { ask, answered, replied, probeServer, ticket, AskFailed, onServerStanding, serverStanding, resetServerStanding, reloadStalePage, reloadWhenStale, STALE_RELOAD_MS, PAGE_STALE, PAGE_OLD, NOT_A_REPLY, KEEPALIVE_BYTES, SERVER_DOWN, } from './ask.js';
export { follow } from './stream.js';
export {} from './query.js';
export { applyTheme, pageTheme, systemTheme } from './theme.js';
export { pageBuild } from './build.js';
/* What a page holds across a reload of itself: written as it changes, read back by the next load. */
export { held, heldDraft } from './held.js';
/* The host as a store, for a page whose state lives outside React. `useHost` is this, bound to a component. */
export { hostStore, hostFields, GREETING_GRACE_MS, JSON_KEPT, } from './host-store.js';
