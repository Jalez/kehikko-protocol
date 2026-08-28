import { z } from 'zod';
/**
 * What a module says about itself when a host asks.
 *
 * One document, served at one path, describing one program: what it is called,
 * what it will show, where an agent would connect to it, and which parts of the
 * host's material it intends to use. It is the smaller half of any module and
 * the only half a host ever reads before deciding whether to frame it.
 *
 * ## Every string is bounded, and that is not tidiness
 *
 * A manifest is a document a stranger wrote, fetched off a port, and half of it
 * ends up on the host's own screen — in a list, in a tab, in the sentence a
 * person reads when the host refuses the module. An unbounded field there is
 * two hundred thousand characters of somebody else's text under somebody else's
 * name, needing no permission and nobody's agreement. The implementation this
 * package was distilled from found that four separate times, in four review
 * rounds, in fields nobody had thought of as text: a URL, an enum whose zod
 * refusal echoes what it was given, a version, a range quoted into a sentence.
 *
 * So the rule is: no string in this schema without a `max`, ever, including the
 * next one somebody adds. The numbers live in `LIMITS` so that a host writing
 * its own copy of this schema — and it should — holds to the same ones.
 *
 * ## What is NOT in here, and will not be
 *
 * There is no field by which a module asks for a permission, because there is
 * no permission to ask for. `declares.uses` says what a module intends to call.
 * That is a sentence worth reading and worth showing to whoever installed the
 * program; it is not a request, it is not answered, and nothing in this package
 * — no field, no type, no function — models an approval. What a module may
 * actually do is decided by the host, at the moment of each call, out of
 * material the module never touches.
 */
