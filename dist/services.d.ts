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
 * A tool on the provider's MCP door: the name only. A consumer reaches the door through the module id
 * `services.find` answered (`callServiceTool` behind `/serve`), and calls the tool by the name the
 * descriptor gives, with the arguments this file gives for that operation. It never spells the name.
 */
export declare const serviceTool: z.ZodString;
/** A route on the provider's own origin, `/api/…`: a path, never a URL, so it cannot point elsewhere. */
export declare const servicePath: z.ZodEffects<z.ZodString, string, string>;
/** Where the epic goes in a folder template (`document.proposals`'s `root`). */
export declare const SERVICE_EPIC = "{epic}";
/**
 * `document.proposals` (2.83.0): a module that keeps a document per epic — its source files under one
 * folder — and takes edits to it only as PROPOSALS the person accepts or rejects.
 *
 * - `name`: what it is called where it is told about. Say this, never your own word for it.
 * - `root`: the document's folder for an epic, relative to the project, with `{epic}` where the epic
 *   goes (`documentRoot`). Files of the document are named relative to the PROJECT by `sections`, and
 *   relative to this folder by `source` and `propose`.
 * - `main`: the document's main file, relative to `root`.
 * - `tools`, each called with `{ project, epic }` and:
 *   - `sections`: nothing more. Answers JSON `[{ path, title, level, from, to }]`, `path` relative to
 *     the project, `from`/`to` the section's byte span.
 *   - `source`: `file?` (relative to `root`, default `main`). Answers the file's text exactly as on disk.
 *   - `propose`: `file?`, `find` (exact text, once in the file), `replace`, `why` (one sentence),
 *     `agent?` (the filer's name, the same on every call), `group?` (taken together, all or none).
 *     Answers a sentence; an error result when it was not filed.
 *   - `proposals`: nothing more. Answers one line per proposal not yet answered, then the latest
 *     answered ones with their outcome.
 */
export declare const documentProposalsSchema: z.ZodObject<{
    name: z.ZodEffects<z.ZodString, string, string>;
    root: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    main: z.ZodEffects<z.ZodString, string, string>;
    tools: z.ZodObject<{
        sections: z.ZodString;
        source: z.ZodString;
        propose: z.ZodString;
        proposals: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        source: string;
        sections: string;
        propose: string;
        proposals: string;
    }, {
        source: string;
        sections: string;
        propose: string;
        proposals: string;
    }>;
}, "strip", z.ZodTypeAny, {
    name: string;
    root: string;
    main: string;
    tools: {
        source: string;
        sections: string;
        propose: string;
        proposals: string;
    };
}, {
    name: string;
    root: string;
    main: string;
    tools: {
        source: string;
        sections: string;
        propose: string;
        proposals: string;
    };
}>;
export type DocumentProposals = z.infer<typeof documentProposalsSchema>;
/**
 * `review.drafts` (2.83.0): a module that keeps the person's draft review of a pull or merge request,
 * and takes other modules' comments and a proposed review into it, beside the person's, never over.
 *
 * - `name`: what it is called where it is told about.
 * - `tools`, each called with `{ project, change }` (`change`: the pull or merge request's URL) and:
 *   - `comment`: `path`, `line`, `start_line?`, `side` (`LEFT` | `RIGHT`), `body`, `meta?` (`{ run, … }`:
 *     the run that raised it). Adds one comment to the draft.
 *   - `propose`: `run`, `summary`, `verdict` (`approve` | `comment` | `request-changes`), `door`
 *     (`one-way` | `two-way`), `uiux` (boolean), `pathToSuccess` (string[]). Proposes a review beside
 *     the person's.
 *   - `drop`: `run`. Drops that run's unsent comments, never the person's or a sent one.
 * - `send`: optional. A route on the provider's origin that sends a run's review without the person,
 *   `POST { project, change, run }`, taken only from another module's SERVER that proves who it is
 *   (`SERVICE_CALLER_HEADER` and `SERVICE_PASS_HEADER`, checked with `vouchCaller` behind `/serve`).
 *   No agent and no page can reach it. Answers 200 `{ ok: true, report }`, or a refusal with `error`.
 */
