import { z } from 'zod';
import { type DoorPlace } from '../door.js';
/**
 * Asking the host one question a module's SERVER has: is this folder a project a person added here?
 * A page tells its server a path, and the server has no other way to know the path is one the host
 * handed out. Loopback only, one path in and one answer out, and failing closed: no answer is "no".
 * Since 2.3.0 the answer also says the project's id, and where a project that USED to be at the
 * folder is now (`movedTo`). Since 2.21.1 a "yes" is kept for a while (`keepMs`) while the same folder
 * is at the path, so a page that polls does not ask the host on every request. Design notes:
 * docs/serving.md.
 */
/** The host's route, `GET /host/is-project?path=<absolute folder>`, answered to programs on this machine. */
export declare const IS_PROJECT_PATH = "/host/is-project";
/**
 * What the host answers: `{ ok: true, project: boolean }`, and since 2.3.0 optionally
 * - `id`: the project's id (`PROJECT_ID`) — of the project at the folder, or, with `movedTo`, of the
 *   project that was there;
 * - `movedTo`: the folder is not a project, but it is a path a project HAD, and that project is now at
 *   this absolute folder;
 * - `missing`: the folder is a project the host holds whose folder is not on disk now;
 * - `why`: a sentence for a person.
 * A 2.2 host sends none of them. A malformed optional field is dropped; anything without `ok: true`
 * and `project` is not an answer.
 */
export declare const isProjectResult: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    project: z.ZodBoolean;
    id: z.ZodCatch<z.ZodOptional<z.ZodString>>;
    movedTo: z.ZodCatch<z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>>;
    missing: z.ZodCatch<z.ZodOptional<z.ZodBoolean>>;
    why: z.ZodCatch<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    project: boolean;
    ok: true;
    id?: string | undefined;
    missing?: boolean | undefined;
    why?: string | undefined;
    movedTo?: string | undefined;
}, {
    project: boolean;
    ok: true;
    id?: unknown;
    missing?: unknown;
    why?: unknown;
    movedTo?: unknown;
}>;
export type IsProjectResult = z.infer<typeof isProjectResult>;
/** The URLs `hostProject` asks, in order, for one folder. Pure; exported for tests and for a module that wants to ask its own way. */
export declare function hostIsProjectUrls(folder: string, env?: Record<string, string | undefined>): string[];
export interface HostHasProjectOptions {
    env?: Record<string, string | undefined>;
    /** How long each origin gets, in ms. Default `LIMITS.HOST_ASK_MS`. */
    timeoutMs?: number;
    /**
     * How long a `project: true` is kept, in ms (2.21.1). Default `LIMITS.HOST_PROJECT_KEEP_MS`; 0 asks
     * the host every time. Only `hostProject`, `hostHasProject` and `resolveDoorProject` read it.
     */
    keepMs?: number;
    /** Injected by the tests. */
    fetch?: typeof fetch;
    /** The clock, in ms. Injected by the tests. */
    now?: () => number;
}
/**
 * What the host said about one folder (2.3.0). `project: true`: the host holds it, at `path` (the
 * folder as asked, trimmed), with its `id` when the host sent one. `project: false`: it does not;
 * `movedTo` and `id` when the folder is a path a project had, `missing` when the host holds it but
 * the folder is gone, `why` a sentence (the host's, or "No Kehikot host answered.").
 */
export type HostProject = {
    project: true;
    path: string;
    id?: string;
} | {
    project: false;
    movedTo?: string;
    id?: string;
    missing?: boolean;
    why?: string;
};
/** `why` when no origin gave an answer of the right shape. */
export declare const NO_HOST_ANSWERED = "No Kehikot host answered.";
/**
 * Forgets every kept answer (2.21.1): the next `hostProject` of each folder asks the host. For a
 * module that has heard, its own way, that a project was removed or moved.
 */
