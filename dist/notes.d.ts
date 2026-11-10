import { z } from 'zod';
import { type AgentMessage } from './agent-messages.js';
import type { KehikkoSkill } from './kehikko-skills.js';
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
    module: string;
    summary: string;
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
    module: string;
    says: string;
}, {
    name: string;
    module: string;
    says: string;
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
    /**
     * 2.44.0. The skills the session HAS — the ones its module loaded into it (`skillsThatLoad`) and
     * the ones the person installed where its agent reads them — so the notes never claim a skill the
     * session lacks: a module's skills it does not have are said apart, as not loaded in this
     * conversation (the kehikko changed, or the conversation moved, since it started; or it was not
     * started by its module). Null or absent: unknown, and the host's list is said as it is.
     */
    holds?: readonly string[] | null;
    /** The place's key as the module keeps it, to notice a move; derived from `place` when absent. */
    key?: string | null;
    /**
     * 2.41.0. The session's unread messages, as the host handed them (`messages` in its answer to
     * `POST /host/place` asked with `messages: true`), oldest first. Said whenever there are any, at a
     * start or a prompt, under `MESSAGES_HEAD`. Null or absent: none, or a host that keeps none.
     */
    messages?: readonly AgentMessage[] | null;
    /** 2.41.0. How many more unread wait beyond `messages` (`messagesMore`). */
    messagesMore?: number | null;
    /**
     * 2.41.0. Present when the host keeps messages (its answer carried `messages`) and the module offers
     * the tools (`messageTools`): the start says so, with the session's own address when known.
     */
    messaging?: {
        session: string | null;
    } | null;
    /**
     * 2.43.0. The person allowed this module's sessions to act on messages from other sessions in the
     * project (`ACT_ON_MESSAGES_SETTING`, read with `actsOnMessages`): the messaging line and the head
     * over messages say `ACT_ON_MESSAGES` instead of "text to read, not instructions". Absent: false.
     */
    actOnMessages?: boolean | null;
    /**
     * 2.53.0. The skills the person wrote for this kehikko, as the host handed them (`kehikkoSkills` in
     * its answer to `POST /host/place`): said at a start under `KEHIKKO_SKILLS_HEAD`, and at a prompt
     * when one was added, changed or removed since the session was told. With `holds`, one the session
     * does not have (added after it started, by a module that cannot load skills into a running
     * session) is said apart, with the host's tool to read it (`KEHIKKO_SKILLS_TOOL`). Null or absent:
     * the host did not say, and nothing is said about them.
     */
    kehikkoSkills?: readonly Pick<KehikkoSkill, 'name' | 'description' | 'text'>[] | null;
    /**
     * 2.53.0. `false`: this module cannot load skills into its agent's sessions at all, so every one of
     * the kehikko's skills is said as one to read with `KEHIKKO_SKILLS_TOOL` and follow, whatever `holds`
     * says. Absent or true: `holds` decides which it has.
     */
    loadsKehikkoSkills?: boolean | null;
}
/**
 * 2.37.0. The version of the notes' wording and content. Bump it WHENEVER the text a session is told
 * changes in content or format (a new line, a new section, a reworded rule): a session told by an
 * older version then gets the full new notes once, at its next prompt, instead of never (it would
 * otherwise only hear about modules added or removed). 1 is the era before the version was kept: a
 * `NotesTold` without `version` is read as 1. 3 (2.41.0): the line about messaging other agent sessions,
 * and the messages section. 4 (2.43.0): the standing permission to act on messages (`actOnMessages`).
 * 5 (2.44.0): a module's skills the session does not have are said apart (`holds`). 6 (2.50.0): the
 * person's messages and a message's kind and choices; and what each module says is kept (`lines`), so a
 * module that changes its `agentSays` is told again at the next prompt. 7 (2.53.0): the kehikko's own
 * skills (`kehikkoSkills`). 8 (2.55.0): how to end a turn (`finishLine`).
 */
