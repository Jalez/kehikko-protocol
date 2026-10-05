/**
 * Who may frame a module: the `frame-ancestors` a module's page should send.
 *
 * ## Why a list
 *
 * A module used to read one origin, `ROADMAP_ORIGIN`, and fall back to the
 * development page at `http://127.0.0.1:4181`. One host, one origin. But the
 * same module is framed by more than one host on one machine: the development
 * page on 4181, the desktop app's page on 4170, and the desktop app's own
 * window, whose origin is `tauri://localhost` (or `http(s)://tauri.localhost`
 * on some platforms). A module that allows one of them draws blank in the
 * others, and the only trace is a line in a console nobody has open.
 *
 * So a host passes every origin it may be framed from, space-separated, in
 * `KEHIKOT_ORIGINS`, to every module it starts. A module started by hand gets
 * `DEFAULT_FRAME_ORIGINS`, which is every origin a host on this machine serves
 * its page from by default.
 *
 * ## The order things are read in
 *
 * `KEHIKOT_ORIGINS` (a list), then `KEHIKOT_ORIGIN` (one), then
 * `ROADMAP_ORIGIN` (one, its name before the rename), then the defaults. A
 * single origin is honoured as the whole answer rather than added to the
 * defaults, because somebody who set it meant exactly that host.
 */
/** Every origin a host on this machine frames a module from, unless told otherwise. */
export declare const DEFAULT_FRAME_ORIGINS: readonly ["http://127.0.0.1:4181", "http://localhost:4181", "http://127.0.0.1:4170", "http://localhost:4170", "tauri://localhost", "http://tauri.localhost", "https://tauri.localhost"];
/** The origins that may frame this module, from the environment a host started it in. Pure. */
export declare function frameOrigins(env?: Record<string, string | undefined>): string[];
/** The whole `content-security-policy` value: the module itself, and the hosts that may frame it. */
export declare function frameAncestors(env?: Record<string, string | undefined>): string;
//# sourceMappingURL=origins.d.ts.map