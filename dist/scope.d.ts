import { z } from 'zod';
/**
 * 2.29.0. A module's SCOPE: what its content belongs to. Five words, each with the name a person is
 * shown and what it means. A module says which scopes it can work at, one mode per scope, the first
 * being its default (`modes` in the manifest); the person picks among those, per container, in the
 * host; the host tells the module the one in use as `context.scope`. A module that cannot work at a
 * scope does not list it, and nothing a host does makes it. Design notes: docs/manifest.md#scope-290.
 */
export declare const MODULE_SCOPES: readonly ["machine", "project", "epic", "part", "kehikko"];
export type ModuleScope = (typeof MODULE_SCOPES)[number];
/** What a person is shown for each scope: a label, the same in every host. */
export declare const SCOPE_NAMES: {
    readonly machine: "This computer";
    readonly project: "Project";
    readonly epic: "Epic";
    readonly part: "Part";
    readonly kehikko: "Kehikko";
};
/** What each scope means, in one sentence, for a tooltip or a help page. */
export declare const SCOPE_MEANS: {
    readonly machine: "Shared across every project on this computer.";
    readonly project: "The whole project, whatever epic is open.";
    readonly epic: "The open epic.";
    readonly part: "Each part of the open epic.";
    readonly kehikko: "This kehikko: this arrangement of modules.";
};
/** The scope a module that does not say has, and the one an old or unknown word reads as. */
export declare const DEFAULT_SCOPE: ModuleScope;
/**
 * A scope word as a reader takes it: one of `MODULE_SCOPES`, or `epic` for anything else — absent,
 * the pre-2.29.0 `global` (which all its users meant as "not following the epic" and no host ever
 * acted on), or a word a later version adds.
 */
export declare function readScope(word: unknown): ModuleScope;
/** Whether a scope is about the open epic (`epic`, `part`): one a host cannot fill under "All epics". */
export declare function scopeNeedsEpic(scope: ModuleScope): boolean;
/**
 * A mode's `scope` in a manifest. Typed as the five words (and `global`, the pre-2.29.0 word) for an
 * author, and read through `readScope`, so a manifest from an older module or a newer protocol still
 * parses: `global`, an unknown word and absence all read as `epic`.
 */
export declare const modeScopeSchema: z.ZodEffects<z.ZodCatch<z.ZodOptional<z.ZodEnum<["machine", "project", "epic", "part", "kehikko", "global"]>>>, "epic" | "kehikko" | "project" | "part" | "machine", unknown>;
/** A mode's `scopeSays`: what the module shows at that scope, in one line. Optional; trimmed; empty reads as absent. */
export declare const scopeSaysSchema: z.ZodEffects<z.ZodCatch<z.ZodOptional<z.ZodString>>, string | undefined, unknown>;
/** One scope a module can work at, with its own line and the mode that declared it. */
export interface SupportedScope {
    scope: ModuleScope;
    /** The mode's `scopeSays`, or '' when it says none. */
    says: string;
    /** The id of the mode that declared it; '' for the `project` a pre-2.29.0 `declares.scopes` adds. */
    mode: string;
}
type ScopeHolder = {
    modes?: readonly {
        id?: string;
        scope?: unknown;
        scopeSays?: unknown;
    }[];
    declares?: {
        scopes?: readonly string[];
    };
} | null | undefined;
/**
 * Every scope a module can work at, default first: each mode's scope in the order written, once
 * (the first mode for a scope wins), then `project` when the deprecated `declares.scopes` lists it
 * and no mode does. Never empty: a module that says nothing works at `epic`. Takes a parsed manifest
 * or the raw object.
 */
export declare function supportedScopes(manifest: ScopeHolder): SupportedScope[];
/** The scope a module works at unless the person picks another: its first mode's. */
export declare function defaultScope(manifest: ScopeHolder): ModuleScope;
/** Whether a module can work at a scope. */
export declare function supportsScope(manifest: ScopeHolder, scope: ModuleScope): boolean;
/**
 * The scope a container works at: the person's pick when the module supports it, else the module's
 * default. A pick the module does not (or no longer) support is not an error; it reads as the default.
 */
export declare function activeScope(manifest: ScopeHolder, picked: unknown): ModuleScope;
/** What a module says it shows at a scope (`scopeSays`), or '' when it says nothing. */
export declare function scopeSaysOf(manifest: ScopeHolder, scope: ModuleScope): string;
/**
 * The scope a host tells a container in `context.scope`, given the scope it works at and whether the
 * canvas is on "All epics". On "All epics" a container at `epic` or `part` is told `project` (and the
 * host covers it when its module cannot work at `project`); every other scope is told as it is,
 * because it is not about the open epic.
 */
export declare function toldScope(active: ModuleScope, allEpics: boolean): ModuleScope;
export {};
