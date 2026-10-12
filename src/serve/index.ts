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

export {
  neighbourPorts,
  portOf,
  readRegistration,
  registerAt,
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
export { readHoldings, writeHoldings, type HoldingsWritten } from './holdings.js'
export { HOLDINGS_FILE, type EpicHoldings, type PartHoldings, type ProjectHoldings } from '../holdings.js'

/* The shared plumbing of a module's server: its page, its ticket, its doors. */
export { fillPage, pageDocument, themeScript, FRAMED_DEFAULT_THEME, type PageOptions } from './page.js'
export { mintTicket, refuseTicket, sameTicket, ticketOf, TICKET_REFUSAL } from './ticket.js'
export { readJsonBody, readJsonRequest, BODY_METHODS, BODY_TOO_LARGE, MAX_BODY_BYTES, type BodyOptions, type BodyRead, type BodySource } from './body.js'
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
export { TICKET_HEADER } from '../page.js'
export { commitOf, establishBuild } from './build.js'
