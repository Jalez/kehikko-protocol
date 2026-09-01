import { z } from 'zod'
import { LIMITS, MESSAGE, PROTOCOL } from './constants.js'
import { EPIC_SLUG, MODULE_ID } from './ids.js'

/**
 * Everything the two sides say to each other.
 *
 * A module's page runs in a frame the host created, cross-origin to it, and the
 * only channel between them is `postMessage`. That is a good channel and a
 * narrow one: nothing structural stops either side from sending anything, so
 * every field below is a thing somebody else's program chose, and the shapes
 * here exist to make it cheap to say no to the ones that are wrong.
 *
 * ## Addressing, which is not this package's problem but is worth knowing
 *
 * A module without `declares.storage` runs on an opaque origin. It has no
 * origin string, so there is no `targetOrigin` that matches it and everything
 * it sends arrives with an origin of `"null"` — a string every opaque frame in
 * every tab shares, which is why it can only ever be a shape check and never an
 * identity one. The identity is the window: the exact frame handle the host
 * created and greeted, which nothing in the page and nothing in the frame can
 * forge. A module WITH storage has an origin, and then there is a second thing
 * to check as well as the window.
 *
 * None of that is modelled here, because none of it is a shape. It is written
 * down because a client library reading these schemas has to get it right and
 * the schemas will not tell it.
 *
 * ## Parse both directions
 *
 * A host validating what a module sends is obvious. A module validating what
 * the host sends is not, and is the same rule: a framed page receives every
 * message posted at its window, from the host, from a bundler's dev socket,
 * from anything else that has a handle on it. The type check is what tells a
 * `roadmap.context` from a coincidence.
 */

/**
 * What a module is told about where the reader is standing.
 *
 * ## An epic and a project, because that is what a host can vouch for
 *
 * The field used to be called `slug` and used to mean a journey, and a host is
 * not in a position to say that. A journey lives in a module app of its own; if
 * the host named one here it would be repeating something it was told, in a
 * message a module then treats as authoritative — and the module app that owns
 * journeys could be showing a different one, or none, or have been closed.
 * Context has to be the host's own knowledge or it is a rumour with a
 * protocol's name on it.
 *
 * What the host actually knows is which epic it opened and which project that
 * epic belongs to. So that is what it says. A module wanting to know what
 * journey a person is reading asks the program that owns journeys, and gets an
 * answer from something that can actually answer.
 *
 * The project arrives as two fields — what it is called, and where it is on
 * disk — for reasons argued at each of them below. The short version is that a
 * module has to be able to both NAME the project and OPEN it, and one string
 * cannot do both jobs well.
 *
 * `epic` is null when none is open, and it is nullable rather than absent
 * because "no epic" is a state a module has to be able to move INTO. A field
 * that simply disappeared would leave the module showing the last epic it heard
 * about, forever, which is a page quietly describing the wrong work.
 *
 * `theme` rides along for the same reason the rest of it does: a module that
 * had to ask would render once in the wrong colours first.
 */

/**
 * Where in a document the reader is pointing, at whatever precision they have
 * managed.
 *
 * ## One field, three states, and that is the whole design
 *
 * The ask this exists for was: a pane showing a page of a paper, and a pane
 * showing the notes on it, and the second one narrowing as the first one
 * narrows. Nothing selected but a page open should show the page's notes; a
 * passage selected should show that passage's. Those are not two facts. They
 * are one fact — what is being pointed at — known to two different depths, and
 * the shape has to say so or every consumer invents its own ladder.
 *
 * So there are exactly three readings, and no fourth is expressible:
 *
 *   1. `passage` is `null` — no document is open. Nothing is being pointed at
 *      and nothing narrower could be.
 *   2. `passage` is set and `from`/`to` are `null` — a document is open and the
 *      reader has selected nothing in it. `page`, if the pointing module
 *      paginates, says which sheet is in front of them.
 *   3. `passage` is set and `from`/`to` are numbers — a range of that document
 *      is selected, and `quoted` is what it said when they selected it.
 *
 * `from` and `to` are refused unless BOTH are present and `to` is greater. A
 * half-range is not a coarser answer, it is a malformed one: a consumer reading
 * `from` with no `to` has to invent an end, and the end it invents is a claim
 * about somebody's document. The refusal is where that gets noticed.
 *
 * ## Why not two fields, or a discriminated union
 *
 * `document` beside `selection` was the first shape and it is worse in the way
 * that matters: two fields can disagree — a selection in a document nobody
 * says is open — and every consumer would need a rule for the disagreement,
 * and three consumers would write three rules. A tagged union of `{kind:
 * 'page'} | {kind: 'range'}` cannot disagree, and costs every reader a branch
 * before it can print a path. Nesting the narrower thing inside the wider one
 * gets both: the states are ordered by construction, and the fields common to
 * all of them are read the same way in every state.
 *
 * ## What the host can vouch for, which is less than this carries
 *
 * The same limit `selection` has, and it is worth restating because there is
 * more here to be wrong about. A host relays this; it did not open the file. It
 * cannot say that `path` exists, that `from` and `to` are inside it, that
 * `quoted` is what is there now, or that it ever was. What a host CAN say is
 * that a module on this canvas reported somebody pointing here. Context is the
 * host's own knowledge or it is a rumour with a protocol's name on it — and
 * this one is honestly the second kind, so a consumer must treat every field as
 * a claim by the pointing module and check anything it is going to act on.
 *
 * That is not a flaw to be designed out. It is the reason `quoted` is here: a
 * consumer holding the words as well as the offsets can tell a good anchor from
 * a rotten one by looking, which nothing holding offsets alone can do.
 */
