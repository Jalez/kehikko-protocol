# Migrating from 0.36 / 0.37 to 1.0.0

Everything that was removed, renamed, or answers differently — before → after. 0.37.0 marked each
removal `@deprecated`; this release takes them out. `PROTOCOL` is still 2: no `kehikot.` message
changed meaning, so a module and a host can move in either order, and a module on 0.25–0.37 is
still framed by a host on this version (and the other way round) **provided its manifest says how
it relates to parts** (section 2).

## 1. Removed: everything named "roadmap", and the old hook

| before | after |
|---|---|
| `useKehikot(id, events, options)` (`/client/react`) | `useHost(id, events, options)` — `host.context` is still the whole context; `host.state` (a string) is `host.kept` through a codec (`options.kept`, JSON by default); `onClear` / `onRefresh` now arrive |
| `Kehikot`, `UseKehikotOptions` | `Host`, `UseHostOptions` |
| `useRoadmap`, `Roadmap`, `UseRoadmapOptions` | the same three |
| `LEGACY_WELL_KNOWN` | `WELL_KNOWN`. `doors()` no longer answers `/.well-known/roadmap-module.json`; a host asks one path |
| `legacyManifest(manifest)` | nothing: serve the manifest as it is |
| `LEGACY_MANIFEST_KIND`, `kind: 'roadmap.module'` | `MANIFEST_KIND`. `manifestSchema` and `readManifest` refuse the old word |
| `LEGACY_MESSAGE_PREFIX`, `MESSAGE_PREFIXES` | `MESSAGE_PREFIX`. Code that needs the literal for its OWN stored data (a host's database migration) writes `'roadmap.'` itself |
| `Dialect`, `DIALECTS`, `dialectOfKind`, `dialectOfType` | nothing: there is one spelling. Delete the branch |
| `toDialect(message, dialect)`, `canonicalMessage(message)` | post `message` as built; parse it as received |
| `nameIn`, `legacyName`, `legacyModuleId` | nothing |
| `canonicalName(name)` | `canonicalModuleId(id)` when it is a module id read from disk; otherwise nothing |
| `canonicalExtension(name) === FORMAT` | `name === FORMAT` |
| `roadmap.*` message types, read by every schema | not read: `looksLikeWireMessage` drops them |
| ids and extension names respelled by the schemas (`manifest.id`, `ready.id`, `event.from`, `event.extension`, `containers[].module`, `content[].source`, `events.emit`'s `extension`) | carried as written. A host that reads `roadmap.x` back from its own files calls `canonicalModuleId` itself |
| `known('roadmap.notifications@1')`, `schemaFor(…)` | exact names only |
| `connect()` answering `roadmap.ready` to `roadmap.hello` | it answers `kehikot.` and does not hear `roadmap.hello` at all |
| `legacyRegistryDir()` (`/serve`) | nothing. This package does not read `~/.roadmap/modules`; a host copies it over once and reads it as its own fallback |
| `ROADMAP_MODULES_DIR` | `KEHIKOT_MODULES_DIR`. **A test or script that sets only the old name now resolves the REAL registry** — see section 6 |
| `ROADMAP_ORIGIN` | `KEHIKOT_ORIGINS` (a list) or `KEHIKOT_ORIGIN` (one) |
| the bins `kehikko-create`, `kehikko-check-parts` | `kehikot-create`, `kehikot-check-parts` |

Still read, on purpose, and never written — these are formats on a person's disk:

- `canonicalModuleId('roadmap.x')` is `kehikot.x` (now exported from `ids.ts`; the import is unchanged).
- `moduleFolder('roadmap.x')` is `x`, the same folder as `kehikot.x`.
- `registerAt`, `claim` and `neighbourPorts` read a `roadmap.<name>.json` registration that sits
  beside `kehikot.<name>.json` in the registry, so a `keep: true` somebody set is carried over.

## 2. The parts declaration is a refusal

| before | after |
|---|---|
| `manifestSchema.parse(m)` accepts a manifest with neither `reacts: ['parts']` nor `partless`; `partsDeclaration(m)` returns the warning | `manifestSchema` refuses it. The issue is on `partless`, and its message is the sentence `partsDeclaration` returns: *"… Add 'parts' to reacts and narrow with the protocol’s focus helpers, or set partless to one sentence saying why nothing in it belongs to a part."* Saying both is refused too |
| `manifestSchema.shape`, `.extend`, `.pick` | gone: it is a refined schema. `parse`, `safeParse`, `Manifest` and `ManifestInput` are unchanged |

A host that showed `partsDeclaration(manifest)` as a warning on a parsed manifest will always get
`[]` and can drop the call. **A manifest fixture in a test** (`manifestSchema.parse({ kind, id, … })`)
needs one of the two fields.

## 3. `ask()` answers differently in three cases

| case | before | after |
|---|---|---|
| the caller's `signal` aborted | `{ ok: false, kind: 'refused', status: null, error: 'That was cancelled.' }` | `{ ok: false, kind: 'cancelled', status: null, error: CANCELLED }`. `AskFailure` is `'down' \| 'stale' \| 'refused' \| 'cancelled'` |
| a 2xx whose body is not JSON (HTML from behind the doors) | `{ ok: true, body: null }` | `{ ok: false, kind: 'refused', status, error: NOT_A_REPLY, body: null }` |
| a 2xx with no body at all (204, or empty) | `{ ok: true, body: null }` | the same |
| the ticket was refused | `kind: 'stale'`, `error: PAGE_STALE` ("… — reloading…") | `kind: 'stale'`, `error: PAGE_OLD` ("This page is older than its server.") |

What to look for:

- `kind !== 'refused'` used to mean "the cover is saying it" (`down` or `stale`). A cancelled ask
  now lands on that side. A caller that passes a `signal` checks `kind === 'cancelled'` (or its
  own `signal.aborted`) first.
- A `switch` or a `Record<AskFailure, …>` needs the fourth member.
- A test that expects a stale failure's sentence to be `'This page is older than its server — reloading…'`
  expects `PAGE_OLD` now. The stale **cover** still says "reloading…", because it is the thing reloading.
- A page that wrote its own "this page is older than its server" because the shared sentence
  promised a reload it had turned off (`reloadWhenStale: false`) can use `error` as it is.

## 4. `CoverState` has two more members, and `Cover` one more prop

| before | after |
|---|---|
| `'waiting' \| 'unhosted' \| 'no-project' \| 'no-epic' \| 'loading' \| 'down' \| 'stale'` | plus `'refused'` (something was asked and said no — pass its sentence as `detail`; Try again when there is an `onRetry`) and `'empty'` (everything was read and there is nothing to show). `coverFor` never returns either |
| a strip drawn by hand from `COVER_WORDS[cover](NAME)` and `TRY_AGAIN` | `<Cover state={cover} name={NAME} onRetry={…} strip />` |
| a stale cover says "reloading…" for as long as it is drawn | it says so only while a reload is on its way; when one could not start it says `PAGE_OLD` |

A `Record<CoverState, …>` or an exhaustive `switch` in a module needs the two new members.

## 5. Additions that replace hand-written code

None of these is required; each names the code it replaces.

| instead of | write |
|---|---|
| `process.env.KEHIKOT_ORIGINS = [...frameOrigins(), EXTRA].join(' ')` in `vite.config.ts` (references) | `doors({ …, ancestors: [EXTRA] })`. Also `frameOrigins(env, also)` / `frameAncestors(env, also)` |
| `headers: { 'access-control-allow-origin': '*', 'access-control-expose-headers': BUILD_HEADER }` on the health answer (atlas) | `doors({ …, openHealth: true })` — `/healthz` only |
| `'cache-control': 'private'`, to undo the default `no-store` on bytes a browser may keep (paper) | `'cache-control': ''` — an empty value sends no such header |
| `import.meta.hot?.on('vite:ws:disconnect', () => void probeServer())` (references, atlas; development only) | `watchServer()` from the entry: `probeServer` every 15 s while the page is visible. On an opaque origin the server needs `openHealth` |
| a passage held in state of the module's own because `useHost`'s deep equality is too strict (paper) | `useHost(id, events, { same: { passage: samePassage } })` and read `host.passage` |

## 6. One environment variable names the registry — check what sets it

`registryDir()` reads `KEHIKOT_MODULES_DIR` and nothing else. A test, a dev script or a shell
profile that points the registry somewhere safe by setting **only** `ROADMAP_MODULES_DIR` no
longer does: `registerAt` then writes into the real registry, which a running host sweeps.

- Search for `ROADMAP_MODULES_DIR` and `ROADMAP_ORIGIN` before moving, and set the `KEHIKOT_` name.
- A test that restores the variable must restore what it was, never `delete` it: after a delete
  the rest of that process resolves the real directory.
- This package's own suite sets it once, in its preload, and fails any test that leaves the
  registry resolving outside a scratch directory (`test/setup.ts`). A module whose tests call
  `registerAt`, `serves()` or `claim` can copy that.

# Moving from 1.1.0 (or 1.0.0) to 1.2.0

Nothing has to change: 1.2.0 is additive, and every consumer's own tests and typecheck were run
against 1.1.0 and against it. Two things a **host** does in the change that moves it, and what is
deprecated for everybody.

## A host: two edits in the same change

- **List `parts.set`** in `src/host/division.ts`. The host's own guard refuses to start against a
  protocol that names a method it does not answer; a case that answers `declined` is enough until
  the host keeps the list. (The same step `view.fold` needed for 1.1.0.)
- **`LIMITS.PARTS` is 128.** A module built with a package before 1.2.0 still refuses a context
  that lists more than 32 parts, and drops the whole message. Send each module
  `partsFor(parts, manifest.build?.protocol)`. A test that used "99 parts" to mean "more than the
  limit" should say `LIMITS.PARTS + 5`.

## Deprecated: before → after

All of these still work exactly as they did, and are marked `@deprecated`.

| before | after |
|---|---|
| `focus.narrow(...).sentence`, `focusSentence(parts, outside, noun)`, `<p title={FOCUS_WHERE}>` | nothing while anything is shown. In a view the pick left empty: `focus.narrow(...).empty`, or `emptySaid(parts, noun)` — `No note is in the picked part.` |
| a module's own "no … in the picked part(s)" sentence | `emptySaid(parts, noun)`, with the noun in the singular |
| `part.files`, `pickedFiles(parts)` | `part.documents`, `pickedDocuments(parts)`: project-relative |
| `paperFileOf(path, epic)`, a comparison through `PAPER_MODULE` | `fileInFocus(parts, path, epic, projectPath)` or a `{ file: path }` anchor; `documentOf(path, projectPath)` when the name itself is wanted |
| `useFocus({ parts, epic })` | `useFocus({ parts, epic, projectPath })` (or the whole context), so a file outside `.kehikot/` can be compared |
| a filter built on `fileInFocus` / `refInFocus` / `partInFocus` / `anchorInFocus` | one `anchorOf(item)` and `useFocus().narrow(items, anchorOf, { noun, keep })` |
| an item held against the whole paper or epic, shown under a pick by a rule of the module's own | the anchor `{ whole: true }` |
| `partsOf(record)`, `partIdsOf(groups)`, `JourneyPart`; `JOURNEYS_MODULE` and `readJourneys` to find an epic's parts | a host: the epic's own list (`partListSchema`), `partIdFor`, `readHoldings`. A module: `context.parts` |
| writing the list of parts into a module's own file | `host.request('parts.set', { epic, add: { name } })`, and `writeHoldings` for what the module holds per part |
| `partless` because somebody chose, or because narrowing would hide a selection | `reacts: ['parts']` with `keep`; or a sentence saying the module has nothing that could carry an anchor, or is not about one epic |

`kehikot-check-parts` prints a note for each of these it can see in a module's files. It still
fails only on the manifest.

# Moving from 1.3.0 to 1.4.0

Nothing has to change: 1.4.0 is additive and each piece is optional in both directions. What a module
or a host **may now do**, and the order that is kind to older ones:

## A host

- **Fill the greeting**: `answers` (the methods it will answer for this module: protocol, kept, and
  granted by `declares.uses`) and `header: true` when it draws the module's header.
- **Publish who spoke**: `writeHoldings` (a host that keeps parts of its own) or the module's own call
  now writes `published`; read `holdingsSpoken(project, epic)` before falling back to legacy files, so a
  last part set to "no part" does not bring the fallback back.
- **Full screen**: a `run` with `surface: 'fullscreen'` is gone full screen by the host from its own
  click handler, then pressed (docs/header.md).
- **`view.goto`** may carry `parts` (pick them) and `kehikko` (switch first), always with an `epic`.

## A module

| before | after |
|---|---|
| a no-op `parts.set` on every open to learn whether the host answers it | `answers?.includes('parts.set')` from `useHost()` (null: an older host; probe once as before) |
| a "⋯" fallback shown until a press proves the host draws headers | `drawsHeader === false` shows it, `true` never does, `null` as before |
| a server reading a folder its page named | `await hostHasProject(path)` from `kehikot-module-protocol/serve`, then read |
| a notice that names only an epic | add `place: { parts, kehikko }`; a panel's press is `view.goto` with them |
| a `run` that wants full screen, requested from `onPress` (refused: no activation) | `surface: 'fullscreen'` on the item |
| "an empty publish looks like never publishing" | `writeHoldings(…, { published: ['documents'] })` and the host reads `holdingsSpoken` |

Not changed: `kehikot-check-door`, `kehikot-check-parts`, `PROTOCOL`, anything on the manifest.
