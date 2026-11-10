import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { forAgentsOf, FOR_AGENTS } from '../agent-changes.js';
import { listTools } from '../serve/neighbours.js';
/**
 * 2.70.0. `kehikot-check-notes`: a release that changes what an agent is offered says so to agents.
 * When the names, descriptions or input schemas of a module's MCP door changed since its last tag,
 * `notes/<version>.md` must have a "For agents" line (`forAgentsOf`), which a host hands to a session
 * that started before the update. Node-only. Design notes: docs/asking.md, "What changed since a
 * session was told".
 *
 * A tag's tools are read from the snapshot committed with it, `TOOLS_SNAPSHOT`: the door's tools as
 * `--door <url>` (a running door) or `--tools <file>` (a list the module's own script wrote) gave
 * them, written by `--write`. With neither, the snapshot in the working tree is the door now.
 */
/** Where a module keeps its door's tools, beside its release notes. */
export const TOOLS_SNAPSHOT = 'notes/tools.json';
/** JSON with every object's keys in order: two schemas that say the same thing are the same text. Pure. */
function steady(value) {
    if (Array.isArray(value))
        return `[${value.map(steady).join(',')}]`;
    if (typeof value === 'object' && value !== null) {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${steady(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value ?? null);
}
/** The tools in a list (a `tools/list` answer's `tools`, or a snapshot), by name; null for anything else. Pure. */
export function snapshotOf(value) {
    const list = Array.isArray(value) ? value : value?.tools;
    if (!Array.isArray(list))
        return null;
    return list
        .filter((one) => typeof one === 'object' && one !== null && typeof one.name === 'string')
        .map((one) => ({ name: one.name, description: typeof one.description === 'string' ? one.description : null, inputSchema: one.inputSchema ?? null }))
        .sort((a, b) => a.name.localeCompare(b.name));
}
/** What changed between two tool lists, one line each, by name. Pure. */
export function toolChanges(before, after) {
    const was = new Map(before.map((tool) => [tool.name, tool]));
    const now = new Map(after.map((tool) => [tool.name, tool]));
    const changes = [];
    for (const tool of after) {
        const old = was.get(tool.name);
        if (!old)
            changes.push(`${tool.name} is new`);
        else {
            if (old.description !== tool.description)
                changes.push(`${tool.name}'s description changed`);
            if (steady(old.inputSchema) !== steady(tool.inputSchema))
                changes.push(`${tool.name}'s input schema changed`);
        }
    }
    for (const tool of before)
        if (!now.has(tool.name))
            changes.push(`${tool.name} is gone`);
    return changes;
}
/**
 * The rule, over what was read. Pure. `before` null: the tag has no snapshot (or there is no tag),
 * so there is nothing to compare with and nothing fails.
 */
export function checkNotes(input) {
    const { version, tag, before, after, notes } = input;
    if (after === null)
        return { failures: [`There is no ${TOOLS_SNAPSHOT} and no door was asked: run with --door <url> --write, and commit it.`], notes: [], changes: [] };
    if (tag === null)
        return { failures: [], notes: ['No release tag yet: nothing to compare the door with.'], changes: [] };
    if (before === null)
        return { failures: [], notes: [`${tag} has no ${TOOLS_SNAPSHOT}: nothing to compare the door with. The next release will be compared with this one.`], changes: [] };
    const changes = toolChanges(before, after);
    if (!changes.length)
        return { failures: [], notes: [`The door's tools are as they were at ${tag}.`], changes };
    const said = changes.join('; ');
    if (version === null)
        return { failures: [`The door's tools changed since ${tag} (${said}), and there is no package.json version to find the notes by.`], notes: [], changes };
    if (tag.replace(/^v/, '') === version) {
        return { failures: [`The door's tools changed since ${tag} (${said}), and the version is still ${version}. Bump it, and say what changed in notes/<version>.md under "${FOR_AGENTS}".`], notes: [], changes };
    }
    if (notes === null)
        return { failures: [`The door's tools changed since ${tag} (${said}), and there is no notes/${version}.md. Write it, with a "${FOR_AGENTS}" line.`], notes: [], changes };
    if (!forAgentsOf(notes).length) {
        return { failures: [`The door's tools changed since ${tag} (${said}), and notes/${version}.md has no "${FOR_AGENTS}" line. Add one: a session that started before the update is told it.`], notes: [], changes };
    }
    return { failures: [], notes: [`The door's tools changed since ${tag}, and notes/${version}.md says so to agents.`], changes };
}
const git = (dir, args) => {
    try {
        return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    }
    catch {
        return null;
    }
};
/** The newest release tag reachable from HEAD's parent line, or null. */
export function lastTag(dir) {
    return git(dir, ['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*']) || git(dir, ['describe', '--tags', '--abbrev=0']) || null;
}
/** Read everything and check it. */
export async function checkModuleNotes(dir, options = {}) {
    const root = resolve(dir);
    const snapshotPath = join(root, TOOLS_SNAPSHOT);
    const inTree = existsSync(snapshotPath) ? snapshotOf(JSON.parse(readFileSync(snapshotPath, 'utf8'))) : null;
    const failures = [];
    const notes = [];
    let after = inTree;
    if (options.door || options.tools) {
        const asked = options.door ? await listTools(options.door) : snapshotOf(JSON.parse(readFileSync(resolve(root, options.tools), 'utf8')));
        const read = asked === null ? null : snapshotOf(asked);
        if (read === null)
            return { failures: [`${options.door ? `The door at ${options.door}` : options.tools} gave no list of tools.`], notes: [], changes: [] };
        after = read;
        const text = `${JSON.stringify(read, null, 2)}\n`;
        if (options.write) {
            mkdirSync(dirname(snapshotPath), { recursive: true });
            writeFileSync(snapshotPath, text);
            notes.push(`Wrote ${TOOLS_SNAPSHOT}; commit it with the release.`);
        }
        else if (inTree === null || toolChanges(inTree, read).length) {
            failures.push(`${TOOLS_SNAPSHOT} is not what the door lists now: run with --write, and commit it, so the next release is compared with this one.`);
        }
    }
    const tag = options.tag ?? lastTag(root);
    const atTag = tag ? git(root, ['show', `${tag}:${TOOLS_SNAPSHOT}`]) : null;
    let before = null;
    try {
        before = atTag ? snapshotOf(JSON.parse(atTag)) : null;
    }
    catch {
        before = null;
    }
    let version = null;
    try {
        const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
        version = typeof pkg.version === 'string' ? pkg.version : null;
    }
    catch {
        version = null;
    }
    const notesPath = version ? join(root, 'notes', `${version}.md`) : null;
    const said = notesPath && existsSync(notesPath) ? readFileSync(notesPath, 'utf8') : null;
    const check = checkNotes({ version, tag, before, after, notes: said });
    return { failures: [...failures, ...check.failures], notes: [...notes, ...check.notes], changes: check.changes };
}
/** What the check prints. */
export function saidNotes(check) {
    const lines = ['notes for agents:'];
    for (const failure of check.failures)
        lines.push(`  FAIL: ${failure}`);
    for (const note of check.notes)
        lines.push(`  note: ${note}`);
    return lines.join('\n');
}
