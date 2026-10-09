# `kehikko` and `kehikot`: which spelling goes where

> **Inferred — to be confirmed by the owner.** This is the rule the code follows today, read off
> its identifiers, environment variables, bins, wire names, folders and repository names. Nothing
> was renamed to make it true, and the exceptions below are listed rather than fixed.

*Kehikko* is Finnish for a frame; *kehikot* is the plural.

## The rule, as the code uses it

**`kehikot` (plural) names the product and everything shared by the whole system** — whatever a
host and every module have to spell the same way:

| where | spelling |
|---|---|
| the product | Kehikot (`Kehikot_*.dmg`, `~/Library/Application Support/Kehikot/modules`, `~/.local/share/kehikot/modules`) |
| this package | `kehikot-module-protocol`, and its subpaths |
| the wire | `kehikot.hello` … `kehikot.refresh`, `MESSAGE_PREFIX = 'kehikot.'` |
| the manifest | `kind: 'kehikot.module'`, `/.well-known/kehikot-module.json` |
| module ids and extension names | `kehikot.paper`, `kehikot.journeys`, `kehikot.notifications@1`, `kehikot.calls@1` |
| project data | `<project>/.kehikot/<module>/`, `KEHIKOT_DIR`, `KEHIKOT_IGNORE` |
| shared environment variables | `KEHIKOT_ORIGINS`, `KEHIKOT_ORIGIN`, `KEHIKOT_MODULES_DIR`, and in the host `KEHIKOT_FRAME_DB`, `KEHIKOT_SEED_PROJECT`, `KEHIKOT_VERSIONS_DIR`, `KEHIKOT_INSTALLS_DIR` |
| API identifiers | `useKehikot`, `Kehikot`, `UseKehikotOptions`, `kehikotDir`, `ignoresKehikot`, `withKehikotIgnored`, `withoutKehikotIgnored` |
| source annotations | `// kehikot-storage: allow <reason>` |

**`kehikko` (singular) names one frame, in two senses:**

1. **One canvas** — a single arrangement of containers around a project and an epic.
   `context.kehikko` (`{ id, name }`), `event.kehikko`, the internal `kehikkoSchema`, and the prose
   "on this kehikko".
2. **The host program, and by extension the repositories** — the thing that draws a kehikko.
   The host's repository and package are `kehikko`; its MCP server is `kehikko`; its binary is
   `kehikko-host`; its own folder inside a project is `.kehikot/kehikko/`; its own environment
   variables are `KEHIKKO_ROADMAP_DIR`, `KEHIKKO_RESTART_FILE`, `KEHIKKO_PROPERTY`. Every
   repository is `kehikko-<something>`: `kehikko-protocol`, `kehikko-desktop`, `kehikko-paper`, …

In two sentences: *the plural is the namespace two programs must agree on — the product, the
package, the wire, ids, folders, shared environment variables; the singular is one canvas, and the
host that draws it together with the repositories named after that host.*

## Exceptions, and places where the two meet

- **This repository against its package.** The repository is `kehikko-protocol`; the package it
  holds is `kehikot-module-protocol`. A module's `package.json` therefore names both in one line:
  `"kehikot-module-protocol": "git+ssh://git@github.com/Jalez/kehikko-protocol.git#main"`.
- **Module repositories against module ids.** `kehikko-slides` is the repository of the module
  whose id is `kehikot.slides` and whose data is in `.kehikot/slides/`. `create` writes both:
  `~/Projects/kehikko-<name>` and `kehikot.<name>`.
- **This package's bins.** `kehikko-create` and `kehikko-check-parts` take the singular although
  they ship in the plural-named package and act on modules, not on a canvas or the host. By the
  rule above they would be `kehikot-*`; they follow the repository's name instead.
- **The host's environment variables are split.** Variables the host shares with modules are
  `KEHIKOT_*`, but so are several only the host reads (`KEHIKOT_FRAME_DB`, `KEHIKOT_SEED_PROJECT`,
  `KEHIKOT_SCAN_PROJECTS`), beside host-only ones spelled `KEHIKKO_*`. There is no visible line
  between the two groups.
- **`.kehikot/kehikko/`.** Both spellings in one path: the shared folder, then the host's own
  folder in it — consistent with the rule, and the place it is easiest to mistype.
- **The legacy names are neither.** `roadmap.` on the wire, `roadmap-module.json`,
  `roadmap.module`, `ROADMAP_ORIGIN`, `ROADMAP_MODULES_DIR`, `ROADMAP_FRAME_DB`, `useRoadmap`,
  `~/.roadmap/`, and `.kehikot/roadmap/{epics,state}/` in the host's older notes are the old product
  name, still read everywhere and still written in a few places (`KEHIKKO_ROADMAP_DIR` carries the
  singular and the legacy name together).
- **Prose.** Comments and documents write "a Kehikot host" (the product's host) and "the kehikko"
  (the canvas) and occasionally use "kehikko" for the app as a whole.

## What would need deciding

Whether the bins should be `kehikot-*`; whether host-only environment variables should all be
`KEHIKKO_*`; and whether repositories keep the singular. None of it is changed here.
