import { z } from 'zod';
import { LIMITS } from './limits.js';
import { absentModuleSchema, sessionModuleSchema } from './notes.js';
import { EPIC_SLUG, KEHIKKO_KEY, MODULE_ID, PROJECT_ID, own } from './ids.js';
import { skillNameSchema } from './skills.js';
/**
 * What a module's MCP door agrees with every other module's: how its tools spell the two context
 * arguments, how a tool says whether it only reads, and the shape of the two answers a caller acts
 * on without reading prose — "was it shown?" and "is it done?". Shapes and pure functions; the
 * door itself, and whoever calls it, are elsewhere. Which tool is which is the manifest's
 * `mcp.subjects`. Design notes: docs/asking.md.
 */
/**
 * The two context arguments, in their one spelling. `project` is the ABSOLUTE DIRECTORY of the
 * project (what `context.projectPath` carries, not the name in `context.project`); `epic` is the
 * epic's slug (`context.epic`). A caller fills them from the context it stands in.
 */
export const DOOR_ARGUMENTS = { project: 'project', epic: 'epic' };
/**
 * The spelling some doors used for the project before there was one. Read by `doorContext`, never
 * advertised in an `inputSchema`. Goes when the next breaking release does.
 */
export const DOOR_ARGUMENTS_BEFORE = { project: ['projectPath'], epic: [] };
const said = (value) => (typeof value === 'string' && value.trim() ? value : null);
/**
 * The context a tool call names: `project` and `epic` in the one spelling, or under a name the
 * door took before (`before`, by default `DOOR_ARGUMENTS_BEFORE`). The current spelling wins.
 * `deprecated` lists the old names this call used, so a door can say so in its answer. Pure.
 */
export function doorContext(args, before = DOOR_ARGUMENTS_BEFORE) {
    const deprecated = [];
    const read = (name) => {
        const now = said(own(args, name));
        if (now !== null)
            return now;
        for (const old of before[name] ?? []) {
            const was = said(own(args, old));
            if (was === null)
                continue;
            deprecated.push(old);
            return was;
        }
        return null;
    };
    return { project: read('project'), epic: read('epic'), deprecated };
}
/* ------------------------------------------------------------------------ *
 * Which project is this? (2.3.0)
 * ------------------------------------------------------------------------ */
/**
 * The sentences a door says about the `project` it was handed, in one wording for every module
 * (2.3.0). `resolveDoorProject` in `/serve` says them; they are here, pure, so a door that asks its
 * own way says the same. A door works on the path it was GIVEN BACK, never on the argument.
 *
 * - `moved(to)`: the folder was a project and the project is now elsewhere, and the door would not
 *   follow it (the new path did not answer as the same project).
 * - `notProject(path)`: the host does not hold the folder (or no host answered).
 * - `unnamed`: the call named no project.
 * - `followed(from, to)`: the line a door ADDS to an answer after it followed a move, so the agent
 *   uses the new path from then on.
 */
export const DOOR_PROJECT_SAYS = {
    moved: (to) => `That folder was moved to ${to}; use that path.`,
    notProject: (path) => `${path} is not a project open in Kehikot.`,
    unnamed: 'Name the project: `project` is its absolute folder.',
    followed: (from, to) => `The project at ${from} has moved to ${to}; this answer is about ${to}. Use that path from now on.`,
};
/* ------------------------------------------------------------------------ *
 * Whose place is this conversation? (2.4.0)
 * ------------------------------------------------------------------------ */
/**
 * The query parameter a session's place token travels in, on the URL of every Kehikot MCP door
 * the session is configured with: `http://127.0.0.1:4590/mcp?kehikot-place=<token>` (2.4.0).
 *
 * A token is a POINTER, not a credential: it names one conversation's record (project, epic, parts, kehikko)
 * the issuing module keeps, and grants nothing a call without it could not already do by naming the
 * same place in its arguments. It is unguessable so that two sessions never share one by accident.
 * A query parameter rather than a header because a door's `answer` is handed the query
 * (`DoorsOptions.answer`) and every MCP client's config takes a URL.
 */
