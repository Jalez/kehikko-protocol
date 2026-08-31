/**
 * The part of a module that has to touch the machine: which port it binds, and
 * where it says so.
 *
 * ## Why this is a separate entry point, and why it is node-only
 *
 * The front door of this package says shapes and nothing else — types, schemas,
 * constants, pure functions over them — and that rule is load-bearing rather
 * than tidy. Everything here breaks it: it binds sockets, it fetches a document
 * off a port, it writes into somebody's home directory. Putting one line of it
 * behind the front door would make `import { WELL_KNOWN } from
 * 'roadmap-module-protocol'` an import of `node:fs`, in a browser bundle, in
 * every module that renders a page.
 *
 * So it stands beside the front door the way `/client` does, and for the mirror
 * reason. `/client` exists so the package can be imported by a server with no
 * `window`; `/serve` exists so it can be imported by a page with no filesystem.
 * A module imports both, from two different files, and neither one drags the
 * other into the wrong process.
 *
 * ## And it is still not a decision the host imports
 *
 * The rule about decisions is unbroken here, which is worth being explicit
 * about, because a file that decides a port looks like a counterexample. Nothing
 * in this directory is ever run by the host. The host reads the registry and
 * asks each address what it is, and it would reach exactly the same conclusions
 * about a module that had never heard of this file. What is written here is a
 * MODULE's own housekeeping — where to bind, what to write down about itself —
 * and every one of those is a decision that was already the module's to make.
 * Fourteen modules were making it fourteen times, identically, in two files
 * each.
 *
 * ## What is here
 *
 * - `claim` decides the port and says who took the preferred one, if anybody.
 * - `registerAt` writes the file the host sweeps.
 * - `serves` is the Vite plugin that does both at the right moments, and is the
 *   only one of the three most modules will name.
 *
 * The first two are exported on their own because a module that does not use
 * Vite is an ordinary module, and because the plugin's timing — claim before the
 * server starts, register after it is listening — is the interesting part rather
 * than the reusable part.
 */
export { claim, free, identify, originFor, readManifest, sayClaim, search, verdict, DRIFT_SPAN, IDENTIFY_TIMEOUT_MS, LOOPBACK, type Claimed, type ClaimOptions, type Occupant, type Verdict, } from './ports.js';
export { neighbourPorts, portOf, readRegistration, registerAt, registryDir, type Registered, type Registration, } from './registry.js';
export { preferred, serves, type DevServerLike, type HttpServerLike, type ServesOptions, type ServesPlugin, } from './plugin.js';
//# sourceMappingURL=index.d.ts.map