export declare const reviewDraftsSchema: z.ZodObject<{
    name: z.ZodEffects<z.ZodString, string, string>;
    tools: z.ZodObject<{
        comment: z.ZodString;
        propose: z.ZodString;
        drop: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        comment: string;
        propose: string;
        drop: string;
    }, {
        comment: string;
        propose: string;
        drop: string;
    }>;
    send: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    tools: {
        comment: string;
        propose: string;
        drop: string;
    };
    send?: string | undefined;
}, {
    name: string;
    tools: {
        comment: string;
        propose: string;
        drop: string;
    };
    send?: string | undefined;
}>;
export type ReviewDrafts = z.infer<typeof reviewDraftsSchema>;
/**
 * `checklist.holder` (2.83.0): a module that keeps the person's checklists, holds them against work
 * (a ref), and takes another module's answer to an item — never over the person's own tick.
 *
 * - `name`: what it is called where it is told about.
 * - `tools`, each called with `{ project }` and:
 *   - `list`: `checklist?`, `ref?`. With neither: one line per list, `  <id> — "<name>" (… held against
 *     <refs>)`. With `checklist`: that list, `"<name>" (<id>)` then `<n>. [<x|!|-| >] <item id> — <text>`;
 *     with `ref` too, as answered for that ref.
 *   - `create`: `name`, `agent`. Answers `"<name>" (<id>)`.
 *   - `add`: `checklist`, `text`, `agent`.
 *   - `hold`: `checklist`, `ref`, `agent`.
 *   - `check`: `checklist`, `item`, `ref`, `state` (`passed` | `failed` | `na`), `note`, `agent`.
 */
export declare const checklistHolderSchema: z.ZodObject<{
    name: z.ZodEffects<z.ZodString, string, string>;
    tools: z.ZodObject<{
        list: z.ZodString;
        create: z.ZodString;
        add: z.ZodString;
        hold: z.ZodString;
        check: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        check: string;
        hold: string;
        list: string;
        create: string;
        add: string;
    }, {
        check: string;
        hold: string;
        list: string;
        create: string;
        add: string;
    }>;
}, "strip", z.ZodTypeAny, {
    name: string;
    tools: {
        check: string;
        hold: string;
        list: string;
        create: string;
        add: string;
    };
}, {
    name: string;
    tools: {
        check: string;
        hold: string;
        list: string;
        create: string;
        add: string;
    };
}>;
export type ChecklistHolder = z.infer<typeof checklistHolderSchema>;
/**
 * `work.status` (2.83.0): a module that runs work per issue and says where each piece is.
 *
 * - `name`: what it is called where it is told about. A consumer says "<name>: <stage>".
 * - `jobs`: a route on its origin, `GET <jobs>?ref=<ref>&projectPath=<abs>`, answering `{ jobs }`
 *   (`workJobSchema` each) for that issue. Read-only, no ticket.
 */
export declare const workStatusSchema: z.ZodObject<{
    name: z.ZodEffects<z.ZodString, string, string>;
    jobs: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    name: string;
    jobs: string;
}, {
    name: string;
    jobs: string;
}>;
export type WorkStatus = z.infer<typeof workStatusSchema>;
/** One piece of work as `work.status` answers it: its id, the issue, its stage in the provider's words. */
export declare const workJobSchema: z.ZodObject<{
    id: z.ZodString;
    ref: z.ZodDefault<z.ZodCatch<z.ZodNullable<z.ZodString>>>;
    stage: z.ZodString;
    title: z.ZodCatch<z.ZodOptional<z.ZodString>>;
    column: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    updatedAt: z.ZodCatch<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    ref: string | null;
    stage: string;
    title?: string | undefined;
    updatedAt?: string | undefined;
    column?: string | null | undefined;
}, {
    id: string;
    stage: string;
    title?: unknown;
    ref?: unknown;
    updatedAt?: unknown;
    column?: unknown;
}>;
export type WorkJob = z.infer<typeof workJobSchema>;
/** The jobs in a `work.status` answer, each that parses; `[]` for anything else. */
export declare function workJobsIn(body: unknown): WorkJob[];
/** The kinds of diagram a `diagram.writer` may draw. */
export declare const DIAGRAM_KINDS: readonly ["sequence", "graph"];
/**
 * `diagram.writer` (2.83.0): a module an agent writes diagrams into, per epic, with one tool.
 *
 * - `name`: what it is called where it is told about.
 * - `tool`: the MCP tool an agent calls to write one (`{ project, epic, … }` as that tool says).
 * - `kinds`: the kinds it draws (`DIAGRAM_KINDS`).
 */
export declare const diagramWriterSchema: z.ZodObject<{
    name: z.ZodEffects<z.ZodString, string, string>;
    tool: z.ZodString;
    kinds: z.ZodArray<z.ZodEnum<["sequence", "graph"]>, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    tool: string;
    kinds: ("sequence" | "graph")[];
}, {
    name: string;
    tool: string;
    kinds: ("sequence" | "graph")[];
}>;
export type DiagramWriter = z.infer<typeof diagramWriterSchema>;
/**
 * How a module's server proves who it is to another module's server it calls for a service: its id in
 * `SERVICE_CALLER_HEADER` and a pass it minted in `SERVICE_PASS_HEADER`. The called module asks the
 * caller at its REGISTERED origin (`SERVER_PASS_PATH`) whether it minted that pass — the same proof a
 * host takes (`server-ask.ts`) — so no secret is shared and no agent or page can pass for a module.
 */
