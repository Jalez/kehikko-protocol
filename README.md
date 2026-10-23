# kehikot-module-protocol

The contract between a Kehikot host and a module it frames.

A host application frames small programs somebody runs on their own machine.
Each program serves a manifest describing itself, a page the host embeds in a
frame, and its own MCP server. This package is the set of shapes both sides
agree on — the manifest, the eight messages that cross the frame, the extension
payloads — and nothing else.

```
npm install kehikot-module-protocol zod
```

`zod` is a peer dependency on purpose. Schemas from two copies of zod do not
interoperate, and this package exists so that two programs hold the *same*
schema.

## The rule

**This package contains shapes, never decisions.** Types, schemas, constants,
and pure functions over them. No filesystem, no network, no state, no
dispatch, no defaults that stand in for a policy.

The reason is not tidiness.

A host validates everything it receives with its own copy of these schemas.
Anything shipped in a package is code a module also runs, and a check that lives
only here is one somebody can run a patched copy of — a module author who wants
past a bound need only publish their own build with the bound removed, or edit
the copy in their `node_modules`, and nothing about the fact that the check
"came from the protocol package" survives that. A check is only a check where it
runs on the deciding side, over material the checked party cannot reach.

So: **the kit makes honest programs easy; it never makes the host's decision.**
Everything here is a way for a module author to get the shape right the first
time and for a host author to write the same shape without guessing. When a
host imports `manifestSchema`, it is importing a convenience, and it stays
responsible for having run it.

Concretely, the things this package deliberately does not do:

- It does not fetch a manifest, resolve a URL, or decide that an address is one
  worth talking to. `entry`, `icon`, `health` and `mcp.url` are bounded strings
  here; whether a module may point them where it pointed them depends on the
  origin the manifest arrived from, which this package never sees.
- It does not dispatch a method or shape a response. `methodParams` says what a
  caller must construct; what comes back is `unknown`, because no host promised
  otherwise.
- It does not route an extension payload, name its sender, or record anything.
  `schemaFor` hands back a schema. Delivering is a decision.
- It does not clamp anything on anybody's behalf. `clampHeight` is the host's
  arithmetic restated so a module can predict the answer; the host runs its own
  copy over the raw value it was handed.
