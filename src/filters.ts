import { z } from 'zod'
import { LIMITS } from './limits.js'

/* ------------------------------------------------------------------------ *
 * Filters: what a module offers to be narrowed by, and what was chosen
 * ------------------------------------------------------------------------ */

/**
 * The id of a filter group, or of one option within one.
 *
 * ## Three spellings a module may not use, and why the refusal is here
 *
 * A choice travels as a RECORD keyed by group id, and a record is a plain
 * object. `__proto__`, `constructor` and `prototype` are the three keys that do
 * not behave like keys: assigning `__proto__` on an object literal re-parents
 * it rather than storing anything, and reading `constructor` off one finds
 * something inherited that was never written. A host that stored a choice under
 * one of those and read it back would get an answer it never put there — which
 * is the same hazard `own()` in `ids.ts` exists for, arriving from a new
 * direction, and this time in a key the module chose.
 *
 * `own()` remains the rule for READING these — a host must not index a plain
 * object with a string a stranger sent, whatever this schema says. The refusal
 * here is the second half of the defence rather than a substitute for it: it
 * means the three names never reach storage in the first place, so a host that
 * gets a lookup wrong somewhere has nothing to get it wrong with.
 *
 * Nothing else is legislated. A module's own vocabulary for its own filters is
 * not this package's business, and a regex over it would be this file deciding
 * what a program may call the thing it hides.
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
 * One value a module can be narrowed to.
 *
 * An id and a word, and there is deliberately nothing else. No icon, no colour,
 * no count field, no "kind", no hint about whether this option means more or
 * less of anything.
 *
 * ## The host must not understand what a filter MEANS
 *
 * This is the whole discipline of the feature and it is easy to erode one
 * helpful-looking field at a time. A host that knew `resolved` from `ignored`
 * would be a host to be updated every time a module has a new idea, and the
 * modules this was designed against have six different ideas between them —
 * resolved, ignored, preamble comments, which kehikko an event came from, what
 * kind a reference is, what state it is in. Enumerating those in a protocol
 * would freeze somebody else's vocabulary into a package they do not own.
 *
 * So the host's entire knowledge is: there are some options, one of them is
 * current, and here are the words to print. It draws a menu and reports a
 * press. The meaning stays where the meaning is, which is in the module that
 * wrote the label.
 *
 * ## The count rides in the label, on purpose
 *
 * `hide 3 ignored` is one string, not a label and a number. A separate count
 * field would be the host deciding how a count is phrased and where it goes,
 * for a module that knows both far better — and it would be wrong immediately
 * for the modules whose interesting number is a fraction (`12 of 40 shown`) or
 * is not a number at all. A module re-announces its offer whenever the words
 * change, which it has to do anyway when its options change, so the count is
 * live for free.
 *
 * What a host cannot do is count anything itself. It sees rows it does not
 * render, in a document it cannot read, in a frame on another origin. A module
 * for which the exact number must be visible without a press should go on
 * drawing it in its own page; a header control can say THAT something is
 * narrowed, not how much.
 */
export const filterOptionSchema = z.object({
  id: filterId,
  label: filterLabel,
})
export type FilterOption = z.infer<typeof filterOptionSchema>

/**
 * One axis a module can be narrowed along, and the options on it.
 *
 * ## Why groups, plural, rather than one list of options
 *
 * Six of the seven filters this was designed against are a single choice from a
 * single list, and a facility taking one list would have fitted them all. The
 * seventh — a module that lists an epic's references — narrows by KIND and by
 * STATE at the same time, and the two are independent: issue-and-open is a
 * combination somebody actually wants, and it cannot be spelled as one choice
 * from one list without multiplying the two lists together into twelve options
 * that a person then has to read as a grid.
 *
 * So the shape is a list of groups, each with its own current value, and the
 * one-group case is a list of length one. Two axes cost that module one more
 * entry and cost every other module nothing.
 *
 * ## Free text, which this used to refuse and now has a kind for
 *
 * What stood here said there was no shape for a typed query, that it was a
 * decision rather than an oversight, and that a module wanting one would have
 * its filtering in two places and might well prefer to keep all of it. The
 * reason given was that a text input in a container header needs room a
 * 220-pixel header does not have, needs focus, needs a keyboard, and cannot be
 * debounced or interpreted by a host.
 *
 * That was an argument about a text box in the header STRIP, and it is still
 * correct about one. It was applied to the whole feature, and the feature is a
 * twenty-four-pixel button that opens a MENU — a floating layer with its own
 * width and its own focus scope, where an input costs the header nothing.
 *
 * So there is a `kind` now, `text` is the second value, and the consequence the
 * old paragraph called honest turned out to be the thing worth removing: the
 * module this was designed against had two of its three axes in a header and
 * the third in a row of its own chrome, and a person looking for one filter had
 * to know to look in two places. `LIMITS.FILTER_TEXT` carries the rest of the
 * argument and the bound.
 *
 * A module is still not obliged to hand over anything, and one that keeps all
 * of its own filtering is still a conforming module.
 *
 * ## `fallback` is what makes a stale choice recoverable
 *
 * It names the option this group is on when nobody has chosen — the wide one,
 * the unnarrowed one, whatever the module considers its resting state. It does
 * three jobs, and each would otherwise need its own field or its own
 * convention:
 *
 * - it is the choice for a container nobody has ever pressed this on;
 * - it is what a host returns to when a remembered choice names an option the
 *   module no longer offers, which is the difference between a filter degrading
 *   to normal and a container narrowed by a value nobody can see or clear;
 * - it is how a host can offer one press that puts everything back, without
 *   knowing which of the options means "everything".
 *
 * It must name one of this group's own options, and the schema checks that,
 * because a fallback pointing at nothing would turn the recovery path into a
 * second broken state.
 */
