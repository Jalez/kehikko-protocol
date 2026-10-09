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
| `helloSchema` … `wentSchema` | The eight messages, and `hostMessageSchema` / `moduleMessageSchema` to parse a direction at a time. |
| `notificationPayload`, `callPayload`, `EXTENSIONS` | The versioned formats modules send each other through a host. |
| `PROTOCOL`, `WELL_KNOWN`, `MANIFEST_KIND`, `MESSAGE`, `LIMITS` | One spelling and one number each, so two packages cannot disagree. |
| `METHODS`, `methodParams`, `CAPABILITIES` | The questions a module can ask, by name and by shape. |
| `methodResults`, `resultSchemaFor` | The answers that are outcomes rather than material, and so have a shape. |
| `navigationResult`, `projectPickResult`, `epicsListResult`, `epicSpine` | Those answers. |
| `MODULE_ID`, `MODE_ID`, `EPIC_SLUG`, `own` | The name patterns, and one lookup that does not fall through a prototype. |
| `KEHIKOT_DIR`, `moduleFolder`, `moduleDir`, `moduleFile`, `within` | Where a module keeps this project's data, given `context.projectPath`. |
| `KEHIKOT_IGNORE`, `ignoresKehikot`, `withKehikotIgnored` | The lines that project's `.gitignore` gains, added once. |
| `partSchema`, `EpicPart`, `PART_ID`, `pickedParts`, `isFocused`, `refInFocus`, `partInFocus`, `focusCount` | The parts of the open epic in `context.parts`, and whether a thing is in the ones a person picked out. |
| `fileInFocus`, `pickedFiles`, `partsOfFile`, `paperFileOf`, `partFile`, `isPartFile`, `PAPER_MODULE` | The files of the epic's paper a part owns (0.32.0): whether a file is in the picked parts, and the one comparison between the path a module holds and the name a part stores. |
| `Anchor`, `anchorInFocus`, `narrowToFocus`, `focusSentence`, `FOCUS_WHERE`, `sameParts`, `partsDeclaration` | One anchor, one rule (0.34.0): what ties an item of a module's data to a part — a file, a ref or a part id — the one answer to "is it in front of the person", the list narrowed with its count, the sentence every module says about what it left out, and what a manifest says about all of it. |
| `journeyRecordSchema`, `journeyStepSchema`, `journeyGroupSchema`, `stepsFromSchema`, `journeysDocumentSchema`, `journeyIn`, `journeySlugs`, `stepsOf`, `stepPart`, `JOURNEYS_MODULE`, `JOURNEYS_FILE` | An epic's steps and groups as a project keeps them on disk: the one shape the module that writes them and a host that reads them both import. |
| `partsOf`, `partIdsOf`, `JourneyPart`, `slugFrom` | The parts of an epic read off its record, and the one derivation of a part's id from its heading: what a host composes `context.parts` from and what the module that edits steps checks a step's `part` against. |
| `parseSource`, `serialiseSource`, `uncitable`, `markersIn`, `replaceMarkers`, `CITE_MARKER`, `normaliseQuote`, `findQuote`, `resolveSource`, `linesOf`, `CITE_STATUSES`, `CitedSource`, `CitedRange`, `CitationView` | A citation (0.33.0): the `[^n]: <path> \| "<quote>"` line two modules write, the markers that name it, and the one rule for finding its words in a file again — `holds`, `ambiguous`, `adrift` or `unreadable`. |

And behind two subpaths, which are not shapes and say so:

| | |
|---|---|
| `kehikot-module-protocol/client` | `connect`, `mailbox`, `HostRefused` — the module half of the wire, for a page that would rather not write it again. Browser code, kept out of the front door so a Bun process can import shapes without it. **A convenience: a module may hand-roll its wire and be perfectly conforming.** |
| `kehikot-module-protocol/client/react` | `useHost`, `Cover` and `coverFor`, and `useFocus` (0.34.0), the parts focus as one value. Optional; `react` is an optional peer dependency and `client` does not import it. |

## Where the reasoning is

The source says what each field is and what it is bounded by, in a line or three; why it is that way is written down once, in [`docs/`](docs/README.md):

