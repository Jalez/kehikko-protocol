import { z } from 'zod';
import { LIMITS } from './limits.js';
import { EPIC_SLUG, KEHIKKO_KEY } from './ids.js';
import { SPACE_WITH_EPIC, placeSpace, spaceGoesWithEpic, spaceNodeSchema } from './spaces.js';
import { ACTIVITY_PRIORITIES, ACTIVITY_STATES } from './activity.js';
/**
 * 2.79.0. The person's Inbox, shown by a module's PAGE: the host keeps ONE record of what modules
 * need, are doing and have said (what `activity.set` reports), and a module that declares
 * `inbox:person` reads it and acts on it for the person — marks a thing seen, dismisses it,
 * forgets it from the log, answers its question, goes to it, or stops showing a module there.
 *
 * Every one of these is the PERSON's, and so a page's alone: a host answers them from a module's
 * frame and nowhere else — never from a module's server (none is in `SERVER_METHODS`, so
 * `serverAskSchema` refuses them), never from an agent's tool. A host holds every act but `seen`
 * to the person's fresh press inside the frame and declines it without one (`actNeedsPress`);
 * reading needs none.
 *
 * The record changes and the host says so with `kehikot.inbox` (`inboxMessageSchema`): `changed`
 * (read again; the `rev` is the record's), or `next` (the person asked for the next thing that
 * needs them, by the host's own shortcut: the page goes to it with `inbox.open`). A host sends it
 * only to a frame whose manifest declares `inbox:person`. Design notes: docs/inbox.md.
 */
/** The methods only a module's page may ask, and only for the person. None is a server method. */
export const PERSON_METHODS = [
    'inbox.read',
    'inbox.log',
    'inbox.act',
    'inbox.answer',
    'inbox.open',
    'inbox.use',
    /* 2.88.0: a tracker item no epic names, adopted into one or no longer tracked. */
    'inbox.adoption',
    'inbox.adopt',
    'inbox.adoptWith',
    'inbox.untrack',
    'inbox.undo',
];
/** The acts a host takes only on the person's fresh press in the frame (everything but reading and `seen`). */
export const PRESSED_METHODS = ['inbox.act', 'inbox.answer', 'inbox.open', 'inbox.use', 'inbox.adopt', 'inbox.adoptWith', 'inbox.untrack', 'inbox.undo'];
/** Whether an act is taken only on the person's fresh press: every one but `seen`. */
export const actNeedsPress = (method, params) => PRESSED_METHODS.includes(method) &&
    !(method === 'inbox.act' && typeof params === 'object' && params !== null && params.do === 'seen');
/**
 * Who said an item: a module's id, or the host's own lists (`kehikko`, `kehikko.<list>`). Not
 * `MODULE_ID`: the host files its own things under its own id.
 */
const inboxModule = z.string().min(1).max(64);
const inboxId = z.string().min(1).max(LIMITS.ACTIVITY_ID);
/** Another of the person's projects, by the host's number for it; absent: the one the frame stands in. */
const inboxProject = z.number().int().positive();
/** One item named: the module that reported it and its id there. */
export const inboxKeySchema = z.object({ module: inboxModule, id: inboxId });
/**
 * A question an item asks, as the person sees it: the text, the choices to press, and the answer
 * already sent (null while unanswered). Where the answer goes is the host's to know.
 */
export const inboxQuestionSchema = z.object({
    text: z.string().max(LIMITS.ACTIVITY_QUESTION),
    choices: z.array(z.string().max(LIMITS.MESSAGE_CHOICE)).max(LIMITS.MESSAGE_CHOICES).default([]),
    answered: z.string().max(LIMITS.MESSAGE_BODY).nullable().default(null),
});
/**
 * 2.87.0. An item whose primary action is to take the person to its place (`inboxItemSchema.go`):
 * `label` is the button's words when the host has its own (text, never markup); absent, a page says
 * "Take me there". Taking it is `inbox.open`, as for any item.
 */
