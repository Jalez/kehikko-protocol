import { z } from 'zod'

import { LIMITS } from './limits.js'
import { MODULE_ID } from './ids.js'

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
export const SERVICE_NAME = /^[a-z][a-z0-9-]{0,30}(?:\.[a-z][a-z0-9-]{0,30}){0,3}$/
export const serviceName = z.string().regex(SERVICE_NAME, 'a service name is lowercase words joined by dots')

/* ---------------------------------------------------------------- work.queue */

/** The kinds of heavy work, each one word. A consumer classifies what it sees into one; a provider says which it takes. */
export const WORK_KINDS = ['test', 'typecheck', 'build', 'install'] as const
export type WorkKind = (typeof WORK_KINDS)[number]

/** Where the command goes in a run line. */
export const WORK_COMMAND = '{command}'

const oneLine = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((line) => !/[\u0000-\u001f\u007f]/.test(line), { message: 'one line of text' })

/** A run line: a shell line that hands a command to the provider, with `{command}` where the command goes. */
const runLine = oneLine(LIMITS.SERVICE_LINE).refine((line) => line.includes(WORK_COMMAND), { message: 'a run line says where the command goes: {command}' })

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
    .object(Object.fromEntries(WORK_KINDS.map((kind) => [kind, runLine.optional()])) as Record<WorkKind, z.ZodOptional<typeof runLine>>)
    .refine((run) => Object.values(run).some(Boolean), { message: 'a work queue takes at least one kind of work' }),
  cli: oneLine(LIMITS.SERVICE_LINE).optional(),
  tool: z.string().regex(/^[A-Za-z0-9_.-]{1,64}$/).optional(),
  direct: oneLine(80).optional(),
  marks: z.array(z.string().min(3).max(LIMITS.SERVICE_LINE)).max(LIMITS.SERVICE_MARKS).default([]),
})
export type WorkQueue = z.infer<typeof workQueueSchema>

/* ---------------------------------------------------------------- services a consumer CALLS (2.83.0) */

/**
 * A tool on the provider's MCP door: the name only. A consumer reaches the door through the module id
 * `services.find` answered (`callServiceTool` behind `/serve`), and calls the tool by the name the
 * descriptor gives, with the arguments this file gives for that operation. It never spells the name.
 */
export const serviceTool = z.string().regex(/^[A-Za-z0-9_.-]{1,64}$/, 'a tool name')

/** A route on the provider's own origin, `/api/…`: a path, never a URL, so it cannot point elsewhere. */
export const servicePath = z
  .string()
  .max(200)
  .regex(/^\/api\/[A-Za-z0-9_\-/.]*$/, 'a route on the provider\'s own origin, /api/…')
  .refine((path) => !path.split('/').includes('..'), { message: 'no .. in a route' })

/** Where the epic goes in a folder template (`document.proposals`'s `root`). */
export const SERVICE_EPIC = '{epic}'

/** A folder relative to the project, with `{epic}` in it: no leading `/`, no `..`. */
const folderTemplate = z
  .string()
  .min(1)
  .max(LIMITS.SERVICE_LINE)
  .refine((path) => !path.startsWith('/') && !/^[A-Za-z]:/.test(path) && !path.replace(/\\/g, '/').split('/').includes('..'), { message: 'a folder relative to the project' })
  .refine((path) => path.includes(SERVICE_EPIC), { message: 'the folder says where the epic goes: {epic}' })

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
export const documentProposalsSchema = z.object({
  name: oneLine(LIMITS.TITLE),
  root: folderTemplate,
  main: z.string().min(1).max(200).refine((path) => !path.startsWith('/') && !path.split('/').includes('..'), { message: 'a file relative to the document\'s folder' }),
  tools: z.object({ sections: serviceTool, source: serviceTool, propose: serviceTool, proposals: serviceTool }),
})
export type DocumentProposals = z.infer<typeof documentProposalsSchema>

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
export const reviewDraftsSchema = z.object({
  name: oneLine(LIMITS.TITLE),
  tools: z.object({ comment: serviceTool, propose: serviceTool, drop: serviceTool }),
  send: servicePath.optional(),
})
export type ReviewDrafts = z.infer<typeof reviewDraftsSchema>

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
export const checklistHolderSchema = z.object({
  name: oneLine(LIMITS.TITLE),
  tools: z.object({ list: serviceTool, create: serviceTool, add: serviceTool, hold: serviceTool, check: serviceTool }),
})
export type ChecklistHolder = z.infer<typeof checklistHolderSchema>