export const PLACE_PARAM = 'kehikot-place';
/** A place token's spelling: 22 to 64 URL-safe characters (the issuing module mints 32 random bytes, base64url). */
export const PLACE_TOKEN = /^[A-Za-z0-9_-]{22,64}$/;
const placeKehikko = z.object({ key: z.string().regex(KEHIKKO_KEY), name: z.string().max(LIMITS.SUMMARY).optional().catch(undefined) });
/** Where a person is looking now, as the host sends it beside a place: the same three fields, or null when no page is open. */
export const lookingSchema = z.object({
    projectId: z.string().regex(PROJECT_ID).nullable().catch(null),
    project: z.string().min(1).max(4096).nullable().catch(null),
    epic: z.string().regex(EPIC_SLUG).nullable(),
    parts: z.array(z.string().regex(EPIC_SLUG)).max(LIMITS.PARTS).catch([]),
    kehikko: placeKehikko.nullable().catch(null),
});
/**
 * One session's place, as the host answers `GET /host/place?kehikot-place=<token>` (2.4.0).
 * `project` is the folder the project is at NOW (a renamed folder is followed: the token keeps the
 * project's id). `epic` is null for a place with no epic; `parts` empty is the whole epic.
 * `looking` is what the person has on screen now, when a page of the host is open.
 */
export const doorPlaceSchema = z.object({
    token: z.string().regex(PLACE_TOKEN),
    /** The conversation the record is about (Claude Code's session id), when the record names one. */
    conversation: z.string().min(1).max(128).optional().catch(undefined),
    projectId: z.string().regex(PROJECT_ID),
    project: z.string().min(1).max(4096),
    projectName: z.string().max(LIMITS.SUMMARY).optional().catch(undefined),
    epic: z.string().regex(EPIC_SLUG).nullable(),
    parts: z.array(z.string().regex(EPIC_SLUG)).max(LIMITS.PARTS),
    kehikko: placeKehikko.nullable(),
    looking: lookingSchema.nullable().optional().catch(null),
});
/** The host's answer at `/host/place`: the place, or `null` for a token it does not hold. */
export const placeResult = z.object({
    ok: z.literal(true),
    place: doorPlaceSchema.nullable(),
    /** With no place for a token the host knows: why (its module has no record, or did not answer). */
    why: z.string().max(LIMITS.REASON).optional().catch(undefined),
});
/**
 * A conversation's place is what a RECORD says (2.4.0), kept by the one that owns it: the module that
 * started the conversation keeps its own records (Claude's: which conversation belongs to which
 * place) and issues the token; the host keeps only which module issued a token, in which project.
 *
 * `POST /host/place` with this body: a module says it issued `token` for a conversation in `project`
 * (`projectId` preferred), started on `kehikko` (its key, or null). Programs on this machine only.
 */
export const placeIssueSchema = z.object({
    module: z.string().regex(MODULE_ID),
    token: z.string().regex(PLACE_TOKEN),
    project: z.string().min(1).max(4096),
    projectId: z.string().regex(PROJECT_ID).nullable().optional(),
    kehikko: z.string().regex(KEHIKKO_KEY).nullable(),
});
/**
 * The host's answer to an issue: every Kehikot MCP door the session should be given, each with the
 * token already on its URL — the host's own and those of the modules on that kehikko. `name` is the
 * server name the person's agent config already uses for that door when it has one (a per-session
 * config then replaces theirs by name), else the name the host would register it under.
 */
/**
 * One skill a host keeps installed for every conversation (2.23.0): which module offers it (the host's
 * own id for the host's own skills), its name and version as that module declares it, and the origin
 * its text is served at (`skillPath(name)` there). Never a kehikko-bound skill (one with `needs`),
 * and never the skills of another module that runs agent sessions: those are written for that
 * module's own agent.
 */