export const inboxGoSchema = z.object({ label: z.string().max(LIMITS.MESSAGE_CHOICE).optional() });
/** What a page says on an item's `go` button when the host gave no `label`. */
export const INBOX_GO_LABEL = 'Take me there';
/**
 * One open item of the record, in the words the host has for it. Every string is TEXT: a page never
 * renders one as markup or a link and never opens a URL from one.
 *
 * - `by`: who says it, the module's registered name (the host's word); `label` and `detail` are the
 *   module's claim. `says` is the words of its declared event (2.31.0), when it is one.
 * - `where`: its place in words (parts · kehikko · epic), or the project's name for one about the
 *   whole project; `here` whether it belongs to the kehikko the frame is on (or names none and
 *   the host cannot tell), `project` whether it is about the whole project.
 * - `entered`: when it entered its state, ms since the epoch. `seen`: a finished thing the person
 *   has been to. A dismissed item is not listed; a module the person stopped showing is not listed.
 * - `mutable`: whether a page may offer "Stop showing <by> here" (`inbox.use`): a module's items, never
 *   the host's own lists.
 * - `go` (2.87.0): the item's primary action is to take the person to its place — an agent's offer
 *   ("the failing test is in the auth epic, part 3"). A page draws it as a primary button, `label`
 *   when given (text), else its own words ("Take me there"), beside dismiss; pressing it is
 *   `inbox.open`, which goes there with a Go back mark and closes the offer. Absent: an ordinary item.
 */
export const inboxItemSchema = z.object({
    module: inboxModule,
    id: inboxId,
    by: z.string().max(LIMITS.TITLE),
    state: z.enum(ACTIVITY_STATES),
    says: z.string().max(LIMITS.TITLE).optional(),
    label: z.string().max(LIMITS.ACTIVITY_LABEL),
    detail: z.string().max(LIMITS.ACTIVITY_DETAIL).optional(),
    priority: z.enum(ACTIVITY_PRIORITIES).default('normal'),
    where: z.string().max(LIMITS.TITLE * 2).default(''),
    here: z.boolean().default(true),
    project: z.boolean().default(false),
    entered: z.number().int().min(0),
    seen: z.boolean().default(false),
    question: inboxQuestionSchema.optional(),
    mutable: z.boolean().default(false),
    go: inboxGoSchema.optional(),
    /**
     * 2.88.0. A tracker item about a ref no epic of the project names: a page may offer to add it to an
     * epic (`inbox.adopt`, `inbox.adoptWith`) and to stop tracking it (`inbox.untrack`).
     */
    adoptable: z.boolean().default(false),
    /**
     * 2.88.0. What the person's last act on this item did, in one line ("Added to Auth · its Claude Code
     * conversation came along"), and whether `inbox.undo` takes it back. Text, like every string here.
     */
    after: z.object({ said: z.string().max(LIMITS.REASON), undo: z.boolean().default(false) }).optional(),
});
/** How many items an answer carries at most, per project. */
export const INBOX_ITEMS_MAX = 500;
/**
 * `inbox.read`: the record of the project the frame stands in, and the other projects' live items.
 *
 * - `rev`: changes with every write; `kehikot.inbox` carries the newest.
 * - `items`: the open items, as above. `next`: what the host's Next goes to now, or null.
 * - `elsewhere`: the person's other projects that hold live items, each with its own.
 * - `earlier`: how many closed items the log holds (`inbox.log`).
 * - `muted`: the modules the person stopped showing, by id and name, for the way back (`inbox.use`).
 */
export const inboxReadResult = z.object({
    rev: z.number().int().min(0),
    items: z.array(inboxItemSchema).max(INBOX_ITEMS_MAX),
    next: inboxKeySchema.nullable().default(null),
    elsewhere: z
        .array(z.object({
        project: z.object({ id: inboxProject, name: z.string().max(LIMITS.TITLE) }),
        items: z.array(inboxItemSchema).max(INBOX_ITEMS_MAX),
    }))
        .max(50)
        .default([]),
    earlier: z.number().int().min(0).default(0),
    muted: z.array(z.object({ id: inboxModule, name: z.string().max(LIMITS.TITLE) })).max(200).default([]),
});
/** Which items a log page or an act over many is about: this kehikko, or everywhere in the project. */
export const INBOX_SCOPES = ['here', 'everywhere'];
export const inboxReadParams = z.object({});
/** `inbox.log`: Earlier, a page of it, newest first. */
export const inboxLogParams = z.object({
    scope: z.enum(INBOX_SCOPES).default('everywhere'),
    offset: z.number().int().min(0).max(100_000).default(0),
    limit: z.number().int().min(1).max(100).default(20),
});
/** One row of Earlier: what became of an item (`what`, in words) and when. */
export const inboxLogRowSchema = z.object({
    key: z.string().max(400),
    module: inboxModule,
    id: inboxId,
    by: z.string().max(LIMITS.TITLE),
    label: z.string().max(LIMITS.ACTIVITY_LABEL),
    what: z.string().max(LIMITS.TITLE),
    where: z.string().max(LIMITS.TITLE * 2).default(''),
    at: z.number().int().min(0),
    priority: z.enum(ACTIVITY_PRIORITIES).default('normal'),
});
export const inboxLogResult = z.object({
    rows: z.array(inboxLogRowSchema).max(100),
    more: z.boolean(),
    total: z.number().int().min(0),
});
/**
 * `inbox.act`: the person's act on items. `seen` and `dismiss` name the items (`keys`); `forget`
 * names them, or with none forgets the whole log in `scope`; `seen-all` marks every finished thing
 * in `scope` seen. `project`: another project's items (`elsewhere`). Every act but `seen` only on
 * the person's fresh press.
 */
