/**
 * The part of a module that has to touch the machine: which port it binds (`claim`), where it says
 * so (`registerAt`), the Vite plugin that does both (`serves`), `readJourneys`/`readJourney`, and the
 * holdings of an epic's parts (`readHoldings`, `writeHoldings`).
 * Node-only — it binds sockets and reads and writes disk — so it stands beside the front door.
 * Design notes: docs/serving.md.
 */

export {
  claim,
  free,
  identify,
  originFor,
  readManifest,
  sayClaim,
  search,
  verdict,
  DRIFT_SPAN,
  IDENTIFY_TIMEOUT_MS,
  LOOPBACK,
  type Claimed,
  type ClaimOptions,
  type Occupant,
  type Verdict,
} from './ports.js'

export { DEFAULT_FRAME_ORIGINS, frameAncestors, frameOrigins } from './origins.js'

/* Whether a folder is a project the host holds: a module's server asks before it reads one. */
export {
  hostHasProject,
  hostIsProjectUrls,
  hostProject,
  resolveDoorProject,
  hostPlace,
  hostPlaceUrls,
  placeTokenOf,
  resolveDoorPlace,
  PLACE_PATH,
  IS_PROJECT_PATH,
  isProjectResult,
  NO_HOST_ANSWERED,
  type DoorProject,
  type HostHasProjectOptions,
  type HostProject,
  type IsProjectResult,
} from './host.js'
export { DOOR_PROJECT_SAYS, DOOR_PLACE_SAYS, PLACE_PARAM, placeDefaults, type DoorPlace } from '../door.js'

export {
  neighbourPorts,
  portOf,
  readRegistration,
  registerAt,
  takesOver,
  registryDir,
  type Registered,
  type Registration,
} from './registry.js'

export {
  preferred,
  serves,
  type DevServerLike,
  type HttpServerLike,
  type ServesOptions,
  type ServesPlugin,
} from './plugin.js'

/* Another module, as this one can learn of it: its manifest and the tools at its door. */
export {
  doorOf,
  listTools,
  readNeighbour,
  readNeighbours,
  NEIGHBOUR_TIMEOUT_MS,
  type Neighbour,
  type NeighbourOptions,
} from './neighbours.js'

export { readJourney, readJourneys } from './journeys.js'

/* What each module holds for an epic's parts: a host reads every module's, a module writes its own. */
export { holdingsSpoken, readHoldings, writeHoldings, type HoldingsWritten } from './holdings.js'
export { HOLDINGS_FILE, HOLDING_KINDS, type HoldingKind, type EpicHoldings, type PartHoldings, type ProjectHoldings } from '../holdings.js'

/* The shared plumbing of a module's server: its page, its ticket, its doors. */
export { fillPage, pageDocument, themeScript, FRAMED_DEFAULT_THEME, type PageOptions } from './page.js'
export { mintTicket, refuseTicket, sameTicket, ticketOf, TICKET_REFUSAL } from './ticket.js'
export { readJsonBody, readJsonRequest, saysJson, BODY_METHODS, BODY_NOT_JSON, BODY_TOO_LARGE, MAX_BODY_BYTES, type BodyOptions, type BodyRead, type BodySource } from './body.js'
export { admits, asker, ELSEWHERE_REFUSAL, type Asker, type HeaderSource } from './gate.js'
export {
  doors,
  doorsFetch,
  doorsHandler,
  PAGE_PATHS,
  type Answer,
  type DoorFetch,
  type DoorHandler,
  type DoorRequest,
  type DoorResponse,
  type DoorsOptions,
  type DoorsPlugin,
  type DoorsServerLike,
  type Reply,
  type Stream,
} from './doors.js'
export { ORIGINS_ELEMENT, TICKET_HEADER, originAmong } from '../page.js'
export { commitOf, establishBuild } from './build.js'