export const everywhereSkillSchema = z.object({
    module: z.string().min(1).max(128),
    name: skillNameSchema,
    version: z.string().min(1).max(LIMITS.SKILL_VERSION),
    origin: z.string().url().max(2048),
});
export const placeDoorsSchema = z.object({
    ok: z.literal(true),
    token: z.string().regex(PLACE_TOKEN),
    doors: z
        .array(z.object({ module: z.string().min(1).max(128), name: z.string().min(1).max(128), url: z.string().url().max(2048), transport: z.enum(['http', 'sse']).catch('http') }))
        .max(128),
    /**
     * The skills this host keeps installed in the person's agent for every conversation, as its
     * settings say (2.23.0), for a module that installs skills itself (`installsSkills`) to keep the
     * same ones where its own agent reads them. Absent from a host before 2.23.0, and for a module
     * that does not install skills: then nothing is said about them, and a module changes nothing it
     * keeps for every conversation. Present and empty: the host keeps none. One that does not parse
     * is dropped, not fatal.
     */
    everywhere: z.array(everywhereSkillSchema).max(LIMITS.EVERYWHERE_SKILLS).optional().catch(undefined),
    /**
     * The containers on the session's kehikko (2.36.0 gave it a shape; hosts sent it before), in the
     * order the canvas is read, each with its door's name in the session's config, its one line, what
     * it says to agents (`says`, its `agentSays`) and the skills it offers there. What the session is
     * told (`sessionNotes`). Absent: the host did not say; empty: nothing else is on the kehikko.
     */
    modules: z.array(sessionModuleSchema).max(LIMITS.SESSION_MODULES).optional().catch(undefined),
    /**
     * The modules installed on this computer that are NOT on the session's kehikko and say something
     * to sessions there (`absentSays`, 2.36.0), each with that line. Only modules on the host's
     * official list. Absent: the host did not say (before 2.36.0, or the place has no kehikko).
     */
    absent: z.array(absentModuleSchema).max(LIMITS.ABSENT_MODULES).optional().catch(undefined),
});
/**
 * Where a module that issues tokens answers for one, asked by the host:
 * `GET <module origin>/api/kehikot/place?kehikot-place=<token>&project=<folder>` → `recordedPlaceResult`.
 * The place as the module's record says it NOW — a conversation moved to another place, or carried on
 * under a new id, is answered right — or `null` for a token it did not issue.
 */
export const RECORDED_PLACE_PATH = '/api/kehikot/place';
export const recordedPlaceResult = z.object({
    ok: z.literal(true),
    place: z
        .object({
        conversation: z.string().min(1).max(128),
        epic: z.string().regex(EPIC_SLUG).nullable(),
        parts: z.array(z.string().regex(EPIC_SLUG)).max(LIMITS.PARTS),
        kehikko: z.string().regex(KEHIKKO_KEY).nullable(),
    })
        .nullable(),
});
/**
 * THE RULE (2.4.0): what a call is about. An argument the agent passed wins; otherwise the
 * session's place (when the call carried a token the host knows); otherwise nothing — and a door
 * that refused a call without `project` before still refuses it. Pure. `from` is what the door
 * SAYS in its answer (`DOOR_PLACE_SAYS.used`), every time it took anything from the session.
 * An `epic` argument naming another epic than the session's is honoured (the agent asked for it);
 * the parts then are the agent's, or none.
 */
