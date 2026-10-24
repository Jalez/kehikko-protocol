import { z } from 'zod';
/**
 * A module's SERVER asking the host a question (2.19.0): the same answers its page gets through the
 * frame, for the process with no frame — its MCP door, a job it runs. Shapes only; the asking is
 * `askHost` in `/serve`. Design notes: docs/server-ask.md.
 *
 * The host answers a module, never a program that says it is one. A question carries a PASS the
 * module's server minted for it, and the host asks the module at its REGISTERED origin
 * (`SERVER_PASS_PATH`) whether it minted that pass before it looks at anything else: only the
 * process serving there can say yes. Then the call is held to the module's manifest exactly as a
 * page's is (`METHODS`, `declares.uses`), and answered from the same material.
 */
/** The host's route: `POST /host/server-ask` with `serverAskSchema`, answered `serverAskResult`. Programs on this machine. */
export declare const SERVER_ASK_PATH = "/host/server-ask";
/**
 * The module's route the host asks: `GET /api/kehikot/server-pass?pass=<pass>`, answered
 * `serverPassResult`. A pass is good once, for `LIMITS.SERVER_PASS_MS`. The protocol's doors answer
 * it for every module (`doorsFetch`, `doorsHandler`); a module mounts nothing.
 */
export declare const SERVER_PASS_PATH = "/api/kehikot/server-pass";
/**
 * The methods a module's server may ask: reads of the host's material that need no frame. A method
 * that writes into a canvas, or waits on a person, is its page's to ask. Grows by an entry here.
 */
export declare const SERVER_METHODS: readonly ["tracker.get", "tracker.columns", "traffic.read", "traffic.note"];
export type ServerMethod = (typeof SERVER_METHODS)[number];
/**
 * The server methods that are about one project, and so name it. The traffic methods (2.20.0) are
 * about this computer, and a question about them names no project.
 */
export declare const SERVER_PROJECT_METHODS: readonly ServerMethod[];
/** Whether a question with this method has to name its project. */
export declare const needsProject: (method: string) => boolean;
/** A pass a module's server mints for one question: 32 to 64 URL-safe characters. */
export declare const SERVER_PASS: RegExp;
/**
 * One question. `module` is who asks, `pass` what proves it, `project` the folder it is about (a
 * project the host holds, or it is refused), and `method` and `params` the call as a page would make
 * it — held to `methodParams[method]`.
 */
export declare const serverAskSchema: z.ZodEffects<z.ZodObject<{
    module: z.ZodString;
    pass: z.ZodString;
    /** Required for `SERVER_PROJECT_METHODS`; absent for a question about this computer (2.20.0). */
    project: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    method: z.ZodEnum<["tracker.get", "tracker.columns", "traffic.read", "traffic.note"]>;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    params: Record<string, unknown>;
    module: string;
    method: "tracker.get" | "tracker.columns" | "traffic.read" | "traffic.note";
    pass: string;
    project?: string | undefined;
}, {
    module: string;
    method: "tracker.get" | "tracker.columns" | "traffic.read" | "traffic.note";
    pass: string;
    params?: Record<string, unknown> | undefined;
    project?: string | undefined;
}>, {
    params: Record<string, unknown>;
    module: string;
    method: "tracker.get" | "tracker.columns" | "traffic.read" | "traffic.note";
    pass: string;
    project?: string | undefined;
}, {
    module: string;
    method: "tracker.get" | "tracker.columns" | "traffic.read" | "traffic.note";
    pass: string;
    params?: Record<string, unknown> | undefined;
    project?: string | undefined;
}>;
export type ServerAsk = z.infer<typeof serverAskSchema>;
/** What the module answers about a pass: whether it minted it (and has now spent it). */
export declare const serverPassResult: z.ZodObject<{
    ok: z.ZodLiteral<true>;
    minted: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    ok: true;
    minted: boolean;
}, {
    ok: true;
    minted: boolean;
}>;
export type ServerPassResult = z.infer<typeof serverPassResult>;
/**
 * Why a host would not take a question, beside `reason: 'failed'`. `module`: no module is registered
 * under that id. `pass`: the module at its registered origin did not vouch for the pass (it is not
 * running there, it is older than 2.19.0, or the question is not its). `grant`: its manifest does not
 * ask for the method's capability. `project`: the host holds no project at that folder.
 */
export declare const SERVER_ASK_REFUSALS: readonly ["module", "pass", "grant", "project"];
export type ServerAskRefusal = (typeof SERVER_ASK_REFUSALS)[number];
/**
 * The host's answer: the method's answer as a page would get it (`data`, held to `methodResults`),
 * or a refusal — a `reason` from `responseFailureReasons`, a sentence, and `refused` when it was who
 * asked or about what, rather than the call.
 */
export declare const serverAskResult: z.ZodDiscriminatedUnion<"ok", [z.ZodObject<{
    ok: z.ZodLiteral<true>;
    data: z.ZodUnknown;
}, "strip", z.ZodTypeAny, {
    ok: true;
    data?: unknown;
}, {
    ok: true;
    data?: unknown;
}>, z.ZodObject<{
    ok: z.ZodLiteral<false>;
    reason: z.ZodEnum<["unknown-module", "unknown-method", "failed"]>;
    error: z.ZodString;
    refused: z.ZodCatch<z.ZodOptional<z.ZodEnum<["module", "pass", "grant", "project"]>>>;
}, "strip", z.ZodTypeAny, {
    error: string;
    reason: "failed" | "unknown-module" | "unknown-method";
    ok: false;
    refused?: "project" | "module" | "pass" | "grant" | undefined;
}, {
    error: string;
    reason: "failed" | "unknown-module" | "unknown-method";
    ok: false;
    refused?: unknown;
}>]>;
export type ServerAskResult = z.infer<typeof serverAskResult>;
