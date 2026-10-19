import { z } from 'zod';
import { LIMITS } from './limits.js';
import { own } from './ids.js';
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
