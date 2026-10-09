/**
 * The two spellings of one protocol, `kehikot.` (canonical) and the pre-rename `roadmap.`. Both are
 * read everywhere; the old one is written only to a party known to need it. Translate at the edge:
 * `toDialect` when a message is posted, `canonical*` when one is parsed.
 * Design notes: docs/protocol-number.md.
 *
 * Deprecated as a whole in 0.37: the next breaking release speaks `kehikot.` only. What stays is
 * `canonicalModuleId`, for an id that was written to disk before the rename.
 */
/**
 * Which spelling one side speaks. `kehikot` is this package; `roadmap` is every copy of it from
 * before the rename, which an unchanged module or an older host still speaks.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect.
 */
export type Dialect = 'kehikot' | 'roadmap';
/** @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. */
export declare const DIALECTS: readonly ["kehikot", "roadmap"];
/**
 * The canonical spelling of a dotted name: a message type, a module id, an
 * extension name. `roadmap.x` becomes `kehikot.x`; anything else is returned
 * unchanged, including a name in somebody else's namespace.
 *
 * @deprecated Use `canonicalModuleId`, which is this for a module id and is what stays.
 */
export declare function canonicalName(name: string): string;
/**
 * The pre-rename spelling of a dotted name. `kehikot.x` becomes `roadmap.x`; anything else is unchanged.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. Nothing replaces it.
 */
export declare function legacyName(name: string): string;
/**
 * A name spelled for one dialect.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. Nothing replaces it.
 */
export declare function nameIn(name: string, dialect: Dialect): string;
/**
 * A module's one id, whichever spelling it arrived in. `roadmap.journeys` and `kehikot.journeys`
 * are the same module, and a host keys everything it keeps about a module by this.
 *
 * Not deprecated: it stays, for a module id read from disk (a project's `.kehikot/` files, a
 * registration's file name) that was written before the rename.
 */
export declare const canonicalModuleId: typeof canonicalName;
/**
 * A module id as an unchanged, pre-rename module or host spells it.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. Nothing replaces it.
 */
export declare const legacyModuleId: typeof legacyName;
/**
 * An extension name, e.g. `roadmap.notifications@1`, in its canonical spelling.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. Compare an extension name as it is written.
 */
export declare const canonicalExtension: typeof canonicalName;
/**
 * Which dialect a message type is in, or `null` when it is in neither.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. Nothing replaces it.
 */
export declare function dialectOfType(type: unknown): Dialect | null;
/**
 * Which dialect a manifest's `kind` says its module speaks. Anything unrecognised is the current one.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. Nothing replaces it.
 */
export declare function dialectOfKind(kind: unknown): Dialect;
/**
 * One message, respelled for a receiver that speaks `dialect`; applied by a sender at the moment it
 * posts. Respells the `type`, module ids (`ready.id`, `event.from`, `context.containers[].module`)
 * and extension names (`event.extension`, `params.extension` on `events.emit`). Pure: it copies.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. Post a message as it is built.
 */
export declare function toDialect<T>(message: T, dialect: Dialect): T;
/**
 * One message as received, respelled into the canonical dialect. The schemas do this too; see rule 1.
 *
 * @deprecated Removed in the next breaking release, with the pre-rename `roadmap.` dialect. Nothing replaces it.
 */
export declare function canonicalMessage<T>(message: T): T;
