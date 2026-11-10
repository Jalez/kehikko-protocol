import { z } from 'zod';
/**
 * 2.61.0. Guards: what a module says about the shell commands an agent session runs on a kehikko it is
 * placed on, so its rule reaches every agent process there — subagents included — and is held, not
 * only told. "Run heavy commands through the queue" is a guard: a manifest names the commands and
 * scripts it is about (`match`), and either has them run through its own command instead
 * (`action: 'rewrite'`, the command filled into `rewrite` shell-quoted) or refused with its `why`
 * (`action: 'deny'`).
 *
 * Who does what:
 *
 * - The MODULE declares `guards` in its manifest (top-level, like `agentSays`: a host before 2.61.0
 *   ignores it and runs the module).
 * - The HOST hands the guards of the modules PLACED on a session's kehikko in its answer to
 *   `POST /host/place` (`guards` in `placeDoorsSchema`), each with its module's id and name. A guard
 *   is active only there: a module that is installed but not on the kehikko guards nothing.
 * - The AGENT MODULE (the one that runs sessions) translates them into its CLI's hook system — a
 *   pre-tool hook on its shell tool — and decides with `guardDecision`, the ONE rule, so every agent
 *   CLI holds the same commands to the same guards.
 *
 * Safety: the rewritten command is the module's template with `{command}` replaced by the original
 * command as ONE single-quoted shell word (`shellQuote`), so nothing the agent wrote can break out of
 * it. A template names `{command}` exactly once and nothing else in braces, on one line.
 *
 * Escape: a command that sets `KEHIKOT_DIRECT` (`GUARD_ESCAPE_ENV`) to anything but empty or `0` — as
 * an assignment in front of any of its commands, or in the hook's own environment — passes every
 * guard. A denial says so, for when the person asks for a command to be run directly.
 */
/** The tools a guard can be about. `shell`: an agent's shell tool (Claude Code's Bash, Codex's shell). */
export declare const GUARD_TOOLS: readonly ["shell"];
export type GuardTool = (typeof GUARD_TOOLS)[number];
/** What a guard does with a command it matches. */
export declare const GUARD_ACTIONS: readonly ["rewrite", "deny"];
export type GuardAction = (typeof GUARD_ACTIONS)[number];
/** The variable that lets a command past every guard when set (not empty, not `0`). */
export declare const GUARD_ESCAPE_ENV = "KEHIKOT_DIRECT";
/** The placeholder a rewrite template names once: the original command, shell-quoted. */
export declare const GUARD_PLACEHOLDER = "{command}";
export declare const GUARD_LIMITS: {
    /** Guards in one manifest; more are dropped. */
    readonly GUARDS: 16;
    /** Patterns in `match.commands`, `match.scripts` or `allow`. */
    readonly PATTERNS: 32;
    /** One pattern, in characters. */
    readonly PATTERN: 120;
    /** A rewrite template, in characters. */
    readonly TEMPLATE: 300;
    /** A guard's `why`, in characters. */
    readonly WHY: 200;
    /** A command a guard decides on, in characters; a longer one is not looked into and passes. */
    readonly COMMAND: number;
    /** How deep `sh -c '…'` is looked into. */
    readonly DEPTH: 3;
    /** Guards in the host's answer for one session. */
    readonly PLACED: 64;
};
/** A guard's id within its module: lowercase words joined by dashes. */
export declare const GUARD_ID: RegExp;
/**
 * A command pattern: words separated by single spaces. The first word is the program, compared with
 * the base name of what runs (`./node_modules/.bin/tsc` is `tsc`); each further word must equal the
 * command's word at that place, or be `*` for any one word. The pattern is a prefix: `bun test` matches
 * `bun test --watch`. No quotes, no shell syntax.
 */
