# Changelog

One entry per version, newest first, from 0.25.0 onward. Reconstructed from the
commit history; the date is the date of the commit that set the version. `PROTOCOL` is 2 in every
version listed: each one added something a module may ignore.

Consumers install this package from git (`#main`, pinned by their lockfile), so a version here is a
label on a commit rather than a published artifact. See [PACKAGING.md](PACKAGING.md).

After 2.78.0, every entry's first line under its heading is its kind, and the version follows it
(semver; CI checks it): `Kind: breaking` → next major, `Kind: feature` → next minor, `Kind: fix` →
next patch.

## 2.85.0 — 2026-11-11

Kind: feature

Three more services, a structured checklist answer, skills that need a service, and the place a session
is filed under. **Additive**; `PROTOCOL` is still 2.

- `page.viewer` (`pageViewerSchema`, `PAGE_VIEWER`): `{ name, tool }`, the tool opening `{ url }`.
- `cue.targets` (`cueTargetsSchema`, `cueTargetSchema`, `CUE_TARGETS`): `{ name, cues: [{ tool, says,
  args, reader?, stop }] }`, the tools a narrated walk-through may cue.
- `module.folders` (`moduleFoldersSchema`, `ownedFolderSchema`, `KEHIKOT_FOLDER`, `MODULE_FOLDERS`,
  `foldersOwned`): `{ name, folders: [{ folder, says, derived }] }`, the folders a module owns under
  `.kehikot/`.
- `checklist.holder` takes `formats: ['json']`: `list` with `format: 'json'` answers `checklistJson` or
  `checklistListsJson` (`CHECKLIST_JSON`, `checklistItemJson`, `holderTakesJson`, `checklistJsonIn`).
- A skill need `{ service: '<name>' }` (`NEED_KINDS.service`), met by a manifest's `services`;
  `ProvidingManifest.services`; `skills.needs.service` in `DECLARATION_SINCE`.
- `sessions.placeOf { session }` under `sessions:place`, a server method (`SERVER_METHODS`) about one project:
  `{ place: { epic, parts, kehikko } | null }` (`sessionsPlaceOfParams`, `sessionsPlaceOfResult`).

See [services](docs/services.md).

## 2.84.0 — 2026-11-11

Kind: feature

A loading cover after a context change, in the module's own words. A page that redraws for a new
epic, project, parts or kehikko and waits on something says so; the host covers its container only if
it is not drawn within 150 ms, so a quick redraw never flashes. **Additive**; `PROTOCOL` is still 2.
[docs/client.md](docs/client.md), "A cover after a context change".

### Added

- **`kehikot.loading { label? }`** (`MESSAGE.LOADING`, `loadingSchema`, `Loading`), module → host: after
  a `kehikot.context`, "I am drawing what it asks for". The host covers only if `kehikot.drawn` has not
  followed within **`LOADING_COVER_AFTER_MS`** (150), until it does or `HOLD_COVER_MS`. Inside a
  greeting's hold it only gives that cover its words.
- **`ready.label`**: what the first greeting's held cover says. Out of shape: dropped, not the message.
- **`loading(label?)`** on the connection, `hostStore` and `useHost`'s value: sent only within
  `HOLD_COVER_MS` of a context the page has not said `ready()` for; before the greeting it becomes
  `ready.label`. `ready()` follows it with `kehikot.drawn`. Nothing with `holdCover: false`.
- **`useDrawn(host, drawn, label?)`** (`client/react`): `ready()` while `drawn`, `loading(label)` while not.
- `LIMITS.LOADING_LABEL` (80). `WIRE_SINCE`: `kehikot.loading`, `ready.label`.

## 2.83.0 — 2026-11-11

Kind: feature

Five services a consumer CALLS, so modules that cooperate never name each other, and a way for one
module's server to prove to another that it sent a request. **Additive**; `PROTOCOL` is still 2.

- `document.proposals` (`documentProposalsSchema`): a document per epic that takes edits only as
  proposals — `name`, `root` (the folder, `{epic}` in it; `documentRoot`, `documentsFolder`), `main`,
  and `tools` `{ sections, source, propose, proposals }`.
- `review.drafts` (`reviewDraftsSchema`): the person's draft review of a change — `name`, `tools`
  `{ comment, propose, drop }`, and `send?`, a route that sends a run's review without the person,
  taken only from a module's server that proves who it is.
- `checklist.holder` (`checklistHolderSchema`): the person's checklists — `name`, `tools`
  `{ list, create, add, hold, check }`.
- `work.status` (`workStatusSchema`): the stage of work by its issue — `name`, `jobs` (a route answering
  `{ jobs }`, `workJobSchema` each; `workJobsIn`).
- `diagram.writer` (`diagramWriterSchema`): diagrams an agent writes — `name`, `tool`, `kinds`
  (`DIAGRAM_KINDS`).
- `serviceTool`, `servicePath`, `SERVICE_EPIC`, and the names `DOCUMENT_PROPOSALS`, `REVIEW_DRAFTS`,
  `CHECKLIST_HOLDER`, `WORK_STATUS`, `DIAGRAM_WRITER`.
- `SERVICE_CALLER_HEADER` and `SERVICE_PASS_HEADER`: who calls, and a pass it minted.
- `/serve`: `findService(service, { module, project?, kehikko? })` (the first provider whose descriptor
  parses, or why there is none), `callServiceTool(module, tool, args, { from })` (a tool on the
  provider's MCP door, found by the id the host answered), `fetchService(module, path, init, { from })`
  (a route on its origin), `callerHeaders(from)`, and `vouchCaller(headers)`, which asks the caller at
  its registered origin whether it minted the pass — the proof a host already takes.

## 2.82.0 — 2026-11-11

Kind: feature

The container's background: with the host's "Container background" off, a module's page is
transparent by default, through the client, instead of every module painting its own surface over the
canvas. **Additive**; `PROTOCOL` is still 2. [docs/client.md](docs/client.md), "The container's
background (2.82.0)".

### Added

- **`context.appearance`** `{ background: 'card' | 'none' }`, in the greeting and every context
  (optional; absent from an older host, read as `card`; an unknown word reads as `card`).
  `backgroundOf(context)`, `PAGE_BACKGROUNDS`, `PageBackground`.
- **`applyBackground(background, { theme?, remember? })`** and `pageBackground()` in `/client`: put
  `data-kehikot-background` (`BACKGROUND_ATTR`) on `<html>`, add the style `BACKGROUND_CSS` once (id
  `BACKGROUND_STYLE_ID`) that makes `html`, `body`, `#root` and any element marked `data-kehikot-page`
  (`PAGE_MARK`) transparent under `none`, and say `color-scheme`. `connect` calls it on every greeting
  and context unless told **`appearance: false`**; `hostStore`/`useHost` pass `applyTheme`'s choice
  unless `appearance` is given.
- `applyTheme` says `color-scheme` on `<html>` too, so a transparent page and its frame agree.
- The page document (`pageDocument`) carries `BACKGROUND_CSS`, and its blocking script (`themeScript`)
  puts the remembered background (`BACKGROUND_KEY`, in a frame only) or `?background=`
  (`BACKGROUND_PARAM`) on `<html>` before the first paint.
- The template marks its outermost element with `data-kehikot-page`. README's Module consistency
  checklist says to.

## 2.81.0 — 2026-11-11

Kind: feature

Services: one module provides a service and others consume it, and neither names the other; the first
service is `work.queue`. And a module that watches this computer can tell one agent session, found by
its own id, about work it started. **Additive**; `PROTOCOL` is still 2.
[docs/services.md](docs/services.md); [docs/agent-messages.md](docs/agent-messages.md), "A notice to a
session that did not ask".

### Added

- **`services`**, a top-level manifest field: the services a module provides, each with a descriptor
  in its service's shape (`servicesSchema`, `SERVICES`, `serviceDescriptor`, `servicesOf`). A known
  service's descriptor that does not parse drops the field, not the manifest; an unknown service is
  carried as it came. A host before 2.81.0 ignores it.
- **`work.queue`** (`WORK_QUEUE`, `workQueueSchema`): `name`, `run` (a shell line with `{command}` per
  kind of work it takes, `WORK_KINDS`: test, typecheck, build, install), `cli`, `tool`, `direct`,
  `marks`. `workRunLine` and `workQueueSaid` say it from the descriptor only.
- **`services.find { service, kehikko? }`** under the new **`services:read`**, from a module's server
  or page: the providers in use here (registered and answering), each with its registered name, its
  descriptor and whether it is placed on the kehikko asked about (`servicesFindResult`, `providerOf`).
- **`messages.notifySession { session, body, kind?, thread? }`** under the new **`sessions:observe`**,
  from a module's server (`SERVER_METHODS`, naming no project): a notice to the one session whose agent
  CLI names itself by that id. The host finds the agent module that runs it and its project; a session
  it does not know is declined. Stamped and delivered as `messages.notify`; the module must ask for
  `agents:message` too, and the person's mute holds. `LIMITS.OBSERVED_PER_HOUR` (6) per module and
  session, on top of the notice bounds.

## 2.80.0 — 2026-11-11

Kind: feature

One entry for every tool call: an agent module asks `checkToolCall` (`/serve`) about ANY call its CLI
is about to make, and every kind of guard the modules on the kehikko declare is applied — shell and
edit today, any kind added later on a pin bump. The protocol owns the table of each agent CLI's tools.
**Additive**; `PROTOCOL` is still 2. [docs/asking.md](docs/asking.md), "Every tool call (2.80.0)".

### Added

- **`checkToolCall(call, guards, facts?)`** (`/serve`): `{ cli, tool, input, cwd }` in, `pass`, `deny`
  (say it with `guardSays`) or, for a shell command, `rewrite` with the input key the new command goes
  in (`field`). Fills in the home folder and `checkoutOf`; `facts.env` carries `KEHIKOT_DIRECT`.
- **`toolCallDecision(guards, call, facts)`**: the same, pure. `guardDecision` for a shell tool (with
  the tool's own `env` where it takes one), `editDecision` for each file an edit tool edits (a relative
  path read against `cwd`); a tool not in the table passes.
- **`CLI_TOOLS`**, **`AGENT_CLIS`**, **`toolReading`**, `ToolReading`, `ToolCall`, `ToolFacts`,
  `ToolCallDecision`: each CLI's tools by the name its hook is given — Claude Code (`Bash`; `Edit`,
  `Write`, `MultiEdit`, `NotebookEdit`), Codex (`Bash`; `apply_patch`), Vibe (`file_system.bash`,
  `process.start`; `file_system.write_file`, `file_system.edit`, `file_system.search_replace`),
  Antigravity (`run_command`; `write_to_file`, `replace_file_content`, `multi_replace_file_content`),
  OpenCode (`bash`; `edit`, `write`, `multiedit`, `patch`, `apply_patch`).
- **`patchPaths(text)`**: the files a `*** Begin Patch` patch adds, updates, deletes or moves to.

## 2.79.0 — 2026-11-11

Kind: feature

The person's Inbox, shown by a module's page. The host keeps the one record of what modules need, are
doing and have said; a page that declares `inbox:person` reads it and acts on it for the person.
**Additive**; `PROTOCOL` is still 2. [docs/inbox.md](docs/inbox.md).

### Added

- **`inbox:person`**, a capability, and six page methods under it: `inbox.read` (`inboxReadResult`:
  `rev`, `items`, `next`, `elsewhere`, `earlier`, `muted`), `inbox.log` (Earlier, `inboxLogResult`),
  `inbox.act` (`seen`, `dismiss`, `forget`, `seen-all`), `inbox.answer` (a choice or the person's own
  words), `inbox.open` (go to where an item happened) and `inbox.use` (stop or start showing a module).
  `inboxItemSchema`, `inboxKeySchema`, `inboxQuestionSchema`, `inboxLogRowSchema`, `INBOX_SCOPES`,
  `INBOX_ACTS`, `INBOX_ITEMS_MAX`.
- **Only the person's.** `PERSON_METHODS` lists them; none is in `SERVER_METHODS`, so `serverAskSchema`
  refuses each. `actNeedsPress` and `PRESSED_METHODS`: every act but reading and `seen` is taken only on
  the person's fresh press in the frame, or, for `inbox.open` of the item a `next` named, within
  `INBOX_NEXT_MS` of it.
- **`kehikot.inbox`** (`MESSAGE.INBOX`, `inboxMessageSchema`), host → module: `changed` (read again) or
  `next` (the person pressed the host's shortcut for the next thing that needs them; `next` names it).
  Sent only to a frame whose manifest declares `inbox:person`. `onInbox` on `connect`, `hostStore` and
  `useHost`.

## 2.78.0 — 2026-11-11

Edit guards: a module placed on a kehikko can refuse an agent's file edits under paths it names, or in
a repository's main checkout, as it already could a shell command. And shadcn's chart, vendored once.
**Additive**; `PROTOCOL` is still 2. [docs/asking.md](docs/asking.md), "Edit guards (2.78.0)".

### Added

- **`tool: 'edit'`** in `GUARD_TOOLS`: a guard on an agent's file-editing tools (Claude Code's Edit,
  Write, MultiEdit, NotebookEdit). `match.paths` (`GUARD_PATH`, `pathPatternOk`: absolute or `~/`,
  `*` one name, `**` any depth, a trailing `/` everything under), `match.checkouts` (`GUARD_CHECKOUTS`:
  `main`, a file whose nearest `.git` is a directory) and `allowPaths`. An edit guard denies; a
  rewrite is refused. A shell guard still needs a command or script. A host or agent module before
  2.78.0 drops an edit guard and keeps the module's others.
- **`editDecision(guards, path, { home, checkout, env })`**, the rule for edits: `pass` or `deny` (the
  first matching guard), pure; `KEHIKOT_DIRECT` in the hook's environment passes. `editGuardMatches`,
  `pathMatches`, `plainPath`, `EditFacts`. `guardSays` words an edit refusal of its own.
- **`editedPaths(tool, input)`** and **`EDIT_TOOL_PATHS`**: the files a tool call edits.
- **`checkoutOf(path, cwd?)`** (`/serve`): `main`, `linked` or null, by the nearest `.git` at or above
  the file (which need not exist yet).
- **`kehikot-module-protocol/client/ui/chart`**: shadcn/ui's `chart` (`ChartContainer`, `ChartTooltip`,
  `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, `ChartStyle`, `ChartConfig`) on Recharts 3,
  an optional peer dependency (`recharts`) needed only by this path; and `useTip`, `showTip`,
  `hideTip`, `fromKeyboard`, `resetTips`, `TOUCH_MS`: one chart tooltip on the page at a time, hidden
  when the pointer leaves the frame, the window blurs, the page scrolls or resizes, or Escape.

### Changed

- **`GUARDS_HEAD`** and **`guardLine`** in a subagent's notes say edit guards too ("edits in a main
  checkout", "edits under …"). `NOTES_VERSION` is unchanged.

## 2.77.0 — 2026-11-11

`projects.mine` is asked under `agents:message`. `PROTOCOL` is still 2.
[docs/server-ask.md](docs/server-ask.md), "The projects a module keeps something in".

### Changed

- **`projects.mine`** is filed under **`agents:message`** in `METHODS`, and the capability
  `projects:read` that 2.76.0 added for it is gone (no module declared it and no host answered it).
  The method exists so that messages reach a module's asleep sessions after a restart, and every
  module that runs agent sessions already declares `agents:message`. A new word in `declares.uses`
  made a host older than 2.76.0 show the whole module as needing a newer Kehikot (`fitOf`); now such
  a host answers `unknown-method`, `watchKnownProjects` stops asking, and the module goes on as
  before. The answer is still only the projects in which the asking module's own folder exists.

## 2.76.0 — 2026-11-11

The projects a module keeps something in, asked from its server at start. **Additive**; `PROTOCOL` is
still 2. [docs/server-ask.md](docs/server-ask.md), "The projects a module keeps something in".

### Added

- **`projects.mine`** under the new capability **`projects:read`**, in `METHODS` and `SERVER_METHODS`:
  takes nothing, answered **`projectsMineResult`** (`{ projects: PickedProject[] }`, at most
  `LIMITS.PROJECTS_KNOWN`): the person's projects in which the asking module's own folder
  (`.kehikot/<module>/`) exists. Never the whole list. Names no project.
- **`watchKnownProjects({ module, know, everyMs?, retryMs?, ask?, log? })`** (`/serve`): asks
  `projects.mine` at once and on a slow clock (`KNOWN_PROJECTS_EVERY_MS`, 5 minutes;
  `KNOWN_PROJECTS_RETRY_MS`, 15 s while no host answers) and hands each project to the module's
  `know(path, project)` once. Stops asking a host that is too old or refuses the grant, so a module on
  an older app goes on as before. `KnownProjects` (`tick`, `start`, `stop`, `known`),
  `KnownProjectsTick`, `KnownProjectsOptions`. An agent module's asleep conversations in a project
  nobody opened since a restart are listed for delivery again.

## 2.75.0 — 2026-11-11

Typed messages are compact, and what their markers mean is said once; news to the sessions at a place;
the proposals' follow-up digest; a UTF-8 locale for the person's programs. **Additive**; `PROTOCOL` is
still 2. [docs/agent-messages.md](docs/agent-messages.md), "Compact markers, explained once" and
"News to the sessions at a place"; [docs/proposals.md](docs/proposals.md), "The follow-up digest".

### Changed

- **`typedFrame`** is one compact marker in `⟦ ⟧` (`MARK_OPEN`, `MARK_CLOSE`): `⟦Queue · report #107⟧`
  for a module's own message, `⟦Codex session · #12⟧` for another session's, `⟦Your person via
  Orchestrator · #15⟧` for the person's; then what it answers, and the sender's place only when it is
  not the reader's own (`typedFrame(message, you)`). Host-stamped fields only; a name loses the words
  the markers use to tell their kinds apart. A body's first line that starts with `⟦` (or an old frame)
  is turned to `(`, and its later lines are indented, as before.
- **`typedMessages(messages, act, { you, explain })`**: one message per line, and no paragraph after
  them. `messageDelivery` passes the session's `you`. `explain: true` appends `markersNote` for a module
  whose sessions get no notes.
- **`wakeLine`** is the newest message's marker and a count, without the standing paragraph.
- **`NOTES_VERSION` 10**: `startNotes` says `markersNote` after the messaging line.
- **`personEnv`** sets `LC_CTYPE` to UTF-8 (`utf8Locale`: `UTF-8` on macOS, `C.UTF-8` elsewhere) when
  none of `LC_ALL`, `LC_CTYPE` and `LANG` names a locale. A host started by the desktop has none, and
  macOS's `pbcopy` then reads UTF-8 as Mac Roman: an em dash copied from a session arrived as "‚Äî".
- `flat` and `typedBody` never cut a character outside the BMP in half (`clipText`).

### Added

