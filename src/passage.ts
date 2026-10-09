import { z } from 'zod'
import { LIMITS } from './limits.js'
import { bothEndsOrNeither, endsAfterStart } from './fragments.js'

/**
 * A section of a document: its heading, and where it spans when known.
 *
 * The title is what identifies it across edits — byte offsets move when
 * anything above them changes, and a link written down against a heading's
 * words survives that. The span is a convenience for a consumer comparing
 * against a selection, and null when the sender does not know it (a module
 * that stored only the title, pointing back at the section).
 */
export const sectionSchema = z
  .object({
    title: z.string().min(1).max(LIMITS.QUOTE),
    from: z.number().int().min(0).nullable().default(null),
    to: z.number().int().min(0).nullable().default(null),
  })
  .refine(bothEndsOrNeither, {
    message: 'a section names both ends of its span or neither',
  })
  .refine(endsAfterStart, {
    message: 'a section ends after it starts',
  })

/** A heading of a document, and its span when the sender knows it. */
export type Section = z.infer<typeof sectionSchema>

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
  /**
   * Which section of `path` the reader is in, or null.
   *
   * A different claim from `from`/`to`, and the reason it is a field of its
   * own. `from`/`to` say "this exact text is pointed at" — a consumer marks it,
   * a reader turns to it, a list narrows to what overlaps it. Reading a section
   * is none of those: publishing it as a range would make every scroll look like
   * a highlight and paint a whole section in colour. So a reader that knows its
   * outline says where it is HERE, and the range stays for selections.
   *
   * See `sectionSchema` for what a section names.
   */
  section: sectionSchema.nullable().default(null),
})
  .refine(bothEndsOrNeither, {
    message: 'a passage names both ends of a selection or neither; a half-range is a malformed answer, not a coarser one',
  })
  .refine(endsAfterStart, {
    message: 'a passage ends after it starts',
  })

/** Where the reader is pointing, at whatever precision they have. */
export type Passage = z.infer<typeof passageSchema>
