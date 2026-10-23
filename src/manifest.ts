import { z } from 'zod'
import { MANIFEST_KIND, PROTOCOL } from './constants.js'
import { LIMITS } from './limits.js'
import { MODE_ID, MODULE_ID } from './ids.js'
import { buildSchema } from './build.js'
import { moduleSkillsSchema } from './skills.js'
import { CONTEXT_SCOPES, type ContextScope } from './context.js'
import { settingsDeclarationSchema } from './settings.js'

/**
 * What a module says about itself when a host asks: the manifest schema, the words it suggests (`REACTS_TO`,
 * `TAGS`), and the pure readers `speaks` and `partsDeclaration`. Every string in the schema has a `max` from
 * `LIMITS`, including the next one added. No field asks for or models a permission.
 * Design notes: docs/manifest.md.
 */

const modeSchema = z.object({
  id: z.string().regex(MODE_ID, 'lowercase, digits and dashes only'),
  label: z.string().min(1).max(LIMITS.LABEL),
  /**
   * `epic`: the mode's tab follows the reader, told which epic is open and told again on every
   * switch. `global`: one page for the whole canvas, told nothing and never re-pointed. The former
   * word `journey` has no alias.
   */
  scope: z.enum(['epic', 'global']).default('epic'),
})
export type ModuleMode = z.infer<typeof modeSchema>

/**
 * A URL as a manifest may write one: a bounded string, not checked for being a URL and not
 * resolved. Whether a module may point at the address is the host's question, asked where the fetch
 * origin is known.
 */
const url = z.string().min(1).max(LIMITS.URL)

/**
 * The context kinds a module can say it REACTS to, each with what it means. Documentation only: a host must not
 * gate, filter, withhold or route anything on it; every framed module gets the whole context. One exception,
 * `address` (2.16.0): a host reads it to say whether anybody on the kehikko shows pages. Free strings on
 * the wire: a host shows or drops an unknown word and still frames the module.
 */
export const REACTS_TO = {
  passage:
    'Does something when the reader points at a passage — a file, a place in it, and the words that were there.',
  selection: 'Does something when the references somebody picked out change.',
  /**
   * 2.13.0. Somebody pointed at a place in a change's code (`context.location`). Paired with
   * `location:set`. A module ticking this opens the file there, scrolls its diff there, or — for
   * `intent: 'comment'` — starts a comment there.
   */
  location: "Does something when somebody points at a place in a change's code — opens the file there, or starts a comment there.",
  /**
   * 2.16.0. A web address was handed to the canvas (`context.address`). Paired with `address:open`. A
   * module ticking this SHOWS PAGES: it opens the address when its `at` is new. The one word a host
   * reads for more than documentation: to answer `address.open` with `shown` (somebody on the kehikko
   * ticks it) or `offered` (nobody does). It still sends the address to every container.
   */
  address: 'Shows pages: opens a web address somebody handed to the canvas.',
  /**
   * What is arranged on the kehikko changed: which module each container holds, whether it is
   * picked out, and what it says it is showing. Paired with `showing:set`; also changed by a person
   * ticking a container's box, the host's own act.
   */
  containers:
    'Does something when which containers are picked out changes, or when what one of them is showing changes.',
  /**
   * The fourth word: somebody marked why a reference closed. Paired with
   * `disposition:set` the way `selection` is with `selection:set`, and changed
   * by an agent through the host's MCP door as often as by a module.
   */
  dispositions: "Does something when somebody marks why a reference closed — done, won't do, duplicate, superseded.",
  /**
   * The shared tracker reading changed. Paired with `trackers:refresh`; also moved by the host's
   * own acts (a person pressing "Refresh all", the project's schedule). A module ticking this
   * re-asks `tracker.get` when `context.tracker.at` moves.
   */
  tracker: 'Does something when the trackers have been read again — re-reads the issues, merge requests and pull requests it shows.',
  /**
   * The material a container shows for an epic changed: a step, a journey, an epic's own text. Paired with
   * `content:report`; also moved by the host's writes to an epic and by edits to the project's files. A module
   * ticking this re-reads what it shows when `contentStamp(context.content, …)` moves.
   */
  content: 'Does something when the material it shows for an epic has been changed — re-reads the epic, its steps or its own data.',
  /**
   * Which parts of the open epic a person picked out. Picked in the host's bar; no module sets it,
   * so a registry finds no setter. A module ticking this narrows to the picked parts and says how
   * much it left out.
   */
  parts: 'Does something when the parts of the epic somebody picked out change — narrows to them, and says what it left out.',
} as const

