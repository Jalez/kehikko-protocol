import { z } from 'zod';
import { LEGACY_MANIFEST_KIND } from './constants.js';
/**
 * What a module says about itself when a host asks: the manifest schema, the words it suggests (`REACTS_TO`,
 * `TAGS`), and the pure readers `speaks` and `partsDeclaration`. Every string in the schema has a `max` from
 * `LIMITS`, including the next one added. No field asks for or models a permission.
 * Design notes: docs/manifest.md.
 */
declare const modeSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    /**
     * `epic`: the mode's tab follows the reader, told which epic is open and told again on every
     * switch. `global`: one page for the whole canvas, told nothing and never re-pointed. The former
     * word `journey` has no alias.
     */
    scope: z.ZodDefault<z.ZodEnum<["epic", "global"]>>;
}, "strip", z.ZodTypeAny, {
    label: string;
    id: string;
    scope: "epic" | "global";
}, {
    label: string;
    id: string;
    scope?: "epic" | "global" | undefined;
}>;
export type ModuleMode = z.infer<typeof modeSchema>;
/**
 * The context kinds a module can say it REACTS to, each with what it means. Documentation only: a host must not
 * gate, filter, withhold or route anything on it; every framed module gets the whole context. Free strings on
 * the wire: a host shows or drops an unknown word and still frames the module.
 */
export declare const REACTS_TO: {
    readonly passage: "Does something when the reader points at a passage — a file, a place in it, and the words that were there.";
    readonly selection: "Does something when the references somebody picked out change.";
    /**
     * What is arranged on the kehikko changed: which module each container holds, whether it is
     * picked out, and what it says it is showing. Paired with `showing:set`; also changed by a person
     * ticking a container's box, the host's own act.
     */
    readonly containers: "Does something when which containers are picked out changes, or when what one of them is showing changes.";
    /**
     * The fourth word: somebody marked why a reference closed. Paired with
     * `disposition:set` the way `selection` is with `selection:set`, and changed
     * by an agent through the host's MCP door as often as by a module.
     */
    readonly dispositions: "Does something when somebody marks why a reference closed — done, won't do, duplicate, superseded.";
    /**
     * The shared tracker reading changed. Paired with `trackers:refresh`; also moved by the host's
     * own acts (a person pressing "Refresh all", the project's schedule). A module ticking this
     * re-asks `tracker.get` when `context.tracker.at` moves.
     */
    readonly tracker: "Does something when the trackers have been read again — re-reads the issues, merge requests and pull requests it shows.";
    /**
     * The material a container shows for an epic changed: a step, a journey, an epic's own text. Paired with
     * `content:report`; also moved by the host's writes to an epic and by edits to the project's files. A module
     * ticking this re-reads what it shows when `contentStamp(context.content, …)` moves.
     */
    readonly content: "Does something when the material it shows for an epic has been changed — re-reads the epic, its steps or its own data.";
    /**
     * Which parts of the open epic a person picked out. Picked in the host's bar; no module sets it,
     * so a registry finds no setter. A module ticking this narrows to the picked parts and says how
     * much it left out.
     */
    readonly parts: "Does something when the parts of the epic somebody picked out change — narrows to them, and says what it left out.";
};
export type Reaction = keyof typeof REACTS_TO;
export declare const REACTION_NAMES: Reaction[];
/**
 * The category words this version suggests for `tags`, each with what it is for. A suggestion, not
 * a registry: `tags` is not checked against it, and a host shows an unknown word as it is.
 */
