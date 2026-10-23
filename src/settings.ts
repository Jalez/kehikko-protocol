import { z } from 'zod'

import { LIMITS } from './limits.js'
import { MODULE_ID } from './ids.js'

/**
 * A module's settings, as a host shows them and a person changes them (2.15.0).
 *
 * A module declares its settings in its manifest (`declares.settings`): a short list of fields, each
 * with a label, a sentence, a type and a default. A host draws one form from that list, for every
 * module, and reads and changes the values by asking the MODULE at its door — `settings.get` and
 * `settings.set`, at `SETTINGS_PATH`. The module is the only writer of its own files: it checks a
 * change, writes it in the format it always had, and says `saved` or `refused` with a sentence.
 *
 * Shapes and pure functions only. The door that answers is the module's (`settingsDoor` in `/serve`
 * is one); the form is the host's. Design notes: docs/settings.md.
 */

/** The kinds of value a setting holds, each drawn by a host as one control. */
export const SETTING_TYPES = ['boolean', 'string', 'number', 'choice', 'list'] as const
export type SettingType = (typeof SETTING_TYPES)[number]

/**
 * Where a setting is kept: `project` — in the project, under `.kehikot/<module>/`, one value per
 * project; `machine` — once for this computer, wherever the module keeps such things.
 */
export const SETTING_SCOPES = ['project', 'machine'] as const
export type SettingScope = (typeof SETTING_SCOPES)[number]

/**
 * A setting's key: a lowercase letter, then letters, digits, `.`, `_` and `-`, at most
 * `LIMITS.SETTING_KEY`. A key names a value in `values`, so the three names an object inherits are refused.
 */
export const SETTING_KEY = new RegExp(`^[a-z][A-Za-z0-9._-]{0,${LIMITS.SETTING_KEY - 1}}$`)
const INHERITED = new Set(['constructor', 'prototype', '__proto__'])

export const settingKeySchema = z
  .string()
  .regex(SETTING_KEY, 'a setting key is a lowercase letter, then letters, digits, . _ and -')
  .refine((key) => !INHERITED.has(key), { message: 'that key is a name every object already has' })

/** One choice of a `choice` setting: the value kept, and the words a person reads. */
export const settingChoiceSchema = z.object({
  value: z.string().min(1).max(LIMITS.SETTING_CHOICE),
  label: z.string().min(1).max(LIMITS.SETTING_LABEL),
})
export type SettingChoice = z.infer<typeof settingChoiceSchema>

const fieldShape = z.object({
  key: settingKeySchema,
  /** What the control is called: "Let the judge merge approved jobs by itself". */
  label: z.string().trim().min(1).max(LIMITS.SETTING_LABEL),
  /** One or two sentences under it: what it does, and what it does not. */
  description: z.string().max(LIMITS.SETTING_DESCRIPTION).default(''),
  type: z.enum(SETTING_TYPES),
  /** For `choice` only, and required there: what may be chosen, in the order to show it. */
  choices: z.array(settingChoiceSchema).min(1).max(LIMITS.SETTING_CHOICES).optional(),
  /** The value when nothing was ever set: of the setting's type. */
  default: z.unknown(),
  scope: z.enum(SETTING_SCOPES).default('project'),
  /**
   * Only a person may change it: a call that does not come from a person — through the host's page
   * with a pass the host vouches for, or from the module's own page with its ticket — is refused.
   * For a switch that acts outside the project, posts somewhere, spends, or runs something.
   */
  personOnly: z.boolean().default(false),
})

/** A setting's whole declaration. Checked: `choices` iff `choice`, choices unique, and `default` of the type. */
export const settingFieldSchema = fieldShape.superRefine((field, context) => {
  if (field.type === 'choice' && !field.choices) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['choices'], message: 'a choice setting lists its choices' })
    return
  }
  if (field.type !== 'choice' && field.choices) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['choices'], message: 'only a choice setting has choices' })
    return
  }
  if (field.choices && new Set(field.choices.map((one) => one.value)).size !== field.choices.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['choices'], message: 'two choices have the same value' })
    return
  }
  const wrong = settingValueIssue(field as SettingField, field.default)
  if (wrong) context.addIssue({ code: z.ZodIssueCode.custom, path: ['default'], message: `the default: ${wrong}` })
})
export type SettingField = z.infer<typeof fieldShape>
export type SettingFieldInput = z.input<typeof fieldShape>

/** A module's whole list of settings: at most `LIMITS.SETTINGS`, each key once. */
export const settingsDeclarationSchema = z
  .array(settingFieldSchema)
  .max(LIMITS.SETTINGS)
  .refine((fields) => new Set(fields.map((one) => one.key)).size === fields.length, { message: 'two settings have the same key' })
export type SettingsDeclaration = z.infer<typeof settingsDeclarationSchema>

