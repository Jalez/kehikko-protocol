/**
 * `bun run create <name>`: a new module, generated from `template/`.
 *
 * Node-only, like `/serve`, and deliberately not behind any entry point in
 * `exports`: it is run from a checkout (`bin/create.ts`), never imported by a
 * module. Every step is its own function so the tests can take them apart.
 */
/** The lowest port a new module is given. Everything below it was handed out by hand. */
export declare const PORT_FLOOR = 7960;
/** Modules sit ten apart, so one drifting up a few ports never lands on a neighbour. */
export declare const PORT_STEP = 10;
export declare const PLACEHOLDERS: readonly ["__MODULE_ID__", "__MODULE_NAME__", "__MODULE_FOLDER__", "__MODULE_PACKAGE__", "__MODULE_PORT__"];
export type Placeholder = (typeof PLACEHOLDERS)[number];
export interface Names {
    /** `roadmap.slides` */
    id: string;
    /** `Slides`, for people. */
    name: string;
    /** `slides`, the folder under `.kehikot/`. */
    folder: string;
    /** `kehikko-slides`, the package and the default directory. */
    pkg: string;
}
/**
 * Everything a module is called, from the one word a person typed.
 *
 * Narrower than `MODULE_ID` on purpose: the name also becomes a package name,
 * a directory, a header name and a folder, and a dot in any of those is a
 * question nobody needs to answer. The id is still checked against the
 * protocol's own rule, so the two can never disagree.
 */
export declare function namesFor(raw: string): Names;
export declare function placeholderValues(names: Names, port: number): Record<Placeholder, string>;
/** Every placeholder replaced, everywhere it appears. Anything else in the text is left alone. */
export declare function fill(text: string, values: Record<Placeholder, string>): string;
/**
 * The ports already spoken for: every registered module's url, and the
 * `PREFERRED_PORT` in each registered checkout's `manifest.ts` where one can be
 * read. A module that is not registered is not visible here, and that is
 * accepted — the plugin moves a module off a taken port when it starts.
 */
export declare function takenPorts(where?: string): Set<number>;
/**
 * The port for a new module: the highest taken port (or the floor, whichever is
 * higher), rounded up to the ten-apart grid, then up by ten until nothing has it.
 */
export declare function choosePort(taken: Iterable<number>, floor?: number): number;
/** `template/` beside `src/` and `dist/`, which is the same place from either. */
export declare function templateDir(): string;
/**
 * Copy the template into `to`, filling placeholders in contents and in names.
 * `gitignore` becomes `.gitignore`: a package drops a file called .gitignore.
 * Returns the paths written, relative to `to`.
 */
export declare function copyTemplate(from: string, to: string, values: Record<Placeholder, string>): string[];
export interface CreateOptions {
    name: string;
    /** Defaults to `~/Projects/kehikko-<name>`. */
    dir?: string;
    /** Write the registration, putting the module on this machine's host. */
    register?: boolean;
    /**
     * What the new module's `roadmap-module-protocol` dependency says, instead of
     * the GitHub source — e.g. `file:/path/to/this/checkout`. The protocol's own
     * test uses it so a generated module is tested against the protocol as it is
     * now, offline.
     */
    protocolSource?: string;
    /** Each step can be skipped, for tests. All default to true. */
    git?: boolean;
    install?: boolean;
    test?: boolean;
    /** Where progress goes. Silent by default. */
    log?: (line: string) => void;
}
export interface Created {
    names: Names;
    dir: string;
    port: number;
    files: string[];
    /** The registration file, when `register` was asked for. */
    registered: string | null;
}
export declare function defaultDir(names: Names): string;
/** The whole command. Throws a sentence when it refuses or a step fails. */
export declare function create(options: CreateOptions): Created;
/** One step, its output kept and shown only when it fails. */
export declare function run(command: string, args: string[], cwd: string, log?: (line: string) => void): string;
export interface Args {
    name: string;
    dir?: string;
    register: boolean;
}
export declare const USAGE = "usage: bun run create <name> [--dir <path>] [--register]";
/** The command line, or a sentence saying what is wrong with it. */
export declare function parseArgs(argv: string[]): Args | string;
/** What to do next, printed after a successful create. */
export declare function nextSteps(created: Created): string;
//# sourceMappingURL=index.d.ts.map