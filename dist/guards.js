import { z } from 'zod';
import { MODULE_ID } from './ids.js';
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
export const GUARD_TOOLS = ['shell'];
/** What a guard does with a command it matches. */
export const GUARD_ACTIONS = ['rewrite', 'deny'];
/** The variable that lets a command past every guard when set (not empty, not `0`). */
export const GUARD_ESCAPE_ENV = 'KEHIKOT_DIRECT';
/** The placeholder a rewrite template names once: the original command, shell-quoted. */
export const GUARD_PLACEHOLDER = '{command}';
export const GUARD_LIMITS = {
    /** Guards in one manifest; more are dropped. */
    GUARDS: 16,
    /** Patterns in `match.commands`, `match.scripts` or `allow`. */
    PATTERNS: 32,
    /** One pattern, in characters. */
    PATTERN: 120,
    /** A rewrite template, in characters. */
    TEMPLATE: 300,
    /** A guard's `why`, in characters. */
    WHY: 200,
    /** A command a guard decides on, in characters; a longer one is not looked into and passes. */
    COMMAND: 64 * 1024,
    /** How deep `sh -c '…'` is looked into. */
    DEPTH: 3,
    /** Guards in the host's answer for one session. */
    PLACED: 64,
};
/** A guard's id within its module: lowercase words joined by dashes. */
export const GUARD_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
/**
 * A command pattern: words separated by single spaces. The first word is the program, compared with
 * the base name of what runs (`./node_modules/.bin/tsc` is `tsc`); each further word must equal the
 * command's word at that place, or be `*` for any one word. The pattern is a prefix: `bun test` matches
 * `bun test --watch`. No quotes, no shell syntax.
 */
export const GUARD_PATTERN = /^[A-Za-z0-9_@./:=+,%*-]+(?: [A-Za-z0-9_@./:=+,%*-]+)*$/;
/** A package.json script name, as `match.scripts` names one. */
export const GUARD_SCRIPT = /^[A-Za-z0-9_@./:+-]{1,64}$/;
const pattern = z.string().max(GUARD_LIMITS.PATTERN).regex(GUARD_PATTERN);
const patterns = z.array(pattern).max(GUARD_LIMITS.PATTERNS);
/** Whether a rewrite template is one this protocol fills: one line, `{command}` once, no other braces. */
export function templateOk(template) {
    if (template.length === 0 || template.length > GUARD_LIMITS.TEMPLATE)
        return false;
    if (/[\u0000-\u001f\u007f]/.test(template))
        return false;
    const parts = template.split(GUARD_PLACEHOLDER);
    if (parts.length !== 2)
        return false;
    return !/[{}]/.test(parts.join(''));
}
/** One guard, as a manifest declares it. */
export const guardSchema = z
    .object({
    id: z.string().regex(GUARD_ID),
    tool: z.enum(GUARD_TOOLS),
    match: z
        .object({
        /** Command patterns (`GUARD_PATTERN`): `tsc`, `bun test`, `npx playwright`. */
        commands: patterns.default([]),
        /** package.json script names, matched as `bun run <name>`, `npm run <name>`, `npm test`, `pnpm <name>`, `yarn <name>`. */
        scripts: z.array(z.string().regex(GUARD_SCRIPT)).max(GUARD_LIMITS.PATTERNS).optional(),
    })
        .refine((m) => m.commands.length > 0 || (m.scripts?.length ?? 0) > 0, 'a guard matches at least one command or script'),
    /** Command patterns that pass this guard even when `match` names them: `tsc --version`, `bun test --help`. */
    allow: patterns.optional(),
    action: z.enum(GUARD_ACTIONS),
    /** For `rewrite`: the command to run instead, naming `{command}` once (`templateOk`). */
    rewrite: z.string().optional(),
    /** Why, in plain text, said to the agent whenever the guard acts. */
    why: z.string().trim().min(1).max(GUARD_LIMITS.WHY),
})
    .refine((g) => g.action !== 'rewrite' || (typeof g.rewrite === 'string' && templateOk(g.rewrite)), 'a rewrite names {command} once, on one line, with no other braces')
    .refine((g) => g.action !== 'deny' || g.rewrite === undefined, 'a deny guard has no rewrite');