declare const modeSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    /**
     * `epic` gives the mode a tab that FOLLOWS THE READER: it is told which epic
     * is open and told again on every switch. `global` gives it one page for the
     * whole roadmap, told nothing and never re-pointed.
     *
     * Defaulted rather than required, because following the reader is what nearly
     * every module wants and a module that says nothing has not made a choice
     * about it.
     *
     * The word was `journey` and is now `epic`, with no alias, because an epic is
     * what a host can point a tab at. See `PROTOCOL` in `constants.ts` for why
     * that rename is the thing that raised the number.
     */
    scope: z.ZodDefault<z.ZodEnum<["epic", "global"]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    label: string;
    scope: "epic" | "global";
}, {
    id: string;
    label: string;
    scope?: "epic" | "global" | undefined;
}>;
export type ModuleMode = z.infer<typeof modeSchema>;
export declare const manifestSchema: z.ZodObject<{
    /**
     * The word that makes this a claim rather than a hopeful GET. Something else
     * entirely may be listening on the port a host asked, and it must not be
     * possible for that something to become a tab by accident.
     */
    kind: z.ZodLiteral<"roadmap.module">;
    /** Which protocol this module was built against, as a single integer. */
    protocol: z.ZodNumber;
    id: z.ZodString;
    name: z.ZodString;
    /**
     * The module's own version, which this protocol never parses and never
     * compares. It is shown to a person, and that is the whole of its job — a
     * host that made a decision out of it would be making a decision out of a
     * string with no agreed grammar.
     */
    version: z.ZodDefault<z.ZodString>;
    summary: z.ZodDefault<z.ZodString>;
    /** The page a host would frame. Relative to the module's own origin. */
    entry: z.ZodString;
    icon: z.ZodOptional<z.ZodString>;
    /**
     * Cheap liveness, so that "not running" and "broken" can be different words.
     *
     * ## Why it is still here when nothing fetches it
     *
     * It has an obvious smell: a field in a published schema that no consumer
     * reads is a promise nobody is keeping, and the honest thing is usually to
     * delete it and add it back the day something needs it. It stays, for two
     * reasons that only apply to a field of this particular kind.
     *
     * The first is that this package describes a wire, not an implementation. A
     * manifest is written by module authors against the published shape and read
     * by however many hosts exist; "no host polls it yet" is a fact about today's
     * hosts, and removing a field on the strength of that would make every
     * manifest that already carries it fail to parse. The shape is the contract,
     * and the contract is allowed to describe more than one program uses.
     *
     * The second is the more important one. The day something DOES poll it, that
     * something will be a process making a request to whatever address a
     * stranger's manifest named — which is precisely the crossing every host must
     * hold to its own rules. If the field is undeclared until then, every manifest
     * in the wild will already have been accepted under a looser rule, and the
     * check will be retrofitted onto a population of documents nobody validated.
     * Declaring it now means it is bounded now.
     *
     * And it is CARRIED, on the parsed manifest like every other field, which is
     * the one thing the implementation this was distilled from got wrong: it
     * validated `health`, held it to the module's own origin, and then dropped it
     * on the floor rather than putting it on the result — so the only way to
     * reach it was to re-read the raw JSON, which is the way a second, looser
     * check gets written. A field worth validating is a field worth handing on.
     *
     * What a host must still do for itself: resolve this against the origin the
     * manifest came from and refuse it if it leaves. A module may not use a host
     * to point a poller at a third party.
     */
    health: z.ZodOptional<z.ZodString>;
    /**
     * Where the module's OWN MCP server answers.
     *
     * A module is two surfaces over one store: a page for a person, and an MCP
     * server for an agent. A host does not proxy the second and does not speak to
     * it — it says where it is, so a person can connect a session to it and an
     * agent can be told which tools belong to which module. Naming it in the
     * manifest rather than in a second file is the point: one program, one
     * document, both its doors.
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
     * The formats this module speaks, by name and version.
     *
     * `emits` is what it will send — a notification, a report of its own network
     * calls. `consumes` is what it will show, which is how a notification panel
     * and an activity chart become modules rather than parts of the frame.
     *
     * Neither list is checked against the extensions this package knows about,
     * and that is on purpose. A name this version has never heard of is a module
     * built against a later version of the format registry, or against somebody
     * else's; refusing the whole manifest for it would mean a module cannot
     * mention a format until every host it might meet has been upgraded. A host
     * that does not know a name simply does not route it, and can say so.
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
    modes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        /**
         * `epic` gives the mode a tab that FOLLOWS THE READER: it is told which epic
         * is open and told again on every switch. `global` gives it one page for the
         * whole roadmap, told nothing and never re-pointed.
         *
         * Defaulted rather than required, because following the reader is what nearly
         * every module wants and a module that says nothing has not made a choice
         * about it.
         *
         * The word was `journey` and is now `epic`, with no alias, because an epic is
         * what a host can point a tab at. See `PROTOCOL` in `constants.ts` for why
         * that rename is the thing that raised the number.
         */
        scope: z.ZodDefault<z.ZodEnum<["epic", "global"]>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        label: string;
        scope: "epic" | "global";
    }, {
        id: string;
        label: string;
        scope?: "epic" | "global" | undefined;
    }>, "many">;
    /**
     * What the module says about itself and its host, as distinct from what it
     * says it IS.
     *
     * The name is `declares` rather than `needs` or `wants` or `requests`, and
     * the difference is the whole of it. A field called `needs` reads as a demand
     * with an answer; a field called `requests` reads as half of a consent
     * handshake. Neither exists. What a module writes here is a statement of
     * intent that a person can read before installing the program, and that a
     * host may show, log, ignore, or contradict. Nothing is granted by it and
     * nothing is unlocked by it.
     */
    declares: z.ZodDefault<z.ZodObject<{
        /**
         * The protocol range this module can speak, e.g. `>=1 <2`. See `speaks`.
         */
        protocol: z.ZodDefault<z.ZodString>;
        /**
         * What it intends to call.
         *
         * Free strings, not an enum, for the same reason `extensions` is free:
         * a module built against a host that knows more capabilities than yours
         * is not a malformed module. See `CAPABILITIES` in `methods.ts` for the
         * names this version of the protocol describes.
         *
         * Read it as documentation. A module that declares nothing and calls
         * everything is refused by the host at each call, exactly as if it had
         * declared honestly — the declaration is not what the host checks
         * against, because a check against a string the module wrote is a check
         * the module passes by writing a different string.
         */
        uses: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /**
         * Whether the frame needs its own origin back — cookies, localStorage,
         * IndexedDB.
         *
         * False by default, which is the whole reason it is a field: a module
         * that never says this runs on an opaque origin and cannot reach even its
         * own storage. It is the one field here that changes what a host does,
         * and it still changes nothing on its own — the host decides whether to
         * hand back an origin, and a host that always refuses is a conforming
         * host. What the field buys is that the module can be told why its
         * storage is empty instead of finding out by exception.
         *
         * A module that asks for this is also asking to be addressable: with an
         * origin of its own, messages to it can be addressed by that origin
         * rather than by `'*'`. That is a consequence, not a second field.
         */
        storage: z.ZodDefault<z.ZodBoolean>;
        /**
         * Whether this module has a use for a prompt somebody writes for it.
         *
         * A declaration, not a demand. It is how a host knows to OFFER one — to
         * list this module among the panes a prompt can be aimed at, and to show
         * that a prompt is expected here and has not been written yet. A host
         * that offers nothing is still a conforming host, so a module declaring
         * this must work with `context.prompt` null, because on such a host it
         * always will be.
         *
         * Declared rather than inferred from behaviour, for the reason every
         * other declaration here exists: somebody deciding whether to run a
         * program should be able to read what it expects before it runs, and a
         * host should not have to watch a module to find out what it wants.
         */
        prompt: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        protocol: string;
        uses: string[];
        storage: boolean;
        prompt: boolean;
    }, {
        protocol?: string | undefined;
        uses?: string[] | undefined;
        storage?: boolean | undefined;
        prompt?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    kind: "roadmap.module";
    protocol: number;
    name: string;
    version: string;
    summary: string;
    entry: string;
    extensions: {
        emits: string[];
        consumes: string[];
    };
    modes: {
        id: string;
        label: string;
        scope: "epic" | "global";
    }[];
    declares: {
        protocol: string;
        uses: string[];
        storage: boolean;
        prompt: boolean;
    };
    icon?: string | undefined;
    health?: string | undefined;
    mcp?: {
        url: string;
        transport: "http" | "sse" | "stdio";
        about: string;
    } | undefined;
}, {
    id: string;
    kind: "roadmap.module";
    protocol: number;
    name: string;
    entry: string;
    modes: {
        id: string;
        label: string;
        scope?: "epic" | "global" | undefined;
    }[];
    version?: string | undefined;
    summary?: string | undefined;
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
    declares?: {
        protocol?: string | undefined;
        uses?: string[] | undefined;
        storage?: boolean | undefined;
        prompt?: boolean | undefined;
    } | undefined;
}>;
export type Manifest = z.infer<typeof manifestSchema>;
/** What a module author writes, before defaults are filled in. */
export type ManifestInput = z.input<typeof manifestSchema>;
/**
 * Does a range include a protocol number?
 *
 * The grammar is a handful of comparisons against an integer — `>=1 <2`, or
 * bare `1` — separated by spaces, and all of them must hold. Anything it cannot
 * read is treated as naming NOTHING rather than as naming everything: a module
 * whose claim is unreadable is incompatible, which is a sentence somebody can
 * act on, while a module whose unreadable claim was waved through is a frame
 * nobody agreed to.
 *
 * Pure, and it is a reading rather than a decision. It answers what a string
 * says; whether to frame the module is a separate question, and a host asking
 * it has at least one more comparison to make — its own protocol number against
 * `manifest.protocol` — because a permissive range from a module claiming
 * protocol 9 is not an argument for anything.
 */
export declare function speaks(range: string, protocol?: number): boolean;
/**
 * What a host has concluded about one module, in one word.
 *
 * Three, where an earlier design had five. `offered` and `changed` are gone
 * with the consent mechanism they belonged to: both meant "waiting on a
 * person", and there is nobody to wait for. What is left are the three states
 * that are facts rather than decisions — it works, it speaks a protocol we do
 * not, or nothing is answering — and each of them is something a host can
 * establish without asking anyone.
 *
 * `silent` is the one worth keeping in a list rather than dropping. A module
 * that was there a minute ago and is not now has a row saying so; a tab that
 * vanishes under the cursor of somebody about to press it is worse than one
 * that says the program is not running. A module that silently fails to appear
 * is indistinguishable from one that was never installed.
 *
 * This type is here because both a host and a client library will name these
 * states and should name them the same way. Which state a given module is in is
 * never computed here.
 */
export type ModuleCondition = 'ready' | 'incompatible' | 'silent';
export declare const MODULE_CONDITIONS: readonly ["ready", "incompatible", "silent"];
export {};
//# sourceMappingURL=manifest.d.ts.map