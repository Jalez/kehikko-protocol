/**
 * `bun run check:serving <module dir>…` (2.97.0): does a module take its port the shared way? A
 * module that picks and binds its own port bypasses every rule `/serve` keeps about ports: the
 * band outside the system's temporary range (`MODULE_PORTS`), the probe on every address a port can
 * be held on (`free`), the drift and the registration. That is how a module ends up on a port
 * another program's test server is also handed, and that program's requests reach the module.
 *
 * From the files alone, like `check:parts`: a module's own sources (not its tests, dev scripts or
 * build) must not bind a server or probe a port unless the same file takes the port from the
 * protocol (`serves`, `run`, `claim`, `claimOrLeave`, `modulePort`, `anyPortOrLeave`, `free`), and a
 * Vite config must use `serves()`. Node-only, and it writes nothing. Design notes: docs/serving.md.
 */
export interface ServingCheck {
    /** The module directory. */
    module: string;
    /** Why the module fails. Empty is a pass. */
    failures: string[];
}
/** One file's verdict. Pure. */
export declare function bindsItsOwnWay(text: string): boolean;
/** The checks on what was read. Pure. */
export declare function checkServingSources(module: string, sources: readonly {
    path: string;
    text: string;
}[]): ServingCheck;
/** One module directory, read and checked. */
export declare function checkModuleServing(dir: string): ServingCheck;
/** What a person is told. */
export declare function saidServing(check: ServingCheck): string;
