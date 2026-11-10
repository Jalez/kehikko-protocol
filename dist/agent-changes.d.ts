import { type AgentChange } from './notes.js';
/**
 * 2.62.0. What a release changed for AGENTS, written where its people's notes are: an optional
 * "For agents" section in `notes/<version>.md` — one or two plain lines on new tools, changed rules,
 * new guards — that a host reads from the copy it runs and hands to agent modules beside the module
 * (`SessionModule.changes`), so a session that started before an update is told once, at its next
 * prompt, what changed for it (`changedSince` in `notes.ts`). Design notes: docs/asking.md, "What
 * changed since a session was told".
 *
 * Either spelling starts the section:
 *
 *     ## For agents                     For agents:
 *     - `queue_wait` waits for a run…   - `queue_wait` waits for a run…
 *
 * A heading runs to the next heading, or to a paragraph after its list (a release body's "Works
 * with…" line); a `For agents:` line (bold or not, with text after the colon or not) runs to the next
 * blank line or heading. Each bullet is one line; a line indented under a
 * bullet continues it. What people read is the notes without it (`withoutForAgents`).
 */
/** The words that name the section. */
export declare const FOR_AGENTS = "For agents";
/** The lines of a notes file's "For agents" section, each one plain line; empty when it has none. */
export declare function forAgentsOf(markdown: unknown): string[];
/** The notes as people read them: without the "For agents" section, or comments; the rest as it was. */
export declare function withoutForAgents(markdown: string): string;
/** A notes file's version from its name: `notes/1.4.0.md` → `1.4.0`; null for any other name. */
export declare function notesVersion(file: string): string | null;
/**
 * What a host hands beside a module: the releases up to `current` (all, when null) whose notes say
 * something to agents, newest first, at most `AGENT_CHANGES_MOST.releases`. `notes` is each notes
 * file's name (or version) and text, as read from the copy that runs.
 */
export declare function agentChangesFrom(notes: readonly {
    file: string;
    text: string;
}[], current?: string | null): AgentChange[];
