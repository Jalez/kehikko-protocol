/**
 * `bun run check:parts <module dir>…`: does a module do what its manifest says about an epic's parts?
 * Fails only on the manifest (`partsDeclaration`: neither, both, or unloadable). Everything read out of
 * the sources is advice, never a failure: whether a focus helper is imported, and, from 1.2.0, what of
 * the contract in docs/parts.md can be seen in text (`contractNotes`). Node-only, read-only, behind no
 * entry point in `exports`.
 */
/** The functions that are the rule. Importing any one of them from this package is using it. */
export declare const FOCUS_HELPERS: readonly ["useFocus", "narrowToFocus", "anchorInFocus", "fileInFocus", "refInFocus", "partInFocus"];
/** The focus helpers one source file imports from the protocol, by the name they are exported under. */
export declare function focusImports(text: string): string[];
/** What 1.2.0 deprecated for parts: the standing count line, and the names of two modules. */
export declare const DEPRECATED_FOR_PARTS: readonly ["focusSentence", "FOCUS_WHERE", "paperFileOf", "PAPER_MODULE", "pickedFiles", "JOURNEYS_MODULE", "partsOf"];
/**
 * What of the contract can be seen in a module's files, as notes for a person: a module that follows
 * parts and narrows through neither `useFocus().narrow` nor `narrowToFocus`, passes no `keep`, or still
 * imports what 1.2.0 deprecated; a `partless` whose reason the contract no longer accepts. Text only,
 * so each is a hint and none is a verdict. Pure.
 */
export declare function contractNotes(manifest: {
    id?: string;
    reacts?: readonly string[];
    partless?: string;
}, sources: readonly {
    path: string;
    text: string;
}[]): string[];
export interface PartsCheck {
    /** The module's id, or the directory when no manifest was read. */
    module: string;
    /** `follows` (reacts to parts), `partless` (says why not), or `undeclared`. */
    declares: 'follows' | 'partless' | 'undeclared';
    /** Where a focus helper is imported, as `file: names`. */
    uses: string[];
    /** Why the module fails: what its manifest says about parts, and nothing else. Empty is a pass. */
    failures: string[];
    /** What a person might want to look at. Never a failure. */
    notes: string[];
}
/** The check itself, over a manifest and the module's sources. Pure. */
export declare function checkParts(manifest: {
    id?: string;
    reacts?: readonly string[];
    partless?: string;
}, sources: readonly {
    path: string;
    text: string;
}[]): PartsCheck;
/** A module's own source files: not its dependencies, its build, its tests or its dev scripts. */
export declare function sourcesOf(dir: string): {
    path: string;
    text: string;
}[];
/** The manifest a module directory exports from `manifest.ts` (or `.js`), under whatever name. Null when there is none. */
export declare function manifestOf(dir: string): Promise<{
    id?: string;
    reacts?: readonly string[];
    partless?: string;
} | null>;
/** One module directory, read and checked. */
export declare function checkModule(dir: string): Promise<PartsCheck>;
/** What the command prints for one module. */
export declare function said(check: PartsCheck): string;
