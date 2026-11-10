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
export declare const TOOLS_SNAPSHOT = "notes/tools.json";
/** What of a tool a release changes for an agent. */
export interface SnapshotTool {
    name: string;
    description: string | null;
    inputSchema: unknown;
}
export interface NotesCheck {
    failures: string[];
    notes: string[];
    /** What changed in the door since the tag, one line each. */
    changes: string[];
}
/** The tools in a list (a `tools/list` answer's `tools`, or a snapshot), by name; null for anything else. Pure. */
export declare function snapshotOf(value: unknown): SnapshotTool[] | null;
/** What changed between two tool lists, one line each, by name. Pure. */
export declare function toolChanges(before: readonly SnapshotTool[], after: readonly SnapshotTool[]): string[];
/**
 * The rule, over what was read. Pure. `before` null: the tag has no snapshot (or there is no tag),
 * so there is nothing to compare with and nothing fails.
 */
export declare function checkNotes(input: {
    version: string | null;
    tag: string | null;
    before: readonly SnapshotTool[] | null;
    after: readonly SnapshotTool[] | null;
    notes: string | null;
}): NotesCheck;
/** The newest release tag reachable from HEAD's parent line, or null. */
export declare function lastTag(dir: string): string | null;
/** Read everything and check it. */
export declare function checkModuleNotes(dir: string, options?: {
    door?: string;
    tools?: string;
    write?: boolean;
    tag?: string;
}): Promise<NotesCheck>;
/** What the check prints. */
export declare function saidNotes(check: NotesCheck): string;
