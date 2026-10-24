# Design notes

Why the protocol is the way it is. The source keeps one to three lines beside each field — the invariant, the unit, the constraint — and everything longer lives here, once: the reasoning, the incidents that produced a rule, the alternatives that were turned down.

**New here? Start with [Building a module](building-a-module.md)**: the path from the first question to a first release, with the template repository and the rules every module keeps.

| | |
|---|---|
| [Building a module](building-a-module.md) | The guide: deciding what a module is, starting from `Jalez/kehikko-module-template`, the rules it keeps, testing, running it in Kehikot, releasing, and proposing it for the official list. |
| [The wire: context, passages and messages](wire.md) | What a host and a module say to each other across the frame: the context a module is handed, the passage a reader is pointing at, and the messages themselves. |
| [Filters, clearing and refreshing](filters.md) | The three things a module offers and the host draws: filters to narrow by, a control that clears what is shown, and a control that reads the material again. Also the shared reference facets behind `/facets`. |
| [Capabilities, methods and their answers](methods.md) | The questions a module can ask the host, the capability each one needs, what a caller must construct, and which answers have a shape. |
| [The manifest](manifest.md) | What a module says about itself at the well-known path: every field of `manifestSchema`, what a module says it reacts to, its tags, and how a protocol range is read. |
| [Names and ids](ids.md) | The patterns for a module id, a mode id and an epic slug, the one derivation of a slug from prose, and the lookup that does not fall through a prototype. |
| [Limits](limits.md) | Why every string and every list is bounded, and the reasoning behind each number in `LIMITS`. |
| [The protocol number](protocol-number.md) | Why `PROTOCOL` is 2 and what would raise it, and what would raise it. |
| [Where a module keeps a project's data](project-data.md) | The `.kehikot/` folder inside a project, the folder each module gets in it, the project's own id in `.kehikot/project.json` (2.1.0) and how machine-level state is keyed by it, and the lines a project's `.gitignore` gains. |
| [Parts of an epic: one list, one rule](parts.md) | What a part is and who keeps the list, the one rule for what a pick shows and the contract every module that follows parts keeps, a worked "one X per part" module, `parts.json`, project-relative documents, `parts.set`, what 1.2.0 deprecated, and the record an epic's steps are read from. |
| [Trackers](tracker.md) | One reading of GitHub and GitLab shared by every module: the row a host hands back, what is missing and why, refreshing, and how a reference is spelled. |
| [A module's server asking the host](server-ask.md) | `askHost` (2.19.0): the tracker reading for a module's MCP door with no page open, held to the same grant, proved by a pass the host checks at the module's registered origin. |
| [Content changes](content.md) | How a container is told that the material it shows has changed, and how a module reports a change of its own. |
| [Citations](citations.md) | The one way a citation is written and the one rule for finding its words in a file again. |
| [Asking a module to show something, and whether it is done](asking.md) | What a module's MCP door can be asked: the manifest's `mcp.subjects`, the show and done answers, read-only tools, the `project` and `epic` arguments, `check:door`, reading another module's manifest, and `view.fold`. |
| [Activity](activity.md) | What a module's things are doing now — working, needing you, finished — said whole with `activity.set` so the host can mark epics, parts and kehikot, and what the host does with it. |
| [A module's settings](settings.md) | The settings a module declares and a host draws as one form; `settings.get` and `settings.set` at the module's door; who may change a `personOnly` setting, and the host's pass. |
| [Traffic](traffic.md) | The record of the calls Kehikot and its modules make and receive on this computer, with their reasons (2.20.0): `traffic.read` and `traffic:read`, a module's own calls noted with `trafficNotes` and `traffic.note`, and the one sanitizer both sides use. |
| [The header](header.md) | The switches, toggles, jumps and runs a module declares and the host draws: `kehikot.header`, `press`, `pressed`, who may press, and what a receiver does with a message type it does not know. |
| [Extension payloads](extensions.md) | The versioned formats modules send each other through a host: notifications and calls. |
| [The client library](client.md) | The module half of the wire behind `/client` and `/client/react`: `connect`, the mailbox, and the hooks. A convenience, never a requirement. |
| [Serving a module: ports, the registry, frame origins, and the template](serving.md) | The node-only half behind `/serve` — which port a module binds, where it writes down that it exists, which origins may frame it — and the generator that makes a new module from `template/`. |
| [The shared plumbing of a module](module-plumbing.md) | What every module used to type out for itself, behind `/serve`, `/client` and `/client/react`: the page document and its first paint, the write ticket, the JSON body reader, the `doors()` plugin, `ask()`, `useHost`, the one not-ready screen `Cover`, and the build identity. |
| [A module served ready-built](ready-built.md) | `/run` and `/build` (2.17.0): one Bun server for a module's built page with the same doors as the dev server and a WebSocket hook, a door of the module's own asked first (`before`) and `cors` for a page on an opaque origin (2.18.0), and the stamp that keeps a stale build from being served. |
| [Packaging](../PACKAGING.md) | How this package is consumed straight from git, and why `dist/` is committed. |
| [`kehikko` and `kehikot`](naming.md) | Which spelling goes where, as the code uses the two today. Inferred; to be confirmed. |

Each file has an overview where the README used to carry one, then the notes by symbol, grouped by the source file the symbol is declared in and in the order it is declared.