export type Reaction = keyof typeof REACTS_TO
export const REACTION_NAMES = Object.keys(REACTS_TO) as Reaction[]

/**
 * The category words this version suggests for `tags`, each with what it is for. A suggestion, not
 * a registry: `tags` is not checked against it, and a host shows an unknown word as it is.
 */
export const TAGS = {
  planning: 'Deciding what the work is: journeys, references, checklists.',
  reading: 'Reading a document somebody else wrote.',
  writing: 'Writing one: a paper, a deck, notes.',
  code: 'Looking at and working in source.',
  review: 'Judging a change before it lands.',
  agents: 'Running agents and hearing back from them.',
  tests: 'Running checks and reading what they said.',
} as const

export type Tag = keyof typeof TAGS
export const TAG_NAMES = Object.keys(TAGS) as Tag[]

/* Lowercase and hyphenated, starting with a letter, so a tag is a word a host
   can put in a heading or a search box and never a sentence or a path. The
   length is `LIMITS.TAG`, said here because a regex cannot read a constant. */
const tag = z.string().regex(new RegExp(`^[a-z][a-z0-9-]{0,${LIMITS.TAG - 1}}$`))

/** The name of a tool at an MCP door, in MCP's own alphabet. */
const toolName = z.string().regex(new RegExp(`^[A-Za-z0-9_.-]{1,${LIMITS.TOOL}}$`), 'a tool name: letters, digits, _ . and -')

/**
 * One kind of thing a module can be asked to show, or to answer for, and the tools at its MCP door
 * that do it. `show` points the open page at one (and saves nothing); `release` lets go of what
 * `show` held, and is absent when a pointing holds nothing; `done` answers "is this done?". Each
 * tool spells its context arguments `project` and `epic`. See docs/asking.md and `door.ts`.
 */
const subjectSchema = z
  .object({
    /** The word for the kind, as a caller would say it: `slide`, `question`, `flow`. Unique in a module. */
    kind: tag,
    /** What one of these is, in a line, for somebody choosing what to ask for. */
    about: z.string().max(LIMITS.SUMMARY).default(''),
    /** The tool that shows one. It answers with `showAnswerSchema`, and must be read-only. */
    show: toolName.optional(),
    /** The tool that stops showing. Called with the context arguments and nothing else. */
    release: toolName.optional(),
    /** The tool that says whether one is done. It answers with `doneAnswerSchema`, and must be read-only. */
    done: toolName.optional(),
  })
  .refine((subject) => subject.show !== undefined || subject.done !== undefined, {
    message: 'a subject names the tool that shows it, the tool that says whether it is done, or both',
  })
  .refine((subject) => subject.release === undefined || subject.show !== undefined, {
    message: 'a subject that can be let go of has to be one that can be shown',
  })
export type ModuleSubject = z.infer<typeof subjectSchema>

/**
 * The shape of a door's declared name, `mcp.as`: a lowercase letter, then lowercase letters, digits,
 * `-` and `_`. It cannot start with `-` (it is passed to a command and must never read as a flag),
 * holds no whitespace, quote or dot, and neither holds `__` nor ends in `_`: `__` is what separates
 * the server from the tool in `mcp__<server>__<tool>`. At most `LIMITS.DOOR_NAME` characters.
 */
export const DOOR_NAME = /^[a-z](?:[a-z0-9-]|_(?=[a-z0-9-]))*$/

const doorName = z
  .string()
  .max(LIMITS.DOOR_NAME)
  .regex(DOOR_NAME, 'a door name is a lowercase letter, then lowercase letters, digits, - and _, never __ and never ending in _')

