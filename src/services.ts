import { z } from 'zod'

import { LIMITS } from './limits.js'
import { EPIC_SLUG, KEHIKKO_KEY, MODULE_ID } from './ids.js'
import { CONVERSATION_MATCHES, conversationPlaceSchema, type ConversationMatch, type ConversationPlace } from './inbox.js'

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
 * 2.86.0. What a work queue wants handed to it, for one kind of work: a consumer that watches processes
 * flags a run of that kind started outside the queue only when the rule holds (`wantsQueued`).
 *
 * - `minCpu`: CPU, in percent of one core (so above 100 on several cores), the run has to use…
 * - `sustainedSeconds`: …for at least this long without dropping below it. A short spike is not flagged.
 * - `wholeSuiteOnly`: for tests, flag only a run of the whole suite — a test command with no file
 *   arguments, or only folders (`bun test`, `vitest run`, `bun test test/`), not `bun test a.test.ts`
 *   or one filtered by name (`wholeSuite`). Ignored for other kinds.
 *
 * A field left out takes its default (`WORK_WANT_DEFAULTS`).
 */
export const workWantSchema = z.object({
  minCpu: z.number().min(0).max(6400).optional(),
  sustainedSeconds: z.number().min(0).max(3600).optional(),
  wholeSuiteOnly: z.boolean().optional(),
})
export type WorkWantRule = z.infer<typeof workWantSchema>

/** What a field of a `wants` rule is when the provider leaves it out: 80% of a core for 20 s; tests only as whole suites. */
export const WORK_WANT_DEFAULTS = { minCpu: 80, sustainedSeconds: 20, wholeSuiteOnly: true } as const

/** A rule with every field filled in. */
export interface WorkWant {
  minCpu: number
  sustainedSeconds: number
  wholeSuiteOnly: boolean
}

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
 * - `wants` (2.86.0): which work started outside it the provider wants handed to it, per kind of work
 *   (`workWantSchema`). A kind not listed is not wanted: a consumer does not flag it. With no `wants` at
 *   all, every kind in `run` is wanted under the defaults (`WORK_WANT_DEFAULTS`). Read it with
 *   `workWant` and judge a run with `wantsQueued`; never by your own numbers.
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
  wants: z.object(Object.fromEntries(WORK_KINDS.map((kind) => [kind, workWantSchema.optional()])) as Record<WorkKind, z.ZodOptional<typeof workWantSchema>>).optional(),
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
  /**
   * 2.85.0. `json`: its `list` tool also takes `format: 'json'` and then answers JSON instead of the
   * print — `{ lists: [{ id, name, held }] }` with no `checklist`, `{ id, name, held, items }` with one
   * (`checklistListsJson`, `checklistJson`; read with `checklistJsonIn`). Absent: the print only.
   */
  formats: z.array(z.enum(['json'])).max(1).optional(),
})
export type ChecklistHolder = z.infer<typeof checklistHolderSchema>

/** What `format: 'json'` asks a `checklist.holder`'s `list` tool for (2.85.0). */
export const CHECKLIST_JSON = 'json'

/** One item as `format: 'json'` answers it: `state` null when unanswered; `by` who answered and `byPerson` whether it was the person's own tick. */
export const checklistItemJson = z.object({
  id: z.string().min(1).max(80),
  text: z.string().max(LIMITS.SERVICE_LINE * 5),
  state: z.enum(['passed', 'failed', 'na']).nullable(),
  byPerson: z.boolean().default(false),
  by: z.string().max(LIMITS.TITLE).optional(),
  note: z.string().max(LIMITS.SERVICE_LINE * 5).optional(),
})
export type ChecklistItemJson = z.infer<typeof checklistItemJson>

/** One list with `checklist` (and its items as answered for `ref` when one was given). `held`: the refs it is held against. */
export const checklistJson = z.object({
  id: z.string().min(1).max(80),
  name: z.string().max(LIMITS.TITLE),
  held: z.array(z.string().max(LIMITS.SERVICE_LINE)).default([]),
  items: z.array(checklistItemJson).default([]),
})
export type ChecklistJson = z.infer<typeof checklistJson>

