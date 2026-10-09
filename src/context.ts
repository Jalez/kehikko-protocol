import { z } from 'zod'
import { LIMITS } from './limits.js'
import { canonicalName } from './dialect.js'
import { trackerSignalSchema } from './tracker.js'
import { contentSignalSchema } from './content.js'
import { EPIC_SLUG, MODULE_ID } from './ids.js'
import { partsSchema } from './parts.js'
import { passageSchema } from './passage.js'
import { filterChoiceSchema } from './filters.js'
import { kehikkoSchema, ref } from './fragments.js'

/* ------------------------------------------------------------------------ *
 * Dispositions: why a reference closed, in a person's words
 * ------------------------------------------------------------------------ */

/**
 * What a closed reference came to.
 *
 * A tracker's `closed` covers finished work, work nobody will do, a duplicate
 * and something replaced by something else, and a module that reads `closed`
 * as `done` counts the second, third and fourth as delivered. These four are
 * the answers people actually give. Open to extension the way every list here
 * is: a module meeting a value it does not know treats the ref as closed for a
 * reason it cannot name, which is what it did before this list existed.
 */
export const DISPOSITIONS = ['done', 'wont-do', 'duplicate', 'superseded'] as const
export type DispositionValue = (typeof DISPOSITIONS)[number]

/**
 * One person's verdict on one reference, as the host holds it.
 *
 * ## Only the marks, never the derivation
 *
 * A tracker sometimes says why it closed something — GitHub's `stateReason`, a
 * GitLab issue closed by a merged change — and that is a DEFAULT, not a mark.
 * It stays out of this list on purpose: every module holding a tracker reading
 * derives it with `deriveDisposition` in `facets.ts`, and a person's mark wins
 * over it there. Kept apart, a module can always say which one it is showing,
 * which is the whole difference between "you said won't do" and "GitHub says
 * not planned".
 *
 * `target` is the other ref for `duplicate` (duplicate OF it) and `superseded`
 * (superseded BY it), and null for the other two. One field rather than two,
 * because a ref is never both and two nullable fields can disagree.
 *
 * `by` is who said so, in words the host chose — a person, or an agent through
 * the MCP door — and `at` is when, as an ISO timestamp. Both are the host's
 * own knowledge: the method that sets a disposition does not carry either.
 */
export const dispositionSchema = z.object({
  ref,
  value: z.enum(DISPOSITIONS),
  target: ref.nullable().default(null),
  note: z.string().max(LIMITS.SUMMARY).default(''),
  by: z.string().max(LIMITS.NAME).nullable().default(null),
  at: z.string().max(LIMITS.NAME).nullable().default(null),
})
export type Disposition = z.infer<typeof dispositionSchema>

/* ------------------------------------------------------------------------ *
 * Containers: what is arranged on the kehikko, what each shows, which are aimed at
 * ------------------------------------------------------------------------ */