export declare function forgetHostProjects(): void;
/**
 * What the host says about `folder` (2.3.0). Asks each origin in `KEHIKOT_ORIGINS` (the same list
 * `frameOrigins` reads; non-loopback and `tauri:` entries are skipped) until one says `project:
 * true`. A `project: false` that names `movedTo` is kept over a bare one. Fails closed: a relative
 * path, no answer, a refusal, a slow host or a reply of another shape is `project: false`. Never throws.
 *
 * Since 2.21.1 a `project: true` is KEPT, for `keepMs` (`LIMITS.HOST_PROJECT_KEEP_MS`, 60 s), and
 * given again without asking — but only while the very folder the host vouched for is still at the
 * path (same device and inode). So a move is followed at once: the path is empty, or holds another
 * folder, and the host is asked, which says `movedTo`. An answer that puts the same project id
 * anywhere else, or says that id moved, drops what was kept for it. A "no" is never kept: a project
 * added a moment ago is a project at once. Asks that arrive together while one is on its way share
 * it. What is kept is a "yes" for a path the host might since have dropped (a project REMOVED,
 * folder left as it was), for at most `keepMs`; `forgetHostProjects()` drops everything.
 */
export declare function hostProject(folder: string, options?: HostHasProjectOptions): Promise<HostProject>;
/**
 * Whether the host holds `folder` as a project: `(await hostProject(folder)).project`. True only
 * when an origin says `project: true`; a former path (`movedTo`) is `false`. Never throws.
 */
export declare function hostHasProject(folder: string, options?: HostHasProjectOptions): Promise<boolean>;
/**
 * The project a door call is about, as the host has it (2.3.0). `path` is the folder to work on — use
 * it, never the argument; `movedFrom` is set when the argument was a former path the door followed,
 * and the door then adds `DOOR_PROJECT_SAYS.followed(movedFrom, path)` to its answer.
 */
export type DoorProject = {
    ok: true;
    path: string;
    id?: string;
    movedFrom?: string;
} | {
    ok: false;
    reason: 'unnamed' | 'not-project' | 'moved';
    why: string;
    movedTo?: string;
};
/**
 * Resolves the project a door was handed (2.3.0): a tool call's arguments (read with `doorContext`,
 * so `projectPath` still counts) or the folder itself. Asks the host; when the folder is a path a
 * project had, follows `movedTo` ONCE — the new path must answer `project: true` with the same id —
 * and otherwise refuses in `DOOR_PROJECT_SAYS`'s words. Never throws. Server-side only, like
 * `hostProject`.
 */
export declare function resolveDoorProject(input: Record<string, unknown> | string, options?: HostHasProjectOptions): Promise<DoorProject>;
/**
 * The host's route for a session's place: `GET /host/place?kehikot-place=<token>` answers
 * `placeResult` (2.4.0). Programs on this machine; a module's SERVER asks it, never its page.
 */
export declare const PLACE_PATH = "/host/place";
/**
 * The place token a door request carries, or null: the `kehikot-place` query parameter
 * (`PLACE_PARAM`), read from what a door has — the query (`DoorsOptions.answer` is handed it), a
 * whole URL, or a request with a `url`. A value that is not spelled like a token is null.
 */
export declare function placeTokenOf(input: URLSearchParams | string | {
    url?: string;
} | null | undefined): string | null;
/** The URLs `hostPlace` asks, in order. Pure; exported for tests. */
export declare function hostPlaceUrls(token: string, env?: Record<string, string | undefined>): string[];
/**
 * The place the host minted `token` for, or null — no such token, no host answering, or an answer of
 * another shape (2.4.0). Asks each origin of `KEHIKOT_ORIGINS` until one knows the token. Never throws.
 */
export declare function hostPlace(token: string, options?: HostHasProjectOptions): Promise<DoorPlace | null>;
/**
 * The session's place for one door request (2.4.0): the token out of the request (`placeTokenOf`),
 * then `hostPlace`. Null when the call carried no token or the host does not know it — and the door
 * then answers exactly as it did before 2.4.0. Combine with `placeDefaults(args, place)` and say
 * `DOOR_PLACE_SAYS.used(from, place)` when anything was taken from it.
 */
export declare function resolveDoorPlace(input: URLSearchParams | string | {
    url?: string;
} | null | undefined, options?: HostHasProjectOptions): Promise<DoorPlace | null>;
