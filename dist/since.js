import { PROTOCOL_VERSION } from './ids.js';
import { METHODS } from './methods.js';
/**
 * Which version of this package each piece of the protocol arrived in (2.22.0): every method, every
 * capability, every method a module's SERVER may ask, and every manifest declaration a host has to
 * know to do what the module asks of it. What `needsOf` and `fitOf` (`fit.ts`) read to say whether a
 * module and a host fit. Taken from CHANGELOG.md and held to it by `test/v2-22.test.ts`. A piece
 * that was there at the first tag (0.25.0) says `SINCE_FLOOR`. Design notes: docs/fit.md.
 */
/** The oldest version the protocol has a tag for. A piece that says it was there from the start. */
export const SINCE_FLOOR = '0.25.0';
/** Each method, and the version that added it. */
export const METHOD_SINCE = {
    'epics.list': SINCE_FLOOR,
    'epic.get': SINCE_FLOOR,
    'steps.list': SINCE_FLOOR,
    'live.get': SINCE_FLOOR,
    'stage.report': SINCE_FLOOR,
    'events.emit': SINCE_FLOOR,
    'view.goto': SINCE_FLOOR,
    'view.fold': '1.1.0',
    'selection.set': SINCE_FLOOR,
    'passage.set': SINCE_FLOOR,
    'location.set': '2.13.0',
    'address.open': '2.16.0',
    'filters.set': SINCE_FLOOR,
    'showing.set': SINCE_FLOOR,
    'projects.pick': SINCE_FLOOR,
    'state.set': SINCE_FLOOR,
    'disposition.set': SINCE_FLOOR,
    'tracker.get': SINCE_FLOOR,
    'tracker.refresh': SINCE_FLOOR,
    'tracker.columns': '2.6.0',
    'content.changed': '0.27.0',
    'parts.set': '1.2.0',
    'activity.set': '1.5.0',
    'traffic.read': '2.20.0',
    'traffic.note': '2.20.0',
    'parts.get': '2.21.0',
    'dispositions.get': '2.21.0',
};
/** Each capability, and the version that added it: the oldest of its methods. */
export const CAPABILITY_SINCE = {
    'epics:read': SINCE_FLOOR,
    'steps:read': SINCE_FLOOR,
    'live:read': SINCE_FLOOR,
    'stage:report': SINCE_FLOOR,
    'events:emit': SINCE_FLOOR,
    'view:navigate': SINCE_FLOOR,
    'view:fold': '1.1.0',
    'selection:set': SINCE_FLOOR,
    'passage:set': SINCE_FLOOR,
    'location:set': '2.13.0',
    'address:open': '2.16.0',
    'filters:set': SINCE_FLOOR,
    'showing:set': SINCE_FLOOR,
    'projects:pick': SINCE_FLOOR,
    'state:keep': SINCE_FLOOR,
    'disposition:set': SINCE_FLOOR,
    'trackers:read': SINCE_FLOOR,
    'trackers:refresh': SINCE_FLOOR,
    'content:report': '0.27.0',
    'parts:set': '1.2.0',
    'activity:report': '1.5.0',
    'traffic:read': '2.20.0',
    'traffic:report': '2.20.0',
    'parts:read': '2.21.0',
    'dispositions:read': '2.21.0',
};
/** Each method a module's server may ask (`SERVER_METHODS`), and the version a server could first ask it in. */
export const SERVER_METHOD_SINCE = {
    'tracker.get': '2.19.0',
    'tracker.columns': '2.19.0',
    'traffic.read': '2.20.0',
    'traffic.note': '2.20.0',
    'epics.list': '2.21.0',
    'epic.get': '2.21.0',
    'steps.list': '2.21.0',
    'parts.get': '2.21.0',
    'dispositions.get': '2.21.0',
};
/**
 * The manifest declarations a host has to know to do what the module asks, and the version that
 * added each. Named by where they are in a manifest; `skills.needs.object` is a skill need written
 * as an object (`{ provides }`, `{ subject }`, `{ reacts }`, `{ uses }`), which a host before 2.21.0
 * refuses the whole manifest for. What a module only says about itself (`reacts`, `tags`, `icon`) is
 * not here: an older host still runs a module that says it.
 */
export const DECLARATION_SINCE = {
    'mcp.subjects': '1.1.0',
    'mcp.as': '1.3.0',
    'declares.skills': '2.5.0',
    'declares.scopes': '2.9.0',
    'skills.needs': '2.12.0',
    'declares.settings': '2.15.0',
    'declares.provides': '2.21.0',
    'declares.agentSessions': '2.21.0',
    'skills.needs.object': '2.21.0',
};
export const DECLARATION_NAMES = Object.keys(DECLARATION_SINCE);
/** Every table, in one place. Plain objects: read them with `sinceOf`, never by indexing with a stranger's string. */
export const SINCE = {
    methods: METHOD_SINCE,
    capabilities: CAPABILITY_SINCE,
    serverMethods: SERVER_METHOD_SINCE,
    declarations: DECLARATION_SINCE,
};
const TABLE = {
    method: METHOD_SINCE,
    capability: CAPABILITY_SINCE,
    serverMethod: SERVER_METHOD_SINCE,
    declaration: DECLARATION_SINCE,
};
/**
 * The version a piece arrived in, or null when this package does not know it: a piece from a
 * newer protocol, or a word nobody defined.
 */
