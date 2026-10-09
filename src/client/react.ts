/**
 * The React half of the client: `useHost` (the host as one value), `Cover` (the one not-ready
 * screen) and `useFocus` (the parts focus). Optional — a second subpath the plain client never
 * imports, and a module may hand-roll all of it.
 * Design notes: docs/module-plumbing.md, and docs/client.md for the connection underneath.
 */

/* Stated beside the store, which needs them without React; still exported from here. */
export { GREETING_GRACE_MS, type Where } from './host-store.js'

/* The parts focus: a hook that needs no connection. See `focus.ts`. */
export { useFocus, type Focus } from './focus.js'

/* The listener and the shared not-ready screen. See `host.ts` and `cover.ts`. */
export { useHost, hostFields, JSON_KEPT, type Host, type KeptCodec, type UseHostOptions } from './host.js'
export { type HostActions, type HostFields, type HostStanding, type Steadiness } from './host-store.js'
export {
  Cover,
  coverFor,
  useServerStanding,
  COVER_CSS,
  COVER_STYLE_ID,
  COVER_WORDS,
  TRY_AGAIN,
  type CoverProps,
  type CoverState,
} from './cover.js'