export const passageSchema = z.object({
  /**
   * Which document. An identity string, and deliberately not promised to be
   * anything else.
   *
   * This package does no I/O and cannot say whether a path exists, is
   * absolute, or is inside anything — see `LIMITS.PATH`, which is the same
   * bound and the same argument. A host with a filesystem should send an
   * absolute path, because that is the only spelling two modules can agree on
   * without sharing a root; a host without one sends whatever names a document
   * in its world. Consumers compare it for EQUALITY. A consumer that resolves
   * it and opens it is opening a path a stranger's program chose, and owes
   * itself the confinement check it would owe any other.
   */
  path: z.string().min(1).max(LIMITS.PATH),
  /**
   * Which page of it, or null.
   *
   * Nullable because pagination is not a property of documents; it is a thing
   * some readers do to them. A module showing a scrolling document has no page
   * to name and must not be forced to invent one, and a consumer receiving null
   * knows the difference between "not paginated" and "page 1".
   *
   * It is a FILTER and never an anchor, and the difference is the reason this
   * sits beside `from`/`to` rather than instead of them. Page numbers move when
   * anything above them is edited; byte offsets at least rot visibly against a
   * quote. Anything written down permanently should be written against the
   * range and the words, with the page kept as what it is — a fast way to
   * narrow a list to the sheet somebody is looking at.
   */
  page: z.number().int().min(1).nullable().default(null),
  /**
   * The first byte of the selection within `path`, or null when nothing is
   * selected. Bytes rather than characters, because the consumer that opens
   * the file reads bytes and a character count would need the encoding to be
   * agreed on as well.
   */
  from: z.number().int().min(0).nullable().default(null),
  /** One past the last byte, exclusive, or null. */
  to: z.number().int().min(0).nullable().default(null),
  /**
   * What the selection said when it was made, as the pointing module saw it.
   *
   * Empty when nothing is selected, which is the only honest value then — there
   * is no text to quote for a whole page and a module that sent the page's text
   * would be sending a document through every frame on the canvas.
   *
   * Bounded at `LIMITS.QUOTE` and REFUSED rather than clipped; the essay on that
   * limit says why a clipped quote is worse than no quote at all.
   */
  quoted: z.string().max(LIMITS.QUOTE).default(''),
})
  .refine((p) => (p.from === null) === (p.to === null), {
    message: 'a passage names both ends of a selection or neither; a half-range is a malformed answer, not a coarser one',
  })
  .refine((p) => p.from === null || p.to === null || p.to > p.from, {
    message: 'a passage ends after it starts',
  })

/** Where the reader is pointing, at whatever precision they have. */
export type Passage = z.infer<typeof passageSchema>

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
     */
    kind: z.enum(['choice', 'text']).optional(),
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
 * What a module currently offers to be narrowed by. The whole offer, every time.
 *
 * Replacing rather than merging, and the difference is the one that matters
 * when a module's options CHANGE: a merge could never remove a group, so a
 * module that stopped offering something would leave a control behind it that a
 * person could press and nothing would answer. An empty array is a real message
 * — "nothing here can be narrowed now" — and a host that receives one takes the
 * control away.
 *
 * A module sends this whenever the answer changes, which includes whenever the
 * words change. See `filterOptionSchema` on why the count lives in the label.
 */
export const filtersSchema = z.object({
  type: z.literal(MESSAGE.FILTERS),
  groups: z
    .array(filterGroupSchema)
    .max(LIMITS.FILTER_GROUPS)
    .refine((groups) => new Set(groups.map((g) => g.id)).size === groups.length, {
      message: 'two groups cannot share an id',
    }),
})
export type Filters = z.infer<typeof filtersSchema>

/* ------------------------------------------------------------------------ *
 * Clearing: a module offering to delete what it is showing
 * ------------------------------------------------------------------------ */

/**
 * What a module offers to clear, in its own words. The whole offer, every time.
 *
 * A `label` and nothing else, and the emptiness of that is the same discipline
 * `filterOptionSchema` keeps: no count field, no icon, no severity, no "kind",
 * and above all no list of what would go. The host draws a control and reports
 * a press. What "shown" means, what is behind it, and how much of it there is
 * are the module's business, and a host that was told any of it would be a host
 * that could be updated every time a module has a new idea about its own data.
 *
 * ## The count rides in the label, as it does for a filter
 *
 * `clear 12 shown` is one string. It has to be one string, because the number
 * is the whole reason a person reads this control before pressing it — it is
 * how they discover that their filter narrowed things to three rather than
 * thirty, which is the difference between the press they meant and the press
 * they did not. A separate count field would be this package deciding how a
 * count is phrased, for a module that knows better and whose interesting
 * number is sometimes not a number (`everything from this run`).
 *
 * ## `null` is a real message, and it is the withdrawal
 *
 * It says there is nothing on screen to clear now. The host takes the control
 * away rather than leaving a button that deletes nothing — a button whose press
 * has no effect teaches a person that the button does not work, which they will
 * remember on the day it would have. It is the exact counterpart of `filters`
 * sending an empty `groups`, and it exists for the same reason: whole
 * replacement is what lets an offer be taken back.
 *
 * A module re-announces whenever the words change, which — because the words
 * carry a count — is whenever what it shows changes. Including immediately
 * after it has been asked to clear, which is the only feedback loop this
 * feature has and the only one it needs.
 */
export const clearableSchema = z.object({
  type: z.literal(MESSAGE.CLEARABLE),
  /** The words on the control, or `null` to take the control away. */
  label: z.string().min(1).max(LIMITS.CLEAR_LABEL).nullable().default(null),
})
export type Clearable = z.infer<typeof clearableSchema>