/**
 * What one container says it is showing.
 *
 * ## The ask this exists for, in the words it arrived in
 *
 * > "Lets say we have multiple things in kehikko that can have a checklist for
 * > instance and they all have different checklists. Obviously we should be
 * > able to show both items checklists. And if user selects x number of the
 * > modules then we should only show those modules checklist no? Same with
 * > notes, and references."
 *
 * Two facts are being asked for and neither was on the wire. The first is
 * WHAT EACH CONTAINER IS ABOUT — a paper open at chapter three, a journey
 * step, a reference somebody clicked — so that a module holding checklists, or
 * notes, or anything else filed against such things can show what belongs to
 * everything on the canvas at once. The second is WHICH CONTAINERS ARE PICKED
 * OUT, so that the same module can narrow to the ones a person is aiming at.
 * This schema is the first fact, `containerSchema` below carries both, and
 * `contextSchema.containers` is where they travel.
 *
 * ## Why `passage` and `selection` did not already say it
 *
 * They nearly do, and the temptation to read them as this was real. A passage
 * is where the reader is pointing, a selection is what they picked out, and a
 * consumer intersecting its material with both already shows "what is in
 * front of you". What neither can say is which CONTAINER is showing it, and
 * both are single-valued per canvas: one passage, one list of refs, the last
 * writer winning. Two containers each showing a document, or two each holding
 * refs, cannot both be described — the second overwrites the first, correctly,
 * because pointing is a canvas-wide act and only one thing is pointed at.
 *
 * So the two fields are kept exactly as they are and mean exactly what they
 * meant: the reader's finger, and the person's pick. This is a third thing —
 * what a container has open, said by the container, held per container, and
 * changing when the container changes what it shows rather than on every drag
 * across a paragraph. A module sends it with `showing.set` and re-sends it
 * when the answer changes, including to nothing.
 *
 * ## Refs and places, because those are the two kinds of thing anybody files against
 *
 * `refs` is the vocabulary `selection` already uses — `gh#105`, `!44` —
 * compared for equality and vouched for by nobody; see `selection.set` in
 * `methods.ts` for why a kind does not ride along. `documents` reuses
 * `passageSchema` whole, and reuse is the argument: a place in a document at
 * whatever precision — a file, a page of it, a range in it — is a shape this
 * package already argued for at length, and every consumer that follows a
 * passage already has the code to read one. A third spelling of "this file,
 * these bytes" would be a third thing to get wrong.
 *
 * A module saying what it shows should leave `quoted` empty. The quote exists
 * so that a consumer can tell a rotten highlight from a live one by looking at
 * the words; a file being shown is not a highlight and has no words to
 * evidence, and a chapter's text through every frame on the canvas on every
 * change is the thing `LIMITS.QUOTE` was written to prevent.
 *
 * ## The host cannot check any of it, and says so by relaying it unchanged
 *
 * A module saying "I am showing chapter three" is a claim about itself, and a
 * host has no way to look inside a frame on another origin to see whether it
 * is true. What the host CAN vouch for is that this frame — identified by its
 * window, which nothing in the page can forge — said so, which is the same
 * strength of claim `passage` has always had. So it is relayed per container,
 * attributed to the container that made it, and a consumer treats it as that
 * container's word. That is weaker than an event the host carried, and
 * `relations.ts` in the host draws it as weaker; it is the honest amount.
 */
export const showingSchema = z.object({
  /** The references this container is showing. The same strings `selection` carries. */
  refs: z.array(ref).max(LIMITS.REFS).default([]),
  /** The places in documents it is showing, at whatever precision it has. `quoted` should be empty. */
  documents: z.array(passageSchema).max(LIMITS.SHOWING_DOCUMENTS).default([]),
})
export type Showing = z.infer<typeof showingSchema>

