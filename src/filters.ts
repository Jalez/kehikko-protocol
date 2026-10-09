import { z } from 'zod'
import { LIMITS } from './limits.js'

/* ------------------------------------------------------------------------ *
 * Filters: what a module offers to be narrowed by, and what was chosen
 * ------------------------------------------------------------------------ */

/**
 * The id of a filter group, or of one option within one. `__proto__`, `constructor` and `prototype`
 * are refused, because a choice travels as a record keyed by group id. A host must still read such
 * records with `own()` from `ids.ts`.
 */
const RESERVED_IDS = new Set(['__proto__', 'constructor', 'prototype'])

const filterId = z
  .string()
  .min(1)
  .max(LIMITS.FILTER_ID)
  .refine((id) => !RESERVED_IDS.has(id), {
    message: '__proto__, constructor and prototype are not usable as filter ids',
  })

const filterLabel = z.string().min(1).max(LIMITS.FILTER_LABEL)

/**
 * One value a module can be narrowed to: an id and a word, nothing else. The host does not know
 * what an option means; it draws a menu and reports a press. Any count rides in the label, and a
 * module re-announces its offer whenever the words change.
 */
export const filterOptionSchema = z.object({
  id: filterId,
  label: filterLabel,
})
export type FilterOption = z.infer<typeof filterOptionSchema>

/**
 * One axis a module can be narrowed along, and the options on it. Option ids are unique within a
 * group. A `choice` group needs at least one option and a `fallback` naming one of them; a `text`
 * group has neither options nor fallback; a `toggles` group needs an option and has no fallback.
 */
export const filterGroupSchema = z
  .object({
    id: filterId,
    /** What this axis is called: `ignored`, `kind`, `scope`, `search`. A person reads it. */
    label: filterLabel,
    /**
     * Whether this axis is chosen from (`choice`), typed into (`text`) or a set of switches (`toggles`).
     * Absent means `choice`. What comes back under this group's id is an option id, the text typed, or
     * the list of option ids switched on. A host that does not know a kind draws nothing and sends `{}`.
     */
    kind: z.enum(['choice', 'text', 'toggles']).optional(),
    /**
     * What can be chosen. Empty for a `text` group, at least one for a choice. May be left out; always
     * an array once parsed.
     */
    options: z.array(filterOptionSchema).max(LIMITS.FILTER_OPTIONS).default([]),
    /**
     * Which option this group is on when nobody has chosen, and what a host returns to when a stored
     * choice is no longer offered. One of `options`; required for a choice group, refused for `text`
     * and `toggles`.
     */
    fallback: filterId.optional(),
  })
  .superRefine((group, ctx) => {
    if (group.kind === 'text') {
      /* A module confusing the two kinds: options nothing draws, or a fallback
         that no press can return the input to. */
      if (group.options.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'a text group cannot have options' })
      }
      if (group.fallback !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'a text group cannot have a fallback: its resting state is empty',
        })
      }
      return
    }
    if (group.kind === 'toggles') {
      if (!group.options.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'a toggles group needs at least one option' })
      }
      if (group.fallback !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'a toggles group cannot have a fallback: its resting state is nothing switched on',
        })
      }
      return
    }
    if (!group.options.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'a choice group needs at least one option' })
      return
    }
    if (group.fallback === undefined || !group.options.some((option) => option.id === group.fallback)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "a group's fallback has to be one of its own options" })
    }
  })
  .refine((group) => new Set(group.options.map((o) => o.id)).size === group.options.length, {
    message: 'two options in one group cannot share an id',
  })
export type FilterGroup = z.infer<typeof filterGroupSchema>

/**
 * What each group is set to: group id → an option id, what somebody typed, or (`toggles` only) the
 * list of option ids that are on. Travels host → module in `kehikot.context`, at most `FILTER_GROUPS`
 * entries. A host drops what is not offered now; a module still falls back on an id it does not know.
 */
export const filterChoiceSchema = z
  .record(
    filterId,
    z.union([
      z.string().min(1).max(LIMITS.FILTER_TEXT),
      z
        .array(filterId)
        .max(LIMITS.FILTER_OPTIONS)
        .refine((ids) => new Set(ids).size === ids.length, { message: 'a toggles choice cannot name an option twice' }),
    ]),
  )
  .refine((chosen) => Object.keys(chosen).length <= LIMITS.FILTER_GROUPS, {
    message: `no more than ${LIMITS.FILTER_GROUPS} filter groups can be chosen at once`,
  })
export type FilterChoice = z.infer<typeof filterChoiceSchema>