export const INBOX_ACTS = ['seen', 'dismiss', 'forget', 'seen-all'];
export const inboxActParams = z
    .object({
    do: z.enum(INBOX_ACTS),
    keys: z.array(inboxKeySchema).min(1).max(512).optional(),
    scope: z.enum(INBOX_SCOPES).default('everywhere'),
    project: inboxProject.optional(),
})
    .refine((act) => act.keys !== undefined || act.do === 'forget' || act.do === 'seen-all', {
    message: 'seen and dismiss name the items (keys)',
    path: ['keys'],
});
/**
 * What became of an act; all `ok: true`. `done`: taken, `changed` items moved. `declined`: not taken
 * (no fresh press, no such project), with the host's sentence.
 */
export const INBOX_OUTCOMES = ['done', 'declined'];
export const inboxActResult = z.object({
    outcome: z.enum(INBOX_OUTCOMES),
    changed: z.number().int().min(0).default(0),
    why: z.string().max(LIMITS.REASON).default(''),
});
/**
 * `inbox.answer`: the person's answer to an item's question — one of its `choices`, or their own
 * words (`answer`) — sent as the person's message where the question came from. On their press only.
 */
export const inboxAnswerParams = z
    .object({
    module: inboxModule,
    id: inboxId,
    choice: z.string().min(1).max(LIMITS.MESSAGE_CHOICE).optional(),
    answer: z.string().trim().min(1).max(LIMITS.MESSAGE_BODY).optional(),
    project: inboxProject.optional(),
})
    .refine((said) => (said.choice === undefined) !== (said.answer === undefined), {
    message: 'an answer is one of the choices or the person’s own words, not both',
});
/** `sent`: the answer went and the item is marked answered. `declined`: it did not, and why. */
export const inboxAnswerResult = z.object({
    outcome: z.enum(['sent', 'declined']),
    why: z.string().max(LIMITS.REASON).default(''),
});
/**
 * `inbox.open`: go to where an item happened — its project, kehikko, epic and parts — as pressing it
 * in the host's own Inbox did; the module that reported it is told (`kehikot.opened`). A finished
 * item is marked seen. On the person's press only.
 *
 * 2.87.0: for an item with `go` (an agent's offer), the host goes there as an agent's `jump` would —
 * its kehikko, epic, parts and step — leaves a Go back mark that restores where the person was, and
 * closes the item: an offer is done once taken. `opened` once the view is on its way.
 */
export const inboxOpenParams = z.object({ module: inboxModule, id: inboxId, project: inboxProject.optional() });
/** `opened`: the host went there. `declined`: it would not now. `no-such-item`: nothing open by that key. */
export const inboxOpenResult = z.object({
    outcome: z.enum(['opened', 'declined', 'no-such-item']),
    why: z.string().max(LIMITS.REASON).default(''),
});
/**
 * `inbox.use`: the person's "Use inbox" for one module — `false` stops showing its items (they are
 * still kept), `true` shows them again. Machine-wide. On the person's press only; never for the
 * host's own lists.
 */
export const inboxUseParams = z.object({ module: inboxModule, use: z.boolean() });
export const inboxUseResult = inboxActResult;
/**
 * Host → module (2.79.0), `kehikot.inbox`. `changed`: the record is not what the page last read —
 * read it again (`rev` is the newest). `next`: the person asked for the next thing that needs them
 * (the host keeps the shortcut); the page goes to `next` (`inbox.open`, taken without a press in the
 * frame for `INBOX_NEXT_MS`) and shows it, or, with `next: null`, says nothing needs them. Sent only
 * to a frame whose manifest declares `inbox:person`. No answer.
 */