export declare const GUARD_PATTERN: RegExp;
/** A package.json script name, as `match.scripts` names one. */
export declare const GUARD_SCRIPT: RegExp;
/** Whether a rewrite template is one this protocol fills: one line, `{command}` once, no other braces. */
export declare function templateOk(template: string): boolean;
/** One guard, as a manifest declares it. */
export declare const guardSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    id: z.ZodString;
    tool: z.ZodEnum<["shell"]>;
    match: z.ZodEffects<z.ZodObject<{
        /** Command patterns (`GUARD_PATTERN`): `tsc`, `bun test`, `npx playwright`. */
        commands: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        /** package.json script names, matched as `bun run <name>`, `npm run <name>`, `npm test`, `pnpm <name>`, `yarn <name>`. */
        scripts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        commands: string[];
        scripts?: string[] | undefined;
    }, {
        commands?: string[] | undefined;
        scripts?: string[] | undefined;
    }>, {
        commands: string[];
        scripts?: string[] | undefined;
    }, {
        commands?: string[] | undefined;
        scripts?: string[] | undefined;
    }>;
    /** Command patterns that pass this guard even when `match` names them: `tsc --version`, `bun test --help`. */
    allow: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    action: z.ZodEnum<["rewrite", "deny"]>;
    /** For `rewrite`: the command to run instead, naming `{command}` once (`templateOk`). */
    rewrite: z.ZodOptional<z.ZodString>;
    /** Why, in plain text, said to the agent whenever the guard acts. */
    why: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    why: string;
    tool: "shell";
    match: {
        commands: string[];
        scripts?: string[] | undefined;
    };
    action: "rewrite" | "deny";
    rewrite?: string | undefined;
    allow?: string[] | undefined;
}, {
    id: string;
    why: string;
    tool: "shell";
    match: {
        commands?: string[] | undefined;
        scripts?: string[] | undefined;
    };
    action: "rewrite" | "deny";
    rewrite?: string | undefined;
    allow?: string[] | undefined;
}>, {
    id: string;
    why: string;
    tool: "shell";
    match: {
        commands: string[];
        scripts?: string[] | undefined;
    };
    action: "rewrite" | "deny";
    rewrite?: string | undefined;
    allow?: string[] | undefined;
}, {
    id: string;
    why: string;
    tool: "shell";
    match: {
        commands?: string[] | undefined;
        scripts?: string[] | undefined;
    };
    action: "rewrite" | "deny";
    rewrite?: string | undefined;
    allow?: string[] | undefined;
}>, {
    id: string;
    why: string;
    tool: "shell";
    match: {
        commands: string[];
        scripts?: string[] | undefined;
    };
    action: "rewrite" | "deny";
    rewrite?: string | undefined;
    allow?: string[] | undefined;
}, {
    id: string;
    why: string;
    tool: "shell";
    match: {
        commands?: string[] | undefined;
        scripts?: string[] | undefined;
    };
    action: "rewrite" | "deny";
    rewrite?: string | undefined;
    allow?: string[] | undefined;
}>;
export type Guard = z.infer<typeof guardSchema>;
/**
 * `guards` in a manifest: the ones that parse, first of each id, at most `GUARD_LIMITS.GUARDS`. One that
 * does not parse is dropped and the rest kept, never fatal.
 */
