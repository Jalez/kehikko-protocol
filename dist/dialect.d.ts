/**
 * The two spellings of one protocol, `kehikot.` (canonical) and the pre-rename `roadmap.`. Both are
 * read everywhere; the old one is written only to a party known to need it. Translate at the edge:
 * `toDialect` when a message is posted, `canonical*` when one is parsed.
 * Design notes: docs/protocol-number.md.
 */
/**
 * Which spelling one side speaks. `kehikot` is this package; `roadmap` is every copy of it from
 * before the rename, which an unchanged module or an older host still speaks.
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
 * A module's one id, whichever spelling it arrived in. `roadmap.journeys` and `kehikot.journeys`
 * are the same module, and a host keys everything it keeps about a module by this.
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
 * One message, respelled for a receiver that speaks `dialect`; applied by a sender at the moment it
 * posts. Respells the `type`, module ids (`ready.id`, `event.from`, `context.containers[].module`)
 * and extension names (`event.extension`, `params.extension` on `events.emit`). Pure: it copies.
 */
export declare function toDialect<T>(message: T, dialect: Dialect): T;
/** One message as received, respelled into the canonical dialect. The schemas do this too; see rule 1. */
export declare function canonicalMessage<T>(message: T): T;
//# sourceMappingURL=dialect.d.ts.map