export const filterGroupSchema = z
  .object({
    id: filterId,
    /** What this axis is called: `ignored`, `kind`, `scope`, `search`. A person reads it. */
    label: filterLabel,
    /**
     * Whether this axis is chosen FROM or typed INTO.
     *
     * Absent means `choice`, and that is load-bearing rather than a convenience:
     * every module written before this field existed sends a group without it,
     * and every one of them meant a list of options. A required field with a
     * default would have been a breaking change dressed as an addition.
     *
     * `text` is one input. It has no options and no fallback — its resting state
     * is the empty string, which is not a value anybody stores — and what comes
     * back in `filterChoiceSchema` under this group's id is what somebody typed.
     * The essay on `LIMITS.FILTER_TEXT` is why this exists after being refused
     * twice, and the short version is that the refusal was about a text box in
     * a header STRIP and the control is a MENU.
     *
     * A host that has never heard of `text` draws nothing for such a group,
     * which is the correct degradation: a group with no options renders as an
     * empty section rather than as a broken one, and the module goes on
     * receiving `{}` for it — which is what "nothing typed" means anyway.
     *
     * `toggles` is a SET of independently hideable options. What comes back
     * under its id is a list of the option ids that are switched on — for a
     * group called "hide", the things hidden. It exists because one choice per
     * axis cannot say "hide closed changes, keep closed issues": kind and state
     * were two groups, each holding one value, and the combination people want
     * is a cell of their product. A toggles group says it in one group, which
     * also gives back the groups the product used to cost.
     *
     * Its resting state is the empty set, so it has no fallback, for the reason
     * a text group has none. A host that has never heard of `toggles` draws
     * nothing and sends `{}` — every option off, which is the unnarrowed list.
     */
    kind: z.enum(['choice', 'text', 'toggles']).optional(),
    /**
     * What can be chosen. Empty for a `text` group, at least one for a choice.
     *
     * Defaulted so that a text group may leave it out entirely, and still an
     * array on the way out so that every host already written — `group.options.
     * some(...)` — goes on compiling and goes on being right.
     */
    options: z.array(filterOptionSchema).max(LIMITS.FILTER_OPTIONS).default([]),
    /**
     * Which option this group is on when nobody has chosen. One of `options`.
     *
     * Optional only because a `text` group has none: the resting state of an
     * input is empty, and a fallback naming a value would be a search box that
     * starts with something in it. The refinement below still requires it for
     * every choice group, which is every group anybody has written so far.
     */
    fallback: filterId.optional(),
  })
  .superRefine((group, ctx) => {
    if (group.kind === 'text') {
      /* Both of these are a module confusing the two kinds, and both would
         produce a control nobody could operate: options nothing draws, or a
         fallback that no press can return the input to. */
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
 * What each group is currently set to: group id → an option id, or what
 * somebody typed.
 *
 * This is the half that travels back, and it travels in `kehikot.context` — see
 * the field there for why it is context rather than a message of its own.
 *
 * Bounded to `FILTER_GROUPS` entries, so the record cannot be larger than the
 * offer that produced it. A host filling this in from its own store should also
 * drop anything the module is not currently offering, so that a module never
 * receives a choice it does not recognise; a module should nevertheless fall
 * back to its own default for an option id it does not know, because both
 * halves of a disagreement have to be able to survive it alone.
 *
 * ## The key is still an id. The value is not, any more.
 *
 * It was `filterId` on both sides when every group was a list of options, and
 * the value is now `FILTER_TEXT` — long enough for what somebody types into a
 * `text` group, and comfortably long enough for every option id there has ever
 * been, since `FILTER_ID` is a third of it.
 *
 * Which half was widened matters, and this one is the safe half. The essay on
 * `filterId` is about strings a host uses as KEYS: `stored['constructor']`
 * finds something on the prototype that nobody put there, so the three
 * spellings that are not really keys are refused at the wire. Every one of
 * those defences is on the left-hand side of this record and none of them
 * moved. A value is looked at, compared against an offer, and drawn; it is
 * never used to index anything, and a host that indexes something with it has
 * a bug this bound was never going to prevent.
 *
 * What the wider bound costs is precision on the choice half of a CHOICE group:
 * a stored `{kind: <a 190-character string>}` now validates where it used to be
 * refused at 64. It reaches nothing: a host reconciles every stored value
 * against the offer the module is making right now and drops anything that is
 * not one of that group's options, and the module falls back again on its own
 * side. Two programs already had to survive a value neither of them recognises,
 * because that is what a module shipping new options means; this makes the set
 * of such values slightly larger and changes nothing about what happens to one.
 *
 * ## A list, for a toggles group and for nothing else
 *
 * A `toggles` group's value is the list of its option ids that are on. The
 * value was a string for every group until then, so this is a widening, and it
 * is safe for the reason `kind` was: a module receives a list only under a
 * group it offered as `toggles`, which no module written before the kind
 * existed can have done. A host reconciles a list the way it reconciles a
 * string — drop every id the group does not offer now — and an empty list is
 * stored as nothing, since it means the resting state.
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
