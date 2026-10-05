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
/**
 * Which spelling one side speaks.
 *
 * `kehikot` is this package. `roadmap` is every copy of it from before the
 * rename, which is still what an unchanged module or an older host speaks.
 */
export type Dialect = 'kehikot' | 'roadmap';
export declare const DIALECTS: readonly ["kehikot", "roadmap"];
/**
 * The canonical spelling of a dotted name: a message type, a module id, an
 * extension name. `roadmap.x` becomes `kehikot.x`; anything else is returned
 * unchanged, including a name in somebody else's namespace.
 */
export declare function canonicalName(name: string): string;
/** The pre-rename spelling of a dotted name. `kehikot.x` becomes `roadmap.x`; anything else is unchanged. */
export declare function legacyName(name: string): string;
/** A name spelled for one dialect. */
export declare function nameIn(name: string, dialect: Dialect): string;
/**
 * A module's one id, whichever spelling it arrived in.
 *
 * `roadmap.journeys` and `kehikot.journeys` are the SAME module — the one
 * named before the rename and after it — and a host keys everything it keeps
 * about a module by this. A registration file, a manifest, a placement in an
 * old database and an MCP call naming the old id all land on one row.
 */
export declare const canonicalModuleId: typeof canonicalName;
/** A module id as an unchanged, pre-rename module or host spells it. */
export declare const legacyModuleId: typeof legacyName;
/** An extension name, e.g. `roadmap.notifications@1`, in its canonical spelling. */
export declare const canonicalExtension: typeof canonicalName;
/** Which dialect a message type is in, or `null` when it is in neither. */
export declare function dialectOfType(type: unknown): Dialect | null;
/** Which dialect a manifest's `kind` says its module speaks. Anything unrecognised is the current one. */
export declare function dialectOfKind(kind: unknown): Dialect;
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
export declare function toDialect<T>(message: T, dialect: Dialect): T;
/** One message as received, respelled into the canonical dialect. The schemas do this too; see rule 1. */
export declare function canonicalMessage<T>(message: T): T;
//# sourceMappingURL=dialect.d.ts.map