/** Keep the guards that parse, first of each id, at most `most`. A list that is not one is none. */
function keepParsed(raw, schema, most, key = (one) => one.id) {
    if (!Array.isArray(raw))
        return [];
    const out = [];
    const seen = new Set();
    for (const one of raw) {
        const parsed = schema.safeParse(one);
        if (!parsed.success || seen.has(key(parsed.data)))
            continue;
        seen.add(key(parsed.data));
        out.push(parsed.data);
        if (out.length >= most)
            break;
    }
    return out;
}
/**
 * `guards` in a manifest: the ones that parse, first of each id, at most `GUARD_LIMITS.GUARDS`. One that
 * does not parse is dropped and the rest kept, never fatal.
 */
export const guardsSchema = z.unknown().transform((raw) => keepParsed(raw, guardSchema, GUARD_LIMITS.GUARDS));
/** A guard as the host hands it for a session: the guard, and which placed module it is from. */
export const placedGuardSchema = z
    .object({
    module: z.string().regex(MODULE_ID),
    name: z.string().max(80).catch(''),
    guard: guardSchema,
});
/** `guards` in the host's answer: the ones that parse, first of each module and id. */
export const placedGuardsSchema = z
    .unknown()
    .transform((raw) => keepParsed(raw, placedGuardSchema, GUARD_LIMITS.PLACED, (one) => `${one.module}/${one.guard.id}`));
const ASSIGNMENT = /^([A-Za-z_][A-Za-z0-9_]*)=([\s\S]*)$/;
/**
 * A shell line as its simple commands, quotes removed (`a && b; c | d` is three... four). Pure and
 * conservative: it reads what a POSIX shell would split on (`;` `&` `|` `&&` `||` newlines, `(` `)`,
 * `$(` and backticks, so a command substitution is a command of its own), quotes and backslashes,
 * comments, and redirections (dropped with their target). Expansions are not expanded. It never
 * throws; something it cannot read is read as words.
 */