export function placeDefaults(args, place) {
    const named = doorContext(args);
    const said = named.project !== null || named.epic !== null;
    /* No place, or the agent named another project: the arguments are the whole answer. */
    if (!place || (named.project !== null && named.project !== place.project)) {
        return { project: named.project, epic: named.epic, parts: [], from: said ? 'arguments' : 'none' };
    }
    const epic = named.epic ?? place.epic;
    const took = named.project === null || named.epic === null;
    return { project: place.project, epic, parts: epic === place.epic ? [...place.parts] : [], from: took ? 'session' : 'arguments' };
}
const namedPlace = (p) => `${p.epic ? `epic ${p.epic}` : 'no epic'}${p.parts.length ? ` (parts ${p.parts.join(', ')})` : ''}${p.kehikko ? ` on kehikko ${p.kehikko.name ? `"${p.kehikko.name}"` : p.kehikko.key}` : ''}`;
/**
 * The sentences a door says about a session's place, in one wording for every module (2.4.0).
 *
 * - `belongs(place)`: "This conversation belongs to <project>, epic E (parts …) on kehikko K."
 * - `looking(place)`: whether the person is looking at the same thing, and what they are on if not;
 *   `''` when the host sent no `looking`.
 * - `used(from, place)`: the line a door adds when it took the project or epic from the session.
 * - `unplaced`: what a door says when it was asked for the session's place and has none.
 * - `fellBack`: what a door adds when it answered from the person's current view because there is no record.
 */
export const DOOR_PLACE_SAYS = {
    belongs: (place) => `This conversation belongs to ${place.projectName ?? place.project} (${place.project}), ${namedPlace(place)}.`,
    looking: (place) => {
        const now = place.looking;
        if (now === undefined)
            return '';
        if (now === null)
            return 'No page of Kehikot is open, so the person is not looking at anything there now.';
        const same = now.projectId === place.projectId && now.epic === place.epic && now.kehikko?.key === place.kehikko?.key;
        const sameParts = same && [...now.parts].sort().join('+') === [...place.parts].sort().join('+');
        if (sameParts)
            return 'The person is looking at this place now.';
        const where = `${now.projectId !== place.projectId && now.project ? `${now.project}, ` : ''}${namedPlace(now)}`;
        return `The person is looking at something else now (${where}); this conversation's place has not changed.`;
    },
    used: (from, place) => from === 'session' && place ? `Taken from this conversation's place: ${place.project}, ${namedPlace(place)}.` : '',
    unplaced: 'This conversation isn’t recorded under any place. Name the project (and epic) in the call, or ask the person which epic it is for.',
    /** The line a door adds whenever it answered from the person's current view for want of a record: never silently. */
    fellBack: 'This conversation is not recorded under any place, so this answer is about what the person has open NOW — not this conversation’s place.',
};
/* ------------------------------------------------------------------------ *
 * Was it shown?
 * ------------------------------------------------------------------------ */
/**
 * What became of being asked to show something. `shown`: at least one open page is showing it.
 * `unseen`: no page is open to see it, or none is known to be showing it (a hidden window, a page
 * that did not say). `declined`: the open pages would not move — a talk is being given, a page holds
 * unsaved text without it. A subject that does not exist
 * is not an outcome: the tool refuses (`isError`) and names what does.
 */
export const SHOW_OUTCOMES = ['shown', 'unseen', 'declined'];
/**
 * A `show` tool's `structuredContent`. `pages` is how many open pages are showing it as far as the
 * module can tell — the pages that said so, for a module whose pages report back; the pages it was
 * sent to, for one whose pages do not. Never how many people saw it. Other fields pass through. Showing saves nothing: the person can turn
 * the page away, and the answer is the same whether or not they do.
 */
export const showAnswerSchema = z
    .object({
    outcome: z.enum(SHOW_OUTCOMES),
    pages: z.number().int().min(0).default(0),
    why: z.string().max(LIMITS.REASON).default(''),
})
    .passthrough();
/** `showAnswerSchema` as the JSON Schema a tool lists under `outputSchema`. */
export const SHOW_OUTPUT_SCHEMA = {
    type: 'object',
    properties: {
        outcome: { type: 'string', enum: [...SHOW_OUTCOMES], description: 'shown: at least one open page is showing it. unseen: no page is open, or none is known to be showing it. declined: the open pages would not move.' },
        pages: { type: 'integer', minimum: 0, description: 'How many open pages are showing it, as far as the module can tell. Not how many people saw it.' },
        why: { type: 'string', maxLength: LIMITS.REASON },
    },
    required: ['outcome', 'pages'],
};
/* ------------------------------------------------------------------------ *
 * Is it done?
 * ------------------------------------------------------------------------ */
