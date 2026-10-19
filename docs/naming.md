# `kehikko` and `kehikot`: which spelling goes where

> **Confirmed by the owner (2026-10-10).** `kehikot` is the shared namespace — the product, the
> package, the wire, ids, the `.kehikot/` folder; `kehikko` is one canvas, and the host and the
> repositories named after it. The exceptions below are
> listed rather than fixed, except where a line says otherwise.

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
| API identifiers | `kehikotDir`, `ignoresKehikot`, `withKehikotIgnored`, `withoutKehikotIgnored` |
| this package's bins | `kehikot-create`, `kehikot-check-parts` |
| source annotations | `// kehikot-storage: allow <reason>` |

**`kehikko` (singular) names one frame, in two senses:**

1. **One canvas** — a single arrangement of containers around a project and an epic.
   `context.kehikko` (`{ id, name, key? }`), `event.kehikko`, the internal `kehikkoSchema`, and the prose
   "on this kehikko".
2. **The host program, and by extension the repositories** — the thing that draws a kehikko.
   The host's repository and package are `kehikko`; its MCP server is `kehikko`; its binary is
   `kehikko-host`; its own folder inside a project is `.kehikot/kehikko/`; its own environment
   variables are `KEHIKKO_RESTART_FILE`, `KEHIKKO_PROPERTY`. Every
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
- **The host's environment variables are split.** Variables the host shares with modules are
  `KEHIKOT_*`, but so are several only the host reads (`KEHIKOT_FRAME_DB`, `KEHIKOT_SEED_PROJECT`,
  `KEHIKOT_SCAN_PROJECTS`), beside host-only ones spelled `KEHIKKO_*`. There is no visible line
  between the two groups.
- **`.kehikot/kehikko/`.** Both spellings in one path: the shared folder, then the host's own
  folder in it — consistent with the rule, and the place it is easiest to mistype.
- **A module's own hook file.** `template/src/wire/use-kehikot.ts`, and the same file in several
  modules, is the module's wrapper around `useHost` and exports a function called `useKehikot`. It
  is a file in a module, not part of this package's surface, and was left as it is.
- **Prose.** Comments and documents write "a Kehikot host" (the product's host) and "the kehikko"
  (the canvas) and occasionally use "kehikko" for the app as a whole.

## What would still need deciding

Whether host-only environment variables should all be `KEHIKKO_*`, and whether repositories keep
the singular. Neither is this package's to change.
