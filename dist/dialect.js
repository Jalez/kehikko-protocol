/**
 * The two spellings of one protocol, and the only place that knows there are two.
 *
 * ## Why there are two
 *
 * This protocol was first written for an app called "roadmap", and every name
 * it put on the wire said so: `roadmap.hello`, `roadmap.module`,
 * `/.well-known/roadmap-module.json`, `roadmap.notifications@1`, and module ids
 * like `roadmap.journeys`. The app is called Kehikot now and the names say
 * `kehikot.` — but a module is a program somebody runs from their own
 * checkout, pinned to whatever copy of this package it last installed, and it
 * does not change on the day the host does. A host that only spoke the new
 * names would greet every one of those modules in a language it cannot hear,
 * and the failure would be silence: no error, an empty container, a "did not
 * answer" sentence about a program that is running fine.
 *
 * So for at least one version, BOTH spellings are read, everywhere, and the
 * old one is written only to a party known to need it.
 *
 * ## The rules, which are the whole design
 *
 *  1. **One canonical name.** Inside a host and inside a module, everything is
 *     the `kehikot.` spelling. Every schema in this package that reads a
 *     message type, a module id or an extension name accepts either spelling
 *     and hands back the canonical one, so code downstream of a parse never
 *     compares against two strings.
 *  2. **Receive both.** `looksLikeWireMessage` lets either prefix through, and
 *     every schema accepts either type.
 *  3. **Send in the other side's dialect.** A host knows which dialect a module
 *     speaks before it says a word to it: the manifest's `kind` says, because a
 *     module built against an older copy of this package serves
 *     `roadmap.module`. A host greets such a module with `roadmap.hello` (see
 *     `toDialect`), and the module's own old client answers in kind. A module
 *     built against this copy answers in whatever dialect it was GREETED in —
 *     `connect()` remembers the greeting's prefix — so it is understood by an
 *     old host and a new one alike.
 *  4. **Translate at the edge and nowhere else.** `toDialect` is applied at
 *     the moment a message is posted and `canonical*` at the moment one is
 *     parsed. Nothing in between knows a second spelling exists.
 *
 * ## Why the protocol number did not move
 *
 * See the essay on `PROTOCOL` in `constants.ts`: a module built against the
 * old names keeps working against a new host, and a new module keeps working
 * against an old host (it answers in the dialect it was greeted in, and can
 * serve its manifest at the old path too — see `legacyManifest`). Nothing that
 * already had a meaning lost it, which is the test.
 */
import { LEGACY_MANIFEST_KIND, LEGACY_MESSAGE_PREFIX, MESSAGE_PREFIX } from './constants.js';
/** The prefix every name carries now. */
const PREFIX = MESSAGE_PREFIX;
/** The prefix names carried before the rename. Read, and written only to a party that needs it. */
const LEGACY_PREFIX = LEGACY_MESSAGE_PREFIX;
export const DIALECTS = ['kehikot', 'roadmap'];
/**
 * The canonical spelling of a dotted name: a message type, a module id, an
 * extension name. `roadmap.x` becomes `kehikot.x`; anything else is returned
 * unchanged, including a name in somebody else's namespace.
 */
export function canonicalName(name) {
    return name.startsWith(LEGACY_PREFIX) ? PREFIX + name.slice(LEGACY_PREFIX.length) : name;
}
/** The pre-rename spelling of a dotted name. `kehikot.x` becomes `roadmap.x`; anything else is unchanged. */
export function legacyName(name) {
    return name.startsWith(PREFIX) ? LEGACY_PREFIX + name.slice(PREFIX.length) : name;
}
/** A name spelled for one dialect. */
export function nameIn(name, dialect) {
    return dialect === 'roadmap' ? legacyName(name) : canonicalName(name);
}
/**
 * A module's one id, whichever spelling it arrived in.
 *
 * `roadmap.journeys` and `kehikot.journeys` are the SAME module — the one
 * named before the rename and after it — and a host keys everything it keeps
 * about a module by this. A registration file, a manifest, a placement in an
 * old database and an MCP call naming the old id all land on one row.
 */
export const canonicalModuleId = canonicalName;
/** A module id as an unchanged, pre-rename module or host spells it. */
export const legacyModuleId = legacyName;
/** An extension name, e.g. `roadmap.notifications@1`, in its canonical spelling. */
export const canonicalExtension = canonicalName;
/** Which dialect a message type is in, or `null` when it is in neither. */
export function dialectOfType(type) {
    if (typeof type !== 'string')
        return null;
    if (type.startsWith(PREFIX))
        return 'kehikot';
    if (type.startsWith(LEGACY_PREFIX))
        return 'roadmap';
    return null;
}
/** Which dialect a manifest's `kind` says its module speaks. Anything unrecognised is the current one. */
export function dialectOfKind(kind) {
    return kind === LEGACY_MANIFEST_KIND ? 'roadmap' : 'kehikot';
}
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/* A list of containers with each `module` respelled. Anything that is not a
   list of objects is handed back untouched: this is a translation, not a
   validation, and the receiver's schema is what refuses a bad shape. */
function containersIn(value, dialect) {
    if (!Array.isArray(value))
        return value;
    return value.map((container) => isObject(container) && typeof container.module === 'string'
        ? { ...container, module: nameIn(container.module, dialect) }
        : container);
}
function contextIn(value, dialect) {
    if (!isObject(value) || !('containers' in value))
        return value;
    return { ...value, containers: containersIn(value.containers, dialect) };
}
/**
 * One message, respelled for a receiver that speaks `dialect`.
 *
 * Applied by a sender at the moment it posts, so everything before that moment
 * is canonical. For the `kehikot` dialect it respells nothing old into new
 * except what was already canonical — a no-op on anything this package built.
 *
 * What it touches, and why each is here: the `type`; the module ids a message
 * carries (`ready.id`, `event.from`, `context.containers[].module`, in a
 * `hello` and in a `context`) because an unchanged module compares them with
 * its own `roadmap.` id; and the extension names (`event.extension`, and
 * `params.extension` on an `events.emit` request) because an unchanged party
 * looks them up by the old spelling. Nothing else on the wire is a dotted name.
 *
 * Pure: the message is copied, never edited.
 */
export function toDialect(message, dialect) {
    if (!isObject(message) || typeof message.type !== 'string')
        return message;
    const type = nameIn(message.type, dialect);
    const out = { ...message, type };
    const bare = canonicalName(message.type).slice(PREFIX.length);
    if (bare === 'ready' && typeof out.id === 'string')
        out.id = nameIn(out.id, dialect);
    if (bare === 'event') {
        if (typeof out.from === 'string')
            out.from = nameIn(out.from, dialect);
        if (typeof out.extension === 'string')
            out.extension = nameIn(out.extension, dialect);
    }
    if (bare === 'hello' && 'context' in out)
        out.context = contextIn(out.context, dialect);
    if (bare === 'context' && 'containers' in out)
        out.containers = containersIn(out.containers, dialect);
    if (bare === 'request' && out.method === 'events.emit' && isObject(out.params) && typeof out.params.extension === 'string') {
        out.params = { ...out.params, extension: nameIn(out.params.extension, dialect) };
    }
    return out;
}
/** One message as received, respelled into the canonical dialect. The schemas do this too; see rule 1. */
export function canonicalMessage(message) {
    return toDialect(message, 'kehikot');
}
//# sourceMappingURL=dialect.js.map