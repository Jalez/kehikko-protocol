import { z } from 'zod';
import { type ContextScope } from './context.js';
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
     * 2.29.0. What the module's content belongs to while it works in this mode: one of
     * `MODULE_SCOPES` (`machine`, `project`, `epic`, `part`, `kehikko`). A module lists one mode per
     * scope it can work at, its default FIRST; the person picks among them per container and the host
     * tells the one in use as `context.scope`. Absent, the pre-2.29.0 `global` and a word a later
     * version adds all read as `epic` (`readScope`), so no manifest is refused for it. See `scope.ts`.
     */
    scope: z.ZodEffects<z.ZodCatch<z.ZodOptional<z.ZodEnum<["machine", "project", "epic", "part", "kehikko", "global"]>>>, "epic" | "kehikko" | "project" | "part" | "machine", unknown>;
    /**
     * 2.29.0. What the module shows at this scope, in one line a host puts beside the scope's name
     * ("every project's test runs, whatever is open here"). Optional; a host ignores it before 2.29.0.
     */
    scopeSays: z.ZodEffects<z.ZodCatch<z.ZodOptional<z.ZodString>>, string | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    id: string;
    label: string;
    scope: "epic" | "kehikko" | "project" | "part" | "machine";
    scopeSays?: string | undefined;
}, {
    id: string;
    label: string;
    scope?: unknown;
    scopeSays?: unknown;
}>;
export type ModuleMode = z.infer<typeof modeSchema>;
/**
 * The context kinds a module can say it REACTS to, each with what it means. Documentation only: a host must not
 * gate, filter, withhold or route anything on it; every framed module gets the whole context. One exception,
 * `address` (2.16.0): a host reads it to say whether anybody on the kehikko shows pages. Free strings on
 * the wire: a host shows or drops an unknown word and still frames the module.
 */
export declare const REACTS_TO: {
    readonly passage: "Does something when the reader points at a passage — a file, a place in it, and the words that were there.";
    readonly selection: "Does something when the references somebody picked out change.";
    /**
     * 2.13.0. Somebody pointed at a place in a change's code (`context.location`). Paired with
     * `location:set`. A module ticking this opens the file there, scrolls its diff there, or — for
     * `intent: 'comment'` — starts a comment there.
     */
    readonly location: "Does something when somebody points at a place in a change's code — opens the file there, or starts a comment there.";
    /**
     * 2.16.0. A web address was handed to the canvas (`context.address`). Paired with `address:open`. A
     * module ticking this SHOWS PAGES: it opens the address when its `at` is new. The one word a host
     * reads for more than documentation: to answer `address.open` with `shown` (somebody on the kehikko
     * ticks it) or `offered` (nobody does). It still sends the address to every container.
     */
    readonly address: "Shows pages: opens a web address somebody handed to the canvas.";
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
/**
 * One kind of thing a module can be asked to show, or to answer for, and the tools at its MCP door
 * that do it. `show` points the open page at one (and saves nothing); `release` lets go of what
 * `show` held, and is absent when a pointing holds nothing; `done` answers "is this done?". Each
 * tool spells its context arguments `project` and `epic`. See docs/asking.md and `door.ts`.
 */
declare const subjectSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    /** The word for the kind, as a caller would say it: `slide`, `question`, `flow`. Unique in a module. */
    kind: z.ZodString;
    /** What one of these is, in a line, for somebody choosing what to ask for. */
    about: z.ZodDefault<z.ZodString>;
    /** The tool that shows one. It answers with `showAnswerSchema`, and must be read-only. */
    show: z.ZodOptional<z.ZodString>;
    /** The tool that stops showing. Called with the context arguments and nothing else. */
    release: z.ZodOptional<z.ZodString>;
    /** The tool that says whether one is done. It answers with `doneAnswerSchema`, and must be read-only. */
    done: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    kind: string;
    about: string;
    done?: string | undefined;
    show?: string | undefined;
    release?: string | undefined;
}, {
    kind: string;
    done?: string | undefined;
    show?: string | undefined;
    about?: string | undefined;
    release?: string | undefined;
}>, {
    kind: string;
    about: string;
    done?: string | undefined;
    show?: string | undefined;
    release?: string | undefined;
}, {
    kind: string;
    done?: string | undefined;
    show?: string | undefined;
    about?: string | undefined;
    release?: string | undefined;
}>, {
    kind: string;
    about: string;
    done?: string | undefined;
    show?: string | undefined;
    release?: string | undefined;
}, {
    kind: string;
    done?: string | undefined;
    show?: string | undefined;
    about?: string | undefined;
    release?: string | undefined;
}>;
export type ModuleSubject = z.infer<typeof subjectSchema>;
/**
 * The shape of a door's declared name, `mcp.as`: a lowercase letter, then lowercase letters, digits,
 * `-` and `_`. It cannot start with `-` (it is passed to a command and must never read as a flag),
 * holds no whitespace, quote or dot, and neither holds `__` nor ends in `_`: `__` is what separates
 * the server from the tool in `mcp__<server>__<tool>`. At most `LIMITS.DOOR_NAME` characters.
 */