export const INBOX_SIGNALS = ['changed', 'next'];
/**
 * How long after a `next` it sent a host takes an `inbox.open` with no press in the frame, in ms: the
 * person's press was the host's shortcut, and the page is going where they asked.
 */
export const INBOX_NEXT_MS = 5000;
/* ---------------------------------------------------------------- adopting an item (2.88.0) */
/**
 * 2.88.0. A tracker item that no epic names — the person is its author, assignee or reviewer, and it was
 * made somewhere else, by hand or by an agent outside Kehikot — can be ADOPTED into an epic, or no longer
 * tracked. Every act is the person's: page-only, on a fresh press, never a server's or an agent's.
 *
 * - `inbox.adoption`: what the page needs to offer it (a read, no press): the item, the project's epics
 *   with their parts and refs, the host's suggestion, the conversations that worked on it
 *   (`conversations.finder`, services.ts), the person's agent for Kehikot's own tasks, and an agent's
 *   proposal when one was made.
 * - `inbox.adopt`: write the ref into an epic (and parts) through the host's one writer of epics. The host
 *   then brings along, by itself, every conversation that CONFIDENTLY worked on it (`confidentMatch`) and
 *   belongs to no place yet, through the agent module that runs it; one that belongs to another place is
 *   never moved and is said in the result. The item is then an ordinary item of that epic.
 * - `inbox.adoptWith`: open the host's adoption dialog with the person's agent for Kehikot's own tasks,
 *   which starts a conversation fed the item and proposes an epic; the person confirms there.
 * - `inbox.untrack`: tell nothing more about this ref in this project.
 * - `inbox.undo`: take back the last adopt (the ref, and the conversations brought along) or untrack.
 */
/** One item named, as every adopting act names it. */
export const inboxItemKeyParams = z.object({ module: inboxModule, id: inboxId, project: inboxProject.optional() });
/** `inbox.adoption`'s params: the item. */
export const inboxAdoptionParams = inboxItemKeyParams;
const epicSlug = z.string().regex(EPIC_SLUG);
const partId = z.string().regex(EPIC_SLUG);
/** A place a conversation is filed under: an epic (or none), its parts, a kehikko key (or none). */
export const conversationPlaceSchema = z.object({
    epic: epicSlug.nullable(),
    parts: z.array(partId).max(LIMITS.PARTS).default([]),
    kehikko: z.string().regex(KEHIKKO_KEY).nullable().default(null),
    /** 2.89.0. The space by ids, with the `epic` it is in; absent when the place says only epic and parts. */
    space: placeSpace.optional(),
});
/**
 * How a conversation is known to have worked on an item, strongest first: it `created` the change, it
 * `pushed` its branch, it worked on that `branch`, it `mentioned` the ref, or it only worked in the same
 * `folder` (repository). Only the first three are confident enough to bring a conversation along without
 * asking (`CONFIDENT_MATCHES`).
 */