/**
 * The press, relayed. "Clear what you are showing."
 *
 * Deliberately empty apart from its type, and every field somebody will want to
 * add to it is a field that would break the feature.
 *
 * **Not a list of what to delete**, because the host does not know and must not
 * find out. **Not the filter choice**, because the module already has that from
 * `roadmap.context` and a second copy would be a second answer to one question,
 * arriving on its own schedule and disagreeing after any race. **Not a
 * correlation id**, because there is no answer: see `MESSAGE.CLEAR` for why an
 * acknowledgement would only tempt a host into reporting a number it did not
 * count.
 *
 * `protocol` rides along as it does on every other host message, so a module
 * can tell which host it is talking to without keeping the greeting.
 */
export const clearSchema = z.object({
  type: z.literal(MESSAGE.CLEAR),
  protocol: z.number().int().min(1),
})
export type Clear = z.infer<typeof clearSchema>

/* ------------------------------------------------------------------------ *
 * Refreshing: a module offering to read its material again
 * ------------------------------------------------------------------------ */

/**
 * What a module says about being refreshed. The whole state, every time.
 *
 * Three fields and no fourth, and the discipline is `clearableSchema`'s: no
 * count of what would be read, no description of where from, no error, no
 * interval. The host draws a control, reports a press, and formats one
 * timestamp it was handed.
 *
 * ## `at` is the only fact in this protocol a host would otherwise guess
 *
 * The essay on `MESSAGE.REFRESHABLE` is the long form and it is worth having
 * the short one here, beside the field: the host knows when it ASKED, and when
 * it asked is not when the data is from. A module may answer out of a cache, a
 * refresh may fail over a reading it keeps showing, and a module may refresh
 * itself for a reason the host has no view of. In all three a host that dated
 * the data from its own message would print a time that is wrong beside data
 * that is older than it says.
 *
 * So it is an ISO 8601 instant, with an offset, from the module — and `null` is
 * a real answer meaning "I cannot say", for which a host draws no time at all
 * rather than inventing one. A module that has never successfully read anything
 * sends `null` and keeps sending it.
 *
 * ## `can` is how the control is withdrawn, and it is not `busy`
 *
 * `false` takes the control away: there is nothing to refresh right now — no
 * project, no document, nothing this module could read again — and a button
 * that cannot work teaches a person that the button does not work, which they
 * will remember on the day it would have. It is the counterpart of `clearable`
 * sending `null` and of `filters` sending an empty `groups`.
 *
 * `busy` leaves the control there and says a read is in flight. Two presses
 * racing is two subprocesses and one answer that wins for no reason anybody
 * could predict, and the module is the only side that knows.
 *
 * A module re-announces whenever any of the three changes, which is at least
 * twice per refresh — `busy: true` on the way in, a new `at` on the way out —
 * and that is the whole of the feedback this feature has.
 */
export const refreshableSchema = z.object({
  type: z.literal(MESSAGE.REFRESHABLE),
  /** Whether there is anything to read again right now. `false` withdraws the control. */
  can: z.boolean().default(true),
  /** When this module's material was last read, as the MODULE knows it. */
  at: z.string().datetime({ offset: true }).nullable().default(null),
  /** Whether a read is in flight this second. */
  busy: z.boolean().default(false),
})
export type Refreshable = z.infer<typeof refreshableSchema>

/**
 * The press, relayed. "Read your material again."
 *
 * Empty apart from its envelope, exactly like `clearSchema`, and every field
 * somebody will want to add is one that would break it.
 *
 * **Not why.** A person pressed the button, or an interval elapsed; the module
 * cannot tell and must not need to, because a flag saying "this one was
 * automatic" would be used to behave differently and that is the module setting
 * policy from a fact about somebody else's timer.
 *
 * **Not the interval**, because the host runs the clock — see `MESSAGE.REFRESH`
 * — and a module told the number would be a module tempted to run a second
 * timer beside it.
 *
 * **Not a correlation id**, because there is no answer. What comes back is a
 * new `roadmap.refreshable`: `busy` while it runs, then a new `at`. An
 * acknowledgement would only tempt a host into reporting on work it cannot see.
 */
export const refreshSchema = z.object({
  type: z.literal(MESSAGE.REFRESH),
  protocol: z.number().int().min(1),
})
export type Refresh = z.infer<typeof refreshSchema>

/**
 * What each group is currently set to: group id → an option id, or what
 * somebody typed.
 *
 * This is the half that travels back, and it travels in `roadmap.context` — see
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
 */
export const filterChoiceSchema = z
  .record(filterId, z.string().min(1).max(LIMITS.FILTER_TEXT))
  .refine((chosen) => Object.keys(chosen).length <= LIMITS.FILTER_GROUPS, {
    message: `no more than ${LIMITS.FILTER_GROUPS} filter groups can be chosen at once`,
  })
export type FilterChoice = z.infer<typeof filterChoiceSchema>

