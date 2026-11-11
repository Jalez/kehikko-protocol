import { z } from 'zod';
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
export declare const SERVICE_NAME: RegExp;
export declare const serviceName: z.ZodString;
/** The kinds of heavy work, each one word. A consumer classifies what it sees into one; a provider says which it takes. */
export declare const WORK_KINDS: readonly ["test", "typecheck", "build", "install"];
export type WorkKind = (typeof WORK_KINDS)[number];
/** Where the command goes in a run line. */
export declare const WORK_COMMAND = "{command}";
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
export declare const workQueueSchema: z.ZodObject<{
    name: z.ZodEffects<z.ZodString, string, string>;
    run: z.ZodEffects<z.ZodObject<Record<"build" | "test" | "typecheck" | "install", z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>, "strip", z.ZodTypeAny, {
        build?: string | undefined;
        test?: string | undefined;
        typecheck?: string | undefined;
        install?: string | undefined;
    }, {
        build?: string | undefined;
        test?: string | undefined;
        typecheck?: string | undefined;
        install?: string | undefined;
    }>, {
        build?: string | undefined;
        test?: string | undefined;
        typecheck?: string | undefined;
        install?: string | undefined;
    }, {
        build?: string | undefined;
        test?: string | undefined;
        typecheck?: string | undefined;
        install?: string | undefined;
    }>;
    cli: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    tool: z.ZodOptional<z.ZodString>;
    direct: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    marks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    run: {
        build?: string | undefined;
        test?: string | undefined;
        typecheck?: string | undefined;
        install?: string | undefined;
    };
    marks: string[];
    tool?: string | undefined;
    cli?: string | undefined;
    direct?: string | undefined;
}, {
    name: string;
    run: {
        build?: string | undefined;
        test?: string | undefined;
        typecheck?: string | undefined;
        install?: string | undefined;
    };
    tool?: string | undefined;
    cli?: string | undefined;
    direct?: string | undefined;
    marks?: string[] | undefined;
}>;
export type WorkQueue = z.infer<typeof workQueueSchema>;
/**
 * Every service this protocol gives a descriptor's shape to, with what it means. Grows by an entry.
 * Names a module may say but this package does not know are carried as they came (`servicesSchema`).
 */
export declare const SERVICES: {
    readonly 'work.queue': {
        readonly says: "Runs heavy work — test suites, typechecks, builds, big installs — in turn, so sessions on this computer do not collide.";
        readonly schema: z.ZodObject<{
            name: z.ZodEffects<z.ZodString, string, string>;
            run: z.ZodEffects<z.ZodObject<Record<"build" | "test" | "typecheck" | "install", z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>, "strip", z.ZodTypeAny, {
                build?: string | undefined;
                test?: string | undefined;
                typecheck?: string | undefined;
                install?: string | undefined;
            }, {
                build?: string | undefined;
                test?: string | undefined;
                typecheck?: string | undefined;
                install?: string | undefined;
            }>, {
                build?: string | undefined;
                test?: string | undefined;
                typecheck?: string | undefined;
                install?: string | undefined;
            }, {
                build?: string | undefined;
                test?: string | undefined;
                typecheck?: string | undefined;
                install?: string | undefined;
            }>;
            cli: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            tool: z.ZodOptional<z.ZodString>;
            direct: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
            marks: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            run: {
                build?: string | undefined;
                test?: string | undefined;
                typecheck?: string | undefined;
                install?: string | undefined;
            };
            marks: string[];
            tool?: string | undefined;
            cli?: string | undefined;
            direct?: string | undefined;
        }, {
            name: string;
            run: {
                build?: string | undefined;
                test?: string | undefined;
                typecheck?: string | undefined;
                install?: string | undefined;
            };
            tool?: string | undefined;
            cli?: string | undefined;
            direct?: string | undefined;
            marks?: string[] | undefined;
        }>;
    };
};
export type Service = keyof typeof SERVICES;
export declare const SERVICE_NAMES: Service[];
/** What each known service's descriptor is. */
export type ServiceDescriptor<S extends Service> = z.infer<(typeof SERVICES)[S]['schema']>;
/** The first service: a module that runs heavy work in turn. */
export declare const WORK_QUEUE = "work.queue";
/**
 * `services` in a manifest: each service this module provides, by name, and its descriptor. A known
 * service's descriptor must parse with its schema, or the whole field is dropped (the manifest still
 * runs); an unknown service's is carried as it came.
 */