export declare const TAGS: {
    readonly planning: "Deciding what the work is: journeys, references, checklists.";
    readonly reading: "Reading a document somebody else wrote.";
    readonly writing: "Writing one: a paper, a deck, notes.";
    readonly code: "Looking at and working in source.";
    readonly review: "Judging a change before it lands.";
    readonly agents: "Running agents and hearing back from them.";
    readonly tests: "Running checks and reading what they said.";
};
export type Tag = keyof typeof TAGS;
export declare const TAG_NAMES: Tag[];
export declare const manifestSchema: z.ZodObject<{
    /**
     * The word that makes this a manifest claim rather than a hopeful GET. Either spelling is
     * accepted and handed back as it was said: `roadmap.module` is a module from before the rename.
     * See `dialectOfKind`.
     */
    kind: z.ZodEnum<["kehikot.module", "roadmap.module"]>;
    /** Which protocol this module was built against, as a single integer. */
    protocol: z.ZodNumber;
    /**
     * Canonical once parsed: `roadmap.journeys` is read as `kehikot.journeys`,
     * the same module under the name it has had since the rename. See
     * `canonicalModuleId`.
     */
    id: z.ZodEffects<z.ZodString, string, string>;
    name: z.ZodString;
    /**
     * The module's own version. Shown to a person; this protocol never parses or compares it, and it
     * has no agreed grammar for a host to decide anything from.
     */
    version: z.ZodDefault<z.ZodString>;
    /**
     * Which FORMAT this module writes its project data in (the files under `<project>/.kehikot/<module>/`): a
     * positive integer, absent means 1. A host refuses a version numbered lower than the highest already run for
     * the project. Raise it only in the release that first writes data an earlier release cannot read.
     */
    dataVersion: z.ZodDefault<z.ZodNumber>;
    summary: z.ZodDefault<z.ZodString>;
    /**
     * The categories this module files itself under, most fitting first: the first tag is where a
     * host puts a module it shows once, the rest only widen a search. See `TAGS`; a word outside it
     * is carried as written. Empty means no category.
     */
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /**
     * What an agent should do about this module, given that it is here: what its presence implies,
     * written by the module's author and the same on every canvas. A module's own claim: a host
     * relays it attributed to the module, before `context.prompt`. Empty by default.
     */
    guidance: z.ZodDefault<z.ZodString>;
    /** The page a host would frame. Relative to the module's own origin. */
    entry: z.ZodString;
    icon: z.ZodOptional<z.ZodString>;
    /**
     * Cheap liveness, so that "not running" and "broken" can be different words. Carried on the
     * parsed manifest, though no host polls it yet. A host must resolve it against the origin the
     * manifest came from and refuse it if it leaves.
     */
    health: z.ZodOptional<z.ZodString>;
    /**
     * Where the module's OWN MCP server answers. A host does not proxy it or speak to it; it only
     * says where it is, so a person can connect a session and an agent can be told which tools belong
     * to which module.
     */
    mcp: z.ZodOptional<z.ZodObject<{
        url: z.ZodString;
        transport: z.ZodDefault<z.ZodEnum<["http", "sse", "stdio"]>>;
        /** What an agent would be connecting to, in one line, for the list. */
        about: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        transport: "http" | "sse" | "stdio";
        about: string;
    }, {
        url: string;
        transport?: "http" | "sse" | "stdio" | undefined;
        about?: string | undefined;
    }>>;
    /**
     * The formats this module speaks, by name and version: `emits` is what it will send, `consumes`
     * what it will show. Neither list is checked against the extensions this package knows; a host
     * that does not know a name does not route it.
     */
    extensions: z.ZodDefault<z.ZodObject<{
        emits: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
        consumes: z.ZodDefault<z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">>;
    }, "strip", z.ZodTypeAny, {
        emits: string[];
        consumes: string[];
    }, {
        emits?: string[] | undefined;
        consumes?: string[] | undefined;
    }>>;
    /**
     * The parts of the context this module says it REACTS to. See `REACTS_TO`. The module's own
     * unchecked account, unlike `extensions`, which the host carries. List only what the program
     * actually moves for; empty is the common answer.
     */
    reacts: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /**
     * Why this module has nothing to narrow to the picked parts, in one sentence, for a module that
     * does not say `reacts: ['parts']` (0.34.0). Optional and never defaulted. A module that says
     * neither is reported by `partsDeclaration`, not refused; the next version refuses it.
     */
    partless: z.ZodOptional<z.ZodString>;
    modes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        /**
         * `epic`: the mode's tab follows the reader, told which epic is open and told again on every
         * switch. `global`: one page for the whole canvas, told nothing and never re-pointed. The former
         * word `journey` has no alias.
         */
        scope: z.ZodDefault<z.ZodEnum<["epic", "global"]>>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        id: string;
        scope: "epic" | "global";
    }, {
        label: string;
        id: string;
        scope?: "epic" | "global" | undefined;
    }>, "many">;
    /**
     * What the module says about itself and its host: a statement of intent a person can read before
     * installing, and that a host may show, log, ignore or contradict. Nothing is granted by it and
     * nothing is unlocked by it.
     */
    declares: z.ZodDefault<z.ZodObject<{
        /**
         * The protocol range this module can speak, e.g. `>=1 <2`. See `speaks`.
         */
        protocol: z.ZodDefault<z.ZodString>;
        /**
         * What it intends to call. Free strings, not an enum; see `CAPABILITIES` in `methods.ts`.
         * Documentation only: the host refuses or allows each call itself and does not check against
         * this list.
         */
        uses: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /**
         * Whether the frame needs its own origin back (cookies, localStorage, IndexedDB). False by default: the
         * module runs on an opaque origin and cannot reach its own storage. The host decides; always refusing is
         * conforming. With an origin, messages can be addressed to it rather than `'*'`.
         */
        storage: z.ZodDefault<z.ZodBoolean>;
        /**
         * Whether this module has a use for a prompt somebody writes for it. A declaration, not a
         * demand: it lets a host offer one. A module declaring this must still work with
         * `context.prompt` null.
         */
        prompt: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        protocol: string;
        prompt: boolean;
        uses: string[];
        storage: boolean;
    }, {
        protocol?: string | undefined;
        prompt?: boolean | undefined;
        uses?: string[] | undefined;
        storage?: boolean | undefined;
    }>>;
    /**
     * What the server answering is built from, and when it started. Optional, added by `doors()`;
     * a malformed one reads as absent rather than failing the manifest. See `build.ts`.
     */
    build: z.ZodCatch<z.ZodOptional<z.ZodObject<{
        version: z.ZodString;
        commit: z.ZodDefault<z.ZodNullable<z.ZodString>>;
        started: z.ZodString;
        protocol: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        version: string;
        commit: string | null;
        started: string;
        protocol: string;
    }, {
        version: string;
        started: string;
        protocol: string;
        commit?: string | null | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    version: string;
    protocol: number;
    id: string;
    name: string;
    summary: string;
    kind: "kehikot.module" | "roadmap.module";
    dataVersion: number;
    tags: string[];
    guidance: string;
    entry: string;
    extensions: {
        emits: string[];
        consumes: string[];
    };
    reacts: string[];
    modes: {
        label: string;
        id: string;
        scope: "epic" | "global";
    }[];
    declares: {
        protocol: string;
        prompt: boolean;
        uses: string[];
        storage: boolean;
    };
    build?: {
        version: string;
        commit: string | null;
        started: string;
        protocol: string;
    } | undefined;
    icon?: string | undefined;
    health?: string | undefined;
    mcp?: {
        url: string;
        transport: "http" | "sse" | "stdio";
        about: string;
    } | undefined;
    partless?: string | undefined;
}, {
    protocol: number;
    id: string;
    name: string;
    kind: "kehikot.module" | "roadmap.module";
    entry: string;
    modes: {
        label: string;
        id: string;
        scope?: "epic" | "global" | undefined;
    }[];
    build?: unknown;
    version?: string | undefined;
    summary?: string | undefined;
    dataVersion?: number | undefined;
    tags?: string[] | undefined;
    guidance?: string | undefined;
    icon?: string | undefined;
    health?: string | undefined;
    mcp?: {
        url: string;
        transport?: "http" | "sse" | "stdio" | undefined;
        about?: string | undefined;
    } | undefined;
    extensions?: {
        emits?: string[] | undefined;
        consumes?: string[] | undefined;
    } | undefined;
    reacts?: string[] | undefined;
    partless?: string | undefined;
    declares?: {
        protocol?: string | undefined;
        prompt?: boolean | undefined;
        uses?: string[] | undefined;
        storage?: boolean | undefined;
    } | undefined;
}>;
export type Manifest = z.infer<typeof manifestSchema>;
/** What a module author writes, before defaults are filled in. */
export type ManifestInput = z.input<typeof manifestSchema>;
/**
 * A parsed manifest, spelled for a host from before the rename: the old `kind`, the old module id,
 * the old extension names; everything else is the same document. What a module serves at
 * `LEGACY_WELL_KNOWN`. Pure; the manifest passed in is not changed.
 */