export const contextSchema = z.object({
  epic: z.string().regex(EPIC_SLUG).nullable().default(null),
  /**
   * What the project is CALLED. Unchanged, and deliberately still a name.
   *
   * This is the string a module puts on screen. A path is a bad label — it is
   * long, it is the same for its first forty characters as every other project
   * on the machine, and its last segment is a folder name somebody chose for
   * their disk rather than a name they chose for their work. A host that sent
   * only a path would make every module invent a display name by splitting a
   * string, and eleven modules would split it eleven ways.
   */
  project: z.string().max(LIMITS.PROJECT).nullable().default(null),
  /**
   * Where the project IS: an absolute folder path on the host's machine.
   *
   * ## Why a name was not enough
   *
   * A name is something to print. Everything a module actually wants to DO with
   * a project needs somewhere to open: read the epics under it, run a command
   * in it, show its history, list its chapters. Until this field existed each of
   * those modules had to be told its own root separately — an environment
   * variable per module, set by whoever started it — so a host could move a
   * person to another project and every module would go on reading the first
   * one, correctly, from the root it was given at launch. Nothing errored. The
   * modules simply described a different project from the one the host named.
   *
   * Absolute, and the host is the only one in a position to vouch for that.
   * This package does no I/O and cannot check it — see `LIMITS.PATH`. A module
   * receiving a relative path here has been handed something its host could not
   * have meant, and should treat it as it treats any other field it was lied
   * to about.
   *
   * Null is a real state and not an oversight. A host with no filesystem of its
   * own — a hosted one, a demo, a test harness — knows the name of the project
   * a person is looking at and has no folder to point at. A module handed a
   * name and no path can still say which project it is showing and must not
   * pretend it can open it.
   *
   * ## Why this is a second field and not `project: { name, path }`
   *
   * The tidier shape is the object: two facts about one thing, atomically
   * consistent, impossible to have a path without a name — and it is the shape
   * this package already uses for `kehikko`. It was rejected here for one
   * reason, and the reason is `PROTOCOL`.
   *
   * `PROTOCOL` goes up when an existing field CHANGES SHAPE, and stays put when
   * the wire merely learns a new word — see the essay on it in `constants.ts`,
   * which is emphatic that a number going up for additions is a number nobody
   * can act on. Turning `project` into an object is exactly a shape change: a
   * module rendering `context.project` in a span prints a project name today
   * and `[object Object]` afterwards, with no version signal to tell it why.
   * That module is not degraded, it is broken, and the protocol's own rule says
   * it should have been told it was INCOMPATIBLE rather than left to find out
   * on screen.
   *
   * So the choice was: bump the protocol and make every module in the world
   * incompatible in order to nest two strings, or add a field and break
   * nothing. The second is what the rule is for. `project` still means what it
   * meant, still parses as what it parsed as, and a module that never reads
   * `projectPath` is exactly as correct as it was yesterday — which is the test
   * this package applies to every addition.
   *
   * The cost is honest and worth naming: two nullable fields can disagree, and
   * nothing here prevents a host sending a path with no name. A host should
   * fill them in one place, from one project, so that they cannot; this package
   * can say that and cannot enforce it.
   */
  projectPath: z.string().min(1).max(LIMITS.PATH).nullable().default(null),
  theme: z.enum(['light', 'dark']).default('light'),
  /**
   * What the person has picked out, if anything.
   *
   * ## Why a selection is context and not a message between modules
   *
   * The case that produced this: one module lists an epic's references, another
   * shows a journey, and picking a reference in the first should show it in the
   * second. The obvious build is a channel from one to the other — and that
   * ends modularity, because the first module then has to know the second
   * exists, and a canvas without the second is a canvas where the first is
   * sending into nothing.
   *
   * A selection is the same KIND of fact as the open epic: it is what this
   * canvas is looking at. So it travels the way the epic travels. A module asks
   * the host to set it, the host tells everyone, and no module ever learns
   * which other module is listening — or whether any is. Each works alone, and
   * two of them work together without either having been written for the other.
   *
   * ## Refs and nothing else
   *
   * The sender knows more than this carries — which of these is an issue and
   * which a pull request — and that knowledge deliberately does not travel. See
   * `selection.set` in `methods.ts`: a host can vouch that these are the refs
   * somebody picked, and cannot vouch for what they ARE, because it was told
   * and never checked. Context is the host's own knowledge or it is a rumour
   * with a protocol's name on it, which is the same reason `slug` is not here.
   *
   * Empty rather than absent, for the reason `epic` is nullable rather than
   * optional: "nothing is selected" is a state a module has to be able to move
   * INTO, and a field that simply vanished would leave a module showing the
   * last selection forever.
   */
  selection: z.array(z.string().min(1).max(LIMITS.REF)).max(LIMITS.REFS).default([]),
  /**
   * Where in a document the reader is pointing, or null.
   *
   * ## A passage is context, and the argument is the one above, unchanged
   *
   * The essay on `selection` a few lines up makes the case for a picked
   * reference travelling as context rather than as a message from one module to
   * another, and every line of it holds here with the nouns swapped. A reader
   * highlights a sentence in the module that shows the paper; a module that
   * keeps notes should narrow to it. The obvious build is a channel from the
   * first to the second, and it ends modularity: the paper would have to know
   * the notes exist, and a canvas without the notes is a paper sending into
   * nothing.
   *
   * There is a second argument here that `selection` did not need, and it is
   * the stronger one. **An event would be missed.** A selection made at
   * 10:04 and a module opened at 10:05 is the ordinary case — a person reads,
   * finds something worth a note, and only then puts a notes pane on the
   * canvas. A message sent at the moment of pointing is gone by then, and the
   * new pane would open empty beside a reader who is quite plainly pointing at
   * something. State is what a module can arrive late to, and pointing at a
   * passage is a state: it is true for as long as the highlight is on screen,
   * not for the instant the mouse came up.
   *
   * ## Null rather than absent, for the reason everything here is
   *
   * "No document is open" is a state a module has to be able to move INTO. A
   * field that vanished would leave a notes pane showing the notes on a chapter
   * the reader closed ten minutes ago, with no way to tell that from the
   * chapter still being open — which is a pane confidently describing the wrong
   * document, the failure this whole file is arranged against.
   *
   * A module reading this against a host that has never heard of it finds
   * `null`, which is the true answer there: that host has nobody pointing at
   * anything.
   */
  passage: passageSchema.nullable().default(null),
  /**
   * Whether this module has been pinned, and will stop being re-pointed.
   *
   * ## The field that makes pinning honest
   *
   * A person may want two panes on two different epics — last quarter's beside
   * this one, to compare — or a module holding still while they move the canvas
   * around it. Nothing stops a host doing that: it simply sends one frame a
   * different context, or stops sending it new ones.
   *
   * What stopped it being allowed was the other side. A module pinned by a host
   * that never said so has no way to tell a person's pin from the canvas not
   * having moved. It goes on describing itself as showing "the open epic" when
   * it is showing a remembered one; it cannot explain itself; and a module
   * written against one host's silent pinning behaves differently there in a
   * way its author cannot discover. That is a host-only convention, and this
   * package's whole position is that a module must be able to see what it is
   * subject to.
   *
   * So the pin is said out loud. `true` means: what you were last told is what
   * you keep, and further changes to this canvas will not reach you until this
   * goes false again. A module that ignores the field is exactly as correct as
   * it was before — it simply stops receiving updates, which is the behaviour a
   * host could always have chosen. A module that reads it can say "held" in its
   * own words, which is the whole point.
   *
   * The context carrying it is still sent when the pin CHANGES, in both
   * directions, and that is not a contradiction of "you will receive nothing":
   * the message announcing the freeze is the last one through, and the message
   * lifting it is the first. A pin nobody was told about is the thing this
   * field exists to prevent.
   */
  pinned: z.boolean().default(false),
  /**
   * What this canvas has been told to tell this module, or null.
   *
   * ## A prompt is a thing a person wrote, aimed at one pane
   *
   * Some modules do work that has to be described before it can be done —
   * "review these for security", "the house style is in CONTRIBUTING.md" — and
   * the description belongs to the person, not to the program. So it is written
   * on the canvas and delivered here, the same way the selection is: a module
   * declaring `prompt` in its manifest is saying it has a use for one, and a
   * host that has one for it puts it in the context.
   *
   * ## Why the host composes it, and a module receives one string
   *
   * Several panes on a canvas may each have something to say to the same
   * module. The obvious shape is a list of fragments with their authors, and it
   * is wrong here: it makes every module that reads a prompt responsible for
   * merging fragments, ordering them, and deciding what happens when two
   * contradict — which is a policy question about somebody's own canvas, and
   * three modules would answer it three ways.
   *
   * The host already knows what is on the canvas, who aimed what at whom, and
   * in what order they were written. So it composes, and hands over the result
   * as text. A module's job is to use it, and its author should be able to read
   * the whole of what they were given in one place — which is also what makes
   * it reviewable by the person who wrote it, in the host, before it is sent.
   *
   * Null rather than empty for the reason `epic` is nullable: "there is no
   * prompt for you" is a state a module must be able to move into, and a module
   * that kept the last one forever would be working from instructions somebody
   * deleted.
   */
  prompt: z.string().max(LIMITS.PROMPT).nullable().default(null),
  /**
   * Which kehikko this context is about.
   *
   * A module's page is loaded once and shown on whichever canvas asks for it,
   * so a module genuinely cannot tell where it is standing — and it needs to
   * the moment anything else on the wire says where IT came from. An event
   * carries the kehikko it happened on; this says the one being looked at; and
   * near-or-far becomes a comparison the module makes rather than a rule the
   * host imposes.
   *
   * Nullable because a host need not have canvases at all. A module that finds
   * it null can still show everything it is sent — it simply cannot sort near
   * from far, which is a smaller loss than being handed a wrong answer.
   */
  kehikko: z.object({ id: z.number().int(), name: z.string().max(80) }).nullable().default(null),
  /**
   * Which of the filters this module offered are currently chosen for it.
   *
   * ## Why the choice is context and not a message of its own
   *
   * The offer goes one way as `roadmap.filters`, so the obvious symmetry is a
   * `roadmap.chose` coming back. It is the wrong shape, for three reasons that
   * all point the same way.
   *
   * The first is that a module has to have this BEFORE it draws. A page told
   * which filter it is on a beat after it mounted renders the unnarrowed list
   * and then narrows it, in front of somebody watching — the visible-flicker
   * failure `state` in `helloSchema` exists to prevent, and the greeting is the
   * only thing that arrives before the first render. A message of its own would
   * either have to be duplicated into the greeting anyway, or arrive too late.
   *
   * The second is that it is not an event. A filter is TRUE for as long as it
   * is set, and a module can arrive late to it — reloaded, restarted hours
   * later by a host that had stopped it, framed for the first time on a canvas
   * where somebody chose something last week. That is exactly the argument
   * `passage` makes a few fields up: state is what a module can arrive late to,
   * and a message sent at the moment of pressing is gone by then.
   *
   * The third is that it is per-CONTAINER, and this is the message that already
   * carries per-container facts. `pinned` and `prompt` are both here for the
   * same reason: a module's page is loaded once and shown on whichever canvas
   * asks for it, so anything that differs between two places the same module is
   * shown has to arrive on the channel the host re-sends when the canvas moves.
   * A separate message would need its own copy of that discipline.
   *
   * ## What a module should do with an id it does not recognise
   *
   * Use its own default for that group, and say nothing. A host is expected to
   * drop a choice naming an option the module is not currently offering — see
   * `fallback` on `filterGroupSchema` — but a host cannot do that before the
   * module has said what it offers, and the greeting goes out first. So the
   * first choice a module ever receives may name an option from a version of
   * itself that no longer exists, and a module that trusted it would narrow by
   * a value nobody can see, choose, or clear.
   *
   * Both halves defend it, deliberately. Two programs that each assume the
   * other got it right is how a stale value survives.
   *
   * Empty rather than absent, for the reason every other field here is: "nothing
   * is narrowed" is a state a module has to be able to move back into, and a
   * module reading this against a host that has never heard of filters finds
   * `{}`, which is the true answer there.
   */
  filters: filterChoiceSchema.default({}),
})
export type ModuleContext = z.infer<typeof contextSchema>

