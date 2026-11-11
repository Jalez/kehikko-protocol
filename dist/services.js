import { z } from 'zod';
import { LIMITS } from './limits.js';
import { MODULE_ID } from './ids.js';
/**
 * 2.81.0. SERVICES: one module provides a service, others consume it, and neither names the other.
 *
 * - **The provider** says, at the top level of its manifest, which services it provides and, for each,
 *   a DESCRIPTOR in the shape that service's schema gives (`services: { 'work.queue': {...} }`). Its own
 *   program paths, tool names and words live only there.
 * - **The host** answers a consumer's `services.find { service }` (under `services:read`) with the
 *   modules that provide it and are in use, each with its descriptor, and whether it is placed on the
 *   kehikko asked about. It names no module of its own accord.
 * - **The consumer** reads a descriptor with the service's schema (`serviceDescriptor`), and with no
 *   provider, or none whose descriptor parses, does without. It never hard-codes the provider's id,
 *   name, program or tools.
 *
 * A new service is an entry in `SERVICES` with its schema: nothing else changes, in the host or in the
 * wire. A host carries a service it does not know as it came. Design notes: docs/services.md.
 */
/** A service's name: lowercase words joined by dots (`work.queue`). */
export const SERVICE_NAME = /^[a-z][a-z0-9-]{0,30}(?:\.[a-z][a-z0-9-]{0,30}){0,3}$/;
export const serviceName = z.string().regex(SERVICE_NAME, 'a service name is lowercase words joined by dots');
/* ---------------------------------------------------------------- work.queue */
/** The kinds of heavy work, each one word. A consumer classifies what it sees into one; a provider says which it takes. */
export const WORK_KINDS = ['test', 'typecheck', 'build', 'install'];
/** Where the command goes in a run line. */
export const WORK_COMMAND = '{command}';
const oneLine = (max) => z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((line) => !/[\u0000-\u001f\u007f]/.test(line), { message: 'one line of text' });
/** A run line: a shell line that hands a command to the provider, with `{command}` where the command goes. */
const runLine = oneLine(LIMITS.SERVICE_LINE).refine((line) => line.includes(WORK_COMMAND), { message: 'a run line says where the command goes: {command}' });
/**
 * `work.queue`: a module that runs heavy work — test suites, typechecks, builds, big installs — in turn,
 * so that sessions on this computer do not collide.
 *
 * - `name`: what it is called where it is told about (`Queue`). A consumer says this, never its own word.
 * - `run`: for each kind of work it takes (`WORK_KINDS`), the shell line that hands it a command of that
 *   kind, `{command}` where the command goes, run from the folder the command was started in. A kind not
 *   listed is not taken.
 * - `cli`: its command-line program, as a path a shell can run, for a session whose tools are gone.
 * - `tool`: the MCP tool an agent calls instead of the shell, when it has one.
 * - `direct`: what in front of a command makes it run directly after all (`KEHIKOT_DIRECT=1`), for a
 *   guard's words.
 * - `marks`: text an ancestor's command line contains when a process is one of its own runs (its runner's
 *   wrapper line, its program's name), so a consumer that watches processes does not flag work in turn.
 */
export const workQueueSchema = z.object({
    name: oneLine(LIMITS.TITLE),
    run: z
        .object(Object.fromEntries(WORK_KINDS.map((kind) => [kind, runLine.optional()])))
        .refine((run) => Object.values(run).some(Boolean), { message: 'a work queue takes at least one kind of work' }),
    cli: oneLine(LIMITS.SERVICE_LINE).optional(),
    tool: z.string().regex(/^[A-Za-z0-9_.-]{1,64}$/).optional(),
    direct: oneLine(80).optional(),
    marks: z.array(z.string().min(3).max(LIMITS.SERVICE_LINE)).max(LIMITS.SERVICE_MARKS).default([]),
});
/* ---------------------------------------------------------------- the registry */
/**
 * Every service this protocol gives a descriptor's shape to, with what it means. Grows by an entry.
 * Names a module may say but this package does not know are carried as they came (`servicesSchema`).
 */