/**
 * One container on the kehikko: which module, whether it is picked out, and
 * what it is showing.
 *
 * ## `selected` is the second fact, and it is the host's own
 *
 * The host draws a box in every container's header and a ring around the
 * container when it is ticked, holds the tick with the arrangement, and lets
 * an agent set it over MCP. It is "which of the containers arranged here are
 * the ones being aimed at" — a third axis beside the refs and the passage,
 * said about the canvas rather than about the work. Until now it never crossed
 * the wire, and the host's own code recorded the decision: a module could not
 * act on being selected, because from inside there is no telling an agent
 * about to work on it from a box somebody ticked last Tuesday.
 *
 * That argument was about a module reading ITS OWN flag, and it stands. This
 * is a different reading. A consumer does not ask "am I selected"; it asks
 * "which containers are, and what are they showing" — and narrows its own
 * material to that, under a control in its own header that the person can turn
 * off. The tick is visible on the canvas as a ring, so a container narrowed by
 * last Tuesday's tick is narrowed by something the person can see and unpick.
 * What was refused was a module changing its behaviour on a fact it could not
 * see the end of; what is sent is a fact a person is looking at.
 *
 * ## Every container is listed, not only the ones that have spoken
 *
 * A container that has said nothing still appears, with `showing` empty, and
 * the emptiness is load-bearing. "Journeys is picked out and has said nothing
 * about what it shows" is a sentence a consumer has to be able to print,
 * because it is the difference between a pane that is empty for a reason and a
 * pane that is empty. A list holding only the containers that spoke could not
 * say it.
 *
 * ## What the host may fold in, and why that is not a second source
 *
 * A host that knows which container set the current `passage` — it does; the
 * call arrived from a window — may put that passage into that container's
 * `documents`, and the current `selection` into its setter's `refs`. That is
 * a projection of one fact into a second place, composed by one function from
 * one source, and it is what lets a module that has only ever called
 * `passage.set` be "showing" what it points at without learning a new word.
 * It is not a claim the module made, and a host doing it should say so in its
 * own code; a module that wants to be showing more than it points at says so
 * with `showing.set`.
 *
 * `module` rather than a container id, because a module is on a kehikko once
 * and its id is the one name for a container that means the same thing on
 * every machine — see the host's `kehikot.ts`. A consumer finds its own row by
 * its own id, and may, though nothing here needs it to.
 */
