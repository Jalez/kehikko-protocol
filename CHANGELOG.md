# Changelog

One entry per version, newest first, from 0.25.0 — the rename — onward. Reconstructed from the
commit history; the date is the date of the commit that set the version. `PROTOCOL` is 2 in every
version listed: each one added something a module may ignore.

Consumers install this package from git (`#main`, pinned by their lockfile), so a version here is a
label on a commit rather than a published artifact. See [PACKAGING.md](PACKAGING.md).

## Unreleased — the breaking release (`1.0.0-draft`; the number is the owner's to set)

Removes what 0.37.0 deprecated, makes the parts declaration a refusal, and changes four answers
that could not change without breaking a 0.36.0 call. **[MIGRATING.md](MIGRATING.md) has the
before and after for every line here.** `PROTOCOL` is still 2: no `kehikot.` message changed
meaning, so a module and a host can move in either order.

### Removed

- The pre-rename dialect, whole: `roadmap.*` message types are not read, `kind: 'roadmap.module'`
  is not a manifest, `/.well-known/roadmap-module.json` is not answered or asked, and `connect()`
  answers `kehikot.` only. `LEGACY_WELL_KNOWN`, `LEGACY_MANIFEST_KIND`, `LEGACY_MESSAGE_PREFIX`,
  `MESSAGE_PREFIXES`, `legacyManifest`, `Dialect`, `DIALECTS`, `toDialect`, `canonicalMessage`,
  `dialectOfType`, `dialectOfKind`, `nameIn`, `legacyName`, `legacyModuleId`, `canonicalName`,
  `canonicalExtension`. No schema respells an id or an extension name.
- `useKehikot`, `Kehikot`, `UseKehikotOptions`, and `useRoadmap`, `Roadmap`, `UseRoadmapOptions`
  (`/client/react`). `useHost` is the hook.
- `legacyRegistryDir`, and reading `~/.roadmap/modules`. `ROADMAP_MODULES_DIR` and
  `ROADMAP_ORIGIN` are not read.
- The bin names `kehikko-create` and `kehikko-check-parts`; they are `kehikot-create` and
  `kehikot-check-parts`.

### Still read from before the rename — on disk, never written

`canonicalModuleId('roadmap.x')` (kept, now in `ids.ts`), `moduleFolder('roadmap.x')`, and a
`roadmap.<name>.json` registration beside the one `registerAt` writes. See
[docs/protocol-number.md](docs/protocol-number.md).

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
| `useRoadmap`, `Roadmap`, `UseRoadmapOptions` (`/client/react`) | the same |
| `LEGACY_WELL_KNOWN`, `legacyManifest`, and the manifest served at `/.well-known/roadmap-module.json` | `WELL_KNOWN`; a manifest is served there only |
| `LEGACY_MANIFEST_KIND`, and `kind: 'roadmap.module'` read by `manifestSchema` and `readManifest` | `MANIFEST_KIND` |
| `LEGACY_MESSAGE_PREFIX`, `MESSAGE_PREFIXES`, and `roadmap.*` message types read by every schema | `MESSAGE_PREFIX`, `MESSAGE.*` |
| `Dialect`, `DIALECTS`, `toDialect`, `canonicalMessage`, `dialectOfType`, `dialectOfKind`, `nameIn`, `legacyName`, `legacyModuleId` | nothing: there is one spelling. Post a message as it is built |
| `canonicalName`, `canonicalExtension` | `canonicalModuleId` for a module id read from disk; compare an extension name as written |
| `connect()` answering in the dialect it was greeted in | nothing: it answers `kehikot.` |
| `legacyRegistryDir` and reading `~/.roadmap/modules` (`/serve`) | nothing: a host copies that directory into `registryDir()` once |
| the environment variables `ROADMAP_MODULES_DIR`, `ROADMAP_ORIGIN` | `KEHIKOT_MODULES_DIR`, `KEHIKOT_ORIGINS` |
| the bins `kehikko-create`, `kehikko-check-parts` | `kehikot-create`, `kehikot-check-parts` (both names work in 0.37) |

What is **not** deprecated, although it reads a pre-rename spelling: `canonicalModuleId` and
`moduleFolder('roadmap.x')` (ids written to disk before the rename), and `registerAt` reading a
`roadmap.<name>.json` registration beside the one it writes.

Still a warning in 0.37, a refusal in the next breaking release: a manifest that neither says
`reacts: ['parts']` nor gives `partless` a sentence (`partsDeclaration`).

Calls that will answer differently in the next breaking release, listed so a module can find its
call sites now ([docs/module-plumbing.md](docs/module-plumbing.md), "For the next breaking release"):
an aborted `ask` becomes a kind of its own instead of `refused`; a 2xx that is not JSON stops
resolving `ok: true, body: null`; a stale `ask`'s `error` stops saying "reloading…"; `CoverState`
gains members.

### Said at runtime, once, in development only

Three paths say so on `console.warn` the first time they are exercised — never per message, and
never when `NODE_ENV` is `production` or `test`, so no suite reads differently:

- `useKehikot` (and `useRoadmap`) being called;
- `ROADMAP_MODULES_DIR` or `ROADMAP_ORIGIN` being the variable that decided;
- `connect()` being greeted with `roadmap.hello`.

### Added

- The bins under the package's own spelling, `kehikot-create` and `kehikot-check-parts`, beside the
  old names.

### Tests

- No test can reach the real module registry. The preload (`test/setup.ts`) points the registry at
  a scratch directory for the whole suite, under every variable the code reads, and fails any test
  that leaves it resolving anywhere else. Before this, each test set the variable itself — the
  deprecated `ROADMAP_MODULES_DIR`, as it happens — which holds only while the code reads that name.

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

Renamed from `roadmap-module-protocol` to `kehikot-module-protocol`. Every name on the wire says
`kehikot.` — message types, `MANIFEST_KIND`, `WELL_KNOWN`, extension names, module ids — and every
schema reads both spellings and hands back the new one. `toDialect`, `legacyManifest`,
`LEGACY_WELL_KNOWN`; `connect()` answers in the dialect it was greeted in.

## Before 0.25.0

Under the old name. 0.24.0 (2026-10-05) added the shared tracker reading; 0.23.0 (2026-10-05)
toggles filter groups, the shared ref facets and dispositions; 0.22.0 (2026-10-01) the module
template and `create`. Earlier history is in `git log`.