export const CONVERSATION_MATCHES = ['created', 'pushed', 'branch', 'mentioned', 'folder'];
export const CONFIDENT_MATCHES = ['created', 'pushed', 'branch'];
/** Whether a match is confident enough for a host to bring the conversation along by itself. */
export const confidentMatch = (match) => CONFIDENT_MATCHES.includes(match);
/** One conversation that worked on an item, as the page is shown it: its title and why it matched, never its content. */
export const adoptionConversationSchema = z.object({
    /** The agent module that runs it (the provider `services.find` answered). */
    module: z.string().min(1).max(64),
    /** The program's name in its own words (`Claude Code`), from the provider's descriptor. */
    program: z.string().max(LIMITS.TITLE),
    session: z.string().min(1).max(128),
    title: z.string().max(LIMITS.TITLE),
    folder: z.string().max(1024).default(''),
    lastActive: z.number().int().min(0),
    match: z.enum(CONVERSATION_MATCHES),
    /** Why it matched, in words ("created !4721", "pushed branch feat/x", "worked in this repository"). */
    reason: z.string().max(LIMITS.REASON),
    /** Where it is filed now, in words, when it belongs to a place; null when to none. */
    placed: z.string().max(LIMITS.TITLE * 2).nullable().default(null),
    /** Whether adopting brings it along by itself: confident, and filed under no place. */
    comes: z.boolean().default(false),
});
/** `inbox.adoption`: everything a page needs to offer the item's adoption. */
export const inboxAdoptionResult = z.object({
    outcome: z.enum(['ok', 'no-such-item', 'declined']),
    why: z.string().max(LIMITS.REASON).default(''),
    item: z
        .object({
        ref: z.string().max(LIMITS.REF * 4),
        title: z.string().max(LIMITS.TITLE),
        url: z.string().max(2048),
        repo: z.string().max(400),
        host: z.string().max(200),
        author: z.string().max(LIMITS.TITLE).optional(),
        branch: z.string().max(400).optional(),
    })
        .nullable()
        .default(null),
    epics: z
        .array(z.object({
        epic: epicSlug,
        title: z.string().max(LIMITS.TITLE),
        parts: z.array(z.object({ id: partId, name: z.string().max(LIMITS.TITLE) })).max(LIMITS.PARTS).default([]),
        refs: z.array(z.string().max(LIMITS.REF * 4)).max(200).default([]),
    }))
        .max(200)
        .default([]),
    /**
     * The epic the host would suggest, and why ("the same repository as its other refs"); `sure` when it
     * is the only epic that matches, so a page may offer it as one press. Never adopted by itself.
     */
    suggested: z
        .object({ epic: epicSlug, parts: z.array(partId).max(LIMITS.PARTS).default([]), why: z.string().max(LIMITS.REASON), sure: z.boolean(), space: placeSpace.optional() })
        .nullable()
        .default(null),
    /**
     * 2.89.0. The project's whole tree of spaces (`spaces.ts`), so a page can adopt into a space at any
     * depth. Absent from a host before 2.89.0: then `epics` and their `parts` are the two levels.
     */
    spaces: z.array(spaceNodeSchema).max(LIMITS.SPACES).optional(),
    conversations: z.array(adoptionConversationSchema).max(20).default([]),
    /** The person's agent for Kehikot's own tasks (`inbox.adoptWith`); null when none is picked. */
    agent: z.object({ module: z.string().min(1).max(64), name: z.string().max(LIMITS.TITLE) }).nullable().default(null),
    /** An agent's proposal, when one was made for this item: what the dialog offers to confirm. */
    proposal: z
        .object({
        epic: epicSlug,
        parts: z.array(partId).max(LIMITS.PARTS).default([]),
        conversations: z.array(z.string().min(1).max(128)).max(20).default([]),
        why: z.string().max(LIMITS.REASON),
        space: placeSpace.optional(),
    })
        .nullable()
        .default(null),
});
/** `inbox.adopt`: the item, the epic and the parts to add its ref to. On the person's press only. */
export const inboxAdoptParams = inboxItemKeyParams
    .extend({
    epic: epicSlug,
    parts: z.array(partId).max(LIMITS.PARTS).default([]),
    /**
     * 2.89.0. The space to adopt into, by ids, with the `epic` it is in (its first id). A host before
     * 2.89.0 strips it and adopts into `epic` and `parts`, which a page fills by `epicPartsOf`.
     */
    space: placeSpace.optional(),
})
    .refine(spaceGoesWithEpic, { message: SPACE_WITH_EPIC, path: ['space'] });
/** What became of one conversation when an item was adopted. */
export const ADOPT_BROUGHT = ['brought', 'elsewhere', 'failed'];
export const inboxAdoptResult = z.object({
    outcome: z.enum(['adopted', 'declined', 'no-such-item']),
    /** What it did, in one line: the item's `after`. */
    said: z.string().max(LIMITS.REASON).default(''),
    brought: z
        .array(z.object({ session: z.string().min(1).max(128), title: z.string().max(LIMITS.TITLE), program: z.string().max(LIMITS.TITLE), outcome: z.enum(ADOPT_BROUGHT), why: z.string().max(LIMITS.REASON).default('') }))
        .max(20)
        .default([]),
    why: z.string().max(LIMITS.REASON).default(''),
});
/** `inbox.adoptWith`: open the host's adoption dialog with the person's agent. On the person's press only. */
export const inboxAdoptWithParams = inboxItemKeyParams;
export const inboxAdoptWithResult = z.object({
    outcome: z.enum(['opened', 'no-agent', 'declined', 'no-such-item']),
    why: z.string().max(LIMITS.REASON).default(''),
});
/** `inbox.untrack`: tell nothing more about this item's ref in this project (undone in the host's settings, or `inbox.undo`). */
export const inboxUntrackParams = inboxItemKeyParams;
export const inboxUntrackResult = inboxActResult;
/** `inbox.undo`: take back the last adopt or untrack of this item. */
export const inboxUndoParams = inboxItemKeyParams;
export const inboxUndoResult = inboxActResult;