export const SERVICES = {
    'work.queue': {
        says: 'Runs heavy work — test suites, typechecks, builds, big installs — in turn, so sessions on this computer do not collide.',
        schema: workQueueSchema,
    },
};
export const SERVICE_NAMES = Object.keys(SERVICES);
/** The first service: a module that runs heavy work in turn. */
export const WORK_QUEUE = 'work.queue';
/**
 * `services` in a manifest: each service this module provides, by name, and its descriptor. A known
 * service's descriptor must parse with its schema, or the whole field is dropped (the manifest still
 * runs); an unknown service's is carried as it came.
 */
export const servicesSchema = z
    .record(serviceName, z.unknown())
    .refine((services) => Object.keys(services).length <= LIMITS.SERVICES, { message: `at most ${LIMITS.SERVICES} services` })
    .superRefine((services, ctx) => {
    for (const [name, descriptor] of Object.entries(services)) {
        const known = SERVICES[name];
        if (known && !known.schema.safeParse(descriptor).success)
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: [name], message: `${name}: the descriptor does not parse` });
    }
});
/** A known service's descriptor, parsed; null when it is absent or does not parse. */
export function serviceDescriptor(service, descriptor) {
    const parsed = SERVICES[service].schema.safeParse(descriptor);
    return parsed.success ? parsed.data : null;
}
/** What a manifest says it provides: the names of `services`, `[]` when none. */
export function servicesOf(manifest) {
    const services = manifest?.services;
    return services && typeof services === 'object' ? Object.keys(services) : [];
}
/* ---------------------------------------------------------------- services.find */
/**
 * `services.find`'s params, from a module's server or page: who provides this service here. `kehikko`
 * (a key, with the project a server question names or the page stands in) asks also whether each one is
 * placed there.
 */
export const servicesFindParams = z.object({
    service: serviceName,
    kehikko: z.string().regex(/^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$/).optional(),
});
/** One provider: its id, its registered name, its descriptor as its manifest says it, and whether it is placed on the kehikko asked about (null when none was). */
export const serviceProviderSchema = z.object({
    module: z.string().regex(MODULE_ID),
    name: z.string().max(LIMITS.TITLE),
    descriptor: z.unknown().nullable().default(null),
    placed: z.boolean().nullable().default(null),
});
/**
 * `services.find`'s answer: the modules that provide the service and are IN USE on this host — registered
 * here and answering, as its last look at the modules found them — placed ones first. Empty when there
 * is none.
 */
export const servicesFindResult = z.object({ providers: z.array(serviceProviderSchema).max(LIMITS.SERVICE_PROVIDERS) });
/** The first provider of a known service whose descriptor parses, with it; null when none does. */
export function providerOf(service, providers) {
    for (const one of providers ?? []) {
        const descriptor = serviceDescriptor(service, one.descriptor);
        if (descriptor)
            return { module: one.module, name: one.name, placed: one.placed, descriptor };
    }
    return null;
}
/* ---------------------------------------------------------------- work.queue, said */
/** The work queue's run line for one kind of work with the command in it; null when it does not take that kind. */
export function workRunLine(queue, kind, command) {
    const line = queue.run[kind];
    return line ? line.split(WORK_COMMAND).join(command) : null;
}
/**
 * How to hand one command to a work queue, in one sentence built only from its descriptor: "Run it
 * through Queue: `… -- vitest run` from the same folder, or with the queue_run tool." Null when it does
 * not take that kind of work.
 */
export function workQueueSaid(queue, kind, command) {
    const line = workRunLine(queue, kind, command);
    if (!line)
        return null;
    return `Run it through ${queue.name}: \`${line}\` from the same folder${queue.tool ? `, or with the ${queue.tool} tool` : ''}.`;
}