/** The id correlating a question with its answer, or a `goto` with its `went`. */
const correlation = z.string().min(1).max(LIMITS.CORRELATION)

/* ------------------------------------------------------------------------ *
 * Host → module
 * ------------------------------------------------------------------------ */

/**
 * Hello: the whole of what a module is given without asking.
 *
 * Sent on every frame LOAD, not on the first one only: a frame that reloads
 * itself has forgotten the conversation, and greeting it again is cheaper than
 * either side wondering. And sent on load rather than on a timer, because a
 * guess long enough to be safe is a guess a slow machine still loses, and a
 * module greeted before its own script ran is one that never hears the
 * greeting.
 *
 * `protocol` is the host's answer — what the two sides settled on when the
 * manifest was read — and not either half's opinion of it.
 *
 * `session` names this conversation so a module can tell a reload from a second
 * frame. It is not a credential and must never become one: a module holds no
 * token, and every question it asks is checked by the host on the host's own
 * terms rather than against anything it was handed here. A session id that
 * unlocked something would be a secret sitting in a frame that any script in
 * that frame can read.
 *
 * The context rides along because the first thing every module wants is which
 * epic is open, and a second round trip to learn it is a round trip for
 * nothing.
 *
 * There is no list of permissions in the greeting. There was, in an earlier
 * design where a person answered a dialog; there is nothing to list now, and a
 * field here saying what a module "may" do would be this package modelling an
 * approval it has no business modelling.
 */