export declare const SERVICE_CALLER_HEADER = "x-kehikot-caller";
export declare const SERVICE_PASS_HEADER = "x-kehikot-pass";
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
    readonly 'document.proposals': {
        readonly says: "Keeps a document per epic and takes edits to it only as proposals the person accepts or rejects.";
        readonly schema: z.ZodObject<{
            name: z.ZodEffects<z.ZodString, string, string>;
            root: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
            main: z.ZodEffects<z.ZodString, string, string>;
            tools: z.ZodObject<{
                sections: z.ZodString;
                source: z.ZodString;
                propose: z.ZodString;
                proposals: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                source: string;
                sections: string;
                propose: string;
                proposals: string;
            }, {
                source: string;
                sections: string;
                propose: string;
                proposals: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            root: string;
            main: string;
            tools: {
                source: string;
                sections: string;
                propose: string;
                proposals: string;
            };
        }, {
            name: string;
            root: string;
            main: string;
            tools: {
                source: string;
                sections: string;
                propose: string;
                proposals: string;
            };
        }>;
    };
    readonly 'review.drafts': {
        readonly says: "Keeps the person's draft review of a pull or merge request, and takes comments and a proposed review into it beside theirs.";
        readonly schema: z.ZodObject<{
            name: z.ZodEffects<z.ZodString, string, string>;
            tools: z.ZodObject<{
                comment: z.ZodString;
                propose: z.ZodString;
                drop: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                comment: string;
                propose: string;
                drop: string;
            }, {
                comment: string;
                propose: string;
                drop: string;
            }>;
            send: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            tools: {
                comment: string;
                propose: string;
                drop: string;
            };
            send?: string | undefined;
        }, {
            name: string;
            tools: {
                comment: string;
                propose: string;
                drop: string;
            };
            send?: string | undefined;
        }>;
    };
    readonly 'checklist.holder': {
        readonly says: "Keeps the person's checklists, holds them against work, and takes another module's answer to an item.";
        readonly schema: z.ZodObject<{
            name: z.ZodEffects<z.ZodString, string, string>;
            tools: z.ZodObject<{
                list: z.ZodString;
                create: z.ZodString;
                add: z.ZodString;
                hold: z.ZodString;
                check: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                check: string;
                hold: string;
                list: string;
                create: string;
                add: string;
            }, {
                check: string;
                hold: string;
                list: string;
                create: string;
                add: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            tools: {
                check: string;
                hold: string;
                list: string;
                create: string;
                add: string;
            };
        }, {
            name: string;
            tools: {
                check: string;
                hold: string;
                list: string;
                create: string;
                add: string;
            };
        }>;
    };
    readonly 'work.status': {
        readonly says: "Runs work per issue and says, by the issue, what stage it is at.";
        readonly schema: z.ZodObject<{
            name: z.ZodEffects<z.ZodString, string, string>;
            jobs: z.ZodEffects<z.ZodString, string, string>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            jobs: string;
        }, {
            name: string;
            jobs: string;
        }>;
    };
    readonly 'diagram.writer': {
        readonly says: "Draws diagrams an agent writes, per epic, with one tool.";
        readonly schema: z.ZodObject<{
            name: z.ZodEffects<z.ZodString, string, string>;
            tool: z.ZodString;
            kinds: z.ZodArray<z.ZodEnum<["sequence", "graph"]>, "many">;
        }, "strip", z.ZodTypeAny, {
            name: string;
            tool: string;
            kinds: ("sequence" | "graph")[];
        }, {
            name: string;
            tool: string;
            kinds: ("sequence" | "graph")[];
        }>;
    };
};
export type Service = keyof typeof SERVICES;
export declare const SERVICE_NAMES: Service[];
/** What each known service's descriptor is. */
export type ServiceDescriptor<S extends Service> = z.infer<(typeof SERVICES)[S]['schema']>;
/** The first service: a module that runs heavy work in turn. */
export declare const WORK_QUEUE = "work.queue";
/** 2.83.0. A document per epic that takes proposed edits. */
export declare const DOCUMENT_PROPOSALS = "document.proposals";
/** 2.83.0. The person's draft review of a change, which takes comments and a proposed review. */
export declare const REVIEW_DRAFTS = "review.drafts";
/** 2.83.0. The person's checklists, held against work. */
export declare const CHECKLIST_HOLDER = "checklist.holder";
/** 2.83.0. The stage of work, by its issue. */
export declare const WORK_STATUS = "work.status";
/** 2.83.0. Diagrams an agent writes. */
export declare const DIAGRAM_WRITER = "diagram.writer";
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
/** The document's folder for an epic, relative to the project (`root` with the epic in it). */
export declare function documentRoot(document: Pick<DocumentProposals, 'root'>, epic: string): string;
/** The folder every epic's document is under, relative to the project: `root` up to the first `{epic}`, without the trailing `/`. */
export declare function documentsFolder(document: Pick<DocumentProposals, 'root'>): string;
