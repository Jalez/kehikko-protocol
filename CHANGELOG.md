# Changelog

One entry per version, newest first, from 0.25.0 onward. Reconstructed from the
commit history; the date is the date of the commit that set the version. `PROTOCOL` is 2 in every
version listed: each one added something a module may ignore.

Consumers install this package from git (`#main`, pinned by their lockfile), so a version here is a
label on a commit rather than a published artifact. See [PACKAGING.md](PACKAGING.md).

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
  `HEADER_MENUS`, `HEADER_MENU_NAMES`, `RUN_STATES`; `pressRefusal(items, press)`.
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
