import { z } from 'zod';
import { MODULE_ID } from './ids.js';
import { LIMITS } from './limits.js';
import { declinedFields, responseFailureReasons } from './messages.js';
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
export const SERVER_ASK_PATH = '/host/server-ask';
/**
 * The module's route the host asks: `GET /api/kehikot/server-pass?pass=<pass>`, answered
 * `serverPassResult`. A pass is good once, for `LIMITS.SERVER_PASS_MS`. The protocol's doors answer
 * it for every module (`doorsFetch`, `doorsHandler`); a module mounts nothing.
 */
export const SERVER_PASS_PATH = '/api/kehikot/server-pass';
/**
 * The methods a module's server may ask: reads of the host's material that need no frame. A method
 * that writes into a canvas, or waits on a person, is its page's to ask. Grows by an entry here.
 * 2.21.0 adds the epic's own material — `epics.list`, `epic.get`, `steps.list`, `parts.get` and
 * `dispositions.get` — so that no module's server reads the host's files or another module's.
 */
export const SERVER_METHODS = [
    'tracker.get',
    'tracker.columns',
    'traffic.read',
    'traffic.note',
    'epics.list',
    'epic.get',
    'steps.list',
    'parts.get',
    'dispositions.get',
];
/**
 * The server methods that are about one project, and so name it. The traffic methods (2.20.0) are
 * about this computer, and a question about them names no project. Every 2.21.0 method is a project's.
 */
export const SERVER_PROJECT_METHODS = [
    'tracker.get',
    'tracker.columns',
    'epics.list',
    'epic.get',
    'steps.list',
    'parts.get',
    'dispositions.get',
];
/** Whether a question with this method has to name its project. */
export const needsProject = (method) => SERVER_PROJECT_METHODS.includes(method);
/** A pass a module's server mints for one question: 32 to 64 URL-safe characters. */
export const SERVER_PASS = /^[A-Za-z0-9_-]{32,64}$/;
/** The project a question is about: its absolute folder, as a door is handed it. */
const projectFolder = z
    .string()
    .min(1)
    .max(LIMITS.PATH)
    .refine((path) => path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path), { message: 'the project is its absolute folder' });
/**
 * One question. `module` is who asks, `pass` what proves it, `project` the folder it is about (a
 * project the host holds, or it is refused), and `method` and `params` the call as a page would make
 * it — held to `methodParams[method]`.
 */
export const serverAskSchema = z
    .object({
    module: z.string().regex(MODULE_ID),
    pass: z.string().regex(SERVER_PASS),
    /** Required for `SERVER_PROJECT_METHODS`; absent for a question about this computer (2.20.0). */
    project: projectFolder.optional(),
    method: z.enum(SERVER_METHODS),
    params: z.record(z.string(), z.unknown()).default({}),
})
    .refine((ask) => ask.project !== undefined || !needsProject(ask.method), {
    message: 'this question is about a project, so it names the project',
    path: ['project'],
});
/** What the module answers about a pass: whether it minted it (and has now spent it). */
export const serverPassResult = z.object({ ok: z.literal(true), minted: z.boolean() });
/**
 * Why a host would not take a question, beside `reason: 'failed'`. `module`: no module is registered
 * under that id. `pass`: the module at its registered origin did not vouch for the pass (it is not
 * running there, it is older than 2.19.0, or the question is not its). `grant`: its manifest does not
 * ask for the method's capability. `project`: the host holds no project at that folder.
 */
export const SERVER_ASK_REFUSALS = ['module', 'pass', 'grant', 'project'];
/**
 * The host's answer: the method's answer as a page would get it (`data`, held to `methodResults`),
 * or a refusal — a `reason` from `responseFailureReasons`, a sentence, and `refused` when it was who
 * asked or about what, rather than the call.
 */
export const serverAskResult = z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), data: z.unknown() }),
    z.object({
        ok: z.literal(false),
        reason: z.enum(responseFailureReasons),
        error: z.string().max(LIMITS.REASON),
        refused: z.enum(SERVER_ASK_REFUSALS).optional().catch(undefined),
        /** 2.22.0. `host-too-old` for a method this host's server does not answer yet. See `declinedFields`. */
        ...declinedFields,
    }),
]);
