/**
 * The part of a module that has to touch the machine: which port it binds (`claim`), where it says
 * so (`registerAt`), the Vite plugin that does both (`serves`), `readJourneys`/`readJourney`, and the
 * holdings of an epic's parts (`readHoldings`, `writeHoldings`).
 * Node-only — it binds sockets and reads and writes disk — so it stands beside the front door.
 * Design notes: docs/serving.md.
 */
export { claim, free, identify, originFor, readManifest, sayClaim, search, verdict, DRIFT_SPAN, IDENTIFY_TIMEOUT_MS, LOOPBACK, type Claimed, type ClaimOptions, type Occupant, type Verdict, } from './ports.js';
export { DEFAULT_FRAME_ORIGINS, frameAncestors, frameOrigins } from './origins.js';
export { hostHasProject, hostIsProjectUrls, hostProject, forgetHostProjects, resolveDoorProject, hostPlace, hostPlaceUrls, placeTokenOf, resolveDoorPlace, PLACE_PATH, IS_PROJECT_PATH, isProjectResult, NO_HOST_ANSWERED, type DoorProject, type HostHasProjectOptions, type HostProject, type IsProjectResult, } from './host.js';
export { DOOR_PROJECT_SAYS, DOOR_PLACE_SAYS, PLACE_PARAM, placeDefaults, type DoorPlace } from '../door.js';
export { neighbourPorts, portOf, readRegistration, registerAt, takesOver, registryDir, type Registered, type Registration, } from './registry.js';
export { claimOrLeave, preferred, registerBound, serves, type DevServerLike, type HttpServerLike, type ServesOptions, type ServesPlugin, } from './plugin.js';
export { doorOf, listTools, readNeighbour, readNeighbours, NEIGHBOUR_TIMEOUT_MS, type Neighbour, type NeighbourOptions, } from './neighbours.js';
export { readJourney, readJourneys } from './journeys.js';
export { readPlans, readPlansFor, writePlan, type PublishedPlans, type PlanWritten } from './plans.js';
export { PLAN_FILE, PLAN_VERSION, type Plan, type PlanInput } from '../plan.js';
export { holdingsSpoken, readHoldings, writeHoldings, type HoldingsWritten } from './holdings.js';
export { HOLDINGS_FILE, HOLDING_KINDS, type HoldingKind, type EpicHoldings, type PartHoldings, type ProjectHoldings } from '../holdings.js';
export { readRuns, writeRuns, type RunsWritten } from './runs.js';
export { RUNS_FILE, RUNS_VERSION, RUN_RESULT_STATES, RUN_RESULT_KINDS, runEnded, runResultSchema, runsIn, latestRuns, type RunResult, type RunResultState, type RunResultKind, type PublishedRun } from '../runs.js';
export { fillPage, pageDocument, themeScript, FRAMED_DEFAULT_THEME, type PageOptions } from './page.js';
export { mintTicket, refuseTicket, sameTicket, ticketOf, TICKET_REFUSAL } from './ticket.js';
export { readJsonBody, readJsonRequest, saysJson, BODY_METHODS, BODY_NOT_JSON, BODY_TOO_LARGE, MAX_BODY_BYTES, type BodyOptions, type BodyRead, type BodySource } from './body.js';
export { admits, asker, ELSEWHERE_REFUSAL, type Asker, type HeaderSource } from './gate.js';
export { doors, doorsFetch, doorsHandler, PAGE_PATHS, type Answer, type DoorFetch, type DoorHandler, type DoorRequest, type DoorResponse, type DoorsOptions, type DoorsPlugin, type DoorsServerLike, type Reply, type Stream, } from './doors.js';
export { ORIGINS_ELEMENT, TICKET_HEADER, originAmong } from '../page.js';
export { beforeDoors, beforeHandler, beforeInfo, requestOf, type Before, type BeforeInfo, type BeforePlugin, type BeforeServerLike, } from './before.js';
export { commitOf, establishBuild } from './build.js';
export { hostVouches, hostVouchUrls, settingsDoor, type HostVouchesOptions, type SettingsDoorOptions, type SettingsRead, } from './settings.js';
export { SETTINGS_PATH, SETTINGS_PASS_PATH } from '../settings.js';
export { askHost, hostAskUrls, mintServerPass, serverPassReply, spendServerPass, NO_HOST_TO_ASK, type AskedHost, type AskHostOptions, type ServerAnswers, } from './ask.js';
export { SERVER_ASK_PATH, SERVER_PASS_PATH, SERVER_METHODS, type ServerMethod } from '../server-ask.js';
export { answerMessageTool, forgetMessageHosts, hostKeepsMessages, messageToolsFor, type MessageToolAnswer, type MessageToolOptions, } from './messages.js';
export { messageTools, isMessageTool, MESSAGE_TOOL_NAMES, type MessageToolDefinition } from '../agent-messages.js';
export { hostTooOld, FIT_SAYS, type HostTooOld } from '../fit.js';
export { trafficNotes, TRAFFIC_FLUSH_MS, TRAFFIC_PENDING, type TrafficNotes, type TrafficNotesOptions, type TrafficCallSaid, } from './traffic.js';
export { trafficTarget, trafficPath, trafficCommand } from '../traffic.js';
export { attach, eventFrame, events, publish, streams, watching, EVENTS_BAD_TOPIC, EVENTS_FULL, MAX_EVENT_STREAMS, MAX_TOPIC_LENGTH, type EventRoute, type Initial, } from './events.js';
export { personEnv, HOST_PATH_ENV, type PersonEnvOptions } from './person.js';