/**
 * Why `value` cannot be this setting's value, as a sentence, or null when it can. Pure; the one
 * rule a module's door and a host's form both use.
 */
export function settingValueIssue(field: Pick<SettingField, 'type' | 'choices'>, value: unknown): string | null {
  switch (field.type) {
    case 'boolean':
      return typeof value === 'boolean' ? null : 'on or off: true or false'
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? null : 'a number'
    case 'string':
      if (typeof value !== 'string') return 'text'
      return value.length <= LIMITS.SETTING_TEXT ? null : `at most ${LIMITS.SETTING_TEXT} characters`
    case 'choice': {
      const values = (field.choices ?? []).map((one) => one.value)
      return typeof value === 'string' && values.includes(value) ? null : `one of ${values.map((one) => `"${one}"`).join(', ')}`
    }
    case 'list':
      if (!Array.isArray(value) || value.some((one) => typeof one !== 'string')) return 'a list of lines of text'
      if (value.length > LIMITS.SETTING_LIST) return `at most ${LIMITS.SETTING_LIST} lines`
      return value.some((one) => (one as string).length > LIMITS.SETTING_TEXT) ? `each line at most ${LIMITS.SETTING_TEXT} characters` : null
  }
}

/* ------------------------------------------------------------------------ *
 * The door methods: what a host asks a module
 * ------------------------------------------------------------------------ */

/**
 * What a host may ask at a module's door, by capability, each with the sentence a person reads.
 * The other way round from `CAPABILITIES`: those are what a module asks the host. A module OFFERS a
 * door capability by declaring it — `settings` by listing `declares.settings` — and a host asks
 * these methods only of a module that offers it (`offersDoorCapability`).
 */
export const DOOR_CAPABILITIES = {
  settings: 'Shows its settings in the host’s Settings, and takes a change made there.',
} as const
export type DoorCapability = keyof typeof DOOR_CAPABILITIES

/** Every door method and the capability it is filed under. A plain object: look up with `own()`. */
export const DOOR_METHODS = {
  'settings.get': 'settings',
  'settings.set': 'settings',
} as const satisfies Record<string, DoorCapability>
export type DoorMethod = keyof typeof DOOR_METHODS
export const DOOR_METHOD_NAMES = Object.keys(DOOR_METHODS) as DoorMethod[]

/**
 * Where a module answers its settings: `GET` is `settings.get` (the params in the query), `POST` is
 * `settings.set` (the params as the JSON body). Under `/api/`, so `doors()` routes it to `answer`.
 */
export const SETTINGS_PATH = '/api/kehikot/settings'

/** Who is asking for a change: the person (proved with a pass or the page's ticket), or an agent or program. */
export const SETTINGS_ASKERS = ['person', 'agent'] as const
export type SettingsAsker = (typeof SETTINGS_ASKERS)[number]

/** A pass the host mints for one change a person made on its page: 22 to 64 URL-safe characters. */
export const SETTINGS_PASS = /^[A-Za-z0-9_-]{22,64}$/

/** The project a call is about: its absolute folder. Absent for a module whose settings are all `machine`. */
const projectFolder = z
  .string()
  .min(1)
  .max(LIMITS.PATH)
  .refine((path) => path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path), { message: 'the project is its absolute folder' })

export const doorMethodParams = {
  /** The values now, for this project (and this machine). */
  'settings.get': z.object({ project: projectFolder.optional() }),
  /**
   * Change ONE setting. `by` says who: `agent` unless said (an agent's call says nothing and is an
   * agent's). `by: 'person'` counts only with a `pass` the host vouches for at `SETTINGS_PASS_PATH`,
   * or with the module page's own ticket; without either it is read as `agent`.
   */
  'settings.set': z.object({
    project: projectFolder.optional(),
    key: settingKeySchema,
    value: z.unknown(),
    by: z.enum(SETTINGS_ASKERS).default('agent'),
    pass: z.string().regex(SETTINGS_PASS).optional(),
  }),
} as const satisfies Record<DoorMethod, z.ZodTypeAny>
export type DoorMethodParams<M extends DoorMethod> = z.input<(typeof doorMethodParams)[M]>

/** The values as a module answers them, by key. A value of a key the module did not declare is dropped by a host. */
const settingValues = z.record(z.string(), z.unknown())

/**
 * `settings.get`'s answer. `values`: every declared key's value, the default where nothing was set.
 * `file`: where the project's settings are kept, relative to the project (`.kehikot/factory/settings.json`),
 * so a host can offer to open it to read. `problem`: a sentence when the file could not be read — the
 * values are then the defaults, and nothing was changed.
 */