/**
 * Where one thing stands. `done`: a person did it. `waiting`: it can be done and has not been.
 * `unavailable`: it exists and cannot be done as things are, so waiting will not help. `unknown`:
 * nothing has that id — which is not `waiting`.
 */
export const DONE_STATES = ['done', 'waiting', 'unavailable', 'unknown'];
export const doneItemSchema = z.object({ id: z.string().min(1).max(LIMITS.SUBJECT_ID), state: z.enum(DONE_STATES) }).passthrough();
/**
 * A `done` tool's `structuredContent`: one record per thing asked about, and `done`, which is true
 * only when there is at least one and every one is `done`. A caller waits on `done` and gives up
 * on `unavailable` or `unknown`. A module's own facts (a verdict, a time) pass through on each item.
 */
export const doneAnswerSchema = z
    .object({
    done: z.boolean(),
    items: z.array(doneItemSchema).max(LIMITS.DONE_ITEMS),
})
    .passthrough();
/** The answer for these items, with `done` worked out by the one rule. Pure. */
export function doneAnswer(items) {
    return { done: items.length > 0 && items.every((item) => item.state === 'done'), items: [...items] };
}
/** `doneAnswerSchema` as the JSON Schema a tool lists under `outputSchema`. */
export const DONE_OUTPUT_SCHEMA = {
    type: 'object',
    properties: {
        done: { type: 'boolean', description: 'True only when at least one thing was asked about and every one is done.' },
        items: {
            type: 'array',
            maxItems: LIMITS.DONE_ITEMS,
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', maxLength: LIMITS.SUBJECT_ID },
                    state: { type: 'string', enum: [...DONE_STATES], description: 'unavailable: it cannot be done as things are. unknown: nothing has that id.' },
                },
                required: ['id', 'state'],
            },
        },
    },
    required: ['done', 'items'],
};
/* ------------------------------------------------------------------------ *
 * Does this tool only read?
 * ------------------------------------------------------------------------ */
/**
 * One tool as a door lists it (`tools/list`): the fields this protocol reads, with everything else
 * passed through. `annotations` is MCP's own: `readOnlyHint` and `destructiveHint`.
 */
export const doorToolSchema = z
    .object({
    name: z.string().min(1).max(LIMITS.TOOL),
    inputSchema: z.object({ properties: z.record(z.string(), z.unknown()).optional() }).passthrough().optional(),
    outputSchema: z.object({ properties: z.record(z.string(), z.unknown()).optional() }).passthrough().optional(),
    annotations: z
        .object({ readOnlyHint: z.boolean().optional(), destructiveHint: z.boolean().optional() })
        .passthrough()
        .optional(),
})
    .passthrough();
/**
 * What a tool says it does, read off its annotations. `reads`: `readOnlyHint: true` — it shows or
 * reads and changes nothing a person kept. `writes`: it changes something and says it destroys
 * nothing (`destructiveHint: false`). `destroys`: it may delete or overwrite, which is also MCP's
 * reading of a tool that says it writes and no more. `unstated`: it says nothing, and a careful
 * caller treats that as `destroys`. The tool's own claim; nothing checks it.
 */
export const TOOL_EFFECTS = ['reads', 'writes', 'destroys', 'unstated'];
export function toolEffect(tool) {
    const stated = tool.annotations;
    if (!stated || typeof stated.readOnlyHint !== 'boolean')
        return 'unstated';
    if (stated.readOnlyHint)
        return 'reads';
    return stated.destructiveHint === false ? 'writes' : 'destroys';
}
