/**
 * What a module holds for the parts of a project's epics, as it publishes it: `parts.json` in its own
 * folder, `{ version, epics: { <epic>: { <part id>: { documents, refs } } } }`. Shapes and pure readers
 * only; the file is opened behind `/serve` (`readHoldings`, `writeHoldings`). No module is named here.
 * Design notes: docs/parts.md.
 */
/** The file, in a module's own folder: `moduleFile(projectPath, moduleId, HOLDINGS_FILE)` is `.kehikot/<module>/parts.json`. */
export declare const HOLDINGS_FILE = "parts";
/** The format's number, written as `version`. A reader opens a later one and reads what it knows. */
export declare const HOLDINGS_VERSION = 1;
/**
 * The two things anything else can be tied to, for one part: `documents` (project-relative, in
 * `partDocument`'s form) and `refs`. Both always present; a module that holds neither lists nothing.
 */
export interface PartHoldings {
    documents: string[];
    refs: string[];
}
/** One epic's holdings, by part id. Keyed by a string somebody chose: read it with `own()`, never `record[id]`. */
export type EpicHoldings = Record<string, PartHoldings>;
/** A project's holdings, by epic slug. Read it with `own()` too. */
export type ProjectHoldings = Record<string, EpicHoldings>;
/**
 * The kinds of thing a module can publish for a part (1.4.0). `published` names which of them a
 * module has SPOKEN FOR in an epic, so that saying nothing (an empty list) is different from never
 * having said anything.
 */
export declare const HOLDING_KINDS: readonly ["documents", "refs"];
export type HoldingKind = (typeof HOLDING_KINDS)[number];
/** The kinds somebody has published for each epic, by slug. Read it with `own()`. */
export type ProjectSpoken = Record<string, HoldingKind[]>;
/** Kinds out of whatever is there: each known one, once, in `HOLDING_KINDS` order. */
export declare function holdingKinds(raw: unknown): HoldingKind[];
/**
 * What one part holds, read off anything: documents in `partDocument`'s form and refs as short
 * strings, once each, bounded by `LIMITS.PART_DOCUMENTS` and `LIMITS.PART_REFS`. Junk costs the entry
 * it is in. Null when nothing usable is left, so a part a module holds nothing for is not listed.
 */
export declare function partHoldings(raw: unknown): PartHoldings | null;
/** One epic's holdings out of anything: every own key that is a `PART_ID` with something held, at most `LIMITS.PARTS`. */
export declare function epicHoldings(raw: unknown): EpicHoldings;
/**
 * Everything one module's parsed `parts.json` says, or `{}`: never throws. Read per epic and per part,
 * so one bad entry costs that entry. An epic key that is not an `EPIC_SLUG`, and an epic with nothing
 * held, are left out; at most `LIMITS.HOLDINGS_EPICS` epics are read.
 */
export declare function holdingsIn(document: unknown): ProjectHoldings;
/**
 * Two readings as one: `more` added to `into`, per epic and part, once each and in order, under the
 * same bounds. `into` is changed and returned. What makes a part's documents the union of what every
 * module said, with none of them named.
 */
export declare function joinHoldings(into: ProjectHoldings, more: ProjectHoldings): ProjectHoldings;
/**
 * Which kinds each epic has been published for, out of one module's parsed `parts.json`, or `{}`.
 * Never throws. An epic is spoken for in a kind when the file's `published[<epic>]` names it, and
 * also, for a file written before 1.4.0 (no `published`), when a part of that epic holds some of
 * that kind. At most `LIMITS.HOLDINGS_EPICS` epics.
 */
export declare function spokenIn(document: unknown): ProjectSpoken;
/** Two readings as one: `more`'s kinds added to `into`'s, per epic. `into` is changed and returned. */
export declare function joinSpoken(into: ProjectSpoken, more: ProjectSpoken): ProjectSpoken;
