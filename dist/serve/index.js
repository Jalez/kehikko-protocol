/**
 * The part of a module that has to touch the machine: which port it binds (`claim`), where it says
 * so (`registerAt`), the Vite plugin that does both (`serves`), and `readJourneys`/`readJourney`.
 * Node-only — it binds sockets and reads and writes disk — so it stands beside the front door.
 * Design notes: docs/serving.md.
 */
export { claim, free, identify, originFor, readManifest, sayClaim, search, verdict, DRIFT_SPAN, IDENTIFY_TIMEOUT_MS, LOOPBACK, } from './ports.js';
export { DEFAULT_FRAME_ORIGINS, frameAncestors, frameOrigins } from './origins.js';
export { legacyRegistryDir, neighbourPorts, portOf, readRegistration, registerAt, registryDir, } from './registry.js';
export { preferred, serves, } from './plugin.js';
export { readJourney, readJourneys } from './journeys.js';
//# sourceMappingURL=index.js.map