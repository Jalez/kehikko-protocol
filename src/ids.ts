/**
 * The names things are called by, and the one hazard that comes with them.
 *
 * Three patterns and one helper. Nothing here decides anything: a pattern says
 * what a spelling looks like, and whether a program answering to that spelling
 * is allowed to do anything at all is a question this package never asks.
 */

/**
 * A module's id.
 *
 * It is a key in a store, it is written into an element attribute, and it is
 * printed under the module's own name on a panel a person reads. Reverse-DNS by
 * convention; lowercase, dots and dashes by rule, so none of those three places
 * has to wonder what it has just been handed.
 *
 * ## The prototype hazard, which is the host's and not this package's
 *
 * READ THIS BEFORE YOU WRITE `record[id]`.
 *
 * This pattern accepts `constructor`. It accepts `prototype`, `toString`,
 * `valueOf` and every other name that lives on `Object.prototype`. They are
 * ordinary lowercase letters, and no rule about the SHAPE of a name can tell
 * them from `roadmap.checklist` without becoming a list of forbidden spellings
 * — which is a list of the ways somebody has already thought of, and is exactly
 * the kind of rule this protocol argues against everywhere else. So the pattern
 * is not going to be narrowed to close this, and the hazard is permanent and by
 * design.
 *
 * What it means in practice: a module's id is a string a stranger chose, and
 * `table[id]` on a plain object answers with something inherited when the id is
 * one of those names. Truthy, so the caller goes on believing it holds a real
 * entry; then the field it reads off that entry is undefined, and the method it
 * calls on THAT throws somewhere nothing is catching. In the host this protocol
 * grew from, that shape of bug appeared four separate times — a permission
 * lookup, a method lookup, a delivery lookup, and the list of modules a person
 * reads before deciding what to remove — and each one was a different lie told
 * on a panel.
 *
 * So: **every lookup keyed by a module's string must ask the object, never
 * everything the object inherits.** `Object.hasOwn` first, or `own()` below, or
 * a `Map`, which has no prototype chain to fall through and is the better
 * answer wherever the shape of the code allows one. There is no version of this
 * package that does it for you, because the lookups are in your process and not
 * in this one.
 */
export const MODULE_ID = /^[a-z0-9][a-z0-9.-]{1,62}[a-z0-9]$/

/** A mode's id: one module's own name for one of its tabs. */
export const MODE_ID = /^[a-z0-9][a-z0-9-]{0,30}$/

/**
 * An epic's slug.
 *
 * Lowercase letters, digits and dashes, and bounded at 80 wherever it appears.
 * There is no character in this class that can leave a directory — no dot, so
 * no `..`; no slash, so no path — which is worth knowing but is not the reason
 * it is here. It is here because a slug is a name two programs have to spell
 * the same way, and one of them reads it off a page while the other joins it
 * onto a store.
 *
 * ## Why the name says EPIC, and what this pattern is not
 *
 * An epic belongs to a project, and it is the thing a host holds and can
 * therefore tell a module about. A JOURNEY is a different idea living in a
 * different program — a module app of its own — and this package deliberately
 * says nothing about one: not its name, not its shape, not its bounds. An
 * earlier draft of these files inherited a codebase where the two words meant
 * one thing, and every place that conflation reached is renamed rather than
 * aliased, because an alias would preserve exactly the confusion being removed.
 *
 * So this pattern describes an epic slug and only that. If a journey slug turns
 * out to be spelled differently — longer, or with characters this class refuses
 * — nothing here has to change, because a host is not the authority on that
 * name and a protocol between a host and a module is the wrong place to write
 * it down. The module that owns journeys owns their names.
 */
export const EPIC_SLUG = /^[a-z0-9-]{1,80}$/

/**
 * One lookup that does not fall through to a prototype.
 *
 * A convenience, offered because the hazard above is easy to write around and
 * easier to forget. It does not relieve you of anything: `own()` is one lookup,
 * and the essay on `MODULE_ID` is about all of them. A `Map` keyed by id is
 * better still where you can have one.
 */
export function own<T>(record: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined
}
