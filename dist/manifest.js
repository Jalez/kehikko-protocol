import { z } from 'zod';
import { LIMITS, MANIFEST_KIND, PROTOCOL } from './constants.js';
import { MODE_ID, MODULE_ID } from './ids.js';
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
const modeSchema = z.object({
    id: z.string().regex(MODE_ID, 'lowercase, digits and dashes only'),
    label: z.string().min(1).max(LIMITS.LABEL),
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
    scope: z.enum(['epic', 'global']).default('epic'),
});
/**
 * A URL as a manifest may write one.
 *
 * A string, and bounded, and nothing more. It is not checked for being a URL
 * here and it is deliberately not resolved: whether a module may point at a
 * given address is the host's question, and the answer depends on things this
 * package cannot see — which origin the manifest was fetched from, whether that
 * origin is on this machine, what the host is willing to frame. A module that
 * points its entry somewhere off its own origin is asking the host to frame
 * somebody else, and the refusal for that belongs where the origin is known.
 */
const url = z.string().min(1).max(LIMITS.URL);
/**
 * The context kinds a module can say it REACTS to.
 *
 * ## What this is, and the one thing it is not
 *
 * It is documentation a module writes about itself, for a person reading a
 * registry. Nothing else. A host must not gate, filter, withhold or route
 * anything on the strength of it: the context goes to every framed module on
 * the canvas, unchanged, whether or not the module said a word here. A module
 * that declares nothing keeps working exactly as it did, and a module that
 * declares everything gets nothing it did not already have — it is merely wrong
 * in a list, which is the whole of the penalty and should stay that way.
 *
 * The next person to read this will be tempted to make it mean something, and
 * the temptation has a shape: it looks like it would be cheap to skip the
 * broadcast to frames that did not declare an interest. Do not. `context.ts`
 * composes ONE context per canvas on purpose, a host that composed a different
 * one per container would be deciding what each module may know, and the module
 * that gets an empty `passage` because it forgot a word in its manifest fails
 * silently and unfixably from inside. The saving is a `postMessage`; the cost
 * is a permission nobody agreed to build.
 *
 * ## Why it is NOT beside `declares.uses`
 *
 * `declares.uses` is what a module intends to ASK THE HOST FOR. This is what a
 * module says it DOES WITH WHAT IT IS ALREADY GIVEN. Those two point in
 * opposite directions and would look identical as two arrays of short lowercase
 * words in the same object — which is exactly how, six months from now, a host
 * comes to check one of them the way it checks the other. Keeping this at the
 * top level, under a verb rather than under `declares`, is the cheapest
 * available defence against that confusion. See `CAPABILITIES` in `methods.ts`,
 * where every single entry is a request; there is deliberately no entry there
 * for reading a context, and there must not be.
 *
 * ## Why "reacts" and not "consumes"
 *
 * Every framed module RECEIVES the whole context, so "consumes" is true of all
 * of them and would be worth writing down by none of them. What is worth
 * writing down is that this module DOES SOMETHING when the field changes — it
 * narrows, it scrolls, it re-queries. A module author reading "consumes" ticks
 * every box, because every box is factually being handed to them; an author
 * reading "reacts to" has to think about whether their program actually moves.
 * A host is free to render the word as "Consumes" in a list where that reads
 * better to a person browsing; the word in the manifest is chosen for the
 * author writing it.
 *
 * ## Why these two and not more
 *
 * `passage` and `selection` are the context fields a module can genuinely
 * choose to ignore, and each has a matching capability — `passage:set`,
 * `selection:set` — on the other side, which is what lets a registry name both
 * ends of one relationship instead of one and a half.
 *
 * The obvious third, the open epic, is NOT here, and the reason is that it is
 * already declared: a mode with `scope: 'epic'` is a module saying it follows
 * the reader, and one with `scope: 'global'` is a module saying it does not. A
 * second field meaning the same thing is a second field that will disagree with
 * the first. `prompt` is out for the same reason — `declares.prompt` says it.
 * The rule for adding a word here is that no other field already says it.
 *
 * Free strings on the wire rather than an enum, for the reason `extensions` is
 * free: a module built against a host that broadcasts more than yours is not a
 * malformed module. A host that does not know a word shows it or drops it, and
 * either way frames the module.
 */