export declare const DOOR_NAME: RegExp;
/**
 * The manifest. Every field above, and one rule over two of them: a module either follows the
 * picked parts (`reacts` has `parts`) or says in `partless` why it has nothing to narrow. A
 * manifest that says neither, or both, does not parse, and the issue is the sentence saying what
 * to add (`partsDeclaration`). A `ZodEffects`, so it has no `.shape`; nothing else changed.
 */
export declare const manifestSchema: z.ZodEffects<z.ZodObject<{
    /** The word that makes this a manifest claim rather than a hopeful GET. */
    kind: z.ZodLiteral<"kehikot.module">;
    /** Which protocol this module was built against, as a single integer. */
    protocol: z.ZodNumber;
    id: z.ZodString;
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
    /**
     * 2.14.0. The icon this module is known by: a KEY of `MODULE_ICONS` (`lucide:<name>`, or
     * `brand:<slug>` for the mark of a third-party tool the module fronts), which a host draws from
     * its own set beside the module's name. Never a path or URL: a host does not fetch it, and draws a
     * string it does not know — including the image URL this field held before 2.14.0 — as its own
     * neutral icon. Any short string still parses, so no manifest is refused for it. See `icon.ts`.
     */
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
        /**
         * The server name an agent host should register this door under (1.3.0), when the module
         * wants another than the one a host would derive from its id. It becomes part of every tool's
         * name (`mcp__<as>__<tool>`) and an argument on a command line, so the shape is strict: see
         * `DOOR_NAME`. Absent by default; a host that does not know the field names the door itself.
         */
        as: z.ZodOptional<z.ZodString>;
        /**
         * What this door can be asked to show and to answer for, by kind. The declaration that lets a
         * caller who has never heard of this module find "the tool that points". Empty by default.
         */
        subjects: z.ZodDefault<z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
            /** The word for the kind, as a caller would say it: `slide`, `question`, `flow`. Unique in a module. */
            kind: z.ZodString;
            /** What one of these is, in a line, for somebody choosing what to ask for. */
            about: z.ZodDefault<z.ZodString>;
            /** The tool that shows one. It answers with `showAnswerSchema`, and must be read-only. */
            show: z.ZodOptional<z.ZodString>;
            /** The tool that stops showing. Called with the context arguments and nothing else. */
            release: z.ZodOptional<z.ZodString>;
            /** The tool that says whether one is done. It answers with `doneAnswerSchema`, and must be read-only. */
            done: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            kind: string;
            about: string;
            done?: string | undefined;
            show?: string | undefined;
            release?: string | undefined;
        }, {
            kind: string;
            done?: string | undefined;
            show?: string | undefined;
            about?: string | undefined;
            release?: string | undefined;
        }>, {
            kind: string;
            about: string;
            done?: string | undefined;
            show?: string | undefined;
            release?: string | undefined;
        }, {
            kind: string;
            done?: string | undefined;
            show?: string | undefined;
            about?: string | undefined;
            release?: string | undefined;
        }>, {
            kind: string;
            about: string;
            done?: string | undefined;
            show?: string | undefined;
            release?: string | undefined;
        }, {
            kind: string;
            done?: string | undefined;
            show?: string | undefined;
            about?: string | undefined;
            release?: string | undefined;
        }>, "many">, {
            kind: string;
            about: string;
            done?: string | undefined;
            show?: string | undefined;
            release?: string | undefined;
        }[], {
            kind: string;
            done?: string | undefined;
            show?: string | undefined;
            about?: string | undefined;
            release?: string | undefined;
        }[]>>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        transport: "http" | "sse" | "stdio";
        about: string;
        subjects: {
            kind: string;
            about: string;
            done?: string | undefined;
            show?: string | undefined;
            release?: string | undefined;
        }[];
        as?: string | undefined;
    }, {
        url: string;
        transport?: "http" | "sse" | "stdio" | undefined;
        about?: string | undefined;
        as?: string | undefined;
        subjects?: {
            kind: string;
            done?: string | undefined;
            show?: string | undefined;
            about?: string | undefined;
            release?: string | undefined;
        }[] | undefined;
    }>>;
    /**
     * The formats this module speaks, by name and version: `emits` is what it will send, `consumes`
     * what it will show. Neither list is checked against the extensions this package knows; a host
     * that does not know a name does not route it.
     */
    extensions: z.ZodDefault<z.ZodObject<{
        emits: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        consumes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
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
     * does not say `reacts: ['parts']`. Optional and never defaulted; a manifest says one or the
     * other, and `manifestSchema` refuses one that says neither or both (`partsDeclaration`).
     */
    partless: z.ZodOptional<z.ZodString>;
    /**
     * 2.28.0. The subjects this module can be asked to show (`SHOW_SUBJECTS`: `agent-session`), by a
     * `view.goto { show }` another module makes: the host relays the ask as `context.show` to it and to
     * nobody who does not say it. What the module says about itself, like `reacts`: a host that does not
     * know the field still runs it and relays nothing. Optional; one that does not parse is dropped.
     */
    shows: z.ZodCatch<z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>>>;
    /**
     * 2.31.0. The Inbox events this module may name on an activity item (`event`): each a named case of
     * one state ("Research complete", a `done`) that a host shows by its `says` and lets a person give
     * its own sound. What the module says about itself, like `reacts` and `shows`, and at the top level
     * for the same reason: a host before 2.31.0 reads an unknown `declares` key as a declaration from a
     * newer protocol (`fitOf`) and would not run the module, while it ignores this. Optional; a list
     * that does not parse is dropped, not fatal.
     */
    events: z.ZodCatch<z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        says: z.ZodString;
        state: z.ZodEnum<["working", "attention", "done"]>;
        sound: z.ZodCatch<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        says: string;
        state: "working" | "attention" | "done";
        sound?: string | undefined;
    }, {
        id: string;
        says: string;
        state: "working" | "attention" | "done";
        sound?: unknown;
    }>, "many">, {
        id: string;
        says: string;
        state: "working" | "attention" | "done";
        sound?: string | undefined;
    }[], {
        id: string;
        says: string;
        state: "working" | "attention" | "done";
        sound?: unknown;
    }[]>>>;
    /**
     * 2.33.0. What this module can open when the host points the canvas at it (`OPENS`: `file`). A host
     * with a file to show a person offers to open it with a module that says `file`, and names none.
     * What the module says about itself, at the top level like `shows` and for the same reason: a host
     * before 2.33.0 ignores it and runs the module. Optional; one that does not parse is dropped.
     */
    opens: z.ZodCatch<z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>>>;
    /**
     * 2.33.0. What this module holds that a restart of it ends (`HOLDS`: `live-sessions`). A host does
     * not restart such a module on its own account, and says so when a person's press would. Top-level,
     * optional, dropped when it does not parse, like `opens`.
     */
    holds: z.ZodCatch<z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>>>;
    /**
     * The scopes this module can work at, as modes: one per scope, the default first (2.29.0; see
     * `modeSchema.scope`). Required, at least one, so a host older than 2.29.0 still parses it.
     */
    modes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        /**
         * 2.29.0. What the module's content belongs to while it works in this mode: one of
         * `MODULE_SCOPES` (`machine`, `project`, `epic`, `part`, `kehikko`). A module lists one mode per
         * scope it can work at, its default FIRST; the person picks among them per container and the host
         * tells the one in use as `context.scope`. Absent, the pre-2.29.0 `global` and a word a later
         * version adds all read as `epic` (`readScope`), so no manifest is refused for it. See `scope.ts`.
         */
        scope: z.ZodEffects<z.ZodCatch<z.ZodOptional<z.ZodEnum<["machine", "project", "epic", "part", "kehikko", "global"]>>>, "epic" | "kehikko" | "project" | "part" | "machine", unknown>;
        /**
         * 2.29.0. What the module shows at this scope, in one line a host puts beside the scope's name
         * ("every project's test runs, whatever is open here"). Optional; a host ignores it before 2.29.0.
         */
        scopeSays: z.ZodEffects<z.ZodCatch<z.ZodOptional<z.ZodString>>, string | undefined, unknown>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        label: string;
        scope: "epic" | "kehikko" | "project" | "part" | "machine";
        scopeSays?: string | undefined;
    }, {
        id: string;
        label: string;
        scope?: unknown;
        scopeSays?: unknown;
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
        /**
         * Agent skills this module offers a person (2.5.0): name, summary, version, and what each
         * needs on the kehikko. Each one's text is served at `skillPath(name)`. An offer, not an
         * install: the host shows the text and the person decides. Optional and never defaulted;
         * absent means none.
         */
        skills: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            summary: z.ZodString;
            version: z.ZodString;
            needs: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodType<import("./skills.js").SkillNeed, z.ZodTypeDef, import("./skills.js").SkillNeed>, "many">, import("./skills.js").SkillNeed[], import("./skills.js").SkillNeed[]>>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            version: string;
            summary: string;
            needs?: import("./skills.js").SkillNeed[] | undefined;
        }, {
            name: string;
            version: string;
            summary: string;
            needs?: import("./skills.js").SkillNeed[] | undefined;
        }>, "many">, {
            name: string;
            version: string;
            summary: string;
            needs?: import("./skills.js").SkillNeed[] | undefined;
        }[], {
            name: string;
            version: string;
            summary: string;
            needs?: import("./skills.js").SkillNeed[] | undefined;
        }[]>>;
        /**
         * What this module publishes for others to read (2.21.0): words of `PROVIDES` — `steps` (its
         * `steps.json`), `documents` and `refs` (its `parts.json`) — or a word a later version adds.
         * What a skill's `{ provides }` need is met by, and how a reader finds "any steps provider"
         * without an id. Optional and never defaulted; one that does not parse is dropped, not fatal.
         */
        provides: z.ZodCatch<z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>>>;
        /**
         * That this module runs agent sessions (2.21.0), and whether it loads skills into them
         * (`loadsSkills`): a host routes kehikko-bound skills to such a module, never to one by name.
         * Optional; absent means it runs none. One that does not parse is dropped, not fatal.
         */
        agentSessions: z.ZodCatch<z.ZodOptional<z.ZodObject<{
            loadsSkills: z.ZodDefault<z.ZodBoolean>;
            installsSkills: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            loadsSkills: boolean;
            installsSkills?: boolean | undefined;
        }, {
            loadsSkills?: boolean | undefined;
            installsSkills?: boolean | undefined;
        }>>>;
        /**
         * DEPRECATED (2.29.0): list a mode with `scope: 'project'` instead. Which scopes of
         * `context.scope` this module can show (2.9.0): `epic` for one epic, `project` for every epic of
         * the project at once. Still read: `project` here counts as a supported scope after the modes'
         * (`supportedScopes`). Keep it beside the mode while a host older than 2.29.0 should still
         * leave the module uncovered on "All epics".
         */
        scopes: z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodEnum<["epic", "project"]>, "many">, ("epic" | "project")[], ("epic" | "project")[]>>;
        /**
         * The settings a person can see and change from the host (2.15.0): a short list of fields a host
         * draws as one form, read and changed at the module's door (`settings.get`, `settings.set`). See
         * `settings.ts`. Optional and never defaulted; absent means none. A list that does not parse is
         * dropped, not fatal: the module then shows no settings in the host, and nothing else changes.
         */
        settings: z.ZodCatch<z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodEffects<z.ZodObject<{
            key: z.ZodEffects<z.ZodString, string, string>;
            label: z.ZodString;
            description: z.ZodDefault<z.ZodString>;
            type: z.ZodEnum<["boolean", "string", "number", "choice", "list"]>;
            choices: z.ZodOptional<z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                label: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                value: string;
                label: string;
            }, {
                value: string;
                label: string;
            }>, "many">>;
            default: z.ZodUnknown;
            scope: z.ZodDefault<z.ZodEnum<["project", "machine"]>>;
            personOnly: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            type: "string" | "number" | "boolean" | "choice" | "list";
            key: string;
            label: string;
            scope: "project" | "machine";
            description: string;
            personOnly: boolean;
            default?: unknown;
            choices?: {
                value: string;
                label: string;
            }[] | undefined;
        }, {
            type: "string" | "number" | "boolean" | "choice" | "list";
            key: string;
            label: string;
            default?: unknown;
            scope?: "project" | "machine" | undefined;
            description?: string | undefined;
            choices?: {
                value: string;
                label: string;
            }[] | undefined;
            personOnly?: boolean | undefined;
        }>, {
            type: "string" | "number" | "boolean" | "choice" | "list";
            key: string;
            label: string;
            scope: "project" | "machine";
            description: string;
            personOnly: boolean;
            default?: unknown;
            choices?: {
                value: string;
                label: string;
            }[] | undefined;
        }, {
            type: "string" | "number" | "boolean" | "choice" | "list";
            key: string;
            label: string;
            default?: unknown;
            scope?: "project" | "machine" | undefined;
            description?: string | undefined;
            choices?: {
                value: string;
                label: string;
            }[] | undefined;
            personOnly?: boolean | undefined;
        }>, "many">, {
            type: "string" | "number" | "boolean" | "choice" | "list";
            key: string;
            label: string;
            scope: "project" | "machine";
            description: string;
            personOnly: boolean;
            default?: unknown;
            choices?: {
                value: string;
                label: string;
            }[] | undefined;
        }[], {
            type: "string" | "number" | "boolean" | "choice" | "list";
            key: string;
            label: string;
            default?: unknown;
            scope?: "project" | "machine" | undefined;
            description?: string | undefined;
            choices?: {
                value: string;
                label: string;
            }[] | undefined;
            personOnly?: boolean | undefined;
        }[]>>>;
        /**
         * What this module's `view.goto` carries that a host before 2.28.0 does not know (`NAVIGATES`):
         * `project` (it switches project first) and `show` (it asks for one thing to be shown there).
         * A host that knows them answers them only for a module that says so; `fitOf` holds a module
         * that says so to a host that knows them, because an older one strips the field and would go
         * to the epic of that name in the project it has open. Optional; one that does not parse is
         * dropped, not fatal.
         */
        navigates: z.ZodCatch<z.ZodOptional<z.ZodEffects<z.ZodArray<z.ZodString, "many">, string[], string[]>>>;
    }, "strip", z.ZodTypeAny, {
        protocol: string;
        prompt: boolean;
        uses: string[];
        storage: boolean;
        provides?: string[] | undefined;
        settings?: {
            type: "string" | "number" | "boolean" | "choice" | "list";
            key: string;
            label: string;
            scope: "project" | "machine";
            description: string;
            personOnly: boolean;
            default?: unknown;
            choices?: {
                value: string;
                label: string;
            }[] | undefined;
        }[] | undefined;
        skills?: {
            name: string;
            version: string;
            summary: string;
            needs?: import("./skills.js").SkillNeed[] | undefined;
        }[] | undefined;
        agentSessions?: {
            loadsSkills: boolean;
            installsSkills?: boolean | undefined;
        } | undefined;
        scopes?: ("epic" | "project")[] | undefined;
        navigates?: string[] | undefined;
    }, {
        protocol?: string | undefined;
        prompt?: boolean | undefined;
        provides?: unknown;
        uses?: string[] | undefined;
        settings?: unknown;
        storage?: boolean | undefined;
        skills?: {
            name: string;
            version: string;
            summary: string;
            needs?: import("./skills.js").SkillNeed[] | undefined;
        }[] | undefined;
        agentSessions?: unknown;
        scopes?: ("epic" | "project")[] | undefined;
        navigates?: unknown;
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
    id: string;
    name: string;
    version: string;
    protocol: number;
    summary: string;
    kind: "kehikot.module";
    declares: {
        protocol: string;
        prompt: boolean;
        uses: string[];
        storage: boolean;
        provides?: string[] | undefined;
        settings?: {
            type: "string" | "number" | "boolean" | "choice" | "list";
            key: string;
            label: string;
            scope: "project" | "machine";
            description: string;
            personOnly: boolean;
            default?: unknown;
            choices?: {
                value: string;
                label: string;
            }[] | undefined;
        }[] | undefined;
        skills?: {
            name: string;
            version: string;
            summary: string;
            needs?: import("./skills.js").SkillNeed[] | undefined;
        }[] | undefined;
        agentSessions?: {
            loadsSkills: boolean;
            installsSkills?: boolean | undefined;
        } | undefined;
        scopes?: ("epic" | "project")[] | undefined;
        navigates?: string[] | undefined;
    };
    reacts: string[];
    dataVersion: number;
    tags: string[];
    guidance: string;
    entry: string;
    extensions: {
        emits: string[];
        consumes: string[];
    };
    modes: {
        id: string;
        label: string;
        scope: "epic" | "kehikko" | "project" | "part" | "machine";
        scopeSays?: string | undefined;
    }[];
    opens?: string[] | undefined;
    holds?: string[] | undefined;
    build?: {
        version: string;
        commit: string | null;
        started: string;
        protocol: string;
    } | undefined;
    shows?: string[] | undefined;
    mcp?: {
        url: string;
        transport: "http" | "sse" | "stdio";
        about: string;
        subjects: {
            kind: string;
            about: string;
            done?: string | undefined;
            show?: string | undefined;
            release?: string | undefined;
        }[];
        as?: string | undefined;
    } | undefined;
    icon?: string | undefined;
    health?: string | undefined;
    partless?: string | undefined;
    events?: {
        id: string;
        says: string;
        state: "working" | "attention" | "done";
        sound?: string | undefined;
    }[] | undefined;
}, {
    id: string;
    name: string;
    protocol: number;
    kind: "kehikot.module";
    entry: string;
    modes: {
        id: string;
        label: string;
        scope?: unknown;
        scopeSays?: unknown;
    }[];
    opens?: unknown;
    holds?: unknown;
    build?: unknown;
    version?: string | undefined;
    summary?: string | undefined;
    shows?: unknown;
    declares?: {
        protocol?: string | undefined;
        prompt?: boolean | undefined;
        provides?: unknown;
        uses?: string[] | undefined;
        settings?: unknown;
        storage?: boolean | undefined;
        skills?: {
            name: string;
            version: string;
            summary: string;
            needs?: import("./skills.js").SkillNeed[] | undefined;
        }[] | undefined;
        agentSessions?: unknown;
        scopes?: ("epic" | "project")[] | undefined;
        navigates?: unknown;
    } | undefined;
    reacts?: string[] | undefined;
    mcp?: {
        url: string;
        transport?: "http" | "sse" | "stdio" | undefined;
        about?: string | undefined;
        as?: string | undefined;
        subjects?: {
            kind: string;
            done?: string | undefined;
            show?: string | undefined;
            about?: string | undefined;
            release?: string | undefined;
        }[] | undefined;
    } | undefined;
    icon?: string | undefined;
    dataVersion?: number | undefined;
    tags?: string[] | undefined;
    guidance?: string | undefined;
    health?: string | undefined;
    extensions?: {
        emits?: string[] | undefined;
        consumes?: string[] | undefined;
    } | undefined;
    partless?: string | undefined;
    events?: unknown;
}>, {
    id: string;
    name: string;
    version: string;
    protocol: number;
    summary: string;
    kind: "kehikot.module";
    declares: {
        protocol: string;
        prompt: boolean;
        uses: string[];
        storage: boolean;
        provides?: string[] | undefined;
        settings?: {
            type: "string" | "number" | "boolean" | "choice" | "list";
            key: string;
            label: string;
            scope: "project" | "machine";
            description: string;
            personOnly: boolean;
            default?: unknown;
            choices?: {
                value: string;
                label: string;
            }[] | undefined;
        }[] | undefined;
        skills?: {
            name: string;
            version: string;
            summary: string;
            needs?: import("./skills.js").SkillNeed[] | undefined;
        }[] | undefined;
        agentSessions?: {
            loadsSkills: boolean;
            installsSkills?: boolean | undefined;
        } | undefined;
        scopes?: ("epic" | "project")[] | undefined;
        navigates?: string[] | undefined;
    };
    reacts: string[];
    dataVersion: number;
    tags: string[];
    guidance: string;
    entry: string;
    extensions: {
        emits: string[];
        consumes: string[];
    };
    modes: {
        id: string;
        label: string;
        scope: "epic" | "kehikko" | "project" | "part" | "machine";
        scopeSays?: string | undefined;
    }[];
    opens?: string[] | undefined;
    holds?: string[] | undefined;
    build?: {
        version: string;
        commit: string | null;
        started: string;
        protocol: string;
    } | undefined;
    shows?: string[] | undefined;
    mcp?: {
        url: string;
        transport: "http" | "sse" | "stdio";
        about: string;
        subjects: {
            kind: string;
            about: string;
            done?: string | undefined;
            show?: string | undefined;
            release?: string | undefined;
        }[];
        as?: string | undefined;
    } | undefined;
    icon?: string | undefined;
    health?: string | undefined;
    partless?: string | undefined;
    events?: {
        id: string;
        says: string;
        state: "working" | "attention" | "done";
        sound?: string | undefined;
    }[] | undefined;
}, {
    id: string;
    name: string;
    protocol: number;
    kind: "kehikot.module";
    entry: string;
    modes: {
        id: string;
        label: string;
        scope?: unknown;
        scopeSays?: unknown;
    }[];
    opens?: unknown;
    holds?: unknown;
    build?: unknown;
    version?: string | undefined;
    summary?: string | undefined;
    shows?: unknown;
    declares?: {
        protocol?: string | undefined;
        prompt?: boolean | undefined;
        provides?: unknown;
        uses?: string[] | undefined;
        settings?: unknown;
        storage?: boolean | undefined;
        skills?: {
            name: string;
            version: string;
            summary: string;
            needs?: import("./skills.js").SkillNeed[] | undefined;
        }[] | undefined;
        agentSessions?: unknown;
        scopes?: ("epic" | "project")[] | undefined;
        navigates?: unknown;
    } | undefined;
    reacts?: string[] | undefined;
    mcp?: {
        url: string;
        transport?: "http" | "sse" | "stdio" | undefined;
        about?: string | undefined;
        as?: string | undefined;
        subjects?: {
            kind: string;
            done?: string | undefined;
            show?: string | undefined;
            about?: string | undefined;
            release?: string | undefined;
        }[] | undefined;
    } | undefined;
    icon?: string | undefined;
    dataVersion?: number | undefined;
    tags?: string[] | undefined;
    guidance?: string | undefined;
    health?: string | undefined;
    extensions?: {
        emits?: string[] | undefined;
        consumes?: string[] | undefined;
    } | undefined;
    partless?: string | undefined;
    events?: unknown;
}>;
export type Manifest = z.infer<typeof manifestSchema>;
/** What a module author writes, before defaults are filled in. */
export type ManifestInput = z.input<typeof manifestSchema>;
/**
 * Does a range include a protocol number? Space-separated comparisons against an integer (`>=1 <2`,
 * or bare `1`), all of which must hold; anything unreadable names nothing (false). Pure, a reading
 * not a decision: a host must also compare its own protocol number against `manifest.protocol`.
 */