export declare const guardsSchema: z.ZodEffects<z.ZodUnknown, {
    id: string;
    why: string;
    tool: "shell";
    match: {
        commands: string[];
        scripts?: string[] | undefined;
    };
    action: "rewrite" | "deny";
    rewrite?: string | undefined;
    allow?: string[] | undefined;
}[], unknown>;
/** A guard as the host hands it for a session: the guard, and which placed module it is from. */
export declare const placedGuardSchema: z.ZodObject<{
    module: z.ZodString;
    name: z.ZodCatch<z.ZodString>;
    guard: z.ZodEffects<z.ZodEffects<z.ZodObject<{
        id: z.ZodString;
        tool: z.ZodEnum<["shell"]>;
        match: z.ZodEffects<z.ZodObject<{
            /** Command patterns (`GUARD_PATTERN`): `tsc`, `bun test`, `npx playwright`. */
            commands: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            /** package.json script names, matched as `bun run <name>`, `npm run <name>`, `npm test`, `pnpm <name>`, `yarn <name>`. */
            scripts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            commands: string[];
            scripts?: string[] | undefined;
        }, {
            commands?: string[] | undefined;
            scripts?: string[] | undefined;
        }>, {
            commands: string[];
            scripts?: string[] | undefined;
        }, {
            commands?: string[] | undefined;
            scripts?: string[] | undefined;
        }>;
        /** Command patterns that pass this guard even when `match` names them: `tsc --version`, `bun test --help`. */
        allow: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        action: z.ZodEnum<["rewrite", "deny"]>;
        /** For `rewrite`: the command to run instead, naming `{command}` once (`templateOk`). */
        rewrite: z.ZodOptional<z.ZodString>;
        /** Why, in plain text, said to the agent whenever the guard acts. */
        why: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        why: string;
        tool: "shell";
        match: {
            commands: string[];
            scripts?: string[] | undefined;
        };
        action: "rewrite" | "deny";
        rewrite?: string | undefined;
        allow?: string[] | undefined;
    }, {
        id: string;
        why: string;
        tool: "shell";
        match: {
            commands?: string[] | undefined;
            scripts?: string[] | undefined;
        };
        action: "rewrite" | "deny";
        rewrite?: string | undefined;
        allow?: string[] | undefined;
    }>, {
        id: string;
        why: string;
        tool: "shell";
        match: {
            commands: string[];
            scripts?: string[] | undefined;
        };
        action: "rewrite" | "deny";
        rewrite?: string | undefined;
        allow?: string[] | undefined;
    }, {
        id: string;
        why: string;
        tool: "shell";
        match: {
            commands?: string[] | undefined;
            scripts?: string[] | undefined;
        };
        action: "rewrite" | "deny";
        rewrite?: string | undefined;
        allow?: string[] | undefined;
    }>, {
        id: string;
        why: string;
        tool: "shell";
        match: {
            commands: string[];
            scripts?: string[] | undefined;
        };
        action: "rewrite" | "deny";
        rewrite?: string | undefined;
        allow?: string[] | undefined;
    }, {
        id: string;
        why: string;
        tool: "shell";
        match: {
            commands?: string[] | undefined;
            scripts?: string[] | undefined;
        };
        action: "rewrite" | "deny";
        rewrite?: string | undefined;
        allow?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    name: string;
    module: string;
    guard: {
        id: string;
        why: string;
        tool: "shell";
        match: {
            commands: string[];
            scripts?: string[] | undefined;
        };
        action: "rewrite" | "deny";
        rewrite?: string | undefined;
        allow?: string[] | undefined;
    };
}, {
    module: string;
    guard: {
        id: string;
        why: string;
        tool: "shell";
        match: {
            commands?: string[] | undefined;
            scripts?: string[] | undefined;
        };
        action: "rewrite" | "deny";
        rewrite?: string | undefined;
        allow?: string[] | undefined;
    };
    name?: unknown;
}>;
export type PlacedGuard = z.infer<typeof placedGuardSchema>;
/** `guards` in the host's answer: the ones that parse, first of each module and id. */
export declare const placedGuardsSchema: z.ZodEffects<z.ZodUnknown, ({
    name: string;
    module: string;
    guard: {
        id: string;
        why: string;
        tool: "shell";
        match: {
            commands: string[];
            scripts?: string[] | undefined;
        };
        action: "rewrite" | "deny";
        rewrite?: string | undefined;
        allow?: string[] | undefined;
    };
} & {
    id: string;
})[], unknown>;
/** One simple command of a shell line: its words with the leading `NAME=value` assignments taken out. */
export interface ShellCommand {
    words: string[];
    env: Record<string, string>;
}
/**
 * A shell line as its simple commands, quotes removed (`a && b; c | d` is three... four). Pure and
 * conservative: it reads what a POSIX shell would split on (`;` `&` `|` `&&` `||` newlines, `(` `)`,
 * `$(` and backticks, so a command substitution is a command of its own), quotes and backslashes,
 * comments, and redirections (dropped with their target). Expansions are not expanded. It never
 * throws; something it cannot read is read as words.
 */
export declare function shellCommands(line: string): ShellCommand[];
/** A word as one single-quoted shell word: `it's` → `'it'\''s'`. The only quoting a rewrite uses. */
export declare function shellQuote(text: string): string;
/**
 * A command's words with what runs it taken off: `env`, `time`, `nice -n 5`, `timeout 60`, `npx`,
 * `bun x`, `pnpm exec` … and the assignments `env` takes. Its env gathers those assignments too.
 */
export declare function unwrapped(command: ShellCommand): ShellCommand;
/** Every simple command a line runs, looking into `sh -c '…'` (to `GUARD_LIMITS.DEPTH`), each unwrapped. */
export declare function commandsRun(line: string, depth?: number): ShellCommand[];
/** Whether a command pattern (`GUARD_PATTERN`) matches a command's words. */
export declare function patternMatches(pattern: string, words: readonly string[]): boolean;
/** The package.json script a command runs (`bun run test`, `npm test`, `pnpm lint`), or null. */
export declare function scriptRun(words: readonly string[]): string | null;
/** Whether one simple command is what a guard is about, and not something its `allow` lets past. */
export declare function guardMatches(guard: Guard, command: ShellCommand): boolean;
/** Whether a line, or the environment it runs in, asks to pass every guard (`GUARD_ESCAPE_ENV`). */
export declare function escaped(commands: readonly ShellCommand[], env?: Record<string, string | undefined>): boolean;
/** What becomes of a command a session is about to run. */
export type GuardDecision = {
    action: 'pass';
} | {
    action: 'rewrite';
    module: string;
    name: string;
    guard: Guard;
    command: string;
    why: string;
} | {
    action: 'deny';
    module: string;
    name: string;
    guard: Guard;
    why: string;
};
/** A rewrite template filled with the original command, shell-quoted. Null for a template this protocol does not fill. */
export declare function fillTemplate(template: string, command: string): string | null;
/**
 * THE RULE (2.61.0): what becomes of `command`, run with `tool`, under the guards of the modules placed
 * on the session's kehikko. Pure.
 *
 * - `pass` for another tool, an empty or overlong command, an escaped one (`escaped`), or one no guard
 *   matches.
 * - Of the guards that match any simple command in it, a `deny` wins over a `rewrite` (it says the
 *   command must not run); otherwise the first rewrite in order, its template filled with the WHOLE
 *   original command, quoted (`fillTemplate`).
 */
export declare function guardDecision(guards: readonly PlacedGuard[], command: string, options?: {
    tool?: GuardTool;
    env?: Record<string, string | undefined>;
}): GuardDecision;
/**
 * The words an agent is told when a guard acts, in one wording for every agent module: for a deny, the
 * reason the tool call is refused; for a rewrite, the note beside the result. The module's `why` is
 * quoted, as text to read.
 */
export declare function guardSays(decision: Exclude<GuardDecision, {
    action: 'pass';
}>): string;
