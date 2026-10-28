import { PACKAGE_VERSION } from './build.js';
import { PROTOCOL } from './constants.js';
import { speaks } from './manifest.js';
import { PROTOCOL_VERSION } from './ids.js';
import { DECLARATION_SINCE, SINCE_FLOOR, compareVersions, pieceSaid, removedIn, sinceOf, versionParts, versionSaid, } from './since.js';
/** The `declares` keys this package knows; another one is a declaration from a newer protocol. */
const KNOWN_DECLARES = new Set(['protocol', 'uses', 'storage', 'prompt', 'skills', 'provides', 'agentSessions', 'scopes', 'settings', 'navigates']);
const asObject = (value) => (typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null);
const listed = (value) => (Array.isArray(value) ? value : []);
function declarations(manifest) {
    const out = [];
    const declares = asObject(manifest.declares) ?? {};
    const mcp = asObject(manifest.mcp) ?? {};
    if (listed(mcp.subjects).length)
        out.push('mcp.subjects');
    if (typeof mcp.as === 'string' && mcp.as)
        out.push('mcp.as');
    const skills = listed(declares.skills);
    if (skills.length)
        out.push('declares.skills');
    if (listed(declares.scopes).length)
        out.push('declares.scopes');
    const needs = skills.flatMap((skill) => listed(asObject(skill)?.needs));
    if (needs.length)
        out.push('skills.needs');
    if (needs.some((need) => asObject(need) !== null))
        out.push('skills.needs.object');
    if (listed(declares.settings).length)
        out.push('declares.settings');
    if (listed(declares.provides).length)
        out.push('declares.provides');
    if (asObject(declares.agentSessions))
        out.push('declares.agentSessions');
    if (asObject(declares.agentSessions)?.installsSkills === true)
        out.push('agentSessions.installsSkills');
    if (listed(declares.navigates).length)
        out.push('declares.navigates');
    return out;
}
/** Every piece a manifest names that a host has to know, known or not, each once. */
function piecesOf(manifest) {
    const out = [];
    const declares = asObject(manifest.declares) ?? {};
    for (const capability of new Set(listed(declares.uses).filter((one) => typeof one === 'string'))) {
        out.push({ kind: 'capability', piece: capability, since: sinceOf('capability', capability), said: pieceSaid('capability', capability) });
    }
    for (const declaration of declarations(manifest)) {
        out.push({ kind: 'declaration', piece: declaration, since: DECLARATION_SINCE[declaration], said: pieceSaid('declaration', declaration) });
    }
    for (const key of Object.keys(declares)) {
        if (KNOWN_DECLARES.has(key) || declares[key] === undefined)
            continue;
        out.push({ kind: 'declaration', piece: `declares.${key}`, since: null, said: `declares.${key}` });
    }
    return out;
}
function builtWith(manifest) {
    const protocol = asObject(manifest.build)?.protocol;
    return typeof protocol === 'string' && versionParts(protocol) ? protocol : null;
}
/**
 * What a manifest's declarations need of a host: the newest version among them, and every piece
 * newer than `above` (a host's protocol package version; `SINCE_FLOOR` lists everything above the
 * start). Takes a parsed manifest or the raw JSON a module served, so a manifest this package cannot
 * parse is still read. `build.protocol` is carried as `built` and decides nothing here.
 */
export function needsOf(manifest, above = SINCE_FLOOR) {
    const loose = asObject(manifest) ?? {};
    const all = piecesOf(loose);
    let version = SINCE_FLOOR;
    for (const piece of all)
        if (piece.since && compareVersions(piece.since, version) > 0)
            version = piece.since;
    const newer = all
        .filter((piece) => piece.since !== null && compareVersions(piece.since, above) > 0)
        .sort((a, b) => compareVersions(b.since, a.since));
    const unknown = all.filter((piece) => piece.since === null);
    return { version, pieces: [...newer, ...unknown], unknown: unknown.length > 0, built: builtWith(loose) };
}
/**
 * Hold a manifest to a host. The protocol number first (`manifest.protocol`, `declares.protocol`),
 * then what the declarations need against the host's package version. A piece this package does not
 * know counts only when the module was built with a newer package than the host, or does not say
 * what it was built with: a module built with an older one that names an unknown word made a typo,
 * and a host that framed it before frames it still.
 */
export function fitOf(manifest, host = {}) {
    const hostVersion = host.version && versionParts(host.version) ? host.version : PACKAGE_VERSION;
    const hostProtocol = host.protocol ?? PROTOCOL;
    const loose = asObject(manifest) ?? {};
    const needs = needsOf(loose, hostVersion);
    const moduleProtocol = typeof loose.protocol === 'number' && Number.isInteger(loose.protocol) ? loose.protocol : hostProtocol;
    const range = typeof asObject(loose.declares)?.protocol === 'string' ? asObject(loose.declares)?.protocol : `>=${moduleProtocol}`;
    const protocol = { module: moduleProtocol, range, host: hostProtocol };
    if (moduleProtocol > hostProtocol) {
        return { fit: 'host-too-old', needs, since: `${moduleProtocol}.0.0`, missing: [], protocol };
    }
    if (!speaks(range, hostProtocol)) {
        const later = Array.from({ length: 8 }, (_, i) => hostProtocol + 1 + i).find((n) => speaks(range, n));
        if (later !== undefined)
            return { fit: 'host-too-old', needs, since: `${later}.0.0`, missing: [], protocol };
        return { fit: 'module-too-old', needs, removed: [], protocol };
    }
    if (moduleProtocol < hostProtocol)
        return { fit: 'module-too-old', needs, removed: [], protocol };
    const removed = [];
    for (const piece of piecesOf(loose)) {
        const gone = removedIn(piece.kind, piece.piece);
        if (gone && compareVersions(gone, hostVersion) <= 0)
            removed.push({ kind: piece.kind, piece: piece.piece, removedIn: gone, said: piece.said });
    }
    if (removed.length)
        return { fit: 'module-too-old', needs, removed };
    const builtNewer = needs.built !== null && compareVersions(needs.built, hostVersion) > 0;
    const unknownCounts = needs.unknown && (needs.built === null || builtNewer);
    const missing = needs.pieces.filter((piece) => (piece.since === null ? unknownCounts : true));
    if (!missing.length)
        return { fit: 'fits', needs };
    const known = missing.filter((piece) => piece.since !== null);
    let since = known.length ? (known[0]?.since ?? null) : null;
    if (builtNewer && (since === null || compareVersions(needs.built, since) > 0) && missing.some((piece) => piece.since === null)) {
        since = needs.built;
    }
    return { fit: 'host-too-old', needs, since, missing };
}
/* ------------------------------------------------------------------------ *
 * The words
 * ------------------------------------------------------------------------ */