export declare function legacyManifest(manifest: Manifest): Omit<Manifest, 'kind'> & {
    kind: typeof LEGACY_MANIFEST_KIND;
};
/**
 * Does a range include a protocol number? Space-separated comparisons against an integer (`>=1 <2`,
 * or bare `1`), all of which must hold; anything unreadable names nothing (false). Pure, a reading
 * not a decision: a host must also compare its own protocol number against `manifest.protocol`.
 */
export declare function speaks(range: string, protocol?: number): boolean;
/**
 * What is wrong with what a module says about the parts of an epic, as sentences a host can show; `[]` when
 * nothing is. A module has `parts` in `reacts` or a reason in `partless`; neither and both are reported. Not
 * called by `manifestSchema`: a warning now (`bun run check:parts` fails), a refusal next minor version.
 */
export declare function partsDeclaration(manifest: {
    id?: string;
    reacts?: readonly string[];
    partless?: string;
}): string[];
/**
 * What a host has concluded about one module, in one word: it works (`ready`), it speaks a protocol
 * the host does not (`incompatible`), or nothing is answering (`silent`). A silent module keeps its
 * row in a list rather than vanishing. Which state a module is in is never computed here.
 */
export type ModuleCondition = 'ready' | 'incompatible' | 'silent';
export declare const MODULE_CONDITIONS: readonly ["ready", "incompatible", "silent"];
export {};
