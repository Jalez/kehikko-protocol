# Changelog

One entry per version, newest first, from 0.25.0 — the rename — onward. Reconstructed from the
commit history; the date is the date of the commit that set the version. `PROTOCOL` is 2 in every
version listed: each one added something a module may ignore.

Consumers install this package from git (`#main`, pinned by their lockfile), so a version here is a
label on a commit rather than a published artifact. See [PACKAGING.md](PACKAGING.md).

## Unreleased

Internal only; nothing a consumer can observe. No version change.

- `wire.ts` split into `passage.ts`, `filters.ts`, `context.ts` and `messages.ts` (and still
  re-exports all of them); `LIMITS` moved to `limits.ts`; schema fragments that were written more
  than once are named once in `fragments.ts`.
- Source comments trimmed to one to three lines per field; the reasoning moved to [`docs/`](docs/README.md),
  and the README cut down to what a module author needs.
- `dist/` no longer carries `.map` files. CI builds, checks that the committed `dist/` matches the
  source, typechecks and runs the tests.

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