/* An extension name, as written. */
const extensionName = z.string().min(1).max(LIMITS.EXTENSION)

/** Every field of a manifest, before the one rule that needs two of them. See `manifestSchema`. */
const manifestFields = z.object({
  /** The word that makes this a manifest claim rather than a hopeful GET. */
  kind: z.literal(MANIFEST_KIND),
  /** Which protocol this module was built against, as a single integer. */
  protocol: z.number().int().min(1),
  id: z.string().regex(MODULE_ID, 'lowercase reverse-DNS: letters, digits, dots and dashes'),
  name: z.string().min(1).max(LIMITS.NAME),
  /**
   * The module's own version. Shown to a person; this protocol never parses or compares it, and it
   * has no agreed grammar for a host to decide anything from.
   */
  version: z.string().min(1).max(LIMITS.VERSION).default('0'),
  /**
   * Which FORMAT this module writes its project data in (the files under `<project>/.kehikot/<module>/`): a
   * positive integer, absent means 1. A host refuses a version numbered lower than the highest already run for
   * the project. Raise it only in the release that first writes data an earlier release cannot read.
   */
  dataVersion: z.number().int().min(1).max(LIMITS.DATA_VERSION).default(1),
  summary: z.string().max(LIMITS.SUMMARY).default(''),
  /**
   * The categories this module files itself under, most fitting first: the first tag is where a
   * host puts a module it shows once, the rest only widen a search. See `TAGS`; a word outside it
   * is carried as written. Empty means no category.
   */
  tags: z.array(tag).max(LIMITS.TAGS).default([]),
  /**
   * What an agent should do about this module, given that it is here: what its presence implies,
   * written by the module's author and the same on every canvas. A module's own claim: a host
   * relays it attributed to the module, before `context.prompt`. Empty by default.
   */
  guidance: z.string().max(LIMITS.GUIDANCE).default(''),
  /** The page a host would frame. Relative to the module's own origin. */
  entry: url,
  /**
   * 2.14.0. The icon this module is known by: a KEY of `MODULE_ICONS` (`lucide:<name>`, or
   * `brand:<slug>` for the mark of a third-party tool the module fronts), which a host draws from
   * its own set beside the module's name. Never a path or URL: a host does not fetch it, and draws a
   * string it does not know — including the image URL this field held before 2.14.0 — as its own
   * neutral icon. Any short string still parses, so no manifest is refused for it. See `icon.ts`.
   */
  icon: z.string().max(LIMITS.URL).optional(),
  /**
   * Cheap liveness, so that "not running" and "broken" can be different words. Carried on the
   * parsed manifest, though no host polls it yet. A host must resolve it against the origin the
   * manifest came from and refuse it if it leaves.
   */
  health: z.string().max(LIMITS.URL).optional(),
  /**
   * Where the module's OWN MCP server answers. A host does not proxy it or speak to it; it only
   * says where it is, so a person can connect a session and an agent can be told which tools belong
   * to which module.
   */
  mcp: z
    .object({
      url,
      transport: z.enum(['http', 'sse', 'stdio']).default('http'),
      /** What an agent would be connecting to, in one line, for the list. */
      about: z.string().max(LIMITS.SUMMARY).default(''),
      /**
       * The server name an agent host should register this door under (1.3.0), when the module
       * wants another than the one a host would derive from its id. It becomes part of every tool's
       * name (`mcp__<as>__<tool>`) and an argument on a command line, so the shape is strict: see
       * `DOOR_NAME`. Absent by default; a host that does not know the field names the door itself.
       */
      as: doorName.optional(),
      /**
       * What this door can be asked to show and to answer for, by kind. The declaration that lets a
       * caller who has never heard of this module find "the tool that points". Empty by default.
       */
      subjects: z
        .array(subjectSchema)
        .max(LIMITS.SUBJECTS)
        .refine((subjects) => new Set(subjects.map((s) => s.kind)).size === subjects.length, {
          message: 'two subjects cannot share a kind',
        })
        .default([]),
    })
    .optional(),
  /**
   * The formats this module speaks, by name and version: `emits` is what it will send, `consumes`
   * what it will show. Neither list is checked against the extensions this package knows; a host
   * that does not know a name does not route it.
   */
  extensions: z
    .object({
      emits: z.array(extensionName).max(LIMITS.EXTENSIONS).default([]),
      consumes: z.array(extensionName).max(LIMITS.EXTENSIONS).default([]),
    })
    .default({ emits: [], consumes: [] }),
  /**
   * The parts of the context this module says it REACTS to. See `REACTS_TO`. The module's own
   * unchecked account, unlike `extensions`, which the host carries. List only what the program
   * actually moves for; empty is the common answer.
   */
  reacts: z.array(z.string().min(1).max(LIMITS.REACTION)).max(LIMITS.REACTIONS).default([]),
  /**
   * Why this module has nothing to narrow to the picked parts, in one sentence, for a module that
   * does not say `reacts: ['parts']`. Optional and never defaulted; a manifest says one or the
   * other, and `manifestSchema` refuses one that says neither or both (`partsDeclaration`).
   */
  partless: z.string().trim().min(1).max(LIMITS.SUMMARY).optional(),
  modes: z.array(modeSchema).min(1).max(LIMITS.MODES),
  /**
   * What the module says about itself and its host: a statement of intent a person can read before
   * installing, and that a host may show, log, ignore or contradict. Nothing is granted by it and
   * nothing is unlocked by it.
   */
  declares: z
    .object({
      /**
       * The protocol range this module can speak, e.g. `>=1 <2`. See `speaks`.
       */
      protocol: z.string().max(LIMITS.RANGE).default(`>=${PROTOCOL}`),
      /**
       * What it intends to call. Free strings, not an enum; see `CAPABILITIES` in `methods.ts`.
       * Documentation only: the host refuses or allows each call itself and does not check against
       * this list.
       */
      uses: z.array(z.string().min(1).max(LIMITS.CAPABILITY)).max(LIMITS.CAPABILITIES).default([]),
      /**
       * Whether the frame needs its own origin back (cookies, localStorage, IndexedDB). False by default: the
       * module runs on an opaque origin and cannot reach its own storage. The host decides; always refusing is
       * conforming. With an origin, messages can be addressed to it rather than `'*'`.
       */
      storage: z.boolean().default(false),
      /**
       * Whether this module has a use for a prompt somebody writes for it. A declaration, not a
       * demand: it lets a host offer one. A module declaring this must still work with
       * `context.prompt` null.
       */
      prompt: z.boolean().default(false),
      /**
       * Claude Code skills this module offers a person (2.5.0): name, summary, version. Each one's
       * text is served at `skillPath(name)`. An offer, not an install: the host shows the text and
       * the person decides. Optional and never defaulted; absent means none.
       */
      skills: moduleSkillsSchema.optional(),
      /**
       * Which scopes of `context.scope` this module can show (2.9.0): `epic` for one epic,
       * `project` for every epic of the project at once, each item labelled with its epic. Optional
       * and never defaulted; absent means `['epic']` (`scopesOf`). A host covers a module that does
       * not list `project` while the person has "All epics" chosen, and still sends it the context.
       */
      scopes: z.array(z.enum(CONTEXT_SCOPES)).min(1).max(CONTEXT_SCOPES.length)
        .refine((scopes) => new Set(scopes).size === scopes.length, { message: 'a scope is listed once' })
        .optional(),
      /**
       * The settings a person can see and change from the host (2.15.0): a short list of fields a host
       * draws as one form, read and changed at the module's door (`settings.get`, `settings.set`). See
       * `settings.ts`. Optional and never defaulted; absent means none. A list that does not parse is
       * dropped, not fatal: the module then shows no settings in the host, and nothing else changes.
       */
      settings: settingsDeclarationSchema.optional().catch(undefined),
    })
    .default({ protocol: `>=${PROTOCOL}`, uses: [], storage: false, prompt: false }),
  /**
   * What the server answering is built from, and when it started. Optional, added by `doors()`;
   * a malformed one reads as absent rather than failing the manifest. See `build.ts`.
   */
  build: buildSchema.optional().catch(undefined),
})

