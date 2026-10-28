/**
 * The variable a host names, joined by the path delimiter, the folders it put first on a module's
 * `PATH` for the module's own process (a `bun` that is the host itself, say). `personEnv` takes
 * them out again.
 */
export declare const HOST_PATH_ENV = "KEHIKOT_HOST_PATH";
export interface PersonEnvOptions {
    /** The module's own runtime. `process.execPath` when not given. */
    execPath?: string;
}
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
 * - `BUN_BE_BUN` and `KEHIKOT_HOST_PATH` are dropped.
 *
 * Everything else is kept as it was. Unset values are left out.
 */
export declare function personEnv(env?: Record<string, string | undefined>, options?: PersonEnvOptions): Record<string, string>;
