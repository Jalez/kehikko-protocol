/**
 * The module half of the wire, for a page that would rather not write it again: the browser code,
 * kept apart from the front door. A convenience, never a requirement. Import it from the page's
 * ENTRY, store the connection FIRST, then call `listen()`.
 * Design notes: docs/client.md.
 */
export { mailbox, makeMailbox, KEEP } from './mailbox.js';
export { connect, HostRefused, ANSWER_WITHIN_MS, PERSON_ANSWERS_WITHIN_MS, GOTO_BACKSTOP_MS, NOBODY_TO_ASK, } from './connect.js';