/**
 * The manifest. Every field above, and one rule over two of them: a module either follows the
 * picked parts (`reacts` has `parts`) or says in `partless` why it has nothing to narrow. A
 * manifest that says neither, or both, does not parse, and the issue is the sentence saying what
 * to add (`partsDeclaration`). A `ZodEffects`, so it has no `.shape`; nothing else changed.
 */
export const manifestSchema = manifestFields.superRefine((manifest, context) => {
  for (const message of partsDeclaration(manifest)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['partless'], message })
  }
})

export type Manifest = z.infer<typeof manifestSchema>
/** What a module author writes, before defaults are filled in. */
export type ManifestInput = z.input<typeof manifestSchema>

/**
 * Does a range include a protocol number? Space-separated comparisons against an integer (`>=1 <2`,
 * or bare `1`), all of which must hold; anything unreadable names nothing (false). Pure, a reading
 * not a decision: a host must also compare its own protocol number against `manifest.protocol`.
 */
export function speaks(range: string, protocol: number = PROTOCOL): boolean {
  const parts = range.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return false
  for (const part of parts) {
    const m = /^(>=|<=|>|<|=)?(\d+)$/.exec(part)
    if (!m) return false
    const n = Number(m[2])
    switch (m[1]) {
    case '>=':
      if (!(protocol >= n)) return false
      break
    case '<=':
      if (!(protocol <= n)) return false
      break
    case '>':
      if (!(protocol > n)) return false
      break
    case '<':
      if (!(protocol < n)) return false
      break
    default:
      if (protocol !== n) return false
    }
  }
  return true
}