export const helloSchema = z.object({
  type: z.literal(MESSAGE.HELLO),
  protocol: z.number().int().min(1),
  session: z.string().min(1).max(LIMITS.SESSION),
  context: contextSchema,
  /**
   * Whatever this module last asked the host to keep for it, verbatim.
   *
   * Beside the context rather than inside it, and that placement is the whole
   * point: context is broadcast to every framed module, and this belongs to one
   * of them. A module's remembered state travelling in a shared message would
   * be every module reading every other module's preferences.
   *
   * `null` when the host keeps nothing for it — a first run, a host that does
   * not answer `state.set`, a module that has never written any. It is not
   * optional, because a module has to be able to tell "nothing kept" from "the
   * field is missing because this host is older than the idea", and only one of
   * those means it should draw its defaults with confidence.
   *
   * In the GREETING rather than fetched, so a module has it before its first
   * render. Asking for it afterwards would mean drawing the wrong filter first
   * and correcting it, which is the visible-flicker failure in a different
   * costume.
   *
   * Opaque. The host stored a string and hands the same string back; see
   * `state.set` in `methods.ts` for why it must never learn what is in it.
   */
  state: z.string().max(LIMITS.MODULE_STATE).nullable().default(null),
})

/**
 * Which epic is open now.
 *
 * Sent when the reader switches epics and when the module's own tab is
 * shown. Flat rather than wrapping a `context` object, which is an
 * inconsistency with `hello` and is kept because it is what both halves already
 * speak — the same fields, one level up. `contextSchema` is the shared
 * definition either way, so the two cannot drift apart in what they carry.
 *
 * Only epic-scoped modes are told. A `global` mode asked for one page over the
 * whole roadmap and gets one.
 */
export const contextMessageSchema = contextSchema.extend({
  type: z.literal(MESSAGE.CONTEXT),
  protocol: z.number().int().min(1),
})

/**
 * The answer to exactly one request.
 *
 * Two shapes under one type, and the split is the point: a caller either got
 * data or got a refusal, and a single object with four optional fields makes
 * that a thing to work out rather than a thing to branch on.
 *
 * A refusal carries BOTH halves, always. `reason` is a word from a closed set,
 * for the program: "ask again later" and "never, this method does not exist"
 * are different futures and code has to be able to tell them apart without
 * reading English. `error` is a sentence, for the person: whoever is writing
 * the module reads it in their own console and has to know which of their calls
 * was wrong. Neither substitutes for the other. A reason with no sentence is a
 * developer bisecting their own code to find out what happened; a sentence with
 * no reason is a client parsing prose.
 */
export const responseFailureReasons = ['unknown-module', 'unknown-method', 'failed'] as const
export type ResponseFailureReason = (typeof responseFailureReasons)[number]

/**
 * Three reasons, and there used to be four.
 *
 * `not-allowed` is gone with the permission system it described. What remains
 * are: this host has no module by that name (which is a module talking to a
 * host that has forgotten it, usually after being removed while its frame was
 * still open); this host has no such method (which is a module built against a
 * protocol this host no longer speaks, and is the one refusal an author should
 * treat as fatal); and it went wrong (which is everything else, and is the only
 * one worth retrying).
 *
 * A host may of course refuse a call for reasons of its own — that is the whole
 * of what a host is for. It says so with `failed` and a sentence. Adding a
 * reason per policy would be this package enumerating hosts' policies, which is
 * a list that cannot be kept and would read as the set of policies allowed.
 */
