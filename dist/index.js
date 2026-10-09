/**
 * The contract between a host and a module it frames.
 *
 * Shapes, and nothing else. Everything exported here is a type, a schema, a
 * constant, or a pure function over one of those. Nothing in this package reads
 * a file, opens a socket, holds state, or decides anything — see the README for
 * why that rule is load-bearing rather than tidy.
 */
export { PROTOCOL, WELL_KNOWN, MANIFEST_KIND, MESSAGE, MESSAGE_PREFIX, HOST_MESSAGES, MODULE_MESSAGES, MIN_HEIGHT, MAX_HEIGHT, REFRESH_EVERY_MIN, REFRESH_EVERY_MAX, clampHeight, } from './constants.js';
export { LIMITS } from './limits.js';
export { MODULE_ID, MODE_ID, EPIC_SLUG, canonicalModuleId, own, slugFrom } from './ids.js';
export { KEHIKOT_DIR, DATA_FILE, MODULE_FOLDER, KEHIKOT_IGNORE, moduleFolder, kehikotDir, moduleDir, moduleFile, within, ignoresKehikot, withKehikotIgnored, withoutKehikotIgnored, } from './project.js';
export { manifestSchema, speaks, partsDeclaration, MODULE_CONDITIONS, REACTS_TO, REACTION_NAMES, TAGS, TAG_NAMES, } from './manifest.js';
export { CAPABILITIES, CAPABILITY_NAMES, METHODS, METHOD_NAMES, methodParams, methodResults, resultSchemaFor, navigationResult, NAVIGATION_OUTCOMES, projectPickResult, pickedProject, PICK_OUTCOMES, epicSpine, epicsListResult, REPORTED_STAGES, } from './methods.js';
export { contextSchema, passageSchema, sectionSchema, showingSchema, containerSchema, helloSchema, contextMessageSchema, responseSchema, responseFailureReasons, gotoSchema, eventSchema, readySchema, requestSchema, resizeSchema, wentSchema, filtersSchema, filterGroupSchema, filterOptionSchema, filterChoiceSchema, dispositionSchema, DISPOSITIONS, clearableSchema, clearSchema, refreshableSchema, refreshSchema, hostMessageSchema, moduleMessageSchema, looksLikeWireMessage, } from './wire.js';
export { TRACKERS, TRACKER_KINDS, TRACKER_STATES, TRACKER_DETAILS, PIPELINE_STATES, REVIEW_STATES, LINK_RELATIONS, MISSING_REASONS, REFRESH_OUTCOMES, TRACKER_REFRESH_WITHIN_MS, trackerRowSchema, trackerLinkSchema, trackerFileSchema, trackerDetailSchema, trackerSourceSchema, trackerMissingSchema, trackerReadingResult, trackerRefreshResult, trackerSignalSchema, readTrackerRef, spellTrackerRef, } from './tracker.js';
export { PART_ID, partSchema, partsSchema, pickedParts, isFocused, refInFocus, partInFocus, focusCount, PAPER_MODULE, partFile, isPartFile, paperFileOf, partsOfFile, pickedFiles, fileInFocus, anchorInFocus, narrowToFocus, focusSentence, FOCUS_WHERE, sameParts, } from './parts.js';
export { JOURNEYS_MODULE, JOURNEYS_FILE, journeyStepSchema, journeyGroupSchema, stepsFromSchema, journeyRecordSchema, journeysDocumentSchema, journeyIn, journeySlugs, stepsOf, stepPart, partIdsOf, partsOf, } from './journey.js';
export { CONTENT_HOST, contentChangeSchema, contentSignalSchema, contentStamp, } from './content.js';
export { notificationPayload, callPayload, EXTENSIONS, EXTENSION_NAMES, known, schemaFor, } from './extensions.js';
export { CITE_STATUSES, CITE_MARKER, parseSource, serialiseSource, uncitable, markersIn, replaceMarkers, normaliseQuote, findQuote, resolveSource, linesOf, } from './citations.js';
/* The names a module's server and its own page agree on. See `page.ts`. */
export { PAGE_BACKGROUND, ROOT_ELEMENT, THEME_KEY, THEME_PARAM, TICKET_ELEMENT, TICKET_HEADER, TICKET_REFUSED, } from './page.js';
/* What a module's server is built from, and how two builds compare. See `build.ts`. */
export { BUILD_ELEMENT, BUILD_HEADER, PACKAGE_VERSION, buildIsStale, buildSchema, buildStamp, compareBuilds, describeBuild, readBuild, sameCode, sameProcess, } from './build.js';