/**
 * The sentences a host shows about a fit, as text: a module's name goes in as a string and is never
 * read as markup. `tooOld` is the one line a module may show beside a call the host declined
 * (`hostTooOld`); the host's own notice says the rest.
 */
export const FIT_SAYS = {
    hostTooOld: (name) => `${name} needs a newer Kehikot`,
    moduleTooOld: (name) => `${name} needs an update`,
    updateKehikot: 'Update Kehikot',
    updateModule: (name) => `Update ${name}`,
    tooOld: (since) => since && versionParts(since) ? `This needs Kehikot with protocol ${versionSaid(since)} or later.` : 'This needs a newer Kehikot.',
};
function addedSaid(piece) {
    return piece.since ? `${piece.said}, added in protocol ${versionSaid(piece.since)}` : `${piece.said}, which this Kehikot does not know`;
}
/** "It uses …": at most two pieces named, then how many more. */
function usesSaid(pieces) {
    const said = [...new Map(pieces.map((piece) => [piece.said, piece])).values()];
    const [first, second] = said;
    if (!first)
        return '';
    if (said.length === 1)
        return `It uses ${addedSaid(first)}.`;
    if (said.length === 2 && second)
        return `It uses ${addedSaid(first)}, and ${addedSaid(second)}.`;
    const more = said.length - 1;
    return `It uses ${addedSaid(first)}, and ${more} more thing${more === 1 ? '' : 's'} this Kehikot does not have.`;
}
/**
 * What a host says about a module that does not fit: a title, one line naming what is missing, and
 * the button's words. Null for a module that fits.
 */
export function fitSaid(fit, name) {
    if (fit.fit === 'fits')
        return null;
    if (fit.fit === 'host-too-old') {
        const line = fit.protocol
            ? fit.protocol.module > fit.protocol.host
                ? `It was built against protocol ${fit.protocol.module}; this Kehikot speaks protocol ${fit.protocol.host}.`
                : `It speaks protocol ${fit.protocol.range}; this Kehikot speaks protocol ${fit.protocol.host}.`
            : usesSaid(fit.missing);
        return { title: FIT_SAYS.hostTooOld(name), line, action: FIT_SAYS.updateKehikot };
    }
    const [gone] = fit.removed;
    const line = fit.protocol
        ? fit.protocol.module < fit.protocol.host
            ? `It was built against protocol ${fit.protocol.module}; this Kehikot speaks protocol ${fit.protocol.host}.`
            : `It speaks protocol ${fit.protocol.range}; this Kehikot speaks protocol ${fit.protocol.host}.`
        : gone
            ? `It uses ${gone.said}, removed in protocol ${versionSaid(gone.removedIn)}.`
            : '';
    return { title: FIT_SAYS.moduleTooOld(name), line, action: FIT_SAYS.updateModule(name) };
}
const validSince = (value) => (typeof value === 'string' && PROTOCOL_VERSION.test(value) ? value : null);
/**
 * The rule the client and `askHost` share: a refusal of `method` is `host-too-old` when the host said
 * so (`declined`), or when it answered `unknown-method` for a method this package knows. A host
 * answers every method it knows, so a method this package has and the host does not is newer than
 * the host. `kind` is `serverMethod` for a server's question.
 */
export function tooOldOf(method, refusal, kind = 'method') {
    const known = sinceOf(kind, method);
    if (refusal.declined === 'host-too-old')
        return { outcome: 'declined', reason: 'host-too-old', since: known ?? validSince(refusal.since) };
    if (refusal.reason === 'unknown-method' && known)
        return { outcome: 'declined', reason: 'host-too-old', since: known };
    return null;
}
/**
 * Read `host-too-old` off anything a module holds after a call: a `HostRefused` from the client, its
 * `refusal`, an `AskedHost` from `askHost`, or a body a module's own server passed on in the shape of
 * `HostTooOld`. Null for anything else, so `if (hostTooOld(error))` is the whole check.
 */
export function hostTooOld(value) {
    const loose = asObject(value);
    if (!loose)
        return null;
    const inner = asObject(loose.refusal);
    if (inner)
        return hostTooOld(inner);
    if (loose.outcome === 'declined' && loose.reason === 'host-too-old')
        return { outcome: 'declined', reason: 'host-too-old', since: validSince(loose.since) };
    if (loose.declined === 'host-too-old')
        return { outcome: 'declined', reason: 'host-too-old', since: validSince(loose.since) };
    return null;
}