- It contains no notion of an approval, a grant, a permission, or a consent
  handshake, and it never will. See
  [No consent, and what that changes](docs/methods.md#no-consent-and-what-that-changes).

## What is in it

| | |
|---|---|
| `manifestSchema`, `Manifest` | What a module says about itself, served at `WELL_KNOWN`. Every string bounded. |
| `speaks(range, protocol)` | Whether a protocol range includes a number. A reading, not a decision. |
| `helloSchema` … `wentSchema` | The messages, and `hostMessageSchema` / `moduleMessageSchema` to parse a direction at a time. |
| `notificationPayload`, `callPayload`, `EXTENSIONS` | The versioned formats modules send each other through a host. |
| `PROTOCOL`, `WELL_KNOWN`, `MANIFEST_KIND`, `MESSAGE`, `LIMITS` | One spelling and one number each, so two packages cannot disagree. |
| `METHODS`, `methodParams`, `CAPABILITIES` | The questions a module can ask, by name and by shape. |
| `methodResults`, `resultSchemaFor` | The answers that are outcomes rather than material, and so have a shape. |
| `navigationResult`, `projectPickResult`, `epicsListResult`, `epicSpine` | Those answers. |
| `MODULE_ID`, `MODE_ID`, `EPIC_SLUG`, `KEHIKKO_KEY`, `own` | The name patterns, and one lookup that does not fall through a prototype. `KEHIKKO_KEY` (1.1.0) is the spelling of `context.kehikko.key`, the identity of a canvas that is safe to store; its `id` is not ([docs/ids.md](docs/ids.md)). |
| `KEHIKOT_DIR`, `moduleFolder`, `moduleDir`, `moduleFile`, `within` | Where a module keeps this project's data, given `context.projectPath`. |
| `KEHIKOT_IGNORE`, `ignoresKehikot`, `withKehikotIgnored` | The lines that project's `.gitignore` gains, added once. |
| `PROJECT_ID`, `PROJECT_FILE`, `projectFile`, `projectFileSchema`, `readProjectFile`, `projectKey` | A project's permanent id (2.1.0), in `.kehikot/project.json`, written only by the host; `projectKey` is what a module keys machine-level state by — the id, else the path. |
| `HOST_FOLDER`, `LEGACY_HOST_FOLDER`, `hostDir`, `hostFile`, `legacyHostFile` | The host's own folder in a project (2.2.0): `.kehikot/host/`, `.kehikot/kehikko/` before; the old one is read as a fallback, never written. |
| `PROJECT_FILE_IGNORE`, `ignoresProjectFile`, `withProjectFileIgnored` | The rule that keeps `project.json` out of git always, even where `.kehikot/` is shared. |
| `partSchema`, `EpicPart`, `PART_ID`, `pickedParts`, `isFocused`, `refInFocus`, `partInFocus`, `focusCount` | The parts of the open epic in `context.parts`, and whether a thing is in the ones a person picked out. A part belongs to the epic and names no module ([docs/parts.md](docs/parts.md)). |
| `Anchor`, `anchorInFocus`, `narrowToFocus`, `emptySaid`, `sameParts`, `partsDeclaration` | One rule: what ties an item of a module's data to a part — a part's id, a document, a ref, or `{ whole: true }` for an item about the whole epic (1.2.0) — the one answer to "is it in front of the person", the list narrowed, the one sentence for a view the pick left empty (1.2.0), and what a manifest says about all of it. |
| `documents` on a part, `partDocument`, `isPartDocument`, `documentOf`, `fileInFocus`, `partsOfFile`, `pickedDocuments` | The documents a part has (1.2.0): project-relative, whichever module keeps them, and the one normalisation between the path a module holds and the name a part lists. |
| `listedPartSchema`, `partListSchema`, `ListedPart`, `partIdFor`, `partsFor`, `PARTS_BEFORE_1_2`, `partsSetResult`, `PARTS_SET_OUTCOMES` | The epic's own list of parts (1.2.0), `{ id, name }` in order, which a host keeps; the one derivation of a new part's id; `parts.set`, a module asking the host for an edit, and its answer; and the list a host sends a module built before it could be 128 long. |
| `HOLDINGS_FILE`, `PartHoldings`, `EpicHoldings`, `ProjectHoldings` | What a module holds for an epic's parts (1.2.0), as it publishes it in `parts.json` in its own folder. Read and written behind `/serve`: `readHoldings`, `writeHoldings`. |
| `files` on a part, `pickedFiles`, `paperFileOf`, `partFile`, `isPartFile`, `PAPER_MODULE`, `focusSentence`, `FOCUS_WHERE` | **Deprecated in 1.2.0**, and unchanged: a part's paper-relative files and the two names that spell one module, and the standing count line no module draws any more. |
| `journeyRecordSchema`, `journeyStepSchema`, `journeyGroupSchema`, `stepsFromSchema`, `journeysDocumentSchema`, `journeyIn`, `journeySlugs`, `stepsOf`, `stepPart`, `JOURNEYS_MODULE`, `JOURNEYS_FILE` | An epic's steps and groups as a project keeps them on disk: the one shape the module that writes them and a host that reads them both import. |
| `partsOf`, `partIdsOf`, `JourneyPart`, `slugFrom` | The parts of an epic read off a Journeys record. **Deprecated in 1.2.0** except `slugFrom`: how a host adopts the list of an epic that has none of its own yet. |
| `parseSource`, `serialiseSource`, `uncitable`, `markersIn`, `replaceMarkers`, `CITE_MARKER`, `normaliseQuote`, `findQuote`, `resolveSource`, `linesOf`, `CITE_STATUSES`, `CitedSource`, `CitedRange`, `CitationView` | A citation (0.33.0): the `[^n]: <path> \| "<quote>"` line two modules write, the markers that name it, and the one rule for finding its words in a file again — `holds`, `ambiguous`, `adrift` or `unreadable`. |
| `headerSchema`, `headerItemSchema`, `pressSchema`, `pressedSchema`, `pressRefusal`, `HEADER_MENUS`, `HEADER_KINDS`, `RUN_STATES` | The header (1.1.0): the switches, toggles, jumps and runs a module declares for the host to draw in a container's View, Go and Run menus, the press relayed back, and the one rule for a press that cannot be taken. |
| `mcp.subjects` in the manifest, `showAnswerSchema`, `doneAnswerSchema`, `doneAnswer`, `SHOW_OUTPUT_SCHEMA`, `DONE_OUTPUT_SCHEMA`, `doorContext`, `DOOR_ARGUMENTS`, `doorToolSchema`, `toolEffect` | A module's MCP door (1.1.0): which tool shows a kind of thing, lets go of it and answers "is it done?", the two answers a caller reads as a state, the one spelling of the context arguments, and what a tool says about only reading. |
| `foldResult`, `FOLD_OUTCOMES`, and `folded` on a container | `view.fold` (1.1.0): a module asking the host to fold or unfold containers, and what became of it. |

And behind two subpaths, which are not shapes and say so:

| | |
|---|---|
| `kehikot-module-protocol/client` | `connect`, `mailbox`, `HostRefused` — the module half of the wire, for a page that would rather not write it again. Browser code, kept out of the front door so a Bun process can import shapes without it. **A convenience: a module may hand-roll its wire and be perfectly conforming.** |
| `kehikot-module-protocol/client/react` | `useHost`, `Cover` and `coverFor`, and `useFocus` (0.34.0), the parts focus as one value. Optional; `react` is an optional peer dependency and `client` does not import it. |

## Where the reasoning is

The source says what each field is and what it is bounded by, in a line or three; why it is that way is written down once, in [`docs/`](docs/README.md):

| | |
|---|---|
| [Building a module](docs/building-a-module.md) | The guide for a new module: what to decide, the template repository, the rules, testing, running it in Kehikot, releasing. |
| [The wire: context, passages and messages](docs/wire.md) | What a host and a module say to each other across the frame: the context a module is handed, the passage a reader is pointing at, and the messages themselves. |
| [Filters, clearing and refreshing](docs/filters.md) | The three things a module offers and the host draws: filters to narrow by, a control that clears what is shown, and a control that reads the material again. Also the shared reference facets behind `/facets`. |
| [Capabilities, methods and their answers](docs/methods.md) | The questions a module can ask the host, the capability each one needs, what a caller must construct, and which answers have a shape. |
| [The manifest](docs/manifest.md) | What a module says about itself at the well-known path: every field of `manifestSchema`, what a module says it reacts to, its tags, and how a protocol range is read. |
| [Names and ids](docs/ids.md) | The patterns for a module id, a mode id and an epic slug, the one derivation of a slug from prose, and the lookup that does not fall through a prototype. |
| [Limits](docs/limits.md) | Why every string and every list is bounded, and the reasoning behind each number in `LIMITS`. |
| [The protocol number](docs/protocol-number.md) | Why `PROTOCOL` is 2 and what would raise it, and what would raise it. |
| [Where a module keeps a project's data](docs/project-data.md) | The `.kehikot/` folder inside a project, the folder each module gets in it, the project's own id in `.kehikot/project.json` (2.1.0) and how machine-level state is keyed by it, and the lines a project's `.gitignore` gains. |
| [Parts of an epic, focus, and the record of an epic's steps](docs/parts.md) | The parts an epic is divided into, what it means for some of them to be picked out, the one rule for whether a thing is in focus, the files a part owns, and the on-disk record of an epic's steps that parts are read from. |
| [Trackers](docs/tracker.md) | One reading of GitHub and GitLab shared by every module: the row a host hands back, what is missing and why, refreshing, and how a reference is spelled. |
| [Content changes](docs/content.md) | How a container is told that the material it shows has changed, and how a module reports a change of its own. |
| [Citations](docs/citations.md) | The one way a citation is written and the one rule for finding its words in a file again. |
| [Asking a module to show something, and whether it is done](docs/asking.md) | What a module's MCP door can be asked (1.1.0): the manifest's `mcp.subjects`, the show and done answers, read-only tools, the `project` and `epic` arguments, `check:door`, reading another module's manifest, and `view.fold`. |
| [Activity](docs/activity.md) | What a module's things are doing now (1.5.0): `activity.set`, `ActivityItem`, `connection.activity`, and the host's contract for marks, seen and pressing. |
| [The header](docs/header.md) | The switches, toggles, jumps and runs a module declares and the host draws (1.1.0): `kehikot.header`, `press`, `pressed`, who may press, and what a receiver does with a message type it does not know. |
| [Extension payloads](docs/extensions.md) | The versioned formats modules send each other through a host: notifications and calls. |
| [The client library](docs/client.md) | The module half of the wire behind `/client` and `/client/react`: `connect`, the mailbox, and the hooks. A convenience, never a requirement. |
| [Serving a module: ports, the registry, frame origins, and the template](docs/serving.md) | The node-only half behind `/serve` — which port a module binds, where it writes down that it exists, which origins may frame it — and the generator that makes a new module from `template/`. |
| [The shared plumbing of a module](docs/module-plumbing.md) | What every module used to type out for itself, behind `/serve`, `/client` and `/client/react`: the page document and its first paint, the write ticket, the JSON body reader, the `doors()` plugin, `ask()`, `useHost`, the one not-ready screen `Cover`, and the build identity. |
| [Packaging](PACKAGING.md) | How this package is consumed straight from git, and why `dist/` is committed. |

## One spelling

Every name this package puts on the wire says `kehikot.`.

Moving a module or a host onto this version from 0.36.0 or 0.37.0:
[MIGRATING.md](MIGRATING.md) has the before and after for every removal and changed
answer.

## Making a new module

Start with **[Building a module](docs/building-a-module.md)**: the whole path, from deciding what a module is to its first release, built on the template repository [`Jalez/kehikko-module-template`](https://github.com/Jalez/kehikko-module-template). In Claude Code, Kehikot's own `/kehikot-module` skill walks you through it.

For a bare local module without the release setup:

```
bun run create <name> [--dir <path>] [--register]
```

From a checkout of this repository. `bun run create slides` makes
`~/Projects/kehikko-slides` from `template/`: id `kehikot.slides`, data under
`<project>/.kehikot/slides/`, and a preferred port on the ten-apart grid above
every module registered on this machine (the highest registered port, or the
preferred port in that checkout's `manifest.ts`, rounded up to the next free
multiple of ten, never below 7960). It then runs `git init`, `bun install` and
the new module's own `bun test`. `--register` also writes its registration;
otherwise `bun run register` in the new module does that. No GitHub repository
is created.

What you get is a working module with nothing in it: the manifest, the doors
(`/app`, the manifest route, `/healthz`, `/mcp` with one example tool, `/api`
with a write ticket), a JSON store inside the project, the host connection, a
placeholder screen with a header switcher in the host's menu grammar
(`src/components/menu.tsx`), shadcn components, and tests. `test/create.test.ts`
here generates one against this checkout and runs its tests and typecheck, so
the template cannot drift from the protocol silently.

## Versions

`PROTOCOL` has been 2 throughout: every version below added something a module may ignore.
The same list with what each version exported is in [CHANGELOG.md](CHANGELOG.md).

| version | date | what it added |
|---|---|---|
| 2.16.0 | 2026-10-23 | Additive. A web address handed to the canvas: `address.open({ url, title?, intent? })` under the new capability `address:open`, answered with `addressOpenResult` (`shown`, `offered`, `declined`); `webAddress` / `addressRefusal` (`https:`, or `http:` to this machine; no credentials; at most `LIMITS.URL`); `context.address` (`sharedAddressSchema`, stamped with the host's `by`, `agent` and `at`); `REACTS_TO.address`, the module that shows pages; `addressIsNews`, `addressLabel`; the client's `address` field and `openAddress`. See [methods](docs/methods.md#methodparamsaddressopen) and [wire](docs/wire.md#contextschemaaddress). |
| 2.15.0 | 2026-10-23 | Additive. A module's settings: `declares.settings` lists fields (`key`, `label`, `description`, `type: 'boolean' \| 'string' \| 'number' \| 'choice' \| 'list'`, `choices?`, `default`, `scope: 'project' \| 'machine'`, `personOnly?`) a host draws as one form. Two door methods a host asks a module, filed under the door capability `settings` (`DOOR_CAPABILITIES`, `DOOR_METHODS`): `settings.get` → `{ values, file?, problem? }` and `settings.set` → `{ outcome: 'saved' \| 'refused', why, values? }`, at `SETTINGS_PATH`. A `personOnly` setting changes only for the module page's ticket or a pass the host vouches for (`SETTINGS_PASS_PATH`, `hostVouches`). `settingsDoor` in `/serve`. See [settings](docs/settings.md). |
| 2.14.1 | 2026-10-22 | Fix. `LUCIDE_MODULE_ICONS` has `message-square-code` in place of `message-square-check`, which is not a Lucide icon. |
| 2.14.0 | 2026-10-22 | Additive. A module's icon: the manifest's `icon` names a key of `MODULE_ICONS` — `lucide:<name>` (`LUCIDE_MODULE_ICONS`) or `brand:<slug>` for the mark of a third-party tool the module fronts (`BRAND_MODULE_ICONS`, Simple Icons slugs) — which a host draws beside the module's name; never a path or URL. `isModuleIcon`, `moduleIconParts`, `ModuleIcon`. Any string still parses, and a host draws one it does not know as its own icon. See [the manifest](docs/manifest.md#a-modules-icon-2140). |
| 2.13.0 | 2026-10-22 | Additive. A place in a change's code: `codeLocationSchema` (`change`, repository-relative `path` (`repoPath`), `line`, `endLine?`, `side: 'new' \| 'old'`, `commit?`), shared on a kehikko as `context.location` (`sharedLocationSchema`: the place plus `intent: 'show' \| 'comment'` and the host's `by` and `at`), set with `location.set` under the new capability `location:set` and answered with `locationSetResult` (`taken`, `not-selected`, `declined`). The host keeps one per kehikko and clears it when the selection no longer has its change (`locationStands`). `REACTS_TO.location`, `LIMITS.CODE_LINE`, `samePlace`, `locationLabel`; the client's `location` field and `locate(location, intent?)`. See [wire](docs/wire.md#contextschemalocation) and [methods](docs/methods.md#methodparamslocationset). |
| 2.12.0 | 2026-10-22 | Additive. Kehikko-bound skills: `moduleSkillSchema.needs?` (`skillNeedsSchema`; module ids, each once, at most `LIMITS.SKILL_NEEDS`), the other modules that must be on the same kehikko for a skill to make sense; the declaring module is implied. A skill with any is never installed user-wide and is loaded only into a conversation whose kehikko has them all. `isKehikkoBound`, `missingNeeds`. See [manifest](docs/manifest.md#kehikko-bound-skills-2120). |
| 2.11.0 | 2026-10-22 | Additive. Work item types: `trackerRowSchema.workItem?` (`WORK_ITEM_TYPES`, `WorkItemType`: `task`, `incident`, `test_case`, `requirement`, `objective`, `key_result`, `epic`, `ticket`), GitLab's `Issue.type` lower-cased with `ISSUE` left out; absent on a plain issue, a change, GitHub, and where the host could not read it. See [tracker](docs/tracker.md#work-item-types-2110). |
| 2.10.0 | 2026-10-21 | Additive. Faces: `trackerRowSchema.people?: Record<login, { name?, avatarUrl? }>` (`trackerPersonSchema`, `TrackerPerson`; at most `LIMITS.ROW_PEOPLE`), one map per row for the people it names by login; `avatarUrlSchema` and `isHttpsUrl` hold an avatar to an absolute `https:` URL. See [tracker](docs/tracker.md#people-and-their-pictures-2100). |
| 2.9.0 | 2026-10-21 | Additive. All epics: `context.scope?: 'epic' \| 'project'` (`CONTEXT_SCOPES`, `scopeOf`; absent means `epic`; with `project`, `epic` is null and `parts` empty, which is not "no epic open") and the manifest's `declares.scopes?` (`scopesOf`, `showsProject`; absent means `['epic']`). The host covers a module that cannot show a whole project with a sentence. See [the wire](docs/wire.md#contextschemascope) and [the manifest](docs/manifest.md#which-scopes-a-module-can-show-290). |
| 2.5.0 | 2026-10-20 | Additive. Skills a module offers: `declares.skills` (`moduleSkillSchema`, `ModuleSkill`: `name`, `summary`, `version`; at most `LIMITS.SKILLS`), each text served at `skillPath(name)` (`/kehikot/skills/<name>.md`, `SKILLS_PATH`), a SKILL.md of at most `LIMITS.SKILL_TEXT` bytes; `SKILL_NAME`, `isSkillName`, `skillTextIssue`, `skillTextBytes`. The host shows the text and the person installs. See [manifest](docs/manifest.md#skills-a-module-offers-250). |
| 2.4.0 | 2026-10-20 | Additive. A conversation's place: a conversation started from a place carries `?kehikot-place=<token>` (`PLACE_PARAM`) on every Kehikot door URL; the module that started it keeps the record (`RECORDED_PLACE_PATH`, `recordedPlaceResult`) and issues the token at `POST /host/place` (`placeIssueSchema`, `placeDoorsSchema`); `GET /host/place` answers `placeResult` (`DoorPlace`); `/serve` has `placeTokenOf`, `hostPlace`, `resolveDoorPlace`; every door follows `placeDefaults` (arguments, then the record) and says so in `DOOR_PLACE_SAYS`'s words. See [asking](docs/asking.md#a-conversations-place-240). |
| 2.3.0 | 2026-10-19 | Additive. A project's former path: `/host/is-project` may answer `id`, `movedTo`, `missing` and `why` (`isProjectResult`); `hostProject(folder)` returns them; `resolveDoorProject(args \| folder)` follows a move once to the same id and refuses in `DOOR_PROJECT_SAYS`'s words; `hostHasProject` stays a boolean. Doors work on the returned path. See [asking](docs/asking.md#a-project-that-moved-230). |
| 2.2.0 | 2026-10-19 | Additive. The host's own folder in a project is `.kehikot/host/` (`HOST_FOLDER`, `hostDir`, `hostFile`), not `.kehikot/kehikko/` (`LEGACY_HOST_FOLDER`, `legacyHostFile`: read as a fallback, never written). `moduleFolder` refuses an id that would derive `host`. See [project data](docs/project-data.md#the-hosts-folder-host-220). |
| 2.1.0 | 2026-10-19 | Additive. A project's permanent id: `PROJECT_ID`, kept in `<project>/.kehikot/project.json` (`PROJECT_FILE`, `projectFile`, `projectFileSchema`, `readProjectFile`) and written only by the host — the one file at the top of `.kehikot/`. `context.projectId` (default `null`), `pickedProject.id`, `ActivityItem.projectId` (beside `project`), `projectKey` for keying machine-level state by the id with the path as fallback. The file is always gitignored, even where `.kehikot/` is shared (`PROJECT_FILE_IGNORE`, `ignoresProjectFile`, `withProjectFileIgnored`). See [project data](docs/project-data.md#the-projects-id-projectjson-210). |
| 2.0.0 | 2026-10-19 | Breaking, `PROTOCOL` still 2. Removes `canonicalModuleId`, `ID_PREFIX_BEFORE_RENAME`, `registrationBeforeRename`, the pre-rename id prefix in `moduleFolder` and the reading of pre-rename registration names; adds `takesOver`, and `serves()` no longer takes over a registration that names another existing folder. See [MIGRATING.md](MIGRATING.md). |
| 1.8.0 | 2026-10-19 | Additive. An `ActivityItem` may carry `project` (an absolute folder) and a host that files by it answers `activity.set` with `projects: true`, so a module reports every project's things from one page; the client sends only the open project's share to a host that has not said so. See [activity](docs/activity.md#across-projects-180). |
| 1.7.0 | 2026-10-16 | Additive. `activity.set` becomes the one way to report attention, progress and one-off notices: an `ActivityItem` may carry `priority` (`urgent`/`normal`/`low`), `refs` (at most `LIMITS.ACTIVITY_REFS` = 16) and `group` (at most `LIMITS.ACTIVITY_GROUP` = 64). `kehikot.notifications@1` is legacy for notices. A 1.6.0 host strips the new fields. See [activity](docs/activity.md). |
| 1.6.0 | 2026-10-16 | Additive. A `run` header item may be `pinned: true`: the host draws it as an icon button in the container header (at most `LIMITS.PINNED_MAX` = 4), beside the menus; `HEADER_ICONS`, `pinnedRuns`. A 1.5.0 host strips it and keeps the item in the menu. See [the header](docs/header.md). |
| 1.5.0 | 2026-10-15 | Additive. `activity.set` (capability `activity:report`): a module says the complete list of what its things are doing now (`working`, `attention`, `done`, each with a label and an optional `place`) and the host marks epics, parts and kehikot; `ActivityItem`, `activitySetResult`, `worstActivity`, `LIMITS.ACTIVITY_*`, `connection.activity`. A 1.4.0 host answers `unknown-method` and the module gets no dots. See [activity](docs/activity.md). |
| 1.4.0 | 2026-10-14 | Additive. The greeting says what the host will answer (`hello.answers`) and whether it draws headers (`hello.header`); `parts.json` remembers who has spoken (`published`, `holdingsSpoken`); `hostHasProject` in `/serve`; a notification's `place` and `view.goto`'s `parts` and `kehikko`; a run's `surface: 'fullscreen'`; the capability → method table, and the correction that a host checks every grant. A 1.3.0 reader strips what it does not know. See [the wire](docs/wire.md), [parts](docs/parts.md) and [the header](docs/header.md). |
| 1.3.0 | 2026-10-12 | Additive. A module may say what its MCP door is registered as: the manifest's optional `mcp.as`, `DOOR_NAME`, `LIMITS.DOOR_NAME`. A host before 1.3.0 drops the field and names the door itself. See [the manifest](docs/manifest.md). |
| 1.2.0 | 2026-10-12 | Additive. Parts belong to the epic and name no module: `parts.json` per module (`readHoldings`, `writeHoldings` in `/serve`), project-relative `documents` on a part, the `{ whole: true }` anchor, `parts.set` and `partsSetResult`, `listedPartSchema`, `partIdFor`, `partsFor`, `emptySaid` and `narrow().empty`, `LIMITS.PARTS` 32 → 128. Deprecates `files`, `paperFileOf`, `PAPER_MODULE`, `focusSentence`, `FOCUS_WHERE`, `partsOf` and Journeys as where parts are. See [parts](docs/parts.md). |
| 1.1.1 | 2026-10-12 | What a door requires of a request: it answers its own page and a program on this computer (`asker`, `admits`), a body has to be `application/json`, `serves()` sets `server.cors: false`, and a page answers a greeting only from an origin it may be framed by (`mayGreet`, the `origins` island). See [module plumbing](docs/module-plumbing.md). |
| 1.1.0 | 2026-10-12 | Additive. The header: `kehikot.header`, `kehikot.press`, `kehikot.pressed`, `useHost().header()`, `onPress`. A module's door: the manifest's `mcp.subjects`, the show and done answers, `doorContext` (`project`, `epic`), `toolEffect`, `kehikot-check-door`, `readNeighbour` / `listTools` in `/serve`. `view.fold` and `containers[].folded`. See [asking](docs/asking.md) and [the header](docs/header.md). |
| 1.0.0 | 2026-10-10 | The breaking release: removes everything 0.37.0 deprecated (the second dialect, `LEGACY_*`, `useKehikot`), makes the parts declaration a refusal, renames the bins to `kehikot-*`. See [MIGRATING.md](MIGRATING.md). |
| 0.37.0 | 2026-10-10 | Deprecations only, nothing removed: the second dialect (`LEGACY_*`, `legacyManifest`, `toDialect`), the old `useKehikot`, and the `kehikko-*` bin names (now also `kehikot-*`). See [CHANGELOG.md](CHANGELOG.md). |
| 0.36.0 | 2026-10-09 | The plumbing's gaps, closed: `held` (unsaved work across a reload), `hostStore` (the host outside React), `doorsFetch` and `fillPage` (a `Bun.serve` module and its built page), `replied`, `probeServer`, `ask`'s `ticket`/`keepalive`/repeated `query`, `follow`'s `events`/`probe`, `coverFor`'s `host` and `server`. See [module plumbing](docs/module-plumbing.md). |
| 0.35.0 | 2026-10-09 | The shared plumbing of a module: `pageDocument`, `mintTicket`/`refuseTicket`, `readJsonBody`, the `doors()` plugin, `ask`/`follow`, `useHost`, `Cover`/`coverFor`, and a build identity (`establishBuild`, `compareBuilds`, the manifest's and `ready`'s optional `build`, `PACKAGE_VERSION`). See [module plumbing](docs/module-plumbing.md). |
| 0.34.1 | 2026-10-09 | `focusSentence(…, { total })` and `useFocus().narrow(…, { total: true })`: the sentence may say how many of how many. |
| 0.34.0 | 2026-10-09 | Every module's data is part-specific by one rule: `Anchor`, `anchorInFocus`, `narrowToFocus`, `focusSentence`, `FOCUS_WHERE`, `sameParts`, `partsDeclaration`, `useFocus`, and the manifest's `partless`. See [parts](docs/parts.md). |
| 0.33.0 | 2026-10-09 | Citations: the `[^n]: <path> \| "<quote>"` line and the rule for finding its words again (`parseSource`, `findQuote`, `resolveSource`, `CITE_STATUSES`). See [citations](docs/citations.md). |
| 0.32.0 | 2026-10-07 | A part may own files of the epic's paper: `files` on a group and a part, `partFile`, `paperFileOf`, `fileInFocus`, `pickedFiles`, `partsOfFile`, `PAPER_MODULE`. |
| 0.31.0 | 2026-10-07 | The parts of an epic are derived here, once: `slugFrom`, `partsOf`, `partIdsOf`. |
| 0.30.0 | 2026-10-07 | An epic's steps and groups as a project keeps them on disk: `journeyRecordSchema` and the rest of `journey.ts` (`journeyIn`, `stepsOf`, `stepPart`), and `readJourney` / `readJourneys` in `/serve`. |
| 0.29.0 | 2026-10-07 | Parts: `context.parts`, `partSchema`, `pickedParts`, `isFocused`, `refInFocus`, `partInFocus`, `focusCount`, and the `parts` reaction. |
| 0.28.0 | 2026-10-07 | Tags: a manifest's `tags`, and the suggested vocabulary `TAGS`. See [the manifest](docs/manifest.md). |
| 0.27.0 | 2026-10-06 | Content changes: `context.content`, the `content` reaction, `content.changed`, `contentStamp`. See [content](docs/content.md). |
| 0.26.0 | 2026-10-05 | `dataVersion`: the format a module's project data is in, apart from `version`. |
| 0.25.0 | 2026-10-05 | Every name on the wire says `kehikot.`. See the section above and [the protocol number](docs/protocol-number.md). |

## Development

```
bun test        # what a bound refuses, what a bad id refuses, that a version is part of a name,
                # that a caller can tell a decline from a dead reference from a broken call,
                # for the client — that a greeting already in the backlog reaches a page
                # that has stored its connection, which a one-step connect fails by construction,
                # and for /serve — the table over who is on a port, the walk that steps over a
                # neighbour's claim, and the same decisions again against a listener the suite
                # starts and stops, because injected probes cannot show that the real ones agree
bun run build   # tsc to dist/
```

`dist/` is committed (see [PACKAGING.md](PACKAGING.md)), so a change to `src/` is committed together
with the build it produces. CI (`.github/workflows/ci.yml`) rebuilds and fails when the two disagree.
