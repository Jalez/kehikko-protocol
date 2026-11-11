import { z } from 'zod';
import { LIMITS } from './limits.js';
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
export const PERSON_METHODS = ['inbox.read', 'inbox.log', 'inbox.act', 'inbox.answer', 'inbox.open', 'inbox.use'];
/** The acts a host takes only on the person's fresh press in the frame (everything but reading and `seen`). */
export const PRESSED_METHODS = ['inbox.act', 'inbox.answer', 'inbox.open', 'inbox.use'];
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
