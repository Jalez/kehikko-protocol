/**
 * The module half of the wire, for a page that would rather not write it again: the browser code,
 * kept apart from the front door. A convenience, never a requirement. Import it from the page's
 * ENTRY, store the connection FIRST, then call `listen()`.
 * Design notes: docs/client.md.
 */
export { mailbox, makeMailbox, KEEP, type MessageSource } from './mailbox.js';
export { pageErrors, makePageErrors, reportPageError, describeError, trimStack, PAGE_ERRORS_MAX, PAGE_ERRORS_GLOBAL, STACK_LINES, NO_MESSAGE, type PageError, type PageErrors, type ErrorTarget, } from './errors.js';
export { connect, mayGreet, pageOrigins, HostRefused, ANSWER_WITHIN_MS, PERSON_ANSWERS_WITHIN_MS, GOTO_BACKSTOP_MS, PRESS_BACKSTOP_MS, NOBODY_TO_ASK, POINTER_SLOP_PX, type AskOptions, type Connection, type ConnectOptions, type HostEvents, type HostFacts, type PointerEventLike, type PointerTarget, type PressAnswer, type Refusal, type FindAnswer, type FindAsk, type KeyEventLike, type KeyTarget, } from './connect.js';
export { pageFind, FIND_HIGHLIGHT, FIND_HIGHLIGHT_CURRENT, FIND_MARK_ATTRIBUTE, FIND_SKIP_ATTRIBUTE, FIND_STYLE_ID, FIND_RECOUNT_MS, FIND_MARK_MAX, FIND_CSS, type PageFind, type PageFindOptions, type HighlightApi, } from './find.js';
export { findMatches, stepMatch, type FindCount, type FindOptions, type FindDirection } from '../find.js';
export { ask, answered, replied, probeServer, watchServer, ticket, AskFailed, onServerStanding, serverStanding, resetServerStanding, reloadStalePage, reloadWhenStale, STALE_RELOAD_MS, PAGE_STALE, PAGE_OLD, NOT_A_REPLY, CANCELLED, WATCH_SERVER_MS, KEEPALIVE_BYTES, SERVER_DOWN, type AskFailure, type Asked, type AskOptions as AskServerOptions, type ServerStanding, } from './ask.js';
export { follow, type Attachment, type FollowOptions } from './stream.js';
export { subscribe, type SubscribeOptions } from './subscribe.js';
export { type Query, type QueryValue } from './query.js';
export { applyTheme, pageTheme, systemTheme } from './theme.js';
export { keepInView, NOT_COVERED, type Covered } from '../reveal.js';
export { pageBuild } from './build.js';
export { hostTooOld, FIT_SAYS, type HostTooOld } from '../fit.js';
export { held, heldDraft, type Draft, type Held, type HeldAt, type HeldReader } from './held.js';
export { hostStore, hostFields, GREETING_GRACE_MS, JSON_KEPT, KEEP_AFTER_MS, type HostActions, type HostFields, type HostStanding, type HostStore, type HostStoreOptions, type KeptCodec, type SteadyField, type Steadiness, type Where, } from './host-store.js';