/**
 * `work.status` (2.83.0): a module that runs work per issue and says where each piece is.
 *
 * - `name`: what it is called where it is told about. A consumer says "<name>: <stage>".
 * - `jobs`: a route on its origin, `GET <jobs>?ref=<ref>&projectPath=<abs>`, answering `{ jobs }`
 *   (`workJobSchema` each) for that issue. Read-only, no ticket.
 */
export const workStatusSchema = z.object({
  name: oneLine(LIMITS.TITLE),
  jobs: servicePath,
})
export type WorkStatus = z.infer<typeof workStatusSchema>

/** One piece of work as `work.status` answers it: its id, the issue, its stage in the provider's words. */
export const workJobSchema = z.object({
  id: z.string().trim().min(1).max(80),
  ref: z.string().max(LIMITS.SERVICE_LINE).nullable().catch(null).default(null),
  stage: z.string().trim().min(1).max(80),
  title: z.string().max(LIMITS.TITLE).optional().catch(undefined),
  column: z.string().max(80).nullable().optional().catch(undefined),
  updatedAt: z.string().max(40).optional().catch(undefined),
})
export type WorkJob = z.infer<typeof workJobSchema>

/** The jobs in a `work.status` answer, each that parses; `[]` for anything else. */
export function workJobsIn(body: unknown): WorkJob[] {
  const list = body && typeof body === 'object' && Array.isArray((body as { jobs?: unknown }).jobs) ? (body as { jobs: unknown[] }).jobs : []
  const out: WorkJob[] = []
  for (const one of list.slice(0, 50)) {
    const parsed = workJobSchema.safeParse(one)
    if (parsed.success) out.push(parsed.data)
  }
  return out
}

/** The kinds of diagram a `diagram.writer` may draw. */
export const DIAGRAM_KINDS = ['sequence', 'graph'] as const

/**
 * `diagram.writer` (2.83.0): a module an agent writes diagrams into, per epic, with one tool.
 *
 * - `name`: what it is called where it is told about.
 * - `tool`: the MCP tool an agent calls to write one (`{ project, epic, … }` as that tool says).
 * - `kinds`: the kinds it draws (`DIAGRAM_KINDS`).
 */
export const diagramWriterSchema = z.object({
  name: oneLine(LIMITS.TITLE),
  tool: serviceTool,
  kinds: z.array(z.enum(DIAGRAM_KINDS)).min(1).max(DIAGRAM_KINDS.length),
})
export type DiagramWriter = z.infer<typeof diagramWriterSchema>

/**
 * How a module's server proves who it is to another module's server it calls for a service: its id in
 * `SERVICE_CALLER_HEADER` and a pass it minted in `SERVICE_PASS_HEADER`. The called module asks the
 * caller at its REGISTERED origin (`SERVER_PASS_PATH`) whether it minted that pass — the same proof a
 * host takes (`server-ask.ts`) — so no secret is shared and no agent or page can pass for a module.
 */
export const SERVICE_CALLER_HEADER = 'x-kehikot-caller'
export const SERVICE_PASS_HEADER = 'x-kehikot-pass'

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
  'document.proposals': {
    says: 'Keeps a document per epic and takes edits to it only as proposals the person accepts or rejects.',
    schema: documentProposalsSchema,
  },
  'review.drafts': {
    says: "Keeps the person's draft review of a pull or merge request, and takes comments and a proposed review into it beside theirs.",
    schema: reviewDraftsSchema,
  },
  'checklist.holder': {
    says: "Keeps the person's checklists, holds them against work, and takes another module's answer to an item.",
    schema: checklistHolderSchema,
  },
  'work.status': {
    says: 'Runs work per issue and says, by the issue, what stage it is at.',
    schema: workStatusSchema,
  },
  'diagram.writer': {
    says: 'Draws diagrams an agent writes, per epic, with one tool.',
    schema: diagramWriterSchema,
  },
} as const satisfies Record<string, { says: string; schema: z.ZodTypeAny }>
export type Service = keyof typeof SERVICES
export const SERVICE_NAMES = Object.keys(SERVICES) as Service[]
/** What each known service's descriptor is. */
export type ServiceDescriptor<S extends Service> = z.infer<(typeof SERVICES)[S]['schema']>

