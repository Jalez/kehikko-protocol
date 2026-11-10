/**
 * The variable a host names, joined by the path delimiter, the folders it put first on a module's
 * `PATH` for the module's own process (a `bun` that is the host itself, say). `personEnv` takes
 * them out again.
 */
export declare const HOST_PATH_ENV = "KEHIKOT_HOST_PATH";
export interface PersonEnvOptions {
    /** The module's own runtime. `process.execPath` when not given. */
    execPath?: string;
    /** The platform the program runs on, for its UTF-8 locale. `process.platform` when not given. */
    platform?: NodeJS.Platform;
}
/**
 * 2.75.0. The locale a person's program is given when nothing names one: a host started by the
 * desktop (launchd on macOS) has no `LANG`, and a program started without a locale reads and writes
 * text in the C locale's encoding. macOS's `pbcopy` then takes UTF-8 as Mac Roman — an em dash an
 * agent's terminal copies arrives as "‚Äî". `LC_CTYPE` alone (the encoding, not the language): `UTF-8`
 * on macOS, `C.UTF-8` elsewhere.
 */
export declare const utf8Locale: (platform?: NodeJS.Platform) => string;
/**
 * The environment for a program a module starts on the person's behalf: a session, a shell, a
 * command they typed. `env` (this process's when not given) without what the host gave the module
 * for its own use:
 *
 * - the folders named in `KEHIKOT_HOST_PATH` are taken off `PATH` (one occurrence each, the first,
 *   so the same folder the person has further along stays);
 * - a folder on `PATH` whose `bun` or `node` is this process's own runtime goes too, when that
 *   runtime is a compiled host rather than Bun or Node, and so does a `bun-node-*` or
 *   `kehikot-bun-*` folder whose `bun` or `node` is this runtime, whatever it is;
 * - `BUN_BE_BUN` and `KEHIKOT_HOST_PATH` are dropped, and so is `KEHIKOT_START_TOKEN` (2.60.0): it
 *   names the module's process, and a module the person starts from a shell here is another one.
 *
 * - (2.75.0) when none of `LC_ALL`, `LC_CTYPE` and `LANG` names a locale, `LC_CTYPE` is set to UTF-8
 *   (`utf8Locale`), so what the program copies, pastes and prints is UTF-8, as in the person's terminal.
 *
 * Everything else is kept as it was. Unset values are left out.
 */
export declare function personEnv(env?: Record<string, string | undefined>, options?: PersonEnvOptions): Record<string, string>;
