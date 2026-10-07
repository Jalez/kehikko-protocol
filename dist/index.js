/**
 * The contract between a host and a module it frames.
 *
 * Shapes, and nothing else. Everything exported here is a type, a schema, a
 * constant, or a pure function over one of those. Nothing in this package reads
 * a file, opens a socket, holds state, or decides anything — see the README for
 * why that rule is load-bearing rather than tidy.
 */
export { PROTOCOL, WELL_KNOWN, LEGACY_WELL_KNOWN, MANIFEST_KIND, LEGACY_MANIFEST_KIND, MESSAGE, MESSAGE_PREFIX, LEGACY_MESSAGE_PREFIX, MESSAGE_PREFIXES, HOST_MESSAGES, MODULE_MESSAGES, MIN_HEIGHT, MAX_HEIGHT, REFRESH_EVERY_MIN, REFRESH_EVERY_MAX, clampHeight, LIMITS, } from './constants.js';
export { MODULE_ID, MODE_ID, EPIC_SLUG, own, slugFrom } from './ids.js';
export { DIALECTS, canonicalName, legacyName, nameIn, canonicalModuleId, legacyModuleId, canonicalExtension, dialectOfType, dialectOfKind, toDialect, canonicalMessage, } from './dialect.js';
export { KEHIKOT_DIR, DATA_FILE, MODULE_FOLDER, KEHIKOT_IGNORE, moduleFolder, kehikotDir, moduleDir, moduleFile, within, ignoresKehikot, withKehikotIgnored, withoutKehikotIgnored, } from './project.js';
export { manifestSchema, legacyManifest, speaks, MODULE_CONDITIONS, REACTS_TO, REACTION_NAMES, TAGS, TAG_NAMES, } from './manifest.js';
export { CAPABILITIES, CAPABILITY_NAMES, METHODS, METHOD_NAMES, methodParams, methodResults, resultSchemaFor, navigationResult, NAVIGATION_OUTCOMES, projectPickResult, pickedProject, PICK_OUTCOMES, epicSpine, epicsListResult, REPORTED_STAGES, } from './methods.js';
export { contextSchema, passageSchema, sectionSchema, showingSchema, containerSchema, helloSchema, contextMessageSchema, responseSchema, responseFailureReasons, gotoSchema, eventSchema, readySchema, requestSchema, resizeSchema, wentSchema, filtersSchema, filterGroupSchema, filterOptionSchema, filterChoiceSchema, dispositionSchema, DISPOSITIONS, clearableSchema, clearSchema, refreshableSchema, refreshSchema, hostMessageSchema, moduleMessageSchema, looksLikeWireMessage, } from './wire.js';
export { TRACKERS, TRACKER_KINDS, TRACKER_STATES, TRACKER_DETAILS, PIPELINE_STATES, REVIEW_STATES, LINK_RELATIONS, MISSING_REASONS, REFRESH_OUTCOMES, TRACKER_REFRESH_WITHIN_MS, trackerRowSchema, trackerLinkSchema, trackerFileSchema, trackerDetailSchema, trackerSourceSchema, trackerMissingSchema, trackerReadingResult, trackerRefreshResult, trackerSignalSchema, readTrackerRef, spellTrackerRef, } from './tracker.js';
export { PART_ID, partSchema, partsSchema, pickedParts, isFocused, refInFocus, partInFocus, focusCount, } from './parts.js';
export { JOURNEYS_MODULE, JOURNEYS_FILE, journeyStepSchema, journeyGroupSchema, stepsFromSchema, journeyRecordSchema, journeysDocumentSchema, journeyIn, journeySlugs, stepsOf, stepPart, partIdsOf, partsOf, } from './journey.js';
export { CONTENT_HOST, contentChangeSchema, contentSignalSchema, contentStamp, } from './content.js';
export { notificationPayload, callPayload, EXTENSIONS, EXTENSION_NAMES, known, schemaFor, } from './extensions.js';
//# sourceMappingURL=index.js.map