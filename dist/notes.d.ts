import { z } from 'zod';
/**
 * 2.36.0. What an agent session is told about the modules around it, in ONE wording for every module
 * that runs agent sessions, so a Claude conversation and a Codex one on the same kehikko are told
 * exactly the same thing. Pure: the module that runs the session asks the host (`POST /host/place`,
 * `placeDoorsSchema`), keeps what it last told (`NotesTold`), and delivers the text by its own means
 * (Claude Code's and Codex's `SessionStart` / `UserPromptSubmit` hooks). Design notes:
 * docs/asking.md, "What a session is told".
 *
 * Two lines a module writes for agents, both top-level manifest fields like `shows` (a host before
 * 2.36.0 ignores them and runs the module; under `declares`, an older host's `fitOf` would refuse it):
 *
 * - `agentSays`: when to use it, said beside its name to a session on a kehikko it is on. Falls back
 *   to its `summary`.
 * - `absentSays`: said to a session on a kehikko it is NOT on, while it is installed on this computer
 *   ("Don't start heavy test runs directly; suggest adding Test runs to this kehikko"). A host says
 *   it only for a module it lists as official (see docs/asking.md for why).
 *
 * Both are text, at most `LIMITS.SUMMARY` (200) characters: never markup, never a link to follow,
 * and always said as a quoted line that cannot start another (`oneLine`).
 */
/** How long `agentSays` and `absentSays` may be, in characters. */
export declare const AGENT_SAYS_MAX: 200;
/** `agentSays` / `absentSays` in a manifest: one line of text. One that does not parse is dropped, not fatal. */
export declare const agentSaysSchema: z.ZodString;
/**
 * A module's words as one line of plain text, at most `max` characters (an ellipsis when clipped):
 * whitespace and control, bidi and zero-width characters become one space. `''` for anything else.
 */
export declare function oneLine(text: unknown, max?: number): string;
/** What a module says to agents where it is: `agentSays`, else its `summary`, as one line. */
export declare function agentSaysOf(manifest: {
    agentSays?: unknown;
    summary?: unknown;
} | null | undefined): string;
/** What a module says to agents where it is not, as one line; `''` when it says nothing. */
export declare function absentSaysOf(manifest: {
    absentSays?: unknown;
} | null | undefined): string;
/**
 * One container on a session's kehikko, as the host lists it beside the doors (`modules` in
 * `placeDoorsSchema`). `says` is its `agentSays` (2.36.0); `summary` its one line, for a module
 * that says nothing to agents and for a reader before 2.36.0.
 */
export declare const sessionModuleSchema: z.ZodObject<{
    module: z.ZodString;
    name: z.ZodString;
    summary: z.ZodCatch<z.ZodString>;
    says: z.ZodCatch<z.ZodOptional<z.ZodString>>;
    /** The name its MCP door has in the session's config, or null for a module with none. */
    door: z.ZodCatch<z.ZodNullable<z.ZodString>>;
    /** The skills it offers that can work on this kehikko. */
    skills: z.ZodCatch<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    summary: string;
    module: string;
    door: string | null;
    skills: string[];
    says?: string | undefined;
}, {
    name: string;
    module: string;
    says?: unknown;
    summary?: unknown;
    door?: unknown;
    skills?: unknown;
}>;
export type SessionModule = z.infer<typeof sessionModuleSchema>;
/** A module installed on this computer, not on the session's kehikko, with what it says there (`absent`, 2.36.0). */
export declare const absentModuleSchema: z.ZodObject<{
    module: z.ZodString;
    name: z.ZodString;
    says: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    says: string;
    module: string;
}, {
    name: string;
    says: string;
    module: string;
}>;
export type AbsentModule = z.infer<typeof absentModuleSchema>;
/** A session's place, as the notes say it. `project` is the folder. */
export interface NotesPlace {
    project: string;
    epic: string | null;
    parts: readonly {
        id: string;
        name?: string;
    }[];
    kehikko: {
        key: string;
        name?: string;
    } | null;
}
/** The module that runs the session: its id (it is not listed among the modules around it), its name and its door's name. */
export interface NotesSelf {
    module: string;
    name: string;
    door: string;
}
export interface NotesInput {
    /** The session's place now; null for one the person took off its place. */
    place: NotesPlace | null;
    /** The containers on its kehikko as the host listed them; null when the host did not say. */
    modules: readonly SessionModule[] | null;
    /** The installed modules not on its kehikko that say something there; null or absent when the host did not say. */
    absent?: readonly AbsentModule[] | null;
    /** The host's door's name in the session's config; `kehikko` when unknown. */
    hostDoor?: string | null;
    self: NotesSelf;
    /** The doors the session was started with, to say which it does not have yet; null when unknown. */
    connected?: readonly string[] | null;
    /** The place's key as the module keeps it, to notice a move; derived from `place` when absent. */
    key?: string | null;
}
/** What a session was last told: its place by key, and which modules (null when they could not be read). */
export interface NotesTold {
    key: string | null;
    modules: string[] | null;
    absent?: string[] | null;
    /** The names it was told them by, to say which left. */
    names?: Record<string, string>;
}
/** `start`: a session starts, resumes, is cleared or compacted. `prompt`: the person sent a prompt. */
export type NotesEvent = 'start' | 'prompt';
/** How many modules, and absent modules, are said at most; more are counted. */
export declare const NOTES_MOST: {
    readonly modules: 30;
    readonly absent: 12;
};
/** The place in words: `project thesis (/path), epic methods (parts Data + Results) on the kehikko "writing"`. */
export declare function placeWords(place: NotesPlace): string;
/** One module on the kehikko as one line: `- Test runs (door queue) — "Queue heavy test runs here…" Skills: a, b.` */
export declare function moduleLine(one: SessionModule, connected?: readonly string[] | null): string;
/** One installed module that is not on the kehikko: `- Test runs — "Don't start heavy test runs directly…"`. */
export declare function absentLine(one: AbsentModule): string;
/** The line about "Research complete", on the door of the module that runs the session. */
export declare function researchLine(self: NotesSelf): string;
/** Everything a session is told at its start: its place, the modules on its kehikko, and the installed ones not on it. */
export declare function startNotes(input: NotesInput, moved?: boolean): string;
/** What a session is told at a prompt when the modules on its kehikko changed; null when nothing it was told did. */
export declare function changeNotes(input: NotesInput, told: NotesTold): string | null;
/**
 * THE RULE for one hook: everything at a start, or when the place moved, or when the modules could
 * not be read last time and can now; at a prompt, only what changed; otherwise nothing (`text`
 * null). `told` is what to keep for next time, whenever `text` is not null.
 */
export declare function sessionNotes(input: NotesInput, event: NotesEvent, told: NotesTold | null): {
    text: string | null;
    kind: 'start' | 'change' | null;
    told: NotesTold;
};