export declare const servicesSchema: z.ZodEffects<z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodUnknown>, Record<string, unknown>, Record<string, unknown>>, Record<string, unknown>, Record<string, unknown>>;
export type Services = z.infer<typeof servicesSchema>;
/** A known service's descriptor, parsed; null when it is absent or does not parse. */
export declare function serviceDescriptor<S extends Service>(service: S, descriptor: unknown): ServiceDescriptor<S> | null;
/** What a manifest says it provides: the names of `services`, `[]` when none. */
export declare function servicesOf(manifest: {
    services?: Record<string, unknown> | null;
} | null | undefined): string[];
/**
 * `services.find`'s params, from a module's server or page: who provides this service here. `kehikko`
 * (a key, with the project a server question names or the page stands in) asks also whether each one is
 * placed there.
 */
export declare const servicesFindParams: z.ZodObject<{
    service: z.ZodString;
    kehikko: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    service: string;
    kehikko?: string | undefined;
}, {
    service: string;
    kehikko?: string | undefined;
}>;
/** One provider: its id, its registered name, its descriptor as its manifest says it, and whether it is placed on the kehikko asked about (null when none was). */
export declare const serviceProviderSchema: z.ZodObject<{
    module: z.ZodString;
    name: z.ZodString;
    descriptor: z.ZodDefault<z.ZodNullable<z.ZodUnknown>>;
    placed: z.ZodDefault<z.ZodNullable<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    module: string;
    placed: boolean | null;
    descriptor?: unknown;
}, {
    name: string;
    module: string;
    descriptor?: unknown;
    placed?: boolean | null | undefined;
}>;
export type ServiceProvider = z.infer<typeof serviceProviderSchema>;
/**
 * `services.find`'s answer: the modules that provide the service and are IN USE on this host — registered
 * here and answering, as its last look at the modules found them — placed ones first. Empty when there
 * is none.
 */
export declare const servicesFindResult: z.ZodObject<{
    providers: z.ZodArray<z.ZodObject<{
        module: z.ZodString;
        name: z.ZodString;
        descriptor: z.ZodDefault<z.ZodNullable<z.ZodUnknown>>;
        placed: z.ZodDefault<z.ZodNullable<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        module: string;
        placed: boolean | null;
        descriptor?: unknown;
    }, {
        name: string;
        module: string;
        descriptor?: unknown;
        placed?: boolean | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    providers: {
        name: string;
        module: string;
        placed: boolean | null;
        descriptor?: unknown;
    }[];
}, {
    providers: {
        name: string;
        module: string;
        descriptor?: unknown;
        placed?: boolean | null | undefined;
    }[];
}>;
export type ServicesFindResult = z.infer<typeof servicesFindResult>;
/** The first provider of a known service whose descriptor parses, with it; null when none does. */
export declare function providerOf<S extends Service>(service: S, providers: readonly ServiceProvider[] | null | undefined): {
    module: string;
    name: string;
    placed: boolean | null;
    descriptor: ServiceDescriptor<S>;
} | null;
/** The work queue's run line for one kind of work with the command in it; null when it does not take that kind. */
export declare function workRunLine(queue: WorkQueue, kind: WorkKind, command: string): string | null;
/**
 * How to hand one command to a work queue, in one sentence built only from its descriptor: "Run it
 * through Queue: `… -- vitest run` from the same folder, or with the queue_run tool." Null when it does
 * not take that kind of work.
 */
export declare function workQueueSaid(queue: WorkQueue, kind: WorkKind, command: string): string | null;