export declare function speaks(range: string, protocol?: number): boolean;
/**
 * What is wrong with what a module says about the parts of an epic, as sentences a person can act on; `[]`
 * when nothing is. A module has `parts` in `reacts` or a reason in `partless`; neither and both are reported.
 * `manifestSchema` refuses a manifest this reports, with these sentences as the issues; call it directly to
 * say the same thing about an object that has not been parsed.
 */
export declare function partsDeclaration(manifest: {
    id?: string;
    reacts?: readonly string[];
    partless?: string;
}): string[];
/**
 * 2.9.0, DEPRECATED in 2.29.0 for `supportedScopes`. The scopes of the "All epics" choice a module
 * can show: `declares.scopes` as written; otherwise `['epic']`, with `project` added when a mode
 * says `scope: 'project'`. Takes a parsed manifest or the object about to be parsed.
 */
export declare function scopesOf(manifest: {
    declares?: {
        scopes?: readonly ContextScope[];
    };
    modes?: readonly {
        scope?: unknown;
    }[];
} | null | undefined): readonly ContextScope[];
/**
 * 2.9.0. Whether a module can show a whole project at once: `project` in its supported scopes, from
 * a mode (2.29.0) or the deprecated `declares.scopes`.
 */
export declare function showsProject(manifest: {
    declares?: {
        scopes?: readonly ContextScope[];
    };
    modes?: readonly {
        scope?: unknown;
    }[];
} | null | undefined): boolean;
/**
 * What a host has concluded about one module, in one word: it works (`ready`), it speaks a protocol
 * the host does not (`incompatible`), or nothing is answering (`silent`). A silent module keeps its
 * row in a list rather than vanishing. Which state a module is in is never computed here.
 */
export type ModuleCondition = 'ready' | 'incompatible' | 'silent';
export declare const MODULE_CONDITIONS: readonly ["ready", "incompatible", "silent"];
export {};
