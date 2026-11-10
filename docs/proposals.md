# Proposed changes to a text

`kehikot-module-protocol/proposals`, `kehikot-module-protocol/proposals/store` and
`kehikot-module-protocol/client/proposals` (2.71.0). An agent PROPOSES a change to a
text a module keeps — a markdown deck, a screenplay, a quiz, any text file — and
the person accepts it (as proposed, edited, or in part) or declines it, with a
reason the agent reads before proposing again. Lifted from Paper's suggestions,
where every rule here was learnt; see "What Paper taught" at the end.

## Five minutes to adopt it

A module with one or more text files under its folder in the project, a server
with an MCP door (`doors.ts`), and a React page.

### 1. The site (server)

```ts
// proposals.ts in the module
import { fileKeeper, textFiles } from 'kehikot-module-protocol/proposals/store'
import type { ProposalSite } from 'kehikot-module-protocol/proposals'
import { moduleDir } from 'kehikot-module-protocol'
import { ID } from './manifest.ts'

const files = textFiles({
  dir: (project) => moduleDir(project, ID),               // <project>/.kehikot/<module>/
  name: (slug) => (/^[a-z0-9-]+$/.test(slug) ? `${slug}.md` : null),
})

export const SITE: ProposalSite = {
  keeper: fileKeeper(ID),                                  // …/proposals/all.json
  text: files.text,
  write: files.write,                                      // what Accept writes; use the module's own writer when it has one
  onSettled: (project, p) => tellTheFiler(decisionNews(p)), // optional: "Declined: <reason> — your proposal on …"
  onChanged: (project) => publish('proposals', project),  // optional: the page re-reads
}
```

The book lives at `<project>/.kehikot/<module>/proposals/<name>.json`, built with
the protocol's `moduleDir` — never anywhere else. `fileKeeper(ID, { name })` keeps
a book per epic or per deck when that reads better. A module whose text is not a
file (a JSON field) writes `text` and `write` itself; `memoryKeeper()` is the
keeper for tests.

### 2. The door (MCP)

```ts
import { answerProposalTool, proposalTools } from 'kehikot-module-protocol/proposals'

const PROPOSALS = { what: 'a deck', file: { name: 'deck', description: 'The deck’s slug, as list_decks prints it.' }, project: projectArg }

// tools/list
tools: [...ownTools(), ...proposalTools(PROPOSALS)]

// tools/call: ask the library first, fall through to the module's own
const said = await answerProposalTool(SITE, PROPOSALS, name, args)
if (said !== null) return text(said)
```

That mounts `propose_change`, `list_proposals`, `read_proposal` and
`withdraw_proposal`. Their descriptions tell an agent to read a declined
proposal's reason before proposing on that text again. `project` is the
module's own resolution of the `project` argument (`resolveDoorProject` in
`/serve`, or whatever it already does); without it the argument is taken as
given.

### 3. The page's routes

Two routes, both `PAGE_ONLY` (they take the page's ticket):

```ts
// GET  /api/proposals?project=…          → { proposals: openProposals(SITE, project).map(shown), settled: … }
// POST /api/proposal?project=…  body { id, decision: 'accept' | 'decline', reason?, final?, hunks? }
const done = decideProposal(SITE, project, id, decision === 'accept' ? { kind: 'accept', final, hunks } : { kind: 'decline', reason })
```

`decideProposal` measures first, applies through `SITE.write` and refuses in
words — nothing written — when the text moved under the proposal.

### 4. The page

```tsx
import { ProposalView, ProposalList, useProposalWalk } from 'kehikot-module-protocol/client/proposals'

const walk = useProposalWalk(proposals)                  // current, at, open, footer, press, pick
// footer: [...ownFooter, ...walk.footer]  — "3 proposed changes" with Previous and Next beside it
// onPress: walk.press(item) ?? ownPress(item)

{walk.open.map((p) => (
  <ProposalView key={p.id} proposal={p} current={p.id === walk.current}
    onAccept={(take) => answer(p.id, { decision: 'accept', ...take })}
    onDecline={(reason) => answer(p.id, { decision: 'decline', reason })} />
))}
```

`ProposalView` draws the file, who proposed and why, the change as hunks (red
leaves, green arrives), and the answers: Accept, Decline, Decline with reason
(a one-line field, Enter sends), Edit then accept (a textarea; what is written
is what the person typed), and a checkbox per hunk so part of a change is
taken (`Accept chosen`). A stale proposal says why and offers Decline only. A
settled one shows its outcome as a badge, its change folded. Every string a
module or an agent wrote is rendered as text.

**It is built from shadcn/ui** (2.72.0): Button, Textarea, Tooltip, Badge,
ScrollArea, Separator and Collapsible, vendored once in
`kehikot-module-protocol/client/ui` from shadcn's standard new-york sources on
their Radix primitives — the same class names and CSS variables a module's own
`components/ui` uses, so a proposal looks like the rest of the module in both
themes. Two things a module does for that:

1. its Tailwind reads this package's client as a source, in `src/index.css`:

   ```css
   @import 'tailwindcss';
   @source "../node_modules/kehikot-module-protocol/dist/client";
   ```

2. the components' peer dependencies are in its `package.json` (a shadcn module
   has most already): `@radix-ui/react-slot`, `@radix-ui/react-tooltip`,
   `@radix-ui/react-scroll-area`, `@radix-ui/react-separator`,
   `@radix-ui/react-collapsible`, `class-variance-authority`, `clsx`,
   `tailwind-merge`, `lucide-react`.