| | |
|---|---|
| [The wire: context, passages and messages](docs/wire.md) | What a host and a module say to each other across the frame: the context a module is handed, the passage a reader is pointing at, and the messages themselves. |
| [Filters, clearing and refreshing](docs/filters.md) | The three things a module offers and the host draws: filters to narrow by, a control that clears what is shown, and a control that reads the material again. Also the shared reference facets behind `/facets`. |
| [Capabilities, methods and their answers](docs/methods.md) | The questions a module can ask the host, the capability each one needs, what a caller must construct, and which answers have a shape. |
| [The manifest](docs/manifest.md) | What a module says about itself at the well-known path: every field of `manifestSchema`, what a module says it reacts to, its tags, and how a protocol range is read. |
| [Names and ids](docs/ids.md) | The patterns for a module id, a mode id and an epic slug, the one derivation of a slug from prose, and the lookup that does not fall through a prototype. |
| [Limits](docs/limits.md) | Why every string and every list is bounded, and the reasoning behind each number in `LIMITS`. |
| [The protocol number, and what is left of the rename from "roadmap"](docs/protocol-number.md) | Why `PROTOCOL` is 2 and what would raise it, and the three places a name from before the rename is still read from disk. |
| [Where a module keeps a project's data](docs/project-data.md) | The `.kehikot/` folder inside a project, the folder each module gets in it, and the lines a project's `.gitignore` gains. |
| [Parts of an epic, focus, and the record of an epic's steps](docs/parts.md) | The parts an epic is divided into, what it means for some of them to be picked out, the one rule for whether a thing is in focus, the files a part owns, and the on-disk record of an epic's steps that parts are read from. |
| [Trackers](docs/tracker.md) | One reading of GitHub and GitLab shared by every module: the row a host hands back, what is missing and why, refreshing, and how a reference is spelled. |
| [Content changes](docs/content.md) | How a container is told that the material it shows has changed, and how a module reports a change of its own. |
| [Citations](docs/citations.md) | The one way a citation is written and the one rule for finding its words in a file again. |
| [Extension payloads](docs/extensions.md) | The versioned formats modules send each other through a host: notifications and calls. |
| [The client library](docs/client.md) | The module half of the wire behind `/client` and `/client/react`: `connect`, the mailbox, and the hooks. A convenience, never a requirement. |
| [Serving a module: ports, the registry, frame origins, and the template](docs/serving.md) | The node-only half behind `/serve` — which port a module binds, where it writes down that it exists, which origins may frame it — and the generator that makes a new module from `template/`. |
| [The shared plumbing of a module](docs/module-plumbing.md) | What every module used to type out for itself, behind `/serve`, `/client` and `/client/react`: the page document and its first paint, the write ticket, the JSON body reader, the `doors()` plugin, `ask()`, `useHost`, the one not-ready screen `Cover`, and the build identity. |
| [Packaging](PACKAGING.md) | How this package is consumed straight from git, and why `dist/` is committed. |

## Once "roadmap", and what is left of it

This package was `roadmap-module-protocol` until 0.25.0, and every name it put on the wire said
`roadmap.`. From 0.25.0 to 0.37.0 both spellings were read and the old one was still written to
a party that needed it. **That is over: there is one spelling, `kehikot.`**, and nothing here
exports, reads off the wire or writes the old one — no second dialect, no
`/.well-known/roadmap-module.json`, no `kind: 'roadmap.module'`, no `ROADMAP_*` environment
variable, no `useRoadmap`.

Three things on a person's disk are still read, never written: a module id stored as
`roadmap.<name>` (`canonicalModuleId`), the folder that id names (`moduleFolder`), and a
registration file named `roadmap.<name>.json` beside the one `registerAt` writes. See
[the protocol number](docs/protocol-number.md).

Moving a module or a host onto this version from 0.36.0 or 0.37.0:
[MIGRATING.md](MIGRATING.md) has the before and after for every removal, rename and changed
answer.

## Making a new module

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
| 0.37.0 | 2026-10-10 | Deprecations only, nothing removed: everything named after "roadmap" (the second dialect, `LEGACY_*`, `legacyManifest`, `toDialect`, `useRoadmap`, `ROADMAP_*`), the old `useKehikot`, and the `kehikko-*` bin names (now also `kehikot-*`). See [CHANGELOG.md](CHANGELOG.md). |
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
| 0.25.0 | 2026-10-05 | Renamed to `kehikot-module-protocol`; every name on the wire says `kehikot.` and both spellings are read. See the section above and [the protocol number](docs/protocol-number.md). |

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