/** Every list, with no `checklist`. */
export const checklistListsJson = z.object({
  lists: z.array(z.object({ id: z.string().min(1).max(80), name: z.string().max(LIMITS.TITLE), held: z.array(z.string().max(LIMITS.SERVICE_LINE)).default([]) })),
})
export type ChecklistListsJson = z.infer<typeof checklistListsJson>

/** Whether a holder's `list` answers JSON when asked (`formats` has `json`). */
export const holderTakesJson = (holder: Pick<ChecklistHolder, 'formats'>): boolean => holder.formats?.includes('json') === true

/** A `format: 'json'` answer read with one of the two shapes; null when it is not JSON or does not parse. */
export function checklistJsonIn<T extends z.ZodTypeAny>(shape: T, text: string): z.infer<T> | null {
  try {
    const parsed = shape.safeParse(JSON.parse(text))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

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

/* ---------------------------------------------------------------- 2.85.0 */

/**
 * `page.viewer` (2.85.0): a module that shows web pages on the kehikko, and opens an address an agent
 * hands it.
 *
 * - `name`: what it is called where it is told about. A consumer that would say "open it in the page
 *   viewer" says "open it in <name>", and with no provider says nothing of the kind.
 * - `tool`: the MCP tool on its door that opens an address, called with `{ url }` (an `http:` or
 *   `https:` address). A page opens one through the host's `address.open` instead; this is for an agent.
 */
export const pageViewerSchema = z.object({
  name: oneLine(LIMITS.TITLE),
  tool: serviceTool,
})
export type PageViewer = z.infer<typeof pageViewerSchema>

/** An argument's name in a cue: a word an agent writes as `name=value`. */
const cueArgName = z.string().regex(/^[a-z][a-z0-9_]{0,31}$/, 'an argument name is a lowercase word')

/**
 * One tool a cue may call: the tool, what it shows, the arguments it takes and what each one is, and
 * the read-only tool that lists what can be cued (the values that hold), so a cue can be checked
 * before it is written. `stop`: calling the tool with no arguments takes down what the cues put up.
 */
export const cueTargetSchema = z.object({
  tool: serviceTool,
  says: oneLine(LIMITS.SERVICE_LINE),
  args: z.record(cueArgName, oneLine(LIMITS.SERVICE_LINE)).refine((args) => Object.keys(args).length <= 8, { message: 'at most 8 arguments' }).default({}),
  reader: serviceTool.optional(),
  stop: z.boolean().default(false),
})
export type CueTarget = z.infer<typeof cueTargetSchema>

/**
 * `cue.targets` (2.85.0): a module whose tools a narrated walk-through may cue, so that its page
 * shows what a line is about. A module that writes walk-throughs finds every provider placed on a
 * kehikko and tells its agent the cues each one takes, never naming one of its own accord.
 *
 * - `name`: what it is called where it is told about.
 * - `cues`: the tools that can be cued (`cueTargetSchema`), at least one, at most 8. A cue calls one as
 *   `<module id>.<tool>(<arg>=<value>, …)`, the module id being the one `services.find` answered.
 */
export const cueTargetsSchema = z.object({
  name: oneLine(LIMITS.TITLE),
  cues: z.array(cueTargetSchema).min(1).max(8),
})
export type CueTargets = z.infer<typeof cueTargetsSchema>

/** A folder's name directly under `.kehikot/`: one path segment. */
export const KEHIKOT_FOLDER = /^[a-z0-9][a-z0-9._-]{0,62}$/

/**
 * One folder a module owns: its name directly under `.kehikot/`, what is in it in one line, and whether
 * it is DERIVED (a cache rebuilt from elsewhere, which a data history leaves out) rather than authored.
 */
export const ownedFolderSchema = z.object({
  folder: z.string().regex(KEHIKOT_FOLDER, 'one folder name directly under .kehikot/').refine((name) => name !== '.' && name !== '..', { message: 'a folder name' }),
  says: oneLine(LIMITS.SERVICE_LINE),
  derived: z.boolean().default(false),
})
export type OwnedFolder = z.infer<typeof ownedFolderSchema>

/**
 * `module.folders` (2.85.0): the folders a module owns under `<project>/.kehikot/`, each with what is
 * in it. The module is that folder's only writer. A module that shows or records the project's files
 * (an editor, a data history) reads every provider to say whose a file is and what it holds, instead of
 * a table of other modules' folders.
 *
 * - `name`: what the owner is called where it is told about ("This file belongs to <name>").
 * - `folders`: one to 8 (`ownedFolderSchema`).
 */
export const moduleFoldersSchema = z.object({
  name: oneLine(LIMITS.TITLE),
  folders: z.array(ownedFolderSchema).min(1).max(8),
})
export type ModuleFolders = z.infer<typeof moduleFoldersSchema>

/** Each folder name with its owner and what it says, from `module.folders` providers; the first provider to claim a folder keeps it. */
export function foldersOwned(providers: readonly ServiceProvider[] | null | undefined): Map<string, { module: string; name: string; says: string; derived: boolean }> {
  const out = new Map<string, { module: string; name: string; says: string; derived: boolean }>()
  for (const one of providers ?? []) {
    const descriptor = serviceDescriptor(MODULE_FOLDERS, one.descriptor)
    if (!descriptor) continue
    for (const folder of descriptor.folders) {
      if (!out.has(folder.folder)) out.set(folder.folder, { module: one.module, name: descriptor.name, says: folder.says, derived: folder.derived })
    }
  }
  return out
}

/* ---------------------------------------------------------------- 2.88.0 */

/**
 * The HOST calling a provider (2.88.0): `SERVICE_CALLER_HEADER` says `HOST_CALLER`, and
 * `SERVICE_PASS_HEADER` carries a pass the host minted. The provider confirms it by asking the host at
 * its own origins (`KEHIKOT_ORIGINS`), `GET <origin>HOST_PASS_PATH?pass=<pass>` → `{ ok, minted }`
 * (spent by the asking) — `vouchHost` behind `/serve`. No page, agent or other module can pass for it.
 */
export const HOST_CALLER = 'kehikko'
export const HOST_PASS_PATH = '/host/server-pass'

/**
 * `conversations.finder` (2.88.0): an agent module that can say which of its CLI's conversations worked
 * on a ref, a branch or a folder, and file one of them under a place — what `/kehikot-here` does —
 * when the HOST asks. It looks only in what it already reads of its CLI's conversations (its session
 * listing, and transcripts only where it already reads them), never anywhere new.
 *
 * - `name`: the module, as it is told about. `program`: the CLI in its own words (`Claude Code`), which
 *   a host says of a conversation ("its Claude Code conversation came along").
 * - `find`: a route on its origin, `POST { project, refs, url?, branch?, repo? }`
 *   (`conversationsFindParams`), answering `conversationsFindResult`: candidates with title, folder,
 *   last active, how they matched (`ConversationMatch`) and why in words, where each is filed now, and
 *   whether it is running. Titles and reasons only: never a transcript's content.
 * - `bring`: a route on its origin, `POST { project, session, to, from }` (`conversationsBringParams`):
 *   file that conversation under `to` (null: under no place) ONLY if it is filed under `from` now (null:
 *   under none) — so a host never moves one from another place, and an undo never takes back a move
 *   somebody made since. Answers `conversationsBringResult`. A running conversation is not restarted:
 *   it gains the place now, and the module's guards and messaging the next time the module resumes it,
 *   or at once when the module already holds its terminal.
 *
 * Both routes answer only the host (`vouchHost`).
 */
export const conversationsFinderSchema = z.object({
  name: oneLine(LIMITS.TITLE),
  program: oneLine(LIMITS.TITLE),
  find: servicePath,
  bring: servicePath,
})
export type ConversationsFinder = z.infer<typeof conversationsFinderSchema>

/** `find`'s body: the project folder, the ref's spellings, and what else is known of the change. */
export const conversationsFindParams = z.object({
  project: z.string().min(1).max(1024),
  refs: z.array(z.string().min(1).max(LIMITS.REF * 4)).min(1).max(8),
  url: z.string().max(2048).optional(),
  branch: z.string().max(400).optional(),
  repo: z.string().max(400).optional(),
})
export type ConversationsFindParams = z.infer<typeof conversationsFindParams>

/** One candidate. `place` where it is filed now (null: none); `running` whether its CLI runs it now. */
export const conversationCandidateSchema = z.object({
  session: z.string().trim().min(1).max(128),
  title: z.string().max(LIMITS.TITLE).catch(''),
  folder: z.string().max(1024).catch(''),
  lastActive: z.number().int().min(0).catch(0),
  match: z.enum(CONVERSATION_MATCHES),
  reason: z.string().max(LIMITS.REASON).catch(''),
  place: conversationPlaceSchema.nullable().catch(null).default(null),
  running: z.boolean().catch(false).default(false),
})
export type ConversationCandidate = z.infer<typeof conversationCandidateSchema>

export const conversationsFindResult = z.object({ conversations: z.array(conversationCandidateSchema).max(20) })
export type ConversationsFindResult = z.infer<typeof conversationsFindResult>

/** The candidates in a `find` answer, each that parses, strongest match first then newest; `[]` for anything else. */
export function candidatesIn(body: unknown): ConversationCandidate[] {
  const list = body && typeof body === 'object' && Array.isArray((body as { conversations?: unknown }).conversations) ? (body as { conversations: unknown[] }).conversations : []
  const out: ConversationCandidate[] = []
  for (const one of list.slice(0, 50)) {
    const parsed = conversationCandidateSchema.safeParse(one)
    if (parsed.success) out.push(parsed.data)
  }
  const rank = (match: ConversationMatch) => CONVERSATION_MATCHES.indexOf(match)
  return out.sort((a, b) => rank(a.match) - rank(b.match) || b.lastActive - a.lastActive).slice(0, 20)
}

/** `bring`'s body: compare-and-set of one conversation's place. */
export const conversationsBringParams = z.object({
  project: z.string().min(1).max(1024),
  session: z.string().trim().min(1).max(128),
  to: conversationPlaceSchema.nullable(),
  from: conversationPlaceSchema.nullable(),
})
export type ConversationsBringParams = z.infer<typeof conversationsBringParams>

/**
 * `brought`: it is filed under `to` now (`resumed` when the module holds its terminal and it gained the
 * place at once). `elsewhere`: it was not under `from`, so nothing changed; `place` is where it is.
 * `no-such-session`, `declined`: not done, and why.
 */
export const conversationsBringResult = z.object({
  outcome: z.enum(['brought', 'elsewhere', 'no-such-session', 'declined']),
  place: conversationPlaceSchema.nullable().default(null),
  resumed: z.boolean().default(false),
  why: z.string().max(LIMITS.REASON).default(''),
})
export type ConversationsBringResult = z.infer<typeof conversationsBringResult>

/** Whether two places are the same place (parts in any order); null is no place. */
export function sameConversationPlace(a: ConversationPlace | null | undefined, b: ConversationPlace | null | undefined): boolean {
  if (!a || !b) return !a && !b
  return a.epic === b.epic && (a.kehikko ?? null) === (b.kehikko ?? null) && [...a.parts].sort().join('+') === [...b.parts].sort().join('+')
}

/** Where `session` goes in an `agent.tasks` view. */
export const SERVICE_SESSION = '{session}'

/**
 * `agent.tasks` (2.88.0): an agent module that starts a NEW conversation for one of Kehikot's own tasks,
 * fed a brief on launch, filed under a place like any conversation it starts, and kept in its records.
 *
 * - `name`, `program`: as `conversations.finder`'s.
 * - `start`: a route on its origin, `POST { project, brief, place, title }` (`agentTaskStartParams`),
 *   answering `agentTaskStartResult` with the new conversation's id. Only the host (`vouchHost`).
 * - `view`: the module's page showing that one conversation, `/app?…{session}…`, which a host frames in
 *   its own dialog while the task runs.
 */
export const agentTasksSchema = z.object({
  name: oneLine(LIMITS.TITLE),
  program: oneLine(LIMITS.TITLE),
  start: servicePath,
  view: z
    .string()
    .max(200)
    .regex(/^\/app(?:\?[A-Za-z0-9_\-.=&{}%]*)?$/, 'the module\'s page, /app?…')
    .refine((path) => path.includes(SERVICE_SESSION), { message: 'the view says where the conversation goes: {session}' }),
})
export type AgentTasks = z.infer<typeof agentTasksSchema>

/** The longest brief a task is started with. */
export const AGENT_TASK_BRIEF_MAX = 32_000

export const agentTaskStartParams = z.object({
  project: z.string().min(1).max(1024),
  brief: z.string().min(1).max(AGENT_TASK_BRIEF_MAX),
  place: conversationPlaceSchema.nullable(),
  title: oneLine(LIMITS.TITLE),
})
export type AgentTaskStartParams = z.infer<typeof agentTaskStartParams>

export const agentTaskStartResult = z.object({
  outcome: z.enum(['started', 'declined']),
  session: z.string().trim().min(1).max(128).nullable().default(null),
  why: z.string().max(LIMITS.REASON).default(''),
})
export type AgentTaskStartResult = z.infer<typeof agentTaskStartResult>

/** An `agent.tasks` view with the conversation in it. */
export function agentTaskView(tasks: Pick<AgentTasks, 'view'>, session: string): string {
  return tasks.view.split(SERVICE_SESSION).join(encodeURIComponent(session))
}

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
  'page.viewer': {
    says: 'Shows web pages on the kehikko, and opens an address an agent hands it.',
    schema: pageViewerSchema,
  },
  'cue.targets': {
    says: 'Has tools a narrated walk-through can cue, so its page shows what a line is about.',
    schema: cueTargetsSchema,
  },
  'module.folders': {
    says: 'Owns folders under the project\'s .kehikot/, and says what is in each.',
    schema: moduleFoldersSchema,
  },
  'conversations.finder': {
    says: "Says which of its CLI's conversations worked on a ref, a branch or a folder, and files one under a place when the host asks.",
    schema: conversationsFinderSchema,
  },
  'agent.tasks': {
    says: "Starts a new conversation for one of Kehikot's own tasks, fed a brief on launch.",
    schema: agentTasksSchema,
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
/** 2.85.0. A module that shows web pages and opens an address for an agent. */
export const PAGE_VIEWER = 'page.viewer' satisfies Service
/** 2.85.0. The tools a narrated walk-through may cue. */
export const CUE_TARGETS = 'cue.targets' satisfies Service
/** 2.85.0. The folders a module owns under `.kehikot/`. */
export const MODULE_FOLDERS = 'module.folders' satisfies Service
/** 2.88.0. Which of an agent module's conversations worked on a ref, and filing one under a place. */
export const CONVERSATIONS_FINDER = 'conversations.finder' satisfies Service
/** 2.88.0. A new conversation for one of Kehikot's own tasks, fed a brief. */
export const AGENT_TASKS = 'agent.tasks' satisfies Service

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

/* ---------------------------------------------------------------- work.queue, wanted (2.86.0) */

/**
 * The provider's rule for one kind of work, every field filled in (`WORK_WANT_DEFAULTS`); null when it
 * does not want that kind flagged: it does not take it (`run`), or it says `wants` and leaves the kind out.
 * `wholeSuiteOnly` is false for every kind but `test`.
 */
export function workWant(queue: Pick<WorkQueue, 'run' | 'wants'>, kind: WorkKind): WorkWant | null {
  if (!queue.run[kind]) return null
  const rule = queue.wants ? queue.wants[kind] : {}
  if (!rule) return null
  return {
    minCpu: rule.minCpu ?? WORK_WANT_DEFAULTS.minCpu,
    sustainedSeconds: rule.sustainedSeconds ?? WORK_WANT_DEFAULTS.sustainedSeconds,
    wholeSuiteOnly: kind === 'test' && (rule.wholeSuiteOnly ?? WORK_WANT_DEFAULTS.wholeSuiteOnly),
  }
}

/** Test runners' options that take the next word as their value, so that word is not a path. */
const VALUE_FLAGS = new Set([
  '--timeout', '--reporter', '--config', '-c', '--project', '--preload', '--root', '-r', '--dir', '--shard', '--rerun-each',
  '--coverage-dir', '--coverage-reporter', '--environment', '--pool', '--workers', '-j', '--retries', '--max-workers',
  '--outputFile', '--output-file', '--seed', '--browser', '--grep-invert', '--testTimeout', '--test-timeout',
])
/** Options that pick tests by name: a run that has one is not the whole suite. */
const NAME_FLAGS = new Set(['-t', '--test-name-pattern', '--testNamePattern', '-g', '--grep', '--only', '--changed', '--related', '--findRelatedTests', '--onlyChanged', '-o'])
/** Folder names a bare word may be, as opposed to a name filter. */
const SUITE_FOLDERS = new Set(['.', 'test', 'tests', 'spec', 'specs', 'src', 'e2e', '__tests__', 'packages', 'apps', 'lib'])
/** Package managers whose `test` script, or `run test`, runs whatever suite the project says. */
const SCRIPT_RUNNERS = new Set(['npm', 'pnpm', 'yarn', 'bun'])
const wordBase = (word: string) => (word.split('/').pop() ?? '').replace(/\.(m?js|cjs|ts)$/, '')

/**
 * Whether a test command runs the whole suite: after the runner (`bun test`, `vitest [run]`, `jest`,
 * `playwright test`, `npm test`, `bun run test`), no file argument (a word with an extension such as
 * `a.test.tsx`), no bare word that is not a usual folder name (a runner reads it as a name filter), and
 * no option that picks tests by name (`-t`). Folders (`test/`, `src/unit`) keep it whole. A command whose
 * runner it cannot find counts as whole.
 */
export function wholeSuite(command: string): boolean {
  const words = command.trim().split(/\s+/).filter(Boolean)
  let at = -1
  for (let i = 0; i < words.length && at < 0; i++) {
    const name = wordBase(words[i]!)
    const next = words[i + 1] ?? ''
    if (name === 'vitest' || name === 'jest') at = next === 'run' || next === 'watch' ? i + 2 : i + 1
    else if ((name === 'bun' || name === 'playwright' || name === 'cli' || SCRIPT_RUNNERS.has(name)) && next === 'test') at = i + 2
    else if (SCRIPT_RUNNERS.has(name) && next === 'run' && /^test(:|$)/.test(words[i + 2] ?? '')) return true
  }
  if (at < 0) return true
  for (let i = at; i < words.length; i++) {
    const word = words[i]!.replace(/^['"]|['"]$/g, '')
    if (word === '--') continue
    if (word.startsWith('-')) {
      const flag = word.split('=')[0]!
      if (NAME_FLAGS.has(flag)) return false
      if (VALUE_FLAGS.has(flag) && !word.includes('=')) i++
      continue
    }
    if (/^\d+$/.test(word)) continue
    if (/\.[A-Za-z0-9]{1,6}$/.test(word.replace(/\/+$/, ''))) return false
    if (word.includes('/') || SUITE_FOLDERS.has(word)) continue
    return false
  }
  return true
}

/** One run a consumer saw outside the queue: its kind, its command line, and the CPU it has held for how long. */
export interface SeenRun {
  kind: WorkKind
  command: string
  /** The CPU it has used at least, in percent of one core, over the last `seconds`. */
  cpu: number
  /** How long it has held at least `cpu`, in seconds. */
  seconds: number
}

/**
 * Whether the work queue wants this run handed to it, so a consumer flags it: it wants the kind
 * (`workWant`), the run held at least `minCpu` for at least `sustainedSeconds`, and, for a test run under
 * `wholeSuiteOnly`, it runs the whole suite (`wholeSuite`). False otherwise — never flag on your own rule.
 */
export function wantsQueued(queue: Pick<WorkQueue, 'run' | 'wants'>, run: SeenRun): boolean {
  const want = workWant(queue, run.kind)
  if (!want) return false
  if (run.cpu < want.minCpu || run.seconds < want.sustainedSeconds) return false
  return !want.wholeSuiteOnly || wholeSuite(run.command)
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

/* ---------------------------------------------------------------- sessions.placeOf (2.85.0) */

/**
 * `sessions.placeOf`'s params, from a module's server about one project: the place an agent session is
 * filed under, by the session's own id (an agent's conversation id, as the module that runs it records
 * it). The host answers from the records it already reads for its door (`RECORDED_PLACE_PATH` on the
 * modules that issued place tokens in that project), so no module reads another's folder for it.
 */
export const sessionsPlaceOfParams = z.object({ session: z.string().trim().min(1).max(128) })

/** The place: the epic, the parts and the kehikko key, as the record says it now; `null` when no record names that session. */
export const sessionsPlaceOfResult = z.object({
  place: z
    .object({
      epic: z.string().regex(EPIC_SLUG).nullable(),
      parts: z.array(z.string().regex(EPIC_SLUG)).max(LIMITS.PARTS).default([]),
      kehikko: z.string().regex(KEHIKKO_KEY).nullable(),
    })
    .nullable(),
})
export type SessionsPlaceOfResult = z.infer<typeof sessionsPlaceOfResult>