/** The first service: a module that runs heavy work in turn. */
export const WORK_QUEUE = 'work.queue' satisfies Service
/** 2.83.0. A document per epic that takes proposed edits. */
export const DOCUMENT_PROPOSALS = 'document.proposals' satisfies Service
/** 2.83.0. The person's draft review of a change, which takes comments and a proposed review. */
export const REVIEW_DRAFTS = 'review.drafts' satisfies Service
/** 2.83.0. The person's checklists, held against work. */
export const CHECKLIST_HOLDER = 'checklist.holder' satisfies Service
/** 2.83.0. The stage of work, by its issue. */
export const WORK_STATUS = 'work.status' satisfies Service
/** 2.83.0. Diagrams an agent writes. */
export const DIAGRAM_WRITER = 'diagram.writer' satisfies Service

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
      const known = (SERVICES as Record<string, { schema: z.ZodTypeAny }>)[name]
      if (known && !known.schema.safeParse(descriptor).success) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [name], message: `${name}: the descriptor does not parse` })
    }
  })
export type Services = z.infer<typeof servicesSchema>

/** A known service's descriptor, parsed; null when it is absent or does not parse. */
export function serviceDescriptor<S extends Service>(service: S, descriptor: unknown): ServiceDescriptor<S> | null {
  const parsed = SERVICES[service].schema.safeParse(descriptor)
  return parsed.success ? (parsed.data as ServiceDescriptor<S>) : null
}

/** What a manifest says it provides: the names of `services`, `[]` when none. */
export function servicesOf(manifest: { services?: Record<string, unknown> | null } | null | undefined): string[] {
  const services = manifest?.services
  return services && typeof services === 'object' ? Object.keys(services) : []
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
})

/** One provider: its id, its registered name, its descriptor as its manifest says it, and whether it is placed on the kehikko asked about (null when none was). */
export const serviceProviderSchema = z.object({
  module: z.string().regex(MODULE_ID),
  name: z.string().max(LIMITS.TITLE),
  descriptor: z.unknown().nullable().default(null),
  placed: z.boolean().nullable().default(null),
})
export type ServiceProvider = z.infer<typeof serviceProviderSchema>

/**
 * `services.find`'s answer: the modules that provide the service and are IN USE on this host — registered
 * here and answering, as its last look at the modules found them — placed ones first. Empty when there
 * is none.
 */
export const servicesFindResult = z.object({ providers: z.array(serviceProviderSchema).max(LIMITS.SERVICE_PROVIDERS) })
export type ServicesFindResult = z.infer<typeof servicesFindResult>

/** The first provider of a known service whose descriptor parses, with it; null when none does. */
export function providerOf<S extends Service>(service: S, providers: readonly ServiceProvider[] | null | undefined): { module: string; name: string; placed: boolean | null; descriptor: ServiceDescriptor<S> } | null {
  for (const one of providers ?? []) {
    const descriptor = serviceDescriptor(service, one.descriptor)
    if (descriptor) return { module: one.module, name: one.name, placed: one.placed, descriptor }
  }
  return null
}

/* ---------------------------------------------------------------- work.queue, said */

/** The work queue's run line for one kind of work with the command in it; null when it does not take that kind. */
export function workRunLine(queue: WorkQueue, kind: WorkKind, command: string): string | null {
  const line = queue.run[kind]
  return line ? line.split(WORK_COMMAND).join(command) : null
}

/**
 * How to hand one command to a work queue, in one sentence built only from its descriptor: "Run it
 * through Queue: `… -- vitest run` from the same folder, or with the queue_run tool." Null when it does
 * not take that kind of work.
 */
export function workQueueSaid(queue: WorkQueue, kind: WorkKind, command: string): string | null {
  const line = workRunLine(queue, kind, command)
  if (!line) return null
  return `Run it through ${queue.name}: \`${line}\` from the same folder${queue.tool ? `, or with the ${queue.tool} tool` : ''}.`
}

/* ---------------------------------------------------------------- document.proposals, read */

/** The document's folder for an epic, relative to the project (`root` with the epic in it). */
export function documentRoot(document: Pick<DocumentProposals, 'root'>, epic: string): string {
  return document.root.split(SERVICE_EPIC).join(epic).replace(/\/+$/, '')
}

/** The folder every epic's document is under, relative to the project: `root` up to the first `{epic}`, without the trailing `/`. */
export function documentsFolder(document: Pick<DocumentProposals, 'root'>): string {
  return document.root.slice(0, document.root.indexOf(SERVICE_EPIC)).replace(/\/+$/, '')
}
