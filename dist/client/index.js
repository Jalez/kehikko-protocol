/**
 * The module half of the wire, for a page that would rather not write it again: the browser code,
 * kept apart from the front door. A convenience, never a requirement. Import it from the page's
 * ENTRY, store the connection FIRST, then call `listen()`.
 * Design notes: docs/client.md.
 */
export { mailbox, makeMailbox, KEEP } from './mailbox.js';
/* When the page fails (2.59.0): every uncaught error, said to the host, and a way to say one yourself. */
export { pageErrors, makePageErrors, reportPageError, describeError, trimStack, PAGE_ERRORS_MAX, PAGE_ERRORS_GLOBAL, STACK_LINES, NO_MESSAGE, } from './errors.js';
export { connect, mayGreet, pageOrigins, HostRefused, ANSWER_WITHIN_MS, PERSON_ANSWERS_WITHIN_MS, GOTO_BACKSTOP_MS, PRESS_BACKSTOP_MS, NOBODY_TO_ASK, POINTER_SLOP_PX, ROWS_ADVICE_AFTER_MS, } from './connect.js';
/* 2.69.0: the client's own search of a page's visible text, the default answer to the host's find bar. */
export { pageFind, FIND_HIGHLIGHT, FIND_HIGHLIGHT_CURRENT, FIND_MARK_ATTRIBUTE, FIND_SKIP_ATTRIBUTE, FIND_STYLE_ID, FIND_RECOUNT_MS, FIND_MARK_MAX, FIND_CSS, } from './find.js';
export { findMatches, stepMatch } from '../find.js';
/* A page asking its own server: the ticket, one fetch helper, one stream helper, the theme. */
export { ask, answered, replied, probeServer, watchServer, ticket, AskFailed, onServerStanding, serverStanding, resetServerStanding, reloadStalePage, reloadWhenStale, STALE_RELOAD_MS, PAGE_STALE, PAGE_OLD, NOT_A_REPLY, CANCELLED, WATCH_SERVER_MS, KEEPALIVE_BYTES, SERVER_DOWN, } from './ask.js';
export { follow } from './stream.js';
/* The page half of `events`/`publish` (2.32.0): a page never polls its own module. */
export { subscribe } from './subscribe.js';
export {} from './query.js';
export { applyTheme, applyBackground, pageBackground, pageTheme, systemTheme } from './theme.js';
/* What the host's revealed rows cover of a page that says `reveal: 'over'`, and how to keep the last line out from under them (2.42.0). */
export { keepInView, NOT_COVERED } from '../reveal.js';
export { pageBuild } from './build.js';
/* A call the host is too old for (2.22.0): read it off a `HostRefused`, show the one line. */
export { hostTooOld, FIT_SAYS } from '../fit.js';
/* What a page holds across a reload of itself: written as it changes, read back by the next load. */
export { held, heldDraft } from './held.js';
/* The host as a store, for a page whose state lives outside React. `useHost` is this, bound to a component. */
export { hostStore, hostFields, GREETING_GRACE_MS, JSON_KEPT, KEEP_AFTER_MS, } from './host-store.js';
/* 2.70.0. What every container gets by default: its view kept (`hostStore`'s `keepView`), and presses from nested frames. */
export { KEPT_VIEW_MARK, KEEP_SCROLL_ATTRIBUTE, KEEP_SCROLL_AFTER_MS, RESTORE_SCROLL_WITHIN_MS, unwrapKept, wrapKept, viewOf, headerValues, } from './kept-view.js';
export { relayPointer, pointerShim, pointerShimScript, RELAY_POINTER, RELAYED_EVENTS, } from './relay.js';
export { HOLD_COVER_MS, LOADING_COVER_AFTER_MS } from '../constants.js';