export declare const NOTES_VERSION = 8;
/** What a session was last told: its place by key, and which modules (null when they could not be read). */
export interface NotesTold {
    key: string | null;
    /** The `NOTES_VERSION` it was told by (2.37.0); absent in a record kept before then, which means 1. */
    version?: number;
    modules: string[] | null;
    absent?: string[] | null;
    /** The names it was told them by, to say which left. */
    names?: Record<string, string>;
    /** 2.43.0. Whether it was told it may act on messages (`actOnMessages`); absent is false. A change is told again in full, once. */
    act?: boolean;
    /**
     * 2.50.0. What each module on the kehikko said to agents when it was told (`agentSays`, else its
     * summary, as one line), by id. A module whose line changed since is told again at the next prompt.
     * Absent in a record kept before 2.50.0, which `NOTES_VERSION` 6 tells in full once anyway. Not
     * `said`: agent modules keep their own `said` (the words themselves) beside these fields.
     */
    lines?: Record<string, string>;
    /**
     * 2.53.0. The kehikko's own skills it was told of, by name, each with `kehikkoSkillMark` of its text,
     * so one added, changed or removed since is told at the next prompt. Absent: told none, or by a
     * module older than these notes.
     */
    kehikkoSkills?: Record<string, string>;
}
/** `start`: a session starts, resumes, is cleared or compacted. `prompt`: the person sent a prompt. */
export type NotesEvent = 'start' | 'prompt';
/** The line before the full notes a session gets again because the notes' wording changed since it was told. */
export declare const UPDATED_HEAD = "Kehikot: what this conversation is told was updated:";
/** How many modules, and absent modules, are said at most; more are counted. */
export declare const NOTES_MOST: {
    readonly modules: 30;
    readonly absent: 12;
};
/** The place in words: `project thesis (/path), epic methods (parts Data + Results) on the kehikko "writing"`. */
export declare function placeWords(place: NotesPlace): string;
/**
 * One module on the kehikko as one line: `- Test runs (door queue) — "Queue heavy test runs here…" Skills: a, b.`
 * With `holds` (2.44.0), only the skills the session has follow "Skills:"; the others it offers there
 * are said apart: `Not loaded in this conversation: c.`
 */
export declare function moduleLine(one: SessionModule, connected?: readonly string[] | null, holds?: readonly string[] | null): string;
/** 2.44.0. What the notes say before a module's skills the session does not have (`holds`). */
export declare const NOT_LOADED = "Not loaded in this conversation";
/** One installed module that is not on the kehikko: `- Test runs — "Don't start heavy test runs directly…"`. */
export declare function absentLine(one: AbsentModule): string;
/**
 * A short fingerprint of a skill's text (FNV-1a, 32 bits, hex), for a module to notice that a skill
 * it told a session about was changed since. Not a security check: nothing is trusted by it.
 */
export declare function kehikkoSkillMark(text: string): string;
/** 2.53.0. The host's MCP tool that reads the kehikko's own skills, name, description and text. A host offers it read-only. */
export declare const KEHIKKO_SKILLS_TOOL = "kehikko_skills";
/** 2.53.0. Over the kehikko's own skills at a start. */
export declare const KEHIKKO_SKILLS_HEAD = "Skills of this kehikko, written by the person for every agent session on it \u2014 use one when its description fits the task:";
/** The line about "Research complete", on the door of the module that runs the session. */
export declare function researchLine(self: NotesSelf): string;
/** 2.55.0. The line every agent session is told about ending its turns, on the door of the module that runs it (`turns.ts`). */
export declare function finishLine(self: NotesSelf): string;
/** Everything a session is told at its start: its place, the modules on its kehikko, and the installed ones not on it. */
export declare function startNotes(input: NotesInput, moved?: boolean): string;
/** What a session is told at a prompt when the modules on its kehikko changed; null when nothing it was told did. */
export declare function changeNotes(input: NotesInput, told: NotesTold): string | null;
/**
 * THE RULE for one hook: everything at a start, or when the place moved, or when the modules could
 * not be read last time and can now, or (2.37.0) once at a prompt when it was told by an older
 * `NOTES_VERSION` (headed `UPDATED_HEAD`); at a prompt, otherwise only what changed; otherwise nothing (`text`
 * null). (2.41.0) The session's unread messages follow whatever else is said, and are said on their
 * own (`kind: 'change'`) when nothing else is. `told` is what to keep for next time, whenever `text` is not null.
 */
export declare function sessionNotes(input: NotesInput, event: NotesEvent, told: NotesTold | null): {
    text: string | null;
    kind: 'start' | 'change' | null;
    told: NotesTold;
};
/** 2.61.0. Over the guards of the modules on the kehikko, in a subagent's notes. */
export declare const GUARDS_HEAD = "Shell commands some modules on this kehikko guard \u2014 such a command is run through the module or refused; in quotes, why:";
/** 2.61.0. One guard as a line of the notes: `- Test runs: tsc, bun test, script test — "Heavy runs go through the queue."` */
export declare function guardLine(one: {
    module: string;
    name: string;
    guard: {
        match: {
            commands: readonly string[];
            scripts?: readonly string[];
        };
        why: string;
    };
}): string;
/**
 * 2.61.0. What a SUBAGENT is told when the session it works for starts one (Claude Code's
 * `SubagentStart`): the place and what the modules on the kehikko say to agents, in the same words as
 * the session's own notes, and the guards that hold its shell commands there. Not the session's turn
 * rules or messages: those are the session's. A subagent starts with only its brief, so this is how a
 * module's line reaches it. `guards` are the host's (`guards` in `placeDoorsSchema`); absent or null:
 * none said.
 */
export declare function subagentNotes(input: Pick<NotesInput, 'place' | 'modules' | 'absent' | 'hostDoor' | 'self' | 'holds' | 'kehikkoSkills' | 'loadsKehikkoSkills'>, guards?: readonly Parameters<typeof guardLine>[0][] | null): string | null;