export const REACTS_TO = {
    passage: 'Does something when the reader points at a passage — a file, a place in it, and the words that were there.',
    selection: 'Does something when the references somebody picked out change.',
};
export const REACTION_NAMES = Object.keys(REACTS_TO);
export const manifestSchema = z.object({
    /**
     * The word that makes this a claim rather than a hopeful GET. Something else
     * entirely may be listening on the port a host asked, and it must not be
     * possible for that something to become a tab by accident.
     */
    kind: z.literal(MANIFEST_KIND),
    /** Which protocol this module was built against, as a single integer. */
    protocol: z.number().int().min(1),
    id: z.string().regex(MODULE_ID, 'lowercase reverse-DNS: letters, digits, dots and dashes'),
    name: z.string().min(1).max(LIMITS.NAME),
    /**
     * The module's own version, which this protocol never parses and never
     * compares. It is shown to a person, and that is the whole of its job — a
     * host that made a decision out of it would be making a decision out of a
     * string with no agreed grammar.
     */
    version: z.string().min(1).max(LIMITS.VERSION).default('0'),
    summary: z.string().max(LIMITS.SUMMARY).default(''),
    /**
     * What an agent should do about this module, given that it is here.
     *
     * ## Not the same thing as `summary`, and not the same thing as a prompt
     *
     * `summary` says what a module IS, and it is written for a person choosing
     * whether to put it on a canvas. This says what its PRESENCE IMPLIES, and it
     * is written for an agent that has just been told the module is there:
     * "every issue on this canvas has a checklist, and the work is not done until
     * its items are ticked" is guidance; "the checklist for a merge request" is a
     * summary. The two are often confused and produce very different sentences.
     *
     * It is also not `context.prompt`. That is written by a PERSON, on a canvas,
     * aimed at one pane, and changes as they change their mind. This is written
     * by the module's AUTHOR, ships with the module, and is the same on every
     * canvas the module is ever placed on. A host composes both — the standing
     * notes from what is present, then the instructions somebody wrote — and the
     * order matters, because context comes before orders.
     *
     * ## Why it is a claim and not an instruction
     *
     * A module writes this about itself, so it is a module's own account of what
     * it is for. A host relays it and must not dress it up as its own: an agent
     * reading composed guidance should be able to tell which module said what,
     * which is why a host that concatenates these attributes each one. The same
     * argument as `selection` carrying refs and not kinds — a host can vouch that
     * a module said something, never that it is true.
     *
     * Empty by default. A module with nothing to say to an agent says nothing,
     * which is better than a sentence written to fill the field.
     */
    guidance: z.string().max(LIMITS.GUIDANCE).default(''),
    /** The page a host would frame. Relative to the module's own origin. */
    entry: url,
    icon: z.string().max(LIMITS.URL).optional(),
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
    health: z.string().max(LIMITS.URL).optional(),
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
    mcp: z
        .object({
        url,
        transport: z.enum(['http', 'sse', 'stdio']).default('http'),
        /** What an agent would be connecting to, in one line, for the list. */
        about: z.string().max(LIMITS.SUMMARY).default(''),
    })
        .optional(),
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
    extensions: z
        .object({
        emits: z.array(z.string().min(1).max(LIMITS.EXTENSION)).max(LIMITS.EXTENSIONS).default([]),
        consumes: z.array(z.string().min(1).max(LIMITS.EXTENSION)).max(LIMITS.EXTENSIONS).default([]),
    })
        .default({ emits: [], consumes: [] }),
    /**
     * The parts of the context this module says it REACTS to. See `REACTS_TO`.
     *
     * ## Why this is not a third entry in `extensions`
     *
     * `extensions.consumes` already names things a module receives, so folding
     * `passage` in beside `roadmap.notifications@1` would have cost one field and
     * looked tidier. It would also have destroyed the only distinction a registry
     * has worth drawing. An extension is CARRIED: a host reads `emits` on one
     * manifest and `consumes` on another and posts the payload into the second
     * module's frame, so the host performed the delivery and may vouch for both
     * ends of it. A context is BROADCAST: it goes to everybody, and what a module
     * writes here is its own account of what it does with it, which the host
     * cannot check and must not pretend to.
     *
     * Two claims of different strength in one array become one claim of the
     * weaker strength, and the weaker one is the one a host would then be quoting
     * about its own event bus. Two fields, and a host that wants to show them
     * under one heading can join them where the joining is a rendering decision
     * rather than a loss of what it knew.
     *
     * ## What a module author should put here
     *
     * Only what the program actually moves for. You are SENT the whole context
     * regardless; ticking a word here buys you nothing and costs the next person
     * a list they cannot trust. Empty is the honest and common answer.
     */
    reacts: z.array(z.string().min(1).max(LIMITS.REACTION)).max(LIMITS.REACTIONS).default([]),
    modes: z.array(modeSchema).min(1).max(LIMITS.MODES),
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
    declares: z
        .object({
        /**
         * The protocol range this module can speak, e.g. `>=1 <2`. See `speaks`.
         */
        protocol: z.string().max(LIMITS.RANGE).default(`>=${PROTOCOL}`),
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
        uses: z.array(z.string().min(1).max(LIMITS.CAPABILITY)).max(LIMITS.CAPABILITIES).default([]),
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
        storage: z.boolean().default(false),
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
        prompt: z.boolean().default(false),
    })
        .default({ protocol: `>=${PROTOCOL}`, uses: [], storage: false, prompt: false }),
});
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
export function speaks(range, protocol = PROTOCOL) {
    const parts = range.trim().split(/\s+/).filter(Boolean);
    if (!parts.length)
        return false;
    for (const part of parts) {
        const m = /^(>=|<=|>|<|=)?(\d+)$/.exec(part);
        if (!m)
            return false;
        const n = Number(m[2]);
        switch (m[1]) {
            case '>=':
                if (!(protocol >= n))
                    return false;
                break;
            case '<=':
                if (!(protocol <= n))
                    return false;
                break;
            case '>':
                if (!(protocol > n))
                    return false;
                break;
            case '<':
                if (!(protocol < n))
                    return false;
                break;
            default:
                if (protocol !== n)
                    return false;
        }
    }
    return true;
}
export const MODULE_CONDITIONS = ['ready', 'incompatible', 'silent'];
//# sourceMappingURL=manifest.js.map