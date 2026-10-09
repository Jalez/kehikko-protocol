/**
 * The part of a module that has to touch the machine: which port it binds (`claim`), where it says
 * so (`registerAt`), the Vite plugin that does both (`serves`), and `readJourneys`/`readJourney`.
 * Node-only — it binds sockets and reads and writes disk — so it stands beside the front door.
 * Design notes: docs/serving.md.
 */
export { claim, free, identify, originFor, readManifest, sayClaim, search, verdict, DRIFT_SPAN, IDENTIFY_TIMEOUT_MS, LOOPBACK, } from './ports.js';
export { DEFAULT_FRAME_ORIGINS, frameAncestors, frameOrigins } from './origins.js';
export { neighbourPorts, portOf, readRegistration, registerAt, registryDir, } from './registry.js';
export { preferred, serves, } from './plugin.js';
export { readJourney, readJourneys } from './journeys.js';
/* The shared plumbing of a module's server: its page, its ticket, its doors. */
export { fillPage, pageDocument, themeScript, FRAMED_DEFAULT_THEME } from './page.js';
export { mintTicket, refuseTicket, sameTicket, ticketOf, TICKET_REFUSAL } from './ticket.js';
export { readJsonBody, readJsonRequest, BODY_METHODS, BODY_TOO_LARGE, MAX_BODY_BYTES } from './body.js';
export { doors, doorsFetch, doorsHandler, PAGE_PATHS, } from './doors.js';
export { TICKET_HEADER } from '../page.js';
export { commitOf, establishBuild } from './build.js';