export function shellCommands(line) {
    const out = [];
    let words = [];
    let word = '';
    let inWord = false;
    let dropNext = false;
    const endWord = () => {
        if (inWord) {
            if (dropNext)
                dropNext = false;
            else
                words.push(word);
        }
        word = '';
        inWord = false;
    };
    const endCommand = () => {
        endWord();
        dropNext = false;
        if (words.length) {
            const env = {};
            let at = 0;
            for (; at < words.length; at++) {
                const m = ASSIGNMENT.exec(words[at]);
                if (!m)
                    break;
                env[m[1]] = m[2];
            }
            out.push({ words: words.slice(at), env });
        }
        words = [];
    };
    const n = line.length;
    for (let i = 0; i < n; i++) {
        const c = line[i];
        if (c === '\\') {
            if (i + 1 < n) {
                if (line[i + 1] !== '\n') {
                    word += line[i + 1];
                    inWord = true;
                }
                i++;
            }
            continue;
        }
        if (c === "'") {
            const close = line.indexOf("'", i + 1);
            const end = close === -1 ? n : close;
            word += line.slice(i + 1, end);
            inWord = true;
            i = end;
            continue;
        }
        if (c === '"') {
            inWord = true;
            let j = i + 1;
            for (; j < n && line[j] !== '"'; j++) {
                if (line[j] === '\\' && j + 1 < n && '"\\$`\n'.includes(line[j + 1])) {
                    if (line[j + 1] !== '\n')
                        word += line[j + 1];
                    j++;
                }
                else
                    word += line[j];
            }
            i = j;
            continue;
        }
        if (c === ' ' || c === '\t') {
            endWord();
            continue;
        }
        if (c === '#' && !inWord) {
            const nl = line.indexOf('\n', i);
            i = nl === -1 ? n : nl - 1;
            continue;
        }
        if (c === '<' || c === '>' || (c === '&' && line[i + 1] === '>')) {
            /* A redirection: a file descriptor number before it is not a word, and its target is dropped. */
            if (inWord && /^\d+$/.test(word)) {
                word = '';
                inWord = false;
            }
            else
                endWord();
            let j = i + 1;
            while (j < n && '<>&|'.includes(line[j]))
                j++;
            i = j - 1;
            /* `>&2`, `2>&-`: the target is the digits or dash, read as the next word and dropped. */
            dropNext = true;
            continue;
        }
        if (c === '$' && line[i + 1] === '(') {
            endCommand();
            i++;
            continue;
        }
        if (c === ';' || c === '&' || c === '|' || c === '\n' || c === '\r' || c === '(' || c === ')' || c === '`') {
            endCommand();
            continue;
        }
        word += c;
        inWord = true;
    }
    endCommand();
    return out;
}
/** A word as one single-quoted shell word: `it's` → `'it'\''s'`. The only quoting a rewrite uses. */
export function shellQuote(text) {
    return `'${text.replace(/'/g, `'\\''`)}'`;
}
/** The base name of a program: `./node_modules/.bin/tsc` → `tsc`. */
const baseName = (word) => word.slice(word.lastIndexOf('/') + 1);
/** Programs that run the program after them (with their own flags first). */
const WRAPPERS = {
    env: { flagsWithValue: ['-u', '--unset', '-C', '--chdir', '-S'] },
    time: { flagsWithValue: ['-f', '-o'] },
    nice: { flagsWithValue: ['-n'] },
    nohup: { flagsWithValue: [] },
    exec: { flagsWithValue: ['-a'] },
    command: { flagsWithValue: [] },
    builtin: { flagsWithValue: [] },
    timeout: { flagsWithValue: ['-s', '--signal', '-k', '--kill-after'] },
    caffeinate: { flagsWithValue: ['-t', '-w'] },
    npx: { flagsWithValue: ['-p', '--package'] },
    bunx: { flagsWithValue: ['-p', '--package'] },
    pnpx: { flagsWithValue: [] },
};
/** Subcommands of package managers that run the package after them: `bun x tsc`, `pnpm exec tsc`. */
const RUNS_PACKAGE = { bun: ['x'], pnpm: ['exec', 'dlx'], yarn: ['exec', 'dlx'], npm: ['exec'] };
/**
 * A command's words with what runs it taken off: `env`, `time`, `nice -n 5`, `timeout 60`, `npx`,
 * `bun x`, `pnpm exec` … and the assignments `env` takes. Its env gathers those assignments too.
 */
export function unwrapped(command) {
    let words = command.words;
    const env = { ...command.env };
    for (let guard = 0; guard < 8 && words.length; guard++) {
        const program = baseName(words[0]);
        const wrapper = Object.hasOwn(WRAPPERS, program) ? WRAPPERS[program] : undefined;
        if (wrapper) {
            let at = 1;
            let duration = program === 'timeout';
            while (at < words.length) {
                const w = words[at];
                const m = program === 'env' ? ASSIGNMENT.exec(w) : null;
                if (m) {
                    env[m[1]] = m[2];
                    at++;
                }
                else if (w === '--') {
                    at++;
                    break;
                }
                else if (w.startsWith('-'))
                    at += wrapper.flagsWithValue.includes(w) ? 2 : 1;
                else if (duration && /^\d+(\.\d+)?[smhd]?$/.test(w)) {
                    duration = false;
                    at++;
                }
                else if (program === 'nice' && /^-?\d+$/.test(w))
                    at++;
                else
                    break;
            }
            words = words.slice(at);
            continue;
        }
        const runs = Object.hasOwn(RUNS_PACKAGE, program) ? RUNS_PACKAGE[program] : [];
        if (words.length > 1 && runs.includes(words[1])) {
            words = words.slice(2);
            while (words.length && words[0].startsWith('-'))
                words = words.slice(1);
            continue;
        }
        break;
    }
    return { words, env };
}
const SHELLS = ['sh', 'bash', 'zsh', 'dash'];
/** Every simple command a line runs, looking into `sh -c '…'` (to `GUARD_LIMITS.DEPTH`), each unwrapped. */
export function commandsRun(line, depth = 0) {
    const out = [];
    for (const raw of shellCommands(line)) {
        const one = unwrapped(raw);
        out.push(one);
        if (depth < GUARD_LIMITS.DEPTH && one.words.length >= 3 && SHELLS.includes(baseName(one.words[0]))) {
            const c = one.words.findIndex((w, i) => i > 0 && /^-[a-z]*c[a-z]*$/.test(w));
            const inner = c > 0 ? one.words[c + 1] : undefined;
            if (inner !== undefined)
                out.push(...commandsRun(inner, depth + 1).map((cmd) => ({ words: cmd.words, env: { ...one.env, ...cmd.env } })));
        }
    }
    return out;
}
/* ------------------------------------------------------------------------ *
 * Matching
 * ------------------------------------------------------------------------ */
/** Whether a command pattern (`GUARD_PATTERN`) matches a command's words. */
export function patternMatches(pattern, words) {
    const want = pattern.split(' ');
    if (want.length > words.length || !words.length)
        return false;
    if (want[0] !== '*' && want[0] !== baseName(words[0]))
        return false;
    for (let i = 1; i < want.length; i++)
        if (want[i] !== '*' && want[i] !== words[i])
            return false;
    return true;
}
const MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'];
/** Flags of a package manager, before its subcommand, that take the next word. */
const MANAGER_FLAGS_WITH_VALUE = ['--cwd', '--prefix', '-C', '--dir', '--filter', '-F', '--workspace', '-w'];
/** Subcommands that are the manager's own, not a script, when said without `run`. */
const BUILTIN = {
    bun: ['test', 'build', 'install', 'i', 'add', 'a', 'remove', 'rm', 'x', 'init', 'create', 'upgrade', 'link', 'unlink', 'pm', 'run', 'exec', 'repl', 'outdated', 'update', 'publish', 'patch', 'audit', 'info', 'why', 'help'],
    pnpm: ['install', 'i', 'add', 'remove', 'rm', 'update', 'up', 'exec', 'dlx', 'run', 'create', 'init', 'link', 'publish', 'outdated', 'list', 'ls', 'why', 'audit', 'store', 'help'],
    yarn: ['install', 'add', 'remove', 'upgrade', 'up', 'exec', 'dlx', 'run', 'create', 'init', 'link', 'publish', 'outdated', 'list', 'why', 'audit', 'cache', 'config', 'workspace', 'workspaces', 'help'],
};
/** `npm <name>` that runs a script of that name. */
const NPM_SCRIPTS = { test: 'test', t: 'test', tst: 'test', start: 'start', stop: 'stop', restart: 'restart' };
/** The package.json script a command runs (`bun run test`, `npm test`, `pnpm lint`), or null. */
export function scriptRun(words) {
    if (!words.length)
        return null;
    const manager = baseName(words[0]);
    if (!MANAGERS.includes(manager))
        return null;
    let at = 1;
    while (at < words.length && words[at].startsWith('-'))
        at += MANAGER_FLAGS_WITH_VALUE.includes(words[at]) ? 2 : 1;
    const sub = words[at];
    if (sub === undefined)
        return null;
    if (sub === 'run' || sub === 'run-script') {
        at++;
        while (at < words.length && words[at].startsWith('-'))
            at += MANAGER_FLAGS_WITH_VALUE.includes(words[at]) ? 2 : 1;
        return words[at] ?? null;
    }
    if (manager === 'npm')
        return Object.hasOwn(NPM_SCRIPTS, sub) ? NPM_SCRIPTS[sub] : null;
    const builtin = Object.hasOwn(BUILTIN, manager) ? BUILTIN[manager] : [];
    /* `pnpm test` and `yarn test` run the script; `bun test` is bun's own runner. */
    if ((manager === 'pnpm' || manager === 'yarn') && sub === 'test')
        return 'test';
    return builtin.includes(sub) ? null : sub;
}
/** Whether one simple command is what a guard is about, and not something its `allow` lets past. */
export function guardMatches(guard, command) {
    if (!command.words.length)
        return false;
    const allowed = (guard.allow ?? []).some((p) => patternMatches(p, command.words));
    if (allowed)
        return false;
    if (guard.match.commands.some((p) => patternMatches(p, command.words)))
        return true;
    const script = guard.match.scripts?.length ? scriptRun(command.words) : null;
    return script !== null && guard.match.scripts.includes(script);
}
const escapes = (value) => value !== undefined && value !== '' && value !== '0';
/** Whether a line, or the environment it runs in, asks to pass every guard (`GUARD_ESCAPE_ENV`). */
export function escaped(commands, env = {}) {
    if (escapes(env[GUARD_ESCAPE_ENV]))
        return true;
    return commands.some((one) => escapes(one.env[GUARD_ESCAPE_ENV]));
}
/** A rewrite template filled with the original command, shell-quoted. Null for a template this protocol does not fill. */
export function fillTemplate(template, command) {
    if (!templateOk(template))
        return null;
    return template.replace(GUARD_PLACEHOLDER, () => shellQuote(command));
}
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
export function guardDecision(guards, command, options = {}) {
    const tool = options.tool ?? 'shell';
    if (typeof command !== 'string' || !command.trim() || command.length > GUARD_LIMITS.COMMAND)
        return { action: 'pass' };
    const relevant = guards.filter((one) => one.guard.tool === tool);
    if (!relevant.length)
        return { action: 'pass' };
    const commands = commandsRun(command);
    if (escaped(commands, options.env))
        return { action: 'pass' };
    const hits = relevant.filter((one) => commands.some((cmd) => guardMatches(one.guard, cmd)));
    const deny = hits.find((one) => one.guard.action === 'deny');
    if (deny)
        return { action: 'deny', module: deny.module, name: deny.name || deny.module, guard: deny.guard, why: deny.guard.why };
    for (const one of hits) {
        const filled = one.guard.rewrite === undefined ? null : fillTemplate(one.guard.rewrite, command);
        if (filled !== null)
            return { action: 'rewrite', module: one.module, name: one.name || one.module, guard: one.guard, command: filled, why: one.guard.why };
    }
    return { action: 'pass' };
}
const flat = (text, max = 300) => {
    const one = text.replace(/[\s\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').trim();
    return one.length > max ? `${one.slice(0, max - 1)}…` : one;
};
/**
 * The words an agent is told when a guard acts, in one wording for every agent module: for a deny, the
 * reason the tool call is refused; for a rewrite, the note beside the result. The module's `why` is
 * quoted, as text to read.
 */
export function guardSays(decision) {
    const who = `${flat(decision.name, 80)} (a module on this kehikko)`;
    const why = JSON.stringify(flat(decision.why));
    if (decision.action === 'deny') {
        return `Refused by ${who}, guard ${decision.guard.id}: ${why}. Use that module instead. Only if the person asks for this command to run directly, put ${GUARD_ESCAPE_ENV}=1 in front of it.`;
    }
    return `${who} ran this command through its own instead (guard ${decision.guard.id}): ${why}. The command run was: ${flat(decision.command, 600)}`;
}