export function sinceOf(kind, piece) {
    const table = TABLE[kind];
    return Object.hasOwn(table, piece) ? (table[piece] ?? null) : null;
}
/**
 * What a piece is called for a person, in a few words that fit "It uses ___". One per capability
 * and declaration; a method is called what its capability is called.
 */
export const PIECE_SAID = {
    capabilities: {
        'epics:read': 'the list of epics',
        'steps:read': "an epic's steps",
        'live:read': 'the live tracker state',
        'stage:report': 'stage reports',
        'events:emit': 'notices to other modules',
        'view:navigate': 'navigation',
        'view:fold': 'container folding',
        'selection:set': 'the shared selection',
        'passage:set': 'the shared passage',
        'location:set': 'places in code',
        'address:open': 'web addresses on the canvas',
        'filters:set': 'its own filters',
        'showing:set': 'the list of what containers show',
        'projects:pick': 'the project picker',
        'state:keep': 'kept state',
        'disposition:set': 'marks for why references closed',
        'trackers:read': 'the tracker reading',
        'trackers:refresh': 'tracker refreshes',
        'content:report': 'content reports',
        'parts:set': "edits to an epic's parts",
        'activity:report': 'activity marks',
        'traffic:read': 'the call log',
        'traffic:report': 'its own entries in the call log',
        'parts:read': "an epic's parts from the host",
        'dispositions:read': 'marks for why references closed, from the host',
    },
    declarations: {
        'mcp.subjects': 'door subjects',
        'mcp.as': 'a door name of its own',
        'declares.skills': 'agent skills',
        'declares.scopes': 'the all-epics view',
        'skills.needs': 'skills that need other modules',
        'declares.settings': 'settings',
        'declares.provides': 'material it publishes for other modules',
        'declares.agentSessions': 'agent sessions',
        'skills.needs.object': 'skills that need what other modules provide',
    },
};
/** A piece in a person's words, or the piece as written when this package has no words for it. */
export function pieceSaid(kind, piece) {
    if (kind === 'declaration')
        return own(PIECE_SAID.declarations, piece) ?? piece;
    if (kind === 'capability')
        return own(PIECE_SAID.capabilities, piece) ?? piece;
    const capability = methodCapability(piece);
    return capability ? (own(PIECE_SAID.capabilities, capability) ?? piece) : piece;
}
/**
 * Pieces a release REMOVED, and the version that removed them: what makes a module too OLD for a
 * host. Empty in every 2.x: nothing has been taken away since 2.0.0 that a manifest can name. The
 * 3.0 release that removes a method, a capability or a declaration lists it here.
 */
export const REMOVED = {
    method: {},
    capability: {},
    serverMethod: {},
    declaration: {},
};
/** The version that removed a piece, or null when nothing has. */
export function removedIn(kind, piece) {
    const table = REMOVED[kind];
    return Object.hasOwn(table, piece) ? (table[piece] ?? null) : null;
}
/* ------------------------------------------------------------------------ *
 * Versions
 * ------------------------------------------------------------------------ */
/** A version as three numbers, or null when it is not spelled `major.minor.patch`. A suffix (`-rc.1`) is ignored. */
export function versionParts(version) {
    if (typeof version !== 'string')
        return null;
    const core = version.trim().split(/[-+]/, 1)[0] ?? '';
    if (!PROTOCOL_VERSION.test(core))
        return null;
    const [a, b, c] = core.split('.').map(Number);
    return [a ?? 0, b ?? 0, c ?? 0];
}
/** Negative, zero or positive, as `a` is older than, the same as or newer than `b`. Unreadable sorts oldest. */
export function compareVersions(a, b) {
    const x = versionParts(a);
    const y = versionParts(b);
    if (!x || !y)
        return x ? 1 : y ? -1 : 0;
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}
/** The newer of two versions. */
export function newerVersion(a, b) {
    return compareVersions(a, b) >= 0 ? a : b;
}
/** A version as a person reads it in a sentence: `2.21` for `2.21.0`, the patch only when it is not 0. */
export function versionSaid(version) {
    const parts = versionParts(version);
    if (!parts)
        return version;
    return parts[2] === 0 ? `${parts[0]}.${parts[1]}` : `${parts[0]}.${parts[1]}.${parts[2]}`;
}
/* ------------------------------------------------------------------------ */
function own(table, key) {
    return Object.hasOwn(table, key) ? table[key] : undefined;
}
function methodCapability(method) {
    return Object.hasOwn(METHODS, method) ? METHODS[method] : undefined;
}
