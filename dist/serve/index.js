/**
 * The part of a module that has to touch the machine: which port it binds (`claim`), where it says
 * so (`registerAt`), the Vite plugin that does both (`serves`), `readJourneys`/`readJourney`, and the
 * holdings of an epic's parts (`readHoldings`, `writeHoldings`).
 * Node-only — it binds sockets and reads and writes disk — so it stands beside the front door.
 * Design notes: docs/serving.md.
 */
export { claim, free, identify, originFor, readManifest, sayClaim, search, verdict, DRIFT_SPAN, IDENTIFY_TIMEOUT_MS, LOOPBACK, } from './ports.js';
export { DEFAULT_FRAME_ORIGINS, frameAncestors, frameOrigins } from './origins.js';
/* The host that started this module, and the only doors a session is handed on it (2.95.0). */
export { askedHosts, doorConfigProblems, doorTarget, doorUrl, isStableDoor, keptFolderName, legacyKeptFolderName, loopbackOrigin, stableDoor, stableDoors, startingHost, tokenOnDoor, HOST_DOOR_MODULE, HOST_ENV, MODULE_PATH_PREFIX, } from './host-door.js';
/* Whether a folder is a project the host holds: a module's server asks before it reads one. */
export { hostHasProject, hostIsProjectUrls, hostProject, forgetHostProjects, resolveDoorProject, hostPlace, hostPlaceUrls, placeTokenOf, resolveDoorPlace, PLACE_PATH, IS_PROJECT_PATH, isProjectResult, NO_HOST_ANSWERED, } from './host.js';
export { DOOR_PROJECT_SAYS, DOOR_PLACE_SAYS, PLACE_PARAM, placeDefaults } from '../door.js';
export { neighbourPorts, portOf, readRegistration, registerAt, takesOver, registryDir, } from './registry.js';
export { anyPort, claimOrLeave, preferred, registerBound, serves, } from './plugin.js';
/* Another module, as this one can learn of it: its manifest and the tools at its door. */
export { doorOf, listTools, readNeighbour, readNeighbours, NEIGHBOUR_TIMEOUT_MS, } from './neighbours.js';
/* 2.83.0. Using a service from a module's server, and proving who calls one. */
export { findService, callServiceTool, fetchService, callerHeaders, vouchCaller, vouchHost, } from './services.js';
export { readJourney, readJourneys } from './journeys.js';
/* An epic's plan as a module publishes it (2.21.0): `steps.json` in its own folder, and every module's read. */
export { readPlans, readPlansFor, writePlan } from './plans.js';
export { PLAN_FILE, PLAN_VERSION } from '../plan.js';
/* What each module holds for an epic's parts: a host reads every module's, a module writes its own. */
export { holdingsSpoken, readHoldings, writeHoldings } from './holdings.js';
export { HOLDINGS_FILE, HOLDING_KINDS } from '../holdings.js';
/* Run results any module publishes (2.27.0): read every publisher's, write one's own. */
export { readRuns, writeRuns } from './runs.js';
export { RUNS_FILE, RUNS_VERSION, RUN_RESULT_STATES, RUN_RESULT_KINDS, runEnded, runResultSchema, runsIn, latestRuns } from '../runs.js';
/* The shared plumbing of a module's server: its page, its ticket, its doors. */
export { errorsScript, fillPage, pageDocument, themeScript, FRAMED_DEFAULT_THEME } from './page.js';
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
/* The message tools every module that runs agent sessions puts on its MCP door (2.41.0): a thin adapter over `askHost`. */
export { answerMessageTool, forgetMessageHosts, hostKeepsMessages, hostOnMessages, messageToolsFor, messageWaker, messageDelivery, DELIVERY_KEEP_MS, ASLEEP_EVERY_MS, WAKE_EVERY_MS, WAKE_SETTLE_MS, placeTeller, tellDigest, TELL_EVERY_MS, callToken, } from './messages.js';
/* 2.96.0. One key for a conversation however it started, and the delivery knock. See `adopt.ts`. */
export { freshPlaceToken, issuePlaceToken, deliveryReply } from './adopt.js';
export { messageTools, isMessageTool, MESSAGE_TOOL_NAMES, ACT_ON_MESSAGES_SETTING, WAKE_ON_MESSAGES_SETTING, actsOnMessages, wakesOnMessages, typedMessages, markersNote, shortPath, pasted, deliveryFor, DELIVERY_STATES, RESUME_EVERY_MS, RESUME_MOST, } from '../agent-messages.js';
/* The projects this module keeps something in, asked at start and on a slow clock, each handed to its own `know` (2.76.0). */
export { watchKnownProjects, KNOWN_PROJECTS_EVERY_MS, KNOWN_PROJECTS_RETRY_MS, } from './known-projects.js';
/* A question the host is too old for (2.22.0): read it off an `AskedHost`, show the one line. */
export { hostTooOld, FIT_SAYS } from '../fit.js';
/* A module's server noting its own calls, with their reasons, in the host's record of traffic (2.20.0). */
export { trafficNotes, TRAFFIC_FLUSH_MS, TRAFFIC_PENDING, } from './traffic.js';
export { trafficTarget, trafficPath, trafficCommand } from '../traffic.js';
/* A module telling its page something changed, over one held connection: a page never polls (2.32.0). */
export { attach, eventFrame, events, publish, streams, watching, EVENTS_BAD_TOPIC, EVENTS_FULL, MAX_EVENT_STREAMS, MAX_TOPIC_LENGTH, } from './events.js';
/* The environment for what a module starts on the person's behalf, without the host's own Bun. */
export { personEnv, utf8Locale, HOST_PATH_ENV } from './person.js';
/* A door's tools changed: MCP's `notifications/tools/list_changed` on its listening stream (2.62.0). See `tools-changed.ts`. */
export { MAX_TOOL_STREAMS, TOOLS_LIST_CHANGED, TOOLS_RETRY_MS, markOfEventId, mcpPathOf, sayingListChanged, toolsChanged, toolsMark, toolStream, wantsToolStream, } from './tools-changed.js';
/* Which kind of git checkout a file is in, for an edit guard (2.78.0). See `checkout.ts`. */
export { checkoutOf } from './checkout.js';
/* The one call every agent module makes before any tool runs, under every guard kind (2.80.0). See `tools.ts`. */
export { checkToolCall } from './tools.js';
