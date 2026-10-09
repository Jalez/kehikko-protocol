/**
 * Who may frame a module: the `frame-ancestors` a module's page should send. Read in order:
 * `KEHIKOT_ORIGINS` (space-separated list), `KEHIKOT_ORIGIN` (one), then the defaults. A single
 * origin is the whole answer, not an addition to the defaults; `also` is always an addition.
 * Design notes: docs/serving.md.
 */
/** Every origin a host on this machine frames a module from, unless told otherwise. */
export declare const DEFAULT_FRAME_ORIGINS: readonly ["http://127.0.0.1:4181", "http://localhost:4181", "http://127.0.0.1:4170", "http://localhost:4170", "tauri://localhost", "http://tauri.localhost", "https://tauri.localhost"];
/**
 * The origins that may frame this module, from the environment a host started it in, and `also`:
 * origins the module itself names (a development harness on a port of its own). Pure.
 */
export declare function frameOrigins(env?: Record<string, string | undefined>, also?: readonly string[]): string[];
/** The whole `content-security-policy` value: the module itself, and the hosts that may frame it. */
export declare function frameAncestors(env?: Record<string, string | undefined>, also?: readonly string[]): string;
