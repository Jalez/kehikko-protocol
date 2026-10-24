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
export { MODULE_ID, MODE_ID, EPIC_SLUG, KEHIKKO_KEY, PROJECT_ID, own, slugFrom } from './ids.js';
export { KEHIKOT_DIR, DATA_FILE, MODULE_FOLDER, KEHIKOT_IGNORE, moduleFolder, kehikotDir, moduleDir, moduleFile, within, ignoresKehikot, withKehikotIgnored, withoutKehikotIgnored, PROJECT_FILE, PROJECT_FILE_IGNORE, HOST_FOLDER, LEGACY_HOST_FOLDER, hostDir, hostFile, legacyHostFile, projectFile, projectFileSchema, readProjectFile, projectKey, ignoresProjectFile, withProjectFileIgnored, } from './project.js';
export { DOOR_NAME, manifestSchema, speaks, partsDeclaration, scopesOf, showsProject, MODULE_CONDITIONS, REACTS_TO, REACTION_NAMES, TAGS, TAG_NAMES, } from './manifest.js';
/* What a module's MCP door agrees with every other's. See `door.ts`. */
export { DOOR_ARGUMENTS, DOOR_ARGUMENTS_BEFORE, DOOR_PROJECT_SAYS, DOOR_PLACE_SAYS, PLACE_PARAM, PLACE_TOKEN, doorPlaceSchema, lookingSchema, placeResult, placeIssueSchema, placeDoorsSchema, recordedPlaceResult, RECORDED_PLACE_PATH, placeDefaults, doorContext, SHOW_OUTCOMES, showAnswerSchema, SHOW_OUTPUT_SCHEMA, DONE_STATES, doneItemSchema, doneAnswerSchema, doneAnswer, DONE_OUTPUT_SCHEMA, doorToolSchema, toolEffect, TOOL_EFFECTS, } from './door.js';
export { CAPABILITIES, CAPABILITY_NAMES, METHODS, METHOD_NAMES, methodParams, methodResults, resultSchemaFor, navigationResult, NAVIGATION_OUTCOMES, foldResult, FOLD_OUTCOMES, partsSetResult, PARTS_SET_OUTCOMES, activitySetResult, ACTIVITY_SET_OUTCOMES, locationSetResult, LOCATION_SET_OUTCOMES, addressOpenResult, ADDRESS_OPEN_OUTCOMES, projectPickResult, pickedProject, PICK_OUTCOMES, epicSpine, epicsListResult, REPORTED_STAGES, } from './methods.js';
export { ACTIVITY_STATES, ACTIVITY_PRIORITIES, activityItemSchema, activityItemsSchema, worstActivity, } from './activity.js';
export { contextSchema, CONTEXT_SCOPES, scopeOf, passageSchema, sectionSchema, codeLocationSchema, sharedLocationSchema, repoPath, CODE_SIDES, LOCATION_INTENTS, COMMIT_SHA, locationStands, samePlace, locationLabel, sharedAddressSchema, webAddress, addressRefusal, isWebAddress, addressIsNews, addressLabel, ADDRESS_INTENTS, LOOPBACK_HOSTS, showingSchema, containerSchema, helloSchema, contextMessageSchema, responseSchema, responseFailureReasons, gotoSchema, eventSchema, readySchema, requestSchema, resizeSchema, wentSchema, filtersSchema, filterGroupSchema, filterOptionSchema, filterChoiceSchema, dispositionSchema, DISPOSITIONS, clearableSchema, clearSchema, refreshableSchema, refreshSchema, headerSchema, HEADER_ICONS, pinnedRuns, headerItemSchema, headerItemsSchema, headerOptionSchema, pressSchema, pressedSchema, pressValueSchema, pressRefusal, HEADER_KINDS, HEADER_MENUS, HEADER_MENU_NAMES, RUN_STATES, RUN_SURFACES, hostMessageSchema, moduleMessageSchema, looksLikeWireMessage, } from './wire.js';
export { TRACKERS, TRACKER_KINDS, TRACKER_STATES, TRACKER_DETAILS, PIPELINE_STATES, REVIEW_STATES, LINK_RELATIONS, MISSING_REASONS, REFRESH_OUTCOMES, TRACKER_REFRESH_WITHIN_MS, trackerRowSchema, trackerLinkSchema, trackerFileSchema, trackerDetailSchema, trackerSourceSchema, trackerMissingSchema, trackerReadingResult, trackerRefreshResult, trackerSignalSchema, trackerColumnSchema, trackerBoardSchema, trackerColumnsResult, REVIEWER_STATES, MY_ROLES, trackerReviewerSchema, trackerDiscussionsSchema, LAST_ACTIVITY_KINDS, trackerActivitySchema, trackerStackSchema, trackerPersonSchema, trackerBranchSchema, WORK_ITEM_TYPES, avatarUrlSchema, isHttpsUrl, readTrackerRef, spellTrackerRef, } from './tracker.js';
export { PART_ID, partSchema, partsSchema, listedPartSchema, partListSchema, partIdFor, partsFor, PARTS_BEFORE_1_2, pickedParts, isFocused, refInFocus, partInFocus, focusCount, PAPER_MODULE, partFile, isPartFile, paperFileOf, partsOfFile, pickedFiles, fileInFocus, partDocument, isPartDocument, documentOf, pickedDocuments, anchorInFocus, narrowToFocus, emptySaid, focusSentence, FOCUS_WHERE, sameParts, } from './parts.js';
/* What a module holds for an epic's parts, as it publishes it. The file is opened behind `/serve`. */
export { HOLDINGS_FILE, HOLDINGS_VERSION, HOLDING_KINDS, spokenIn, } from './holdings.js';
export { JOURNEYS_MODULE, JOURNEYS_FILE, journeyStepSchema, journeyGroupSchema, stepsFromSchema, journeyRecordSchema, journeysDocumentSchema, journeyIn, journeySlugs, stepsOf, stepPart, partIdsOf, partsOf, } from './journey.js';
export { CONTENT_HOST, contentChangeSchema, contentSignalSchema, contentStamp, } from './content.js';
export { notificationPayload, callPayload, EXTENSIONS, EXTENSION_NAMES, known, schemaFor, } from './extensions.js';
export { CITE_STATUSES, CITE_MARKER, parseSource, serialiseSource, uncitable, markersIn, replaceMarkers, normaliseQuote, findQuote, resolveSource, linesOf, } from './citations.js';
/* The names a module's server and its own page agree on. See `page.ts`. */
export { PAGE_BACKGROUND, ROOT_ELEMENT, THEME_KEY, THEME_PARAM, ORIGINS_ELEMENT, TICKET_ELEMENT, TICKET_HEADER, originAmong, TICKET_REFUSED, } from './page.js';
/* What a module's server is built from, and how two builds compare. See `build.ts`. */
export { BUILD_ELEMENT, BUILD_HEADER, PACKAGE_VERSION, buildIsStale, buildSchema, buildStamp, compareBuilds, describeBuild, readBuild, sameCode, sameProcess, } from './build.js';
/* Claude Code skills a module offers, and where it serves them (2.5.0); what each needs beside its module (2.12.0). See `skills.ts`. */
export { SKILL_NAME, SKILLS_PATH, skillPath, isSkillName, skillNameSchema, moduleSkillSchema, moduleSkillsSchema, skillNeedsSchema, isKehikkoBound, missingNeeds, skillTextBytes, skillTextIssue, } from './skills.js';
/* The icon a module is known by, as a key a host draws: `lucide:<name>` or `brand:<slug>` (2.14.0). See `icon.ts`. */
export { MODULE_ICONS, MODULE_ICON_SETS, LUCIDE_MODULE_ICONS, BRAND_MODULE_ICONS, isModuleIcon, moduleIconParts, } from './icon.js';
/* A module's server asking the host what its page would be told (2.19.0). See `server-ask.ts`; the asking is `askHost` in `/serve`. */
export { SERVER_ASK_PATH, SERVER_PASS_PATH, SERVER_METHODS, SERVER_PASS, SERVER_ASK_REFUSALS, serverAskSchema, serverAskResult, serverPassResult, } from './server-ask.js';
/* A module's settings, shown and changed in the host, read and written by the module at its door (2.15.0). See `settings.ts`. */
export { SETTING_TYPES, SETTING_SCOPES, SETTING_KEY, SETTINGS_ASKERS, SETTINGS_PASS, SETTINGS_PATH, SETTINGS_PASS_PATH, SETTINGS_SET_OUTCOMES, SETTINGS_SAYS, DOOR_CAPABILITIES, DOOR_METHODS, DOOR_METHOD_NAMES, doorMethodParams, doorMethodResults, offersDoorCapability, settingKeySchema, settingChoiceSchema, settingFieldSchema, settingsDeclarationSchema, settingsGetResult, settingsSetResult, settingsPassResult, settingsPassAboutSchema, settingValueIssue, settingsSetRefusal, settingsValues, } from './settings.js';
