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
| `inbox.adoption` (2.88.0) | `{ module, id, project? }` | `inboxAdoptionResult`: the item, epics, suggestion, conversations, agent, proposal |
| `inbox.adopt` (2.88.0) | `{ module, id, epic, parts?, project? }` | `inboxAdoptResult` |
| `inbox.adoptWith` (2.88.0) | `{ module, id, project? }` | `inboxAdoptWithResult` |
| `inbox.untrack` (2.88.0) | `{ module, id, project? }` | `inboxUntrackResult` |
| `inbox.undo` (2.88.0) | `{ module, id, project? }` | `inboxUndoResult` |

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

## Items that take the person somewhere (2.87.0)

An item may carry `go: { label? }`: its primary action is to take the person to its place. A host
sets it on an agent's offer — an agent that wants to show the person something they did not ask to
see files an item ("the failing test is in the auth epic, part 3") instead of moving the view.

- A page draws it as a primary button beside dismiss: `go.label` when given (text), else
  `INBOX_GO_LABEL` ("Take me there"). A one-line view makes it the press action.
- Pressing it is `inbox.open`, on the person's fresh press as ever. No new act: the host goes there as
  an agent's `jump` would (kehikko, epic, parts, step), leaves a Go back mark that restores where the
  person was, and closes the item — an offer is done once taken.
- Dismiss works as for any item.
## Adopting an item no epic names (2.88.0)

A tracker item about a ref the person is author, assignee or reviewer of, which no epic of the project
names — a change made by hand or by an agent outside Kehikot — comes with `adoptable: true`. A page may
offer:

- **Add to <epic>** in one press when `inbox.adoption`'s `suggested.sure` (the only epic whose other refs
  or tracker source match its repository or branch), and **Another epic…** — a picker of `epics` and
  their parts — otherwise. Either is `inbox.adopt`. A host never adopts by itself.
- **Adopt with <agent>…** when `agent` is set — the primary action whenever it is: `inbox.adoptWith`
  opens the host's dialog, where that agent is started on the item (`agent.tasks`, services.md) and
  proposes a place; the person confirms there in one press. Since 2.91.0 `agent` is the primary agent
  of the person's kehikko, or its only agent module. With `agent` null and two or more `taskAgents`
  (none primary): **Adopt with an agent…** — the host asks which first, and that one becomes the
  kehikko's primary agent. With `taskAgents` empty, the picker, and a page may say that adding an agent
  module would let it find the place.
- **Don't track this**: `inbox.untrack`. The host tells nothing more about that ref in this project.
- **Undo**: `inbox.undo`, after either, while the item's `after.undo` says it can.

On `inbox.adopt` the host writes the ref into the epic (and parts) through its one writer of epics, and
brings along every conversation that confidently worked on it (`created`, `pushed`, `branch`:
`confidentMatch`) and is filed under no place — through the agent module that runs it
(`conversations.finder`). A weak match (`mentioned`, `folder`) is never brought; one filed under another
place is never moved and is said instead. The item then carries `after.said` ("Added to Auth · its
Claude Code conversation came along"), and Undo takes back the ref and those conversations' places.

The page is shown titles and reasons only, never a conversation's content.

## `kehikot.inbox`

Host → module, only to a frame whose manifest declares `inbox:person`:

- `{ kind: 'changed', rev }`: the record is not what the page last read. Read it again.
- `{ kind: 'next', rev, next }`: the person pressed the host's shortcut for the next thing that needs
  them. Go to `next` with `inbox.open` and show it; `next: null` means nothing needs them.

`onInbox` on `connect`, `hostStore` and `useHost` hands both to the page.

## An older host

A host before 2.79.0 answers none of these (`host-too-old` where it knows to say so) and draws the
Inbox itself. A module that shows the Inbox should say so plainly and draw nothing it cannot read.