/**
 * What is wrong with what a module says about the parts of an epic, as sentences a person can act on; `[]`
 * when nothing is. A module has `parts` in `reacts` or a reason in `partless`; neither and both are reported.
 * `manifestSchema` refuses a manifest this reports, with these sentences as the issues; call it directly to
 * say the same thing about an object that has not been parsed.
 */
export function partsDeclaration(manifest: { id?: string; reacts?: readonly string[]; partless?: string }): string[] {
  const follows = (manifest.reacts ?? []).includes('parts')
  const why = manifest.partless?.trim() ?? ''
  const who = manifest.id || 'This module'
  if (follows && why) {
    return [`${who} says it reacts to parts and also says why it has nothing to narrow (partless). It is one or the other.`]
  }
  if (!follows && !why) {
    return [
      `${who} does not say how it relates to the parts of an epic. Add 'parts' to reacts and narrow with the `
        + 'protocol’s focus helpers, or set partless to one sentence saying why nothing in it belongs to a part.',
    ]
  }
  return []
}

/**
 * 2.9.0. The scopes a module says it can show: `declares.scopes` as written, `['epic']` when it does
 * not say. Takes a parsed manifest or the object about to be parsed.
 */
export function scopesOf(manifest: { declares?: { scopes?: readonly ContextScope[] } } | null | undefined): readonly ContextScope[] {
  const said = manifest?.declares?.scopes
  return said && said.length ? said : ONE_EPIC
}

/** 2.9.0. Whether a module can show a whole project at once (`scope: 'project'`): `project` in `scopesOf`. */
export function showsProject(manifest: { declares?: { scopes?: readonly ContextScope[] } } | null | undefined): boolean {
  return scopesOf(manifest).includes('project')
}

const ONE_EPIC: readonly ContextScope[] = Object.freeze(['epic'] as const)

/**
 * What a host has concluded about one module, in one word: it works (`ready`), it speaks a protocol
 * the host does not (`incompatible`), or nothing is answering (`silent`). A silent module keeps its
 * row in a list rather than vanishing. Which state a module is in is never computed here.
 */
export type ModuleCondition = 'ready' | 'incompatible' | 'silent'

export const MODULE_CONDITIONS = ['ready', 'incompatible', 'silent'] as const