export const settingsGetResult = z.object({
  values: settingValues,
  file: z.string().min(1).max(LIMITS.PATH).optional().catch(undefined),
  problem: z.string().max(LIMITS.REASON).optional().catch(undefined),
})
export type SettingsGetResult = z.infer<typeof settingsGetResult>

/** What became of a `settings.set`. `saved`: it is written. `refused`: nothing was, and `why` says so. */
export const SETTINGS_SET_OUTCOMES = ['saved', 'refused'] as const
export type SettingsSetOutcome = (typeof SETTINGS_SET_OUTCOMES)[number]

/** `settings.set`'s answer: the outcome, the sentence for a refusal, and the values as they now stand. */
export const settingsSetResult = z.object({
  outcome: z.enum(SETTINGS_SET_OUTCOMES),
  why: z.string().max(LIMITS.REASON).default(''),
  values: settingValues.optional(),
})
export type SettingsSetResult = z.infer<typeof settingsSetResult>

export const doorMethodResults = {
  'settings.get': settingsGetResult,
  'settings.set': settingsSetResult,
} as const satisfies Record<DoorMethod, z.ZodTypeAny>

/** Whether a module offers a door capability: for `settings`, a non-empty `declares.settings`. Pure. */
export function offersDoorCapability(manifest: { declares?: { settings?: readonly unknown[] } } | null | undefined, capability: DoorCapability): boolean {
  if (capability === 'settings') return (manifest?.declares?.settings?.length ?? 0) > 0
  return false
}

/* ------------------------------------------------------------------------ *
 * The person's pass
 * ------------------------------------------------------------------------ */

/**
 * The host's route a module's SERVER asks whether a pass is one it minted:
 * `GET /host/settings-pass?pass=<pass>&module=<id>&key=<key>&project=<folder>` → `settingsPassResult`.
 * A host mints a pass only when its own page sends a person's change, for that module, key and
 * project, and answers `person: true` for it once, within `LIMITS.SETTINGS_PASS_MS`. Programs on this machine.
 */
export const SETTINGS_PASS_PATH = '/host/settings-pass'

export const settingsPassResult = z.object({ ok: z.literal(true), person: z.boolean() })
export type SettingsPassResult = z.infer<typeof settingsPassResult>

/** What a pass is for: the module, the key and the project (absent for a machine setting). */
export const settingsPassAboutSchema = z.object({
  module: z.string().regex(MODULE_ID),
  key: settingKeySchema,
  project: projectFolder.optional(),
})
export type SettingsPassAbout = z.infer<typeof settingsPassAboutSchema>

/* ------------------------------------------------------------------------ *
 * The one rule for a change
 * ------------------------------------------------------------------------ */

/** The sentences a module says about a change, in one wording for every module. */
export const SETTINGS_SAYS = {
  unknown: (key: string, keys: readonly string[]): string =>
    `There is no setting called "${key.slice(0, LIMITS.SETTING_KEY)}". ${keys.length ? `The settings are ${keys.map((one) => `"${one}"`).join(', ')}.` : 'This module has none.'}`,
  wrong: (label: string, issue: string): string => `${label}: that is not a value it takes; it takes ${issue}.`,
  personOnly: (label: string): string =>
    `"${label}" is the person’s to change, in Kehikot’s Settings or on the module’s own page. An agent cannot change it.`,
  noProject: 'Name the project: `project` is its absolute folder.',
} as const

/**
 * Why a change cannot be made, or null when it may be: no such key, a value not of the type, or a
 * `personOnly` setting asked by somebody who is not the person. `person` is the door's finding (a
 * vouched pass, or the page's ticket), never the call's own `by`. Pure.
 */
export function settingsSetRefusal(
  fields: readonly Pick<SettingField, 'key' | 'label' | 'type' | 'choices' | 'personOnly' | 'scope'>[],
  change: { key: string; value: unknown; project?: string | undefined },
  person: boolean,
): string | null {
  const field = fields.find((one) => one.key === change.key)
  if (!field) return SETTINGS_SAYS.unknown(change.key, fields.map((one) => one.key))
  if (field.personOnly && !person) return SETTINGS_SAYS.personOnly(field.label)
  if (field.scope === 'project' && !change.project) return SETTINGS_SAYS.noProject
  const issue = settingValueIssue(field, change.value)
  return issue ? SETTINGS_SAYS.wrong(field.label, issue) : null
}

/**
 * Every declared key's value: what was read where it is of the setting's type, the default where it
 * is not or was never set. Keys not declared are left out. Pure.
 */
export function settingsValues(fields: readonly Pick<SettingField, 'key' | 'type' | 'choices' | 'default'>[], read: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const field of fields) {
    const value = Object.hasOwn(read, field.key) ? read[field.key] : undefined
    out[field.key] = value !== undefined && settingValueIssue(field, value) === null ? value : field.default
  }
  return out
}
