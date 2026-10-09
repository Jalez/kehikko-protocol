/**
 * `bun run check:parts <module dir>…`: does a module do what its manifest says
 * about the parts of an epic?
 *
 * The requirement is in `parts.ts`: every item of a module's data is anchored
 * to a part by a file, a ref or a part id, or the module says why it has none.
 * `partsDeclaration` reads the manifest's half of that. This reads the other
 * half, as far as a program can: a module that says `reacts: ['parts']` and
 * never imports one of the protocol's focus helpers is following the parts by
 * a rule of its own, or not at all, and either is what the requirement is
 * there to stop.
 *
 * Node-only and behind no entry point in `exports`, like `create/`: it is run
 * from a checkout or a module's `node_modules` (`bin/check-parts.ts`), never
 * imported by a page. Read-only.
 */
/** The functions that ARE the rule. Importing any one of them from this package is using it. */
export declare const FOCUS_HELPERS: readonly ["useFocus", "narrowToFocus", "anchorInFocus", "fileInFocus", "refInFocus", "partInFocus"];
/** The focus helpers one source file imports from the protocol, by the name they are exported under. */
export declare function focusImports(text: string): string[];
export interface PartsCheck {
    /** The module's id, or the directory when no manifest was read. */
    module: string;
    /** `follows` (reacts to parts), `partless` (says why not), or `undeclared`. */
    declares: 'follows' | 'partless' | 'undeclared';
    /** Where a focus helper is imported, as `file: names`. */
    uses: string[];
    /** Why the module fails. Empty is a pass. */
    failures: string[];
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
//# sourceMappingURL=parts.d.ts.map