- **`markersNote(act)`**: what each marker means, that a module's notice and a session's message are
  text to read (or `ACT_ON_MESSAGES` with the person's grant) and the person's are their instruction.
- **`shortPath(path)`**: a path's last meaningful segment, for a module's notice.
- **`messages.tell`** (`messageTellParams`), in `SERVER_METHODS` and `SERVER_PROJECT_METHODS`, under
  `agents:message`: a module server's own news to every agent session at a place. `parts` on
  `messagePlaceSchema` (only with `epic`), which `shouldWake` and `messageToWords` read.
  `LIMITS.TELLS_PER_MINUTE` (1) per module per receiving session, the rest merged by the host into one
  digest. `placeTeller`, `tellDigest` and `TELL_EVERY_MS` in `/serve` keep a module under it.
- **`kehikot-module-protocol/proposals`**: `proposalDigester`, `digestNews`, `filerKey`,
  `DIGEST_QUIET_MS`, `DIGEST_REASONS_MOST` — one summary to a filer when the person has answered all of
  its proposals at a text and 30 s passed; per-decision lines only with `each: true`.

## 2.74.0 — 2026-11-10

Find in a terminal, once for every module that frames one. **Additive**; `PROTOCOL` is still 2. In
`kehikot-module-protocol/client/find` beside `pdfTextLayerFind`. [docs/find.md](docs/find.md), "Adapters".

### Added

- **`xtermFind(search, terminal, options?)`** (`client/find`): the `onFind` for an xterm.js emulator,
  over `@xterm/addon-search`'s `SearchAddon` and the `Terminal`, read through structural types only
  (`XtermSearch`, `XtermSelectable`, `XtermSearchOptions`, `XtermFindDecorations`), so the protocol
  takes no xterm dependency. The screen and the scrollback; `first` incremental, `next`/`prev` wrap;
  case and whole words; every match and the current one marked with decorations; the count from
  `onDidChangeResults`, a count that changes by itself under an open search (new output) said through
  `onCount` (pass `findResult`) and never twice; `close` or an empty query clears every mark and the
  selection. The returned `XtermFind` is the listener, with `dispose()`. `XtermFindOptions`: `onCount`,
  `theme`, `decorations`.
- **`xtermFindColours(theme)`**: the marks' default colours, light and dark.
- **`findSlot()`** (`FindSlot`): a ref-shaped place for whichever search is on screen now, with a
  steady `onFind` for `useHost` that answers `unsupported` while it is empty and nothing to a close.

## 2.73.0 — 2026-11-10

Find adapters: a page whose text the client's own search cannot reach by itself gets it in a few
lines from a shared subpath, never code of its own. **Additive**; `PROTOCOL` is still 2.
[docs/find.md](docs/find.md), "Adapters".

### Added

- **`kehikot-module-protocol/client/find`** (`src/client/find-adapters.ts`): where find adapters live,
  structural only (none imports the library it adapts).
- **`pdfTextLayerFind(options?)`** (`find-pdf.ts`): find in a PDF drawn with a text layer whose viewer
  lays it only near the view. While the find bar is open `open()` is true (`subscribe` hears it, the
  shape `useSyncExternalStore` takes) so the page lays every sheet's layer; `onFind` waits until every
  sheet (`sheet`, default `.pdf-page`) has its layer (`layer`, default `PDF_TEXT_LAYER`) or `within`
  passes, then answers `'default'` so the client's `pageFind` reads it. `laidOut`, `close`,
  `PDF_LAID_OUT_WITHIN_MS`, `PDF_LAID_OUT_EVERY_MS`, `PdfTextLayerFind`, `PdfTextLayerFindOptions`.

## 2.72.0 — 2026-11-10

The proposal components are shadcn/ui, vendored once for every module. **Additive**; `PROTOCOL` is
still 2. [docs/proposals.md](docs/proposals.md), "The page".

### Added

- **`kehikot-module-protocol/client/ui`**: shadcn/ui's `Button`, `Badge`, `Textarea`, `Tooltip`,
  `ScrollArea`, `Separator` and `Collapsible`, and `cn`, as shadcn ships them (new-york, Tailwind v4,
  on their Radix primitives), so one copy serves every module and a protocol component looks like the
  module's own. Their packages are optional peer dependencies (`@radix-ui/react-slot`,
  `@radix-ui/react-tooltip`, `@radix-ui/react-scroll-area`, `@radix-ui/react-separator`,
  `@radix-ui/react-collapsible`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`).
  A module's Tailwind reads this package's `dist/client` as a source (`@source`).

### Changed

- **`kehikot-module-protocol/client/proposals`** is built from those: `ProposalView`'s answers are
  shadcn Buttons with lucide icons, the outcome a Badge, the edit a Textarea, "Decline with reason"
  carries a Tooltip, a settled proposal's change folds (Collapsible); `ProposalList` is a ScrollArea
  with Separators. The props are the same. `PROPOSALS_CSS` and `PROPOSALS_STYLE_ID` are gone: the
  classes are Tailwind's, drawn by the module's build; `className` on the view and the list.

## 2.71.0 — 2026-11-10

Proposed changes to a text a module keeps: an agent proposes, the person accepts or declines with a
reason the agent reads. **Additive**; `PROTOCOL` is still 2. Three new subpaths; nothing on the wire
changes. [docs/proposals.md](docs/proposals.md).

### Added

- **`kehikot-module-protocol/proposals`** (pure): the model — `Proposal` with `file`, `scope`
  (`file` or `range`), `find`, `replace`, `baseHash`, `why`, `by`, `status` (`pending`, `stale`,
  `accepted`, `declined`, `withdrawn`), `stale` (`changed`, `ambiguous`, `gone`), `decidedBy`,
  `decidedAt`, `declinedReason`, `acceptedAs`, `final`; `file` (quotes the text exactly once),
  `measure`/`measureAll` (rebase or mark stale, never drop), `apply` (refuses a hash that does not
  match), `decide` (accept as proposed, edited, or in part by hunk; decline with a reason; withdraw);
  the diff, `hunksOf`, `takeHunks`, `partOf`, lifted from Paper; the book (`ProposalBook`,
  `withProposal`, `openOf`, `settledOf`, `BOOK_KEEPS_SETTLED`); the filer's token (`mintToken`,
  `tokenFits`, `shown`); a module's site (`ProposalSite`, `ProposalKeeper`, `fileProposal`,
  `decideProposal`, `withdrawProposal`, `openProposals`, `settledProposals`, `memoryKeeper`); the
  sentences (`outcomeSaid`, `decisionNews`, `proposalLine`, `countSaid`); and the four MCP tools
  a module mounts — `propose_change`, `list_proposals` (with outcomes and reasons), `read_proposal`,
  `withdraw_proposal` — as `proposalTools(options)` and `answerProposalTool(site, options, name, args)` (synchronous unless `project` resolves asynchronously),
  whose descriptions tell an agent to read a declined reason before proposing again.
- **`kehikot-module-protocol/proposals/store`** (node): `fileKeeper(moduleId, { name? })`, the book at
  `<project>/.kehikot/<module>/proposals/<name>.json` through `moduleDir`, written atomically and
  removed when empty; `textFiles({ dir, name? })`, `text` and `write` for a site over text files
  confined to a folder; `bookPath`, `PROPOSALS_FOLDER`.
- **`kehikot-module-protocol/client/proposals`** (React, optional peer): `ProposalView` — the inline
  diff with Accept, Decline, Decline with reason, Edit then accept and a checkbox per hunk;
  `ProposalList`; `useProposalWalk` (current, position, Previous/Next); `proposalsFooter` — the
  footer count (`3 proposed changes`, `Proposal 2 of 3`) with Previous and Next beside it (`actsOn`);
  `PROPOSAL_FOOT`, `PROPOSAL_WORDS`, `PROPOSALS_CSS`, `stepWalk`, `proposalsFooterPress`.

## 2.70.0 — 2026-11-10

Every container behaves the same by default: what a person expects everywhere comes from the client,
and a module gets it by moving its pin. **Additive**; `PROTOCOL` is still 2. Each default has an
opt-out. [docs/client.md](docs/client.md), "What every container gets by default (2.70.0)", and the
README's "Module consistency checklist".

### Added

- **The kept view** (`hostStore`, `useHost`: `keepView`, on by default). Per container, the page's main
  scroll position (the element marked `data-kehikot-scroll`, else the document's scroller) and the value
  of each of its header's switches and toggles are kept with the host (`state.set`, per kehikko) and
  given back on the next greeting: the scroll restored while the page draws what it reaches (stopped
  by the person's own wheel, key or press), a switch or toggle not on its kept value pressed back
  through `onPress`. Kept in the same string as the page's own kept state, inside an envelope
  (`KEPT_VIEW_MARK`, `wrapKept`, `unwrapKept`): the page's `kept`, `hello.state` and `context.kept`
  are its own string, never the envelope, and an empty view writes the page's string as before.
  `keepView: false` keeps nothing; `{ scroll, header, except }` narrows it. Written only to a host that
  answers `state.set` for the module (`declares.uses: ['state:keep']`). `KeptView`, `viewOf`,
  `headerValues`, `KEEP_SCROLL_ATTRIBUTE`, `KEEP_SCROLL_AFTER_MS`, `RESTORE_SCROLL_WITHIN_MS`,
  `KeepViewOptions`, `ScrollBox`.
- **The cover held until the page is drawn** (`connect`'s `holdCover`, on by default).
  `kehikot.ready` goes with **`hold: true`** (`readySchema.hold`) and **`kehikot.drawn`**
  (`MESSAGE.DRAWN`, `drawnSchema`) follows when the page calls **`ready()`** (`Connection`,
  `hostStore`, `useHost`), or by itself after **`HOLD_COVER_MS`** (3 s; a number for `holdCover` is
  another wait). Every greeting holds again until the page has said it once. `holdCover: false` is
  ready at once, as before. A host before 2.70.0 lifts its cover on `ready` and drops `drawn` unread;
  `WIRE_SINCE['ready.hold']`, `WIRE_SINCE['kehikot.drawn']`.
- **`mountPage(root, page, options?)`** (`kehikot-module-protocol/client/mount`, a new subpath
  because it needs `react-dom`, now an optional peer): mounts the page in `StrictMode` inside
  `ReportErrors`, so a render that throws is always said to the host; a missing root is reported as
  a page failure (`NO_ROOT`). `{ strict: false }`, `{ reportErrors: false }`, `fallback`. The
  template's entry is now `mountPage('root', <App />)`.
- **Presses from nested frames**: **`relayPointer(sink, frame, { origin? })`** hears presses inside an
  iframe the page owns and tells the host of them through the connection's own `kehikot.pointer`
  (only to a host that asked). A same-origin frame is listened on directly, again after each load; a
  frame on another origin runs **`pointerShim`** (bundled) or **`pointerShimScript(origin)`** (one
  `<script>`), whose `RELAY_POINTER` messages are taken from that frame and origin alone.
  **`Connection.pointerFrom(target)`**, `hostStore.pointerFrom`, `useHost().pointerFrom`;
  `RELAYED_EVENTS`, `PointerSink`, `FrameLike`.
- **`rowsAdvice`, the rest of the rule**: a count in a header label (`Inbox (3)`, `12 open`); a Go item
  that is not a jump (one place, or options that read as acts); the same pressable item in both rows;
  live state (a readout, count, meter or run `result` in the header, or `options.state`) and no footer
  declared. **`RowsAdviceOptions`** (`state`, `footer`). `connect` says "no footer" once,
  `ROWS_ADVICE_AFTER_MS` after the last declaration, and only to a host that draws a footer;
  `rowsAdvice: false` keeps the console quiet.
- **`kehikot-check-rows`** (`bun run check:rows`, `src/check/rows.ts`): `rowsAdvice` over the rows a
  module states in `kehikot.rows.json` (or `--file`, JSON or a module exporting `rows`), one state or a
  list; exits 1 on advice unless `--warn`.
- **`kehikot-check-notes`** (`bun run check:notes`, `src/check/notes.ts`): when the MCP door's tool
  names, descriptions or input schemas changed since the last tag (its committed `notes/tools.json`,
  `TOOLS_SNAPSHOT`), `notes/<version>.md` must have a "For agents" line. `--door <url>` or
  `--tools <file>` reads the door now, `--write` stores it. `toolChanges`, `snapshotOf`, `checkNotes`.

### Changed

- **A page that bumps to 2.70.0 and never calls `ready()`** is covered, by a host that honours the
  hold, until `HOLD_COVER_MS` passes. Call `ready()` once what the page shows is drawn, or pass
  `holdCover: false`.

## 2.69.1 — 2026-11-10

Find's whole words begin and end where two pieces of text meet side by side. **A fix**; `PROTOCOL` is still 2.
[docs/find.md](docs/find.md).

### Fixed

- **`pageFind`**: the page's text is read as one string, so `<span>#12</span><span>Migrate</span>` was
  `#12Migrate` and `Migrate` was not a whole word. Two text nodes whose elements are side by side
  (neither holds the other) now meet at a break; text inside an element in a run of text
  (`Re<b>find</b>ing`) is still one run with it. A match is not otherwise stopped by a break.
- **`findMatches(text, query, options, breaks?)`**: the offsets where a whole word may begin or end
  although the string has no space there.

## 2.69.0 — 2026-11-10

Find: ⌘F in every container, with one bar the host draws and the page searching what it shows.
**Additive**; `PROTOCOL` is still 2. [docs/find.md](docs/find.md).

### Added

- **`kehikot.find`** (host → module, `findSchema`): `id`, `query` (at most `LIMITS.FIND_QUERY`, 256),
  `caseSensitive`, `wholeWord`, and `direction` (`FIND_DIRECTIONS`: `first`, `next`, `prev`, `close`).
- **`kehikot.find.result`** (module → host, `findResultSchema`): `id`, `total`, `current` (1-based, 0
  for none), or `unsupported: true`.
- **`kehikot.find.open`** (module → host, `findOpenSchema`): the person pressed ⌘F (or ⌘G, `step`)
  inside the page; carries a short selection as `query`.
- **`helloSchema.find`**, **`HostFacts.find`**: whether the host draws the bar.
- **`findMatches`**, **`stepMatch`**, **`findSaid`**: the matching rule, the step, the words.
- **`/client`**: `connect` hears ⌘F/⌘G and answers `kehikot.find` by searching the page's visible
  text by itself (`pageFind`: `CSS.highlights`, else `<mark data-kehikot-find>`; scrolls the current
  match into view; searches again when the page changes). `HostEvents.onFind` for a page whose text
  is not in the DOM, `Connection.findResult` (and on `hostStore` and `useHost`) to say a count later,
  `ConnectOptions.findKeys`, `findIn` and `mac`.

A host before 2.69.0 sends no `find: true`, so the client leaves ⌘F alone; a module before it drops
`kehikot.find` unread and the host says it cannot be searched.

## 2.68.0 — 2026-11-10

A switch's or go item's options can be grouped and carry a second line. **Additive**; `PROTOCOL` is still 2.
[docs/header.md](docs/header.md), "An option".

### Added

- **`headerOptionSchema.group`** (at most `LIMITS.HEADER_OPTION_GROUP`, 32): the heading an option is
  drawn under inside its item. A heading starts wherever the group differs from the option before it.
- **`headerOptionSchema.detail`** (at most `LIMITS.HEADER_OPTION_DETAIL`, 64): a quieter second line
  under the option's label.
- **`optionSections(options)`**: the options as runs under their headings, the rule a host draws by.
  The template's `header-menus.tsx` draws both.

A host before 2.68.0 strips both fields and draws the label alone.

## 2.67.0 — 2026-11-10

What a reviewer did and what the latest activity was. **Additive**; `PROTOCOL` is still 2.
[docs/tracker.md](docs/tracker.md), "What a reviewer did, and what the latest activity was (2.67.0)".

### Added

- **`TrackerReviewer.reviewedAt`, `activeAt`, `openThreads`**: when their latest review was
  submitted, the latest thing of theirs the host read (a comment counts: a reviewer still
  `requested` who commented has started), and the unresolved threads they started.
- **`TrackerActivity.commits`, `path`, `line`, `verdict`**: how many commits a push added, the file
  and line a diff comment is on, and what a review said.

Each is optional and `.catch(undefined)`: a module built before them reads a newer host's rows whole.

## 2.66.0 — 2026-11-10

A session's notes and its door agree about messaging. **Additive**; `PROTOCOL` is still 2.
[docs/agent-messages.md](docs/agent-messages.md), "The notes and the door agree (2.66.0)".

### Changed

- **`messageToolsFor(token, …)` lists `send_message` and `read_messages` for every door that carries
  a token**, unless the host said it never can (a host before 2.41.0, or a module not granted
  `agents:message`). Before, any failed ask hid them, and an agent lists a door's tools once, when it
  connects: a session woken while Kehikot or its module was still starting had no message tools until
  the person reconnected, while its notes said it could message. The host still checks the token on
  every call.

### Added

- **`hostOnMessages(options)`** (`/serve`): `yes`, `never` or `not-now` — what `messageToolsFor` reads.
- **`doorCarriesPlace(doors, { module, door })`**: whether the doors a module handed a session include
  its own with the place token; false for `null` (started with none of the module's doors).
- **`NotesInput.messaging.listed`**: false says, instead of the messaging line, that this
  conversation's door has no message tools and how to get them (**`messagingUnlistedLine`**), with no
  address. **`messagingLine`** takes `listed` as a fourth argument. Absent: true, as before.

## 2.65.0 — 2026-11-10

`PORT=0` is any free port. **Additive**; `PROTOCOL` is still 2. [docs/serving.md](docs/serving.md),
"`anyPort` (2.65.0)".

### Added

- **`anyPort(env)`**: whether `PORT` is `0`. With it, `serves` asks Vite for port 0 and `run` binds
  port 0: no `claim`, no drift, and the port the system gave is registered (`registerBound`). For a
  host that reaches modules at stable addresses and reads the registered port.

### Unchanged

- `preferred` still reads `0` as no port. A module built before 2.65.0 handed `PORT=0` keeps its
  preferred port and the drift rules.

## 2.63.0 — 2026-11-10

An agent module's tile says why its Expand was not done. **Additive**; `PROTOCOL` is still 2.
[docs/client.md](docs/client.md), "When the host declines (2.63.0)".

### Added

- **`expandDeclined(answer)`** (`tile.ts`): the host's `why` when `view.expand` was answered
  `declined`, else null. **`TILE_NOTE_MS`**: how long the tile says it.
- **`AgentTile`'s `onExpand` may return what the host answered** (`() => unknown`, was `() => void`):
  a declined answer's `why` is drawn over the tile as a `role="status"` line (`.kehikot-tile-note`)
  until the next press or `TILE_NOTE_MS`. An `onExpand` that returns nothing behaves as before.

## 2.62.0 — 2026-11-10

A session that started before an update is told, once, what changed for agents, and a door tells a
connected agent that its tools changed. **Additive**; `PROTOCOL` is still 2.
[docs/asking.md](docs/asking.md), "What changed since a session was told (2.62.0)", and
[docs/module-plumbing.md](docs/module-plumbing.md), "When a door’s tools change (2.62.0)".

### Added

- **A "For agents" section in release notes** (`agent-changes.ts`): `## For agents` or a `For agents:`
  line in `notes/<version>.md`, one or two plain lines on new tools, changed rules, new guards.
  `forAgentsOf`, `withoutForAgents` (what people read), `notesVersion`, `agentChangesFrom` (what a host
  hands: the releases up to the one it runs that say something to agents, newest first),
  `AGENT_CHANGES_MOST`.
- **`version` and `changes` on each module in the place answer** (`sessionModuleSchema`,
  `agentChangeSchema`, `agentChangesSchema`) and **`host`** beside them (`hostChangesSchema`): Kehikot's
  own, in their own sequence. In `SESSION_FIELD_SINCE`.
- **`changedSince` and `CHANGED_SINCE_HEAD` / `CHANGED_TOOLS_LINE`**: at a prompt, the lines of the
  releases between the version a session was told and the one running, for Kehikot and each module on
  its kehikko, oldest first, once. `NotesInput.host`; `NotesTold.versions` and `NotesTold.host` keep what
  was told. `changesBetween`. `subagentNotes` takes the session's record as a third argument and says
  the same lines to a subagent started before the session's next prompt.
- **A door's listening stream** (`serve/tools-changed.ts`, served by `doorsHandler` and `doorsFetch` for
  every HTTP MCP door): `GET` with `accept: text/event-stream` opens it; event ids carry a mark of the
  tool list (`toolsMark`, `markOfEventId`); an agent reconnecting with another mark, or any open stream
  after `toolsChanged()` with a new list, gets `notifications/tools/list_changed` (`TOOLS_LIST_CHANGED`).
  `initialize` is answered with `capabilities.tools.listChanged: true` (`sayingListChanged`).
  `MAX_TOOL_STREAMS`, `TOOLS_RETRY_MS`.

### Changed

- **`NOTES_VERSION` is 9**: every running session is told the full notes once, so its record starts
  keeping versions.
- A `GET` of an MCP door that asks for an event stream is answered by the doors, not by the module's
  `answer` (which answered 405).

## 2.61.0 — 2026-11-10

Guards: a module placed on a kehikko can hold the shell commands of every agent session there —
subagents included — to its rule, instead of only saying it. And a subagent is told what the modules
around it say. **Additive**; `PROTOCOL` is still 2. [docs/asking.md](docs/asking.md), "Guards (2.61.0)".

### Added

- **`guards` in a manifest** (top-level, like `agentSays`; `guardSchema`, `guardsSchema`):
  `[{ id, tool: 'shell', match: { commands, scripts? }, allow?, action: 'rewrite' | 'deny', rewrite?, why }]`.
  `commands` are word patterns (`tsc`, `bun test`, `*` for any one word; the program by base name, a
  prefix of the command); `scripts` are package.json script names (`bun run x`, `npm test`, `pnpm x`,
  `yarn x`); `allow` lets a command past; a `rewrite` template names `{command}` once (`templateOk`). A
  guard that does not parse is dropped and the rest kept. A host before 2.61.0 ignores the field.
- **`guards` in the host's answer to `POST /host/place`** (`placeDoorsSchema.guards`,
  `placedGuardSchema` `{ module, name, guard }`): only the modules PLACED on the session's kehikko.
  `SESSION_FIELD_SINCE.guards`.
- **`guardDecision(guards, command, { tool?, env? })`**, the one rule: `pass`, `rewrite` (the template
  filled with the whole original command as one single-quoted word, `shellQuote` / `fillTemplate`) or
  `deny`; a deny wins over a rewrite. `KEHIKOT_DIRECT` (`GUARD_ESCAPE_ENV`) set in front of a command, or
  in the hook's environment, passes every guard. `guardSays(decision)` is what the agent is told.
- The readers it uses, pure and exported: `shellCommands` (splits on `;` `&` `|` `&&` `||` newlines,
  parentheses, `$(` and backticks; quotes, escapes, comments, redirections), `unwrapped` (`env`, `time`,
  `nice`, `timeout`, `npx`, `bunx`, `bun x`, `pnpm exec` …), `commandsRun` (looks into `sh -c '…'`),
  `patternMatches`, `scriptRun`, `guardMatches`, `escaped`. `GUARD_LIMITS`, `GUARD_ID`,
  `GUARD_PATTERN`, `GUARD_SCRIPT`.
- **`subagentNotes(input, guards)`**: what a subagent is told at its start (Claude Code's
  `SubagentStart`) — the place, what each module on the kehikko says to agents, the absent lines, the
  guards (`GUARDS_HEAD`, `guardLine`) and the kehikko's skills, in the session notes' own words. Not the
  turn rules or messages. `NOTES_VERSION` is unchanged: a session's own notes did not change.

## 2.60.0 — 2026-11-10

A module says back the start token the host that started it handed it, so a host can tell the
process it started from anything else answering on that port. **Additive**; `PROTOCOL` is still 2.
[docs/module-plumbing.md](docs/module-plumbing.md), "The start token (2.60.0)".

### Added

- **`START_TOKEN_ENV`** (`KEHIKOT_START_TOKEN`), the variable a host hands a module it starts its
  token in; **`START_TOKEN`**, its pattern (16 to 128 of `A-Za-z0-9_-`); **`startTokenOf(env)`**.
- **`build.start`**, optional: `establishBuild` reads the token from the environment (or `start`
  in its options; `null` for none). Malformed reads as absent; a build without one parses as before.
- **`START_HEADER`** (`x-kehikot-start`) on every answer of the doors (`doors`, `doorsHandler`,
  `doorsFetch`: replies, the page, streams) and of `run` (files of `dist/`, a module's own `before`
  door, refusals, 404s), when the process was handed a token. The open health check exposes it.