export const containerSchema = z.object({
  module: z.string().regex(MODULE_ID).transform(canonicalName),
  /** Whether this container is picked out as a target on this kehikko. The host's own fact. */
  selected: z.boolean().default(false),
  /** What it says it is showing, or nothing. Never absent, for the reason `filters` is `{}` and not missing. */
  showing: showingSchema.default({}),
})
export type CanvasContainer = z.infer<typeof containerSchema>
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
  selection: z.array(ref).max(LIMITS.REFS).default([]),
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
  kehikko: kehikkoSchema.nullable().default(null),
  /**
   * Which of the filters this module offered are currently chosen for it.
   *
   * ## Why the choice is context and not a message of its own
   *
   * The offer goes one way as `kehikot.filters`, so the obvious symmetry is a
   * `kehikot.chose` coming back. It is the wrong shape, for three reasons that
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
  /**
   * Every container on this kehikko: which module, whether it is picked out,
   * and what it says it is showing. See `containerSchema`.
   *
   * ## Context, for the reasons everything else here is context
   *
   * A module arrives late to it — a checklist pane placed after two containers
   * were picked out has to open narrowed, not wait for the next tick. It has to
   * be there before the first render, or the pane draws everything and then
   * narrows in front of somebody. And it is the same KIND of fact as the
   * selection and the passage: what this canvas is looking at, one step
   * further out — not one place, but the set of places its containers hold
   * open, and which of those the person means.
   *
   * ## It is per canvas and broadcast whole, deliberately
   *
   * Every frame on the kehikko is told the same list, including the rows about
   * itself and about containers that never asked to be described. The
   * alternative — composing a different list per frame, or sending it only to
   * modules that declared `reacts: ['containers']` — would be the host deciding
   * what each module may know about the canvas it is standing on, which the
   * essay on `reacts` in `manifest.ts` refuses in so many words: a broadcast is
   * not a permission, and a manifest word must not become one.
   *
   * ## What a consumer does with it, said once so three consumers do not say it three ways
   *
   * When no container is picked out, "what is in front of you" is everything:
   * the passage, the selection, and the union of what every container shows.
   * When some are, it is the union of what THOSE show, and nothing else. A
   * consumer offers the person a way to turn that narrowing off, in its own
   * container header, and when the narrowing leaves it empty it says which
   * containers are picked out and that nothing it holds belongs to what they
   * show — because a pane that is empty because another pane spoke is a pane
   * whose emptiness has no visible cause otherwise.
   *
   * Empty rather than absent, for the reason every other field here is. A
   * module reading this against a host that has never heard of it finds `[]`,
   * which is the true answer there: that host has said nothing about its
   * containers, nothing is picked out as far as this module can know, and
   * everything is in front of it.
   */
  containers: z.array(containerSchema).max(LIMITS.CONTAINERS).default([]),
  /**
   * Why the open project's closed references closed, where a person has said.
   *
   * Context rather than an answer to a question, for the reasons the selection
   * is: a module has to have it before it draws a step as settled, it is true
   * for as long as nobody changes it, and when somebody does every module
   * showing that ref has to move — Journeys counting a step as done, References
   * hiding what is won't-do. A module saying `reacts: ['dispositions']` is
   * telling the registry it is one of those.
   *
   * Per project, not per canvas: a verdict on `#2274` is about the work, and
   * holds on every kehikko that shows it. Only people's marks travel; see
   * `dispositionSchema` on why what a tracker says is derived on each side.
   * Empty rather than absent: nobody has said anything, which is the true
   * answer from a host that has never heard of dispositions.
   */
  dispositions: z.array(dispositionSchema).max(LIMITS.DISPOSITIONS).default([]),
  /**
   * When the open project's shared tracker reading last changed, and whether a
   * read is in flight. The signal, not the reading — see `trackerSignalSchema`
   * in `tracker.ts` for why the rows stay behind `tracker.get`.
   *
   * Per project, like `dispositions`: a refresh pressed in one container moves
   * this for every container standing in that project, and a module saying
   * `reacts: ['tracker']` re-asks `tracker.get` when `at` changes and draws
   * itself busy while `refreshing` is true.
   */
  tracker: trackerSignalSchema.default({}),
  /**
   * What has changed in the material kept for the open project's epics: the
   * last change per source and epic. The signal, not the material — see
   * `content.ts`.
   *
   * Per project, like `tracker`: a write reported from one container moves
   * this for every container standing in that project, and a module saying
   * `reacts: ['content']` re-reads what it shows when the entries for it move.
   */
  content: contentSignalSchema.default([]),
  /**
   * The parts of the open epic, and which of them the person has picked out.
   * See `parts.ts`, which is the whole argument.
   *
   * ## Context, beside the epic and the selection, because it is the same fact
   *
   * What a canvas is about used to be two things: the epic, and the refs
   * picked out of it. This is the third, standing between them — narrower than
   * the epic, wider than a selection — and it travels the way they do for the
   * reasons they do. A module has to have it before it draws, or it draws the
   * whole epic and then narrows in front of somebody. It is true for as long
   * as nobody changes it, so a module can arrive late to it. And no module
   * sets it: the picking is done in the host's own bar, beside the epic, so
   * there is no capability here and no setter to pair it with.
   *
   * It belongs to the PROJECT's subject and not to a kehikko. A kehikko is a
   * layout; switching it changes neither the epic nor what is picked out of
   * it. And it belongs to the EPIC: a host that moves to another epic sends
   * that epic's parts with nothing picked, for the reason it clears the
   * selection.
   *
   * ## What a consumer does with it, said once
   *
   * When no part is picked, the whole epic is in front of the person and a
   * module shows what it always showed. When some are, it shows what belongs
   * to THOSE — `refInFocus` for a reference, `partInFocus` for a step that was
   * assigned to a part, `fileInFocus` for a file of the epic's paper, which a
   * part may own (`files`, each relative to the paper's folder; absent from a
   * host older than 0.32.0, and read as none) — and it SAYS that it has narrowed and by how much:
   * "showing 6 · 14 outside the picked parts", in its own header, with a way
   * to see them. A focus that hides things and says nothing is the failure
   * this field was designed against, and the reason every part is listed with
   * its refs rather than only the picked ones.
   *
   * Empty rather than absent, for the reason every other field here is. An
   * epic with no parts, no epic at all, and a host that has never heard of
   * parts all send `[]`, and all three mean the same true thing to a module:
   * nothing is narrowed.
   */
  parts: partsSchema.default([]),
})
export type ModuleContext = z.infer<typeof contextSchema>