export const responseSchema = z.discriminatedUnion('ok', [
  z.object({
    type: z.literal(MESSAGE.RESPONSE),
    id: correlation,
    ok: z.literal(true),
    /**
     * Whatever the method answers with, and deliberately untyped. See the note
     * at the top of `methods.ts`: a client that asserted a shape here would be
     * asserting something no host promised.
     */
    data: z.unknown(),
  }),
  z.object({
    type: z.literal(MESSAGE.RESPONSE),
    id: correlation,
    ok: z.literal(false),
    reason: z.enum(responseFailureReasons),
    /**
     * Bounded, because a refusal is the one place a host quotes a module's own
     * text back at it — the method name it asked for, the extension it named —
     * and a sentence that carried two hundred thousand characters of that back
     * across the frame would be a module's document, round-tripped, at the
     * module's own request. Long enough for every sentence anybody actually
     * writes; short enough that no answer is ever a document.
     */
    error: z.string().max(LIMITS.REASON).default(''),
  }),
])

/**
 * Go to a reference.
 *
 * ## Why this message is the interesting one
 *
 * A host walks a reader to a reference by reaching into the panel: query for
 * the anchor, open whatever is folded above it, scroll it to the middle, flash
 * it. That works while the panel is part of the host's own page and stops
 * working entirely the moment the panel is a module, because the frame is
 * cross-origin, its document is unreachable, and there is no way to reach in.
 *
 * There is a fallback that needs no protocol at all — set the frame's location
 * to `#epic=x&ref=y`, which a page may do cross-origin — and it costs a
 * navigation: the document reloads and the handshake happens again. That is why
 * it is the fallback and this is the message.
 *
 * `ref` is a reference as the host spells them. `step` is 1-based. `epic` is
 * optional and means "switch first", which the host would ordinarily have sent
 * as context anyway. The bounds — `GOTO_REF`, 1..999, the slug pattern — are
 * not invented here: they are what the receiving end already imposes, restated
 * so the sender knows what will survive.
 *
 * `id` is required, and it is the reason this message needed designing rather
 * than just writing down. See `wentSchema`.
 *
 * The mirror of this message is the `view.goto` method, which is a module
 * asking for the same act. The fields are named the same on both sides
 * deliberately. They differ in exactly one way, and it is the direction of the
 * asking: a `goto` naming only an epic is refused here, because a host with
 * nothing to say but "this epic" says it as context; a `view.goto` naming only
 * an epic is the commonest ask a module has.
 */
export const gotoSchema = z
  .object({
    type: z.literal(MESSAGE.GOTO),
    id: correlation,
    ref: z.string().min(1).max(LIMITS.GOTO_REF).optional(),
    step: z.number().int().min(1).max(999).optional(),
    epic: z.string().regex(EPIC_SLUG).optional(),
  })
  .refine((g) => g.ref !== undefined || g.step !== undefined, {
    message: 'a goto has to name a ref or a step; an epic alone only says which epic',
  })

/* ------------------------------------------------------------------------ *
 * Module → host
 * ------------------------------------------------------------------------ */

/**
 * "I heard you."
 *
 * The id is the module's own, and it is here so that a host greeting a frame
 * can confirm the program in it is the one whose manifest it read. It is not
 * how the host identifies the module — that is the frame handle, which cannot
 * be forged — so a mismatch is a fault to report rather than an impersonation
 * to defend against. The distinction matters: a check that looks like security
 * and is not teaches people to lean on it.
 *
 * Silence after a greeting is the failure this message exists to make visible.
 * A host should give it a bounded wait and then say, in words, that the module
 * was greeted and did not answer — and should count that wait from the
 * GREETING, not from the mount, because a module cannot be silent in answer to
 * a word nobody has said yet.
 */
export const readySchema = z.object({
  type: z.literal(MESSAGE.READY),
  id: z.string().regex(MODULE_ID),
  protocol: z.number().int().min(1).default(PROTOCOL),
})

/** One question, with an id the answer will carry back. */
export const requestSchema = z.object({
  type: z.literal(MESSAGE.REQUEST),
  id: correlation,
  /**
   * Bounded but not held to the list of known methods, which would be this
   * schema deciding what a host answers. A host with a method this package has
   * never heard of is a host doing its job; a host without one this package
   * knows is entitled to refuse it, with `unknown-method`.
   */
  method: z.string().min(1).max(LIMITS.METHOD),
  params: z.record(z.string(), z.unknown()).default({}),
})

/**
 * How tall the module would like to be.
 *
 * The one message with no id and no answer. It is a request in the ordinary
 * sense and not in the protocol's: the host clamps it (`clampHeight`) and may
 * ignore it entirely, and a module that needed to know the outcome can measure
 * itself.
 */
export const resizeSchema = z.object({
  type: z.literal(MESSAGE.RESIZE),
  height: z.number().finite(),
})

/**
 * "I went" — or "there is nothing here by that name."
 *
 * ## The acknowledgement the protocol has always lacked
 *
 * Everything else the host says to a module is fire-and-forget, and can be,
 * because nothing downstream of it depends on the answer. `goto` is different,
 * and the difference is concrete: a host's reference index decides whether to
 * walk the reader to a reference in place or to fall back to an ordinary link,
 * and it decides by whether the walk found anything. In the host's own page
 * that answer was a return value. Across a frame there is no return value, so
 * either the host stops asking — and accepts that pressing a reference may land
 * nowhere, silently, which is the failure this whole protocol keeps refusing —
 * or the message gets an answer.
 *
 * So it gets one, and `goto` carries an id to pair it with. This is the first
 * and only place the host waits on a module for anything, and it is worth being
 * plain about what that means: the host is now depending on somebody else's
 * program to reply, so it must time out, and the timeout must mean the same
 * thing as `found: false` — fall back to the link. A module that never answers
 * must not be able to hang a reference.
 *
 * `found` is the field the index reads. `why` is for the person: "nothing in
 * this epic names gh#41" is a sentence worth showing, and a host that only knew
 * `false` would have to invent one that might be wrong about the reason.
 *
 * ## Answer when you know, not when you are asked
 *
 * There is one `went` per `goto` and it is the last word, so a module must not
 * send it until the walk has actually settled. The tempting bug is visible in
 * the receiver this pair was designed against: told to go to a ref in an epic
 * it does not currently have loaded, it starts the load, remembers where it was
 * going, and returns "yes" — before anything has been looked for. Answering
 * `found: true` there is a guess, and the host acts on it by NOT falling back
 * to a link, so a wrong guess is a press that lands nowhere and says nothing,
 * which is the exact failure this pair exists to remove.
 *
 * Holding the answer until the load finishes is safe, because the host's
 * timeout is the backstop and a timeout already means what `found: false`
 * means. A slow honest answer degrades to the fallback. A fast dishonest one
 * degrades to silence.
 */