- **`startVerdict(expected, said)`**: `same`, `other` (refuse: another process), or `unsaid` (one
  side has none: fall back to the manifest's id).
- `personEnv` drops `KEHIKOT_START_TOKEN`: a module the person starts from a module's shell is not
  the module whose token it is.

### Unchanged

- `buildStamp`, `sameProcess`, `sameCode` and `compareBuilds` ignore the token. It is an identity, not
  a secret: it grants nothing, and a module never reads a request's token.
## 2.59.0 — 2026-11-10

A module's page that fails says why, so a host can show the error instead of "not answering".
**Additive**; `PROTOCOL` is still 2. [docs/client.md](docs/client.md), "When the page fails
(2.59.0)", and [docs/wire.md](docs/wire.md), `pageErrorSchema`.

### Added

- **`kehikot.page.error` `{ message, where, stack }`** (`MESSAGE.PAGE_ERROR`, `pageErrorSchema`,
  `PAGE_ERROR_WHERE`, `LIMITS.PAGE_ERROR_MESSAGE` / `PAGE_ERROR_WHERE` / `PAGE_ERROR_STACK`), module →
  host, in `MODULE_MESSAGES`. Long text is cut, never refused. A host before 2.59.0 drops it unread.
- **The client says it by itself** (`pageErrors`, `makePageErrors`, `reportPageError`,
  `describeError`, `trimStack`, `PAGE_ERRORS_MAX`, `STACK_LINES`, `PAGE_ERRORS_GLOBAL`): every uncaught
  error and unhandled rejection on the page, installed with the mailbox; kept until a greeting the page
  may take and said to its window, at most `PAGE_ERRORS_MAX` (5) different ones, each once.
  `makeMailbox(target, heard?)` tells `heard` of every message first.
- **A greeting handler that throws** (`onHello`) is said as `greeting` and logged, after `ready`,
  instead of propagating into the mailbox.
- **`ReportErrors`** (`./client/react`, with `PAGE_FAILED`): a boundary that says a render that threw
  as `render` and draws the error as text with Try again; `fallback(error, retry)` for your own.
- **`errorsScript()`** (`./serve`), a blocking script `pageDocument` puts ahead of everything else: it
  keeps errors from the first moment and answers the frame parent's greeting with them, so a page whose
  scripts never ran (an import that does not link) still says why. The client takes it over.

### Changed

- `mayGreet` and `pageOrigins` live in `client/greet.ts`; `connect.ts` re-exports them as before.
- The template's `main.tsx` wraps the page in `ReportErrors`.

## 2.58.0 — 2026-11-09

An agent module that is small on the canvas is drawn as a tile, and a container can be shown large
over the canvas for a while. **Additive**; `PROTOCOL` is still 2. [docs/client.md](docs/client.md),
"An agent module as a tile (2.58.0)", and [docs/asking.md](docs/asking.md), "Showing the container
large: `view.expand`".

### Added

- **`view.expand { expand }`**, a method under the new capability **`view:expand`**, answered
  **`expandResult`** (`EXPAND_OUTCOMES`: `expanded`, `shrunk`, `unchanged`, `declined`): ask the host
  to show the asking module's own container large over the canvas (`expand: true`, the default), or
  to put it back. Expanding only on the person's fresh press in the page; nothing in the
  arrangement changes and the page is moved, never reloaded. `METHOD_SINCE` and `CAPABILITY_SINCE`
  say 2.58.0.
- **`isTile(size, was)`**, **`TILE_BELOW`** (220 by 160 CSS pixels) and **`TILE_LEAVE_PX`**: when an
  agent module's page is too small for its terminal and draws its tile instead, with a margin before
  it leaves the tile again.
- **`tileStateOf(item, { title, name, unread })`**: THE mapping from the session's activity item to
  a tile's look (`TILE_LOOKS`: idle, working, question, attention, stalled, done), its badge
  (`TILE_BADGES`, so a look is never told by colour alone) and the whole state in one sentence;
  `tileItemOf(items)` picks the item that needs the person most; `tileRoom(size)` says what fits;
  `TILE_ACTIONS` the quick actions' words; `unreadWords(n)`.
- In `./client/react`: **`AgentTile`**, the tile every agent module draws — the module's icon
  (`TILE_MARKS` for the agent tools' marks), a ring for its state (turning while working, still under
  reduced motion), the title, an unread dot, and the quick actions Answer (the question's choices and
  a reply field, over the tile), Expand, Compact and Clear; and **`useTileSize()`**, the page's own
  size with `isTile`'s margin.

### Compatibility

- A host before 2.58.0 answers `view.expand` with `unknown-method`, and a module's tile then offers
  no Expand (it shows its large view in place on a press instead, if it chooses).

## 2.57.0 — 2026-11-09

A module's own short introduction, as data a host shows in its own introduction dialog. **Additive
and optional**; `PROTOCOL` is still 2. [docs/manifest.md](docs/manifest.md), "A module's
introduction (2.57.0)".

### Added

- `intro` in a manifest (top-level, like `help`): 1 to 6 slides, each a `title`, a `body` and an
  optional `art` — a picture said as shapes on a 320 by 150 canvas (`INTRO_VIEW`): `pane`, `box`,
  `rows`, `dot`, `line`, `text` and `pointer`, each with a colour role (`INTRO_TONES`) and an
  optional motion from the host's set (`INTRO_MOTIONS`) with a `delay`. The host draws it in its own
  look, and still under reduced motion; nothing is loaded from the module and no markup is rendered.
  Plain text only, bounded by `INTRO_LIMITS`; an `intro` that does not parse is dropped whole, a
  picture that does not parse drops only itself.
- `INTRO_FILE` (`intro.json` at the root of a module's repository, the same object as `intro`), so a
  host can read an introduction without running the module, and `introFromFile(text)`.
- `introOf(manifest)` (ready to draw, every string one line, or `null`), `hasIntro(manifest)`, and
  `introSeconds(intro)`, about how long it takes to read, for a host's offer.

## 2.56.0 — 2026-11-09

The reminder after a turn that ended without saying how. **Additive**; `PROTOCOL` is still 2.
[docs/activity.md](docs/activity.md), "The reminder after a stall (2.56.0)".

### Added

- **`TURN_REMINDER`**: the one fixed line a module types into its own idle session after a stall,
  when its CLI cannot send a stopping turn back.
- **`shouldRemind(case)`**: pure. Reminds only with the setting and typing on, in the module's own
  session, after a stall, `TURN_REMINDER_DELAY_MS` (20 s) after it, idle at its prompt, with nothing
  from the person since, at most once a turn and never twice without the person's prompt between.
- **`turnReminder()`**: the per-session memory for it, pure; `TURN_REMINDER_OWN_MS` tells the module's
  own typed prompt from the person's.
- **`REMIND_TURN_SETTING`** ("Remind the agent to say how its turn ended", on by default,
  `personOnly`) and `remindsTurnEnd(values)`. A module whose CLI can block a stop uses it for
  `stopBlockReason`, which is now on by default.

## 2.55.0 — 2026-11-09

How an agent session's turn ended, in one rule for every module that runs agent sessions. **Additive**;
`PROTOCOL` is still 2. [docs/activity.md](docs/activity.md), "How an agent's turn ended (2.55.0)".

### Added

- **`turnEnd({ told, waking, refused, folder })`**: THE RULE for a turn that ended. Declared
  `needs-decision` is `attention` showing the question; declared `done` or `research-complete` is
  `done`; a refused action with nothing declared is `attention` with the ask; something set up to wake
  the session (`waking` > 0) is `done`; anything else is a stall, `attention`, "Stopped without finishing".
- **`TURN_EVENTS`**: the Inbox events an agent module declares for it — `research-complete` (unchanged
  from 2.31.0), and the new `attention` events `needs-decision`, `action-refused` and `stalled`, each
  with a built-in sound.
- **`tellFinishedTool()`, `readTellFinished(args)`, `toldReply(told, reports)`**: the `tell_finished`
  tool in one wording for every agent module's door, now with `event` one of `TURN_KINDS` (`done`,
  `needs-decision`, `research-complete`); `label` is the question for `needs-decision`.
- **`refusalOf(payload)`, `refusalWords(refusal, folder)`**: an action a CLI refused on its own account
  (Claude Code's `PermissionDenied`: `tool_name`, `tool_input`, `reason`), as the specific ask:
  "Allow Bash: git push --force origin main?", with why and what granting it means.
- **`stopBlockReason(self)`**: what a `Stop` hook answers, once, when a person asked for a stalled turn
  to be sent back.
- **`finishLine(self)`** in the session notes: finish, ask with `needs-decision` (with choices, answered
  from the Inbox), or set up a wake; never end on "waiting" or a question only in the agent's own reply;
  a module on the kehikko that asks for the questions is asked instead. `NOTES_VERSION` is 8.
- **`question`** on an activity item (`activityQuestionSchema`): `text` (at most the new
  `LIMITS.ACTIVITY_QUESTION`, 1000), `choices` (a message's limits), `to` (the agent session) and
  `replyTo`. A host shows it in full with the choices as buttons and a reply field, and sends the
  answer to `to` as the person's message by the name `INBOX_VIA`. `turnQuestion(end, to)` builds it
  from a turn's end; `REFUSAL_CHOICES` and `refusalEnd` for a refused action. One that does not parse
  is dropped and the item kept.
- **`answers`** on `agentMessageSchema`: the Inbox question a person's message answers; frames and
  lines say `answering “…”`.
## 2.54.0 — 2026-11-09

A module can tell the session that asked it for something how it came out, through delivery by typing
(issue #106). **Additive**; `PROTOCOL` is still 2.
[docs/agent-messages.md](docs/agent-messages.md), "A module's notice to the session that asked (2.54.0)".

### Added

- **`messages.notify { token, body, kind?, thread? }`**, a SERVER method (`SERVER_METHODS`) under
  `agents:message`, answered `messageSendResult`: the module's own notice to the ONE session whose place
  token came with its request. The host stamps `from: { module, name, session: null, place, person:
  false }` (the asking session's place) and `to: { session }`, so the module that runs the session types
  it in under the existing rules (`messageDelivery`, 2.48.0). `kind` is `note` or `report` only.
  **`messageNotifyParams`**; `METHOD_SINCE` and `SERVER_METHOD_SINCE` say 2.54.0.
- **`LIMITS.NOTICES_PER_MINUTE`** (6) and **`LIMITS.NOTICES_PER_HOUR`** (60), per sending module and
  receiving session.
- **`isModuleMessage(message)`**: a module's own message (no session, not the person's), from
  `messages.post` or `messages.notify`.
- **`MODULE_MESSAGES_TYPED`**: `typedMessages` says a module's own message is the module's words — not
  another agent session's, not the person's — instead of `MESSAGES_TYPED_READ_ONLY` and the reply hint.
  A session's and the person's messages are typed exactly as before.

### Compatibility

- A host before 2.54.0 answers `messages.notify` with `host-too-old`; the module carries on without it.
- An agent module needs no change to deliver a notice: it is a message to one of its sessions. One built
  before 2.54.0 types it with the other-session wording.

## 2.53.0 — 2026-11-06

A kehikko's own skills, written by the person for every agent session on it. **Additive**; `PROTOCOL`
is still 2. [docs/asking.md](docs/asking.md), "A kehikko's own skills (2.53.0)".

### Added

- **`kehikkoSkills`** in the answer to `POST /host/place` (`placeDoorsSchema`, `kehikkoSkillsSchema`):
  each `{ name, description, text }`, `text` the whole SKILL.md, at most `KEHIKKO_SKILL_LIMITS.MOST`
  (20), each name once; one that does not parse is left out and the rest kept. A module that runs agent
  sessions loads every one into a session on that kehikko. Absent from a host before 2.53.0.
  `SESSION_FIELD_SINCE.kehikkoSkills`.
- **`kehikkoSkillText(name, description, body)`**, **`kehikkoSkillIssue({ name, description, body })`**,
  **`kehikkoSkillDescription`**, **`kehikkoSkillSchema`**, **`KEHIKKO_SKILL_LIMITS`** (description 300
  characters, body 32,000), type `KehikkoSkill`.
- **`NotesInput.kehikkoSkills`** and **`NotesTold.kehikkoSkills`** (`kehikkoSkillMark`): the notes list
  them at a start (`KEHIKKO_SKILLS_HEAD`) and say one added, changed or removed at a prompt; one the
  session does not `hold` (or every one, with **`NotesInput.loadsKehikkoSkills: false`** from a module
  that loads none) is said as not loaded, to be read with **`KEHIKKO_SKILLS_TOOL`** (`kehikko_skills`) on
  the host's door. `NOTES_VERSION` 7.

## 2.52.0 — 2026-11-04

How to use a module, in its own words, for a person. **Additive**; `PROTOCOL` is still 2.
[docs/manifest.md](docs/manifest.md), "How to use a module (2.52.0)".

### Added

- **`help`** (top-level manifest field, optional): `{ summary, sections: [{ title, points }] }`, plain
  text a host draws as headings and bullet lists, never as markup or links. Bounded by **`HELP_LIMITS`**
  (summary 200, title 60, point 300 characters; 8 sections, 10 points each); one that does not parse
  is dropped whole, not fatal. A host before 2.52.0 ignores it.
- **`helpSchema`**, **`helpSectionSchema`**, **`helpOf(manifest)`** (each string as one line of plain
  text, or `null`) and **`hasHelp(manifest)`**; types `Help`, `HelpSection`.

## 2.51.0 — 2026-11-04

A module's view, kept per container and back after a restart. **Additive**; `PROTOCOL` is still 2.
[docs/methods.md](docs/methods.md), `state.set`, "Per container, since 2.51.0".

### Added

- **`context.kept`**: what this module asked the host to keep for THIS container — the module on one
  kehikko — verbatim and opaque, or `null`. Optional: absent from an older host, which keeps one
  string per module and hands it over only as `hello.state`.
- **`kehikko` on `state.set`**: the id of the kehikko the write is for. A host keeping per container
  files it there; an older host strips it.
- **`hostStore` / `useHost`** read `context.kept` on the greeting and whenever the context names
  another kehikko (never on a context for the same kehikko, which may echo an older write), and fall
  back to `hello.state`. `remember(next, after?)` stamps the kehikko and may wait `after` ms; a write
  still waiting is sent for its own kehikko when the person moves, and when the page stops.
- **`useKept(host, key, initial, valid?)`** (`./client/react`) and **`KEEP_AFTER_MS`** (300): one field
  of the kept view, as `useState`, written back after the delay with the other fields kept.

## 2.50.1 — 2026-11-04

A long press inside a page of text. **A fix in the client**; nothing on the wire changes, and
`PROTOCOL` is still 2. [docs/wire.md](docs/wire.md), `pointerSchema`.

### Fixed

- **`connect`'s `kehikot.pointer`** no longer ends a mouse press the browser cancels while it is held
  still. WebKit fires `pointercancel` for a press held on text or on a selection; the press now ends
  when the button comes up (`pointerup`, `mouseup` or `dragend`), so a host times it as the long press
  it is. A touch or pen cancel is still told as `cancel`.

### Added

- **`POINTER_SLOP_PX`** (8): a press that moves farther than this from where it went down is a drag
  and is told as `cancel` at once, so a text selection or a drag is never revealed as a long press.
- **`PointerEventLike`**, what `connect` reads of a press (`button`, `isPrimary`, `clientX`,
  `clientY`, `pointerType`); `PointerTarget` takes it.

## 2.50.0 — 2026-11-04

Questions, reports and the person's own messages. **Additive**; `PROTOCOL` is still 2.
[docs/agent-messages.md](docs/agent-messages.md), "Questions, reports, and the person's messages".

### Added

- **`kind`, `choices`, `replyTo`** on `messages.send` (and the `send_message` tool): `MESSAGE_KINDS`
  (`question`, `report`, `note`); `messageChoicesSchema` — only with a question, at most
  `LIMITS.MESSAGE_CHOICES` (6), each one line of at most `LIMITS.MESSAGE_CHOICE` (80) characters,
  distinct; `replyTo` a message id. `agentMessageSchema` carries them back (`note`, `[]`, `null` from an
  older host). `messageLine`, `typedFrame` and `typedMessages` say them.
- **`messages.say`** under the new capability **`messages:as-person`** (`messageSayParams`): the
  person's own message, from a module's PAGE on their press, answered `messageSendResult`. A host
  stamps `from.person: true` (`agentMessageSchema`, `false` from an older host; `isPersonMessage`).
  Not in `SERVER_METHODS`.
- **`PERSON_MESSAGES_SETTING`** ("Send messages to agent sessions as you": boolean, off, `personOnly`,
  machine scope) and `sendsAsPerson(values)`.
- **`messages.mine`** (`messageMineParams`, `messageMineResult`) under `agents:message`: from a page,
  the messages to the asking module and the ones sent through it.
- **`PERSON_MESSAGE_AUTHORITY`**, **`PERSON_MESSAGES_HEAD`**: what a session is told about its
  person's messages — their instruction, as if typed here.
- `LIMITS.PERSON_MESSAGES_PER_MINUTE` (20).
- **`messages.post`** (`messagePostParams`) under `agents:message`: a module's own message from its page,
  stamped with no session and not the person's. **`once: true`** makes it an introduction: each session
  is handed at most one once-message from the same module, ever, and one to a place or module also
  reaches sessions that come there later (`agentMessageSchema.once`).
- **`NotesTold.lines`**: what each module on the kehikko said to agents; a module that rewords its
  `agentSays` is told again at the next prompt.

### Changed

- The person's messages are typed under `[Message from your person via <module>, #n]` and said under
  their own head in the notes and `read_messages`, before other sessions' messages. A body line that
  spells that frame is taken apart like `[Kehikot message`.
- `shouldWake`: a person's message to the whole project wakes every session (an agent's still never does).
- `answerMessageTool` passes `kind`, `choices` and `replyTo` to the host.
- `NOTES_VERSION` is 6: every running session is told the full notes once.

## 2.49.0 — 2026-11-04

The person's presses inside a page, for a host that asks. **Additive**; `PROTOCOL` is still 2.
[docs/wire.md](docs/wire.md), "`pointerSchema` (2.49.0)".

### Added

- **`kehikot.pointer`** (`MESSAGE.POINTER`, in `MODULE_MESSAGES`; `pointerSchema`, `POINTER_PHASES`,
  types `PointerMessage`, `PointerPhase`): module → host `{ phase: 'down' | 'up' | 'cancel', at }`, `at`
  the page's `performance.now()`. A press inside a framed page moves no focus when the page already
  has it, so the host could not see a click, or a held press, inside a container; this is how it
  reveals a container's rows on one. No position, no target, no answer.
- **`hello.pointer`**: a host that wants them says `pointer: true`. Absent from a host before 2.49.0,
  and then nothing is sent.
- **`connect`** sends them by itself to a host that asked: the primary button, a touch or a pen, down
  and up, and a cancelled press; it listens once across greetings and stops when a greeting stops
  asking or the page stops. `ConnectOptions.pointerTarget` (`PointerTarget`) is where it listens,
  this page's `window` by default; `false` sends none.

## 2.48.0 — 2026-11-04

Delivery by typing: a message is typed into the session it is for. **Additive**; `PROTOCOL` is still 2.
[docs/agent-messages.md](docs/agent-messages.md), "Delivery by typing".

### Added

- **`typedMessages(messages, act)`**: the text a module types for messages that came for a session —
  each under `typedFrame` (`[Kehikot message from <name> (<place>), #<id>]`, host-stamped fields only),
  its body as written (`typedBody`: lines kept, escape sequences, carriage returns, controls, bidi and
  zero-width characters gone; later lines indented), at most `DELIVER_MOST`; then whose words they are
  and `ACT_ON_MESSAGES` or `MESSAGES_TYPED_READ_ONLY`. `pasted(text)`: one bracketed paste.
- **`deliveryFor(case)`**: the pure decision per session — `type`, `wait`, `resume` or `skip` — from
  its `DeliveryState` (`idle`, `busy`, `asks`, `typing`, `asleep`, `unknown`), whether its program
  queues typing during a turn, the person's setting, and the resume caps (`RESUME_EVERY_MS`,
  `RESUME_MOST`). `DELIVERY_STATES`, `DELIVERY_ACTS`.
- **`messageDelivery(options)`** (`/serve`): the loop every agent module runs in place of
  `messageWaker`. Reads with `unread` before typing, so a typed message is counted delivered and the
  notes do not repeat it; holds messages read and not yet typed (`DELIVERY_KEEP_MS`); asks about an asleep session at most every `ASLEEP_EVERY_MS`; resumes an asleep
  session through the module's own `resume`, with the delivery as its first prompt.

### Changed

- `WAKE_ON_MESSAGES_SETTING.description` says the message is typed in and a put-away session resumed.
  Key, label and default unchanged. `messageWaker` and `wakeLine` stay for older modules.

## 2.47.0 — 2026-11-04

What goes in the header and what in the footer. **Additive**; `PROTOCOL` is still 2. [docs/footer.md](docs/footer.md),
"What goes in the header, and what in the footer".

### Added

- **The rule, written down**: the header says how the module is set up (switches, modes, sorting, filters,
  toggles, starting things, picking what is shown); the footer says what is going on now (status, meters,
  counts, progress, location) and holds only the actions that act on one of those readouts. It matters
  because a host folds a container to one row (the header) or two (header and footer).
- **`actsOn`** on the footer's `switch`, `toggle`, `go` and `run`: the id of the `text`, `meter` or `input`
  beside it that it acts on. A hint, never refused for naming nothing. `WIRE_SINCE` gains `footer.actsOn`.
- **`rowsAdvice(header, footer)`**: one sentence per obvious misplacement — a `meter` in the header, a header
  label that reads as a readout, a footer `switch` or `toggle` without `actsOn`, an `actsOn` naming no
  readout. Advice only. The client says each sentence once on the console (`console.warn`) when a page
  declares its header or footer; the lists are sent as before.

## 2.46.0 — 2026-11-04

A field in the footer. **Additive**; `PROTOCOL` is still 2. [docs/footer.md](docs/footer.md), "A field
to type into".

### Added

- **Footer `input`** (`FOOTER_KINDS` gains `'input'`; type `InputFooterItem`, guard
  `inputFooterItem`): `{ kind: 'input', id, label, value, placeholder?, grow?, agents? }` plus the
  footer's `align`, `optional` and `tooltip`. One line the person types into: `value` is the text the
  module holds now, `label` the field's accessible name, `grow` takes the width the row has left.
  Enter sends `kehikot.press` with `place: 'footer'` and `text`; Escape puts `value` back. A host keeps
  what the person is typing while the field has focus and shows `value` again when it loses focus
  without a submit. Kept in the row at every width (shrinking) unless `optional`; never in "⋯".
- **`press.text`**: the text submitted in a footer field, at most `LIMITS.FOOTER_INPUT` characters.
  Handed to `onPress` with the rest of the press. `footerPressRefusal` refuses a field's press without it.
- **`hello.footerKinds`**: the footer kinds a host draws. Absent from a host before 2.46.0, which draws
  `FOOTER_KINDS_2_38` and refuses a footer that names any other kind. `HostFacts.footerKinds`,
  `footerKinds` on `hostStore` and `useHost`. `footerDraws(facts, kind)` is the rule a module asks
  before it declares a field.
- `LIMITS.FOOTER_INPUT` (2048) and `LIMITS.FOOTER_PLACEHOLDER` (80). `WIRE_SINCE` gains `footer.input`,
  `press.text` and `hello.footerKinds`.

### Changed

- `pressableFooterItem` is true only for the header's four kinds; a field is submitted, not pressed.
  A press for an id that is not there names the fields among what can be pressed.

## 2.45.0 — 2026-11-02

Whether a module's page is on screen. **Additive**; `PROTOCOL` is still 2.
[docs/activity.md](docs/activity.md), "Whether the person can see the page".

### Added

- **`kehikot.visible`** (`MESSAGE.VISIBLE`, in `HOST_MESSAGES`; `visibleSchema`, type
  `VisibleMessage`): host → module `{ protocol, visible }`. `false` when the host hides a page it keeps
  alive for a kehikko the person left, `true` when it shows it again (the person arriving back), and
  once after every greeting. A CSS-hidden frame fires no `visibilitychange`, so this is how a page
  knows nobody is looking at it. Not answered.
- **`onVisible(visible)`** on `connect`'s events and `useHost`; **`visible`** on `HostStanding`
  (`hostStore`, `useHost`), `true` until a host says otherwise.

## 2.44.0 — 2026-11-02

Which skills load into an agent session, decided once, and notes that never claim a skill the session
lacks. **Additive**; `PROTOCOL` is still 2. docs/manifest.md, "Which skills load"; docs/asking.md, "The
skills a session has".

### Added

- **`skillsThatLoad(skills, present, nameOf?)`** → `{ load, left }`: the rule the host and every module
  that loads skills share. `present` is manifests (`ProvidingManifest`), never bare ids — from an id a
  `{ provides }` / `{ subject }` / `{ reacts }` / `{ uses }` need is never met. Each left-out skill
  carries its `missing` needs and `said`, them in words (`needSaid`). `SkillLeftOut`.
- **`NotesInput.holds`**: the skills the session has (loaded by its module, or installed where its agent
  reads them). A module line then says only those after "Skills:" and the rest after **`NOT_LOADED`**.
  Absent: the host's list as it is. `moduleLine(one, connected, holds)`.

### Changed

- `NOTES_VERSION` is 5: a session told by 4 gets the full notes once.

## 2.43.0 — 2026-10-31

A message wakes an idle agent session, and the person's standing permission to act on messages.
**Additive**; `PROTOCOL` is still 2. docs/agent-messages.md, "Waking an idle session" and "Acting
on messages".

### Added

- **`shouldWake(message, you)`**: whether a message may wake a session idle at its prompt — to it,
  its module or a place it is at; never one to the whole project, never its own.
  **`wakeMessages(read, after)`**: the unread, wake-worthy messages of a `messages.read` answer asked
  without `unread` (so nothing is counted delivered). **`wakeLine(messages, act)`**: the one line a
  module types and submits — the host-stamped sender name (`wakeName`: plain words only), its module
  id and place, how many, "Read it with read_messages". Never a message's body.
- **`messageWaker(options)`** (`/serve`; `WakeSession`, `WAKE_EVERY_MS` 5 s, `WAKE_SETTLE_MS` 2 s):
  the rule every agent module runs. Each tick it asks the host `messages.read` for each session the
  module owns that is idle with the setting on, and types one line through the module's own
  `type(key, line)`; once per idle period, after the session and the newest message settled. No
  host change: it reads what 2.41.0 hosts already answer.
- **`WAKE_ON_MESSAGES_SETTING`** ("Messages wake an idle session") and
  **`ACT_ON_MESSAGES_SETTING`** ("Act on messages from other sessions"): booleans, on by default,
  `personOnly`, to spread into a module's `declares.settings`; read with `wakesOnMessages(values)`
  and `actsOnMessages(values)`.
- **`ACT_ON_MESSAGES`**, **`MESSAGES_HEAD_ACT`**, `messagesHead(act)`: the wording a session is told
  when its person allowed acting on messages. `act` on `messagesNotes`, `messagingLine`,
  `readMessagesText`, `messageTools`, `MessageToolOptions` (`answerMessageTool`, `messageToolsFor`)
  and `NotesInput.actOnMessages`; off, every one says exactly what 2.42.0 said.

### Changed

- **`NOTES_VERSION` is 4**: a session told by 3 gets the full notes once. `NotesTold.act` keeps what
  it was told, and turning the setting on or off tells the full notes once at the next prompt.

## 2.42.0 — 2026-10-31

How the host's revealed header and footer meet a module's page. **Additive**; `PROTOCOL` is still 2.
docs/manifest.md, "How the host's rows meet the page".

### Added

- **`reveal: 'push' | 'over'`**, a top-level manifest field (`REVEAL_MODES`, `revealModeSchema`,
  `revealModeOf`, `push` when absent). `over` asks the host to keep the module's frame at its size
  when it reveals its rows on hover and to draw them over the frame's top and bottom instead — for a
  terminal, whose pty redraws on every resize. A host before 2.42.0 ignores it; an unknown word is
  dropped.
- **`kehikot.covered`** (`MESSAGE.COVERED`, in `HOST_MESSAGES`; `coveredSchema`, type
  `CoveredMessage`; `coveredFields`, `Covered`, `NOT_COVERED`): host → module `{ protocol, top,
  bottom }`, CSS pixels of the frame under the host's rows, capped at `LIMITS.COVERED_PX` (512). Sent
  to an `over` module when it changes and after a greeting while anything is covered. Not answered.
- **`onCovered({ top, bottom })`** on `connect`'s events and `useHost`; **`covered`** on
  `HostStanding` (`hostStore`, `useHost`), back to nothing on every greeting.
- **`keepInView(covered, height, last)`** (also from `/client`): how far to move content (a
  `translateY`; negative is up) so the line ending at `last` stays above the footer, or moves down out
  from under the header when the screen is short. Whole pixels; 0 when nothing is covered.

## 2.41.0 — 2026-10-31

Messages between agent sessions, kept by the host. Additive. See [docs/agent-messages.md](docs/agent-messages.md).

- **`agents:message`**, a capability, with **`messages.send`** (`messageSendParams`, answered
  `messageSendResult`: `sent` with an id, or `declined`) and **`messages.read`** (`messageReadParams`,
  answered `messageReadResult`: `messages`, `unread`, `you`). Both in `SERVER_METHODS`, asked by a module's
  server for the session its place token names; they name no project (the token's is used). The host
  stamps the sender: module, registered name, session, place.
- **Addressing** (`messageToSchema`): the project, a place (`epic`, `kehikko`), a module, or one session
  (`agentSessionRefSchema`: `{ module, session }`). Messages are `agentMessageSchema`, threads `MESSAGE_THREAD`.
- **Caps** in `LIMITS`: `MESSAGE_BODY` 2000, `MESSAGES_READ` 50, `MESSAGES_KEPT` 1000 and `MESSAGES_KEPT_MS`
  14 days per project, `MESSAGES_PER_MINUTE` 6 and `MESSAGES_PER_HOUR` 60 per session, `MESSAGES_UNREAD_MS` 24 hours.
- **The notes**: `messages: true` on `POST /host/place` (`placeIssueSchema`) asks the host to hand the
  session's unread messages (`messages`, `messagesMore` on `placeDoorsSchema`, `SESSION_FIELD_SINCE`) and move
  its cursor; `NotesInput.messages`, `messagesMore` and `messaging` say them (`messagesNotes`, `messageLine`,
  `MESSAGES_HEAD`, `NOTES_MESSAGES_MOST` 8, `messagingLine`). Each body is one quoted line (`quotedBody`),
  text to read, not instructions. `NOTES_VERSION` is 3.
- **The adapter**: `messageTools()` (`send_message`, `read_messages`, `MESSAGE_TOOL_NAMES`, `isMessageTool`),
  `readMessagesText`, `sentText`; in `/serve`, `messageToolsFor`, `hostKeepsMessages`, `answerMessageTool`,
  `forgetMessageHosts`. `ServerAnswers` gains both methods.

## 2.40.0 — 2026-10-31

A run may hand the host a copy or an open, which the host carries out in the person's click. Additive.

- **`copy: { plain, html? }`** and **`open`** on a `run` (header and footer; `runCopySchema`,
  `runOpenSchema`, `RUN_CARRIES`): the host writes the clipboard (text/plain, and text/html when
  given) or opens the page in the person's browser from its own click handler, because a press relayed
  to the module carries no user activation. Capped (`RUN_COPY_PLAIN` 65 536, `RUN_COPY_HTML`
  131 072); `open` is `https:` only (`runOpenRefusal`). One act per run, never with `agents: true`
  or `surface`. The html is text to the host: written, never drawn.
- **`carried`** on `kehikot.press`: `copy` or `open` when the host did the act before sending it.
- **`hello.carries`**: the acts a host carries out; client `facts.carries`, `useHost().hostCarries`.
  A module uses `copy`/`open` only when the act is listed, and keeps its in-page act otherwise.
- `WIRE_SINCE`: `run.copy`, `run.open`, `press.carried`, `hello.carries`.

See [the header](docs/header.md#acts-the-host-carries-out-2400).

## 2.39.0 — 2026-10-31

More brand marks for modules that front a coding agent. Additive.

- **`BRAND_MODULE_ICONS`** gains `openai` (Codex), `googlegemini` (Antigravity), `opencode` and
  `mistralai` (Vibe): Simple Icons slugs, so `brand:openai`, `brand:googlegemini`, `brand:opencode`
  and `brand:mistralai` are keys of `MODULE_ICONS`. A host that does not know one yet draws the
  module's initial, as for any unknown key.

## 2.39.0 — 2026-10-31

More brand marks for modules that front a coding agent. Additive.

- **`BRAND_MODULE_ICONS`** gains `openai` (Codex), `googlegemini` (Antigravity), `opencode` and
  `mistralai` (Vibe): Simple Icons slugs, so `brand:openai`, `brand:googlegemini`, `brand:opencode`
  and `brand:mistralai` are keys of `MODULE_ICONS`. A host that does not know one yet draws the
  module's initial, as for any unknown key.

## 2.38.0 — 2026-10-31

The footer: a module declares its status row and the host draws it at the bottom of the container, as
it draws the header. Additive.

- **`kehikot.footer`** (`MESSAGE.FOOTER`, `footerSchema`, module → host): every footer item, whole,
  every time; `[]` takes the footer away. Items (`footerItemSchema`, `FOOTER_KINDS`): `text` (a status
  line or a count, with a `level`), `meter` (`label`, `value` 0 to 1, `level`, optional `text`), and the
  header's `switch`, `toggle`, `go` and `run` with their fields and rules (`pinned` and `surface`
  stripped). Every item has `align` (`start`, `center`, `end`; `FOOTER_ALIGNS`), `optional` and
  `tooltip`. `FOOTER_LEVELS`: `normal`, `warn`, `critical`. Limits `FOOTER_ITEMS` (16), `FOOTER_TEXT`
  (120), `FOOTER_METER_TEXT` (24), `FOOTER_TOOLTIP` (240).
- **`kehikot.press` may say `place: 'footer'`** (`PRESS_PLACES`); absent is the header, as before.
  `footerPressRefusal` judges a footer press; `pressableFooterItem`, `meterSaid`.
- **Fit:** `footerLayout(items, width)` and `footerModeFor`, at the header's widths
  (`FOOTER_ICONS_BELOW` 300, `FOOTER_MERGE_BELOW` 220): optional items go and runs become icons under
  300, every pressable item is in one "⋯" under 220. Nothing pressable is lost.
- **`hello.footer`**: whether the host draws a declared footer. Client: `Connection.footer`,
  `HostFacts.footer`, `onPress` receives `place`, `hostStore`/`useHost` have `footer` and `drawsFooter`.
  A module declares its footer only when `drawsFooter === true`, and draws its own otherwise.
- **`WIRE_SINCE`** (`SINCE.wire`, `sinceOf('wire', …)`): `kehikot.footer`, `hello.footer`, `press.place`.
- `HEADER_ITEM_SHAPES`, `checkPressable`, `headerIdSchema`, `headerLabelSchema`: the header's item
  shapes and rules, exported so the footer takes the same ones.

See [the footer](docs/footer.md).

## 2.37.0 — 2026-10-31

A session told by an older wording of the notes gets the full new notes once. Additive.

- **`NOTES_VERSION`** (2 now; 1 is the era before it was kept): bumped whenever the content or format of
  what a session is told changes. `sessionNotes` writes it into the `NotesTold` it returns (`version`,
  optional: a record kept before 2.37.0 has none and reads as 1).
- At a `'prompt'`, a session told by an older version (or none) gets the FULL start text once, headed
  `UPDATED_HEAD` ("Kehikot: what this conversation is told was updated:"), and the new record; after
  that only changes, as before. A start, and a moved place, say what they said before.

## 2.36.0 — 2026-10-31

What agent sessions are told about the modules around them, and about the installed ones that are
not there. **Additive**; `PROTOCOL` is still 2. docs/asking.md, "What a session is told";
docs/manifest.md, "What a module says to agents".

### Added

- **`agentSays`** and **`absentSays`**: top-level manifest lines (`agentSaysSchema`, text, at most
  `AGENT_SAYS_MAX` = 200 characters, dropped when they do not parse). `agentSays` says when to use the
  module, beside its name, to sessions on a kehikko it is on (falling back to `summary`;
  `agentSaysOf`); `absentSays` is said to sessions on a kehikko it is not on while it is installed
  (`absentSaysOf`). An older host ignores both.
- **`modules`** and **`absent`** on `placeDoorsSchema`, the host's answer to `POST /host/place`:
  `sessionModuleSchema` (`module`, `name`, `summary`, `says`, `door`, `skills`; hosts sent `modules`
  before without a shape in the protocol) and `absentModuleSchema` (`module`, `name`, `says`). A host
  lists in `absent` only installed modules on its official list. `LIMITS.SESSION_MODULES` (128),
  `LIMITS.ABSENT_MODULES` (32).
- **`sessionNotes(input, event, told)`**: THE text a session is told, the same for every module that
  runs agent sessions — everything at a start (`startNotes`), what changed at a prompt
  (`changeNotes`), or nothing — and what to keep for next time (`NotesTold`). With `placeWords`,
  `moduleLine`, `absentLine`, `researchLine`, `oneLine`, `NOTES_MOST`, types `NotesInput`,
  `NotesPlace`, `NotesSelf`, `NotesTold`, `NotesEvent`, `SessionModule`, `AbsentModule`.
- **`SESSION_FIELD_SINCE`** (`SINCE.sessionFields`, `sinceOf('sessionField', …)`, type
  `SessionField`): `everywhere` 2.23.0; `modules`, `absent`, `agentSays`, `absentSays` 2.36.0.

## 2.35.0 — 2026-10-30

The host tells a module which of its Inbox items the person opened. **Additive**; `PROTOCOL` is
still 2. docs/activity.md, "The person opened an item".

### Added

- **`kehikot.opened`** (`MESSAGE.OPENED`, in `HOST_MESSAGES`; `openedSchema`, type `Opened`):
  host → module, `{ protocol, item }`, sent once the host has gone to the place of an item the person
  pressed in the Inbox, on a toast or with Next. `item` is the item's `id`. Not answered. A module
  before 2.35.0 drops it unread.
- **`onOpened({ item })`** on `connect`'s events, `useHost` and `hostStore`.
- docs/activity.md says what "the same item" is: one `id` from one module, unchanged while its
  `state` and `since` are, so a module keeps `since` across re-sends and its own restarts.

## 2.34.0 — 2026-10-30

Where a change's pipeline is and when it last moved. **Additive**; `PROTOCOL` is still 2.
docs/tracker.md, "People and my roles".

### Added

- **`pipelineUrl?: string`** on `trackerRowSchema`, on a change with a `pipeline`: where a person
  sees it, `https:` — the pipeline's page, or the change's checks page where the tracker has no
  single pipeline page. At most `LIMITS.URL`.
- **`pipelineAt?: instant`** on `trackerRowSchema`: when the pipeline's state last moved —
  finished, else started, else made.
- Both from the same reading as `pipeline`, absent from older hosts, stripped by older readers, and
  dropped, not fatal, when they do not parse. Both in `TRACKER_FIELD_SINCE` at 2.34.0.

## 2.33.0 — 2026-10-29

What a host used to know about modules by id, said by the modules themselves. **Additive**; `PROTOCOL`
is still 2. All three are top-level manifest fields (or on an `events` entry), not under `declares`,
so a host before 2.33.0 ignores them and runs the module; none is in `DECLARATION_SINCE`.
docs/manifest.md, docs/activity.md.

### Added

- **`opens`** (`opensSchema`, `OPENS`: `file`, `LIMITS.OPENS`): what a module can open when the host
  points the canvas at it. A host with a file to show a person offers to open it with a module that
  says `file`. `opensOf(manifest)`, `canOpen(manifest, what)`.
- **`holds`** (`holdsSchema`, `HOLDS`: `live-sessions`, `LIMITS.HOLDS`): what a restart of the module
  ends. A host does not restart such a module on its own account, and says so on a press that would.
  `holdsOf(manifest)`, `holdsLiveSessions(manifest)`.
- **`events[].sound`** (`EVENT_SOUNDS`, `SOUND_KEY`, `LIMITS.SOUND_KEY`, type `EventSound`): the
  host's built-in sound an event plays until the person chooses one. A bad key is dropped, the event
  kept. `eventSoundOf(event, known)`: the key when the host has it, else null (the kind's sound).
- Exports: `type Opens`, `type Holds`, `type AbleManifest`.

## 2.32.0 — 2026-10-29

A page never polls its module. **Additive**; `PROTOCOL` is still 2. Built on the doors' `stream` door
(its headers, opening comment, heartbeat, `setNoDelay`, close), which is unchanged. docs/events.md.

### Added

- **`events(route)`** (`/serve`): a `Stream` for `doors({ stream })` and `run({ stream })`.
  `route(path, query, ticket)` returns `{ topic, initial? }` (`EventRoute`) or `null`; `GET` only.
  `initial` (a value, or a function that may be async) is sent first on every open, and what is
  published meanwhile waits behind it. A bad topic is a 400 (`EVENTS_BAD_TOPIC`, `MAX_TOPIC_LENGTH`).
- **`publish(topic, data, name?)`**: one event to every stream on the topic; returns how many it
  reached. **`watching(topic?)`**: how many streams are open on a topic, or on all.
- **`MAX_EVENT_STREAMS`** (64) per process: past it a stream is a 503 with `retry-after: 5`
  (`EVENTS_FULL`).
- **`streams(...doors)`**: several stream doors as one, the first that answers wins.
- **`attach(topic, deliver, initial?)`**: the hub itself, for a server that writes its own stream.
- **`eventFrame(data, name?)`**: the one way an event is written; the doors use it.
- **`subscribe(url, onEvent, options?)`** (`/client`): `follow` closed while `document.hidden` and
  opened again when the page is shown (`whileHidden` keeps it open). Returns the unsubscribe.

## 2.31.0 — 2026-10-28

Named Inbox events. **Additive**; `PROTOCOL` is still 2. An activity item stays one of its three
states; an event names a case of one ("Research complete", a `done`) that a host can show by name and
give its own sound. An older host strips the item's `event` and does not read `events`.
docs/activity.md#named-events-2310.

### Added

- **`events`** at the manifest's top level, beside `reacts` and `shows` (not under `declares`, whose
  unknown keys a 2.30.0 `fitOf` reads as too new to run) (`inboxEventsSchema`, `inboxEventSchema`, `InboxEvent`):
  `{ id, says, state }`, at most `LIMITS.EVENTS` (16), ids distinct. Dropped, not fatal, when it does
  not parse.
- **`event`** on an activity item (`activityItemSchema`): an `EVENT_ID` (`LIMITS.EVENT_ID`, 40).
- **`declaredEvent(declared, item)`**: the declared event an item is, or null when the manifest does
  not declare it or declares it for another state. The one rule a host applies.
- **`ACTIVITY_FIELD_SINCE`** (`SINCE.activityFields`, `sinceOf('activityField', …)`): the version
  that added each optional item field (`priority`, `refs`, `group`, `project`, `projectId`, `event`).
  Not read by `fitOf`, like `TRACKER_FIELD_SINCE`; `events` is not in `DECLARATION_SINCE`.

## 2.30.0 — 2026-10-28

What a module starts for the person runs with the person's `bun` and `node`. **Additive**;
`PROTOCOL` is still 2. A module on an older host gets the same result from the `PATH` checks alone;
a host names what it prepends in `KEHIKOT_HOST_PATH` so the module need not guess.
docs/serving.md#what-a-module-starts-for-the-person-personenv-2300.

### Added

- **`personEnv(env = process.env, { execPath })`** (`/serve`): the environment for a program a
  module starts on the person's behalf. Takes off `PATH` the folders named in `KEHIKOT_HOST_PATH`
  (the first occurrence of each), any `bun-node-*` or `kehikot-bun-*` folder whose `bun` or `node`
  is the module's own runtime, and, when that runtime is a compiled host rather than Bun or Node,
  any folder whose `bun` or `node` is it. Drops `BUN_BE_BUN` and `KEHIKOT_HOST_PATH`; keeps the
  rest. **Anything a module starts on the person's behalf uses `personEnv`.**
- **`HOST_PATH_ENV`** (`KEHIKOT_HOST_PATH`): the folders, joined by the path delimiter, a host put
  first on a module's `PATH` for the module's own process.

## 2.29.0 — 2026-10-28

A module's scope: what its content belongs to. **Additive**; `PROTOCOL` is still 2. A module that
lists only `epic` modes needs nothing new of a host; one that lists another scope needs a 2.29.0 host
(`modes.scope` in `DECLARATION_SINCE`), because an older host's schema knew only `epic` and `global`.
docs/manifest.md#scope-290.

### Added

- **`MODULE_SCOPES`** (`ModuleScope`): `machine`, `project`, `epic`, `part`, `kehikko`, with the
  names a person is shown (`SCOPE_NAMES`: This computer, Project, Epic, Part, Kehikko) and what each
  means (`SCOPE_MEANS`). `DEFAULT_SCOPE` is `epic`.
- **`modes[].scope`** takes the five words. A module lists one mode per scope it can work at, its
  default first; the person picks among them per container in the host. Absent, the old `global` and
  a word a later version adds read as `epic` (`readScope`), so no manifest is refused for it.
- **`modes[].scopeSays`**: what the module shows at that scope, in one line. Optional; a host before
  2.29.0 drops it.
- **`supportedScopes(manifest)`** (`SupportedScope`: `scope`, `says`, `mode`), **`defaultScope`**,
  **`supportsScope`**, **`activeScope(manifest, picked)`** (the pick when supported, else the
  default), **`scopeSaysOf`**, **`scopeNeedsEpic`** (`epic`, `part`) and **`toldScope(active,
  allEpics)`**: on "All epics" a container at `epic` or `part` is told `project`.
- **`context.scope`** carries the container's scope, any of the five; a host tells a module only a
  word it listed, `epic` or `project`. When the person picked `project` for one container, `epic`
  is still the open epic. A word this package does not know reads as absent.
- **`workingScope`** on the client's standing (`hostFields`), beside the two-word `scope`.
- **`modes.scope`** in `DECLARATION_SINCE` (`needsOf`, `fitOf`): a mode scope other than `epic` or
  `global`.

### Deprecated

- **`declares.scopes`**: list a mode with `scope: 'project'` instead. Still read: `project` there
  counts as a supported scope after the modes', and `scopesOf` and `showsProject` read either.
  Keep it beside the mode while a host before 2.29.0 should leave the module uncovered on "All epics".

## 2.28.0 — 2026-10-28

Going to a place in another project, and to one thing there. **Additive**; `PROTOCOL` is still 2. A
module that remembers where something came from — a test run asked for from another project's
conversation — can take the person there with one press: the host switches project as the person's
own switch does, then goes to the epic, kehikko and parts, and the module that runs the conversation
is asked to show it. Neither side names the other. docs/methods.md, docs/wire.md, docs/manifest.md.

### Added

- **`view.goto { project }`**: the project to stand in first, by its id (`context.projectId`) or,
  without one, its absolute folder (`projectKey`'s key); `gotoProject`, `gotoProjectIsId`. Goes with
  an `epic`: the schema refuses a project alone. A host switches as the person's own switch does,
  then goes to the place in it; a project it does not hold is `declined`, with a sentence that lists
  no project. Only on a person's press: a host never switches project for an agent.
- **`view.goto { show }`**: one thing to be shown on the kehikko the move ends on, `{ subject, id }`
  (`showAskSchema`; `SHOW_SUBJECTS`: `agent-session`, the id the module running the conversation keeps).
- **`context.show`** (`sharedShowSchema`: the ask, `by`, `at`): relayed after a `moved`, only to the
  containers on that kehikko whose manifests say they show the subject; `null` for everybody else and
  from an older host. `showIsNews(show, actedOn)` (the rule `addressIsNews` keeps).
- **`shows`** in a manifest (`showsSchema`, `showsOf`, `canShow`): the subjects a module can be asked
  to show. What a module says about itself, like `reacts`: not in `DECLARATION_SINCE`, and an older
  host still runs a module that says it (and relays nothing).
- **`declares.navigates`** (`navigatesSchema`, `NAVIGATES`: `project`, `show`; `navigatesOf`): what a
  module's `view.goto` carries that a host before 2.28.0 does not know. In `DECLARATION_SINCE`, so
  `fitOf` holds such a module to a 2.28.0 host: an older one strips `project` and would go to the epic
  of that name in the project it has open. A host answers `project` and `show` only for a module that
  says them.
- `LIMITS.NAVIGATES` (8), `SHOWS` (8), `SHOW_ID` (128).
## 2.27.0 — 2026-10-28

Run results for the work they are for. **Additive**; `PROTOCOL` is still 2, and a host needs nothing
new: the file is a module's own, read by modules. A module that runs things — tests before a push, a
fix's verification, a review round — says what came of each run and which change or issue it was
for, and any other module can show it on that work without knowing who ran it. docs/runs.md.

### Added

- **`runs.json`** in a publisher's own folder (`RUNS_FILE`, `RUNS_VERSION` = 1):
  `{ version, runs: RunResult[] }`.
- **`runResultSchema`** (`RunResult`): `id`, `label`, `kind` (`RUN_RESULT_KINDS`: `push`, `verify`,
  `review`, `other`; anything else reads as `other`), `refs` (tracker refs as the reading spells
  them), `epic` (a slug or null), `state` (`RUN_RESULT_STATES`: `queued`, `running`, `passed`, `failed`,
  `cancelled`), `queuedAt`, `startedAt`, `finishedAt` (ms since the epoch, null until then) and
  `exit` (null until ended, and for a signal or a cancel). `runEnded(state)`.
- **`runsIn(document)`**: a file's runs, junk costing only its entry, an id once, at most
  `LIMITS.RUNS`. **`latestRuns(runs, ref)`**: the newest run of each label on one ref, in label
  order — a newer run of a label replaces the older one's state, so a pass and then a failure reads
  failed.
- **`/serve`: `readRuns(projectPath)`** — every module folder's `runs.json`, each run with `from`
  (`PublishedRun`), no module named; never throws, never writes. **`writeRuns(projectPath, moduleId,
  runs)`** — one module's runs, whole, newest `LIMITS.RUNS` kept, atomic.
- `LIMITS.RUNS` (200), `RUN_ID` (64), `RUN_LABEL` (120), `RUN_REFS` (16), `RUNS_BYTES` (1 MiB).

## 2.26.0 — 2026-10-26

Work that is part of an issue. **Additive**; `PROTOCOL` is still 2. A change whose description says
"Part of #12" used to come back as `closes` it, so merging one of three changes made the issue read
as done. Now a change that delivers part of an issue is tied to it in fields of its own, and that
tie never makes the issue closed. docs/tracker.md, "Work that is part of an issue".

### Added

- **`contributes?: ref[]`** on `trackerRowSchema`, on a change: the issues it says it is part of
  without closing them ("Part of #12", "Implements #12", or the forge listing it as related but
  not closing). A ref in `links` is not repeated here.
- **`contributedBy?: ref[]`** on `trackerRowSchema`, on an issue: the reverse. Never sets
  `closedByMerge`, never a `closed-by` link.
- Both at most `LIMITS.TRACKER_LINKS`; absent from older hosts, stripped by older readers, and
  dropped, not fatal, when they do not parse. Separate fields, not new `LINK_RELATIONS` words:
  `relation` is an enum, and a word an older module's schema does not know would fail its whole
  `tracker.get` answer.
- **`TRACKER_FIELD_SINCE`** in `SINCE` (`trackerFields`, `TrackerField`, piece kind
  `trackerField`): each tracker row field added since 2.6.0 and the version that added it.
  `needsOf` and `fitOf` do not read it; no manifest names a row field.

## 2.25.0 — 2026-10-26

Every request the host receives names who sent it. **Additive**; `PROTOCOL` is still 2. A row of
traffic with `by: ''` used to be all a reader could say about curl, an agent session at the host's
MCP door, or a module's first calls before the process sampler had looked; now the host names it
and says how it knew. docs/traffic.md, "Who asked".

### Added

- **`caller`** on `trafficCallSchema` (`trafficCallerSchema`, `TrafficCaller`): `kind`
  (`TRAFFIC_CALLER_KINDS`: `host`, `module`, `session`, `program`, `remote`, `gone`), `name` (what a
  person reads: "Claude session on Wide · methods", "curl, from your terminal (zsh)"), `how`
  (`TRAFFIC_CALLER_HOW`: `route`, `origin`, `token`, `process`, `address`, `closed`), and optionally
  `process` and `parent` (executable names, never a path or an argument), `place` and `pid`. Set by
  the recorder on rows it received; a note cannot carry one. Optional: absent from older hosts,
  stripped by older readers, and dropped, not fatal, when it does not parse.
- **`LIMITS.TRAFFIC_CALLER`** (120): a caller's name and place, in characters.

## 2.24.0 — 2026-10-26

Each forge's budgets, separately, on `traffic.read`. **Additive**; `PROTOCOL` is still 2. A host
that reads GitHub as the person keeps a share of their account's limit for itself; a reader can now
show the account's real limits, that share, and the anonymous budget apart. docs/traffic.md.

### Added

- **`limits`** on `trafficReadResult` (`trafficLimitsSchema`, `TrafficLimits`): `github.account`
  and `gitlab.account` (`trafficAccountSchema`: `login`, `core`, `graphql`, `paused`, `why`, `until`,
  `at`), each limit an `trafficAllowanceSchema` (`limit`, `used`, `remaining`, `resets`, `share`,
  `floor`) with Kehikot's share as `trafficShareSchema` (`limit`, `used`); `github.anonymous`, the
  budget without an account (`trafficBudgetSchema`, as in `budgets`). Optional: absent from older
  hosts, stripped by older readers, and dropped, not fatal, when it does not parse. `budgets` is
  unchanged and still filled.

## 2.23.0 — 2026-10-26

Skills an agent module installs for its own agent. **Additive**; `PROTOCOL` is still 2. For an agent
with no per-conversation skills folder (Codex reads only user-wide and repository folders), the
module that runs its sessions puts the skills where that agent reads them, and the host tells it which
ones the person keeps in every conversation. docs/manifest.md, "Agent sessions"; docs/asking.md.

### Added

- **`declares.agentSessions.installsSkills`** (`agentSessions.installsSkills` in `DECLARATION_SINCE`),
  read by `installsSkills(manifest)`: the module installs skills itself, where its agent reads them.
  Its own declared skills are written for that agent, so a host never installs them into another
  agent's folder (Claude Code's `~/.claude/skills`). A host before 2.23.0 strips the key and would
  install them for Claude Code: `needsOf` says 2.23.0 for a manifest that sets it.
- **`everywhere`** on `placeDoorsSchema`, the host's answer to `POST /host/place`, for a module that
  installs skills: `everywhereSkillSchema` (`{ module, name, version, origin }`, `EverywhereSkill`),
  the skills the host keeps installed in the person's agent for every conversation as its settings
  say — its own and each module's that is not kehikko-bound, never another agent module's. At most
  `LIMITS.EVERYWHERE_SKILLS`. Absent from older hosts; dropped, not fatal, when it does not parse.

## 2.22.0 — 2026-10-26

Whether a module and a host fit, from the manifest every module already serves. **Additive**;
`PROTOCOL` is still 2. A module needs no code for it. A reader from before 2.22.0 strips the new
refusal fields and sees `unknown-method`, as before. docs/fit.md.

### Added

- **`SINCE`**: which version each piece arrived in. `METHOD_SINCE` (every method), `CAPABILITY_SINCE`
  (every capability: the version of its oldest method), `SERVER_METHOD_SINCE` (when a module's
  server could first ask each method in `SERVER_METHODS`), and `DECLARATION_SINCE` (`mcp.subjects`
  1.1.0, `mcp.as` 1.3.0, `declares.skills` 2.5.0, `declares.scopes` 2.9.0, `skills.needs` 2.12.0,
  `declares.settings` 2.15.0, `declares.provides`, `declares.agentSessions` and
  `skills.needs.object` 2.21.0). Also `SINCE_FLOOR` (`0.25.0`), `DECLARATION_NAMES`, and
  `sinceOf(kind, piece)`. `PIECE_SAID` and `pieceSaid` give each piece in a person's words.
  `REMOVED` and `removedIn` are empty until 3.0.
- **`needsOf(manifest, above?)`**: reads a parsed manifest or raw JSON and returns `version` (the
  newest any piece needs), `pieces` (newer than `above`, then the unknown ones), `unknown`, and
  `built` (`build.protocol`, a hint only).
- **`fitOf(manifest, { version?, protocol? })`**: returns `fits`,
  `host-too-old { since, missing }`, or `module-too-old { removed }`, plus `protocol` when the
  protocol number decided. An unknown piece counts only if the module was built with a newer
  package than the host, or does not say what it was built with.
- **`fitSaid(fit, name)`** returns `{ title, line, action }`: "Monitor needs a newer Kehikot", "It
  uses the call log, added in protocol 2.20.", "Update Kehikot"; or "<Module> needs an update" and
  "Update <Module>". **`FIT_SAYS`** holds the same words, and `FIT_SAYS.tooOld(since)` is "This
  needs Kehikot with protocol 2.21 or later."
- **`declined: 'host-too-old'` and `since`** may appear on a refusal (`DECLINED_REASONS`,
  `declinedFields`), on both `responseSchema` and `serverAskResult`. Out of shape, they are dropped.
- **`hostTooOld(value)`** reads `{ outcome: 'declined', reason: 'host-too-old', since }` off a
  `HostRefused`, a `Refusal`, an `AskedHost` or a relayed body. **`tooOldOf(method, refusal, kind?)`**
  is the rule the client and `askHost` share. Both are also exported from `/client` and `/serve`.
- `Refusal.declined?`, `Refusal.since?`; `AskedHost` failures also gain `declined?` and `since?`.
- `PROTOCOL_VERSION` (the `major.minor.patch` pattern), `versionParts`, `compareVersions`,
  `newerVersion`, `versionSaid`.

### Changed

- `connection.request` rejects with `host-too-old` (and `since` from `METHOD_SINCE`) when the host
  answers `unknown-method` for a method this package knows. The `reason` is still `unknown-method`.
- `askHost` says `host-too-old` when the host says `declined`, when it answers `unknown-method` for
  a server method this package knows, and when a host from before 2.22.0 refuses the question as
  malformed because its `SERVER_METHODS` lacks the method. Until now that last case read as "No
  Kehikot host answered".

## 2.21.1 — 2026-10-26

A module's server asks the host about a project far less often. **Additive**; `PROTOCOL` is still 2.

### Fixed

- `hostProject`, `hostHasProject`, `resolveDoorProject`: a `project: true` is kept for
  `LIMITS.HOST_PROJECT_KEEP_MS` (60 s) and given again without asking, while the very folder the host
  vouched for (device and inode) is still at the path. A page polling its server every 4 s with two
  polls made its server ask `GET /host/is-project` thirty times a minute; now about once. A move is
  still followed at once (the folder left the path, so the host is asked and says `movedTo`); an
  answer naming the same id elsewhere drops what was kept; a "no", a folder not on disk and no answer
  are never kept; asks that arrive together share one. docs/serving.md, "A yes kept".

### Added

- `forgetHostProjects()`; `HostHasProjectOptions.keepMs` (0 asks every time) and `now`;
  `LIMITS.HOST_PROJECT_KEEP_MS`.

## 2.21.0 — 2026-10-26

Steps any module can provide, skill needs by what a module provides, and a module's server asking
for the epic. **Additive**; `PROTOCOL` is still 2. Nothing existing changes shape on the wire: an old
module keeps working against a 2.21.0 host, and a 2.21.0 module against an older host, with one
exception said below (`needs` objects).

### Added

- **An epic's plan as a holding** (`plan.ts`, docs/plans.md): `planSchema` — `goal?`, `measure?`,
  `phases: { id, title }[]`, `steps: { id, title, body, refs, issue?, related, part?, under?, after,
  phase?, gates: { id, title, kind: 'decision' | 'access' | 'work' | 'ref', ref?, epic?, owner?,
  waitsOn, done }[] }[]` — published by any module in `.kehikot/<module>/steps.json`
  (`PLAN_FILE`, `PLAN_VERSION`, `{ version, module, epics }`). `PLAN_ID`, `PLAN_GATE_KINDS`,
  `planPhaseSchema`, `planGateSchema`, `planStepSchema`, `planIn` and `plansIn` (lenient readers),
  `phaseOf` (a step's phase, inherited from above), `LIMITS.PLAN_*`.
- `/serve`: `writePlan(projectPath, moduleId, epic, plan | null)` (atomic, inside the project, refuses
  a plan that does not fit and reports dropped references) and `readPlans` / `readPlansFor` (every
  module's `steps.json`, by folder).
- **`steps.list` answers the union** of every provider: `stepsListResult` (`steps` and `phases`, each
  with the `module` that provides it, and `providers: { module, goal?, measure?, fallback? }[]`) in
  `methodResults`; `providedStepSchema`, `providedPhaseSchema`, `stepsProviderSchema`, and
  `plansUnion`, the one union two hosts make alike. An epic whose steps are elsewhere is still
  answered `{ stepsFrom }` with no `steps`.
- `CONTENT_STEPS` (`'steps'`): the content source a host announces beside a steps provider's own id,
  so a reader of `steps.list` follows "any steps provider" without naming one.
- **`declares.provides`** (`PROVIDES`: `steps`, `documents`, `refs`; free words, at most
  `LIMITS.PROVIDES`), `providesOf`; **`declares.agentSessions: { loadsSkills }`**, `loadsSkills`:
  a module that runs agent sessions and loads kehikko-bound skills into them. Both dropped, not
  fatal, when they do not parse.
- **Skill needs by what a module provides**: a need is a module id or one of `{ provides }`,
  `{ subject }` (`mcp.subjects` kind), `{ reacts }` or `{ uses }` (`NEED_KINDS`, `SkillNeed`,
  `CapabilityNeed`, `skillNeedSchema`, `needParts`, `needKey`). `missingNeeds(skill, present)` takes
  the manifests on the kehikko (or ids, as before) and returns the needs nothing meets;
  `meetsNeed`, `needSaid` (a need in a person's words), `neededIds`.
- **A module's server asks for the epic**: `SERVER_METHODS` (and `SERVER_PROJECT_METHODS`) gain
  `epics.list`, `epic.get`, `steps.list`, `parts.get` and `dispositions.get`, each held to the same
  capability as on the page. New methods `parts.get { epic }` → `partsGetResult` (`context.parts`'
  shape, `picked` false) under the new capability `parts:read`, and `dispositions.get {}` →
  `dispositionsGetResult` under `dispositions:read`. `askHost`'s `ServerAnswers` types them.
- `planOfJourney(record)`: a Journeys record as a plan — what a host reads the Journeys fallback
  with, and what Journeys can publish with. Deprecated with `journey.ts`.

### Changed

- `skillNeedsSchema` accepts the object forms beside ids; `ModuleSkill['needs']` is `SkillNeed[]`, and
  `missingNeeds` returns `SkillNeed[]`. Code that treated a need as a string narrows it with
  `typeof need === 'string'` or `neededIds`. **A host before 2.21.0 refuses a manifest whose
  `needs` holds an object**: a module moving to the object forms gives its official-list entry
  `protocol: "2.21.0"`.
- The words: "Claude Code skills" are "agent skills" wherever the protocol describes them;
  `CAPABILITIES['steps:read']` says what the union carries.

### Deprecated

- `journey.ts` (`JOURNEYS_MODULE`, `JOURNEYS_FILE`, `journeyRecordSchema` and the rest),
  `readJourney` and `readJourneys`, as where an epic's STEPS are. A 2.21.0 host reads Journeys' file
  only as the fallback provider while Journeys has no `steps.json`. Removed in 3.0.

## 2.20.0 — 2026-10-24

Traffic: the record of the calls Kehikot and its modules make and receive on this computer, with
their reasons. **Additive**; `PROTOCOL` is still 2. A host that does not know the methods answers
`unknown-method` to a page and refuses a server's question; a module that does not note its calls
is unchanged.

### Added

- Capabilities `traffic:read` (read the record) and `traffic:report` (note this module's own calls);
  methods `traffic.read` (`since`, `limit`, `sample`) and `traffic.note` (`calls`, at most
  `LIMITS.TRAFFIC_NOTE`), with result schemas `trafficReadResult` and `trafficNoteResult`
  (`TRAFFIC_NOTE_OUTCOMES`).
- `traffic.ts`: `trafficNoteSchema`, `trafficCallSchema` (`seq`, `by`, `via`, `side`, `reported`),
  `trafficBudgetSchema`, `trafficConnectionSchema`, `trafficProcessesSchema`; `TRAFFIC_SIDES`,
  `TRAFFIC_VIA`, `TRAFFIC_REPORTERS`, `TRAFFIC_CACHE`, `TRAFFIC_HOST_BY`.
- The sanitizer both sides use: `trafficTarget` (an address to `host` and `path`: no user, password,
  query value or fragment), `trafficPath`, `looksSecret`, `TRAFFIC_REDACTED`; `trafficCommand` (which
  `git`/`gh`/`glab` runs went over the network, and what of their arguments may be recorded).
- `/serve`: `trafficNotes({ module })` — `fetch(reason, …)` noted, `note`, `command`, sent in batches
  through `askHost('traffic.note')`; `TRAFFIC_FLUSH_MS`, `TRAFFIC_PENDING`; `trafficTarget`,
  `trafficPath` and `trafficCommand` re-exported.
- `SERVER_METHODS` gains `traffic.read` and `traffic.note`; `serverAskSchema.project` is optional for
  a question about this computer (`SERVER_PROJECT_METHODS`, `needsProject`), and so is
  `AskHostOptions.project`.
- `LUCIDE_MODULE_ICONS`: `activity`.
- `LIMITS.TRAFFIC_KEPT`, `TRAFFIC_NOTE`, `TRAFFIC_REASON`, `TRAFFIC_KIND`, `TRAFFIC_HOST`,
  `TRAFFIC_PATH`, `TRAFFIC_BY`, `TRAFFIC_CONNECTIONS`.
- docs/traffic.md.

## 2.19.0 — 2026-10-24

A module's server reads the tracker; an epic's parts in one `tracker.get`; an issue's linked
branches. **Additive**; `PROTOCOL` is still 2. A host that does not know them refuses a server's
question, strips `parts` and sends no `branches`.

### Added

- `askHost(method, params, { module, project, env?, timeoutMs?, fetch? })` in `/serve`: a module's
  server asks the host one of `SERVER_METHODS` (`tracker.get`, `tracker.columns`) and gets what its
  page would get, parsed with the method's result schema (`AskedHost`, `ServerAnswers`). Never throws;
  `NO_HOST_TO_ASK` when no host answered. `hostAskUrls`.
- The route: `SERVER_ASK_PATH` (`/host/server-ask`), `serverAskSchema` (`module`, `pass`, `project`,
  `method`, `params`), `serverAskResult` (data, or `reason`, `error` and `refused?` from
  `SERVER_ASK_REFUSALS`: `module`, `pass`, `grant`, `project`).
- The pass: `SERVER_PASS`, `SERVER_PASS_PATH` (`/api/kehikot/server-pass`), `serverPassResult`;
  `mintServerPass`, `spendServerPass`, `serverPassReply` in `/serve`. `doorsFetch` and
  `doorsHandler` answer `SERVER_PASS_PATH` for every module, before `answer` and whatever `ours`
  says, to a program on this machine only.
- `tracker.get`: `parts?: boolean`, with `epic` only — the refs the epic's parts hold as well.
- `trackerRowSchema.branches?` (`trackerBranchSchema`, `TrackerBranch`: `name`, `url?`), at most
  `LIMITS.TRACKER_BRANCHES`.
- `LIMITS.TRACKER_BRANCHES`, `SERVER_PASS_MS`, `SERVER_ASK_MS`.
- docs/server-ask.md.

## 2.18.1 — 2026-10-23

`run` waits for an asynchronous `onStop`. **Additive**; `PROTOCOL` is still 2.

### Fixed

- `run`: on SIGINT or SIGTERM, a promise `onStop` returns is awaited, for at most `stopTimeoutMs`
  (default `STOP_TIMEOUT_MS`, 2500, inside the host's 3 s quit grace), before the process exits 0. Until now the `process.exit` right
  behind it cut it off, so a module whose stop is asynchronous (a browser told to close, which is
  when it writes its cookies) was killed half-way. The server stops answering as soon as stopping
  begins. On a plain exit `onStop` is begun and not waited for, as before.

### Added

- `RunOptions.stopTimeoutMs`, `STOP_TIMEOUT_MS`; `onStop` may return `Promise<void>`;
  `Running.stop()` returns the promise of the stop.

## 2.18.0 — 2026-10-23

A door of a module's own on both servers, and a built page on an opaque origin. **Additive**;
`PROTOCOL` is still 2.

### Added

- `run({ before })`: a function from a `Request` and what the doors work out about it (`BeforeInfo`:
  `asker`, `url`, `ticket`) to a `Response`, or `undefined` to go on. Asked before the doors, the
  page and `dist/`; not for a socket handshake. A throw is a 500.
- `/serve`: `beforeHandler(before)`, the same function as node middleware for Vite's
  `configureServer` (the body is read only if the function reads it, so a request handed on reaches
  the doors whole), and `beforeDoors(before, { name?, setup? })`, the Vite plugin around it.
  `beforeInfo`, `requestOf`; types `Before`, `BeforeInfo`, `BeforePlugin`, `BeforeServerLike`. Also
  re-exported from `/run`.
- `run({ cors })`: for a `storage: false` module, whose page is on an opaque origin and loads its
  module scripts with `Origin: null`. `true` answers `null` and the frame origins
  (`KEHIKOT_ORIGINS`, `ancestors`); `{ origins }` adds more. The files of `dist/` and a preflight for
  one only, echoing the origin, with `Vary: Origin`; the page and the doors keep their gate.
  `corsOrigin`.
- `run`: the `Host` fence. A request whose `Host` is not a loopback name (`127.0.0.1`, `[::1]`,
  `localhost`, `*.localhost`) is a 403 before anything else, as Vite's `server.allowedHosts` refuses
  it in development; `hosts` adds names. `hostFence`, `NOT_HERE`.
- docs/ready-built.md: `before` and `cors`; docs/building-a-module.md: ready-built.

## 2.17.0 — 2026-10-23

A module served ready-built. **Additive**; `PROTOCOL` is still 2. A module that does not use the new
subpaths runs exactly as before.

### Added

- `kehikot-module-protocol/run` (Bun): `run(options)` serves a module's built `dist/` and the same
  doors the dev server mounts (`doorsFetch`), on the port `serves()` would take (`PORT`, else
  `prefer`, then `claim`), on `127.0.0.1` only, and registers the port it bound. `/assets/*`
  immutable, other files `no-cache`, no directory listing, no dot files, nothing outside `dist/`;
  `spa` for a page that routes by its address. `sockets` (`RunSockets`, `RunSocket`): WebSocket
  doors on Bun's own WebSocket, behind `socketFence` (an `Origin` and a `Host` naming this server's
  loopback address). `onStop`, `idleTimeout` (default 0). `fileIn`.
- `kehikot-module-protocol/build`: `buildModule({ dir, page?, outDir?, vite? })` writes the page for
  the build when the module has no `index.html`, runs the module's own `vite build`, and stamps
  `dist/.kehikot-built` with the commit — only after a build that succeeded, from a checkout whose
  tracked files match `HEAD`. `ModuleBuilt`, `ViteLike`.
- Both: `STAMP_FILE`, `readStamp`, `readiness` (`Readiness`); `/build` also `writeStamp`,
  `clearStamp`, `cleanTree`. `run` answers the page and `dist/` with a 503 saying why when the
  stamp is not the commit the process started at: a stale build is never served.
- `/serve`: `claimOrLeave` and `registerBound`, the port and registration steps `serves()` takes,
  now shared with `run`. `serves()` behaves as before.
- docs/ready-built.md.

## 2.16.0 — 2026-10-23

A web address handed to the canvas (issue #51). A module that draws a link which is not a tracker
ref — a design document, a preview, a dashboard, a pipeline log — asks the host to have it shown,
and whichever module shows pages (the Browser) opens it. **Additive**; `PROTOCOL` is still 2. A host
that does not know it does not answer `address.open` and sends `address: null`.

### Added

- Method `address.open({ url, title?, intent?: 'show' })` under the new capability `address:open`,
  answered with `addressOpenResult` (`{ outcome: 'shown' | 'offered' | 'declined', why }`,
  `ADDRESS_OPEN_OUTCOMES`). `shown`: a module that shows pages has it; `offered`: none does, and the
  host asked the person instead; `declined`: the host will not.
- `webAddress`, `addressRefusal`, `isWebAddress`, `LOOPBACK_HOSTS`: an address is absolute `https:`,
  or `http:` to `localhost`, `127.0.0.1` or `[::1]`; never another scheme; no user name or password;
  no whitespace or control character; at most `LIMITS.URL`. Refused, never repaired.
- `contextSchema.address`: `sharedAddressSchema | null`, default `null` — `url`, `title?`,
  `intent` (`ADDRESS_INTENTS`; an unknown word reads `show`), and the host's `by?`, `agent?` and
  `at?` (new on every hand-over).
- `REACTS_TO.address`: a module that shows pages. The one reaction a host reads, to answer
  `shown` or `offered`.
- `addressIsNews(address, actedOn)`, `addressLabel(address)`.
- Client: `HostFields.address` (held steady while it says the same thing) and
  `openAddress(url, { title?, intent? })` on the store and `useHost`, resolving with the host's
  answer, or `null` when nothing frames the page or the host does not answer `address.open`.

## 2.15.0 — 2026-10-23

A module's settings, seen and changed from the host. **Additive**; `PROTOCOL` is still 2. A manifest
without `declares.settings` parses as before, and a host that does not know it asks nothing.

### Added

- `declares.settings` (`settingsDeclarationSchema`, `settingFieldSchema`, `SettingField`): at most
  `LIMITS.SETTINGS` fields `{ key, label, description, type, choices?, default, scope, personOnly }`.
  `SETTING_TYPES` (`boolean`, `string`, `number`, `choice`, `list`), `SETTING_SCOPES` (`project`,
  `machine`), `SETTING_KEY`. A list that does not parse is dropped, not fatal.
- Door methods, what a host asks a module: `DOOR_CAPABILITIES` (`settings`), `DOOR_METHODS`
  (`settings.get`, `settings.set`), `doorMethodParams`, `doorMethodResults`, `settingsGetResult`
  (`values`, `file?`, `problem?`), `settingsSetResult` (`outcome: 'saved' | 'refused'`, `why`,
  `values?`), `SETTINGS_PATH` (`/api/kehikot/settings`), `offersDoorCapability`.
- The person's pass: `SETTINGS_PASS_PATH` (`/host/settings-pass`), `SETTINGS_PASS`,
  `settingsPassResult`, `settingsPassAboutSchema`, `SETTINGS_ASKERS`.
- The one rule: `settingValueIssue`, `settingsSetRefusal`, `settingsValues`, `SETTINGS_SAYS`.
- `/serve`: `settingsDoor` (the door over a module's own store), `hostVouches`, `hostVouchUrls`.
- `LIMITS.SETTINGS`, `SETTING_KEY`, `SETTING_LABEL`, `SETTING_DESCRIPTION`, `SETTING_CHOICES`,
  `SETTING_CHOICE`, `SETTING_TEXT`, `SETTING_LIST`, `SETTINGS_PASS_MS`.
- docs/settings.md.

## 2.14.1 — 2026-10-22

A fix to the module icons. `PROTOCOL` is still 2.

### Fixed

- `LUCIDE_MODULE_ICONS` named `message-square-check`, which is not a Lucide icon (lucide-react 0.544
  has none by that name), so no host could draw `lucide:message-square-check`. It is
  `message-square-code` now. No released module declared the old key; a host draws it, like any
  string that is not a key, as its own neutral icon.

## 2.14.0 — 2026-10-22

A module's icon. A module names the icon it is known by, and a host draws it beside the module's
name wherever it lists the module. **Additive**; `PROTOCOL` is still 2. A manifest without it
parses as before, and so does one whose `icon` is anything else.

### Added

- `MODULE_ICONS` / `ModuleIcon`: the keys a manifest's `icon` may name — `lucide:<name>` for each of
  `LUCIDE_MODULE_ICONS` (Lucide's own names) and `brand:<slug>` for each of `BRAND_MODULE_ICONS`
  (`claude`, `git`, `github`, `gitlab`, `googlechrome`, `latex`, `markdown`; Simple Icons slugs), the
  mark of a third-party tool the module fronts. `MODULE_ICON_SETS`, `ModuleIconSet`.
- `isModuleIcon(value)` and `moduleIconParts(icon)`.
- docs/manifest.md: "A module's icon", with the trademark note: a brand mark identifies the
  integrated tool only.

### Changed

- The manifest's `icon` is a key, never a path or URL. The schema still takes any string up to
  `LIMITS.URL`, so no manifest is refused; a host draws a string that is not a key — including the
  image URL the field was read as before — as its own neutral icon.

## 2.13.0 — 2026-10-22

A place in a change's code, shared on a kehikko. Review points at the line a comment is about,
Source opens the file there and Diff scrolls to the hunk; "Comment on this line" in Source or Diff
points back with `intent: 'comment'`. **Additive**; `PROTOCOL` is still 2. A host or module that
does not know it sends and reads `location: null`.

### Added

- `codeLocationSchema` / `CodeLocation`: `{ change: ref, path: string, line: number, endLine?: number,
  side: 'new' | 'old', commit?: string }`. `path` is repository-relative (`repoPath`: forward
  slashes, no leading slash, no `.`, `..` or empty segment, no backslash, at most `LIMITS.PATH`);
  `line` and `endLine` count from 1 on `side`, `endLine >= line`, at most `LIMITS.CODE_LINE`
  (10 000 000); `commit` is 7–64 lowercase hex (`COMMIT_SHA`). `CODE_SIDES`, `CodeSide`.
- `contextSchema.location`: `sharedLocationSchema | null`, default `null` — the place plus
  `intent: 'show' | 'comment'` (`LOCATION_INTENTS`; an unknown word reads `show`) and the host's own
  `by?` (module id) and `at?` (ISO time, new on every call).
- Method `location.set({ location: CodeLocation | null, intent?: 'show' | 'comment' })` under the new
  capability `location:set`, answered with `locationSetResult`
  (`{ outcome: 'taken' | 'not-selected' | 'declined', why }`, `LOCATION_SET_OUTCOMES`). A host keeps
  one location per kehikko, takes one only while its change is in `context.selection`, and clears
  it when the selection stops including it.
- `REACTS_TO.location`.
- `locationStands(location, selection)`, `samePlace(a, b)`, `locationLabel(location)`.
- Client: `HostFields.location` (held steady while it says the same thing) and
  `locate(location, intent?)` on the store and `useHost`, resolving with the host's answer or `null`.

## 2.12.0 — 2026-10-22

Kehikko-bound skills. A skill a module offers may name the other modules it needs on the same
kehikko. **Additive**; `PROTOCOL` is still 2. A skill without it parses as before.

### Added

- `moduleSkillSchema.needs?: string[]` (`skillNeedsSchema`): module ids that must be on the same
  kehikko for the skill to make sense, each once, at most `LIMITS.SKILL_NEEDS` = 8; the declaring
  module is implied. A skill with any is kehikko-bound: never installed user-wide, loaded only
  into a conversation whose kehikko has every one.
- `isKehikkoBound(skill)` and `missingNeeds(skill, present)`.

## 2.11.0 — 2026-10-22

Work item types. A GitLab row says when an issue is a task, an incident or another work item
type. **Additive**; `PROTOCOL` is still 2. A row without it parses as before.

### Added

- `trackerRowSchema.workItem?: WorkItemType` (`WORK_ITEM_TYPES`: `task`, `incident`,
  `test_case`, `requirement`, `objective`, `key_result`, `epic`, `ticket`): GitLab's
  `Issue.type` (`IssueType`) lower-cased, `ISSUE` left out. `kind` stays `issue`. Absent on a
  plain issue, a change, every GitHub row, a namespace's own configured type, and where the host
  could not read the type (an older GitLab).

## 2.10.0 — 2026-10-21

Faces. A tracker row says who the people it names by login are: their display name and their
picture. **Additive**; `PROTOCOL` is still 2. A row without them parses as before.

### Added

- `trackerRowSchema.people?: Record<login, { name?, avatarUrl? }>` (`trackerPersonSchema`,
  `TrackerPerson`): one map per row, keyed by the logins in `reviewers`, `assigneeLogins`,
  `authorLogin` and `lastActivity`, rather than a field beside each. An entry says at least one
  of the two. At most `LIMITS.ROW_PEOPLE` (64) entries.
- `avatarUrlSchema` and `isHttpsUrl`: an avatar is an absolute `https:` URL of at most
  `LIMITS.URL`; `http:`, `data:`, `javascript:`, protocol-relative and relative URLs are refused.
  A host makes a tracker's relative avatar path absolute against the tracker's host before it
  sends it. Which hosts a module loads pictures from is the module's own policy.

## 2.9.0 — 2026-10-21

All epics. A context can be about the whole project rather than one epic, and a module says whether
it can show one. **Additive**; `PROTOCOL` is still 2. A context or a manifest without them parses
as before.

### Added

- `contextSchema.scope?: 'epic' | 'project'` (`CONTEXT_SCOPES`, `ContextScope`). Absent means
  `epic` (a host older than 2.9.0). With `project` — the person chose "All epics" — `epic` is null
  and `parts` is empty, which is not "no epic open". `scopeOf(context)` reads it with that default.
- `manifestSchema.declares.scopes?: ('epic' | 'project')[]`: which scopes a module can show; absent
  means `['epic']`. `scopesOf(manifest)` and `showsProject(manifest)`. A host covers a module that
  does not list `project` with a sentence while "All epics" is chosen, and still sends it the context.
- `HostFields.scope` in the client (`hostFields`, `hostStore`, `useHost`): `epic` when the host
  does not say.

## 2.8.0 — 2026-10-21

Stacks and last activity. A change's row names the branch it targets and the branch it comes from,
and where it sits in a stack of open changes; any row says what the latest activity on it was, by
whom, and whether that was the person. **Additive**; `PROTOCOL` is still 2. A row without them
parses as before.

### Added

- `trackerRowSchema.baseBranch?` and `headBranch?` (a change's target and source branches;
  `headBranch` absent for a change from a fork). `LIMITS.BRANCH` (255).
- `trackerRowSchema.stack?: { below?: ref, above: ref[] }` (`trackerStackSchema`, `TrackerStack`):
  the open change whose head branch is this one's base, and the open changes based on this one's
  head. At least one is named. Worked out by the host across its reading.
- `trackerRowSchema.lastActivity?: { login, at, kind, mine? }` (`trackerActivitySchema`,
  `TrackerActivity`), `kind` in `LAST_ACTIVITY_KINDS`: `comment`, `review`, `commit`, `state`.
  `mine` is the host's word on whether it was the person; absent when it does not know.

## 2.7.0 — 2026-10-21

People and roles. A tracker row names a change's reviewers, author and assignees by login, says the
person's own roles on it, and carries its discussion counts and last push. **Additive**; `PROTOCOL` is
still 2. A row without them parses as before.

### Added

- `trackerRowSchema.reviewers?: { login, name?, state }[]` (`trackerReviewerSchema`, `TrackerReviewer`),
  `state` in `REVIEWER_STATES`: `requested`, `approved`, `changes`, `commented`.
- `trackerRowSchema.authorLogin?: string | null` and `assigneeLogins?: string[]`.
- `trackerRowSchema.myRoles?` from `MY_ROLES`: `reviewer-asked`, `reviewer-done`, `author`, `assignee`
  (`MyRole`). Filled by the host; each role at most once.
- `trackerRowSchema.discussions?: { resolved, unresolved }` (`trackerDiscussionsSchema`,
  `TrackerDiscussions`) and `lastPushAt?` (ISO 8601).
- `LIMITS.REVIEWERS` (32).

## 2.6.0 — 2026-10-21

Board columns. A tracker row says where its item stands on the project's own kanban board — a GitHub
Project (v2) and its Status, or a GitLab issue board and its lists — and `tracker.columns` lists the
boards. **Additive**; `PROTOCOL` is still 2. A row without a column parses as before.

### Added

- `trackerRowSchema.column?: { name, board, boardUrl? }` (`trackerColumnSchema`, `TrackerColumn`):
  `board` is the board's title, `name` the column. `columns?` lists every board when the item is on
  more than one, `column` first. Absent when the item is on no board or the host could not read boards.
- `tracker.columns` (params `{}`), filed under `trackers:read`, answered with `trackerColumnsResult`:
  `{ boards: Array<{ board, boardUrl?, columns: string[] }> }` (`trackerBoardSchema`, `TrackerBoard`,
  `TrackerColumns`).
- `LIMITS.TRACKER_BOARDS` (16) and `LIMITS.TRACKER_COLUMNS` (64).

## 2.5.0 — 2026-10-20

Skills a module offers. A module can list Claude Code skills in its manifest and serve each one's
SKILL.md; a host shows the text and the person installs it. **Additive**; `PROTOCOL` is still 2. A
manifest without `declares.skills` parses as before.

### Added

- `declares.skills?: Array<{ name, summary, version }>` (`moduleSkillSchema`, `moduleSkillsSchema`,
  `ModuleSkill`): at most `LIMITS.SKILLS` (16), names unique.
- `SKILL_NAME` (kebab-case), `skillNameSchema`, `isSkillName`; `LIMITS.SKILL_NAME` (40),
  `LIMITS.SKILL_VERSION` (64), `LIMITS.SKILL_TEXT` (65 536 bytes).
- `SKILLS_PATH` (`/kehikot/skills/`) and `skillPath(name)` → `/kehikot/skills/<name>.md`.
- `skillTextIssue(text, name)` and `skillTextBytes(text)`: a pure reading of a served SKILL.md.

### Changed

- `dist/` rebuilt: the v2.4.0 commit carried a `dist/` built before its own `door.ts` and
  `serve/host.ts` changes, so the place exports were missing from the built package.
- docs/manifest.md: "Skills a module offers (2.5.0)".

## 2.4.0 — 2026-10-20

A conversation's place. A conversation started from a place in Kehikot (project, epic, picked parts,
kehikko) carries a token on the URL of every Kehikot door it is given, and a door answers from the record
the token names instead of whatever the person switched the screen to since. **Additive**; `PROTOCOL` is
still 2. A door that ignores the token answers as before.

### Added

- `PLACE_PARAM` (`'kehikot-place'`), the query parameter a token travels in; `PLACE_TOKEN`, its spelling.
- `doorPlaceSchema` / `DoorPlace` (`token`, `conversation?`, `projectId`, `project`, `projectName?`,
  `epic`, `parts`, `kehikko`, `looking?`), `lookingSchema`, and `placeResult` (with `why?`) — the host's
  answer at `GET /host/place`.
- `placeIssueSchema` and `placeDoorsSchema`: a module that starts conversations issues a token at
  `POST /host/place` and gets every Kehikot door (name, url with the token on it) back.
- `RECORDED_PLACE_PATH` (`/api/kehikot/place`) and `recordedPlaceResult`: where the host asks the issuing
  module what its record says about a token now.
- `placeDefaults(args, place)` → `{ project, epic, parts, from }`: arguments, then the record, then nothing.
- `DOOR_PLACE_SAYS`: `belongs(place)`, `looking(place)`, `used(from, place)`, `unplaced`, `fellBack`.
- `/serve`: `PLACE_PATH`, `placeTokenOf(query | url | request)`, `hostPlaceUrls`, `hostPlace(token)`,
  `resolveDoorPlace(input)`. All fail closed to null.

### Changed

- docs/asking.md: a section on a conversation's place, with what Claude Code does and does not tell a door.

## 2.3.0 — 2026-10-19

A project that moved is found from the path it had. A project is its id; after a person renames or
moves its folder the host relinks it, but an agent still holds the old path, and a module door that
checked only the disk (or asked the host for a yes or no) said "not a project" with nothing to go on.
**Additive**; `PROTOCOL` is still 2. A 2.2 host's answer still reads, and a 2.2 module ignores the new
fields.

### Added

- `isProjectResult` takes optional `id`, `movedTo`, `missing` and `why`. A malformed optional field
  is dropped, not fatal.
- `hostProject(folder, options?)` (`/serve`) → `{ project: true, path, id? } | { project: false,
  movedTo?, id?, missing?, why? }`; `NO_HOST_ANSWERED` is the `why` when nobody answered.
- `resolveDoorProject(args | folder, options?)` (`/serve`) → `{ ok: true, path, id?, movedFrom? } |
  { ok: false, reason: 'unnamed' | 'not-project' | 'moved', why, movedTo? }`. It follows `movedTo`
  once, and only to `project: true` with the same id.
- `DOOR_PROJECT_SAYS` (front door, and re-exported from `/serve`): `moved(to)` "That folder was moved
  to <to>; use that path.", `notProject(path)` "<path> is not a project open in Kehikot.",
  `unnamed`, and `followed(from, to)`, the line a door adds after following a move.
- Types `HostProject`, `DoorProject`, `HostHasProjectOptions` exported from `/serve`.

### Changed

- `hostHasProject` is a wrapper over `hostProject`: still a boolean, `false` for a former path.
- docs/asking.md (a section on a project that moved: work on the returned path, say the move, key
  server state by the id, page state by `projectKey`), docs/serving.md, docs/project-data.md.

## 2.2.0 — 2026-10-19

The host's own folder in a project is `.kehikot/host/`, not `.kehikot/kehikko/`. A kehikko is one
canvas, and a folder named after one canvas holding the data of every canvas in the project read as
a mistake. **Additive**; `PROTOCOL` is still 2. A host built against 2.1.0 or older keeps writing
`.kehikot/kehikko/` and runs unchanged.

### Added

- `HOST_FOLDER` (`'host'`) and `LEGACY_HOST_FOLDER` (`'kehikko'`, the pre-2.2 name: read as a
  fallback, never written).
- `hostDir(projectPath, { legacy? })` → `<projectPath>/.kehikot/host` (or `.kehikot/kehikko` with
  `legacy`), `null` with no project.
- `hostFile(projectPath, ...segments)` and `legacyHostFile(...)`: a path under either folder. Each
  segment is checked (no slash, not `.` or `..`, at most 128 of `[A-Za-z0-9._-]`); a bad one throws.

### Changed

- `moduleFolder` refuses an id that would derive `host` (`kehikot.host`, `host`), as it refuses
  `project.json`. It still derives `kehikko`, for older hosts.
- docs/project-data.md (a section on the host's folder) and docs/naming.md.

### For a module

A module that reads one of the host's files directly reads `hostFile(p, ...)` first and falls back
to `legacyHostFile(p, ...)` when that is not there.

## 2.1.0 — 2026-10-19

A stable project identity. Projects were known by their absolute path, so renaming a project's
folder made it a stranger to the host and orphaned every module's machine-level state for it. A
project now has a permanent id, kept in `<project>/.kehikot/project.json` and written only by the
host. **Additive and optional**; `PROTOCOL` is still 2. An older host sends no id, and a module
falls back to the path.

### Added

- `PROJECT_ID`: 8–64 lowercase letters, digits and dashes, neither end a dash — a safe file name as
  it stands. A host mints a lowercase random UUID.
- `PROJECT_FILE` (`'project.json'`), `projectFile(projectPath)` → `<projectPath>/.kehikot/project.json`
  or `null`, `projectFileSchema` (`{ id: PROJECT_ID, createdAt: string | null = null }`),
  `readProjectFile` (never throws), `ProjectFile`.
- `projectKey(context)` → `{ by: 'id', key } | { by: 'path', key } | null`: what a module keys
  MACHINE-level state by. Project-level state needs no key.
- `contextSchema.projectId`: `PROJECT_ID | null`, default `null`; `HostFields.projectId` in
  `/client` (`useHost`, the host store).
- `pickedProject.id` (`projects.pick`): optional `PROJECT_ID`.
- `ActivityItem.projectId`: optional `PROJECT_ID`, only beside `project` (refused without it). A host
  that knows the id files the item by it ahead of the path; the client helper judges "the open
  project" by id where both sides have one.
- `PROJECT_FILE_IGNORE`, `ignoresProjectFile`, `withProjectFileIgnored`: `project.json` is gitignored
  always, even where `.kehikot/` is shared, since a clone, copy or worktree carrying it would be the
  same project twice.

### Changed

- The storage rule has one exception: `.kehikot/project.json`, at the top of the folder, written only
  by the host. Every other file a project keeps is a module's, under `.kehikot/<module>/`.
- `KEHIKOT_IGNORE` ends with `PROJECT_FILE_IGNORE` after a blank line. `withKehikotIgnored` appends
  only the missing block, and adds `PROJECT_FILE_IGNORE` under a commented-out `#.kehikot/`;
  `withoutKehikotIgnored` keeps or adds the id's rule whenever it removed the folder's (so the round
  trip gives back the starting file plus that rule). A `.gitignore` that already has `.kehikot/` is
  left as it is by `withKehikotIgnored`.
- `moduleFolder` refuses an id whose folder would be `project.json`.
- `readHoldings` (`/serve`) skips `.kehikot/project.json` when it sweeps the module folders.

## 2.0.0 — 2026-10-19

The breaking release that drops the names from before the app was called Kehikot, and stops
`serves()` taking over another folder's registration. `PROTOCOL` is still 2: no wire message
changed.

### Breaking

- Removed `canonicalModuleId` and `ID_PREFIX_BEFORE_RENAME`: ids are always `kehikot.<name>`.
- `moduleFolder` no longer strips a pre-rename id prefix.
- Removed `registrationBeforeRename`; `registerAt`, `claim` and `neighbourPorts` no longer read
  registration files under pre-rename names.
- `serves()` no longer takes over a registration that names another existing folder: a worktree or
  clone answers, but is not registered. `bun run register` is the deliberate way to point the
  registration there.

### Added

- `takesOver(id, dir, where?)` (`/serve`): `{ ok: true }`, or `{ ok: false, held }` when `id` is
  registered to another folder that still exists.

## 1.8.0 — 2026-10-19

Activity across projects: a module whose things span projects (an agent session keeps running after
the person switches project) can report them all from the page framed now, each filed under its own
project. **Additive and optional**; `PROTOCOL` is still 2.

### Added

- `ActivityItem.project`: the absolute folder of the project an item belongs to, at most
  `LIMITS.ACTIVITY_PROJECT` = 1024. Absent: the project open now.
- `activitySetResult.projects`: `true` from a host that files each item under its `project` and holds
  a tagged list as the module's complete list across projects.
- The client helper sends a module's tagged list as it is only once the host has answered
  `projects: true`. Until then — and always to a 1.7.0 host, which strips the field — it sends the
  open project's items, untagged, and sends that project's share again when another one is opened. A
  module that tags nothing is sent exactly what it said (`test/v1-8.test.ts`).

## 1.7.0 — 2026-10-16

One system for what needs a person: `activity.set` also carries one-off notices, with a priority,
refs and a fold key. **Additive and optional**; `PROTOCOL` is still 2. A 1.6.0 reader parses a list
carrying the new fields and strips them (`test/v1-7.test.ts`, against the 1.6.0 tag).

### Added

- `ActivityItem.priority` (`urgent` | `normal` | `low`, default `normal`), `ActivityItem.refs`
  (tracker refs, at most `LIMITS.ACTIVITY_REFS` = 16), `ActivityItem.group` (at most
  `LIMITS.ACTIVITY_GROUP` = 64); `ACTIVITY_PRIORITIES`, `ActivityPriority`.
- docs/activity.md: "One system", "What a host does with items", "What a module author should report".

### Changed

- `kehikot.notifications@1` is documented as the legacy path for notices: still delivered, mapped by
  the host to an item born closed. The format itself is unchanged.

### Compatibility

- A 1.6.0 host strips `priority`, `refs` and `group` and keeps the item. A 1.7.0 parse of a 1.6.0 list
  is unchanged.

## 1.6.0 — 2026-10-16

One addition: a run may be drawn as a button in the container header. **Additive and optional**;
`PROTOCOL` is still 2. A 1.5.0 reader parses a header declaring `pinned` and strips it
(`test/v1-6.test.ts`, against the 1.5.0 tag): the item stays in the Run menu.

### Added

- **`pinned: true`** on a `run` header item: draw it as an icon button in the header, left of the
  menus, in declaration order; at most `LIMITS.PINNED_MAX` (4); disabled dimmed with its reason, busy
  a spinner, `confirm` arms on first press; may fall back to the menu when narrow.
- `LIMITS.PINNED_MAX` (4), `pinnedRuns(items)`, `HEADER_ICONS` / `HeaderIcon`: the closed icon
  vocabulary a module can count on (`check`, `x`, `chevron-left`, `chevron-right`, `pencil`, `play`,
  `stop`, `refresh`, `undo`, `external`). `icon` itself is unchanged (any string up to 32); unknown
  names draw the label's first letters.
- docs/header.md "Pinned actions": the host's contract.

### Compatibility

- Press, `press_item` and `agents` are unchanged: pinned changes only drawing.
- A 1.5.0 host drops `pinned` and keeps the item in the menu; a 1.6.0 host with a header that does not
  declare it is unchanged.

## 1.5.0 — 2026-10-15

One addition: what a module's things are doing now, so the host can mark it. **Additive and optional**;
`PROTOCOL` is still 2. A 1.4.0 host does not know the method and refuses it (`unknown-method`); a
1.4.0 reader accepts a manifest declaring `activity:report` and a greeting whose `answers` lists
`activity.set` (`test/v1-5.test.ts`, against the 1.4.0 tag).

### Added

- **`activity.set`**, capability **`activity:report`**: `{ items: ActivityItem[] }`, the module's
  COMPLETE current list (replace, never merge; `[]` is "nothing"). `ActivityItem`: `id`, `state`
  (`working` | `attention` | `done`), `label`, optional `place` (the `kehikot.notifications@1` /
  `view.goto` shape), `since`, `detail`. Answered with `activitySetResult` (`taken` | `declined`).
- `LIMITS.ACTIVITY_ITEMS` (64), `ACTIVITY_ID` (128), `ACTIVITY_LABEL` (120), `ACTIVITY_DETAIL` (200).
- `activityItemSchema`, `activityItemsSchema`, `ACTIVITY_STATES`, `worstActivity`, `placeSchema` (the
  notification's `place`, now one definition).
- `connection.activity(items)`, `useHost().activity`, the store's `activity`: drops an identical list,
  replays on every greeting, sends nothing to a host whose `answers` lacks `activity.set`.
- [docs/activity.md](docs/activity.md): the shapes and the host's contract (aggregation, where an item
  maps, "seen", colours and reduced motion, pressing, `read_canvas`).

## 1.4.0 — 2026-10-14

Seven small additions, each from a fault found in verification. **Additive and optional: a module built
on 1.3.0 keeps working on a 1.4.0 host and the reverse**, and `PROTOCOL` is still 2. Every payload a
1.4.0 module sends that a 1.3.0 host does not know is stripped by it, not refused; the tests parse each
against the 1.3.0 build from the tag (`test/v1-4.test.ts`).

### Added

- **`hello.answers`** (`string[]`, at most `LIMITS.ANSWERS` = 64, each at most `LIMITS.METHOD`): the
  methods the host will answer for this module. Absent is an older host: unknown, not none. In the
  client: `useHost().answers` / `hostStore().get().answers` (`readonly string[] | null`) and
  `onHello`'s third argument, `facts` (`HostFacts`).
- **`hello.header`** (`boolean`): whether the host draws the module's header. Absent is an older host.
  In the client: `drawsHeader` (`boolean | null`). The rule for a fallback control is in docs/header.md.
- **`parts.json` `published`**: `{ <epic>: ('documents'|'refs')[] }`, beside `epics`, kept for empty
  epics. `writeHoldings(…, holdings, { published? })` (default: the kinds given a list, both for `{}`);
  `holdingsSpoken(project, epic)` in `/serve`; `HOLDING_KINDS`, `HoldingKind`, `ProjectSpoken`,
  `spokenIn`. `HOLDINGS_VERSION` stays 1. **The file `writeHoldings` writes now always has a
  `published` key.**
- **`hostHasProject(path)`** in `/serve`, with `IS_PROJECT_PATH`, `isProjectResult`,
  `hostIsProjectUrls`, `LIMITS.HOST_ASK_MS` (1500). Fails closed.
- **`place`** on `kehikot.notifications@1`: `{ epic?, parts?: string[], kehikko? }`
  (`LIMITS.PLACE_PARTS` = 16). **`view.goto`** takes `parts` and `kehikko` beside `epic` (refused
  without one).
- **`surface: 'fullscreen'`** on a `run` header item (`RUN_SURFACES`, `RunSurface`).

### Changed (documentation only)

- `CAPABILITIES` was described as "nothing grants one, nothing checks one". Hosts now check every
  grant; corrected in the source and docs/methods.md, which lists the method → capability table.

### Compatibility

- A 1.3.0 reader parses a greeting with `answers` and `header`, a run with `surface`, a notice with
  `place` and a `view.goto` with `parts`/`kehikko` and strips them; a 1.3.0 `readHoldings` reads a
  1.4.0 `parts.json`, and a 1.3.0 `writeHoldings` keeps its `published`.
- A 1.4.0 module on a 1.3.0 host sees `answers: null` and `drawsHeader: null`.

## 1.3.0 — 2026-10-12

A module may say what its MCP door is registered as. **Additive: nothing a 1.2.0 call does has
changed**, and `PROTOCOL` is still 2.

### Added

- **`mcp.as`** in the manifest: the server name an agent host should register the module's door
  under, for a module whose id would derive a misleading one (`kehikot.claude` → `claude`). Optional
  and not defaulted. A lowercase letter, then lowercase letters, digits, `-` and `_`; never `__`,
  never a trailing `_`; at most 40 characters. It goes into `mcp__<server>__<tool>` and onto a
  command line, so it cannot be read as a flag or hold whitespace or a quote.
- **`DOOR_NAME`**, the pattern, and **`LIMITS.DOOR_NAME`** (40).

### Compatibility

- A host built with 1.2.0 or earlier accepts a manifest that declares `as`: the `mcp` object strips
  a key it does not know, so the module is framed and its door is named as before. Checked against
  the 1.2.0 build.
- A manifest whose `as` is out of shape is refused whole by a 1.3.0 host, like any field out of
  shape. A 1.2.0 host does not look.
- The name is a request. A host decides what to do when two modules ask for one name.

## 1.2.0 — 2026-10-12

Parts belong to the epic and name no module. **Additive: nothing a 1.1.0 or 1.0.0 call does has
changed**, and `PROTOCOL` is still 2. Every consumer's own tests and typecheck were run against
1.1.1 and against this build. Design, the contract and a worked module:
[docs/parts.md](docs/parts.md). Before → after for the deprecations: [MIGRATING.md](MIGRATING.md).

A host does two things in the change that moves it here: list `parts.set` beside the methods it
answers (its own start-up guard asks), and send a module built before 1.2.0 no more than 32 parts
(`partsFor`).

### Added: what a module holds for a part

- **`parts.json`**, one per module per project, `<project>/.kehikot/<module>/parts.json`:
  `{ version, epics: { <epic>: { <part id>: { documents, refs } } } }`. `HOLDINGS_FILE`,
  `HOLDINGS_VERSION`, `PartHoldings`, `EpicHoldings`, `ProjectHoldings`.
- `/serve`: **`writeHoldings(projectPath, moduleId, epic, holdings)`** — one module, one epic;
  atomic; every other epic and unknown key kept; synchronous from read to rename — and
  **`readHoldings(projectPath)`**, which asks every folder under `.kehikot/` and unions what they
  say, naming no module, tolerant of junk and bounded. `HoldingsWritten`.
- `LIMITS.HOLDINGS_EPICS`, `HOLDINGS_BYTES`, `HOLDINGS_MODULES`.

### Added: documents, the module-agnostic successor of `files`

- **`documents`** on a part (`partSchema`): project-relative paths, whichever module keeps them.
  Optional and not defaulted, like `files`.
- **`documentOf(path, projectPath?)`**, the one normalisation; `partDocument`, `isPartDocument`,
  `pickedDocuments`. `LIMITS.PART_DOCUMENTS` (64), `LIMITS.PART_DOCUMENT` (512).
- `fileInFocus`, `partsOfFile`, `anchorInFocus` take an optional **`projectPath`**; `narrowToFocus`
  takes it in `options`; `useFocus` reads `context.projectPath`. A `{ file }` anchor matches a
  picked part's `documents`, and, exactly as before, its `files`.

### Added: the whole-epic anchor

- **`{ whole: true }`** in `Anchor`: the item is about the epic itself or the whole of its paper,
  so it belongs to every part and is in front under any pick. Not the absence of an anchor, which
  is still hidden under a pick.

### Added: the epic's own list, and asking for an edit of it

- **`listedPartSchema`** (`{ id, name }`), **`partListSchema`**, `ListedPart`: the list a host
  keeps in the epic's file.
- **`partIdFor(name, taken)`**: the id a new part is given, once; a rename never changes it.
- The method **`parts.set`** under the capability `parts:set`: `{ epic, add: { name, after? } }`,
  `{ epic, rename: { id, name } }`, `{ epic, move: { id, after? } }`, `{ epic, remove: { id } }`,
  answered with **`partsSetResult`** (`PARTS_SET_OUTCOMES`: `changed`, `unchanged`, `declined`,
  `no-such-part`; `parts`, `id`, `why`). A host without it answers `unknown-method`.
- **`partsFor(parts, builtWith)`** and `PARTS_BEFORE_1_2`: what a host sends a module whose schema
  stops at 32 parts.

### Added: one sentence for an empty view

- **`emptySaid(parts, noun)`**: `No note is in the picked part.` / `…parts.`, `''` when nothing is
  picked. `useFocus().narrow(...)` also returns it as **`empty`**: the sentence when the pick left
  nothing of a list that had something, `''` otherwise.

### Changed: `LIMITS.PARTS` 32 → 128

A part may be one step of a journey, and journeys of more than thirty-two steps exist. `partsSchema`,
`partListSchema`, `partIdsOf` and `partsOf` follow the number. The one thing that does not is a
module already built: see `partsFor`.

### Changed: `kehikot-check-parts` knows the contract

Still fails only on the manifest. New notes, never failures (`contractNotes`): a module that
follows parts without `useFocus().narrow` or `narrowToFocus`, or with no `keep`, or that imports
what this release deprecated; a `partless` whose reason the contract no longer accepts. A module
narrowing with `fileInFocus` alone used to get no note and now gets the first.

### Deprecated (marked `@deprecated`; all unchanged)

- `focusSentence`, `FOCUS_WHERE`, and `narrow(...).sentence`: the standing count line.
  `docs/parts.md` and `docs/wire.md` no longer require it.
- `partSchema.files`, `pickedFiles`, `paperFileOf`, `PAPER_MODULE`.
- `partsOf`, `partIdsOf`, `JourneyPart`; `JOURNEYS_MODULE` and `readJourneys` as where an epic's
  parts are. Steps are still read through them.

## 1.1.1 — 2026-10-12

What a door requires of a request, stated in one place and held to. No new message, no new
manifest field, and `PROTOCOL` is still 2. A module takes it by taking the version; what its own
tests and scripts may have to change is under *What a module checks*.

Design: [docs/module-plumbing.md](docs/module-plumbing.md) (the doors, the body reader),
[docs/client.md](docs/client.md) (the greeting), [docs/serving.md](docs/serving.md) (`serves()`).

### Changed: a door answers its own page and a program on this computer

- `doors()`, `doorsHandler` and `doorsFetch` decide where a request came from before anything is
  read or routed — from `Origin`, and from `Sec-Fetch-Site` where there is none — and answer the
  manifest, the page and every door (`/healthz`, `/mcp`, `/api/*`, or `ours`) only to the module's
  own page, a program, and a person asking directly. Anything else is **403**
  `{ ok: false, error }` (`ELSEWHERE_REFUSAL`); `answer` and `stream` are not asked.
- The page (`/app`, `/`, `pages`) is still opened as a document from another origin: a host frames
  it there, and `frame-ancestors` still says who may.
- `openHealth` is unchanged in what it is for: a GET of `/healthz` is answered wherever it came
  from, and nothing else is.
- New in `/serve`: **`asker(headers, host?)`**, **`admits(who, document?)`**, `Asker`,
  `HeaderSource`, `ELSEWHERE_REFUSAL`, for a module that serves a door outside `doors()`.

### Changed: a body has to say it is JSON

- `readJsonBody` and `readJsonRequest` — and so every door — refuse a body that arrives with a
  `content-type` other than `application/json`, or with none: **415** `{ ok: false, error }`
  (`BODY_NOT_JSON`). A request with no body needs no content type. `BodyRead` gains the 415
  refusal beside the 413; `BodySource` gains an optional `headers`.
- New in `/serve`: **`saysJson(type)`**, `BODY_NOT_JSON`.
- `ask()`, `listTools()`, a host's own calls and an MCP client already send `application/json`.

### Changed: `serves()` turns the dev server's cross-origin sharing off

- `serves()` returns `server.cors: false` beside the port. A module whose own config sets
  `server.cors` keeps what it wrote.

### Changed: a page answers a greeting only from where it may be framed

- `doors()` prints the origins that may frame the page — the list it sends as `frame-ancestors` —
  into the document (`<script id="origins">`, **`ORIGINS_ELEMENT`**), for a `pageDocument` page
  and for a module's own document alike. `pageDocument` and `fillPage` take `origins`.
- `connect` answers a `kehikot.hello` whose `origin` is on that list, is the page's own, or is
  absent (an event the page made itself), and from the page's own window; any other greeting is
  dropped. A document with no island answers as before. **`mayGreet`**, **`pageOrigins`**,
  `ConnectOptions.origins`, and **`originAmong(origin, sources)`** on the front door.

### What a module checks

- **Tests and scripts that send a body** through `doorsHandler` / `doorsFetch`, or to a running
  module with `fetch` or `curl`, say `content-type: application/json` (`curl --json`). A `Request`
  built with a string body and no headers says `text/plain`, and is now refused with 415.
- **A page on an opaque origin** (a manifest without `storage`) reaches its own server at
  `/healthz` with `openHealth`, and at no other door.
- **A module that serves its page without `doors()`** passes `origins: frameOrigins()` to
  `pageDocument` or `fillPage`, or `origins` to `connect`.
- Nothing changes for a host: what it asks of a module, it asks from its server.

## 1.1.0 — 2026-10-12

Three additions in one release, and nothing else. **Additive: nothing a 1.0.0 call does has
changed**, and `PROTOCOL` is still 2. Every consumer's own tests and typecheck were run against
1.0.0 and against this build.

### Added: a module's door can say what it can be asked ([#28](https://github.com/Jalez/kehikko-protocol/issues/28))

Design and worked examples (Slides' "show slide 6", Learning's "is question X answered"):
[docs/asking.md](docs/asking.md).

- The manifest's **`mcp.subjects`**: per kind of thing, the tool that shows one (`show`), lets go
  (`release`) and answers "is it done?" (`done`). `ModuleSubject`. Empty by default.
- The two answers a caller reads as a state, not a sentence: **`showAnswerSchema`**
  (`SHOW_OUTCOMES`: `shown`, `unseen`, `declined`; `pages`) and **`doneAnswerSchema`**
  (`DONE_STATES`: `done`, `waiting`, `unavailable`, `unknown`; `doneAnswer(items)`), with
  `SHOW_OUTPUT_SCHEMA` and `DONE_OUTPUT_SCHEMA` for a tool's `outputSchema`.
- One spelling for the context arguments, **`project`** and **`epic`** (`DOOR_ARGUMENTS`), and
  `doorContext(args)`, which still reads `projectPath` (`DOOR_ARGUMENTS_BEFORE`).
- Read-only in MCP's own form: `doorToolSchema` and **`toolEffect(tool)`** (`reads`, `writes`,
  `destroys`, `unstated`).
- **`kehikot-check-door`** (`bun run check:door`): hints from a module's files; with `--running`,
  holds the started door to its manifest. The work is in `src/check/door.ts`.
- `/serve`: **`readNeighbour(id)`**, `readNeighbours()`, `doorOf`, `listTools(door)` — another
  module's manifest and door, from the registry and the module's own well-known path.

### Added: the header ([kehikko#62](https://github.com/Jalez/kehikko/issues/62), step 1)

Design, limits and the Paper example: [docs/header.md](docs/header.md).

- **`kehikot.header`** (module → host: `items`, whole), **`kehikot.press`** (host → module) and
  **`kehikot.pressed`** (module → host): `headerSchema`, `headerItemSchema`, `headerItemsSchema`,
  `headerOptionSchema`, `pressSchema`, `pressedSchema`, `pressValueSchema`; `HEADER_KINDS`,
  `HEADER_MENUS`, `HEADER_MENU_NAMES`, `RUN_RESULT_STATES`; `pressRefusal(items, press)`.
- The client: `Connection.header(items)`, replayed on every greeting; `HostEvents.onPress`,
  answered exactly once (`PRESS_BACKSTOP_MS`, `PressAnswer`); the same on `hostStore` and
  `useHost`.
- `LIMITS.HEADER_*`.
- The template: `src/components/header-menus.tsx`, the copy an unhosted page draws; one declared
  toggle as the example.

### Added: folding ([kehikko#61](https://github.com/Jalez/kehikko/issues/61), the module half)

- The method **`view.fold`** under the capability `view:fold`, answered with `foldResult`
  (`FOLD_OUTCOMES`). A host without it answers `unknown-method`.
- `containerSchema.folded`: whether a container is folded to its header. Optional; absent from a
  host that does not say.

### Added: a kehikko's stable `key`

Which ids last, and the table: [docs/ids.md](docs/ids.md#which-ids-are-stable-and-which-are-only-good-for-now).

- **`context.kehikko.key`** and **`event.kehikko.key`** (one shape, `{ id, name, key? }`), and so
  `host.kehikko.key` from `hostStore` and `useHost`: the key the host already keeps per kehikko in
  the project's `.kehikot/kehikko/kehikot.json`. It survives a rename, a reorder, the project being
  removed and added again, and another machine. Unique within a project.
- **`KEHIKKO_KEY`**: its spelling, the host's own — two to 32 characters of lowercase letters,
  digits and dashes, neither end a dash.
- `id` is unchanged and is now said plainly to be a row number: good for near-or-far inside one
  running page, and not something to store. It went 2 → 9 → 28 for one kehikko across two re-adds.
- Optional and not defaulted. A host that does not send it and a module that does not read it are
  exactly as they were; a parsed kehikko without one has no `key` property at all.
- Nothing else names a kehikko: `containers` rows, `goto`, the methods, `moduleDir` and `held()`
  scopes carry module ids, refs, slugs and paths, never a kehikko's number.

### Changed in the template only

- Its example tool takes `project` (and still reads `projectPath`), and says
  `annotations: { readOnlyHint: true }`.

### Not changed, and why

- `kehikot.clearable` and `kehikot.refreshable` stay and are not deprecated: folding them into Run
  items is the proposal's last step, and a breaking one.
- A host built on 1.0.0 reports a `kehikot.header` as a message it could not read. That is the
  host's to change (docs/header.md, "A message type the other side does not know"), and it is why
  the host moves to 1.1.0 before any module declares a header.

- The host refuses to start against a protocol that names a method it does not answer (the guard
  in its `src/host/division.ts`), so the host's move to 1.1.0 lists `view.fold` in the same
  change. With that one line its suite is as it was (1283 passing).

## 1.0.0 — 2026-10-10

Removes what 0.37.0 deprecated, makes the parts declaration a refusal, and changes four answers
that could not change without breaking a 0.36.0 call. **[MIGRATING.md](MIGRATING.md) has the
before and after for every line here.** `PROTOCOL` is still 2: no `kehikot.` message changed
meaning, so a module and a host can move in either order.

### Removed

- `connect()` answers `kehikot.` only. `LEGACY_WELL_KNOWN`, `LEGACY_MANIFEST_KIND`, `LEGACY_MESSAGE_PREFIX`,
  `MESSAGE_PREFIXES`, `legacyManifest`, `Dialect`, `DIALECTS`, `toDialect`, `canonicalMessage`,
  `dialectOfType`, `dialectOfKind`, `nameIn`, `legacyName`, `legacyModuleId`, `canonicalName`,
  `canonicalExtension`. No schema respells an id or an extension name.
- `useKehikot`, `Kehikot`, `UseKehikotOptions` (`/client/react`). `useHost` is the hook.
- `legacyRegistryDir`.
- The bin names `kehikko-create` and `kehikko-check-parts`; they are `kehikot-create` and
  `kehikot-check-parts`.

### Changed

- **`manifestSchema` refuses a manifest that says neither `reacts: ['parts']` nor `partless`**
  (or both), with the sentence saying what to add. It is a refined schema now and has no `.shape`.
- **`ask()`**: an aborted ask is `kind: 'cancelled'` (`AskFailure` gains the member; `CANCELLED`);
  a 2xx with a body that is not JSON is a refusal (`NOT_A_REPLY`) instead of `ok: true, body: null`;
  a stale failure's `error` is `PAGE_OLD` instead of the sentence that promised a reload.
- **`CoverState`** gains `refused` and `empty`; `Cover` draws its button for `refused` too, and a
  stale cover that could not reload stops saying it is reloading.

### Added, each in place of code a module wrote by hand

- `Cover`'s `strip` (terminal's one-line strip); `useHost` / `hostStore`'s `same`, with
  `Steadiness` and `SteadyField` (paper's own rule for "the same passage"); `watchServer` and
  `WATCH_SERVER_MS` (references' and atlas's `vite:ws:disconnect` listener).
- `doors({ ancestors })` and `frameOrigins(env, also)` / `frameAncestors(env, also)` (references
  writing `process.env.KEHIKOT_ORIGINS`); `doors({ openHealth: true })` (atlas's CORS headers on
  `/healthz`); an empty reply header value sends no such header (paper's `cache-control: private`).

### Not changed, and why

- `follow` still probes nothing by default: turning `probe` on makes every test that follows a
  fake stream ask `/healthz` through a `fetch` it did not fake.
- Exports no consumer imports today but which are the contract itself (a schema per message, the
  result types, the tracker shapes) stay: a module may hand-roll its wire against them.

### Tests

- The suite's preload points the module registry at a scratch directory and fails any test that
  leaves it resolving anywhere else (added in 0.37.0's branch; here it names the one variable left).

## 0.37.0 — 2026-10-10

The deprecation release before the next breaking one. **Additive: nothing is removed and nothing
a 0.36.0 call does has changed.** Everything the next breaking release removes is marked
`@deprecated` in source with what replaces it, and listed here. `PROTOCOL` is still 2.

### Deprecated in 0.37, removed in the next breaking release

| deprecated | use instead |
|---|---|
| `useKehikot`, `Kehikot`, `UseKehikotOptions` (`/client/react`) | `useHost`, `Host`, `UseHostOptions` — or `hostStore` outside React |
| `canonicalName`, `canonicalExtension` | compare an extension name as written |
| `legacyRegistryDir` (`/serve`) | nothing |
| the bins `kehikko-create`, `kehikko-check-parts` | `kehikot-create`, `kehikot-check-parts` (both names work in 0.37) |

Still a warning in 0.37, a refusal in the next breaking release: a manifest that neither says
`reacts: ['parts']` nor gives `partless` a sentence (`partsDeclaration`).

Calls that will answer differently in the next breaking release, listed so a module can find its
call sites now ([docs/module-plumbing.md](docs/module-plumbing.md), "For the next breaking release"):
an aborted `ask` becomes a kind of its own instead of `refused`; a 2xx that is not JSON stops
resolving `ok: true, body: null`; a stale `ask`'s `error` stops saying "reloading…"; `CoverState`
gains members.

### Said at runtime, once, in development only

One path says so on `console.warn` the first time it is exercised — never per message, and
never when `NODE_ENV` is `production` or `test`, so no suite reads differently:

- `useKehikot` being called.

### Added

- The bins under the package's own spelling, `kehikot-create` and `kehikot-check-parts`, beside the
  old names.

### Tests

- No test can reach the real module registry. The preload (`test/setup.ts`) points the registry at
  a scratch directory for the whole suite, under every variable the code reads, and fails any test
  that leaves it resolving anywhere else. Before this, each test set the variable itself.

### Internal (carried from Unreleased; nothing a consumer can observe)

- `wire.ts` split into `passage.ts`, `filters.ts`, `context.ts` and `messages.ts` (and still
  re-exports all of them); `LIMITS` moved to `limits.ts`; schema fragments that were written more
  than once are named once in `fragments.ts`.
- Source comments trimmed to one to three lines per field; the reasoning moved to [`docs/`](docs/README.md),
  and the README cut down to what a module author needs.
- `dist/` no longer carries `.map` files. CI builds, checks that the committed `dist/` matches the
  source, typechecks and runs the tests.

## 0.36.0 — 2026-10-09

The gaps fourteen modules found adopting the shared plumbing. All additive: every option is off
unless named, and a call written for 0.35.0 does what it did, with the four exceptions listed last.
`PROTOCOL` is still 2. See [docs/module-plumbing.md](docs/module-plumbing.md).

- `/client`: `held(name, read?)` — what a page holds across a reload of itself, written as it
  changes to `sessionStorage`, keyed by scope and target, every access in a `try`; `heldDraft`,
  `Draft`. It replaces the `store/held.ts` four modules each wrote, and `any()` is the answer to
  "is something typed and not sent?".
- `/client`: `ask` takes `ticket: true` (the ticket on a GET), `keepalive: true` (a save from
  `pagehide`; dropped past `KEEPALIVE_BYTES`), and a list in `query` for a key that repeats.
  `replied(asked)` for a door whose "no" is an answer of its own shape; `probeServer()` for a page
  that asks nothing on a timer; `PAGE_OLD`, `NOT_A_REPLY`.
- `/client`: `follow` takes `events` (named events, handed over with their name) and `probe` (ask
  the server whenever the stream drops, so a refused stream and a stopped server can be told apart).
- `/client`: `hostStore` — everything `useHost` arranges, outside React. `useHost` is now a thin
  binding over it. Both gain `kehikko`; `useHost` gains `read()`, the standing ahead of the render.
- `/client/react`: `coverFor` takes `needs.host`, honours `project: false` beside `epic: true`, and
  given the `server`'s standing answers `stale` and `down` too.
- `/serve`: `doorsFetch` — the same doors from a `Request` to a `Response`, for `Bun.serve` and for
  tests; `fillPage` — the ticket and the build put into a page built ahead of its server;
  `readJsonRequest`.
- Documented rather than built: the host's half of an exact first paint (`?theme=`), that Vite's
  own client reloads a page before any hook can run, `mailbox.forget` for a test suite, that a
  refusal's sentence is `error`, and what is left for the next breaking release.

What a module that changes nothing will see differently:

- Every answer from `doors()` carries `cache-control: no-store` (the page and streams already
  did), unless the reply names its own. A reply's header names are sent in lower case.
- A stream door's socket is set to no-delay, its response carries `x-module-build`, and `close()`
  is called once when the reader's going is reported as an `error`.
- `passage`, `chosen`, `parts`, `containers` and `selection` from `useHost` keep their identity
  while they are deeply equal, so an effect that depends on one runs when it changed rather than on
  every context.
- `project`, `projectPath` and `epic` from `useHost` are `null` for a string that is only spaces.

## 0.35.0 — 2026-10-09

The plumbing every module typed out for itself, once. All additive; `PROTOCOL` is still 2 and
`useKehikot` is untouched. See [docs/module-plumbing.md](docs/module-plumbing.md).

- `/serve`: `pageDocument` (the page, with a themed background painted before any script runs),
  `mintTicket`, `sameTicket` (constant-time), `ticketOf`, `refuseTicket`, `readJsonBody` (bounded;
  too large is a 413), and the `doors()` Vite plugin / `doorsHandler` — both well-known manifest
  paths, the page with `no-store` and `frame-ancestors`, `answer` for `/healthz`, `/mcp` and
  `/api/*`, and server-sent-event doors through `stream`.
- `/client`: `ticket`, `ask` (every failure one typed result: `down`, `stale`, `refused`),
  `answered`/`AskFailed`, `serverStanding`, `follow` (SSE with reconnect and `detached`),
  `reloadWhenStale`, `pageBuild`, `applyTheme`.
- `/client/react`: `useHost` (the fuller listener: `where`, the flattened context, the theme on
  `<html>`, typed kept state with `remember`, `point`, a stable `request`, and `onClear` /
  `onRefresh` that actually arrive), `Cover` with `coverFor` and `COVER_WORDS` (one screen for
  waiting, unhosted, no project, no epic, loading, own server down, stale), `useServerStanding`.
- Build identity: `buildSchema`, `establishBuild`, `compareBuilds`, `buildIsStale`, `buildStamp`,
  `PACKAGE_VERSION`; an optional `build` on the manifest and on `kehikot.ready`; `x-module-build`
  on every answer from `doors()`. A page that finds its server is another process reloads itself,
  once.
- The front door gains the names both halves share: `TICKET_HEADER`, `TICKET_ELEMENT`,
  `ROOT_ELEMENT`, `THEME_KEY`, `THEME_PARAM`, `PAGE_BACKGROUND`, `BUILD_HEADER`, `BUILD_ELEMENT`.
- `template/` is built on all of it: its `vite.config.ts` went from 120 lines to 34,
  and `page/document.ts` is gone.

## 0.34.1 — 2026-10-09

`focusSentence` takes an optional fourth argument, `{ total }`: with it the sentence says how many
of how many — `2 of 3 references are outside the picked part (The seam).` — for a module that marks
what is outside instead of removing it, where the reader can see the total and would miss it.
`useFocus().narrow` takes `total: true` and passes the length of the list. Without the option the
sentence is what it was, byte for byte.

## 0.34.0 — 2026-10-09

Every module's data is part-specific, by one rule. `Anchor` (`{ file } | { ref } | { part }`),
`anchorInFocus`, `narrowToFocus`, `focusSentence`, `FOCUS_WHERE`, `sameParts`; the manifest's
`partless` and `partsDeclaration`; `useFocus` in `/client/react`; the `kehikko-check-parts` bin.
Followed the same day by a fix: `narrowToFocus` takes an options object, and the import scan in
the parts check is a note rather than a failure.

## 0.33.0 — 2026-10-09

A citation is written and found one way. `parseSource`, `serialiseSource`, `uncitable`,
`CITE_MARKER`, `markersIn`, `replaceMarkers`, `normaliseQuote`, `findQuote`, `resolveSource`,
`CITE_STATUSES`, `linesOf`.

## 0.32.0 — 2026-10-07

A part may own files of the epic's paper. `files` on a journey group, on `JourneyPart` and on the
wire's `partSchema`; `partFile`, `isPartFile`, `paperFileOf`, `fileInFocus`, `pickedFiles`,
`partsOfFile`, `PAPER_MODULE`; `LIMITS.PART_FILES` (32) and `LIMITS.PART_FILE` (256).

## 0.31.0 — 2026-10-07

The parts of an epic are derived here, once. `slugFrom`, `partsOf`, `partIdsOf`, `JourneyPart`.

## 0.30.0 — 2026-10-07

An epic's steps and groups as a project keeps them on disk. `journeyStepSchema`,
`journeyGroupSchema`, `stepsFromSchema`, `journeyRecordSchema`, `journeysDocumentSchema`,
`journeyIn`, `journeySlugs`, `stepsOf`, `stepPart`; `readJourneys` and `readJourney` in `/serve`.

## 0.29.0 — 2026-10-07

Parts: the open epic's parts, and which are picked out. `context.parts`, `partSchema`,
`partsSchema`, `PART_ID`, `pickedParts`, `isFocused`, `refInFocus`, `partInFocus`, `focusCount`;
`LIMITS.PARTS` (32) and `LIMITS.PART_REFS` (256).

## 0.28.0 — 2026-10-07

Tags: a module says which categories it belongs under. The manifest's `tags` (up to five), and the
suggested, unenforced vocabulary `TAGS`.

## 0.27.0 — 2026-10-06

Content: a container is told when what it shows changed. `context.content`, the `content`
reaction, the method `content.changed` under the capability `content:report`, `contentStamp`.

## 0.26.0 — 2026-10-05

`dataVersion` on the manifest: the format a module's project data is in, a positive integer,
absent meaning 1, bounded by `LIMITS.DATA_VERSION`.

## 0.25.0 — 2026-10-05

Every name on the wire says `kehikot.` — message types, `MANIFEST_KIND`, `WELL_KNOWN`, extension
names, module ids.

## Before 0.25.0

0.24.0 (2026-10-05) added the shared tracker reading; 0.23.0 (2026-10-05)
toggles filter groups, the shared ref facets and dispositions; 0.22.0 (2026-10-01) the module
template and `create`. Earlier history is in `git log`.
