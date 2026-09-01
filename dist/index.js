/**
 * The contract between a host and a module it frames.
 *
 * Shapes, and nothing else. Everything exported here is a type, a schema, a
 * constant, or a pure function over one of those. Nothing in this package reads
 * a file, opens a socket, holds state, or decides anything — see the README for
 * why that rule is load-bearing rather than tidy.
 */
export { PROTOCOL, WELL_KNOWN, MANIFEST_KIND, MESSAGE, MESSAGE_PREFIX, HOST_MESSAGES, MODULE_MESSAGES, MIN_HEIGHT, MAX_HEIGHT, clampHeight, LIMITS, } from './constants.js';
export { MODULE_ID, MODE_ID, EPIC_SLUG, own } from './ids.js';
export { KEHIKOT_DIR, DATA_FILE, MODULE_FOLDER, KEHIKOT_IGNORE, moduleFolder, kehikotDir, moduleDir, moduleFile, within, ignoresKehikot, withKehikotIgnored, withoutKehikotIgnored, } from './project.js';
export { manifestSchema, speaks, MODULE_CONDITIONS, REACTS_TO, REACTION_NAMES, } from './manifest.js';
export { CAPABILITIES, CAPABILITY_NAMES, METHODS, METHOD_NAMES, methodParams, methodResults, resultSchemaFor, navigationResult, NAVIGATION_OUTCOMES, epicSpine, epicsListResult, REPORTED_STAGES, } from './methods.js';
export { contextSchema, passageSchema, helloSchema, contextMessageSchema, responseSchema, responseFailureReasons, gotoSchema, eventSchema, readySchema, requestSchema, resizeSchema, wentSchema, filtersSchema, filterGroupSchema, filterOptionSchema, filterChoiceSchema, clearableSchema, clearSchema, hostMessageSchema, moduleMessageSchema, looksLikeWireMessage, } from './wire.js';
export { notificationPayload, callPayload, EXTENSIONS, EXTENSION_NAMES, known, schemaFor, } from './extensions.js';
//# sourceMappingURL=index.js.map