A module may import the same components for its own page
(`import { Button } from 'kehikot-module-protocol/client/ui'`) instead of
keeping a copy; they are shadcn's sources, unchanged but for the import of `cn`.

### 5. The release

Pin the protocol tag, bump the version, write `notes/<version>.md` with a
"For agents:" line naming the four tools (`kehikot-check-notes` asks for one
when the door changed), and test the site over `memoryKeeper()`.

## The model

```
Proposal
  id          p-<12 hex>, minted when filed
  file        the module's name for the text (a path, a slug, a part id)
  scope       'file' (the whole text) | 'range' (a stretch that occurs exactly once)
  find        the base text it is about; replace: what goes there ('' deletes)
  baseHash    hashText of the WHOLE base text when last measured
  why, by     one sentence; { kind: 'agent' | 'module' | 'person', name, session? }
  createdAt, revisedAt?, revisions?
  status      pending | stale | accepted | declined | withdrawn
  stale?      { reason: changed | ambiguous | gone, said }
  decidedBy?, decidedAt?, declinedReason?
  acceptedAs? as-proposed | edited | partial;  final?: what was written when not `replace`
  tokenHash?  server-side only; `shown` strips it
```

- **Filing** (`file`) quotes the text as it is: `find` has to be in it exactly
  once (`range`) or be it (`file`), the proposal has to change something and
  say why. The same filer proposing again over the same quoted text revises its
  pending proposal (`fileProposal`), under the token it already holds.
- **Measuring** (`measure`, run on every read by `measured`) compares the hash:
  unchanged is the same proposal; a change elsewhere rebases it onto the new
  hash; the quoted text rewritten in part is `stale: changed`, now there twice
  `ambiguous`, gone `gone`. A stale proposal whose words come back is pending
  again. Nothing is dropped: a person sees it and can decline it, its filer can
  withdraw it.
- **Applying** (`apply`) refuses a hash that does not match and a quote that is
  not there exactly once, and hands back the text; the module writes it.
- **Deciding** (`decide`) is pure: accept as proposed, with `final` (the
  person's wording), or with `hunks` (the indexes to take, `partOf`); decline
  with a reason, one line, 400 characters; withdraw by the filer. A stale
  proposal can be declined or withdrawn, never accepted.
- **The book** (`ProposalBook`) is one file per module (or per name), oldest
  first, every settled proposal kept until the newest sixty.
- **The sentences**: `outcomeSaid` (`declined: <reason>`), `decisionNews`
  (`Declined: <reason> — your proposal on <file> (<id>).`, for a module that can
  reach the filer's session), `proposalLine` (one line of `list_proposals`),
  `countSaid` (`3 proposed changes`).

### Hunks

`hunksOf(base, proposed)` finds where two texts differ by line, then tightens
each block by the words both sides share at its front and back, so one changed
word in a long paragraph is one changed word on screen. `takeHunks` and
`partOf` are the partial accept. The diff runs in a page and in a server; no
module needs a second one.

## Where the book lives, and why in the project

`<project>/.kehikot/<module>/proposals/<name>.json`. Paper keeps its suggestions
on the machine, and its `proposals.ts` argues for that: a project that commits
`.kehikot/` would carry a half-considered suggestion in its git history. The
library keeps them in the project all the same, because every other module's
data is there — the host's per-project setting decides what is committed, once,
for all of it — and because what became of a proposal (declined, and why) is a
record about the text that should travel with the text. A module that disagrees
hands `ProposalSite` another `ProposalKeeper`.

## Telling the filer

`list_proposals` is the push path every module has: an agent that filed three
proposals reads what became of them, with the person's reasons. Where a module
can reach the filer's session (an agent module's messages, its activity), it
sends `decisionNews(proposal)` from `onSettled`. The library sends nothing
itself: it has no wire.

## The header and footer rule

The count is a readout about the text on screen, so it is a footer `text`
(`3 proposed changes`, `Proposal 2 of 3`), with Previous and Next beside it
acting on it (`actsOn`). `proposalsFooter(state)` builds the three items;
`useProposalWalk` keeps the position, answers the two presses, and scrolls the
current proposal into view. Nothing goes in the header: accepting and declining
are presses on the proposal itself.

## What Paper taught

Paper's `proposals.ts` and `latex/propose.ts` are where these rules come from:
quote the text rather than a byte range; carry the hash of the whole file;
relocate rather than drop when the file changes; refuse ambiguity rather than
guess; keep only the hash of the filer's token; the same filer revising its own.
Paper keeps its own implementation because its proposals are byte ranges inside
a LaTeX source drawn into a CodeMirror editor beside a PDF, with groups, a
review of changes found on disk, and git staging; this library is the part
every module with a text file shares, with one thing Paper had not: the reason
a proposal was declined, kept on the record and told to the agent.
