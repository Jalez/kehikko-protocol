/**
 * The module half of the wire, for a page that would rather not write it again.
 *
 * ## Why this is a separate entry point
 *
 * The package's front door says, at the top of `src/index.ts`: shapes, and
 * nothing else. That rule is load-bearing rather than tidy, and this file does
 * not break it — it stands beside it. `roadmap-module-protocol` stays a set of
 * types, schemas and constants that a Bun process can import without a browser
 * anywhere in sight; `roadmap-module-protocol/client` is where the browser code
 * lives, and a host's server or a module's server can go on importing the front
 * door without dragging a `window` reference into a process that has none.
 *
 * If you are writing the host side, you want the front door. If you are writing
 * a page that gets framed, you want this.
 *
 * ## And it is a convenience, never a requirement
 *
 * The README's sentence about the schemas is true of this too: a module that
 * hand-rolls its own `postMessage` handshake is exactly as conforming as one
 * that imports `connect`. Nothing a host does looks at whether this package was
 * imported, and nothing ever will. What this saves is not correctness — it is
 * the twelfth author rediscovering the two races below.
 *
 * ## How a page uses it
 *
 * ```ts
 * // main.tsx — imported for its side effect, from the ENTRY, before React runs.
 * import 'roadmap-module-protocol/client'
 *
 * // wherever the connection is made:
 * const live = connect('roadmap.example', {
 *   onHello: (context, state) => …,
 *   onContext: (context) => …,
 *   onGoto: (message, answer) => answer(false, 'nothing here to walk to'),
 * })
 * held.current = live   // store it FIRST
 * live.listen()         // then hear the replayed greeting
 * ```
 *
 * The two steps are the point. See `listen` in `connect.ts`.
 */
export { mailbox, makeMailbox, KEEP, type MessageSource } from './mailbox.js';
export { connect, HostRefused, ANSWER_WITHIN_MS, PERSON_ANSWERS_WITHIN_MS, GOTO_BACKSTOP_MS, NOBODY_TO_ASK, type AskOptions, type Connection, type ConnectOptions, type HostEvents, type Refusal, } from './connect.js';
//# sourceMappingURL=index.d.ts.map