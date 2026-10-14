import { z } from 'zod';
/**
 * Asking the host one question a module's SERVER has: is this folder a project a person added here?
 * A page tells its server a path, and the server has no other way to know the path is one the host
 * handed out. Loopback only, one path in and one word out, and failing closed: no answer is "no".
 * Design notes: docs/serving.md.
 */
/** The host's route, `GET /host/is-project?path=<absolute folder>`, answered to programs on this machine. */
export declare const IS_PROJECT_PATH = "/host/is-project";
/** What the host answers: `{ ok: true, project: boolean }`. Anything else is not an answer. */
export declare const isProjectResult: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    project: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    project: boolean;
    ok: true;
}, {
    project: boolean;
    ok: true;
}>;
export type IsProjectResult = z.infer<typeof isProjectResult>;
/** The URLs `hostHasProject` asks, in order, for one folder. Pure; exported for tests and for a module that wants to ask its own way. */
export declare function hostIsProjectUrls(folder: string, env?: Record<string, string | undefined>): string[];
export interface HostHasProjectOptions {
    env?: Record<string, string | undefined>;
    /** How long each origin gets, in ms. Default `LIMITS.HOST_ASK_MS`. */
    timeoutMs?: number;
    /** Injected by the tests. */
    fetch?: typeof fetch;
}
/**
 * Whether the host holds `folder` as a project. Asks each origin in `KEHIKOT_ORIGINS` (the same
 * list `frameOrigins` reads; non-loopback and `tauri:` entries are skipped) until one says
 * `project: true`. True only then: a relative path, no answer, a refusal, a
 * slow host or a reply of another shape is `false`. Never throws.
 */
export declare function hostHasProject(folder: string, options?: HostHasProjectOptions): Promise<boolean>;
