# The person's Inbox, shown by a module (2.79.0)

A host keeps ONE record of what modules need, are doing and have said: the lists modules report
with `activity.set`, kept per project. Until 2.79.0 only the host drew it. From 2.79.0 a module's
page may draw it instead, and act on it for the person, under the capability `inbox:person`.

The record stays the host's. Modules keep reporting into it as before; agents read it with the
host's own tools. What moves is the display.

## The methods

All of them are page methods: asked through the frame (`ask`), answered by the host's page.

| Method | Params | Answer |
| --- | --- | --- |
| `inbox.read` | `{}` | `inboxReadResult`: `rev`, `items`, `next`, `elsewhere`, `earlier`, `muted` |
| `inbox.log` | `{ scope?, offset?, limit? }` | `inboxLogResult`: Earlier, newest first |
| `inbox.act` | `{ do: 'seen' \| 'dismiss' \| 'forget' \| 'seen-all', keys?, scope?, project? }` | `inboxActResult` |
| `inbox.answer` | `{ module, id, choice? \| answer?, project? }` | `inboxAnswerResult` |
| `inbox.open` | `{ module, id, project? }` | `inboxOpenResult` |
| `inbox.use` | `{ module, use }` | `inboxUseResult` |

Every string in an answer is text. A page never renders a label, a place or a question as markup or
a link, and never opens a URL from one.

## Only the person's

These are the person's acts, so:

- **Never a server's.** None is in `SERVER_METHODS`; `serverAskSchema` refuses every one
  (`PERSON_METHODS`).
- **Never an agent's.** A host offers no tool that sees, dismisses, forgets or answers for them.
- **On the person's press.** A host answers every act but reading and `seen` only while the person's
  press in the frame is fresh (`actNeedsPress`), and says `declined` otherwise. The one exception is
  `inbox.open` for the item a `next` named, for `INBOX_NEXT_MS` after the host sent it: the person's
  press was the host's shortcut.

## `kehikot.inbox`

Host → module, only to a frame whose manifest declares `inbox:person`:

- `{ kind: 'changed', rev }`: the record is not what the page last read. Read it again.
- `{ kind: 'next', rev, next }`: the person pressed the host's shortcut for the next thing that needs
  them. Go to `next` with `inbox.open` and show it; `next: null` means nothing needs them.

`onInbox` on `connect`, `hostStore` and `useHost` hands both to the page.

## An older host

A host before 2.79.0 answers none of these (`host-too-old` where it knows to say so) and draws the
Inbox itself. A module that shows the Inbox should say so plainly and draw nothing it cannot read.
