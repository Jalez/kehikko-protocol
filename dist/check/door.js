import { resolve } from 'node:path';
import { DOOR_ARGUMENTS_BEFORE, toolEffect } from '../door.js';
import { manifestSchema } from '../manifest.js';
import { listTools, readNeighbour } from '../serve/neighbours.js';
import { manifestOf, sourcesOf } from './parts.js';
/** The check over the files alone. Pure. Fails nothing: text can only hint at what a door lists. */
export function checkDoorSources(manifest, sources) {
    if (!manifest.mcp)
        return { module: manifest.id, read: 'none', failures: [], notes: [] };
    const notes = [];
    const doors = sources.filter((source) => source.text.includes('inputSchema'));
    if (!sources.some((source) => source.text.includes('readOnlyHint'))) {
        notes.push(`${manifest.id} has an MCP door, and no source file mentions readOnlyHint: its tools state nothing about whether `
            + 'they only read, so a caller has to ask a person before running any of them. Give each tool `annotations` '
            + '(`readOnlyHint: true` for one that shows or reads; `destructiveHint: false` for a write that deletes nothing). '
            + 'A hint, not a verdict: run this with --running against the started module for the list.');
    }
    for (const old of DOOR_ARGUMENTS_BEFORE.project) {
        const where = doors.filter((source) => new RegExp(`\\b${old}\\s*:\\s*\\{`).test(source.text)).map((source) => source.path);
        if (where.length) {
            notes.push(`${where.join(', ')}: a tool seems to take \`${old}\`. The context arguments are spelled \`project\` and \`epic\`; `
                + `advertise \`project\`, and keep reading \`${old}\` with doorContext() until callers have moved.`);
        }
    }
    return { module: manifest.id, read: 'files', failures: [], notes };
}
/** The check over what a running door lists. Pure. */
export function checkDoor(manifest, tools) {
    if (!manifest.mcp)
        return { module: manifest.id, read: 'none', failures: [], notes: [] };
    const failures = [];
    const notes = [];
    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    const properties = (schema) => Object.keys(schema?.properties ?? {});
    for (const subject of manifest.mcp.subjects) {
        for (const role of ['show', 'release', 'done']) {
            const name = subject[role];
            if (name === undefined)
                continue;
            const tool = byName.get(name);
            if (!tool) {
                failures.push(`The manifest says ${name} is the tool that ${ROLE[role]} a ${subject.kind}, and the door lists no tool by that name.`);
                continue;
            }
            if (toolEffect(tool) !== 'reads') {
                failures.push(`${name} ${ROLE[role]} a ${subject.kind}, so it saves nothing — and it does not say so. Give it `
                    + '`annotations: { readOnlyHint: true }`.');
            }
            const answer = role === 'show' ? ['outcome', 'pages'] : role === 'done' ? ['done', 'items'] : [];
            const missing = answer.filter((field) => !properties(tool.outputSchema).includes(field));
            if (missing.length) {
                failures.push(`${name} ${ROLE[role]} a ${subject.kind}, and its outputSchema has no ${missing.join(' or ')}. Answer with `
                    + `${role === 'show' ? 'SHOW_OUTPUT_SCHEMA' : 'DONE_OUTPUT_SCHEMA'} in structuredContent, so a caller reads a state and not a sentence.`);
            }
        }
    }
    const unstated = tools.filter((tool) => toolEffect(tool) === 'unstated').map((tool) => tool.name);
    if (unstated.length) {
        notes.push(`${unstated.length} of ${tools.length} tools state nothing about whether they only read: ${unstated.join(', ')}. `
            + 'A caller has to treat each as one that may delete.');
    }
    for (const old of DOOR_ARGUMENTS_BEFORE.project) {
        const taking = tools.filter((tool) => properties(tool.inputSchema).includes(old)).map((tool) => tool.name);
        if (taking.length) {
            notes.push(`${taking.join(', ')} take${taking.length === 1 ? 's' : ''} \`${old}\`. The context argument is spelled \`project\`; see doorContext().`);
        }
    }
    return { module: manifest.id, read: 'running', failures, notes };
}
const ROLE = { show: 'shows', release: 'lets go of', done: 'answers for' };
/** One module directory, read and checked; with `running`, its started door is asked as well. */
export async function checkModuleDoor(dir, options = {}) {
    const at = resolve(dir);
    const failed = (why) => ({ module: at, read: 'none', failures: [why], notes: [] });
    let exported;
    try {
        exported = await manifestOf(at);
    }
    catch (error) {
        return failed(`${at}: its manifest could not be loaded (${error instanceof Error ? error.message : String(error)}).`);
    }
    if (!exported)
        return failed(`${at}: no manifest.ts exporting a module manifest was found.`);
    const parsed = manifestSchema.safeParse(exported);
    if (!parsed.success) {
        return failed(`${at}: its manifest does not parse (${parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}).`);
    }
    const manifest = parsed.data;
    const files = checkDoorSources(manifest, sourcesOf(at));
    if (!options.running || !manifest.mcp)
        return files;
    const neighbour = await readNeighbour(manifest.id, options);
    if (!neighbour.found)
        return { ...files, failures: [`--running: ${neighbour.sentence} Start the module and run this again.`] };
    if (!neighbour.door)
        return { ...files, failures: [`--running: ${manifest.id} declares no MCP door this can ask over HTTP on its own origin.`] };
    const tools = await listTools(neighbour.door, options);
    if (!tools)
        return { ...files, failures: [`--running: ${neighbour.door} did not answer tools/list with a list of tools.`] };
    /* The running module's own manifest, not the file's: it is the door that is being held to it. */
    return checkDoor(neighbour.manifest, tools);
}
/** What the command prints for one module. */
export function saidDoor(check) {
    const head = check.failures.length > 0
        ? `FAIL  ${check.module}`
        : check.read === 'none'
            ? `ok    ${check.module} — no MCP door`
            : check.read === 'running'
                ? `ok    ${check.module} — its running door was asked`
                : `ok    ${check.module} — read from its files; --running asks the door itself`;
    return [head, ...check.failures.map((failure) => `      ! ${failure}`), ...check.notes.map((note) => `      note: ${note}`)].join('\n');
}
