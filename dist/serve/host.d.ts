import { z } from 'zod';
/**
 * Asking the host one question a module's SERVER has: is this folder a project a person added here?
 * A page tells its server a path, and the server has no other way to know the path is one the host
 * handed out. Loopback only, one path in and one answer out, and failing closed: no answer is "no".
 * Since 2.3.0 the answer also says the project's id, and where a project that USED to be at the
 * folder is now (`movedTo`). Design notes: docs/serving.md.
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
    /** Injected by the tests. */
    fetch?: typeof fetch;
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
 * What the host says about `folder` (2.3.0). Asks each origin in `KEHIKOT_ORIGINS` (the same list
 * `frameOrigins` reads; non-loopback and `tauri:` entries are skipped) until one says `project:
 * true`. A `project: false` that names `movedTo` is kept over a bare one. Fails closed: a relative
 * path, no answer, a refusal, a slow host or a reply of another shape is `project: false`. Never throws.
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
