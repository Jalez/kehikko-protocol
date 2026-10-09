/**
 * `bun run check:parts <module dir>…`: does a module do what its manifest says
 * about the parts of an epic?
 *
 * The requirement is in `parts.ts`: every item of a module's data is anchored
 * to a part by a file, a ref or a part id, or the module says why it has none.
 * `partsDeclaration` reads the manifest's half of that, and that half is what
 * this FAILS on: a module that declares neither, declares both, or whose
 * manifest cannot be loaded.
 *
 * It also looks through the sources for an import of the protocol's focus
 * helpers, and that is ADVICE, never a failure. It is a regex over import
 * text: `import * as`, a re-export through a wrapper file or a dynamic import
 * all get past it, and any import at all satisfies it. So a module that says
 * `reacts: ['parts']` and shows no such import gets a NOTE saying what was
 * looked for, for a person to read; whether the narrowing is right is a
 * review's question and no scan's.
 *
 * Node-only and behind no entry point in `exports`, like `create/`: it is run
 * from a checkout or a module's `node_modules` (`bin/check-parts.ts`), never
 * imported by a page. Read-only.
 */
/**
 * The functions that ARE the rule. Importing any one of them from this
 * package is using it.
 *
 * The last three are the ones the rule delegates to, and they stay on the
 * list: Paper, Journeys, References, Checklist and Tests followed the parts
 * with them before `useFocus` existed, and leaving them out would put a note
 * on five modules that do exactly what the requirement asks.
 */
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
//# sourceMappingURL=parts.d.ts.map