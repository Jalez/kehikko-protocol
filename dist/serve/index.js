/**
 * The part of a module that has to touch the machine: which port it binds (`claim`), where it says
 * so (`registerAt`), the Vite plugin that does both (`serves`), `readJourneys`/`readJourney`, and the
 * holdings of an epic's parts (`readHoldings`, `writeHoldings`).
 * Node-only — it binds sockets and reads and writes disk — so it stands beside the front door.
 * Design notes: docs/serving.md.
 */
export { claim, free, identify, originFor, readManifest, sayClaim, search, verdict, DRIFT_SPAN, IDENTIFY_TIMEOUT_MS, LOOPBACK, } from './ports.js';
export { DEFAULT_FRAME_ORIGINS, frameAncestors, frameOrigins } from './origins.js';
/* Whether a folder is a project the host holds: a module's server asks before it reads one. */
export { hostHasProject, hostIsProjectUrls, hostProject, forgetHostProjects, resolveDoorProject, hostPlace, hostPlaceUrls, placeTokenOf, resolveDoorPlace, PLACE_PATH, IS_PROJECT_PATH, isProjectResult, NO_HOST_ANSWERED, } from './host.js';
export { DOOR_PROJECT_SAYS, DOOR_PLACE_SAYS, PLACE_PARAM, placeDefaults } from '../door.js';
export { neighbourPorts, portOf, readRegistration, registerAt, takesOver, registryDir, } from './registry.js';
export { claimOrLeave, preferred, registerBound, serves, } from './plugin.js';
/* Another module, as this one can learn of it: its manifest and the tools at its door. */
export { doorOf, listTools, readNeighbour, readNeighbours, NEIGHBOUR_TIMEOUT_MS, } from './neighbours.js';
export { readJourney, readJourneys } from './journeys.js';
/* An epic's plan as a module publishes it (2.21.0): `steps.json` in its own folder, and every module's read. */
export { readPlans, readPlansFor, writePlan } from './plans.js';
export { PLAN_FILE, PLAN_VERSION } from '../plan.js';
/* What each module holds for an epic's parts: a host reads every module's, a module writes its own. */
export { holdingsSpoken, readHoldings, writeHoldings } from './holdings.js';
export { HOLDINGS_FILE, HOLDING_KINDS } from '../holdings.js';
/* The shared plumbing of a module's server: its page, its ticket, its doors. */
export { fillPage, pageDocument, themeScript, FRAMED_DEFAULT_THEME } from './page.js';
export { mintTicket, refuseTicket, sameTicket, ticketOf, TICKET_REFUSAL } from './ticket.js';
export { readJsonBody, readJsonRequest, saysJson, BODY_METHODS, BODY_NOT_JSON, BODY_TOO_LARGE, MAX_BODY_BYTES } from './body.js';
export { admits, asker, ELSEWHERE_REFUSAL } from './gate.js';
export { doors, doorsFetch, doorsHandler, PAGE_PATHS, } from './doors.js';
export { ORIGINS_ELEMENT, TICKET_HEADER, originAmong } from '../page.js';
/* A door of a module's own, asked before the protocol's, on Vite and on `run` alike (2.18.0). */
export { beforeDoors, beforeHandler, beforeInfo, requestOf, } from './before.js';
export { commitOf, establishBuild } from './build.js';
/* A module's settings door, and asking the host whether a person's pass is real (2.15.0). */
export { hostVouches, hostVouchUrls, settingsDoor, } from './settings.js';
export { SETTINGS_PATH, SETTINGS_PASS_PATH } from '../settings.js';
/* A module's server asking the host what its page would be told: the tracker reading, for its MCP door (2.19.0). */
export { askHost, hostAskUrls, mintServerPass, serverPassReply, spendServerPass, NO_HOST_TO_ASK, } from './ask.js';
export { SERVER_ASK_PATH, SERVER_PASS_PATH, SERVER_METHODS } from '../server-ask.js';
/* A question the host is too old for (2.22.0): read it off an `AskedHost`, show the one line. */
export { hostTooOld, FIT_SAYS } from '../fit.js';
/* A module's server noting its own calls, with their reasons, in the host's record of traffic (2.20.0). */
export { trafficNotes, TRAFFIC_FLUSH_MS, TRAFFIC_PENDING, } from './traffic.js';
export { trafficTarget, trafficPath, trafficCommand } from '../traffic.js';
