/**
 * The host that started this module, and the doors an agent session is handed on it (2.95.0).
 *
 * An agent module (one that starts agent sessions and writes them a door config: Claude Code's
 * `--mcp-config`, Codex's `-c mcp_servers…`, an `opencode.json`, …) hands every session the Kehikot
 * doors of its place. Three rules keep those entries alive and keep another host out of them:
 *
 *  1. **Only the host that started the module.** `startingHost(env)` is that host's origin: what it
 *     put in `KEHIKOT_HOST` when it spawned the module, or, from a host older than 2.95.0, the first
 *     loopback `http(s)` origin of `KEHIKOT_ORIGINS` / `KEHIKOT_ORIGIN`. Never an origin a page
 *     greeted from, a request came from, or a door list named. The module asks that host, and no
 *     other, for a session's doors (`POST /host/place`), its places and its projects.
 *  2. **Only its stable doors.** Every entry is `doorUrl(host, module, token)`: the host's own door at
 *     `<host>/mcp`, a module's at `<host>/m/<id>/mcp`, each with the session's place token. Never a
 *     module's own port, which changes on every restart that finds it taken; never another host.
 *     `stableDoors` rebuilds a host's answer that way, so a door list from any source can only ever
 *     name the starting host. `doorConfigProblems` is the conformance check over a written config.
 *  3. **Its own files.** A session's kept files are named for the host as well as the token
 *     (`keptFolderName`), so a scratch host running a copy of the module over a copy of the
 *     project (which carries the same conversation tokens) writes beside the real ones, never over
 *     them.
 *
 * Pure apart from hashing. Design notes: docs/serving.md ("The starting host").
 */
/** What a host puts in the environment of a module it starts: its own origin (2.95.0). */
export declare const HOST_ENV = "KEHIKOT_HOST";
/** The module id a host's own door is listed under in a session's doors (`POST /host/place`). */
export declare const HOST_DOOR_MODULE = "kehikko";
/** The path a module's stable program address starts with on its host: `/m/<id>`. */
export declare const MODULE_PATH_PREFIX = "/m/";
/** An `http(s)` loopback origin, as an origin (no path), or null. */
export declare function loopbackOrigin(value: string | undefined | null): string | null;
/**
 * The origin of the host that started this module, from its start environment alone; null for a
 * module nobody started (run by hand, with neither variable set). `KEHIKOT_HOST` first (a 2.95.0
 * host sets it on every module it starts); from an older host, the first loopback `http(s)` origin
 * of `KEHIKOT_ORIGINS`, then of `KEHIKOT_ORIGIN` — a host puts its own page origins before the
 * defaults there. The defaults (`DEFAULT_FRAME_ORIGINS`) are never a starting host.
 */
export declare function startingHost(env?: Record<string, string | undefined>): string | null;
/**
 * The hosts a module's server asks anything of (a place, a project, a pass, a service): the host
 * that started it and no other, when it said so (`KEHIKOT_HOST`) — so a scratch host an agent runs,
 * or a development page on a default port, is never asked by a module the person's host started.
 * Under a host older than 2.95.0, or nobody, the loopback `http(s)` origins of `frameOrigins`, in
 * order, as before.
 */
export declare function askedHosts(env?: Record<string, string | undefined>): string[];
/** A door's URL on `host`: the host's own (`module` is `HOST_DOOR_MODULE`) or a module's stable one, with the place token when given. */
export declare function doorUrl(host: string, module: string, token?: string | null, path?: string): string;
/** A door as a session is handed it. */
export interface HandedDoor {
    module: string;
    name: string;
    url: string;
    transport: 'http' | 'sse';
}
/**
 * Which module a door URL names, and the path of the door at that module: from the stable
 * address (`/m/<id>[@<tag>]/<path>`, any origin) or, for `module` given, a module's own port
 * (`/<path>`). The host's own door is `/mcp` on an origin with no `/m/` path, and needs `module`
 * to be `HOST_DOOR_MODULE`. Null when the URL names neither.
 */
export declare function doorTarget(url: string, module?: string): {
    module: string;
    tag: string | null;
    path: string;
} | null;
/**
 * A door rebuilt on the starting host: whatever address it came with (another host, a module's
 * own port, the stable one), it leaves as `doorUrl(host, module, token, path)`. Null for a door
 * that names no module this can place — dropped rather than written somewhere it might not answer.
 */
export declare function stableDoor<T extends HandedDoor>(door: T, host: string, token: string | null): T | null;
/** Every door rebuilt on the starting host (`stableDoor`), the ones that name nothing dropped, the first of each name kept. */
export declare function stableDoors<T extends HandedDoor>(doors: readonly T[], host: string, token: string | null): T[];
/** Whether `url` is one of `host`'s stable doors: on that origin, at `/mcp` (the host's own) or under `/m/<id>/`. */
export declare function isStableDoor(url: string, host: string): boolean;
/**
 * The conformance check over a door config a module wrote, as JSON (`{ mcpServers: { name: { url } } }`,
 * Claude Code's and the shape most agents read) or as a list of `{ name, url }`: one sentence per entry
 * that is not a stable door of `host`. Empty is a pass. An entry with no URL (a local command) is not
 * a door and is not judged.
 */
export declare function doorConfigProblems(config: unknown, host: string): string[];
/**
 * The name of a session's kept folder (its door config and other files kept while it may be woken):
 * `session-` and 24 hex characters of a hash of the starting host and the token, so the same token
 * under another host (a copy of the project opened by a scratch host) names another folder.
 * `null` host: a module nobody started; its folders are named as before 2.95.0 (`legacyKeptFolderName`).
 */
export declare function keptFolderName(token: string, host: string | null): string;
/** The kept folder name before 2.95.0: the token alone. A session started then names it in its saved options. */
export declare function legacyKeptFolderName(token: string): string;
/** The place token on a door URL, or null. */
export declare function tokenOnDoor(url: string): string | null;