export const wentSchema = z.object({
  type: z.literal(MESSAGE.WENT),
  id: correlation,
  found: z.boolean(),
  why: z.string().max(LIMITS.REASON).default(''),
})

/* ------------------------------------------------------------------------ *
 * The two directions, each as one thing to parse
 * ------------------------------------------------------------------------ */

/**
 * Not a `discriminatedUnion`, because `responseSchema` is itself a union on a
 * different key and cannot be an option of one. A plain union costs a little
 * more to parse and reports its failures less precisely; it is the honest shape
 * of a wire where one message type has two forms.
 */

/**
 * An extension payload one module emitted, delivered to a module that consumes
 * that format.
 *
 * ## Why the host is in the middle at all
 *
 * The sender does not name a recipient and cannot: a module has no way to know
 * what else is on the canvas, and giving it one would end modularity. It names
 * a FORMAT — `roadmap.notifications@1` — and the host works out who has said,
 * in their manifest, that they consume it. So a module emits into the room and
 * the room decides who hears, which is why either can be removed without the
 * other noticing.
 *
 * ## What the host vouches for, and what it does not
 *
 * `extension` and `payload` were checked before this was sent: the host knew
 * the format and validated the payload against that format's own schema, so a
 * receiver is entitled to assume the shape.
 *
 * `from` is the id of the module that emitted it, taken from the host's own
 * registry rather than from anything the sender said, so it cannot be forged by
 * a module claiming to be another. It is the one field a receiver may safely
 * attribute by.
 *
 * The CONTENTS are the sender's claim and nothing more. A notification saying
 * "the tests passed" is one module's word for it; a host relaying it has not
 * checked that any test ran. A receiver drawing it should attribute it, for the
 * same reason `selection` carries refs and not kinds.
 *
 * ## Not answered, ever
 *
 * No correlation id and no reply. A module that ignores every event it is sent
 * is a conforming module, and a host that waited for acknowledgement could be
 * hung by a pane nobody is looking at. Delivery is best-effort by design: an
 * event sent to a module that is still loading is lost, and a receiver that
 * needs history should keep its own rather than expect the wire to hold it.
 */
export const eventSchema = z.object({
  type: z.literal(MESSAGE.EVENT),
  protocol: z.number().int().min(1),
  /** The format, e.g. `roadmap.notifications@1`. Known to the host, or unsent. */
  extension: z.string().min(1).max(LIMITS.EXTENSION),
  /** Whatever that format says. Validated by the host before it left. */
  payload: z.unknown(),
  /** The module that emitted it, named by the host from its own registry. */
  from: z.string().regex(MODULE_ID),
  /**
   * When the host accepted it, ISO 8601. A receiver ordering by arrival would
   * be ordering by its own scheduler instead.
   */
  at: z.string().min(1).max(40),
  /**
   * The kehikko it happened on, so a receiver can tell near from far.
   *
   * A module is loaded once and shown on whichever canvas asks for it, so "this
   * kehikko" is a question it cannot answer alone. `context.kehikko` says where
   * the receiver is standing and this says where the event came from; comparing
   * the two is the whole of a near/far filter, and it is a comparison rather
   * than a rule so a module can present it however it likes.
   */
  kehikko: z.object({ id: z.number().int(), name: z.string().max(80) }).nullable().default(null),
})

export const hostMessageSchema = z.union([
  helloSchema,
  contextMessageSchema,
  responseSchema,
  gotoSchema,
  eventSchema,
  clearSchema,
  refreshSchema,
])
export type HostMessage = z.infer<typeof hostMessageSchema>

export const moduleMessageSchema = z.union([
  readySchema,
  requestSchema,
  resizeSchema,
  wentSchema,
  filtersSchema,
  clearableSchema,
  refreshableSchema,
])
export type ModuleMessage = z.infer<typeof moduleMessageSchema>

export type WireMessage = HostMessage | ModuleMessage

export type Hello = z.infer<typeof helloSchema>
export type ContextMessage = z.infer<typeof contextMessageSchema>
export type Response = z.infer<typeof responseSchema>
export type Goto = z.infer<typeof gotoSchema>
export type ModuleEvent = z.infer<typeof eventSchema>
export type Ready = z.infer<typeof readySchema>
export type Request = z.infer<typeof requestSchema>
export type Resize = z.infer<typeof resizeSchema>
export type Went = z.infer<typeof wentSchema>


/**
 * Is this worth parsing at all?
 *
 * The cheap first filter, before a schema is run over a `MessageEvent` from a
 * window that receives messages from everything. It says nothing about whether
 * the message is valid or whether the sender is anybody — it says the value is
 * an object with a `type` that starts `roadmap.`, which is what separates a
 * message meant for this protocol from the several that are not.
 */
export function looksLikeWireMessage(value: unknown): value is { type: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as { type: unknown }).type === 'string' &&
    (value as { type: string }).type.startsWith('roadmap.')
  )
}
